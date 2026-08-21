import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  TextInput,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import Constants from 'expo-constants';
import { auth, database } from '../../firebaseConfig';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { router } from 'expo-router';
import { ref, get, set, update } from 'firebase/database';
import { Feather, Ionicons } from "@expo/vector-icons";
import { AppHeaderTitle } from "../components/shell/AppHeaderTitle";
import { BRAND_COLORS } from "@/constants/BrandColors";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildSocialUserProfile } from "./socialUserDefaults";

const defaultLogoLocal = require('../../assets/images/logoEvento.png');
const isExpoGo = Constants.appOwnership === 'expo';
const webClientId =
  (Constants.expoConfig?.extra?.googleWebClientId as string | undefined) ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '';

const GOOGLE_STATUS_CODES = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

const googleSigninModule = (() => {
  if (isExpoGo) {
    return null;
  }

  try {
    return require('@react-native-google-signin/google-signin');
  } catch (error) {
    console.warn('Google Sign-In indisponivel no binario atual:', error);
    return null;
  }
})();

const GoogleSignin = googleSigninModule?.GoogleSignin ?? null;
const statusCodes = googleSigninModule?.statusCodes ?? GOOGLE_STATUS_CODES;

const appleAuthenticationModule = (() => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    return require('expo-apple-authentication');
  } catch (error) {
    console.warn('Apple Sign-In indisponivel no binario atual:', error);
    return null;
  }
})();

const AppleAuthentication = appleAuthenticationModule ?? null;

if (GoogleSignin) {
  GoogleSignin.configure({
    webClientId,
  });
}

const LoginScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const showGoogleButton = Platform.OS === 'android' || Platform.OS === 'ios';
  const isGoogleLoginAvailable = !!GoogleSignin && !isExpoGo;
  const showAppleButton = Platform.OS === 'ios';
  const isAppleLoginAvailable = Platform.OS === 'ios' && !!AppleAuthentication;
  const appleButtonLabel = isAppleLoginAvailable ? 'Entrar com Apple' : 'Apple (build nativa)';

  const toggleMostrarSenha = () => {
    setMostrarSenha(!mostrarSenha);
  };

  const completeSocialLogin = useCallback(async (loggedUser: any) => {
    const userRef = ref(database, `usuariosEmpresa/${loggedUser.uid}`);
    const snapshot = await get(userRef);
    const userData = snapshot.val() ?? {};
    const profile = buildSocialUserProfile(loggedUser, userData);

    const profileNeedsOnboarding = !profile.nome || !profile.telefone;

    if (!snapshot.exists()) {
      await set(userRef, profile);
    } else if (profileNeedsOnboarding) {
      const updates: Record<string, any> = {};

      Object.entries(profile).forEach(([key, value]) => {
        const hasValue = value !== null && value !== undefined && value !== '';
        if ((userData[key] === undefined || userData[key] === null || userData[key] === '') && hasValue) {
          updates[key] = value;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(userRef, updates);
      }
    } else {
      const updates: Record<string, any> = {};

      Object.entries(profile).forEach(([key, value]) => {
        if (userData[key] === undefined || userData[key] === null) {
          updates[key] = value;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(userRef, updates);
      }
    }

    router.replace('/(empresa)/homeScreen');
  }, []);

  const handleAuthStateChanged = useCallback((authUser: any) => {
    setUser(authUser);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(handleAuthStateChanged);
    return () => unsubscribe();
  }, [handleAuthStateChanged]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const loggedUser = userCredential.user;
      const userRef = ref(database, `usuariosEmpresa/${loggedUser.uid}`);
      const snapshot = await get(userRef);
      const userData = snapshot.val();

      if (userData) {
        router.replace('/(empresa)/homeScreen');
      } else {
        setError('Usuário não encontrado.');
      }
    } catch (error: any) {
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedEmail && ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(error.code)) {
        try {
          const signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
          const hasGoogleProvider = signInMethods.includes('google.com');
          const hasAppleProvider = signInMethods.includes('apple.com');
          const hasPasswordProvider = signInMethods.includes('password');

          if (hasGoogleProvider && !hasPasswordProvider) {
            setError('Esta conta foi criada com Google. Para entrar novamente, use o mesmo provedor.');
            return;
          }

          if (hasAppleProvider && !hasPasswordProvider) {
            setError('Esta conta foi criada com Apple. Para entrar novamente, use o mesmo provedor.');
            return;
          }
        } catch (providerError) {
          console.warn('Nao foi possivel verificar os provedores de login:', providerError);
        }
      }

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

  const handleGoogleLogin = async () => {
    if (!isGoogleLoginAvailable) {
      setError('Login com Google indisponivel no Expo Go. Use uma build de desenvolvimento para testar este fluxo.');
      return;
    }

    if (!webClientId || webClientId === 'COLE_SEU_WEB_CLIENT_ID_AQUI') {
      setError('Configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID para habilitar o login com Google.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (GoogleSignin) {
        try {
          await GoogleSignin.signOut();
        } catch (signOutError) {
          console.warn('Nao foi possivel limpar sessao do Google Sign-In:', signOutError);
        }

        await GoogleSignin.hasPlayServices();
      }

      const response = await GoogleSignin?.signIn();
      if (response?.type !== 'success') {
        setError('Login cancelado pelo usuário.');
        return;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        setError('Não foi possível obter o token do Google.');
        return;
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      await completeSocialLogin(userCredential.user);
    } catch (error: any) {
      console.error('Erro no login com Google:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setError('Login cancelado pelo usuário.');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setError('Login em progresso...');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services não disponível.');
      } else {
        setError('Erro ao fazer login com Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (!isAppleLoginAvailable || !AppleAuthentication) {
      setError('Login com Apple disponível apenas no iOS com build compatível.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const appleCredentialResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const idToken = appleCredentialResponse.identityToken;
      if (!idToken) {
        setError('Não foi possível obter o token da Apple.');
        return;
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({ idToken });
      const userCredential = await signInWithCredential(auth, credential);
      await completeSocialLogin(userCredential.user);
    } catch (error: any) {
      console.error('Erro no login com Apple:', error);
      if (error.code === 'ERR_REQUEST_CANCELED') {
        setError('Login com Apple cancelado pelo usuário.');
      } else {
        setError('Erro ao fazer login com Apple. Tente novamente.');
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
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
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

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        <Text style={styles.loadingText}>Carregando recursos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <AppHeaderTitle
        title="Entrar"
        user={null}
        paddingTop={Math.max(insets.top, 8)}
        onBack={() => router.replace('/(tabs)/homeScreen')}
        onMenuOpen={() => {}}
        onLogout={() => {}}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onSubmitEditing={handleLogin}
              returnKeyType="next"
            />
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!mostrarSenha}
                onSubmitEditing={handleLogin}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={toggleMostrarSenha} style={styles.eyeIcon}>
                {mostrarSenha ? (
                  <Feather name="eye-off" size={24} color={BRAND_COLORS.iconMuted} />
                ) : (
                  <Feather name="eye" size={24} color={BRAND_COLORS.iconMuted} />
                )}
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.entrarButton, loading && styles.entrarButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={BRAND_COLORS.white} />
              ) : (
                <Text style={styles.entrarText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou continue com</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtonsContainer}>
              {showGoogleButton && (
                <TouchableOpacity
                  style={[
                    styles.socialButton,
                    styles.googleButton,
                    (loading || !isGoogleLoginAvailable) && styles.buttonDisabled,
                  ]}
                  onPress={handleGoogleLogin}
                  disabled={loading || !isGoogleLoginAvailable}
                >
                  <Feather name="chrome" size={20} color={BRAND_COLORS.text} />
                  <Text style={styles.googleButtonText}>
                    {isGoogleLoginAvailable ? 'Entrar com Google' : 'Google (Expo Go)'}
                  </Text>
                </TouchableOpacity>
              )}

              {showAppleButton && (
                <TouchableOpacity
                  style={[
                    styles.socialButton,
                    styles.appleButton,
                    (loading || !isAppleLoginAvailable) && styles.buttonDisabled,
                  ]}
                  onPress={handleAppleLogin}
                  disabled={loading || !isAppleLoginAvailable}
                >
                  <Ionicons name="logo-apple" size={20} color={BRAND_COLORS.white} />
                  <Text style={styles.appleButtonText}>
                    {appleButtonLabel}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={handlePasswordReset} style={[styles.forgotPassword, loading && styles.buttonDisabled]} disabled={loading}>
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/cadastroScreen')} style={[styles.registerButton, loading && styles.buttonDisabled]} disabled={loading}>
              <Text style={styles.registerText}>Criar conta</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => router.push('/(tabs)/homeScreen')} style={[styles.homeButton, loading && styles.buttonDisabled]} disabled={loading}>
              <Text style={styles.homeText}>Voltar para a área de ofertas!</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: BRAND_COLORS.overlay,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center', // Centraliza verticalmente
    alignItems: 'center', // Centraliza horizontalmente
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
  },
  loadingText: {
    marginTop: 10,
    color: BRAND_COLORS.primaryDeep,
    fontSize: 16,
  },
  formContainer: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 20,
    borderRadius: 12,
    width: '95%', // Mantém a largura do formulário
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderColor: BRAND_COLORS.border,
    borderWidth: 1,
    marginBottom: 15,
    paddingLeft: 12,
    borderRadius: 8,
    backgroundColor: BRAND_COLORS.surface,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: BRAND_COLORS.text,
  },
  eyeIcon: {
    padding: 12,
  },
  input: {
    height: 50,
    borderColor: BRAND_COLORS.border,
    borderWidth: 1,
    marginBottom: 15,
    paddingLeft: 12,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: BRAND_COLORS.surface,
    color: BRAND_COLORS.text,
  },
  error: {
    color: BRAND_COLORS.danger,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  entrarButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: BRAND_COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  entrarButtonDisabled: {
    backgroundColor: '#8EB1EA',
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  entrarText: {
    color: BRAND_COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  socialButtonsContainer: {
    gap: 12,
    width: '100%',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButton: {
    backgroundColor: BRAND_COLORS.white,
    borderColor: '#E5E7EB',
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
  },
  appleButton: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  appleButtonText: {
    color: BRAND_COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  forgotPassword: {
    marginTop: 18,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: BRAND_COLORS.primaryDark,
    fontSize: 15,
  },
  registerButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  homeButton: {
    marginTop: 18,
    backgroundColor: BRAND_COLORS.success,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: BRAND_COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  homeText: {
    color: BRAND_COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerText: {
    color: BRAND_COLORS.primaryDark,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;