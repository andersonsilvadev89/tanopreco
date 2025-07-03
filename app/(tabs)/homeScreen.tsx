import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  Animated,
  FlatList, // Adicionado para organizar os botões em grade
  Dimensions // Adicionado para calcular a largura dos itens
} from 'react-native';
import { router } from 'expo-router';
import {
  MapPin,
  Users,
  Settings,
  Radio,
  LogOut,
  CircleHelp,
  Sandwich,
  Briefcase, // Ícone para Empresa
  Shield // Ícone para Admin
} from 'lucide-react-native';
import { signOut } from 'firebase/auth';
import { auth, administrativoDatabase } from '../../firebaseConfig'; // 'administrativoDatabase' já estava sendo usado
import { ref, get } from 'firebase/database';

const fundo = require('../../assets/images/fundo.png');

// Interface para tipar os objetos de banner conforme a estrutura fornecida
interface BannerItem {
  descricao: string;
  id: string;
  imagemUrl: string;
  linkUrl: string;
}

const { width: screenWidth } = Dimensions.get('window');
const NUM_COLUMNS = 2; // Número de colunas para os botões
const ITEM_MARGIN = 15; // Margem entre os itens
const ITEM_PADDING = 20; // Padding interno do card

const HomeScreen = () => {
  const navigate = (path: string) => router.push(path as any);

  const [allBanners, setAllBanners] = useState<string[]>([]);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Valor animado para a opacidade do banner
  const fadeAnim = useRef(new Animated.Value(0)).current; // Começa invisível (opacidade 0)

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        // Usando administrativoDatabase conforme seu código anterior
        const sponsorsRef = ref(administrativoDatabase, 'patrocinadores');
        
        const snapshot = await get(sponsorsRef);

        if (snapshot.exists()) {
          const sponsorsData = snapshot.val();
          const bannersList: string[] = [];

          for (const sponsorId in sponsorsData) {
            const sponsor = sponsorsData[sponsorId];
            if (sponsor && sponsor.banners && Array.isArray(sponsor.banners)) {
              const sponsorBannersArray: BannerItem[] = sponsor.banners;
              sponsorBannersArray.forEach(bannerObject => {
                if (typeof bannerObject === 'object' && bannerObject !== null && typeof bannerObject.imagemUrl === 'string') {
                  bannersList.push(bannerObject.imagemUrl);
                }
              });
            }
          }

          if (bannersList.length > 0) {
            setAllBanners(bannersList);
            setCurrentBannerUrl(bannersList[0]);
            setCurrentBannerIndex(0);
            // Animação de Fade-in para o primeiro banner
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200, // Duração do fade-in
              useNativeDriver: true, // Importante para performance
            }).start();
          } else {
            console.log('Nenhum banner de patrocinador encontrado com a estrutura esperada.');
            setCurrentBannerUrl(null);
            fadeAnim.setValue(0); // Garante que a opacidade seja 0 se não houver banners
          }
        } else {
          // Ajuste na mensagem de log para refletir o caminho usado
          console.log('Nó "patrocinadores" não encontrado em administrativoDatabase.');
          setCurrentBannerUrl(null);
          fadeAnim.setValue(0);
        }
      } catch (error) {
        console.error('Erro ao buscar banners dos patrocinadores:', error);
        Alert.alert("Erro", "Não foi possível carregar os banners dos patrocinadores.");
        setCurrentBannerUrl(null);
        fadeAnim.setValue(0);
      }
    };

    fetchBanners();
  }, [fadeAnim]); // fadeAnim adicionado como dependência, pois é usado no efeito

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    
    if (allBanners.length > 1) {
      intervalId = setInterval(() => {
        Animated.timing(fadeAnim, { // 1. Fade-out do banner atual
          toValue: 0,
          duration: 200, // Duração do fade-out
          useNativeDriver: true,
        }).start(() => {
          // 2. Atualiza o banner APÓS o fade-out
          setCurrentBannerIndex(prevIndex => {
            const nextIndex = (prevIndex + 1) % allBanners.length;
            setCurrentBannerUrl(allBanners[nextIndex]); // Define a URL para o próximo banner
            
            // 3. Fade-in do novo banner
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200, // Duração do fade-in
              useNativeDriver: true,
            }).start();
            
            return nextIndex; // Retorna o novo índice
          });
        });
      }, 6000); // Tempo entre o início de cada transição
    }

    return () => { // Limpa o intervalo quando o componente é desmontado ou allBanners muda
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [allBanners, fadeAnim]);

  // ALTERAÇÃO: Adicionadas novas opções para Empresa e Admin
  const options = [
    { label: 'Localização de Usuários', icon: Users, path: '/localizacaoUsuariosScreen' },
    { label: 'Localização em Tempo Real', icon: MapPin, path: '/mapaAmigosScreen' },
    { label: 'Produtos e Serviços', icon: Sandwich, path: '/produtosServicosScreen' },
    { label: 'LineUp', icon: Radio, path: '/lineUpScreen' },
    { label: 'Configurações', icon: Settings, path: '/configuracoesScreen' },
    { label: 'Sobre', icon: CircleHelp, path: '/sobreScreen' },
    { label: 'Área da Empresa', icon: Briefcase, path: '/empresaScreen' }, // NOVO BOTÃO EMPRESA
    { label: 'Área Admin', icon: Shield, path: '/adminScreen' }, // NOVO BOTÃO ADMIN
  ];

  const confirmarLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
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

  // Renderização de cada item do grid
  const renderGridItem = ({ item }: { item: typeof options[0] }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigate(item.path)}
    >
      <item.icon size={28} color="#007aff" style={styles.iconStyle} />
      <Text style={styles.cardText}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <ImageBackground source={fundo} style={styles.background} resizeMode="cover">
      <View style={styles.adBanner}>
        {currentBannerUrl ? (
          <Animated.Image // Usando Animated.Image
            source={{ uri: currentBannerUrl }}
            style={[
              styles.bannerImage,
              { opacity: fadeAnim } // Aplicando a opacidade animada
            ]}
            resizeMode="contain"
            onError={(e) => console.warn("Erro ao carregar imagem do banner:", e.nativeEvent.error)}
          />
        ) : (
          // O texto de fallback não precisa ser animado da mesma forma,
          // mas podemos envolvê-lo se quisermos um fade para ele também.
          // Por ora, ele aparece quando não há currentBannerUrl e fadeAnim está em 0.
          <Text style={styles.adBannerText}>Espaço para Patrocínios</Text>
        )}
      </View>

      <View style={styles.content}>
        <FlatList
          data={options} // Usando o array de opções para renderizar os botões
          renderItem={renderGridItem}
          keyExtractor={(item, index) => item.label + index}
          numColumns={NUM_COLUMNS} // Define 2 colunas para os botões
          contentContainerStyle={styles.gridContainer} // Estilo para o container da FlatList
          columnWrapperStyle={styles.row} // Estilo para cada linha (para espaçamento entre colunas)
        />

        {/* Botão de Sair separado, no final */}
        <TouchableOpacity
          style={[styles.card, styles.logoutButton]} // Adicionado estilo específico para logout
          activeOpacity={0.8}
          onPress={confirmarLogout}
        >
          <LogOut size={28} color="#dc3545" style={styles.iconStyle} />
          <Text style={styles.cardText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  adBanner: {
    height: 60,
    backgroundColor: 'rgba(220,220,220,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  adBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  content: {
    flex: 1,
    paddingTop: 5,
    paddingHorizontal: ITEM_MARGIN, // Ajustado para usar a margem dos itens
    paddingBottom: 5,
    // justifyContent: 'space-evenly', // Removido, pois a FlatList gerencia o espaçamento
  },
  gridContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10, // Padding vertical para a grade
  },
  row: {
    justifyContent: 'space-around', // Espaço entre as colunas
    marginBottom: ITEM_MARGIN, // Margem inferior de cada linha
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    paddingVertical: ITEM_PADDING, // Padding vertical do card
    paddingHorizontal: ITEM_PADDING, // Padding horizontal do card
    alignItems: 'center',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    // Cálculo da largura para 2 colunas com margem
    width: (screenWidth - (ITEM_MARGIN * 2) - (ITEM_MARGIN * (NUM_COLUMNS - 1))) / NUM_COLUMNS,
    marginHorizontal: ITEM_MARGIN / 2, // Metade da margem total para cada lado do item
    minHeight: 125,
  },
  iconStyle: {
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 20, // Margem superior para separar do grid
    marginBottom: 10, // Margem inferior para o final da tela
    width: (screenWidth - (ITEM_MARGIN * 2) - (ITEM_MARGIN * (NUM_COLUMNS - 1))) / NUM_COLUMNS, // Mesma largura dos outros cards
    alignSelf: 'center', // Centralizar o botão de logout
    backgroundColor: 'rgba(255,255,255,0.9)', // Pode manter o mesmo estilo do card
  }
});

export default HomeScreen;
