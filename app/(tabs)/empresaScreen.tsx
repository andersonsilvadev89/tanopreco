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
  TextInput,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { onValue, ref, set } from 'firebase/database';
import { onAuthStateChanged, Unsubscribe } from 'firebase/auth'; // Importando o onAuthStateChanged
import { auth, database } from '../../firebaseConfig';
import { MaskedTextInput } from 'react-native-mask-text';
import AdBanner from '../components/AdBanner';

const fundo = require('../../assets/images/fundo.png');

// Interfaces
interface UserProfile {
  nome: string;
  email: string;
  statusEmpresa?: 'Aguardando' | 'Aprovado' | 'Rejeitado';
}
interface CompanyRegistrationData {
  nomeEmpresa: string;
  cnpj: string | null;
  cpf: string | null;
  descricao: string;
  telefoneContato: string | null;
  emailContato: string | null;
  linkInstagram: string | null;
  status: 'Aguardando' | 'Aprovado' | 'Rejeitado';
  timestamp: number;
  userId: string;
}

const EmpresaScreen = () => {
  const [loadingUserStatus, setLoadingUserStatus] = useState(true);
  const [userCompanyStatus, setUserCompanyStatus] = useState<'Aguardando' | 'Aprovado' | 'Rejeitado' | null>(null);
  const [empresa, setEmpresa] = useState<Omit<CompanyRegistrationData, 'status' | 'timestamp' | 'userId'>>({
    nomeEmpresa: '',
    cnpj: '',
    cpf: '',
    descricao: '',
    telefoneContato: '',
    emailContato: '',
    linkInstagram: '',
  });
  const [formError, setFormError] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);

  // --- LÓGICA DE VERIFICAÇÃO DE STATUS ATUALIZADA ---
  useEffect(() => {
    let databaseListener: Unsubscribe | null = null;

    // Usando onAuthStateChanged para reagir em tempo real ao login/logout
    const authListener = onAuthStateChanged(auth, (user) => {
      // Se o listener do banco de dados já existir, remove-o para evitar duplicação
      if (databaseListener) {
        databaseListener();
      }

      if (user) {
        // Se o usuário ESTÁ logado, anexa o listener de dados
        setLoadingUserStatus(true);
        const userStatusRef = ref(database, `usuarios/${user.uid}`);
        
        databaseListener = onValue(userStatusRef, (snapshot) => {
          const status = snapshot.val()?.statusEmpresa || null;
          setUserCompanyStatus(status);
          if (status === 'Aprovado') {
            router.replace('/(empresa)/homeScreen');
          }
          setLoadingUserStatus(false);
        }, (error) => {
          // Este erro não deve mais acontecer no logout
          console.error("Erro ao ler status da empresa:", error);
          setLoadingUserStatus(false);
        });
      } else {
        // Se o usuário DESLOGOU, limpa os estados e não anexa listeners
        setUserCompanyStatus(null);
        setLoadingUserStatus(false);
      }
    });

    // Função de limpeza para remover TODOS os listeners quando a tela for desmontada
    return () => {
      authListener(); // Remove o listener de autenticação
      if (databaseListener) {
        databaseListener(); // Remove o listener do banco de dados, se ele existir
      }
    };
  }, []); // Array vazio garante que o efeito rode apenas na montagem/desmontagem

  const handleRegisterCompany = async () => {
    const userId = auth.currentUser?.uid; // Pega o userId atual no momento do clique
    if (!userId) {
      Alert.alert("Erro de autenticação", "Sua sessão expirou. Por favor, faça login novamente.");
      return;
    }

    setFormError('');
    if (!empresa.nomeEmpresa || !empresa.descricao || (!empresa.cnpj && !empresa.cpf)) {
      setFormError('Preencha os campos obrigatórios: Nome da Empresa, Descrição e ao menos um entre CNPJ e CPF.');
      return;
    }
    if (empresa.emailContato) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(empresa.emailContato)) {
            setFormError('Por favor, insira um formato de e-mail válido.');
            return;
        }
    }
    
    let processedInstagram: string | null = null;
    const rawInstagramInput = empresa.linkInstagram?.trim();
    if (rawInstagramInput) {
      const instagramUrlRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/;
      const match = rawInstagramInput.match(instagramUrlRegex);
      if (match && match[1]) {
        processedInstagram = match[1];
      } else {
        processedInstagram = rawInstagramInput.startsWith('@') ? rawInstagramInput.substring(1) : rawInstagramInput;
      }
    }
    
    setSubmittingForm(true);
    try {
      const solicitationRef = ref(database, `solicitacoesEmpresas/${userId}`);
      const newSolicitation = {
        nomeEmpresa: empresa.nomeEmpresa,
        cnpj: empresa.cnpj || null,
        cpf: empresa.cpf || null,
        descricao: empresa.descricao,
        telefoneContato: empresa.telefoneContato || null,
        emailContato: empresa.emailContato || null,
        linkInstagram: processedInstagram,
        status: 'Aguardando',
        timestamp: Date.now(),
        userId: userId,
      };
      await set(solicitationRef, newSolicitation);
      await set(ref(database, `usuarios/${userId}/statusEmpresa`), 'Aguardando');
      setUserCompanyStatus('Aguardando');
      Alert.alert('Sucesso', 'Sua solicitação foi enviada!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar sua solicitação.');
    } finally {
      setSubmittingForm(false);
    }
  };

  // --- RENDERIZAÇÃO ---
  if (loadingUserStatus) {
    return (
      <ImageBackground source={fundo} style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Verificando status...</Text>
        </View>
      </ImageBackground>
    );
  }

  if (userCompanyStatus === 'Aprovado') { return null; }

  return (
    <ImageBackground source={fundo} style={styles.background} resizeMode="cover">
      <AdBanner />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Área da Empresa</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {userCompanyStatus === 'Aguardando' ? (
            <View style={styles.statusMessageContainer}>
                <Text style={styles.statusTitle}>Solicitação Pendente</Text>
                <Text style={styles.statusText}>Sua solicitação foi enviada e está aguardando aprovação.</Text>
            </View>
          ) : userCompanyStatus === 'Rejeitado' ? (
             <View style={[styles.statusMessageContainer, styles.rejectedStatus]}>
                <Text style={styles.statusTitle}>Solicitação Rejeitada</Text>
                <Text style={styles.statusText}>Sua solicitação foi rejeitada. Por favor, revise os dados e tente novamente.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => setUserCompanyStatus(null)}>
                    <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contentContainer}>
              <Text style={styles.messageText}>Cadastre sua Empresa</Text>
              <Text style={styles.subMessageText}>Preencha os dados para solicitar acesso.</Text>
              {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}
              
              <TextInput style={styles.input} placeholder="Nome da Empresa*" value={empresa.nomeEmpresa} onChangeText={(text) => setEmpresa(p => ({ ...p, nomeEmpresa: text }))} />
              <MaskedTextInput style={styles.input} mask="99.999.999/9999-99" placeholder="CNPJ (opcional)" value={empresa.cnpj ?? ''} onChangeText={(text, rawText) => setEmpresa(p => ({ ...p, cnpj: rawText }))} keyboardType="numeric" />
              <MaskedTextInput style={styles.input} mask="999.999.999-99" placeholder="CPF (opcional)" value={empresa.cpf ?? ''} onChangeText={(text, rawText) => setEmpresa(p => ({ ...p, cpf: rawText }))} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Descrição*" value={empresa.descricao} onChangeText={(text) => setEmpresa(p => ({ ...p, descricao: text }))} multiline />
              <MaskedTextInput style={styles.input} mask="(99) 99999-9999" placeholder="Telefone de Contato (opcional)" value={empresa.telefoneContato ?? ''} onChangeText={(text, rawText) => setEmpresa(p => ({ ...p, telefoneContato: rawText }))} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="E-mail de Contato (opcional)" value={empresa.emailContato ?? ''} onChangeText={(text) => setEmpresa(p => ({ ...p, emailContato: text }))} keyboardType="email-address" autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Instagram (link ou @usuario)" value={empresa.linkInstagram ?? ''} onChangeText={(text) => setEmpresa(p => ({ ...p, linkInstagram: text }))} autoCapitalize="none" />
              
              <TouchableOpacity style={styles.submitButton} onPress={handleRegisterCompany} disabled={submittingForm}>
                {submittingForm ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Enviar Solicitação</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

// Estilos...
const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.4)' },
  backButton: { padding: 5 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginRight: 34 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#FFF' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  contentContainer: { width: '90%', backgroundColor: 'rgba(255,255,255,0.9)', padding: 20, borderRadius: 15, alignItems: 'center' },
  messageText: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  subMessageText: { fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center' },
  formErrorText: { color: 'red', marginBottom: 15, textAlign: 'center', fontSize: 14 },
  input: { width: '100%', backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#DDD', padding: 12, fontSize: 16, marginBottom: 15 },
  submitButton: { backgroundColor: '#007BFF', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  statusMessageContainer: { width: '90%', backgroundColor: 'rgba(255,255,255,0.9)', padding: 30, borderRadius: 15, alignItems: 'center' },
  statusTitle: { fontSize: 22, fontWeight: 'bold', color: '#007BFF', marginBottom: 15, textAlign: 'center' },
  statusText: { fontSize: 16, color: '#333', textAlign: 'center', lineHeight: 24, marginBottom: 10 },
  rejectedStatus: { borderColor: '#D32F2F', borderWidth: 1.5 },
  retryButton: { backgroundColor: '#FF9800', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginTop: 20 },
  retryButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});

export default EmpresaScreen;