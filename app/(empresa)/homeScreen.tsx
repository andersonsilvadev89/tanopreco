import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    SafeAreaView,
    ActivityIndicator,
    ScrollView, // Adicionado ScrollView
} from 'react-native';
import { router } from 'expo-router';
import {
    Settings,
    LogOut,
    Sandwich,
} from 'lucide-react-native';
import AdBanner from '../components/AdBanner';

import { checkAndDownloadImages } from '../../utils/imageManager';

const defaultFundoLocal = require('../../assets/images/fundo.png');

const HomeScreen = () => {
    const navigate = (path: string) => router.push(path as any);

    const [fundoAppReady, setFundoAppReady] = useState(false);
    const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

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
        { label: 'Produtos e Serviços', icon: Sandwich, path: '/(empresa)/crudProdutosServicos' },
        { label: 'Configurações', icon: Settings, path: '/(empresa)/configuracoesScreen' },
        
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

            <SafeAreaView style={styles.safeAreaContent}>
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    <Text style={styles.title}>Área Empresarial</Text>

                    <View style={styles.gridContainer}>
                        {options.map(({ label, icon: Icon, path }, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.card}
                                activeOpacity={0.8}
                                onPress={() => navigate(path)}
                            >
                                <Icon size={32} color="#007aff" />
                                <Text style={styles.cardText}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                <TouchableOpacity
                    style={styles.exitButton}
                    activeOpacity={0.8}
                    onPress={() => router.replace('/(tabs)/homeScreen')}
                >
                    <LogOut size={24} color="#000" />
                    <Text style={styles.exitButtonText}>Sair da Área Empresarial</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </ImageBackground>
    );
};

// --- ESTILOS ATUALIZADOS ---
const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    // Removido justifyContent: 'space-between' do safeArea original
    safeAreaContent: {
        flex: 1,
        paddingHorizontal: 20, // Mantém o padding horizontal
        // Remove padding top/bottom que serão tratados pelo ScrollView ou AdBanner/exitButton
    },
    scrollViewContent: { // Estilo para o contentContainerStyle do ScrollView
        paddingVertical: 20, // Adiciona padding vertical ao conteúdo rolavel
        paddingBottom: 10, // Adicione um pequeno padding ao final para não colar no botão de sair
        flexGrow: 1, // Garante que o ScrollView possa crescer e ocupar espaço
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        marginBottom: 20, // Adicionado marginBottom para separar do grid
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 20,
        width: '45%',
        aspectRatio: 1,
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
        marginBottom: 20, // Adiciona um padding inferior para o botão
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