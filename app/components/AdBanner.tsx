import React, { useState } from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// ------------------------------------------------------------------
// 🔧 CONFIGURAÇÃO POR PLATAFORMA (ANDROID / iOS)
// ------------------------------------------------------------------
// ... (seus IDs de AD aqui)
const IOS_AD_UNIT_ID = 'ca-app-pub-5241782827769638/9708550818';
const ANDROID_AD_UNIT_ID = 'ca-app-pub-5241782827769638/4392341690';
const adUnitId = __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: IOS_AD_UNIT_ID,
        android: ANDROID_AD_UNIT_ID,
    }) || TestIds.BANNER;

// ⚠️ SUBSTITUA COM O CAMINHO REAL DA IMAGEM DO SEU APP
const APP_LOGO_PLACEHOLDER = require('../../assets/images/placeholder.jpg');

// Defina a altura padrão para o banner que você está usando
// (ANCHORED_ADAPTIVE_BANNER geralmente se adapta, mas 50px é um bom fallback para banners padrão)
const BANNER_HEIGHT = 60; 


const AdBanner = () => {
    const [adLoaded, setAdLoaded] = useState(false);

    // Renderiza a imagem do app (placeholder)
    const renderPlaceholder = () => (
        <View style={[styles.placeholder, { height: BANNER_HEIGHT }]}>
            <Image
                source={APP_LOGO_PLACEHOLDER}
                style={styles.placeholderImage}
                resizeMode="contain" 
            />
        </View>
    );

    return (
        <View style={styles.container}>
            
            <View 
                style={[
                    // Estilos base para o container do Ad
                    styles.adWrapper, 
                    { height: BANNER_HEIGHT },
                    // Estilo para esconder se o Ad não carregou.
                    !adLoaded && styles.hiddenAdWrapper
                ]}
            >
                <BannerAd
                    unitId={adUnitId}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} 
                    requestOptions={{
                        requestNonPersonalizedAdsOnly: true,
                    }}
                    onAdLoaded={() => {
                        console.log('✅ Banner Ad carregado com sucesso!');
                        setAdLoaded(true); // Define como carregado
                    }}
                    onAdFailedToLoad={(error) => {
                        console.error('❌ Falha ao carregar Banner Ad:', error.message);
                        // Mantém adLoaded=false para continuar mostrando o placeholder
                        // ou você pode definir setAdLoaded(true) se quiser que o placeholder suma
                    }}
                />
            </View>
            
            {!adLoaded && renderPlaceholder()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center', 
        marginVertical: 1, 
        minHeight: BANNER_HEIGHT,
        marginTop: Platform.OS === 'ios' ? 30 : 0,
    },
    // Novo estilo: Container para o Banner Ad
    adWrapper: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Estilo para esconder o AD WRAPPER e, consequentemente, o BannerAd
    hiddenAdWrapper: {
        width: 0,
        height: 0,
        overflow: 'hidden', 
    },
    // Estilos do Placeholder
    placeholder: {
        width: '100%', 
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    placeholderImage: {
        width: '100%',
        resizeMode: 'contain', 
    }
});

export default AdBanner;