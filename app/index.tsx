import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, Alert } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import mobileAds from "react-native-google-mobile-ads";
import * as Updates from "expo-updates";

import { useVersionCheck } from "../hooks/useVersionCheck";
import { UpdateModal } from "./components/UpdateModal";

// URL DO ARQUIVO VERSION.JSON
const VERSION_URL =
  "https://gist.githubusercontent.com/andersonsilvadev89/d3743d2069886848e83b9d1a6c97c21b/raw/version.json";

export default function Index() {
  const { user, loading } = useAuth();

  const { needsUpdate, forceUpdate, message, redirectToStore } =
    useVersionCheck(VERSION_URL);

  const [isUpdating, setIsUpdating] = useState(false);

  // ---------------------------------------------------------
  // 1. Inicialização do Google Mobile Ads
  // ---------------------------------------------------------
  useEffect(() => {
    mobileAds()
      .initialize()
      .then(() => console.log("Google Mobile Ads inicializado."))
      .catch((error) =>
        console.error("Erro ao inicializar Google Mobile Ads SDK:", error)
      );
  }, []);

  // ---------------------------------------------------------
  // 2. Verificação de atualizações OTA (Expo Updates)
  // ---------------------------------------------------------
  useEffect(() => {
    async function checkOTA() {
      if (__DEV__) {
        console.log("Dev mode → OTA ignorado.");
        return setIsUpdating(false);
      }

      try {
        setIsUpdating(true);

        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();

          Alert.alert(
            "Atualização disponível",
            "Uma nova versão foi baixada. Clique em OK para reiniciar.",
            [
              {
                text: "OK",
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ],
            { cancelable: false }
          );
        }
      } catch (error) {
        console.log("Erro verificando OTA:", error);
      } finally {
        setIsUpdating(false);
      }
    }

    checkOTA();
  }, []);

  // ---------------------------------------------------------
  // 3. Loading → Auth ou OTA
  // ---------------------------------------------------------
  if (loading || isUpdating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />

        {isUpdating && (
          <Text style={{ marginTop: 10, color: "gray" }}>
            Verificando atualizações...
          </Text>
        )}

        {loading && (
          <Text style={{ marginTop: 10, color: "gray" }}>
            Carregando dados do usuário...
          </Text>
        )}
      </View>
    );
  }

  // ---------------------------------------------------------
  // 4. Modal de atualização obrigatória ou recomendada
  // ---------------------------------------------------------
  if (needsUpdate) {
    return (
      <UpdateModal
        visible
        message={message}
        forceUpdate={forceUpdate}
        onUpdate={redirectToStore}
      />
    );
  }

  // ---------------------------------------------------------
  // 5. Fluxo normal de navegação
  // ---------------------------------------------------------
  if (!user) {
    return <Redirect href="/(tabs)/homeScreen" />;
  }

  return <Redirect href="/(empresa)/homeScreen" />;
}
