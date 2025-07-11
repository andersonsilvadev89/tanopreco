import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Alert,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { database } from "../../firebaseConfig";
import { ref, get } from "firebase/database";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import * as Location from "expo-location";

import { checkAndDownloadImages } from '../../utils/imageManager';
import AdBanner from "../components/AdBanner"; // Assumindo que você quer o banner de anúncios aqui também

const defaultFundoLocal = require('../../assets/images/fundo.png');

// === INTERFACE PARA SERVIÇOS ESSENCIAIS ===
interface ServicoEssencial {
  id: string;
  descricao: string;
  latitude: number;
  longitude: number;
}

export default function VisualizarServicosEssenciais() {
  const [servicosEssenciais, setServicosEssenciais] = useState<ServicoEssencial[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [servicosError, setServicosError] = useState<string | null>(null);
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
  } | null>(null);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingUserLocation, setGettingUserLocation] = useState(false);

  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  // --- useEffect para carregar a imagem de fundo dinâmica ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na VisualizarServicosEssenciais:", error);
        setCurrentFundoSource(defaultFundoLocal);
      } finally {
        setFundoAppReady(true);
      }
    };
    loadFundoImage();
  }, []);

  // --- useEffect para buscar Serviços Essenciais ---
  useEffect(() => {
    const fetchServicos = async () => {
      setLoadingInicial(true);
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
        setLoadingInicial(false);
      }
    };
    fetchServicos();
  }, []); // Executa apenas uma vez ao montar

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

  // Chama a função de localização ao montar o componente
  useEffect(() => {
    getUserCurrentLocation();
  }, []);

  const buscarServicos = (texto: string) => {
    setTermoBusca(texto);
  };

  const servicosFiltrados = servicosEssenciais.filter((servico) => {
    if (termoBusca.length < 3) return true;
    const termo = termoBusca.toLowerCase();
    return servico.descricao.toLowerCase().includes(termo);
  });

  const handleVerNoMapaServico = (servico: ServicoEssencial) => {
    if (servico.latitude && servico.longitude) {
      setSelectedLocation({
        latitude: servico.latitude,
        longitude: servico.longitude,
        nome: servico.descricao,
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

  // --- Condição de carregamento geral ---
  if (loadingInicial || gettingUserLocation || !fundoAppReady) {
    return (
      <ImageBackground source={currentFundoSource} style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Carregando serviços essenciais...</Text>
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
          placeholder="Buscar serviços essenciais (mínimo 3 caracteres)"
          value={termoBusca}
          onChangeText={buscarServicos}
        />

        {servicosError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{servicosError}</Text>
          </View>
        ) : (
          <FlatList
            data={servicosFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.itemContainer}>
                <View style={styles.detalhes}>
                  <Text style={styles.descricao}>{item.descricao}</Text>
                  <TouchableOpacity
                    style={[styles.itemActionButton, styles.mapItemButton]}
                    onPress={() => handleVerNoMapaServico(item)}
                  >
                    <Feather name="map-pin" size={16} color="white" style={{ marginRight: 5 }} />
                    <Text style={styles.itemActionButtonText}>Ver no Mapa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={!loadingInicial && servicosFiltrados.length === 0 ? (
              <Text style={styles.mensagemNenhumResultado}>Nenhum serviço essencial encontrado.</Text>
            ) : null}
          />
        )}

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
                      description={"Local do serviço essencial"}
                      pinColor="blue"
                      zIndex={1}
                    >
                      <Callout tooltip>
                        <View style={styles.calloutView}>
                          <Text style={styles.calloutTitle}>{selectedLocation.nome}</Text>
                          <Text style={styles.calloutDescription}>Serviço Essencial</Text>
                        </View>
                      </Callout>
                    </Marker>
                  )}
                  {servicosEssenciais
                    .filter(s =>
                      s.latitude && s.longitude &&
                      !(selectedLocation && selectedLocation.nome === s.descricao && selectedLocation.latitude === s.latitude && selectedLocation.longitude === s.longitude)
                    )
                    .map((servico) => (
                      <Marker
                        key={servico.id + "_servicomapmarker"}
                        coordinate={{ latitude: servico.latitude, longitude: servico.longitude }}
                        title={servico.descricao}
                        description={"Serviço Essencial"}
                        pinColor="green" // Cor diferente para outros serviços no mapa
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
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: 'cover' },
  container: { flex: 1, padding: 10 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 10, backgroundColor: 'white' },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'space-between', // Para alinhar descrição e botão
  },
  detalhes: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  descricao: { fontSize: 16, fontWeight: 'bold', color: '#333', flexShrink: 1, marginRight: 10 },
  itemActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    minHeight: 30,
  },
  itemActionButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  mapItemButton: { backgroundColor: '#007BFF' },
  mensagemNenhumResultado: { textAlign: 'center', marginTop: 20, fontStyle: 'italic', color: 'gray', fontSize: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  loadingText: { marginTop: 10, fontSize: 16, color: 'white' },
  errorContainer: {
    padding: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
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
});