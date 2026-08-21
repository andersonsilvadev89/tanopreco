import React, { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BRAND_COLORS } from '@/constants/BrandColors';

interface ProdutoComEmpresa {
    id: string;
    descricao: string;
    preco: string;
    imagemUrl?: string;
    palavrasChave?: string;
    empresaId: string;
    nomeEmpresa: string;
    latitudeEmpresa: number;
    longitudeEmpresa: number;
    latitudeProduto?: number;
    longitudeProduto?: number;
    localizacaoDiferente?: boolean;
    dataFinalOferta?: string;
    enquantoDurarEstoque?: boolean;
    destaque?: boolean;
    categoria?: string;
    isAd?: boolean;
    unlike?: number;
    like?: number;
}

interface EmpresaData {
    nomeEmpresa: string;
    latitude?: number;
    longitude?: number;
    instagram?: string;
    telefone?: string;
}

interface ProdutoCardProps {
    produto: ProdutoComEmpresa;
    empresaInfo: EmpresaData;
    userLocation: { latitude: number; longitude: number } | null;
    deviceId: string | null;
    votarProduto: (produtoId: string, tipo: 'like' | 'unlike') => Promise<void>;
    handleVerNoMapa: (produto: ProdutoComEmpresa) => void;
    openInstagramProfile: (username: string | undefined) => Promise<void>;
    openWhatsApp: (telefone: string | undefined) => void;
    onImagePress: (produto: ProdutoComEmpresa) => void;
}

const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = ((width - CARD_MARGIN * 3) / 2) * 0.72;

function getProdutoLocation(produto: ProdutoComEmpresa): { latitude: number; longitude: number; isProdutoLocation: boolean } | null {
    if (produto.localizacaoDiferente && produto.latitudeProduto && produto.longitudeProduto) {
        return {
            latitude: produto.latitudeProduto,
            longitude: produto.longitudeProduto,
            isProdutoLocation: true,
        };
    }

    if (produto.latitudeEmpresa && produto.longitudeEmpresa) {
        return {
            latitude: produto.latitudeEmpresa,
            longitude: produto.longitudeEmpresa,
            isProdutoLocation: false,
        };
    }

    return null;
}

function calcularDistancia(userLocation: any, empresaLocation: any) {
    if (!userLocation || !empresaLocation) return null;

    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(empresaLocation.latitude - userLocation.latitude);
    const dLon = toRad(empresaLocation.longitude - userLocation.longitude);
    const lat1 = toRad(userLocation.latitude);
    const lat2 = toRad(empresaLocation.latitude);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) *
        Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const ProdutoCardComponent: React.FC<ProdutoCardProps> = ({
    produto,
    empresaInfo,
    userLocation,
    handleVerNoMapa,
    openInstagramProfile,
    openWhatsApp,
    onImagePress,
}) => {
    const [expandidoDescricao, setExpandidoDescricao] = useState(false);
    const [imageLoadError, setImageLoadError] = useState(false);

    const location = getProdutoLocation(produto);
    const distancia = userLocation && location
        ? calcularDistancia(userLocation, { latitude: location.latitude, longitude: location.longitude })
        : null;
    const temLocalizacao = !!location;

    const imageUri = useMemo(() => {
        const url = produto.imagemUrl?.trim();
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
        return null;
    }, [produto.imagemUrl]);

    useEffect(() => {
        setImageLoadError(false);
    }, [imageUri]);

    const precoFormatado = useMemo(() => {
        const valorLimpo = (produto.preco || 'R$ 0,00')
            .replace('R$', '')
            .replace(/\./g, '')
            .replace(',', '.')
            .trim();

        const valor = Number(valorLimpo || 0);
        if (Number.isNaN(valor)) {
            return 'R$ 0,00';
        }

        return `R$ ${valor.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }, [produto.preco]);

    return (
        <View style={styles.cardProduto}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setExpandidoDescricao((prev) => !prev)}
                style={styles.cardPressArea}
            >
                <View style={styles.imageArea}>
                    {imageUri && !imageLoadError ? (
                        <TouchableOpacity 
                            style={{ width: '100%' }} 
                            onPress={() => onImagePress(produto)} 
                            activeOpacity={0.9}>
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.imagemProduto}
                                resizeMode="cover"
                                onError={() => setImageLoadError(true)}
                            />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.imagemProdutoPlaceholder}>
                            <Feather name="image" size={46} color={BRAND_COLORS.border} />
                        </View>
                    )}

                    <View style={styles.badgeEmpresa}>
                        <Text style={styles.badgeEmpresaText} numberOfLines={1}>
                            {empresaInfo?.nomeEmpresa || produto.nomeEmpresa}
                        </Text>
                    </View>

                    <View style={styles.badgePreco}>
                        <Text style={styles.badgePrecoText}>{precoFormatado}</Text>
                    </View>

                    <View style={styles.actionOverlay}>
                        {temLocalizacao && (
                            <TouchableOpacity style={styles.smallActionButton} onPress={() => handleVerNoMapa(produto)}>
                                <Feather name="map-pin" size={12} color={BRAND_COLORS.white} />
                            </TouchableOpacity>
                        )}

                        {empresaInfo?.instagram && (
                            <TouchableOpacity
                                style={[styles.smallActionButton, styles.instagramButton]}
                                onPress={() => openInstagramProfile(empresaInfo.instagram)}
                            >
                                <Feather name="instagram" size={12} color={BRAND_COLORS.white} />
                            </TouchableOpacity>
                        )}

                        {empresaInfo?.telefone && (
                            <TouchableOpacity
                                style={[styles.smallActionButton, styles.whatsappButton]}
                                onPress={() => openWhatsApp(empresaInfo.telefone)}
                            >
                                <Feather name="message-circle" size={12} color={BRAND_COLORS.white} />
                            </TouchableOpacity>
                        )}
                    </View>

                </View>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setExpandidoDescricao((prev) => !prev)}
                activeOpacity={0.8}
                style={styles.descRow}
            >
                <Text style={styles.descricao} numberOfLines={expandidoDescricao ? undefined : 1}>
                    {produto.descricao}
                    {!expandidoDescricao && (produto.descricao?.length ?? 0) > 28 && (
                        <Text style={styles.descHint}> +ver</Text>
                    )}
                </Text>
            </TouchableOpacity>

            <View style={styles.metaRow}>
                {distancia !== null && (
                    <Text style={styles.distancia}>≈ {distancia.toFixed(1)} km</Text>
                )}
                {produto.dataFinalOferta && (
                    <Text style={styles.dataOferta}>Validade: {produto.dataFinalOferta}</Text>
                )}
            </View>

        </View>
    );
};

export const ProdutoCard = memo(ProdutoCardComponent);

const styles = StyleSheet.create({
    cardProduto: {
        width: CARD_WIDTH,
        backgroundColor: 'transparent',
        borderRadius: 14,
        padding: 6,
        marginBottom: 10,
        marginHorizontal: 10,
        alignItems: 'center',
    },
    cardPressArea: {
        width: '100%',
    },
    imageArea: {
        position: 'relative',
        width: '100%',
        alignItems: 'center',
    },
    imagemProduto: {
        width: '80%',
        alignSelf:"flex-end",
        height: 104,
        borderRadius: 32,
        backgroundColor: BRAND_COLORS.surfaceSoft,
    },
    imagemProdutoPlaceholder: {
        width: '100%',
        height: 104,
        borderRadius: 40,
        backgroundColor: BRAND_COLORS.surfaceSoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeEmpresa: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: 'rgba(0,0,0)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 4,
        maxWidth: '64%',
    },
    badgeEmpresaText: {
        color: BRAND_COLORS.white,
        fontSize: 8,
        fontWeight: '700',
    },
    badgePreco: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(16,117,60)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    badgePrecoText: {
        color: BRAND_COLORS.white,
        fontSize: 12,
        fontWeight: '800',
    },
    actionOverlay: {
        position: 'absolute',
        left: 0,
        bottom: 0,
        flexDirection: 'column',
        gap: 5,
    },
    smallActionButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(10,79,203,0.82)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    instagramButton: {
        backgroundColor: 'rgba(225,48,108,0.82)',
    },
    whatsappButton: {
        backgroundColor: 'rgba(37,211,102,0.82)',
    },
    descRow: {
        width: '100%',
        marginTop: 8,
        paddingHorizontal: 3,
    },
    descricao: {
        fontSize: 10,
        fontWeight: '700',
        color: BRAND_COLORS.text,
        textAlign: 'center',
        lineHeight: 13,
    },
    descHint: {
        fontSize: 8,
        color: BRAND_COLORS.primary,
        fontWeight: '700',
    },
    metaRow: {
        width: '100%',
        alignItems: 'center',
        marginTop: 3,
        marginBottom: 0,
    },
    distancia: {
        fontSize: 9,
        color: BRAND_COLORS.primary,
        fontWeight: '700',
        textAlign: 'center',
    },
    dataOferta: {
        fontSize: 8,
        color: BRAND_COLORS.textMuted,
        textAlign: 'center',
        marginTop: 1,
    },
});