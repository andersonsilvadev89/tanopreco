import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  visible: boolean;
  message: string;
  forceUpdate: boolean;
  onUpdate: () => void;
  onCancel: () => void; // 1. Nova prop para fechar o modal
};

export function UpdateModal({
  visible,
  message,
  forceUpdate,
  onUpdate,
  onCancel
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Atualização disponível</Text>

          <Text style={styles.text}>{message}</Text>

          {/* Botão Principal */}
          <TouchableOpacity onPress={onUpdate} style={styles.button}>
            <Text style={styles.buttonText}>Atualizar agora</Text>
          </TouchableOpacity>

          {/* 2. Link para fechar (só aparece se forceUpdate for falso) */}
          {!forceUpdate && (
            <TouchableOpacity onPress={onCancel} style={styles.linkButton}>
              <Text style={styles.linkText}>Agora não, atualizar depois</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: 'center', // Garante que tudo fique centralizado
  },
  title: {
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  text: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 10,
  },
  button: {
    width: '100%',
    marginTop: 10,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  // Estilos novos para o botão "Link"
  linkButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  linkText: {
    color: "#007AFF", // Cor de link (azul) ou pode usar cinza "#666"
    fontSize: 14,
    textAlign: "center",
  },
});