"use client";

import React, { useState, useEffect, Suspense } from "react";
import { CheckSquare, ArrowLeft, Trash2, Download } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://aztec-interior.onrender.com";
const API_FORM = `${BACKEND_URL}/api/form`;

// ── Shared UI primitives ──────────────────────────────────────────────────────

const Button = ({ children, onClick, type = "button", variant, size, disabled, className }: any) => (
  <button
    onClick={onClick}
    type={type}
    disabled={disabled}
    className={`rounded-lg px-4 py-2 font-semibold shadow-md transition-colors
      ${variant === "outline"    ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100" :
        variant === "secondary"  ? "bg-gray-100 text-gray-700 hover:bg-gray-200" :
        variant === "ghost"      ? "bg-transparent shadow-none hover:bg-gray-100" :
                                   "bg-black text-white hover:bg-gray-800"}
      ${disabled ? "cursor-not-allowed opacity-50" : ""}
      ${className || ""}`}
  >
    {children}
  </button>
);

const Input = ({ value, onChange, type = "text", placeholder, className = "", id, min }: any) => (
  <input
    id={id}
    value={value}
    onChange={onChange}
    type={type}
    min={min}
    placeholder={placeholder}
    className={`w-full rounded-md border border-gray-300 p-2 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 ${className}`}
  />
);

const Textarea = ({ value, onChange, placeholder, className = "" }: any) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full rounded-md border border-gray-300 p-2 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 ${className}`}
  />
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface RemedialItem {
  id: number;
  item: string;
  remedialAction: string;
  colour: string;
  size: string;
  qty: number | "";
}

interface CustomerDetails {
  name: string;
  address: string;
  phone: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const initialItems = (): RemedialItem[] =>
  Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    item: "",
    remedialAction: "",
    colour: "",
    size: "",
    qty: "",
  }));

// ── Main Content Component (uses useSearchParams) ────────────────────────────

const RemedialActionChecklistContent = () => {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const customerId = searchParams.get("customerId") || "";

  // Customer details — fetched from backend
  const [customer, setCustomer] = useState<CustomerDetails>({
    name:    searchParams.get("customerName")    || "",
    address: searchParams.get("customerAddress") || "",
    phone:   searchParams.get("customerPhone")   || "",
  });
  const [customerLoading, setCustomerLoading] = useState(false);

  // Form state
  const [date,           setDate]           = useState(new Date().toISOString().split("T")[0]);
  const [fitters,        setFitters]        = useState("");
  const [checklistItems, setChecklistItems] = useState<RemedialItem[]>(initialItems());
  const [nextId,         setNextId]         = useState(initialItems().length + 1);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [saveMessage,    setSaveMessage]    = useState("");

  // ── Fetch customer details when customerId is present and details are missing ──
  useEffect(() => {
    if (!customerId) return;

    // If we already got details from URL params, skip the API call
    if (customer.name && customer.address && customer.phone) return;

    const fetchCustomer = async () => {
      setCustomerLoading(true);
      try {
        const token    = localStorage.getItem("token") || "";
        const response = await fetch(
          `${API_FORM}/customers?ids=${customerId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.ok) {
          const data = await response.json();
          // /customers returns an array; find the one we need
          const found = Array.isArray(data)
            ? data.find((c: any) => String(c.id) === String(customerId))
            : null;

          if (found) {
            setCustomer({
              name:    found.name    || "N/A",
              address: found.address || "N/A",
              phone:   found.phone   || "N/A",
            });
          }
        } else {
          console.warn("Could not fetch customer details:", response.status);
        }
      } catch (err) {
        console.error("Customer fetch failed:", err);
      } finally {
        setCustomerLoading(false);
      }
    };

    fetchCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  // ── Checklist helpers ─────────────────────────────────────────────────────

  const handleItemChange = (id: number, field: keyof RemedialItem, value: string | number) => {
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, [field]: field === "qty" ? (value === "" ? "" : Number(value)) : value }
          : item
      )
    );
  };

  const addNewItemRow = () => {
    setChecklistItems((prev) => [
      ...prev,
      { id: nextId, item: "", remedialAction: "", colour: "", size: "", qty: "" },
    ]);
    setNextId((n) => n + 1);
  };

  const handleDeleteItem = (id: number) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveMessage("");

    const payload = {
      checklistType: "remedial",
      customerId,
      customerName: customer.name,
      date,
      fitters,
      items: checklistItems.filter((i) => i.item || i.remedialAction),
    };

    try {
      const token    = localStorage.getItem("token") || "";
      const response = await fetch(`${API_FORM}/checklists/save`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(payload),
      });

      if (response.ok) {
        setSaveMessage("✅ Remedial Action Checklist saved successfully!");
      } else {
        const err = await response.json().catch(() => ({ error: "Server error" }));
        setSaveMessage(`❌ Failed to save checklist: ${err.error || response.statusText}`);
      }
    } catch {
      setSaveMessage("❌ Network error: Could not connect to the server.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSaveMessage(""), 5000);
    }
  };

  // ── PDF download ──────────────────────────────────────────────────────────

  const downloadAsPdf = async () => {
    const payload = {
      customerName:    customer.name,
      customerAddress: customer.address,
      customerPhone:   customer.phone,
      date,
      fitters,
      items: checklistItems.filter((i) => i.item || i.remedialAction),
    };

    setSaveMessage("⌛ Generating PDF on server...");

    try {
      const response = await fetch(`${API_FORM}/checklists/download-pdf`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (response.ok) {
        const blob               = await response.blob();
        const contentDisposition = response.headers.get("Content-Disposition");
        let   filename           = `Remedial_Checklist_${customer.name.replace(/\s/g, "_")}_${date}.pdf`;

        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?(.+?)"?$/);
          if (match?.[1]) filename = match[1];
        }

        const url = window.URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSaveMessage("✅ PDF successfully generated and downloaded!");
      } else {
        const err = await response.json().catch(() => ({ error: "Server error" }));
        setSaveMessage(`❌ PDF generation failed: ${err.error || response.statusText}`);
      }
    } catch {
      setSaveMessage("❌ Network error: Could not connect to the server for PDF generation.");
    } finally {
      setTimeout(() => setSaveMessage(""), 5000);
    }
  };

  // ── CSV download ──────────────────────────────────────────────────────────

  const downloadAsCsv = () => {
    let csv =
      `AZTEC INTERIORS\nREMEDIAL WORK CHECKLIST\n\n` +
      `DATE:,${date}\n` +
      `CUSTOMER NAME:,${customer.name}\n` +
      `CUSTOMER ADDRESS:,${customer.address}\n` +
      `CUSTOMER TEL NO.:,${customer.phone}\n` +
      `FITTERS:,${fitters}\n\n` +
      `NO,ITEM,REMEDIAL ACTION,COLOUR,SIZE,QTY\n`;

    checklistItems.forEach((item, i) => {
      const cleanItem   = item.item.replace(/,/g, "").replace(/\n/g, " ");
      const cleanAction = item.remedialAction.replace(/,/g, "").replace(/\n/g, " ");
      csv += `${i + 1},"${cleanItem}","${cleanAction}",${item.colour},${item.size},${item.qty}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `Remedial_Checklist_${customer.name.replace(/\s/g, "_")}_${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      {/* Back button */}
      <div className="no-print flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()} className="text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Forms
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Card header */}
        <div className="border-b bg-gray-50 p-6 text-center">
          <div className="flex items-center justify-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
              <CheckSquare className="h-6 w-6 text-gray-800" />
            </div>
            <h2 className="text-3xl font-bold text-black">AZTEC INTERIORS</h2>
          </div>
          <p className="mt-1 text-xl font-semibold">REMEDIAL WORK CHECKLIST</p>
        </div>

        {/* Card body */}
        <div className="space-y-6 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Customer info + date/fitters */}
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="space-y-2">
                {customerLoading ? (
                  <p className="text-gray-400 italic text-sm">Loading customer details…</p>
                ) : (
                  <>
                    <p className="font-semibold">
                      CUSTOMER NAME:{" "}
                      <span className="font-normal text-gray-700">
                        {customer.name || <span className="text-red-400 italic">Not found</span>}
                      </span>
                    </p>
                    <p className="font-semibold">
                      CUSTOMER ADDRESS:{" "}
                      <span className="font-normal text-gray-700">
                        {customer.address || <span className="text-red-400 italic">Not found</span>}
                      </span>
                    </p>
                    <p className="font-semibold">
                      CUSTOMER TEL NO.:{" "}
                      <span className="font-normal text-gray-700">
                        {customer.phone || <span className="text-red-400 italic">Not found</span>}
                      </span>
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-2 pt-2 md:pt-0">
                <div className="flex items-center space-x-2">
                  <label htmlFor="date" className="w-24 flex-shrink-0 font-semibold">DATE:</label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e: any) => setDate(e.target.value)}
                    className="flex-grow"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label htmlFor="fitters" className="w-24 flex-shrink-0 font-semibold">FITTERS:</label>
                  <Input
                    id="fitters"
                    value={fitters}
                    onChange={(e: any) => setFitters(e.target.value)}
                    placeholder="Enter fitter names"
                    className="flex-grow"
                  />
                </div>
              </div>
            </div>

            {/* Checklist table */}
            <h3 className="mt-8 border-b pb-2 text-lg font-bold">Items Required for Remedial Action</h3>
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
                    <th className="no-print w-16 p-3">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {checklistItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="bg-gray-50 p-3 text-center text-sm font-medium">{index + 1}</td>
                      <td className="p-1">
                        <Textarea
                          value={item.item}
                          onChange={(e: any) => handleItemChange(item.id, "item", e.target.value)}
                          placeholder="Description of the item"
                          className="min-h-[40px] resize-none border-none"
                        />
                      </td>
                      <td className="p-1">
                        <Textarea
                          value={item.remedialAction}
                          onChange={(e: any) => handleItemChange(item.id, "remedialAction", e.target.value)}
                          placeholder="Action required"
                          className="min-h-[40px] resize-none border-none"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={item.colour}
                          onChange={(e: any) => handleItemChange(item.id, "colour", e.target.value)}
                          className="h-10 border-none text-center"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={item.size}
                          onChange={(e: any) => handleItemChange(item.id, "size", e.target.value)}
                          className="h-10 border-none text-center"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e: any) => handleItemChange(item.id, "qty", e.target.value)}
                          className="h-10 border-none text-center"
                        />
                      </td>
                      <td className="no-print p-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="no-print flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={addNewItemRow}>
                Add Another Item
              </Button>
              <Button type="button" variant="secondary" onClick={downloadAsCsv} className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
              <Button type="button" variant="secondary" onClick={downloadAsPdf} className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex items-center">
                <CheckSquare className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving…" : "Save Checklist"}
              </Button>
            </div>

            {saveMessage && (
              <div
                className={`no-print mt-4 rounded-md p-3 text-sm font-medium ${
                  saveMessage.startsWith("✅")
                    ? "bg-green-100 text-green-700"
                    : saveMessage.startsWith("❌")
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {saveMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

// ── Page Component (wraps content in Suspense) ───────────────────────────────

export default function RemedialActionChecklistPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-black"></div>
          <p className="mt-4 text-gray-600">Loading checklist...</p>
        </div>
      </div>
    }>
      <RemedialActionChecklistContent />
    </Suspense>
  );
}