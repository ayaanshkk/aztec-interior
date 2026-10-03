"use client";
import React from "react";
import { ChecklistModalProvider } from "@/contexts/ChecklistModalContext";

export default function RemedialViewLayout({ children }: { children: React.ReactNode }) {
  return <ChecklistModalProvider>{children}</ChecklistModalProvider>;
}
