import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { database } from "../../firebaseConfig";
import { ref, onValue, get } from "firebase/database";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import AdBanner from "../components/AdBanner";
import * as Location from "expo-location";

const defaultFundoLocal = require("../../assets/images/fundo.png");

// Pega a largura da tela para cálculo
const { width } = Dimensions.get("window");
const CARD_MARGIN = 8; // Margem para os dois lados do card (4 de cada)
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2; // (Largura da tela - margem externa e interna) / 2

// Produto
interface ProdutoComEmpresa {
  id: string;
  descricao: string;
  preco: string;
  imagemUrl?: string;
  palavrasChave?: string;
  empresaId: string;
  nomeEmpresa: string;
  localizacao?: {
    latitude: number;
    longitude: number;
  };
  dataFinalOferta?: string;
  destaque?: boolean;
  categoria?: string;
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
  Serviços: require("../../assets/categorias/servico.png"),
  Moda: require("../../assets/categorias/moda.png"),
  Saúde: require("../../assets/categorias/saude.png"),
  Tecnologia: require("../../assets/categorias/tecnologia.png"),
  Kids: require("../../assets/categorias/kids.png"),
  Outros: require("../../assets/categorias/outros.png"),
};

const categorias = [
  { nome: "Alimentação" },
  { nome: "Moda" },
  { nome: "Saúde" },
  { nome: "Kids" },
  { nome: "Serviços" },
  { nome: "Tecnologia" },
  { nome: "Outros" },
];

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

export default function HomeScreen() {
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

  // Carrega produtos
  useFocusEffect(
    useCallback(() => {
      setLoadingInicial(true);
      const produtosRef = ref(database, "produtos");
      get(produtosRef).then((snapshot) => {
        const data: ProdutoComEmpresa[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((userSnapshot) => {
            const empresaId = userSnapshot.key!;
            userSnapshot.forEach((produtoSnapshot) => {
              const produto = produtoSnapshot.val();
              const empresaInfo = empresas[empresaId];
              if (empresaInfo) {
                data.push({
                  id: produtoSnapshot.key!,
                  ...produto,
                  empresaId,
                  nome: empresaInfo.nomeEmpresa,
                  localizacao:
                    empresaInfo.latitude && empresaInfo.longitude
                      ? {
                          latitude: empresaInfo.latitude,
                          longitude: empresaInfo.longitude,
                        }
                      : undefined,
                  dataFinalOferta: produto.dataFinalOferta,
                  destaque: produto.destaque,
                  palavrasChave: produto.palavrasChave, // Garante que a propriedade existe
                });
              }
            });
          });
        }
        setProdutosComEmpresa(data);
        setLoadingInicial(false);
      });
      // Localização do usuário
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

  // Filtra produtos válidos
  const produtosValidos = produtosComEmpresa.filter((produto) => {
    if (!isOfertaValida(produto.dataFinalOferta)) return false;

    // Lógica para filtrar por categoria
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

  // Produtos em destaque (quando não está buscando)
  const produtosParaExibir =
    termoBusca.length >= 3 || categoriaSelecionada
      ? produtosValidos
      : produtosValidos.filter((p) => p.destaque);

  // Ordenação
  const produtosOrdenados = [...produtosParaExibir].sort((a, b) => {
    if (ordenarPorPreco) {
      const precoA = parseFloat(
        a.preco.replace("R$", "").replace(",", ".").replace(/\./g, "")
      );
      const precoB = parseFloat(
        b.preco.replace("R$", "").replace(",", ".").replace(/\./g, "")
      );
      return precoA - precoB;
    } else if (userLocation && a.localizacao && b.localizacao) {
      const distA = calcularDistancia(userLocation, a.localizacao);
      const distB = calcularDistancia(userLocation, b.localizacao);
      return (distA ?? 0) - (distB ?? 0);
    }
    return 0;
  });

  // Lógica para adicionar o card genérico
  const produtosComPreenchimento =
    produtosOrdenados.length % 2 === 1
      ? [
          ...produtosOrdenados,
          {
            id: "generico",
            descricao: "Anuncie sua empresa aqui!",
            preco: "",
            imagemUrl:
              "https://res.cloudinary.com/dvxld92ye/image/upload/v1719262272/geral/anuncie_aqui_g3fdf1.png",
            empresaId: "generic",
            nome: "Tá no Preço",
            isGeneric: true, // Nova flag para identificar o card genérico
          },
        ]
      : produtosOrdenados;

  const handleVerNoMapa = (produto: ProdutoComEmpresa) => {
    if (produto.localizacao?.latitude && produto.localizacao?.longitude) {
      setSelectedLocation({
        latitude: produto.localizacao.latitude,
        longitude: produto.localizacao.longitude,
        nome: produto.nomeEmpresa,
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
      Alert.alert(
        "Localização Indisponível",
        "Esta empresa não possui uma localização cadastrada para este produto."
      );
    }
  };

  const openInstagramProfile = async (username: string | undefined) => {
    if (!username) {
      Alert.alert(
        "Instagram não informado",
        "Esta empresa não possui um Instagram cadastrado."
      );
      return;
    }
    const user = username.replace("@", "");
    const webUrl = `https://www.instagram.com/${user}`;
    try {
      await Linking.openURL(webUrl);
    } catch (error) {
      Alert.alert(
        "Erro",
        "Ocorreu um erro inesperado ao tentar abrir o Instagram."
      );
    }
  };

  const openWhatsApp = (telefone: string | undefined) => {
    if (!telefone) {
      Alert.alert(
        "WhatsApp não informado",
        "Esta empresa não possui um telefone cadastrado."
      );
      return;
    }
    const numeroLimpo = telefone.replace(/\D/g, "");
    const url = `https://wa.me/55${numeroLimpo}`; // Adicionando o código do Brasil
    Linking.openURL(url).catch(() => {
      Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
    });
  };

  return (
    <ImageBackground source={defaultFundoLocal} style={styles.background}>
      <View style={styles.container}>
        <View style={styles.topBarContainer}>
          {/* Campo de busca com imagem sobreposta no início do campo */}
          <View style={styles.buscaOverlayContainer}>
            <TextInput
              style={styles.inputBuscaOverlay}
              placeholder="Buscar produtos ou serviços..."
              value={termoBusca}
              onChangeText={setTermoBusca}
              placeholderTextColor="#888"
            />
            <Image
              source={require("../../assets/images/lupa.png")}
              style={styles.lupaSobreposta}
            />
          </View>

          {/* Switch de ordenação antes das categorias */}
          <View style={styles.ordenacaoContainer}>
            <Text style={{ color: "#ffffffea", fontWeight: "bold", }}>Ordenar por:</Text>
            <Text style={{ marginHorizontal: 5, color: "#ffffffea" }}>Menor Preço</Text>
            <Switch value={ordenarPorPreco} onValueChange={setOrdenarPorPreco} thumbColor={"white"}trackColor={{ false: "#ccc", true: "#ccc" }}/>
            <Text style={{ marginHorizontal: 5, color: "#ffffffea"  }}>Proximidade</Text>
          </View>

          {/* Botões de categorias realistas em linha com rolagem horizontal */}
          <View style={styles.categoriasScrollContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categorias.map((cat) => (
                <View key={cat.nome} style={styles.categoriaItem}>
                  <TouchableOpacity
                    style={[
                      styles.categoriaBotaoRedondo,
                      categoriaSelecionada === cat.nome &&
                        styles.categoriaBotaoSelecionado,
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

        {/* Lista de produtos */}
        {loadingInicial ? (
          <ActivityIndicator
            size="large"
            color="#007BFF"
            style={{ marginTop: 30 }}
          />
        ) : (
          <FlatList
            data={produtosComPreenchimento}
            keyExtractor={(item) => item.id + item.empresaId}
            ListEmptyComponent={
              <Text style={styles.mensagemNenhumResultado}>
                Nenhum produto/serviços encontrado.
              </Text>
            }
            numColumns={2}
            columnWrapperStyle={styles.cardRow}
            renderItem={({ item }) => {
              // Verifica se o item é o card genérico
              if ((item as any).isGeneric) {
                return (
                  <View style={styles.cardProdutoGenerico}>
                    <Text style={styles.descricaoGenerica}>
                      {item.descricao}
                    </Text>
                    <Image
                      source={{ uri: item.imagemUrl }}
                      style={styles.imagemGenerica}
                      resizeMode="contain"
                    />
                  </View>
                );
              }

              // Se não for o card genérico, renderiza o card de produto normal.
              // A tipagem 'as ProdutoComEmpresa' resolve o erro do TypeScript.
              const produtoReal = item as ProdutoComEmpresa;
              const empresaInfo = empresas[produtoReal.empresaId];
              const distancia =
                userLocation && empresaInfo?.latitude && empresaInfo?.longitude
                  ? calcularDistancia(userLocation, {
                      latitude: empresaInfo.latitude,
                      longitude: empresaInfo.longitude,
                    })
                  : null;

              return (
                <View style={styles.cardProduto}>
                  {produtoReal.imagemUrl && (
                    <Image
                      source={{ uri: produtoReal.imagemUrl }}
                      style={styles.imagemProduto}
                      resizeMode="cover"
                    />
                  )}
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
                            onPress={() =>
                              openInstagramProfile(empresaInfo.instagram)
                            }
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
                      {empresaInfo?.latitude && empresaInfo?.longitude && (
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

        {/* Mapa */}
        {mostrarMapa && (
          <View style={styles.mapOverlayContainer}>
            <View style={styles.mapDisplayBox}>
              {mapRegion ? (
                <MapView style={styles.mapViewStyle} region={mapRegion}>
                  {userLocation && (
                    <Marker coordinate={userLocation} zIndex={2}>
                      <View style={styles.myLocationMarker}>
                        <Text style={styles.myLocationMarkerText}>EU</Text>
                      </View>
                      <Callout tooltip>
                        <View style={styles.calloutView}>
                          <Text style={styles.calloutTitle}>Você</Text>
                          <Text style={styles.calloutDescription}>
                            Sua localização atual.
                          </Text>
                        </View>
                      </Callout>
                    </Marker>
                  )}
                  {produtosComEmpresa
                    .filter(
                      (p) =>
                        p.localizacao?.latitude && p.localizacao?.longitude
                    )
                    .map((produto) => {
                      const isSelected =
                        selectedLocation &&
                        produto.empresaId === selectedLocation.empresaId &&
                        produto.id === selectedLocation.produtoId;
                      return (
                        <Marker
                          key={produto.id + produto.empresaId + "_mapmarker"}
                          coordinate={produto.localizacao!}
                          title={produto.nomeEmpresa}
                          description={
                            produto.descricao.substring(0, 40) + "..."
                          }
                          pinColor={isSelected ? "red" : "blue"}
                          zIndex={isSelected ? 3 : 1}
                        >
                          {Platform.OS === "ios" ? (
                            <Image
                              source={{
                                uri: isSelected
                                  ? "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png"
                                  : "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png",
                              }}
                              style={[
                                styles.markerImageBase,
                                isSelected && styles.selectedMarkerImage,
                              ]}
                              resizeMode="contain"
                            />
                          ) : null}
                          <Callout tooltip>
                            <View style={styles.calloutView}>
                              <Text style={styles.calloutTitle}>
                                {produto.nomeEmpresa}
                              </Text>
                              <Text style={styles.calloutDescription}>
                                {produto.descricao.substring(0, 60) + "..."}
                              </Text>
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
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: "cover" },
  container: { flex: 1,},
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
    color:"#ffffffea",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 2,
  },
  ordenacaoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  },
  cardProdutoGenerico: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    padding: 10,
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
    width: "100%",
    height: 100,
    borderRadius: 8,
    marginTop: 5,
    resizeMode: "cover",
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
  },
  mapViewStyle: { flex: 1, borderRadius: 10 },
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
    marginBottom: 10,
    color:"#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    paddingTop:40,
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
});