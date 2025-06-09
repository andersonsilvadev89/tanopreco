import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Animated,
  Alert,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons'; // Importar Feather icons
import { empresaDatabase, administrativoDatabase } from '../../firebaseConfig';
import { ref, onValue, get } from 'firebase/database';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Callout } from 'react-native-maps'; // Callout adicionado para o futuro

// ... (Interfaces e Constantes permanecem as mesmas) ...
interface BannerItem {
  descricao: string;
  id: string;
  imagemUrl: string;
  linkUrl: string;
}

interface ProdutoComEmpresa {
  id: string;
  descricao: string;
  preco: string;
  imagemUrl?: string;
  palavrasChave?: string;
  empresaId: string;
  nome: string; 
  localizacao: {
    latitude: number;
    longitude: number;
  };
  linkInstagram?: string;
}

interface EmpresaData {
  nome: string;
  localizacao: { latitude: number; longitude: number };
  linkInstagram?: string;
}

const ITEMS_POR_PAGINA = 10;


export default function VisualizarProdutosServicos() {
  const [produtosComEmpresa, setProdutosComEmpresa] = useState<ProdutoComEmpresa[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [todosCarregados, setTodosCarregados] = useState(false);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [mapRegion, setMapRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>({ // Inicialização padrão para evitar null no MapView
    latitude: -7.2345, 
    longitude: -39.4056,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    nome: string;
    empresaId?: string; // Para identificar unicamente o marcador selecionado
    produtoId?: string; // Para identificar unicamente o marcador selecionado
  } | null>(null);
  const [empresas, setEmpresas] = useState<{ [key: string]: EmpresaData }>({});

  const [allBanners, setAllBanners] = useState<string[]>([]);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const [mostrarMapa, setMostrarMapa] = useState(false); 

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ... (useEffect para banners e empresas permanecem os mesmos) ...
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const sponsorsRef = ref(administrativoDatabase, 'patrocinadores');
        const snapshot = await get(sponsorsRef);
        if (snapshot.exists()) {
          const sponsorsData = snapshot.val();
          const bannersList: string[] = [];
          for (const sponsorId in sponsorsData) {
            const sponsor = sponsorsData[sponsorId];
            if (sponsor && sponsor.banners && Array.isArray(sponsor.banners)) {
              const sponsorBannersArray: BannerItem[] = sponsor.banners;
              sponsorBannersArray.forEach(bannerObject => {
                if (typeof bannerObject === 'object' && bannerObject !== null && typeof bannerObject.imagemUrl === 'string') {
                  bannersList.push(bannerObject.imagemUrl);
                }
              });
            }
          }
          if (bannersList.length > 0) {
            setAllBanners(bannersList);
            setCurrentBannerUrl(bannersList[0]);
            setCurrentBannerIndex(0);
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          } else {
            setCurrentBannerUrl(null);
            fadeAnim.setValue(0);
          }
        } else {
          setCurrentBannerUrl(null);
          fadeAnim.setValue(0);
        }
      } catch (error) {
        console.error('Erro ao buscar banners:', error);
        Alert.alert("Erro", "Não foi possível carregar os banners.");
        setCurrentBannerUrl(null);
        fadeAnim.setValue(0);
      }
    };
    fetchBanners();
  }, [fadeAnim]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    
    if (allBanners.length > 1) {
      intervalId = setInterval(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setCurrentBannerIndex(prevIndex => {
            const nextIndex = (prevIndex + 1) % allBanners.length;
            setCurrentBannerUrl(allBanners[nextIndex]);
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
            return nextIndex;
          });
        });
      }, 6000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [allBanners, fadeAnim]);

  useEffect(() => {
    const empresasRef = ref(empresaDatabase, 'usuarios');
    const unsubscribeEmpresas = onValue(empresasRef, (snapshot) => {
      const data: { [key: string]: EmpresaData } = snapshot.val() || {};
      setEmpresas(data);
    });
    return () => unsubscribeEmpresas();
  }, []);

  const fetchInitialData = useCallback(() => {
    setLoadingInicial(true);
    const produtosRef = ref(empresaDatabase, 'produtos');
    const unsubscribeProdutos = onValue(produtosRef, (snapshot) => {
      const data: ProdutoComEmpresa[] = [];
      snapshot.forEach((userSnapshot) => {
        const empresaId = userSnapshot.key!;
        userSnapshot.forEach((produtoSnapshot) => {
          const produto = produtoSnapshot.val();
          const empresaInfo = empresas[empresaId];
          if (empresaInfo) {
            data.push({
              id: produtoSnapshot.key!, ...produto, empresaId,
              nome: empresaInfo.nome, localizacao: empresaInfo.localizacao,
              linkInstagram: empresaInfo.linkInstagram,
            });
          }
        });
      });
      setProdutosComEmpresa(data);
      setLoadingInicial(false);
      // O mapRegion inicial já está definido no useState.
      // Se precisar de uma lógica mais complexa baseada nos dados carregados, pode ser adicionada aqui.
    });
    return () => unsubscribeProdutos();
  }, [empresas]);

  useFocusEffect(fetchInitialData);

  // ... (buscarProdutos, carregarMaisProdutos, renderFooter, produtosFiltrados, dadosParaExibir permanecem os mesmos) ...
  const buscarProdutos = (texto: string) => {
    setTermoBusca(texto);
    setPagina(1);
    setTodosCarregados(false);
  };

  const carregarMaisProdutos = useCallback(() => {
    if (!carregandoMais && !todosCarregados && termoBusca.length < 3) {
      setCarregandoMais(true);
      const proximaPaginaItemsCount = pagina * ITEMS_POR_PAGINA;
      if (produtosComEmpresa.length > proximaPaginaItemsCount) {
        setPagina((prevPagina) => prevPagina + 1);
      } else {
        setTodosCarregados(true);
      }
      setCarregandoMais(false);
    }
  }, [pagina, produtosComEmpresa, carregandoMais, todosCarregados, termoBusca]);

  const renderFooter = () => {
    if (carregandoMais) return <ActivityIndicator size="large" color="#0000ff" />;
    if (!loadingInicial && !todosCarregados && termoBusca.length < 3 && produtosComEmpresa.length > pagina * ITEMS_POR_PAGINA) {
      return (
        <TouchableOpacity style={styles.botaoMostrarMais} onPress={carregarMaisProdutos}>
          <Text style={styles.textoBotaoMostrarMais}>Mostrar Mais</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const produtosFiltrados = produtosComEmpresa.filter((produto) => {
    if (termoBusca.length < 3) return true;
    const termo = termoBusca.toLowerCase();
    return (
      produto.descricao.toLowerCase().includes(termo) ||
      (produto.palavrasChave && produto.palavrasChave.toLowerCase().includes(termo)) ||
      produto.nome.toLowerCase().includes(termo)
    );
  });

  const dadosParaExibir = termoBusca.length >= 3
    ? produtosFiltrados
    : produtosComEmpresa.slice(0, pagina * ITEMS_POR_PAGINA);


  const handleVerNoMapa = (produto: ProdutoComEmpresa) => {
    if (produto.localizacao?.latitude && produto.localizacao?.longitude) {
      setSelectedLocation({ 
        latitude: produto.localizacao.latitude, 
        longitude: produto.localizacao.longitude, 
        nome: produto.nome, // Nome da empresa
        empresaId: produto.empresaId,
        produtoId: produto.id,
      });
      setMapRegion({
        latitude: produto.localizacao.latitude,
        longitude: produto.localizacao.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setMostrarMapa(true);
    } else {
      Alert.alert("Localização Indisponível", "Este item não possui dados de localização para exibir no mapa.");
    }
  };

  const handleOpenInstagram = (url: string) => {
    const linkInstagramPattern = /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9(\.\_\?)%&=\-\/]+$/;
    if (linkInstagramPattern.test(url)) {
      Linking.openURL(url).catch(err => {
        console.error("Erro ao abrir link do Instagram:", err);
        Alert.alert("Erro", "Não foi possível abrir o link do Instagram.");
      });
    } else {
      Alert.alert("Link Inválido", "O link do Instagram fornecido não parece ser válido.");
    }
  };

  if (loadingInicial && produtosComEmpresa.length === 0) {
    return (
      <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FFFFFF" /><Text style={styles.loadingText}>Carregando...</Text></View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
      <View style={styles.adBanner}>
        {currentBannerUrl ? <Animated.Image source={{ uri: currentBannerUrl }} style={[styles.bannerImage, { opacity: fadeAnim }]} resizeMode="contain" onError={(e) => console.warn("Erro banner:", e.nativeEvent.error)} />
          : <Text style={styles.adBannerText}>Espaço para Patrocínios</Text>}
      </View>
      <View style={styles.container}>
        <TextInput style={styles.input} placeholder="Buscar (mínimo 3 caracteres)" value={termoBusca} onChangeText={buscarProdutos} />
        <FlatList
          data={dadosParaExibir}
          keyExtractor={(item) => item.id + item.empresaId}
          renderItem={({ item }) => (
            <View style={styles.itemContainer}>
              {item.imagemUrl && <Image source={{ uri: item.imagemUrl }} style={styles.imagem} onError={(e) => console.log("Erro imagem:", e.nativeEvent.error)} />}
              <View style={styles.detalhes}>
                <Text style={styles.descricao}>{item.descricao}</Text>
                <View style={styles.corpoItem}>
                  <View style={styles.infoEmpresaBotoes}>
                    <Text style={styles.nome}>{item.nome}</Text>
                    <View style={styles.botoesAcaoLinha}>
                      {item.localizacao?.latitude && item.localizacao?.longitude && (
                        <TouchableOpacity
                          style={[styles.itemActionButton, styles.mapItemButton, styles.botaoEspacado]}
                          onPress={() => handleVerNoMapa(item)} // Passa o item inteiro
                        >
                          <Text style={styles.itemActionButtonText}>Ver no Mapa</Text>
                        </TouchableOpacity>
                      )}
                      {item.linkInstagram && (
                        <TouchableOpacity
                          style={[styles.itemActionButton, styles.instagramItemButton]}
                          onPress={() => handleOpenInstagram(item.linkInstagram!)}
                        >
                          <Text style={styles.itemActionButtonText}>Instagram</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <View style={styles.precoContainer}>
                    {item.preco ? <Text style={styles.preco}>{item.preco.substring(3,item.preco.length)}</Text> : <View />}
                  </View>
                </View>
              </View>
            </View>
          )}
          ListFooterComponent={renderFooter}
          onEndReachedThreshold={0.1}
          onEndReached={termoBusca.length < 3 ? carregarMaisProdutos : undefined}
        />

        {/* Visualização do Mapa estilo Overlay */}
        {mostrarMapa && (
          <View style={styles.mapOverlayContainer}>
            <View style={styles.mapDisplayBox}>
              {mapRegion ? (
                <MapView
                  style={styles.mapViewStyle}
                  region={mapRegion}
                >
                  {/* Marcador para a localização selecionada */}
                  {selectedLocation && (
                    <Marker
                      coordinate={{ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }}
                      title={selectedLocation.nome} // Nome da empresa
                      description={"Local selecionado"}
                      pinColor="blue"
                      zIndex={1} // Para garantir que fique na frente se outros marcadores sobreporem
                    >
                       <Callout tooltip>
                        <View style={styles.calloutView}>
                          <Text style={styles.calloutTitle}>{selectedLocation.nome}</Text>
                          <Text style={styles.calloutDescription}>Este é o local selecionado.</Text>
                        </View>
                      </Callout>
                    </Marker>
                  )}

                  {/* Marcadores para outros produtos/empresas */}
                  {produtosComEmpresa
                    .filter(p => 
                      p.localizacao?.latitude && 
                      p.localizacao?.longitude &&
                      // Evita renderizar o marcador padrão para o item já destacado como selectedLocation
                      !(selectedLocation && p.empresaId === selectedLocation.empresaId && p.id === selectedLocation.produtoId) 
                    )
                    .map((produto) => (
                      <Marker
                        key={produto.id + produto.empresaId + "_mapmarker"}
                        coordinate={produto.localizacao}
                        title={produto.nome} // Nome da empresa
                        description={produto.descricao.substring(0,40) + "..."}
                        pinColor="red" // Cor padrão para outros marcadores
                      >
                        <Callout tooltip>
                          <View style={styles.calloutView}>
                            <Text style={styles.calloutTitle}>{produto.nome}</Text>
                            <Text style={styles.calloutDescription}>{produto.descricao.substring(0,60) + "..."}</Text>
                          </View>
                        </Callout>
                      </Marker>
                    ))}
                </MapView>
              ) : (
                <View style={styles.mapLoadingContainer}>
                  <ActivityIndicator size="large" color="#0000ff" />
                  <Text>Carregando mapa...</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.closeMapButtonOverlay}
                onPress={() => {
                  setMostrarMapa(false);
                  setSelectedLocation(null); // Limpa a seleção
                }}
              >
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {termoBusca.length >= 3 && produtosFiltrados.length === 0 && <Text style={styles.mensagemNenhumResultado}>Nenhum produto/serviço encontrado.</Text>}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // ... (estilos anteriores permanecem, exceto os de modal e mapa na lista)
  background: { flex: 1, resizeMode: 'cover' },
  adBanner: { height: 60, backgroundColor: 'rgba(220,220,220,0.7)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%' },
  adBannerText: { fontSize: 14, fontWeight: '500', color: '#555' },
  container: { flex: 1, padding: 10 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 8, backgroundColor: 'white' },
  itemContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, marginBottom: 8, borderRadius: 8, elevation: 3, alignItems: 'center' },
  imagem: { width: 80, height: 80, borderRadius: 8, marginRight: 10 },
  detalhes: { flex: 1, flexDirection: 'column' },
  descricao: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  corpoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  infoEmpresaBotoes: { flexDirection: 'column', alignItems: 'center', flex: 1.8, paddingRight: 5 },
  nome: { fontSize: 14, color: '#0056b3', marginBottom: 8, textAlign: 'center', fontWeight: 'bold' },
  botoesAcaoLinha: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%' },
  botaoEspacado: { marginRight: 8 },
  precoContainer: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  preco: { fontSize: 30, color: 'green', fontWeight: '600', textAlign: 'right' },
  itemActionButton: { paddingVertical: 1, paddingHorizontal: 10, borderRadius: 18, alignItems: 'center', justifyContent: 'center', minHeight: 20, minWidth: 90 },
  itemActionButtonText: { color: 'white', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  mapItemButton: { backgroundColor: '#007BFF' },
  instagramItemButton: { backgroundColor: '#E1306C' },
  botaoMostrarMais: { backgroundColor: '#007bff', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
  textoBotaoMostrarMais: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  mensagemNenhumResultado: { textAlign: 'center', marginTop: 20, fontStyle: 'italic', color: 'gray', fontSize: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  loadingText: { marginTop: 10, fontSize: 16, color: 'white' },
  mapLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },


  // Novos estilos para o Overlay do Mapa (inspirados no LineUpScreen)
  mapOverlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', // Fundo escurecido
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Para garantir que fique sobre outros elementos
  },
  mapDisplayBox: {
    width: '90%', // Largura da caixa do mapa
    height: '70%', // Altura da caixa do mapa
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden', // Necessário para o MapView respeitar o borderRadius
    elevation: 10, // Sombra no Android
    shadowColor: '#000', // Sombra no iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    padding: 5, // Pequeno padding interno se necessário antes do mapa
  },
  mapViewStyle: {
    flex: 1, // Para o MapView preencher o mapDisplayBox
    borderRadius: 10, // Para arredondar o mapa em si, se o padding acima for usado
  },
  closeMapButtonOverlay: {
    position: 'absolute',
    top: 10, // Ajuste conforme necessário (dentro do padding do mapDisplayBox)
    right: 10, // Ajuste conforme necessário
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 20, // Botão redondo
    elevation: 12, // Para ficar sobre o mapa se houver sobreposição
    zIndex: 10,
  },
  // Callout styles (opcional, mas bom ter)
  calloutView: {
    width: 200, // Largura do callout
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 0.5,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#555',
  },
});