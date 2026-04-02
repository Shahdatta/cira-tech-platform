import { useState, useCallback } from "react";
import { api } from "@/lib/api-client";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Calling our newly created .NET AuthController
      const response = await api.post<any>("/auth/login", { email, password });
      
      if (response && response.token) {
        localStorage.setItem("cira_tech_token", response.token);
        localStorage.setItem("cira_tech_user", JSON.stringify(response));
        window.location.href = "/"; // Redirect to dashboard
      }
    } catch (err: any) {
      setError(err.message || "Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cira_tech_token");
    localStorage.removeItem("cira_tech_user");
    window.location.href = "/";
  }, []);

  const getCurrentUser = useCallback(() => {
    const user = localStorage.getItem("cira_tech_user");
    return user ? JSON.parse(user) : null;
  }, []);

  const isAuthenticated = !!localStorage.getItem("cira_tech_token");

  return { login, logout, getCurrentUser, isAuthenticated, isLoading, error };
}
