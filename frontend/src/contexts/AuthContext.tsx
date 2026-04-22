import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for E2E bypass token (only enabled in dev/test)
    const isBypassEnabled = import.meta.env.VITE_ENABLE_AUTH_BYPASS === 'true';
    const bypassToken = localStorage.getItem('E2E_BYPASS_TOKEN');
    
    if (isBypassEnabled && bypassToken) {
      setUser({
        uid: 'e2e-bypass-user',
        email: 'e2e@example.com',
        displayName: 'E2E Bypass User',
        getIdToken: async () => bypassToken,
      } as any);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
