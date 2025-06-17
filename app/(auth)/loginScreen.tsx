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
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorsLoading, setSponsorsLoading] = useState(true);
  const [sponsorsError, setSponsorsError] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width;

  const [request, response, promptAsync] = Google.useAuthRequest({
  // Use a nova credencial para Android
  androidClientId: '161717540109-gts7cr66n24eh9jlcqohk2voo072n5va.apps.googleusercontent.com',
  iosClientId: '161717540109-celcbtm24pemqrce1n2cbhiue390tt5q.apps.googleusercontent.com',
  // Mantenha a antiga para web/desenvolvimento
  webClientId: '161717540109-t6honnbr9s3m55qcngk6222ph3oa9g9k.apps.googleusercontent.com', 
});
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

  useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      const { idToken, accessToken } = response.authentication;
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      signInWithCredential(auth, credential)
        .then(async (userCredential) => {
          const loggedUser = userCredential.user;
          const userRef = ref(database, `usuarioTipoUsuario/${loggedUser.uid}`);
          const snapshot = await get(userRef);
          const userData = snapshot.val();

          if (userData && userData.tipoUsuario === 'cliente') {
            router.replace('/(tabs)/homeScreen');
          } else {
            Alert.alert('Usuário não autorizado', 'Este aplicativo é destinado a clientes.');
            await auth.signOut();
          }
        })
        .catch((err) => {
          const errorMessage = err.message || 'Erro ao fazer login com o Google.';
          setError(errorMessage);
        });
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

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedUser = userCredential.user;
      const userRef = ref(database, `usuarioTipoUsuario/${loggedUser.uid}`);
      const snapshot = await get(userRef);
      const userData = snapshot.val();

      if (userData) {
        router.replace('/(tabs)/homeScreen');
      } else {
        setError('Usuário não encontrado ou tipo de usuário inválido.');
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
    // --- Lógica do Carrossel de Patrocinadores ---
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollOffsetRef = useRef(0); // Guarda o offset atual da rolagem
    const animationFrameIdRef = useRef<number | null>(null); // Guarda o ID do requestAnimationFrame
    const [measuredContentWidth, setMeasuredContentWidth] = useState(0); // Largura do conteúdo da ScrollView
    const [isUserInteractingWithSponsors, setIsUserInteractingWithSponsors] = useState(false);
  
    useEffect(() => {
      // Cancela animação anterior se houver
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
  
      // Condições para não animar
      if (sponsors.length === 0 || !scrollViewRef.current || isUserInteractingWithSponsors || measuredContentWidth <= screenWidth) {
        // Se o conteúdo couber na tela e não estiver no início, rola para o início.
        if (measuredContentWidth <= screenWidth && scrollOffsetRef.current !== 0 && scrollViewRef.current) {
           scrollViewRef.current.scrollTo({ x: 0, animated: false });
           scrollOffsetRef.current = 0;
        }
        return;
      }
  
      let lastTimestamp = 0;
      const scrollSpeed = 20; // Pixels por segundo
  
      const animate = (timestamp: number) => {
        if (!lastTimestamp) {
          lastTimestamp = timestamp;
        }
        const deltaTimeInSeconds = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
  
        scrollOffsetRef.current += scrollSpeed * deltaTimeInSeconds;
  
        if (scrollOffsetRef.current >= measuredContentWidth) {
          // Quando o scroll ultrapassa a largura total do conteúdo,
          // significa que todo o conteúdo "original" já passou.
          // Para um loop suave, idealmente teríamos itens duplicados.
          // Com reset simples:
          scrollOffsetRef.current = scrollOffsetRef.current % measuredContentWidth; // Mantém a posição relativa no loop
          // Para um reset para o início absoluto:
          // scrollOffsetRef.current = 0;
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
      // Delay para retomar a animação e evitar conflito com possível onScrollEndDrag
      setTimeout(() => {
          setIsUserInteractingWithSponsors(false);
      }, 100); // Pequeno delay
    };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

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
            {loading && !sponsorsLoading ? (
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
    flex: 0.7, // Proporção da altura para esta seção
    justifyContent: 'center', // Centraliza o conteúdo (título + scrollview/texto) verticalmente
    alignItems: 'center', // Centraliza o conteúdo horizontalmente
    // paddingHorizontal: 15, // Removido ou ajustado, pois o ScrollView pode precisar de largura total
  },
  supportersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 5, // Espaçamento entre o título e a área das logos
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Estilo para o componente ScrollView
  supportersLogos: {
    width: '100%', // O ScrollView ocupa a largura total do seu container 
  },
  // Estilo para o contentContainerStyle do ScrollView (o conteúdo interno)
  supportersLogosContent: {
    flexDirection: 'row',   // Organiza as logos horizontalmente, lado a lado
    alignItems: 'center',   // Alinha as logos verticalmente ao centro dentro da faixa do ScrollView
    paddingHorizontal: 5,  // Espaçamento nas extremidades da lista de logos (antes da primeira e depois da última)
    paddingVertical: 5,     // Espaçamento vertical acima e abaixo das logos dentro da área de scroll
  },
  supporterText: {
    color: '#E0E0E0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10, // Espaçamento do título se esta mensagem aparecer
  },
  supporterErrorText: {
    color: '#FFD700',
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 15, // Para não colar nas bordas
    marginTop: 10, // Espaçamento do título se esta mensagem aparecer
  },
  supporterLogo: {
    width: 120,
    height: 120, // Altura fixa para as logos. Ajuste conforme o design desejado.
    resizeMode: 'contain', // Garante que a logo inteira seja visível e não distorcida
    borderRadius: 10,
    backgroundColor: '#fff',
    marginLeft: 10,
  }
});

export default LoginScreen;