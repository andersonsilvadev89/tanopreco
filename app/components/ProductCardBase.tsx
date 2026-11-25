import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BRAND_COLORS } from "@/constants/BrandColors";
import { CompanyVerifiedBadge } from "./CompanyVerifiedBadge";

export interface ProductCardData {
  id: string;
  descricao: string;
  preco?: string;
  imagemUrl?: string;
  nomeEmpresa?: string;
  verificado?: boolean;
  latitudeEmpresa?: number;
  longitudeEmpresa?: number;
  latitudeProduto?: number;
  longitudeProduto?: number;
  localizacaoDiferente?: boolean;
  dataFinalOferta?: string;
  palavrasChave?: string;
  categoria?: string;
  enquantoDurarEstoque?: boolean;
}

export interface ProductCardAction {
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  backgroundColor?: string;
  accessibilityLabel: string;
}

export interface ProductCardBaseProps {
  produto: ProductCardData;
  userLocation?: { latitude: number; longitude: number } | null;
  onCardPress?: () => void;
  onImagePress?: () => void;
  actions?: ProductCardAction[];
  topTag?: React.ReactNode;
  imageOverlay?: React.ReactNode;
  additionalContent?: React.ReactNode;
  cardStyle?: StyleProp<ViewStyle>;
  descriptionNumberOfLines?: number;
  showDescriptionHint?: boolean;
  showCompanyBadge?: boolean;
  showPriceBadge?: boolean;
}

export function getProductLocation(produto: ProductCardData) {
  if (produto.localizacaoDiferente && produto.latitudeProduto && produto.longitudeProduto) {
    return { latitude: produto.latitudeProduto, longitude: produto.longitudeProduto };
  }
  if (produto.latitudeEmpresa && produto.longitudeEmpresa) {
    return { latitude: produto.latitudeEmpresa, longitude: produto.longitudeEmpresa };
  }
  return null;
}

function calculateDistance(
  userLocation: { latitude: number; longitude: number } | null | undefined,
  productLocation: { latitude: number; longitude: number } | null
) {
  if (!userLocation || !productLocation) return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRad(productLocation.latitude - userLocation.latitude);
  const deltaLongitude = toRad(productLocation.longitude - userLocation.longitude);
  const latitudeUser = toRad(userLocation.latitude);
  const latitudeProduct = toRad(productLocation.latitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.sin(deltaLongitude / 2) ** 2 * Math.cos(latitudeUser) * Math.cos(latitudeProduct);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPrice(preco?: string) {
  const value = Number(
    (preco || "R$ 0,00").replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
  );
  if (Number.isNaN(value)) return preco || "R$ 0,00";
  return `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isOfertaExpirada(dataFinalOferta?: string) {
  if (!dataFinalOferta) return false;

  const [dia, mes, ano] = dataFinalOferta.split("/");
  const dataFinal = new Date(Number(ano), Number(mes) - 1, Number(dia));
  const hoje = new Date();

  hoje.setHours(0, 0, 0, 0);
  dataFinal.setHours(0, 0, 0, 0);

  return dataFinal.getTime() < hoje.getTime();
}

function ProductCardBaseComponent({
  produto,
  userLocation,
  onCardPress,
  onImagePress,
  actions = [],
  topTag,
  imageOverlay,
  additionalContent,
  cardStyle,
  descriptionNumberOfLines = 2,
  showDescriptionHint = true,
  showCompanyBadge = true,
  showPriceBadge = true,
}: ProductCardBaseProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const productLocation = getProductLocation(produto);
  const distance = calculateDistance(userLocation, productLocation);
  const imageUri = useMemo(() => {
    const url = produto.imagemUrl?.trim();
    return url && /^(https?:\/\/|data:)/.test(url) ? url : null;
  }, [produto.imagemUrl]);

  useEffect(() => setImageLoadError(false), [imageUri]);

  const toggleDescription = () => setExpanded((current) => !current);
  const cardPress = onCardPress || toggleDescription;
  const lines = expanded ? undefined : descriptionNumberOfLines;
  const expirada = isOfertaExpirada(produto.dataFinalOferta);

  return (
    <View style={[styles.card, cardStyle]}>
      {/* Tag superior (só ocupa espaço se houver algo para mostrar) */}
      {(expirada || topTag || produto.categoria) && (
        <View style={styles.topTagRow}>
          {expirada ? (
            <View style={styles.expiredTag}>
              <Text style={styles.expiredTagText}>Oferta expirada</Text>
            </View>
          ) : topTag ? (
            topTag
          ) : (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText} numberOfLines={1}>
                {produto.categoria}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Área da Imagem */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onImagePress || cardPress}
        style={styles.imageArea}
      >
        {imageUri && !imageLoadError ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Feather name="shopping-bag" size={28} color={BRAND_COLORS.textMuted} />
          </View>
        )}
        {imageOverlay}
      </TouchableOpacity>

      {/* Descrição */}
      <TouchableOpacity onPress={cardPress} activeOpacity={0.8} style={styles.descriptionRow}>
        <Text style={styles.description} numberOfLines={lines}>
          {produto.descricao}
          {showDescriptionHint && !expanded && (produto.descricao?.length ?? 0) > 34 && (
            <Text style={styles.descriptionHint}> +ver</Text>
          )}
        </Text>
      </TouchableOpacity>

      {/* Preço */}
      {showPriceBadge && !!produto.preco && (
        <Text style={styles.price} numberOfLines={1}>
          {formatPrice(produto.preco)}
        </Text>
      )}

      {/* Nome da Empresa + Selo Verificado */}
      {showCompanyBadge && !!produto.nomeEmpresa && (
        <View style={styles.companyNameRow}>
          <Text style={styles.companyName} numberOfLines={1}>
            {produto.nomeEmpresa}
          </Text>
          {produto.verificado === true && (
            <View style={styles.companyBadgeWrapper}>
              <CompanyVerifiedBadge compact />
            </View>
          )}
        </View>
      )}

      {/* Distância */}
      {distance !== null && (
        <Text style={styles.distance} numberOfLines={1}>
          ≈ {distance.toFixed(1)} km
        </Text>
      )}

      {additionalContent}

      {/* Barra de Ações no rodapé */}
      {actions.length > 0 && (
        <View style={styles.actionsRow}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.accessibilityLabel}
              accessibilityLabel={action.accessibilityLabel}
              style={[
                styles.actionButton,
                action.backgroundColor ? { backgroundColor: action.backgroundColor } : null,
              ]}
              onPress={action.onPress}
              activeOpacity={0.85}
            >
              <Feather name={action.icon} size={14} color={BRAND_COLORS.white} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export const ProductCardBase = memo(ProductCardBaseComponent);

export const PRODUCT_CARD_WIDTH = (Dimensions.get("window").width - 12 * 3) / 2;

const styles = StyleSheet.create({
  card: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  topTagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(10, 79, 203, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: BRAND_COLORS.primaryDark,
  },
  expiredTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(192, 57, 43, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expiredTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#C0392B",
  },
  imageArea: {
    position: "relative",
    width: "100%",
    marginBottom: 8,
  },
  image: {
    width: "90%",
    alignSelf:"center",
    height: 140,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BRAND_COLORS.surfaceSoft,
  },
  descriptionRow: {
    width: "100%",
  },
  description: {
    fontSize: 13,
    fontWeight: "600",
    color: BRAND_COLORS.text,
    minHeight: 34,
    lineHeight: 17,
  },
  descriptionHint: {
    fontSize: 11,
    color: BRAND_COLORS.primary,
    fontWeight: "700",
  },
  price: {
    fontSize: 16,
    fontWeight: "900",
    color: BRAND_COLORS.success,
    marginTop: 4,
  },
  companyNameRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  companyName: {
    fontSize: 11,
    fontWeight: "700",
    color: BRAND_COLORS.text,
    flexShrink: 1,
  },
  companyBadgeWrapper: {
    marginLeft: 4,
  },
  distance: {
    fontSize: 10,
    color: BRAND_COLORS.primary,
    fontWeight: "700",
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: 7,
    borderRadius: 8,
  },
});