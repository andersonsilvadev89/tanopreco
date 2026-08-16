import React from "react";
import { Linking, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

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
  const abrirContato = async () => {
    const email = "mailto:suporte@tanopreco.app?subject=Duvidas%20sobre%20o%20app";
    const canOpen = await Linking.canOpenURL(email);

    if (canOpen) {
      await Linking.openURL(email);
    }
  };

  return (
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
  );
}

const styles = StyleSheet.create({
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
