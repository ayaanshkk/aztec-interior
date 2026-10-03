"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";

type ChecklistType = "kitchen" | "bedroom" | "remedial";

interface Customer { id: string; name: string; address: string; phone: string; email: string; }

interface CtxValue {
  openChecklist: (type: ChecklistType) => void;
}

const Ctx = createContext<CtxValue>({ openChecklist: () => {} });

export function useChecklistModal() { return useContext(Ctx); }

export function ChecklistModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [type, setType]           = useState<ChecklistType>("kitchen");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingC, setLoadingC]   = useState(false);
  const [selected, setSelected]   = useState("");
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const openChecklist = useCallback((t: ChecklistType) => {
    setType(t);
    setSelected("");
    setError("");
    setBusy(false);
    setOpen(true);
  }, []);

  // Load customers once on first open
  useEffect(() => {
    if (!open || customers.length > 0) return;
    setLoadingC(true);
    fetchWithAuth("form/customers")
      .then(r => r.ok ? r.json() : [])
      .then(d => setCustomers(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingC(false));
  }, [open]);

  const launch = async (customer: Customer) => {
    setBusy(true); setError("");
    try {
      const res  = await fetchWithAuth(`form/customers/${customer.id}/generate-form-link`, {
        method: "POST",
        body: JSON.stringify({ formType: type }),
      });
      const data = await res.json();
      if (data.success) {
        const p = new URLSearchParams({
          type, customerId: customer.id,
          customerName: customer.name, customerAddress: customer.address,
          customerPhone: customer.phone, customerEmail: customer.email || "",
        });
        setOpen(false);
        // Clear stale draft so the form starts fresh
        try {
          const key = `checklist_draft_${type}`;
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
        } catch {}
        router.push(`/form/${data.token}?${p.toString()}`);
      } else {
        setError(data.error || "Failed to generate link.");
        setBusy(false);
      }
    } catch { setError("Network error."); setBusy(false); }
  };

  const handleConfirm = async () => {
    const c = customers.find(c => c.id === selected);
    if (!c) { setError("Please select a customer."); return; }
    await launch(c);
  };

  const handleNewCustomer = () => {
    setOpen(false);
    // Clear any stale draft so the new form starts blank
    try {
      const key = `checklist_draft_${type}`;
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch {}
    router.push(`/form/walkin?type=${type}&mode=walkin`);
  };

  return (
    <Ctx.Provider value={{ openChecklist }}>
      {children}

      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={e => { if (e.target === overlayRef.current) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">
                {type === "kitchen" ? "Kitchen" : type === "bedroom" ? "Bedroom" : "Remedial Action"} Checklist
              </h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            {/* Customer dropdown */}
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Customer</label>
            {loadingC ? (
              <p className="text-sm text-gray-400 mb-3">Loading customers…</p>
            ) : (
              <select
                value={selected}
                onChange={e => { setSelected(e.target.value); setError(""); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">— Select customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
                ))}
              </select>
            )}

            {/* Divider + New customer link */}
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <button
              onClick={handleNewCustomer}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors text-center"
            >
              + New customer
            </button>

            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

            <button
              onClick={handleConfirm}
              disabled={busy || !selected}
              className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors mt-3"
            >
              {busy ? "Opening…" : "Open Checklist"}
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
