import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as Updates from "expo-updates"; // <<== ADICIONADO
import {
  MapPin,
  Users,
  Settings,
  Radio,
  LogOut,
  CircleHelp,
  Sandwich,
  Briefcase,
  Shield,
  Toilet,
} from "lucide-react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import AdBanner from "../components/AdBanner";
import { checkAndDownloadImages } from "../../utils/imageManager";

const defaultFundoLocal = require("../../assets/images/fundo.png");
const { width: screenWidth } = Dimensions.get("window");

const NUM_COLUMNS = 2;
const SPACING = 20;
const CARD_PADDING = 10;
const BORDER_RADIUS = 26;
const ICON_SIZE = 40;

const COLORS = {
  primary: "#007AFF",
  secondary: "#6C757D",
  backgroundLight: "rgba(255,255,255,0.9)",
  backgroundDark: "rgba(0,0,0,0.4)",
  cardShadow: "rgba(0, 0, 0, 0.15)",
  textPrimary: "#333333",
  textSecondary: "#555555",
  logoutRed: "#DC3545",
  logoutRedHover: "#C82333",
};

const HomeScreen = () => {
  const navigate = (path: string) => router.push(path as any);
  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo:", error);
        setCurrentFundoSource(defaultFundoLocal);
      } finally {
        setFundoAppReady(true);
      }
    };
    loadFundoImage();
  }, []);

  const mainOptions = [
    { label: "Amigos e Solicitações", icon: Users, path: "/localizacaoUsuariosScreen" },
    { label: "Localização de Amigos", icon: MapPin, path: "/mapaAmigosScreen" },
    { label: "Produtos e Serviços", icon: Sandwich, path: "/produtosServicosScreen" },
    { label: "Serviços Essenciais", icon: Toilet, path: "/servicosEssenciaisScreen" },
    { label: "Programação (LineUp)", icon: Radio, path: "/lineUpScreen" },
    { label: "Configurações", icon: Settings, path: "/configuracoesScreen" },
    { label: "Sobre o App", icon: CircleHelp, path: "/sobreScreen" },
  ];

  const bottomRowOptions = [
    { type: "nav", label: "Área da Empresa", icon: Briefcase, path: "/empresaScreen" },
    { type: "logout", label: "Sair", icon: LogOut, path: "" },
    { type: "nav", label: "Área Administrativa", icon: Shield, path: "/adminScreen" },
  ];

  const confirmarLogout = () => {
    Alert.alert("Sair da Conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (error) {
            Alert.alert("Erro", "Não foi possível sair. Tente novamente.");
          }
        },
      },
    ]);
  };

  const renderGridItem = ({ item }: { item: (typeof mainOptions)[0] }) => {
    const itemWidth = (screenWidth - SPACING * 2 - SPACING * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
    return (
      <TouchableOpacity
        style={[styles.card, { width: itemWidth }]}
        activeOpacity={0.7}
        onPress={() => navigate(item.path)}
      >
        <item.icon size={ICON_SIZE} color={COLORS.primary} />
        <Text style={styles.cardText}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  const renderBottomRowItem = ({ item }: { item: (typeof bottomRowOptions)[0] }) => {
    const horizontalPadding = SPACING;
    const gapBetweenItems = SPACING / 2;
    const totalGapWidth = gapBetweenItems * (bottomRowOptions.length - 1);
    const availableWidth = screenWidth - horizontalPadding * 2 - totalGapWidth;
    const logoutButtonRatio = 0.33;
    const fixedOptionRatio = (1 - logoutButtonRatio) / 2;

    let itemWidth;
    let itemHeight;

    if (item.type === "logout") {
      itemWidth = availableWidth * logoutButtonRatio;
      itemHeight = itemWidth;
      return (
        <TouchableOpacity
          style={[styles.logoutButtonRound, { width: itemWidth, height: itemHeight, marginHorizontal: gapBetweenItems / 2 }]}
          activeOpacity={0.7}
          onPress={confirmarLogout}
        >
          <item.icon size={ICON_SIZE - 14} color={COLORS.logoutRed} />
          <Text style={styles.logoutButtonRoundText}>{item.label}</Text>
        </TouchableOpacity>
      );
    } else {
      itemWidth = availableWidth * fixedOptionRatio;
      itemHeight = itemWidth;
      return (
        <TouchableOpacity
          style={[styles.fixedOptionCard, { width: itemWidth, height: itemHeight, marginHorizontal: gapBetweenItems / 2 }]}
          activeOpacity={0.7}
          onPress={() => navigate(item.path)}
        >
          <item.icon size={ICON_SIZE - 14} color={COLORS.primary} />
          <Text style={styles.fixedOptionText}>{item.label}</Text>
        </TouchableOpacity>
      );
    }
  };

  if (!fundoAppReady) {
    return (
      <ImageBackground source={defaultFundoLocal} style={styles.loadingContainer} resizeMode="cover">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando o aplicativo...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={currentFundoSource} style={styles.background} resizeMode="cover">
      <View style={styles.overlay} />
      <AdBanner />
      <View style={styles.content}>
        <FlatList
          data={mainOptions}
          renderItem={renderGridItem}
          keyExtractor={(item, index) => item.label + index}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={{ height: SPACING * 2 }} />}
        />

        {/* 🔄 BOTÃO DE ATUALIZAÇÃO OTA */}
        <TouchableOpacity
          style={{
            backgroundColor: "white",
            padding: 12,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 10,
            marginBottom: 5,
            alignSelf: "center",
            width: "90%",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
          onPress={async () => {
            try {
              console.log("🔄 Verificando atualização OTA...");
              const update = await Updates.checkForUpdateAsync();
              if (update.isAvailable) {
                await Updates.fetchUpdateAsync();
                Alert.alert("Atualização disponível", "Aplicando update...");
                await Updates.reloadAsync();
              } else {
                Alert.alert("Sem atualização", "Você já está na versão mais recente.");
              }
            } catch (error: any) {
              console.error("Erro ao buscar atualização:", error);
              Alert.alert("Erro", error.message || "Erro ao verificar atualização OTA.");
            }
          }}
        >
          <Text style={{ fontWeight: "bold", color: "#007AFF" }}>
            🔄 Deu tudo certo graças a Deus
          </Text>
        </TouchableOpacity>

        {/* BOTÕES INFERIORES */}
        <View style={styles.bottomButtonsWrapper}>
          <FlatList
            data={bottomRowOptions}
            renderItem={renderBottomRowItem}
            keyExtractor={(item, index) => item.label + index}
            numColumns={3}
            contentContainerStyle={styles.bottomRowGrid}
            columnWrapperStyle={styles.bottomRowColumnWrapper}
            scrollEnabled={false}
          />
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.2)" },
  content: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: SPACING,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    justifyContent: "space-between",
  },
  gridContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING - 10,
    flexGrow: 1,
  },
  row: { justifyContent: "space-between", marginBottom: SPACING - 5 },
  card: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS,
    paddingVertical: CARD_PADDING,
    paddingHorizontal: CARD_PADDING / 2,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginHorizontal: SPACING / 2,
    minHeight: 120,
  },
  cardText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  bottomButtonsWrapper: {
    backgroundColor: "transparent",
    paddingVertical: SPACING / 2,
    marginBottom: Platform.OS === "ios" ? 10 : 0,
    width: "100%",
    alignSelf: "center",
  },
  bottomRowGrid: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING,
  },
  bottomRowColumnWrapper: {},
  fixedOptionCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS,
    paddingVertical: CARD_PADDING,
    paddingHorizontal: CARD_PADDING / 2,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 80,
  },
  fixedOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 15,
  },
  logoutButtonRound: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 80,
  },
  logoutButtonRoundText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.logoutRed,
    textAlign: "center",
    marginTop: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  loadingText: {
    marginTop: 15,
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default HomeScreen;
