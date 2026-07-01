"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import { BACKEND_URL } from "@/lib/api";
import Image from 'next/image';

const API_FORM = `${BACKEND_URL}/api/form`;

interface PaymentRow {
  id: string;
  label: string;
  amount_due: number | "";
  amount_paid: number | "";
  date: string;
  signed: string;
  editable_label: boolean; // whether label can be edited
}

const DEFAULT_ROWS: PaymentRow[] = [
  { id: "1", label: "Deposit",                              amount_due: "", amount_paid: "", date: "", signed: "", editable_label: false },
  { id: "2", label: "6 wks Prior to commencement of works", amount_due: "", amount_paid: "", date: "", signed: "", editable_label: false },
  { id: "3", label: "On Completion",                        amount_due: "", amount_paid: "", date: "", signed: "", editable_label: false },
];

export default function CreatePaymentTermsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date:    new Date().toISOString().split("T")[0],
    name:    "",
    address: "",
    phone:   "",
  });

  const [rows,    setRows]    = useState<PaymentRow[]>(DEFAULT_ROWS);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const fmt = (v: number | "") =>
    v === "" ? "" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(v));

  // ── Populate from URL params ──────────────────────────────────────────────
  useEffect(() => {
    const cid = searchParams.get("customerId");
    if (cid) setCustomerId(cid);
    setFormData({
      date:    new Date().toISOString().split("T")[0],
      name:    searchParams.get("customerName")    || "",
      address: searchParams.get("customerAddress") || "",
      phone:   searchParams.get("customerPhone")   || "",
    });
  }, [searchParams]);

  // ── Row helpers ───────────────────────────────────────────────────────────
  const handleRowChange = (id: string, field: keyof PaymentRow, value: any) => {
    setRows(prev => prev.map(r =>
      r.id !== id ? r :
      { ...r, [field]: field === "amount_due" || field === "amount_paid"
          ? (value === "" ? "" : Number(value))
          : value }
    ));
  };

  const totalDue  = rows.reduce((s, r) => s + (Number(r.amount_due)  || 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saving) return;
    if (!formData.name?.trim()) { alert("Customer name is required"); return; }

    setSaving(true);
    setSaveMsg("");
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/payment-terms`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          client_id:        customerId,
          customer_name:    formData.name,
          customer_address: formData.address,
          customer_phone:   formData.phone,
          date:             formData.date,
          payment_rows:     rows.map(r => ({
            label:       r.label,
            amount_due:  r.amount_due  === "" ? 0 : Number(r.amount_due),
            amount_paid: r.amount_paid === "" ? 0 : Number(r.amount_paid),
            date:        r.date,
            signed:      r.signed,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSaveMsg(`✅ Payment Terms #${data.pt_number} created!`);
        setTimeout(() => {
          window.open(`/dashboard/payment-terms/${data.pt_id}`, "_blank");
          router.push(customerId ? `/dashboard/customers/${customerId}` : "/dashboard/payment-terms");
        }, 800);
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
              <h1 className="text-2xl font-bold">Create Payment Terms</h1>
              <p className="text-sm text-gray-600">Fill in the payment schedule for this customer</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Payment Terms"}
          </Button>
        </div>
        {saveMsg && (
          <div className={`mt-2 rounded-md px-4 py-2 text-sm font-medium ${
            saveMsg.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {saveMsg}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-4xl px-8 py-8">
        {/* Company header */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <Image
            src="/images/logo3.png"
            alt="Logo"
            width={80}
            height={80}
            className="object-contain"
          />
          <div className="text-4xl font-bold tracking-wider text-gray-800">ATELIER LUXE INTERIORS</div>
        </div>

        {/* BACS details — green + yellow bars */}
        <div className="mb-1 bg-green-200 p-2 text-sm font-semibold">Bacs details:</div>
        <div className="mb-3 bg-yellow-200 p-2 text-sm">
          <p className="font-semibold">Please use your name and/or road name as reference:</p>
          <p>Acc name : Atelier Luxe Interiors LTD</p>
          <p>Bank : ClearBank</p>
          <p>Sort Code: 04 06 05</p>
          <p>Acc No: 31621197</p>
        </div>

        {/* Date + customer info */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <label className="w-24 text-sm font-semibold">DATE:</label>
            <Input type="date" value={formData.date}
              onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
              className="w-48" />
          </div>

          <table className="w-full border-collapse">
            <tbody>
              {[
                { label: "NAME",      field: "name",    placeholder: "Customer name" },
                { label: "ADDRESS",   field: "address", placeholder: "Customer address" },
                { label: "PHONE NO.", field: "phone",   placeholder: "Phone number" },
              ].map(({ label, field, placeholder }) => (
                <tr key={field}>
                  <td className="w-36 border border-black bg-gray-100 px-3 py-2 text-sm font-bold">{label}</td>
                  <td className="border border-black p-0">
                    <Input value={(formData as any)[field]}
                      onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="border-none focus-visible:ring-0" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment schedule table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-sm font-bold">
                <th className="border border-black px-3 py-2 text-left" style={{ width: "34%" }}></th>
                <th className="border border-black px-3 py-2 text-center" style={{ width: "17%" }}>AMOUNT DUE</th>
                <th className="border border-black px-3 py-2 text-center text-red-600" style={{ width: "17%" }}>AMOUNT PAID</th>
                <th className="border border-black px-3 py-2 text-center" style={{ width: "17%" }}>DATE</th>
                <th className="border border-black px-3 py-2 text-center" style={{ width: "15%" }}>SIGNED</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  {/* Label */}
                  <td className="border border-black px-3 py-2 text-sm font-medium">
                    {row.editable_label ? (
                      <Input value={row.label}
                        onChange={e => handleRowChange(row.id, "label", e.target.value)}
                        className="border-none focus-visible:ring-0 text-sm p-0 h-auto" />
                    ) : (
                      <span className="whitespace-pre-line">{row.label}</span>
                    )}
                  </td>
                  {/* Amount Due */}
                  <td className="border border-black p-1">
                    <Input type="number" min="0" step="0.01"
                      value={row.amount_due}
                      onChange={e => handleRowChange(row.id, "amount_due", e.target.value)}
                      placeholder="£0.00"
                      className="border-none text-center focus-visible:ring-0 text-sm" />
                  </td>
                  {/* Amount Paid */}
                  <td className="border border-black p-1">
                    <Input type="number" min="0" step="0.01"
                      value={row.amount_paid}
                      onChange={e => handleRowChange(row.id, "amount_paid", e.target.value)}
                      placeholder="£0.00"
                      className="border-none text-center focus-visible:ring-0 text-sm text-red-600" />
                  </td>
                  {/* Date */}
                  <td className="border border-black p-1">
                    <Input type="date" value={row.date}
                      onChange={e => handleRowChange(row.id, "date", e.target.value)}
                      className="border-none text-center focus-visible:ring-0 text-sm" />
                  </td>
                  {/* Signed */}
                  <td className="border border-black p-1">
                    <Input value={row.signed}
                      onChange={e => handleRowChange(row.id, "signed", e.target.value)}
                      placeholder="..."
                      className="border-none text-center focus-visible:ring-0 text-sm" />
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-black px-3 py-2 text-sm">TOTAL</td>
                <td className="border border-black px-3 py-2 text-center text-sm">{fmt(totalDue)}</td>
                <td className="border border-black px-3 py-2 text-center text-sm text-red-600">{fmt(totalPaid)}</td>
                <td className="border border-black px-3 py-2" />
                <td className="border border-black px-3 py-2" />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer notes */}
        <div className="mb-4 space-y-2 text-sm">
          <p className="font-semibold">Only Bacs or Cash will be accepted on Delivery and Completion</p>
        </div>
        <div className="mb-6 text-sm font-semibold text-red-600">
          <p>We can not confirm or guarantee a fitting date, only give a week commencing</p>
          <p>date once the deposit has been paid.</p>
        </div>
        <div className="mb-8 text-sm font-bold text-red-600">
          <p>Please sign here to confirm.</p>
        </div>

        {/* Signature */}
        <div className="space-y-4 text-sm">
          <div className="flex items-center">
            <span className="mr-2 w-40">Customer Signature:</span>
            <span className="flex-1 border-b border-dotted border-black" />
          </div>
          <div className="flex items-center">
            <span className="mr-2 w-40">Date:</span>
            <span className="w-48 border-b border-dotted border-black" />
          </div>
        </div>
      </div>
    </div>
  );
}