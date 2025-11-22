import { Tabs, Redirect } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useState, useEffect } from 'react';
import { FontAwesome5, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // <--- Importante

export default function EmpresaLayout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ffffffea",
        tabBarInactiveTintColor: "#fff",
        // Configuração para permitir o gradiente
        tabBarStyle: {
          backgroundColor: "transparent", // Fundo transparente
          borderTopWidth: 0,              // Remove borda superior
          elevation: 0,                   // Remove sombra do Android
          height: 50,                     // Altura um pouco maior para elegância
          paddingBottom: 5,               // Espaço extra inferior
        },
        // O componente de fundo com gradiente
        tabBarBackground: () => (
          <LinearGradient
            colors={['#064ec7', '#04358a', '#011b4aff']} // Mesmo gradiente azul vibrante
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="homeScreen"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome5 name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="crudProdutosServicos"
        options={{
          title: 'Produtos',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <MaterialCommunityIcons name="food-fork-drink" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="configuracoesScreen"
        options={{
          title: 'Config',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <AntDesign name="setting" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sobreScreen"
        options={{
          title: 'Sobre',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <AntDesign name="infocirlceo" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}