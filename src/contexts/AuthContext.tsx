"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface User {
  id: number;
  username: string;
  employee_id: number;
  employee_name: string;
  email: string;
  tenant_id: string;
  role: string;
  role_id: number;
  is_platform_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        console.log("Initializing auth...", { hasToken: !!storedToken, hasUser: !!storedUser });

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          console.log("Auth state restored from localStorage");
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        clearAuth();
      } finally {
        console.log("Auth initialization complete");
        setLoading(false);
      }
    };

    initAuth();
  }, [clearAuth]);

  // LOGIN - username/password
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("🔄 Attempting login...");

      const data = await api.login(username, password);

      console.log("✅ Login successful, setting auth state...");
      setToken(data.token);
      setUser(data.user);

      // Save to localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      console.log("💾 Auth state saved to localStorage");

      return { success: true };
    } catch (error: any) {
      console.error("🚨 Login error:", error);
      return { success: false, error: error.message || "Login failed" };
    }
  };

  // LOGOUT
  const logout = async () => {
    console.log("Logging out...");
    clearAuth();
    router.replace("/login");
  };

  // AUTH CHECK
  const checkAuth = async (): Promise<boolean> => {
    if (!token) return false;

    try {
      const data = await api.getCurrentUser();
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      return true;
    } catch (error) {
      console.error("Auth check error:", error);
      clearAuth();
      return false;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};