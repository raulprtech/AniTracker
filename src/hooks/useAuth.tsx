import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithCustomToken, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const inIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      const res = await fetch('/api/auth/token');
      if (res.status === 401) {
        if (inIframe()) {
          alert('Please open the app in a new tab to sign in with Google (click the arrow icon in the top right of the preview).');
          return;
        }
        window.location.href = '/.auth/login/google';
        return;
      }
      const data = await res.json();
      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
      }
    } catch (error) {
      console.error('Login error:', error);
      // Fallback to anonymous auth if everything fails
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error('Anon login error', e);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    window.location.href = '/.auth/logout';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
