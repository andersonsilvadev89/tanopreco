import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { EmpresaCard } from "./EmpresaCard";

interface EmpresaResumida {
  nomeEmpresa?: string;
  imagem?: string;
  verificado?: boolean;
}

interface EmpresasDestaqueProps {
  empresas: { [key: string]: EmpresaResumida };
  onEmpresaPress: (empresaId: string) => void;
}

export function EmpresasDestaque({ empresas, onEmpresaPress }: EmpresasDestaqueProps) {
  const listaEmpresas = useMemo(() => {
    return Object.entries(empresas)
      .filter(([, dados]) => !!dados?.nomeEmpresa)
      .map(([id, dados]) => ({
        id,
        nomeEmpresa: dados.nomeEmpresa!,
        imagem: dados.imagem,
        verificado: dados.verificado === true,
      }))
      .sort((a, b) => a.nomeEmpresa.localeCompare(b.nomeEmpresa));
  }, [empresas]);

  if (!listaEmpresas.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Empresas parceiras</Text>
      <FlatList
        data={listaEmpresas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EmpresaCard empresa={item} onPress={onEmpresaPress} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listaContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 30, marginBottom: 6 },
  titulo: { marginHorizontal: 12, marginBottom: 10, color: "#063494", fontSize: 18, fontWeight: "800" },
  listaContent: { paddingHorizontal: 12 },
});
