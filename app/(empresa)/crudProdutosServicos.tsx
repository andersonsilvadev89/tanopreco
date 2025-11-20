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
  ImageBackground,
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
import AdBanner from "../components/AdBanner";
import { Feather } from "@expo/vector-icons";

// ➡️ NOVO COMPONENTE: LocalizacaoModal
import LocalizacaoModal from "../components/LocalizacaoModal"; // ⚠️ Ajuste o caminho conforme a sua estrutura

const defaultFundoLocal = require("../../assets/images/fundo.png");
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
  "Saúde",
  "Tecnologia",
  "Móveis",
  "Kids",
  "Imóveis",
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
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [palavrasChave, setPalavrasChave] = useState("");
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>(
    []
  );
  const [dataFinalOferta, setDataFinalOferta] = useState(
    getThirtyDaysFromNow()
  );
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
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<number | null>(
    null
  );
  const [destaquesDisponiveis, setDestaquesDisponiveis] = useState<
    number | null
  >(null);
  const [loadingCompanyData, setLoadingCompanyData] = useState(true);
  const [mostrarLista, setMostrarLista] = useState(false);

  const [descricaoY, setDescricaoY] = useState(0);
  const [precoY, setPrecoY] = useState(0);
  const [dataFinalOfertaY, setDataFinalOfertaY] = useState(0);
  const [palavrasChaveY, setPalavrasChaveY] = useState(0);
  // --------------------------------------------------

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

  const salvarProduto = async () => {
    if (!descricao.trim()) {
      Alert.alert("Erro", "A descrição é obrigatória.");
      return;
    }
    // ✅ NOVO BLOQUEIO: Limite de categorias
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
      // Garante que as palavras-chave incluam apenas as categorias selecionadas e as digitadas
      palavrasChave: [
        ...categoriasSelecionadas,
        ...palavrasChave
          .split(",")
          .map((w) => w.trim())
          .filter((w) => w.length > 0 && !categorias.includes(w)), // Filtra as palavras-chave para não repetir as categorias
      ].join(", "),
      dataFinalOferta,
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
    setImagemUrl(undefined);
    setImagemUri(undefined);
    setEditandoId(null);
    setDestaque(false);
    // 🆕 LIMPA ESTADOS DE LOCALIZAÇÃO
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
    setImagemUrl(produto.imagemUrl);
    setEditandoId(produto.id || null);
    setDestaque(!!produto.destaque);
    // 🆕 CARREGA NOVOS DADOS DE LOCALIZAÇÃO
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
    if (termoBusca.length < 3) return true;
    const termo = termoBusca.toLowerCase();
    return (
      p.descricao.toLowerCase().includes(termo) ||
      p.palavrasChave?.toLowerCase().includes(termo)
    );
  });

  // ✅ ALTERAÇÃO: Adiciona a regra de limite de 2 categorias.
  const toggleCategoria = (cat: string) => {
    setCategoriasSelecionadas((prev) => {
      if (prev.includes(cat)) {
        // Se já está selecionada, remove
        return prev.filter((c) => c !== cat);
      } else {
        // Se não está selecionada
        if (prev.length < 2) {
          // Se o limite de 2 ainda não foi atingido, adiciona
          return [...prev, cat];
        } else {
          // Se o limite foi atingido, alerta o usuário e não adiciona
          Alert.alert(
            "Atenção",
            "Você pode selecionar no máximo 2 categorias."
          );
          return prev;
        }
      }
    });
  };

  // 🆕 LÓGICA DE ABRIR MODAL AO ATIVAR SWITCH
  const handleToggleLocalizacaoDiferente = (value: boolean) => {
    setLocalizacaoDiferente(value);
    if (value) {
      // Abre o modal automaticamente ao ativar o switch
      setModalMapaVisivel(true);
    } else {
      // Limpa a localização se for desativado (usa a localização da empresa)
      setLatitude(null);
      setLongitude(null);
    }
  };

  const handleLocalizacaoSalva = (coords: { latitude: number; longitude: number }) => {
    setLatitude(coords.latitude);
    setLongitude(coords.longitude);
    setModalMapaVisivel(false);
  };

  if (loadingCompanyData) {
    return (
      <ImageBackground
        source={defaultFundoLocal}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando dados da empresa...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={defaultFundoLocal}
      style={styles.background}
      resizeMode="cover"
    >
      <AdBanner />
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
              // ✅ FOCO AUTOMÁTICO
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
              // ✅ FOCO AUTOMÁTICO
              onLayout={(event) => {
                setPrecoY(event.nativeEvent.layout.y);
              }}
              onFocus={() => scrollToInput(precoY)}
            />
            <Text>Data Final da Oferta</Text>
            <TextInput
              value={dataFinalOferta}
              onChangeText={(text) => setDataFinalOferta(formatarData(text))}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              style={styles.input}
              maxLength={10}
              accessibilityLabel="Campo para inserir a data final da oferta"
              // ✅ FOCO AUTOMÁTICO
              onLayout={(event) => {
                setDataFinalOfertaY(event.nativeEvent.layout.y);
              }}
              onFocus={() => scrollToInput(dataFinalOfertaY)}
            />
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
              // ✅ FOCO AUTOMÁTICO
              onLayout={(event) => {
                setPalavrasChaveY(event.nativeEvent.layout.y);
              }}
              onFocus={() => scrollToInput(palavrasChaveY)}
            />

            {/* 🆕 SWITCH DE LOCALIZAÇÃO */}
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
                {/* ✅ CORREÇÃO APLICADA: Verifica se é número antes de chamar toFixed() */}
                <Text style={styles.localizacaoBotaoTexto}>
                  {typeof latitude === 'number' && typeof longitude === 'number' && latitude !== null && longitude !== null
                    ? `Localização Selecionada: Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`
                    : "Selecionar Localização no Mapa *"}
                </Text>
                {/* ------------------------------------------- */}
              </TouchableOpacity>
            )}
            {/* --------------------------- */}

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
                        {item.palavrasChave && (
                          <Text style={styles.listItemText}>
                            Tags: {item.palavrasChave}
                          </Text>
                        )}
                        {item.destaque && (
                          <Text style={styles.ofertaFlag}>Destaque!</Text>
                        )}
                        {/* 🆕 EXIBE LOCALIZAÇÃO CUSTOMIZADA NA LISTA */}
                        {item.localizacaoDiferente && item.latitude && item.longitude && (
                          <Text style={styles.localizacaoText}>
                            📍 Local Customizada
                          </Text>
                        )}
                        {/* --------------------------------------------- */}
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

        {/* 🆕 CHAMA O MODAL DO MAPA */}
        <LocalizacaoModal
          isVisible={modalMapaVisivel}
          onClose={() => setModalMapaVisivel(false)}
          onSave={handleLocalizacaoSalva}
          initialCoords={{ latitude: latitude, longitude: longitude }}
        />

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  formScrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 15,
    paddingBottom: 80,
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
    color: "#007BFF",
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
  },
  listItemText: {
    marginBottom: 3,
  },
  // 🆕 ESTILO PARA EXIBIR LOCALIZAÇÃO NA LISTA
  localizacaoText: {
    fontSize: 12,
    color: "#007BFF",
    marginTop: 5,
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
    color: "#007BFF",
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
    backgroundColor: "#007BFF",
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
    backgroundColor: "#007BFF",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 🆕 ESTILOS DO BOTÃO DE LOCALIZAÇÃO
  localizacaoBotao: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  localizacaoBotaoTexto: {
    color: "white",
    fontWeight: "bold",
  },
});