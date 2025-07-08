import React, { useState, useEffect } from 'react'; // Adicionado useEffect
import {
  View,
  Alert,
  TextInput,
  Button,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions, // Adicionado Dimensions, se já não estivesse
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth, database } from '../../firebaseConfig';
import { ref, set } from 'firebase/database';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Eye, EyeOff } from 'lucide-react-native';
import { MaskedTextInput } from 'react-native-mask-text';
import { router } from 'expo-router';
import AdBanner from '../components/AdBanner'; // AdBanner de volta
import { checkAndDownloadImages } from '../../utils/imageManager'; // Ajuste o caminho

const defaultFundoLocal = require('../../assets/images/fundo.png');

export default function CadastroScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [imagem, setImagem] = useState<string | null>(null); // URI local da imagem de perfil
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [termoAceito, setTermoAceito] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // --- Novos estados para o carregamento da imagem de fundo dinâmica ---
  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  const camposPreenchidos = () => nome && email && senha && confirmarSenha;

  // --- useEffect para carregar a imagem de fundo dinâmica ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        // Chamamos checkAndDownloadImages, mas só usaremos a URL de fundo (a logo não é relevante aqui)
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na CadastroScreen:", error);
        setCurrentFundoSource(defaultFundoLocal); // Em caso de erro, usa o fallback local
      } finally {
        setFundoAppReady(true); // Indica que o fundo foi processado
      }
    };
    loadFundoImage();
  }, []); // Executa apenas uma vez ao montar o componente

  const selecionarImagem = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Você precisa permitir o acesso à galeria para selecionar uma foto.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Imagem de perfil geralmente quadrada
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImagem(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível abrir a galeria de imagens.");
    }
  };

  const tirarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Você precisa permitir o acesso à câmera para tirar uma foto.');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImagem(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível abrir a câmera.");
    }
  };

  const handleSelecionarFoto = () => {
    Alert.alert('Escolher Foto de Perfil', 'Como você gostaria de adicionar sua foto?',
      [
        { text: 'Tirar Foto', onPress: tirarFoto },
        { text: 'Selecionar da Galeria', onPress: selecionarImagem },
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };
  
  // --- A função uploadImagem ORIGINAL está de volta, sem relação com presets de Admin ---
  const uploadImagem = async () => {
    if (!imagem) return null;
    const formData = new FormData();
    formData.append('file', { uri: imagem, type: 'image/jpeg', name: 'perfil.jpg' } as any);
    formData.append('upload_preset', 'expocrato'); // Usando o preset 'expocrato' padrão para perfil, como estava antes.
                                                  // Ou crie um específico para perfil se quiser regras diferentes.
    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/dz37srew5/image/upload', { // URL Cloudinary original
        method: 'POST', body: formData
      });
      const data = await response.json();
      return data.secure_url || '';
    } catch (error: any) {
      Alert.alert('Erro', 'Erro ao enviar imagem de perfil. Tente novamente.');
      return '';
    }
  };

  const cadastrarUsuario = async () => {
    if (!camposPreenchidos()) {
      setErro('Preencha os campos obrigatórios: Nome, Email, Senha e Confirmar Senha.');
      return;
    }
    if (!termoAceito) {
      setErro('Você precisa aceitar o termo para continuar.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem!');
      return;
    }
    setLoading(true);
    setErro('');

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        setErro('Email já cadastrado em outra conta.');
        setLoading(false);
        return;
      }
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const userId = userCredential.user.uid;
      const imageUrl = await uploadImagem(); // Chama a função de upload de imagem de perfil

      // --- LÓGICA DO INSTAGRAM PADRONIZADA (INÍCIO) ---
      let processedInstagram: string | null = null;
      const rawInstagramInput = instagram?.trim();

      if (rawInstagramInput) {
        const instagramUrlRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/;
        const match = rawInstagramInput.match(instagramUrlRegex);

        if (match && match[1]) {
          processedInstagram = match[1];
        } else {
          processedInstagram = rawInstagramInput.startsWith('@') ? rawInstagramInput.substring(1) : rawInstagramInput;
        }
      }
      // --- LÓGICA DO INSTAGRAM PADRONIZADA (FIM) ---

      await set(ref(database, 'usuarios/' + userId), {
        nome,
        email,
        telefone: telefone || null,
        instagram: processedInstagram,
        imagem: imageUrl,
      });

      Alert.alert('Sucesso', 'Cadastro realizado com sucesso!');
      setNome('');
      setEmail('');
      setTelefone('');
      setInstagram('');
      setSenha('');
      setConfirmarSenha('');
      setImagem(null);
      setTermoAceito(false);
      router.replace('/(auth)/loginScreen');
    } catch (error: any) {
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Condição de carregamento da imagem de fundo ---
  if (!fundoAppReady) {
    return (
      <ImageBackground source={defaultFundoLocal} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Preparando tela de cadastro...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={currentFundoSource} style={styles.background}>
      <AdBanner />
      
      <KeyboardAwareScrollView 
        contentContainerStyle={styles.scrollContent} 
        enableOnAndroid
        keyboardShouldPersistTaps="handled" 
      >
        <View style={styles.container}>
          <Text style={styles.title}>Criar Conta</Text>

          <TouchableOpacity style={styles.profileImageContainer} onPress={handleSelecionarFoto}>
            {imagem ? (
              <Image source={{ uri: imagem }} style={styles.profileImage} />
            ) : (
              <Text style={styles.addPhotoText}>Adicionar Foto</Text>
            )}
          </TouchableOpacity>
          
          <TextInput 
            placeholder="Nome Completo*"
            value={nome}
            onChangeText={setNome}
            style={styles.input}
            placeholderTextColor='#666'
          />
          <TextInput
            placeholder="Email*"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            placeholderTextColor='#666'
          />
          <MaskedTextInput
            mask="(99) 99999-9999"
            value={telefone}
            onChangeText={(text) => setTelefone(text)}
            placeholder="Telefone (opcional)" 
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor='#666'
          />
          <TextInput
            placeholder="Instagram (opcional)"
            value={instagram}
            onChangeText={setInstagram}
            autoCapitalize="none"
            style={styles.input}
            placeholderTextColor='#666'
          />
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Senha*"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!mostrarSenha}
              style={styles.inputSenha}
              placeholderTextColor='#666'
            />
            <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)} style={styles.eyeIcon}>
              {mostrarSenha ? <EyeOff size={24} color="#888" /> : <Eye size={24} color="#888" />}
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Confirmar Senha*"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry={!mostrarConfirmarSenha}
              style={styles.inputSenha}
              placeholderTextColor='#666'
            />
            <TouchableOpacity onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)} style={styles.eyeIcon}>
              {mostrarConfirmarSenha ? <EyeOff size={24} color="#888" /> : <Eye size={24} color="#888" />}
            </TouchableOpacity>
          </View>
          
          <View style={styles.termoContainer}>
            <TouchableOpacity
              onPress={() => setTermoAceito(!termoAceito)}
              style={[styles.checkbox, termoAceito && styles.checkboxAtivo]}
            >
              {termoAceito && <Text style={styles.checkboxMarcado}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.termoTexto}>
              Eu concordo com os{' '}
              <Text style={styles.link} onPress={() => setModalVisible(true)}>
                Termos de uso e política de privacidade
              </Text>
              .
            </Text>
          </View>

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
          {loading ? (
            <ActivityIndicator size="large" color="#007BFF" />
          ) : (
            <Button title="Cadastrar" onPress={cadastrarUsuario} disabled={!camposPreenchidos() || !termoAceito}/>
          )}

          <TouchableOpacity onPress={() => router.push('/(auth)/loginScreen')} style={styles.loginLink}>
            <Text style={styles.loginText}>Já tem uma conta? Faça Login</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentWrapper}>
                <ScrollView style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>TERMO DE USO E CONSENTIMENTO...</Text>
                    <Text style={styles.modalText}>
                      Este aplicativo coleta e utiliza dados pessoais para proporcionar uma experiência personalizada. Ao prosseguir, você concorda com o tratamento de suas informações conforme descrito em nossa política.
                    </Text>
                    <Text style={styles.modalSectionTitle}>1. Coleta de Dados</Text>
                    <Text style={styles.modalText}>
                      Coletamos informações como nome, email, telefone, dados de perfil (como foto e Instagram), localização (para funcionalidades de mapa) e interações com o aplicativo.
                    </Text>
                    <Text style={styles.modalSectionTitle}>2. Uso dos Dados</Text>
                    <Text style={styles.modalText}>
                      Seus dados são usados para:
                    </Text>
                    <Text style={styles.modalListItem}>- Personalizar sua experiência no evento.</Text>
                    <Text style={styles.modalListItem}>- Facilitar a localização de amigos e serviços.</Text>
                    <Text style={styles.modalListItem}>- Fornecer informações sobre a programação.</Text>
                    <Text style={styles.modalListItem}>- Melhorar nossos serviços.</Text>

                    <Text style={styles.modalSectionTitle}>3. Compartilhamento de Dados</Text>
                    <Text style={styles.modalText}>
                      Não compartilhamos seus dados pessoais com terceiros sem seu consentimento explícito, exceto quando necessário para a prestação de serviços (ex: APIs de mapa) ou por exigência legal.
                    </Text>

                    <Text style={styles.modalSectionTitle}>4. Segurança</Text>
                    <Text style={styles.modalText}>
                      Empregamos medidas de segurança para proteger suas informações, mas nenhuma transmissão de dados pela internet é 100% segura.
                    </Text>

                    <Text style={styles.modalSectionTitle}>5. Seus Direitos</Text>
                    <Text style={styles.modalText}>
                      Você tem o direito de acessar, corrigir, excluir ou limitar o uso de seus dados. Para exercer esses direitos, entre em contato conosco.
                    </Text>

                    <Text style={styles.modalSectionTitle}>6. Alterações na Política</Text>
                    <Text style={styles.modalText}>
                      Esta política pode ser atualizada. Recomendamos revisá-la periodicamente.
                    </Text>

                    <Text style={styles.modalText}>
                      Ao clicar em "Aceitar", você concorda com os termos acima.
                    </Text>
                </ScrollView>
                <View style={styles.modalButtonContainer}>
                    <Button title="Fechar" onPress={() => setModalVisible(false)} />
                </View>
            </View>
          </View>
        </Modal>
      </KeyboardAwareScrollView>
    </ImageBackground>
  );
}

// Os estilos não foram alterados
const styles = StyleSheet.create({
  background: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  container: { backgroundColor: 'rgba(255,255,255,0.9)', padding: 20, borderRadius: 10 },
  title: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  profileImageContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ddd', alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  addPhotoText: { fontSize: 16, color: '#333', fontWeight: 'bold', textAlign: 'center' },
  input: { height: 50, borderColor: '#ccc', borderWidth: 1, marginBottom: 12, paddingHorizontal: 15, fontSize: 16, borderRadius: 8, backgroundColor: '#fff', color: '#333' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, backgroundColor: '#fff' },
  inputSenha: { flex: 1, height: 50, fontSize: 16, paddingHorizontal: 15 },
  eyeIcon: { padding: 10 },
  erro: { color: 'red', marginBottom: 12, textAlign: 'center' },
  termoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: '#007BFF', borderRadius: 4, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxAtivo: { backgroundColor: '#007BFF' },
  checkboxMarcado: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  termoTexto: { flex: 1, fontSize: 14, color: '#333' },
  link: { color: '#007BFF', textDecorationLine: 'underline' },
  loginLink: { marginTop: 15, alignItems: 'center' },
  loginText: { color: '#007BFF', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContentWrapper: { width: '100%', maxHeight: '85%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  modalContainer: { padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalSectionTitle: { fontWeight: 'bold', fontSize: 16, marginTop: 15, marginBottom: 5 },
  modalText: { fontSize: 14, lineHeight: 20, textAlign: 'justify', marginBottom: 10 },
  modalListItem: { fontSize: 14, lineHeight: 20, textAlign: 'justify', marginLeft: 10 },
  modalButtonContainer: { padding: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  // Estilos para o estado de carregamento do fundo
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Pode ser uma cor sólida enquanto o fundo carrega
  },
  loadingText: {
    marginTop: 10,
    color: '#007BFF',
    fontSize: 16,
  },
});