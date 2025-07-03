import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import AdBanner from '../components/AdBanner';

interface Local {
  id?: string;
  descricao: string;
  latitude: number;
  longitude: number;
}

const fundo = require('../../assets/images/fundo.png');

export default function LocaisScreen() {
  const [descricao, setDescricao] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locais, setLocais] = useState<Local[]>([]);
  const [carregandoLocais, setCarregandoLocais] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -5.5398,
    longitude: -39.4187,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);

  const locaisListScrollRef = useRef<ScrollView>(null);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Para usar o mapa, por favor, conceda permissão de localização.');
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        console.error("Erro ao obter localização:", error);
        Alert.alert("Erro de Localização", "Não foi possível obter sua localização atual.");
      }
    })();

    if (!userId) {
      setCarregandoLocais(false);
      return;
    }

    const locaisRef = ref(database, 'locais');
    const unsubscribe = onValue(locaisRef, (snapshot) => {
      const data = snapshot.val();
      const lista: Local[] = data
        ? Object.entries(data).map(([id, valor]: any) => ({ id, ...valor }))
        : [];
      setLocais(lista.reverse());
      setCarregandoLocais(false);
    }, (error) => {
      console.error("Erro ao carregar locais:", error);
      Alert.alert("Erro", "Não foi possível carregar os locais.");
      setCarregandoLocais(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleMapPress = (event: any) => {
    const { latitude: lat, longitude: lon } = event.nativeEvent.coordinate;
    setLatitude(lat);
    setLongitude(lon);
  };

  const salvarLocal = async () => {
    if (!descricao.trim() || latitude === null || longitude === null) {
      Alert.alert('Erro', 'Descrição e localização (selecionada no mapa) são obrigatórios.');
      return;
    }
    if (!userId) return;

    const localData: Omit<Local, 'id'> = {
      descricao,
      latitude,
      longitude,
    };

    try {
      if (editandoId) {
        const localEditarRef = ref(database, `locais/${editandoId}`);
        await update(localEditarRef, localData);
        Alert.alert('Sucesso', 'Local atualizado!');
      } else {
        const localRef = ref(database, 'locais');
        const novoRef = push(localRef);
        await set(novoRef, localData);
        Alert.alert('Sucesso', 'Local salvo com sucesso!');
      }
      limparFormulario();
    } catch (error) {
      console.error("Erro ao salvar local:", error);
      Alert.alert("Erro", "Não foi possível salvar o local. Tente novamente.");
    }
  };

  const limparFormulario = () => {
    setDescricao('');
    setLatitude(null);
    setLongitude(null);
    setEditandoId(null);
    Keyboard.dismiss();
    
    if (userLocation) {
        setMapRegion({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        });
    } else {
        setMapRegion({
            latitude: -5.5398,
            longitude: -39.4187,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        });
    }
  };

  const excluirLocal = (id: string) => {
    Alert.alert('Confirmação', 'Deseja excluir este local?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!userId) return;
          try {
            const localRef = ref(database, `locais/${id}`);
            await remove(localRef);
            Alert.alert('Sucesso', 'Local excluído!');
          } catch (error) {
            console.error("Erro ao excluir local:", error);
            Alert.alert("Erro", "Não foi possível excluir o local.");
          }
        },
      },
    ]);
  };

  const editarLocal = (local: Local) => {
    setDescricao(local.descricao);
    setLatitude(local.latitude);
    setLongitude(local.longitude);
    setEditandoId(local.id || null);
    setMapRegion({
      latitude: local.latitude,
      longitude: local.longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    });
    // Não é mais necessário rolar para o topo, pois o formulário já estará visível
  };

  if (carregandoLocais && userId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Carregando locais...</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={fundo} style={styles.background}>
      <AdBanner />
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          {/* --- SEÇÃO DO FORMULÁRIO (Layout alterado) --- */}
          <View style={styles.formSection}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}
            >
              <Text style={styles.title}>{editandoId ? "Editar Local" : "Cadastro de Locais"}</Text>

              <Text style={styles.label}>Descrição *</Text>
              <TextInput
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Ex: Palco Principal, Barraca do Zé"
                style={styles.input}
              />

              <Text style={styles.label}>Selecione a localização no mapa *</Text>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  region={mapRegion}
                  onPress={handleMapPress}
                  onRegionChangeComplete={(region) => setMapRegion(region)}
                  showsUserLocation
                  showsMyLocationButton={false}
                >
                  {latitude !== null && longitude !== null && (
                    <Marker
                      coordinate={{ latitude, longitude }}
                      title="Local Selecionado"
                      description={descricao || "Ponto no mapa"}
                      pinColor="red"
                    />
                  )}
                </MapView>
                {latitude !== null && longitude !== null && (
                  <Text style={styles.coordsText}>
                    Lat: {latitude.toFixed(5)}, Lon: {longitude.toFixed(5)}
                  </Text>
                )}
              </View>
            </ScrollView>

            {/* --- BOTÕES FORA DO SCROLLVIEW --- */}
            <View style={styles.buttonContainer}>
                <Button
                    title={editandoId ? "Atualizar Local" : "Salvar Local"}
                    onPress={salvarLocal}
                    color="#007bff"
                />
                {editandoId && (
                    <TouchableOpacity style={styles.cancelButton} onPress={limparFormulario}>
                        <Text style={styles.cancelButtonText}>Cancelar Edição</Text>
                    </TouchableOpacity>
                )}
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Locais Cadastrados</Text>
            {locais.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum local cadastrado.</Text>
            ) : (
              <ScrollView
                style={styles.locaisListScroll}
                contentContainerStyle={styles.locaisListContent}
              >
                {locais.map((item) => (
                  <View key={item.id} style={styles.listItemContainer}>
                    <View style={styles.localDetails}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.listItemTextBold}>{item.descricao}</Text>
                        <Text style={styles.listItemText}>Lat: {item.latitude.toFixed(5)}</Text>
                        <Text style={styles.listItemText}>Long: {item.longitude.toFixed(5)}</Text>
                      </View>
                      <View style={styles.buttonColumn}>
                        <Button title="Editar" onPress={() => editarLocal(item)} />
                        <View style={{marginTop: 5}}/>
                        <Button title="Excluir" onPress={() => excluirLocal(item.id!)} color="red" />
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: 'cover' },
  overlay: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.8)', margin: 8, borderRadius: 10, padding: 5 },
  container: { flex: 1 },
  // A seção do formulário agora usa flex para acomodar o ScrollView e o container de botões
  formSection: { flex: 1.2, paddingHorizontal: 10, paddingTop: 10, justifyContent: 'space-between' },
  listSection: { flex: 0.8, paddingHorizontal: 10, paddingBottom: 10 },
  formContent: { paddingBottom: 10 },
  locaisListScroll: { flex: 1 },
  locaisListContent: { paddingBottom: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.8)' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#2c3e50', marginBottom: 15 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 6, marginTop: 12, color: '#34495e' },
  input: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff', fontSize: 15, color: '#2c3e50', marginBottom: 5 },
  mapContainer: { height: 230, marginBottom: 15, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  map: { ...StyleSheet.absoluteFillObject },
  coordsText: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, color: '#fff', fontWeight: 'bold', fontSize: 11 },
  // NOVO: Container para os botões de ação do formulário
  buttonContainer: {
      paddingTop: 10, // Espaço entre a área de scroll e os botões
      paddingBottom: 5,
  },
  cancelButton: { backgroundColor: '#e74c3c', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  separator: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#2c3e50' },
  emptyText: { fontStyle: 'italic', color: '#7f8c8d', textAlign: 'center', paddingVertical: 20, fontSize: 15 },
  listItemContainer: { marginBottom: 8, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', shadowColor: "#000", shadowOffset: { width: 0, height: 1, }, shadowOpacity: 0.20, shadowRadius: 1.41, elevation: 2 },
  localDetails: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  listItemTextBold: { fontWeight: 'bold', fontSize: 16, marginBottom: 4, color: '#2c3e50' },
  listItemText: { fontSize: 13, color: '#34495e', marginBottom: 2 },
  buttonColumn: {},
});