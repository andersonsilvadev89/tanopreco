import React from "react";
import { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { shareApp } from "../utils/shareApp";
import { View } from "react-native";
import { AppHeaderTitle } from "../components/shell/AppHeaderTitle";
import { DrawerMenu } from "../components/shell/DrawerMenu";
import { auth } from "../../firebaseConfig";
import { signOut } from "firebase/auth";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CompartilharScreen() {
  const insets = useSafeAreaInsets();
  const [drawerMenuVisible, setDrawerMenuVisible] = useState(false);

  const compartilharApp = async () => {
    try {
      await shareApp();
    } catch (error) {
      Alert.alert("Nao foi possivel compartilhar", "Tente novamente em instantes.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/(tabs)/homeScreen");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      Alert.alert("Erro", "Nao foi possivel sair da conta.");
    }
  };

  const handleMenuOpen = () => {
    setDrawerMenuVisible(true);
  };

  const handleMenuClose = () => {
    setDrawerMenuVisible(false);
  };

  const handleNavigateTo = (path: string, requiresAuth: boolean) => {
    if (requiresAuth && !auth.currentUser) {
      Alert.alert("Login necessário", "Entre na sua conta para acessar esta área.");
      router.push("/(auth)/loginScreen");
      return;
    }

    router.push(path as any);
  };

  return (
    <View style={styles.screen}>
      <AppHeaderTitle
        title="Compartilhar"
        user={auth.currentUser}
        paddingTop={Math.max(insets.top, 8)}
        onBack={() => router.replace("/(empresa)/homeScreen")}
        onMenuOpen={handleMenuOpen}
        onLogout={handleLogout}
      />
      <DrawerMenu
        visible={drawerMenuVisible}
        onClose={handleMenuClose}
        user={auth.currentUser}
        onLogout={handleLogout}
        navigateTo={handleNavigateTo}
      />

      <ThemedView style={styles.container}>
        <ThemedText type="title">Compartilhar app</ThemedText>
        <ThemedText style={styles.description}>
          Convide outras pessoas para usar o Ta no Preco.
        </ThemedText>

        <TouchableOpacity style={styles.button} onPress={compartilharApp}>
          <ThemedText style={styles.buttonText}>Compartilhar agora</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
