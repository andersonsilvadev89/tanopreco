import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator, 
  TextInput,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { auth, database, adminDatabase } from '../../firebaseConfig'; 
import { ref, get, push, serverTimestamp, onValue } from 'firebase/database';
import { AppHeaderTitle } from '../components/shell/AppHeaderTitle';
import { DrawerMenu } from '../components/shell/DrawerMenu';
import { BRAND_COLORS } from '@/constants/BrandColors';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';

// Constantes de configuração do Firebase
const FIREBASE_COLLECTION = 'configuracoes_apps';
const TARGET_APP_NAME = "TaNoPreco"; // Nome do App cujas configurações queremos buscar

export default function Sobre() {
  const insets = useSafeAreaInsets();
  const [sugestao, setSugestao] = useState('');
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);
  
  // === ESTADOS PARA O TEXTO "SOBRE O APP" ===
  const [sobreAppTexto, setSobreAppTexto] = useState('');
  const [loadingSobreAppTexto, setLoadingSobreAppTexto] = useState(true);
  const [drawerMenuVisible, setDrawerMenuVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const screenWidth = Dimensions.get('window').width;
  
  // === useEffect para buscar o texto "Sobre o App" do Firebase (CORRIGIDO) ===
  useEffect(() => {
    // Referencia a coleção completa de configurações de apps
    const appsRef = ref(adminDatabase, FIREBASE_COLLECTION); 
    
    const unsubscribe = onValue(appsRef, (snapshot) => {
      const data = snapshot.val();
      let foundText: string | null = null;
      
      if (data) {
        const appIds = Object.keys(data);
        for (const id of appIds) {
          const app = data[id];
          // Procura o app com o nome exato e verifica se o campo de texto existe
          if (app && app.nomeApp === TARGET_APP_NAME && app.sobreEsteApp) {
            foundText = app.sobreEsteApp;
            break; // Encontramos, paramos a iteração
          }
        }
      }

      if (foundText) {
        setSobreAppTexto(foundText);
      } else {
        console.warn(
          `Texto 'sobreEsteApp' não encontrado para o app "${TARGET_APP_NAME}" em '${FIREBASE_COLLECTION}'.`
        );
        setSobreAppTexto("Informações sobre o app não disponíveis no momento. Verifique as configurações de 'sobreEsteApp' para o app 'TaNoPreco'."); // Texto de fallback
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

  const handleEnviarSugestao = async () => {
    if (sugestao.trim() === '') {
      Alert.alert("Campo Vazio", "Por favor, escreva sua sugestão ou reclamação.");
      return;
    }

    const user = auth.currentUser;
    /*if (!user) { essa verificação não condiz com este app!
      Alert.alert("Acesso Negado", "Você precisa estar logado para enviar feedback. Por favor, faça login e tente novamente.");
      return;
    }*/

    setEnviandoFeedback(true);
    try {
      const feedbackRef = ref(adminDatabase, 'sugestoesReclamacoes');
      await push(feedbackRef, {
        texto: sugestao.trim(),
        uidUsuario: user ? user.uid : 'anonimo',
        nomeUsuario: user && user.displayName ? user.displayName : (user && user.email ? user.email : 'Não informado'),
        timestamp: serverTimestamp(),
        nomeApp: TARGET_APP_NAME,
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/(tabs)/homeScreen');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Nao foi possivel sair da conta.');
    }
  };

  const handleMenuOpen = () => {
    setDrawerMenuVisible(true);
  };

  const handleMenuClose = () => {
    setDrawerMenuVisible(false);
  };

  const handleNavigateTo = (path: string, requiresAuth: boolean) => {
    if (requiresAuth && !auth.currentUser) {
      Alert.alert('Login necessário', 'Entre na sua conta para acessar esta área.');
      router.push('/(auth)/loginScreen');
      return;
    }

    router.push(path as any);
  };

  if (loadingSobreAppTexto) { 
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        <Text style={styles.loadingText}>Carregando informações do app...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeaderTitle
        title="Sobre"
        user={auth.currentUser}
        paddingTop={Math.max(insets.top, 8)}
        onBack={() => router.replace('/(tabs)/homeScreen')}
        onMenuOpen={handleMenuOpen}
        onLogout={handleLogout}
      />
      <DrawerMenu
        visible={drawerMenuVisible}
        onClose={handleMenuClose}
        user={auth.currentUser}
        onLogout={handleLogout}
        navigateTo={handleNavigateTo}
      />

      <View style={styles.contentArea}>
        <View style={styles.sectionWrapper}>
          <ScrollView contentContainerStyle={styles.scrollContentContainer}>
            <Text style={styles.title}> Sobre o TaNoPreco! </Text>

            <Text style={styles.paragraphText}>
              {sobreAppTexto}
            </Text>
            
          </ScrollView>
        </View>
      
        <View style={[styles.sectionWrapper, { flex: 0.6 }]}>
          <ScrollView contentContainerStyle={styles.scrollContentContainer}>
            <Text style={styles.title}>💡 Sugestões e Reclamações</Text>
            <TextInput 
              style={styles.textInputSugestao} 
              multiline 
              placeholder="Sua opinião é muito importante para nós! Identifique-se e conte-nos aqui sua sugestão ou problema..." 
              value={sugestao} 
              onChangeText={setSugestao} 
              placeholderTextColor={BRAND_COLORS.textMuted}
              editable={!enviandoFeedback} 
            />
            <TouchableOpacity 
              style={[styles.botaoEnviar, enviandoFeedback && styles.botaoDesabilitado]} 
              onPress={handleEnviarSugestao} 
              disabled={enviandoFeedback}
            >
              {enviandoFeedback ? (
                <ActivityIndicator size="small" color={BRAND_COLORS.white} />
              ) : (
                <Text style={styles.botaoEnviarTexto}>Enviar Feedback</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND_COLORS.surfaceSoft },
  contentArea: { flex: 1, paddingHorizontal: 10, paddingBottom: 10 },
  sectionWrapper: { flex: 1, marginTop: 10, backgroundColor: 'rgba(255, 255, 255, 1)', borderRadius: 10, overflow: 'hidden', borderColor: BRAND_COLORS.primaryDark, borderWidth:  1},
  scrollContentContainer: { padding: 15, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: BRAND_COLORS.primaryDeep, textAlign: 'center' },

  paragraphText: { fontSize: 16, color: BRAND_COLORS.text, textAlign: 'justify', lineHeight: 25, marginBottom: 15 },
  
  supportersContainer: { flex: 0.7, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  supportersTitle: { fontSize: 19, fontWeight: 'bold', color: '#FFFFFF', marginTop: 10, marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  supportersLogos: { width: '100%' },
  supportersLogosContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingVertical: 8 },
  supporterText: { color: '#E0E0E0', fontSize: 14, textAlign: 'center', marginTop: 10 },
  supporterErrorText: { color: '#FFC107', fontSize: 14, textAlign: 'center', marginHorizontal: 15, marginTop: 10 },
  supporterLogo: { width: 95, height: 95, resizeMode: 'contain', borderRadius: 10, backgroundColor: '#f8f9fa', marginLeft: 10, borderWidth: 1, borderColor: '#dee2e6' },

  textInputSugestao: { width: '100%', height: 100, borderColor: BRAND_COLORS.border, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, textAlignVertical: 'top', marginBottom: 10, backgroundColor: BRAND_COLORS.surface, color: BRAND_COLORS.text },
  botaoEnviar: { backgroundColor: BRAND_COLORS.primary, paddingVertical: 10, paddingHorizontal: 35, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: BRAND_COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, alignSelf: 'center', minWidth: 150 },
  botaoDesabilitado: { backgroundColor: '#95a5a6' },
  botaoEnviarTexto: { color: BRAND_COLORS.white, fontSize: 16, fontWeight: '600' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surfaceSoft,
  },
  loadingText: {
    marginTop: 10,
    color: BRAND_COLORS.primaryDeep,
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)', 
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});