import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { getGoogleMobileAdsModule, isGoogleMobileAdsAvailable } from '../utils/googleMobileAds';
import { BRAND_COLORS } from '@/constants/BrandColors';

// ------------------------------------------------------------------
// 🔧 CONFIGURAÇÃO POR PLATAFORMA (ANDROID / iOS) E DIMENSÕES
// ------------------------------------------------------------------

const IOS_AD_UNIT_ID = 'ca-app-pub-5241782827769638/1260262961';
const ANDROID_AD_UNIT_ID = 'ca-app-pub-5241782827769638/2862164767';

// Mantem as mesmas proporcoes do ProdutoCard para nao destoar no carrossel.
const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = ((width - CARD_MARGIN * 3) / 2) * 0.72;

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
        return null;
    }

    return (
        <NativeAdView nativeAd={nativeAd} style={styles.adContainer}>
            <View style={styles.cardProduto}>
                <View style={styles.cardPressArea}>
                    <View style={styles.imageArea}>
                        <NativeMediaView style={styles.imagemProduto} />

                        {nativeAd.advertiser && (
                            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                                <View style={styles.badgeEmpresa}>
                                    <Text style={styles.badgeEmpresaText} numberOfLines={1}>
                                        {nativeAd.advertiser}
                                    </Text>
                                </View>
                            </NativeAsset>
                        )}

                        {nativeAd.callToAction && (
                            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                                <View style={styles.badgePreco}>
                                    <Text style={styles.badgePrecoText} numberOfLines={1}>
                                        {nativeAd.callToAction}
                                    </Text>
                                </View>
                            </NativeAsset>
                        )}
                    </View>
                </View>

                <View style={styles.descRow}>
                    <NativeAsset assetType={NativeAssetType.HEADLINE}>
                        <Text style={styles.descricao} numberOfLines={1}>
                            {nativeAd.headline}
                        </Text>
                    </NativeAsset>
                </View>

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
        width: CARD_WIDTH,
        backgroundColor: 'transparent',
        elevation: 0,
        margin: 0,
    },
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
    loadingContainer: { 
        width: CARD_WIDTH, 
        minHeight: 150,
        justifyContent: 'center', 
        alignItems: 'center',
        marginHorizontal: 10,
        marginBottom: 10,
    },
    loadingText: { marginTop: 8, fontSize: 12, color: BRAND_COLORS.textMuted },
    
    imageArea: {
        position: 'relative',
        width: '100%',
        alignItems: 'center',
    },
    imagemProduto: {
        width: '80%',
        alignSelf: 'flex-end',
        height: 104,
        borderRadius: 32,
        backgroundColor: BRAND_COLORS.surfaceSoft,
        overflow: 'hidden',
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

export default AdCard;