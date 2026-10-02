"use client";

import { ChecklistModalProvider } from "@/contexts/ChecklistModalContext";

export function ChecklistModalWrapper({ children }: { children: React.ReactNode }) {
  return <ChecklistModalProvider>{children}</ChecklistModalProvider>;
}
