import React, { memo } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { ProductCardBase, ProductCardData } from "./ProductCardBase";

export interface ProdutoComEmpresa extends ProductCardData {
  preco: string;
  palavrasChave?: string;
  empresaId: string;
  nomeEmpresa: string;
  verificado?: boolean;
  enquantoDurarEstoque?: boolean;
  destaque?: boolean;
  categoria?: string;
  isAd?: boolean;
  unlike?: number;
  like?: number;
}

interface EmpresaData {
  nomeEmpresa: string;
  latitude?: number;
  longitude?: number;
  instagram?: string;
  telefone?: string;
  verificado?: boolean;
}

interface ProdutoCardProps {
  produto: ProdutoComEmpresa;
  empresaInfo: EmpresaData;
  userLocation: { latitude: number; longitude: number } | null;
  deviceId: string | null;
  votarProduto: (produtoId: string, tipo: "like" | "unlike") => Promise<void>;
  handleVerNoMapa: (produto: ProdutoComEmpresa) => void;
  openInstagramProfile: (username: string | undefined) => Promise<void>;
  openWhatsApp: (telefone: string | undefined) => void;
  onImagePress: (produto: ProdutoComEmpresa) => void;
  cardStyle?: StyleProp<ViewStyle>;
}

const ProdutoCardComponent: React.FC<ProdutoCardProps> = ({ produto, empresaInfo, userLocation, onImagePress, cardStyle }) => {
  const abrirDetalhes = () => onImagePress(produto);
  return <ProductCardBase produto={{ ...produto, nomeEmpresa: empresaInfo.nomeEmpresa || produto.nomeEmpresa, verificado: empresaInfo.verificado === true }} userLocation={userLocation} onCardPress={abrirDetalhes} onImagePress={abrirDetalhes} cardStyle={cardStyle} />;
};

export const ProdutoCard = memo(ProdutoCardComponent);