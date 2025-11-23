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
  Switch,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { database } from "../../firebaseConfig";
import { ref, onValue, set, get, update, increment } from "firebase/database";
import { useFocusEffect } from "@react-navigation/native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import AdBanner from "../components/AdBanner";
import * as Location from "expo-location";
import AdCard from "../components/AdCard";
import { useAuth } from "../../context/AuthContext";
import { ProdutoCard } from "../components/ProdutoCard";
import { LinearGradient } from "expo-linear-gradient";

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// ----------------------------------------------------
// 1. CONSTANTES E CONFIGURAÇÕES
// ----------------------------------------------------

const defaultFundoLocal = require("../../assets/images/fundo.png");
const { width } = Dimensions.get("window");

// Tamanho do card de produto
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;
const CARD_MIN_HEIGHT = 300;

// 💡 IMPORTANTE: 4 categorias + 1 botão "Mais" = 5 itens na linha
const CATEGORIAS_INICIAIS = 4;

interface ProdutoComEmpresa {
  id: string;
  descricao: string;
  preco: string;
  imagemUrl?: string;
  palavrasChave?: string;
  empresaId: string;
  nomeEmpresa: string;
  latitudeEmpresa: number;
  longitudeEmpresa: number;
  latitudeProduto?: number;
  longitudeProduto?: number;
  localizacaoDiferente?: boolean;
  dataFinalOferta?: string;
  // ✅ 1. ADICIONADO O CAMPO NA INTERFACE
  enquantoDurarEstoque?: boolean; 
  destaque?: boolean;
  categoria?: string;
  isAd?: boolean;
  unlike?: number;
  like?: number;
  ordemAleatoria?: number;
}

interface EmpresaData {
  nomeEmpresa: string;
  latitude?: number;
  longitude?: number;
  instagram?: string;
  telefone?: string;
}

const categoriaImagens: { [key: string]: any } = {
  Alimentação: require("../../assets/categorias/alimentacao.png"),
  Bebidas: require("../../assets/categorias/bebidas.png"),
  Serviços: require("../../assets/categorias/servico.png"),
  Moda: require("../../assets/categorias/moda.png"),
  Saúde: require("../../assets/categorias/saude.png"),
  Beleza: require("../../assets/categorias/beleza.png"),
  Tecnologia: require("../../assets/categorias/tecnologia.png"),
  Móveis: require("../../assets/categorias/moveis.png"),
  Kids: require("../../assets/categorias/kids.png"),
  Imóveis: require("../../assets/categorias/imoveis.png"),
  Autos: require("../../assets/categorias/autos.png"),
  Mercado: require("../../assets/categorias/mercado.png"),
  Utilidades: require("../../assets/categorias/utilidades.png"),
  Outros: require("../../assets/categorias/outros.png"),
};

const categorias = [
  { nome: "Alimentação" },
  { nome: "Bebidas" },
  { nome: "Moda" },
  { nome: "Saúde" },
  { nome: "Beleza" },
  { nome: "Kids" },
  { nome: "Serviços" },
  { nome: "Tecnologia" },
  { nome: "Móveis" },
  { nome: "Imóveis" },
  { nome: "Autos" },
  { nome: "Mercado" },
  { nome: "Utilidades" },
  { nome: "Outros" },
];

function removerAcentos(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isOfertaValida(dataFinalOferta?: string) {
  if (!dataFinalOferta) return false;
  
  const [dia, mes, ano] = dataFinalOferta.split("/");
  
  // CORREÇÃO: Usamos o construtor (ano, mesIndex, dia). 
  // O Mês no JS começa em 0 (Janeiro = 0, Novembro = 10), por isso subtraímos 1.
  // Isso cria a data no horário local (00:00:00), evitando o bug de fuso horário.
  const dataFinal = new Date(Number(ano), Number(mes) - 1, Number(dia));
  
  const hoje = new Date();
  
  // Zeramos as horas de ambas as datas para garantir que estamos comparando apenas o DIA
  hoje.setHours(0, 0, 0, 0);
  dataFinal.setHours(0, 0, 0, 0);
  
  // Usamos .getTime() para comparar os timestamps numéricos
  return dataFinal.getTime() >= hoje.getTime();
}

function calcularDistancia(userLocation: any, empresaLocation: any) {
  if (!userLocation || !empresaLocation) return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(empresaLocation.latitude - userLocation.latitude);
  const dLon = toRad(empresaLocation.longitude - userLocation.longitude);
  const lat1 = toRad(userLocation.latitude);
  const lat2 = toRad(empresaLocation.latitude);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const AD_PLACEHOLDER: ProdutoComEmpresa = {
  id: "ad_placeholder",
  descricao: "Anúncio",
  preco: "R$ 0,00",
  empresaId: "ad",
  nomeEmpresa: "AdMob",
  latitudeEmpresa: 0,
  longitudeEmpresa: 0,
  isAd: true,
};

function getProdutoLocation(produto: ProdutoComEmpresa): { latitude: number; longitude: number; isProdutoLocation: boolean } | null {
  if (produto.localizacaoDiferente && produto.latitudeProduto && produto.longitudeProduto) {
    return { latitude: produto.latitudeProduto, longitude: produto.longitudeProduto, isProdutoLocation: true };
  } else if (produto.latitudeEmpresa && produto.longitudeEmpresa) {
    return { latitude: produto.latitudeEmpresa, longitude: produto.longitudeEmpresa, isProdutoLocation: false };
  }
  return null;
}

// ----------------------------------------------------
// 2. COMPONENTE PRINCIPAL
// ----------------------------------------------------

export default function HomeScreen() {
  const { deviceId } = useAuth();

  const [ordenacaoManual, setOrdenacaoManual] = useState(false);
  const [produtosComEmpresa, setProdutosComEmpresa] = useState<ProdutoComEmpresa[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [ordenarPorPreco, setOrdenarPorPreco] = useState(true);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; } | null>(null);
  const [expandirCategorias, setExpandirCategorias] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: -7.2345, longitude: -39.4056, latitudeDelta: 0.0922, longitudeDelta: 0.0421,
  });
  const [empresas, setEmpresas] = useState<{ [key: string]: EmpresaData }>({});
  const [imagemModalVisivel, setImagemModalVisivel] = useState(false);
  const [imagemModalUrl, setImagemModalUrl] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const toggleCategorias = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandirCategorias(!expandirCategorias);
  };

  const handleImagePress = useCallback((url: string) => {
    setImagemModalUrl(url);
    setImagemModalVisivel(true);
  }, []);

  const handleVerNoMapa = useCallback((produto: ProdutoComEmpresa) => {
    const location = getProdutoLocation(produto);
    if (location) {
      setSelectedLocation({
        latitude: location.latitude, longitude: location.longitude, nome: produto.nomeEmpresa, empresaId: produto.empresaId, produtoId: produto.id,
      });
      setMapRegion({ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.0922, longitudeDelta: 0.0421 });
      setMostrarMapa(true);
    } else {
      Alert.alert("Localização Indisponível", "Esta empresa/produto não possui uma localização cadastrada.");
    }
  }, []);

  const openInstagramProfile = useCallback(async (username: string | undefined) => {
    if (!username) { Alert.alert("Instagram não informado", "Esta empresa não possui um Instagram cadastrado."); return; }
    const user = username.replace("@", "");
    try { await Linking.openURL(`https://www.instagram.com/${user}`); } catch { Alert.alert("Erro", "Erro ao abrir Instagram."); }
  }, []);

  const openWhatsApp = useCallback((telefone: string | undefined) => {
    if (!telefone) { Alert.alert("WhatsApp não informado", "Esta empresa não possui telefone."); return; }
    const numeroLimpo = telefone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/55${numeroLimpo}`).catch(() => Alert.alert("Erro", "Não foi possível abrir o WhatsApp."));
  }, []);

  const votarProduto = useCallback(async (produtoId: string, tipo: "like" | "unlike") => {
    if (!deviceId) return;
    const produtoVotado = produtosComEmpresa.find(p => p.id === produtoId);
    if (!produtoVotado) return;

    const empresaId = produtoVotado.empresaId;
    const votoRef = ref(database, `votos/${produtoId}/${deviceId}`);
    const votoSnapshot = await get(votoRef);
    const produtoRef = ref(database, `produtos/${empresaId}/${produtoId}`);

    if (votoSnapshot.exists()) {
      if (votoSnapshot.val().tipo === tipo) {
        Alert.alert("Voto Já Registrado", `Retirar seu voto?`, [
          { text: "Não", style: 'cancel' },
          {
            text: "Sim", onPress: async () => {
              await set(votoRef, null);
              await update(produtoRef, { [tipo]: increment(-1) });
              setProdutosComEmpresa(prev => prev.map(p => p.id === produtoId ? { ...p, [tipo]: Math.max(0, (p[tipo] || 0) - 1) } : p));
              Alert.alert("Sucesso", "Voto retirado.");
            }, style: 'destructive'
          }
        ]);
        return;
      }
    }

    Alert.alert(tipo === 'like' ? 'VOTO POSITIVO' : 'VOTO NEGATIVO', "Confirmar voto?", [
      { text: "Cancelar", style: 'cancel' },
      {
        text: "Confirmar", onPress: async () => {
          await set(votoRef, { tipo });
          await update(produtoRef, { [tipo]: increment(1) });
          setProdutosComEmpresa(prev => prev.map(p => p.id === produtoId ? { ...p, [tipo]: (p[tipo] || 0) + 1 } : p));
        }
      }
    ]);
  }, [deviceId, produtosComEmpresa]);

  useEffect(() => {
    onValue(ref(database, "usuariosEmpresa"), (snapshot) => {
      const data: { [key: string]: EmpresaData } = {};
      snapshot.forEach((snap) => { data[snap.key!] = snap.val(); });
      setEmpresas(data);
    });
  }, []);

  // ... (useFocusEffect para produtos e localização)

  useFocusEffect(
    useCallback(() => {
      if (!Object.keys(empresas).length) {
        return;
      }
      setLoadingInicial(true);
      const produtosRef = ref(database, "produtos");
      get(produtosRef).then((snapshot) => {
        const data: ProdutoComEmpresa[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((userSnapshot) => {
            const empresaId = userSnapshot.key!;
            const empresaInfo = empresas[empresaId];
            if (empresaInfo) {
              userSnapshot.forEach((produtoSnapshot) => {
                const produto = produtoSnapshot.val();
                data.push({
                  id: produtoSnapshot.key!,
                  ...produto,
                  empresaId,
                  nomeEmpresa: empresaInfo.nomeEmpresa,
                  latitudeEmpresa: empresaInfo.latitude || 0,
                  longitudeEmpresa: empresaInfo.longitude || 0,
                  latitudeProduto: produto.latitude || null,
                  longitudeProduto: produto.longitude || null,
                  localizacaoDiferente: !!produto.localizacaoDiferente,
                  dataFinalOferta: produto.dataFinalOferta,
                  
                  // ✅ 2. CAPTURANDO O VALOR DO BANCO DE DADOS
                  enquantoDurarEstoque: !!produto.enquantoDurarEstoque,
                  
                  destaque: produto.destaque,
                  palavrasChave: produto.palavrasChave,
                  like: produto.like || 0,
                  unlike: produto.unlike || 0,
                  ordemAleatoria: Math.random(),
                });
              });
            }
          });
        }
        setProdutosComEmpresa(data.filter(p => isOfertaValida(p.dataFinalOferta)));
        setLoadingInicial(false);
      });
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      })();
    }, [empresas])
  );

  useEffect(() => {
    if (mostrarMapa && userLocation && selectedLocation && mapRef.current) {
      const coords = [userLocation, { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }];
      setTimeout(() => mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 100, right: 50, bottom: 50, left: 50 }, animated: true }), 300);
    }
  }, [mostrarMapa, userLocation, selectedLocation]);

  const produtosValidos = produtosComEmpresa.filter((produto) => {
    if (categoriaSelecionada) {
      if (!removerAcentos(produto.palavrasChave || "").includes(removerAcentos(categoriaSelecionada))) return false;
    }
    if (termoBusca.length >= 3) {
      const termo = removerAcentos(termoBusca);
      if (!removerAcentos(produto.descricao || "").includes(termo) &&
        !removerAcentos(produto.palavrasChave || "").includes(termo) &&
        !removerAcentos(produto.nomeEmpresa || "").includes(termo)) return false;
    }
    return true;
  });

  const produtosParaExibir = termoBusca.length >= 3 || categoriaSelecionada ? produtosValidos : produtosValidos.filter(p => p.destaque);
  const tituloDaLista = termoBusca.length >= 3 || categoriaSelecionada ? `Resultados da busca (${categoriaSelecionada})` : "Produtos em Destaque";

  const produtosOrdenados = [...produtosParaExibir].sort((a, b) => {
    // 1. Se for ordenação aleatória inicial (sem busca e sem categoria)
    if (!ordenacaoManual && termoBusca.length < 3 && !categoriaSelecionada) {
      return (a.ordemAleatoria || 0) - (b.ordemAleatoria || 0);
    }

    // 2. Helpers para pegar os valores limpos
    const getPreco = (p: ProdutoComEmpresa) => {
      // CORREÇÃO DE PARSE: Remove R$, depois remove PONTOS de milhar, depois troca VÍRGULA por PONTO decimal
      const valorLimpo = p.preco.replace("R$", "").replace(/\./g, "").replace(",", ".");
      return parseFloat(valorLimpo.trim());
    };

    const getDist = (p: ProdutoComEmpresa) => {
      const loc = getProdutoLocation(p);
      // Se não tiver location do user ou do produto, joga para o final (Infinity)
      return (userLocation && loc) ? (calcularDistancia(userLocation, loc) ?? Infinity) : Infinity;
    };

    const precoA = getPreco(a);
    const precoB = getPreco(b);
    const distA = getDist(a);
    const distB = getDist(b);

    // 3. Lógica de Ordenação com Desempate
    if (ordenarPorPreco) {
      // PRIMÁRIO: Menor Preço
      if (precoA !== precoB) {
        return precoA - precoB;
      }
      // SECUNDÁRIO (Desempate): Menor Distância
      return distA - distB;
    } else {
      // PRIMÁRIO: Menor Distância
      // Usamos uma pequena margem de erro para floats, mas geralmente a subtração direta funciona
      const diffDist = distA - distB;
      
      // Se a diferença de distância for significativa (maior que 5 metros, ex: 0.005km), ordena por distância
      if (Math.abs(diffDist) > 0.005) {
        return diffDist;
      }
      
      // SECUNDÁRIO (Desempate): Se estiverem na "mesma" distância, ordena pelo Menor Preço
      return precoA - precoB;
    }
  });

  const produtosFinal = [];
  let adCount = 0;
  produtosOrdenados.forEach((p, i) => {
    produtosFinal.push(p);
    adCount++;
    if (adCount % 5 === 0) produtosFinal.push({ ...AD_PLACEHOLDER, id: `ad_${i}` });
  });
  if (produtosFinal.length % 2 === 1) produtosFinal.push({ ...AD_PLACEHOLDER, id: `ad_end` });

  const openExternalMap = (lat: number, lon: number, label: string) => {
    const url = Platform.select({ ios: `maps:0,0?q=${lat},${lon}(${label})`, android: `geo:0,0?q=${lat},${lon}(${label})` });
    Linking.openURL(url!).catch(() => Linking.openURL(`http://maps.google.com/maps?q=${lat},${lon}`));
  };

  const renderProdutoItem = useCallback(({ item }: { item: ProdutoComEmpresa }) => {
    if (item.isAd) return <View style={styles.cardProdutoGenerico}><AdCard /></View>;
    const emp = empresas[item.empresaId];
    if (!emp) return null;
    return <ProdutoCard produto={item} empresaInfo={emp} userLocation={userLocation} deviceId={deviceId} votarProduto={votarProduto} handleVerNoMapa={handleVerNoMapa} openInstagramProfile={openInstagramProfile} openWhatsApp={openWhatsApp} onImagePress={handleImagePress} />;
  }, [empresas, userLocation, deviceId]);

  const categoriasExibidas = expandirCategorias ? categorias : categorias.slice(0, CATEGORIAS_INICIAIS);

  return (
    <ImageBackground source={defaultFundoLocal} style={styles.background}>
      <AdBanner />
      <View style={styles.container}>

        {/* HEADER COM GRADIENTE */}
        <LinearGradient colors={['#064ec7', '#04358a', '#011b4aff']} style={styles.topBarContainer}>

          {/* --- NOVO: CONTADOR DE PRODUTOS CADASTRADOS --- */}
          <View style={styles.contadorContainer}>
  <Text style={styles.contadorTexto}>
    {produtosComEmpresa.length < 100 ? (
      <>
        Estamos com <Text style={styles.textoDestaque}>novas ofertas</Text> todos os dias!
      </>
    ) : (
      <>
        Estamos com mais de <Text style={styles.textoDestaque}>{produtosComEmpresa.length - 1} ofertas</Text> até agora
      </>
    )}
  </Text>
</View>

          {/* Busca */}
          <View style={styles.buscaOverlayContainer}>
            <TextInput
              style={styles.inputBuscaOverlay}
              placeholder="Busque produtos ou serviços..."
              value={termoBusca}
              onChangeText={setTermoBusca}
              placeholderTextColor="#888"
            />
            <Image source={require("../../assets/images/lupa.png")} style={styles.lupaSobreposta} />
          </View>

          {/* Ordenação */}
          <View style={styles.ordenacaoContainer}>
            <Text style={{ color: "#ffffffea", fontWeight: "bold" }}>Ordenar por:</Text>
            <Text style={[styles.ordenacaoText, !ordenarPorPreco && styles.ordenacaoTextActive]}>Proximidade</Text>
            <Switch
              value={ordenarPorPreco}
              onValueChange={(v) => { setOrdenarPorPreco(v); setOrdenacaoManual(true); }}
              thumbColor={"white"}
              trackColor={{ false: "#ccc", true: "#ccc" }}
            />
            <Text style={[styles.ordenacaoText, ordenarPorPreco && styles.ordenacaoTextActive]}>Menor Preço</Text>
          </View>

          {/* 💡 CATEGORIAS EM GRADE (ACORDEÃO) */}
          <View style={styles.categoriasContainer}>
            <View style={styles.categoriasGrid}>

              {categoriasExibidas.map((cat) => (
                <View key={cat.nome} style={styles.categoriaItem}>
                  <TouchableOpacity
                    style={[styles.categoriaBotaoRedondo, categoriaSelecionada === cat.nome && styles.categoriaBotaoSelecionado]}
                    onPress={() => setCategoriaSelecionada(cat.nome === categoriaSelecionada ? null : cat.nome)}
                  >
                    <Image source={categoriaImagens[cat.nome]} style={styles.categoriaImagem} resizeMode="contain" />
                  </TouchableOpacity>
                  <Text style={[styles.categoriaLegenda, categoriaSelecionada === cat.nome && { color: "#5bc5ffff", fontWeight: "bold" }]}>
                    {cat.nome}
                  </Text>
                </View>
              ))}

              {/* Botão Mais/Menos - SEMPRE visível ao final da lista exibida (seja curta ou longa) */}
              <View style={styles.categoriaItem}>
                <TouchableOpacity
                  style={[styles.categoriaBotaoRedondo, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                  onPress={toggleCategorias}
                >
                  <Feather name={expandirCategorias ? "chevron-up" : "plus"} size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.categoriaLegenda}>{expandirCategorias ? "Menos" : "Mais"}</Text>
              </View>

            </View>
          </View>

        </LinearGradient>

        <View style={styles.listTitleContainer}>
          <Text style={styles.listTitle}>{tituloDaLista}</Text>
        </View>

        {loadingInicial ? <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 30 }} /> :
          <FlatList
            data={produtosFinal}
            keyExtractor={(item) => item.id + item.empresaId}
            ListEmptyComponent={<Text style={styles.mensagemNenhumResultado}>Nenhum produto encontrado.</Text>}
            numColumns={2}
            columnWrapperStyle={styles.cardRow}
            renderItem={renderProdutoItem}
            style={styles.productList}
          />
        }

        {/* Mapa e Modal (Mantidos) */}
        {mostrarMapa && mapRegion && userLocation && (
          <View style={styles.mapOverlayContainer}>
            <View style={styles.mapDisplayBox}>
              <MapView style={styles.mapViewStyle} region={mapRegion} ref={mapRef}>
                <Marker coordinate={userLocation}><View style={styles.myLocationMarker}><Text style={styles.myLocationMarkerText}>EU</Text></View></Marker>
                {selectedLocation && <Marker coordinate={{ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }} pinColor="red" />}
              </MapView>
              <TouchableOpacity style={styles.closeMapButtonOverlay} onPress={() => setMostrarMapa(false)}><Feather name="x" size={24} color="#333" /></TouchableOpacity>
              <TouchableOpacity style={styles.externalMapButton} onPress={() => openExternalMap(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.nome)}><Text style={styles.externalMapButtonText}>Abrir Rota</Text></TouchableOpacity>
            </View>
          </View>
        )}
        {imagemModalVisivel && imagemModalUrl && (
          <Modal transparent animationType="fade" visible={imagemModalVisivel} onRequestClose={() => setImagemModalVisivel(false)}>
            <View style={styles.modalContainer}>
              <TouchableOpacity style={styles.modalBackground} onPress={() => setImagemModalVisivel(false)}>
                <Image source={{ uri: imagemModalUrl }} style={styles.imagemModal} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          </Modal>
        )}

      </View>
    </ImageBackground>
  );
}

// ----------------------------------------------------
// 5. ESTILOS ATUALIZADOS
// ----------------------------------------------------

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: "cover" },
  container: { flex: 1 },
  topBarContainer: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 5,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 10,
  },

  // --- NOVO ESTILO: CONTADOR ---
  contadorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12, // Espaço entre o texto e a barra de busca
  },
  contadorTexto: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold", // Peso base
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // ADICIONE ESTE ESTILO NOVO:
  textoDestaque: {
    color: "#47ea1aff", // Amarelo Ouro (contrasta muito bem com azul)
    fontSize: 17,     // Um pouco maior que o texto normal (que é 14)
    fontWeight: "900", // Extra negrito
    textDecorationLine: "underline", // Opcional: sublinhado para ênfase extra
  },
  // -----------------------------

  buscaOverlayContainer: {
    justifyContent: "center",
    alignItems: "flex-start",
    width: "100%",
    paddingHorizontal: 10,
  },
  inputBuscaOverlay: {
    width: "90%", // Ocupa a largura do container pai (respeitando padding)
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingLeft: 45,
    paddingRight: 10,
    height: 40,
    elevation: 2,
    marginLeft: 15,
  },
  lupaSobreposta: {
    position: "absolute",
    left: 10,
    top: 0,
    width: 50,
    height: 50,
    zIndex: 2,
  },
  ordenacaoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    marginBottom: 5,
  },
  ordenacaoText: {
    marginHorizontal: 5,
    color: "#e0e0e0",
    fontSize: 12,
  },
  ordenacaoTextActive: {
    fontWeight: "bold",
    color: "#FFF",
    textDecorationLine: "underline",
  },

  // 💡 ESTILOS DA GRADE DE CATEGORIAS
  categoriasContainer: {
    width: '100%',
    marginTop: 5,
  },
  categoriasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // Alinha à esquerda para o wrap funcionar bem
    paddingHorizontal: 5, // Pequeno padding lateral
  },
  categoriaItem: {
    alignItems: "center",
    justifyContent: "flex-start",
    width: '20%',
    marginBottom: 5,
  },
  categoriaBotaoRedondo: {
    width: 60,
    height: 60,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    elevation: 3,

  },
  categoriaBotaoSelecionado: {
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "#5bc5ffff",
  },
  categoriaImagem: {
    width: 40,
    height: 40,
  },
  categoriaLegenda: {
    fontSize: 10, // Fonte um pouco menor para não quebrar linha
    color: "#e0e0e0",
    fontWeight: "600",
    textAlign: "center",
  },

  // Outros estilos (mantidos)
  listTitleContainer: { paddingHorizontal: 12, paddingVertical: 8 },
  listTitle: { fontSize: 20, fontWeight: "bold", color: "#333", textAlign: "center" },
  productList: { flex: 1 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: CARD_MARGIN / 2 },
  cardProdutoGenerico: { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 10, marginBottom: 12, marginHorizontal: CARD_MARGIN / 2, elevation: 3, alignItems: "center", justifyContent: "center", width: CARD_WIDTH, minHeight: CARD_MIN_HEIGHT },
  mensagemNenhumResultado: { textAlign: "center", marginTop: 20, fontStyle: "italic", color: "gray", fontSize: 15 },
  mapOverlayContainer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  mapDisplayBox: { width: "90%", height: "70%", backgroundColor: "white", borderRadius: 15, overflow: "hidden", elevation: 10, padding: 5, justifyContent: 'space-between' },
  mapViewStyle: { flex: 1, borderRadius: 10, marginBottom: 10 },
  closeMapButtonOverlay: { position: "absolute", top: 10, right: 10, backgroundColor: "rgba(255, 255, 255, 0.9)", padding: 8, borderRadius: 20, elevation: 12, zIndex: 10 },
  externalMapButton: { backgroundColor: "#34A853", paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 5, alignSelf: 'center', width: '95%' },
  externalMapButtonText: { color: "white", fontWeight: "bold", fontSize: 14 },
  myLocationMarker: { backgroundColor: "#007BFF", padding: 6, borderRadius: 15, width: 30, height: 30, justifyContent: "center", alignItems: "center", borderColor: "white", borderWidth: 1.5 },
  myLocationMarkerText: { color: "white", fontWeight: "bold", fontSize: 10 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.8)" },
  modalBackground: { flex: 1, width: "100%", justifyContent: "center", alignItems: "center" },
  imagemModal: { width: "100%", height: "100%", borderRadius: 10 },
});