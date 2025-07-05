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
  Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Location from 'expo-location';
import { ref, set, get, update, remove } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import { ChevronLeft, Phone, Mail, Instagram } from 'lucide-react-native';
import { router } from 'expo-router';
import AdBanner from '../components/AdBanner';

// --- CONSTANTES ---
// Removido: LOCATION_TASK_NAME, pois não usaremos mais a tarefa em segundo plano aqui.
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dz37srew5/image/upload';
const UPLOAD_PRESET = 'expocrato';
const fundo = require('../../assets/images/fundo.png');

// --- INTERFACES ---
interface CompanyProfile {
  nomeEmpresa: string;
  descricao: string;
  telefoneContato?: string;
  emailContato?: string;
  linkInstagram?: string;
  imagem?: string;
  // Removido: compartilhando, pois não será mais usado.
  localizacao?: { latitude: number; longitude: number }; // Adicionado: para armazenar a localização
}

// --- TELA DE CONFIGURAÇÕES DA EMPRESA ---
const ConfiguracoesEmpresaScreen = () => {
  // --- ESTADOS (States) ---
  // Removido: [compartilhando, setCompartilhando]
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [descricao, setDescricao] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [imagem, setImagem] = useState('');
  const [novaImagemUri, setNovaImagemUri] = useState<string | null>(null);
  const [localizacaoAtual, setLocalizacaoAtual] = useState<{ latitude: number; longitude: number } | null>(null); // Novo estado para a localização

  const usuarioId = auth.currentUser?.uid;

  // --- LÓGICA ---
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!usuarioId) { setCarregando(false); return; }
      setCarregando(true);
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
          setLocalizacaoAtual(data.localizacao || null); // Carrega a localização existente
        }
      } catch (error) {
        console.error("Erro ao carregar dados da empresa:", error);
        Alert.alert("Erro", "Não foi possível carregar as configurações da sua empresa.");
      } finally {
        setCarregando(false);
      }
    };
    loadCompanyData();
  }, [usuarioId]);

  const handleSalvarDadosEmpresa = async () => {
    if (!usuarioId) return;
    setIsSaving(true);
    let finalImageUrl = imagem;
    if (novaImagemUri) {
      const uploadedUrl = await uploadImagem(novaImagemUri);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        setIsSaving(false);
        return;
      }
    }

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

    try {
      const companyRef = ref(database, `solicitacoesEmpresas/${usuarioId}`);
      await update(companyRef, {
        nomeEmpresa,
        descricao,
        telefoneContato: telefone || null,
        emailContato: email || null,
        linkInstagram: processedInstagram, // ALTERADO: Salva o valor processado
        imagem: finalImageUrl,
        // Não precisamos mais do campo 'compartilhando' aqui
        // O campo 'localizacao' será atualizado apenas pela função obterLocalizacaoAtualECadastrar
      });
      setImagem(finalImageUrl);
      setInstagram(processedInstagram || ''); // Atualiza o estado local com o valor limpo
      setNovaImagemUri(null);
      setEditando(false);
      Alert.alert('Sucesso', 'Dados da empresa atualizados!');
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar os dados da empresa.");
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImagem = async (uri: string): Promise<string | null> => {
    // Implementação real do upload da imagem para o Cloudinary
    // Por enquanto, retorna uma URL de exemplo
    console.log("Simulando upload de imagem:", uri);

    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      type: 'image/jpeg', // Ou image/png, dependendo do formato
      name: `upload_${Date.now()}.jpg`,
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
        console.error('Erro no upload para Cloudinary:', errorData);
        Alert.alert("Erro no Upload", `Não foi possível enviar a imagem: ${errorData.error.message || 'Erro desconhecido'}`);
        return null;
      }

      const data = await response.json();
      console.log('Upload Cloudinary Sucesso:', data);
      return data.secure_url;
    } catch (error) {
      console.error('Erro na requisição de upload:', error);
      Alert.alert("Erro de Conexão", "Não foi possível conectar ao serviço de upload.");
      return null;
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
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setNovaImagemUri(result.assets[0].uri);
    }
  };

  // Removido: toggleCompartilhamento
  // const toggleCompartilhamento = async (valor: boolean) => { ... };

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
      setLocalizacaoAtual({ latitude, longitude }); // Atualiza o estado local
      Alert.alert('Sucesso', `Localização atualizada para:\nLatitude: ${latitude.toFixed(5)}\nLongitude: ${longitude.toFixed(5)}`);

    } catch (error) {
      console.error("Erro ao obter e cadastrar localização:", error);
      Alert.alert("Erro", "Não foi possível obter ou cadastrar a localização. Verifique se o GPS está ativado e tente novamente.");
    }
  };

  // Removido: TaskManager.defineTask, pois não é mais necessário para essa tela.

  if (carregando) {
    return (
      <ImageBackground source={fundo} style={styles.background}>
        <View style={styles.centeredContainer}><ActivityIndicator size="large" color="#FFFFFF" /></View>
      </ImageBackground>
    );
  }

  const displayImageUri = novaImagemUri || imagem;

  return (
    <ImageBackground source={fundo} style={styles.background}>
      <AdBanner />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configurações da Empresa</Text>
        </View>
        <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer} enableOnAndroid>
          <View style={styles.card}>
            {!editando ? (
              <View style={styles.profileDisplayContainer}>
                <Image source={{ uri: displayImageUri || undefined }} style={styles.profileImage} />
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
                  {localizacaoAtual ? ( // Mostra a localização atual se estiver disponível
                    <View style={styles.detailRow}>
                      <Text style={styles.profileDetail}>Latitude: {localizacaoAtual.latitude.toFixed(5)}</Text>
                    </View>
                  ) : null}
                  {localizacaoAtual ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.profileDetail}>Longitude: {localizacaoAtual.longitude.toFixed(5)}</Text>
                    </View>
                  ) : null}
                  {!localizacaoAtual && ( // Mensagem se não houver localização
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
                  <Image source={{ uri: displayImageUri || undefined }} style={styles.profileImageEdit} />
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
            {/* Removido o Switch de "Compartilhar localização" */}
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

// Removido TaskManager.defineTask(LOCATION_TASK_NAME, ...), pois não é mais necessário para essa tela.

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.3)' },
  backButton: { padding: 5 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginRight: 34 },
  scrollContainer: { padding: 20 },
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