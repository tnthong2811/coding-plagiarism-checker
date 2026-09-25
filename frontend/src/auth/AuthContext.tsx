import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  completeTemporaryPassword as completeTemporaryPasswordApi,
  login as loginApi,
  me as meApi,
  register as registerApi,
  updateMyAvatar as updateMyAvatarApi,
  updateMyUsername as updateMyUsernameApi
} from "../api/authApi";
import type { LoginRequest, RegisterRequest, TemporaryPasswordRequest, UserProfile } from "../types/auth";

interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  loading: boolean;
  login: (payload: LoginRequest) => Promise<UserProfile>;
  completeOAuthLogin: (token: string) => Promise<UserProfile>;
  completeTemporaryPassword: (payload: TemporaryPasswordRequest) => Promise<UserProfile>;
  updateUsername: (username: string) => Promise<UserProfile>;
  updateAvatar: (avatarUrl: string | null) => Promise<UserProfile>;
  register: (payload: RegisterRequest) => Promise<string>;
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

  const completeOAuthLogin = useCallback(async (nextToken: string) => {
    try {
      const profile = await meApi(nextToken);
      localStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      setUser(profile);
      return profile;
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      throw err;
    }
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const response = await loginApi(payload);
    return completeOAuthLogin(response.token);
  }, [completeOAuthLogin]);

  const completeTemporaryPassword = useCallback(async (payload: TemporaryPasswordRequest) => {
    const response = await completeTemporaryPasswordApi(payload);
    return completeOAuthLogin(response.token);
  }, [completeOAuthLogin]);

  const updateUsername = useCallback(async (username: string) => {
    if (!token) {
      throw new Error("Not authenticated");
    }
    const response = await updateMyUsernameApi(token, { username });
    localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }, [token]);

  const updateAvatar = useCallback(async (avatarUrl: string | null) => {
    if (!token) {
      throw new Error("Not authenticated");
    }
    const profile = await updateMyAvatarApi(token, { avatarUrl });
    setUser(profile);
    return profile;
  }, [token]);

  async function register(payload: RegisterRequest) {
    const response = await registerApi(payload);
    return response.message;
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
    () => ({
      token,
      user,
      loading,
      login,
      completeOAuthLogin,
      completeTemporaryPassword,
      updateUsername,
      updateAvatar,
      register,
      logout,
      refreshMe
    }),
    [token, user, loading, login, completeOAuthLogin, completeTemporaryPassword, updateUsername, updateAvatar]
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

