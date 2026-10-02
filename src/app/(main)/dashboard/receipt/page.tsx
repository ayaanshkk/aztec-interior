"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import { BACKEND_URL } from "@/lib/api";
import Image from 'next/image';

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
    receiptNumber:      "",
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

  // â”€â”€ Populate from URL params â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          receiptNumber:      formData.receiptNumber,
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

  // â”€â”€ Download PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDownloadPdf = async () => {
    setSaveMsg("âŒ› Generating PDF...");
    try {
      const res = await fetch(`${API_FORM}/receipts/download-pdf`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptType:        formData.receiptType,
          receiptDate:        formData.receiptDate,
          receiptNumber:      formData.receiptNumber,
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

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="min-h-screen bg-white" data-force-light>
      {/* Nav bar */}
      <div className="border-b px-8 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 font-medium">New {receiptTypeLabel}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            Download PDF
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-gray-800 text-white">
            <Save className="mr-2 h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Receipt"}
          </Button>
        </div>
      </div>
      {saveMsg && (
        <div className={`px-8 py-2 text-sm font-medium border-b ${
          saveMsg.startsWith("✅") ? "bg-green-50 text-green-700 border-green-100" :
          saveMsg.startsWith("❌") ? "bg-red-50 text-red-700 border-red-100" :
          "bg-blue-50 text-blue-700 border-blue-100"}`}>
          {saveMsg}
        </div>
      )}

      <div className="px-8 py-10">
        {/* Letterhead */}
        <div className="flex items-center justify-between border-b-2 border-gray-900 pb-7 mb-10">
          <Image src="/images/logo-full.png" alt="Atelier Luxe Interiors" width={340} height={92} className="object-contain" />
          <div className="text-right text-xs leading-6 text-gray-600">
            <p className="font-semibold text-sm text-gray-900 mb-1">Atelier Luxe Interiors Ltd</p>
            <p>127c Barkby Road, Leicester, LE4 9LG</p>
            <p>M: 07821 328849</p>
              <p>E: accounts@atelierluxe.co.uk</p>
            <p className="text-gray-400 mt-1">Registered in England No. 17200862</p>
          </div>
        </div>

        {/* Receipt type selector */}
        <div className="mb-8 flex gap-3">
          {(["receipt", "deposit", "final"] as ReceiptType[]).map(type => (
            <button key={type}
              onClick={() => set("receiptType", type)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                formData.receiptType === type
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}>
              {type === "receipt" ? "Receipt" : type === "deposit" ? "Deposit Receipt" : "Final Receipt"}
            </button>
          ))}
        </div>

        {/* Document type + title */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">{receiptTypeLabel}</p>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-gray-900">
                {formData.receiptNumber || 'New Receipt'}
              </h1>
              <Input value={formData.receiptNumber}
                onChange={e => set("receiptNumber", e.target.value)}
                placeholder="Receipt No. (optional)"
                className="border-none border-b border-gray-200 focus-visible:ring-0 px-0 rounded-none text-sm text-gray-400 placeholder:text-gray-300 h-auto py-1 w-52" />
            </div>
            <Input type="date" value={formData.receiptDate}
              onChange={e => set("receiptDate", e.target.value)}
              className="border-none focus-visible:ring-0 px-0 text-sm text-gray-400 h-auto py-0.5 w-44" />
          </div>
        </div>

        {/* Customer + Payment Details */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Received From</p>
            <Input value={formData.customerName}
              onChange={e => set("customerName", e.target.value)}
              placeholder="Customer name"
              className="border-none border-b border-gray-200 focus-visible:ring-0 px-0 rounded-none text-base font-medium placeholder:text-gray-300 mb-1 h-auto py-2 bg-transparent" />
            <textarea value={formData.customerAddress}
              onChange={e => set("customerAddress", e.target.value)}
              placeholder="Address"
              rows={2}
              className="w-full resize-none border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none" />
            <Input value={formData.customerPhone}
              onChange={e => set("customerPhone", e.target.value)}
              placeholder="Phone"
              className="border-none border-b border-gray-200 focus-visible:ring-0 px-0 rounded-none text-sm text-gray-700 placeholder:text-gray-300 h-auto py-2 bg-transparent" />
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Payment Details</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-400 w-32 flex-shrink-0">Method</span>
                <select value={formData.paymentMethod}
                  onChange={e => set("paymentMethod", e.target.value)}
                  className="flex-1 border-none bg-transparent text-sm text-gray-700 focus:outline-none">
                  <option value="BACS">BACS</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-gray-400 w-32 flex-shrink-0 pt-0.5">Description</span>
                <Input value={formData.paymentDescription}
                  onChange={e => set("paymentDescription", e.target.value)}
                  className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-0 flex-1 bg-transparent" />
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-6 py-4 shadow-sm mb-10 text-sm text-gray-700">
          Confirmation of payment received by{" "}
          <span className="font-semibold">{formData.paymentMethod}</span>{" "}
          for <span className="font-semibold">{formData.paymentDescription}</span>.
        </div>

        {/* Payment Summary section divider */}
        <div className="flex items-center gap-3 mt-8 mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 whitespace-nowrap">Payment Summary</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Financial amounts */}
        <div className="flex justify-end mb-10">
          <div className="w-80 rounded-xl border border-gray-100 shadow-md overflow-hidden text-sm mt-6">
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-50">
              <span className="text-gray-600">Amount Paid</span>
              <input
                type="number" min="0" step="0.01"
                value={formData.paidAmount}
                onChange={e => set("paidAmount", e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-28 text-right text-sm font-semibold text-gray-800 bg-transparent border-none focus:outline-none placeholder:text-gray-300"
              />
            </div>
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-50">
              <span className="text-gray-600">Total Paid to Date</span>
              <input
                type="number" min="0" step="0.01"
                value={formData.totalPaidToDate}
                onChange={e => set("totalPaidToDate", e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-28 text-right text-sm text-gray-700 bg-transparent border-none focus:outline-none placeholder:text-gray-300"
              />
            </div>
            <div className="flex justify-between items-center px-5 py-4 bg-gray-900 text-white font-semibold">
              <span>Balance Remaining</span>
              <input
                type="number" min="0" step="0.01"
                value={formData.balanceToPay}
                onChange={e => set("balanceToPay", e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-28 text-right text-sm font-semibold text-white bg-transparent border-none focus:outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>

        {/* Sign off */}
        <div className="border-t border-gray-200 pt-8 text-sm text-gray-700">
          <p>Many Thanks,</p>
          <p className="mt-1 font-semibold italic text-base">Atelier Luxe Interiors</p>
        </div>
      </div>
    </div>
  );
}
