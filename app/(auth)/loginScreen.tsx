import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  TextInput,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Image,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { auth, database } from '../../firebaseConfig';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { router } from 'expo-router';
import { ref, get } from 'firebase/database';
import { Eye, EyeOff } from 'lucide-react-native';

// --- Importar o gerenciador de imagens ---
import { checkAndDownloadImages } from '../../utils/imageManager'; // Ajuste o caminho se seu utils estiver em outro lugar

// --- URLs padrão de fallback para assets locais ---
// Usados se as imagens do Firebase não puderem ser carregadas ou não existirem.
const defaultLogoLocal = require('../../assets/images/logoEvento.png');
const defaultFundoLocal = require('../../assets/images/fundo.png');

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // --- Novos estados para o carregamento das imagens dinâmicas ---
  // Inicializa com os assets locais para evitar `null` no início
  const [appImagesReady, setAppImagesReady] = useState(false);
  const [currentLogoSource, setCurrentLogoSource] = useState<any>(defaultLogoLocal);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  const [authLoading, setAuthLoading] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorsLoading, setSponsorsLoading] = useState(true);
  const [sponsorsError, setSponsorsError] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width;

  const toggleMostrarSenha = () => {
    setMostrarSenha(!mostrarSenha);
  };

  const handleAuthStateChanged = useCallback((authUser: any) => {
    setUser(authUser);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(handleAuthStateChanged);
    return () => unsubscribe();
  }, [handleAuthStateChanged]);

  // --- Novo useEffect para carregar as imagens dinâmicas ao iniciar a tela ---
  useEffect(() => {
    const initializeAppImages = async () => {
      try {
        const { logoUrl, fundoUrl } = await checkAndDownloadImages();

        // Define as sources para os componentes Image/ImageBackground
        // Se a URL retornada for uma string (URI local/remoto), usa { uri: string }
        // Senão (se for vazia ou erro), usa o asset local (que é um número)
        setCurrentLogoSource(logoUrl ? { uri: logoUrl } : defaultLogoLocal);
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);

      } catch (error) {
        console.error("Erro ao inicializar imagens do app na LoginScreen:", error);
        Alert.alert("Erro de Carregamento", "Não foi possível carregar alguns recursos visuais do aplicativo.");
        // Em caso de erro, garante que os fallbacks locais sejam usados
        setCurrentLogoSource(defaultLogoLocal);
        setCurrentFundoSource(defaultFundoLocal);
      } finally {
        setAppImagesReady(true); // Indica que as imagens foram processadas (baixadas/verificadas)
      }
    };

    initializeAppImages();
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

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedUser = userCredential.user;
      const userRef = ref(database, `usuarios/${loggedUser.uid}`);
      const snapshot = await get(userRef);
      const userData = snapshot.val();

      if (userData) {
        router.replace('/(tabs)/homeScreen');
      } else {
        setError('Usuário não encontrado.');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao fazer login.';
      if (error.code === 'auth/missing-password') {
        setError('Digite a senha para efetuar o login');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Usuário ou senha incorreta. Revise suas informações.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Digite seu email para redefinir a senha.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Verifique seu email', 'Email de recuperação enviado!');
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao enviar email de recuperação.';
      if (err.code === 'auth/user-not-found') {
        setError('Email não cadastrado.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Lógica do Carrossel de Patrocinadores (mantida, pois já estava funcional) ---
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const [measuredContentWidth, setMeasuredContentWidth] = useState(0);
  const [isUserInteractingWithSponsors, setIsUserInteractingWithSponsors] = useState(false);

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

  const handleSponsorsScrollBeginDrag = () => {
    setIsUserInteractingWithSponsors(true);
  };

  const handleSponsorsScrollEndDrag = (event: any) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.x;
    setIsUserInteractingWithSponsors(false);
  };
  const handleSponsorsMomentumScrollEnd = (event: any) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.x;
    setTimeout(() => {
      setIsUserInteractingWithSponsors(false);
    }, 100);
  };

  // --- Condição de carregamento inicial para as imagens e autenticação ---
  // Mudado `defaultFundoLocal` para `currentFundoSource` no loading, para que a imagem do fundo
  // já comece a ser baixada e mostrada o mais cedo possível.
  if (!appImagesReady || authLoading) {
    return (
      <ImageBackground source={currentFundoSource} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando recursos...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      // source agora é diretamente currentFundoSource, que já será { uri: string } ou o número do require
      source={currentFundoSource}
      style={styles.background}
    >
      <View style={styles.overlay}>
        <View style={styles.logoContainer}>
          {/* source agora é diretamente currentLogoSource */}
          <Image
            source={currentLogoSource}
            style={styles.logo}
            resizeMode="contain"
            // O onError não é mais necessário aqui pois currentLogoSource já trata o fallback
            // onError={(e) => console.warn("Erro ao carregar logo dinâmica:", e.nativeEvent.error)}
          />
        </View>

        <View style={styles.container}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!mostrarSenha}
            />
            <TouchableOpacity onPress={toggleMostrarSenha} style={styles.eyeIcon}>
              {mostrarSenha ? (
                <EyeOff size={24} color="#888" />
              ) : (
                <Eye size={24} color="#888" />
              )}
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.entrarButton, loading && styles.entrarButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading && !sponsorsLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.entrarText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePasswordReset} style={[styles.forgotPassword, loading && styles.buttonDisabled]} disabled={loading}>
            <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/cadastroScreen')} style={[styles.registerButton, loading && styles.buttonDisabled]} disabled={loading}>
            <Text style={styles.registerText}>Criar conta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.supportersContainer}>
          <Text style={styles.supportersTitle}>Apoio:</Text>
          {sponsorsLoading ? (
            <ActivityIndicator style={{ marginTop: 15 }} color="#fff" size="small" />
          ) : sponsorsError ? (
            <Text style={styles.supporterErrorText}>{sponsorsError}</Text>
          ) : sponsors.length > 0 ? (
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.supportersLogos}
              contentContainerStyle={styles.supportersLogosContent}
              onContentSizeChange={(width, height) => {
                setMeasuredContentWidth(width);
              }}
              onScrollBeginDrag={handleSponsorsScrollBeginDrag}
              onScrollEndDrag={handleSponsorsScrollEndDrag}
              onMomentumScrollEnd={handleSponsorsMomentumScrollEnd}
              scrollEventThrottle={16}
            >
              {sponsors.map((sponsor) => (
                sponsor.logoUrl ? (
                  <Image
                    key={sponsor.id}
                    source={{ uri: sponsor.logoUrl }}
                    style={[
                      styles.supporterLogo,
                    ]}
                    onError={(e) => console.warn(`Erro ao carregar logo do patrocinador ${sponsor.id}: ${sponsor.logoUrl}`, e.nativeEvent.error)}
                  />
                ) : null
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.supporterText}>Seja nosso apoiador!</Text>
          )}
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Cor de fundo para o estado de carregamento
  },
  loadingText: {
    marginTop: 10,
    color: '#007BFF', // Cor do texto de carregamento
    fontSize: 16,
  },
  logoContainer: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: '90%',
    height: '90%',
  },
  container: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 20,
    borderRadius: 12,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingLeft: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 12,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingLeft: 12,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    color: '#333',
  },
  error: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  entrarButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  entrarButtonDisabled: {
    backgroundColor: '#A0CFFF',
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  entrarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    marginTop: 18,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#007BFF',
    fontSize: 15,
  },
  registerButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  registerText: {
    color: '#007BFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  supportersContainer: {
    flex: 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  supportersLogos: {
    width: '100%',
  },
  supportersLogosContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  supporterText: {
    color: '#E0E0E0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  supporterErrorText: {
    color: '#FFD700',
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 15,
    marginTop: 10,
  },
  supporterLogo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginLeft: 10,
  }
});

export default LoginScreen;