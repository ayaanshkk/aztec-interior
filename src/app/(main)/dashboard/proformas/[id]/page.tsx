"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Printer, Download, Edit, X, Save, Plus, Trash2, CheckSquare } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://aztec-interior.onrender.com";
const API_FORM    = `${BACKEND_URL}/api/form`;

interface InvoiceItem {
  id: string | number;
  item_id?: number;
  item: string;
  item_name?: string;
  description: string;
  color: string;
  quantity: number;
  amount: number;
  width?: number;
  height?: number;
  depth?: number;
  line_total: number;
  discount_percent?: number;
  discounted_total?: number;
}

export default function ViewProformaPage() {
  const params    = useParams();
  const router    = useRouter();
  const invoiceId = params.id as string;

  const [invoice,      setInvoice]      = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [isEditing,    setIsEditing]    = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveMsg,      setSaveMsg]      = useState("");

  // Editable working state
  const [items,         setItems]         = useState<InvoiceItem[]>([]);
  const [vatPercentage, setVatPercentage] = useState(20);
  const [formData,      setFormData]      = useState({
    customer_name:    "",
    customer_address: "",
    customer_phone:   "",
    customer_email:   "",
    invoice_date:     "",
    due_date:         "",
    status:           "Draft",
    notes:            "",
  });
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [nextId, setNextId] = useState(1000);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

  const calcDiscounted = (qty: number, amount: number, pct: number) => {
    const base = qty * amount;
    return pct > 0 ? base - base * (pct / 100) : base;
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/proformas/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
        setVatPercentage(data.vat_rate || 20);
        initEditState(data);
      } else {
        alert("Failed to load invoice");
      }
    } catch (e) {
      console.error(e);
      alert("Error loading invoice");
    } finally {
      setLoading(false);
    }
  };

  const initEditState = (data: any) => {
    setFormData({
      customer_name:    data.customer_name    || "",
      customer_address: data.customer_address || "",
      customer_phone:   data.customer_phone   || "",
      customer_email:   data.customer_email   || "",
      invoice_date:     (data.invoice_date || "").split("T")[0],
      due_date:         (data.due_date     || "").split("T")[0],
      status:           data.status || "Draft",
      notes:            data.notes  || "",
    });
    const mapped: InvoiceItem[] = (data.items || []).map((i: any) => ({
      id:               i.item_id || i.id,
      item_id:          i.item_id || i.id,
      item:             i.item    || i.item_name || "",
      description:      i.description || "",
      color:            i.color  || i.colour || "",
      quantity:         i.quantity || 1,
      amount:           i.amount  || 0,
      width:            i.width,
      height:           i.height,
      depth:            i.depth,
      line_total:       (i.amount || 0) * (i.quantity || 1),
      discount_percent: i.discount_percent || 0,
      discounted_total: i.discounted_total || (i.amount || 0) * (i.quantity || 1),
    }));
    setItems(mapped);
    setNextId((mapped.length || 0) + 1000);
  };

  const startEditing = () => {
    initEditState(invoice);
    setIsEditing(true);
    setSaveMsg("");
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSaveMsg("");
  };

  // ── Item helpers ──────────────────────────────────────────────────────────
  const handleItemChange = (id: string | number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (['quantity', 'amount', 'discount_percent'].includes(field as string)) {
        const qty = field === 'quantity'         ? parseFloat(value) || 1 : updated.quantity       || 1;
        const amt = field === 'amount'           ? parseFloat(value) || 0 : updated.amount         || 0;
        const pct = field === 'discount_percent' ? parseFloat(value) || 0 : updated.discount_percent || 0;
        updated.line_total       = qty * amt;
        updated.discounted_total = calcDiscounted(qty, amt, pct);
      }
      return updated;
    }));
  };

  const addRow = () => {
    setItems(prev => [...prev, {
      id: nextId, item: "", description: "", color: "",
      quantity: 1, amount: 0, line_total: 0, discount_percent: 0, discounted_total: 0,
    }]);
    setNextId(n => n + 1);
  };

  const deleteRow = (id: string | number) => setItems(prev => prev.filter(i => i.id !== id));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg("");
    try {
      const token      = localStorage.getItem("token");
      const subtotalBD = items.reduce((sum, i) =>
        sum + ((i.discount_percent && i.discount_percent > 0) ? (i.discounted_total || 0) : i.line_total), 0);
      const discAmt    = subtotalBD * (globalDiscountPercent / 100);
      const subtotal   = subtotalBD - discAmt;

      const res = await fetch(`${API_FORM}/proformas/${invoiceId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          vat_rate: vatPercentage,
          items: items
            .filter(i => i.item || i.description || i.line_total > 0)
            .map(i => ({
              item:             i.item,
              description:      i.description,
              color:            i.color,
              quantity:         i.quantity || 1,
              amount:           i.line_total,
              discount_percent: i.discount_percent || 0,
              discounted_total: i.discounted_total || i.line_total,
              width: i.width, height: i.height, depth: i.depth,
            })),
        }),
      });

      if (res.ok) {
        setSaveMsg("✅ Proforma updated successfully!");
        setIsEditing(false);
        fetchInvoice(); // Refresh data
      } else {
        const err = await res.json();
        setSaveMsg(`❌ Failed: ${err.error || "Unknown error"}`);
      }
    } catch (e) {
      setSaveMsg("❌ Network error");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  };

  // ── Computed totals ───────────────────────────────────────────────────────
  const displayItems  = isEditing ? items : (invoice?.items || []).map((i: any) => ({
    ...i,
    item:       i.item || i.item_name || "",
    line_total: (i.amount || 0) * (i.quantity || 1),
  }));

  const subtotalBD    = displayItems.reduce((sum: number, i: any) =>
    sum + ((i.discount_percent && i.discount_percent > 0) ? (i.discounted_total || 0) : (i.line_total || 0)), 0);
  const discAmt       = subtotalBD * (globalDiscountPercent / 100);
  const subtotal      = isEditing ? subtotalBD - discAmt : (invoice?.subtotal || 0);
  const vatRate       = isEditing ? vatPercentage : (invoice?.vat_rate || 20);
  const vat           = isEditing ? subtotal * (vatRate / 100) : (invoice?.vat_amount || 0);
  const total         = isEditing ? subtotal + vat : (invoice?.total || 0);

  const displayCustomerName    = isEditing ? formData.customer_name    : (invoice?.customer_name    || "—");
  const displayCustomerAddress = isEditing ? formData.customer_address : (invoice?.customer_address || "—");
  const displayCustomerPhone   = isEditing ? formData.customer_phone   : (invoice?.customer_phone   || "—");
  const displayInvoiceDate     = isEditing ? formData.invoice_date     : (invoice?.invoice_date || "").split("T")[0];
  const displayDueDate         = isEditing ? formData.due_date         : (invoice?.due_date     || "").split("T")[0];

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Loading invoice...</p></div>;
  if (!invoice) return <div className="flex min-h-screen items-center justify-center"><p>Proforma not found</p></div>;

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
              <h1 className="text-2xl font-bold">Proforma Invoice {invoice.invoice_number}</h1>
              <p className="text-sm text-gray-600">Customer: {invoice.customer_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.print()} variant="outline">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline"
              onClick={() => window.open(`${API_FORM}/proformas/${invoiceId}/pdf`, "_blank")}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>

            {isEditing ? (
              <>
                <Button variant="outline" onClick={cancelEditing}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Proforma"}
                </Button>
              </>
            ) : (
              <Button onClick={startEditing}>
                <Edit className="mr-2 h-4 w-4" /> Edit Proforma
              </Button>
            )}
          </div>
        </div>
        {isEditing && (
          <div className="mt-2 rounded-md bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            ✏️ Editing mode — make your changes and press Save Proforma
          </div>
        )}
        {saveMsg && (
          <div className={`mt-2 rounded-md px-4 py-2 text-sm font-medium ${
            saveMsg.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {saveMsg}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* Company header */}
        <div className="mb-8 text-center">
          <div className="text-4xl font-bold tracking-wider text-gray-800">AZTEC INTERIORS</div>
        </div>
        <div className="mb-6 space-y-1 bg-green-200 p-3 text-sm">
          <p className="font-semibold">Registered to England No 5246881</p>
          <p className="font-semibold">VAT Reg No.686 8010 72</p>
        </div>
        <div className="mb-6 space-y-1 bg-yellow-200 p-3 text-sm">
          <p className="font-semibold">Acc name : Aztec Interiors Leicester LTD</p>
          <p className="font-semibold">Bank : HSBC</p>
          <p className="font-semibold">s/code: 40 28 06</p>
          <p className="font-semibold">acc no: 43820343</p>
        </div>
        <div className="mb-6 bg-gray-100 p-3 text-sm">
          <p>Please use your name and/or road name as reference:</p>
        </div>
        <h1 className="mb-6 text-center text-2xl font-bold">PROFORMA INVOICE</h1>

        {/* Customer info */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              {[
                { label: "PROFORMA DATE:", key: "invoice_date", display: displayInvoiceDate, type: "date" },
                { label: "DUE DATE:",     key: "due_date",     display: displayDueDate,     type: "date" },
                { label: "NAME:",         key: "customer_name",    display: displayCustomerName,    type: "text" },
                { label: "ADDRESS:",      key: "customer_address", display: displayCustomerAddress, type: "textarea" },
                { label: "TEL:",          key: "customer_phone",   display: displayCustomerPhone,   type: "text" },
              ].map(({ label, key, display, type }) => (
                <tr key={key}>
                  <td className="border border-black bg-gray-50 px-3 py-2 font-semibold" style={{ width: "20%" }}>
                    {label}
                  </td>
                  <td className="border border-black px-3 py-2">
                    {isEditing ? (
                      type === "textarea" ? (
                        <textarea value={(formData as any)[key]}
                          onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full resize-none text-sm focus:outline-none" rows={2} />
                      ) : (
                        <Input type={type} value={(formData as any)[key]}
                          onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                          className="border-none p-0 focus-visible:ring-0 text-sm h-auto" />
                      )
                    ) : (
                      display || "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Items table */}
        <div className="mb-4">
          {isEditing && (
            <div className="mb-3 flex justify-end">
              <Button onClick={addRow} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white">
                  <th className="border border-black px-3 py-2 text-left font-bold text-xs">ITEM</th>
                  <th className="border border-black px-3 py-2 text-left font-bold text-xs">DESCRIPTION</th>
                  <th className="border border-black px-3 py-2 text-left font-bold text-xs">COLOUR</th>
                  <th className="border border-black px-3 py-2 text-center font-bold text-xs">QTY</th>
                  {isEditing && <>
                    <th className="border border-black px-2 py-2 text-center font-bold text-xs">W</th>
                    <th className="border border-black px-2 py-2 text-center font-bold text-xs">H</th>
                    <th className="border border-black px-2 py-2 text-center font-bold text-xs">D</th>
                    <th className="border border-black px-2 py-2 text-right font-bold text-xs">PRICE</th>
                    <th className="border border-black px-2 py-2 text-center font-bold text-xs">DISC %</th>
                  </>}
                  <th className="border border-black px-3 py-2 text-right font-bold text-xs">AMOUNT</th>
                  {isEditing && <th className="border border-black px-2 py-2 text-center font-bold text-xs"></th>}
                </tr>
              </thead>
              <tbody>
                {displayItems
                  .filter((i: any) => i.item?.trim() || i.description?.trim() || i.amount > 0 || i.line_total > 0)
                  .map((item: any, index: number) => (
                    isEditing ? (
                      <tr key={item.id}>
                        <td className="border border-black p-1">
                          <Input value={item.item}
                            onChange={e => handleItemChange(item.id, "item", e.target.value)}
                            placeholder="Code" className="border-none focus-visible:ring-0 text-xs font-mono" />
                        </td>
                        <td className="border border-black p-1">
                          <textarea value={item.description}
                            onChange={e => handleItemChange(item.id, "description", e.target.value)}
                            className="w-full resize-none text-xs focus:outline-none" rows={2}
                            style={{ minHeight: "35px" }} />
                        </td>
                        <td className="border border-black p-1">
                          <Input value={item.color}
                            onChange={e => handleItemChange(item.id, "color", e.target.value)}
                            className="border-none focus-visible:ring-0 text-xs" />
                        </td>
                        <td className="border border-black p-1">
                          <Input type="number" min="1" value={item.quantity}
                            onChange={e => handleItemChange(item.id, "quantity", e.target.value)}
                            className="border-none text-center focus-visible:ring-0 w-[45px] text-xs" />
                        </td>
                        {(["width","height","depth"] as const).map(dim => (
                          <td key={dim} className="border border-black p-1">
                            <Input type="number" value={item[dim] || ""}
                              onChange={e => handleItemChange(item.id, dim, e.target.value)}
                              placeholder="—" className="border-none text-center focus-visible:ring-0 w-[50px] text-xs" />
                          </td>
                        ))}
                        <td className="border border-black p-1">
                          <Input type="number" step="0.01" min="0" value={item.amount}
                            onChange={e => handleItemChange(item.id, "amount", e.target.value)}
                            className="border-none text-right focus-visible:ring-0 w-[70px] text-xs" />
                        </td>
                        <td className="border border-black p-1">
                          <Input type="number" step="0.1" min="0" max="100"
                            value={item.discount_percent || ""}
                            onChange={e => handleItemChange(item.id, "discount_percent", e.target.value)}
                            placeholder="0" className="border-none text-center focus-visible:ring-0 w-[50px] text-xs" />
                        </td>
                        <td className="border border-black px-2 py-1 text-right text-xs font-semibold">
                          {item.discount_percent > 0 ? (
                            <div>
                              <div className="text-gray-400 line-through">{fmt(item.line_total)}</div>
                              <div className="text-green-700">{fmt(item.discounted_total || 0)}</div>
                            </div>
                          ) : fmt(item.line_total)}
                        </td>
                        <td className="border border-black p-1 text-center">
                          <Button variant="ghost" size="icon" onClick={() => deleteRow(item.id)}
                            className="h-7 w-7 text-red-600 hover:bg-red-50">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={index}>
                        <td className="border border-black px-3 py-2 text-sm">{item.item || item.item_name || "—"}</td>
                        <td className="border border-black px-3 py-2 text-sm">{item.description || "—"}</td>
                        <td className="border border-black px-3 py-2 text-sm">{item.color || item.colour || "—"}</td>
                        <td className="border border-black px-3 py-2 text-center text-sm">{item.quantity || 1}</td>
                        <td className="border border-black px-3 py-2 text-right font-semibold text-sm">
                          {fmt((item.amount || 0) * (item.quantity || 1))}
                        </td>
                      </tr>
                    )
                  ))}

                {displayItems.filter((i: any) =>
                  i.item?.trim() || i.description?.trim() || i.amount > 0 || i.line_total > 0
                ).length === 0 && (
                  <tr>
                    <td colSpan={isEditing ? 11 : 5}
                      className="border border-black px-3 py-8 text-center text-gray-500">
                      No items in this invoice
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {isEditing && (
            <div className="mt-3 flex justify-between">
              <Button onClick={addRow} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <CheckSquare className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Proforma"}
              </Button>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="mb-6 flex justify-end">
          <table className="border-collapse" style={{ width: "40%" }}>
            <tbody>
              {isEditing && (
                <>
                  <tr>
                    <td className="border border-black bg-gray-50 px-3 py-2 font-semibold">SUB TOTAL</td>
                    <td className="border border-black px-3 py-2 text-right">{fmt(subtotalBD)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-gray-50 px-3 py-2 font-semibold">
                      <div className="flex items-center justify-between gap-2">
                        <span>DISCOUNT</span>
                        <div className="flex items-center gap-1">
                          <Input type="number" min="0" max="100" step="0.1"
                            value={globalDiscountPercent}
                            onChange={e => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm" />
                          <span className="text-sm">%</span>
                        </div>
                      </div>
                    </td>
                    <td className="border border-black px-3 py-2 text-right text-red-600">
                      {globalDiscountPercent > 0 ? `-${fmt(discAmt)}` : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-gray-50 px-3 py-2 font-semibold">
                      <div className="flex items-center justify-between gap-2">
                        <span>VAT</span>
                        <div className="flex items-center gap-1">
                          <Input type="number" min="0" max="100" step="0.1"
                            value={vatPercentage}
                            onChange={e => setVatPercentage(parseFloat(e.target.value) || 0)}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm" />
                          <span className="text-sm">%</span>
                        </div>
                      </div>
                    </td>
                    <td className="border border-black px-3 py-2 text-right">{fmt(vat)}</td>
                  </tr>
                </>
              )}
              {!isEditing && (
                <>
                  <tr>
                    <td className="border border-black bg-gray-50 px-3 py-2 font-semibold">SUB TOTAL</td>
                    <td className="border border-black px-3 py-2 text-right">{fmt(subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-gray-50 px-3 py-2 font-semibold">VAT ({vatRate}%)</td>
                    <td className="border border-black px-3 py-2 text-right">{fmt(vat)}</td>
                  </tr>
                </>
              )}
              <tr>
                <td className="border border-black bg-gray-50 px-3 py-2 font-bold">TOTAL</td>
                <td className="border border-black px-3 py-2 text-right font-bold">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment terms */}
        <div className="mb-6 space-y-2 text-sm">
          <p className="font-semibold">Only Bacs or Cash will be accepted on Delivery and Completion</p>
          <p className="font-semibold">NOTE: Payment is due within 30 days of the invoice date.</p>
        </div>
        <div className="mb-8 text-sm font-semibold text-red-600">
          <p>Please contact us if you have any queries regarding this invoice.</p>
        </div>

        {/* Signature */}
        <div className="space-y-4 text-sm">
          {["Customer Signature:", "Customer Name:", "Date:"].map(label => (
            <div key={label} className="flex items-center">
              <span className="mr-2">{label}</span>
              <span className="flex-1 border-b border-dotted border-black" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}