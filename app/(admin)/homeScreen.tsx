import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, ActivityIndicator, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { 
    LogOut, 
    Users, 
    Building2, 
    CalendarPlus, 
    Handshake,
    MapPin
} from 'lucide-react-native';
import { auth, database } from '../../firebaseConfig';
import { onValue, ref } from 'firebase/database';
import AdBanner from '../components/AdBanner';

const fundo = require('../../assets/images/fundo.png');

const HomeScreen = () => {
    const [userType, setUserType] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // --- CORREÇÃO APLICADA AQUI ---
    // A função agora passa o caminho diretamente e usa 'as any' para satisfazer o TypeScript.
    // O Expo Router resolverá o caminho relativo ao grupo (admin) automaticamente.
    const navigate = (path: string) => router.push(path as any);

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            const userRef = ref(database, `usuarios/${user.uid}/tipoUsuario`);
            const unsubscribe = onValue(userRef, (snapshot) => {
                setUserType(snapshot.val() || null);
                setLoading(false);
            }, (error) => {
                console.error("Erro ao buscar tipo de usuário:", error);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setLoading(false);
        }
    }, []);

    const allOptions = [
        { name: 'cadastroUsuariosScreen', label: 'Aprovar Usuários', icon: Users, adminOnly: true },
        { name: 'listaEmpresasParaAprovacaoScreen', label: 'Aprovar Empresas', icon: Building2, adminOnly: false },
        { name: 'locaisScreen', label: 'Gerenciar Locais', icon: MapPin, adminOnly: true },{ name: 'cadastroLineUpScreen', label: 'Gerenciar LineUp', icon: CalendarPlus, adminOnly: false },
        { name: 'cadastroPatrocinadoresScreen', label: 'Gerenciar Patrocínio', icon: Handshake, adminOnly: false },
        
        
    ];

    const options = allOptions.filter(option => {
        if (userType === 'Administrador') {
            return true;
        }
        return !option.adminOnly;
    });

    if (loading) {
        return (
            <ImageBackground source={fundo} style={styles.background} resizeMode="cover">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFF" />
                    <Text style={styles.loadingText}>Carregando permissões...</Text>
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={fundo} style={styles.background} resizeMode="cover">
            <AdBanner />
            <SafeAreaView style={styles.safeArea}>
                <Text style={styles.title}>Área Administrativa</Text>
                
                <View style={styles.gridContainer}>
                    {options.map(({ name, label, icon: Icon }, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.card}
                            activeOpacity={0.8}
                            onPress={() => navigate(name)}
                        >
                            <Icon size={32} color="#007aff" />
                            <Text style={styles.cardText}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.exitButton}
                    activeOpacity={0.8}
                    onPress={() => router.replace('/(tabs)/homeScreen')} 
                >
                    <LogOut size={24} color="#000" />
                    <Text style={styles.exitButtonText}>Sair da Área Administrativa</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 20,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 20,
        width: '45%',
        aspectRatio: 1,
        marginBottom: 20,
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
        backgroundColor: 'rgb(255, 255, 255)',
        borderRadius: 20,
        flexDirection:'row',
        paddingVertical: 15,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginTop: 10,
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
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    loadingText: {
        fontSize: 18,
        color: '#FFF',
        marginTop: 10
    },
});

export default HomeScreen;