import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ref, update, onValue } from 'firebase/database';
import { onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { auth, database } from '../../firebaseConfig';
import AdBanner from '../components/AdBanner';

// --- Importar o gerenciador de imagens para o fundo ---
import { checkAndDownloadImages } from '../../utils/imageManager'; // Ajuste o caminho

// --- URL padrão de fallback para o fundo local ---
const defaultFundoLocal = require('../../assets/images/fundo.png');
// REMOVIDO: const fundo = require('../../assets/images/fundo.png'); // Não é mais necessário

// Tipos (sem alterações)
type UserRole = "Administrador" | "Gerente";
type AdminStatus = "Aprovado" | "Aguardando" | "Rejeitado";

interface UserProfile {
  nome: string;
  email: string;
  tipoUsuario?: UserRole;
  statusAdmin?: AdminStatus;
}

const AdminScreen = () => {
  const [loading, setLoading] = useState(true); // Controla o carregamento dos DADOS do usuário/status
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Novos estados para o carregamento da imagem de fundo dinâmica ---
  const [fundoAppReady, setFundoAppReady] = useState(false); // Controla o carregamento do FUNDO DO APP
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  // --- NOVO useEffect para carregar a imagem de fundo dinâmica ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na AdminScreen:", error);
        setCurrentFundoSource(defaultFundoLocal); // Em caso de erro, usa o fallback local
      } finally {
        setFundoAppReady(true); // Indica que o fundo foi processado
      }
    };
    loadFundoImage();
  }, []); // Executa apenas uma vez ao montar o componente

  useEffect(() => {
    let databaseListener: Unsubscribe | null = null;
    const authListener = onAuthStateChanged(auth, (user) => {
      if (databaseListener) {
        databaseListener();
      }

      if (user) {
        setLoading(true); // Inicia o loading dos dados do usuário
        const userRef = ref(database, `usuarios/${user.uid}`);
        
        databaseListener = onValue(userRef, (snapshot) => {
          const userData = snapshot.val() as UserProfile;
          const status = userData?.statusAdmin || null;
          const role = userData?.tipoUsuario || null;
          
          setAdminStatus(status);
          setUserRole(role);

          if (status === 'Aprovado') {
            router.replace('/(admin)/homeScreen');
          }
          setLoading(false); // <--- IMPORTANTE: Finaliza o loading dos DADOS DO USUÁRIO
        }, (error) => {
          console.error("Erro ao ler status de admin:", error);
          setLoading(false); // Em caso de erro, também finaliza o loading
        });
      } else {
        setLoading(false);
        setAdminStatus(null);
        setUserRole(null);
      }
    });

    return () => {
      authListener();
      if (databaseListener) {
        databaseListener();
      }
    };
  }, []);

  const handleRequestAccess = async () => {
    const userId = auth.currentUser?.uid;

    if (!userId) {
      Alert.alert('Erro', 'Usuário não autenticado. Por favor, faça login.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: { [key: string]: any } = {};
      updates[`/usuarios/${userId}/statusAdmin`] = 'Aguardando';
      
      await update(ref(database), updates);
      
      setAdminStatus('Aguardando');
      Alert.alert('Sucesso', 'Sua solicitação de acesso foi enviada.');
    } catch (error) {
      console.error('Erro ao solicitar acesso:', error);
      Alert.alert('Erro', 'Não foi possível enviar sua solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    // --- Condição de carregamento geral: Espera os dados do usuário E o fundo do app ---
    if (loading || !fundoAppReady) {
      return (
        // O fundo desta tela de loading agora também é o fundo dinâmico
        <ImageBackground source={currentFundoSource} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Verificando permissões...</Text>
        </ImageBackground>
      );
    }

    switch (adminStatus) {
      case 'Aguardando':
        return (
          <View style={styles.statusMessageContainer}>
            <Text style={styles.statusTitle}>Solicitação Pendente</Text>
            <Text style={styles.statusText}>
              Sua solicitação de acesso foi enviada e está aguardando a aprovação.
            </Text>
          </View>
        );

      case 'Rejeitado':
        return (
          <View style={[styles.statusMessageContainer, styles.rejectedStatus]}>
            <Text style={styles.statusTitle}>Acesso Rejeitado</Text>
            <Text style={styles.statusText}>
              Sua solicitação de acesso foi rejeitada.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setAdminStatus(null);
              }}
            >
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.messageText}>Acesso Administrativo</Text>
            <Text style={styles.subMessageText}>
              Clique no botão abaixo para solicitar acesso à área restrita.
            </Text>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleRequestAccess}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar Solicitação</Text>
              )}
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <ImageBackground source={currentFundoSource} style={styles.background} resizeMode="cover">
      <AdBanner />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Área de Acesso</Text>
        </View>
        
        <View style={styles.contentWrapper}>
          {renderContent()}
        </View>

      </SafeAreaView>
    </ImageBackground>
  );
};

// Estilos
const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.4)' },
  backButton: { padding: 5 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginRight: 34 },
  contentWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingContainer: { 
    flex: 1, // Ocupa todo o espaço
    justifyContent: 'center', 
    alignItems: 'center',
    // O fundo já é o ImageBackground pai, então não precisa de backgroundColor aqui
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)', // Sombra para legibilidade
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  contentContainer: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(255,255,255,0.85)', padding: 25, borderRadius: 15, alignItems: 'center' },
  messageText: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  subMessageText: { fontSize: 16, color: '#666', marginBottom: 25, textAlign: 'center', lineHeight: 24 },
  submitButton: { backgroundColor: '#007BFF', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', justifyContent: 'center', width: '100%' },
  submitButtonDisabled: { backgroundColor: '#A9A9A9' },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  statusMessageContainer: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(255,255,255,0.9)', padding: 30, borderRadius: 15, alignItems: 'center' },
  statusTitle: { fontSize: 22, fontWeight: 'bold', color: '#007BFF', marginBottom: 15, textAlign: 'center' },
  statusText: { fontSize: 16, color: '#333', textAlign: 'center', lineHeight: 24 },
  rejectedStatus: { borderColor: '#D32F2F', borderWidth: 1.5 },
  retryButton: { backgroundColor: '#FF9800', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginTop: 20 },
  retryButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});

export default AdminScreen;