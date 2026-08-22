  import { router } from "expo-router";
  import { useAuth } from "../../context/AuthContext";
  import { ActivityIndicator, View } from "react-native";
  import React, { useCallback } from "react";
  import { useFocusEffect } from "@react-navigation/native";

  export default function EmpresaScreen() {
    const { user, loading } = useAuth();

    useFocusEffect(
      useCallback(() => {
        if (loading) return;

        if (!user) {
          router.replace("/(auth)/loginScreen");
          return;
        }

        router.replace("/(empresa)/homeScreen");
      }, [loading, user])
    );

    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
