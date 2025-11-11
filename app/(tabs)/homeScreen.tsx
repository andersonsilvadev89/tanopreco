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



// ----------------------------------------------------
// 1. CONSTANTES E TIPOS
// ----------------------------------------------------

const defaultFundoLocal = require("../../assets/images/fundo.png");

// Pega a largura da tela para cálculo
const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;
const CARD_MIN_HEIGHT = 300;


// Produto
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
  destaque?: boolean;
  categoria?: string;
  isGeneric?: boolean;
  isAd?: boolean;
  unlike?: number;
  like?: number;
}

// Empresa
interface EmpresaData {
  nome: string;
  nomeEmpresa: string;
  latitude?: number;
  longitude?: number;
  instagram?: string;
  telefone?: string;
}

// Imagens realistas para cada categoria (substitua pelos seus arquivos)
const categoriaImagens: { [key: string]: any } = {
  Alimentação: require("../../assets/categorias/alimentacao.png"),
  Bebidas: require("../../assets/categorias/bebidas.png"),
  Serviços: require("../../assets/categorias/servico.png"),
  Moda: require("../../assets/categorias/moda.png"),
  Saúde: require("../../assets/categorias/saude.png"),
  Tecnologia: require("../../assets/categorias/tecnologia.png"),
  Kids: require("../../assets/categorias/kids.png"),
  Imóveis: require("../../assets/categorias/imoveis.png"),
  Autos: require("../../assets/categorias/autos.png"),
  Utilidades: require("../../assets/categorias/utilidades.png"),
  Outros: require("../../assets/categorias/outros.png"),
};

const categorias = [
  { nome: "Alimentação" },
  { nome: "Bebidas" },
  { nome: "Moda" },
  { nome: "Saúde" },
  { nome: "Kids" },
  { nome: "Serviços" },
  { nome: "Tecnologia" },
  { nome: "Imóveis" },
  { nome: "Autos" },
  { nome: "Utilidades" },
  { nome: "Outros" },
];


// ----------------------------------------------------
// 2. FUNÇÕES AUXILIARES
// ----------------------------------------------------

function isOfertaValida(dataFinalOferta?: string) {
  if (!dataFinalOferta) return false;
  const [dia, mes, ano] = dataFinalOferta.split("/");
  const dataFinal = new Date(`${ano}-${mes}-${dia}`);
  const hoje = new Date();
  return dataFinal >= hoje;
}

function calcularDistancia(userLocation: any, empresaLocation: any) {
  if (!userLocation || !empresaLocation) return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(empresaLocation.latitude - userLocation.latitude);
  const dLon = toRad(empresaLocation.longitude - userLocation.longitude);
  const lat1 = toRad(userLocation.latitude);
  const lat2 = toRad(empresaLocation.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2) *
    Math.cos(lat1) *
    Math.cos(lat2);
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
    return {
      latitude: produto.latitudeProduto,
      longitude: produto.longitudeProduto,
      isProdutoLocation: true,
    };
  } else if (produto.latitudeEmpresa && produto.longitudeEmpresa) {
    return {
      latitude: produto.latitudeEmpresa,
      longitude: produto.longitudeEmpresa,
      isProdutoLocation: false,
    };
  }
  return null;
}

// ----------------------------------------------------
// 3. COMPONENTE PRINCIPAL (HomeScreen)
// ----------------------------------------------------

export default function HomeScreen() {
  const { deviceId } = useAuth();
    

  const [produtosComEmpresa, setProdutosComEmpresa] = useState<ProdutoComEmpresa[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [ordenarPorPreco, setOrdenarPorPreco] = useState(true);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: -7.2345,
    longitude: -39.4056,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [empresas, setEmpresas] = useState<{ [key: string]: EmpresaData }>({});
  const [imagemModalVisivel, setImagemModalVisivel] = useState(false);
  const [imagemModalUrl, setImagemModalUrl] = useState<string | null>(null);

  // Ref para manipular o MapView
  const mapRef = useRef<MapView>(null);

  // Votação
  const votarProduto = async (produtoId: string, tipo: "like" | "unlike") => {
    if (!deviceId) {
      Alert.alert("Erro", "ID do dispositivo não disponível. Tente reiniciar o app.");
      return;
    }
    
    const produtoVotado = produtosComEmpresa.find(p => p.id === produtoId);
    if (!produtoVotado) {
        Alert.alert("Erro", "Produto não encontrado na lista.");
        return;
    }

    const empresaId = produtoVotado.empresaId;
    const votoRef = ref(database, `votos/${produtoId}/${deviceId}`);
    const votoSnapshot = await get(votoRef);
    const produtoRef = ref(database, `produtos/${empresaId}/${produtoId}`);

    if (votoSnapshot.exists()) {
        const votoAnteriorTipo = votoSnapshot.val().tipo;
        
        // Se o usuário está tentando votar com o MESMO tipo, pergunta se ele quer retirar.
        if (votoAnteriorTipo === tipo) {
            
            // --- ALERT PARA RETIRADA DE VOTO ---
            Alert.alert(
                "Voto Já Registrado",
                `Seu voto como '${tipo.toUpperCase()}' já está registrado. Gostaria de **retirar** seu voto?`,
                [
                    {
                        text: "Não, manter voto",
                        onPress: () => console.log('Voto mantido.'),
                        style: 'cancel',
                    },
                    {
                        text: "Sim, retirar voto",
                        onPress: async () => {
                            try {
                                // 1. Remove o voto do usuário
                                await set(votoRef, null); 

                                // 2. Decrementa o contador atômico no nó de produtos
                                await update(produtoRef, {
                                    [tipo]: increment(-1),
                                });

                                // 3. Atualiza o estado local imediatamente
                                setProdutosComEmpresa(prevProdutos => 
                                    prevProdutos.map(p => {
                                        if (p.id === produtoId) {
                                            const novoValorLocal = Math.max(0, (p[tipo] ?? 0) - 1);
                                            return { 
                                                ...p, 
                                                [tipo]: novoValorLocal as number 
                                            };
                                        }
                                        return p;
                                    })
                                );
                                Alert.alert("Sucesso", "Seu voto foi retirado.");
                            } catch (error) {
                                console.error("Erro ao retirar voto:", error);
                                Alert.alert("Erro", "Não foi possível retirar o voto. Tente novamente.");
                            }
                        },
                        style: 'destructive',
                    },
                ],
                { cancelable: true }
            );
            return; // Encerra a função após o Alert de retirada
        }
      }
    // --- LÓGICA DE ALERTA ---
    const titulo = (tipo === 'like') 
        ? 'CONFIRMAR VOTO POSITIVO?' 
        : 'CONFIRMAR VOTO NEGATIVO?';
        
    const mensagem = 
        `Seu voto é muito importante e será usado para avaliar a qualidade e veracidade desta oferta para outros usuários. ` +
        `Confirme apenas se você tem uma opinião séria sobre o item.`;

    // Retorna uma Promise que resolve em true (confirma) ou false (cancela)
    const confirmar = new Promise<boolean>((resolve) => {
        Alert.alert(
            titulo,
            mensagem,
            [
                {
                    text: "Cancelar",
                    onPress: () => resolve(false), // Cancela o voto
                    style: 'cancel',
                },
                {
                    text: "Confirmar",
                    onPress: () => resolve(true), // Continua o fluxo
                    style: 'default',
                },
            ],
            { cancelable: false }
        );
    });

    const confirmado = await confirmar;

    // Se o usuário cancelou, a função termina aqui.
    if (!confirmado) {
        return; 
    }
    // --- FIM LÓGICA DE ALERTA ---
    try {
          await set(votoRef, { tipo });

    
    //const produtoSnapshot = await get(produtoRef);
    //const produtoData = produtoSnapshot.val() || {};

    //const novoValor = (produtoData[tipo] ?? 0) + 1;
    //await update(produtoRef, { [tipo]: novoValor });
    await update(produtoRef, {
            [tipo]: increment(1)
    });

    setProdutosComEmpresa(prevProdutos => 
          prevProdutos.map(p => {
              if (p.id === produtoId) {
                  // Incrementa o valor localmente (garante feedback imediato)
                  const novoValorLocal = (p[tipo] ?? 0) + 1;
                  return { 
                      ...p, 
                      [tipo]: novoValorLocal as number 
                  };
              }
              return p;
          })
      );
    } catch (error) {
      console.error("Erro ao votar ou atualizar contador:", error);
            Alert.alert("Erro de Votação", "Não foi possível registrar seu voto. Tente novamente.");
    }
  };

  // Carrega empresas
  useEffect(() => {
    const empresasRef = ref(database, "usuariosEmpresa");
    onValue(empresasRef, (snapshot) => {
      const data: { [key: string]: EmpresaData } = {};
      snapshot.forEach((empresaSnap) => {
        const empresaId = empresaSnap.key!;
        const empresa = empresaSnap.val();
        data[empresaId] = {
          nome: empresa.nome,
          nomeEmpresa: empresa.nomeEmpresa,
          latitude: empresa.latitude,
          longitude: empresa.longitude,
          instagram: empresa.instagram,
          telefone: empresa.telefone,
        };
      });
      setEmpresas(data);
    });
  }, []);

  // Carrega produtos e Localização do usuário
  useFocusEffect(
    useCallback(() => {
      // Se as empresas não carregaram, interrompe (espera o useEffect acima)
      if (!Object.keys(empresas).length) {
        return;
      }

      setLoadingInicial(true);

      // 1. Carregamento dos Produtos
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

                // Mapeamento dos dados do produto...
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
                  destaque: produto.destaque,
                  palavrasChave: produto.palavrasChave,
                  like: produto.like || 0,
                  unlike: produto.unlike || 0,
                });
              });
            }
          });
        }
        setProdutosComEmpresa(data.filter(p => isOfertaValida(p.dataFinalOferta)));
        setLoadingInicial(false);
      });

      // 2. Localização do usuário
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

  // Ajuste do mapa
  useEffect(() => {
    if (mostrarMapa && userLocation && selectedLocation && mapRef.current) {
      const coordinates = [
        userLocation,
        { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude },
      ];
      const timer = setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mostrarMapa, userLocation, selectedLocation]);

  // Filtros
  const produtosValidos = produtosComEmpresa.filter((produto) => {
    if (categoriaSelecionada) {
      const palavrasChaveLower = produto.palavrasChave?.toLowerCase() || "";
      if (!palavrasChaveLower.includes(categoriaSelecionada.toLowerCase())) {
        return false;
      }
    }
    if (termoBusca.length >= 3) {
      const termo = termoBusca.toLowerCase();
      if (
        !produto.descricao?.toLowerCase()?.includes(termo) &&
        !(produto.palavrasChave && produto.palavrasChave?.toLowerCase()?.includes(termo)) &&
        !produto.nomeEmpresa?.toLowerCase()?.includes(termo)
      ) {
        return false;
      }
    }
    return true;
  });

  const produtosParaExibir =
    termoBusca.length >= 3 || categoriaSelecionada
      ? produtosValidos
      : produtosValidos.filter((p) => p.destaque);

  const tituloDaLista =
    termoBusca.length >= 3 || categoriaSelecionada
      ? "Resultados da busca"
      : "Produtos em Destaque";


  // Ordenação
  const produtosOrdenados = [...produtosParaExibir].sort((a, b) => {
    const getPrecoNumerico = (produto: ProdutoComEmpresa) =>
      parseFloat(produto.preco.replace("R$", "").replace(",", ".").replace(/\./g, ""));

    const getDistancia = (produto: ProdutoComEmpresa) => {
      const location = getProdutoLocation(produto);
      return (userLocation && location)
        ? (calcularDistancia(userLocation, { latitude: location.latitude, longitude: location.longitude }) ?? Infinity)
        : Infinity;
    }

    if (ordenarPorPreco) {
      return getPrecoNumerico(a) - getPrecoNumerico(b);
    } else {
      const diferencaDistancia = getDistancia(a) - getDistancia(b);
      if (Math.abs(diferencaDistancia) < 0.001) {
        return getPrecoNumerico(a) - getPrecoNumerico(b);
      }
      return diferencaDistancia;
    }
  });

  // Inserção de AdCard
  const produtosComAnuncios: ProdutoComEmpresa[] = [];
  let adCounter = 0;
  const AD_INTERVAL = 5;

  produtosOrdenados.forEach((produto, index) => {
    produtosComAnuncios.push(produto);
    adCounter++;

    if (adCounter % AD_INTERVAL === 0) {
      const adItem: ProdutoComEmpresa = {
        ...AD_PLACEHOLDER,
        id: `ad_inserted_${index}_${Math.random()}`,
      };
      produtosComAnuncios.push(adItem);
    }
  });

  let produtosParaRenderizar: ProdutoComEmpresa[] = produtosComAnuncios;

  if (produtosComAnuncios.length % 2 === 1) {
    const finalAd: ProdutoComEmpresa = {
      ...AD_PLACEHOLDER,
      id: `ad_final_${Math.random()}`,
    };
    produtosParaRenderizar = [...produtosComAnuncios, finalAd];
  }


  // Ações de Mapas e Redes Sociais
  const handleVerNoMapa = (produto: ProdutoComEmpresa) => {
    const location = getProdutoLocation(produto);
    if (location) {
      setSelectedLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        nome: produto.nomeEmpresa,
        empresaId: produto.empresaId,
        produtoId: produto.id,
      });
      setMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      setMostrarMapa(true);
    } else {
      Alert.alert("Localização Indisponível", "Esta empresa/produto não possui uma localização cadastrada.");
    }
  };

  const openExternalMapRoute = (latitude: number, longitude: number, label: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const url = `${scheme}${latitude},${longitude}(${label})`;

    Linking.openURL(url).catch(() => {
      const webUrl = `http://maps.google.com/maps?daddr=${latitude},${longitude}`;
      Linking.openURL(webUrl).catch(() => {
        Alert.alert("Erro", "Não foi possível abrir o aplicativo de mapas.");
      });
    });
  };

  const openInstagramProfile = async (username: string | undefined) => {
    if (!username) {
      Alert.alert("Instagram não informado", "Esta empresa não possui um Instagram cadastrado.");
      return;
    }
    const user = username.replace("@", "");
    const webUrl = `https://www.instagram.com/${user}`;
    try {
      await Linking.openURL(webUrl);
    } catch (error) {
      Alert.alert("Erro", "Ocorreu um erro inesperado ao tentar abrir o Instagram.");
    }
  };

  const openWhatsApp = (telefone: string | undefined) => {
    if (!telefone) {
      Alert.alert("WhatsApp não informado", "Esta empresa não possui um telefone cadastrado.");
      return;
    }
    const numeroLimpo = telefone.replace(/\D/g, "");
    const url = `https://wa.me/55${numeroLimpo}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
    });
  };

  const isSelectedLocationValid = selectedLocation && selectedLocation.latitude && selectedLocation.longitude;
  const selectedLat = isSelectedLocationValid ? selectedLocation.latitude : 0;
  const selectedLon = isSelectedLocationValid ? selectedLocation.longitude : 0;
  const selectedName = isSelectedLocationValid ? selectedLocation.nome : "Destino";


  // ----------------------------------------------------
  // 4. RENDERIZAÇÃO
  // ----------------------------------------------------

  return (
    <ImageBackground source={defaultFundoLocal} style={styles.background}>
      <AdBanner />
      <View style={styles.container}>
        <View style={styles.topBarContainer}>
          {/* Campo de busca e ordenação */}
          <View style={styles.buscaOverlayContainer}>
            <TextInput
              style={styles.inputBuscaOverlay}
              placeholder="Busque produtos ou serviços..."
              value={termoBusca}
              onChangeText={setTermoBusca}
              placeholderTextColor="#888"
            />
            <Image
              source={require("../../assets/images/lupa.png")}
              style={styles.lupaSobreposta}
            />
          </View>
          <View style={styles.ordenacaoContainer}>
            <Text style={{ color: "#ffffffea", fontWeight: "bold", }}>Ordenar por:</Text>
            <Text style={[styles.ordenacaoText, !ordenarPorPreco && styles.ordenacaoTextActive]}>
              Proximidade
            </Text>
            <Switch
              value={ordenarPorPreco}
              onValueChange={setOrdenarPorPreco}
              thumbColor={"white"}
              trackColor={{ false: "#ccc", true: "#ccc" }}
            />
            <Text style={[styles.ordenacaoText, ordenarPorPreco && styles.ordenacaoTextActive]}>
              Menor Preço
            </Text>
          </View>

          {/* Botões de categorias */}
          <View style={styles.categoriasScrollContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categorias.map((cat) => (
                <View key={cat.nome} style={styles.categoriaItem}>
                  <TouchableOpacity
                    style={[
                      styles.categoriaBotaoRedondo,
                      categoriaSelecionada === cat.nome && styles.categoriaBotaoSelecionado,
                    ]}
                    onPress={() =>
                      setCategoriaSelecionada(
                        cat.nome === categoriaSelecionada ? null : cat.nome
                      )
                    }
                  >
                    <Image
                      source={categoriaImagens[cat.nome]}
                      style={styles.categoriaImagem}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.categoriaLegenda,
                      categoriaSelecionada === cat.nome && {
                        color: "#007BFF",
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {cat.nome}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.listTitleContainer}>
          <Text style={styles.listTitle}>{tituloDaLista}</Text>
        </View>

        {/* Lista de produtos */}
        {loadingInicial ? (
          <ActivityIndicator
            size="large"
            color="#007BFF"
            style={{ marginTop: 30 }}
          />
        ) : (
          <FlatList
            data={produtosParaRenderizar}
            keyExtractor={(item) => item.id + item.empresaId}
            ListEmptyComponent={
              <Text style={styles.mensagemNenhumResultado}>
                Nenhum produto/serviços encontrado.
              </Text>
            }
            numColumns={2}
            columnWrapperStyle={styles.cardRow}
            renderItem={({ item }) => {
              if (item.isAd) {
                return (
                  <View style={styles.cardProdutoGenerico}>
                    <AdCard />
                  </View>
                );
              }

              const produtoReal = item as ProdutoComEmpresa;
              const empresaInfo = empresas[produtoReal.empresaId];
              const location = getProdutoLocation(produtoReal);
              const distancia = userLocation && location ? calcularDistancia(userLocation, { latitude: location.latitude, longitude: location.longitude }) : null;
              const temLocalizacao = !!location;

              return (
                <View style={styles.cardProduto}>
                  <View style={styles.imagemLikeContainer}>
                    {produtoReal.imagemUrl && (
                      <TouchableOpacity
                        onPress={() => {
                          setImagemModalUrl(produtoReal.imagemUrl || null);
                          setImagemModalVisivel(true);
                        }}
                      >
                        <Image
                          source={{ uri: produtoReal.imagemUrl }}
                          style={styles.imagemProduto}
                          resizeMode="stretch"
                        />
                      </TouchableOpacity>

                    )}
                    <View style={styles.likeUnlikeContainer}>
                      <TouchableOpacity
                        disabled={!deviceId}
                        onPress={() => votarProduto(produtoReal.id, "like")}
                      >
                        <Feather
                          name="thumbs-up"
                          size={23}
                          color={deviceId ? "#4CAF50" : "#ccc"}
                        />
                      </TouchableOpacity>
                      <Text style={{ color: "green" }}>{produtoReal.like ?? 0}</Text>
                      <TouchableOpacity
                        disabled={!deviceId}
                        onPress={() => votarProduto(produtoReal.id, "unlike")}
                      >
                        <Feather
                          name="thumbs-down"
                          size={23}
                          color={deviceId ? "#F44336" : "#ccc"}
                        />
                      </TouchableOpacity>
                      <Text style={{ color: "red" }}>{produtoReal.unlike ?? 0}</Text>
                    </View>
                  </View>

                  <Text style={styles.descricao}>{produtoReal.descricao}</Text>
                  <Text style={styles.preco}>
                    {"R$ " +
                      parseFloat(
                        produtoReal.preco
                          .replace("R$", "")
                          .replace(/\./g, "")
                          .replace(",", ".")
                      ).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </Text>
                  <Text style={styles.dataOferta}>
                    Oferta válida até: {produtoReal.dataFinalOferta}
                  </Text>
                  {distancia !== null && (
                    <Text style={styles.distancia}>
                      Distância: {distancia.toFixed(2)} km
                    </Text>
                  )}
                  <View style={styles.empresaContainer}>
                    <Text style={styles.confiraOferta}>
                      Confira a oferta direto na empresa:
                    </Text>
                    <Text style={styles.nomeEmpresa}>{empresaInfo?.nomeEmpresa}</Text>
                    <View style={styles.botoesAcaoLinha}>
                      {empresaInfo?.instagram && (
                        <View style={styles.botaoAcaoItem}>
                          <TouchableOpacity
                            onPress={() => openInstagramProfile(empresaInfo.instagram)}
                            style={styles.botaoRedondo}
                          >
                            <Image
                              source={require("../../assets/botoes/instagram.png")}
                              style={styles.imagemBotaoRedondo}
                            />
                          </TouchableOpacity>
                          <Text style={styles.legendaBotao}>Instagram</Text>
                        </View>
                      )}
                      {empresaInfo?.telefone && (
                        <View style={styles.botaoAcaoItem}>
                          <TouchableOpacity
                            onPress={() => openWhatsApp(empresaInfo.telefone)}
                            style={styles.botaoRedondo}
                          >
                            <Image
                              source={require("../../assets/botoes/whatsapp.png")}
                              style={styles.imagemBotaoRedondo}
                            />
                          </TouchableOpacity>
                          <Text style={styles.legendaBotao}>WhatsApp</Text>
                        </View>
                      )}
                      {temLocalizacao && (
                        <View style={styles.botaoAcaoItem}>
                          <TouchableOpacity
                            style={styles.botaoRedondo}
                            onPress={() => handleVerNoMapa(produtoReal)}
                          >
                            <Image
                              source={require("../../assets/botoes/rota.png")}
                              style={styles.imagemBotaoRedondo}
                            />
                          </TouchableOpacity>
                          <Text style={styles.legendaBotao}>Traçar rota</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
            style={styles.productList}
          />
        )}

        {/* Mapa e Modal de Imagem */}
        {mostrarMapa && (
          <View style={styles.mapOverlayContainer}>
            <View style={styles.mapDisplayBox}>
              {mapRegion ? (
                <MapView style={styles.mapViewStyle} region={mapRegion} ref={mapRef}>
                  {userLocation && (
                    <Marker coordinate={userLocation} zIndex={2}>
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
                  {produtosComEmpresa
                    .map(p => ({ produto: p, location: getProdutoLocation(p) }))
                    .filter(item => item.location)
                    .map(({ produto, location }) => {
                      const isSelected = selectedLocation && produto.empresaId === selectedLocation.empresaId && produto.id === selectedLocation.produtoId;
                      return (
                        <Marker
                          key={produto.id + produto.empresaId + "_mapmarker"}
                          coordinate={{ latitude: location!.latitude, longitude: location!.longitude }}
                          title={produto.nomeEmpresa}
                          description={produto.descricao.substring(0, 40) + "..."}
                          pinColor={isSelected ? "red" : "blue"}
                          zIndex={isSelected ? 3 : 1}
                        >
                          {Platform.OS === "ios" ? (
                            <Image
                              source={{ uri: isSelected ? "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png" : "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png" }}
                              style={[styles.markerImageBase, isSelected && styles.selectedMarkerImage]}
                              resizeMode="contain"
                            />
                          ) : null}
                          <Callout tooltip>
                            <View style={styles.calloutView}>
                              <Text style={styles.calloutTitle}>{produto.nomeEmpresa}</Text>
                              <Text style={styles.calloutDescription}>{produto.descricao.substring(0, 60) + "..."}</Text>
                            </View>
                          </Callout>
                        </Marker>
                      );
                    })}
                </MapView>
              ) : (
                <View style={styles.mapLoadingContainer}>
                  <ActivityIndicator size="large" color="#0000ff" />
                  <Text>Carregando mapa...</Text>
                </View>
              )}

              {isSelectedLocationValid && (
                <TouchableOpacity
                  style={styles.externalMapButton}
                  onPress={() => openExternalMapRoute(selectedLat, selectedLon, selectedName)}
                >
                  <Text style={styles.externalMapButtonText}>Abrir Rota no Google Maps</Text>
                  <Feather name="external-link" size={16} color="#FFF" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
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

        {/* Modal para exibir imagem em tela cheia */}
        {imagemModalVisivel && imagemModalUrl && (
          <Modal
            transparent={true}
            animationType="fade"
            visible={imagemModalVisivel}
            onRequestClose={() => setImagemModalVisivel(false)}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity style={styles.modalBackground} onPress={() => setImagemModalVisivel(false)}>
                <Image
                  source={{ uri: imagemModalUrl }}
                  style={styles.imagemModal}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </Modal>
        )}
      </View>
    </ImageBackground>
  );
}

// ----------------------------------------------------
// 5. ESTILOS
// ----------------------------------------------------

const styles = StyleSheet.create({
  imagemLikeContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
  },
  likeUnlikeContainer: {
    margin: 10,
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  localizacaoDiferenteBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    marginTop: 5,
    marginBottom: 5,
  },
  localizacaoDiferenteText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  background: { flex: 1, resizeMode: "cover" },
  container: { flex: 1, },
  buscaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  buscaContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 10,
    height: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  inputBusca: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingVertical: 0,
  },
  lupaIcon: {
    width: 50,
    height: 50,
    marginRight: -5,
  },
  categoriasScrollContainer: {
    height: 100,
  },
  categoriaItem: {
    alignItems: "center",
    justifyContent: "flex-start",
    width: 90,
  },
  categoriaBotaoRedondo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#ffffffea",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    elevation: 2,
  },
  categoriaBotaoSelecionado: {
    backgroundColor: "#5bc5ffff",
  },
  categoriaImagem: {
    width: 48,
    height: 48,
  },
  categoriaLegenda: {
    fontSize: 13,
    color: "#ffffffea",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 2,
  },
  ordenacaoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ordenacaoText: {
    marginHorizontal: 5,
    color: "#ffffffea"
  },
  ordenacaoTextActive: {
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  productList: { flex: 1 },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardProduto: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    marginHorizontal: 4,
    elevation: 3,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    width: CARD_WIDTH,
    minHeight: CARD_MIN_HEIGHT,
  },
  cardProdutoGenerico: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    marginBottom: 12,
    marginHorizontal: 4,
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    width: CARD_WIDTH,
    minHeight: CARD_MIN_HEIGHT,
    padding: 0,
  },
  descricaoGenerica: {
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
    color: "#666",
  },
  imagemGenerica: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    marginTop: 5,
  },
  nomeEmpresa: {
    fontSize: 12,
    color: "#0056b3",
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  botoesAcaoLinha: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    minHeight: 22,
    marginBottom: 5,
    marginTop: 8,
  },
  botaoAcaoItem: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  botaoRedondo: {
    width: 30,
    height: 30,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    borderWidth: 1,
    borderColor: "#eee",
  },
  imagemBotaoRedondo: {
    width: 40,
    height: 40,
  },
  legendaBotao: {
    color: "#333",
    fontSize: 8,
    marginTop: 4,
    textAlign: "center",
    fontWeight: "bold",
  },
  instagramButton: {
    paddingVertical: 3,
    paddingHorizontal: 14,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
    minHeight: 20,
    marginRight: 6,
  },
  instagramButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "bold" },
  whatsappButton: {
    paddingVertical: 3,
    paddingHorizontal: 14,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
    minHeight: 20,
    marginLeft: 6,
  },
  whatsappButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "bold" },
  descricao: {
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
    borderRadius: 5,
    padding: 2,
  },
  preco: {
    fontSize: 22,
    color: "green",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  dataOferta: {
    fontSize: 13,
    color: "#888",
    marginBottom: 2,
    textAlign: "center",
  },
  distancia: {
    fontSize: 13,
    color: "#007BFF",
    marginBottom: 2,
    textAlign: "center",
  },
  botaoRota: {
    backgroundColor: "#007BFF",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 18,
    marginTop: 5,
    marginBottom: 5,
  },
  botaoRotaTexto: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
  },
  imagemProduto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 5,
    resizeMode: "contain",
  },
  mensagemNenhumResultado: {
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
    color: "gray",
    fontSize: 15,
  },
  mapOverlayContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  mapDisplayBox: {
    width: "90%",
    height: "70%",
    backgroundColor: "white",
    borderRadius: 15,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    padding: 5,
    justifyContent: 'space-between',
  },
  mapViewStyle: {
    flex: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  closeMapButtonOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 8,
    borderRadius: 20,
    elevation: 12,
    zIndex: 10,
  },
  calloutView: {
    width: 200,
    padding: 10,
    backgroundColor: "white",
    borderRadius: 8,
    borderColor: "#ccc",
    borderWidth: 0.5,
  },
  calloutTitle: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
    marginBottom: 3,
  },
  calloutDescription: { fontSize: 12, color: "#555" },
  myLocationMarker: {
    backgroundColor: "#007BFF",
    padding: 6,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderColor: "white",
    borderWidth: 1.5,
  },
  myLocationMarkerText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 10,
  },
  markerImageBase: {
    width: 28,
    height: 28,
  },
  selectedMarkerImage: {
    width: 38,
    height: 38,
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarContainer: {
    backgroundColor: "#064ec7",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 10,
    color: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    paddingTop: 10,
  },
  buscaOverlayContainer: {
    justifyContent: "center",
    alignItems: "flex-start",
    width: "100%",
  },
  inputBuscaOverlay: {
    width: "90%",
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingLeft: 48,
    paddingRight: 10,
    height: 44,
    marginLeft: 30,
  },
  lupaSobreposta: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 60,
    height: 60,
    zIndex: 2,
  },
  empresaContainer: {
    width: "100%",
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    alignItems: "center",
  },
  confiraOferta: {
    fontSize: 12,
    color: "#555",
    fontWeight: "bold",
    marginBottom: 2,
    textAlign: "center",
  },
  externalMapButton: {
    backgroundColor: "#34A853",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    alignSelf: 'center',
    width: '95%',
  },
  externalMapButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  listTitleContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  listTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  modalBackground: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imagemModal: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
});