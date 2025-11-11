import { Stack, Redirect } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useState, useEffect } from 'react';

export default function AuthLayout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => { // Use onAuthStateChanged
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null;

  return user ? (
    <Redirect href="/(empresa)/homeScreen" />
  ) : (
    <Stack
      screenOptions={{headerShown: false}}
    />
  );
}