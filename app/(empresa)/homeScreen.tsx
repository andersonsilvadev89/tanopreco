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
} from 'react-native';
import { router } from 'expo-router';
import {
    FontAwesome5
} from '@expo/vector-icons';
import {
    MaterialCommunityIcons
} from '@expo/vector-icons';

import AdBanner from '../components/AdBanner';
import { signOut } from "firebase/auth";
import { checkAndDownloadImages } from '../../utils/imageManager';
import { auth } from '@/firebaseConfig';
import Header from '../components/Header';
import { ref, onValue } from 'firebase/database';
import { database } from '@/firebaseConfig';

const defaultFundoLocal = require('../../assets/images/fundo.png');

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

    const options = [
        { label: 'Produtos e Serviços', iconName: 'utensils', iconFamily: FontAwesome5, path: 'crudProdutosServicos' },
        { label: 'Configurações', iconName: 'cog', iconFamily: FontAwesome5, path: 'configuracoesScreen' },
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
            <Header
                title="Área Empresarial"
                nomeUsuario={userName}
                onPressOfertas={() => navigate('/(tabs)/homeScreen')}
                onPressLogout={confirmarLogout}
            />
            <SafeAreaView style={styles.safeAreaContent}>
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    <View style={styles.gridContainer}>
                        {options.map(({ label, iconName, iconFamily: Icon, path }, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.card}
                                activeOpacity={0.8}
                                onPress={() => navigate(path)}
                            >
                                <Icon name={iconName} size={32} color="#007aff" />
                                <Text style={styles.cardText}>{label}</Text>
                            </TouchableOpacity>
                        ))}
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
        paddingHorizontal: 20,
    },
    scrollViewContent: {
        paddingVertical: 20,
        paddingBottom: 10,
        flexGrow: 1,
    },
    gridContainer: {
        flexDirection: "column",
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
        height: '100%',
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 100,
        width: '45%',
        aspectRatio: 1,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    cardText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginTop: 10,
    },
    exitButton: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        width: '100%',
        marginTop: 10,
        marginBottom: 20,
    },
    exitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginLeft: 10,
    },
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