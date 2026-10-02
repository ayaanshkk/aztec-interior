"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BACKEND_URL } from "@/lib/api";
import { fetchWithAuth } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

export default function ChecklistLaunchPage() {
  const { type } = useParams<{ type: string }>();
  const router = useRouter();

  const formType = type === "bedroom" ? "bedroom" : "kitchen";
  const label = formType === "bedroom" ? "Bedroom" : "Kitchen";

  // Mode: 'existing' or 'new'
  const [mode, setMode] = useState<"existing" | "new" | null>(null);

  // Existing customer flow
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  // New customer flow
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", address: "" });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoadingCustomers(true);
    fetchWithAuth("form/customers")
      .then(r => r.ok ? r.json() : [])
      .then(data => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, []);

  const launchChecklist = async (customer: Customer) => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetchWithAuth(`form/customers/${customer.id}/generate-form-link`, {
        method: "POST",
        body: JSON.stringify({ formType }),
      });
      const data = await res.json();
      if (data.success) {
        const params = new URLSearchParams({
          type:            formType,
          customerId:      customer.id,
          customerName:    customer.name,
          customerAddress: customer.address,
          customerPhone:   customer.phone,
          customerEmail:   customer.email || "",
        });
        router.push(`/form/${data.token}?${params.toString()}`);
      } else {
        setError(data.error || "Failed to generate link.");
        setGenerating(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setGenerating(false);
    }
  };

  const handleExistingConfirm = () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) { setError("Please select a customer."); return; }
    launchChecklist(customer);
  };

  const handleNewConfirm = async () => {
    if (!newCustomer.name.trim()) { setError("Customer name is required."); return; }
    if (!newCustomer.phone.trim()) { setError("Phone number is required."); return; }
    setCreatingCustomer(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name:    newCustomer.name.trim(),
          phone:   newCustomer.phone.trim(),
          email:   newCustomer.email.trim(),
          address: newCustomer.address.trim(),
          stage:   "Lead",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create customer."); setCreatingCustomer(false); return; }
      // Use new customer id + details
      const created: Customer = {
        id:      String(data.customer?.id),
        name:    newCustomer.name.trim(),
        address: newCustomer.address.trim(),
        phone:   newCustomer.phone.trim(),
        email:   newCustomer.email.trim(),
      };
      setCreatingCustomer(false);
      launchChecklist(created);
    } catch {
      setError("Network error. Please try again.");
      setCreatingCustomer(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">

        {/* Header */}
        <h1 className="text-xl font-semibold text-gray-900 mb-1">{label} Checklist</h1>
        <p className="text-sm text-gray-500 mb-7">Choose how to start this checklist.</p>

        {/* Mode selection */}
        {!mode && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setMode("existing"); setError(""); }}
              className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
            >
              <span className="font-semibold">Existing customer</span>
              <span className="block text-xs text-gray-400 mt-0.5">Select from your customer list</span>
            </button>
            <button
              onClick={() => { setMode("new"); setError(""); }}
              className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
            >
              <span className="font-semibold">New customer</span>
              <span className="block text-xs text-gray-400 mt-0.5">Fill in details and save to your customer list</span>
            </button>
          </div>
        )}

        {/* Existing customer flow */}
        {mode === "existing" && (
          <div>
            <button onClick={() => setMode(null)} className="text-xs text-gray-400 hover:text-gray-600 mb-5 flex items-center gap-1">
              ← Back
            </button>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select customer</label>
            {loadingCustomers ? (
              <p className="text-sm text-gray-400">Loading customers…</p>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={e => { setSelectedCustomerId(e.target.value); setError(""); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">— Choose a customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
                ))}
              </select>
            )}
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <button
              onClick={handleExistingConfirm}
              disabled={generating || !selectedCustomerId}
              className="mt-5 w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {generating ? "Opening checklist…" : "Open Checklist"}
            </button>
          </div>
        )}

        {/* New customer flow */}
        {mode === "new" && (
          <div>
            <button onClick={() => setMode(null)} className="text-xs text-gray-400 hover:text-gray-600 mb-5 flex items-center gap-1">
              ← Back
            </button>
            <div className="flex flex-col gap-3">
              {[
                { key: "name",    label: "Full name *",      placeholder: "e.g. John Smith" },
                { key: "phone",   label: "Phone *",          placeholder: "e.g. 07700 900000" },
                { key: "email",   label: "Email",            placeholder: "e.g. john@example.com" },
                { key: "address", label: "Address",          placeholder: "e.g. 10 High Street, Leicester" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={newCustomer[f.key as keyof typeof newCustomer]}
                    onChange={e => { setNewCustomer(p => ({ ...p, [f.key]: e.target.value })); setError(""); }}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <button
              onClick={handleNewConfirm}
              disabled={creatingCustomer || generating}
              className="mt-5 w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {creatingCustomer ? "Saving customer…" : generating ? "Opening checklist…" : "Save & Open Checklist"}
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">Customer details will be saved to your Customers list.</p>
          </div>
        )}

      </div>
    </div>
  );
}
