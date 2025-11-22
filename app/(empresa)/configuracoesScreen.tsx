import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    TouchableOpacity,
    TextInput,
    Image,
    ImageBackground,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Location from 'expo-location';
import { ref, set, get, update, remove } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

import AdBanner from '../components/AdBanner';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { checkAndDownloadImages } from '../../utils/imageManager';
import LocalizacaoModal from '../components/LocalizacaoModal';

const defaultFundoLocal = require('../../assets/images/fundo.png');

// --- CONSTANTES CLOUDINARY ---
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dvekhdfgc/image/upload';
const UPLOAD_PRESET = 'tanopreco';

interface CompanyProfile {
    nomeEmpresa: string;
    nome: string;
    palavrasChave: string;
    telefone?: string;
    email?: string;
    instagram?: string;
    imagem?: string;
    latitude: number;
    longitude: number;
}

const ConfiguracoesEmpresaScreen = () => {
    const navigation = useNavigation<any>();

    const [carregando, setCarregando] = useState(true);
    const [editando, setEditando] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [nomeEmpresa, setNomeEmpresa] = useState('');
    const [nome, setNome] = useState('');
    const [palavrasChave, setPalavrasChave] = useState('');
    const [telefone, setTelefone] = useState('');
    const [email, setEmail] = useState('');
    const [instagram, setInstagram] = useState('');
    const [imagem, setImagem] = useState('');
    const [novaImagemUri, setNovaImagemUri] = useState<string | null>(null);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);

    const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
    const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

    const usuarioId = auth.currentUser?.uid;

    // --------------------------------------------------------------------
    // 🔥 CARREGAR DADOS DA EMPRESA
    // --------------------------------------------------------------------
    useEffect(() => {
        const loadCompanyData = async () => {
            if (!usuarioId) {
                setCarregando(false);
                return;
            }
            try {
                const companyRef = ref(database, `usuariosEmpresa/${usuarioId}`);
                const snapshot = await get(companyRef);
                if (snapshot.exists()) {
                    const data = snapshot.val() as CompanyProfile;
                    setNomeEmpresa(data.nomeEmpresa || '');
                    setNome(data.nome || '');
                    setPalavrasChave(data.palavrasChave || '');
                    setTelefone(data.telefone || '');
                    setEmail(data.email || '');
                    setInstagram(data.instagram || '');
                    setImagem(data.imagem || '');
                    setLatitude(data.latitude || null);
                    setLongitude(data.longitude || null);
                }
            } catch {
                Alert.alert("Erro", "Não foi possível carregar os dados.");
            } finally {
                setCarregando(false);
            }
        };
        loadCompanyData();
    }, [usuarioId]);

    // --------------------------------------------------------------------
    // 🔥 FUNÇÃO DE EXCLUSÃO DE CONTA (ATENDE ÀS EXIGÊNCIAS DA APPLE)
    // --------------------------------------------------------------------
    const handleDeleteAccount = () => {
        Alert.alert(
            "Excluir conta",
            "A exclusão é permanente e todos os dados associados serão removidos. Deseja continuar?",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Sim, excluir", style: "destructive", onPress: confirmarExclusaoConta }
            ]
        );
    };

    const confirmarExclusaoConta = async () => {
        if (!usuarioId) {
            Alert.alert("Erro", "Usuário não autenticado.");
            return;
        }

        try {
            // 1️⃣ Remove dados do Realtime Database
            const userRef = ref(database, `usuariosEmpresa/${usuarioId}`);
            await remove(userRef);

            // 2️⃣ Remove a conta da autenticação Firebase
            const user = auth.currentUser;
            if (user) {
                await user.delete();
            }

            Alert.alert("Conta excluída", "Sua conta foi removida com sucesso.");

            // 3️⃣ Resetar navegação para "(tabs)" → homeScreem
            navigation.reset({
                index: 0,
                routes: [{ name: "(tabs)" }],
            });

        } catch (error: any) {
            console.error(error);

            if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                    "Reautenticação necessária",
                    "Entre novamente para poder excluir sua conta."
                );
            } else {
                Alert.alert("Erro", "Não foi possível excluir a conta.");
            }
        }
    };

    // --------------------------------------------------------------------
    // FUNÇÕES ORIGINAIS (UPLOAD, LOCALIZAÇÃO, EDIÇÃO...)
    // --------------------------------------------------------------------

    const uploadCompanyImage = async (uri: string): Promise<string | null> => {
        const formData = new FormData();
        const filename = uri.split('/').pop();
        const fileType = filename?.split('.').pop()?.toLowerCase() || 'jpeg';

        formData.append('file', {
            uri: uri,
            name: filename || `company_image_${Date.now()}.${fileType}`,
            type: `image/${fileType}`,
        } as any);
        formData.append('upload_preset', UPLOAD_PRESET);

        try {
            const response = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.secure_url;

        } catch {
            return null;
        }
    };
    const handleSalvarDadosEmpresa = async () => {
        if (!usuarioId) return;
        setIsSaving(true);
        let finalImageUrl = imagem;

        if (novaImagemUri) {
            const uploadedUrl = await uploadCompanyImage(novaImagemUri);
            if (uploadedUrl) {
                finalImageUrl = uploadedUrl;
            } else {
                setIsSaving(false);
                return;
            }
        }

        let processedInstagram: string | null = null;
        const rawInstagramInput = instagram?.trim();

        if (rawInstagramInput) {
            const instagramUrlRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/;
            const match = rawInstagramInput.match(instagramUrlRegex);

            if (match && match[1]) {
                processedInstagram = match[1];
            } else {
                processedInstagram = rawInstagramInput.startsWith('@') ? rawInstagramInput.substring(1) : rawInstagramInput;
            }
        }

        try {
            const companyRef = ref(database, `usuariosEmpresa/${usuarioId}`);
            await update(companyRef, {
                nome,
                nomeEmpresa,
                palavrasChave,
                telefoneContato: telefone || null,
                emailContato: email || null,
                instagram: processedInstagram,
                imagem: finalImageUrl,
            });
            setImagem(finalImageUrl);
            setInstagram(processedInstagram || '');
            setNovaImagemUri(null);
            setEditando(false);
            Alert.alert('Sucesso', 'Dados da empresa atualizados!');
        } catch (error) {
            Alert.alert("Erro", "Não foi possível atualizar os dados da empresa.");
        } finally {
            setIsSaving(false);
        }
    };
    const handleSelecionarFoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permissão necessária", "Precisamos acessar sua galeria.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled && result.assets.length > 0) {
            setNovaImagemUri(result.assets[0].uri);
        }
    };

    const salvarLocalizacao = async ({ latitude, longitude }: { latitude: number, longitude: number }) => {
        if (!usuarioId) return;

        const refUser = ref(database, `usuariosEmpresa/${usuarioId}`);
        await update(refUser, { latitude, longitude });

        setLatitude(latitude);
        setLongitude(longitude);
    };

    const obterLocalizacaoAtualECadastrar = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== "granted") {
                Alert.alert("Permissão negada", "Ative o GPS.");
                return;
            }

            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            await salvarLocalizacao({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            Alert.alert("Sucesso", "Localização atualizada!");

        } catch {
            Alert.alert("Erro", "Não foi possível obter sua localização.");
        }
    };

    const handleSaveLocation = async (coords: { latitude: number; longitude: number }) => {
        await salvarLocalizacao(coords);
        Alert.alert("Sucesso", "Localização atualizada!");
        setIsLocationModalVisible(false);
    };

    // --------------------------------------------------------------------
    // UI PRINCIPAL
    // --------------------------------------------------------------------

    if (carregando) {
        return (
            <ImageBackground source={currentFundoSource} style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Carregando...</Text>
            </ImageBackground>
        );
    }

    const displayImageSource = novaImagemUri ? { uri: novaImagemUri } : (imagem ? { uri: imagem } : undefined);

    return (
        <ImageBackground source={currentFundoSource} style={styles.background}>
            <AdBanner />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer} enableOnAndroid>

                    {/* CARD PRINCIPAL */}
                    <View style={styles.card}>
                        {!editando ? (
                            <View style={styles.profileDisplayContainer}>
                                <Image source={displayImageSource} style={styles.profileImage} />
                                <Text style={styles.profileName}>{nomeEmpresa}</Text>
                                <Text style={styles.profileDescription}>{palavrasChave}</Text>

                                <View style={styles.detailsSection}>
                                    {email ? (
                                        <View style={styles.detailRow}>
                                            <MaterialCommunityIcons name="email-outline" size={16} color="#444" />
                                            <Text style={styles.profileDetail}>{email}</Text>
                                        </View>
                                    ) : null}

                                    {telefone ? (
                                        <View style={styles.detailRow}>
                                            <FontAwesome name="phone" size={16} color="#444" />
                                            <Text style={styles.profileDetail}>{telefone}</Text>
                                        </View>
                                    ) : null}

                                    {instagram ? (
                                        <TouchableOpacity style={styles.detailRow}>
                                            <MaterialCommunityIcons name="instagram" size={16} color="#444" />
                                            <Text style={styles.profileDetail}>@{instagram}</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>

                                <TouchableOpacity style={styles.editButton} onPress={() => setEditando(true)}>
                                    <Text style={styles.editButtonText}>Editar Dados</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.profileEditContainer}>
                                <TouchableOpacity onPress={handleSelecionarFoto}>
                                    <Image source={displayImageSource} style={styles.profileImage} />
                                    <Text style={styles.changePhotoText}>Alterar Imagem de Capa</Text>
                                </TouchableOpacity>

                                <TextInput style={styles.input} value={nomeEmpresa} onChangeText={setNomeEmpresa} placeholder="Nome da Empresa" />
                                <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome Completo" />
                                <TextInput style={styles.input} value={palavrasChave} onChangeText={setPalavrasChave} placeholder="Palavras-chave" multiline />
                                <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="Telefone" keyboardType="phone-pad" />
                                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" />
                                <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} placeholder="Instagram (sem @)" />

                                <View style={styles.editActionsContainer}>
                                    <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSalvarDadosEmpresa} disabled={isSaving}>
                                        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Salvar</Text>}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => setEditando(false)}>
                                        <Text style={styles.actionButtonText}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* CARD DE LOCALIZAÇÃO */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>📍 Localização da Empresa</Text>

                        <TouchableOpacity
                            style={[styles.updateLocationButton, styles.selectMapButton]}
                            onPress={() => setIsLocationModalVisible(true)}
                        >
                            <Text style={styles.updateLocationButtonText}>Selecionar no Mapa</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.updateLocationButton} onPress={obterLocalizacaoAtualECadastrar}>
                            <Text style={styles.updateLocationButtonText}>Usar GPS Atual</Text>
                        </TouchableOpacity>

                        {latitude && longitude ? (
                            <Text style={styles.currentCoordsText}>
                                Lat: {latitude.toFixed(6)} | Lon: {longitude.toFixed(6)}
                            </Text>
                        ) : null}
                    </View>

                    {/* CARD DE EXCLUSÃO DE CONTA */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>⚠️ Conta</Text>
                        <Text style={styles.settingDescription}>
                            Excluir sua conta apagará permanentemente todos os seus dados.
                        </Text>

                        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
                            <Text style={styles.deleteAccountButtonText}>Excluir minha conta</Text>
                        </TouchableOpacity>
                    </View>

                </KeyboardAwareScrollView>
            </SafeAreaView>

            <LocalizacaoModal
                isVisible={isLocationModalVisible}
                onClose={() => setIsLocationModalVisible(false)}
                onSave={handleSaveLocation}
                initialCoords={{ latitude, longitude }}
            />
        </ImageBackground>
    );
};

// ---------------------------------------------------------------------
// ESTILOS
// ---------------------------------------------------------------------

const styles = StyleSheet.create({
    background: { flex: 1 },
    safeArea: { flex: 1 },
    scrollContainer: { padding: 10 },
    loadingContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center'
    },
    loadingText: {
        marginTop: 10, color: '#fff', fontSize: 16
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20
    },
    profileDisplayContainer: { alignItems: 'center' },
    profileImage: {
        width: 120, height: 120, borderRadius: 100,
        marginBottom: 5, backgroundColor: '#eee', alignSelf: 'center'
    },
    profileName: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    profileDescription: { fontSize: 16, color: '#666', fontStyle: 'italic' },
    detailsSection: { width: '100%', marginTop: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    profileDetail: { marginLeft: 10, fontSize: 16, color: '#333' },

    editButton: {
        backgroundColor: '#007BFF',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginTop: 10
    },
    editButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    profileEditContainer: { width: '100%', alignItems: 'center' },
    changePhotoText: { color: '#007BFF', marginBottom: 10 },
    input: {
        width: '100%',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 10
    },
    editActionsContainer: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    actionButton: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderRadius: 8 },
    saveButton: { backgroundColor: '#4CAF50' },
    cancelButton: { backgroundColor: '#f44336' },
    actionButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },

    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center' },
    settingDescription: { textAlign: 'center', color: '#666', marginTop: 5 },

    updateLocationButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12
    },
    updateLocationButtonText: {
        color: '#fff', fontSize: 16, fontWeight: 'bold'
    },
    selectMapButton: { backgroundColor: '#007BFF' },
    currentCoordsText: { textAlign: 'center', color: '#333', marginTop: 10 },

    deleteAccountButton: {
        backgroundColor: '#d9534f',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15
    },
    deleteAccountButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    }
});

export default ConfiguracoesEmpresaScreen;
