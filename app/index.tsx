import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { ActivityIndicator, View, Text } from "react-native";
import React, { useEffect, useState } from "react";
import * as Updates from "expo-updates";

// ⚠️ ADICIONE ESTA IMPORTAÇÃO 
import mobileAds from 'react-native-google-mobile-ads'; 

export default function Index() {
  const { user, loading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // ------------------------------------------
    // 1. INICIALIZAÇÃO DO GOOGLE MOBILE ADS SDK
    // ------------------------------------------
    console.log("Inicializando Google Mobile Ads SDK...");
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        // A inicialização está completa. Agora você pode carregar anúncios.
        console.log('Mobile Ads SDK inicializado com sucesso.');
        // Opcional: console.log('Status dos adaptadores:', adapterStatuses);
      })
      .catch(error => {
        console.error("Erro ao inicializar Google Mobile Ads SDK:", error);
      });
    // ------------------------------------------

    // ------------------------------------------
    // 2. LÓGICA DE VERIFICAÇÃO DE UPDATES OTA
    // ------------------------------------------
    async function checkForUpdates() {
      if (!__DEV__) {
        try {
          console.log("Verificando atualizações OTA...");
          console.log("Runtime Version:", Updates.runtimeVersion);
          console.log("Canal de atualização:", Updates.channel || "indefinido");

          setIsUpdating(true);

          const update = await Updates.checkForUpdateAsync();
          console.log("Update disponível?", update.isAvailable);

          if (update.isAvailable) {
            console.log("⬇Baixando atualização...");
            await Updates.fetchUpdateAsync();
            console.log("Atualização baixada com sucesso. Recarregando o app...");
            await Updates.reloadAsync();
          } else {
            console.log("Nenhuma atualização disponível.");
          }
        } catch (error: any) {
          console.error("Erro ao verificar/baixar atualização OTA:", error?.message || error);
        } finally {
          setIsUpdating(false);
        }
      } else {
        console.log("Ambiente de desenvolvimento (__DEV__ = true). Ignorando updates OTA.");
        setIsUpdating(false);
      }
    }

    checkForUpdates();
  }, []); // O useEffect é executado apenas uma vez ao montar o componente

  if (loading || isUpdating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        {isUpdating && <Text style={{ marginTop: 10, color: 'gray' }}>Verificando atualizações OTA...</Text>}
        {loading && <Text style={{ marginTop: 10, color: 'gray' }}>Carregando dados do usuário...</Text>}
      </View>
    );
  }

  if (!user) {
    // Certifique-se de que a rota de login/home para não-logados está correta.
    return <Redirect href="/(tabs)/homeScreen" />; 
  }
  
  // Rota para usuários logados.
  return <Redirect href="/(empresa)/homeScreen" />; 
}