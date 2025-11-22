import { Tabs } from "expo-router";
import { auth } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import React, { useState, useEffect } from "react";
import { FontAwesome5, AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; // <--- IMPORTANTE

export default function TabsLayout() {
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ffffffea",
        tabBarInactiveTintColor: "#d3d3d3ff",
        // A configuração visual da barra muda aqui:
        tabBarStyle: {
          backgroundColor: "transparent", // Fundo transparente para o gradiente aparecer
          borderTopWidth: 0,              // Remove a linha superior padrão
          elevation: 0,                   // Remove a sombra padrão (Android)
          height: 50,                     // Um pouco mais de altura fica elegante (opcional)
          paddingBottom: 0,               // Ajuste para o ícone não ficar colado embaixo
        },
        // Aqui inserimos o componente de gradiente como fundo
        tabBarBackground: () => (
          <LinearGradient
            // Cores: Do seu azul original (#064ec7) para um tom mais moderno
            colors={['#064ec7', '#04358a', '#011b4aff']} 
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }} // Gradiente da Esquerda para Direita (Horizontal)
          />
        ),
      }}
    >
      <Tabs.Screen
        name="homeScreen"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="empresaScreen"
        options={{
          title: "Empresa",
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="team" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sobreScreen"
        options={{
          title: "Sobre",
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="infocirlce" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}