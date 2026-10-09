"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Plus, Trash2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { BACKEND_URL } from "@/lib/api";

interface RemedialItem {
  id: string;
  issue: string;
  location: string;
  action_taken: string;
  parts_required: string;
  parts_ordered: boolean;
  resolved: boolean;
  follow_up_required: boolean;
}

interface RemedialFormData {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_postcode: string;
  installation_date: string;
  remedial_date: string;
  engineer_name: string;
  room_type: string;
  items: RemedialItem[];
  additional_notes: string;
  customer_signature: string;
  engineer_signature: string;
}

const newItem = (): RemedialItem => ({
  id: Math.random().toString(36).slice(2),
  issue: "",
  location: "",
  action_taken: "",
  parts_required: "",
  parts_ordered: false,
  resolved: false,
  follow_up_required: false,
});

const DRAFT_KEY = "checklist_draft_remedial";

const getRemedialInitialFormData = (): RemedialFormData => ({
  customer_id: "",
  customer_name: "",
  customer_phone: "",
  customer_address: "",
  customer_postcode: "",
  installation_date: "",
  remedial_date: new Date().toISOString().split("T")[0],
  engineer_name: "",
  room_type: "",
  items: [newItem()],
  additional_notes: "",
  customer_signature: "",
  engineer_signature: "",
});

export default function RemedialChecklist() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWalkinMode, setIsWalkinMode] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });

  const [formData, setFormData] = useState<RemedialFormData>(getRemedialInitialFormData);

  // Restore draft / URL params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const custName = urlParams.get("customerName");
    const custAddress = urlParams.get("customerAddress");
    const custPhone = urlParams.get("customerPhone");
    const custPostcode = urlParams.get("customerPostcode");
    const modeParam = urlParams.get("mode");

    if (modeParam === "walkin") setIsWalkinMode(true);

    const isReload = typeof performance !== "undefined" && (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming)?.type === "reload";
    if (isReload) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY) || sessionStorage.getItem(DRAFT_KEY);
        if (saved) {
          const draft = JSON.parse(saved) as RemedialFormData;
          setFormData((prev) => ({ ...prev, ...draft }));
          if (draft.customer_name) setDraftRestored(true);
          return;
        }
      } catch {}
    }

    setFormData((prev) => ({
      ...prev,
      ...(custName ? { customer_name: custName } : {}),
      ...(custAddress ? { customer_address: custAddress } : {}),
      ...(custPhone ? { customer_phone: custPhone } : {}),
      ...(custPostcode ? { customer_postcode: custPostcode } : {}),
    }));
  }, []);

  // Auto-save to both storages — localStorage persists across sessions
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(formData)); } catch {}
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formData)); } catch {}
  }, [formData]);

  const handleSaveDraft = useCallback(async () => {
    const customerName = formData.customer_name?.trim();
    if (!customerName) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 3000);
      } catch { alert("Could not save draft."); }
      return;
    }
    try {
      const payload = { formData: { ...formData, form_type: "remedial" }, isWalkinMode: true };
      const res = await fetch(`${BACKEND_URL}/api/form/save-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");
      try { localStorage.removeItem(DRAFT_KEY); sessionStorage.removeItem(DRAFT_KEY); } catch {}
      router.push(`/dashboard/customers/${data.customer_id}`);
    } catch (err) {
      alert(`Could not save draft: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [formData, router]);

  const setField = (field: keyof RemedialFormData, value: string) =>
    setFormData((p) => ({ ...p, [field]: value }));

  const updateItem = (id: string, field: keyof RemedialItem, value: string | boolean) =>
    setFormData((p) => ({ ...p, items: p.items.map((i) => i.id === id ? { ...i, [field]: value } : i) }));

  const addItem = () => setFormData((p) => ({ ...p, items: [...p.items, newItem()] }));

  const removeItem = (id: string) =>
    setFormData((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));

  const handleSubmit = async () => {
    if (!formData.customer_name.trim()) { alert("Customer name is required"); return; }
    if (!formData.remedial_date) { alert("Remedial visit date is required"); return; }
    if (!window.confirm("Are you sure you want to submit this remedial action checklist?")) return;

    const token = searchParams.get("token") || "";
    const customerIdFromUrl = searchParams.get("customerId") || "";

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });
    try {
      const response = await fetch(`${BACKEND_URL}/api/form/submit-customer-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          formData: { ...formData, form_type: "remedial", customer_id: customerIdFromUrl || formData.customer_id },
          isWalkinMode,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        try { localStorage.removeItem(DRAFT_KEY); sessionStorage.removeItem(DRAFT_KEY); } catch {}
        setSubmitStatus({ type: "success", message: "Remedial action checklist submitted successfully!" });
      } else {
        setSubmitStatus({ type: "error", message: result.error || "Failed to submit form" });
      }
    } catch {
      setSubmitStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePDF = () => window.print();

  const inputCls = "h-8 text-sm border-gray-300 rounded";
  const labelCls = "block text-xs font-medium text-gray-600 mb-0.5";
  const cellCls = "border border-gray-200 p-2";

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 print:hidden">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Remedial Action Checklist</h1>
              <p className="text-sm text-gray-600">Record and track remedial actions for completed installations</p>
            </div>
            <Button onClick={handleSavePDF} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <form className="rounded-lg border bg-white p-6 shadow-sm print:shadow-none print:border-0 max-w-5xl mx-auto w-full">
            <h2 className="mb-1 text-center text-lg font-semibold">Remedial Action Checklist</h2>
            <p className="mb-6 text-center text-sm text-gray-500">Atelier Luxe Interiors Ltd</p>

            {submitStatus.type && (
              <div className={`mb-4 rounded-lg p-3 text-sm ${submitStatus.type === "success" ? "border border-green-200 bg-green-50 text-green-700" : "border border-red-200 bg-red-50 text-red-700"}`}>
                {submitStatus.message}
              </div>
            )}

            {/* Customer Information */}
            <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-blue-900">Customer Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>Customer Name *</label>
                  <Input className={inputCls} value={formData.customer_name} onChange={(e) => setField("customer_name", e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className={labelCls}>Tel/Mobile Number</label>
                  <Input className={inputCls} value={formData.customer_phone} onChange={(e) => setField("customer_phone", e.target.value)} placeholder="Phone" />
                </div>
                <div>
                  <label className={labelCls}>Address</label>
                  <Input className={inputCls} value={formData.customer_address} onChange={(e) => setField("customer_address", e.target.value)} placeholder="Address" />
                </div>
                <div>
                  <label className={labelCls}>Postcode</label>
                  <Input className={inputCls} value={formData.customer_postcode} onChange={(e) => setField("customer_postcode", e.target.value)} placeholder="Postcode" />
                </div>
              </div>
            </div>

            {/* Visit Details */}
            <div className="mb-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Visit Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>Original Installation Date</label>
                  <Input type="date" className={inputCls} value={formData.installation_date} onChange={(e) => setField("installation_date", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Remedial Visit Date *</label>
                  <Input type="date" className={inputCls} value={formData.remedial_date} onChange={(e) => setField("remedial_date", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Engineer Name</label>
                  <Input className={inputCls} value={formData.engineer_name} onChange={(e) => setField("engineer_name", e.target.value)} placeholder="Engineer" />
                </div>
                <div>
                  <label className={labelCls}>Room Type</label>
                  <Input className={inputCls} value={formData.room_type} onChange={(e) => setField("room_type", e.target.value)} placeholder="e.g. Kitchen, Bedroom" />
                </div>
              </div>
            </div>

            {/* Remedial Items Table */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Reported Issues & Actions Taken</h3>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="flex items-center gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add Issue
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className={`${cellCls} text-left font-medium`}>#</th>
                      <th className={`${cellCls} text-left font-medium min-w-[160px]`}>Issue Reported</th>
                      <th className={`${cellCls} text-left font-medium min-w-[120px]`}>Location</th>
                      <th className={`${cellCls} text-left font-medium min-w-[180px]`}>Action Taken</th>
                      <th className={`${cellCls} text-left font-medium min-w-[130px]`}>Parts Required</th>
                      <th className={`${cellCls} text-center font-medium`}>Parts Ordered</th>
                      <th className={`${cellCls} text-center font-medium`}>Resolved</th>
                      <th className={`${cellCls} text-center font-medium`}>Follow-up</th>
                      <th className={`${cellCls} text-center font-medium print:hidden`}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={item.id} className="even:bg-gray-50">
                        <td className={`${cellCls} text-center text-gray-500`}>{idx + 1}</td>
                        <td className={cellCls}>
                          <textarea
                            rows={2}
                            className="w-full text-xs border border-gray-200 rounded p-1 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
                            value={item.issue}
                            onChange={(e) => updateItem(item.id, "issue", e.target.value)}
                            placeholder="Describe the issue"
                          />
                        </td>
                        <td className={cellCls}>
                          <Input className="h-7 text-xs" value={item.location} onChange={(e) => updateItem(item.id, "location", e.target.value)} placeholder="e.g. Unit 3" />
                        </td>
                        <td className={cellCls}>
                          <textarea
                            rows={2}
                            className="w-full text-xs border border-gray-200 rounded p-1 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
                            value={item.action_taken}
                            onChange={(e) => updateItem(item.id, "action_taken", e.target.value)}
                            placeholder="Describe the action taken"
                          />
                        </td>
                        <td className={cellCls}>
                          <Input className="h-7 text-xs" value={item.parts_required} onChange={(e) => updateItem(item.id, "parts_required", e.target.value)} placeholder="Part name/code" />
                        </td>
                        <td className={`${cellCls} text-center`}>
                          <input type="checkbox" checked={item.parts_ordered} onChange={(e) => updateItem(item.id, "parts_ordered", e.target.checked)} className="h-4 w-4" />
                        </td>
                        <td className={`${cellCls} text-center`}>
                          <input type="checkbox" checked={item.resolved} onChange={(e) => updateItem(item.id, "resolved", e.target.checked)} className="h-4 w-4" />
                        </td>
                        <td className={`${cellCls} text-center`}>
                          <input type="checkbox" checked={item.follow_up_required} onChange={(e) => updateItem(item.id, "follow_up_required", e.target.checked)} className="h-4 w-4" />
                        </td>
                        <td className={`${cellCls} text-center print:hidden`}>
                          <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="mb-6">
              <label className={labelCls}>Additional Notes</label>
              <textarea
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                value={formData.additional_notes}
                onChange={(e) => setField("additional_notes", e.target.value)}
                placeholder="Any additional comments or observations..."
              />
            </div>

            {/* Signatures */}
            <div className="mb-6 grid grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>Engineer Signature</label>
                <Input className={inputCls} value={formData.engineer_signature} onChange={(e) => setField("engineer_signature", e.target.value)} placeholder="Type name to sign" />
              </div>
              <div>
                <label className={labelCls}>Customer Signature</label>
                <Input className={inputCls} value={formData.customer_signature} onChange={(e) => setField("customer_signature", e.target.value)} placeholder="Type name to sign" />
              </div>
            </div>

            {/* Draft / Submit buttons */}
            {draftRestored && (
              <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 print:hidden">
                <span>Draft restored from a previous session.</span>
                <button onClick={() => { try { localStorage.removeItem(DRAFT_KEY); sessionStorage.removeItem(DRAFT_KEY); } catch {} setFormData(getRemedialInitialFormData()); setDraftRestored(false); }} className="text-xs underline ml-4">Discard draft</button>
              </div>
            )}
            {draftSaved && (
              <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 text-center print:hidden">
                Draft saved — you can return to this form later.
              </div>
            )}
            <div className="border-t pt-4 flex items-center justify-center gap-3 print:hidden">
              <Button variant="outline" className="px-5 py-2 text-sm" onClick={handleSaveDraft} type="button">
                Save as Draft
              </Button>
              <Button className="px-6 py-2 text-base font-bold" onClick={handleSubmit} disabled={isSubmitting} type="button">
                {isSubmitting ? "Submitting..." : "Submit Checklist"}
              </Button>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
