"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import { BACKEND_URL } from "@/lib/api";

const API_FORM = `${BACKEND_URL}/api/form`;

type ReceiptType = "receipt" | "deposit" | "final";

export default function CreateReceiptPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState("");

  const [formData, setFormData] = useState({
    receiptType:        "receipt" as ReceiptType,
    receiptDate:        new Date().toISOString().split("T")[0],
    customerName:       "",
    customerAddress:    "",
    customerPhone:      "",
    paymentMethod:      "BACS",
    paymentDescription: "your Kitchen/Bedroom Cabinetry",
    paidAmount:         "" as number | "",
    totalPaidToDate:    "" as number | "",
    balanceToPay:       "" as number | "",
  });

  const fmt = (v: number | "") =>
    v === "" ? "£0.00"
    : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(v));

  const receiptTypeLabel = {
    receipt: "Receipt",
    deposit: "Deposit Receipt",
    final:   "Final Receipt",
  }[formData.receiptType];

  // ── Populate from URL params ──────────────────────────────────────────────
  useEffect(() => {
    const cid  = searchParams.get("customerId");
    const type = searchParams.get("type") as ReceiptType || "receipt";
    if (cid) setCustomerId(cid);
    setFormData(prev => ({
      ...prev,
      receiptType:     type,
      customerName:    searchParams.get("customerName")    || "",
      customerAddress: searchParams.get("customerAddress") || "",
      customerPhone:   searchParams.get("customerPhone")   || "",
      paidAmount:      searchParams.get("paidAmount")      ? Number(searchParams.get("paidAmount"))      : "",
      totalPaidToDate: searchParams.get("totalPaidToDate") ? Number(searchParams.get("totalPaidToDate")) : "",
      balanceToPay:    searchParams.get("balanceToPay")    ? Number(searchParams.get("balanceToPay"))    : "",
    }));
  }, [searchParams]);

  const set = (field: string, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saving) return;
    if (!formData.customerName?.trim()) { alert("Customer name is required"); return; }

    setSaving(true);
    setSaveMsg("");
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/receipts/save`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerId:         customerId,
          receiptType:        formData.receiptType,
          receiptDate:        formData.receiptDate,
          customerName:       formData.customerName,
          customerAddress:    formData.customerAddress,
          customerPhone:      formData.customerPhone,
          paymentMethod:      formData.paymentMethod,
          paymentDescription: formData.paymentDescription,
          paidAmount:         Number(formData.paidAmount)         || 0,
          totalPaidToDate:    Number(formData.totalPaidToDate)    || 0,
          balanceToPay:       Number(formData.balanceToPay)       || 0,
        }),
      });

      if (res.ok) {
        setSaveMsg("✅ Receipt saved successfully!");
        setTimeout(() => router.push(customerId ? `/dashboard/customers/${customerId}` : "/dashboard"), 1200);
      } else {
        const err = await res.json();
        setSaveMsg(`❌ ${err.error || "Failed to save"}`);
      }
    } catch {
      setSaveMsg("❌ Network error");
    } finally {
      setSaving(false);
    }
  };

  // ── Download PDF ──────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    setSaveMsg("⌛ Generating PDF...");
    try {
      const res = await fetch(`${API_FORM}/receipts/download-pdf`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptType:        formData.receiptType,
          receiptDate:        formData.receiptDate,
          customerName:       formData.customerName,
          customerAddress:    formData.customerAddress,
          customerPhone:      formData.customerPhone,
          paymentMethod:      formData.paymentMethod,
          paymentDescription: formData.paymentDescription,
          paidAmount:         Number(formData.paidAmount)      || 0,
          totalPaidToDate:    Number(formData.totalPaidToDate) || 0,
          balanceToPay:       Number(formData.balanceToPay)    || 0,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url;
        a.download = `Receipt_${formData.customerName.replace(/\s/g, "_")}_${formData.receiptDate}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
        setSaveMsg("✅ PDF downloaded!");
      } else {
        setSaveMsg("❌ PDF generation failed");
      }
    } catch {
      setSaveMsg("❌ Network error");
    } finally {
      setTimeout(() => setSaveMsg(""), 4000);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-gray-50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create {receiptTypeLabel}</h1>
              <p className="text-sm text-gray-600">Fill in the details below</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPdf}>
              Download PDF
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Receipt"}
            </Button>
          </div>
        </div>
        {saveMsg && (
          <div className={`mt-2 rounded-md px-4 py-2 text-sm font-medium ${
            saveMsg.startsWith("✅") ? "bg-green-100 text-green-700" :
            saveMsg.startsWith("❌") ? "bg-red-100 text-red-700" :
            "bg-blue-100 text-blue-700"}`}>
            {saveMsg}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-8 py-8">
        {/* Company header */}
        <div className="mb-8 text-center">
          <div className="text-4xl font-bold tracking-wider text-gray-800">AZTEC INTERIORS</div>
          <p className="mt-1 text-sm text-gray-500">20 Victoria Road East, Leicester, LE5 5FD</p>
          <p className="text-sm text-gray-500">Tel: 0116 2761866 | Email: aztecinteriors@hotmail.co.uk</p>
        </div>

        {/* Receipt type selector */}
        <div className="mb-6 flex gap-3">
          {(["receipt", "deposit", "final"] as ReceiptType[]).map(type => (
            <button key={type}
              onClick={() => set("receiptType", type)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                formData.receiptType === type
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}>
              {type === "receipt" ? "Receipt" : type === "deposit" ? "Deposit Receipt" : "Final Receipt"}
            </button>
          ))}
        </div>

        {/* Receipt card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {/* Card header */}
          <div className="border-b bg-gray-50 px-8 py-5 text-center">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-800">
              {receiptTypeLabel}
            </h2>
          </div>

          <div className="px-8 py-6 space-y-6">
            {/* Customer details + date side by side */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Customer */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Customer Details
                </h3>
                <div>
                  <label className="text-xs font-medium text-gray-500">Name</label>
                  <Input value={formData.customerName}
                    onChange={e => set("customerName", e.target.value)}
                    placeholder="Customer name"
                    className="mt-1 border-gray-200" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Address</label>
                  <textarea value={formData.customerAddress}
                    onChange={e => set("customerAddress", e.target.value)}
                    placeholder="Customer address"
                    rows={2}
                    className="mt-1 w-full resize-none rounded-md border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Phone</label>
                  <Input value={formData.customerPhone}
                    onChange={e => set("customerPhone", e.target.value)}
                    placeholder="Phone number"
                    className="mt-1 border-gray-200" />
                </div>
              </div>

              {/* Right: Date + payment method */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Receipt Date</label>
                  <Input type="date" value={formData.receiptDate}
                    onChange={e => set("receiptDate", e.target.value)}
                    className="mt-1 border-gray-200" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Payment Method</label>
                  <select value={formData.paymentMethod}
                    onChange={e => set("paymentMethod", e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none">
                    <option value="BACS">BACS</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Payment Description</label>
                  <Input value={formData.paymentDescription}
                    onChange={e => set("paymentDescription", e.target.value)}
                    className="mt-1 border-gray-200" />
                </div>
              </div>
            </div>

            {/* Confirmation sentence */}
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
              Confirmation of payment received by{" "}
              <span className="font-semibold">{formData.paymentMethod}</span>{" "}
              for <span className="font-semibold">{formData.paymentDescription}</span>.
            </div>

            {/* Financial amounts */}
            <div className="space-y-3">
              {/* Paid amount — prominent */}
              <div className="rounded-lg border-2 border-gray-800 bg-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-white">Amount Paid</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-lg">£</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={formData.paidAmount}
                      onChange={e => set("paidAmount", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0.00"
                      className="w-36 rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-right text-xl font-bold text-white placeholder-gray-400 focus:border-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Paid to date + Balance */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    Total Paid to Date
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 font-medium">£</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={formData.totalPaidToDate}
                      onChange={e => set("totalPaidToDate", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-right text-base font-semibold text-gray-800 focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2">
                    Balance to Pay
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-red-600 font-medium">£</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={formData.balanceToPay}
                      onChange={e => set("balanceToPay", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full rounded-md border border-red-200 bg-white px-2 py-1 text-right text-base font-semibold text-red-700 focus:border-red-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary preview */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Paid to date:</span>
                <span className="font-semibold">{fmt(formData.totalPaidToDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-800">Balance Remaining:</span>
                <span className={`font-bold text-lg ${Number(formData.balanceToPay) > 0 ? "text-red-600" : "text-green-600"}`}>
                  {fmt(formData.balanceToPay)}
                </span>
              </div>
            </div>

            {/* Signature */}
            <div className="border-t pt-4 text-sm text-gray-700">
              <p>Many Thanks,</p>
              <p className="mt-1 font-semibold italic text-base">Tanvir Shaikh</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}