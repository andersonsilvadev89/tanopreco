import React, { useEffect, useState, useRef } from 'react';
import {
    View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  TouchableOpacity,
  TextInput,
  Image,
  ImageBackground,
  Dimensions,
  Animated,
  Platform,
  Linking,
  ActivityIndicator,
  SafeAreaView 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { ref, set, get, remove } from 'firebase/database';
import { auth, database, administrativoDatabase } from '../../firebaseConfig';
import { deleteUser } from 'firebase/auth';

const LOCATION_TASK_NAME = 'background-location-task';
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dz37srew5/image/upload';
const UPLOAD_PRESET = 'expocrato';  

interface UserProfile {
  nome: string;
  email: string;
  telefone?: string;
  imagem?: string;
  compartilhando?: boolean;
}
interface BannerItem {
  descricao: string;
  id: string;
  imagemUrl: string;
  linkUrl: string;
}

const ConfiguracoesScreen = () => {
  const [allBanners, setAllBanners] = useState<string[]>([]);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const fetchBanners = async () => {
      try {
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
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          } else {
            setCurrentBannerUrl(null);
            fadeAnim.setValue(0);
          }
        } else {
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
  }, [fadeAnim]);
  
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    
    if (allBanners.length > 1) {
      intervalId = setInterval(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setCurrentBannerIndex(prevIndex => {
            const nextIndex = (prevIndex + 1) % allBanners.length;
            setCurrentBannerUrl(allBanners[nextIndex]);
            
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
            
            return nextIndex;
          });
        });
      }, 6000);
    }
  
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [allBanners, fadeAnim]);

  const [compartilhando, setCompartilhando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nome, setNome] = useState(auth.currentUser?.displayName || '');
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [telefone, setTelefone] = useState('');
  const [imagem, setImagem] = useState(auth.currentUser?.photoURL || '');
  const [novaImagemUri, setNovaImagemUri] = useState<string | null>(null);

  const usuarioId = auth.currentUser?.uid;

  useEffect(() => {
    if (!usuarioId) {
        setCarregando(false);
        setCompartilhando(false); 
        return;
    }
    const userRef = ref(database, `usuarios/${usuarioId}`); 
    let isMounted = true;

    const checkStatusAndProfile = async () => {
      if(!isMounted) return;
      setCarregando(true);
      try {
        const userSnapshot = await get(userRef);
        if (isMounted && userSnapshot.exists()) {
          const profileData = userSnapshot.val() as UserProfile;
          setCompartilhando(profileData.compartilhando === true);
          setNome(profileData.nome || auth.currentUser?.displayName || '');
          setEmail(profileData.email || auth.currentUser?.email || '');
          setTelefone(profileData.telefone || '');
          setImagem(profileData.imagem || auth.currentUser?.photoURL || '');
        } else if (isMounted && auth.currentUser) {
          const initialNome = auth.currentUser.displayName || '';
          const initialEmail = auth.currentUser.email || '';
          const initialImagem = auth.currentUser.photoURL || '';
          
          setNome(initialNome);
          setEmail(initialEmail);
          setTelefone('');
          setImagem(initialImagem);
          setCompartilhando(false);

          await set(userRef, {
            nome: initialNome, email: initialEmail, telefone: '', imagem: initialImagem, compartilhando: false});
        }
        setNovaImagemUri(null);
      } catch (error) {
          console.error("Erro ao buscar perfil e status:", error);
          if(isMounted && auth.currentUser){
            setNome(auth.currentUser.displayName || '');
            setEmail(auth.currentUser.email || '');
            setTelefone('');
            setImagem(auth.currentUser.photoURL || '');
            setCompartilhando(false);
            setNovaImagemUri(null);
          }
      } finally {
          if(isMounted){setCarregando(false);}
      }
    };

    checkStatusAndProfile();
    return () => { isMounted = false; }
  }, [usuarioId]);

  const toggleCompartilhamento = async (valor: boolean) => {
    if (!usuarioId) return;
    setCompartilhando(valor); 
    const userStatusRef = ref(database, `usuarios/${usuarioId}/compartilhando`);
    try {
        await set(userStatusRef, valor); 
        if (valor) { 
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus !== 'granted') {
                Alert.alert('Permissão Negada', 'Permissão de localização em primeiro plano é necessária.');
                setCompartilhando(false); await set(userStatusRef, false); return;
            }
            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus !== 'granted') {
                Alert.alert('Permissão Recomendada', 'Para melhor experiência, permita a localização em segundo plano ("Permitir o tempo todo").');
            }
            const isTaskRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
            if (isTaskRunning) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            }
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.Balanced, 
                timeInterval: 60000 * 1, 
                distanceInterval: 50,   
                showsBackgroundLocationIndicator: true,
                pausesUpdatesAutomatically: true,   
                activityType: Location.ActivityType.Other, 
                foregroundService: {
                    notificationTitle: 'Assistente de Eventos',
                    notificationBody: 'Compartilhamento de localização ativo.',
                    notificationColor: '#007BFF', 
                },
            });
            Alert.alert('Compartilhamento Ativado', 'Sua localização será gerenciada pela task de background.');
        } else { 
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            await set(ref(database, `localizacoes/${usuarioId}`), null); 
            Alert.alert('Compartilhamento Desativado');
        }
    } catch (error) {
        console.error("Erro ao alternar compartilhamento:", error);
        Alert.alert("Erro", "Falha ao alterar status de compartilhamento.");
        setCompartilhando(!valor); 
        try { await set(userStatusRef, !valor); } catch (dbError) {}
    }
  };
  
  const uploadImagem = async (uri: string): Promise<string | null> => {
    if (!uri || !uri.startsWith('file://')) {
        return uri || null;
    }
    setUploadingImage(true);
    const formData = new FormData();
    const filename = uri.split('/').pop() || `profile-${usuarioId}-${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename!);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('file', { uri, name: filename, type } as any);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await response.json();
        if (response.ok && data.secure_url) {
            return data.secure_url;
        } else {
            console.error('Erro no Cloudinary ao fazer upload:', data.error?.message);
            Alert.alert('Erro de Upload', data.error?.message || 'Não foi possível enviar a imagem para o Cloudinary.');
            return null;
        }
    } catch (e: any) {
        console.error('Erro de rede no upload para Cloudinary:', e);
        Alert.alert('Erro de Upload', `Falha na conexão ao enviar imagem: ${e.message}`);
        return null;
    } finally {
        setUploadingImage(false);
    }
  };

  const handleSalvarPerfil = async () => {
    if (!usuarioId || uploadingImage) return;
    setUploadingImage(true); 
    let finalImageUrl = imagem; 

    if (novaImagemUri) { 
        const uploadedUrl = await uploadImagem(novaImagemUri); 
        if (uploadedUrl) {
            finalImageUrl = uploadedUrl; 
        } else {
            setUploadingImage(false);
        }
    }
    
    const userRef = ref(database, `usuarios/${usuarioId}`);
    try {
        const snapshotCompartilhando = await get(ref(database, `usuarios/${usuarioId}/compartilhando`));
        const compartilhandoDB = snapshotCompartilhando.exists() ? snapshotCompartilhando.val() : false;

        await set(userRef, {
            nome, email, telefone,
            imagem: finalImageUrl, 
            compartilhando: compartilhandoDB
        });

        setImagem(finalImageUrl); 
        setNovaImagemUri(null);   
        setEditandoPerfil(false);
        Alert.alert('Sucesso', 'Perfil atualizado!');
    } catch (error) {
        console.error("Erro ao salvar perfil no Firebase:", error);
        Alert.alert("Erro", "Não foi possível atualizar o perfil no Firebase.");
    } finally {
        setUploadingImage(false);
    }
  };
  
  const handleEditarPerfil = () => setEditandoPerfil(true);

  const handleCancelarEdicao = () => {
    setEditandoPerfil(false);
    setNovaImagemUri(null); 
    if (!usuarioId) return;
    const userRef = ref(database, `usuarios/${usuarioId}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const profileData = snapshot.val();
        setNome(profileData.nome || auth.currentUser?.displayName || '');
        setEmail(profileData.email || auth.currentUser?.email || '');
        setTelefone(profileData.telefone || '');
        setImagem(profileData.imagem || auth.currentUser?.photoURL || '');
      }
    }).catch(error => console.error("Erro ao recarregar perfil:", error));
  };

  const selecionarDaGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão negada', 'Permissão para acessar a galeria é necessária.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        aspect: [1, 1],
        quality: 0.7
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
        setNovaImagemUri(result.assets[0].uri);
    }
  };

  const tirarFotoComCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão negada', 'Permissão para usar a câmera é necessária.'); return;}
    const result = await ImagePicker.launchCameraAsync({ 
        allowsEditing: true, 
        aspect: [1, 1], 
        quality: 0.7 
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
        setNovaImagemUri(result.assets[0].uri);
    }
  };

  const handleSelecionarFoto = () => {
    Alert.alert(
      'Alterar foto de perfil', 'Como você gostaria de adicionar sua foto?',
      [
        { text: 'Tirar Foto', onPress: tirarFotoComCamera },
        { text: 'Selecionar da Galeria', onPress: selecionarDaGaleria },
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Excluir conta permanentemente?",
      "Esta ação é irreversível. Todos os seus dados de perfil e localização serão apagados. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive", 
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) {
              Alert.alert("Erro", "Nenhum usuário encontrado para exclusão.");
              return;
            }

            setIsDeleting(true);

            try {
              // 1. Parar tasks de localização em background
              if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
              }

              // 2. Deletar dados do Realtime Database
              const userId = user.uid;
              const userProfileRef = ref(database, `usuarios/${userId}`);
              const userLocationRef = ref(database, `localizacoes/${userId}`);
              
              await remove(userProfileRef);
              await remove(userLocationRef);

              // 3. Deletar o usuário do Firebase Auth
              await deleteUser(user);

              Alert.alert("Conta Excluída", "Sua conta foi removida com sucesso.");

            } catch (error: any) {
              console.error("Erro ao excluir conta:", error);
              // Erro comum: o usuário precisa ter feito login recentemente.
              if (error.code === 'auth/requires-recent-login') {
                Alert.alert(
                  "Ação Requer Autenticação",
                  "Por segurança, você precisa fazer login novamente antes de excluir sua conta. Por favor, saia e entre no aplicativo novamente."
                );
              } else {
                Alert.alert("Erro", `Não foi possível excluir a conta. ${error.message}`);
              }
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

const displayImageUri = novaImagemUri || imagem;

  if (carregando) {
    return (
      <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff"/>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </ImageBackground>
    );
  }

return (
  <ImageBackground source={require('../../assets/images/fundo.png')} style={styles.background}>
    <View style={styles.adBanner}>
              {currentBannerUrl ? (
                <Animated.Image
                  source={{ uri: currentBannerUrl }}
                  style={[ styles.bannerImage, { opacity: fadeAnim } ]}
                  resizeMode="contain"
                  onError={(e) => console.warn("Erro ao carregar imagem do banner:", e.nativeEvent.error)}
                />
              ) : (
                <Text style={styles.adBannerText}>Espaço para Patrocínios</Text>
              )}
    </View>
    <KeyboardAwareScrollView 
        contentContainerStyle={styles.scrollContainer} 
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 0}
        enableOnAndroid={true} 
        keyboardShouldPersistTaps="handled"><SafeAreaView style={styles.innerContainer}>
          <View style={styles.card}>
            {!editandoPerfil ? (
              <View style={styles.profileDisplayContainer}>
                <TouchableOpacity onPress={handleEditarPerfil} style={styles.profileImageTouchable}>
                  {displayImageUri ? (
                    <Image source={{ uri: displayImageUri }} style={styles.profileImage} />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                       <Text style={styles.profileImagePlaceholderText}>{nome ? nome.charAt(0).toUpperCase() : 'P'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.profileName}>{nome || 'Nome não definido'}</Text>
                <Text style={styles.profileEmail}>{email || 'Email não definido'}</Text>
                {telefone ? <Text style={styles.profileDetail}>Telefone: {telefone}</Text> : null}
                <TouchableOpacity style={styles.editButton} onPress={handleEditarPerfil}>
                  <Text style={styles.editButtonText}>Editar Perfil</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.profileEditContainer}>
                <TouchableOpacity onPress={handleSelecionarFoto} style={styles.imagePickerButton}>
                  {displayImageUri ? (
                    <Image source={{ uri: displayImageUri }} style={styles.profileImageEdit} />
                  ) : (
                    <View style={styles.profileImagePlaceholderEdit}>
                      <Text style={styles.profileImagePlaceholderEditText}>Selecionar Foto</Text>
                    </View>
                  )}
                  <Text style={styles.changePhotoText}>Alterar Foto</Text>
                </TouchableOpacity>
                <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome Completo" placeholderTextColor="#888"/>
                <TextInput style={styles.input} value={email} placeholder="Email" autoCapitalize="none" placeholderTextColor="#888" editable={false} />
                <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="Telefone (Ex: 88912345678)" keyboardType="phone-pad" placeholderTextColor="#888"/>
                {uploadingImage && 
                    <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="small" color="#007BFF" />
                        <Text style={styles.uploadingText}>Enviando imagem...</Text>
                    </View>
                }
                <View style={styles.editActionsContainer}>
                  <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSalvarPerfil} disabled={uploadingImage}>
                    <Text style={styles.actionButtonText}>Salvar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancelarEdicao} disabled={uploadingImage}>
                    <Text style={styles.actionButtonText}>Cancelar</Text>
                  </TouchableOpacity>
          </View>
         </View>
         )}
      </View>

      <View style={styles.card}>
         <Text style={styles.sectionTitle}>Compartilhamento de Localização</Text>
         <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Compartilhar minha localização - É necessário ativar a localização em segundo plano!</Text>
              <Switch
                value={compartilhando}
                onValueChange={toggleCompartilhamento}
                thumbColor={compartilhando ? '#4CAF50' : '#f4f3f4'}
                trackColor={{ false: '#ccc', true: '#81c784' }}
              />
         </View>
         <Text style={styles.settingDescription}>
              Sua localização será enviada ao servidor quando as condições de evento,  proximidade e horário, forem atendidas.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.dangerZoneTitle}>Zona de Perigo</Text>
        <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={handleDeleteAccount}
        disabled={isDeleting}>
          {isDeleting?(<ActivityIndicator size="small" color="#FFFFFF" />):(<Text style={styles.deleteButtonText}>Excluir Minha Conta</Text>)}
        </TouchableOpacity>
        <Text style={styles.dangerZoneDescription}>
          Esta ação não pode ser desfeita. Todos os seus dados serão apagados permanentemente.
        </Text>
      </View>
    </SafeAreaView>
    </KeyboardAwareScrollView>
</ImageBackground>
);};

const styles = StyleSheet.create({
  background: {
    flex: 1
  },

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

  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  
  innerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white'
  },

  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  
  profileDisplayContainer: { alignItems: 'center' },
  
  profileImageTouchable: { marginBottom: 15, borderRadius: 60, overflow: 'hidden' }, 
  
  profileImage: { width: 120, height: 120, borderRadius: 60 },
  
  profileImagePlaceholder: { 
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#BDBDBD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007BFF'
  },
  
  profileImagePlaceholderText: { fontSize: 48, color: '#FFFFFF', fontWeight: 'bold'},
  
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5, textAlign: 'center' },
  
  profileEmail: { fontSize: 16, color: '#666', marginBottom: 10, textAlign: 'center' },
  
  profileDetail: { fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center' },
  
  editButton: { backgroundColor: '#007BFF', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20 },
  
  editButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  profileEditContainer: { alignItems: 'stretch' },
  
  imagePickerButton: { alignItems: 'center', marginBottom: 20 },
  
  profileImageEdit: { width: 120, height: 120, borderRadius: 60, marginBottom: 8 },
  
  profileImagePlaceholderEdit: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', marginBottom: 8},
  
  profileImagePlaceholderEditText: {color: '#777', fontSize: 16},
  
  changePhotoText: { color: '#007BFF', fontSize: 16, fontWeight: '500', marginTop: 4 },
  
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15 },
  
  editActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  
  saveButton: { backgroundColor: '#4CAF50' },
  
  cancelButton: { backgroundColor: '#f44336' },
  
  actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign:'center' },
  
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  
  settingLabel: { fontSize: 17, color: '#444', flexShrink: 1, marginRight: 10 },
  
  settingDescription: { fontSize: 13, color: '#777', marginTop: 10, lineHeight: 18, textAlign: 'center' },
  
  uploadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10, },
  
  uploadingText: { marginLeft: 10, fontSize: 16, color: '#555' },
  
  dangerZoneTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d9534f',
    marginBottom: 15,
    textAlign: 'center'
  },
  
  deleteButton: {
    backgroundColor: '#d9534f',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },

  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  dangerZoneDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default ConfiguracoesScreen;