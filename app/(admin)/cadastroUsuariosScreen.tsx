import React, { useState, useEffect } from 'react'; // Adicionado useEffect
import { // Adicionado ActivityIndicator
    View, Text, StyleSheet, Alert, TouchableOpacity,
    ImageBackground, ActivityIndicator, SectionList, Linking
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { database } from '../../firebaseConfig';
import { ref, onValue, update } from 'firebase/database';
import { onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import AdBanner from '../components/AdBanner';
import { Instagram } from 'lucide-react-native';

// --- Importar o gerenciador de imagens para o fundo ---
import { checkAndDownloadImages } from '../../utils/imageManager'; // Ajuste o caminho

// --- URL padrão de fallback para o fundo local ---
const defaultFundoLocal = require('../../assets/images/fundo.png');
// REMOVIDO: const fundo = require('../../assets/images/fundo.png'); // Não é mais necessário

// Interfaces
interface UserProfile {
    id: string;
    nome: string;
    email: string;
    tipoUsuario?: 'Administrador' | 'Gerente'; 
    statusAdmin?: 'Aguardando' | 'Aprovado' | 'Rejeitado';
    instagram?: string;
}

type UserRole = 'Administrador' | 'Gerente';

const AprovacaoUsuarioScreen = () => {
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState<{ title: string; data: UserProfile[] }[]>([]);
    const [rolesSelecionadas, setRolesSelecionadas] = useState<Record<string, UserRole | null>>({});
    // REMOVIDO: const [isSubmitting, setIsSubmitting] = useState(false); -- Não estava na versão original que me enviou para esta alteração.

    // --- Novos estados para o carregamento da imagem de fundo dinâmica ---
    const [fundoAppReady, setFundoAppReady] = useState(false);
    const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

    // --- NOVO useEffect para carregar a imagem de fundo dinâmica ---
    useEffect(() => {
        const loadFundoImage = async () => {
            try {
                const { fundoUrl } = await checkAndDownloadImages();
                setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
            } catch (error) {
                console.error("Erro ao carregar imagem de fundo na AprovacaoUsuarioScreen:", error);
                setCurrentFundoSource(defaultFundoLocal);
            } finally {
                setFundoAppReady(true);
            }
        };
        loadFundoImage();
    }, []);

    useEffect(() => {
        let databaseListener: Unsubscribe | null = null;

        const authListener = onAuthStateChanged(auth, (user) => {
            if (databaseListener) {
                databaseListener();
            }

            if (user) {
                setLoading(true);
                const usuariosRef = ref(database, 'usuarios');
                
                databaseListener = onValue(usuariosRef, (snapshot) => {
                    const data = snapshot.val();
                    const listaCompleta: UserProfile[] = data 
                        ? Object.keys(data).map(key => ({ id: key, ...data[key] })) 
                        : [];
                    
                    const listaSolicitacoes = listaCompleta
                        .filter(user => user.statusAdmin === 'Aguardando');
                    
                    const listaAprovados = listaCompleta
                        .filter(user => user.statusAdmin === 'Aprovado')
                        .sort((a, b) => a.nome.localeCompare(b.nome));
                    
                    setSections([
                        { title: 'Solicitações Pendentes', data: listaSolicitacoes },
                        { title: 'Usuários com Acesso', data: listaAprovados }
                    ]);
                    
                    setLoading(false);
                }, (error) => {
                    console.error("Erro ao buscar usuários:", error);
                    setLoading(false);
                    Alert.alert("Erro", "Não foi possível carregar os dados.");
                });
            } else {
                setLoading(false);
                setSections([]);
            }
        });

        return () => {
            authListener();
            if (databaseListener) {
                databaseListener();
            }
        };
    }, []);

    const openInstagramProfile = async (username: string | undefined) => {
        if (!username) {
            Alert.alert("Instagram não informado", "Este usuário não possui um Instagram cadastrado.");
            return;
        }
        const url = `https://www.instagram.com/${username}`;
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Erro", `Não foi possível abrir o perfil: ${url}`);
            }
        } catch (error) {
            Alert.alert("Erro", "Ocorreu um erro ao tentar abrir o Instagram.");
        }
    };

    const handleAprovar = async (userId: string) => {
        const role = rolesSelecionadas[userId];
        if (!role) {
            Alert.alert("Atenção", "Por favor, selecione um cargo para o usuário antes de aprovar.");
            return;
        }

        // REMOVIDO: setIsSubmitting(true);
        const userRef = ref(database, `usuarios/${userId}`);
        try {
            await update(userRef, {
                statusAdmin: 'Aprovado',
                tipoUsuario: role
            });
            Alert.alert('Sucesso', 'Usuário aprovado!');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível aprovar o usuário.');
        } 
        // REMOVIDO: finally { setIsSubmitting(false); }
    };

    const handleRejeitar = async (userId: string) => {
        // REMOVIDO: setIsSubmitting(true);
        const userRef = ref(database, `usuarios/${userId}`);
        try {
            await update(userRef, {
                statusAdmin: 'Rejeitado',
                tipoUsuario: null 
            });
            Alert.alert('Sucesso', 'Solicitação rejeitada.');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível rejeitar a solicitação.');
        } 
        // REMOVIDO: finally { setIsSubmitting(false); }
    };

    const handleRevogarAcesso = async (user: UserProfile) => {
        Alert.alert(
            "Confirmar Ação",
            `Tem certeza que deseja revogar o acesso de ${user.nome}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Revogar',
                    style: 'destructive',
                    onPress: async () => {
                        // REMOVIDO: setIsSubmitting(true);
                        const userRef = ref(database, `usuarios/${user.id}`);
                        try {
                            await update(userRef, {
                                statusAdmin: 'Rejeitado',
                                tipoUsuario: null
                            });
                            Alert.alert('Sucesso', `Acesso de ${user.nome} foi revogado.`);
                        } catch (error) {
                            Alert.alert('Erro', 'Não foi possível revogar o acesso.');
                        } 
                        // REMOVIDO: finally { setIsSubmitting(false); }
                    }
                }
            ]
        );
    };

    const renderItemSolicitacao = ({ item }: { item: UserProfile }) => (
        <View style={styles.card}>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.nome}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                
                {item.instagram && (
                    <TouchableOpacity style={styles.infoRow} onPress={() => openInstagramProfile(item.instagram)}>
                        <Instagram size={16} color="#c13584"/>
                        <Text style={[styles.infoText, styles.linkText]}>@{item.instagram}</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.userRoleSolicitada}>
                    Cargo Solicitado: <Text style={{fontWeight: 'bold'}}>{item.tipoUsuario || 'Não especificado'}</Text>
                </Text>
            </View>

            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={rolesSelecionadas[item.id] || ''}
                    onValueChange={(newRole) => {
                        if (newRole) {
                            setRolesSelecionadas(prev => ({...prev, [item.id]: newRole as UserRole}));
                        }
                    }}
                    style={styles.picker}
                >
                    <Picker.Item label="Definir Cargo..." value="" />
                    <Picker.Item label="Administrador" value="Administrador" />
                    <Picker.Item label="Gerente" value="Gerente" />
                </Picker>
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity 
                    style={[styles.button, styles.approveButton]} 
                    onPress={() => handleAprovar(item.id)}
                    // REMOVIDO: disabled={isSubmitting}
                >
                    <Text style={styles.buttonText}>Aprovar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.button, styles.rejectButton]} 
                    onPress={() => handleRejeitar(item.id)}
                    // REMOVIDO: disabled={isSubmitting}
                >
                    <Text style={styles.buttonText}>Rejeitar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderUsuarioAprovadoItem = ({ item }: { item: UserProfile }) => (
        <View style={styles.cardAprovado}>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.nome}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                
                {item.instagram && (
                    <TouchableOpacity style={styles.infoRow} onPress={() => openInstagramProfile(item.instagram)}>
                        <Instagram size={16} color="#c13584"/>
                        <Text style={[styles.infoText, styles.linkText]}>@{item.instagram}</Text>
                    </TouchableOpacity>
                )}

                <Text style={[styles.userRole, item.tipoUsuario === 'Administrador' ? styles.roleAdmin : styles.roleGerente]}>
                    {item.tipoUsuario}
                </Text>
            </View>
            <TouchableOpacity 
                style={[styles.button, styles.revokeButton]}
                onPress={() => handleRevogarAcesso(item)}
                // REMOVIDO: disabled={isSubmitting}
            >
                <Text style={styles.buttonText}>Revogar Acesso</Text>
            </TouchableOpacity>
        </View>
    );

    // --- Condição de carregamento geral: Espera os dados dos usuários E o fundo do app ---
    if (loading || !fundoAppReady) {
        return (
            <ImageBackground source={currentFundoSource} style={styles.background}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFF" />
                    <Text style={styles.loadingText}>Carregando...</Text>
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={currentFundoSource} style={styles.background}>
            <AdBanner />
            <View style={styles.container}>
                <Text style={styles.titulo}>Gerenciamento de Acessos</Text>
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, section }) => {
                        if (section.title === 'Solicitações Pendentes') {
                            return renderItemSolicitacao({ item });
                        }
                        if (section.title === 'Usuários com Acesso') {
                            return renderUsuarioAprovadoItem({ item });
                        }
                        return null;
                    }}
                    renderSectionHeader={({ section: { title, data } }) => (
                        data.length > 0 ? <Text style={styles.sectionHeader}>{title}</Text> : null
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Nenhuma solicitação ou usuário para gerenciar.</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            </View>
        </ImageBackground>
    );
};

// Estilos
const styles = StyleSheet.create({
    background: { flex: 1 },
    container: { flex: 1, paddingHorizontal: 15, paddingTop: 15 },
    titulo: { fontSize: 26, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginBottom: 20, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
    sectionHeader: { fontSize: 20, fontWeight: '600', color: '#FFF', backgroundColor: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 5, marginBottom: 10, },
    card: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, },
    cardAprovado: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 12, padding: 15, marginBottom: 15, },
    userInfo: { marginBottom: 15, },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#333', },
    userEmail: { fontSize: 14, color: '#666', marginBottom: 8, },
    userRoleSolicitada: { fontSize: 14, color: '#666', fontStyle: 'italic', marginTop: 8 },
    pickerContainer: { borderColor: '#ccc', borderWidth: 1, borderRadius: 8, marginBottom: 15, backgroundColor: '#FFF' },
    picker: { height: 50, width: '100%', },
    actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', },
    button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', },
    approveButton: { backgroundColor: '#28a745', marginRight: 10, },
    rejectButton: { backgroundColor: '#dc3545', },
    revokeButton: { backgroundColor: '#ffc107', },
    buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, },
    emptyContainer: { marginTop: 50, alignItems: 'center', },
    emptyText: { fontSize: 16, color: '#FFF', textAlign: 'center', paddingHorizontal: 20 },
    userRole: { fontSize: 15, fontWeight: 'bold', marginTop: 8, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 5, alignSelf: 'flex-start', overflow: 'hidden' },
    roleAdmin: { backgroundColor: '#dc3545', color: 'white' },
    roleGerente: { backgroundColor: '#007bff', color: 'white' },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    infoText: { marginLeft: 8, fontSize: 14, color: '#555' },
    linkText: { color: '#007bff', textDecorationLine: 'underline' },
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
    },
    loadingText: { 
        marginTop: 10, 
        fontSize: 16, 
        color: '#FFF',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});

export default AprovacaoUsuarioScreen;