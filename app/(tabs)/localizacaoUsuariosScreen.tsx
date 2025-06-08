import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    SafeAreaView, 
    Alert, 
    ImageBackground, 
    Image, 
    InteractionManager, 
    Dimensions, 
    Animated, 
    ActivityIndicator 
} from 'react-native';
import { ref, get, set, remove, onValue } from 'firebase/database';
import { auth, database, administrativoDatabase } from '../../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';

// --- INTERFACES ---
interface Usuario {
  nome: string;
  telefone: string;
  email: string;
  id: string;
  imagem?: string;
}

interface BannerItem {
  descricao: string;
  id: string;
  imagemUrl: string;
  linkUrl: string;
}

// --- CONSTANTES ---
const { height: screenHeight } = Dimensions.get('window');
const ITEMS_POR_PAGINA = 15;

// --- COMPONENTE ---
const LocalizacaoScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [allBanners, setAllBanners] = useState<string[]>([]);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [usuariosOriginais, setUsuariosOriginais] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState('');
  const [amizades, setAmizades] = useState<Record<string, string>>({});
  const [solicitacoesRecebidas, setSolicitacoesRecebidas] = useState<Usuario[]>([]);
  const [usuariosQueMeSolicitaramMap, setUsuariosQueMeSolicitaramMap] = useState<Record<string, boolean>>({});
  const [pagina, setPagina] = useState(1);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [todosCarregados, setTodosCarregados] = useState(false);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const usuarioLogadoId = auth.currentUser?.uid;

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
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          } else {
            setCurrentBannerUrl(null);
            fadeAnim.setValue(0);
          }
        } else {
          setCurrentBannerUrl(null);
          fadeAnim.setValue(0);
        }
      } catch (error) {
        console.error('Erro ao buscar banners:', error);
        Alert.alert("Erro", "Não foi possível carregar os banners.");
        setCurrentBannerUrl(null);
        fadeAnim.setValue(0);
      }
    };
    fetchBanners();
  }, [fadeAnim]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (allBanners.length > 1) {
      intervalId = setInterval(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setCurrentBannerIndex(prevIndex => {
            const nextIndex = (prevIndex + 1) % allBanners.length;
            setCurrentBannerUrl(allBanners[nextIndex]);
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
            return nextIndex;
          });
        });
      }, 6000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [allBanners, fadeAnim]);

  const buscarUsuarios = useCallback(async () => {
    if (!usuarioLogadoId) return;
    setLoadingInicial(true);
    const usuariosRef = ref(database, 'usuarios');
    const snapshotUsuarios = await get(usuariosRef);
    const todosUsuariosTemp: Usuario[] = [];
    const solicitacoesRecebidasTemp: Usuario[] = [];
    const mapUsuariosQueMeSolicitaram: Record<string, boolean> = {};
    if (snapshotUsuarios.exists()) {
      const promises: Promise<void>[] = [];
      snapshotUsuarios.forEach(childSnapshot => {
        const usuarioData = childSnapshot.val();
        const id = childSnapshot.key;
        if (!id || id === usuarioLogadoId) return;
        const usuarioCompleto = { ...usuarioData, id };
        todosUsuariosTemp.push(usuarioCompleto);
        const refOutroParaLogado = ref(database, `amigos/${id}/${usuarioLogadoId}`);
        promises.push(
          get(refOutroParaLogado).then(snap => {
            if (snap.exists() && snap.val() === 'pendente') {
              solicitacoesRecebidasTemp.push(usuarioCompleto);
              mapUsuariosQueMeSolicitaram[id] = true;
            }
          })
        );
      });
      await Promise.all(promises);
      setSolicitacoesRecebidas(solicitacoesRecebidasTemp);
      setUsuariosQueMeSolicitaramMap(mapUsuariosQueMeSolicitaram);
      const usuariosFiltrados = todosUsuariosTemp.filter(u => !mapUsuariosQueMeSolicitaram[u.id]);
      setUsuariosOriginais(usuariosFiltrados);
    } else {
      setUsuariosOriginais([]);
      setSolicitacoesRecebidas([]);
      setUsuariosQueMeSolicitaramMap({});
    }
    setPagina(1);
    setTodosCarregados(false);
    setLoadingInicial(false);
  }, [usuarioLogadoId]);

  useEffect(() => {
    if (!usuarioLogadoId) return;
    const amizadeRef = ref(database, `amigos/${usuarioLogadoId}`);
    const unsubscribeAmizades = onValue(amizadeRef, (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : {};
      setAmizades(data);
    });
    return () => unsubscribeAmizades();
  }, [usuarioLogadoId]);

  useFocusEffect(
    useCallback(() => {
      if (!usuarioLogadoId) return;
      const task = InteractionManager.runAfterInteractions(() => {
        setBusca('');
        setUsuariosFiltrados([]);
        buscarUsuarios();
      });
      return () => task.cancel();
    }, [buscarUsuarios, usuarioLogadoId])
  );

  const handleBusca = (texto: string) => {
    setBusca(texto);
    setPagina(1);
    setTodosCarregados(false);
    if (texto.trim().length >= 3) {
      const textoLower = texto.toLowerCase();
      const filtrados = usuariosOriginais.filter((u) =>
        u.nome.toLowerCase().includes(textoLower) ||
        (u.telefone && u.telefone.includes(textoLower)) ||
        u.email.toLowerCase().includes(textoLower)
      );
      setUsuariosFiltrados(filtrados);
    } else {
      setUsuariosFiltrados([]);
    }
  };

  const carregarMaisUsuarios = useCallback(() => {
    if (carregandoMais || todosCarregados || busca.length >= 3) return;
    setCarregandoMais(true);
    const proximaPaginaItemsCount = pagina * ITEMS_POR_PAGINA;
    if (usuariosOriginais.length > proximaPaginaItemsCount) {
      setPagina((prevPagina) => prevPagina + 1);
    } else {
      setTodosCarregados(true);
    }
    setCarregandoMais(false);
  }, [pagina, usuariosOriginais, carregandoMais, todosCarregados, busca]);

  const marcarAmigo = async (usuario: Usuario) => {
    if (!usuarioLogadoId) return;
    const refSolicitacao = ref(database, `amigos/${usuarioLogadoId}/${usuario.id}`);
    try {
      await set(refSolicitacao, 'pendente');
      setAmizades((prev) => ({ ...prev, [usuario.id]: 'pendente' }));
    } catch (error) {
      console.error("Erro ao marcar amigo:", error);
      Alert.alert("Erro", "Não foi possível enviar a solicitação.");
    }
  };

  const desfazerAmizade = async (usuario: Usuario) => {
    if (!usuarioLogadoId) return;
    Alert.alert('Desfazer Amizade', `Tem certeza que quer desfazer a amizade com ${usuario.nome}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desfazer',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove(ref(database, `amigos/${usuarioLogadoId}/${usuario.id}`));
            await remove(ref(database, `amigos/${usuario.id}/${usuarioLogadoId}`));
            buscarUsuarios(); 
          } catch (error) {
            console.error("Erro ao desfazer amizade:", error);
            Alert.alert("Erro", "Não foi possível desfazer a amizade.");
          }
        },
      },
    ]);
  };

  const cancelarSolicitacao = async (usuario: Usuario) => {
    if (!usuarioLogadoId) return;
    Alert.alert('Cancelar Solicitação', `Deseja cancelar a solicitação de amizade para ${usuario.nome}?`, [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim',
        onPress: async () => {
          try {
            await remove(ref(database, `amigos/${usuarioLogadoId}/${usuario.id}`));
            buscarUsuarios();
          } catch (error) {
            console.error("Erro ao cancelar solicitação:", error);
            Alert.alert("Erro", "Não foi possível cancelar a solicitação.");
          }
        },
      },
    ]);
  };

  const aceitarSolicitacao = async (usuario: Usuario) => {
    if (!usuarioLogadoId) return;
    try {
      await set(ref(database, `amigos/${usuario.id}/${usuarioLogadoId}`), 'aceito');
      await set(ref(database, `amigos/${usuarioLogadoId}/${usuario.id}`), 'aceito');
      buscarUsuarios();
    } catch (error) {
      console.error("Erro ao aceitar solicitação:", error);
      Alert.alert("Erro", "Não foi possível aceitar a solicitação.");
    }
  };

  const recusarSolicitacao = async (usuario: Usuario) => {
    if (!usuarioLogadoId) return;
    Alert.alert('Recusar Solicitação', `Deseja recusar a solicitação de amizade de ${usuario.nome}?`, [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove(ref(database, `amigos/${usuario.id}/${usuarioLogadoId}`));
            buscarUsuarios();
          } catch (error) {
            console.error("Erro ao recusar solicitação:", error);
            Alert.alert("Erro", "Não foi possível recusar a solicitação.");
          }
        },
      },
    ]);
  };

  if (loadingInicial) {
    return (
      <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
        <View style={styles.loadingContainerCentral}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </ImageBackground>
    );
  }
  
  const dadosParaExibir = busca.length >= 3
    ? usuariosFiltrados
    : usuariosOriginais.slice(0, pagina * ITEMS_POR_PAGINA);

  const renderItem = ({ item }: { item: Usuario }) => {
    const status = amizades[item.id];
    let buttonText = 'Solicitar';
    let buttonStyle = styles.buttonSolicitar;
    if (status === 'aceito') {
      buttonText = 'Desfazer';
      buttonStyle = styles.buttonAceito;
    } else if (status === 'pendente') {
      buttonText = 'Aguardando';
      buttonStyle = styles.buttonPendente;
    }
    return (
      <View style={styles.usuarioContainer}>
        <View style={styles.profileContainer}>
          {item.imagem ? <Image source={{ uri: item.imagem }} style={styles.profileImage} /> : <View style={styles.profileImagePlaceholder} />}
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.usuarioNome}>{item.nome}</Text>
          <View style={styles.telefoneButtonContainer}>
            <Text style={styles.telefoneText}>{item.telefone}</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, buttonStyle]}
                onPress={() => {
                  if (status === 'aceito') desfazerAmizade(item);
                  else if (status === 'pendente') cancelarSolicitacao(item);
                  else marcarAmigo(item);
                }}
              >
                <Text style={styles.buttonTextSmall}>{buttonText}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.email}>{item.email}</Text>
        </View>
      </View>
    );
  };
  
  const renderSolicitacao = ({ item }: { item: Usuario }) => (
    <View key={item.id} style={styles.usuarioContainerSolicitacao}>
      <View style={styles.profileContainerSolicitacao}>
        {item.imagem ? <Image source={{ uri: item.imagem }} style={styles.profileImage} /> : <View style={styles.profileImagePlaceholder} />}
      </View>
      <View style={styles.infoContainerSolicitacao}>
        <Text style={styles.usuarioNome}>{item.nome}</Text>
        <View style={styles.botoesSolicitacao}>
          <Text style={styles.telefoneTextSolicitacao}>{item.telefone}</Text>
          <TouchableOpacity style={[styles.button, styles.buttonSolicitar]} onPress={() => aceitarSolicitacao(item)}>
            <Text style={styles.buttonTextSmall}>Aceitar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonRecusar]} onPress={() => recusarSolicitacao(item)}>
            <Text style={styles.buttonTextSmall}>Recusar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.emailSolicitacao}>{item.email}</Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!carregandoMais) return null;
    return <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }} />;
  };

  return (
    <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
      <View style={styles.adBanner}>
        {currentBannerUrl ? (
          <Animated.Image source={{ uri: currentBannerUrl }} style={[styles.bannerImage, { opacity: fadeAnim }]} resizeMode="contain"/>
        ) : (
          <Text style={styles.adBannerText}>Espaço para Patrocínios</Text>
        )}
      </View>
      <SafeAreaView style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Buscar por nome, e-mail ou telefone (mín. 3 letras)"
          value={busca}
          onChangeText={handleBusca}
          placeholderTextColor="#888"
        />
        <View style={styles.listaUsuarios}>
          <FlatList
            data={dadosParaExibir}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListFooterComponent={renderFooter}
            onEndReached={carregarMaisUsuarios} 
            onEndReachedThreshold={0.5} 
            ListEmptyComponent={
                <Text style={styles.emptyListText}>
                    {busca.length >= 3 ? 'Nenhum usuário encontrado.' : 'Nenhum usuário para exibir.'}
                </Text>
            }
          />
        </View>

        {solicitacoesRecebidas.length > 0 && (
          <View style={styles.solicitacoesContainer}>
            <Text style={styles.solicitacoesTitulo}>Solicitações Recebidas</Text>
            <FlatList
              data={solicitacoesRecebidas}
              keyExtractor={(item) => item.id}
              renderItem={renderSolicitacao}
            />
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  loadingContainerCentral: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  loadingText: { textAlign: 'center', marginTop: 10, fontSize: 16, color: '#fff' },
  container: { flex: 1, padding: 10 },
  background: { flex: 1, resizeMode: 'cover' },
  adBanner: { height: 60, backgroundColor: 'rgba(220,220,220,0.7)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%' },
  adBannerText: { fontSize: 14, fontWeight: '500', color: '#555' },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 8, backgroundColor: 'white' },
  listaUsuarios: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 10, padding: 10, flex: 1 },
  usuarioContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 5, marginBottom: 5, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2 },
  profileContainer: { marginRight: 12 },
  profileImage: { width: 60, height: 60, borderRadius: 30 },
  profileImagePlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0e0e0' },
  infoContainer: { flex: 1 },
  usuarioNome: { fontSize: 17, fontWeight: '600', color: '#222', marginBottom: 2 },
  telefoneButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  telefoneText: { flex: 1, fontSize: 14, color: '#555' },
  buttonContainer: {},
  email: { color: '#666', fontSize: 13 },
  button: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center', minWidth: 90, marginLeft: 8 },
  buttonSolicitar: { backgroundColor: '#4CAF50' },
  buttonPendente: { backgroundColor: '#FF9800' },
  buttonAceito: { backgroundColor: '#007BFF' },
  buttonRecusar: { backgroundColor: '#D32F2F' },
  buttonTextSmall: { color: 'white', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  solicitacoesContainer: { marginTop: 10, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#ddd', maxHeight: screenHeight * 0.35 },
  solicitacoesTitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: '#333', textAlign: 'center' },
  usuarioContainerSolicitacao: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 5, marginBottom: 5, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2 },
  profileContainerSolicitacao: { marginRight: 12 },
  infoContainerSolicitacao: { flex: 1 },
  telefoneTextSolicitacao: { marginTop: 2, color: '#555', fontSize: 14 },
  botoesSolicitacao: { flexDirection: 'row', marginTop: 2, justifyContent: 'space-between' },
  emailSolicitacao: { marginTop: 2, color: '#666', fontSize: 13 },
  emptyListText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' },
});

export default LocalizacaoScreen;