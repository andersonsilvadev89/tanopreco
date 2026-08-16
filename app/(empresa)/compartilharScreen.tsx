import React from "react";
import { Alert, Share, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

const APP_SHARE_MESSAGE =
  "Conheca o Ta no Preco! Baixe o app e acompanhe novidades e ofertas da Expocrato.";

export default function CompartilharScreen() {
  const compartilharApp = async () => {
    try {
      await Share.share({
        message: APP_SHARE_MESSAGE,
      });
    } catch (error) {
      Alert.alert("Nao foi possivel compartilhar", "Tente novamente em instantes.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Compartilhar app</ThemedText>
      <ThemedText style={styles.description}>
        Convide outras pessoas para usar o Ta no Preco.
      </ThemedText>

      <TouchableOpacity style={styles.button} onPress={compartilharApp}>
        <ThemedText style={styles.buttonText}>Compartilhar agora</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  description: {
    marginTop: 12,
    textAlign: "center",
    opacity: 0.85,
  },
  button: {
    marginTop: 24,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#16a34a",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
