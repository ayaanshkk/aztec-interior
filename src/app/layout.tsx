import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { NotificationProvider } from "@/contexts/NotificationContext"; // ✅ Add this

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aztec Interiors CRM",
  description: "Customer relationship management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <PreferencesStoreProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </PreferencesStoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}