"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Edit, X, CheckSquare, Printer } from "lucide-react";
import Image from 'next/image';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://aztec-interior.onrender.com";
const API_FORM    = `${BACKEND_URL}/api/form`;

interface PaymentRow {
  id: string;
  label: string;
  amount_due: number | "";
  amount_paid: number | "";
  date: string;
  signed: string;
}

const DEFAULT_LABELS = [
  "Deposit",
  "6 wks Prior to commencement of works",
  "On Completion",
];

export default function ViewPaymentTermsPage() {
  const params = useParams();
  const router = useRouter();
  const ptId   = params.id as string;

  const [data,       setData]       = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [isEditing,  setIsEditing]  = useState(false);
  const [isSaving,   setIsSaving]   = useState(false);
  const [saveMsg,    setSaveMsg]     = useState("");

  // Edit working state
  const [rows,    setRows]    = useState<PaymentRow[]>([]);
  const [formData,setFormData]= useState({ date: "", name: "", address: "", phone: "" });

  const fmt = (v: number | "") =>
    v === "" || v === 0 ? "£0.00"
    : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(v));

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => { fetchData(); }, [ptId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/payment-terms/${ptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
        initEdit(d);
      } else {
        alert("Failed to load payment terms");
      }
    } catch { alert("Network error"); }
    finally { setLoading(false); }
  };

  const initEdit = (d: any) => {
    setFormData({
      date:    (d.date || "").split("T")[0],
      name:    d.customer_name    || "",
      address: d.customer_address || "",
      phone:   d.customer_phone   || "",
    });

    const savedRows = d.payment_rows || [];
    const mapped: PaymentRow[] = DEFAULT_LABELS.map((label, i) => {
      const saved = savedRows[i] || {};
      return {
        id:          String(i + 1),
        label:       saved.label || label,
        amount_due:  saved.amount_due  !== undefined ? saved.amount_due  : "",
        amount_paid: saved.amount_paid !== undefined ? saved.amount_paid : "",
        date:        saved.date    || "",
        signed:      saved.signed  || "",
      };
    });
    setRows(mapped);
  };

  const startEditing = () => { initEdit(data); setIsEditing(true); setSaveMsg(""); };
  const cancelEdit   = () => { setIsEditing(false); setSaveMsg(""); };

  // ── Row change ────────────────────────────────────────────────────────────
  const handleRowChange = (id: string, field: keyof PaymentRow, value: any) => {
    setRows(prev => prev.map(r =>
      r.id !== id ? r :
      { ...r, [field]: (field === "amount_due" || field === "amount_paid")
          ? (value === "" ? "" : Number(value)) : value }
    ));
  };

  const totalDue  = rows.reduce((s, r) => s + (Number(r.amount_due)  || 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg("");
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/payment-terms/${ptId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          customer_name:    formData.name,
          customer_address: formData.address,
          customer_phone:   formData.phone,
          payment_rows: rows.map(r => ({
            label:       r.label,
            amount_due:  Number(r.amount_due)  || 0,
            amount_paid: Number(r.amount_paid) || 0,
            date:        r.date,
            signed:      r.signed,
          })),
        }),
      });

      if (res.ok) {
        setSaveMsg("✅ Payment terms updated!");
        setIsEditing(false);
        fetchData();
      } else {
        const err = await res.json();
        setSaveMsg(`❌ ${err.error || "Failed"}`);
      }
    } catch { setSaveMsg("❌ Network error"); }
    finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  };

  // ── Display values (view mode uses saved data, edit uses working state) ───
  const displayRows = isEditing ? rows : (data?.payment_rows || []).map((r: any, i: number) => ({
    ...r, id: String(i + 1), label: r.label || DEFAULT_LABELS[i] || `Row ${i + 1}`,
    amount_due: r.amount_due || "", amount_paid: r.amount_paid || "",
  }));

  const viewTotalDue  = isEditing ? totalDue  : (data?.total_amount_due  || 0);
  const viewTotalPaid = isEditing ? totalPaid : (data?.total_amount_paid || 0);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>;
  if (!data)   return <div className="flex min-h-screen items-center justify-center"><p>Not found</p></div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-gray-50 px-8 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Payment Terms {data.pt_number}</h1>
              <p className="text-sm text-gray-600">Customer: {data.customer_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline"
              onClick={() => window.open(`${API_FORM}/payment-terms/${ptId}/pdf`, "_blank")}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            {isEditing ? (
              <>
                <Button variant="outline" onClick={cancelEdit}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button onClick={startEditing}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </div>
        {isEditing && (
          <div className="mt-2 rounded-md bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            ✏️ Editing mode — make your changes and press Save
          </div>
        )}
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

        {/* BACS bars */}
        <div className="mb-1 bg-green-200 p-2 text-sm font-semibold">Bacs details:</div>
        <div className="mb-3 bg-yellow-200 p-2 text-sm">
          <p className="font-semibold">Please use your name and/or road name as reference:</p>
          <p>Acc name : Atelier Luxe Interiors LTD</p>
          <p>Bank : ClearBank</p>
          <p>Sort Code: 04 06 05</p>
          <p>Acc No: 31621197</p>
        </div>

        {/* Date */}
        <div className="mb-4 flex items-center gap-3">
          <label className="w-24 text-sm font-semibold">DATE:</label>
          {isEditing ? (
            <Input type="date" value={formData.date}
              onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
              className="w-48" />
          ) : (
            <span className="text-sm">{data.date ? new Date(data.date).toLocaleDateString("en-GB") : "—"}</span>
          )}
        </div>

        {/* Customer table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              {[
                { label: "NAME",      field: "name",    display: data.customer_name    || "—" },
                { label: "ADDRESS",   field: "address", display: data.customer_address || "—" },
                { label: "PHONE NO.", field: "phone",   display: data.customer_phone   || "—" },
              ].map(({ label, field, display }) => (
                <tr key={field}>
                  <td className="w-36 border border-black bg-gray-100 px-3 py-2 text-sm font-bold">{label}</td>
                  <td className="border border-black px-3 py-2 text-sm">
                    {isEditing ? (
                      <Input value={(formData as any)[field]}
                        onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))}
                        className="border-none p-0 focus-visible:ring-0 h-auto text-sm" />
                    ) : display}
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
                <th className="border border-black px-3 py-2 text-left"  style={{ width: "34%" }}></th>
                <th className="border border-black px-3 py-2 text-center" style={{ width: "17%" }}>AMOUNT DUE</th>
                <th className="border border-black px-3 py-2 text-center text-red-600" style={{ width: "17%" }}>AMOUNT PAID</th>
                <th className="border border-black px-3 py-2 text-center" style={{ width: "17%" }}>DATE</th>
                <th className="border border-black px-3 py-2 text-center" style={{ width: "15%" }}>SIGNED</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row: any) => (
                <tr key={row.id}>
                  <td className="border border-black px-3 py-3 text-sm font-medium whitespace-pre-line">
                    {row.label}
                  </td>
                  {isEditing ? (
                    <>
                      <td className="border border-black p-1">
                        <Input type="number" min="0" step="0.01" value={row.amount_due}
                          onChange={e => handleRowChange(row.id, "amount_due", e.target.value)}
                          className="border-none text-center focus-visible:ring-0 text-sm" />
                      </td>
                      <td className="border border-black p-1">
                        <Input type="number" min="0" step="0.01" value={row.amount_paid}
                          onChange={e => handleRowChange(row.id, "amount_paid", e.target.value)}
                          className="border-none text-center focus-visible:ring-0 text-sm text-red-600" />
                      </td>
                      <td className="border border-black p-1">
                        <Input type="date" value={row.date}
                          onChange={e => handleRowChange(row.id, "date", e.target.value)}
                          className="border-none text-center focus-visible:ring-0 text-sm" />
                      </td>
                      <td className="border border-black p-1">
                        <Input value={row.signed}
                          onChange={e => handleRowChange(row.id, "signed", e.target.value)}
                          className="border-none text-center focus-visible:ring-0 text-sm" />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border border-black px-3 py-2 text-center text-sm">
                        {row.amount_due ? fmt(row.amount_due) : ""}
                      </td>
                      <td className="border border-black px-3 py-2 text-center text-sm text-red-600">
                        {row.amount_paid ? fmt(row.amount_paid) : ""}
                      </td>
                      <td className="border border-black px-3 py-2 text-center text-sm">
                        {row.date ? new Date(row.date).toLocaleDateString("en-GB") : ""}
                      </td>
                      <td className="border border-black px-3 py-2 text-center text-sm">{row.signed || ""}</td>
                    </>
                  )}
                </tr>
              ))}

              {/* Totals */}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-black px-3 py-2 text-sm">TOTAL</td>
                <td className="border border-black px-3 py-2 text-center text-sm">{fmt(viewTotalDue)}</td>
                <td className="border border-black px-3 py-2 text-center text-sm text-red-600">{fmt(viewTotalPaid)}</td>
                <td className="border border-black px-3 py-2" />
                <td className="border border-black px-3 py-2" />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mb-4 text-sm font-semibold">
          <p>Only Bacs or Cash will be accepted on Delivery and Completion</p>
        </div>
        <div className="mb-6 text-sm font-semibold text-red-600">
          <p>We can not confirm or guarantee a fitting date, only give a week commencing</p>
          <p>date once the deposit has been paid.</p>
        </div>
        <div className="mb-8 text-sm font-bold text-red-600">
          <p>Please sign here to confirm.</p>
        </div>

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