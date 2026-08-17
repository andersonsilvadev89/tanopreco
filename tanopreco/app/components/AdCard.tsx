import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { getGoogleMobileAdsModule, isGoogleMobileAdsAvailable } from '../utils/googleMobileAds';
import { BRAND_COLORS } from '@/constants/BrandColors';

// ------------------------------------------------------------------
// 🔧 CONFIGURAÇÃO POR PLATAFORMA (ANDROID / iOS) E DIMENSÕES
// ------------------------------------------------------------------

const IOS_AD_UNIT_ID = 'ca-app-pub-5241782827769638/1260262961';
const ANDROID_AD_UNIT_ID = 'ca-app-pub-5241782827769638/2862164767';

// Importando as mesmas constantes de dimensão do ProdutoCard
const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;
const CARD_MIN_HEIGHT = 270;

const AdCard: React.FC = () => {
    const googleMobileAds = getGoogleMobileAdsModule();
    const [nativeAd, setNativeAd] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const adRef = useRef<any>(null);

    if (!isGoogleMobileAdsAvailable || !googleMobileAds) {
        return null;
    }

    const {
        NativeAd,
        NativeAdView,
        NativeAsset,
        NativeAssetType,
        NativeMediaView,
        TestIds,
    } = googleMobileAds;

    const AD_UNIT_ID = __DEV__
        ? TestIds.NATIVE
        : Platform.select({
            ios: IOS_AD_UNIT_ID,
            android: ANDROID_AD_UNIT_ID,
        }) || TestIds.NATIVE;

    useEffect(() => {
        let isMounted = true;

        NativeAd.createForAdRequest(AD_UNIT_ID)
            .then((ad: any) => {
                if (!isMounted) return;
                adRef.current = ad;
                setNativeAd(ad);
                setLoading(false);
            })
            .catch((err: unknown) => {
                console.error('Erro ao criar NativeAd:', err);
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error('Falha ao carregar NativeAd'));
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
            adRef.current?.destroy();
            adRef.current = null;
        };
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={BRAND_COLORS.primary} />
                <Text style={styles.loadingText}>Carregando anúncio...</Text>
            </View>
        );
    }

    if (error || !nativeAd) {
        return null; // Oculta o card se der erro para não quebrar a listagem
    }

    return (
        <NativeAdView nativeAd={nativeAd} style={styles.adContainer}>
            <View style={styles.cardProduto}>
                
                {/* ÁREA DA IMAGEM E BADGES */}
                <View style={styles.imageArea}>
                    
                    {/* 1. Imagem Principal */}
                    <NativeMediaView style={styles.imagemProduto} />

                    {/* 2. Badge Empresa (Anunciante no Topo Esquerdo) */}
                    {nativeAd.advertiser && (
                        <View style={styles.badgeEmpresaWrapper}>
                            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                                <View style={styles.badgeEmpresa}>
                                    <Text style={styles.badgeEmpresaText} numberOfLines={1}>
                                        {nativeAd.advertiser}
                                    </Text>
                                </View>
                            </NativeAsset>
                        </View>
                    )}

                    {/* 3. Badge Preço (Call to Action no Canto Inferior Direito) */}
                    {nativeAd.callToAction && (
                        <View style={styles.badgePrecoWrapper}>
                            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                                <View style={styles.badgePreco}>
                                    <Text style={styles.badgePrecoText}>
                                        {nativeAd.callToAction}
                                    </Text>
                                </View>
                            </NativeAsset>
                        </View>
                    )}
                </View>

                {/* 4. Descrição (Headline simulando nome do produto) */}
                <View style={styles.descRow}>
                    <NativeAsset assetType={NativeAssetType.HEADLINE}>
                        <Text style={styles.descricao} numberOfLines={2}>
                            {nativeAd.headline}
                        </Text>
                    </NativeAsset>
                </View>

                {/* 5. Meta Data (Body do anúncio + Tag Patrocinado) */}
                <View style={styles.metaRow}>
                    <Text style={styles.distancia}>Patrocinado</Text>
                    {nativeAd.body && (
                        <NativeAsset assetType={NativeAssetType.BODY}>
                            <Text style={styles.dataOferta} numberOfLines={1}>
                                {nativeAd.body}
                            </Text>
                        </NativeAsset>
                    )}
                </View>

            </View>
        </NativeAdView>
    );
};

// ------------------------------------------------------------------
// ESTILOS GÊMEOS AO PRODUTOCARD
// ------------------------------------------------------------------

const styles = StyleSheet.create({
    adContainer: {
        padding: 0,
        backgroundColor: 'transparent',
        elevation: 0,
        margin: 0,
    },
    cardProduto: {
        width: CARD_WIDTH,
        minHeight: CARD_MIN_HEIGHT,
        backgroundColor: 'transparent',
        borderRadius: 18,
        padding: 8,
        marginBottom: 12,
        marginHorizontal: CARD_MARGIN / 2,
        alignItems: 'center',
    },
    loadingContainer: { 
        width: CARD_WIDTH, 
        minHeight: CARD_MIN_HEIGHT, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    loadingText: { marginTop: 8, fontSize: 12, color: BRAND_COLORS.textMuted },
    
    imageArea: {
        position: 'relative',
        width: '100%',
        alignItems: 'center',
    },
    imagemProduto: {
        width: '90%',
        alignSelf: 'flex-end',
        height: 150,
        borderRadius: 40,
        backgroundColor: BRAND_COLORS.surfaceSoft,
        overflow: 'hidden',
    },
    
    // Wrapper absolutos para os badges ficarem sobre a imagem
    badgeEmpresaWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        maxWidth: '64%',
    },
    badgeEmpresa: {
        backgroundColor: 'rgba(0,0,0,0.8)', // Leve opacidade para destacar
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    badgeEmpresaText: {
        color: BRAND_COLORS.white,
        fontSize: 9,
        fontWeight: '700',
    },

    badgePrecoWrapper: {
        position: 'absolute',
        right: 0,
        bottom: 0,
    },
    badgePreco: {
        backgroundColor: 'rgba(16,117,60,0.9)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    badgePrecoText: {
        color: BRAND_COLORS.white,
        fontSize: 13, // Levemente menor caso o texto do CTA seja grande
        fontWeight: '800',
    },

    descRow: {
        width: '100%',
        marginTop: 10,
        paddingHorizontal: 4,
    },
    descricao: {
        fontSize: 12,
        fontWeight: '700',
        color: BRAND_COLORS.text,
        textAlign: 'center',
        lineHeight: 16,
    },

    metaRow: {
        width: '100%',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 6,
    },
    distancia: {
        fontSize: 11,
        color: BRAND_COLORS.primary,
        fontWeight: '700',
        textAlign: 'center',
    },
    dataOferta: {
        fontSize: 10,
        color: BRAND_COLORS.textMuted,
        textAlign: 'center',
        marginTop: 2,
    },
});

export default AdCard;