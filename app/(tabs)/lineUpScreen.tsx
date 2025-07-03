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
  // REMOVIDO: Animated
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, Region, Callout } from 'react-native-maps';
// REMOVIDO: get
import { ref, onValue } from 'firebase/database';
import { database, administrativoDatabase } from '../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import 'moment/locale/pt-br';
// ADICIONADO: Importação do seu componente de banner
import AdBanner from '../components/AdBanner'; 

// --- Interfaces ---
interface Evento {
  id: string;
  nomeBanda: string;
  horaInicio: string;
  local: string;
  imagemUrl?: string;
  dataMomento: string;
}

// REMOVIDO: Interface BannerItem não é mais necessária
// interface BannerItem { ... }

interface Locais {
  id: string;
  descricao: string;
  latitude?: number;
  longitude?: number;
}

// --- Constantes ---
const { height: screenHeight } = Dimensions.get('window');
const ITEM_PROGRAMACAO_HEIGHT = screenHeight * 0.13;

const LineUpScreen = () => {
  const [programacaoDia, setProgramacaoDia] = useState<Evento[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<Date>(new Date());
  const [mapaVisivel, setMapaVisivel] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: -7.2345,
    longitude: -39.4056,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [eventoSelecionadoNoMapa, setEventoSelecionadoNoMapa] = useState<Evento | null>(null);
  const [dataTitulo, setDataTitulo] = useState('Programação do Dia');
  const [locaisData, setLocaisData] = useState<Locais[]>([]);

  const cratoLocation = { latitude: -7.2345, longitude: -39.4056 };

  // REMOVIDO: Estados e Refs relacionados aos banners
  // const [allBanners, setAllBanners] = useState<string[]>([]);
  // const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  // const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  // const fadeAnim = useRef(new Animated.Value(0)).current;

  // REMOVIDO: Os dois useEffects para buscar e animar os banners.

  // Lógica principal da tela (inalterada)
  useEffect(() => {
    const locaisRef = ref(database, 'locais');
    const unsubscribeLocais = onValue(locaisRef, (snapshot) => {
      const locais: Locais[] = [];
      snapshot.forEach((childSnapshot) => {
        const localData = childSnapshot.val();
        locais.push({
          id: childSnapshot.key!,
          descricao: localData.descricao,
          latitude: localData.latitude,
          longitude: localData.longitude,
        });
      });
      setLocaisData(locais);
    });
    return () => unsubscribeLocais();
  }, []);

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

  return (
    <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
      {/* ADICIONADO: Componente AdBanner */}
      <AdBanner />
      
      {/* REMOVIDO: Antigo View do banner */}

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

          <FlatList
            data={programacaoDia}
            keyExtractor={(item) => item.id}
            renderItem={renderProgramacaoItem}
            ListEmptyComponent={<Text style={styles.mensagemVazio}>Nenhum evento programado para este dia.</Text>}
            contentContainerStyle={styles.programacaoListContent}
          />
        </View>
      </SafeAreaView>

      {mapaVisivel && (
        <View style={styles.mapOuterContainer}>
            <View style={styles.mapContainer}>
                <MapView style={styles.map} initialRegion={mapRegion} region={mapRegion}>
                    {programacaoDia
                        .filter(evento => {
                            const localDoEvento = locaisData.find((local) => local.descricao.toLowerCase().trim() === evento.local.toLowerCase().trim());
                            return localDoEvento && typeof localDoEvento.latitude === 'number' && typeof localDoEvento.longitude === 'number';
                        })
                        .map((evento) => {
                            const localDoEvento = locaisData.find((local) => local.descricao.toLowerCase().trim() === evento.local.toLowerCase().trim())!;
                            const isSelected = eventoSelecionadoNoMapa?.id === evento.id;
                            return (
                            <Marker
                                key={evento.id}
                                coordinate={{ latitude: localDoEvento.latitude!, longitude: localDoEvento.longitude! }}
                                title={evento.nomeBanda}
                                description={`${evento.local} - ${evento.horaInicio}`}
                                pinColor={isSelected ? 'rgba(0, 122, 255, 1)' : 'rgba(255, 59, 48, 1)'}
                                zIndex={isSelected ? 1 : 0}
                            >
                                <Image source={{ uri: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png' }} style={[ styles.markerImageBase, isSelected && styles.selectedMarkerImage ]} resizeMode="contain" />
                                <Callout tooltip={Platform.OS === 'ios'}>
                                <View style={styles.calloutView}><Text style={styles.calloutTitle}>{evento.nomeBanda}</Text><Text style={styles.calloutDescription}>{evento.local}</Text><Text style={styles.calloutDescription}>{evento.horaInicio}</Text></View>
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

// ESTILOS ATUALIZADOS
const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: 'cover' },
  // REMOVIDO: Estilos 'adBanner', 'bannerImage' e 'adBannerText'
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
});

export default LineUpScreen;