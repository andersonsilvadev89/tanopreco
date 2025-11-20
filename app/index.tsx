import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { ActivityIndicator, View, Text, Alert } from "react-native";
import React, { useEffect, useState } from "react";
import * as Updates from "expo-updates";
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
      .then(() => {
        console.log('Mobile Ads SDK inicializado com sucesso.');
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

          if (update.isAvailable) {
            console.log("⬇Baixando atualização...");
            await Updates.fetchUpdateAsync();
            Alert.alert(
              "Atualização Importante",
              "Uma nova versão do aplicativo foi baixada. O app será fechado e você precisará abri-lo novamente para aplicar as mudanças. Toque em OK para continuar.",
              [
                {
                  text: "OK",
                  onPress: async () => {
                    console.log("Atualização baixada com sucesso. Recarregando o app...");
                    await Updates.reloadAsync();
                  },
                },
              ],
              { cancelable: false }
            );
          }
        } catch (error: any) {
          console.error("Erro ao verificar/baixar atualização OTA:", error?.message || error);
        } finally {
          setIsUpdating(false);
        }
      } else {
        console.log("Ambiente de desenvolvimento. Ignorando updates OTA.");
        setIsUpdating(false); // Garante que saia do estado de loading
      }
    }
    // ------------------------------------------

    // ------------------------------------------
    // 3. LÓGICA DE CARREGAMENTO DO DEVICE ID
    // ------------------------------------------
    async function initializeApp() {
      await checkForUpdates();
    }

    initializeApp();
  }, []);

  // 1. Carregamento do contexto de autenticação (`loading`)
  // 2. Verificação/Download de atualizações OTA (`isUpdating`)
  if (loading || isUpdating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        {isUpdating && <Text style={{ marginTop: 10, color: 'gray' }}>Verificando atualizações...</Text>}
        {loading && <Text style={{ marginTop: 10, color: 'gray' }}>Carregando dados do usuário...</Text>}
        {!isUpdating && !loading && (
          <Text style={{ marginTop: 10, color: 'gray' }}>Preparando aplicativo...</Text>
        )}
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(tabs)/homeScreen" />;
  }

  return <Redirect href="/(empresa)/homeScreen" />;
}