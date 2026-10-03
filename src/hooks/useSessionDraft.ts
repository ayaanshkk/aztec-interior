"use client";
import { useEffect, useRef, useCallback } from "react";

/**
 * Auto-saves a snapshot of form state to sessionStorage (keyed by page path).
 * Persists across page refreshes within the same browser session.
 * Returns helpers to restore and clear the draft.
 */
export function useSessionDraft(key: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(
    (data: object) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem(`draft:${key}`, JSON.stringify(data));
        } catch {}
      }, 1500);
    },
    [key],
  );

  const loadDraft = useCallback((): Record<string, unknown> | null => {
    try {
      const raw = sessionStorage.getItem(`draft:${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(`draft:${key}`);
    } catch {}
  }, [key]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { saveDraft, loadDraft, clearDraft };
}
