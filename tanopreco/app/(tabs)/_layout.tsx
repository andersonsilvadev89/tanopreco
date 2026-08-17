import { Tabs } from "expo-router";
import { auth } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import React, { useState, useEffect } from "react";
import { FontAwesome5, AntDesign } from "@expo/vector-icons";
import { BRAND_COLORS } from "@/constants/BrandColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

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
        // Mantem a barra acima da navegacao do aparelho e com altura mais compacta.
        tabBarStyle: {
          backgroundColor: BRAND_COLORS.primary,
          borderTopWidth: 0,
          elevation: 0,
          height: 40 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: 2,
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
      <Tabs.Screen
        name="compartilharScreen"
        options={{
          title: "Compartilhar",
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="share-alt" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="duvidasScreen"
        options={{
          title: "Duvidas",
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="question-circle" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}