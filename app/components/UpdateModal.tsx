import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  visible: boolean;
  message: string;
  forceUpdate: boolean;
  onUpdate: () => void;
};

export function UpdateModal({ visible, message, forceUpdate, onUpdate }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Atualização disponível</Text>

          <Text style={styles.text}>{message}</Text>

          <TouchableOpacity onPress={onUpdate} style={styles.button}>
            <Text style={styles.buttonText}>Atualizar agora</Text>
          </TouchableOpacity>

          {!forceUpdate && (
            <Text style={styles.note}>
              Você pode atualizar depois, mas algumas funções podem não funcionar.
            </Text>
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
  },
  button: {
    marginTop: 20,
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
  note: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 12,
    opacity: 0.7,
  },
});
