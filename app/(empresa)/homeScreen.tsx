import React, { useEffect, useState, useRef } from 'react'; // Adicionado useState, useEffect
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  ActivityIndicator, // Adicionado ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import {
  Settings,
  LogOut,
  Sandwich,
} from 'lucide-react-native';
import AdBanner from '../components/AdBanner'; 

// --- Importar o gerenciador de imagens para o fundo ---
import { checkAndDownloadImages } from '../../utils/imageManager'; // Ajuste o caminho

// --- URL padrão de fallback para o fundo local ---
const defaultFundoLocal = require('../../assets/images/fundo.png');

const HomeScreen = () => {
  const navigate = (path: string) => router.push(path as any);
  
  // --- Novos estados para o carregamento da imagem de fundo dinâmica ---
  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  // --- NOVO useEffect para carregar a imagem de fundo dinâmica ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        // Chamamos checkAndDownloadImages, mas só usaremos a URL de fundo aqui
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na HomeScreen (Empresarial):", error);
        setCurrentFundoSource(defaultFundoLocal); // Em caso de erro, usa o fallback local
      } finally {
        setFundoAppReady(true); // Indica que o fundo foi processado
      }
    };
    loadFundoImage();
  }, []); // Executa apenas uma vez ao montar o componente

  const options = [
    { label: 'Produtos e Serviços', icon: Sandwich, path: '/(empresa)/crudProdutosServicos' },
    { label: 'Configurações', icon: Settings, path: '/(empresa)/configuracoesScreen'},
  ];

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
    <ImageBackground source={currentFundoSource} style={styles.background} resizeMode="cover">
      <AdBanner />
      
      <SafeAreaView style={styles.safeArea}>
          <Text style={styles.title}>Área Empresarial</Text>
          
          <View style={styles.gridContainer}>
              {options.map(({ label, icon: Icon, path }, index) => (
                  <TouchableOpacity
                      key={index}
                      style={styles.card}
                      activeOpacity={0.8}
                      onPress={() => navigate(path)}
                  >
                      <Icon size={32} color="#007aff" />
                      <Text style={styles.cardText}>{label}</Text>
                  </TouchableOpacity>
              ))}
          </View>

          <TouchableOpacity
              style={styles.exitButton}
              activeOpacity={0.8}
              onPress={() => router.replace('/(tabs)/homeScreen')}
          >
              <LogOut size={24} color="#000" />
              <Text style={styles.exitButtonText}>Sair da Área Empresarial</Text>
          </TouchableOpacity>
      </SafeAreaView>
    </ImageBackground>
  );
};

// --- ESTILOS ATUALIZADOS ---
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    width: '45%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
  },
  exitButton: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 10,
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
    textShadowColor: 'rgba(0, 0, 0, 0.75)', // Adicionado sombra para melhor legibilidade no fundo dinâmico
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default HomeScreen;