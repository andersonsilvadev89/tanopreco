import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebaseConfig";
import { BRAND_COLORS } from "@/constants/BrandColors";

export interface OfertaWeb {
  id: string;
  descricao: string;
  preco: string;
  imagemUrl?: string;
  nomeLoja: string;
  cidade?: string;
  urlProduto: string;
  atualizadoEm?: string;
}

interface OfertasWebSectionProps {
  termoBusca: string;
  onReivindicarLoja?: (nomeLoja: string) => void;
}

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function OfertasWebSection({
  termoBusca,
  onReivindicarLoja,
}: OfertasWebSectionProps) {
  const [ofertas, setOfertas] = useState<OfertaWeb[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const ofertasRef = ref(database, "ofertasMonitoradas");
    const unsubscribe = onValue(
      ofertasRef,
      (snapshot) => {
        const lista: OfertaWeb[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((lojaSnapshot) => {
            lojaSnapshot.forEach((produtoSnapshot) => {
              lista.push({
                id: produtoSnapshot.key!,
                ...produtoSnapshot.val(),
              });
            });
          });
        }
        setOfertas(lista);
        setCarregando(false);
      },
      () => setCarregando(false)
    );

    return () => unsubscribe();
  }, []);

  const ofertasFiltradas = useMemo(() => {
    const busca = normalizarTexto(termoBusca.trim());
    if (!busca) return ofertas.slice(0, 15);

    const termos = busca.split(/\s+/).filter(Boolean);
    return ofertas.filter((item) => {
      const alvo = normalizarTexto(`${item.descricao} ${item.nomeLoja} ${item.cidade || ""}`);
      return termos.every((t) => alvo.includes(t));
    });
  }, [ofertas, termoBusca]);

  const abrirLinkExterno = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Erro", "Não foi possível abrir o site da loja.");
    }
  };

  if (carregando) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
      </View>
    );
  }

  if (ofertasFiltradas.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrapper}>
          <Feather name="globe" size={16} color={BRAND_COLORS.primaryDark} />
          <Text style={styles.sectionTitle}>
            {termoBusca.trim() ? "Encontrado em sites locais" : "Monitorado na Web (Região)"}
          </Text>
        </View>
        <Text style={styles.countBadge}>{ofertasFiltradas.length} itens</Text>
      </View>

      <FlatList
        data={ofertasFiltradas}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.webTag}>
              <Text style={styles.webTagText}>Preço na Web</Text>
            </View>

            {item.imagemUrl ? (
              <Image source={{ uri: item.imagemUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Feather name="shopping-bag" size={24} color={BRAND_COLORS.textMuted} />
              </View>
            )}

            <Text style={styles.descricao} numberOfLines={2}>
              {item.descricao}
            </Text>

            <Text style={styles.preco}>{item.preco}</Text>

            <Text style={styles.lojaNome} numberOfLines={1}>
              {item.nomeLoja} {item.cidade ? `• ${item.cidade}` : ""}
            </Text>

            <TouchableOpacity
              style={styles.verSiteButton}
              onPress={() => abrirLinkExterno(item.urlProduto)}
              activeOpacity={0.85}
            >
              <Feather name="external-link" size={13} color={BRAND_COLORS.white} />
              <Text style={styles.verSiteText}>Ver no site</Text>
            </TouchableOpacity>

            {onReivindicarLoja && (
              <TouchableOpacity
                style={styles.reivindicarButton}
                onPress={() => onReivindicarLoja(item.nomeLoja)}
              >
                <Text style={styles.reivindicarText}>É sua loja? Reivindicar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    paddingVertical: 16,
    alignItems: "center",
  },
  container: {
    marginTop: 18,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    color: "#063494",
    fontSize: 16,
    fontWeight: "800",
  },
  countBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: BRAND_COLORS.primaryDark,
    backgroundColor: "rgba(10, 79, 203, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  listContent: {
    gap: 10,
    paddingBottom: 4,
  },
  card: {
    width: 170,
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    elevation: 2,
  },
  webTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(10, 79, 203, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  webTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: BRAND_COLORS.primaryDark,
  },
  image: {
    width: "100%",
    height: 95,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BRAND_COLORS.surfaceSoft,
  },
  descricao: {
    fontSize: 13,
    fontWeight: "600",
    color: BRAND_COLORS.text,
    minHeight: 34,
  },
  preco: {
    fontSize: 16,
    fontWeight: "900",
    color: BRAND_COLORS.success,
    marginTop: 4,
  },
  lojaNome: {
    fontSize: 11,
    color: BRAND_COLORS.textMuted,
    marginTop: 2,
    marginBottom: 8,
  },
  verSiteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: 7,
    borderRadius: 8,
  },
  verSiteText: {
    color: BRAND_COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  reivindicarButton: {
    marginTop: 6,
    alignItems: "center",
  },
  reivindicarText: {
    fontSize: 10,
    color: BRAND_COLORS.primaryDark,
    textDecorationLine: "underline",
  },
});