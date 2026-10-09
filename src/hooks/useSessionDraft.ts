"use client";
import { useEffect, useRef, useCallback } from "react";

/**
 * Auto-saves form state to localStorage (persists across refreshes and browser sessions).
 * Flushes synchronously on beforeunload so even an immediate refresh captures the latest state.
 */
export function useSessionDraft(key: string) {
  const latestDataRef = useRef<object | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `draft:${key}`;

  // Flush synchronously — used by beforeunload
  const flush = useCallback(() => {
    if (!latestDataRef.current) return;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    try { localStorage.setItem(storageKey, JSON.stringify(latestDataRef.current)); } catch {}
  }, [storageKey]);

  // Debounced save (1 s) but always flushes on unload
  const saveDraft = useCallback((data: object) => {
    latestDataRef.current = data;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
    }, 1000);
  }, [storageKey]);

  const loadDraft = useCallback((): Record<string, unknown> | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    latestDataRef.current = null;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    try { localStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  // Flush latest data synchronously before the page unloads
  useEffect(() => {
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flush]);

  return { saveDraft, loadDraft, clearDraft };
}
