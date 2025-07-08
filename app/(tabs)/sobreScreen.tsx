import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Alert,
  ActivityIndicator, 
  TextInput,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { auth, database, adminDatabase } from '../../firebaseConfig'; 
import { ref, get, push, serverTimestamp, onValue } from 'firebase/database'; // Adicionado onValue
import AdBanner from '../components/AdBanner'; 

// --- Importar o gerenciador de imagens para o fundo ---
// import { checkAndDownloadImages } from '../../utils/imageManager'; 

const defaultFundoLocal = require('../../assets/images/fundo.png');

export default function Sobre() {
  const [sugestao, setSugestao] = useState('');
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorsLoading, setSponsorsLoading] = useState(true);
  const [sponsorsError, setSponsorsError] = useState<string | null>(null);

  // === NOVO ESTADO PARA O TEXTO "SOBRE O APP" ===
  const [sobreAppTexto, setSobreAppTexto] = useState('');
  // === NOVO ESTADO PARA O LOADING DO TEXTO "SOBRE O APP" ===
  const [loadingSobreAppTexto, setLoadingSobreAppTexto] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const [measuredContentWidth, setMeasuredContentWidth] = useState(0);
  const [isUserInteractingWithSponsors, setIsUserInteractingWithSponsors] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  // --- useEffect para carregar a imagem de fundo dinâmica ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        // Se você estiver usando checkAndDownloadImages, descomente a linha abaixo
        // const { fundoUrl } = await checkAndDownloadImages();
        // setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
        setCurrentFundoSource(defaultFundoLocal); // Usando fallback local para compatibilidade com Expo Go
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na Sobre:", error);
        setCurrentFundoSource(defaultFundoLocal); 
      } finally {
        setFundoAppReady(true); 
      }
    };
    loadFundoImage();
  }, []); 

  // === NOVO useEffect para buscar o texto "Sobre o App" do Firebase ===
  useEffect(() => {
    const configRef = ref(adminDatabase, 'configuracoes_app'); // Nó onde o texto está salvo
    const unsubscribe = onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.sobreEsteApp) {
        setSobreAppTexto(data.sobreEsteApp);
      } else {
        console.warn("Texto 'sobreEsteApp' não encontrado no Firebase em 'configuracoes_app/sobreEsteApp'.");
        setSobreAppTexto("Informações sobre o app não disponíveis no momento."); // Texto de fallback
      }
      setLoadingSobreAppTexto(false); // Finaliza o loading do texto
    }, (error) => {
      console.error("Erro ao buscar texto 'Sobre o App' do Firebase:", error);
      Alert.alert("Erro", "Não foi possível carregar as informações sobre o app.");
      setSobreAppTexto("Erro ao carregar informações."); // Texto de fallback em caso de erro
      setLoadingSobreAppTexto(false);
    });

    return () => unsubscribe(); // Limpa o listener ao desmontar o componente
  }, []);

  const fetchSponsors = async () => {
    setSponsorsLoading(true);
    setSponsorsError(null);
    try {
      const sponsorsRef = ref(database, 'patrocinadores');
      const snapshot = await get(sponsorsRef);
      if (snapshot.exists()) {
        const sponsorsData = snapshot.val();
        const sponsorsList = Object.keys(sponsorsData).map(key => ({
          id: key,
          ...sponsorsData[key],
        }));
        setSponsors(sponsorsList);
      } else {
        setSponsors([]);
      }
    } catch (err: any) {
      console.error("Erro ao buscar patrocinadores:", err);
      setSponsorsError('Não foi possível carregar os apoiadores.');
    } finally {
      setSponsorsLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  // Lógica de animação de scroll dos patrocinadores (inalterada)
  useEffect(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (sponsors.length === 0 || !scrollViewRef.current || isUserInteractingWithSponsors || measuredContentWidth <= screenWidth) {
      if (measuredContentWidth <= screenWidth && scrollOffsetRef.current !== 0 && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, animated: false });
        scrollOffsetRef.current = 0;
      }
      return;
    }

    let lastTimestamp = 0;
    const scrollSpeed = 20;

    const animate = (timestamp: number) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }
      const deltaTimeInSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      scrollOffsetRef.current += scrollSpeed * deltaTimeInSeconds;
      if (scrollOffsetRef.current >= measuredContentWidth) {
        scrollOffsetRef.current = scrollOffsetRef.current % measuredContentWidth;
      }
      scrollViewRef.current?.scrollTo({ x: scrollOffsetRef.current, animated: false });
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };
    animationFrameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [sponsors, screenWidth, measuredContentWidth, isUserInteractingWithSponsors]);

  const handleSponsorsScrollBeginDrag = () => setIsUserInteractingWithSponsors(true);
  const handleSponsorsScrollEndDrag = (event: any) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.x;
    setIsUserInteractingWithSponsors(false);
  };
  const handleSponsorsMomentumScrollEnd = (event: any) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.x;
    setTimeout(() => setIsUserInteractingWithSponsors(false), 100);
  };

  const handleEnviarSugestao = async () => {
    if (sugestao.trim() === '') {
      Alert.alert("Campo Vazio", "Por favor, escreva sua sugestão ou reclamação.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Acesso Negado", "Você precisa estar logado para enviar feedback. Por favor, faça login e tente novamente.");
      return;
    }

    setEnviandoFeedback(true);
    try {
      const feedbackRef = ref(adminDatabase, 'sugestoesReclamacoes'); // adminDatabase para dados de admin
      await push(feedbackRef, {
        texto: sugestao.trim(),
        uidUsuario: user ? user.uid : 'anonimo',
        nomeUsuario: user && user.displayName ? user.displayName : (user && user.email ? user.email : 'Não informado'),
        timestamp: serverTimestamp(),
      });
      Alert.alert("Enviado!", "Sua mensagem foi enviada com sucesso! Agradecemos seu feedback. 👍");
      setSugestao('');
    } catch (error) {
      console.error("Erro ao enviar sugestão:", error);
      Alert.alert("Erro", "Não foi possível enviar sua mensagem. Tente novamente mais tarde.");
    } finally {
      setEnviandoFeedback(false);
    }
  };

  // --- Condição de carregamento geral: Espera o fundo E o texto "Sobre o App" estarem prontos ---
  if (!fundoAppReady || loadingSobreAppTexto) { 
    return (
      <ImageBackground source={defaultFundoLocal} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando informações do app...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={currentFundoSource} 
      style={styles.container}
      resizeMode="cover"
    >
      <AdBanner />

      <View style={styles.contentArea}>
        <View style={styles.sectionWrapper}>
          <ScrollView contentContainerStyle={styles.scrollContentContainer}>
            <Text style={styles.title}>🎉 Sobre o Assistente de Eventos 🎉</Text>

            <Text style={styles.paragraphText}>
              {sobreAppTexto}
            </Text>
            
          </ScrollView>
        </View>

        <View style={styles.supportersContainer}>
          <Text style={styles.supportersTitle}>Apoio:</Text>
          {sponsorsLoading ? (
            <ActivityIndicator style={{ marginTop: 15 }} color="#fff" size="small" />
          ) : sponsorsError ? (
            <Text style={styles.supporterErrorText}>{sponsorsError}</Text>
          ) : sponsors.length > 0 ? (
            <ScrollView ref={scrollViewRef} horizontal showsHorizontalScrollIndicator={true} style={styles.supportersLogos} contentContainerStyle={styles.supportersLogosContent} onContentSizeChange={setMeasuredContentWidth} onScrollBeginDrag={handleSponsorsScrollBeginDrag} onScrollEndDrag={handleSponsorsScrollEndDrag} onMomentumScrollEnd={handleSponsorsMomentumScrollEnd} scrollEventThrottle={16}>
              {sponsors.map((sponsor) => (sponsor.logoUrl ? <Image key={sponsor.id} source={{ uri: sponsor.logoUrl }} style={styles.supporterLogo} onError={(e) => console.warn(`Erro logo ${sponsor.id}: ${sponsor.logoUrl}`, e.nativeEvent.error)} /> : null))}
            </ScrollView>
          ) : (<Text style={styles.supporterText}>Seja nosso apoiador!</Text>)}
        </View>

        <View style={[styles.sectionWrapper, { flex: 0.9 }]}>
          <ScrollView contentContainerStyle={styles.scrollContentContainer}>
            <Text style={styles.title}>💡 Sugestões e Reclamações</Text>
            <TextInput style={styles.textInputSugestao} multiline placeholder="Sua opinião é muito importante para nós! Conte aqui sua sugestão ou problema..." value={sugestao} onChangeText={setSugestao} placeholderTextColor="#777" editable={!enviandoFeedback} />
            <TouchableOpacity style={[styles.botaoEnviar, enviandoFeedback && styles.botaoDesabilitado]} onPress={handleEnviarSugestao} disabled={enviandoFeedback}>
              {enviandoFeedback ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.botaoEnviarTexto}>Enviar Feedback</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentArea: { flex: 1, paddingHorizontal: 10, paddingBottom: 10 },
  sectionWrapper: { flex: 1, marginTop: 10, backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 10, overflow: 'hidden' },
  scrollContentContainer: { padding: 15, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50', textAlign: 'center' },

  paragraphText: { fontSize: 16, color: '#34495e', textAlign: 'justify', lineHeight: 25, marginBottom: 15 },
  // REMOVIDO: featureItem, emojiBulletPoint, featureText, boldText styles
  
  supportersContainer: { flex: 0.7, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  supportersTitle: { fontSize: 19, fontWeight: 'bold', color: '#FFFFFF', marginTop: 10, marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  supportersLogos: { width: '100%' },
  supportersLogosContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingVertical: 8 },
  supporterText: { color: '#E0E0E0', fontSize: 14, textAlign: 'center', marginTop: 10 },
  supporterErrorText: { color: '#FFC107', fontSize: 14, textAlign: 'center', marginHorizontal: 15, marginTop: 10 },
  supporterLogo: { width: 95, height: 95, resizeMode: 'contain', borderRadius: 10, backgroundColor: '#f8f9fa', marginLeft: 10, borderWidth: 1, borderColor: '#dee2e6' },

  textInputSugestao: { width: '100%', height: 100, borderColor: '#bdc3c7', borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, textAlignVertical: 'top', marginBottom: 10, backgroundColor: '#fff', color: '#2c3e50' },
  botaoEnviar: { backgroundColor: '#3498db', paddingVertical: 10, paddingHorizontal: 35, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, alignSelf: 'center', minWidth: 150 },
  botaoDesabilitado: { backgroundColor: '#95a5a6' },
  botaoEnviarTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#007BFF',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)', 
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});