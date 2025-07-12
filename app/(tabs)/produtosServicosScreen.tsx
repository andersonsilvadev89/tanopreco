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
  Dimensions,
  Platform, // <-- Importe Platform aqui!
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { database } from "../../firebaseConfig";
import { ref, onValue, get } from "firebase/database";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import AdBanner from "../components/AdBanner";
import * as Location from "expo-location";

import { checkAndDownloadImages } from "../../utils/imageManager";

const defaultFundoLocal = require("../../assets/images/fundo.png");

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

const ITEMS_POR_PAGINA = 10;

export default function VisualizarProdutosServicos() {
  const [produtosComEmpresa, setProdutosComEmpresa] = useState<
    ProdutoComEmpresa[]
  >([]);
  const [termoBusca, setTermoBusca] = useState("");
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
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [gettingUserLocation, setGettingUserLocation] = useState(false);

  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] =
    useState<any>(defaultFundoLocal);

  // --- useEffect para carregar a imagem de fundo dinâmica ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error(
          "Erro ao carregar imagem de fundo na VisualizarProdutosServicos:",
          error
        );
        setCurrentFundoSource(defaultFundoLocal);
      } finally {
        setFundoAppReady(true);
      }
    };
    loadFundoImage();
  }, []);

  useEffect(() => {
    const empresasRef = ref(database, "solicitacoesEmpresas");
    const unsubscribeEmpresas = onValue(empresasRef, (snapshot) => {
      const data: { [key: string]: EmpresaData } = snapshot.val() || {};
      setEmpresas(data);
    });
    return () => unsubscribeEmpresas();
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (Object.keys(empresas).length === 0) {
      setLoadingInicial(true);
      return;
    }

    setLoadingInicial(true);
    const produtosRef = ref(database, "produtos");
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
                  longitude: locData.longitude,
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
    if (status !== "granted") {
      Alert.alert(
        "Permissão de Localização",
        "Precisamos da sua permissão para mostrar sua localização no mapa."
      );
      setGettingUserLocation(false);
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error("Erro ao obter localização do usuário:", error);
      Alert.alert(
        "Erro de Localização",
        "Não foi possível obter sua localização atual."
      );
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
    if (carregandoMais)
      return <ActivityIndicator size="large" color="#0000ff" />;
    if (
      !loadingInicial &&
      !todosCarregados &&
      termoBusca.length < 3 &&
      produtosComEmpresa.length > pagina * ITEMS_POR_PAGINA
    ) {
      return (
        <TouchableOpacity
          style={styles.botaoMostrarMais}
          onPress={carregarMaisProdutos}
        >
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
      (produto.palavrasChave &&
        produto.palavrasChave.toLowerCase().includes(termo)) ||
      produto.nome.toLowerCase().includes(termo)
    );
  });

  const dadosParaExibir =
    termoBusca.length >= 3
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
    // URL de fallback para web
    const webUrl = `https://www.instagram.com/${username}`;
    
    try {
      // Verifica se pode abrir o app nativo
      await Linking.openURL(webUrl);
    } catch (error) {
      console.error("Erro ao tentar abrir o Instagram:", error);
      Alert.alert("Erro", "Ocorreu um erro inesperado ao tentar abrir o Instagram.");
    }
  };

  // --- Condição de carregamento geral ---
  if (loadingInicial || gettingUserLocation || !fundoAppReady) {
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
        <TextInput
          style={styles.input}
          placeholder="Buscar (mínimo 3 caracteres)"
          value={termoBusca}
          onChangeText={buscarProdutos}
        />

        <FlatList
          data={dadosParaExibir}
          keyExtractor={(item) => item.id + item.empresaId}
          renderItem={({ item }) => (
            <View style={styles.itemContainer}>
              <View style={styles.detalhes}>
                <Text style={styles.descricao}>{item.descricao}</Text>

                <View style={styles.corpoItem}>
                  {item.imagemUrl && (
                    <Image
                      source={{ uri: item.imagemUrl }}
                      style={styles.imagem}
                      onError={(e) =>
                        console.log("Erro imagem:", e.nativeEvent.error)
                      }
                    />
                  )}
                  <View style={styles.infoEmpresaBotoes}>
                    <Text style={styles.nome}>{item.nome}</Text>
                    <View style={styles.botoesAcaoLinha}>
                      {item.localizacao?.latitude &&
                        item.localizacao?.longitude && (
                          <TouchableOpacity
                            style={[
                              styles.itemActionButton,
                              styles.mapItemButton,
                              styles.botaoEspacado,
                            ]}
                            onPress={() => handleVerNoMapa(item)}
                          >
                            <Text style={styles.itemActionButtonText}>
                              Ver no Mapa
                            </Text>
                          </TouchableOpacity>
                        )}
                      {item.linkInstagram && (
                        <TouchableOpacity
                          onPress={() =>
                            openInstagramProfile(item.linkInstagram) // <-- Chamada para a função corrigida
                          }
                        >
                          <LinearGradient
                            colors={["#8a3ab9", "#bc2a8d", "#fbad50"]}
                            start={{ x: 0.0, y: 1.0 }}
                            end={{ x: 1.0, y: 0.0 }}
                            style={styles.instagramButton}
                          >
                            <Text style={styles.instagramButtonText}>
                              Instagram
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.precoContainer}>
                      {item.preco ? (
                        <Text style={styles.preco}>
                          R${" "}
                          {parseFloat(
                            item.preco
                              .replace("R$", "")
                              .replace(/\./g, "")
                              .replace(",", ".")
                          ).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      ) : (
                        <View />
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
          ListFooterComponent={renderFooter}
          onEndReachedThreshold={0.1}
          onEndReached={
            termoBusca.length < 3 ? carregarMaisProdutos : undefined
          }
          ListEmptyComponent={
            !loadingInicial ? (
              <Text style={styles.mensagemNenhumResultado}>
                Nenhum produto/serviço encontrado.
              </Text>
            ) : null
          }
          style={styles.productList}
        />


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
                        p.localizacao?.latitude &&
                        p.localizacao?.longitude &&
                        !(
                          selectedLocation &&
                          p.empresaId === selectedLocation.empresaId &&
                          p.id === selectedLocation.produtoId
                        )
                    )
                    .map((produto) => (
                      <Marker
                        key={produto.id + produto.empresaId + "_mapmarker"}
                        coordinate={produto.localizacao!}
                        title={produto.nome}
                        description={produto.descricao.substring(0, 40) + "..."}
                        pinColor="yellow"
                        zIndex={1}
                      >
                        <Callout tooltip>
                          <View style={styles.calloutView}>
                            <Text style={styles.calloutTitle}>
                              {produto.nome}
                            </Text>
                            <Text style={styles.calloutDescription}>
                              {produto.descricao.substring(0, 60) + "..."}
                            </Text>
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

        {termoBusca.length >= 3 && produtosFiltrados.length === 0 && (
          <Text style={styles.mensagemNenhumResultado}>
            Nenhum produto/serviço encontrado.
          </Text>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: "cover" },
  container: { flex: 1, padding: 10 },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: "white",
  },
  productList: { flex: 1 }, // Estilo para a FlatList principal
  itemContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 5,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 3,
    alignItems: "center",
  },
  imagem: { width: 150, height: 80, borderRadius: 3, marginRight: 10 },
  detalhes: { flex: 1, flexDirection: "column" },
  descricao: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
    backgroundColor: "rgba(0, 0, 0, 0.06)",
    borderRadius: 5,
  },
  corpoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 0,
  },
  infoEmpresaBotoes: {
    flexDirection: "column",
    alignItems: "center",
    flex: 1.8,
    paddingRight: 5,
  },
  nome: {
    fontSize: 14,
    color: "#0056b3",
    marginBottom: 0,
    textAlign: "center",
    fontWeight: "bold",
  },
  botoesAcaoLinha: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    minHeight: 22,
  },
  botaoEspacado: { marginRight: 8 },
  precoContainer: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    width: "100%",
  },
  preco: {
    fontSize: 25,
    color: "green",
    fontWeight: "600",
    textAlign: "right",
  },
  itemActionButton: {
    paddingVertical: 1,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 20,
    minWidth: 90,
  },
  itemActionButtonText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  mapItemButton: { backgroundColor: "#007BFF" },
  botaoMostrarMais: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  textoBotaoMostrarMais: { color: "white", fontWeight: "bold", fontSize: 15 },
  mensagemNenhumResultado: {
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
    color: "gray",
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  loadingText: { marginTop: 10, fontSize: 16, color: "white" },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  instagramButton: {
    paddingVertical: 1,
    paddingHorizontal: 10,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
    minHeight: 20,
  },
  instagramButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
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
});