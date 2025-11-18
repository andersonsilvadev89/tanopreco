import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Platform, Alert, Linking } from 'react-native';
import { Feather } from "@expo/vector-icons";

// Tipos devem ser importados ou copiados se não estiverem centralizados
// Assumindo que você tem acesso a esses tipos no escopo do projeto:
interface ProdutoComEmpresa {
    id: string;
    descricao: string;
    preco: string;
    imagemUrl?: string;
    palavrasChave?: string;
    empresaId: string;
    nomeEmpresa: string;
    latitudeEmpresa: number;
    longitudeEmpresa: number;
    latitudeProduto?: number;
    longitudeProduto?: number;
    localizacaoDiferente?: boolean;
    dataFinalOferta?: string;
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
}

// O ProdutoCard requer as funções e dados que antes estavam no HomeScreen
interface ProdutoCardProps {
    produto: ProdutoComEmpresa;
    empresaInfo: EmpresaData;
    userLocation: { latitude: number; longitude: number } | null;
    deviceId: string | null;
    votarProduto: (produtoId: string, tipo: "like" | "unlike") => Promise<void>;
    handleVerNoMapa: (produto: ProdutoComEmpresa) => void;
    openInstagramProfile: (username: string | undefined) => Promise<void>;
    openWhatsApp: (telefone: string | undefined) => void;
    onImagePress: (url: string) => void;
}

// ----------------------------------------------------------------------
// CONSTANTES DE ESTILO (Copie do HomeScreen.tsx)
// ----------------------------------------------------------------------
const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;
const CARD_MIN_HEIGHT = 300;

// Funções Auxiliares (Apenas para calcular a distância e localização)
function getProdutoLocation(produto: ProdutoComEmpresa): { latitude: number; longitude: number; isProdutoLocation: boolean } | null {
    if (produto.localizacaoDiferente && produto.latitudeProduto && produto.longitudeProduto) {
        return {
            latitude: produto.latitudeProduto,
            longitude: produto.longitudeProduto,
            isProdutoLocation: true,
        };
    } else if (produto.latitudeEmpresa && produto.longitudeEmpresa) {
        return {
            latitude: produto.latitudeEmpresa,
            longitude: produto.longitudeEmpresa,
            isProdutoLocation: false,
        };
    }
    return null;
}
function calcularDistancia(userLocation: any, empresaLocation: any) {
    if (!userLocation || !empresaLocation) return null;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(empresaLocation.latitude - userLocation.latitude);
    const dLon = toRad(empresaLocation.longitude - userLocation.longitude);
    const lat1 = toRad(userLocation.latitude);
    const lat2 = toRad(empresaLocation.latitude);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2) *
        Math.cos(lat1) *
        Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}


// ----------------------------------------------------------------------
// COMPONENTE PRODUTOCARD (Memoizado)
// ----------------------------------------------------------------------

const ProdutoCardComponent: React.FC<ProdutoCardProps> = ({
    produto,
    empresaInfo,
    userLocation,
    deviceId,
    votarProduto,
    handleVerNoMapa,
    openInstagramProfile,
    openWhatsApp,
    onImagePress,
}) => {
    const location = getProdutoLocation(produto);
    const distancia = userLocation && location ? calcularDistancia(userLocation, { latitude: location.latitude, longitude: location.longitude }) : null;
    const temLocalizacao = !!location;

    return (
        <View style={styles.cardProduto}>
            <View style={styles.imagemLikeContainer}>
                {produto.imagemUrl ? (
                    <TouchableOpacity
                        onPress={() => onImagePress(produto.imagemUrl!)}
                    >
                        <Image
                            source={{ uri: produto.imagemUrl }}
                            style={styles.imagemProduto}
                            resizeMode="stretch"
                        />
                    </TouchableOpacity>
                ) : (
                    // Placeholder para imagem ausente, se necessário
                    <View style={styles.imagemProdutoPlaceholder}>
                        <Feather name="image" size={50} color="#ccc" />
                    </View>
                )}

                <View style={styles.likeUnlikeContainer}>
                    <TouchableOpacity
                        disabled={!deviceId}
                        onPress={() => votarProduto(produto.id, "like")}
                    >
                        <Feather
                            name="thumbs-up"
                            size={23}
                            color={deviceId ? "#4CAF50" : "#ccc"}
                        />
                    </TouchableOpacity>
                    <Text style={{ color: "green" }}>{produto.like ?? 0}</Text>
                    <TouchableOpacity
                        disabled={!deviceId}
                        onPress={() => votarProduto(produto.id, "unlike")}
                    >
                        <Feather
                            name="thumbs-down"
                            size={23}
                            color={deviceId ? "#F44336" : "#ccc"}
                        />
                    </TouchableOpacity>
                    <Text style={{ color: "red" }}>{produto.unlike ?? 0}</Text>
                </View>
            </View>

            <Text style={styles.descricao}>{produto.descricao}</Text>
            <Text style={styles.preco}>
                {"R$ " +
                    parseFloat(
                        produto.preco
                            .replace("R$", "")
                            .replace(/\./g, "")
                            .replace(",", ".")
                    ).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
            </Text>
            <Text style={styles.dataOferta}>
                Oferta válida até: {produto.dataFinalOferta}
            </Text>
            {distancia !== null && (
                <Text style={styles.distancia}>
                    Distância: {distancia.toFixed(2)} km
                </Text>
            )}

            <View style={styles.empresaContainer}>
                <Text style={styles.confiraOferta}>
                    Confira a oferta direto na empresa:
                </Text>
                <Text style={styles.nomeEmpresa}>{empresaInfo?.nomeEmpresa}</Text>
                <View style={styles.botoesAcaoLinha}>
                    {empresaInfo?.instagram && (
                        <View style={styles.botaoAcaoItem}>
                            <TouchableOpacity
                                onPress={() => openInstagramProfile(empresaInfo.instagram)}
                                style={styles.botaoRedondo}
                            >
                                <Image
                                    source={require("../../assets/botoes/instagram.png")}
                                    style={styles.imagemBotaoRedondo}
                                />
                            </TouchableOpacity>
                            <Text style={styles.legendaBotao}>Instagram</Text>
                        </View>
                    )}
                    {empresaInfo?.telefone && (
                        <View style={styles.botaoAcaoItem}>
                            <TouchableOpacity
                                onPress={() => openWhatsApp(empresaInfo.telefone)}
                                style={styles.botaoRedondo}
                            >
                                <Image
                                    source={require("../../assets/botoes/whatsapp.png")}
                                    style={styles.imagemBotaoRedondo}
                                />
                            </TouchableOpacity>
                            <Text style={styles.legendaBotao}>WhatsApp</Text>
                        </View>
                    )}
                    {temLocalizacao && (
                        <View style={styles.botaoAcaoItem}>
                            <TouchableOpacity
                                style={styles.botaoRedondo}
                                onPress={() => handleVerNoMapa(produto)}
                            >
                                <Image
                                    source={require("../../assets/botoes/rota.png")}
                                    style={styles.imagemBotaoRedondo}
                                />
                            </TouchableOpacity>
                            <Text style={styles.legendaBotao}>Traçar rota</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

// Memoiza o componente para otimização do FlatList
export const ProdutoCard = memo(ProdutoCardComponent);

// ----------------------------------------------------------------------
// ESTILOS (Copie APENAS os estilos do card e seus elementos internos do seu HomeScreen.tsx)
// ----------------------------------------------------------------------

const styles = StyleSheet.create({
    imagemLikeContainer: {
        flexDirection: "row",
        width: "100%",
        justifyContent: "center",
    },
    likeUnlikeContainer: {
        margin: 10,
        alignItems: "center",
        justifyContent: "space-evenly",
    },
    cardProduto: {
        backgroundColor: "rgba(255,255,255,0.95)",
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        marginHorizontal: CARD_MARGIN / 2,
        elevation: 3,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        width: CARD_WIDTH,
        minHeight: CARD_MIN_HEIGHT,
    },
    descricao: {
        fontSize: 15,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 5,
        borderRadius: 5,
        padding: 2,
    },
    preco: {
        fontSize: 22,
        color: "green",
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 2,
    },
    dataOferta: {
        fontSize: 13,
        color: "#888",
        marginBottom: 2,
        textAlign: "center",
    },
    distancia: {
        fontSize: 13,
        color: "#007BFF",
        marginBottom: 2,
        textAlign: "center",
    },
    imagemProduto: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginTop: 5,
        resizeMode: "contain",
    },
    imagemProdutoPlaceholder: { // Estilo para caso a imagem esteja ausente
        width: 100,
        height: 100,
        borderRadius: 8,
        marginTop: 5,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    empresaContainer: {
        width: "100%",
        backgroundColor: "#f7f7f7",
        borderRadius: 8,
        padding: 8,
        marginTop: 8,
        alignItems: "center",
    },
    confiraOferta: {
        fontSize: 12,
        color: "#555",
        fontWeight: "bold",
        marginBottom: 2,
        textAlign: "center",
    },
    nomeEmpresa: {
        fontSize: 12,
        color: "#0056b3",
        fontWeight: "bold",
        marginBottom: 5,
        textAlign: "center",
    },
    botoesAcaoLinha: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        minHeight: 22,
        marginBottom: 5,
        marginTop: 8,
    },
    botaoAcaoItem: {
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 8,
    },
    botaoRedondo: {
        width: 30,
        height: 30,
        borderRadius: 25,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        elevation: 2,
        borderWidth: 1,
        borderColor: "#eee",
    },
    imagemBotaoRedondo: {
        width: 40,
        height: 40,
    },
    legendaBotao: {
        color: "#333",
        fontSize: 8,
        marginTop: 4,
        textAlign: "center",
        fontWeight: "bold",
    }
});