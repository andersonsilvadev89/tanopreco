import React from 'react'; // REMOVIDO: useEffect, useState, useRef
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  // REMOVIDO: Alert, Animated
} from 'react-native';
import { router } from 'expo-router';
import {
  Settings,
  LogOut,
  Sandwich,
} from 'lucide-react-native';
// ADICIONADO: Importação do seu componente de banner
import AdBanner from '../components/AdBanner'; 

// REMOVIDO: Importações do Firebase que eram usadas apenas para os banners
// import { auth, administrativoDatabase } from '../../firebaseConfig';
// import { ref, get } from 'firebase/database';

const fundo = require('../../assets/images/fundo.png');

// REMOVIDO: Interface BannerItem não é mais necessária
// interface BannerItem { ... }

const HomeScreen = () => {
  const navigate = (path: string) => router.push(path as any);
  
  // REMOVIDO: Todos os states e useEffects relacionados aos banners de patrocínio.
  // const [allBanners, ...] = useState(...);
  // const fadeAnim = useRef(...);
  // useEffect(() => { fetchBanners... });
  // useEffect(() => { setInterval... });

  const options = [
    { label: 'Produtos e Serviços', icon: Sandwich, path: '/(empresa)/crudProdutosServicos' },
    { label: 'Configurações', icon: Settings, path: '/(empresa)/configuracoesScreen'},
  ];

  return (
    <ImageBackground source={fundo} style={styles.background} resizeMode="cover">
      {/* ADICIONADO: Seu componente AdBanner no topo da tela */}
      <AdBanner />

      {/* REMOVIDO: O <View> e a lógica de renderização do banner antigo */}

      {/* Conteúdo principal da tela (inalterado) */}
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
  // REMOVIDO: Estilos 'adBanner', 'bannerImage' e 'adBannerText'
  // que não são mais necessários.
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
});

export default HomeScreen;