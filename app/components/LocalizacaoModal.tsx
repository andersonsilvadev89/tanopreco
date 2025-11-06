// src/components/LocalizacaoModal.tsx

import React, { useState, useEffect } from "react";
import { View, Text, Modal, Button, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onSave: (coords: { latitude: number; longitude: number }) => void;
  initialCoords?: { latitude: number | null; longitude: number | null };
}

// Coordenadas padrão (Exemplo: São Paulo, Brasil)
const DEFAULT_COORDS: Region = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const LocalizacaoModal: React.FC<Props> = ({ isVisible, onClose, onSave, initialCoords }) => {
  const [currentRegion, setCurrentRegion] = useState<Region>(DEFAULT_COORDS);
  const [markerCoords, setMarkerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isVisible) return;

    setLoading(true);
    let initialLat = initialCoords?.latitude;
    let initialLon = initialCoords?.longitude;

    const setupLocation = async () => {
      // Tenta usar a localização inicial salva
      if (initialLat && initialLon ) {
        setMarkerCoords({ latitude: initialLat, longitude: initialLon });
        setCurrentRegion({ ...DEFAULT_COORDS, latitude: initialLat, longitude: initialLon });
        setLoading(false);
        return;
      }

      // Se não houver localização salva, tenta pegar a localização atual do dispositivo
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão de Localização', 'Permita o acesso à localização para selecionar o produto no mapa.');
          setLoading(false);
          setMarkerCoords({ latitude: DEFAULT_COORDS.latitude, longitude: DEFAULT_COORDS.longitude });
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const newCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setCurrentRegion({ ...DEFAULT_COORDS, ...newCoords });
        setMarkerCoords(newCoords);
      } catch (error) {
        console.error("Erro ao obter localização: ", error);
        Alert.alert("Erro", "Não foi possível obter a localização atual. Usando padrão.");
        setMarkerCoords({ latitude: DEFAULT_COORDS.latitude, longitude: DEFAULT_COORDS.longitude });
      } finally {
        setLoading(false);
      }
    };
    
    setupLocation();
  }, [isVisible, initialCoords]);

  const handleSave = () => {
    if (markerCoords) {
      onSave(markerCoords);
    } else {
      Alert.alert("Erro", "Selecione uma localização no mapa.");
    }
  };

  const onDragEnd = (e: any) => {
    setMarkerCoords(e.nativeEvent.coordinate);
  };
  
  const handleMapPress = (e: any) => {
    setMarkerCoords(e.nativeEvent.coordinate);
  };

  return (
    <Modal
      visible={isVisible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Feather name="x" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>📍 Selecionar Localização do Produto</Text>
          <Text style={styles.tipText}>
            {loading ? "Carregando mapa..." : "Toque no mapa ou arraste o marcador para definir a localização."}
          </Text>

          <View style={styles.mapContainer}>
            {loading ? (
                <View style={styles.loadingMapContainer}>
                    <ActivityIndicator size="large" color="#007BFF" />
                    <Text>Carregando mapa...</Text>
                </View>
            ) : (
                <MapView
                  style={styles.map}
                  initialRegion={currentRegion}
                  onRegionChangeComplete={(region) => setCurrentRegion(region)}
                  onPress={handleMapPress}
                >
                  {markerCoords && (
                    <Marker
                      coordinate={markerCoords}
                      title="Localização do Produto"
                      draggable
                      onDragEnd={onDragEnd}
                      pinColor="#04ad20ff" 
                    />
                  )}
                </MapView>
            )}
          </View>

          <Text style={styles.coordsText}>
              Coordenadas: {markerCoords ? `Lat: ${markerCoords.latitude.toFixed(6)}, Lon: ${markerCoords.longitude.toFixed(6)}` : "Nenhuma selecionada"}
          </Text>

          <Button title="Confirmar Localização" onPress={handleSave} disabled={!markerCoords} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    alignItems: "stretch",
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    zIndex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 5,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: 'center',
    marginBottom: 5,
    marginTop: 10,
  },
  tipText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
    fontSize: 12,
  },
  coordsText: {
    textAlign: 'center',
    color: '#333',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 300,
    width: '100%',
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  map: {
    flex: 1,
  },
  loadingMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  }
});

export default LocalizacaoModal;