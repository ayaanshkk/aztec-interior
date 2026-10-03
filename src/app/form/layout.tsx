"use client";

import { ChecklistModalProvider } from "@/contexts/ChecklistModalContext";

export default function FormLayout({ children }: { children: React.ReactNode }) {
  return <ChecklistModalProvider>{children}</ChecklistModalProvider>;
}
