import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Alert,
    Dimensions,
} from 'react-native';
import { router } from 'expo-router';
// 💡 Importando as mesmas famílias de ícones usadas no TabsLayout
import {
    FontAwesome5,
    MaterialCommunityIcons,
    AntDesign
} from '@expo/vector-icons';
import { database } from '@/firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { auth } from '@/firebaseConfig';
import * as WebBrowser from 'expo-web-browser';
import { signOut } from "firebase/auth";

// Importações de componentes de Ads
import AdCard from '../components/AdCard';
import { AppHeaderTitle } from '../components/shell/AppHeaderTitle';
import { BRAND_COLORS } from '@/constants/BrandColors';
const { width } = Dimensions.get('window');
const SCREEN_PADDING = 20;

// Calculando tamanho para 4 itens por linha (aprox)
const ITEM_WIDTH = (width - (SCREEN_PADDING * 2)) / 4; 

const HomeScreen = () => {
    const navigate = (path: string) => router.push(path as any);

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
                            Alert.alert("Erro", "Não foi possível sair.");
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
            Alert.alert("Erro", "Usuário não autenticado.");
            return;
        }
        const userId = user.uid;
        const paymentUrl = `${PACKAGES_HOSTING_URL}/index.html?uid=${userId}`;

        try {
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
                }
            }, (error) => {
                console.error("Erro ao buscar nome:", error);
                setUserName("Usuário");
            });

            return () => unsubscribe();
        } else {
            setUserName("Usuário");
        }
    }, []);

    // 💡 Organização atualizada com os mesmos ícones das Tabs
    const options = [
        { 
            label: 'Produtos', 
            // Mesmo ícone da Tab "Produtos"
            iconName: 'food-fork-drink', 
            iconFamily: MaterialCommunityIcons, 
            path: 'crudProdutosServicos',
            color: BRAND_COLORS.primary
        },
        { 
            label: 'Config', 
            // Mesmo ícone da Tab "Config"
            iconName: 'setting', 
            iconFamily: AntDesign, 
            path: 'configuracoesScreen',
            color: BRAND_COLORS.primary
        },
        { 
            label: 'Pacotes', 
            iconName: 'box', 
            iconFamily: FontAwesome5, 
            onPress: handleBuyPackages,
            color: BRAND_COLORS.primary
        },
        { 
            label: 'Sair', 
            iconName: 'logout', // Ícone mais comum para sair no Material
            iconFamily: MaterialCommunityIcons, 
            onPress: confirmarLogout,
            color: BRAND_COLORS.accentRed
        },
    ];

    return (
        <View style={styles.background}>
            <AppHeaderTitle
                title="Área Empresarial"
                user={auth.currentUser}
                paddingTop={18}
                onBack={() => {}}
                onMenuOpen={() => {}}
                onLogout={confirmarLogout}
            />
            <SafeAreaView style={styles.safeAreaContent}>
                <ScrollView contentContainerStyle={styles.scrollViewContent}>

                    {/* Container dos Ícones de Menu */}
                    <View style={styles.menuGrid}>
                        {options.map(({ label, iconName, iconFamily: Icon, path, onPress, color }, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                                onPress={onPress || (path ? () => navigate(path) : undefined)}
                            >
                                {/* O Círculo do Botão */}
                                <View style={styles.iconCircle}>
                                    <Icon name={iconName as any} size={40} color={color} />
                                </View>
                                {/* O Texto abaixo do botão */}
                                <Text style={styles.menuText} numberOfLines={2}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* AdCard Container */}
                    <View style={styles.adCardContainer}>
                        <AdCard />
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: BRAND_COLORS.surfaceSoft,
        marginBottom: -33
    },
    safeAreaContent: {
        flex: 1,
    },
    scrollViewContent: {
        paddingVertical: 40,
        paddingHorizontal: SCREEN_PADDING,
        flexGrow: 1,
    },
    // 💡 GRID DO MENU
    menuGrid: {
        flexDirection: "row",
        flexWrap: 'wrap',
        justifyContent: 'space-between', // Distribui os itens uniformemente
        marginBottom: 20,
    },
    menuItem: {
        width: ITEM_WIDTH, // Define a largura de cada coluna
        alignItems: 'center',
        marginBottom: 15,
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 50, // Totalmente redondo
        backgroundColor: BRAND_COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8, // Espaço entre o círculo e o texto
        
        // Sombra para dar destaque
        shadowColor: BRAND_COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    menuText: {
        fontSize: 11,
        fontWeight: '600',
        color: BRAND_COLORS.text,
        textAlign: 'center',
        width: '100%', // Garante que o texto centralize na largura do item
    },
    
    // Container do AdCard
    adCardContainer: {
        width: '100%',
        marginTop: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderRadius: 10,
        overflow: 'hidden', // Garante que o conteúdo respeite as bordas arredondadas
    },
    
    // Estilos de loading (caso precise no futuro)
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: BRAND_COLORS.primary,
        fontSize: 16,
    },
});

export default HomeScreen;