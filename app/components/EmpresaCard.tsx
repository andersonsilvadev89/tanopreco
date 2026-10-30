import React, { memo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BRAND_COLORS } from "@/constants/BrandColors";
import { CompanyVerifiedBadge } from "./CompanyVerifiedBadge";

export interface EmpresaCardData {
  id: string;
  nomeEmpresa: string;
  imagem?: string;
  verificado?: boolean;
}

interface EmpresaCardProps {
  empresa: EmpresaCardData;
  onPress: (empresaId: string) => void;
}

function EmpresaCardComponent({ empresa, onPress }: EmpresaCardProps) {
  const imagemUri = empresa.imagem?.trim();
  const temImagem = !!imagemUri && /^(https?:\/\/|data:)/.test(imagemUri);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPress(empresa.id)}>
      <View style={styles.fotoArea}>
        {temImagem ? (
          <Image source={{ uri: imagemUri }} style={styles.foto} resizeMode="cover" />
        ) : (
          <View style={styles.fotoPlaceholder}>
            <Feather name="briefcase" size={26} color={BRAND_COLORS.border} />
          </View>
        )}
      </View>
      <View style={styles.nomeRow}>
        <Text style={styles.nome} numberOfLines={2}>{empresa.nomeEmpresa}</Text>
        {empresa.verificado === true && (
          <View style={styles.badgeWrapper}>
            <CompanyVerifiedBadge compact />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const EmpresaCard = memo(EmpresaCardComponent);

const styles = StyleSheet.create({
  card: { width: 92, marginRight: 14, alignItems: "center" },
  fotoArea: {
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: "hidden",
    backgroundColor: BRAND_COLORS.surfaceSoft,
    borderWidth: 2,
    borderColor: BRAND_COLORS.border,
  },
  foto: { width: "100%", height: "100%" },
  fotoPlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  nomeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 6, flexWrap: "wrap" },
  nome: { fontSize: 11, fontWeight: "700", color: BRAND_COLORS.text, textAlign: "center" },
  badgeWrapper: { marginLeft: 2 },
});
