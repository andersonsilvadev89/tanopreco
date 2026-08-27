import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

interface CompanyVerifiedBadgeProps {
  compact?: boolean;
}

export function CompanyVerifiedBadge({ compact = false }: CompanyVerifiedBadgeProps) {
  return (
    <View style={[styles.badge, compact && styles.compactBadge]} accessibilityLabel="Empresa verificada">
      <Feather name="check-circle" size={compact ? 12 : 14} color="#1677D2" />
      {!compact && <Text style={styles.text}>Verificado</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", flexDirection: "row", gap: 3, marginLeft: 5 },
  compactBadge: { marginLeft: 4 },
  text: { color: "#1677D2", fontSize: 9, fontWeight: "800" },
});