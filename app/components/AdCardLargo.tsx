import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { getGoogleMobileAdsModule, isGoogleMobileAdsAvailable } from '../utils/googleMobileAds';
import { BRAND_COLORS } from '@/constants/BrandColors';

// ------------------------------------------------------------------
// 🔧 CONFIGURAÇÃO POR PLATAFORMA (ANDROID / iOS) E DIMENSÕES
// ------------------------------------------------------------------

const IOS_AD_UNIT_ID = 'ca-app-pub-5241782827769638/1260262961';
const ANDROID_AD_UNIT_ID = 'ca-app-pub-5241782827769638/2862164767';

const AdCardLargo: React.FC = () => {
    const googleMobileAds = getGoogleMobileAdsModule();
    const [nativeAd, setNativeAd] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const adRef = useRef<any>(null);

    // No Expo Go os anúncios reais não carregam; exibimos um card fictício
    // apenas para visualizar o espaço/layout ocupado durante o desenvolvimento.
    if (!isGoogleMobileAdsAvailable || !googleMobileAds) {
        if (__DEV__) {
            return (
                <View style={styles.adContainer}>
                    <View style={styles.cardContainer}>
                        <View style={styles.mediaView} />

                        <View style={styles.compactFooter}>
                            <View style={styles.iconPlaceholder} />

                            <View style={styles.textColumn}>
                                <Text style={styles.headline} numberOfLines={1}>Anúncio de exemplo (mock)</Text>
                                <View style={styles.advertiserRow}>
                                    <Text style={styles.advertiser} numberOfLines={1}>Anunciante Fictício</Text>
                                    <View style={styles.adBadge}>
                                        <Text style={styles.adBadgeText}>Ad</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.ctaButtonCompact}>
                                <Text style={styles.ctaButtonText}>SAIBA MAIS</Text>
                            </View>
                        </View>
                    </View>
                </View>
            );
        }
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
                console.error('Erro ao criar NativeAd Largo:', err);
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

    // Placeholder enquanto carrega para evitar "pulos" de layout
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={BRAND_COLORS.primary} size="large" />
                <Text style={styles.loadingText}>Buscando ofertas patrocinadas...</Text>
            </View>
        );
    }

    if (error || !nativeAd) {
        return null;
    }

    return (
        <NativeAdView nativeAd={nativeAd} style={styles.adContainer}>
            <View style={styles.cardContainer}>
                
                {/* 1. MÍDIA NO TOPO: Altura mínima de 140px para garantir vídeos de alto valor */}
                <NativeMediaView style={styles.mediaView} />

                {/* 2. RODAPÉ COMPACTO: Tudo na mesma linha para poupar espaço vertical */}
                <View style={styles.compactFooter}>
                    
                    {/* ÍCONE DA EMPRESA */}
                    {nativeAd.icon && (
                        <NativeAsset assetType={NativeAssetType.ICON}>
                            <View style={styles.iconPlaceholder} />
                        </NativeAsset>
                    )}

                    {/* COLUNA DE TEXTOS (Título e Anunciante) */}
                    <View style={styles.textColumn}>
                        <NativeAsset assetType={NativeAssetType.HEADLINE}>
                            <Text style={styles.headline} numberOfLines={1}>
                                {nativeAd.headline}
                            </Text>
                        </NativeAsset>
                        
                        <View style={styles.advertiserRow}>
                            {nativeAd.advertiser && (
                                <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                                    <Text style={styles.advertiser} numberOfLines={1}>
                                        {nativeAd.advertiser}
                                    </Text>
                                </NativeAsset>
                            )}
                            <View style={styles.adBadge}>
                                <Text style={styles.adBadgeText}>Ad</Text>
                            </View>
                        </View>
                    </View>

                    {/* BOTÃO CTA MENOR, PORÉM VISÍVEL E CLICÁVEL */}
                    {nativeAd.callToAction && (
                        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                            <View style={styles.ctaButtonCompact}>
                                <Text style={styles.ctaButtonText}>
                                    {nativeAd.callToAction.toUpperCase()}
                                </Text>
                            </View>
                        </NativeAsset>
                    )}

                </View>
            </View>
        </NativeAdView>
    );
};

// ------------------------------------------------------------------
// ESTILOS DE ALTA PERFORMANCE (COMPACTO)
// ------------------------------------------------------------------
const styles = StyleSheet.create({
    adContainer: {
        width: '100%',
        marginVertical: 8,
        backgroundColor: 'transparent',
    },
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden', 
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        elevation: 2, 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    loadingContainer: { 
        width: '100%', 
        height: 200, // Altura aproximada do card montado
        justifyContent: 'center', 
        alignItems: 'center',
        marginVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    loadingText: { 
        marginTop: 12, 
        fontSize: 13, 
        color: BRAND_COLORS.textMuted 
    },
    mediaView: {
        width: '100%',
        height: 140, // Mantido em 140px para qualificar para vídeos
        backgroundColor: BRAND_COLORS.surfaceSoft,
    },
    compactFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    iconPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: BRAND_COLORS.surfaceSoft,
        marginRight: 10,
    },
    textColumn: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    headline: {
        fontSize: 14,
        fontWeight: 'bold',
        color: BRAND_COLORS.text,
        marginBottom: 2,
    },
    advertiserRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    advertiser: {
        fontSize: 11,
        color: BRAND_COLORS.textMuted,
        marginRight: 6,
        maxWidth: '75%', 
    },
    adBadge: {
        backgroundColor: '#FFCC00', 
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    adBadgeText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#000',
    },
    ctaButtonCompact: {
        backgroundColor: BRAND_COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
    },
    ctaButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default AdCardLargo;