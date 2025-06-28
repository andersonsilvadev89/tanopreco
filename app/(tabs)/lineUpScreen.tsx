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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, Region, Callout } from 'react-native-maps';
import { ref, onValue, get } from 'firebase/database';
import { administrativoDatabase } from '../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import 'moment/locale/pt-br';
// REMOVIDO: import { Audio, AVPlaybackStatus, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av'; // Removido por não usar áudio

// --- Interfaces ---
interface Evento {
  id: string;
  nomeBanda: string;
  horaInicio: string;
  local: string;
  imagemUrl?: string;
  dataMomento: string;
}

// Interface para tipar os objetos de banner conforme a estrutura fornecida
interface BannerItem {
  descricao: string;
  id: string;
  imagemUrl: string;
  linkUrl: string;
}

interface Locais {
  id: string;
  descricao: string;
  latitude?: number;
  longitude?: number;
  // REMOVIDO: url?: string | undefined; // Removido por não ser mais para rádio
}

// REMOVIDO: interface Radio { ... } // Removido por não ser mais necessário para rádio

// --- Constantes ---


const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
// REMOVIDO: const radiosListHeight = screenHeight * 0.25; // Removido por não ter lista de rádios
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

  // REMOVIDO: Estados relacionados à rádio
  // const [selectedRadio, setSelectedRadio] = useState<Locais | null>(null);
  // const soundRef = useRef<Audio.Sound | null>(null);
  // const [isPlaying, setIsPlaying] = useState(false);
  // const [isLoadingRadio, setIsLoadingRadio] = useState(false);
  // const [radioError, setRadioError] = useState<string | null>(null);

  const cratoLocation = { latitude: -7.2345, longitude: -39.4056 };

  const [allBanners, setAllBanners] = useState<string[]>([]);
    const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  
    // Valor animado para a opacidade do banner
    const fadeAnim = useRef(new Animated.Value(0)).current; // Começa invisível (opacidade 0)
  
    useEffect(() => {
      const fetchBanners = async () => {
        try {
          // Usando administrativoDatabase conforme seu código anterior
          const sponsorsRef = ref(administrativoDatabase, 'patrocinadores');
          
          const snapshot = await get(sponsorsRef);
  
          if (snapshot.exists()) {
            const sponsorsData = snapshot.val();
            const bannersList: string[] = [];
  
            for (const sponsorId in sponsorsData) {
              const sponsor = sponsorsData[sponsorId];
              if (sponsor && sponsor.banners && Array.isArray(sponsor.banners)) {
                const sponsorBannersArray: BannerItem[] = sponsor.banners;
                sponsorBannersArray.forEach(bannerObject => {
                  if (typeof bannerObject === 'object' && bannerObject !== null && typeof bannerObject.imagemUrl === 'string') {
                    bannersList.push(bannerObject.imagemUrl);
                  }
                });
              }
            }
  
            if (bannersList.length > 0) {
              setAllBanners(bannersList);
              setCurrentBannerUrl(bannersList[0]);
              setCurrentBannerIndex(0);
              // Animação de Fade-in para o primeiro banner
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200, // Duração do fade-in
                useNativeDriver: true, // Importante para performance
              }).start();
            } else {
              console.log('Nenhum banner de patrocinador encontrado com a estrutura esperada.');
              setCurrentBannerUrl(null);
              fadeAnim.setValue(0); // Garante que a opacidade seja 0 se não houver banners
            }
          } else {
            // Ajuste na mensagem de log para refletir o caminho usado
            console.log('Nó "patrocinadores" não encontrado em administrativoDatabase.');
            setCurrentBannerUrl(null);
            fadeAnim.setValue(0);
          }
        } catch (error) {
          console.error('Erro ao buscar banners dos patrocinadores:', error);
          Alert.alert("Erro", "Não foi possível carregar os banners dos patrocinadores.");
          setCurrentBannerUrl(null);
          fadeAnim.setValue(0);
        }
      };
    
      fetchBanners();
    }, [fadeAnim]); // fadeAnim adicionado como dependência, pois é usado no efeito
  
    useEffect(() => {
      let intervalId: ReturnType<typeof setInterval> | null = null;
      
      if (allBanners.length > 1) {
        intervalId = setInterval(() => {
          Animated.timing(fadeAnim, { // 1. Fade-out do banner atual
            toValue: 0,
            duration: 200, // Duração do fade-out
            useNativeDriver: true,
          }).start(() => {
            // 2. Atualiza o banner APÓS o fade-out
            setCurrentBannerIndex(prevIndex => {
              const nextIndex = (prevIndex + 1) % allBanners.length;
              setCurrentBannerUrl(allBanners[nextIndex]); // Define a URL para o próximo banner
              
              // 3. Fade-in do novo banner
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200, // Duração do fade-in
                useNativeDriver: true,
              }).start();
              
              return nextIndex; // Retorna o novo índice
            });
          });
        }, 6000); // Tempo entre o início de cada transição
      }
  
      return () => { // Limpa o intervalo quando o componente é desmontado ou allBanners muda
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }, [allBanners, fadeAnim]);

  // REMOVIDO: useEffect para configuração do modo de áudio
  // useEffect(() => {
  //   Audio.setAudioModeAsync({
  //     allowsRecordingIOS: false,
  //     staysActiveInBackground: true,
  //     interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  //     playsInSilentModeIOS: true,
  //     shouldDuckAndroid: true,
  //     interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
  //     playThroughEarpieceAndroid: false,
  //   }).catch(e => console.error("Erro ao configurar modo de áudio:", e));

  //   return () => {
  //     soundRef.current?.unloadAsync().catch(e => console.warn("Erro ao descarregar som no desmonte:", e));
  //   };
  // }, []);

  // MANTIDO: useEffect para carregar locais (pois são usados no mapa), mas sem o 'url'
  useEffect(() => {
    const locaisRef = ref(administrativoDatabase, 'locais');
    const unsubscribeLocais = onValue(locaisRef, (snapshot) => {
      const locais: Locais[] = [];
      snapshot.forEach((childSnapshot) => {
        const localData = childSnapshot.val();
        locais.push({
          id: childSnapshot.key!,
          descricao: localData.descricao,
          latitude: localData.latitude,
          longitude: localData.longitude,
          // url não é mais necessário aqui
        });
      });
      setLocaisData(locais);
    });
    return () => unsubscribeLocais();
  }, []);

  useEffect(() => {
    const lineupRef = ref(administrativoDatabase, 'lineup');
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

  // REMOVIDO: Funções relacionadas à reprodução de áudio
  // const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => { ... };
  // const stopAndUnloadRadio = useCallback(async () => { ... }, []);
  // const playRadio = useCallback(async (radio: Locais) => { ... }, [...]);
  // const togglePlayPauseCurrentRadio = useCallback(async () => { ... }, [...]);


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
    const handlePressVerNoMapa = () => { // Renomeado para clareza, mas poderia ser a mesma visualizarNoMapa
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
          // O TouchableOpacity wrapper não terá mais onPress aqui
        <View style={styles.programacaoItemSemImagem}>
          <Text style={styles.nomeEventoSemImagem}>{item.nomeBanda}</Text>
          <Text style={styles.detalhesEventoSemImagem}>{moment(item.dataMomento, 'DD-MM-YYYY').format('dddd, DD/MM')} - {item.horaInicio}</Text>
            {/* Botão "Ver no Mapa" Adicionado Aqui, abaixo da data/hora */}
          <TouchableOpacity onPress={handlePressVerNoMapa} style={[styles.verNoMapaButtonBase, styles.verNoMapaButtonSemImagem]}>
            <Feather name="map-pin" size={14} color="#007bff" />
            <Text style={[styles.verNoMapaButtonTextBase, styles.verNoMapaButtonTextSemImagem]}>Ver no Mapa</Text>
          </TouchableOpacity>
          <Text style={styles.detalhesEventoSemImagemLocal}>{item.local}</Text> {/* Estilo separado para o local */}
        </View>
      );
    }
  };

  // REMOVIDO: Componente de renderização de item da rádio
  // const renderRadioItem = ({ item }: { item: Locais }) => ( ... );

  return (
    <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
    <View style={styles.adBanner}>
          {currentBannerUrl ? (
            <Animated.Image // Usando Animated.Image
              source={{ uri: currentBannerUrl }}
              style={[
                styles.bannerImage,
                { opacity: fadeAnim } // Aplicando a opacidade animada
              ]}
              resizeMode="contain"
              onError={(e) => console.warn("Erro ao carregar imagem do banner:", e.nativeEvent.error)}
            />
          ) : (
            // O texto de fallback não precisa ser animado da mesma forma,
            // mas podemos envolvê-lo se quisermos um fade para ele também.
            // Por ora, ele aparece quando não há currentBannerUrl e fadeAnim está em 0.
            <Text style={styles.adBannerText}>Espaço para Patrocínios</Text>
          )}
        </View>
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
          
          {/* REMOVIDO: Seção de Rádios */}
          {/*
          <View style={[styles.radiosSectionContainer, { height: radiosListHeight }]}>
            <View style={styles.radioTitleContainer}>
                <Text style={styles.radioTitulo}>Ouça o que está acontecendo agora!</Text>
            </View>
            <View style={styles.radioTitleContainerPlayer}>
                {selectedRadio && (
                  <View style={styles.playerArea}>
                  <Text style={styles.playerCurrentRadio} numberOfLines={1}>
                    {isPlaying ? 'Tocando: ' : (isLoadingRadio ? 'Carregando: ' : 'Pausado: ')}{selectedRadio.descricao}
                  </Text>
                    {radioError && <Text style={styles.playerErrorText}>{radioError}</Text>}
                  </View>
                )}
                <TouchableOpacity 
                    onPress={togglePlayPauseCurrentRadio} 
                    style={styles.playerButton} 
                    disabled={!selectedRadio && isLoadingRadio}
                >
                  {isLoadingRadio ? (
                    <ActivityIndicator size={Platform.OS === "ios" ? "small" : "large"} color="#FFFFFF" />
                  ) : isPlaying ? (
                    <Feather name="pause-circle" size={40} color="#FFFFFF" />
                  ) : (
                    <Feather name="play-circle" size={40} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
            </View>
            
            <FlatList
              data={locaisData}
              keyExtractor={(item) => item.id}
              renderItem={renderRadioItem}
              style={styles.radiosList}
              contentContainerStyle={styles.radiosListContent}
            />
          </View>
          */}
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

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: 'cover' },
  adBanner: {
    height: 60,
    backgroundColor: 'rgba(220,220,220,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
    marginBottom: 8, // Espaço para o botão abaixo
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
  detalhesEventoSemImagem: { // Para data e hora
    fontSize: 14,
    color: '#555',
    marginBottom: 8, 
  },
  detalhesEventoSemImagemLocal: { // Novo estilo para o local, para que o botão fique entre data e local
    fontSize: 14,
    color: '#555',
    marginTop: 8,
  },

  // --- ESTILOS NOVOS PARA O BOTÃO "VER NO MAPA" ---
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
  // Específico para item COM imagem (dentro do LinearGradient)
  verNoMapaButtonComImagem: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Branco translúcido para bom contraste no gradiente
    // Alternativa: backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  verNoMapaButtonTextComImagem: {
    color: '#FFFFFF',
  },
  // Específico para item SEM imagem (fundo claro)
  verNoMapaButtonSemImagem: {
    backgroundColor: 'rgba(0, 123, 255, 0.1)', 
  },
  verNoMapaButtonTextSemImagem: {
    color: '#007bff', // Texto azul
  },
  // --- FIM DOS ESTILOS NOVOS ---

  mensagemVazio: { textAlign: 'center', color: 'rgba(255,255,255,0.9)', marginTop: 30, fontSize: 17, fontWeight: '500' },
  mapOuterContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  mapContainer: { width: '90%', height: '70%', borderRadius: 15, overflow: 'hidden', backgroundColor: 'white', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 5 },
  map: { ...StyleSheet.absoluteFillObject },
  fecharMapa: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 8, borderRadius: 20, elevation: 6, zIndex:1 },
  
  // REMOVIDO: Estilos da seção de rádios
  // radiosSectionContainer: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 12, paddingTop: 5, marginTop: 5, paddingBottom: 5, },
  // radioTitleContainer: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   marginBottom: 5,
  //   marginHorizontal: 15,
  // },
  // radioTitleContainerPlayer: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  //   marginBottom: 5,
  //   marginHorizontal: 15,
  // },
  // radioTitulo: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  // radioTitleLoadingIndicator: {
  //   marginLeft: 10,
  // },
  // playerArea: { alignItems: 'center', marginBottom: 5, borderBottomColor: 'rgba(255,255,255,0.2)', },
  // playerCurrentRadio: { fontSize: 15, color: '#E0E0E0', fontStyle: 'italic', textAlign: 'center' },
  // playerButton: {},
  // playerErrorText: { color: '#FF8A80', fontSize: 13, textAlign: 'center', marginTop: 5, paddingHorizontal:10 },
  // radiosList: { flexGrow: 0 }, 
  // radioItem: { backgroundColor: 'rgba(255, 255, 255, 0.88)', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, marginBottom: 8, marginHorizontal: 10},
  // radioItemContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  // radioItemSelected: { backgroundColor: 'rgba(200, 230, 255, 0.95)', borderColor: '#007bff', borderWidth: 1.5 },
  // radioNome: { fontSize: 15, color: '#2c3e50', fontWeight: '500', textAlign: 'center' }, 
  // radioNomePlaying: { fontWeight: 'bold', color: '#27ae60' },
  // radioActivityIndicator: { marginLeft: 10 },
  // radioPlayingIndicator: { marginLeft: 10 },
  // radiosListContent: { paddingBottom: 5 },

  markerImageBase: { width: 28, height: 28 },
  selectedMarkerImage: { width: 38, height: 38 },
  calloutView: { width: 200, padding: 12, backgroundColor: 'white', borderRadius: 10, borderColor: '#ddd', borderWidth: 0.5, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5 },
  calloutTitle: { fontWeight: 'bold', fontSize: 15, color: '#333', marginBottom: 4 },
  calloutDescription: { fontSize: 13, color: '#555', marginBottom: 2 },
});

export default LineUpScreen;
