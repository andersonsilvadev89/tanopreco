import React, { memo, useEffect, useMemo, useState } from "react";
import { Dimensions, Image, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BRAND_COLORS } from "@/constants/BrandColors";

export interface ProductCardData {
    id: string;
    descricao: string;
    preco?: string;
    imagemUrl?: string;
    nomeEmpresa?: string;
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
    productLocation: { latitude: number; longitude: number } | null,
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
    const value = Number((preco || "R$ 0,00").replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
    if (Number.isNaN(value)) return preco || "R$ 0,00";
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ProductCardBaseComponent({
    produto,
    userLocation,
    onCardPress,
    onImagePress,
    actions = [],
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

    return (
        <View style={[styles.card, cardStyle]}>
            <TouchableOpacity activeOpacity={0.9} onPress={cardPress} style={styles.pressArea}>
                <View style={styles.imageArea}>
                    {imageUri && !imageLoadError ? (
                        <TouchableOpacity
                            style={styles.imagePressArea}
                            disabled={!onImagePress}
                            onPress={onImagePress}
                            activeOpacity={0.9}
                        >
                            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" onError={() => setImageLoadError(true)} />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Feather name="image" size={46} color={BRAND_COLORS.border} />
                        </View>
                    )}

                    {showPriceBadge && !!produto.preco && (
                        <View style={styles.priceBadge}>
                            <Text style={styles.priceBadgeText} numberOfLines={1}>{formatPrice(produto.preco)}</Text>
                        </View>
                    )}
                    {actions.length > 0 && (
                        <View style={styles.actionOverlay}>
                            {actions.map((action) => (
                                <TouchableOpacity
                                    key={action.accessibilityLabel}
                                    accessibilityLabel={action.accessibilityLabel}
                                    style={[styles.actionButton, action.backgroundColor ? { backgroundColor: action.backgroundColor } : null]}
                                    onPress={action.onPress}
                                >
                                    <Feather name={action.icon} size={18} color={BRAND_COLORS.white} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    {imageOverlay}
                </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={cardPress} activeOpacity={0.8} style={styles.descriptionRow}>
                <Text style={styles.description} numberOfLines={lines}>
                    {produto.descricao}
                    {showDescriptionHint && !expanded && (produto.descricao?.length ?? 0) > 28 && <Text style={styles.descriptionHint}> +ver</Text>}
                </Text>
            </TouchableOpacity>
            {showCompanyBadge && !!produto.nomeEmpresa && (
                <Text style={styles.companyName} numberOfLines={1}>{produto.nomeEmpresa}</Text>
            )}
            {additionalContent}

            <View style={styles.metaRow}>
                {distance !== null && <Text style={styles.distance}>≈ {distance.toFixed(1)} km</Text>}
            </View>
        </View>
    );
}

export const ProductCardBase = memo(ProductCardBaseComponent);

export const PRODUCT_CARD_WIDTH = ((Dimensions.get("window").width - 12 * 3) / 2) * 0.864;

const styles = StyleSheet.create({
    card: { width: PRODUCT_CARD_WIDTH, backgroundColor: "transparent", borderRadius: 14, padding: 6, marginBottom: 10, marginHorizontal: 10, alignItems: "center", borderStyle:"solid", borderWidth:2, borderColor: "#a8aaad" },
    pressArea: { width: "100%" },
    imageArea: { position: "relative", width: "100%", alignItems: "center" },
    imagePressArea: { width: "100%", alignItems: "center" },
    image: { width: "100%", alignSelf: "flex-end", height: 170, borderTopRightRadius: 14, borderBottomLeftRadius: 14, borderTopLeftRadius: 14, backgroundColor: BRAND_COLORS.surfaceSoft },
    imagePlaceholder: { width: "100%", height: 125, borderRadius: 40, backgroundColor: BRAND_COLORS.surfaceSoft, justifyContent: "center", alignItems: "center" },
    priceBadge: { position: "absolute", right: 0, bottom: 0, backgroundColor: "rgba(16,117,60,1)", borderTopLeftRadius: 16, paddingHorizontal: 6, paddingVertical: 4 },
    priceBadgeText: { color: BRAND_COLORS.white, fontSize: 14, fontWeight: "800" },
    actionOverlay: { position: "absolute", left: 0, bottom: 0, flexDirection: "column", gap: 5 },
    actionButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(10,79,203,0.82)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
    descriptionRow: { width: "100%", marginTop: 8, paddingHorizontal: 3 },
    description: { fontSize: 10, fontWeight: "700", color: BRAND_COLORS.text, textAlign: "center", lineHeight: 13 },
    descriptionHint: { fontSize: 8, color: BRAND_COLORS.primary, fontWeight: "700" },
    companyName: { width: "100%", fontSize: 9, fontWeight: "600", color: BRAND_COLORS.textMuted, textAlign: "center", marginTop: 3, paddingHorizontal: 3 },
    metaRow: { width: "100%", alignItems: "center", marginTop: 3 },
    distance: { fontSize: 9, color: BRAND_COLORS.primary, fontWeight: "700", textAlign: "center" },
});