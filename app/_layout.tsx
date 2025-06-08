// app/_layout.tsx
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().then(() => setReady(true));
    }
  }, [fontsLoaded]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: 'black' }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
