import { Tabs, Redirect } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth'; // Importe onAuthStateChanged
import React, { useState, useEffect } from 'react'; // Importe useState e useEffect
import { Home, Map, Settings, Sandwich, CircleHelp } from 'lucide-react-native';

export default function TabsLayout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => { // Use onAuthStateChanged
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null;

  if (!user) {
    return <Redirect href="/(auth)/loginScreen" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="homeScreen"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="crudProdutosServicos"
        options={{
          title: 'Produtos',
          tabBarIcon: ({ color, size }) => <Sandwich color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="configuracoesScreen"
        options={{
          title: 'Config',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sobreScreen"
        options={{
          title: 'Sobre',
          tabBarIcon: ({ color, size }) => <CircleHelp color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
