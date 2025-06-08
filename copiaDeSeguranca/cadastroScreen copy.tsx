import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth, database, administrativoDatabase } from '../../firebaseConfig';
import { ref, set, get } from 'firebase/database';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Eye, EyeOff } from 'lucide-react-native';
import { TextInputMask } from 'react-native-masked-text';
import { router } from 'expo-router';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dz37srew5/image/upload';
const UPLOAD_PRESET = 'expocrato';

// Interface para tipar os objetos de banner conforme a estrutura fornecida
interface BannerItem {
  descricao: string;
  id: string;
  imagemUrl: string;
  linkUrl: string;
}

export default function CadastroScreen({ navigation }: any) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [imagem, setImagem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [termoAceito, setTermoAceito] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const camposPreenchidos = () => nome && email && telefone && senha && confirmarSenha;

  const [allBanners, setAllBanners] = useState<string[]>([]);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Valor animado para a opacidade do banner
  const fadeAnim = useRef(new Animated.Value(0)).current; // Começa invisível (opacidade 0)

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        // Usando administrativoDatabase conforme seu código anterior
        const sponsorsRef = ref(administrativoDatabase, 'patrocinadores');
        
        const snapshot = await get(sponsorsRef);

        if (snapshot.exists()) {
          const sponsorsData = snapshot.val();
          const bannersList: string[] = [];

          for (const sponsorId in sponsorsData) {
            const sponsor = sponsorsData[sponsorId];
            if (sponsor && sponsor.banners && Array.isArray(sponsor.banners)) {
              const sponsorBannersArray: BannerItem[] = sponsor.banners;
              sponsorBannersArray.forEach(bannerObject => {
                if (typeof bannerObject === 'object' && bannerObject !== null && typeof bannerObject.imagemUrl === 'string') {
                  bannersList.push(bannerObject.imagemUrl);
                }
              });
            }
          }

          if (bannersList.length > 0) {
            setAllBanners(bannersList);
            setCurrentBannerUrl(bannersList[0]);
            setCurrentBannerIndex(0);
            // Animação de Fade-in para o primeiro banner
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200, // Duração do fade-in
              useNativeDriver: true, // Importante para performance
            }).start();
          } else {
            console.log('Nenhum banner de patrocinador encontrado com a estrutura esperada.');
            setCurrentBannerUrl(null);
            fadeAnim.setValue(0); // Garante que a opacidade seja 0 se não houver banners
          }
        } else {
          // Ajuste na mensagem de log para refletir o caminho usado
          console.log('Nó "patrocinadores" não encontrado em administrativoDatabase.');
          setCurrentBannerUrl(null);
          fadeAnim.setValue(0);
        }
      } catch (error) {
        console.error('Erro ao buscar banners dos patrocinadores:', error);
        Alert.alert("Erro", "Não foi possível carregar os banners dos patrocinadores.");
        setCurrentBannerUrl(null);
        fadeAnim.setValue(0);
      }
    };

    fetchBanners();
  }, [fadeAnim]); // fadeAnim adicionado como dependência, pois é usado no efeito

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (allBanners.length > 1) {
      intervalId = setInterval(() => {
        Animated.timing(fadeAnim, { // 1. Fade-out do banner atual
          toValue: 0,
          duration: 200, // Duração do fade-out
          useNativeDriver: true,
        }).start(() => {
          // 2. Atualiza o banner APÓS o fade-out
          setCurrentBannerIndex(prevIndex => {
            const nextIndex = (prevIndex + 1) % allBanners.length;
            setCurrentBannerUrl(allBanners[nextIndex]); // Define a URL para o próximo banner
            
            // 3. Fade-in do novo banner
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200, // Duração do fade-in
              useNativeDriver: true,
            }).start();
            
            return nextIndex; // Retorna o novo índice
          });
        });
      }, 6000); // Tempo entre o início de cada transição
    }

    return () => { // Limpa o intervalo quando o componente é desmontado ou allBanners muda
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [allBanners, fadeAnim]);

  const selecionarImagem = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });

    if (result.assets?.length) {
      setImagem(result.assets[0].uri);
    }
  };

  const tirarFoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });

    if (result.assets?.length) {
      setImagem(result.assets[0].uri);
    }
  };

  const handleSelecionarFoto = () => {
    Alert.alert(
      'Escolher Foto de Perfil',
      'Como você gostaria de adicionar sua foto?',
      [
        { text: 'Tirar Foto', onPress: tirarFoto },
        { text: 'Selecionar da Galeria', onPress: selecionarImagem },
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const uploadImagem = async () => {
    if (!imagem) return null;
    const formData = new FormData();
    formData.append('file', {
      uri: imagem,
      type: 'image/jpeg',
      name: 'perfil.jpg',
    } as any);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return data.secure_url || '';
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error);
      setErro('Erro ao enviar imagem. Tente novamente.');
      return '';
    }
  };

  const cadastrarUsuario = async () => {
    if (!camposPreenchidos()) {
      setErro('Preencha todos os campos obrigatórios.');
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
        setErro('Email já cadastrado em outra conta. Use outro email.');
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const userId = userCredential.user.uid;
      const imageUrl = await uploadImagem();

      await set(ref(database, 'usuarios/' + userId), {
        nome,
        email,
        telefone,
        imagem: imageUrl,
      });

      Alert.alert('Sucesso', 'Cadastro realizado com sucesso!');
      setNome('');
      setEmail('');
      setTelefone('');
      setSenha('');
      setConfirmarSenha('');
      setImagem(null);
      setTermoAceito(false);
    } catch (error: any) {
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
      <View style={styles.adBanner}>
              {currentBannerUrl ? (
                <Animated.Image // Usando Animated.Image
                  source={{ uri: currentBannerUrl }}
                  style={[
                    styles.bannerImage,
                    { opacity: fadeAnim } // Aplicando a opacidade animada
                  ]}
                  resizeMode="contain"
                  onError={(e) => console.warn("Erro ao carregar imagem do banner:", e.nativeEvent.error)}
                />
              ) : (
                // O texto de fallback não precisa ser animado da mesma forma,
                // mas podemos envolvê-lo se quisermos um fade para ele também.
                // Por ora, ele aparece quando não há currentBannerUrl e fadeAnim está em 0.
                <Text style={styles.adBannerText}>Espaço para Patrocínios</Text>
              )}
            </View>
      
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Text style={styles.title}>Criar Conta</Text>

          <TouchableOpacity style={styles.profileImageContainer} onPress={handleSelecionarFoto}>
            {imagem ? (
              <Image source={{ uri: imagem }} style={styles.profileImage} />
            ) : (
              <Text style={styles.addPhotoText}>Adicionar Foto</Text>
            )}
          </TouchableOpacity>

          <TextInput placeholder="Nome Completo*" value={nome} onChangeText={setNome} style={styles.input} />
          <TextInput
            placeholder="Email*"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.input}
          />

          <TextInputMask
            type={'cel-phone'}
            options={{
              maskType: 'BRL',
              withDDD: true,
              dddMask: '(99) ',
            }}
            value={telefone}
            onChangeText={setTelefone}
            placeholder="Telefone*"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Senha*"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!mostrarSenha}
              style={styles.inputSenha}
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
            />
            <TouchableOpacity onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)} style={styles.eyeIcon}>
              {mostrarConfirmarSenha ? <EyeOff size={24} color="#888" /> : <Eye size={24} color="#888" />}
            </TouchableOpacity>
          </View>

          {/* Termo de autorização */}
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
            <Button title="Cadastrar" onPress={cadastrarUsuario} />
          )}

          <TouchableOpacity onPress={() => router.push('/(auth)/loginScreen')} style={styles.loginLink}>
            <Text style={styles.loginText}>Já tem uma conta? Faça Login</Text>
          </TouchableOpacity>
        </View>

        {/* Modal para os Termos de uso e política de privacidade */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ScrollView style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>TERMO DE USO E CONSENTIMENTO PARA COMPARTILHAMENTO DE DADOS</Text>
                        <Text style={styles.modalText}>
                          Este Termo de Uso estabelece as condições para o uso do aplicativo Assistente de Eventos, desenvolvido por
                          Anderson Antonio da Silva, inscrito no CNPJ nº 57.741.870/0001-39, com sede em Avenida José Bernardino
                          Carvalho Leite, 295 casa E.
                        </Text>
                        <Text style={styles.modalSectionTitle}>1. Aceitação dos Termos</Text>
                        <Text style={styles.modalText}>
                          Ao utilizar o aplicativo Assistente de Eventos, o usuário concorda integralmente com este Termo de Uso e
                          autoriza o tratamento e o compartilhamento de seus dados pessoais, conforme descrito abaixo.
                        </Text>
                        <Text style={styles.modalSectionTitle}>2. Dados Pessoais Coletados</Text>
                        <Text style={styles.modalText}>Para oferecer os serviços do aplicativo, coletamos e armazenamos os seguintes dados pessoais do usuário:</Text>
                        <Text style={styles.modalText}>- Nome completo</Text>
                        <Text style={styles.modalText}>- Telefone</Text>
                        <Text style={styles.modalText}>- E-mail</Text>
                        <Text style={styles.modalSectionTitle}>3. Finalidade do Compartilhamento</Text>
                        <Text style={styles.modalText}>
                          Os dados pessoais coletados poderão ser compartilhados com parceiros e prestadores de serviço, sempre com a finalidade de viabilizar e melhorar o funcionamento do aplicativo, aprimorar a experiência do usuário e permitir o oferecimento de novos serviços e funcionalidades dentro e fora do aplicativo.
                        </Text>
                        <Text style={styles.modalSectionTitle}>4. Bases Legais e Consentimento</Text>
                        <Text style={styles.modalText}>
                          A coleta, o tratamento e o compartilhamento dos dados pessoais são realizados com base no consentimento do usuário, conforme previsto na Lei nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD). O usuário manifesta seu consentimento de forma livre, informada e inequívoca ao aceitar este Termo de Uso.
                        </Text>
                        <Text style={styles.modalSectionTitle}>5. Direitos do Usuário</Text>
                        <Text style={styles.modalText}>
                          O usuário poderá, a qualquer momento, solicitar:
                          {'\n'}• Confirmação da existência de tratamento dos seus dados;
                          {'\n'}• Acesso aos seus dados;
                          {'\n'}• Correção de dados incompletos, inexatos ou desatualizados;
                          {'\n'}• Revogação do consentimento e eliminação dos dados tratados com base no consentimento, salvo hipóteses legais de retenção.
                        </Text>
                        <Text style={styles.modalText}>
                          Para exercer esses direitos, o usuário poderá entrar em contato pelo e-mail: professor.anderson.a.silva@gmail.com.
                        </Text>
                        <Text style={styles.modalSectionTitle}>6. Medidas de Segurança</Text>
                        <Text style={styles.modalText}>
                          Adotamos medidas técnicas e organizacionais para proteger os dados pessoais do usuário contra acessos não autorizados ou alteração.
                        </Text>
                        <Text style={styles.modalSectionTitle}>7. Alterações</Text>
                        <Text style={styles.modalText}>
                          Este Termo de Uso poderá ser alterado a qualquer momento, sendo as alterações comunicadas ao usuário por meio do aplicativo ou por e-mail.
                        </Text>
                        <Text style={styles.modalSectionTitle}>8. Contato</Text>
                        <Text style={styles.modalText}>
                          Em caso de dúvidas ou solicitações relacionadas a este Termo de Uso e ao tratamento de dados pessoais, o usuário poderá entrar em contato através do e-mail: professor.anderson.a.silva@gmail.com.
                        </Text>
                        <Text style={styles.modalText}>Barbalha-CE, 04/06/2025{'\n'}Anderson Antonio da Silva</Text>
              
                        </ScrollView>
                        {/* Botão de Fechar fora do ScrollView */}
                        <View style={{ marginTop: 10 }}>
                          <Button title="Fechar" onPress={() => setModalVisible(false)} />
                        </View>
            </View>
          </View>
        </Modal>
      </KeyboardAwareScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  adBanner: {
    height: 60,
    backgroundColor: 'rgba(220,220,220,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  adBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  container: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    borderRadius: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  addPhotoText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  inputSenha: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  erro: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
  termoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007BFF',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxAtivo: {
    backgroundColor: '#007BFF',
  },
  checkboxMarcado: {
    color: '#fff',
  },
  termoTexto: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  link: {
    color: '#007BFF',
    textDecorationLine: 'underline',
  },
  loginLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  loginText: {
    color: '#007BFF',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    maxHeight: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalContent: {
    fontSize: 14,
    marginBottom: 10,
  },
  modalSectionTitle: { fontWeight: 'bold', marginTop: 10 },
  modalText: { marginBottom: 10, textAlign: 'justify' },
});

