"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckSquare, ArrowLeft, Download, Edit, X, Trash2 } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://aztec-interior.onrender.com";
const API_FORM    = `${BACKEND_URL}/api/form`;

// ── Types ──────────────────────────────────────────────────────────────────────

interface RemedialItem {
  id: number;
  item: string;
  remedialAction: string;
  colour: string;
  size: string;
  qty: number | "";
}

interface ChecklistData {
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  date: string;
  fitters: string;
  items: RemedialItem[];
  customerId?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatDisplayDate = (iso: string) => {
  if (!iso) return "—";
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(iso)
      ? new Date(iso + "T00:00:00")
      : new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return iso; }
};

const TInput = ({ value, onChange, type = "text", placeholder = "", className = "", min }: any) => (
  <input
    value={value} onChange={onChange} type={type} min={min} placeholder={placeholder}
    className={`w-full rounded-md border border-gray-300 p-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 ${className}`}
  />
);

const TArea = ({ value, onChange, placeholder = "", className = "" }: any) => (
  <textarea
    value={value} onChange={onChange} placeholder={placeholder}
    className={`w-full rounded-md border border-gray-300 p-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 ${className}`}
  />
);

// ── Component ──────────────────────────────────────────────────────────────────

export default function RemedialChecklistPage() {
  const params       = useParams();
  const router       = useRouter();
  const submissionId = params?.id as string;

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [saveMsg,      setSaveMsg]      = useState("");
  const [isEditing,    setIsEditing]    = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextId,       setNextId]       = useState(100);

  // Saved snapshot — shown in view mode
  const [saved, setSaved] = useState<ChecklistData | null>(null);

  // Working copies — used only in edit mode
  const [date,    setDate]    = useState("");
  const [fitters, setFitters] = useState("");
  const [items,   setItems]   = useState<RemedialItem[]>([]);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!submissionId) return;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token") || "";
        const res   = await fetch(`${API_FORM}/form-submissions/${submissionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const json = await res.json();
        let fd: any = json.form_data;
        if (typeof fd === "string") fd = JSON.parse(fd);

        const resolvedCustomerId = fd.customerId || fd.customer_id || String(json.client_id || "");

        let customerName    = fd.customerName    || fd.customer_name    || json.customer_name || "";
        let customerAddress = fd.customerAddress || fd.customer_address || "";
        let customerPhone   = fd.customerPhone   || fd.customer_phone   || "";

        // If address or phone are missing, fetch directly from the customer record
        if (resolvedCustomerId && (!customerAddress || !customerPhone || customerAddress === "N/A" || customerPhone === "N/A")) {
          try {
            const custRes = await fetch(`${BACKEND_URL}/customers/${resolvedCustomerId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (custRes.ok) {
              const cust = await custRes.json();
              if (!customerName    || customerName    === "N/A") customerName    = cust.name                || cust.client_company_name || customerName;
              if (!customerAddress || customerAddress === "N/A") customerAddress = cust.address             || "";
              if (!customerPhone   || customerPhone   === "N/A") customerPhone   = cust.phone               || cust.client_phone        || "";
            }
          } catch {
            // silently ignore — we'll show whatever we have
          }
        }

        const loaded: ChecklistData = {
          customerName:    customerName    || "N/A",
          customerAddress: customerAddress || "N/A",
          customerPhone:   customerPhone   || "N/A",
          date:            fd.date         || "",
          fitters:         fd.fitters      || "",
          items:           Array.isArray(fd.items)
            ? fd.items.map((item: any, i: number) => ({ ...item, id: item.id ?? i + 1 }))
            : [],
          customerId: resolvedCustomerId,
        };
        setSaved(loaded);
        setNextId((loaded.items.length || 0) + 100);
      } catch (err: any) {
        setError(err.message || "Failed to load checklist");
      } finally {
        setLoading(false);
      }
    })();
  }, [submissionId]);

  // ── Edit mode ────────────────────────────────────────────────────────────────

  const startEditing = () => {
    if (!saved) return;
    setDate(saved.date);
    setFitters(saved.fitters);
    setItems(saved.items.map(i => ({ ...i })));
    setIsEditing(true);
    setSaveMsg("");
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSaveMsg("");
  };

  // ── Item helpers ─────────────────────────────────────────────────────────────

  const handleItemChange = (id: number, field: keyof RemedialItem, value: string | number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, [field]: field === "qty" ? (value === "" ? "" : Number(value)) : value }
          : item
      )
    );
  };

  const addRow = () => {
    setItems(prev => [...prev, { id: nextId, item: "", remedialAction: "", colour: "", size: "", qty: "" }]);
    setNextId(n => n + 1);
  };

  const deleteRow = (id: number) => setItems(prev => prev.filter(i => i.id !== id));

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!saved) return;
    setIsSubmitting(true);
    setSaveMsg("");

    const filteredItems = items.filter(i => i.item || i.remedialAction);

    const updatedFormData = {
      checklistType:   "remedial",
      customerId:      saved.customerId,
      customerName:    saved.customerName,
      customerAddress: saved.customerAddress,
      customerPhone:   saved.customerPhone,
      date,
      fitters,
      items:           filteredItems,
    };

    try {
      const token = localStorage.getItem("token") || "";
      const res   = await fetch(`${API_FORM}/form-submissions/${submissionId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ formData: updatedFormData }),
      });

      if (res.ok) {
        // Update saved snapshot so view mode reflects changes immediately
        setSaved(prev => prev ? { ...prev, date, fitters, items: filteredItems } : prev);
        setSaveMsg("✅ Checklist updated successfully!");
        setIsEditing(false);
      } else {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        setSaveMsg(`❌ Failed to save: ${err.error || res.statusText}`);
      }
    } catch {
      setSaveMsg("❌ Network error. Could not save.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  };

  // ── Downloads ─────────────────────────────────────────────────────────────────

  const downloadAsPdf = async () => {
    if (!saved) return;
    setSaveMsg("⌛ Generating PDF…");
    try {
      const res = await fetch(`${API_FORM}/checklists/download-pdf`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(saved),
      });
      if (res.ok) {
        const blob = await res.blob();
        const cd   = res.headers.get("Content-Disposition");
        let name   = `Remedial_Checklist_${saved.customerName.replace(/\s/g, "_")}.pdf`;
        if (cd) { const m = cd.match(/filename="?(.+?)"?$/); if (m?.[1]) name = m[1]; }
        const url = window.URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
        setSaveMsg("✅ PDF downloaded!");
      } else { setSaveMsg("❌ PDF generation failed."); }
    } catch { setSaveMsg("❌ Network error."); }
    finally { setTimeout(() => setSaveMsg(""), 4000); }
  };

  const downloadAsCsv = () => {
    if (!saved) return;
    let csv =
      `ATELIER LUXE INTERIORS\nREMEDIAL WORK CHECKLIST\n\n` +
      `DATE:,${saved.date}\nCUSTOMER NAME:,${saved.customerName}\n` +
      `CUSTOMER ADDRESS:,${saved.customerAddress}\nCUSTOMER TEL NO.:,${saved.customerPhone}\n` +
      `FITTERS:,${saved.fitters}\n\nNO,ITEM,REMEDIAL ACTION,COLOUR,SIZE,QTY\n`;
    saved.items.forEach((item, i) => {
      csv += `${i + 1},"${item.item}","${item.remedialAction}",${item.colour},${item.size},${item.qty}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `Remedial_Checklist_${saved.customerName.replace(/\s/g, "_")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Loading / error ───────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
    </div>
  );

  if (error || !saved) return (
    <div className="flex h-64 items-center justify-center text-center">
      <div>
        <p className="mb-4 text-red-600">{error || "Checklist not found."}</p>
        <button onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100">
          Go Back
        </button>
      </div>
    </div>
  );

  const displayItems = isEditing ? items : saved.items;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
          Back to Customer
        </button>

        <div className="flex gap-2">
          <button onClick={downloadAsCsv}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-100">
            <Download className="h-4 w-4" />
            Download CSV
          </button>
          <button onClick={downloadAsPdf}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-100">
            <Download className="h-4 w-4" />
            Download PDF
          </button>

          {isEditing ? (
            <>
              <button onClick={cancelEditing}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-100">
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50">
                <CheckSquare className="h-4 w-4" />
                {isSubmitting ? "Saving…" : "Save Checklist"}
              </button>
            </>
          ) : (
            <button onClick={startEditing}
              className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800">
              <Edit className="h-4 w-4" />
              Edit Checklist
            </button>
          )}
        </div>
      </div>

      {/* Checklist card */}
      <div className="overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b bg-gray-50 p-6 text-center">
          <div className="flex items-center justify-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
              <CheckSquare className="h-6 w-6 text-gray-800" />
            </div>
            <h2 className="text-3xl font-bold text-black">ATELIER LUXE INTERIORS</h2>
          </div>
          <p className="mt-1 text-xl font-semibold">REMEDIAL WORK CHECKLIST</p>
          {isEditing && (
            <p className="mt-1 text-sm font-medium text-amber-600">
              ✏️ Editing mode — make your changes and press Save
            </p>
          )}
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">

          {/* Customer info + date/fitters */}
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            {/* Left — always read-only */}
            <div className="space-y-2">
              <p className="font-semibold">
                CUSTOMER NAME:{" "}
                <span className="font-normal text-gray-700">{saved.customerName}</span>
              </p>
              <p className="font-semibold">
                CUSTOMER ADDRESS:{" "}
                <span className="font-normal text-gray-700">{saved.customerAddress}</span>
              </p>
              <p className="font-semibold">
                CUSTOMER TEL NO.:{" "}
                <span className="font-normal text-gray-700">{saved.customerPhone}</span>
              </p>
            </div>

            {/* Right — editable in edit mode */}
            <div className="space-y-2 pt-2 md:pt-0">
              {isEditing ? (
                <>
                  <div className="flex items-center gap-2">
                    <label className="w-24 flex-shrink-0 font-semibold">DATE:</label>
                    <TInput type="date" value={date}
                      onChange={(e: any) => setDate(e.target.value)} className="flex-grow" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-24 flex-shrink-0 font-semibold">FITTERS:</label>
                    <TInput value={fitters} placeholder="Enter fitter names"
                      onChange={(e: any) => setFitters(e.target.value)} className="flex-grow" />
                  </div>
                </>
              ) : (
                <>
                  <p className="font-semibold">
                    DATE:{" "}
                    <span className="font-normal text-gray-700">{formatDisplayDate(saved.date)}</span>
                  </p>
                  <p className="font-semibold">
                    FITTERS:{" "}
                    <span className="font-normal text-gray-700">{saved.fitters || "—"}</span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Items table */}
          <h3 className="mt-4 border-b pb-2 text-lg font-bold">Items Required for Remedial Action</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border">
              <thead>
                <tr className="bg-gray-50 text-center text-xs font-medium tracking-wider text-gray-500 uppercase">
                  <th className="w-12 p-3">NO</th>
                  <th className="w-1/4 p-3 text-left">ITEM</th>
                  <th className="w-1/4 p-3 text-left">REMEDIAL ACTION</th>
                  <th className="w-20 p-3">COLOUR</th>
                  <th className="w-20 p-3">SIZE</th>
                  <th className="w-16 p-3">QTY</th>
                  {isEditing && <th className="w-16 p-3">ACTION</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {displayItems.length === 0 ? (
                  <tr>
                    <td colSpan={isEditing ? 7 : 6}
                      className="py-8 text-center text-sm text-gray-400">
                      No items recorded.
                    </td>
                  </tr>
                ) : (
                  displayItems.map((item, index) =>
                    isEditing ? (
                      <tr key={item.id}>
                        <td className="bg-gray-50 p-3 text-center text-sm font-medium">{index + 1}</td>
                        <td className="p-1">
                          <TArea value={item.item}
                            onChange={(e: any) => handleItemChange(item.id, "item", e.target.value)}
                            placeholder="Description of the item"
                            className="min-h-[40px] resize-none border-none" />
                        </td>
                        <td className="p-1">
                          <TArea value={item.remedialAction}
                            onChange={(e: any) => handleItemChange(item.id, "remedialAction", e.target.value)}
                            placeholder="Action required"
                            className="min-h-[40px] resize-none border-none" />
                        </td>
                        <td className="p-1">
                          <TInput value={item.colour}
                            onChange={(e: any) => handleItemChange(item.id, "colour", e.target.value)}
                            className="h-10 border-none text-center" />
                        </td>
                        <td className="p-1">
                          <TInput value={item.size}
                            onChange={(e: any) => handleItemChange(item.id, "size", e.target.value)}
                            className="h-10 border-none text-center" />
                        </td>
                        <td className="p-1">
                          <TInput type="number" min="1" value={item.qty}
                            onChange={(e: any) => handleItemChange(item.id, "qty", e.target.value)}
                            className="h-10 border-none text-center" />
                        </td>
                        <td className="p-1 text-center">
                          <button onClick={() => deleteRow(item.id)}
                            className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.id ?? index}>
                        <td className="bg-gray-50 p-3 text-center text-sm font-medium">{index + 1}</td>
                        <td className="p-3 text-sm text-gray-900 whitespace-pre-wrap">{item.item || "—"}</td>
                        <td className="p-3 text-sm text-gray-900 whitespace-pre-wrap">{item.remedialAction || "—"}</td>
                        <td className="p-3 text-center text-sm text-gray-900">{item.colour || "—"}</td>
                        <td className="p-3 text-center text-sm text-gray-900">{item.size || "—"}</td>
                        <td className="p-3 text-center text-sm text-gray-900">{item.qty !== "" ? item.qty : "—"}</td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Add row + bottom save — edit mode only */}
          {isEditing && (
            <div className="flex items-center justify-between">
              <button onClick={addRow}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-100">
                + Add Another Item
              </button>
              <button onClick={handleSave} disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50">
                <CheckSquare className="h-4 w-4" />
                {isSubmitting ? "Saving…" : "Save Checklist"}
              </button>
            </div>
          )}

          {saveMsg && (
            <div className={`rounded-md p-3 text-sm font-medium ${
              saveMsg.startsWith("✅") ? "bg-green-100 text-green-700" :
              saveMsg.startsWith("❌") ? "bg-red-100 text-red-700" :
              "bg-blue-100 text-blue-700"}`}>
              {saveMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}