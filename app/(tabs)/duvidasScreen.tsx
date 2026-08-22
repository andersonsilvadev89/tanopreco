import React from "react";
import { useState } from "react";
import { Alert, Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AppHeaderTitle } from "../components/shell/AppHeaderTitle";
import { DrawerMenu } from "../components/shell/DrawerMenu";
import { auth } from "../../firebaseConfig";
import { signOut } from "firebase/auth";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FAQ_ITEMS = [
  {
    pergunta: "Como faco login no aplicativo?",
    resposta: "Use o botao Entrar na tela inicial e siga as instrucoes.",
  },
  {
    pergunta: "Como compartilho o app com meus contatos?",
    resposta: "Toque na aba Compartilhar e use o botao Compartilhar agora.",
  },
  {
    pergunta: "Onde vejo informacoes da empresa?",
    resposta: "Na aba Empresa voce encontra dados e novidades oficiais.",
  },
];

export default function DuvidasScreen() {
  const insets = useSafeAreaInsets();
  const [drawerMenuVisible, setDrawerMenuVisible] = useState(false);

  const abrirContato = async () => {
    const email = "mailto:suporte@tanopreco.app?subject=Duvidas%20sobre%20o%20app";
    const canOpen = await Linking.canOpenURL(email);

    if (canOpen) {
      await Linking.openURL(email);
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
        title="Duvidas"
        user={auth.currentUser}
        paddingTop={Math.max(insets.top, 8)}
        onBack={() => router.replace("/(tabs)/homeScreen")}
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
        <ThemedText type="title">Duvidas sobre o app</ThemedText>

        {FAQ_ITEMS.map((item) => (
          <ThemedView key={item.pergunta} style={styles.card}>
            <ThemedText type="subtitle">{item.pergunta}</ThemedText>
            <ThemedText style={styles.answer}>{item.resposta}</ThemedText>
          </ThemedView>
        ))}

        <TouchableOpacity style={styles.contactButton} onPress={abrirContato}>
          <ThemedText style={styles.contactText}>Falar com suporte</ThemedText>
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
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d6d6d6",
    padding: 12,
  },
  answer: {
    marginTop: 6,
    opacity: 0.9,
  },
  contactButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#0ea5e9",
  },
  contactText: {
    color: "#fff",
    fontWeight: "700",
  },
});
