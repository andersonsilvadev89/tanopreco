import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import {
    NativeAd,
    NativeAdView,
    NativeAsset,
    NativeAssetType,
    NativeMediaView,
    TestIds,
} from 'react-native-google-mobile-ads';
import type { NativeAd as NativeAdType } from 'react-native-google-mobile-ads';

// Use NATIVE_ADVANCED para melhor controle de layout
const AD_UNIT_ID = __DEV__ ? TestIds.NATIVE : 'ca-app-pub-5241782827769638/1260262961';

const AdCard: React.FC = () => {
    const [nativeAd, setNativeAd] = useState<NativeAdType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const adRef = useRef<NativeAdType | null>(null);

    useEffect(() => {
        let isMounted = true;

        // Cria o anúncio e carrega automaticamente
        NativeAd.createForAdRequest(AD_UNIT_ID)
            .then((ad) => {
                if (!isMounted) return;

                adRef.current = ad;
                setNativeAd(ad);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Erro ao criar NativeAd:', err);
                if (isMounted) {
                    setError(err);
                    setLoading(false);
                }
            });

        // Cleanup
        return () => {
            isMounted = false;
            adRef.current?.destroy();
            adRef.current = null;
        };
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color="#007bff" />
                <Text style={styles.loadingText}>Carregando anúncio...</Text>
            </View>
        );
    }

    if (error || !nativeAd) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Erro ao carregar anúncio.</Text>
            </View>
        );
    }

    return (
        <NativeAdView nativeAd={nativeAd} style={styles.adContainer}>
            <View style={styles.card}>

                {/* 1. Mídia (Imagem Principal) - Topo, como a imagem do produto */}
                <NativeMediaView style={styles.media} />

                {/* 2. Headline (Descrição) */}
                <NativeAsset assetType={NativeAssetType.HEADLINE}>
                    <Text style={styles.headline} numberOfLines={2}>
                        {nativeAd.headline}
                    </Text>
                </NativeAsset>

                {/* 3. Price (Simulado pelo Advertiser/Body) - Usa a cor 'green' */}
                <NativeAsset assetType={NativeAssetType.BODY}>
                    <Text style={styles.simulatedPrice}>
                        {/* Exibe a descrição/corpo como se fosse o preço ou uma chamada */}
                        {nativeAd.body ? nativeAd.body.substring(0, 30) + '...' : 'Confira a Oferta!'}
                    </Text>
                </NativeAsset>

                {/* 4. Container da Empresa (Advertiser e CTA como botões de ação) */}
                <View style={styles.empresaContainerSimulado}>
                    <Text style={styles.confiraOfertaSimulado}>
                        Confira a oferta direto na empresa:
                    </Text>

                    {/* Nome da Empresa (Advertiser) */}
                    {nativeAd.advertiser && (
                        <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                            <Text style={styles.advertiser}>{nativeAd.advertiser}</Text>
                        </NativeAsset>
                    )}

                    {/* Botão CTA (Simulando o botão de Rota/Contato) */}
                    {nativeAd.callToAction && (
                        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                            <View style={styles.cta}>
                                <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
                            </View>
                        </NativeAsset>
                    )}
                </View>

                {/* Badge Patrocinado, no rodapé */}
                <Text style={styles.adBadge}>Patrocinado</Text>
            </View>
        </NativeAdView>
    );
};

// ------------------------------------------------------------------
// ESTILOS AJUSTADOS PARA COMBINAR COM O HOMESCREEN
// ------------------------------------------------------------------

const styles = StyleSheet.create({
    // O adContainer no AdCard precisa refletir o estilo do cardProdutoGenerico/cardProduto
    adContainer: {
        // Estas margens/paddings são adicionais ao que já está no HomeScreen
        padding: 0, // Removido o padding interno para usar o padding do 'cardProdutoGenerico'
        backgroundColor: 'transparent',
        elevation: 0,
        margin: 0,
        // O container principal deve ocupar 100% da área disponível
        width: '100%',
        flex: 1,
    },
    card: {
        // Garante que o conteúdo ocupe toda a área do container
        flex: 1,
        width: '100%',
        alignItems: 'center', // Centralizado como o card de produto
        padding: 10, // Padding interno do produto real (do HomeScreen)
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 8, fontSize: 12, color: '#888' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { padding: 16, color: 'red' },

    // --- MÍDIA ---
    media: {
        width: '100%',
        height: 100, // 💡 IGUAL À IMAGEM DO PRODUTO NO HOMESCREEN
        marginVertical: 5, // Simula o margin top da imagem do produto
        borderRadius: 8
    },

    // --- TEXTOS ---
    headline: {
        fontSize: 15, // Tamanho da 'descricao' do produto
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
        // Outras margens devem ser 0 para evitar estouro
        marginVertical: 0,
    },
    simulatedPrice: {
        fontSize: 22,
        color: 'green', // Cor do 'preco' do produto
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 2,
    },

    // --- CONTAINER DA EMPRESA (FUNDO CINZA) ---
    empresaContainerSimulado: {
        width: "100%",
        backgroundColor: "#f7f7f7", // Cor do 'empresaContainer' no HomeScreen
        borderRadius: 8,
        padding: 8,
        marginTop: 8,
        alignItems: "center",
        // Use 'flexGrow: 1' se o card de anúncio ficar muito menor que o de produto
    },
    confiraOfertaSimulado: {
        fontSize: 12,
        color: "#555",
        fontWeight: "bold",
        marginBottom: 2,
        textAlign: "center",
    },
    advertiser: {
        fontSize: 12,
        color: '#0056b3', // Cor do 'nomeEmpresa' do produto
        fontWeight: 'bold',
        marginBottom: 5,
        textAlign: 'center'
    },

    // --- CTA (Botão de Ação) ---
    cta: {
        // Simula o estilo da linha de botões de ação do produto
        backgroundColor: '#007BFF', // Cor de Traçar Rota
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 18,
        marginTop: 5,
        marginBottom: 5,
    },
    ctaText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
        textAlign: 'center'
    },

    // --- BADGE (Patrocinado) ---
    adBadge: {
        fontSize: 10,
        color: '#777',
        marginTop: 6,
        position: 'absolute', // Coloca o badge em uma posição fixa se necessário
        bottom: 0,
        right: 5,
    },
});

export default AdCard;