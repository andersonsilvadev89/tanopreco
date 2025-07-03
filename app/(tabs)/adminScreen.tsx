import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
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

const fundo = require('../../assets/images/fundo.png');

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
  const [loading, setLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null); // Mantido para exibir na tela de 'Aguardando' se já existir
  const [isSubmitting, setIsSubmitting] = useState(false);
  // REMOVIDO: O estado para o cargo selecionado não é mais necessário.
  // const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let databaseListener: Unsubscribe | null = null;
    const authListener = onAuthStateChanged(auth, (user) => {
      if (databaseListener) {
        databaseListener();
      }

      if (user) {
        setLoading(true);
        const userRef = ref(database, `usuarios/${user.uid}`);
        
        databaseListener = onValue(userRef, (snapshot) => {
          const userData = snapshot.val() as UserProfile;
          const status = userData?.statusAdmin || null;
          const role = userData?.tipoUsuario || null;
          
          setAdminStatus(status);
          setUserRole(role); // Ainda pode ser útil para mostrar o cargo se já foi definido

          if (status === 'Aprovado') {
            router.replace('/(admin)/homeScreen');
          }
          setLoading(false);
        }, (error) => {
          console.error("Erro ao ler status de admin:", error);
          setLoading(false);
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

  // --- LÓGICA DE SOLICITAÇÃO ALTERADA ---
  const handleRequestAccess = async () => {
    const userId = auth.currentUser?.uid;

    // REMOVIDA: Verificação do cargo selecionado
    // if (!selectedRole) { ... }

    if (!userId) {
      Alert.alert('Erro', 'Usuário não autenticado. Por favor, faça login.');
      return;
    }

    setIsSubmitting(true);
    try {
      // ALTERADO: O objeto 'updates' agora só envia o status.
      // O 'tipoUsuario' não é mais definido nesta tela.
      const updates: { [key: string]: any } = {};
      updates[`/usuarios/${userId}/statusAdmin`] = 'Aguardando';
      
      await update(ref(database), updates);
      
      setAdminStatus('Aguardando');
      // REMOVIDO: setUserRole não é mais chamado com o cargo selecionado.
      // setUserRole(selectedRole); 
      Alert.alert('Sucesso', 'Sua solicitação de acesso foi enviada.');
    } catch (error) {
      console.error('Erro ao solicitar acesso:', error);
      Alert.alert('Erro', 'Não foi possível enviar sua solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERIZAÇÃO ALTERADA ---
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Verificando permissões...</Text>
        </View>
      );
    }

    switch (adminStatus) {
      case 'Aguardando':
        return (
          <View style={styles.statusMessageContainer}>
            <Text style={styles.statusTitle}>Solicitação Pendente</Text>
            {/* ALTERADO: Mensagem simplificada */}
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
                // REMOVIDO: Não precisa mais resetar o cargo selecionado
                // setSelectedRole(null);
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
            {/* ALTERADO: Texto de instrução simplificado */}
            <Text style={styles.subMessageText}>
              Clique no botão abaixo para solicitar acesso à área restrita.
            </Text>

            {/* REMOVIDO: Container com os botões de seleção de cargo */}
            {/* <View style={styles.roleSelectionContainer}> ... </View> */}

            {/* ALTERADO: Botão de envio agora não depende mais do 'selectedRole' */}
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
    <ImageBackground source={fundo} style={styles.background} resizeMode="cover">
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

// Estilos (sem alterações, mas o botão desabilitado foi simplificado para referência)
const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.4)' },
  backButton: { padding: 5 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginRight: 34 },
  contentWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#FFF' },
  contentContainer: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(255,255,255,0.85)', padding: 25, borderRadius: 15, alignItems: 'center' },
  messageText: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  subMessageText: { fontSize: 16, color: '#666', marginBottom: 25, textAlign: 'center', lineHeight: 24 }, // Aumentei o marginBottom
  // Estilos de 'role' foram removidos da lógica, mas podem ser mantidos no StyleSheet sem problemas
  roleSelectionContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 25 },
  roleButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, borderColor: '#007BFF' },
  roleButtonSelected: { backgroundColor: '#007BFF' },
  roleButtonText: { color: '#007BFF', fontSize: 15, fontWeight: 'bold' },
  roleButtonTextSelected: { color: '#FFF' },
  submitButton: { backgroundColor: '#007BFF', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', justifyContent: 'center', width: '100%' },
  // O estilo 'submitButtonDisabled' ainda pode ser útil se você desabilitar o botão enquanto 'isSubmitting' for true.
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