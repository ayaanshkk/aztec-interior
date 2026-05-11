"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  const [initialized, setInitialized] = useState(false); // ✅ Track initialization
  const router = useRouter();
  const pathname = usePathname();

  const clearAuth = useCallback(() => {
    console.log("🧹 Clearing auth state");
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Clear cookie if you're using Option 1
      document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }, []);

  // Initialize auth state from localStorage - ONLY ONCE
  useEffect(() => {
    if (initialized) return; // ✅ Prevent re-initialization

    const initAuth = async () => {
      console.log("🔄 Initializing auth from localStorage...");
      
      try {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        console.log("📦 Storage check:", { 
          hasToken: !!storedToken, 
          hasUser: !!storedUser,
          tokenPreview: storedToken?.substring(0, 20) + "..."
        });

        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log("✅ Parsed user:", parsedUser);
            
            setToken(storedToken);
            setUser(parsedUser);
            console.log("✅ Auth state restored from localStorage");
          } catch (parseError) {
            console.error("❌ Failed to parse user data:", parseError);
            clearAuth();
          }
        } else {
          console.log("⚠️ No auth data in localStorage");
        }
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
        clearAuth();
      } finally {
        console.log("✅ Auth initialization complete");
        setLoading(false);
        setInitialized(true); // ✅ Mark as initialized
      }
    };

    initAuth();
  }, [initialized, clearAuth]); // ✅ Depend on initialized

  // ✅ Redirect to login if not authenticated on protected routes
  useEffect(() => {
    if (!loading && !user && pathname?.startsWith('/dashboard')) {
      console.log("❌ Not authenticated, redirecting to login");
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  // LOGIN - username/password
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("🔄 Attempting login...");

      const data = await api.login(username, password);

      console.log("✅ Login API response:", data);
      console.log("✅ Login successful, setting auth state...");
      
      // ✅ Set state first
      setToken(data.token);
      setUser(data.user);

      // ✅ Then save to localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // ✅ Set cookie for middleware (Option 1)
      document.cookie = `auth-token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      console.log("💾 Auth state saved:", {
        token: data.token.substring(0, 20) + "...",
        user: data.user
      });

      return { success: true };
    } catch (error: any) {
      console.error("🚨 Login error:", error);
      return { success: false, error: error.message || "Login failed" };
    }
  };

  // LOGOUT
  const logout = async () => {
    console.log("🚪 Logging out...");
    clearAuth();
    router.replace("/login");
  };

  // AUTH CHECK
  const checkAuth = async (): Promise<boolean> => {
    if (!token) {
      console.log("❌ No token, checkAuth failed");
      return false;
    }

    try {
      console.log("🔄 Checking auth with API...");
      const data = await api.getCurrentUser();
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      console.log("✅ Auth check successful");
      return true;
    } catch (error) {
      console.error("❌ Auth check error:", error);
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