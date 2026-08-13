import { Stack, Redirect } from 'expo-router';
import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return user ? (
    <Redirect href="/(empresa)/homeScreen" />
  ) : (
    <Stack
      screenOptions={{headerShown: false}}
    />
  );
}