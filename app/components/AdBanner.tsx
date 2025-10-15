import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// ⚠️ IMPORTANTE: SUBSTITUA PELO SEU ID DE UNIDADE DE ANÚNCIO DE BANNER DO ADMOB
// Exemplo: 'ca-app-pub-1234567890123456/1234567890'
const LIVE_AD_UNIT_ID = 'ca-app-pub-5241782827769638/4392341690'; 

// Alterna automaticamente entre o ID de Teste (em desenvolvimento) e o ID Real (em produção)
const adUnitId = __DEV__ ? TestIds.BANNER : LIVE_AD_UNIT_ID;

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