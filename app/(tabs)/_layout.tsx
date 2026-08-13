import { Tabs } from "expo-router";
import { auth } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import React, { useState, useEffect } from "react";
import { FontAwesome5, AntDesign } from "@expo/vector-icons";
import { BRAND_COLORS } from "@/constants/BrandColors";

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
        tabBarActiveTintColor: BRAND_COLORS.white,
        tabBarInactiveTintColor: BRAND_COLORS.tabInactive,
        // A configuração visual da barra muda aqui:
        tabBarStyle: {
          backgroundColor: BRAND_COLORS.primary, // Fundo transparente para o gradiente aparecer
          borderTopWidth: 0,              // Remove a linha superior padrão
          elevation: 0,                   // Remove a sombra padrão (Android)
          height: 50,                     // Um pouco mais de altura fica elegante (opcional)
          paddingBottom: 0,               // Ajuste para o ícone não ficar colado embaixo
        },
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
            <AntDesign name="info-circle" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}