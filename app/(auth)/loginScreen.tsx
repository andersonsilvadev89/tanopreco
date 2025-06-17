import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { auth, database, administrativoDatabase } from '../../firebaseConfig';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import { ref, get } from 'firebase/database';
import { Eye, EyeOff } from 'lucide-react-native';
// A importação do AuthSession pode não ser mais necessária se não for usada diretamente
// import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => { // A prop 'navigation' pode ser removida se não for usada
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  // REMOVIDO: O estado de autenticação agora é gerenciado globalmente no _layout.tsx
  // const [user, setUser] = useState<any>(null);
  // const [authLoading, setAuthLoading] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorsLoading, setSponsorsLoading] = useState(true);
  const [sponsorsError, setSponsorsError] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width;

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '161717540109-gts7cr66n24eh9jlcqohk2voo072n5va.apps.googleusercontent.com',
    iosClientId: '161717540109-celcbtm24pemqrce1n2cbhiue390tt5q.apps.googleusercontent.com',
    webClientId: '161717540109-t6honnbr9s3m55qcngk6222ph3oa9g9k.apps.googleusercontent.com',
  });

  const toggleMostrarSenha = () => {
    setMostrarSenha(!mostrarSenha);
  };

  // REMOVIDO: O listener onAuthStateChanged foi movido para o hook useAuth e usado no _layout.tsx.
  // Isso centraliza a lógica de autenticação.
  /*
  const handleAuthStateChanged = useCallback((authUser: any) => {
    setUser(authUser);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(handleAuthStateChanged);
    return () => unsubscribe();
  }, [handleAuthStateChanged]);
  */

  // MODIFICADO: Este useEffect agora apenas lida com a autenticação no Firebase.
  // Ele não faz mais o redirecionamento. O _layout.tsx fará isso ao detectar a mudança de estado.
  useEffect(() => {
    if (loading) return; // Evita múltiplas chamadas enquanto uma operação está em andamento

    if (response?.type === 'success' && response.authentication) {
      setLoading(true); // Inicia o loading para a operação do Firebase
      const { idToken, accessToken } = response.authentication;
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      
      signInWithCredential(auth, credential)
        .catch((err) => {
          const errorMessage = err.message || 'Erro ao fazer login com o Google.';
          setError(errorMessage);
          console.error("Erro no signInWithCredential:", err);
        })
        .finally(() => {
            setLoading(false); // Finaliza o loading
        });
    } else if (response?.type === 'error') {
        setError('Falha na autenticação com o Google. Tente novamente.');
        console.error("Google Auth Error:", response.error);
    }
  }, [response]);

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
  
  // MODIFICADO: A função de login agora apenas tenta autenticar.
  // Ela não verifica dados do usuário nem redireciona. O _layout.tsx cuidará disso.
  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // Apenas tenta fazer o login. Se for bem-sucedido, o listener onAuthStateChanged no _layout irá disparar.
      await signInWithEmailAndPassword(auth, email, password);
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

  // --- Lógica do Carrossel de Patrocinadores (sem alterações) ---
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

  // REMOVIDO: O _layout agora mostra um loading inicial.
  // A tela de login só será renderizada quando o app já souber que o usuário está deslogado.
  /*
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }
  */

  return (
    <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
      <View style={styles.overlay}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logomarcaMenor.png')}
            style={styles.logo}
            resizeMode="contain"
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
            {loading ? ( // Simplificado: mostra loading para qualquer operação
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.entrarText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => promptAsync()}
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            disabled={loading}
          >
            <Text style={styles.googleButtonText}>Entrar com Google</Text>
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
              onContentSizeChange={(width) => {
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
                    style={styles.supporterLogo}
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
  // Seus estilos permanecem os mesmos, sem alterações.
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
    backgroundColor: '#FFFFFF',
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
  googleButton: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: '#DB4437',
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
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