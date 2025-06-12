import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, loading } = useAuth();

  // Enquanto verifica a autenticação, mostramos uma tela de carregamento
  // (O splash screen do _layout geralmente já cobre isso, mas é uma boa prática)
  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  // Se não há usuário, redireciona para o fluxo de autenticação
  if (!user) {
    return <Redirect href="/(auth)/loginScreen" />;
  }

  // Se há um usuário logado, redireciona para a tela principal do app
  // IMPORTANTE: Ajuste o caminho '/(tabs)/home' para a sua tela inicial principal.
  // Pode ser '/(app)/dashboard', '/home', etc.
  return <Redirect href="/(tabs)/homeScreen" />;
}