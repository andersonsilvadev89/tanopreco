// Localização: app/components/AdBanner.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  Platform,
  Linking,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ref, get } from "firebase/database";
import { database } from "../../firebaseConfig";

interface BannerItem {
  descricao: string;
  id: string;
  imagemUrl: string;
  linkUrl: string;
}

// Função para embaralhar um array (Fisher-Yates shuffle)
const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const AdBanner = () => {
  const [allBanners, setAllBanners] = useState<BannerItem[]>([]);
  const [currentBanner, setCurrentBanner] = useState<BannerItem | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const sponsorsRef = ref(database, "patrocinadores");
        const snapshot = await get(sponsorsRef);
        if (snapshot.exists()) {
          const sponsorsData = snapshot.val();
          let bannersList: BannerItem[] = []; // Usamos 'let' para poder reatribuir após embaralhar

          for (const sponsorId in sponsorsData) {
            const sponsor = sponsorsData[sponsorId];
            if (sponsor && sponsor.banners && Array.isArray(sponsor.banners)) {
              sponsor.banners.forEach((bannerObject: BannerItem) => {
                if (
                  typeof bannerObject === "object" &&
                  bannerObject !== null &&
                  typeof bannerObject.imagemUrl === "string" &&
                  typeof bannerObject.linkUrl === "string"
                ) {
                  bannersList.push(bannerObject);
                }
              });
            }
          }

          if (bannersList.length > 0) {
            // Embaralha a lista de banners aqui!
            bannersList = shuffleArray(bannersList);

            setAllBanners(bannersList);
            setCurrentBanner(bannersList[0]);
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          } else {
            setCurrentBanner(null);
            fadeAnim.setValue(0);
          }
        } else {
          setCurrentBanner(null);
          fadeAnim.setValue(0);
        }
      } catch (error) {
        console.error("Erro ao buscar banners no componente AdBanner:", error);
        Alert.alert("Erro", "Não foi possível carregar os banners.");
        setCurrentBanner(null);
        fadeAnim.setValue(0);
      }
    };
    fetchBanners();
  }, [fadeAnim]);

  useEffect(() => {
    if (allBanners.length <= 1) return;
    const intervalId = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentBanner((prevBanner) => {
          // Encontra o índice do banner atual. Se não encontrar (prevBanner é null ou não está na lista), começa do 0.
          const currentIndex = prevBanner
            ? allBanners.findIndex((banner) => banner.id === prevBanner.id)
            : -1;
          const nextIndex = (currentIndex + 1) % allBanners.length;
          return allBanners[nextIndex];
        });
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 6000);
    return () => clearInterval(intervalId);
  }, [allBanners, fadeAnim]);

  const handleBannerPress = () => {
    if (currentBanner && currentBanner.linkUrl) {
      Linking.openURL(currentBanner.linkUrl).catch((err) =>
        console.error("Não foi possível abrir a URL:", err)
      );
    } else {
      console.log("Nenhum banner ou URL de link para abrir.");
    }
  };

  return (
    <View style={[styles.adBanner, { paddingTop: insets.top }]}>
      {currentBanner ? (
        <TouchableOpacity
          onPress={handleBannerPress}
          activeOpacity={0.8}
          style={styles.touchableArea}
        >
          <Animated.Image
            source={{ uri: currentBanner.imagemUrl }}
            style={[styles.bannerImage, { opacity: fadeAnim }]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      ) : (
        <Text style={styles.adBannerText}>Espaço para Patrocínios</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  adBanner: {
    backgroundColor: "rgba(220,220,220,0.7)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    width: "100%",
  },
  bannerImage: {
    width: "100%",
    height: 60,
  },
  adBannerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
    paddingVertical: 20,
  },
  touchableArea: {
    width: "100%",
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AdBanner;