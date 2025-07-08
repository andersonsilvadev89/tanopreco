import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, push, set, onValue, remove, update, serverTimestamp } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import AdBanner from '../components/AdBanner';

// --- Importar o gerenciador de imagens para o fundo ---
import { checkAndDownloadImages } from '../../utils/imageManager'; // Ajuste o caminho

// --- URL padrão de fallback para o fundo local ---
const defaultFundoLocal = require('../../assets/images/fundo.png');

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dz37srew5/image/upload';
const UPLOAD_PRESET = 'expocrato'; 

const UPLOAD_PRESET_LOGO_PNG = 'expocrato_png';
const UPLOAD_PRESET_BANNER_OTIMIZADO = 'expocrato';

interface BannerItem {
  id: string;
  imagemUrl?: string;
  linkUrl?: string;
  descricao?: string;
}

interface PatrocinadorItem {
  id?: string;
  logoUrl?: string;
  nomeEmpresa: string;
  banners: BannerItem[];
  createdAt?: object;
}

export default function CadastroPatrocinadores() {
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [logoUri, setLogoUri] = useState<string | undefined>();
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [patrocinadores, setPatrocinadores] = useState<PatrocinadorItem[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [currentBanners, setCurrentBanners] = useState<BannerItem[]>([]);
  const [novoBannerImagemUri, setNovoBannerImagemUri] = useState<string | undefined>();
  const [novoBannerLinkUrl, setNovoBannerLinkUrl] = useState('');
  const [novoBannerDescricao, setNovoBannerDescricao] = useState('');
  const [editandoBannerId, setEditandoBannerId] = useState<string | null>(null);

  const [loadingUploadLogo, setLoadingUploadLogo] = useState(false);
  const [loadingUploadBanner, setLoadingUploadBanner] = useState(false);
  const [loadingGeral, setLoadingGeral] = useState(false);

  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  const scrollRef = useRef<ScrollView>(null);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na CadastroPatrocinadores:", error);
        setCurrentFundoSource(defaultFundoLocal);
      } finally {
        setFundoAppReady(true);
      }
    };
    loadFundoImage();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const patrocinadoresRef = ref(database, `patrocinadores`);
    const unsubscribePatrocinadores = onValue(patrocinadoresRef, (snapshot) => {
      const data = snapshot.val();
      const lista: PatrocinadorItem[] = data
        ? Object.entries(data).map(([id, valor]: any) => ({ id, ...valor }))
        : [];
      setPatrocinadores(lista.sort((a, b) => (a.nomeEmpresa > b.nomeEmpresa ? 1 : -1)));
    });

    return () => {
      unsubscribePatrocinadores();
    };
  }, [userId]);

  const enviarImagemParaCloudinary = async (uri: string, tipo: 'logo' | 'banner'): Promise<string | undefined> => {
    const uploader = tipo === 'logo' ? setLoadingUploadLogo : setLoadingUploadBanner;
    uploader(true);
    
    const presetToUse = tipo === 'logo' ? UPLOAD_PRESET_LOGO_PNG : UPLOAD_PRESET_BANNER_OTIMIZADO;

    try {
      // --- CORREÇÃO: Instanciando FormData corretamente ---
      const formData = new FormData(); 
      // --- FIM DA CORREÇÃO ---

      const filename = uri.split('/').pop();
      const fileType = filename?.split('.').pop()?.toLowerCase() || 'jpeg'; 

      formData.append('file', {
        uri,
        name: filename || `upload_${tipo}_${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      } as any);
      formData.append('upload_preset', presetToUse);

      const res = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
      });

      const file = await res.json();
      if (res.ok && file.secure_url) {
        console.log(`Upload Cloudinary Sucesso (${tipo}, Preset: ${presetToUse}): Formato ${file.format}, URL ${file.secure_url}`);
        return file.secure_url;
      } else {
        console.error('Erro ao enviar imagem, URL segura não recebida:', file);
        Alert.alert('Erro no Upload', `Não foi possível enviar a imagem do ${tipo}.`);
        return undefined;
      }
    } catch (error) {
      console.error(`Erro ao enviar imagem do ${tipo}:`, error);
      Alert.alert('Erro de Rede', `Falha ao enviar a imagem do ${tipo}. Verifique sua conexão.`);
      return undefined;
    } finally {
      uploader(false);
    }
  };

  const escolherImagem = async ( setImageUriCallback: (uri: string | undefined) => void, clearExistingUrlCallback?: () => void ) => {
    Alert.alert('Selecionar imagem', 'Escolha uma opção', [
      {
        text: 'Galeria',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true,
            aspect: [1, 1],
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUriCallback(result.assets[0].uri);
            clearExistingUrlCallback?.();
          }
        },
      },
      {
        text: 'Câmera',
        onPress: async () => {
          const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (permissionResult.granted === false) {
            Alert.alert("Permissão necessária", "Você precisa permitir o acesso à câmera para usar este recurso.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            allowsEditing: true,
            aspect: [1, 1],
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUriCallback(result.assets[0].uri);
            clearExistingUrlCallback?.();
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const escolherImagemBanner = async ( setImageUriCallback: (uri: string | undefined) => void, clearExistingUrlCallback?: () => void ) => {
    Alert.alert('Selecionar imagem', 'Escolha uma opção', [
      {
        text: 'Galeria',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true,
            aspect: [7, 1],
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUriCallback(result.assets[0].uri);
            clearExistingUrlCallback?.();
          }
        },
      },
      {
        text: 'Câmera',
        onPress: async () => {
          const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (permissionResult.granted === false) {
            Alert.alert("Permissão necessária", "Você precisa permitir o acesso à câmera para usar este recurso.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            allowsEditing: true,
            aspect: [7, 1],
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUriCallback(result.assets[0].uri);
            clearExistingUrlCallback?.();
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const escolherLogoPatrocinador = () => {
    escolherImagem(setLogoUri, () => setLogoUrl(undefined));
  };

  const escolherImagemNovoBanner = () => {
    escolherImagemBanner(setNovoBannerImagemUri);
  };

  const adicionarOuAtualizarBanner = async () => {
    if (!novoBannerImagemUri && !currentBanners.find(b => b.id === editandoBannerId)?.imagemUrl) {
      Alert.alert('Erro', 'A imagem do banner é obrigatória.');
      return;
    }

    let bannerImageUrlCloud: string | undefined = currentBanners.find(b => b.id === editandoBannerId)?.imagemUrl;

    if (novoBannerImagemUri) {
        setLoadingUploadBanner(true);
        bannerImageUrlCloud = await enviarImagemParaCloudinary(novoBannerImagemUri, 'banner');
        setLoadingUploadBanner(false);
        if (!bannerImageUrlCloud) {
            Alert.alert('Erro no Upload', 'Não foi possível enviar a imagem do banner. Tente novamente.');
            return;
        }
    }


    const bannerData: BannerItem = {
      id: editandoBannerId || `banner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imagemUrl: bannerImageUrlCloud,
      linkUrl: novoBannerLinkUrl.trim() || undefined,
      descricao: novoBannerDescricao.trim() || undefined,
    };

    if (editandoBannerId) {
      setCurrentBanners(currentBanners.map(b => (b.id === editandoBannerId ? bannerData : b)));
    } else {
      setCurrentBanners([...currentBanners, bannerData]);
    }

    setNovoBannerImagemUri(undefined);
    setNovoBannerLinkUrl('');
    setNovoBannerDescricao('');
    setEditandoBannerId(null);
  };

  const editarBannerNaLista = (banner: BannerItem) => {
    setEditandoBannerId(banner.id);
    setNovoBannerImagemUri(undefined);
    setNovoBannerLinkUrl(banner.linkUrl || '');
    setNovoBannerDescricao(banner.descricao || '');
    scrollRef.current?.scrollTo({ y: 250, animated: true });
  };

  const removerBannerDaLista = (bannerId: string) => {
    Alert.alert('Confirmar Remoção', 'Deseja remover este banner da lista?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => setCurrentBanners(currentBanners.filter(b => b.id !== bannerId)),
      },
    ]);
  };

  const limparFormularioPatrocinador = () => {
    setLogoUrl(undefined);
    setLogoUri(undefined);
    setNomeEmpresa('');
    setCurrentBanners([]);
    setNovoBannerImagemUri(undefined);
    setNovoBannerLinkUrl('');
    setNovoBannerDescricao('');
    setEditandoId(null);
    setEditandoBannerId(null);
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const salvarPatrocinadorItem = async () => {
    if (!nomeEmpresa.trim()) {
      Alert.alert('Erro', 'O nome da empresa é obrigatório.');
      return;
    }
    if (!logoUri && !logoUrl && !editandoId) {
        Alert.alert('Erro', 'A logomarca da empresa é obrigatória.');
        return;
    }

    if (!userId) {
        Alert.alert('Erro', 'Usuário não autenticado.');
        return;
    }

    setLoadingGeral(true);

    let finalLogoUrl = logoUrl;
    if (logoUri) {
      const uploadedLogoUrl = await enviarImagemParaCloudinary(logoUri, 'logo');
      if (!uploadedLogoUrl) {
        setLoadingGeral(false);
        Alert.alert('Erro no Upload da Logo', 'Não foi possível enviar a logomarca. Tente novamente.');
        return;
      }
      finalLogoUrl = uploadedLogoUrl;
    }

    if (!finalLogoUrl) {
        setLoadingGeral(false);
        Alert.alert('Erro', 'A logomarca da empresa é essencial.');
        return;
    }


    const patrocinadorItemData: PatrocinadorItem = {
      nomeEmpresa: nomeEmpresa.trim(),
      logoUrl: finalLogoUrl,
      banners: currentBanners,
      ...(editandoId ? {} : { createdAt: serverTimestamp() }),
    };

    try {
      if (editandoId) {
        const itemEditarRef = ref(database, `patrocinadores/${editandoId}`);
        await update(itemEditarRef, patrocinadorItemData);
        Alert.alert('Sucesso', 'Patrocinador atualizado!');
      } else {
        const novoRef = push(ref(database, `patrocinadores`));
        await set(novoRef, patrocinadorItemData);
        Alert.alert('Sucesso', 'Patrocinador salvo com sucesso!');
      }
      limparFormularioPatrocinador();
    } catch (error) {
      console.error("Erro ao salvar patrocinador:", error);
      Alert.alert('Erro', 'Não foi possível salvar o patrocinador.');
    } finally {
      setLoadingGeral(false);
    }
  };

  const editarPatrocinador = (item: PatrocinadorItem) => {
    setEditandoId(item.id || null);
    setNomeEmpresa(item.nomeEmpresa);
    setLogoUrl(item.logoUrl);
    setLogoUri(undefined);
    setCurrentBanners(item.banners || []);
    setNovoBannerImagemUri(undefined);
    setNovoBannerLinkUrl('');
    setNovoBannerDescricao('');
    setEditandoBannerId(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const excluirPatrocinador = (id: string) => {
    Alert.alert('Confirmação', 'Deseja excluir este patrocinador? Isso não pode ser desfeito.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            const itemRef = ref(database, `patrocinadores/${id}`);
            await remove(itemRef);
            Alert.alert('Sucesso', 'Patrocinador excluído.');
            if (editandoId === id) {
                limparFormularioPatrocinador();
            }
          } catch (error) {
            console.error("Erro ao excluir patrocinador:", error);
            Alert.alert('Erro', 'Não foi possível excluir o patrocinador.');
          }
        },
      },
    ]);
  };

  // --- Condição de carregamento da imagem de fundo ---
  // A tela principal só é renderizada depois que o fundo está pronto.
  if (!fundoAppReady) {
    return (
      <ImageBackground source={defaultFundoLocal} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando fundo...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={currentFundoSource}
      style={styles.backgroundImage}
    >
      <AdBanner />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>{editandoId ? 'Editar Patrocinador' : 'Cadastrar Novo Patrocinador'}</Text>

            {/* Logomarca da Empresa */}
            <Text style={styles.label}>Logomarca da Empresa *</Text>
            <TouchableOpacity
              onPress={escolherLogoPatrocinador}
              style={styles.imageInputTouchable}
              disabled={loadingUploadLogo}
            >
              {loadingUploadLogo ? (
                <View style={styles.imagePlaceholder}>
                  <ActivityIndicator size="large" color="#000" />
                  <Text style={styles.imagePlaceholderText}>Enviando logo...</Text>
                </View>
              ) : (logoUri || logoUrl) ? (
                <Image source={{ uri: logoUri || logoUrl }} style={styles.fullWidthImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>Toque para selecionar a logomarca</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Nome da Empresa */}
            <Text style={styles.label}>Nome da Empresa *</Text>
            <TextInput
              value={nomeEmpresa}
              onChangeText={setNomeEmpresa}
              placeholder="Nome da empresa patrocinadora"
              style={styles.input}
            />

            {/* Seção de Cadastro de Banners */}
            <View style={styles.bannerSection}>
              <Text style={styles.sectionTitle}>Banners Publicitários</Text>

              <Text style={styles.label}>Imagem do Banner {editandoBannerId ? '(Editando)' : '(Novo)'} *</Text>
              <TouchableOpacity
                onPress={escolherImagemNovoBanner}
                style={styles.imageInputTouchableBanner}
                disabled={loadingUploadBanner}
              >
                {loadingUploadBanner ? (
                  <View style={styles.imagePlaceholder}>
                    <ActivityIndicator size="small" color="#000" />
                    <Text style={styles.imagePlaceholderTextSmall}>Enviando...</Text>
                  </View>
                ) : novoBannerImagemUri ? (
                  <Image source={{ uri: novoBannerImagemUri }} style={styles.fullWidthImage} />
                ) : editandoBannerId && currentBanners.find(b => b.id === editandoBannerId)?.imagemUrl ? (
                  <Image source={{ uri: currentBanners.find(b => b.id === editandoBannerId)?.imagemUrl }} style={styles.fullWidthImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderTextSmall}>Toque para selecionar imagem do banner</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Link do Banner (Opcional)</Text>
              <TextInput
                value={novoBannerLinkUrl}
                onChangeText={setNovoBannerLinkUrl}
                placeholder="https://exemplo.com"
                style={styles.input}
                keyboardType="url"
              />

              <Text style={styles.label}>Descrição do Banner (Opcional)</Text>
              <TextInput
                value={novoBannerDescricao}
                onChangeText={setNovoBannerDescricao}
                placeholder="Breve descrição do banner"
                style={styles.input}
                multiline
              />
              <Button
                title={editandoBannerId ? "Atualizar Banner na Lista" : "Adicionar Banner à Lista"}
                onPress={adicionarOuAtualizarBanner}
                disabled={loadingUploadBanner}
              />
              {editandoBannerId && (
                   <TouchableOpacity style={styles.cancelButtonSmall} onPress={() => {
                     setEditandoBannerId(null);
                     setNovoBannerImagemUri(undefined);
                     setNovoBannerLinkUrl('');
                     setNovoBannerDescricao('');
                   }}>
                     <Text style={styles.cancelButtonTextSmall}>Cancelar Edição do Banner</Text>
                   </TouchableOpacity>
               )}
            </View>

            {/* Lista de Banners Adicionados */}
            {currentBanners.length > 0 && (
              <View style={styles.addedBannersList}>
                <Text style={styles.subSectionTitle}>Banners na lista para este patrocinador:</Text>
                {currentBanners.map((banner) => (
                  <View key={banner.id} style={styles.bannerListItem}>
                    {banner.imagemUrl && <Image source={{ uri: banner.imagemUrl }} style={styles.bannerListImage} />}
                    <View style={styles.bannerListDetails}>
                      <Text style={styles.bannerListText}>
                        Link: {banner.linkUrl || 'N/A'}
                      </Text>
                      <Text style={styles.bannerListText}>
                        Descrição: {banner.descricao || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.bannerListButtons}>
                        <Button title="Editar" onPress={() => editarBannerNaLista(banner)} color="#ffc107" />
                        <View style={{marginTop: 5}}/>
                        <Button title="Remover" onPress={() => removerBannerDaLista(banner.id)} color="#dc3545" />
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionsContainer}>
              <Button
                title={editandoId ? "Atualizar Patrocinador" : "Salvar Patrocinador"}
                onPress={salvarPatrocinadorItem}
                disabled={loadingGeral || loadingUploadLogo || loadingUploadBanner}
              />
              {loadingGeral && <ActivityIndicator style={{ marginLeft: 10 }} size="small" color="#0000ff" />}
            </View>

            {editandoId && (
              <TouchableOpacity style={styles.cancelButton} onPress={limparFormularioPatrocinador}>
                <Text style={styles.cancelButtonText}>Cancelar Edição do Patrocinador</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.separator} />

          {/* Lista de Patrocinadores Cadastrados */}
          <View style={styles.listContainer}>
            <Text style={styles.title}>Patrocinadores Cadastrados</Text>
            {patrocinadores.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum patrocinador cadastrado.</Text>
            ) : (
              patrocinadores.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  {item.logoUrl && (
                    <Image source={{ uri: item.logoUrl }} style={styles.listItemImage} />
                  )}
                  <View style={styles.listItemDetails}>
                    <Text style={styles.listItemTextBold}>{item.nomeEmpresa}</Text>
                    <Text style={styles.listItemText}>Banners: {item.banners?.length || 0}</Text>
                  </View>
                  <View style={styles.listItemButtons}>
                    <Button title="Editar" onPress={() => editarPatrocinador(item)} />
                    <View style={{marginTop: 5}} />
                    <Button title="Excluir" onPress={() => excluirPatrocinador(item.id!)} color="red" />
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  scrollViewContent: {
    padding: 10,
    paddingBottom: 80,
  },
  formContainer: {
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
    marginTop: 10,
  },
  imageInputTouchable: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  imageInputTouchableBanner: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#777',
    fontSize: 16,
    textAlign: 'center',
  },
  imagePlaceholderTextSmall: {
    color: '#777',
    fontSize: 13,
    textAlign: 'center',
  },
  fullWidthImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'contain',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  bannerSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
    textAlign: 'center',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
    marginTop: 15,
    marginBottom: 8,
  },
  addedBannersList: {
    marginTop: 10,
  },
  bannerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  bannerListImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 10,
    resizeMode: 'cover',
  },
  bannerListDetails: {
    flex: 1,
  },
  bannerListText: {
    fontSize: 13,
    color: '#666',
  },
  bannerListButtons: {
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonSmall: {
    backgroundColor: '#ffc107',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonTextSmall: {
    color: '#212529',
    fontWeight: 'bold',
    fontSize: 13,
  },
  separator: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 20,
  },
  listContainer: {
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    paddingVertical: 15,
  },
  listItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  listItemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: 'contain',
  },
  listItemDetails: {
    flex: 1,
  },
  listItemTextBold: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#333',
    marginBottom: 3,
  },
  listItemText: {
    fontSize: 14,
    color: '#555',
  },
  listItemButtons: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  // Estilos para o estado de carregamento do fundo
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // O fundo já será a imagem carregada dinamicamente, ou o fallback local
  },
  loadingText: {
    marginTop: 10,
    color: '#007BFF',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});