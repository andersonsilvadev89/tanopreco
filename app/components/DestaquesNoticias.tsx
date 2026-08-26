import React, { useCallback, useEffect, useRef, useState, memo } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_COLORS } from "@/constants/BrandColors";
import { ProductCardBase } from "./ProductCardBase";
import AdCard from "./AdCard";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 32) / 2;
const PRODUTOS_POR_ADCARD = 3;

interface ProdutoDestaque {
  id: string;
  descricao: string;
  preco: string;
  imagemUrl?: string;
  nomeEmpresa: string;
  latitudeEmpresa?: number;
  longitudeEmpresa?: number;
  latitudeProduto?: number;
  longitudeProduto?: number;
  localizacaoDiferente?: boolean;
  dataFinalOferta?: string;
  enquantoDurarEstoque?: boolean;
  instagram?: string;
  telefone?: string;
}

interface DestaquesNoticiasProps {
  produtos: ProdutoDestaque[];
  onProdutoPress: (produto: ProdutoDestaque) => void;
  onVerNoMapa: (produto: ProdutoDestaque) => void;
  onInstagram: (username: string | undefined) => void;
  onWhatsApp: (telefone: string | undefined) => void;
  userLocation: { latitude: number; longitude: number } | null;
}


function embaralhar<T>(itens: T[]) {
  return [...itens].sort(() => Math.random() - 0.5);
}

function DestaquesNoticiasComponent({ produtos, onProdutoPress, userLocation }: DestaquesNoticiasProps) {
  const [produtosEmDestaque, setProdutosEmDestaque] = useState<ProdutoDestaque[]>([]);
  const [scrollX, setScrollX] = useState(0);
  const [larguraViewport, setLarguraViewport] = useState(0);
  const [larguraConteudo, setLarguraConteudo] = useState(0);
  const prevIdsRef = useRef<string>("");

  useEffect(() => {
    const currentIds = produtos.map((p) => p.id).join(",");
    if (currentIds !== prevIdsRef.current) {
      prevIdsRef.current = currentIds;
      setProdutosEmDestaque(embaralhar(produtos));
      setScrollX(0);
    } else {
      setProdutosEmDestaque((prev) =>
        prev.map((item) => produtos.find((p) => p.id === item.id) ?? item)
      );
    }
  }, [produtos]);

  const atualizarIndicadores = useCallback((novoScrollX: number) => {
    setScrollX(novoScrollX);
  }, []);

  if (produtosEmDestaque.length === 0) {
    return null;
  }

  const temOverflow = larguraConteudo > larguraViewport + 1;
  const mostrarDicaEsquerda = temOverflow && scrollX > 8;
  const mostrarDicaDireita = temOverflow && scrollX + larguraViewport < larguraConteudo - 8;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Confira nossas melhores ofertas!</Text>

      <View style={styles.scrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.conteudo}
          scrollEventThrottle={16}
          onScroll={(event) => atualizarIndicadores(event.nativeEvent.contentOffset.x)}
          onLayout={(event) => setLarguraViewport(event.nativeEvent.layout.width)}
          onContentSizeChange={(contentWidth) => setLarguraConteudo(contentWidth)}
        >
          {produtosEmDestaque.map((produto, index) => (
            <React.Fragment key={produto.id}>
              <ProductCardBase
                produto={produto}
                userLocation={userLocation}
                onCardPress={() => onProdutoPress(produto)}
                cardStyle={styles.noticia}
                imageOverlay={<View style={styles.seloDestaque}><Feather name="star" size={11} color={BRAND_COLORS.white} /><Text style={styles.seloDestaqueTexto}>Destaque</Text></View>}
              />
              {(index + 1) % PRODUTOS_POR_ADCARD === 0 && <AdCard key={`ad_${produto.id}`} />}
            </React.Fragment>
          ))}
        </ScrollView>

        {mostrarDicaEsquerda && (
          <View pointerEvents="none" style={[styles.dicaLateral, styles.dicaEsquerda]}>
            <LinearGradient
              colors={["rgba(248, 250, 255, 0.96)", "rgba(248, 250, 255, 0)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.fade}
            />
            <View style={styles.bolhaSeta}>
              <Feather name="chevron-left" size={25} color={BRAND_COLORS.primaryDark} />
            </View>
          </View>
        )}

        {mostrarDicaDireita && (
          <View pointerEvents="none" style={[styles.dicaLateral, styles.dicaDireita]}>
            <LinearGradient
              colors={["rgba(248, 250, 255, 0)", "rgba(248, 250, 255, 0.96)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.fade}
            />
            <View style={styles.bolhaSeta}>
              <Feather name="chevron-right" size={25} color={BRAND_COLORS.primaryDark} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export const DestaquesNoticias = memo(DestaquesNoticiasComponent);

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 8,
  },
  titulo: {
    marginHorizontal: 12,
    marginBottom: 8,
    color: "#063494",
    fontSize: 18,
    fontWeight: "800",
  },
  scrollWrapper: {
    position: "relative",
  },
  conteudo: {
    paddingHorizontal: 8,
  },
  noticia: {
    width: CARD_WIDTH,
    backgroundColor: "rgb(255, 255, 255)",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.primary,
    padding: 6,
    marginHorizontal: 6,
    alignItems: "center",
    shadowColor: BRAND_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  imageArea: {
    position: "relative",
    width: "100%",
    alignItems: "center",
  },
  seloDestaque: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: BRAND_COLORS.primary,
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    shadowColor: BRAND_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.24,
    shadowRadius: 2,
    elevation: 3,
  },
  seloDestaqueTexto: {
    color: BRAND_COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },
  imagem: {
    width: "80%",
    alignSelf: "flex-end",
    height: 104,
    borderRadius: 32,
    backgroundColor: BRAND_COLORS.surfaceSoft,
  },
  imagemSemFoto: {
    width: "100%",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeEmpresa: {
    position: "absolute",
    top: 0,
    left: 0,
    maxWidth: "64%",
    backgroundColor: "rgba(0,0,0,1)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  badgeEmpresaText: {
    color: BRAND_COLORS.white,
    fontSize: 8,
    fontWeight: "700",
  },
  badgePreco: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(16,117,60,1)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  badgePrecoText: {
    color: BRAND_COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },
  descRow: {
    width: "100%",
    marginTop: 8,
    paddingHorizontal: 3,
  },
  descricao: {
    color: BRAND_COLORS.text,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
    textAlign: "center",
  },
  descHint: {
    fontSize: 8,
    color: BRAND_COLORS.primary,
    fontWeight: "700",
  },
  metaRow: {
    width: "100%",
    alignItems: "center",
    marginTop: 3,
    marginBottom: 0,
  },
  distancia: {
    color: BRAND_COLORS.primary,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  dataOferta: {
    color: BRAND_COLORS.textMuted,
    fontSize: 8,
    textAlign: "center",
    marginTop: 1,
    marginBottom:20,
  },
  actionOverlay: {
    position: "absolute",
    left: 0,
    bottom: 0,
    flexDirection: "column",
    gap: 5,
  },
  smallActionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(10,79,203,0.82)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  instagramButton: {
    backgroundColor: "rgba(225,48,108,0.82)",
  },
  whatsappButton: {
    backgroundColor: "rgba(37,211,102,0.82)",
  },
  dicaLateral: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 38,
    justifyContent: "center",
    zIndex: 4,
  },
  dicaEsquerda: {
    left: 0,
    alignItems: "flex-start",
  },
  dicaDireita: {
    right: 0,
    alignItems: "flex-end",
  },
  fade: {
    ...StyleSheet.absoluteFillObject,
  },
  bolhaSeta: {
    marginHorizontal: 6,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: BRAND_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
});
