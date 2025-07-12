import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Image,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, Region, Callout } from 'react-native-maps';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import 'moment/locale/pt-br';
import * as Location from 'expo-location'; // <--- Importe o Location do Expo

// === IMPORTAÇÃO DO COMPONENTE AdBanner ===
import AdBanner from '../components/AdBanner';

const defaultFundoLocal = require('../../assets/images/fundo.png');

// --- Interfaces ---
interface Evento {
  id: string;
  nomeBanda: string;
  horaInicio: string;
  local: string;
  imagemUrl?: string;
  dataMomento: string;
}

interface Locais {
  id: string;
  descricao: string;
  latitude?: number;
  longitude?: number;
  liveStreamLink?: string;
}

// --- Constantes ---
const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const ITEM_PROGRAMACAO_HEIGHT = screenHeight * 0.13;

const LineUpScreen = () => {
  const [programacaoDia, setProgramacaoDia] = useState<Evento[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<Date>(new Date());
  const [mapaVisivel, setMapaVisivel] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: -7.2345, // Coordenadas padrão para Barbalha, Ceará
    longitude: -39.4056, // Coordenadas padrão para Barbalha, Ceará
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [eventoSelecionadoNoMapa, setEventoSelecionadoNoMapa] = useState<Evento | null>(null);
  const [dataTitulo, setDataTitulo] = useState('Programação do Dia');
  const [locaisData, setLocaisData] = useState<Locais[]>([]);

  const [liveStreamLinksData, setLiveStreamLinksData] = useState<Locais[]>([]);

  const cratoLocation = { latitude: -7.2345, longitude: -39.4056 }; // Mantenha Crato como um ponto de referência se necessário

  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  // --- NOVO ESTADO: Armazenará a localização do usuário ---
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  // --- NOVO ESTADO: Para indicar se está obtendo a localização do usuário ---
  const [gettingUserLocation, setGettingUserLocation] = useState(false);

  // --- useEffect para carregar a imagem de fundo dinâmica (inalterado) ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        setCurrentFundoSource(defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na LineUpScreen:", error);
        setCurrentFundoSource(defaultFundoLocal);
      } finally {
        setFundoAppReady(true);
      }
    };
    loadFundoImage();
  }, []);

  // Lógica para buscar locais (inalterada)
  useEffect(() => {
    const locaisRef = ref(database, 'locais');
    const unsubscribeLocais = onValue(locaisRef, (snapshot) => {
      const locais: Locais[] = [];
      const links: Locais[] = [];
      snapshot.forEach((childSnapshot) => {
        const localData = childSnapshot.val();
        const localItem: Locais = {
          id: childSnapshot.key!,
          descricao: localData.descricao,
          latitude: localData.latitude,
          longitude: localData.longitude,
          liveStreamLink: localData.liveStreamLink,
        };
        locais.push(localItem);

        if (localData.liveStreamLink) {
          links.push(localItem);
        }
      });
      setLocaisData(locais);
      setLiveStreamLinksData(links);
    });
    return () => unsubscribeLocais();
  }, []);

  // Lógica para buscar a programação do dia (inalterada)
  useEffect(() => {
    const lineupRef = ref(database, 'lineup');
    const unsubscribeLineup = onValue(lineupRef, (snapshot) => {
      const eventosCarregados: Evento[] = [];
      snapshot.forEach((childSnapshot) => {
        eventosCarregados.push({ id: childSnapshot.key!, ...childSnapshot.val() });
      });
      const eventosDoDia = eventosCarregados.filter((evento) => {
        const dataEvento = moment(evento.dataMomento, 'DD-MM-YYYY');
        const dataSelecionada = moment(diaSelecionado);
        return dataEvento.isSame(dataSelecionada, 'day');
      })
      .sort((a,b) => moment(a.horaInicio, 'HH:mm').diff(moment(b.horaInicio, 'HH:mm')));
      setProgramacaoDia(eventosDoDia);
    });
    return () => unsubscribeLineup();
  }, [diaSelecionado]);

  useEffect(() => {
    const hoje = moment();
    const diaSelecionadoMoment = moment(diaSelecionado);
    if (diaSelecionadoMoment.isSame(hoje, 'day')) {
      setDataTitulo('Programação do Dia');
    } else {
      setDataTitulo(diaSelecionadoMoment.format('DD [de] MMMM'));
    }
  }, [diaSelecionado]);

  // --- NOVA FUNÇÃO: Para obter a localização do usuário ---
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

  // --- Chame a função de localização ao carregar o componente ---
  useEffect(() => {
    getUserCurrentLocation();
  }, []); // [] garante que executa apenas uma vez ao montar

  const visualizarNoMapa = (evento: Evento) => {
    const nomeLocalEventoNormalizado = evento.local.toLowerCase().trim();
    const localEncontrado = locaisData.find((local) =>
      local.descricao.toLowerCase().trim() === nomeLocalEventoNormalizado
    );
    if (localEncontrado && typeof localEncontrado.latitude === 'number' && typeof localEncontrado.longitude === 'number') {
      setMapRegion({
        latitude: localEncontrado.latitude, longitude: localEncontrado.longitude,
        latitudeDelta: 0.01, longitudeDelta: 0.01,
      });
      setEventoSelecionadoNoMapa(evento);
    } else {
      setMapRegion({ ...cratoLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 });
      Alert.alert('Localização não encontrada', `As coordenadas para "${evento.local}" não foram encontradas.`);
      setEventoSelecionadoNoMapa(null);
    }
    setMapaVisivel(true);
  };

  const avancarDia = () => { setDiaSelecionado(moment(diaSelecionado).add(1, 'day').toDate()); };
  const voltarDia = () => { setDiaSelecionado(moment(diaSelecionado).subtract(1, 'day').toDate()); };

  const renderProgramacaoItem = ({ item }: { item: Evento }) => {
    const handlePressVerNoMapa = () => {
      visualizarNoMapa(item);
    };

    if (item.imagemUrl) {
      return (
        <View style={styles.programacaoItemWrapper}>
          <ImageBackground
            source={{ uri: item.imagemUrl }}
            style={styles.programacaoItemImagem}
            imageStyle={styles.programacaoItemImagemStyle}
            resizeMode='cover'
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)', ]}
              style={styles.textOverlayGradient}
              end={{ x: 0.9, y: 0 }}
            >
              <Text style={styles.textOverlayNomeBanda} numberOfLines={2}>{item.nomeBanda}</Text>
              <Text style={styles.textOverlayDetalhes}>{item.horaInicio} | {item.local}</Text>
              <Text style={styles.textOverlayData}>{moment(item.dataMomento, 'DD-MM-YYYY').format('DD/MM - dddd')}</Text>

              <TouchableOpacity onPress={handlePressVerNoMapa} style={[styles.verNoMapaButtonBase, styles.verNoMapaButtonComImagem]}>
                <Feather name="map-pin" size={14} color="#FFFFFF" />
                <Text style={[styles.verNoMapaButtonTextBase, styles.verNoMapaButtonTextComImagem]}>Ver no Mapa</Text>
              </TouchableOpacity>
            </LinearGradient>
          </ImageBackground>
        </View>
      );
    } else {
      return (
        <View style={styles.programacaoItemSemImagem}>
          <Text style={styles.nomeEventoSemImagem}>{item.nomeBanda}</Text>
          <Text style={styles.detalhesEventoSemImagem}>{moment(item.dataMomento, 'DD-MM-YYYY').format('dddd, DD/MM')} - {item.horaInicio}</Text>
          <TouchableOpacity onPress={handlePressVerNoMapa} style={[styles.verNoMapaButtonBase, styles.verNoMapaButtonSemImagem]}>
            <Feather name="map-pin" size={14} color="#007bff" />
            <Text style={[styles.verNoMapaButtonTextBase, styles.verNoMapaButtonTextSemImagem]}>Ver no Mapa</Text>
          </TouchableOpacity>
          <Text style={styles.detalhesEventoSemImagemLocal}>{item.local}</Text>
        </View>
      );
    }
  };

  const renderLiveStreamLinkItem = ({ item }: { item: Locais }) => {
    const getPlatformIcon = (url: string) => {
      if (url.includes('instagram.com')) {
        return <Feather name="instagram" size={20} color="#E4405F" />;
      } else if (url.includes('youtube.com')) { // Alterado de "youtube.com" para cobrir mais URLs
        return <Feather name="youtube" size={20} color="#FF0000" />;
      } else if (url.includes('facebook.com')) {
        return <Feather name="facebook" size={20} color="#1877F2" />;
      }
      return <Feather name="link" size={20} color="#007bff" />;
    };

    const handlePress = () => {
      Linking.openURL(item.liveStreamLink!).catch(err => {
        console.error("Não foi possível abrir o link:", err);
        Alert.alert("Erro", "Não foi possível abrir o link da live/rede social.");
      });
    };

    return (
      <TouchableOpacity onPress={handlePress} style={styles.liveStreamLinkItem}>
        {getPlatformIcon(item.liveStreamLink || '')}
        <Text style={styles.liveStreamLinkItemText}>{item.descricao}</Text>
      </TouchableOpacity>
    );
  };


  if (!fundoAppReady || gettingUserLocation) { // <--- Adicione gettingUserLocation aqui
    return (
      <ImageBackground source={defaultFundoLocal} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Carregando fundo...</Text>
        {gettingUserLocation && ( // <--- Mostra mensagem ao obter localização
          <Text style={styles.loadingText}>Obtendo sua localização...</Text>
        )}
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={currentFundoSource} style={styles.background}>
      <AdBanner />

      <SafeAreaView style={styles.safeAreaContainer}>
        <View style={styles.container}>
          <View style={styles.headerDate}>
            <TouchableOpacity onPress={voltarDia} style={styles.botaoNavegacao}>
              <View style={styles.iconeBotao}><Feather name="chevron-left" size={28} color="#333" /></View>
            </TouchableOpacity>
            <Text style={styles.titulo}>{dataTitulo}</Text>
            <TouchableOpacity onPress={avancarDia} style={styles.botaoNavegacao}>
              <View style={styles.iconeBotao}><Feather name="chevron-right" size={28} color="#333" /></View>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Programação do Dia</Text>
          <FlatList
            data={programacaoDia}
            keyExtractor={(item) => item.id}
            renderItem={renderProgramacaoItem}
            ListEmptyComponent={<Text style={styles.mensagemVazio}>Nenhum evento programado para este dia.</Text>}
            contentContainerStyle={styles.programacaoListContent}
          />

          {liveStreamLinksData.length > 0 && (
            <View style={styles.liveStreamLinksSectionContainer}>
              <Text style={styles.liveStreamLinksSectionTitle}>Veja o que está acontecendo agora!</Text>
              <FlatList
                data={liveStreamLinksData}
                keyExtractor={(item) => item.id}
                renderItem={renderLiveStreamLinkItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.liveStreamLinksListContent}
              />
            </View>
          )}

        </View>
      </SafeAreaView>

      {mapaVisivel && (
        <View style={styles.mapOuterContainer}>
            <View style={styles.mapContainer}>
                <MapView style={styles.map} initialRegion={mapRegion} region={mapRegion}>
                    {userLocation && (
                      <Marker
                        coordinate={userLocation}
                        zIndex={2} // Garante que fique acima de outros marcadores
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
                    {programacaoDia
                        .filter(evento => {
                            const localDoEvento = locaisData.find((local) => local.descricao.toLowerCase().trim() === evento.local.toLowerCase().trim());
                            // Filtra apenas eventos que possuem localização válida
                            return localDoEvento && typeof localDoEvento.latitude === 'number' && typeof localDoEvento.longitude === 'number';
                        })
                        .map((evento) => {
                            const localDoEvento = locaisData.find((local) => local.descricao.toLowerCase().trim() === evento.local.toLowerCase().trim())!;
                            const isSelected = eventoSelecionadoNoMapa?.id === evento.id;
                            return (
                            <Marker
                                key={evento.id + "_mapmarker"} // Adicionado sufixo para garantir unicidade da key
                                coordinate={{ latitude: localDoEvento.latitude!, longitude: localDoEvento.longitude! }}
                                title={evento.nomeBanda}
                                description={`${evento.local} - ${evento.horaInicio}`}
                                // Cor do pino: azul para selecionado, vermelho para outros eventos
                                pinColor={isSelected ? 'rgba(0, 122, 255, 1)' : 'rgba(255, 59, 48, 1)'}
                                zIndex={isSelected ? 1 : 0} // Marcador selecionado aparece acima dos outros eventos
                            >
                                {Platform.OS === 'ios' ? ( // No iOS, pinColor não tem efeito, então usamos uma imagem
                                  <Image source={{ uri: isSelected ? 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png' : 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png' }} style={[ styles.markerImageBase, isSelected && styles.selectedMarkerImage ]} resizeMode="contain" />
                                ) : (
                                  null // No Android, pinColor funciona, então não precisamos de uma imagem extra aqui se o pinColor for suficiente
                                )}
                                <Callout tooltip={Platform.OS === 'ios'}>
                                  <View style={styles.calloutView}>
                                    <Text style={styles.calloutTitle}>{evento.nomeBanda}</Text>
                                    <Text style={styles.calloutDescription}>{evento.local}</Text>
                                    <Text style={styles.calloutDescription}>{evento.horaInicio}</Text>
                                  </View>
                                </Callout>
                            </Marker>
                            );
                        })}
                </MapView>
                <TouchableOpacity style={styles.fecharMapa} onPress={() => { setMapaVisivel(false); setEventoSelecionadoNoMapa(null); }}>
                    <Feather name="x" size={24} color="#333" />
                </TouchableOpacity>
            </View>
        </View>
      )}
    </ImageBackground>
  );
};

// ESTILOS ATUALIZADOS (Adicione os novos estilos e ajuste os existentes se necessário)
const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: 'cover' },
  adBanner: {
    height: 60,
    backgroundColor: 'rgba(220,220,220,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  adBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  safeAreaContainer: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 10, paddingTop: 10 },
  headerDate: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, },
  botaoNavegacao: { padding: 5 },
  iconeBotao: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 25, padding: 5, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 15, flex: 1, marginHorizontal: 5, elevation: 2 },
  programacaoListContent: { paddingBottom: 10, marginRight: 0, },

  programacaoItemWrapper: {
    height: ITEM_PROGRAMACAO_HEIGHT,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 4,
    backgroundColor: '#e0e0e0',
  },
  programacaoItemImagem: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  programacaoItemImagemStyle: {
    width: '70%',
  },
  textOverlayGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    paddingLeft: 30,
    paddingBottom: 10,
    paddingHorizontal: 10,
    width: '100%',
  },
  textOverlayNomeBanda: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 3,
    textAlign: 'right',
  },
  textOverlayDetalhes: {
    fontSize: 13,
    color: '#f0f0f0',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    marginBottom: 1,
    textAlign: 'right',
  },
  textOverlayData: {
    fontSize: 12,
    color: '#e0e0e0',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    marginTop: 2,
    marginBottom: 8,
    textAlign: 'right',
  },
  programacaoItemSemImagem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 3,
  },
  nomeEventoSemImagem: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  detalhesEventoSemImagem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  detalhesEventoSemImagemLocal: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
  },

  verNoMapaButtonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-end',

  },
  verNoMapaButtonTextBase: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  verNoMapaButtonComImagem: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  verNoMapaButtonTextComImagem: {
    color: '#FFFFFF',
  },
  verNoMapaButtonSemImagem: {
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
  },
  verNoMapaButtonTextSemImagem: {
    color: '#007bff',
  },
  mensagemVazio: { textAlign: 'center', color: 'rgba(255,255,255,0.9)', marginTop: 30, fontSize: 17, fontWeight: '500' },
  mapOuterContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  mapContainer: { width: '90%', height: '70%', borderRadius: 15, overflow: 'hidden', backgroundColor: 'white', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 5 },
  map: { ...StyleSheet.absoluteFillObject },
  fecharMapa: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 8, borderRadius: 20, elevation: 6, zIndex:1 },

  markerImageBase: { width: 28, height: 28 },
  selectedMarkerImage: { width: 38, height: 38 },
  calloutView: { width: 200, padding: 12, backgroundColor: 'white', borderRadius: 10, borderColor: '#ddd', borderWidth: 0.5, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5 },
  calloutTitle: { fontWeight: 'bold', fontSize: 15, color: '#333', marginBottom: 4 },
  calloutDescription: { fontSize: 13, color: '#555', marginBottom: 2 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Usando o fundo padrão para o carregamento inicial
    backgroundColor: 'rgba(0,0,0,0.5)', // Escurece um pouco para o texto branco
  },
  loadingText: {
    marginTop: 10,
    color: '#FFFFFF', // Cor do texto de carregamento alterada para branco
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  liveStreamLinksSectionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingTop: 5,
    marginTop: 5,
    marginBottom: 5,
    paddingBottom: 5,
    height: screenHeight * 0.15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  liveStreamLinksSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  liveStreamLinksListContent: {
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  liveStreamLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    marginBottom: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  liveStreamLinkItemText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  // --- NOVOS ESTILOS PARA O MARCADOR DE LOCALIZAÇÃO DO USUÁRIO ---
  myLocationMarker: {
    backgroundColor: '#007BFF', // Cor azul para o marcador do usuário
    padding: 6,
    borderRadius: 15, // Forma de círculo
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'white', // Borda branca para destaque
    borderWidth: 1.5,
  },
  myLocationMarkerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
});

export default LineUpScreen;