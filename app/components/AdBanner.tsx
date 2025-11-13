import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// ------------------------------------------------------------------
// 🔧 CONFIGURAÇÃO POR PLATAFORMA (ANDROID / iOS)
// ------------------------------------------------------------------

const IOS_AD_UNIT_ID = 'ca-app-pub-5241782827769638/9708550818';
const ANDROID_AD_UNIT_ID = 'ca-app-pub-5241782827769638/4392341690';

// Se estiver em modo de desenvolvimento, usar o ID de teste do Google
const adUnitId = __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: IOS_AD_UNIT_ID,
        android: ANDROID_AD_UNIT_ID,
    })|| TestIds.BANNER;


const AdBanner = () => {
  return (
    <View style={styles.container}>
      <BannerAd
        // O ID que o componente irá usar
        unitId={adUnitId}
        
        // Tamanho: FULL_BANNER é um tamanho padrão, mas considere o ADAPTIVE_BANNER
        // para se ajustar melhor à largura da tela.
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} 
        
        // Opções de solicitação (opcional, pode ser removido se não for usar)
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        
        // Eventos de Log para Debug (opcional, útil no desenvolvimento)
        onAdLoaded={() => {
          console.log('✅ Banner Ad carregado com sucesso!');
        }}
        onAdFailedToLoad={(error) => {
          console.error('❌ Falha ao carregar Banner Ad:', error.message);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Garante que o banner fique centralizado na largura
    alignItems: 'center', 
    // Pode adicionar um espaçamento superior ou inferior se desejar
    marginVertical: 1, 
  },
});

export default AdBanner;