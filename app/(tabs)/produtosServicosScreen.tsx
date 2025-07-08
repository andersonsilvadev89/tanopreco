import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Linking,
  Alert,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { database } from "../../firebaseConfig";
import { ref, onValue, get } from "firebase/database";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import AdBanner from "../components/AdBanner";
import * as Location from "expo-location";

import { checkAndDownloadImages } from '../../utils/imageManager';

const defaultFundoLocal = require('../../assets/images/fundo.png');

interface ProdutoComEmpresa {
  id: string;
  descricao: string;
  preco: string;
  imagemUrl?: string;
  palavrasChave?: string;
  empresaId: string;
  nome: string;
  localizacao?: {
    latitude: number;
    longitude: number;
  };
  linkInstagram?: string;
}

interface EmpresaData {
  nomeEmpresa: string;
  localizacao?: { latitude: number; longitude: number };
  linkInstagram?: string;
}

// === INTERFACE PARA SERVIÇOS ESSENCIAIS ===
interface ServicoEssencial {
  id: string;
  descricao: string;
  latitude: number;
  longitude: number;
  // Adicione outros campos se você os tiver no Firebase, ex: tipo?: string;
}

const ITEMS_POR_PAGINA = 10;

export default function VisualizarProdutosServicos() {
  const [produtosComEmpresa, setProdutosComEmpresa] = useState<ProdutoComEmpresa[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [todosCarregados, setTodosCarregados] = useState(false);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: -7.2345, // Coordenadas padrão para Barbalha, Ceará
    longitude: -39.4056, // Coordenadas padrão para Barbalha, Ceará
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    nome: string;
    empresaId?: string;
    produtoId?: string;
  } | null>(null);
  const [empresas, setEmpresas] = useState<{ [key: string]: EmpresaData }>({});
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingUserLocation, setGettingUserLocation] = useState(false);

  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  // === NOVOS ESTADOS PARA SERVIÇOS ESSENCIAIS ===
  const [servicosEssenciais, setServicosEssenciais] = useState<ServicoEssencial[]>([]);
  const [servicosLoading, setServicosLoading] = useState(true);
  const [servicosError, setServicosError] = useState<string | null>(null);

  // --- useEffect para carregar a imagem de fundo dinâmica ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na VisualizarProdutosServicos:", error);
        setCurrentFundoSource(defaultFundoLocal);
      } finally {
        setFundoAppReady(true);
      }
    };
    loadFundoImage();
  }, []);

  useEffect(() => {
    const empresasRef = ref(database, 'solicitacoesEmpresas');
    const unsubscribeEmpresas = onValue(empresasRef, (snapshot) => {
      const data: { [key: string]: EmpresaData } = snapshot.val() || {};
      setEmpresas(data);
    });
    return () => unsubscribeEmpresas();
  }, []);

  // === NOVO useEffect para buscar Serviços Essenciais ===
  useEffect(() => {
    const fetchServicos = async () => {
      setServicosLoading(true);
      setServicosError(null);
      try {
        const servicosRef = ref(database, 'servicos_essenciais'); // Nó do Firebase para serviços
        const snapshot = await get(servicosRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list: ServicoEssencial[] = Object.keys(data).map(key => ({
            id: key,
            ...data[key],
          }));
          setServicosEssenciais(list);
        } else {
          setServicosEssenciais([]);
        }
      } catch (err: any) {
        console.error("Erro ao buscar serviços essenciais:", err);
        setServicosError('Não foi possível carregar os serviços essenciais.');
      } finally {
        setServicosLoading(false);
      }
    };
    fetchServicos();
  }, []); // Executa apenas uma vez ao montar


  const fetchInitialData = useCallback(async () => {
    if (Object.keys(empresas).length === 0) {
      setLoadingInicial(true);
      return;
    }

    setLoadingInicial(true);
    const produtosRef = ref(database, 'produtos');
    const snapshot = await get(produtosRef);

    const data: ProdutoComEmpresa[] = [];
    if (snapshot.exists()) {
      const promises: Promise<void>[] = [];
      snapshot.forEach((userSnapshot) => {
        const empresaId = userSnapshot.key!;
        userSnapshot.forEach((produtoSnapshot) => {
          const promise = (async () => {
            const produto = produtoSnapshot.val();
            let empresaInfo = empresas[empresaId];

            if (empresaInfo && !empresaInfo.localizacao) {
              const locRef = ref(database, `localizacoes/${empresaId}`);
              const locSnapshot = await get(locRef);
              if (locSnapshot.exists()) {
                const locData = locSnapshot.val();
                empresaInfo.localizacao = {
                  latitude: locData.latitude,
                  longitude: locData.longitude
                };
              }
            }

            if (empresaInfo) {
              data.push({
                id: produtoSnapshot.key!,
                ...produto,
                empresaId,
                nome: empresaInfo.nomeEmpresa,
                localizacao: empresaInfo.localizacao,
                linkInstagram: empresaInfo.linkInstagram,
              });
            }
          })();
          promises.push(promise);
        });
      });
      await Promise.all(promises);
    }

    setProdutosComEmpresa(data.sort((a, b) => a.nome.localeCompare(b.nome)));
    setLoadingInicial(false);
  }, [empresas]);

  const getUserCurrentLocation = async () => {
    setGettingUserLocation(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão de Localização', 'Precisamos da sua permissão para mostrar sua localização no mapa.');
      setGettingUserLocation(false);
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error("Erro ao obter localização do usuário:", error);
      Alert.alert("Erro de Localização", "Não foi possível obter sua localização atual.");
    } finally {
      setGettingUserLocation(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
      getUserCurrentLocation();
    }, [fetchInitialData])
  );

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
        nome: produto.nome,
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
      Alert.alert("Localização Indisponível", "Esta empresa não possui uma localização cadastrada para este produto.");
    }
  };

  const openInstagramProfile = async (username: string | undefined) => {
    if (!username) {
      Alert.alert("Instagram não informado", "Esta empresa não possui um Instagram cadastrado.");
      return;
    }
    const url = `https://www.instagram.com/${username}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Erro", `Não foi possível abrir o perfil: ${url}`);
      }
    } catch (error) {
      Alert.alert("Erro", "Ocorreu um erro ao tentar abrir o Instagram.");
    }
  };

  // === NOVO HANDLER: Para abrir serviços no mapa ===
  const handleVerNoMapaServico = (servico: ServicoEssencial) => {
    if (servico.latitude && servico.longitude) {
      setSelectedLocation({
        latitude: servico.latitude,
        longitude: servico.longitude,
        nome: servico.descricao, // Usa a descrição do serviço como nome
      });
      setMapRegion({
        latitude: servico.latitude,
        longitude: servico.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setMostrarMapa(true);
    } else {
      Alert.alert("Localização Indisponível", "Este serviço não possui uma localização cadastrada.");
    }
  };


  // --- Condição de carregamento geral: Integra o fundo do app e os serviços ---
  if (loadingInicial || gettingUserLocation || !fundoAppReady || servicosLoading) { // Adicionado servicosLoading
    return (
      <ImageBackground source={currentFundoSource} style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Carregando...</Text>
          {gettingUserLocation && (
            <Text style={styles.loadingText}>Obtendo sua localização...</Text>
          )}
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={currentFundoSource} style={styles.background}>
      <AdBanner />
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
                          onPress={() => handleVerNoMapa(item)}
                        >
                          <Text style={styles.itemActionButtonText}>Ver no Mapa</Text>
                        </TouchableOpacity>
                      )}
                      {item.linkInstagram && (
                        <TouchableOpacity onPress={() => openInstagramProfile(item.linkInstagram)}>
                          <LinearGradient
                            colors={['#8a3ab9', '#bc2a8d', '#fbad50']}
                            start={{ x: 0.0, y: 1.0 }} end={{ x: 1.0, y: 0.0 }}
                            style={styles.instagramButton}
                          >
                            <Text style={styles.instagramButtonText}>Instagram</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <View style={styles.precoContainer}>
                    {item.preco ? <Text style={styles.preco}>{item.preco.substring(3, item.preco.length)}</Text> : <View />}
                  </View>
                </View>
              </View>
            </View>
          )}
          ListFooterComponent={renderFooter}
          onEndReachedThreshold={0.1}
          onEndReached={termoBusca.length < 3 ? carregarMaisProdutos : undefined}
          ListEmptyComponent={!loadingInicial ? <Text style={styles.mensagemNenhumResultado}>Nenhum produto/serviço encontrado.</Text> : null}
          style={styles.productList} // Estilo para a FlatList principal
        />

        {servicosLoading ? (
            <View style={styles.servicosLoadingContainer}><ActivityIndicator size="small" color="#fff" /><Text style={styles.servicosLoadingText}>Carregando serviços...</Text></View>
        ) : servicosError ? (
            <View style={styles.servicosLoadingContainer}><Text style={styles.servicosErrorText}>{servicosError}</Text></View>
        ) : servicosEssenciais.length > 0 ? (
            <View style={styles.servicosEssenciaisSection}>
                <Text style={styles.servicosEssenciaisTitle}>Serviços Essenciais</Text>
                <FlatList
                    data={servicosEssenciais}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.servicosEssenciaisListContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.servicoEssencialItem}
                            onPress={() => handleVerNoMapaServico(item)} // Abre o serviço no mapa
                        >
                            <Feather name="map-pin" size={18} color="#007bff" /> 
                            <Text style={styles.servicoEssencialItemText}>{item.descricao}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        ) : null}


        {mostrarMapa && (
          <View style={styles.mapOverlayContainer}>
            <View style={styles.mapDisplayBox}>
              {mapRegion ? (
                <MapView style={styles.mapViewStyle} region={mapRegion}>
                  {userLocation && (
                    <Marker
                      coordinate={userLocation}
                      zIndex={2}
                    >
                      <View style={styles.myLocationMarker}>
                        <Text style={styles.myLocationMarkerText}>EU</Text>
                      </View>
                      <Callout tooltip>
                        <View style={styles.calloutView}>
                          <Text style={styles.calloutTitle}>Você</Text>
                          <Text style={styles.calloutDescription}>Sua localização atual.</Text>
                        </View>
                      </Callout>
                    </Marker>
                  )}
                  {selectedLocation && (
                    <Marker
                      coordinate={{ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }}
                      title={selectedLocation.nome}
                      description={"Local selecionado"}
                      pinColor="red"
                      zIndex={1}
                    >
                      <Callout tooltip>
                        <View style={styles.calloutView}>
                          <Text style={styles.calloutTitle}>{selectedLocation.nome}</Text>
                          <Text style={styles.calloutDescription}>Este é o local selecionado.</Text>
                        </View>
                      </Callout>
                    </Marker>
                  )}
                  {produtosComEmpresa
                    .filter(p =>
                      p.localizacao?.latitude && p.localizacao?.longitude &&
                      // Evita duplicar o marcador se for o "selectedLocation" vindo de um produto
                      !(selectedLocation && p.empresaId === selectedLocation.empresaId && p.id === selectedLocation.produtoId)
                    )
                    .map((produto) => (
                      <Marker
                        key={produto.id + produto.empresaId + "_mapmarker"}
                        coordinate={produto.localizacao!}
                        title={produto.nome}
                        description={produto.descricao.substring(0, 40) + "..."}
                        pinColor="yellow"
                      >
                        <Callout tooltip>
                          <View style={styles.calloutView}>
                            <Text style={styles.calloutTitle}>{produto.nome}</Text>
                            <Text style={styles.calloutDescription}>{produto.descricao.substring(0, 60) + "..."}</Text>
                          </View>
                        </Callout>
                      </Marker>
                    ))}
                    {servicosEssenciais
                      .filter(s => 
                        s.latitude && s.longitude && 
                        // Evita duplicar o marcador se for o "selectedLocation" vindo de um serviço
                        !(selectedLocation && selectedLocation.nome === s.descricao && selectedLocation.latitude === s.latitude && selectedLocation.longitude === s.longitude)
                      )
                      .map((servico) => (
                        <Marker
                          key={servico.id + "_servicomapmarker"}
                          coordinate={{latitude: servico.latitude, longitude: servico.longitude}}
                          title={servico.descricao}
                          description={"Serviço Essencial"}
                          pinColor="blue" // Cor diferente para serviços
                        >
                          <Callout tooltip>
                            <View style={styles.calloutView}>
                              <Text style={styles.calloutTitle}>{servico.descricao}</Text>
                              <Text style={styles.calloutDescription}>Serviço Essencial</Text>
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
                  setSelectedLocation(null);
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
  background: { flex: 1, resizeMode: 'cover' },
  container: { flex: 1, padding: 10 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 8, backgroundColor: 'white' },
  productList: { flex: 1, /* allow FlatList to shrink if services section takes space */ }, // Estilo para a FlatList principal
  itemContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, marginBottom: 8, borderRadius: 8, elevation: 3, alignItems: 'center' },
  imagem: { width: 80, height: 80, borderRadius: 8, marginRight: 10 },
  detalhes: { flex: 1, flexDirection: 'column' },
  descricao: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  corpoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  infoEmpresaBotoes: { flexDirection: 'column', alignItems: 'center', flex: 1.8, paddingRight: 5 },
  nome: { fontSize: 14, color: '#0056b3', marginBottom: 8, textAlign: 'center', fontWeight: 'bold' },
  botoesAcaoLinha: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: 22 },
  botaoEspacado: { marginRight: 8 },
  precoContainer: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  preco: { fontSize: 30, color: 'green', fontWeight: '600', textAlign: 'right' },
  itemActionButton: { paddingVertical: 1, paddingHorizontal: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center', minHeight: 20, minWidth: 90 },
  itemActionButtonText: { color: 'white', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  mapItemButton: { backgroundColor: '#007BFF' },
  botaoMostrarMais: { backgroundColor: '#007bff', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
  textoBotaoMostrarMais: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  mensagemNenhumResultado: { textAlign: 'center', marginTop: 20, fontStyle: 'italic', color: 'gray', fontSize: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  loadingText: { marginTop: 10, fontSize: 16, color: 'white' },
  mapLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapOverlayContainer: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center',
    alignItems: 'center', zIndex: 1000,
  },
  mapDisplayBox: {
    width: '90%', height: '70%', backgroundColor: 'white',
    borderRadius: 15, overflow: 'hidden', elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 5, padding: 5,
  },
  mapViewStyle: { flex: 1, borderRadius: 10 },
  closeMapButtonOverlay: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 8,
    borderRadius: 20, elevation: 12, zIndex: 10,
  },
  calloutView: {
    width: 200, padding: 10, backgroundColor: 'white',
    borderRadius: 8, borderColor: '#ccc', borderWidth: 0.5,
  },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, color: '#333', marginBottom: 3 },
  calloutDescription: { fontSize: 12, color: '#555' },
  instagramButton: {
    paddingVertical: 1, paddingHorizontal: 10, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    minWidth: 90, minHeight: 20,
  },
  instagramButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  myLocationMarker: {
    backgroundColor: '#007BFF',
    padding: 6,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'white',
    borderWidth: 1.5,
  },
  myLocationMarkerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
  // === NOVOS ESTILOS PARA A SEÇÃO DE SERVIÇOS ESSENCIAIS ===
  servicosEssenciaisSection: {
    height: Dimensions.get('window').height * 0.15, // Altura fixa para a seção de serviços
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 10,
    marginTop: 15,
    marginHorizontal: 5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    justifyContent: 'center',
  },
  servicosEssenciaisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  servicosEssenciaisListContent: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    alignItems: 'center', // Centraliza os itens na FlatList horizontal
  },
  servicoEssencialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F3FF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  servicoEssencialItemText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#007bff',
  },
  servicosLoadingContainer: {
    height: Dimensions.get('window').height * 0.15, // Mesma altura da seção para manter o layout
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    marginHorizontal: 5,
  },
  servicosLoadingText: {
    marginTop: 10,
    color: '#007bff',
    fontSize: 14,
  },
  servicosErrorText: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});