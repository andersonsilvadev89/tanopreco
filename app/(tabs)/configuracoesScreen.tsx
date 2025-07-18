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
  Platform,
  Linking,
  ActivityIndicator,
  SafeAreaView,
  AppState,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Location from 'expo-location';
import *as TaskManager from 'expo-task-manager';
import { ref, set, remove, get } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import { deleteUser } from 'firebase/auth';
import AdBanner from '../components/AdBanner'; 

import { checkAndDownloadImages } from '../../utils/imageManager'; 

const defaultFundoLocal = require('../../assets/images/fundo.png');

import Constants from 'expo-constants'; 

const LOCATION_TASK_NAME = 'background-location-task';
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dz37srew5/image/upload';
const UPLOAD_PRESET = 'expocrato';

interface UserProfile {
  nome: string;
  email: string;
  telefone?: string;
  imagem?: string;
  compartilhando?: boolean;
  instagram?: string;
}

const ConfiguracoesScreen = () => {
  const [compartilhando, setCompartilhando] = useState(false);
  const [hasBackgroundPermission, setHasBackgroundPermission] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nome, setNome] = useState(auth.currentUser?.displayName || '');
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [telefone, setTelefone] = useState('');
  const [imagem, setImagem] = useState(auth.currentUser?.photoURL || '');
  const [novaImagemUri, setNovaImagemUri] = useState<string | null>(null);
  const [instagram, setInstagram] = useState('');

  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  const usuarioId = auth.currentUser?.uid;
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na ConfiguracoesScreen:", error);
        setCurrentFundoSource(defaultFundoLocal);
      } finally {
        setFundoAppReady(true);
      }
    };
    loadFundoImage();
  }, []);

  const checkLocationAndTaskStatus = async () => {
    if (!usuarioId) {
        setCompartilhando(false);
        setHasBackgroundPermission(false);
        return;
    }

    try {
        const { status: currentForegroundStatus } = await Location.getForegroundPermissionsAsync();
        const { status: currentBackgroundStatus } = await Location.getBackgroundPermissionsAsync();
        
        const isTaskRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

        setHasBackgroundPermission(currentBackgroundStatus === 'granted');

        const userRef = ref(database, `usuarios/${usuarioId}`);
        const userSnapshot = await get(userRef);
        
        const profileData: UserProfile = userSnapshot.exists() 
            ? (userSnapshot.val() as UserProfile) 
            : { nome: '', email: '', compartilhando: false };

        const sharingFromDb = profileData.compartilhando === true;

        // Determine o status REAL do compartilhamento
        // O compartilhamento só está ATIVO se:
        // 1. O usuário ativou a intenção no Firebase.
        // 2. A task de localização ESTÁ rodando.
        // 3. Pelo menos a permissão de foreground está concedida (essencial para qualquer localização).
        const reallySharing = sharingFromDb && isTaskRunning && currentForegroundStatus === 'granted';

        setCompartilhando(reallySharing); // Atualiza o switch na UI

        // --- NOVA LÓGICA DE SINCRONIZAÇÃO COM FIREBASE ---
        // Se o Firebase diz que está compartilhando, mas na verdade não está (e não deveria estar, ex: permissão revogada)
        if (sharingFromDb && !reallySharing) {
            console.warn("Detectado que compartilhamento deveria estar ativo no DB, mas não está funcionando. Sincronizando DB.");
            // Atualiza o Firebase para 'false'
            await set(ref(database, `usuarios/${usuarioId}/compartilhando`), false);
            // Limpa os dados de localização no Firebase
            await set(ref(database, `localizacoes/${usuarioId}`), { compartilhando: false, latitude: null, longitude: null, timestamp: Date.now(), nome: nome });
            
            // Se a task estava rodando mas a permissão foi removida, tentar parar
            if (isTaskRunning) {
                console.log("Tentando parar a task de localização que não deveria estar ativa.");
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            }
        }
        // --- FIM DA NOVA LÓGICA ---

    } catch (error) {
        console.error("Erro ao verificar status de localização e task:", error);
        setCompartilhando(false);
        setHasBackgroundPermission(false);
        // Em caso de erro, também garantir que o Firebase reflita o estado de não compartilhamento
        if (usuarioId) {
            await set(ref(database, `usuarios/${usuarioId}/compartilhando`), false);
            await set(ref(database, `localizacoes/${usuarioId}`), { compartilhando: false, latitude: null, longitude: null, timestamp: Date.now(), nome: nome });
            if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            }
        }
    } finally {
        // setCarregando(false); // Opcional
    }
  };


  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
        if (appState.match(/inactive|background/) && nextAppState === 'active') {
            console.log('App has come to the foreground! Revalidating location permissions.');
            checkLocationAndTaskStatus(); // Revalida status ao retornar ao app
        }
        setAppState(nextAppState);
    });

    let isMounted = true;
    const loadUserProfileAndInitialStatus = async () => {
        if (!isMounted) return;
        setCarregando(true);
        if (!usuarioId) {
            setCarregando(false);
            return;
        }
        try {
            const userRef = ref(database, `usuarios/${usuarioId}`);
            const userSnapshot = await get(userRef);
            
            if (isMounted && userSnapshot.exists()) {
                const profileData = userSnapshot.val() as UserProfile;
                setNome(profileData.nome || auth.currentUser?.displayName || '');
                setEmail(profileData.email || auth.currentUser?.email || '');
                setTelefone(profileData.telefone || '');
                setImagem(profileData.imagem || auth.currentUser?.photoURL || '');
                setInstagram(profileData.instagram || '');
            } else if (isMounted && auth.currentUser) {
                const initialNome = auth.currentUser.displayName || '';
                const initialEmail = auth.currentUser.email || '';
                const initialImagem = auth.currentUser.photoURL || '';
                
                setNome(initialNome);
                setEmail(initialEmail);
                setTelefone('');
                setImagem(initialImagem);
                setInstagram('');
                await set(userRef, {
                    nome: initialNome, email: initialEmail, telefone: '',
                    imagem: initialImagem, compartilhando: false, instagram: ''
                });
            }
            setNovaImagemUri(null);
        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
            if(isMounted && auth.currentUser){
                setNome(auth.currentUser.displayName || '');
                setEmail(auth.currentUser.email || '');
                setTelefone('');
                setImagem(auth.currentUser.photoURL || '');
                setInstagram('');
                setNovaImagemUri(null);
            }
        } finally {
            if(isMounted) {
                setCarregando(false);
                checkLocationAndTaskStatus();
            }
        }
    };

    loadUserProfileAndInitialStatus();

    return () => { 
      isMounted = false; 
      subscription.remove();
    }
  }, [usuarioId, appState]);

  const toggleBackgroundPermission = async (valor: boolean) => {
    if (!usuarioId) return;

    if (valor) {
        const { status: currentStatus } = await Location.getBackgroundPermissionsAsync();
        if (currentStatus === 'granted') {
            setHasBackgroundPermission(true); 
            Alert.alert("Permissão Concedida", "A permissão de localização 'Permitir o tempo todo' já está ativa.");
        } else {
            const { status: newStatus } = await Location.requestBackgroundPermissionsAsync();
            if (newStatus === 'granted') {
                 setHasBackgroundPermission(true); 
                 Alert.alert("Permissão Concedida", "Agora, a localização poderá ser usada em segundo plano.");
            } else {
                setHasBackgroundPermission(false); 
                Alert.alert(
                    'Permissão "Permitir o tempo todo" Necessária',
                    'Para que a localização em segundo plano funcione, por favor, vá nas configurações do aplicativo e em "Permissões" ou "Localização", selecione a opção "Permitir o tempo todo".',
                    [
                        { text: 'Abrir Configurações', onPress: () => Linking.openSettings() }, 
                        { text: 'Cancelar', style: 'cancel' }
                    ]
                );
            }
        }
    } else {
        setHasBackgroundPermission(false); 
        Alert.alert(
            'Desativar Permissão',
            'Para desativar completamente a localização em segundo plano, você precisará ir nas configurações do seu dispositivo. Lá, mude a permissão de localização para "Durante o uso do app" ou "Negar".',
            [
                { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
                { text: 'Ok', style: 'cancel' }
            ]
        );
    }
    checkLocationAndTaskStatus();
  };


  const toggleCompartilhamento = async (valor: boolean) => {
    if (!usuarioId) return;
    
    const userStatusRef = ref(database, `usuarios/${usuarioId}/compartilhando`);
    
    try {
        await set(userStatusRef, valor); // Atualiza a intenção no Firebase

        if (valor) {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            
            if (foregroundStatus !== 'granted') {
                Alert.alert(
                    'Permissão de Localização Necessária',
                    'A permissão de localização em primeiro plano é essencial para iniciar o compartilhamento. Por favor, conceda esta permissão nas configurações do seu dispositivo.',
                    [
                        { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
                        { text: 'Ok', style: 'cancel' }
                    ]
                );
                await set(userStatusRef, false);
                return; 
            }
            
            const isTaskRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
            if (!isTaskRunning) {
                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 60000 * 1,
                    distanceInterval: 50,
                    showsBackgroundLocationIndicator: true,
                    pausesUpdatesAutomatically: false,
                    activityType: Location.ActivityType.Other,
                    foregroundService: {
                        notificationTitle: 'Assistente de Eventos',
                        notificationBody: 'Compartilhamento de localização ativo.',
                        notificationColor: '#007BFF',
                    },
                });
                Alert.alert('Compartilhamento Ativado', 'Sua localização está sendo gerenciada.');
            } else {
                 Alert.alert('Compartilhamento Já Ativo', 'Sua localização já estava sendo gerenciada.');
            }

            const { status: currentBackgroundStatus } = await Location.getBackgroundPermissionsAsync();
            setHasBackgroundPermission(currentBackgroundStatus === 'granted');

            if (currentBackgroundStatus !== 'granted') {
                Alert.alert(
                    'Permissão de Segundo Plano',
                    'Para garantir que o compartilhamento funcione em segundo plano (com o app fechado), ative "Permitir o tempo todo" nas configurações de localização do app. Use o switch abaixo.',
                    [{ text: 'Ok' }] 
                );
            }

        } else {
            const isTaskRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
            if (isTaskRunning) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                Alert.alert('Compartilhamento Desativado');
            } else {
                Alert.alert('Compartilhamento Desativado', 'A tarefa de localização já não estava ativa.');
            }
            // Limpa os dados de localização do usuário no Firebase
            await set(ref(database, `localizacoes/${usuarioId}`), { compartilhando: false, latitude: null, longitude: null, timestamp: Date.now(), nome: nome });
        }
    } catch (error) {
        console.error("Erro ao alternar compartilhamento:", error);
        Alert.alert("Erro", "Falha ao alterar status de compartilhamento.");
        await set(userStatusRef, !valor); 
    } finally {
        checkLocationAndTaskStatus(); 
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

    const userRef = ref(database, `usuarios/${usuarioId}`);
    try {
        const snapshotCompartilhando = await get(ref(database, `usuarios/${usuarioId}/compartilhando`));
        const compartilhandoDB = snapshotCompartilhando.exists() ? snapshotCompartilhando.val() : false;

        await set(userRef, {
            nome, 
            email, 
            telefone: telefone || null,
            imagem: finalImageUrl,
            compartilhando: compartilhandoDB,
            instagram: processedInstagram, 
        });

        setImagem(finalImageUrl);
        setInstagram(processedInstagram || ''); 
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
        setInstagram(profileData.instagram || '');
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
              if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
              }
              const userId = user.uid;
              const userProfileRef = ref(database, `usuarios/${userId}`);
              const userLocationRef = ref(database, `localizacoes/${userId}`);
              
              await remove(userProfileRef);
              await remove(userLocationRef);

              await deleteUser(user);
              Alert.alert("Conta Excluída", "Sua conta foi removida com sucesso.");

            } catch (error: any) {
              console.error("Erro ao excluir conta:", error);
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

  if (carregando || !fundoAppReady) {
    return (
      <ImageBackground source={currentFundoSource} style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </ImageBackground>
    );
  }

  const displayImageUri = novaImagemUri || imagem;

  return (
    <ImageBackground source={currentFundoSource} style={styles.background}>
      <AdBanner />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 0}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
      >
        <SafeAreaView style={styles.innerContainer}>
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
                {instagram ? <Text style={styles.profileDetail}>Instagram: @{instagram}</Text> : null}
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
                <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome Completo" placeholderTextColor="#666"/>
                <TextInput style={styles.input} value={email} placeholder="Email" autoCapitalize="none" placeholderTextColor="#666" editable={false} />
                <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="Telefone (Ex: 88912345678)" keyboardType="phone-pad" placeholderTextColor="#666"/>
                <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} placeholder="Instagram (opcional)" autoCapitalize="none" placeholderTextColor="#666"/>
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
              <Text style={styles.settingLabel}>Ativar compartilhamento de localização</Text>
              <Switch
                value={compartilhando}
                onValueChange={toggleCompartilhamento}
                thumbColor={compartilhando ? '#4CAF50' : '#f4f3f4'}
                trackColor={{ false: '#ccc', true: '#81c784' }}
              />
            </View>
            <Text style={styles.settingDescription}>
              Seu aplicativo enviará sua localização ao servidor quando você ativar.
            </Text>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Manter localização em segundo plano (Permitir o tempo todo)</Text>
              <Switch
                value={hasBackgroundPermission}
                onValueChange={toggleBackgroundPermission}
                thumbColor={hasBackgroundPermission ? '#2196F3' : '#f4f3f4'}
                trackColor={{ false: '#ccc', true: '#90CAF9' }}
              />
            </View>
            <Text style={styles.settingDescription}>
              Para que o compartilhamento funcione mesmo quando o aplicativo estiver fechado, é necessário conceder a permissão "Permitir o tempo todo" nas configurações do seu dispositivo.
            </Text>
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
  );
};

const styles = StyleSheet.create({
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
  background: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingTop: 60 + (Platform.OS === 'ios' ? Constants.statusBarHeight : 0) },
  innerContainer: { paddingHorizontal: 20, paddingVertical: 20, },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  profileDisplayContainer: { alignItems: 'center' },
  profileImageTouchable: { marginBottom: 15, borderRadius: 60, overflow: 'hidden' }, 
  profileImage: { width: 120, height: 120, borderRadius: 60, },
  profileImagePlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#BDBDBD', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#007BFF'},
  profileImagePlaceholderText: { fontSize: 48, color: '#FFFFFF', fontWeight: 'bold'},
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5, textAlign: 'center' },
  profileEmail: { fontSize: 16, color: '#666', marginBottom: 10, textAlign: 'center' },
  profileDetail: { fontSize: 16, color: '#666', marginBottom: 10, textAlign: 'center' },
  editButton: { backgroundColor: '#007BFF', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, marginTop: 10 },
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
  uploadingText: { marginLeft: 10, fontSize: 16, color: '#555' }
});

export default ConfiguracoesScreen;