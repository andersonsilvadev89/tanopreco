// Localização: app/components/AdBanner.tsx

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 1. Importar o hook
import { ref, get } from 'firebase/database';
import { administrativoDatabase } from '../../firebaseConfig';

// Interface para os banners
interface BannerItem {
  descricao: string;
  id: string;
  imagemUrl: string;
  linkUrl: string;
}

// O nosso componente reutilizável
const AdBanner = () => {
  const [allBanners, setAllBanners] = useState<string[]>([]);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets(); // 2. Obter os valores da área segura

  // Lógica para buscar os banners (isolada aqui dentro)
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const sponsorsRef = ref(administrativoDatabase, 'patrocinadores');
        const snapshot = await get(sponsorsRef);
        if (snapshot.exists()) {
          const sponsorsData = snapshot.val();
          const bannersList: string[] = [];
          for (const sponsorId in sponsorsData) {
            const sponsor = sponsorsData[sponsorId];
            if (sponsor && sponsor.banners && Array.isArray(sponsor.banners)) {
              sponsor.banners.forEach((bannerObject: BannerItem) => {
                if (typeof bannerObject === 'object' && bannerObject !== null && typeof bannerObject.imagemUrl === 'string') {
                  bannersList.push(bannerObject.imagemUrl);
                }
              });
            }
          }
          if (bannersList.length > 0) {
            setAllBanners(bannersList);
            setCurrentBannerUrl(bannersList[0]);
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          } else {
            setCurrentBannerUrl(null); fadeAnim.setValue(0);
          }
        } else {
          setCurrentBannerUrl(null); fadeAnim.setValue(0);
        }
      } catch (error) {
        console.error('Erro ao buscar banners no componente AdBanner:', error);
        Alert.alert("Erro", "Não foi possível carregar os banners.");
        setCurrentBannerUrl(null); fadeAnim.setValue(0);
      }
    };
    fetchBanners();
  }, [fadeAnim]);

  // Lógica para animar e rotacionar os banners (isolada aqui dentro)
  useEffect(() => {
    if (allBanners.length <= 1) return;

    const intervalId = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setCurrentBannerUrl(prevUrl => {
            const currentIndex = allBanners.indexOf(prevUrl || '');
            const nextIndex = (currentIndex + 1) % allBanners.length;
            return allBanners[nextIndex];
        });
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, 6000);

    return () => clearInterval(intervalId);
  }, [allBanners, fadeAnim]);

  // A parte visual (JSX) do componente
  return (
    // 3. Aplicar o espaçamento superior dinamicamente no estilo
    <View style={[styles.adBanner, { paddingTop: insets.top }]}> 
      {currentBannerUrl ? (
        <Animated.Image
          source={{ uri: currentBannerUrl }}
          style={[styles.bannerImage, { opacity: fadeAnim }]}
          resizeMode="contain"
        />
      ) : (
        <Text style={styles.adBannerText}>Espaço para Patrocínios</Text>
      )}
    </View>
  );
};

// Estilos específicos do banner
const styles = StyleSheet.create({
  adBanner: {
    // A altura agora será dinâmica, então removemos o 'height' fixo.
    // O padding e o conteúdo definirão a altura final.
    backgroundColor: 'rgba(220,220,220,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  bannerImage: {
    width: '100%',
    height: 60, // Mantemos a altura da imagem fixa
  },
  adBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    paddingVertical: 20, // Adiciona um padding para o texto de fallback
  },
});

export default AdBanner;