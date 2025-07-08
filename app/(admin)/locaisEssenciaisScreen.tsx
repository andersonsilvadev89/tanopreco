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
  Linking // Mantido caso o Servico tivesse um link genérico, mas liveStreamLink foi removido
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import AdBanner from '../components/AdBanner'; // AdBanner de volta

import { checkAndDownloadImages } from '../../utils/imageManager'; 

const defaultFundoLocal = require('../../assets/images/fundo.png');

// === INTERFACE DE SERVIÇO ESSENCIAL ===
interface ServicoEssencial { // Renomeado de 'Local' para 'ServicoEssencial'
  id?: string;
  descricao: string;
  latitude: number;
  longitude: number;
  // REMOVIDO: liveStreamLink não é aplicável para serviços essenciais
  // Você pode adicionar outros campos aqui se precisar, como 'tipo' (ex: 'Banheiro', 'Saúde')
  // tipo?: string; 
}

// === NOVO NOME DO COMPONENTE ===
export default function ServicosEssenciaisScreen() {
  const [descricao, setDescricao] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  // REMOVIDO: liveStreamLink state

  // === ESTADO RENOMEADO DE 'locais' PARA 'servicosEssenciais' ===
  const [servicosEssenciais, setServicosEssenciais] = useState<ServicoEssencial[]>([]);
  const [carregandoServicos, setCarregandoServicos] = useState(true); // Estado de loading
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -5.5398,
    longitude: -39.4187,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);

  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  const servicosListScrollRef = useRef<ScrollView>(null); // Renomeado ref
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        // Se estiver usando checkAndDownloadImages, descomente a linha
        // const { fundoUrl } = await checkAndDownloadImages();
        // setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
        setCurrentFundoSource(defaultFundoLocal); // Usando o fallback local
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na ServicosEssenciaisScreen:", error);
        setCurrentFundoSource(defaultFundoLocal); 
      } finally {
        setFundoAppReady(true); 
      }
    };
    loadFundoImage();
  }, []);

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
      setCarregandoServicos(false); // Usa o estado renomeado
      return;
    }

    // === BUSCA DADOS DO NOVO NÓ 'servicos_essenciais' ===
    const servicosRef = ref(database, 'servicos_essenciais');
    const unsubscribe = onValue(servicosRef, (snapshot) => {
      const data = snapshot.val();
      const lista: ServicoEssencial[] = data
        ? Object.entries(data).map(([id, valor]: any) => ({ id, ...valor }))
        : [];
      setServicosEssenciais(lista.reverse()); // Usa o estado renomeado
      setCarregandoServicos(false); // Usa o estado renomeado
    }, (error) => {
      console.error("Erro ao carregar serviços essenciais:", error);
      Alert.alert("Erro", "Não foi possível carregar os serviços essenciais.");
      setCarregandoServicos(false); // Usa o estado renomeado
    });

    return () => unsubscribe();
  }, [userId]);

  const handleMapPress = (event: any) => {
    const { latitude: lat, longitude: lon } = event.nativeEvent.coordinate;
    setLatitude(lat);
    setLongitude(lon);
  };

  const salvarServico = async () => { // Renomeado para 'salvarServico'
    if (!descricao.trim() || latitude === null || longitude === null) {
      Alert.alert('Erro', 'Descrição e localização (selecionada no mapa) são obrigatórios.');
      return;
    }
    if (!userId) return;

    // === DADOS DO SERVIÇO (sem liveStreamLink) ===
    const servicoData: Omit<ServicoEssencial, 'id'> = {
      descricao,
      latitude,
      longitude,
      // liveStreamLink foi removido daqui
      // tipo: 'Banheiro' // Exemplo se você adicionar um campo 'tipo'
    };

    try {
      if (editandoId) {
        const servicoEditarRef = ref(database, `servicos_essenciais/${editandoId}`); // Novo nó
        await update(servicoEditarRef, servicoData);
        Alert.alert('Sucesso', 'Serviço essencial atualizado!');
      } else {
        const servicosRef = ref(database, 'servicos_essenciais'); // Novo nó
        const novoRef = push(servicosRef);
        await set(novoRef, servicoData);
        Alert.alert('Sucesso', 'Serviço essencial salvo com sucesso!');
      }
      limparFormulario();
    } catch (error) {
      console.error("Erro ao salvar serviço essencial:", error);
      Alert.alert("Erro", "Não foi possível salvar o serviço essencial. Tente novamente.");
    }
  };

  const limparFormulario = () => {
    setDescricao('');
    setLatitude(null);
    setLongitude(null);
    // REMOVIDO: setLiveStreamLink('');
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

  const excluirServico = (id: string) => { // Renomeado para 'excluirServico'
    Alert.alert('Confirmação', 'Deseja excluir este serviço?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!userId) return;
          try {
            const servicoRef = ref(database, `servicos_essenciais/${id}`); // Novo nó
            await remove(servicoRef);
            Alert.alert('Sucesso', 'Serviço excluído!');
          } catch (error) {
            console.error("Erro ao excluir serviço:", error);
            Alert.alert("Erro", "Não foi possível excluir o serviço.");
          }
        },
      },
    ]);
  };

  const editarServico = (servico: ServicoEssencial) => { // Renomeado para 'editarServico'
    setDescricao(servico.descricao);
    setLatitude(servico.latitude);
    setLongitude(servico.longitude);
    // REMOVIDO: setLiveStreamLink(local.liveStreamLink || '');
    setEditandoId(servico.id || null);
    setMapRegion({
      latitude: servico.latitude,
      longitude: servico.longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    });
  };

  // Condição de carregamento
  if (carregandoServicos || !fundoAppReady) { 
    return (
      <ImageBackground source={currentFundoSource} style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Carregando serviços essenciais...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={currentFundoSource} style={styles.background}> 
      <AdBanner />
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <View style={styles.formSection}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}
            >
              <Text style={styles.title}>{editandoId ? "Editar Serviço" : "Cadastro de Serviços Essenciais"}</Text>

              <Text style={styles.label}>Descrição *</Text>
              <TextInput
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Ex: Banheiro, Posto de Saúde, Estacionamento P1"
                style={styles.input}
              />

              
              <Text style={styles.label}>Selecione a localização no mapa *</Text>
              <Text style={styles.labelExplicacao}>* Dois toques aproxima o mapa</Text>
              <Text style={styles.labelExplicacao}>* Um toque escolhe a localização</Text>
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

            <View style={styles.buttonContainer}>
                <Button
                    title={editandoId ? "Atualizar Serviço" : "Salvar Serviço"} // Texto ajustado
                    onPress={salvarServico} // Função ajustada
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
            <Text style={styles.sectionTitle}>Serviços Essenciais Cadastrados</Text> 
            {servicosEssenciais.length === 0 ? ( // Usa o estado renomeado
                <Text style={styles.emptyText}>Nenhum serviço essencial cadastrado.</Text>
            ) : (
              <ScrollView
                style={styles.servicosListScroll} // Novo estilo
                contentContainerStyle={styles.servicosListContent} // Novo estilo
              >
                {servicosEssenciais.map((item) => ( // Usa o estado renomeado
                  <View key={item.id} style={styles.listItemContainer}>
                    <View style={styles.localDetails}> 
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.listItemTextBold}>{item.descricao}</Text>
                        <Text style={styles.listItemText}>Lat: {item.latitude.toFixed(5)}</Text>
                        <Text style={styles.listItemText}>Long: {item.longitude.toFixed(5)}</Text>
                      </View>
                      <View style={styles.buttonColumn}>
                        <Button title="Editar" onPress={() => editarServico(item)} /> 
                        <View style={{marginTop: 5}}/>
                        <Button title="Excluir" onPress={() => excluirServico(item.id!)} color="red" />
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
  formSection: { flex: 1.2, paddingHorizontal: 10, paddingTop: 10, justifyContent: 'space-between' },
  listSection: { flex: 0.8, paddingHorizontal: 10, paddingBottom: 10 },
  formContent: { paddingBottom: 10 },
  locaisListScroll: { flex: 1 }, // Renomeado para servicosListScroll, mas mantido aqui por compatibilidade
  locaisListContent: { paddingBottom: 10 }, // Renomeado para servicosListContent, mas mantido aqui por compatibilidade
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: '#007BFF', 
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#2c3e50', marginBottom: 15 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 6, marginTop: 12, color: '#34495e' },
  labelExplicacao: { fontSize: 13, fontWeight: '600', marginBottom: 0, marginTop: 0, color: '#34495e', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff', fontSize: 15, color: '#2c3e50', marginBottom: 5 },
  mapContainer: { 
    height: 230, 
    marginBottom: 15, 
    borderRadius: 8, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#ddd',
    width: '85%', 
    alignSelf: 'center', 
  },
  map: { ...StyleSheet.absoluteFillObject },
  coordsText: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, color: '#fff', fontWeight: 'bold', fontSize: 11 },
  buttonContainer: {
    paddingTop: 10,
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
  // REMOVIDO: listItemLiveStreamLink
  buttonColumn: {},
  // === NOVOS ESTILOS PARA A LISTA DE SERVIÇOS ESSENCIAIS ===
  servicosListScroll: { // Reutilizando a base de locaisListScroll
    flex: 1,
  },
  servicosListContent: { // Reutilizando a base de locaisListContent
    paddingBottom: 10,
  },
});