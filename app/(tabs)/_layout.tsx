import { Tabs, Redirect } from "expo-router";
import { auth } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import React, { useState, useEffect } from "react";
import { FontAwesome5, AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";

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
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#ffffffea", tabBarInactiveTintColor:"#d3d3d3ff", tabBarStyle: {
          backgroundColor: "#064ec7"},}}> 
      <Tabs.Screen
        name="homeScreen"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome5 name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="empresaScreen"
        options={{
          title: "Empresa",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <AntDesign name="team" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sobreScreen"
        options={{
          title: "Sobre",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <AntDesign name="infocirlce" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}