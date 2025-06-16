import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ImageBackground, FlatList, TouchableOpacity, Dimensions, Linking, Platform, Image, Alert, TextInput, SafeAreaView, InteractionManager, Animated, } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { ref, onValue, get, update } from 'firebase/database'; // <<< ALTERAÇÃO: Adicionado 'update'
import { auth, database, administrativoDatabase } from '../../firebaseConfig';
import * as Location from 'expo-location';
import { LocationSubscription, PermissionStatus } from 'expo-location';
import * as TaskManager from 'expo-task-manager'; // <<< ALTERAÇÃO: Importado TaskManager
import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import 'moment/locale/pt-br';


// <<< ALTERAÇÃO: DEFINIÇÃO DA TAREFA DE BACKGROUND (FORA DO COMPONENTE) >>>
const BACKGROUND_LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('TaskManager Error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    const userId = auth.currentUser?.uid;

    if (location && userId) {
      console.log('[Background] Localização recebida:', location.coords);
      const userLocationRef = ref(database, `localizacoes/${userId}`);
      
      // Prepara os dados para atualização no Firebase
      // Esta tarefa é "burra", ela apenas envia a localização.
      // A lógica de 'compartilhando' e 'nome' deve ser mantida no DB.
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      };
      
      try {
        await update(userLocationRef, locationData);
        console.log('[Background] Localização atualizada no Firebase.');
      } catch (dbError) {
        console.error('[Background] Erro ao atualizar Firebase:', dbError);
      }
    }
  }
});
// <<< FIM DA ALTERAÇÃO >>>


// --- Interfaces --- (sem alterações)
interface Localizacao {
  latitude: number;
  longitude: number;
  nome: string;
  id: string;
}
interface Amigo {
  id: string;
  nome: string;
  telefone?: string;
  imagem?: string;
}
interface EventoFirebase { id: string; nomeBanda: string; horaInicio: string; local: string; imagemUrl?: string; dataMomento: string; duracao: string; }
interface LocalInfoFirebase { id: string; descricao: string; latitude: number; longitude: number; }
interface EventoProcessado extends EventoFirebase { coordenadas: { latitude: number; longitude: number }; startTime: moment.Moment; endTime: moment.Moment; janelaStartTime: moment.Moment; janelaEndTime: moment.Moment; }
interface BannerItem {
  descricao: string;
  id: string;
  imagemUrl: string;
  linkUrl: string;
}

const { height: screenHeight } = Dimensions.get('window');

const AmigoItem = React.memo(({ item, isSelected, amigoLocal, handleAmigoPress }: {
  item: Amigo;
  isSelected: boolean;
  amigoLocal: Localizacao | undefined;
  handleAmigoPress: (amigoId: string, amigoLocal: Localizacao | undefined) => void;
}) => {
  return (
    <TouchableOpacity
      style={[styles.amigoItem, isSelected && styles.amigoItemSelected]}
      onPress={() => handleAmigoPress(item.id, amigoLocal)}
      disabled={!amigoLocal && !isSelected}
    >
      {item.imagem ? (
        <Image source={{ uri: item.imagem }} style={styles.amigoFoto} />
      ) : (
        <View style={styles.amigoFotoPlaceholder}>
          <Text style={styles.amigoFotoPlaceholderText}>
            {item.nome ? item.nome.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
      )}
      <View style={styles.amigoInfo}>
        <Text style={styles.amigoNome} numberOfLines={1}>{item.nome}</Text>
        <Text style={styles.amigoNome} numberOfLines={1}>{item.telefone}</Text>
        {!amigoLocal && <Text style={styles.amigoOffline}>Offline</Text>}
      </View>
    </TouchableOpacity>
  );
});

const MapaAmigosScreen = () => {
  const [compartilhando, setCompartilhando] = useState<boolean | null>(null);
  const [amigosLocalizacao, setAmigosLocalizacao] = useState<Localizacao[]>([]);
  const [minhaLocalizacao, setMinhaLocalizacao] = useState<Localizacao | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [loadingAmigosLoc, setLoadingAmigosLoc] = useState(false);
  const [amigosLista, setAmigosLista] = useState<Amigo[]>([]);
  const [selectedAmigoId, setSelectedAmigoId] = useState<string | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<PermissionStatus | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: -7.2291, longitude: -39.4126,
    latitudeDelta: 0.1, longitudeDelta: 0.1,
  });
  const [termoBusca, setTermoBusca] = useState('');
  const [amigosListaFiltrada, setAmigosListaFiltrada] = useState<Amigo[]>([]);
  const [eventosDoDiaProcessados, setEventosDoDiaProcessados] = useState<EventoProcessado[]>([]);
  const [podeRastrearAmigos, setPodeRastrearAmigos] = useState(false);
  const [currentTimeTick, setCurrentTimeTick] = useState(0);

  const usuarioLogadoId = auth.currentUser?.uid;
  const locationSubscriptionRef = useRef<LocationSubscription | null>(null);

  const parseDuracao = useCallback((duracaoStr: string): moment.Duration => {
    let totalMinutos = 0;
    const horasMatch = duracaoStr.match(/(\d+)\s*hora(s?)/i);
    const minutosMatch = duracaoStr.match(/(\d+)\s*minuto(s?)/i);
    if (horasMatch) totalMinutos += parseInt(horasMatch[1], 10) * 60;
    if (minutosMatch) totalMinutos += parseInt(minutosMatch[1], 10);
    return moment.duration(totalMinutos, 'minutes');
  }, []);

  const calcularDistancia = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c;
  }, []);

  // --- Lógica de Banners (sem alterações) ---
  const [allBanners, setAllBanners] = useState<string[]>([]);
    const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const fetchBanners = async () => {
        try {
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
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }).start();
            } else {
              setCurrentBannerUrl(null);
              fadeAnim.setValue(0);
            }
          } else {
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
    }, [fadeAnim]);
    useEffect(() => {
      let intervalId: ReturnType<typeof setInterval> | null = null;
      if (allBanners.length > 1) {
        intervalId = setInterval(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setCurrentBannerIndex(prevIndex => {
              const nextIndex = (prevIndex + 1) % allBanners.length;
              setCurrentBannerUrl(allBanners[nextIndex]);
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }).start();
              return nextIndex;
            });
          });
        }, 6000);
      }
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }, [allBanners, fadeAnim]);


  useEffect(() => {
    const intervalId = setInterval(() => { setCurrentTimeTick(prev => prev + 1); }, 60000);
    return () => clearInterval(intervalId);
  }, []);
  
  // <<< ALTERAÇÃO: LÓGICA DE SOLICITAÇÃO DE PERMISSÃO ATUALIZADA >>>
  useEffect(() => {
    if (!usuarioLogadoId) {
      setLoadingStatus(false);
      setCompartilhando(false);
      setLocationPermissionStatus(null);
      return;
    }
  
    let isMounted = true;
    setLoadingStatus(true);
  
    const statusRef = ref(database, `usuarios/${usuarioLogadoId}/compartilhando`);
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      if (isMounted) {
        const isSharing = snapshot.val() === true;
        setCompartilhando(isSharing);
      }
    });
  
    const requestPermissions = async () => {
      // 1. Pede permissão de primeiro plano (Foreground)
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (isMounted) {
        setLocationPermissionStatus(foregroundStatus);
  
        // 2. Se concedida, pede a de segundo plano (Background)
        if (foregroundStatus === 'granted') {
          const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
          if (backgroundStatus !== 'granted') {
            // Opcional: Avisar o usuário sobre a importância da permissão de background
            Alert.alert(
              "Permissão Adicional Necessária",
              "Para uma melhor experiência e para que seus amigos o encontrem mesmo com o app fechado, por favor, escolha a opção 'Permitir o tempo todo' para a localização.",
              [{ text: "Entendi" }]
            );
          }
        }
        setLoadingStatus(false); // Finaliza o loading após as permissões
      }
    };
  
    requestPermissions();
  
    return () => {
      isMounted = false;
      unsubscribeStatus();
    };
  }, [usuarioLogadoId]);


  useEffect(() => {
    if (!usuarioLogadoId) { setAmigosLista([]); return; }
    const amigosRef = ref(database, `amigos/${usuarioLogadoId}`);
    const unsubscribeAmigos = onValue(amigosRef, async (snapshot) => {
        const amigosData = snapshot.val();
        const amigosIdsAceitos = amigosData ? Object.keys(amigosData).filter(key => amigosData[key] === 'aceito') : [];
        if (amigosIdsAceitos.length === 0) { setAmigosLista([]); return; }
        const amigosPromises = amigosIdsAceitos.map(async (amigoId) => {
            const uRef = ref(database, `usuarios/${amigoId}`);
            const uSnap = await get(uRef);
            const uData = uSnap.val();
            return uData?.nome ? { id: amigoId, nome: uData.nome, telefone: uData.telefone, imagem: uData.imagem } : null;
        });
        const amigosCarregados = (await Promise.all(amigosPromises)).filter(Boolean) as Amigo[];
        setAmigosLista(amigosCarregados);
    });
    return () => unsubscribeAmigos();
  }, [usuarioLogadoId]);

  useEffect(() => {
    if (termoBusca.trim() === '') setAmigosListaFiltrada(amigosLista);
    else {
      const tl = termoBusca.toLowerCase();
      setAmigosListaFiltrada(amigosLista.filter(a => a.nome.toLowerCase().includes(tl) || (a.telefone && a.telefone.includes(tl))));
    }
  }, [termoBusca, amigosLista]);

  const carregarDadosDoDia = useCallback(async () => {
    if (!usuarioLogadoId) { setLoadingEventos(false); return;}
    setLoadingEventos(true);
    const locaisRef = ref(administrativoDatabase, "locais");
    const lineupRef = ref(administrativoDatabase, "lineup");
    try {
      const [locaisSnapshot, lineupSnapshot] = await Promise.all([get(locaisRef), get(lineupRef)]);
      const todosLocais: LocalInfoFirebase[] = [];
      if (locaisSnapshot.exists()) {
        locaisSnapshot.forEach(child => { todosLocais.push({ id: child.key!, ...child.val() }); });
      }
      const todosEventos: EventoFirebase[] = [];
      if (lineupSnapshot.exists()) {
        lineupSnapshot.forEach(child => { todosEventos.push({ id: child.key!, ...child.val() }); });
      }
      const hojeFormatado = moment().format('DD/MM/YYYY');
      const eventosDeHojeFiltrados = todosEventos
        .filter(evento => evento.dataMomento === hojeFormatado)
        .map(evento => {
          const localInfo = todosLocais.find(l => l.descricao.toLowerCase() === evento.local.toLowerCase());
          if (localInfo && typeof localInfo.latitude === 'number' && typeof localInfo.longitude === 'number') {
            const startTime = moment(`${evento.dataMomento} ${evento.horaInicio}`, 'DD/MM/YYYY HH:mm');
            const duracao = parseDuracao(evento.duracao);
            const endTime = startTime.clone().add(duracao);
            return {
              ...evento,
              coordenadas: { latitude: localInfo.latitude, longitude: localInfo.longitude },
              startTime, endTime,
              janelaStartTime: startTime.clone().subtract(1, 'hour'),
              janelaEndTime: endTime.clone().add(1, 'hour'),
            };
          }
          return null;
        }).filter(Boolean) as EventoProcessado[];
      setEventosDoDiaProcessados(eventosDeHojeFiltrados.sort((a,b) => a.startTime.diff(b.startTime)));
    } catch (error) {
      console.error("Erro ao carregar dados de eventos/locais:", error);
      setEventosDoDiaProcessados([]);
    } finally {
      setLoadingEventos(false);
    }
  }, [usuarioLogadoId, parseDuracao]);

  useFocusEffect(
    useCallback(() => {
      if (!usuarioLogadoId) return;
      const task = InteractionManager.runAfterInteractions(() => {
        setTermoBusca('');
        carregarDadosDoDia();
      });
      return () => {
        task.cancel();
      };
    }, [usuarioLogadoId, carregarDadosDoDia])
  );

  useEffect(() => {
    if (loadingStatus || loadingEventos) {
        setPodeRastrearAmigos(false);
        return;
    }
    if (!compartilhando || !minhaLocalizacao || eventosDoDiaProcessados.length === 0) {
      setPodeRastrearAmigos(false);
      return;
    }
    const agora = moment();
    let condicaoAtendidaParaAlgumEvento = false;
    for (const evento of eventosDoDiaProcessados) {
      if (agora.isBetween(evento.janelaStartTime, evento.janelaEndTime)) {
        if (evento.coordenadas) {
            const distancia = calcularDistancia(
            minhaLocalizacao.latitude, minhaLocalizacao.longitude,
            evento.coordenadas.latitude, evento.coordenadas.longitude
            );
            if (distancia <= 3) {
            condicaoAtendidaParaAlgumEvento = true;
            break;
            }
        }
      }
    }
    setPodeRastrearAmigos(condicaoAtendidaParaAlgumEvento);
  }, [compartilhando, minhaLocalizacao, eventosDoDiaProcessados, currentTimeTick, loadingStatus, loadingEventos, calcularDistancia]);

  useEffect(() => {
    if (!usuarioLogadoId || !podeRastrearAmigos) {
      setAmigosLocalizacao([]);
      setLoadingAmigosLoc(false);
      return () => {};
    }
    setLoadingAmigosLoc(true);
    const amigosRef = ref(database, `amigos/${usuarioLogadoId}`);
    let activeLocationListeners: (() => void)[] = [];
    const unsubscribePrincipal = onValue(amigosRef, (snapshotAmigos) => {
        activeLocationListeners.forEach(unsub => unsub());
        activeLocationListeners = [];
        const amigosData = snapshotAmigos.val();
        const amigosIdsConfirmados = amigosData ? Object.keys(amigosData).filter(key => amigosData[key] === 'aceito') : [];
        if (amigosIdsConfirmados.length === 0) {
            setAmigosLocalizacao([]);
            setLoadingAmigosLoc(false);
            return;
        }
        let initialLocations: Localizacao[] = [];
        const initialLoadPromises = amigosIdsConfirmados.map(amigoId => {
            const locRef = ref(database, `localizacoes/${amigoId}`);
            return get(locRef).then(snapLoc => {
                const dataLoc = snapLoc.val();
                if (dataLoc?.compartilhando && dataLoc.latitude && dataLoc.longitude && dataLoc.nome) {
                    initialLocations.push({id: amigoId, nome: dataLoc.nome, latitude: dataLoc.latitude, longitude: dataLoc.longitude });
                }
            });
        });
        Promise.all(initialLoadPromises)
        .then(() => {
            setAmigosLocalizacao([...initialLocations]);
            setLoadingAmigosLoc(false);
            amigosIdsConfirmados.forEach((amigoId) => {
                const locRef = ref(database, `localizacoes/${amigoId}`);
                const unsubLoc = onValue(locRef, (snapLoc) => {
                    const dataLoc = snapLoc.val();
                    setAmigosLocalizacao(prevLocs => {
                        const newLocs = prevLocs.filter(l => l.id !== amigoId);
                        if (dataLoc?.compartilhando && dataLoc.latitude && dataLoc.longitude && dataLoc.nome) {
                            newLocs.push({ id: amigoId, nome: dataLoc.nome, latitude: dataLoc.latitude, longitude: dataLoc.longitude });
                        }
                        return newLocs;
                    });
                });
                activeLocationListeners.push(unsubLoc);
            });
        })
        .catch(() => setLoadingAmigosLoc(false));
    });
    return () => { unsubscribePrincipal(); activeLocationListeners.forEach(unsub => unsub()); };
  }, [usuarioLogadoId, podeRastrearAmigos]);


  // <<< ALTERAÇÃO: NOVO useEffect PARA GERENCIAR A TAREFA DE BACKGROUND >>>
  useEffect(() => {
    const manageBackgroundTask = async () => {
        if (!usuarioLogadoId || compartilhando === null) return;

        const isTaskRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);

        try {
            if (compartilhando && !isTaskRunning) {
                // Inicia a tarefa de background
                await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 60000, // 1 minuto
                    distanceInterval: 50, // 50 metros
                    showsBackgroundLocationIndicator: true,
                    foregroundService: {
                        notificationTitle: 'Compartilhamento Ativo',
                        notificationBody: 'Sua localização está sendo compartilhada com seus amigos.',
                        notificationColor: '#007BFF',
                    },
                });
                console.log('Tarefa de localização em background iniciada.');
            } else if (!compartilhando && isTaskRunning) {
                // Para a tarefa de background
                await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
                console.log('Tarefa de localização em background parada.');
            }
        } catch (error) {
            console.error("Erro ao gerenciar a tarefa de background:", error);
        }
    };

    manageBackgroundTask();
  }, [compartilhando, usuarioLogadoId]);


  // <<< ALTERAÇÃO: useEffect de RASTREAMENTO EM PRIMEIRO PLANO (para UI) >>>
  // Este hook agora serve para atualizar a UI (marcador 'EU' e centralização do mapa) em tempo real quando o app está aberto.
  useEffect(() => {
    const manageForegroundTracking = async () => {
      // Remove a inscrição anterior para evitar duplicatas
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
  
      // Se não estiver compartilhando ou não tiver permissão, para tudo.
      if (compartilhando !== true || locationPermissionStatus !== PermissionStatus.GRANTED) {
        setMinhaLocalizacao(null);
        return;
      }
  
      // Inicia o watchPositionAsync para atualizações em tempo real na UI
      try {
        locationSubscriptionRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 20 },
          (location) => {
            if (!usuarioLogadoId) return;
  
            const newMinhaLocalizacao: Localizacao = {
              id: usuarioLogadoId,
              nome: 'Você',
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            setMinhaLocalizacao(newMinhaLocalizacao);
  
            // Centraliza o mapa no usuário apenas se nenhum amigo estiver selecionado
            if (!selectedAmigoId) {
              const isInitialRegion = mapRegion.latitude === -7.2291;
              setMapRegion(prevRegion => ({
                latitude: newMinhaLocalizacao.latitude,
                longitude: newMinhaLocalizacao.longitude,
                latitudeDelta: isInitialRegion ? 0.02 : (prevRegion?.latitudeDelta || 0.02),
                longitudeDelta: isInitialRegion ? 0.02 : (prevRegion?.longitudeDelta || 0.02),
              }));
            }
          }
        );
      } catch (error) {
        console.error("Erro ao iniciar watchPositionAsync (foreground):", error);
        Alert.alert("Erro de Localização", "Não foi possível obter sua localização em tempo real.");
        setMinhaLocalizacao(null);
      }
    };
  
    manageForegroundTracking();
  
    // Função de limpeza para parar o rastreamento quando o componente/efeito for desmontado
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
  }, [compartilhando, usuarioLogadoId, locationPermissionStatus, selectedAmigoId]); // Adicionado locationPermissionStatus como dependência

  const handleBuscaAmigos = (texto: string) => { setTermoBusca(texto); };

  const handleAmigoPress = (amigoId: string, amigoLocal: Localizacao | undefined) => {
    if (amigoLocal) {
      setSelectedAmigoId(amigoId);
      setMapRegion({
        latitude: amigoLocal.latitude, longitude: amigoLocal.longitude,
        latitudeDelta: 0.01, longitudeDelta: 0.01,
      });
    } else {
      setSelectedAmigoId(amigoId);
      Alert.alert("Amigo Offline", "Este amigo não está compartilhando a localização no momento.");
      if (minhaLocalizacao) {
        setMapRegion({
          latitude: minhaLocalizacao.latitude, longitude: minhaLocalizacao.longitude,
          latitudeDelta: 0.02, longitudeDelta: 0.02,
        });
      }
    }
  };

  const openSettings = () => { Linking.openSettings(); };

  const renderAmigoItem = ({ item }: { item: Amigo }) => {
    const isSelected = item.id === selectedAmigoId;
    const amigoLocal = amigosLocalizacao.find(loc => loc.id === item.id);
    return ( <AmigoItem item={item} isSelected={isSelected} amigoLocal={amigoLocal} handleAmigoPress={handleAmigoPress}/> );
  };

  const isLoadingGeral = loadingStatus || loadingEventos;

  // --- Renderização (sem alterações significativas, apenas condicionais atualizadas) ---

  if (isLoadingGeral && usuarioLogadoId) {
    return (
        <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
            <View style={styles.center}><ActivityIndicator size="large" color="#FFFFFF" /><Text style={styles.loadingText}>Carregando...</Text></View>
        </ImageBackground>
    );
  }
  if (!usuarioLogadoId) {
    return (
        <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
            <View style={styles.center}><Text style={styles.warningText}>Usuário não identificado. Por favor, reinicie o aplicativo.</Text></View>
        </ImageBackground>
    );
  }
  if (locationPermissionStatus !== PermissionStatus.GRANTED) {
    return (
        <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
            <View style={styles.center}>
                <Text style={styles.warningText}>A permissão de localização é essencial para o mapa de amigos.</Text>
                <Text style={styles.subWarningText}>Por favor, habilite o acesso nas configurações do seu dispositivo. Compartilhar sua localização permite que você veja seus amigos e que eles também o encontrem.</Text>
                <TouchableOpacity style={styles.settingsButton} onPress={openSettings}><Text style={styles.settingsButtonText}>Ir para Configurações</Text></TouchableOpacity>
            </View>
        </ImageBackground>
    );
  }
  if (compartilhando === false) {
    return (
        <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
            <View style={styles.center}>
                <Text style={styles.warningText}>Para visualizar a localização dos seus amigos e permitir que eles o vejam, ative o compartilhamento da sua localização.</Text>
                <Text style={styles.subWarningText}>Você pode ativar o compartilhamento no seu perfil ou nas configurações do app. Manter o compartilhamento ativo, mesmo com o app em segundo plano, garante uma melhor experiência para todos.</Text>
            </View>
        </ImageBackground>
    );
  }
  if (podeRastrearAmigos && loadingAmigosLoc && amigosLista.length > 0) {
     return (
        <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
            <View style={styles.center}><ActivityIndicator size="large" color="#FFFFFF" /><Text style={styles.loadingText}>Carregando localizações dos amigos...</Text></View>
        </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
      <View style={styles.adBanner}>
              {currentBannerUrl ? (
                <Animated.Image 
                  source={{ uri: currentBannerUrl }}
                  style={[
                    styles.bannerImage,
                    { opacity: fadeAnim } 
                  ]}
                  resizeMode="contain"
                  onError={(e) => console.warn("Erro ao carregar imagem do banner:", e.nativeEvent.error)}
                />
              ) : (
                <Text style={styles.adBannerText}>Espaço para Patrocínios</Text>
              )}
            </View>
      <SafeAreaView style={styles.container}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar amigos na lista..."
          value={termoBusca}
          onChangeText={handleBuscaAmigos}
          placeholderTextColor="#888"
        />
        {amigosLista.length > 0 ? (
          <View style={styles.amigosListContainer}>
            <FlatList
              data={amigosListaFiltrada}
              keyExtractor={(item) => item.id}
              renderItem={renderAmigoItem}
              contentContainerStyle={styles.amigosListContent}
            />
          </View>
        ) : (
          !loadingEventos && (
            <View style={[styles.semAmigosContainer, styles.semAmigosVertical]}>
                <Text style={styles.semAmigosText}>Você ainda não tem amigos.</Text>
                <Text style={styles.semAmigosSubText}>Adicione amigos para vê-los no mapa!</Text>
            </View>
          )
        )}
        <View style={styles.mapContainer}>
          <MapView style={styles.map} region={mapRegion} showsUserLocation={false} >
            {minhaLocalizacao && (
              <Marker coordinate={minhaLocalizacao} title={minhaLocalizacao.nome} zIndex={1} >
                <View style={styles.myLocationMarker}><Text style={styles.myLocationMarkerText}>EU</Text></View>
              </Marker>
            )}
            {podeRastrearAmigos && amigosLocalizacao.map((amigo) => {
                const amigoInfo = amigosLista.find(a => a.id === amigo.id);
                return (
                    <Marker key={amigo.id} coordinate={amigo} title={amigo.nome} >
                        {amigoInfo?.imagem ? ( <Image source={{uri: amigoInfo.imagem}} style={[styles.markerImage, selectedAmigoId === amigo.id && styles.markerImageSelected]} />
                        ) : ( <View style={[styles.markerPlaceholder, selectedAmigoId === amigo.id && styles.markerPlaceholderSelected]}><Text style={styles.markerInitial}>{amigo.nome ? amigo.nome.charAt(0).toUpperCase() : '?'}</Text></View>
                        )}
                    </Marker>
                );
            })}
          </MapView>
          {!podeRastrearAmigos && compartilhando && locationPermissionStatus === PermissionStatus.GRANTED && !loadingEventos && (
            <View style={styles.infoOverlay}><Text style={styles.infoOverlayText}>{eventosDoDiaProcessados.length > 0 ? "O mapa de amigos é ativado automaticamente quando você estiver próximo (até 3km) de um evento do dia e dentro da janela de tempo do evento (1h antes do início até 1h após o fim)." : "Não há eventos programados para hoje. O mapa de amigos será ativado próximo aos horários e locais dos eventos quando houver."}</Text></View>
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

// Estilos (sem alterações)
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
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.5)' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#FFFFFF', textAlign: 'center' },
  warningText: { fontSize: 18, textAlign: 'center', color: '#FFFFFF', marginBottom: 15, fontWeight: 'bold', lineHeight: 24 },
  subWarningText: { fontSize: 15, textAlign: 'center', color: '#f0f0f0', marginBottom: 25, lineHeight: 22 },
  settingsButton: { backgroundColor: '#007BFF', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  settingsButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  searchInput: {
    height: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginHorizontal: 10,
    marginTop: Platform.OS === 'ios' ? 10 : 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  amigosListContainer: {
    maxHeight: screenHeight * 0.35,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  amigosListContent: {
    paddingVertical: 5,
  },
  amigoItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
  },
  amigoItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007BFF',
    borderWidth: 2,
  },
  amigoFoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  amigoFotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#BDBDBD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  amigoFotoPlaceholderText: { fontSize: 22, color: '#FFFFFF', fontWeight: 'bold' },
  amigoInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  amigoNome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'left',
  },
  amigoTelefone: {
    fontSize: 12, color: '#666', marginBottom: 2, textAlign: 'left'
  },
  amigoOffline: {
    fontSize: 12,
    color: '#D32F2F',
    fontStyle: 'italic',
    textAlign: 'left',
    marginTop: 3,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#BDBDBD'
  },
  map: { flex: 1 },
  semAmigosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    borderRadius: 10,
  },
  semAmigosVertical: {
    minHeight: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    marginBottom: 10,
  },
  semAmigosText: { fontSize: 16, color: '#000', textAlign: 'center', marginBottom: 8 },
  semAmigosSubText: { fontSize: 14, color: '#000', textAlign: 'center' },
  myLocationMarker: { backgroundColor: '#007BFF', padding: 6, borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderColor: 'white', borderWidth: 1.5 },
  myLocationMarkerText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
  markerImage: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#4CAF50' },
  markerImageSelected: { borderColor: '#FFC107', transform: [{scale: 1.2}] },
  markerPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  markerPlaceholderSelected: { backgroundColor: '#FFC107', borderColor: 'white', transform: [{scale: 1.2}] },
  markerInitial: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  infoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.75)', paddingVertical: 12, paddingHorizontal: 15, alignItems: 'center', zIndex: 10 },
  infoOverlayText: { color: 'white', textAlign: 'center', fontSize: 14, lineHeight: 20 },
});

export default MapaAmigosScreen;