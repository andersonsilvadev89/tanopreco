import { Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { ActivityIndicator, View, Text, Alert } from "react-native";
import React, { useEffect, useState } from "react";

export default function EmpresaScreen() {
  const { user, loading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/loginScreen" />;
  }
  return <Redirect href="/(empresa)/homeScreen" />;
}
