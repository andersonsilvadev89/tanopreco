import { Tabs, Redirect } from "expo-router";
import { auth } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import React, { useState, useEffect } from "react";
import { FontAwesome5, MaterialCommunityIcons, AntDesign } from "@expo/vector-icons";
import { BRAND_COLORS } from "@/constants/BrandColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EmpresaLayout() {
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

  if (!user) {
    return <Redirect href="/(auth)/loginScreen" />;
  }

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
          height: 50 + insets.bottom,
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
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome5 name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="crudProdutosServicos"
        options={{
          title: "Produtos",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <MaterialCommunityIcons name="food-fork-drink" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="configuracoesScreen"
        options={{
          title: "Config",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <AntDesign name="setting" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="compartilharScreen"
        options={{
          title: "Compartilhar",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <AntDesign name="share-alt" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="duvidasScreen"
        options={{
          title: "Duvidas",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <AntDesign name="question-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}