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
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { auth, database, adminDatabase } from '../../firebaseConfig'; 
import { ref, get, push, serverTimestamp, onValue } from 'firebase/database';
import AdBanner from '../components/AdBanner'; 

const defaultFundoLocal = require('../../assets/images/fundo.png');

// Constantes de configuração do Firebase
const FIREBASE_COLLECTION = 'configuracoes_apps';
const TARGET_APP_NAME = "TaNoPreco"; // Nome do App cujas configurações queremos buscar

export default function Sobre() {
  const [sugestao, setSugestao] = useState('');
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);
  
  // === ESTADOS PARA O TEXTO "SOBRE O APP" ===
  const [sobreAppTexto, setSobreAppTexto] = useState('');
  const [loadingSobreAppTexto, setLoadingSobreAppTexto] = useState(true);

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

  if (loadingSobreAppTexto) { 
    return (
      <ImageBackground source={defaultFundoLocal} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando informações do app...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={defaultFundoLocal} 
      style={styles.container}
      resizeMode="cover"
    >
      <AdBanner />

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
              placeholder="Sua opinião é muito importante para nós! Conte aqui sua sugestão ou problema..." 
              value={sugestao} 
              onChangeText={setSugestao} 
              placeholderTextColor="#777" 
              editable={!enviandoFeedback} 
            />
            <TouchableOpacity 
              style={[styles.botaoEnviar, enviandoFeedback && styles.botaoDesabilitado]} 
              onPress={handleEnviarSugestao} 
              disabled={enviandoFeedback}
            >
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
  sectionWrapper: { flex: 1, marginTop: 10, backgroundColor: 'rgba(255, 255, 255, 1)', borderRadius: 10, overflow: 'hidden', borderColor: '#0056b3', borderWidth:  1},
  scrollContentContainer: { padding: 15, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50', textAlign: 'center' },

  paragraphText: { fontSize: 16, color: '#34495e', textAlign: 'justify', lineHeight: 25, marginBottom: 15 },
  
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
    color: '#01060aff',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)', 
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});