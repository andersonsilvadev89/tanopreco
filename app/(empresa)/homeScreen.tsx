import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Building2,
  MessageCircle,
  PlusCircle,
  MapPin,
  Package,
  Phone,
  Mail,
  Instagram,
  Users,
  Search,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { ref, onValue, remove, update } from "firebase/database";
import { signOut } from "firebase/auth";
import * as Location from "expo-location";
import * as WebBrowser from "expo-web-browser";

import { auth, database } from "@/firebaseConfig";
import { AppHeaderTitle } from "../components/shell/AppHeaderTitle";
import { DrawerMenu } from "../components/shell/DrawerMenu";
import { BRAND_COLORS } from "@/constants/BrandColors";

interface ProdutoEmpresa {
  id: string;
  descricao: string;
  preco?: string;
  imagemUrl?: string;
  categoria?: string;
  palavrasChave?: string;
  destaque?: boolean | string;
}

interface EmpresaResumo {
  descricao: string;
  telefoneContato: string;
  emailContato: string;
  instagram: string;
  localizacao: {
    latitude: number;
    longitude: number;
  } | null;
}

interface AppStatsSummary {
  empresasCadastradas: number;
  usuariosComLogin: number;
  produtosCadastrados: number;
}

const CARD_WIDTH = 195;
const IMG_SIZE = 150;
const WHATSAPP_PATROCINIO_PHONE = "5588981026505";
const WHATSAPP_PATROCINIO_MESSAGE = encodeURIComponent(
  "Quero patrocinar este app. Gostaria de conversar sobre as possibilidades de parceria."
);
const PACKAGES_HOSTING_URL = "https://tanopreco-67706.web.app";

function countChildRecords(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  return Object.values(data as Record<string, unknown>).filter((item) => item && typeof item === "object").length;
}

function countTotalProdutos(data: unknown): number {
  if (!data || typeof data !== "object") return 0;

  return Object.values(data as Record<string, unknown>).reduce<number>((total, empresaProdutos) => {
    if (!empresaProdutos || typeof empresaProdutos !== "object") return total;
    return total + Object.values(empresaProdutos as Record<string, unknown>).filter((item) => item && typeof item === "object").length;
  }, 0);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  const [drawerMenuVisible, setDrawerMenuVisible] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoEmpresa[]>([]);
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [produtosDisponiveis, setProdutosDisponiveis] = useState(5);
  const [destaquesDisponiveis, setDestaquesDisponiveis] = useState(0);
  const [empresaResumo, setEmpresaResumo] = useState<EmpresaResumo>({
    descricao: "",
    telefoneContato: "",
    emailContato: "",
    instagram: "",
    localizacao: null,
  });
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [termoBuscaProdutos, setTermoBuscaProdutos] = useState("");
  const [mostrarDadosEmpresa, setMostrarDadosEmpresa] = useState(false);
  const [appStats, setAppStats] = useState<AppStatsSummary>({
    empresasCadastradas: 0,
    usuariosComLogin: 0,
    produtosCadastrados: 0,
  });

  const nomeUsuario = useMemo(() => {
    if (user?.displayName) return user.displayName.split(" ")[0];
    if (user?.email) return user.email.split("@")[0];
    return "Empreendedor";
  }, [user]);

  const confirmarLogout = () => {
    Alert.alert("Sair da Conta", "Tem certeza que deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch {
            Alert.alert("Erro", "Nao foi possivel sair.");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    if (!user?.uid) {
      setNomeEmpresa("");
      setProdutosDisponiveis(5);
      setDestaquesDisponiveis(0);
      setEmpresaResumo({
        descricao: "",
        telefoneContato: "",
        emailContato: "",
        instagram: "",
        localizacao: null,
      });
      return;
    }

    const empresaRef = ref(database, `usuariosEmpresa/${user.uid}`);
    const unsubscribe = onValue(
      empresaRef,
      (snapshot) => {
        const empresaData = snapshot.val() || {};
        const nome = empresaData?.nomeEmpresa;
        const limiteProdutos = Number(empresaData?.produtosDisponiveis);
        const limiteDestaques = Number(empresaData?.destaquesDisponiveis);

        setNomeEmpresa(typeof nome === "string" ? nome.trim() : "");
        setProdutosDisponiveis(Number.isFinite(limiteProdutos) && limiteProdutos > 0 ? limiteProdutos : 5);
        setDestaquesDisponiveis(Number.isFinite(limiteDestaques) && limiteDestaques >= 0 ? limiteDestaques : 0);

        const latitude = typeof empresaData?.latitude === "number" ? empresaData.latitude : null;
        const longitude = typeof empresaData?.longitude === "number" ? empresaData.longitude : null;

        setEmpresaResumo({
          descricao: typeof empresaData?.palavrasChave === "string" ? empresaData.palavrasChave.trim() : "",
          telefoneContato: typeof empresaData?.telefone === "string" ? empresaData.telefone.trim() : "",
          emailContato: typeof empresaData?.email === "string" ? empresaData.email.trim() : "",
          instagram: typeof empresaData?.instagram === "string" ? empresaData.instagram.trim() : "",
          localizacao: latitude !== null && longitude !== null ? { latitude, longitude } : null,
        });
      },
      () => {
        setNomeEmpresa("");
        setProdutosDisponiveis(5);
        setDestaquesDisponiveis(0);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setProdutos([]);
      setLoadingProdutos(false);
      return;
    }

    const produtosRef = ref(database, `produtos/${user.uid}`);
    const unsubscribe = onValue(
      produtosRef,
      (snapshot) => {
        const data = snapshot.val();
        const lista: ProdutoEmpresa[] = data
          ? Object.entries(data).map(([id, valor]: any) => ({ id, ...valor }))
          : [];
        setProdutos(lista.reverse());
        setLoadingProdutos(false);
      },
      () => {
        setProdutos([]);
        setLoadingProdutos(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    const listen = (path: string, onSuccess: (value: unknown) => void) => {
      const unsubscribe = onValue(
        ref(database, path),
        (snapshot) => onSuccess(snapshot.val()),
        () => onSuccess(undefined)
      );
      unsubs.push(unsubscribe);
    };

    listen("usuariosEmpresa", (value) => {
      setAppStats((current) => ({
        ...current,
        empresasCadastradas: countChildRecords(value),
      }));
    });

    listen("usuarios", (value) => {
      setAppStats((current) => ({
        ...current,
        usuariosComLogin: countChildRecords(value),
      }));
    });

    listen("produtos", (value) => {
      setAppStats((current) => ({
        ...current,
        produtosCadastrados: countTotalProdutos(value),
      }));
    });

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const formatarPreco = (preco?: string) => {
    if (!preco) return null;

    const precoNormalizado = preco
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const valor = Number.parseFloat(precoNormalizado);
    if (Number.isNaN(valor)) return preco;

    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const atualizarLocalizacao = async () => {
    if (!user?.uid) return;

    setUpdatingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissao de Localizacao", "Precisamos da permissao para atualizar sua localizacao no mapa.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await update(ref(database, `usuariosEmpresa/${user.uid}`), {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      Alert.alert("Sucesso", "Localizacao atualizada com sucesso.");
    } catch {
      Alert.alert("Erro", "Nao foi possivel atualizar a localizacao no momento.");
    } finally {
      setUpdatingLocation(false);
    }
  };

  const confirmarAtualizacaoLocalizacao = () => {
    if (updatingLocation) return;

    Alert.alert(
      "Confirmar atualizacao",
      "Sua localizacao atual da empresa sera substituida pela localizacao do celular. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Atualizar agora", onPress: atualizarLocalizacao },
      ]
    );
  };

  const handleNavigateTo = (path: string, requiresAuth: boolean) => {
    if (requiresAuth && !auth.currentUser) {
      Alert.alert("Login necessario", "Entre na sua conta para acessar esta area.");
      router.push("/(auth)/loginScreen");
      return;
    }

    router.push(path as any);
  };

  const abrirInstagramEmpresa = () => {
    if (!empresaResumo.instagram) return;
    const usuarioInstagram = empresaResumo.instagram.replace("@", "");
    Linking.openURL(`https://instagram.com/${usuarioInstagram}`).catch(() => {
      Alert.alert("Erro", "Nao foi possivel abrir o Instagram da empresa.");
    });
  };

  const abrirWhatsAppPatrocinio = async () => {
    const whatsappUrl = `https://wa.me/${WHATSAPP_PATROCINIO_PHONE}?text=${WHATSAPP_PATROCINIO_MESSAGE}`;
    try {
      await Linking.openURL(whatsappUrl);
    } catch {
      Alert.alert("Erro", "Nao foi possivel abrir o WhatsApp agora.");
    }
  };

  const produtosFiltrados = useMemo(() => {
    const termo = termoBuscaProdutos.trim().toLowerCase();
    if (termo.length < 2) return produtos;

    return produtos.filter((produto) => {
      const descricao = (produto.descricao || "").toLowerCase();
      const palavras = (produto.palavrasChave || "").toLowerCase();
      return descricao.includes(termo) || palavras.includes(termo);
    });
  }, [produtos, termoBuscaProdutos]);

  const destaquesUtilizados = useMemo(
    () => produtos.filter((produto) => produto.destaque === true || produto.destaque === "true").length,
    [produtos]
  );

  const excluirProduto = (produtoId: string) => {
    if (!user?.uid) return;

    Alert.alert("Excluir produto", "Tem certeza que deseja excluir este produto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(ref(database, `produtos/${user.uid}/${produtoId}`));
          } catch {
            Alert.alert("Erro", "Nao foi possivel excluir o produto agora.");
          }
        },
      },
    ]);
  };

  const editarProduto = (produto: ProdutoEmpresa) => {
    router.push({
      pathname: "/(empresa)/crudProdutosServicos",
      params: {
        editId: produto.id,
        descricao: produto.descricao || "",
        preco: produto.preco || "",
        palavrasChave: produto.palavrasChave || "",
        imagemUrl: produto.imagemUrl || "",
      },
    } as any);
  };

  const abrirPacotes = async () => {
    if (!user?.uid) {
      Alert.alert("Erro", "Usuario nao autenticado.");
      return;
    }

    const paymentUrl = `${PACKAGES_HOSTING_URL}/index.html?uid=${encodeURIComponent(user.uid)}`;

    try {
      await WebBrowser.openBrowserAsync(paymentUrl);
    } catch {
      Alert.alert("Erro", "Nao foi possivel abrir a pagina de pacotes.");
    }
  };

  const handleAcquisicaoPacotes = () => {
    const limiteProdutosAtingido = produtosDisponiveis !== null && produtos.length >= produtosDisponiveis;
    const limiteDestaquesAtingido = destaquesDisponiveis >= 0 && destaquesUtilizados >= destaquesDisponiveis;

    if (limiteProdutosAtingido || limiteDestaquesAtingido) {
      const mensagemLimites =
        limiteProdutosAtingido && limiteDestaquesAtingido
          ? `Voce atingiu o limite de produtos (${produtos.length}/${produtosDisponiveis}) e o limite de destaques (${destaquesUtilizados}/${destaquesDisponiveis}).`
          : limiteProdutosAtingido
          ? `Voce ja cadastrou o maximo de ${produtosDisponiveis} produtos permitidos.`
          : `Voce ja utilizou ${destaquesUtilizados} de ${destaquesDisponiveis} destaques disponiveis.`;

      Alert.alert("Limites atingidos", `${mensagemLimites} Para continuar, adquira um de nossos pacotes.`, [
        { text: "Agora nao", style: "cancel" },
        { text: "Ver pacotes", onPress: abrirPacotes },
      ]);
      return;
    }

    abrirPacotes();
  };

  const abrirCadastroProdutoComValidacao = () => {
    if (!user?.uid) return;

    const limiteProdutosAtingido = produtosDisponiveis !== null && produtos.length >= produtosDisponiveis;
    if (limiteProdutosAtingido) {
      Alert.alert(
        "Limite de produtos atingido",
        `Voce ja cadastrou ${produtos.length} de ${produtosDisponiveis} produtos permitidos. Para cadastrar mais, adquira novos pacotes.`,
        [
          { text: "Agora nao", style: "cancel" },
          { text: "Ver pacotes", onPress: abrirPacotes },
        ]
      );
      return;
    }

    router.push("/(empresa)/crudProdutosServicos");
  };

  const abrirContatoSuporte = () => {
    Linking.openURL(`https://wa.me/${WHATSAPP_PATROCINIO_PHONE}`).catch(() => {
      Alert.alert("Erro", "Nao foi possivel abrir o WhatsApp.");
    });
  };

  return (
    <View style={styles.background}>
      <AppHeaderTitle
        title="Area Empresarial"
        user={auth.currentUser}
        paddingTop={Math.max(insets.top, 8)}
        onBack={() => router.replace("/(tabs)/homeScreen")}
        onMenuOpen={() => setDrawerMenuVisible(true)}
        onLogout={confirmarLogout}
      />

      <DrawerMenu
        visible={drawerMenuVisible}
        onClose={() => setDrawerMenuVisible(false)}
        user={auth.currentUser}
        onLogout={confirmarLogout}
        navigateTo={handleNavigateTo}
      />

      <View style={styles.safeAreaContent}>
        <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.greeting}>
            {user ? `Ola, ${nomeEmpresa || nomeUsuario}!` : "Bem-vindo ao ta no preco!"}
          </Text>
          <Text style={styles.subtitle}>Aqui esta um resumo rapido da sua conta.</Text>

          <View style={styles.statsOverviewCard}>
            <View style={styles.statsOverviewHeader}>
              <View>
                <Text style={styles.statsOverviewEyebrow}>Indicadores do app</Text>
                <Text style={styles.statsOverviewTitle}>Esses numeros so crescem a cada dia.</Text>
              </View>
            </View>

            <View style={styles.statsOverviewGrid}>
              <View style={styles.statsMiniCard}>
                <Building2 size={18} color={BRAND_COLORS.primary} />
                <Text style={styles.statsMiniValue}>{appStats.empresasCadastradas}</Text>
                <Text style={styles.statsMiniLabel}>Empresas cadastradas</Text>
              </View>

              <View style={styles.statsMiniCard}>
                <Users size={18} color={BRAND_COLORS.primary} />
                <Text style={styles.statsMiniValue}>{appStats.usuariosComLogin}</Text>
                <Text style={styles.statsMiniLabel}>Usuarios com login</Text>
              </View>

              <View style={styles.statsMiniCard}>
                <Package size={18} color={BRAND_COLORS.primary} />
                <Text style={styles.statsMiniValue}>{appStats.produtosCadastrados}</Text>
                <Text style={styles.statsMiniLabel}>Produtos cadastrados</Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.88} style={styles.patrocinioButtonFull} onPress={abrirWhatsAppPatrocinio}>
              <MessageCircle size={18} color={BRAND_COLORS.white} />
              <Text style={styles.patrocinioButtonFullText}>Quero patrocinar este app</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.companyInfoCard}>
            <View style={styles.companyInfoHeader}>
              <Text style={styles.companyInfoTitle}>Dados da empresa</Text>
              <View style={styles.companyInfoHeaderActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.companyInfoToggleButton}
                  onPress={() => setMostrarDadosEmpresa((prev) => !prev)}
                >
                  <Text style={styles.companyInfoToggleButtonText}>{mostrarDadosEmpresa ? "Ocultar dados" : "Mostrar dados"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.companyInfoEditButton}
                  onPress={() => router.push("/(empresa)/configuracoesScreen")}
                >
                  <Text style={styles.companyInfoEditButtonText}>Editar dados</Text>
                </TouchableOpacity>
              </View>
            </View>

            {mostrarDadosEmpresa && (
              <>
                {!!empresaResumo.descricao && (
                  <Text style={styles.companyInfoDescription} numberOfLines={2}>
                    {empresaResumo.descricao}
                  </Text>
                )}

                {!!empresaResumo.emailContato && (
                  <View style={styles.companyInfoRow}>
                    <Mail size={15} color={BRAND_COLORS.textMuted} />
                    <Text style={styles.companyInfoText} numberOfLines={1}>
                      {empresaResumo.emailContato}
                    </Text>
                  </View>
                )}

                {!!empresaResumo.telefoneContato && (
                  <View style={styles.companyInfoRow}>
                    <Phone size={15} color={BRAND_COLORS.textMuted} />
                    <Text style={styles.companyInfoText}>{empresaResumo.telefoneContato}</Text>
                  </View>
                )}

                {!!empresaResumo.instagram && (
                  <TouchableOpacity style={styles.companyInfoRow} activeOpacity={0.75} onPress={abrirInstagramEmpresa}>
                    <Instagram size={15} color={BRAND_COLORS.textMuted} />
                    <Text style={[styles.companyInfoText, styles.companyInfoLink]}>
                      @{empresaResumo.instagram.replace("@", "")}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.companyInfoRow}>
                  <MapPin size={15} color={BRAND_COLORS.textMuted} />
                  <Text style={styles.companyInfoText}>
                    {empresaResumo.localizacao ? "Localizacao cadastrada no mapa" : "Localizacao ainda nao cadastrada"}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.limitesContainer}>
              <View style={styles.limitesRow}>
                <View style={styles.limitePill}>
                  <Text style={styles.limiteCardTitle}>Produtos</Text>
                  <View style={styles.limiteInfoRow}>
                    <Text style={styles.limiteInfoLabel}>Cadastro de ate</Text>
                    <Text style={styles.limiteInfoValue}>{produtosDisponiveis}</Text>
                  </View>
                  <View style={styles.limiteSeparator} />
                  <View style={styles.limiteInfoRow}>
                    <Text style={styles.limiteInfoLabel}>Produtos cadastrados</Text>
                    <Text style={styles.limiteInfoValue}>{produtos.length}</Text>
                  </View>
                </View>
                <View style={styles.limitePill}>
                  <Text style={styles.limiteCardTitle}>Destaques</Text>
                  <View style={styles.limiteInfoRow}>
                    <Text style={styles.limiteInfoLabel}>Destaques disponiveis</Text>
                    <Text style={styles.limiteInfoValue}>{destaquesDisponiveis}</Text>
                  </View>
                  <View style={styles.limiteSeparator} />
                  <View style={styles.limiteInfoRow}>
                    <Text style={styles.limiteInfoLabel}>Destaques utilizados</Text>
                    <Text style={styles.limiteInfoValue}>{destaquesUtilizados}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.pacotesButton} onPress={handleAcquisicaoPacotes} activeOpacity={0.85}>
                <Text style={styles.pacotesButtonText}>Adquirir pacotes</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.secondaryAction, updatingLocation && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={confirmarAtualizacaoLocalizacao}
            disabled={updatingLocation}
          >
            {updatingLocation ? <ActivityIndicator size="small" color={BRAND_COLORS.white} /> : <MapPin size={18} color={BRAND_COLORS.white} />}
            <Text style={styles.secondaryActionText}>Atualizar a localizacao da empresa no mapa</Text>
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Package size={18} color={BRAND_COLORS.primary} />
              <Text style={styles.sectionTitle}>Seus produtos</Text>
            </View>
            <TouchableOpacity style={styles.sectionAddButton} activeOpacity={0.85} onPress={abrirCadastroProdutoComValidacao}>
              <PlusCircle size={16} color={BRAND_COLORS.surfaceSoft} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrapper}>
            <Search size={16} color={BRAND_COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por descricao ou palavra-chave"
              placeholderTextColor={BRAND_COLORS.iconMuted}
              value={termoBuscaProdutos}
              onChangeText={setTermoBuscaProdutos}
            />
          </View>

          {loadingProdutos ? (
            <ActivityIndicator style={{ marginVertical: 12 }} color={BRAND_COLORS.primary} />
          ) : produtos.length === 0 ? (
            <Text style={styles.emptyText}>Voce ainda nao cadastrou produtos.</Text>
          ) : produtosFiltrados.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum produto encontrado para essa busca.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.produtosRow}>
              {produtosFiltrados.map((produto) => (
                <View key={produto.id} style={styles.carouselCard}>
                  <View style={styles.cardImageArea}>
                    <View style={styles.cardImageWrapper}>
                      {produto.imagemUrl ? (
                        <Image source={{ uri: produto.imagemUrl }} style={styles.cardImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                          <Package size={28} color={BRAND_COLORS.iconMuted} />
                        </View>
                      )}
                    </View>

                    <TouchableOpacity style={styles.overlayEditButton} activeOpacity={0.85} onPress={() => editarProduto(produto)}>
                      <Pencil size={22} color={BRAND_COLORS.white} />
                      <Text style={styles.overlayEditText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.overlayDeleteButton} activeOpacity={0.85} onPress={() => excluirProduto(produto.id)}>
                      <Trash2 size={22} color={BRAND_COLORS.white} />
                    </TouchableOpacity>

                    {!!produto.preco && (
                      <View style={styles.badgePrecoOverlay}>
                        <Text style={styles.badgePrecoText}>{formatarPreco(produto.preco)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardDescricaoRow}>
                    <Text style={styles.cardDescricao} numberOfLines={2}>
                      {produto.descricao}
                    </Text>
                    {!!produto.palavrasChave && (
                      <Text style={styles.cardPalavrasChave} numberOfLines={2}>
                        {produto.palavrasChave}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.contatoSection}>
            <Text style={styles.contatoSectionTitle}>Duvidas sobre o App? Entre em Contato!</Text>
            <TouchableOpacity style={styles.contactCard} activeOpacity={0.85} onPress={abrirContatoSuporte}>
              <View style={styles.iconWrap}>
                <MessageCircle size={20} color={BRAND_COLORS.white} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.contactTitle}>Atendimento via WhatsApp</Text>
                <Text style={styles.contactSubtitle}>Fale com nossa equipe: (88) 98102-6505</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={[styles.fixedAddProdutoWrap, { paddingBottom: 5 }]}>
          <TouchableOpacity style={styles.addProdutoFixedButton} activeOpacity={0.85} onPress={abrirCadastroProdutoComValidacao}>
            <PlusCircle size={15} color={BRAND_COLORS.white} />
            <Text style={styles.addProdutoBelowListButtonText}>Adicionar novo produto</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surfaceSoft,
  },
  safeAreaContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollViewContent: {
    paddingVertical: 20,
    paddingBottom: 110,
    flexGrow: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    color: BRAND_COLORS.primaryDark,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 14,
    color: BRAND_COLORS.textMuted,
  },
  statsOverviewCard: {
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    gap: 12,
    shadowColor: BRAND_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statsOverviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  statsOverviewEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: BRAND_COLORS.textMuted,
    marginBottom: 2,
  },
  statsOverviewTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: BRAND_COLORS.primary,
  },
  patrocinioButtonFull: {
    width: "100%",
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#25D366",
    borderWidth: 1,
    borderColor: "#1FB659",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#168A43",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  patrocinioButtonFullText: {
    fontSize: 15,
    fontWeight: "900",
    color: BRAND_COLORS.white,
  },
  statsOverviewGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statsMiniCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    justifyContent: "space-between",
    gap: 6,
  },
  statsMiniValue: {
    fontSize: 22,
    fontWeight: "900",
    color: BRAND_COLORS.primary,
  },
  statsMiniLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: BRAND_COLORS.textMuted,
    lineHeight: 16,
  },
  companyInfoCard: {
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    gap: 8,
  },
  companyInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  companyInfoHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  companyInfoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: BRAND_COLORS.primary,
  },
  companyInfoToggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EAF1FF",
  },
  companyInfoToggleButtonText: {
    fontSize: 12,
    color: BRAND_COLORS.primaryDark,
    fontWeight: "700",
  },
  companyInfoEditButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#DCEAFF",
  },
  companyInfoEditButtonText: {
    fontSize: 12,
    color: BRAND_COLORS.primary,
    fontWeight: "700",
  },
  companyInfoDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: BRAND_COLORS.text,
  },
  companyInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  companyInfoText: {
    flex: 1,
    fontSize: 13,
    color: BRAND_COLORS.textMuted,
  },
  companyInfoLink: {
    color: BRAND_COLORS.primary,
    fontWeight: "700",
  },
  limitesContainer: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#E5EDF8",
    paddingTop: 10,
    gap: 8,
  },
  limitesRow: {
    flexDirection: "row",
    gap: 8,
  },
  limitePill: {
    flex: 1,
    backgroundColor: "#EEF4FF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  limiteCardTitle: {
    fontSize: 12,
    color: BRAND_COLORS.primary,
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  limiteInfoRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  limiteSeparator: {
    width: "100%",
    height: 1,
    backgroundColor: "#D7E4F7",
    marginBottom: 2,
  },
  limiteInfoLabel: {
    flex: 1,
    fontSize: 11,
    color: BRAND_COLORS.textMuted,
    fontWeight: "600",
  },
  limiteInfoValue: {
    fontSize: 17,
    color: BRAND_COLORS.primary,
    fontWeight: "800",
    lineHeight: 15,
  },
  pacotesButton: {
    marginTop: 10,
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  pacotesButtonText: {
    color: BRAND_COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryAction: {
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 12,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 2,
    borderColor: "#8FB6FF",
    marginBottom: 14,
    paddingHorizontal: 12,
    shadowColor: BRAND_COLORS.primaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: BRAND_COLORS.primary,
  },
  sectionAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: BRAND_COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 5,
    backgroundColor: BRAND_COLORS.primary,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: BRAND_COLORS.surface,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: BRAND_COLORS.text,
  },
  emptyText: {
    fontSize: 13,
    color: BRAND_COLORS.textMuted,
    marginBottom: 10,
  },
  produtosRow: {
    gap: 10,
    paddingHorizontal: 2,
    paddingRight: 6,
    marginBottom: 14,
  },
  carouselCard: {
    width: CARD_WIDTH,
    alignItems: "center",
  },
  cardImageArea: {
    width: "100%",
    alignItems: "center",
    marginBottom: 6,
    position: "relative",
  },
  cardImageWrapper: {
    width: IMG_SIZE,
    height: IMG_SIZE,
    borderRadius: IMG_SIZE / 4,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImagePlaceholder: {
    backgroundColor: "#f0f4fb",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayEditButton: {
    position: "absolute",
    top: 0,
    left: 15,
    backgroundColor: "rgba(10,79,203,0.95)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  overlayEditText: {
    color: BRAND_COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  overlayDeleteButton: {
    position: "absolute",
    bottom: 0,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 7,
    backgroundColor: "rgba(217,58,58,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgePrecoOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: BRAND_COLORS.success,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgePrecoText: {
    color: BRAND_COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },
  cardDescricaoRow: {
    width: "90%",
    minHeight: 40,
    marginBottom: 8,
  },
  cardDescricao: {
    fontSize: 11,
    fontWeight: "500",
    color: BRAND_COLORS.text,
    lineHeight: 14,
    textAlign: "center",
  },
  cardPalavrasChave: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "500",
    color: BRAND_COLORS.textMuted,
    textAlign: "center",
    lineHeight: 12,
  },
  contatoSection: {
    marginTop: 10,
    marginBottom: 12,
  },
  contatoSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: BRAND_COLORS.primary,
    marginBottom: 10,
    textAlign: "center",
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    shadowColor: BRAND_COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
  },
  textWrap: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: BRAND_COLORS.text,
  },
  contactSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: BRAND_COLORS.textMuted,
  },
  fixedAddProdutoWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  addProdutoFixedButton: {
    minHeight: 45,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BRAND_COLORS.primaryDark,
    shadowColor: BRAND_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addProdutoBelowListButtonText: {
    color: BRAND_COLORS.white,
    fontSize: 18,
    fontWeight: "700",
  },
});
