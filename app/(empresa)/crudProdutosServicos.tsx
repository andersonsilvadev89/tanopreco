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
import { Masks } from 'react-native-mask-input';
import MaskInput from 'react-native-mask-input';
import * as ImagePicker from 'expo-image-picker';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import AdBanner from '../components/AdBanner';

// --- Importar o gerenciador de imagens para o fundo ---
import { checkAndDownloadImages } from '../../utils/imageManager'; // Ajuste o caminho

// --- URL padrão de fallback para o fundo local ---
const defaultFundoLocal = require('../../assets/images/fundo.png'); // Usando defaultFundoLocal agora

// REMOVIDO: const fundo = require('../../assets/images/fundo.png'); // Não é mais necessário


// --- CONSTANTES DE UPLOAD (MANTIDAS COMO ESTAVAM) ---
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dz37srew5/image/upload';
const UPLOAD_PRESET = 'expocrato';

interface Produto {
  id?: string;
  descricao: string;
  preco: string;
  imagemUrl?: string;
  palavrasChave?: string;
}

export default function CadastroProduto() {
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [palavrasChave, setPalavrasChave] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [imagemUrl, setImagemUrl] = useState<string | undefined>();
  const [imagemUri, setImagemUri] = useState<string | undefined>();
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // --- Novos estados para o carregamento da imagem de fundo dinâmica ---
  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  const scrollRef = useRef<ScrollView>(null);
  const userId = auth.currentUser?.uid;

  // --- NOVO useEffect para carregar a imagem de fundo dinâmica ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na CadastroProduto:", error);
        setCurrentFundoSource(defaultFundoLocal); // Em caso de erro, usa o fallback local
      } finally {
        setFundoAppReady(true); // Indica que o fundo foi processado
      }
    };
    loadFundoImage();
  }, []); // Executa apenas uma vez ao montar o componente

  // Lógica principal da tela (inalterada)
  useEffect(() => {
    if (!userId) return;
    const produtosRef = ref(database, `produtos/${userId}`);
    onValue(produtosRef, (snapshot) => {
      const data = snapshot.val();
      const lista: Produto[] = data
        ? Object.entries(data).map(([id, valor]: any) => ({ id, ...valor }))
        : [];
      setProdutos(lista.reverse());
    });
  }, [userId]);

  const salvarProduto = () => {
    if (!descricao.trim()) {
      Alert.alert('Erro', 'A descrição é obrigatória.');
      return;
    }
    if (!userId) return;

    const produtoRef = ref(database, `produtos/${userId}`);
    const produto: Produto = {
      descricao: descricao,
      preco,
      imagemUrl,
      palavrasChave: palavrasChave,
    };

    if (editandoId) {
      const produtoEditarRef = ref(database, `produtos/${userId}/${editandoId}`);
      update(produtoEditarRef, produto);
      Alert.alert('Sucesso', 'Produto atualizado!');
    } else {
      const novoRef = push(produtoRef);
      set(novoRef, produto);
      Alert.alert('Sucesso', 'Produto salvo com sucesso!');
    }
    limparFormulario();
  };

  const limparFormulario = () => {
    setDescricao('');
    setPreco('');
    setPalavrasChave('');
    setImagemUrl(undefined);
    setImagemUri(undefined);
    setEditandoId(null);
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const excluirProduto = (id: string) => {
    Alert.alert('Confirmação', 'Deseja excluir este produto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          const produtoRef = ref(database, `produtos/${userId}/${id}`);
          remove(produtoRef);
        },
      },
    ]);
  };

  const editarProduto = (produto: Produto) => {
    setDescricao(produto.descricao);
    setPreco(produto.preco);
    setPalavrasChave(produto.palavrasChave || '');
    setImagemUrl(produto.imagemUrl);
    setEditandoId(produto.id || null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const escolherImagem = () => {
    Alert.alert('Selecionar imagem', 'Escolha uma opção', [
      { text: 'Galeria', onPress: selecionarDaGaleria },
      { text: 'Câmera', onPress: selecionarDaCamera },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const selecionarDaGaleria = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      await enviarImagemParaCloudinary(uri);
    }
  };

  const selecionarDaCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permissão necessária", "Você precisa permitir o acesso à câmera.");
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      await enviarImagemParaCloudinary(uri);
    }
  };

  const enviarImagemParaCloudinary = async (uri: string) => {
    setImagemUri(uri);
    try {
      setLoadingUpload(true);
      const data = new FormData();
      data.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'foto.jpg',
      } as any);
      data.append('upload_preset', UPLOAD_PRESET); // Este UPLOAD_PRESET é para a imagem do PRODUTO

      const res = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: data,
      });

      const file = await res.json();
      if (res.ok && file.secure_url) {
        setImagemUrl(file.secure_url);
      } else {
        console.error('Erro ao enviar imagem do produto:', file);
        Alert.alert('Erro ao enviar imagem do produto. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar imagem do produto (conexão):', error);
      Alert.alert('Erro de conexão ao enviar imagem. Tente novamente.');
    } finally {
      setLoadingUpload(false);
    }
  };

  const produtosFiltrados = produtos.filter((p) => {
    if (termoBusca.length < 3) return true;
    const termo = termoBusca.toLowerCase();
    return (
      p.descricao.toLowerCase().includes(termo) ||
      p.palavrasChave?.toLowerCase().includes(termo)
    );
  });

  // --- Condição de carregamento da imagem de fundo ---
  if (!fundoAppReady) {
    return (
      <ImageBackground source={defaultFundoLocal} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando fundo...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={currentFundoSource} style={styles.background} resizeMode="cover">
      <AdBanner />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>Cadastro de Produto</Text>

            <View style={styles.imageContainer}>
              <TouchableOpacity onPress={escolherImagem} accessible accessibilityLabel="Toque para escolher a imagem do produto">
                {loadingUpload ? (
                  <View style={styles.imagePlaceholder}>
                    <ActivityIndicator size="large" color="#000" />
                    <Text>Enviando imagem...</Text>
                  </View>
                ) : imagemUrl ? (
                  <Image source={{ uri: imagemUrl }} style={styles.fullWidthImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text>Toque para selecionar uma imagem</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text>Descrição *</Text>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Descrição do produto"
              style={styles.input}
              accessibilityLabel="Campo para inserir a descrição do produto"
            />

            <Text>Preço</Text>
            <MaskInput
              value={preco}
              onChangeText={(masked) => setPreco(masked)}
              placeholder="R$ 0,00"
              keyboardType="numeric"
              style={styles.input}
              mask={Masks.BRL_CURRENCY}
              accessibilityLabel="Campo para inserir o preço do produto"
            />

            <Text>Palavras-chave</Text>
            <TextInput
              value={palavrasChave}
              onChangeText={setPalavrasChave}
              placeholder="Ex: comida, bebida, etc."
              style={styles.input}
              accessibilityLabel="Campo para inserir palavras-chave relacionadas ao produto"
            />

            <Button title={editandoId ? "Atualizar Produto" : "Salvar Produto"} onPress={salvarProduto} accessibilityLabel="Botão para salvar ou atualizar o produto" />
          </View>

          <View style={styles.productListContainer}>
            <TextInput
              value={termoBusca}
              onChangeText={setTermoBusca}
              placeholder="Buscar produtos..."
              style={styles.input}
              accessibilityLabel="Campo para buscar produtos cadastrados"
            />
            <Text style={styles.sectionTitle}>
              Produtos Cadastrados
            </Text>
            {produtosFiltrados.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum produto cadastrado.</Text>
            ) : (
              produtosFiltrados.map((item) => (
                <View key={item.id} style={styles.listItemContainer}>
                  {item.imagemUrl && (
                    <Image
                      source={{ uri: item.imagemUrl }}
                      style={styles.fullWidthImage}
                    />
                  )}
                  <View style={styles.productDetails}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listItemTextBold}>{item.descricao}</Text>
                      {item.preco && <Text style={styles.listItemText}>Preço: {item.preco}</Text>}
                      {item.palavrasChave && <Text style={styles.listItemText}>Tags: {item.palavrasChave}</Text>}
                    </View>
                    <View style={styles.buttonColumn}>
                      <Button title="Editar" onPress={() => editarProduto(item)} accessibilityLabel={`Editar o produto ${item.descricao}`} />
                      <Button title="Excluir" onPress={() => excluirProduto(item.id!)} color="red" accessibilityLabel={`Excluir o produto ${item.descricao}`} />
                    </View>
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

// ESTILOS ATUALIZADOS
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 10,
    paddingBottom: 10,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  imageContainer: {
    marginBottom: 10,
  },
  imagePlaceholder: {
    height: 150,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  fullWidthImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#888',
  },
  listItemContainer: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  listItemTextBold: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  listItemText: {
    marginBottom: 3,
  },
  buttonColumn: {
    marginLeft: 10,
    justifyContent: 'space-between',
    height: 80,
  },
  productListContainer: {
    backgroundColor: 'rgba(224, 247, 250, 0.9)',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Estilos para o estado de carregamento do fundo
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Cor de fundo para o estado de carregamento
  },
  loadingText: {
    marginTop: 10,
    color: '#007BFF', // Cor do texto de carregamento
    fontSize: 16,
  },
});