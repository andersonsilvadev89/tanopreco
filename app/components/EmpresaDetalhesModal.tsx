import React from "react";
import { Dimensions, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BRAND_COLORS } from "@/constants/BrandColors";
import { CompanyVerifiedBadge } from "./CompanyVerifiedBadge";
import { ProdutoCard, ProdutoComEmpresa } from "./ProdutoCard";

// Mesma largura de grade de 2 colunas usada na tela inicial, para manter o card de produto padrão.
const { width } = Dimensions.get("window");
const CARD_MARGIN = 12;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;

export interface EmpresaDetalhesData {
  id: string;
  nomeEmpresa: string;
  imagem?: string;
  verificado?: boolean;
  instagram?: string;
  telefone?: string;
  latitude?: number;
  longitude?: number;
}

interface EmpresaDetalhesModalProps {
  visible: boolean;
  empresa: EmpresaDetalhesData | null;
  produtos: ProdutoComEmpresa[];
  userLocation: { latitude: number; longitude: number } | null;
  deviceId: string | null;
  onClose: () => void;
  votarProduto: (produtoId: string, tipo: "like" | "unlike") => Promise<void>;
  handleVerNoMapa: (produto: ProdutoComEmpresa) => void;
  openInstagramProfile: (username: string | undefined) => Promise<void>;
  openWhatsApp: (telefone: string | undefined, mensagem?: string) => void;
  onProdutoPress: (produto: ProdutoComEmpresa) => void;
}

export function EmpresaDetalhesModal({
  visible,
  empresa,
  produtos,
  userLocation,
  deviceId,
  onClose,
  votarProduto,
  handleVerNoMapa,
  openInstagramProfile,
  openWhatsApp,
  onProdutoPress,
}: EmpresaDetalhesModalProps) {
  if (!empresa) return null;

  const imagemUri = empresa.imagem?.trim();
  const temImagem = !!imagemUri && /^(https?:\/\/|data:)/.test(imagemUri);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Fechar detalhes da empresa">
            <Feather name="x" size={20} color={BRAND_COLORS.text} />
          </TouchableOpacity>

          <FlatList
            data={produtos}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.colunas}
            contentContainerStyle={styles.listaContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.celulaGradeProduto}>
                <ProdutoCard
                  produto={item}
                  empresaInfo={empresa}
                  userLocation={userLocation}
                  deviceId={deviceId}
                  votarProduto={votarProduto}
                  handleVerNoMapa={handleVerNoMapa}
                  openInstagramProfile={openInstagramProfile}
                  openWhatsApp={openWhatsApp}
                  onImagePress={onProdutoPress}
                  cardStyle={styles.produtoCardGrade}
                />
              </View>
            )}
            ListHeaderComponent={(
              <View style={styles.header}>
                <View style={styles.fotoArea}>
                  {temImagem ? (
                    <Image source={{ uri: imagemUri }} style={styles.foto} resizeMode="cover" />
                  ) : (
                    <View style={styles.fotoPlaceholder}>
                      <Feather name="briefcase" size={34} color={BRAND_COLORS.border} />
                    </View>
                  )}
                </View>

                <View style={styles.nomeRow}>
                  <Text style={styles.nome}>{empresa.nomeEmpresa}</Text>
                  {empresa.verificado === true && <CompanyVerifiedBadge />}
                </View>

                <View style={styles.acoesRow}>
                  {!!empresa.instagram && (
                    <TouchableOpacity style={[styles.acaoBotao, styles.acaoInstagram]} onPress={() => openInstagramProfile(empresa.instagram)}>
                      <Feather name="instagram" size={16} color={BRAND_COLORS.white} />
                      <Text style={styles.acaoTexto}>Instagram</Text>
                    </TouchableOpacity>
                  )}
                  {!!empresa.telefone && (
                    <TouchableOpacity
                      style={[styles.acaoBotao, styles.acaoWhatsApp]}
                      onPress={() => openWhatsApp(empresa.telefone, "Vi sua empresa no app TaNoPreco e gostaria de saber mais.")}
                    >
                      <Feather name="message-circle" size={16} color={BRAND_COLORS.white} />
                      <Text style={styles.acaoTexto}>WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.produtosTitulo}>
                  {produtos.length > 0 ? "Produtos e serviços cadastrados" : "Nenhum produto cadastrado no momento"}
                </Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  card: { height: "92%", backgroundColor: BRAND_COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12 },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 5,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BRAND_COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  listaContent: { paddingBottom: 24, paddingHorizontal: CARD_MARGIN },
  colunas: { justifyContent: "space-between" },
  celulaGradeProduto: { width: CARD_WIDTH, marginBottom: 10 },
  produtoCardGrade: { width: "100%", marginHorizontal: 0, marginBottom: 0 },
  header: { alignItems: "center", paddingTop: 8, paddingBottom: 12, paddingHorizontal: 16 },
  fotoArea: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    backgroundColor: BRAND_COLORS.surfaceSoft,
    borderWidth: 2,
    borderColor: BRAND_COLORS.border,
  },
  foto: { width: "100%", height: "100%" },
  fotoPlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  nomeRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 4 },
  nome: { fontSize: 18, fontWeight: "800", color: BRAND_COLORS.text, textAlign: "center" },
  acoesRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  acaoBotao: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  acaoInstagram: { backgroundColor: "#C13584" },
  acaoWhatsApp: { backgroundColor: "#25D366" },
  acaoTexto: { color: BRAND_COLORS.white, fontWeight: "700", fontSize: 13 },
  produtosTitulo: { marginTop: 18, fontSize: 15, fontWeight: "800", color: "#063494" },
});
