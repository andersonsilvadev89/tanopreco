// Localização: app/components/FixedAdBanner.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { ref, get } from "firebase/database";
import { database } from "../../firebaseConfig"; // Ajuste o caminho conforme necessário

interface AdParceiroData {
  urlImagem: string;
}

const FixedAdBanner = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAdImage = async () => {
      try {
        setLoading(true);
        const adParceiroRef = ref(database, "adParceiro");
        const snapshot = await get(adParceiroRef);

        if (snapshot.exists()) {
          const data: AdParceiroData = snapshot.val();
          if (data && typeof data.urlImagem === "string") {
            setImageUrl(data.urlImagem);
          } else {
            console.warn(
              "O campo 'urlImagem' não foi encontrado ou não é uma string em 'adParceiro'."
            );
            setImageUrl(null);
          }
        } else {
          console.log("Nenhum dado encontrado no nó 'adParceiro'.");
          setImageUrl(null);
        }
      } catch (error) {
        console.error("Erro ao buscar a imagem do adParceiro:", error);
        Alert.alert("Erro", "Não foi possível carregar a imagem do anúncio.");
        setImageUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAdImage();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  }

  if (!imageUrl) {
    return <View style={styles.container}></View>;
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    overflow: "hidden",
  },
  image: {
    width: Dimensions.get("window").width,
    height: "100%",
  },
  placeholderText: {
    fontSize: 14,
    color: "#888",
  },
});

export default FixedAdBanner;
