import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Tipagem para o valor do nosso contexto
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// Criando o contexto com um valor padrão
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// Componente Provedor
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authenticatedUser) => {
      setUser(authenticatedUser);
      setLoading(false);
    });

    // Limpa o listener quando o componente é desmontado
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook customizado para facilitar o uso do contexto
export const useAuth = () => {
  return useContext(AuthContext);
};