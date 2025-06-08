import { Stack, Redirect } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged
import React, { useState, useEffect } from 'react'; // Import useState and useEffect

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
    <Redirect href="/(tabs)/homeScreen" />
  ) : (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}