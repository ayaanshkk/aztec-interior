"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log("ProtectedRoute state:", { loading, user: !!user, token: !!token });

    if (!loading) {
      // Wait for AuthContext to finish loading
      if (!user || !token) {
        console.log("No auth, redirecting to login");
        router.replace("/login");
        return;
      }

      if (requiredRole && user.role !== requiredRole) {
        console.log("Insufficient role, redirecting to unauthorized");
        router.replace("/unauthorized");
        return;
      }

      console.log("Auth check passed, showing protected content");
      setIsReady(true);
    }
  }, [loading, user, token, requiredRole, router]);

  // Don't render anything until auth is fully initialized
  if (loading || !isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return <>{children}</>;
}
