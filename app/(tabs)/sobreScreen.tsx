import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Alert,
  ActivityIndicator, // Adicionado para o loading do fundo
  TextInput,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { auth, database, adminDatabase } from '../../firebaseConfig'; // Verifique se o caminho está correto
import { ref, get, push, serverTimestamp } from 'firebase/database';
import AdBanner from '../components/AdBanner'; // Importe o componente AdBanner

// --- Importar o gerenciador de imagens para o fundo ---
import { checkAndDownloadImages } from '../../utils/imageManager'; // Ajuste o caminho

// --- URL padrão de fallback para o fundo local ---
const defaultFundoLocal = require('../../assets/images/fundo.png');
// REMOVIDO: const fundo = require('../../assets/images/fundo.png'); // Não é mais necessário

export default function Sobre() {
  const [sugestao, setSugestao] = useState('');
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorsLoading, setSponsorsLoading] = useState(true);
  const [sponsorsError, setSponsorsError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const [measuredContentWidth, setMeasuredContentWidth] = useState(0);
  const [isUserInteractingWithSponsors, setIsUserInteractingWithSponsors] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  // --- Novos estados para o carregamento da imagem de fundo dinâmica ---
  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  // --- NOVO useEffect para carregar a imagem de fundo dinâmica ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na Sobre:", error);
        setCurrentFundoSource(defaultFundoLocal); // Em caso de erro, usa o fallback local
      } finally {
        setFundoAppReady(true); // Indica que o fundo foi processado
      }
    };
    loadFundoImage();
  }, []); // Executa apenas uma vez ao montar o componente

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
      const feedbackRef = ref(adminDatabase, 'sugestoesReclamacoes');
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

  // --- Condição de carregamento da imagem de fundo ---
  // A tela principal só é renderizada depois que o fundo está pronto.
  if (!fundoAppReady) {
    return (
      <ImageBackground source={defaultFundoLocal} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando fundo...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={currentFundoSource} // USANDO O FUNDO DINÂMICO AQUI
      style={styles.container}
      resizeMode="cover"
    >
      <AdBanner />

      <View style={styles.contentArea}>
        {/* Seção "Sobre este App" */}
        <View style={styles.sectionWrapper}>
          <ScrollView contentContainerStyle={styles.scrollContentContainer}>
            <Text style={styles.title}>🎉 Sobre o Assistente de Eventos 🎉</Text>

            <Text style={styles.paragraphText}>
              Cansado(a) de perrengues em eventos?
            </Text>
            <Text style={styles.paragraphText}>
              O Assistente de Eventos nasceu para revolucionar a forma como você curte cada momento! ✨
            </Text>
            <Text style={styles.paragraphText}>
              Nossa missão é garantir que você aproveite ao máximo, sem estresse. Veja como: 👇
            </Text>

            <View style={styles.featureItem}>
              <Text style={styles.emojiBulletPoint}>📍</Text>
              <Text style={styles.featureText}>
                <Text style={styles.boldText}>Localize Tudo e Todos:</Text>
                {' '}Com a geolocalização em tempo real, encontre facilmente seus amigos, aquele lanche especial ou o serviço que você precisa, sem dar voltas desnecessárias.
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.emojiBulletPoint}>🎧</Text>
              <Text style={styles.featureText}>
                <Text style={styles.boldText}>Não Perca Nada:</Text>
                {' '}Fique por dentro de toda a programação com o lineup sempre atualizado e sinta a vibe de cada palco com nossa transmissão de áudio ao vivo.
              </Text>
            </View>

            <Text style={styles.paragraphText}>
              Com o Assistente de Eventos, você gasta seu tempo e energia com o que realmente importa: a diversão! 🥳 Explore, conecte-se e viva a melhor experiência possível no seu evento. 🚀
            </Text>
          </ScrollView>
        </View>

        {/* Seção "Patrocinadores" */}
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

        {/* Seção "Sugestões e Reclamações" */}
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
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, paddingLeft: 5 },
  emojiBulletPoint: { fontSize: 20, color: '#34495e', marginRight: 10, lineHeight: 25 },
  featureText: { flex: 1, fontSize: 16, color: '#34495e', textAlign: 'justify', lineHeight: 25 },
  boldText: { fontWeight: 'bold', color: '#2c3e50' },

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
  // Estilos para o estado de carregamento do fundo
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // O fundo já será a imagem carregada dinamicamente, ou o fallback local
  },
  loadingText: {
    marginTop: 10,
    color: '#007BFF',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)', // Adicionado sombra para melhor legibilidade no fundo dinâmico
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});