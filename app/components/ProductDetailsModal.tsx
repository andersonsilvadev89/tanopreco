import React from "react";
import {
  Image,
  Modal,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BRAND_COLORS } from "@/constants/BrandColors";

type ProductDetailsModalProps = {
  visible: boolean;
  onClose: () => void;
  onCardLayout: (event: LayoutChangeEvent) => void;
  onImageLoad: (event: any) => void;
  title: string;
  price?: string;
  imageUrl?: string | null;
  imageHeight: number;
  imageOverlay?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  placeholderText?: string;
};

export function ProductDetailsModal({
  visible,
  onClose,
  onCardLayout,
  onImageLoad,
  title,
  price,
  imageUrl,
  imageHeight,
  imageOverlay,
  children,
  footer,
  placeholderText = "Imagem nao cadastrada",
}: ProductDetailsModalProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.card} onLayout={onCardLayout}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Fechar detalhes do produto">
            <Feather name="x" size={20} color={BRAND_COLORS.text} />
          </TouchableOpacity>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
            <View style={[styles.imageArea, { height: imageUrl ? imageHeight : 180 }]}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={[styles.image, { height: imageHeight }]} resizeMode="contain" onLoad={onImageLoad} />
              ) : (
                <View style={styles.placeholder}>
                  <Feather name="image" size={52} color={BRAND_COLORS.border} />
                  <Text style={styles.placeholderText}>{placeholderText}</Text>
                </View>
              )}
              {imageOverlay}
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>{title}</Text>
              {!!price && <Text style={styles.price}>{price}</Text>}
              {children}
            </View>
          </ScrollView>

          {footer}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BRAND_COLORS.overlayStrong,
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    height: "90%",
    maxHeight: 720,
    backgroundColor: BRAND_COLORS.white,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  imageArea: {
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    backgroundColor: BRAND_COLORS.surfaceSoft,
  },
  placeholder: {
    width: "100%",
    height: 180,
    backgroundColor: BRAND_COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderText: {
    fontSize: 12,
    color: BRAND_COLORS.textMuted,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: BRAND_COLORS.text,
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: "900",
    color: BRAND_COLORS.success,
    marginBottom: 6,
  },
});