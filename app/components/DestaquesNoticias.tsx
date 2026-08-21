import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_COLORS } from "@/constants/BrandColors";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 12;
const CARD_WIDTH = ((width - CARD_MARGIN * 3) / 2) * 0.72;

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

function getProdutoLocation(produto: ProdutoDestaque): { latitude: number; longitude: number } | null {
  if (produto.localizacaoDiferente && produto.latitudeProduto && produto.longitudeProduto) {
    return { latitude: produto.latitudeProduto, longitude: produto.longitudeProduto };
  }

  if (produto.latitudeEmpresa && produto.longitudeEmpresa) {
    return { latitude: produto.latitudeEmpresa, longitude: produto.longitudeEmpresa };
  }

  return null;
}

function calcularDistancia(
  userLocation: { latitude: number; longitude: number } | null,
  produtoLocation: { latitude: number; longitude: number } | null,
) {
  if (!userLocation || !produtoLocation) return null;

  const toRad = (value: number) => (value * Math.PI) / 180;
  const raioTerraEmKm = 6371;
  const deltaLatitude = toRad(produtoLocation.latitude - userLocation.latitude);
  const deltaLongitude = toRad(produtoLocation.longitude - userLocation.longitude);
  const latitudeUsuario = toRad(userLocation.latitude);
  const latitudeProduto = toRad(produtoLocation.latitude);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2) *
      Math.cos(latitudeUsuario) * Math.cos(latitudeProduto);

  return raioTerraEmKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function DestaquesNoticias({ produtos, onProdutoPress, onVerNoMapa, onInstagram, onWhatsApp, userLocation }: DestaquesNoticiasProps) {
  const [produtosEmDestaque, setProdutosEmDestaque] = useState<ProdutoDestaque[]>([]);
  const [scrollX, setScrollX] = useState(0);
  const [larguraViewport, setLarguraViewport] = useState(0);
  const [larguraConteudo, setLarguraConteudo] = useState(0);

  useEffect(() => {
    setProdutosEmDestaque(embaralhar(produtos));
    setScrollX(0);
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
          {produtosEmDestaque.map((produto) => {
            const produtoLocation = getProdutoLocation(produto);
            const distancia = calcularDistancia(userLocation, produtoLocation);

            return (
              <TouchableOpacity
              key={produto.id}
              style={styles.noticia}
              onPress={() => onProdutoPress(produto)}
              activeOpacity={0.86}
            >
              <View style={styles.imageArea}>
                <View style={styles.seloDestaque}>
                  <Feather name="star" size={11} color={BRAND_COLORS.white} />
                  <Text style={styles.seloDestaqueTexto}>Destaque</Text>
                </View>
                {produto.imagemUrl ? (
                  <Image source={{ uri: produto.imagemUrl }} style={styles.imagem} resizeMode="cover" />
                ) : (
                  <View style={[styles.imagem, styles.imagemSemFoto]}>
                    <Feather name="image" size={28} color={BRAND_COLORS.border} />
                  </View>
                )}
                <View style={styles.badgeEmpresa}>
                  <Text style={styles.badgeEmpresaText} numberOfLines={1}>{produto.nomeEmpresa}</Text>
                </View>
                <View style={styles.badgePreco}>
                  <Text style={styles.badgePrecoText} numberOfLines={1}>{produto.preco}</Text>
                </View>

                <View style={styles.actionOverlay}>
                  {(produto.localizacaoDiferente && produto.latitudeProduto && produto.longitudeProduto) ||
                    (produto.latitudeEmpresa && produto.longitudeEmpresa) ? (
                    <TouchableOpacity style={styles.smallActionButton} onPress={() => onVerNoMapa(produto)}>
                      <Feather name="map-pin" size={12} color={BRAND_COLORS.white} />
                    </TouchableOpacity>
                  ) : null}

                  {produto.instagram && (
                    <TouchableOpacity
                      style={[styles.smallActionButton, styles.instagramButton]}
                      onPress={() => onInstagram(produto.instagram)}
                    >
                      <Feather name="instagram" size={12} color={BRAND_COLORS.white} />
                    </TouchableOpacity>
                  )}

                  {produto.telefone && (
                    <TouchableOpacity
                      style={[styles.smallActionButton, styles.whatsappButton]}
                      onPress={() => onWhatsApp(produto.telefone)}
                    >
                      <Feather name="message-circle" size={12} color={BRAND_COLORS.white} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.descRow}>
                <Text style={styles.descricao} numberOfLines={1}>
                  {produto.descricao}
                  {produto.descricao.length > 28 && <Text style={styles.descHint}> +ver</Text>}
                </Text>
              </View>
              <View style={styles.metaRow}>
                {distancia !== null && (
                  <Text style={styles.distancia}>≈ {distancia.toFixed(1)} km</Text>
                )}
                {produto.dataFinalOferta && (
                  <Text style={styles.dataOferta}>Validade: {produto.dataFinalOferta}</Text>
                )}
              </View>
              </TouchableOpacity>
            );
          })}
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
    marginHorizontal: 10,
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
    bottom: -75,
    left: 27,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 10,
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
    fontSize: 8,
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
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
});
