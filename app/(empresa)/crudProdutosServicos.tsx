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
  Linking, // <--- Importe o Linking
} from 'react-native';
import { Masks } from 'react-native-mask-input';
import MaskInput from 'react-native-mask-input';
import * as ImagePicker from 'expo-image-picker';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import AdBanner from '../components/AdBanner';

// --- Importar o gerenciador de imagens para o fundo ---
import { checkAndDownloadImages } from '../../utils/imageManager';

// --- URL padrão de fallback para o fundo local ---
const defaultFundoLocal = require('../../assets/images/fundo.png');

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

// Interface para os dados da empresa (para obter maxProdutosGratuitos)
interface EmpresaData {
  maxProdutosGratuitos?: number;
  // Adicione outros campos da empresa que você precise ler aqui, se houver
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

  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  const [maxProdutosGratuitos, setMaxProdutosGratuitos] = useState<number | null>(null);
  const [loadingCompanyData, setLoadingCompanyData] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na CadastroProduto:", error);
        setCurrentFundoSource(defaultFundoLocal);
      } finally {
        setFundoAppReady(true);
      }
    };
    loadFundoImage();
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoadingCompanyData(false);
      return;
    }

    setLoadingCompanyData(true);
    const companyRef = ref(database, `solicitacoesEmpresas/${userId}`);
    const unsubscribeCompany = onValue(companyRef, (snapshot) => {
      const data: EmpresaData | null = snapshot.val();
      if (data && typeof data.maxProdutosGratuitos === 'number') {
        setMaxProdutosGratuitos(data.maxProdutosGratuitos);
      } else {
        setMaxProdutosGratuitos(0);
        console.warn("maxProdutosGratuitos não encontrado ou inválido para esta empresa. Definindo como 0.");
      }
      setLoadingCompanyData(false);
    }, (error) => {
      console.error("Erro ao carregar dados da empresa (maxProdutosGratuitos):", error);
      setMaxProdutosGratuitos(0);
      setLoadingCompanyData(false);
    });

    return () => unsubscribeCompany();
  }, [userId]);


  useEffect(() => {
    if (!userId) return;
    const produtosRef = ref(database, `produtos/${userId}`);
    const unsubscribeProdutos = onValue(produtosRef, (snapshot) => {
      const data = snapshot.val();
      const lista: Produto[] = data
        ? Object.entries(data).map(([id, valor]: any) => ({ id, ...valor }))
        : [];
      setProdutos(lista.reverse());
    });
    return () => unsubscribeProdutos();
  }, [userId]);

  const salvarProduto = () => {
    if (!descricao.trim()) {
      Alert.alert('Erro', 'A descrição é obrigatória.');
      return;
    }
    if (!userId) return;

    if (editandoId === null && maxProdutosGratuitos !== null) {
      if (produtos.length >= maxProdutosGratuitos) {
        Alert.alert(
          'Limite de Produtos Atingido',
          `Você já cadastrou o máximo de ${maxProdutosGratuitos} produtos permitidos gratuitamente. Para cadastrar mais, por favor, entre em contato com o suporte para verificar os planos pagos.`,
          [
            { text: 'Agora Não              ', style: 'cancel' }, // Opção para fechar sem ação
            {
              text: 'Ver Pacotes', // <--- Texto do botão alterado
              onPress: () => Linking.openURL('https://stoantoniobarbalhacliente.web.app/pacotes.html'),
            },
            // Você pode adicionar mais botões com outros links aqui
            // {
            //   text: 'Ver Planos',
            //   onPress: () => Linking.openURL('SUA_URL_DE_PLANOS_AQUI'),
            // },
          ]
        );
        return;
      }
    }

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
      data.append('upload_preset', UPLOAD_PRESET);

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

  if (!fundoAppReady || loadingCompanyData) {
    return (
      <ImageBackground source={currentFundoSource} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando dados da empresa...</Text>
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

            {maxProdutosGratuitos !== null && (
              <Text style={styles.limitMessage}>
                Você pode cadastrar até {maxProdutosGratuitos} produtos gratuitamente.
                Atualmente você tem {produtos.length} produtos cadastrados.
              </Text>
            )}

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

            <Button
              title={editandoId ? "Atualizar Produto" : "Salvar Produto"}
              onPress={salvarProduto}
              accessibilityLabel="Botão para salvar ou atualizar o produto"
              disabled={loadingUpload}
            />
            {editandoId && (
              <TouchableOpacity style={styles.clearFormButton} onPress={limparFormulario}>
                <Text style={styles.clearFormButtonText}>Cancelar Edição / Limpar</Text>
              </TouchableOpacity>
            )}
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
              Produtos Cadastrados ({produtos.length} {maxProdutosGratuitos !== null ? `/ ${maxProdutosGratuitos}` : ''})
            </Text>
            {produtosFiltrados.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum produto encontrado.</Text>
            ) : (
              produtosFiltrados.map((item) => (
                <View key={item.id} style={styles.listItemContainer}>
                  {item.imagemUrl && (
                    <Image
                      source={{ uri: item.imagemUrl }}
                      style={styles.listItemImage}
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
  limitMessage: {
    fontSize: 14,
    color: '#007BFF',
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
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
  listItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    color: '#007BFF',
    fontSize: 16,
  },
  clearFormButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  clearFormButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});