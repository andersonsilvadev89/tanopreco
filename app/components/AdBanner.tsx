// Localização: app/components/AdBanner.tsx

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Animated, Platform, TouchableOpacity, Image, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, get } from 'firebase/database';
import { database } from '../../firebaseConfig';

// Importação do pacote oficial do AdMob para React Native
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Interface para os banners locais
interface BannerItem {
  descricao: string;
  id: string;
  imagemUrl: string;
  linkUrl?: string; 
}

// =========================================================================
// === IDs DAS UNIDADES DE ANÚNCIO ADMOB (REAIS DE PRODUÇÃO) ===
// IMPORTANTE: SUBSTITUA ESTES PELOS SEUS IDs DE UNIDADE DE ANÚNCIO REAIS!
// Você os obtém no painel do AdMob, na seção "Unidades de Anúncio" do seu app.
// =========================================================================

const admobUnitId = Platform.select({
  ios: 'ca-app-pub-5241782827769638/3885252530', // Substitua pelo seu ID de Unidade de Anúncio iOS REAL
  android: 'ca-app-pub-5241782827769638/2380599171', // Substitua pelo seu ID de Unidade de Anúncio Android REAL
});


// O nosso componente reutilizável
const AdBanner = () => {
  const [allLocalBanners, setAllLocalBanners] = useState<BannerItem[]>([]);
  const [currentDisplayType, setCurrentDisplayType] = useState<'local' | 'admob'>('local'); 
  const [currentLocalBannerIndex, setCurrentLocalBannerIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Flag para verificar se o AdMob carregou um anúncio com sucesso
  const isAdMobReady = useRef(false); 

  // Lógica para buscar os banners locais do Firebase
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const sponsorsRef = ref(database, 'patrocinadores');
        const snapshot = await get(sponsorsRef);
        if (snapshot.exists()) {
          const sponsorsData = snapshot.val();
          const bannersList: BannerItem[] = [];
          for (const sponsorId in sponsorsData) {
            const sponsor = sponsorsData[sponsorId];
            if (sponsor && sponsor.banners && Array.isArray(sponsor.banners)) {
              sponsor.banners.forEach((bannerObject: BannerItem) => {
                if (typeof bannerObject === 'object' && bannerObject !== null && typeof bannerObject.imagemUrl === 'string') {
                  bannersList.push(bannerObject);
                }
              });
            }
          }
          if (bannersList.length > 0) {
            setAllLocalBanners(bannersList);
            setCurrentDisplayType('local'); 
            setCurrentLocalBannerIndex(0);
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          } else {
            // Se não houver banners locais, tenta exibir AdMob imediatamente
            setCurrentDisplayType('admob');
            fadeAnim.setValue(1); 
          }
        } else {
          // Se não houver dados de patrocinadores, tenta exibir AdMob
          setCurrentDisplayType('admob');
          fadeAnim.setValue(1);
        }
      } catch (error) {
        console.error('Erro ao buscar banners no componente AdBanner:', error);
        Alert.alert("Erro", "Não foi possível carregar os banners locais.");
        setCurrentDisplayType('admob');
        fadeAnim.setValue(1);
      }
    };
    fetchBanners();
  }, []);

  // Lógica para animar e rotacionar os banners (locais e AdMob)
  useEffect(() => {
    // A rotação só faz sentido se houver banners locais OU se o AdMob estiver pronto
    if (allLocalBanners.length === 0 && !isAdMobReady.current) {
        return; 
    }
    
    // Tempo que cada tipo de anúncio ficará visível (6 segundos)
    const displayDuration = 6000;

    const intervalId = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setCurrentDisplayType(prevType => {
          if (prevType === 'local') {
            // Se estou em local, tento ir para AdMob se ele estiver pronto
            if (isAdMobReady.current) {
              return 'admob';
            } else if (allLocalBanners.length > 1) { 
              setCurrentLocalBannerIndex(prevIndex => (prevIndex + 1) % allLocalBanners.length);
              return 'local'; 
            }
            return 'local'; 
          } else { // prevType === 'admob'
            // Se estou em AdMob, tento ir para local se houver banners locais
            if (allLocalBanners.length > 0) {
              setCurrentLocalBannerIndex(prevIndex => (prevIndex + 1) % allLocalBanners.length);
              return 'local';
            }
            return 'admob'; 
          }
        });
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, displayDuration);

    return () => clearInterval(intervalId);
  }, [allLocalBanners, fadeAnim, isAdMobReady.current]);

  // Handle do clique no banner local
  const handleLocalBannerPress = () => {
    const currentBanner = allLocalBanners[currentLocalBannerIndex];
    if (currentBanner && currentBanner.linkUrl) {
      Linking.openURL(currentBanner.linkUrl).catch(err => {
        console.error("Não foi possível abrir o link do banner local:", err);
        Alert.alert("Erro", "Não foi possível abrir o link do patrocinador.");
      });
    }
  };

  // Callback quando o AdMob carrega um anúncio com sucesso
  const onAdMobAdLoaded = () => {
    console.log('AdMob banner carregado com sucesso!');
    isAdMobReady.current = true; 
  };

  // Callback quando o AdMob falha ao carregar um anúncio
  const onAdMobAdFailedToLoad = (error: any) => {
    console.error('AdMob banner falhou ao carregar:', error);
    isAdMobReady.current = false; 

    if (currentDisplayType === 'admob' && allLocalBanners.length > 0) {
      setCurrentDisplayType('local');
      setCurrentLocalBannerIndex(prevIndex => (prevIndex + 1) % allLocalBanners.length); 
    } else if (allLocalBanners.length === 0) {
      setCurrentDisplayType('local'); 
      setCurrentLocalBannerIndex(-1); 
    }
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };


  // A parte visual (JSX) do componente
  return (
    <View style={[styles.adBanner, { paddingTop: Platform.OS === 'ios' ? insets.top : 0 }]}> 
      {currentDisplayType === 'local' && allLocalBanners.length > 0 && currentLocalBannerIndex !== -1 ? (
        <TouchableOpacity onPress={handleLocalBannerPress} activeOpacity={0.8}>
          <Animated.Image
            source={{ uri: allLocalBanners[currentLocalBannerIndex].imagemUrl }}
            style={[styles.bannerImage, { opacity: fadeAnim }]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      ) : currentDisplayType === 'admob' && admobUnitId ? (
        <View style={styles.adMobContainer}>
          <BannerAd
            unitId={admobUnitId}
            size={BannerAdSize.BANNER} 
            onAdLoaded={onAdMobAdLoaded}
            onAdFailedToLoad={onAdMobAdFailedToLoad}
          />
        </View>
      ) : (
        <Text style={styles.adBannerText}>Espaço para Patrocínios</Text>
      )}
    </View>
  );
};

// Estilos específicos do banner
const styles = StyleSheet.create({
  adBanner: {
    backgroundColor: 'rgba(220,220,220,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
    minHeight: 60,
  },
  bannerImage: {
    width: '100%',
    height: 60,
  },
  adBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    paddingVertical: 20,
  },
  adMobContainer: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  }
});

export default AdBanner;