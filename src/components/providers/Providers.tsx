"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext"; // ✅ Add this import

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider> {/* ✅ Add this wrapper */}
        {children}
      </NotificationProvider>
    </AuthProvider>
  );
}