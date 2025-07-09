import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  FlatList,
  Dimensions,
  ActivityIndicator, // Adicionado para o loading do fundo
} from "react-native";
import { router } from "expo-router";
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
} from "lucide-react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import AdBanner from "../components/AdBanner"; // Importe o componente AdBanner

// --- Importar o gerenciador de imagens para o fundo ---
import { checkAndDownloadImages } from "../../utils/imageManager"; // Ajuste o caminho

// --- URL padrão de fallback para o fundo local ---
const defaultFundoLocal = require("../../assets/images/fundo.png");

const { width: screenWidth } = Dimensions.get("window");
const NUM_COLUMNS = 2;
const ITEM_MARGIN = 15;
const ITEM_PADDING = 20;

const HomeScreen = () => {
  const navigate = (path: string) => router.push(path as any);

  // --- Novos estados para o carregamento da imagem de fundo dinâmica ---
  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] =
    useState<any>(defaultFundoLocal);

  // --- NOVO useEffect para carregar a imagem de fundo dinâmica ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na HomeScreen:", error);
        setCurrentFundoSource(defaultFundoLocal); // Em caso de erro, usa o fallback local
      } finally {
        setFundoAppReady(true); // Indica que o fundo foi processado
      }
    };
    loadFundoImage();
  }, []); // Executa apenas uma vez ao montar o componente

  const options = [
    {
      label: "Localização de Usuários",
      icon: Users,
      path: "/localizacaoUsuariosScreen",
    },
    {
      label: "Localização em Tempo Real",
      icon: MapPin,
      path: "/mapaAmigosScreen",
    },
    {
      label: "Produtos e Serviços",
      icon: Sandwich,
      path: "/produtosServicosScreen",
    },
    { label: "LineUp", icon: Radio, path: "/lineUpScreen" },
    { label: "Configurações", icon: Settings, path: "/configuracoesScreen" },
    { label: "Sobre", icon: CircleHelp, path: "/sobreScreen" },
    { label: "Área da Empresa", icon: Briefcase, path: "/empresaScreen" },
    { label: "Área Admin", icon: Shield, path: "/adminScreen" },
  ];

  const confirmarLogout = () => {
    Alert.alert(
      "Sair",
      "Tem certeza que deseja sair?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error("Erro ao fazer logout: ", error);
              Alert.alert("Erro", "Não foi possível sair. Tente novamente.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderGridItem = ({ item }: { item: (typeof options)[0] }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigate(item.path)}
    >
      <item.icon size={28} color="#007aff" style={styles.iconStyle} />
      <Text style={styles.cardText}>{item.label}</Text>
    </TouchableOpacity>
  );

  if (!fundoAppReady) {
    return (
      <ImageBackground
        source={defaultFundoLocal}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando fundo...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={currentFundoSource}
      style={styles.background}
      resizeMode="cover"
    >
      <AdBanner />
      <View style={styles.content}>
        <FlatList
          data={options}
          renderItem={renderGridItem}
          keyExtractor={(item, index) => item.label + index}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.row}
        />

        <TouchableOpacity
          style={[styles.cardSair, styles.logoutButton]}
          activeOpacity={0.8}
          onPress={confirmarLogout}
        >
          <LogOut size={28} color="#dc3545" style={styles.iconStyleSair} />
          <Text style={styles.cardText}>Sair (Log Out)</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 5,
    paddingHorizontal: ITEM_MARGIN,
    paddingBottom: 5,
  },
  gridContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  row: {
    justifyContent: "space-around",
    marginBottom: ITEM_MARGIN,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    paddingVertical: ITEM_PADDING,
    paddingHorizontal: ITEM_PADDING,
    alignItems: "center",
    flexDirection: "column",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    width:
      (screenWidth - ITEM_MARGIN * 2 - ITEM_MARGIN * (NUM_COLUMNS - 1)) /
      NUM_COLUMNS,
    marginHorizontal: ITEM_MARGIN / 2,
    minHeight: 125,
  },
  cardSair: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    width: 80,
    marginHorizontal: ITEM_MARGIN / 2,
    minHeight: 65,
  },
  iconStyle: {
    marginBottom: 10,
  },
  iconStyleSair: {
    marginRight: 10,
  },
  cardText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  logoutButton: {
    marginTop: 20,
    marginBottom: 10,
    width:
      (screenWidth - ITEM_MARGIN * 2 - ITEM_MARGIN * (NUM_COLUMNS - 1)) /
      NUM_COLUMNS,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  // Estilos para o estado de carregamento do fundo
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // O fundo já será a imagem carregada dinamicamente, ou o fallback local
  },
  loadingText: {
    marginTop: 10,
    color: "#007BFF",
    fontSize: 16,
    textShadowColor: "rgba(0, 0, 0, 0.75)", // Adicionado sombra para melhor legibilidade no fundo dinâmico
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default HomeScreen;
