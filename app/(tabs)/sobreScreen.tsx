import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { auth, administrativoDatabase, adminDatabase } from '../../firebaseConfig'; // Verifique se o caminho está correto
import { ref, get, push, serverTimestamp } from 'firebase/database'; // Importado push e serverTimestamp

interface BannerItem {
  descricao: string;
  id: string;
  imagemUrl: string;
  linkUrl: string;
}

export default function Sobre() {
  const [allBanners, setAllBanners] = useState<string[]>([]);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [sugestao, setSugestao] = useState('');
  const [enviandoFeedback, setEnviandoFeedback] = useState(false); // Estado para o loading do envio
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorsLoading, setSponsorsLoading] = useState(true);
  const [sponsorsError, setSponsorsError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const [measuredContentWidth, setMeasuredContentWidth] = useState(0);
  const [isUserInteractingWithSponsors, setIsUserInteractingWithSponsors] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  const fetchSponsors = async () => {
    setSponsorsLoading(true);
    setSponsorsError(null);
    try {
      const sponsorsRef = ref(administrativoDatabase, 'patrocinadores');
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
            if (sponsor?.banners && Array.isArray(sponsor.banners)) {
              sponsor.banners.forEach((bannerObject: BannerItem) => {
                if (typeof bannerObject === 'object' && bannerObject !== null && typeof bannerObject.imagemUrl === 'string') {
                  bannersList.push(bannerObject.imagemUrl);
                }
              });
            }
          }
          if (bannersList.length > 0) {
            setAllBanners(bannersList);
            setCurrentBannerUrl(bannersList[0]);
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          } else {
            setCurrentBannerUrl(null); fadeAnim.setValue(0);
          }
        } else {
          setCurrentBannerUrl(null); fadeAnim.setValue(0);
        }
      } catch (error) {
        console.error('Erro ao buscar banners:', error);
        Alert.alert("Erro", "Não foi possível carregar os banners.");
        setCurrentBannerUrl(null); fadeAnim.setValue(0);
      }
    };
    fetchBanners();
  }, [fadeAnim]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    
    if (allBanners.length > 1) {
      intervalId = setInterval(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setCurrentBannerUrl(prevUrl => {
            const currentIdx = allBanners.indexOf(prevUrl || '');
            const nextIdx = (currentIdx + 1 + allBanners.length) % allBanners.length;
            const nextBanner = allBanners[nextIdx] || allBanners[0]; // Fallback para o primeiro banner
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
            return nextBanner;
          });
        });
      }, 6000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
      fadeAnim.stopAnimation();
    };
  }, [allBanners, fadeAnim]);

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
        uidUsuario: user ? user.uid : 'anonimo', // Salva 'anonimo' se o usuário não estiver logado (opcional)
        nomeUsuario: user && user.displayName ? user.displayName : (user && user.email ? user.email : 'Não informado'), // Salva nome ou email
        timestamp: serverTimestamp(), // Usa o timestamp do servidor Firebase
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

  return (
    <ImageBackground 
        source={require('../../assets/images/fundo.png')}
        style={styles.container}
        resizeMode="cover" 
    >
        <View style={styles.adBanner}>
            {currentBannerUrl ? (
                <Animated.Image source={{ uri: currentBannerUrl }} style={[styles.bannerImage, { opacity: fadeAnim }]} resizeMode="contain" onError={(e) => console.warn("Erro imagem banner:", e.nativeEvent.error)} />
            ) : ( <Text style={styles.adBannerText}>Espaço para Patrocínios</Text> )}
        </View>
        
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
                        {sponsors.map((sponsor) => ( sponsor.logoUrl ? <Image key={sponsor.id} source={{ uri: sponsor.logoUrl }} style={styles.supporterLogo} onError={(e) => console.warn(`Erro logo ${sponsor.id}: ${sponsor.logoUrl}`, e.nativeEvent.error)} /> : null ))}
                    </ScrollView>
                ) : ( <Text style={styles.supporterText}>Seja nosso apoiador!</Text> )}
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
    adBanner: { height: 60, width: '100%', backgroundColor: 'rgba(220,220,220,0.7)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    bannerImage: { width: '100%', height: '100%' },
    adBannerText: { fontSize: 14, fontWeight: '500', color: '#555' },
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
    botaoEnviar: { backgroundColor: '#3498db', paddingVertical: 10, paddingHorizontal: 35, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, alignSelf: 'center', minWidth: 150 }, // Adicionado minWidth para consistência
    botaoDesabilitado: { backgroundColor: '#95a5a6' }, // Estilo para botão desabilitado
    botaoEnviarTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
});