import { Tabs, Redirect } from 'expo-router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, database } from '../../firebaseConfig'; // Usando o database principal onde ficam os usuários
import { 
    LayoutDashboard, 
    Users, 
    Building2, 
    CalendarPlus, 
    Handshake,
    MapPin,
} from 'lucide-react-native';
import { useEffect, useState, useCallback } from 'react';
import { ref, get } from 'firebase/database';
import { View, ActivityIndicator } from 'react-native';

export default function AdminTabsLayout() {
    const [user, loadingAuth] = useAuthState(auth);
    // 1. O estado agora armazena o TIPO do usuário (Administrador ou Gerente)
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loadingRole, setLoadingRole] = useState(true);

    // Função para buscar o tipo de usuário (função de permissão)
    const fetchUserRole = useCallback(async (currentUser: any) => {
        if (!currentUser) {
            setLoadingRole(false);
            setUserRole(null);
            return;
        }
        
        // 2. O caminho no Firebase foi corrigido para buscar o `tipoUsuario`
        const userRef = ref(database, `usuarios/${currentUser.uid}/tipoUsuario`);
        
        try {
            const snapshot = await get(userRef);
            setUserRole(snapshot.exists() ? snapshot.val() : null);
        } catch (error) {
            console.error("Erro ao buscar tipo de usuário:", error);
            setUserRole(null);
        } finally {
            setLoadingRole(false);
        }
    }, []);

    useEffect(() => {
        if (!loadingAuth) {
            fetchUserRole(user);
        }
    }, [user, loadingAuth, fetchUserRole]);

    // Tela de loading enquanto verifica autenticação e permissões
    if (loadingAuth || loadingRole) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // Se não houver usuário, redireciona para o login
    if (!user) {
        return <Redirect href="/(auth)/loginScreen" />;
    }

    // 3. A lista de telas foi atualizada para corresponder aos seus arquivos
    // e com ícones mais apropriados
    const screens = [
        { name: 'homeScreen', label: 'Início', icon: LayoutDashboard },
        { name: 'cadastroUsuariosScreen', label: 'Usuários', icon: Users },
        { name: 'listaEmpresasParaAprovacaoScreen', label: 'Empresas', icon: Building2 },
        { name: 'locaisScreen', label: 'Locais', icon: MapPin },
        { name: 'locaisEssenciaisScreen', label: 'Essencial', icon: MapPin },
        { name: 'cadastroLineUpScreen', label: 'LineUp', icon: CalendarPlus },
        { name: 'cadastroPatrocinadoresScreen', label: 'Patrocínio', icon: Handshake },
        
    ];

    return (
        <Tabs 
            screenOptions={{ 
                headerShown: false,
                tabBarActiveTintColor: '#007BFF',
                tabBarInactiveTintColor: 'gray',
            }}
        >
            {screens.map((screen) => {
                // 4. Lógica de permissão corrigida para desabilitar telas se o tipo NÃO for "Administrador"
                // Isso significa que um "Gerente" não verá estas telas.
                const isDisabled = 
                    (screen.name === 'cadastroUsuariosScreen' || screen.name === 'locaisScreen') 
                    && userRole !== 'Administrador';

                return (
                    <Tabs.Screen
                        key={screen.name}
                        name={screen.name}
                        options={{
                            title: screen.label,
                            tabBarIcon: ({ color, size }) => <screen.icon color={color} size={size} />,
                            // Oculta a aba completamente se estiver desabilitada
                            href: isDisabled ? null : undefined, 
                        }}
                    />
                );
            })}
        </Tabs>
    );
}