import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

interface User {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  deviceId: string | null;
}

const DEVICE_ID_KEY = 'app_unique_device_id';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getOrCreateDeviceId = async (): Promise<string> => {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (!id) {
      id = uuidv4();
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      console.log("Device ID gerado e salvo em AsyncStorage: ", id);
    } else {
      console.log("Device ID recuperado do AsyncStorage: ", id);
    }
    return id;
  } catch (error) {
    console.error("ERRO FATAL ao carregar/salvar Device ID. Gerando temporário.", error);
    return uuidv4();
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingDeviceId, setLoadingDeviceId] = useState(true);

  useEffect(() => {
    const loadDeviceId = async () => {
      try {
        const id = await getOrCreateDeviceId();
        setDeviceId(id);
      } catch (error) {
        console.error("Falha ao carregar Device ID:", error);
      } finally {
        setLoadingDeviceId(false);
      }
    };

    const checkAuthStatus = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoadingAuth(false);
    };

    loadDeviceId();
    checkAuthStatus();

  }, []);

  const loading = loadingAuth || loadingDeviceId;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        deviceId
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};