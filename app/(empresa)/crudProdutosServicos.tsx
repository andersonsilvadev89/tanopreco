import React, { useState, useEffect, useRef } from "react";
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
  Linking,
  Switch,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ref,
  push,
  set,
  onValue,
  remove,
  update,
  get,
} from "firebase/database";
import { auth, database } from "../../firebaseConfig";
import { AppHeaderTitle } from "../components/shell/AppHeaderTitle";
import { DrawerMenu } from "../components/shell/DrawerMenu";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker"; // ✅ IMPORTADO
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signOut } from "firebase/auth";

import LocalizacaoModal from "../components/LocalizacaoModal";
import { BRAND_COLORS } from "@/constants/BrandColors";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dvekhdfgc/image/upload";
const UPLOAD_PRESET = "tanopreco";

const { height } = Dimensions.get("window");

const getThirtyDaysFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatarData = (text: string) => {
  const cleaned = text.replace(/\D/g, "");
  const dia = cleaned.substring(0, 2);
  const mes = cleaned.substring(2, 4);
  const ano = cleaned.substring(4, 8);

  let formattedDate = "";
  if (dia) {
    formattedDate += dia;
  }
  if (mes) {
    formattedDate += `/${mes}`;
  }
  if (ano) {
    formattedDate += `/${ano}`;
  }

  return formattedDate.substring(0, 10);
};

const isOfertaVencida = (dataString?: string) => {
  if (!dataString) return false;
  
  const parts = dataString.split('/');
  if (parts.length !== 3) return false;
  
  const dia = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1;
  const ano = parseInt(parts[2], 10);
  
  const dataOferta = new Date(ano, mes, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return dataOferta < hoje;
};

const formatarPreco = (valor: string) => {
  const cleaned = valor.replace(/\D/g, "");
  let num = parseInt(cleaned, 10);
  if (isNaN(num)) num = 0;
  const reais = (num / 100).toFixed(2);
  return `R$ ${reais.replace(".", ",")}`;
};

const categorias = [
  "Alimentação",
  "Bebidas",
  "Serviços",
  "Moda",
  "Beleza",
  "Saúde",
  "Tecnologia",
  "Móveis",
  "Kids",
  "Imóveis",
  "Construção",
  "Autos",
  "Mercado",
  "Utilidades",
  "Outros",
];

interface Produto {
  id?: string;
  descricao: string;
  preco: string;
  imagemUrl?: string;
  palavrasChave?: string;
  dataFinalOferta?: string;
  enquantoDurarEstoque?: boolean; 
  destaque?: boolean;
  editavel?: boolean;
  localizacaoDiferente?: boolean;
  latitude: number | null;
  longitude: number | null;
}

interface EmpresaData {
  produtosDisponiveis?: number;
  destaquesDisponiveis?: number;
}

export default function CadastroProduto() {
  const insets = useSafeAreaInsets();
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [palavrasChave, setPalavrasChave] = useState("");
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  const [dataFinalOferta, setDataFinalOferta] = useState(getThirtyDaysFromNow());
  
  // ✅ NOVO ESTADO PARA CONTROLAR O CALENDÁRIO
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [enquantoDurarEstoque, setEnquantoDurarEstoque] = useState(false);
  const [destaque, setDestaque] = useState(false);
  const [editavel, setEditavel] = useState(false);
  const [imagemUrl, setImagemUrl] = useState<string | undefined>();
  const [imagemUri, setImagemUri] = useState<string | undefined>();
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [localizacaoDiferente, setLocalizacaoDiferente] = useState(false);
  const [modalMapaVisivel, setModalMapaVisivel] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [loadingUpload, setLoadingUpload] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroData, setFiltroData] = useState<'todos' | 'vencidos' | 'em_dia'>('todos');

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<number | null>(null);
  const [destaquesDisponiveis, setDestaquesDisponiveis] = useState<number | null>(null);
  const [loadingCompanyData, setLoadingCompanyData] = useState(true);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [drawerMenuVisible, setDrawerMenuVisible] = useState(false);

  const [descricaoY, setDescricaoY] = useState(0);
  const [precoY, setPrecoY] = useState(0);
  const [dataFinalOfertaY, setDataFinalOfertaY] = useState(0);
  const [palavrasChaveY, setPalavrasChaveY] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const userId = auth.currentUser?.uid;

  const scrollToInput = (y: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: y - 50, animated: true });
    }, 300);
  };

  useEffect(() => {
    if (!userId) {
      setLoadingCompanyData(false);
      return;
    }

    setLoadingCompanyData(true);
    const companyRef = ref(database, `usuariosEmpresa/${userId}`);
    const unsubscribeCompany = onValue(
      companyRef,
      (snapshot) => {
        const data: EmpresaData | null = snapshot.val();
        if (data && typeof data.produtosDisponiveis === "number") {
          setProdutosDisponiveis(data.produtosDisponiveis);
          setEditavel(data.produtosDisponiveis > 5);
        } else {
          setProdutosDisponiveis(0);
        }
        if (data && typeof data.destaquesDisponiveis === "number") {
          setDestaquesDisponiveis(data.destaquesDisponiveis);
        } else {
          setDestaquesDisponiveis(0);
        }
        setLoadingCompanyData(false);
      },
      () => {
        setProdutosDisponiveis(0);
        setLoadingCompanyData(false);
      }
    );

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

  useEffect(() => {
    const palavrasChaveAdicionais = palavrasChave
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0 && !categorias.includes(w));
    const allPalavrasChave = [
      ...categoriasSelecionadas,
      ...palavrasChaveAdicionais,
    ];
    setPalavrasChave(allPalavrasChave.join(", "));
  }, [categoriasSelecionadas]);

  // ✅ CONVERTER STRING 'DD/MM/AAAA' PARA OBJETO DATE (Para o picker abrir na data certa)
  const getDateObject = (dateString: string) => {
    if (!dateString || dateString.length !== 10) return new Date();
    const parts = dateString.split('/');
    const dia = parseInt(parts[0], 10);
    const mes = parseInt(parts[1], 10) - 1;
    const ano = parseInt(parts[2], 10);
    return new Date(ano, mes, dia);
  };

  // ✅ FUNÇÃO CHAMADA AO ESCOLHER A DATA NO CALENDÁRIO
  const onChangeDatePicker = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // No iOS pode manter aberto, no Android fecha
    if (event.type === "set" && selectedDate) {
        setShowDatePicker(false);
        const dia = String(selectedDate.getDate()).padStart(2, "0");
        const mes = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const ano = selectedDate.getFullYear();
        setDataFinalOferta(`${dia}/${mes}/${ano}`);
    } else if (event.type === "dismissed") {
        setShowDatePicker(false);
    }
  };

  const salvarProduto = async () => {
    if (!descricao.trim()) {
      Alert.alert("Erro", "A descrição é obrigatória.");
      return;
    }

    if (categoriasSelecionadas.length > 2) {
      Alert.alert(
        "Atenção",
        "Você pode selecionar no máximo 2 categorias para um produto."
      );
      return;
    }
    if (categoriasSelecionadas.length === 0) {
      Alert.alert("Erro", "Selecione pelo menos uma categoria.");
      return;
    }
    if (!userId) return;

    if (editandoId === null && produtosDisponiveis !== null) {
      if (produtos.length >= produtosDisponiveis) {
        Alert.alert(
          "Limite de Produtos Atingido",
          `Você já cadastrou o máximo de ${produtosDisponiveis} produtos permitidos.`,
          [
            { text: "Agora Não", style: "cancel" },
            {
              text: "Ver Pacotes",
              onPress: () =>
                Linking.openURL("https://tanopreco-67706.web.app"),
            },
          ]
        );
        return;
      }
    }

    if (
      destaque &&
      (destaquesDisponiveis === null || destaquesDisponiveis <= 0)
    ) {
      Alert.alert(
        "Destaques indisponíveis",
        "Você não pode destacar seus produtos. Por favor, adquira um de nossos pacotes para usar este recurso."
      );
      return;
    }

    if (
      localizacaoDiferente &&
      (latitude === null || longitude === null)
    ) {
      Alert.alert("Atenção", "Selecione a localização customizada no mapa.");
      return;
    }

    const produtoRef = ref(database, `produtos/${userId}`);
    const produto: Produto = {
      descricao: descricao,
      preco,
      imagemUrl,
      palavrasChave: [
        ...categoriasSelecionadas,
        ...palavrasChave
          .split(",")
          .map((w) => w.trim())
          .filter((w) => w.length > 0 && !categorias.includes(w)),
      ].join(", "),
      dataFinalOferta,
      enquantoDurarEstoque, 
      destaque,
      editavel,
      localizacaoDiferente,
      latitude: localizacaoDiferente ? latitude : null,
      longitude: localizacaoDiferente ? longitude : null,
    };

    if (editandoId) {
      const produtoEditarRef = ref(
        database,
        `produtos/${userId}/${editandoId}`
      );
      update(produtoEditarRef, produto);
      Alert.alert("Sucesso", "Produto atualizado!");
    } else {
      const novoRef = push(produtoRef);
      set(novoRef, produto);
      Alert.alert("Sucesso", "Produto salvo com sucesso!");

      if (destaque && destaquesDisponiveis !== null) {
        const empresaRef = ref(database, `usuariosEmpresa/${userId}`);
        const novoValor = destaquesDisponiveis - 1;
        await update(empresaRef, { destaquesDisponiveis: novoValor });
      }
    }
    limparFormulario();
  };

  const limparFormulario = () => {
    setDescricao("");
    setPreco("");
    setPalavrasChave("");
    setCategoriasSelecionadas([]);
    setDataFinalOferta(getThirtyDaysFromNow());
    setEnquantoDurarEstoque(false); 
    setImagemUrl(undefined);
    setImagemUri(undefined);
    setEditandoId(null);
    setDestaque(false);
    setLocalizacaoDiferente(false);
    setLatitude(null);
    setLongitude(null);
    Keyboard.dismiss();
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const excluirProduto = (id: string) => {
    Alert.alert("Confirmação", "Deseja excluir este produto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          if (!userId) return;
          const produtoRef = ref(database, `produtos/${userId}/${id}`);
          try {
            const snapshot = await get(produtoRef);
            const produtoParaExcluir = snapshot.val();
            if (produtoParaExcluir?.destaque && destaquesDisponiveis !== null) {
              const empresaRef = ref(database, `usuariosEmpresa/${userId}`);
              const novoValor = destaquesDisponiveis + 1;
              await update(empresaRef, { destaquesDisponiveis: novoValor });
            }
            await remove(produtoRef);
            Alert.alert("Sucesso", "Produto excluído!");
          } catch (error) {
            Alert.alert(
              "Erro",
              "Não foi possível excluir o produto. Tente novamente."
            );
          }
        },
      },
    ]);
  };

  const editarProduto = (produto: Produto) => {
    setDescricao(produto.descricao);
    setPreco(produto.preco);
    const todasPalavras = (produto.palavrasChave || "")
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    const categoriasDoProduto = todasPalavras.filter((w) =>
      categorias.includes(w)
    );
    const outrasPalavras = todasPalavras.filter((w) => !categorias.includes(w));
    setCategoriasSelecionadas(categoriasDoProduto);
    setPalavrasChave(outrasPalavras.join(", "));
    setDataFinalOferta(produto.dataFinalOferta || getThirtyDaysFromNow());
    
    setEnquantoDurarEstoque(!!produto.enquantoDurarEstoque);

    setImagemUrl(produto.imagemUrl);
    setEditandoId(produto.id || null);
    setDestaque(!!produto.destaque);
    setLocalizacaoDiferente(!!produto.localizacaoDiferente);
    setLatitude(produto.latitude);
    setLongitude(produto.longitude);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const escolherImagem = () => {
    Alert.alert("Selecionar imagem", "Escolha uma opção", [
      { text: "Galeria", onPress: selecionarDaGaleria },
      { text: "Câmera", onPress: selecionarDaCamera },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const selecionarDaGaleria = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
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
      Alert.alert(
        "Permissão necessária",
        "Você precisa permitir o acesso à câmera."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
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
      data.append("file", {
        uri,
        type: "image/jpeg",
        name: "foto.jpg",
      } as any);
      data.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: data,
      });

      const file = await res.json();
      if (res.ok && file.secure_url) {
        setImagemUrl(file.secure_url);
      } else {
        Alert.alert("Erro ao enviar imagem do produto. Tente novamente.");
      }
    } catch (error) {
      Alert.alert("Erro de conexão ao enviar imagem. Tente novamente.");
    } finally {
      setLoadingUpload(false);
    }
  };

  const produtosFiltrados = produtos.filter((p) => {
    let correspondeBusca = true;
    if (termoBusca.length >= 3) {
        const termo = termoBusca.toLowerCase();
        correspondeBusca = (
            p.descricao.toLowerCase().includes(termo) ||
            (p.palavrasChave && p.palavrasChave.toLowerCase().includes(termo)) || false
        );
    }

    let correspondeFiltroData = true;
    const estaVencida = isOfertaVencida(p.dataFinalOferta);

    if (filtroData === 'vencidos') {
        correspondeFiltroData = estaVencida;
    } else if (filtroData === 'em_dia') {
        correspondeFiltroData = !estaVencida;
    }

    return correspondeBusca && correspondeFiltroData;
  });

  const toggleCategoria = (cat: string) => {
    setCategoriasSelecionadas((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      } else {
        if (prev.length < 2) {
          return [...prev, cat];
        } else {
          Alert.alert(
            "Atenção",
            "Você pode selecionar no máximo 2 categorias."
          );
          return prev;
        }
      }
    });
  };

  const handleToggleLocalizacaoDiferente = (value: boolean) => {
    setLocalizacaoDiferente(value);
    if (value) {
      setModalMapaVisivel(true);
    } else {
      setLatitude(null);
      setLongitude(null);
    }
  };

  const handleLocalizacaoSalva = (coords: { latitude: number; longitude: number }) => {
    setLatitude(coords.latitude);
    setLongitude(coords.longitude);
    setModalMapaVisivel(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/(tabs)/homeScreen');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Nao foi possivel sair da conta.');
    }
  };

  const handleMenuOpen = () => {
    setDrawerMenuVisible(true);
  };

  const handleMenuClose = () => {
    setDrawerMenuVisible(false);
  };

  const handleNavigateTo = (path: string, requiresAuth: boolean) => {
    if (requiresAuth && !auth.currentUser) {
      Alert.alert('Login necessário', 'Entre na sua conta para acessar esta área.');
      router.push('/(auth)/loginScreen');
      return;
    }

    router.push(path as any);
  };

  if (loadingCompanyData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        <Text style={styles.loadingText}>Carregando dados da empresa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <AppHeaderTitle
        title="Produtos"
        user={auth.currentUser}
        paddingTop={Math.max(insets.top, 8)}
        onBack={() => router.replace("/(empresa)/homeScreen")}
        onMenuOpen={handleMenuOpen}
        onLogout={handleLogout}
      />
      <DrawerMenu
        visible={drawerMenuVisible}
        onClose={handleMenuClose}
        user={auth.currentUser}
        onLogout={handleLogout}
        navigateTo={handleNavigateTo}
      />
      <View style={styles.contentContainer}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollViewContent}
          style={styles.formScrollView}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>Cadastro de Produto</Text>
            {produtosDisponiveis !== null && (
              <Text style={styles.limitMessage}>
                Você pode cadastrar até {produtosDisponiveis} produtos.
                Atualmente você tem {produtos.length} produtos cadastrados.
              </Text>
            )}
            <View style={styles.imageContainer}>
              <TouchableOpacity
                onPress={escolherImagem}
                accessible
                accessibilityLabel="Toque para escolher a imagem do produto"
              >
                {loadingUpload ? (
                  <View style={styles.imagePlaceholder}>
                    <ActivityIndicator size="large" color="#000" />
                    <Text>Enviando imagem...</Text>
                  </View>
                ) : imagemUrl ? (
                  <Image
                    source={{ uri: imagemUrl }}
                    style={styles.fullWidthImage}
                  />
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
              onLayout={(event) => {
                setDescricaoY(event.nativeEvent.layout.y);
              }}
              onFocus={() => scrollToInput(descricaoY)}
            />
            <Text>Preço</Text>
            <TextInput
              value={preco}
              onChangeText={(text) => setPreco(formatarPreco(text))}
              placeholder="R$ 0,00"
              keyboardType="numeric"
              style={styles.input}
              accessibilityLabel="Campo para inserir o preço do produto"
              onLayout={(event) => {
                setPrecoY(event.nativeEvent.layout.y);
              }}
              onFocus={() => scrollToInput(precoY)}
            />

            {/* ✅ BLOCO DE DATA COM CALENDÁRIO ATUALIZADO */}
            <Text>Data Final da Oferta</Text>
            <View 
                style={styles.dateInputContainer}
                // 1. Movemos o onLayout para a View pai para pegar a posição correta na tela
                onLayout={(event) => {
                    setDataFinalOfertaY(event.nativeEvent.layout.y);
                }}
            >
                <TextInput
                    value={dataFinalOferta}
                    onChangeText={(text) => setDataFinalOferta(formatarData(text))}
                    placeholder="DD/MM/AAAA"
                    keyboardType="numeric"
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    maxLength={10}
                    accessibilityLabel="Campo para inserir a data final da oferta"
                    // Mantemos o onFocus no input para caso o usuário clique no texto
                    onFocus={() => scrollToInput(dataFinalOfertaY)}
                />
                <TouchableOpacity 
                    style={styles.calendarButton} 
                    onPress={() => {
                        // 2. Chamamos o scroll também ao clicar no botão do calendário
                        scrollToInput(dataFinalOfertaY);
                        // Opcional: Fecha o teclado se estiver aberto para focar no calendário
                        Keyboard.dismiss(); 
                        setShowDatePicker(true);
                    }}
                >
                  <Feather name="calendar" size={24} color={BRAND_COLORS.primary} />
                </TouchableOpacity>
            </View>
            
            {showDatePicker && (
                <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display="default"
                    onChange={onChangeDatePicker}
                    minimumDate={new Date()}
                />
            )}
            {/* ------------------------------------------- */}

            <View style={[styles.switchContainer, {marginTop: 10}]}>
              <Text style={styles.switchLabel}>Enquanto durar o estoque</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={enquantoDurarEstoque ? "#f5dd4b" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={setEnquantoDurarEstoque}
                value={enquantoDurarEstoque}
              />
            </View>

            <Text style={{ marginBottom: 5, fontWeight: "bold" }}>
              Categorias *
            </Text>
            <View style={styles.categoriasNuvemContainer}>
              {categorias.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoriaNuvemBotao,
                    categoriasSelecionadas.includes(cat) &&
                      styles.categoriaNuvemBotaoSelecionado,
                  ]}
                  onPress={() => toggleCategoria(cat)}
                >
                  <Text
                    style={[
                      styles.categoriaNuvemTexto,
                      categoriasSelecionadas.includes(cat) &&
                        styles.categoriaNuvemTextoSelecionado,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text>Palavras-chave</Text>
            <TextInput
              value={palavrasChave}
              onChangeText={setPalavrasChave}
              placeholder="Ex: promoção, desconto, artesanal, etc."
              style={styles.input}
              accessibilityLabel="Campo para inserir palavras-chave relacionadas ao produto"
              editable={true}
              onLayout={(event) => {
                setPalavrasChaveY(event.nativeEvent.layout.y);
              }}
              onFocus={() => scrollToInput(palavrasChaveY)}
            />

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>
                Usar localização diferente:
              </Text>
              <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={localizacaoDiferente ? "#f5dd4b" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={handleToggleLocalizacaoDiferente}
                value={localizacaoDiferente}
              />
            </View>
            {localizacaoDiferente && (
              <TouchableOpacity
                style={styles.localizacaoBotao}
                onPress={() => setModalMapaVisivel(true)}
              >
                <Feather name="map-pin" size={16} color="white" />
                <Text style={styles.localizacaoBotaoTexto}>
                  {typeof latitude === 'number' && typeof longitude === 'number' && latitude !== null && longitude !== null
                    ? `Localização Selecionada: Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`
                    : "Selecionar Localização no Mapa *"}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Marcar como Destaque</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={destaque ? "#f5dd4b" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                disabled={
                  editandoId !== null &&
                  destaque === false &&
                  (destaquesDisponiveis === null ||
                    destaquesDisponiveis <= 0)
                }
                onValueChange={setDestaque}
                value={destaque}
              />
            </View>
            <Text style={styles.ofertasDisponiveisText}>
              {destaquesDisponiveis !== null
                ? `${destaquesDisponiveis} destaques(s) disponível(is)`
                : ""}
            </Text>
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>
        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={salvarProduto}
            disabled={loadingUpload}
          >
            <Text style={styles.saveButtonText}>
              {editandoId ? "Atualizar Produto" : "Salvar Produto"}
            </Text>
          </TouchableOpacity>
          {editandoId && (
            <TouchableOpacity
              style={styles.clearFormButton}
              onPress={limparFormulario}
            >
              <Text style={styles.clearFormButtonText}>
                Cancelar Edição / Limpar
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setMostrarLista(!mostrarLista)}
          >
            <Text style={styles.toggleButtonText}>
              {mostrarLista ? "Esconder Produtos" : "Ver Produtos Cadastrados"}
            </Text>
            <Feather
              name={mostrarLista ? "chevron-down" : "chevron-up"}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>
        {mostrarLista && (
          <KeyboardAvoidingView
            style={styles.productListOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.productListContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setMostrarLista(false)}
              >
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
              
              <TextInput
                value={termoBusca}
                onChangeText={setTermoBusca}
                placeholder="Buscar produtos..."
                style={styles.input}
                accessibilityLabel="Campo para buscar produtos cadastrados"
              />

              <View style={styles.filterContainer}>
                <TouchableOpacity 
                  style={[styles.filterButton, filtroData === 'todos' && styles.filterButtonActive]}
                  onPress={() => setFiltroData('todos')}
                >
                  <Text style={[styles.filterText, filtroData === 'todos' && styles.filterTextActive]}>Todos</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.filterButton, filtroData === 'em_dia' && styles.filterButtonActive]}
                  onPress={() => setFiltroData('em_dia')}
                >
                  <Text style={[styles.filterText, filtroData === 'em_dia' && styles.filterTextActive]}>Em Dia</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.filterButton, filtroData === 'vencidos' && styles.filterButtonActive]}
                  onPress={() => setFiltroData('vencidos')}
                >
                  <Text style={[styles.filterText, filtroData === 'vencidos' && styles.filterTextActive]}>Vencidos</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>
                Produtos Cadastrados ({produtos.length}{" "}
                {produtosDisponiveis !== null ? `/ ${produtosDisponiveis}` : ""})
              </Text>
              <ScrollView>
                {produtosFiltrados.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Nenhum produto encontrado.
                  </Text>
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
                        <Text style={styles.listItemTextBold}>
                          {item.descricao}
                        </Text>
                        {item.preco && (
                          <Text style={styles.listItemText}>
                            Preço: {item.preco}
                          </Text>
                        )}
                        
                        {isOfertaVencida(item.dataFinalOferta) ? (
                            <Text style={[styles.listItemText, {color: 'red', fontWeight: 'bold'}]}>
                                Oferta Vencida: {item.dataFinalOferta}
                            </Text>
                        ) : (
                            item.dataFinalOferta && (
                                <Text style={styles.listItemText}>
                                    Válido até: {item.dataFinalOferta}
                                </Text>
                            )
                        )}

                        {item.palavrasChave && (
                          <Text style={styles.listItemText}>
                            Tags: {item.palavrasChave}
                          </Text>
                        )}
                        
                        {item.enquantoDurarEstoque && (
                          <Text style={[styles.listItemText, {color: '#e67e22', fontSize: 12, fontWeight: 'bold'}]}>
                              ⚠️ Enquanto durar o estoque
                          </Text>
                        )}
                        
                        {item.destaque && (
                          <Text style={styles.ofertaFlag}>Destaque!</Text>
                        )}
                        {item.localizacaoDiferente && item.latitude && item.longitude && (
                          <Text style={styles.localizacaoText}>
                            📍 Local Customizada
                          </Text>
                        )}
                      </View>
                      <View style={styles.buttonColumn}>
                        <Button
                          title="Editar"
                          onPress={() => {
                            editarProduto(item);
                            setMostrarLista(false);
                          }}
                          accessibilityLabel={`Editar o produto ${item.descricao}`}
                          disabled={!item.editavel}
                        />
                        <Button
                          title="Excluir"
                          onPress={() => excluirProduto(item.id!)}
                          color="red"
                          accessibilityLabel={`Excluir o produto ${item.descricao}`}
                        />
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        )}

        <LocalizacaoModal
          isVisible={modalMapaVisivel}
          onClose={() => setModalMapaVisivel(false)}
          onSave={handleLocalizacaoSalva}
          initialCoords={{ latitude: latitude, longitude: longitude }}
        />

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surfaceSoft,
  },
  contentContainer: {
    flex: 1,
  },
  formScrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 15,
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  limitMessage: {
    fontSize: 14,
    color: BRAND_COLORS.primary,
    textAlign: "center",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  imageContainer: {
    marginBottom: 10,
  },
  imagePlaceholder: {
    height: 150,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  fullWidthImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    resizeMode: "contain",
    backgroundColor: "#000",
  },
  listItemImage: {
    width: "30%",
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  // ✅ ESTILOS NOVOS PARA O INPUT DE DATA + BOTÃO
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  calendarButton: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ----------------------------------------
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyText: {
    fontStyle: "italic",
    color: "#888",
    textAlign: "center",
  },
  listItemContainer: {
    marginBottom: 5,
    padding: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    flex: 1,
    flexDirection: "row",
  },
  productDetails: {
    flex: 1,
    marginBottom: 10,
  },
  listItemTextBold: {
    fontWeight: "bold",
    marginBottom: 5,
    fontSize: 12,
  },
  listItemText: {
    marginBottom: 1,
    fontSize: 10,
  },
  localizacaoText: {
    fontSize: 10,
    color: BRAND_COLORS.primary,
    marginTop: 2,
    fontWeight: 'bold',
  },
  buttonColumn: {
    flexDirection: 'column',
    justifyContent: 'space-around',
  },
  productListContainer: {
    backgroundColor: "rgba(224, 247, 250, 0.9)",
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flex: 1,
    width: "99%",
  },
  productListOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 10,
    color: BRAND_COLORS.primary,
    fontSize: 16,
  },
  bottomButtonsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    gap: 10,
  },
  clearFormButton: {
    backgroundColor: "#e88585ff",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  clearFormButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  ofertasDisponiveisText: {
    textAlign: "right",
    fontSize: 12,
    color: "#888",
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  ofertaFlag: {
    color: "red",
    fontWeight: "bold",
    fontSize: 12,
    marginTop: 5,
  },
  categoriasNuvemContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
    gap: 8,
  },
  categoriaNuvemBotao: {
    backgroundColor: "#e0e0e0",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoriaNuvemBotaoSelecionado: {
    backgroundColor: BRAND_COLORS.primary,
  },
  categoriaNuvemTexto: {
    color: "#333",
    fontWeight: "bold",
  },
  categoriaNuvemTextoSelecionado: {
    color: "#fff",
  },
  toggleButton: {
    backgroundColor: "#04ad20ff",
    borderRadius: 3,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  toggleButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
  },
  closeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    zIndex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 5,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  saveButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: BRAND_COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  localizacaoBotao: {
    backgroundColor: BRAND_COLORS.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  localizacaoBotaoTexto: {
    color: BRAND_COLORS.white,
    fontWeight: "bold",
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 5,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BRAND_COLORS.primary,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
  },
  filterButtonActive: {
    backgroundColor: BRAND_COLORS.primary,
  },
  filterText: {
    color: BRAND_COLORS.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  filterTextActive: {
    color: BRAND_COLORS.white,
  },
});