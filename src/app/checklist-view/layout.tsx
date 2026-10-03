"use client";
import { ChecklistModalProvider } from "@/contexts/ChecklistModalContext";

export default function ChecklistViewLayout({ children }: { children: React.ReactNode }) {
  return <ChecklistModalProvider>{children}</ChecklistModalProvider>;
}
