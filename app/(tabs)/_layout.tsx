import { Tabs, Redirect } from "expo-router";
import { auth } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import React, { useState, useEffect } from "react";
import {
  Home,
  MapPin,
  Settings,
  Radio,
  Sandwich,
  Users,
  Briefcase,
  Shield,
  CircleHelp,
  Toilet,
} from "lucide-react-native";

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

  if (!user) {
    return <Redirect href="/(auth)/loginScreen" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="homeScreen"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="localizacaoUsuariosScreen"
        options={{
          title: "Amigos",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="mapaAmigosScreen"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="produtosServicosScreen"
        options={{
          title: "Produtos",
          tabBarIcon: ({ color, size }) => (
            <Sandwich color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="servicosEssenciaisScreen"
        options={{
          title: "Serviços",
          tabBarIcon: ({ color, size }) => <Toilet color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="lineUpScreen"
        options={{
          title: "LineUp",
          tabBarIcon: ({ color, size }) => <Radio color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="empresaScreen"
        options={{
          title: "Empresa",
          tabBarIcon: ({ color, size }) => (
            <Briefcase color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="adminScreen"
        options={{
          title: "Admin",
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="configuracoesScreen"
        options={{
          title: "Config",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sobreScreen"
        options={{
          title: "Sobre",
          tabBarIcon: ({ color, size }) => (
            <CircleHelp color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}