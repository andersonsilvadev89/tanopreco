import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { getGoogleMobileAdsModule, isGoogleMobileAdsAvailable } from "../utils/googleMobileAds";
import { BRAND_COLORS } from "@/constants/BrandColors";

// ------------------------------------------------------------------
// CONFIGURAÇÃO POR PLATAFORMA (ANDROID / iOS) E DIMENSÕES
// ------------------------------------------------------------------

const IOS_AD_UNIT_ID = "ca-app-pub-5241782827769638/1260262961";
const ANDROID_AD_UNIT_ID = "ca-app-pub-5241782827769638/2862164767";

const CARD_WIDTH = 175;
const CARD_PADDING = 10;
const CARD_BORDER = 1;
const MEDIA_WIDTH = CARD_WIDTH - CARD_PADDING * 2 - CARD_BORDER * 2;
const MEDIA_HEIGHT = 120;

const AdCard: React.FC = () => {
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
          <View style={styles.cardProduto}>
            <View style={styles.topTagRow}>
              <View style={styles.adTag}>
                <Text style={styles.adTagText}>Patrocinado</Text>
              </View>
            </View>

            <View style={styles.imageArea}>
              <View style={styles.imagemProduto} />
            </View>

            <Text style={styles.descricao} numberOfLines={2}>
              Anúncio de exemplo (mock)
            </Text>

            <Text style={styles.advertiser} numberOfLines={1}>
              Anunciante Fictício
            </Text>

            <Text style={styles.bodyText} numberOfLines={1}>
              Visível apenas em produção
            </Text>

            <View style={styles.ctaButton}>
              <Text style={styles.ctaButtonText} numberOfLines={1}>
                Saiba mais
              </Text>
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
        console.error("Erro ao criar NativeAd:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Falha ao carregar NativeAd"));
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
        {/* Tag Patrocinado no topo */}
        <View style={styles.topTagRow}>
          <View style={styles.adTag}>
            <Text style={styles.adTagText}>Patrocinado</Text>
          </View>
        </View>

        {/* Mídia do Anúncio */}
        <View style={styles.imageArea}>
          <NativeMediaView style={styles.imagemProduto} resizeMode="cover" />
        </View>

        {/* Título */}
        <NativeAsset assetType={NativeAssetType.HEADLINE}>
          <Text style={styles.descricao} numberOfLines={2}>
            {nativeAd.headline}
          </Text>
        </NativeAsset>

        {/* Anunciante */}
        {nativeAd.advertiser && (
          <NativeAsset assetType={NativeAssetType.ADVERTISER}>
            <Text style={styles.advertiser} numberOfLines={1}>
              {nativeAd.advertiser}
            </Text>
          </NativeAsset>
        )}

        {/* Descrição curta */}
        {nativeAd.body && (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text style={styles.bodyText} numberOfLines={1}>
              {nativeAd.body}
            </Text>
          </NativeAsset>
        )}

        {/* Botão de Ação (CTA) no rodapé */}
        {nativeAd.callToAction && (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View style={styles.ctaButton}>
              <Text style={styles.ctaButtonText} numberOfLines={1}>
                {nativeAd.callToAction}
              </Text>
            </View>
          </NativeAsset>
        )}
      </View>
    </NativeAdView>
  );
};

// ------------------------------------------------------------------
// ESTILOS ALINHADOS AO PRODUCTCARDBASE E OFERTASWEBSECTION
// ------------------------------------------------------------------

const styles = StyleSheet.create({
  adContainer: {
    width: CARD_WIDTH,
    marginRight: 10,
  },
  cardProduto: {
    width: "100%",
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 12,
    padding: CARD_PADDING,
    borderWidth: CARD_BORDER,
    borderColor: BRAND_COLORS.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  loadingContainer: {
    width: CARD_WIDTH,
    minHeight: 220,
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 11,
    color: BRAND_COLORS.textMuted,
  },
  topTagRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 20,
    marginBottom: 6,
  },
  adTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(10, 79, 203, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: BRAND_COLORS.primaryDark,
  },
  imageArea: {
    width: MEDIA_WIDTH,
    height: MEDIA_HEIGHT,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: BRAND_COLORS.surfaceSoft,
    marginBottom: 8,
  },
  imagemProduto: {
    width: MEDIA_WIDTH,
    height: MEDIA_HEIGHT,
  },
  descricao: {
    fontSize: 13,
    fontWeight: "600",
    color: BRAND_COLORS.text,
    minHeight: 34,
    lineHeight: 17,
  },
  advertiser: {
    fontSize: 11,
    fontWeight: "700",
    color: BRAND_COLORS.text,
    marginTop: 4,
  },
  bodyText: {
    fontSize: 10,
    color: BRAND_COLORS.textMuted,
    marginTop: 2,
  },
  ctaButton: {
    marginTop: 8,
    backgroundColor: BRAND_COLORS.success,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaButtonText: {
    color: BRAND_COLORS.white,
    fontSize: 11,
    fontWeight: "700",
  },
});

export default AdCard;