import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, setTokens, clearTokens } from "../api/client";

interface Admin {
  id: number;
  email: string;
  nombre: string | null;
  commerceId: number | null;
  role: string;
  impersonating?: boolean;
}

interface AuthContextType {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasToken = (() => { try { return localStorage.getItem("accessToken"); } catch { return null; } })();
    if (hasToken) {
      api<Admin>("/api/auth/me")
        .then(setAdmin)
        .catch(() => clearTokens())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ accessToken: string; refreshToken: string; admin: Admin }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.accessToken, data.refreshToken);
    setAdmin(data.admin);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setAdmin(null);
  }, []);

  const refreshAdmin = useCallback(async () => {
    try {
      const a = await api<Admin>("/api/auth/me");
      setAdmin(a);
    } catch {
      clearTokens();
      setAdmin(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, refreshAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
