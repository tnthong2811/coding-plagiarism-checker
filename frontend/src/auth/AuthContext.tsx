import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { login as loginApi, me as meApi, register as registerApi } from "../api/authApi";
import type { LoginRequest, RegisterRequest, UserProfile } from "../types/auth";

interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  loading: boolean;
  login: (payload: LoginRequest) => Promise<UserProfile>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "auth_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await meApi(token);
        if (active) {
          setUser(profile);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [token]);

  async function login(payload: LoginRequest) {
    const response = await loginApi(payload);
    setToken(response.token);
    localStorage.setItem(TOKEN_KEY, response.token);
    const profile = await meApi(response.token);
    setUser(profile);
    return profile;
  }

  async function register(payload: RegisterRequest) {
    await registerApi(payload);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  async function refreshMe() {
    if (!token) {
      setUser(null);
      return;
    }
    const profile = await meApi(token);
    setUser(profile);
  }

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, loading, login, register, logout, refreshMe }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

