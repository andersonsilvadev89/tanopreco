import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ActivityIndicator, 
    Alert,
    ImageBackground,
    TouchableOpacity,
    SafeAreaView,
    SectionList,
    Linking,
} from 'react-native';
import { ref, onValue, update, get } from 'firebase/database'; // Adicionado 'get'
import { database } from '../../firebaseConfig';
import AdBanner from '../components/AdBanner';
import { Mail, Phone, Instagram } from 'lucide-react-native';

const fundo = require('../../assets/images/fundo.png');

// Interface para os dados da empresa
interface CompanyProfile {
    id: string;
    nomeEmpresa: string;
    descricao: string;
    cnpj?: string;
    cpf?: string;
    telefoneContato?: string;
    emailContato?: string;
    linkInstagram?: string;
    // O status agora vem do nó 'usuarios'
    statusEmpresa: 'Aguardando' | 'Aprovado' | 'Rejeitado' | null; 
    userId: string;
}

const ListaEmpresasParaAprovacaoScreen = () => {
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState<{ title: string; data: CompanyProfile[] }[]>([]);

    // --- LÓGICA DE BUSCA DE DADOS CORRIGIDA ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Busca todos os dados das solicitações de uma vez
                const solicitacoesRef = ref(database, 'solicitacoesEmpresas');
                const solicitacoesSnapshot = await get(solicitacoesRef);
                const solicitacoesData = solicitacoesSnapshot.val() || {};

                // 2. Busca todos os dados dos usuários de uma vez
                const usuariosRef = ref(database, 'usuarios');
                const usuariosSnapshot = await get(usuariosRef);
                const usuariosData = usuariosSnapshot.val() || {};

                // 3. Combina os dados
                const listaCombinada: CompanyProfile[] = Object.keys(solicitacoesData).map(userId => {
                    const empresa = solicitacoesData[userId];
                    const usuario = usuariosData[userId];
                    
                    return {
                        id: userId,
                        ...empresa,
                        userId: userId,
                        // A fonte da verdade para o status é o nó 'usuarios'
                        statusEmpresa: usuario ? usuario.statusEmpresa : null, 
                    };
                });

                const solicitacoesPendentes = listaCombinada
                    .filter(empresa => empresa.statusEmpresa === 'Aguardando');
                
                const empresasAprovadas = listaCombinada
                    .filter(empresa => empresa.statusEmpresa === 'Aprovado')
                    .sort((a, b) => a.nomeEmpresa.localeCompare(b.nomeEmpresa));

                setSections([
                    { title: 'Solicitações Pendentes', data: solicitacoesPendentes },
                    { title: 'Empresas Aprovadas', data: empresasAprovadas }
                ]);

            } catch (error) {
                console.error("Erro ao buscar dados:", error);
                Alert.alert("Erro", "Não foi possível carregar os dados das empresas.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Adiciona um listener para atualizações em tempo real (opcional, mas bom para UX)
        const usuariosRef = ref(database, 'usuarios');
        const unsubscribe = onValue(usuariosRef, () => {
            fetchData(); // Re-busca os dados quando qualquer usuário for alterado
        });
        
        return () => unsubscribe();

    }, []);
    
    // --- FUNÇÃO DE ATUALIZAÇÃO CORRIGIDA ---
    // Agora atualiza apenas o status no nó do usuário
    const atualizarStatusEmpresa = async (userId: string, novoStatus: 'Aprovado' | 'Rejeitado') => {
        const userStatusRef = ref(database, `usuarios/${userId}/statusEmpresa`);
        try {
            await update(ref(database), {
                [`/usuarios/${userId}/statusEmpresa`]: novoStatus
            });
            Alert.alert('Sucesso', `Empresa ${novoStatus.toLowerCase()} com sucesso!`);
            // O listener do useEffect já vai recarregar a lista
        } catch (error) {
            console.error(`Erro ao ${novoStatus.toLowerCase()} empresa:`, error);
            Alert.alert('Erro', `Não foi possível atualizar o status da empresa.`);
        }
    };
    
    const handleRevogar = (empresa: CompanyProfile) => {
        Alert.alert(
            "Confirmar Revogação",
            `Tem certeza que deseja revogar o acesso da empresa ${empresa.nomeEmpresa}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Revogar',
                    style: 'destructive',
                    onPress: () => atualizarStatusEmpresa(empresa.userId, 'Rejeitado')
                }
            ]
        );
    };

    const openInstagramProfile = async (username: string | undefined) => {
        if (!username) return;
        const url = `https://www.instagram.com/${username}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
        else Alert.alert("Erro", "Não foi possível abrir o perfil do Instagram.");
    };

    // --- RENDERIZAÇÃO DOS ITENS (sem alterações) ---

    const renderSolicitacaoItem = ({ item }: { item: CompanyProfile }) => (
        <View style={styles.card}>
            <Text style={styles.nomeEmpresa}>{item.nomeEmpresa}</Text>
            <Text style={styles.descricao}>{item.descricao}</Text>
            <Text style={styles.documento}>
                {item.cnpj ? `CNPJ: ${item.cnpj}` : (item.cpf ? `CPF: ${item.cpf}`: 'Documento não informado')}
            </Text>
             {item.linkInstagram && (
                <TouchableOpacity style={styles.infoRow} onPress={() => openInstagramProfile(item.linkInstagram)}>
                    <Instagram size={16} color="#c13584"/>
                    <Text style={[styles.infoText, styles.linkText]}>@{item.linkInstagram}</Text>
                </TouchableOpacity>
            )}

            <View style={styles.actionsContainer}>
                <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={() => atualizarStatusEmpresa(item.userId, 'Aprovado')}>
                    <Text style={styles.buttonText}>Aprovar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={() => atualizarStatusEmpresa(item.userId, 'Rejeitado')}>
                    <Text style={styles.buttonText}>Rejeitar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderAprovadaItem = ({ item }: { item: CompanyProfile }) => (
         <View style={styles.cardAprovado}>
            <Text style={styles.nomeEmpresa}>{item.nomeEmpresa}</Text>
            {item.emailContato && (
                <View style={styles.infoRow}><Mail size={16} color="#555"/><Text style={styles.infoText}>{item.emailContato}</Text></View>
            )}
            {item.telefoneContato && (
                 <View style={styles.infoRow}><Phone size={16} color="#555"/><Text style={styles.infoText}>{item.telefoneContato}</Text></View>
            )}
            <TouchableOpacity style={[styles.button, styles.revokeButton]} onPress={() => handleRevogar(item)}>
                <Text style={styles.buttonText}>Revogar Acesso</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <ImageBackground source={fundo} style={styles.background}>
            <AdBanner />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Aprovação de Empresas</Text>
                </View>
                {loading ? (
                    <View style={styles.centeredContainer}><ActivityIndicator size="large" color="#FFF" /></View>
                ) : (
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item, section }) => {
                            if (section.title === 'Solicitações Pendentes') {
                                return renderSolicitacaoItem({ item });
                            }
                            if (section.title === 'Empresas Aprovadas') {
                                return renderAprovadaItem({ item });
                            }
                            return null;
                        }}
                        renderSectionHeader={({ section: { title, data } }) => (
                            data.length > 0 ? <Text style={styles.sectionHeader}>{title}</Text> : null
                        )}
                        ListEmptyComponent={
                            <View style={styles.centeredContainer}>
                                <Text style={styles.infoText}>Nenhuma empresa para gerenciar.</Text>
                            </View>
                        }
                        contentContainerStyle={styles.listContentContainer}
                    />
                )}
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: { flex: 1 },
    safeArea: { flex: 1 },
    header: { paddingVertical: 20, paddingHorizontal: 15 },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
    centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    infoText: { fontSize: 18, color: '#FFF', textAlign: 'center' },
    listContentContainer: { paddingHorizontal: 16 },
    sectionHeader: { fontSize: 20, fontWeight: '600', color: '#FFF', backgroundColor: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 5, marginBottom: 10, },
    card: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 12, padding: 15, marginBottom: 15 },
    cardAprovado: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 12, padding: 15, marginBottom: 15 },
    nomeEmpresa: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    descricao: { fontSize: 14, color: '#666', fontStyle: 'italic', marginVertical: 8 },
    documento: { fontSize: 14, color: '#666', marginBottom: 10 },
    actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    approveButton: { backgroundColor: '#28a745', marginRight: 10 },
    rejectButton: { backgroundColor: '#dc3545' },
    revokeButton: { backgroundColor: '#ffc107', marginTop: 10 },
    buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    linkText: { color: '#007bff' }
});

export default ListaEmpresasParaAprovacaoScreen;