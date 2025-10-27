import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import {
  ActivityIndicator,
  View,
  Text,
  Modal,
  Pressable,
  Linking,
  StyleSheet,
} from "react-native";
import React, { useEffect, useState } from "react";
import * as Updates from "expo-updates";
import mobileAds from "react-native-google-mobile-ads";
import VersionCheck from "react-native-version-check";

export default function Index() {
  const { user, loading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  useEffect(() => {
    // 1️⃣ Inicializar Google Mobile Ads (executado imediatamente)
    console.log("Inicializando Google Mobile Ads SDK...");
    mobileAds()
      .initialize()
      .then(() => console.log("Mobile Ads SDK inicializado com sucesso."))
      .catch((error) =>
        console.error("Erro ao inicializar Google Mobile Ads SDK:", error)
      );

    // 2️⃣ Função assíncrona para checagem de atualizações (OTA e Loja)
    async function initializeChecks() {
      // ** Checagem OTA (Expo Updates) **
      if (!__DEV__) {
        try {
          console.log("Verificando atualizações OTA...");
          setIsUpdating(true);

          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            console.log("⬇ Baixando atualização OTA...");
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          } else {
            console.log("Nenhuma atualização OTA disponível.");
          }
        } catch (error: any) {
          console.error("Erro ao verificar/baixar atualização OTA:", error);
        } finally {
          setIsUpdating(false);
        }
      } else {
        console.log("Modo desenvolvimento (__DEV__ = true). Ignorando OTA.");
      }

      // ** Checagem de versão da Play Store/App Store **
      try {
        // CORREÇÃO 1: Adicionando 'as any' para ignorar erro de 'provider'
        const latestVersion = await VersionCheck.getLatestVersion({
          provider: "playStore",
          packageName: "com.tanopreco", // ⚠️ Lembre-se de mudar para seu ID real
        } as any); 

        const currentVersion = VersionCheck.getCurrentVersion();
        console.log(`Versão instalada: ${currentVersion}`);
        console.log(`Versão na Loja: ${latestVersion}`);

        // CORREÇÃO 2: Adicionando 'await' para resolver a Promise antes de checar 'isNeeded'
        const needUpdateResult = await VersionCheck.needUpdate({
          currentVersion,
          latestVersion,
        });

        // Agora 'needUpdateResult' tem a propriedade 'isNeeded'
        if (needUpdateResult?.isNeeded) {
          // CORREÇÃO 3: Adicionando 'as any' para ignorar erro de 'provider'
          const storeUrl = await VersionCheck.getStoreUrl({
            provider: "playStore",
            packageName: "com.tanopreco", // ⚠️ Lembre-se de mudar para seu ID real
          } as any);

          setStoreUrl(storeUrl);
          setShowUpdateModal(true);
        }
      } catch (error) {
        // Ignorar erro de versão se o modal já está ativo
        if (!showUpdateModal) {
          console.error("Erro ao verificar versão da Loja:", error);
        }
      }
    }

    initializeChecks();
  }, [showUpdateModal]);

  // 🔄 Enquanto carrega
  if (loading || isUpdating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        {isUpdating && (
          <Text style={styles.loadingText}>Verificando atualizações...</Text>
        )}
        {loading && (
          <Text style={styles.loadingText}>Carregando dados do usuário...</Text>
        )}
      </View>
    );
  }

  // 🧩 Modal de atualização obrigatória
  if (showUpdateModal) {
    return (
      <Modal visible={showUpdateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova versão disponível!</Text>
            <Text style={styles.modalMessage}>
              Há uma nova versão do aplicativo disponível na Play Store. Atualize
              para continuar usando.
            </Text>
            <Pressable
              style={styles.updateButton}
              onPress={() => {
                if (storeUrl) Linking.openURL(storeUrl);
              }}
            >
              <Text style={styles.updateButtonText}>Atualizar agora</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  // 🔐 Redirecionamento de acordo com autenticação
  if (!user) {
    return <Redirect href="/(tabs)/homeScreen" />;
  }

  return <Redirect href="/(empresa)/homeScreen" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "gray",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    width: "85%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalMessage: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 20,
  },
  updateButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  updateButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});