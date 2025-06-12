import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react'; // Removido useState 'ready'
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext'; // 1. IMPORTAR

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Esconder o splash screen apenas quando as fontes estiverem carregadas OU der erro
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Se as fontes não carregaram ainda, não renderiza nada. O splash screen nativo fica visível.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // 2. ENVOLVER O STACK COM O AUTHPROVIDER
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}