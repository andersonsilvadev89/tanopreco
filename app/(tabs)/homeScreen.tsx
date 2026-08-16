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
  Linking,
  Alert,
  Switch,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { database, auth } from "../../firebaseConfig";
import { ref, onValue, set, get, update, increment } from "firebase/database";
import { signOut } from "firebase/auth";
import { useFocusEffect } from "@react-navigation/native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import AdBanner from "../components/AdBanner";
import * as Location from "expo-location";
import Voice from "@react-native-voice/voice";
import AdCard from "../components/AdCard";
import { useAuth } from "../../context/AuthContext";
import { ProdutoCard } from "../components/ProdutoCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppHeader } from "../components/shell/AppHeader";
import { DrawerMenu } from "../components/shell/DrawerMenu";
import { BRAND_COLORS } from "@/constants/BrandColors";

// ----------------------------------------------------
// 1. CONSTANTES E CONFIGURAÇÕES
// ----------------------------------------------------

const { width } = Dimensions.get("window");

// Tamanho do card de produto
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;
const CARD_MIN_HEIGHT = 300;

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
  Construção: require("../../assets/categorias/construcao.png"),
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
  { nome: "Construção" },
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
  const { deviceId, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [ordenacaoManual, setOrdenacaoManual] = useState(false);
  const [produtosComEmpresa, setProdutosComEmpresa] = useState<ProdutoComEmpresa[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [ordenarPorPreco, setOrdenarPorPreco] = useState(true);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; } | null>(null);
  const [mostrarFiltrosManual, setMostrarFiltrosManual] = useState(true);
  const [painelFiltroForaDaTela, setPainelFiltroForaDaTela] = useState(false);
  const [alturaPainelFiltro, setAlturaPainelFiltro] = useState(0);
  const [drawerMenuVisible, setDrawerMenuVisible] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mostrarDicaEsquerda, setMostrarDicaEsquerda] = useState(false);
  const [mostrarDicaDireita, setMostrarDicaDireita] = useState(false);
  const [larguraViewportCategorias, setLarguraViewportCategorias] = useState(0);
  const [larguraConteudoCategorias, setLarguraConteudoCategorias] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: -7.2345, longitude: -39.4056, latitudeDelta: 0.0922, longitudeDelta: 0.0421,
  });
  const [empresas, setEmpresas] = useState<{ [key: string]: EmpresaData }>({});
  const [imagemModalVisivel, setImagemModalVisivel] = useState(false);
  const [imagemModalUrl, setImagemModalUrl] = useState<string | null>(null);
  const [produtoModal, setProdutoModal] = useState<ProdutoComEmpresa | null>(null);
  const mapRef = useRef<MapView>(null);
  const listaRef = useRef<FlatList<ProdutoComEmpresa>>(null);
  const categoriasScrollXRef = useRef(0);
  const painelFiltroForaDaTelaRef = useRef(false);
  const filtrosVisiveis = mostrarFiltrosManual;
  const mostrarBotaoFiltro = !filtrosVisiveis || painelFiltroForaDaTela;

  const atualizarDicasCategorias = useCallback((scrollX: number, contentWidth: number, viewportWidth: number) => {
    const temOverflow = contentWidth > viewportWidth + 1;

    if (!temOverflow) {
      setMostrarDicaEsquerda(false);
      setMostrarDicaDireita(false);
      return;
    }

    setMostrarDicaEsquerda(scrollX > 8);
    setMostrarDicaDireita(scrollX + viewportWidth < contentWidth - 8);
  }, []);

  const handleImagePress = useCallback((produto: ProdutoComEmpresa) => {
    setProdutoModal(produto);
    setImagemModalUrl(produto.imagemUrl ?? null);
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
  const tituloDaLista = (termoBusca.length >= 3 && categoriaSelecionada) || (!(termoBusca.length >= 3) && categoriaSelecionada) ? `Resultados da busca (${categoriaSelecionada})` : termoBusca.length >= 3 && categoriaSelecionada === null ? `Resultados da busca`: "Produtos em Destaque";

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
  }, [empresas, userLocation, deviceId, handleImagePress, votarProduto, handleVerNoMapa, openInstagramProfile, openWhatsApp]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      Alert.alert("Erro", "Nao foi possivel sair da conta.");
    }
  }, []);

  const handleMenuOpen = useCallback(() => {
    setDrawerMenuVisible(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setDrawerMenuVisible(false);
  }, []);

  const handleNavigateTo = useCallback((path: string, requiresAuth: boolean) => {
    if (requiresAuth && !user) {
      Alert.alert("Login necessário", "Entre na sua conta para acessar esta área.");
      router.push("/(auth)/loginScreen");
      return;
    }

    router.push(path as any);
  }, [user]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechResults = (event) => {
      const spokenText = event.value?.[0]?.trim();
      if (!spokenText) return;
      setTermoBusca(spokenText);
      setCategoriaSelecionada(null);
      Alert.alert("Busca por voz", `Resultado: ${spokenText}`);
    };
    Voice.onSpeechError = (event) => {
      console.error("Voice error:", event);
      setIsListening(false);
      Alert.alert("Erro na voz", "Não foi possível reconhecer sua fala. Tente novamente.");
    };

    return () => {
      Voice.destroy().catch(() => undefined);
    };
  }, []);

  const handleBuscaPorVoz = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Indisponível", "Reconhecimento de voz não está disponível no web.");
      return;
    }

    try {
      if (isListening) {
        await Voice.stop();
        setIsListening(false);
        return;
      }

      const available = await Voice.isAvailable();
      if (!available) {
        Alert.alert("Reconhecimento indisponível", "Seu aparelho não suporta reconhecimento de voz neste momento.");
        return;
      }

      await Voice.start("pt-BR");
    } catch (error) {
      console.error("Erro ao iniciar voz:", error);
      Alert.alert("Erro", "Não foi possível iniciar a busca por voz.");
    }
  }, [isListening]);

  const handleBotaoFiltro = useCallback(() => {
    // Se o painel existe mas saiu da tela, volta para o topo para exibir filtros novamente.
    if (filtrosVisiveis && painelFiltroForaDaTela) {
      setMostrarFiltrosManual(true);
      listaRef.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }

    setMostrarFiltrosManual((prev) => !prev);
  }, [filtrosVisiveis, painelFiltroForaDaTela]);

  const handleScrollLista = useCallback((event: any) => {
    if (!filtrosVisiveis) {
      if (!painelFiltroForaDaTelaRef.current) {
        painelFiltroForaDaTelaRef.current = true;
        setPainelFiltroForaDaTela(true);
      }
      return;
    }

    const offsetY = event.nativeEvent.contentOffset.y ?? 0;
    const limiteSaida = Math.max(alturaPainelFiltro - 12, 24);
    const foraDaTela = offsetY > limiteSaida;

    if (foraDaTela !== painelFiltroForaDaTelaRef.current) {
      painelFiltroForaDaTelaRef.current = foraDaTela;
      setPainelFiltroForaDaTela(foraDaTela);
    }
  }, [filtrosVisiveis, alturaPainelFiltro]);

  const contadorOfertas = () =>{
    {/* --- NOVO: CONTADOR DE PRODUTOS CADASTRADOS --- */}
    return(
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
        </View>);
  }

  return (
    <View style={styles.background}>
      <AppHeader
        user={user}
        paddingTop={Math.max(insets.top, 8)}
        onMenuOpen={handleMenuOpen}
        onLogout={handleLogout}
      />
      <DrawerMenu
        visible={drawerMenuVisible}
        onClose={handleMenuClose}
        user={user}
        onLogout={handleLogout}
        navigateTo={handleNavigateTo}
      />
      <View style={styles.container}>

        <View style={styles.topBarContainer}>
          <View style={styles.buscaOverlayContainer}>
            <View style={styles.buscaBar}>
              <View style={styles.buscaInputWrapper}>
                <Feather name="search" size={18} color={BRAND_COLORS.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={styles.inputBuscaOverlay}
                  placeholder="Busque produtos ou serviços..."
                  value={termoBusca}
                  onChangeText={setTermoBusca}
                  placeholderTextColor={BRAND_COLORS.textMuted}
                />
              </View>

              <TouchableOpacity
                style={[styles.botaoVoz, isListening && styles.botaoVozAtivo]}
                onPress={handleBuscaPorVoz}
                activeOpacity={0.8}
              >
                <Feather name={isListening ? "mic-off" : "mic"} size={18} color={isListening ? BRAND_COLORS.white : BRAND_COLORS.primaryDark} />
              </TouchableOpacity>

              {mostrarBotaoFiltro && (
                <TouchableOpacity
                  style={[styles.botaoVoz, styles.botaoFiltros, filtrosVisiveis && styles.botaoFiltrosAtivo]}
                  onPress={handleBotaoFiltro}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="sliders"
                    size={18}
                    color={filtrosVisiveis ? BRAND_COLORS.white : BRAND_COLORS.primaryDark}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

        </View>

        {loadingInicial ? <ActivityIndicator size="large" color={BRAND_COLORS.primary} style={{ marginTop: 30 }} /> :
          <FlatList
            ref={listaRef}
            data={produtosFinal}
            keyExtractor={(item) => item.id + item.empresaId}
            ListHeaderComponent={
              <>
                {filtrosVisiveis && (
                  <View
                    style={styles.filtrosPanel}
                    onLayout={(event) => {
                      const novaAltura = event.nativeEvent.layout.height;
                      if (novaAltura !== alturaPainelFiltro) {
                        setAlturaPainelFiltro(novaAltura);
                      }
                    }}
                  >
                    {/* Ordenação */}
                    <View style={styles.ordenacaoContainer}>
                      <Text style={{ color: "#063494", fontWeight: "bold" }}>Ordenar por:</Text>
                      <Text style={[styles.ordenacaoText, !ordenarPorPreco && styles.ordenacaoTextActive]}>Proximidade</Text>
                      <Switch
                        value={ordenarPorPreco}
                        onValueChange={(v) => { setOrdenarPorPreco(v); setOrdenacaoManual(true); }}
                        thumbColor={BRAND_COLORS.white}
                        trackColor={{ false: BRAND_COLORS.border, true: BRAND_COLORS.border }}
                      />
                      <Text style={[styles.ordenacaoText, ordenarPorPreco && styles.ordenacaoTextActive]}>Menor Preço</Text>
                    </View>

                    {/* Categorias */}
                    <View style={styles.categoriasContainer}>
                      <View style={styles.categoriasScrollWrapper}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.categoriasGrid}
                          scrollEventThrottle={16}
                          onScroll={(event) => {
                            const scrollX = event.nativeEvent.contentOffset.x;
                            categoriasScrollXRef.current = scrollX;
                            atualizarDicasCategorias(scrollX, larguraConteudoCategorias, larguraViewportCategorias);
                          }}
                          onLayout={(event) => {
                            const largura = event.nativeEvent.layout.width;
                            setLarguraViewportCategorias(largura);
                            atualizarDicasCategorias(categoriasScrollXRef.current, larguraConteudoCategorias, largura);
                          }}
                          onContentSizeChange={(contentWidth) => {
                            setLarguraConteudoCategorias(contentWidth);
                            atualizarDicasCategorias(categoriasScrollXRef.current, contentWidth, larguraViewportCategorias);
                          }}
                        >
                          {categorias.map((cat) => (
                            <View key={cat.nome} style={styles.categoriaItem}>
                              <TouchableOpacity
                                style={[styles.categoriaBotaoRedondo, categoriaSelecionada === cat.nome && styles.categoriaBotaoSelecionado]}
                                onPress={() => setCategoriaSelecionada(cat.nome === categoriaSelecionada ? null : cat.nome)}
                              >
                                <Image source={categoriaImagens[cat.nome]} style={styles.categoriaImagem} resizeMode="contain" />
                              </TouchableOpacity>
                              <Text style={[styles.categoriaLegenda, categoriaSelecionada === cat.nome && styles.categoriaLegendaSelecionada]}>
                                {cat.nome}
                              </Text>
                              {categoriaSelecionada === cat.nome && <View style={styles.categoriaSelecionadaIndicador} />}
                            </View>
                          ))}
                        </ScrollView>

                        {mostrarDicaEsquerda && (
                          <View pointerEvents="none" style={[styles.categoriaHintSide, styles.categoriaHintLeft]}>
                            <LinearGradient
                              colors={["rgba(248, 250, 255, 0.96)", "rgba(248, 250, 255, 0)"]}
                              start={{ x: 0, y: 0.5 }}
                              end={{ x: 1, y: 0.5 }}
                              style={styles.categoriaFade}
                            />
                            <View style={styles.categoriaArrowBubble}>
                              <Feather name="chevron-left" size={14} color={BRAND_COLORS.primaryDark} />
                            </View>
                          </View>
                        )}

                        {mostrarDicaDireita && (
                          <View pointerEvents="none" style={[styles.categoriaHintSide, styles.categoriaHintRight]}>
                            <LinearGradient
                              colors={["rgba(248, 250, 255, 0)", "rgba(248, 250, 255, 0.96)"]}
                              start={{ x: 0, y: 0.5 }}
                              end={{ x: 1, y: 0.5 }}
                              style={styles.categoriaFade}
                            />
                            <View style={styles.categoriaArrowBubble}>
                              <Feather name="chevron-right" size={14} color={BRAND_COLORS.primaryDark} />
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                <AdBanner />

                <View style={styles.listTitleContainer}>
                  <Text style={styles.listTitle}>{tituloDaLista}</Text>
                </View>
              </>
            }
            ListEmptyComponent={<Text style={styles.mensagemNenhumResultado}>Nenhum produto encontrado.</Text>}
            numColumns={2}
            columnWrapperStyle={styles.cardRow}
            renderItem={renderProdutoItem}
            style={styles.productList}
            onScroll={handleScrollLista}
            scrollEventThrottle={24}
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
              <TouchableOpacity style={styles.closeMapButtonOverlay} onPress={() => setMostrarMapa(false)}><Feather name="x" size={24} color={BRAND_COLORS.text} /></TouchableOpacity>
              <TouchableOpacity style={styles.externalMapButton} onPress={() => openExternalMap(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.nome)}><Text style={styles.externalMapButtonText}>Abrir Rota</Text></TouchableOpacity>
            </View>
          </View>
        )}
        {imagemModalVisivel && imagemModalUrl && produtoModal && (
          <Modal transparent animationType="fade" visible={imagemModalVisivel} onRequestClose={() => {
            setImagemModalVisivel(false);
            setProdutoModal(null);
          }}>
            <View style={styles.modalContainer}>
              <View style={styles.modalCard}>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setImagemModalVisivel(false);
                    setProdutoModal(null);
                  }}
                >
                  <Feather name="x" size={20} color={BRAND_COLORS.text} />
                </TouchableOpacity>

                <Image source={{ uri: imagemModalUrl }} style={styles.imagemModal} resizeMode="contain" />

                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{produtoModal.descricao}</Text>
                  <Text style={styles.modalPrice}>{produtoModal.preco}</Text>

                  {produtoModal.dataFinalOferta && (
                    <Text style={styles.modalMeta}>Validade: {produtoModal.dataFinalOferta}</Text>
                  )}

                  {produtoModal.empresaId && empresas[produtoModal.empresaId]?.nomeEmpresa && (
                    <Text style={styles.modalMeta}>Empresa: {empresas[produtoModal.empresaId].nomeEmpresa}</Text>
                  )}

                  {(() => {
                    const location = getProdutoLocation(produtoModal);
                    const distanciaModal = userLocation && location ? calcularDistancia(userLocation, { latitude: location.latitude, longitude: location.longitude }) : null;
                    return distanciaModal !== null ? (
                      <Text style={styles.modalMeta}>Distância: {distanciaModal.toFixed(1)} km</Text>
                    ) : null;
                  })()}

                  <View style={styles.modalActions}>
                    {getProdutoLocation(produtoModal) && (
                      <TouchableOpacity style={styles.modalAction} onPress={() => handleVerNoMapa(produtoModal)}>
                        <Feather name="map-pin" size={18} color={BRAND_COLORS.white} />
                        <Text style={styles.modalActionText}>Mapa</Text>
                      </TouchableOpacity>
                    )}

                    {empresas[produtoModal.empresaId]?.instagram && (
                      <TouchableOpacity
                        style={[styles.modalAction, styles.modalActionInstagram]}
                        onPress={() => openInstagramProfile(empresas[produtoModal.empresaId].instagram)}
                      >
                        <Feather name="instagram" size={18} color={BRAND_COLORS.white} />
                        <Text style={styles.modalActionText}>Instagram</Text>
                      </TouchableOpacity>
                    )}

                    {empresas[produtoModal.empresaId]?.telefone && (
                      <TouchableOpacity
                        style={[styles.modalAction, styles.modalActionWhatsApp]}
                        onPress={() => openWhatsApp(empresas[produtoModal.empresaId].telefone)}
                      >
                        <Feather name="message-circle" size={18} color={BRAND_COLORS.white} />
                        <Text style={styles.modalActionText}>WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        )}

      </View>

    </View>
  );
}

// ----------------------------------------------------
// 5. ESTILOS ATUALIZADOS
// ----------------------------------------------------

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: BRAND_COLORS.surfaceSoft },
  container: { flex: 1 },
  topBarContainer: {
    backgroundColor: "transparent",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 5,
    paddingBottom: 8,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
    color: BRAND_COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  
  textoDestaque: {
    color: BRAND_COLORS.primaryDark,
    backgroundColor: "rgba(10, 79, 203, 0.12)",
    fontSize: 16,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  // -----------------------------

  buscaOverlayContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 10,
  },
  buscaBar: {
    width: "95%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  buscaInputWrapper: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  inputBuscaOverlay: {
    width: "100%",
    fontSize: 16,
    color: BRAND_COLORS.text,
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 25,
    paddingLeft: 42,
    paddingRight: 12,
    height: 40,
    elevation: 2,
  },
  searchIcon: {
    position: "absolute",
    left: 14,
    zIndex: 2,
  },
  botaoVoz: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginLeft: 8,
    backgroundColor: "rgba(255,255,255,0.96)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  botaoVozAtivo: {
    backgroundColor: BRAND_COLORS.primary,
  },
  botaoFiltros: {
    marginLeft: 8,
  },
  botaoFiltrosAtivo: {
    backgroundColor: BRAND_COLORS.primary,
  },
  filtrosPanel: {
    borderRadius: 12,
    marginHorizontal: 10,
  },
  ordenacaoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ordenacaoText: {
    marginHorizontal: 5,
    color: BRAND_COLORS.textMuted,
    fontSize: 12,
  },
  ordenacaoTextActive: {
    fontWeight: "bold",
    color: BRAND_COLORS.primaryDark,
    textDecorationLine: "underline",
  },

  // 💡 ESTILOS DA GRADE DE CATEGORIAS
  categoriasContainer: {
    width: '100%',
    backgroundColor:"#9ac7ff",
    borderRadius: 20,
  },
  categoriasScrollWrapper: {
    position: "relative",
  },
  categoriasGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
    paddingTop: 10,
    gap: 2,
  },
  categoriaItem: {
    alignItems: "center",
    justifyContent: "flex-start",
    width: 52,
    marginBottom: 0,
    marginHorizontal: 0,
  },
  categoriaBotaoRedondo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  categoriaBotaoSelecionado: {
    backgroundColor: "rgba(10, 79, 203, 0.16)",
    borderWidth: 2,
    borderColor: BRAND_COLORS.primaryDark,
  },
  categoriaImagem: {
    width: 28,
    height: 28,
  },
  categoriaLegenda: {
    fontSize: 9,
    color: BRAND_COLORS.shadow,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 12,
  },
  categoriaLegendaSelecionada: {
    color: BRAND_COLORS.primaryDark,
    fontWeight: "800",
    backgroundColor: "rgba(10, 79, 203, 0.1)",
    paddingHorizontal: 3,
    borderRadius: 4,
  },
  categoriaSelecionadaIndicador: {
    marginTop: 2,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: BRAND_COLORS.primaryDark,
  },
  categoriaHintSide: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 38,
    justifyContent: "center",
    zIndex: 4,
  },
  categoriaHintLeft: {
    left: 0,
    alignItems: "flex-start",
  },
  categoriaHintRight: {
    right: 0,
    alignItems: "flex-end",
  },
  categoriaFade: {
    ...StyleSheet.absoluteFillObject,
  },
  categoriaArrowBubble: {
    marginHorizontal: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  // Outros estilos (mantidos)
  listTitleContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  listTitle: { fontSize: 20, fontWeight: "bold", color: BRAND_COLORS.text, textAlign: "center" },
  productList: { flex: 1 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: CARD_MARGIN / 2 },
  cardProdutoGenerico: { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 10, marginBottom: 12, marginHorizontal: CARD_MARGIN / 2, elevation: 3, alignItems: "center", justifyContent: "center", width: CARD_WIDTH, minHeight: CARD_MIN_HEIGHT },
  mensagemNenhumResultado: {
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
    color: BRAND_COLORS.textMuted,
    fontSize: 15,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapOverlayContainer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: BRAND_COLORS.overlayStrong, justifyContent: "center", alignItems: "center", zIndex: 1000 },
  mapDisplayBox: { width: "90%", height: "70%", backgroundColor: BRAND_COLORS.surface, borderRadius: 15, overflow: "hidden", elevation: 10, padding: 5, justifyContent: 'space-between' },
  mapViewStyle: { flex: 1, borderRadius: 10, marginBottom: 10 },
  closeMapButtonOverlay: { position: "absolute", top: 10, right: 10, backgroundColor: "rgba(255, 255, 255, 0.96)", padding: 8, borderRadius: 20, elevation: 12, zIndex: 10, borderWidth: 1, borderColor: BRAND_COLORS.border },
  externalMapButton: { backgroundColor: BRAND_COLORS.success, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 5, alignSelf: 'center', width: '95%' },
  externalMapButtonText: { color: BRAND_COLORS.white, fontWeight: "bold", fontSize: 14 },
  myLocationMarker: { backgroundColor: BRAND_COLORS.primary, padding: 6, borderRadius: 15, width: 30, height: 30, justifyContent: "center", alignItems: "center", borderColor: BRAND_COLORS.white, borderWidth: 1.5 },
  myLocationMarkerText: { color: BRAND_COLORS.white, fontWeight: "bold", fontSize: 10 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BRAND_COLORS.overlayStrong,
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: BRAND_COLORS.white,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  modalCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  imagemModal: {
    width: "100%",
    height: 280,
    backgroundColor: BRAND_COLORS.surfaceSoft,
  },
  modalContent: {
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: BRAND_COLORS.text,
    marginBottom: 8,
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: "900",
    color: BRAND_COLORS.success,
    marginBottom: 6,
  },
  modalMeta: {
    fontSize: 12,
    color: BRAND_COLORS.textMuted,
    marginBottom: 6,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 10,
  },
  modalAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 96,
  },
  modalActionInstagram: {
    backgroundColor: "#E1306C",
  },
  modalActionWhatsApp: {
    backgroundColor: "#25D366",
  },
  modalActionText: {
    color: BRAND_COLORS.white,
    fontWeight: "700",
    marginLeft: 6,
    fontSize: 12,
  },
});