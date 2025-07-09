import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  Image,
  ImageBackground,
  ActivityIndicator,
  SafeAreaView,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Location from 'expo-location';
import { ref, set, get, update, remove } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import { Phone, Mail, Instagram } from 'lucide-react-native';
import AdBanner from '../components/AdBanner';

// --- Importar o gerenciador de imagens para o fundo ---
import { checkAndDownloadImages } from '../../utils/imageManager';

// --- URL padrão de fallback para o fundo local ---
const defaultFundoLocal = require('../../assets/images/fundo.png');

// --- CONSTANTES ---
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dz37srew5/image/upload';
const UPLOAD_PRESET = 'expocrato';

// --- INTERFACES ---
interface CompanyProfile {
  nomeEmpresa: string;
  descricao: string;
  telefoneContato?: string;
  emailContato?: string;
  linkInstagram?: string;
  imagem?: string;
  localizacao?: { latitude: number; longitude: number };
}

// --- TELA DE CONFIGURAÇÕES DA EMPRESA ---
const ConfiguracoesEmpresaScreen = () => {
  // --- ESTADOS (States) ---
  const [carregando, setCarregando] = useState(true); // Controla o carregamento dos DADOS DA EMPRESA
  const [editando, setEditando] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [descricao, setDescricao] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [imagem, setImagem] = useState('');
  const [novaImagemUri, setNovaImagemUri] = useState<string | null>(null);
  const [localizacaoAtual, setLocalizacaoAtual] = useState<{ latitude: number; longitude: number } | null>(null);

  // --- Estados para o carregamento da imagem de fundo dinâmica ---
  const [fundoAppReady, setFundoAppReady] = useState(false); // Controla o carregamento do FUNDO DO APP
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  const usuarioId = auth.currentUser?.uid;

  // --- LÓGICA ---
  // useEffect para carregar a imagem de fundo dinâmica
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na ConfiguracoesEmpresaScreen:", error);
        setCurrentFundoSource(defaultFundoLocal);
      } finally {
        setFundoAppReady(true); // <--- IMPORTANTE: SEMPRE DEFINE COMO PRONTO AQUI
      }
    };
    loadFundoImage();
  }, []);

  // useEffect para carregar os DADOS DA EMPRESA
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!usuarioId) {
        setCarregando(false); // Se não há usuário, para o carregamento e não tenta buscar dados.
        return;
      }
      // setCarregando(true); // Já é true por padrão, ou pode ser setado aqui se necessário resetar
      try {
        const companyRef = ref(database, `solicitacoesEmpresas/${usuarioId}`);
        const snapshot = await get(companyRef);
        if (snapshot.exists()) {
          const data = snapshot.val() as CompanyProfile;
          setNomeEmpresa(data.nomeEmpresa || '');
          setDescricao(data.descricao || '');
          setTelefone(data.telefoneContato || '');
          setEmail(data.emailContato || '');
          setInstagram(data.linkInstagram || '');
          setImagem(data.imagem || '');
          setLocalizacaoAtual(data.localizacao || null);
        }
      } catch (error) {
        console.error("Erro ao carregar dados da empresa:", error);
        Alert.alert("Erro", "Não foi possível carregar as configurações da sua empresa.");
      } finally {
        setCarregando(false); // <--- CORREÇÃO: GARANTE QUE O LOADING DOS DADOS DA EMPRESA É ENCERRADO
      }
    };
    loadCompanyData();
  }, [usuarioId]);

  const uploadCompanyImage = async (uri: string): Promise<string | null> => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const fileType = filename?.split('.').pop()?.toLowerCase() || 'jpeg';

    formData.append('file', {
      uri: uri,
      name: filename || `company_image_${Date.now()}.${fileType}`,
      type: `image/${fileType}`,
    } as any);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro no upload para Cloudinary (imagem da empresa):', errorData);
        Alert.alert("Erro no Upload", `Não foi possível enviar a imagem da empresa: ${errorData.error.message || 'Erro desconhecido'}`);
        return null;
      }

      const data = await response.json();
      console.log('Upload Cloudinary Sucesso (imagem da empresa):', data);
      return data.secure_url;
    } catch (error) {
      console.error('Erro na requisição de upload (imagem da empresa):', error);
      Alert.alert("Erro de Conexão", "Não foi possível conectar ao serviço de upload de imagem da empresa.");
      return null;
    }
  };

  const handleSalvarDadosEmpresa = async () => {
    if (!usuarioId) return;
    setIsSaving(true);
    let finalImageUrl = imagem;

    if (novaImagemUri) {
      const uploadedUrl = await uploadCompanyImage(novaImagemUri);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        setIsSaving(false);
        return;
      }
    }

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

    try {
      const companyRef = ref(database, `solicitacoesEmpresas/${usuarioId}`);
      await update(companyRef, {
        nomeEmpresa,
        descricao,
        telefoneContato: telefone || null,
        emailContato: email || null,
        linkInstagram: processedInstagram,
        imagem: finalImageUrl,
      });
      setImagem(finalImageUrl);
      setInstagram(processedInstagram || '');
      setNovaImagemUri(null);
      setEditando(false);
      Alert.alert('Sucesso', 'Dados da empresa atualizados!');
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar os dados da empresa.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelecionarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos da permissão para acessar sua galeria de fotos.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Aspecto 4:3 para a imagem da empresa
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNovaImagemUri(result.assets[0].uri);
    }
  };

  const obterLocalizacaoAtualECadastrar = async () => {
    if (!usuarioId) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão de Localização', 'Para atualizar a localização, precisamos da sua permissão para acessar o GPS do dispositivo.');
        return;
      }

      Alert.alert("Obtendo Localização", "Por favor, aguarde enquanto tentamos obter sua localização atual...", [], { cancelable: false });

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      const companyRef = ref(database, `solicitacoesEmpresas/${usuarioId}`);
      await update(companyRef, {
        localizacao: {
          latitude,
          longitude,
        }
      });
      setLocalizacaoAtual({ latitude, longitude });
      Alert.alert('Sucesso', `Localização atualizada para:\nLatitude: ${latitude.toFixed(5)}\nLongitude: ${longitude.toFixed(5)}`);

    } catch (error) {
      console.error("Erro ao obter e cadastrar localização:", error);
      Alert.alert("Erro", "Não foi possível obter ou cadastrar a localização. Verifique se o GPS está ativado e tente novamente.");
    }
  };

  // --- Condição de carregamento geral: Espera os dados da empresa E o fundo do app ---
  // A variável 'carregando' controla o carregamento dos dados da empresa,
  // enquanto 'fundoAppReady' controla o carregamento do fundo.
  // Ambas precisam estar prontas para renderizar a tela principal.
  if (carregando || !fundoAppReady) {
    return (
      <ImageBackground source={currentFundoSource} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Carregando dados da empresa...</Text>
      </ImageBackground>
    );
  }

  // Define qual URI de imagem da empresa será exibida (nova imagem selecionada ou a imagem salva no Firebase)
  // Se 'displayImageSource' for undefined (nenhuma URL), a Image não irá renderizar nada ou usará o espaço em branco.
  const displayImageSource = novaImagemUri ? { uri: novaImagemUri } : (imagem ? { uri: imagem } : undefined);

  return (
    <ImageBackground source={currentFundoSource} style={styles.background}>
      <AdBanner />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer} enableOnAndroid>
          <View style={styles.card}>
            {!editando ? (
              <View style={styles.profileDisplayContainer}>
                <Image source={displayImageSource} style={styles.profileImage} />
                <Text style={styles.profileName}>{nomeEmpresa}</Text>
                <Text style={styles.profileDescription}>{descricao}</Text>

                <View style={styles.detailsSection}>
                  {email ? (
                    <View style={styles.detailRow}>
                      <Mail size={16} color="#444" />
                      <Text style={styles.profileDetail}>{email}</Text>
                    </View>
                  ) : null}

                  {telefone ? (
                    <View style={styles.detailRow}>
                      <Phone size={16} color="#444" />
                      <Text style={styles.profileDetail}>{telefone}</Text>
                    </View>
                  ) : null}

                  {instagram ? (
                    <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(`https://instagram.com/${instagram}`)}>
                      <Instagram size={16} color="#444" />
                      <Text style={[styles.profileDetail, styles.linkText]}>@{instagram}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {localizacaoAtual ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.profileDetail}>Latitude: {localizacaoAtual.latitude.toFixed(5)}</Text>
                    </View>
                  ) : null}
                  {localizacaoAtual ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.profileDetail}>Longitude: {localizacaoAtual.longitude.toFixed(5)}</Text>
                    </View>
                  ) : null}
                  {!localizacaoAtual && (
                    <View style={styles.detailRow}>
                      <Text style={styles.profileDetail}>Nenhuma localização cadastrada.</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity style={styles.editButton} onPress={() => setEditando(true)}>
                  <Text style={styles.editButtonText}>Editar Dados</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.profileEditContainer}>
                <TouchableOpacity onPress={handleSelecionarFoto}>
                  <Image source={displayImageSource} style={styles.profileImageEdit} />
                  <Text style={styles.changePhotoText}>Alterar Imagem de Capa</Text>
                </TouchableOpacity>
                <TextInput style={styles.input} value={nomeEmpresa} onChangeText={setNomeEmpresa} placeholder="Nome da Empresa" />
                <TextInput style={styles.input} value={descricao} onChangeText={setDescricao} placeholder="Descrição" multiline />
                <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="Telefone de Contato" keyboardType="phone-pad" />
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="E-mail de Contato" keyboardType="email-address" />
                <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} placeholder="Usuário do Instagram (sem @)" />
                <View style={styles.editActionsContainer}>
                  <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSalvarDadosEmpresa} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Salvar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => setEditando(false)}>
                    <Text style={styles.actionButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Localização da Empresa</Text>
            <Text style={styles.settingDescription}>Clique no botão abaixo para capturar sua localização atual e permitir que sua empresa apareça no mapa do evento.</Text>
            <TouchableOpacity style={styles.updateLocationButton} onPress={obterLocalizacaoAtualECadastrar}>
              <Text style={styles.updateLocationButtonText}>Atualizar Localização no Mapa</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.3)' },
  backButton: { padding: 5 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginRight: 34 },
  scrollContainer: { padding: 20 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 12, padding: 20, marginBottom: 20 },
  profileDisplayContainer: { alignItems: 'center' },
  profileImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 15, backgroundColor: '#e0e0e0' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  profileDescription: { fontSize: 16, color: '#666', marginTop: 4, marginBottom: 15, textAlign: 'center', fontStyle: 'italic' },
  detailsSection: {
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileDetail: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  linkText: {
    color: '#007BFF',
  },
  editButton: { backgroundColor: '#007BFF', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, marginTop: 10 },
  editButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  profileEditContainer: { alignItems: 'center' },
  profileImageEdit: { width: '100%', height: 150, borderRadius: 8, marginBottom: 8, backgroundColor: '#e0e0e0' },
  changePhotoText: { color: '#007BFF', fontSize: 16, marginBottom: 20 },
  input: { backgroundColor: '#fff', width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15 },
  editActionsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  actionButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', width: '48%' },
  saveButton: { backgroundColor: '#4CAF50' },
  cancelButton: { backgroundColor: '#f44336' },
  actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  settingLabel: { fontSize: 16, color: '#444', flex: 1, marginRight: 10 },
  settingDescription: { fontSize: 13, color: '#666', marginTop: 8, lineHeight: 18, textAlign: 'center' },
  updateLocationButton: { backgroundColor: '#007BFF', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  updateLocationButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default ConfiguracoesEmpresaScreen;