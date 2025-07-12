// Localização: app/components/AdParceiros.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  Platform, // Mantido caso precise de algum comportamento específico de plataforma
  Linking,
  TouchableOpacity,
  Image, // Importado para Animated.Image
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ref, get } from "firebase/database";
import { database } from "../../firebaseConfig"; // Caminho para sua configuração do Firebase

// Interface para os itens de banner de parceiros
interface ParceiroBannerItem {
  id: string;
  imagemUrl: string;
  linkUrl?: string; // linkUrl agora é opcional
  nome: string; // Adicionado 'nome' para a descrição do parceiro
}

// Função para embaralhar um array (Fisher-Yates shuffle)
const shuffleArray = (array: ParceiroBannerItem[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const AdParceiros = () => {
  const [allParceiroBanners, setAllParceiroBanners] = useState<ParceiroBannerItem[]>([]);
  const [currentParceiroBanner, setCurrentParceiroBanner] = useState<ParceiroBannerItem | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current; // Animação de fade
  const insets = useSafeAreaInsets(); // Para lidar com áreas seguras (notch, barra de navegação)

  useEffect(() => {
    const fetchParceiroBanners = async () => {
      try {
        // --- ALTERAÇÃO PRINCIPAL AQUI: NÓ DO FIREBASE ---
        const parceirosRef = ref(database, "parceiros/adParceiros");
        const snapshot = await get(parceirosRef);
        
        if (snapshot.exists()) {
          const parceirosData = snapshot.val();
          let bannersList: ParceiroBannerItem[] = [];

          // O Firebase retorna os dados como um objeto, onde as chaves são os IDs dos parceiros
          for (const parceiroId in parceirosData) {
            const parceiro = parceirosData[parceiroId];
            if (
              typeof parceiro === "object" &&
              parceiro !== null &&
              typeof parceiro.imagemUrl === "string" &&
              typeof parceiro.nome === "string" && // Verifica se 'nome' existe
              (typeof parceiro.linkUrl === "string" || parceiro.linkUrl === undefined || parceiro.linkUrl === null)
            ) {
              bannersList.push({
                id: parceiroId, // Usa o ID do parceiro como ID do banner
                nome: parceiro.nome,
                imagemUrl: parceiro.imagemUrl,
                linkUrl: parceiro.linkUrl || undefined, // Garante undefined se for null/vazio
              });
            }
          }

          if (bannersList.length > 0) {
            bannersList = shuffleArray(bannersList); // Embaralha a lista
            setAllParceiroBanners(bannersList);
            setCurrentParceiroBanner(bannersList[0]);
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          } else {
            setCurrentParceiroBanner(null);
            fadeAnim.setValue(0);
          }
        } else {
          setCurrentParceiroBanner(null);
          fadeAnim.setValue(0);
        }
      } catch (error: unknown) { // Tratamento de erro TypeScript
        let errorMessage = "Ocorreu um erro desconhecido ao carregar banners de parceiros.";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        console.error("Erro ao buscar banners de parceiros em AdParceiros:", error);
        Alert.alert("Erro", `Não foi possível carregar os parceiros: ${errorMessage}`);
        setCurrentParceiroBanner(null);
        fadeAnim.setValue(0);
      }
    };
    fetchParceiroBanners();
  }, [fadeAnim]); // Dependência para reativar animação ao mudar banner

  // Efeito para alternar os banners automaticamente
  useEffect(() => {
    if (allParceiroBanners.length <= 1) return; // Não alterna se houver 0 ou 1 banner

    const intervalId = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentParceiroBanner((prevBanner) => {
          const currentIndex = prevBanner
            ? allParceiroBanners.findIndex((banner) => banner.id === prevBanner.id)
            : -1;
          const nextIndex = (currentIndex + 1) % allParceiroBanners.length;
          return allParceiroBanners[nextIndex];
        });
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 6000); // Troca de banner a cada 6 segundos

    return () => clearInterval(intervalId); // Limpa o intervalo ao desmontar
  }, [allParceiroBanners, fadeAnim]); // Dependências para redefinir intervalo

  // Lida com o clique no banner
  const handleParceiroBannerPress = () => {
    if (currentParceiroBanner && currentParceiroBanner.linkUrl) {
      Linking.openURL(currentParceiroBanner.linkUrl).catch((err) =>
        console.error("Não foi possível abrir a URL do parceiro:", err)
      );
    } else {
      console.log("Nenhum banner de parceiro ou URL de link para abrir.");
      // Opcional: Alert.alert("Informação", "Este parceiro não possui um link associado.");
    }
  };

  return (
    <View style={[styles.adParceirosContainer, { paddingBottom: insets.bottom }]}>
      {currentParceiroBanner ? (
        <TouchableOpacity
          onPress={handleParceiroBannerPress}
          activeOpacity={0.8}
          style={styles.touchableArea}
        >
          <Animated.Image
            source={{ uri: currentParceiroBanner.imagemUrl }}
            style={[styles.bannerImage, { opacity: fadeAnim }]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      ) : (
        <Text style={styles.placeholderText}>Espaço para Parceiros</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  adParceirosContainer: {
    backgroundColor: "rgba(240,240,240,0.9)", // Cor de fundo ligeiramente diferente para distinguir
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    width: "100%",
    minHeight: 70, // Altura mínima para o componente
    borderTopWidth: 1, // Pequena borda para separar do conteúdo
    borderTopColor: '#eee',
  },
  bannerImage: {
    width: "100%",
    height: 60, // Altura da imagem do banner
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    paddingVertical: 15,
  },
  touchableArea: {
    width: "100%",
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AdParceiros;