import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    SafeAreaView,
    ActivityIndicator,
    ScrollView,
    Alert,
    Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
    FontAwesome5
} from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Mantido, mas não usado
import { database } from '@/firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { auth } from '@/firebaseConfig';
import * as WebBrowser from 'expo-web-browser';

// Importações de componentes de Ads
import AdBanner from '../components/AdBanner';
import AdCard from '../components/AdCard'; // 💡 Novo AdCard importado
import Header from '../components/Header'; // Mantido
import { signOut } from "firebase/auth"; // Mantido
import { checkAndDownloadImages } from '../../utils/imageManager'; // Mantido


const defaultFundoLocal = require('../../assets/images/fundo.png');
const { width } = Dimensions.get('window');
const CARD_MARGIN = 10;
const DYNAMIC_CARD_WIDTH = (width - CARD_MARGIN * 3) / 4.2; // Calcula a largura para 2 cards por linha

const HomeScreen = () => {
    const navigate = (path: string) => router.push(path as any);

    const [fundoAppReady, setFundoAppReady] = useState(false);
    const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);
    const [userName, setUserName] = useState('');

    const confirmarLogout = () => {
        Alert.alert(
            "Sair da Conta",
            "Tem certeza que deseja sair da sua conta?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Sair",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut(auth);
                        } catch (error) {
                            console.error("Erro ao fazer logout: ", error);
                            Alert.alert(
                                "Erro ao Sair",
                                "Não foi possível sair. Tente novamente."
                            );
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const PACKAGES_HOSTING_URL = 'https://tanopreco-67706.web.app';

    const handleBuyPackages = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Erro", "Usuário não autenticado. Tente fazer login novamente.");
            return;
        }

        const userId = user.uid;
        const paymentUrl = `${PACKAGES_HOSTING_URL}/index.html?uid=${userId}`;

        try {
            // Abre o navegador web do Expo com a URL
            await WebBrowser.openBrowserAsync(paymentUrl);
        } catch (error) {
            console.error("Erro ao abrir navegador:", error);
            Alert.alert("Erro", "Não foi possível abrir a página de pacotes.");
        }
    };

    useEffect(() => {
        const user = auth.currentUser;

        if (user) {
            const userRef = ref(database, `usuariosEmpresa/${user.uid}`);

            const unsubscribe = onValue(userRef, (snapshot) => {
                if (snapshot.exists()) {
                    setUserName(snapshot.val().nome);
                } else {
                    setUserName("Usuário");
                    console.log("Documento do usuário não encontrado no Realtime Database!");
                }
            }, (error) => {
                console.error("Erro ao buscar nome do usuário:", error);
                setUserName("Usuário");
            });

            return () => unsubscribe();
        } else {
            setUserName("Usuário");
        }
    }, []);

    useEffect(() => {
        const loadFundoImage = async () => {
            try {
                const { fundoUrl } = await checkAndDownloadImages();
                setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
            } catch (error) {
                console.error("Erro ao carregar imagem de fundo na HomeScreen (Empresarial):", error);
                setCurrentFundoSource(defaultFundoLocal);
            } finally {
                setFundoAppReady(true);
            }
        };
        loadFundoImage();
    }, []);

    // 💡 Organização dos botões para o novo layout
    const options = [
        { label: 'Produtos e Serviços', iconName: 'utensils', iconFamily: FontAwesome5, path: 'crudProdutosServicos' },
        { label: 'Configurações', iconName: 'cog', iconFamily: FontAwesome5, path: 'configuracoesScreen' },
        { label: 'Obter Pacotes', iconName: 'box', iconFamily: FontAwesome5, onPress: handleBuyPackages }, // Icone ajustado
        { label: 'Sair', iconName: 'sign-out-alt', iconFamily: FontAwesome5, onPress: confirmarLogout },
    ];

    if (!fundoAppReady) {
        return (
            <ImageBackground source={defaultFundoLocal} style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>Carregando fundo...</Text>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={currentFundoSource} style={styles.background} resizeMode="cover">
            <AdBanner />
            <Header
                title="Área Empresarial"
                nomeUsuario={userName}
                onPressOfertas={() => navigate('/(tabs)/homeScreen')}
                onPressLogout={confirmarLogout}
            />
            <SafeAreaView style={styles.safeAreaContent}>
                <ScrollView contentContainerStyle={styles.scrollViewContent}>

                    {/* 💡 CONTAINER PARA OS BOTÕES (Flex Row) */}
                    <View style={styles.buttonsRowContainer}>
                        {options.map(({ label, iconName, iconFamily: Icon, path, onPress }, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.card}
                                activeOpacity={0.8}
                                onPress={onPress || (path ? () => navigate(path) : undefined)}
                            >
                                <Icon name={iconName} size={25} color="#007aff" />
                                <Text style={styles.cardText}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* 💡 ADCARD NATIVO ABAIXO DOS BOTÕES */}
                    <View style={styles.adCardContainer}>
                        <AdCard />
                    </View>

                </ScrollView>
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        marginBottom: -33
    },
    safeAreaContent: {
        flex: 1,
        paddingHorizontal: CARD_MARGIN, // Usando a margem para o SafeAreaView
    },
    scrollViewContent: {
        paddingVertical: 40, // Espaçamento vertical para o conteúdo
        flexGrow: 1,
    },
    // 💡 NOVO: Container para dispor os botões em linha
    buttonsRowContainer: {
        flexDirection: "row",
        flexWrap: 'wrap', // Permite quebrar para a próxima linha
        justifyContent: 'space-between', // Espaço entre os botões
        alignItems: 'flex-start',
        marginBottom: 10, // Espaço entre os botões e o AdCard
    },
    // 💡 NOVO: Container para o AdCard para garantir largura total
    adCardContainer: {
        width: '100%',
        marginTop: 10,
        backgroundColor: 'rgba(255, 255, 255, 1)',
        // O AdCard interno já tem margem/padding/elevação
        borderRadius: 10, // Alterado de 100 para 10 para parecer mais com um card
        
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        borderRadius: 100, // Alterado de 100 para 10 para parecer mais com um card
        width: DYNAMIC_CARD_WIDTH, // Usando a largura calculada
        height: DYNAMIC_CARD_WIDTH, // Mantendo a proporção 1:1 (quadrado)
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
        margin: 1 // Espaço entre as linhas de botões
    },
    cardText: {
        fontSize: 10, // Ajustado para caber melhor
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginTop: 10,
    },
    // ... (Mantive o restante dos seus estilos originais, mas os removi daqui para brevidade)
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#007BFF',
        fontSize: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});

export default HomeScreen;