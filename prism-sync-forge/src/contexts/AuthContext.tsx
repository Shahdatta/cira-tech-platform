import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api-client";

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_TOKEN = "cira_tech_token";
const STORAGE_KEY_USER = "cira_tech_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted auth state on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    const savedUser = localStorage.getItem(STORAGE_KEY_USER);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    }
    setIsLoading(false);
  }, []);

  const persistAuth = (userData: AuthUser, tokenValue: string) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, tokenValue);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
    setUser(userData);
    setToken(tokenValue);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post<any>("/auth/login", { email, password });
    const userData: AuthUser = {
      id: response.id,
      email: response.email,
      full_name: response.full_name,
      role: response.role,
    };
    persistAuth(userData, response.token);
  };

  const register = async (fullName: string, email: string, password: string) => {
    const response = await api.post<any>("/auth/register", {
      full_name: fullName,
      email,
      password,
    });
    const userData: AuthUser = {
      id: response.id,
      email: response.email,
      full_name: response.full_name,
      role: response.role,
    };
    persistAuth(userData, response.token);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
