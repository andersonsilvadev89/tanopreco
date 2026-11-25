import React, { useCallback, useEffect, useRef, useState, memo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_COLORS } from "@/constants/BrandColors";
import { ProductCardBase } from "./ProductCardBase";
import AdCard from "./AdCard";

const CARD_WIDTH = 175;
const PRODUTOS_POR_ADCARD = 3;

interface ProdutoDestaque {
  id: string;
  descricao: string;
  preco: string;
  imagemUrl?: string;
  nomeEmpresa: string;
  verificado?: boolean;
  categoria?: string;
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

function DestaquesNoticiasComponent({
  produtos,
  onProdutoPress,
  userLocation,
}: DestaquesNoticiasProps) {
  const [scrollX, setScrollX] = useState(0);
  const [larguraViewport, setLarguraViewport] = useState(0);
  const [larguraConteudo, setLarguraConteudo] = useState(0);
  const scrollXRef = useRef(0);
  const prevIdsRef = useRef("");

  useEffect(() => {
    const currentIds = produtos.map((produto) => produto.id).join(",");
    if (currentIds !== prevIdsRef.current) {
      prevIdsRef.current = currentIds;
      scrollXRef.current = 0;
      setScrollX(0);
    }
  }, [produtos]);

  const atualizarIndicadores = useCallback((novoScrollX: number) => {
    scrollXRef.current = novoScrollX;
    setScrollX(novoScrollX);
  }, []);

  if (produtos.length === 0) {
    return null;
  }

  const temOverflow = larguraConteudo > larguraViewport + 1;
  const mostrarDicaEsquerda = temOverflow && scrollX > 8;
  const mostrarDicaDireita = temOverflow && scrollX + larguraViewport < larguraConteudo - 8;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Confira nossas melhores ofertas!</Text>

      <View style={styles.scrollWrapper}>
        <FlatList
          data={produtos}
          keyExtractor={(produto) => produto.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.conteudo}
          renderItem={({ item: produto, index }) => (
            <React.Fragment key={produto.id}>
              <ProductCardBase
                produto={produto}
                userLocation={userLocation}
                onCardPress={() => onProdutoPress(produto)}
                cardStyle={styles.noticia}
                topTag={
                  <View style={styles.seloDestaque}>
                    <Feather name="star" size={10} color={BRAND_COLORS.white} />
                    <Text style={styles.seloDestaqueTexto}>Destaque</Text>
                  </View>
                }
              />
              {(index + 1) % PRODUTOS_POR_ADCARD === 0 && <AdCard />}
            </React.Fragment>
          )}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={3}
          removeClippedSubviews
          scrollEventThrottle={16}
          onScroll={(event) => {
            scrollXRef.current = event.nativeEvent.contentOffset.x;
          }}
          onScrollEndDrag={(event) => atualizarIndicadores(event.nativeEvent.contentOffset.x)}
          onMomentumScrollEnd={(event) => atualizarIndicadores(event.nativeEvent.contentOffset.x)}
          onLayout={(event) => setLarguraViewport(event.nativeEvent.layout.width)}
          onContentSizeChange={(contentWidth) => setLarguraConteudo(contentWidth)}
        />

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
    marginBottom: 10,
    color: "#063494",
    fontSize: 18,
    fontWeight: "800",
  },
  scrollWrapper: {
    position: "relative",
  },
  conteudo: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  noticia: {
    width: CARD_WIDTH,
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.primary,
    padding: 10,
    marginHorizontal: 0,
    marginRight: 10,
    marginBottom: 0,
    shadowColor: BRAND_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
  },
  seloDestaque: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  seloDestaqueTexto: {
    color: BRAND_COLORS.white,
    fontSize: 10,
    fontWeight: "800",
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
    justifyContent: "center",
    alignItems: "center",
  },
});