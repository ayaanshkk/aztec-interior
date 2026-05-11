// CREATE THIS FILE: src/components/AuthProviderCheck.tsx
// Add this to your root layout to verify AuthProvider is working

"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function AuthProviderCheck() {
  const authContext = useAuth();

  useEffect(() => {
    console.log("=" .repeat(60));
    console.log("🔍 AUTH PROVIDER CHECK");
    console.log("=" .repeat(60));
    
    if (!authContext) {
      console.error("❌ CRITICAL: AuthContext is undefined!");
      console.error("❌ This means AuthProvider is NOT wrapping the app!");
      console.error("❌ Check src/app/layout.tsx - AuthProvider must wrap {children}");
    } else {
      console.log("✅ AuthProvider is working");
      console.log("📊 Auth State:", {
        loading: authContext.loading,
        hasUser: !!authContext.user,
        hasToken: !!authContext.token,
        user: authContext.user ? {
          id: authContext.user.id,
          username: authContext.user.username,
          role: authContext.user.role,
        } : null,
      });
    }
    
    console.log("=" .repeat(60));
  }, [authContext]);

  // This component renders nothing - it's just for diagnostics
  return null;
}