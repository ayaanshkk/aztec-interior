// "use client";

// import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import { fetchPublic, fetchWithAuth } from "@/lib/api";

// interface User {
//   name: any;
//   id: number;
//   email: string;
//   first_name: string;
//   last_name: string;
//   full_name: string;
//   phone?: string;
//   role: string;
//   department?: string;
//   is_active: boolean;
//   is_verified: boolean;
//   created_at: string;
//   last_login?: string;
// }

// interface RegisterData {
//   email: string;
//   password: string;
//   first_name: string;
//   last_name: string;
//   phone?: string;
//   department?: string;
//   role: string;
// }

// interface AuthContextType {
//   user: User | null;
//   token: string | null;
//   loading: boolean;
//   login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
//   logout: () => void;
//   register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
//   updateUser: (userData: Partial<User>) => void;
//   checkAuth: () => Promise<boolean>;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// };

// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [token, setToken] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();

//   const clearAuth = useCallback(() => {
//     setUser(null);
//     setToken(null);
//     localStorage.removeItem("auth_token");
//     localStorage.removeItem("auth_user");
//   }, []);

//   // ✅ Initialize auth state from localStorage
//   useEffect(() => {
//     const initAuth = async () => {
//       try {
//         const storedToken = localStorage.getItem("auth_token");
//         const storedUser = localStorage.getItem("auth_user");

//         console.log("Initializing auth...", { hasToken: !!storedToken, hasUser: !!storedUser });

//         if (storedToken && storedUser) {
//           setToken(storedToken);
//           setUser(JSON.parse(storedUser));
//           console.log("Auth state restored from localStorage");
//         }
//       } catch (error) {
//         console.error("Error initializing auth:", error);
//         clearAuth();
//       } finally {
//         console.log("Auth initialization complete");
//         setLoading(false);
//       }
//     };

//     initAuth();
//   }, [clearAuth]);

//   // ✅ LOGIN - No redirects, just sets user/token
//   const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
//     try {
//       console.log("🔄 Attempting login...");

//       const response = await fetchPublic("/auth/login", {
//         method: "POST",
//         body: JSON.stringify({ email, password }),
//       });

//       let data;
//       try {
//         data = await response.json();
//       } catch (e) {
//         console.error("Failed to parse JSON response:", e);
//         return { success: false, error: "Server returned an invalid response (not JSON)." };
//       }

//       console.log("📡 Login response:", { status: response.status, data });

//       if (response.ok) {
//         console.log("✅ Login successful, setting auth state...");
//         setToken(data.token);
//         setUser(data.user);

//         localStorage.setItem("auth_token", data.token);
//         localStorage.setItem("auth_user", JSON.stringify(data.user));

//         console.log("💾 Auth state saved to localStorage");

//         // ⚠️ No redirect — stays on current page
//         return { success: true };
//       } else {
//         console.log("❌ Login failed:", data.error);
//         return { success: false, error: data.error || "Login failed" };
//       }
//     } catch (error) {
//       console.error("🚨 Login network/fetch error:", error);
//       return { success: false, error: "Cannot connect to server. Please ensure the backend is running." };
//     }
//   };

//   // ✅ REGISTER - No redirects
//   const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
//     try {
//       console.log("🔄 Attempting registration...");

//       const response = await fetchPublic("/auth/register", {
//         method: "POST",
//         body: JSON.stringify(userData),
//       });

//       let data;
//       try {
//         data = await response.json();
//       } catch (e) {
//         console.error("Failed to parse JSON response:", e);
//         return { success: false, error: "Server returned an invalid response (not JSON)." };
//       }

//       console.log("📡 Registration response:", { status: response.status, data });

//       if (response.ok) {
//         console.log("✅ Registration successful");
//         return { success: true };
//       } else {
//         console.log("❌ Registration failed:", data.error);
//         return { success: false, error: data.error || "Registration failed" };
//       }
//     } catch (error) {
//       console.error("🚨 Registration network error:", error);
//       return { success: false, error: "Cannot connect to server. Please try again." };
//     }
//   };

//   // ✅ LOGOUT - Only redirect when explicitly logging out
//   const logout = async () => {
//     console.log("Logging out...");
//     clearAuth();
//     router.replace("/login");
//   };

//   // ✅ AUTH CHECK - No redirects on failure
//   const checkAuth = async (): Promise<boolean> => {
//     if (!token) return false;

//     try {
//       const response = await fetchWithAuth("/auth/me");

//       if (response.ok) {
//         const data = await response.json();
//         setUser(data.user);
//         localStorage.setItem("auth_user", JSON.stringify(data.user));
//         return true;
//       } else {
//         clearAuth();
//         return false;
//       }
//     } catch (error) {
//       console.error("Auth check network error:", error);
//       clearAuth();
//       return false;
//     }
//   };

//   const updateUser = (userData: Partial<User>) => {
//     if (user) {
//       const updatedUser = { ...user, ...userData };
//       setUser(updatedUser);
//       localStorage.setItem("auth_user", JSON.stringify(updatedUser));
//     }
//   };

//   const value = {
//     user,
//     token,
//     loading,
//     login,
//     logout,
//     register,
//     updateUser,
//     checkAuth,
//   };

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// };


"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// =====================================================================
// 1. CENTRALIZED BASE CONFIGURATION & HELPER FUNCTIONS (Previously in @/lib/api)
// =====================================================================

// NOTE: BASE_PATH and BACKEND_URL are assumed to be defined as environment variables
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://aztec-interiors.onrender.com";

// Auth uses Next.js API routes (assumed to be relative to the frontend)
const AUTH_API_ROOT = `${BASE_PATH}/api`;

// Data uses external backend
const DATA_API_ROOT = BACKEND_URL;

// 🔍 DEBUG: Log the configuration
if (typeof window !== 'undefined') {
  console.log('🌐 API Configuration:', {
    BASE_PATH,
    AUTH_API_ROOT,
    DATA_API_ROOT,
  });
}

// ✅ FIXED Helper function to redirect to login with basePath support
function redirectToLogin() {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    const loginPath = `${BASE_PATH}/login`;
    
    // 🔥 FIX: Only redirect if the current path is NOT the login page.
    // This breaks the infinite loop when a protected component tries to redirect
    // while the browser is already loading the login page.
    if (!currentPath.startsWith(loginPath)) {
      console.log(`REDIRECT: Forcing navigation to ${loginPath}`);
      window.location.href = loginPath;
    } else {
      console.log(`REDIRECT: Already on login page (${currentPath}). Preventing recursive redirect.`);
    }
  }
}

// ✅ Helper to add timeout to fetch calls
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Helper function for PUBLIC API calls (no authentication required)
 * Used for login/register - calls Next.js API routes
 */
export async function fetchPublic(path: string, options: RequestInit = {}) {
  const url = `${AUTH_API_ROOT}${path.startsWith("/") ? "" : "/"}${path}`;

  console.log('📡 fetchPublic calling:', url);

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

/**
 * Helper function to make authenticated API calls
 * Used for data endpoints - calls external Render backend
 */
export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;

  const url = `${DATA_API_ROOT}${path.startsWith("/") ? "" : "/"}${path}`;

  console.log('📡 fetchWithAuth calling:', url);

  if (!token) {
    console.error("No auth token found. Triggering redirect check.");
    // This is the first layer of the redirect: if no token exists
    redirectToLogin();
    throw new Error("Not authenticated");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  try {
    // ✅ Add 5-second timeout
    const response = await fetchWithTimeout(url, {
      ...options,
      headers,
    }, 5000);

    // ✅ If the token is invalid (401), clear the token and let the next check handle the redirect.
    if (response.status === 401) {
      console.warn("⚠️ Got 401 from backend - clearing token and allowing ProtectedRoute to redirect.");
      if (typeof window !== 'undefined') {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
      // Re-throw so the calling AuthContext.checkAuth can handle it.
      throw new Error("Token invalid/expired");
    }

    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error("⏱️ Request timeout - backend not responding");
      throw new Error("Request timeout");
    }
    throw error;
  }
}

// ✅ Helper to handle API responses gracefully (copied from previous prompt)
async function handleApiResponse(response: Response) {
  // We handle 401 inside fetchWithAuth now, so this case is mostly for public/login APIs
  // or non-redirected errors
  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error with status ${response.status}`);
    } else {
      const errorText = await response.text();
      console.error("Non-JSON error response:", errorText);
      throw new Error(`API failed with status ${response.status}`);
    }
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  } else {
    return { success: true };
  }
}

// Example usage functions for data calls
export const api = {
  // AUTH ENDPOINTS (use fetchPublic - calls Next.js API routes)
  async login(email: string, password: string) {
    const response = await fetchPublic("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return handleApiResponse(response);
  },

  async register(userData: Omit<User, 'id'| 'email'> & { email: string; password: string; }) {
    const response = await fetchPublic("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return handleApiResponse(response);
  },

  // DATA ENDPOINTS (use fetchWithAuth - calls Render backend)
  async getCustomers() {
    try {
      const response = await fetchWithAuth("/customers");
      return await handleApiResponse(response);
    } catch (error) {
      console.warn("⚠️ getCustomers failed, returning empty data");
      // IMPORTANT: If fetchWithAuth throws due to missing token, the AuthProvider/ProtectedRoute handles redirect
      return { customers: [] };
    }
  },

  async getJobs() {
    try {
      const response = await fetchWithAuth("/jobs");
      return await handleApiResponse(response);
    } catch (error) {
      console.warn("⚠️ getJobs failed, returning empty data");
      return { jobs: [] };
    }
  },

  async getPipeline() {
    try {
      const response = await fetchWithAuth("/pipeline");
      return await handleApiResponse(response);
    } catch (error) {
      console.warn("⚠️ getPipeline failed, returning empty data");
      return { pipeline: [] };
    }
  },

  async updateCustomerStage(customerId: string, stage: string, reason: string, updatedBy: string) {
    const response = await fetchWithAuth(`/customers/${customerId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage, reason, updated_by: updatedBy }),
    });
    return handleApiResponse(response);
  },

  async updateJobStage(jobId: string, stage: string, reason: string, updatedBy: string) {
    const response = await fetchWithAuth(`/jobs/${jobId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage, reason, updated_by: updatedBy }),
    });
    return handleApiResponse(response);
  },
};

// =====================================================================
// 2. AUTH CONTEXT IMPLEMENTATION
// =====================================================================

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  role: string;
  department?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login?: string;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  department?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
  }, []);

  // ✅ Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window === 'undefined') return;

        const storedToken = localStorage.getItem("auth_token");
        const storedUser = localStorage.getItem("auth_user");

        console.log("Initializing auth...", { hasToken: !!storedToken, hasUser: !!storedUser });

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          console.log("Auth state restored from localStorage");
        } else {
          // If a token is missing, ensure we start clean
          clearAuth();
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

  // ✅ LOGIN - Sets user/token
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("🔄 Attempting login...");
      const { token: newToken, user: newUser, error } = await api.login(email, password);

      if (newToken && newUser) {
        console.log("✅ Login successful, setting auth state...");
        setToken(newToken);
        setUser(newUser);

        if (typeof window !== 'undefined') {
          localStorage.setItem("auth_token", newToken);
          localStorage.setItem("auth_user", JSON.stringify(newUser));
        }
        console.log("💾 Auth state saved to localStorage");
        return { success: true };
      } else {
        console.log("❌ Login failed:", error);
        return { success: false, error: error || "Login failed" };
      }
    } catch (error: any) {
      console.error("🚨 Login network/fetch error:", error);
      return { success: false, error: error.message || "Cannot connect to server." };
    }
  };


  // ✅ LOGOUT - Redirects to login
  const logout = async () => {
    console.log("Logging out...");
    clearAuth();
    router.replace("/login");
  };

  // ✅ AUTH CHECK - Clears auth if check fails
  const checkAuth = async (): Promise<boolean> => {
    if (!token) return false;

    try {
      // Use fetchWithAuth which contains the token validation logic and potential 401 handling
      const response = await fetchWithAuth("/auth/me"); 
      const data = await handleApiResponse(response);
      
      if (data.user) {
        setUser(data.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem("auth_user", JSON.stringify(data.user));
        }
        return true;
      }
      return false;
    } catch (error) {
      // If fetchWithAuth throws (due to timeout or 401), we clear the auth state
      console.error("Auth check failed, clearing state:", error);
      clearAuth(); 
      return false;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      }
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    register: api.register, // Assuming this logic doesn't need context state changes
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};