import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ImageBackground, FlatList, TouchableOpacity, Dimensions, Linking, Platform, Image, Alert, TextInput, SafeAreaView, InteractionManager, AppState } from 'react-native'; 
import MapView, { Marker, Region } from 'react-native-maps';
import { ref, onValue, get, update, set } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import * as Location from 'expo-location';
import { LocationSubscription, PermissionStatus } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import 'moment/locale/pt-br';
import { LinearGradient } from 'expo-linear-gradient';
import AdBanner from '../components/AdBanner';

import { checkAndDownloadImages } from '../../utils/imageManager'; 

const defaultFundoLocal = require('../../assets/images/fundo.png');

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
            const userLocationRef = ref(database, `localizacoes/${userId}`);
            let userName = 'Usuário';
            try {
                const userProfileSnap = await get(ref(database, `usuarios/${userId}`));
                if (userProfileSnap.exists() && userProfileSnap.val().nome) {
                    userName = userProfileSnap.val().nome;
                }
            } catch (e) { /* Console.error já tratado pelo TaskManager */ }

            const userSharingStatusSnap = await get(ref(database, `usuarios/${userId}/compartilhando`));
            const userIntendsToShare = userSharingStatusSnap.exists() ? userSharingStatusSnap.val() === true : false;

            if (userIntendsToShare) { 
                await update(userLocationRef, {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    timestamp: location.timestamp,
                    compartilhando: true, 
                    nome: userName,
                }).catch(dbError => console.error('[Background] Erro ao atualizar Firebase:', dbError));
            } else {
                await set(ref(database, `localizacoes/${userId}`), { compartilhando: false, latitude: null, longitude: null, timestamp: Date.now(), nome: userName });
                 if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)) {
                    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(e => console.warn("Erro ao tentar parar task de background:", e.message));
                 }
            }
        }
    }
});

interface Localizacao { latitude: number; longitude: number; nome: string; id: string; }
interface Amigo { id: string; nome: string; telefone?: string; imagem?: string; instagram?: string; }
interface EventoFirebase { id: string; nomeBanda: string; horaInicio: string; local: string; imagemUrl?: string; dataMomento: string; duracao: string; }
interface LocalInfoFirebase { id: string; descricao: string; latitude: number; longitude: number; }
interface EventoProcessado extends EventoFirebase { coordenadas: { latitude: number; longitude: number }; startTime: moment.Moment; endTime: moment.Moment; janelaStartTime: moment.Moment; janelaEndTime: moment.Moment; }

const { height: screenHeight } = Dimensions.get('window');

const AmigoItem = React.memo(({ item, isSelected, amigoLocal, handleAmigoPress, openInstagramProfile }: {
    item: Amigo;
    isSelected: boolean;
    amigoLocal: Localizacao | undefined;
    handleAmigoPress: (amigoId: string, amigoLocal: Localizacao | undefined) => void;
    openInstagramProfile: (username: string | undefined) => Promise<void>;
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
                <View style={styles.statusAndInstagramContainer}>
                    {!amigoLocal && <Text style={styles.amigoOffline}>Offline</Text>}
                    {item.instagram && (
                        <TouchableOpacity onPress={() => openInstagramProfile(item.instagram)} style={styles.instagramButtonWrapper}>
                            <LinearGradient
                                colors={['#8a3ab9', '#bc2a8d', '#fbad50']}
                                start={{ x: 0.0, y: 1.0 }}
                                end={{ x: 1.0, y: 0.0 }}
                                style={styles.instagramButton}
                            >
                                <Text style={styles.instagramButtonText}>Instagram</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
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
    const [amigosLista, setAmigosLista] = useState<Amigo[]>([]); 
    const [selectedAmigoId, setSelectedAmigoId] = useState<string | null>(null);
    const [locationPermissionStatus, setLocationPermissionStatus] = useState<PermissionStatus | null>(null); 
    const [backgroundLocationPermissionStatus, setBackgroundLocationPermissionStatus] = useState<PermissionStatus | null>(null); 
    const [mapRegion, setMapRegion] = useState<Region>({ latitude: -7.2291, longitude: -39.4126, latitudeDelta: 0.1, longitudeDelta: 0.1 });
    const [termoBusca, setTermoBusca] = useState('');
    const [amigosListaFiltrada, setAmigosListaFiltrada] = useState<Amigo[]>([]);
    const [eventosDoDiaProcessados, setEventosDoDiaProcessados] = useState<EventoProcessado[]>([]);
    const [podeRastrearAmigos, setPodeRastrearAmigos] = useState(false); 
    const [currentTimeTick, setCurrentTimeTick] = useState(0);

    const [fundoAppReady, setFundoAppReady] = useState(false);
    const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

    const usuarioLogadoId = auth.currentUser?.uid;
    const locationSubscriptionRef = useRef<LocationSubscription | null>(null);
    const [appState, setAppState] = useState(AppState.currentState); 

    useEffect(() => {
        const loadFundoImage = async () => {
            try {
                const { fundoUrl } = await checkAndDownloadImages();
                setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
            } catch (error) {
                console.error("Erro ao carregar imagem de fundo na MapaAmigosScreen:", error);
                setCurrentFundoSource(defaultFundoLocal);
            } finally {
                setFundoAppReady(true);
            }
        };
        loadFundoImage();
    }, []);

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

    useEffect(() => {
        const intervalId = setInterval(() => { setCurrentTimeTick(prev => prev + 1); }, 60000);
        return () => clearInterval(intervalId);
    }, []);

    const checkActualLocationPermissions = async () => {
        const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
        const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
        setLocationPermissionStatus(foregroundStatus);
        setBackgroundLocationPermissionStatus(backgroundStatus);
        return foregroundStatus;
    };

    useEffect(() => {
        if (!usuarioLogadoId) {
            setLoadingStatus(false);
            setCompartilhando(false);
            setLocationPermissionStatus(null);
            setBackgroundLocationPermissionStatus(null);
            return;
        }

        let isMounted = true;
        setLoadingStatus(true); 

        const statusRef = ref(database, `usuarios/${usuarioLogadoId}/compartilhando`);
        const unsubscribeStatus = onValue(statusRef, (snapshot) => {
            if (isMounted) {
                const firebaseSharingStatus = snapshot.val() === true;
                setCompartilhando(firebaseSharingStatus);
                checkActualLocationPermissions().then(fgStatus => {
                    if (isMounted) {
                        if (firebaseSharingStatus && fgStatus !== PermissionStatus.GRANTED) {
                            setCompartilhando(false); 
                        }
                        setLoadingStatus(false); 
                    }
                });
            }
        });

        const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
            if (appState.match(/inactive|background/) && nextAppState === 'active') {
                const fgStatus = await checkActualLocationPermissions(); 
                if (usuarioLogadoId) {
                    const currentSharingState = (await get(statusRef)).val() === true;
                    setCompartilhando(currentSharingState && fgStatus === PermissionStatus.GRANTED);
                }
            }
            setAppState(nextAppState);
        });

        checkActualLocationPermissions(); 

        return () => { 
            isMounted = false; 
            unsubscribeStatus(); 
            appStateSubscription.remove(); 
        };
    }, [usuarioLogadoId, appState]);

    const shouldShowFriendLocation = useCallback((amigoLoc: Localizacao, eventos: EventoProcessado[]): boolean => {
        if (!amigoLoc || !amigoLoc.latitude || !amigoLoc.longitude) return false;
        const agora = moment();
        for (const evento of eventos) {
            if (agora.isBetween(evento.janelaStartTime, evento.janelaEndTime)) {
                if (evento.coordenadas) {
                    const distancia = calcularDistancia(amigoLoc.latitude, amigoLoc.longitude, evento.coordenadas.latitude, evento.coordenadas.longitude);
                    if (distancia <= 3) {
                        return true; 
                    }
                }
            }
        }
        return false; 
    }, [calcularDistancia]);


    useEffect(() => {
        if (!usuarioLogadoId) { setAmigosLista([]); return; }
        const amigosRef = ref(database, `amigos/${usuarioLogadoId}`);
        
        let activeLocationListeners: (() => void)[] = []; 

        const unsubscribeAmigos = onValue(amigosRef, (snapshotAmigos) => {
            activeLocationListeners.forEach(unsub => unsub());
            activeLocationListeners = []; 

            const amigosData = snapshotAmigos.val();
            const amigosIdsAceitos = amigosData ? Object.keys(amigosData).filter(key => amigosData[key] === 'aceito') : [];
            if (amigosIdsAceitos.length === 0) { setAmigosLista([]); setAmigosLocalizacao([]); return; }

            const amigosPromises = amigosIdsAceitos.map(async (amigoId) => {
                const uRef = ref(database, `usuarios/${amigoId}`);
                const uSnap = await get(uRef);
                const uData = uSnap.val();
                return uData?.nome ? { id: amigoId, nome: uData.nome, telefone: uData.telefone, imagem: uData.imagem, instagram: uData.instagram } : null;
            });
            Promise.all(amigosPromises).then(amigosCarregados => {
                setAmigosLista(amigosCarregados.filter(Boolean) as Amigo[]);

                let initialLocations: Localizacao[] = [];
                const initialLoadPromises = amigosIdsAceitos.map(amigoId => {
                    const locRef = ref(database, `localizacoes/${amigoId}`);
                    return get(locRef).then(snapLoc => {
                        const dataLoc = snapLoc.val();
                        if (dataLoc?.compartilhando && dataLoc.latitude && dataLoc.longitude && dataLoc.nome && shouldShowFriendLocation({id: amigoId, ...dataLoc}, eventosDoDiaProcessados)) {
                            initialLocations.push({id: amigoId, nome: dataLoc.nome, latitude: dataLoc.latitude, longitude: dataLoc.longitude });
                        }
                    });
                });
                Promise.all(initialLoadPromises)
                    .then(() => {
                        setAmigosLocalizacao([...initialLocations]);
                        amigosIdsAceitos.forEach((amigoId) => {
                            const locRef = ref(database, `localizacoes/${amigoId}`);
                            const unsubLoc = onValue(locRef, (snapLoc) => {
                                const dataLoc = snapLoc.val();
                                setAmigosLocalizacao(prevLocs => {
                                    const newLocs = prevLocs.filter(l => l.id !== amigoId);
                                    if (dataLoc?.compartilhando && dataLoc.latitude && dataLoc.longitude && dataLoc.nome && shouldShowFriendLocation({id: amigoId, ...dataLoc}, eventosDoDiaProcessados)) {
                                        newLocs.push({ id: amigoId, nome: dataLoc.nome, latitude: dataLoc.latitude, longitude: dataLoc.longitude });
                                    }
                                    return newLocs;
                                });
                            });
                            activeLocationListeners.push(unsubLoc);
                        });
                    })
                    .catch((error) => console.error("Erro ao carregar localizações iniciais dos amigos:", error)); 
            }).catch((error) => console.error("Erro ao carregar lista de amigos:", error)); 
        });
        return () => { unsubscribeAmigos(); activeLocationListeners.forEach(unsub => unsub()); };
    }, [usuarioLogadoId, eventosDoDiaProcessados, shouldShowFriendLocation]);

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
        const locaisRef = ref(database, "locais");
        const lineupRef = ref(database, "lineup");
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
                        return { ...evento, coordenadas: { latitude: localInfo.latitude, longitude: localInfo.longitude }, startTime, endTime, janelaStartTime: startTime.clone().subtract(1, 'hour'), janelaEndTime: endTime.clone().add(1, 'hour') };
                    }
                    return null;
                }).filter(Boolean) as EventoProcessado[];
            setEventosDoDiaProcessados(eventosDeHojeFiltrados.sort((a,b) => a.startTime.diff(b.startTime)));
        } catch (error) {
            console.error("Erro ao carregar dados do dia (eventos/locais):", error); 
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
                checkActualLocationPermissions(); 
                carregarDadosDoDia();
            });
            return () => task.cancel();
        }, [usuarioLogadoId, carregarDadosDoDia]) 
    );

    useEffect(() => {
        if (loadingStatus || loadingEventos) { 
            setPodeRastrearAmigos(false); 
            return; 
        }

        if (compartilhando === null || compartilhando === false) { 
            setPodeRastrearAmigos(false); 
            return; 
        }
        
        if (eventosDoDiaProcessados.length === 0) {
            setPodeRastrearAmigos(false);
            return;
        }

        if (!minhaLocalizacao) { 
            setPodeRastrearAmigos(false); 
            return; 
        }

        const agora = moment();
        let condicaoAtendidaParaAlgumEvento = false;

        for (const evento of eventosDoDiaProcessados) {
            if (agora.isBetween(evento.janelaStartTime, evento.janelaEndTime)) {
                if (evento.coordenadas) {
                    const distancia = calcularDistancia(minhaLocalizacao.latitude, minhaLocalizacao.longitude, evento.coordenadas.latitude, evento.coordenadas.longitude);
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
        const manageBackgroundTask = async () => {
            if (!usuarioLogadoId || compartilhando === null) return;
            const isTaskRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
            try {
                if (compartilhando && backgroundLocationPermissionStatus === PermissionStatus.GRANTED) {
                    if (isTaskRunning) return; 
                    
                    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 300000,
                        distanceInterval: 25,
                        showsBackgroundLocationIndicator: true,
                        foregroundService: {
                            notificationTitle: 'Compartilhamento Ativo',
                            notificationBody: 'Sua localização está sendo compartilhada com seus amigos.',
                            notificationColor: '#007BFF',
                        },
                    });
                } else if (!compartilhando || backgroundLocationPermissionStatus !== PermissionStatus.GRANTED) {
                    if (isTaskRunning) {
                        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
                    }
                }
            } catch (error) {
                console.error("Erro ao gerenciar a tarefa de background:", error);
                if (isTaskRunning) {
                    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(e => console.warn("Erro ao tentar parar task após erro:", e.message));
                }
            }
        };
        manageBackgroundTask();
    }, [compartilhando, usuarioLogadoId, backgroundLocationPermissionStatus]);


    useEffect(() => {
        const manageForegroundTracking = async () => {
            if (locationSubscriptionRef.current) { 
                locationSubscriptionRef.current.remove(); 
                locationSubscriptionRef.current = null; 
            }

            if (compartilhando === true && locationPermissionStatus === PermissionStatus.GRANTED) { 
                try {
                    locationSubscriptionRef.current = await Location.watchPositionAsync(
                        { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 20 },
                        (location) => {
                            if (!usuarioLogadoId) return;
                            const newMinhaLocalizacao: Localizacao = { id: usuarioLogadoId, nome: 'Você', latitude: location.coords.latitude, longitude: location.coords.longitude };
                            setMinhaLocalizacao(newMinhaLocalizacao);
                            update(ref(database, `localizacoes/${usuarioLogadoId}`), { 
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                                timestamp: location.timestamp,
                                compartilhando: true, 
                                nome: 'Você' 
                            }).catch(dbError => console.error('Erro ao atualizar minha localização no Firebase (foreground):', dbError));

                            if (!selectedAmigoId) { 
                                const isInitialRegion = mapRegion.latitude === -7.2291;
                                setMapRegion(prevRegion => ({
                                    latitude: newMinhaLocalizacao.latitude, longitude: newMinhaLocalizacao.longitude,
                                    latitudeDelta: isInitialRegion ? 0.02 : (prevRegion?.latitudeDelta || 0.02),
                                    longitudeDelta: isInitialRegion ? 0.02 : (prevRegion?.longitudeDelta || 0.02),
                                }));
                            }
                        }
                    );
                } catch (error) {
                    console.error("Erro ao iniciar rastreamento em foreground:", error);
                    setMinhaLocalizacao(null);
                }
            } else {
                setMinhaLocalizacao(null); 
            }
        };
        manageForegroundTracking();
        return () => { 
            if (locationSubscriptionRef.current) { 
                locationSubscriptionRef.current.remove(); 
                locationSubscriptionRef.current = null; 
            } 
        };
    }, [compartilhando, usuarioLogadoId, locationPermissionStatus, selectedAmigoId]); 


    const handleBuscaAmigos = (texto: string) => { setTermoBusca(texto); };

    const handleAmigoPressInternal = (amigoId: string, amigoLocal: Localizacao | undefined) => {
        if (!podeRastrearAmigos) { 
            Alert.alert("Mapa Desativado", "Para visualizar a localização dos amigos, você precisa estar em um evento ativo.");
            return;
        }
        const amigoRealmenteOnlineParaEvento = amigosLocalizacao.find(loc => loc.id === amigoId);

        if (amigoRealmenteOnlineParaEvento) {
            setSelectedAmigoId(amigoId);
            setMapRegion({ latitude: amigoRealmenteOnlineParaEvento.latitude, longitude: amigoRealmenteOnlineParaEvento.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        } else {
            setSelectedAmigoId(amigoId); 
            Alert.alert("Amigo Offline", "Este amigo não está compartilhando a localização no momento ou não está em um evento ativo.");
            if (minhaLocalizacao) {
                setMapRegion({ latitude: minhaLocalizacao.latitude, longitude: minhaLocalizacao.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
            }
        }
    };

    const openSettings = () => { Linking.openSettings(); };

    const openInstagramProfile = async (username: string | undefined) => {
        if (!username) {
            Alert.alert(
                "Instagram não informado",
                "Esta empresa não possui um Instagram cadastrado."
            );
            return;
        }
        const webUrl = `https://www.instagram.com/${username}`;
        
        try {
            await Linking.openURL(webUrl);
        } catch (error) {
            console.error("Erro ao tentar abrir o Instagram:", error);
            Alert.alert("Erro", "Ocorreu um erro inesperado ao tentar abrir o Instagram.");
        }
    };

    const renderAmigoItem = ({ item }: { item: Amigo }) => {
        const isSelected = item.id === selectedAmigoId;
        const amigoLocal = amigosLocalizacao.find(loc => loc.id === item.id);
        return (
            <AmigoItem
                item={item}
                isSelected={isSelected}
                amigoLocal={amigoLocal} 
                handleAmigoPress={handleAmigoPressInternal}
                openInstagramProfile={openInstagramProfile}
            />
        );
    };

    const isLoadingGeral = loadingStatus || loadingEventos;

    if (isLoadingGeral || !fundoAppReady) {
        return (
            <ImageBackground source={currentFundoSource} style={styles.background}> 
                <View style={styles.center}><ActivityIndicator size="large" color="#FFFFFF" /><Text style={styles.loadingText}>Carregando...</Text></View>
            </ImageBackground>
        );
    }
    if (!usuarioLogadoId) {
        return (
            <ImageBackground source={currentFundoSource} style={styles.background}>
                <View style={styles.center}><Text style={styles.warningText}>Usuário não identificado. Por favor, reinicie o aplicativo.</Text></View>
            </ImageBackground>
        );
    }

    if (locationPermissionStatus !== PermissionStatus.GRANTED) {
        return (
            <ImageBackground source={currentFundoSource} style={styles.background}> 
                <View style={styles.center}>
                    <Text style={styles.warningText}>A permissão de localização é essencial para o mapa de amigos.</Text>
                    <Text style={styles.subWarningText}>Por favor, habilite o acesso nas configurações do seu dispositivo.</Text>
                    <TouchableOpacity style={styles.settingsButton} onPress={openSettings}><Text style={styles.settingsButtonText}>Ir para Configurações</Text></TouchableOpacity>
                </View>
            </ImageBackground>
        );
    }

    if (compartilhando === false) { 
        return (
            <ImageBackground source={currentFundoSource} style={styles.background}> 
                <View style={styles.center}>
                    <Text style={styles.warningText}>Para visualizar a localização dos seus amigos, ative o compartilhamento da sua localização.</Text>
                    <Text style={styles.subWarningText}>Você pode ativar o compartilhamento no seu perfil ou nas configurações do app.</Text>
                </View>
            </ImageBackground>
        );
    }
    
    return (
        <ImageBackground source={currentFundoSource} style={styles.background}> 
            <AdBanner />
            <SafeAreaView style={styles.container}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar amigos na lista..."
                    value={termoBusca}
                    onChangeText={handleBuscaAmigos}
                    placeholderTextColor="#888"
                />
                {podeRastrearAmigos && amigosLista.length > 0 ? (
                    <View style={styles.amigosListContainer}>
                        <FlatList
                            data={amigosListaFiltrada}
                            keyExtractor={(item) => item.id}
                            renderItem={renderAmigoItem}
                            contentContainerStyle={styles.amigosListContent}
                        />
                    </View>
                ) : (
                    <View style={styles.centeredMessageContainer}>
                        <Text style={styles.infoOverlayText}>
                            {!podeRastrearAmigos
                                ? (eventosDoDiaProcessados.length > 0
                                    ? "O mapa de amigos é ativado automaticamente quando você estiver próximo (até 3km) de um evento do dia e dentro da janela de tempo do evento (1h antes do início até 1h após o fim)."
                                    : "Não há eventos programados para hoje. O mapa de amigos será ativado próximo aos horários e locais dos eventos quando houver.")
                                : "Não há amigos em eventos ativos no momento. Adicione amigos ou verifique se eles estão participando de algum evento."
                            }
                        </Text>
                    </View>
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
                        <View style={styles.infoOverlayMap}>
                            <Text style={styles.infoOverlayText}>{eventosDoDiaProcessados.length > 0 ? "O mapa de amigos é ativado automaticamente quando você estiver próximo (até 3km) de um evento do dia e dentro da janela de tempo do evento (1h antes do início até 1h após o fim)." : "Não há eventos programados para hoje. O mapa de amigos será ativado próximo aos horários e locais dos eventos quando houver."}</Text>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: { flex: 1, resizeMode: 'cover' },
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.5)' },
    loadingText: { marginTop: 15, fontSize: 16, color: '#FFFFFF', textAlign: 'center' },
    warningText: { fontSize: 18, textAlign: 'center', color: '#FFFFFF', marginBottom: 15, fontWeight: 'bold', lineHeight: 24 },
    subWarningText: { fontSize: 15, textAlign: 'center', color: '#f0f0f0', marginBottom: 25, lineHeight: 22 },
    settingsButton: { backgroundColor: '#007BFF', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
    settingsButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    searchInput: { height: 45, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 10, paddingHorizontal: 15, fontSize: 16, marginHorizontal: 10, marginTop: Platform.OS === 'ios' ? 10 : 10, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
    amigosListContainer: { maxHeight: screenHeight * 0.35, marginHorizontal: 10, marginBottom: 10 },
    amigosListContent: { paddingVertical: 5 },
    amigoItem: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.98)', padding: 10, borderRadius: 10, alignItems: 'center', marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1.5 },
    amigoItemSelected: { backgroundColor: '#E3F2FD', borderColor: '#007BFF', borderWidth: 2 },
    amigoFoto: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
    amigoFotoPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#BDBDBD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    amigoFotoPlaceholderText: { fontSize: 22, color: '#FFFFFF', fontWeight: 'bold' },
    amigoInfo: { flex: 1, alignItems: 'flex-start' },
    amigoNome: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'left' },
    amigoOffline: { fontSize: 12, color: '#D32F2F', fontStyle: 'italic', textAlign: 'left', marginTop: 3 },
    mapContainer: { flex: 1, marginHorizontal: 10, marginBottom: 10, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#BDBDBD' },
    map: { flex: 1 },
    semAmigosContainer: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 10, borderRadius: 10 },
    semAmigosVertical: { backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 20, marginBottom: 10 }, 
    semAmigosText: { fontSize: 16, color: '#000', textAlign: 'center', marginBottom: 8 },
    semAmigosSubText: { fontSize: 14, color: '#000', textAlign: 'center' },
    myLocationMarker: { backgroundColor: '#007BFF', padding: 6, borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderColor: 'white', borderWidth: 1.5 },
    myLocationMarkerText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
    markerImage: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#4CAF50' },
    markerImageSelected: { borderColor: '#FFC107', transform: [{scale: 1.2}] },
    markerPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
    markerPlaceholderSelected: { backgroundColor: '#FFC107', borderColor: 'white', transform: [{scale: 1.2}] },
    markerInitial: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    
    centeredMessageContainer: {
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        marginHorizontal: 10, 
        marginBottom: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.75)', 
    },
    infoOverlayMap: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: 'rgba(0,0,0,0.75)', 
        paddingVertical: 12, 
        paddingHorizontal: 15, 
        alignItems: 'center', 
        zIndex: 10 
    },
    instagramButton: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, justifyContent: 'center', alignItems: 'center', minWidth: 90 },
    instagramButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
    infoOverlayText: { color: 'white', textAlign: 'center', fontSize: 14, lineHeight: 20 },
    statusAndInstagramContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: 4 },
    instagramButtonWrapper: { marginLeft: 'auto' },
});

export default MapaAmigosScreen;