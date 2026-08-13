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
import { auth, database } from '../../firebaseConfig';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { router } from 'expo-router';
import { ref, get } from 'firebase/database';
import { Feather } from "@expo/vector-icons";
import AdBanner from "../components/AdBanner";
import { BRAND_COLORS } from "@/constants/BrandColors";


const defaultLogoLocal = require('../../assets/images/logoEvento.png');

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);

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
      <AdBanner />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={styles.logoContainer}>
            <Image
              source={defaultLogoLocal}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

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
              {loading? (
                <ActivityIndicator color={BRAND_COLORS.white} />
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
    backgroundColor: BRAND_COLORS.surfaceSoft,
  },
  overlay: {
    flex: 1,
    backgroundColor: BRAND_COLORS.overlay,
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
  logoContainer: {
    width: '90%', // Usa a largura do logo para centralizar
    alignItems: 'center', // Centraliza a imagem dentro do container
    marginBottom: 20, // Adiciona espaço entre a logo e o formulário
  },
  logo: {
    width: '100%',
    height: 300,
  },
  formContainer: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 20,
    borderRadius: 12,
    width: '90%', // Mantém a largura do formulário
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