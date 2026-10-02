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
  const [ptNumber,   setPtNumber]   = useState("");
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

  // â”€â”€ Populate from URL params â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Row helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          pt_number:        ptNumber || undefined,
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

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="min-h-screen bg-white" data-force-light>
      {/* Nav bar */}
      <div className="border-b px-8 py-3 print:hidden flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 font-medium">New Payment Terms</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-gray-800 text-white">
            <Save className="mr-2 h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Payment Terms"}
          </Button>
        </div>
      </div>
      {saveMsg && (
        <div className={`px-8 py-2 text-sm font-medium border-b print:hidden ${
          saveMsg.startsWith("✅") ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
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

        {/* Document type + title */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">Payment Terms</p>
            <h1 className="text-2xl font-semibold text-gray-900">New Payment Schedule</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {formData.date ? new Date(formData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Customer info + Document details */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Bill To</p>
            <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="Customer name"
              className="border-none border-b border-gray-200 focus-visible:ring-0 px-0 rounded-none text-base font-medium placeholder:text-gray-300 mb-1 h-auto py-2 bg-transparent" />
            <Input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
              placeholder="Address"
              className="border-none border-b border-gray-200 focus-visible:ring-0 px-0 rounded-none text-sm text-gray-700 placeholder:text-gray-300 h-auto py-2 bg-transparent" />
            <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
              placeholder="Phone"
              className="border-none border-b border-gray-200 focus-visible:ring-0 px-0 rounded-none text-sm text-gray-700 placeholder:text-gray-300 h-auto py-2 bg-transparent" />
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Document Details</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-400 w-28 flex-shrink-0">PT No</span>
                <Input value={ptNumber} onChange={e => setPtNumber(e.target.value)}
                  placeholder="Auto-generated"
                  className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1 flex-1 placeholder:text-gray-300 bg-transparent" />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400 w-28 flex-shrink-0">Date</span>
                <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                  className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1 flex-1 bg-transparent" />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Schedule section divider */}
        <div className="flex items-center gap-3 mt-8 mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 whitespace-nowrap">Payment Schedule</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Payment schedule table */}
        <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "34%" }}>Description</th>
                <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "17%" }}>Amount Due</th>
                <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "17%" }}>Amount Paid</th>
                <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "17%" }}>Date</th>
                <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "15%" }}>Signed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-3 text-gray-700">
                    {row.editable_label ? (
                      <Input value={row.label}
                        onChange={e => handleRowChange(row.id, "label", e.target.value)}
                        className="border-none focus-visible:ring-0 text-sm p-0 h-auto bg-transparent" />
                    ) : (
                      <span className="whitespace-pre-line text-sm">{row.label}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <Input type="number" min="0" step="0.01"
                      value={row.amount_due}
                      onChange={e => handleRowChange(row.id, "amount_due", e.target.value)}
                      placeholder="£0.00"
                      className="border-none text-center focus-visible:ring-0 text-sm bg-transparent" />
                  </td>
                  <td className="py-2 px-3">
                    <Input type="number" min="0" step="0.01"
                      value={row.amount_paid}
                      onChange={e => handleRowChange(row.id, "amount_paid", e.target.value)}
                      placeholder="£0.00"
                      className="border-none text-center focus-visible:ring-0 text-sm text-red-600 bg-transparent" />
                  </td>
                  <td className="py-2 px-3">
                    <Input type="date" value={row.date}
                      onChange={e => handleRowChange(row.id, "date", e.target.value)}
                      className="border-none text-center focus-visible:ring-0 text-sm bg-transparent" />
                  </td>
                  <td className="py-2 px-3">
                    <Input value={row.signed}
                      onChange={e => handleRowChange(row.id, "signed", e.target.value)}
                      placeholder="..."
                      className="border-none text-center focus-visible:ring-0 text-sm bg-transparent" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-10">
          <div className="w-80 rounded-xl border border-gray-100 shadow-md overflow-hidden text-sm mt-6">
            <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
              <span>Total Amount Due</span><span className="text-gray-800">{fmt(totalDue)}</span>
            </div>
            <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
              <span>Amount Paid</span><span className="text-red-600">{fmt(totalPaid)}</span>
            </div>
            <div className="flex justify-between px-5 py-4 bg-gray-900 text-white font-semibold">
              <span>Balance Remaining</span>
              <span>{fmt(Math.max(0, (totalDue || 0) - (totalPaid || 0)))}</span>
            </div>
          </div>
        </div>

        {/* Footer notes */}
        <div className="border-t border-gray-200 pt-8 mb-10 text-sm text-gray-600">
          <p>Only Bacs or Cash will be accepted on Delivery and Completion.</p>
          <p className="mt-1">We cannot confirm or guarantee a fitting date; only give a week commencing date once the deposit has been paid.</p>
        </div>

        {/* Signature */}
        <div className="border-t border-gray-200 pt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">Authorisation</p>
          <div className="space-y-6">
            {(['Customer Signature', 'Date'] as const).map(label => (
              <div key={label} className="flex items-end gap-6">
                <span className="text-sm text-gray-500 w-40 flex-shrink-0">{label}</span>
                <div className="flex-1 border-b border-gray-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
