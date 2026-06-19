"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { BACKEND_URL } from "@/lib/api";

const API_FORM = `${BACKEND_URL}/api/form`;

interface InvoiceItem {
  id: string | number;
  item: string;
  description: string;
  color: string;
  quantity: number;
  amount: number;
  width?: number | string;
  height?: number | string;
  depth?: number | string;
  line_total: number;
  discount_percent?: number;
  discounted_total?: number;
}

export default function EditInvoicePage() {
  const { id: invoiceId } = useParams() as { id: string };
  const router             = useRouter();
  const { user }           = useAuth();

  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [autoFilling,  setAutoFilling]  = useState<string | number | null>(null);
  const [saveMsg,      setSaveMsg]      = useState("");
  const [nextId,       setNextId]       = useState(9000);

  const [formData, setFormData] = useState({
    customer_name:    "",
    customer_address: "",
    customer_phone:   "",
    customer_email:   "",
    invoice_date:     "",
    due_date:         "",
    status:           "Draft",
    notes:            "",
  });

  const [items,                 setItems]                 = useState<InvoiceItem[]>([]);
  const [vatPercentage,         setVatPercentage]         = useState(20);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);

  // Door / room type — same as create invoice and quote pages
  const [doorType, setDoorType] = useState("Carcass Only");
  const [roomType, setRoomType] = useState("Kitchen");

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

  const calcDiscounted = (qty: number, amount: number, pct: number) => {
    const base = qty * amount;
    return pct > 0 ? base - base * (pct / 100) : base;
  };

  // ── Load invoice ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert("Failed to load invoice"); return; }

      const data = await res.json();
      setVatPercentage(data.vat_rate || 20);
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

      const mapped: InvoiceItem[] = (data.items || []).map((i: any, idx: number) => ({
        id:               i.item_id || i.id || idx + 1,
        item:             i.item || i.item_name || "",
        description:      i.description || "",
        color:            i.color || i.colour || "",
        quantity:         i.quantity || 1,
        amount:           i.amount || 0,
        width:            i.width,
        height:           i.height,
        depth:            i.depth,
        line_total:       (i.amount || 0) * (i.quantity || 1),
        discount_percent: i.discount_percent || 0,
        discounted_total: i.discounted_total || (i.amount || 0) * (i.quantity || 1),
      }));
      setItems(mapped);
      setNextId((mapped.length || 0) + 9000);
    } catch (e) {
      console.error(e);
      alert("Error loading invoice");
    } finally {
      setLoading(false);
    }
  };

  // ── Re-price all coded items when door/room type changes ──────────────────
  useEffect(() => {
    if (items.length === 0) return;
    if (!items.some(i => i.item && i.item.trim().length > 0)) return;

    const updateAllPrices = async () => {
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";

      const updates = await Promise.all(
        items.map(async item => {
          if (!item.item || item.item.trim().length === 0) return null;
          const code        = item.item.trim().toUpperCase();
          const hasSuffix   = code.includes("-");
          const isAppliance = /^[A-Z]{2,}[0-9]{2,}[A-Z0-9]{2,}$/i.test(code.split("-")[0]);

          const body: any = { description: code };
          if (!hasSuffix && !isAppliance) { body.door_type = doorType; body.room_type = roomType; }
          else if (!isAppliance)          { body.room_type = roomType; }

          try {
            const res  = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "X-Tenant-ID": tenantId,
              },
              body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.found) return { id: item.id, price: data.price, description: data.description || data.item_name };
          } catch { /* silent */ }
          return null;
        })
      );

      setItems(prev =>
        prev.map(item => {
          const hit = updates.find(u => u && u.id === item.id);
          if (!hit) return item;
          const qty = item.quantity || 1;
          return {
            ...item,
            amount:      hit.price,
            description: hit.description || item.description,
            line_total:  hit.price * qty,
          };
        })
      );
    };

    updateAllPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorType, roomType]);

  // ── Item field change + auto-price lookup on code entry ───────────────────
  const handleItemChange = async (id: string | number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (["quantity", "amount", "discount_percent"].includes(field as string)) {
        const qty = field === "quantity"         ? parseFloat(value) || 1 : updated.quantity        || 1;
        const amt = field === "amount"           ? parseFloat(value) || 0 : updated.amount          || 0;
        const pct = field === "discount_percent" ? parseFloat(value) || 0 : updated.discount_percent || 0;
        updated.line_total       = qty * amt;
        updated.discounted_total = calcDiscounted(qty, amt, pct);
      }
      return updated;
    }));

    if (field === "item" && value && value.length >= 2) {
      const code = value.trim().toUpperCase();
      if (code.includes(" ") || code.length > 20) return;

      const hasSuffix   = code.includes("-");
      const isAppliance = /^[A-Z]{2,}[0-9]{2,}[A-Z0-9]{2,}$/i.test(code.split("-")[0]);

      setAutoFilling(id);
      try {
        const token    = localStorage.getItem("token");
        const tenantId = localStorage.getItem("tenantId") || "7";

        const body: any = { description: code };
        if (!hasSuffix && !isAppliance) { body.door_type = doorType; body.room_type = roomType; }
        else if (!isAppliance)          { body.room_type = roomType; }

        const res  = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${token}`,
            "X-Tenant-ID":  tenantId,
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (data.found) {
          let desc = data.description || data.item_name || "";
          if (isAppliance && data.brand && data.series_level) {
            desc = `${data.item_name} - ${data.brand} ${data.series_level}${data.series_info ? ` (${data.series_info})` : ""}`;
          }
          setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            return {
              ...item,
              item:        code,
              description: desc,
              amount:      data.price || 0,
              width:       data.width,
              height:      data.height,
              depth:       data.depth,
              line_total:  (data.price || 0) * (item.quantity || 1),
            };
          }));
        }
      } catch (e) {
        console.error("Auto-price lookup failed:", e);
      } finally {
        setAutoFilling(null);
      }
    }
  };

  const handleDescriptionChange = async (id: string | number, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, description: value } : i));
    if (!value || value.length < 5) return;

    setAutoFilling(id);
    try {
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";

      const res  = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
          "X-Tenant-ID":  tenantId,
        },
        body: JSON.stringify({ description: value, door_type: doorType, room_type: roomType }),
      });
      const data = await res.json();

      if (data.found) {
        setItems(prev => prev.map(item => {
          if (item.id !== id) return item;
          return {
            ...item,
            item:       data.item_code || item.item,
            amount:     data.price || 0,
            width:      data.width,
            height:     data.height,
            depth:      data.depth,
            line_total: (data.price || 0) * (item.quantity || 1),
          };
        }));
      }
    } catch (e) {
      console.error("Description auto-fill failed:", e);
    } finally {
      setAutoFilling(null);
    }
  };

  const addRow = () => {
    setItems(prev => [...prev, {
      id: nextId, item: "", description: "", color: "",
      quantity: 1, amount: 0, line_total: 0, discount_percent: 0, discounted_total: 0,
    }]);
    setNextId(n => n + 1);
  };

  const removeRow = (id: string | number) => {
    if (items.length === 1) { alert("Invoice must have at least one item."); return; }
    if (confirm("Remove this item?")) setItems(prev => prev.filter(i => i.id !== id));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saving) return;
    if (!formData.customer_name?.trim())    { alert("Customer name is required");    return; }
    if (!formData.customer_address?.trim()) { alert("Customer address is required"); return; }

    setSaving(true);
    setSaveMsg("");
    try {
      const token      = localStorage.getItem("token");
      const subtotalBD = items.reduce((sum, i) =>
        sum + ((i.discount_percent && i.discount_percent > 0) ? (i.discounted_total || 0) : i.line_total), 0);
      const discAmt  = subtotalBD * (globalDiscountPercent / 100);
      const subtotal = subtotalBD - discAmt;

      const res = await fetch(`${API_FORM}/invoices/${invoiceId}`, {
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
              width:  i.width,
              height: i.height,
              depth:  i.depth,
            })),
        }),
      });

      if (res.ok) {
        setSaveMsg("✅ Invoice updated successfully!");
        setTimeout(() => {
          router.push(`/dashboard/invoices/${invoiceId}`);
        }, 800);
      } else {
        const err = await res.json();
        setSaveMsg(`❌ Failed: ${err.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      setSaveMsg("❌ Network error saving invoice");
    } finally {
      setSaving(false);
      if (saveMsg.startsWith("❌")) setTimeout(() => setSaveMsg(""), 5000);
    }
  };

  // ── Computed totals ───────────────────────────────────────────────────────
  const subtotalBD = items.reduce((sum, i) =>
    sum + ((i.discount_percent && i.discount_percent > 0) ? (i.discounted_total || 0) : i.line_total), 0);
  const discAmt  = subtotalBD * (globalDiscountPercent / 100);
  const subtotal = subtotalBD - discAmt;
  const vat      = subtotal * (vatPercentage / 100);
  const total    = subtotal + vat;

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">Loading invoice...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <div className="border-b bg-gray-50 px-8 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Invoice</h1>
              <p className="text-sm text-gray-600">
                {formData.customer_name ? `Customer: ${formData.customer_name}` : "Make your changes and save"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </div>

        {/* Editing banner */}
        <div className="mt-2 rounded-md bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
          ✏️ Editing mode — make your changes and press Save Invoice
        </div>

        {saveMsg && (
          <div className={`mt-2 rounded-md px-4 py-2 text-sm font-medium ${
            saveMsg.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {saveMsg}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
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
        <div className="mb-6 space-y-1 bg-green-200 p-3 text-sm">
          <p className="font-semibold">Registered to England No 5246881</p>
        </div>
        <div className="mb-6 space-y-1 bg-yellow-200 p-3 text-sm">
          <p className="font-semibold">Acc name : Atelier Luxe Interiors LTD</p>
          <p className="font-semibold">Bank : Tide</p>
          <p className="font-semibold">Sort Code: 04 06 05</p>
          <p className="font-semibold">Acc No: 31621197</p>
        </div>
        <div className="mb-6 bg-gray-100 p-3 text-sm">
          <p>Please use your name and/or road name as reference:</p>
        </div>
        <h1 className="mb-6 text-center text-2xl font-bold">INVOICE</h1>

        {/* ── Door / Room type dropdowns ── */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Room Type <span className="text-red-600">*</span>
            </label>
            <select
              value={roomType}
              onChange={e => setRoomType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Kitchen">Kitchen</option>
              <option value="Bedroom">Bedroom</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Door Type <span className="text-red-600">*</span>
            </label>
            <select
              value={doorType}
              onChange={e => setDoorType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Carcass Only">Carcass Only (No Doors/Drawers)</option>
              <option value="Basic Slab">Slab</option>
              <option value="Acrylic Gloss/Matt">Lacquered Slab</option>
              <option value="Vinyl Doors">Vinyl Doors</option>
              <option value="Black Glass">Black Glass</option>
            </select>
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4">
          <p className="mb-2 text-sm font-medium text-blue-900">
            💡 Selected: <span className="font-bold">{roomType}</span> with{" "}
            <span className="font-bold">{doorType}</span> doors
          </p>
          <p className="text-xs text-blue-700 mb-2">
            Prices are automatically looked up when you enter item codes.
          </p>
          <div className="mt-3 border-t border-blue-200 pt-3">
            <p className="mb-1 text-xs font-semibold text-blue-900">🎯 Component-Only Pricing (Advanced):</p>
            <ul className="ml-4 space-y-0.5 text-xs text-blue-700">
              <li>• <code className="rounded bg-blue-100 px-1">50B</code> = Carcass + {doorType} (complete unit)</li>
              <li>• <code className="rounded bg-blue-100 px-1">50B-BS</code> = Basic Slab door component only</li>
              <li>• <code className="rounded bg-blue-100 px-1">50B-AG</code> = Acrylic door component only</li>
              <li>• <code className="rounded bg-blue-100 px-1">50B-VD</code> = Vinyl door component only</li>
              <li>• <code className="rounded bg-blue-100 px-1">50B-BG</code> = Black Glass door component only</li>
            </ul>
          </div>
        </div>

        {/* ── Customer info ── */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              {[
                { label: "INVOICE DATE:", field: "invoice_date", type: "date" },
                { label: "DUE DATE:",     field: "due_date",     type: "date" },
                { label: "NAME:",         field: "customer_name",    type: "text" },
                { label: "ADDRESS:",      field: "customer_address", type: "textarea" },
                { label: "TEL:",          field: "customer_phone",   type: "text" },
                { label: "EMAIL:",        field: "customer_email",   type: "email" },
                { label: "STATUS:",       field: "status",           type: "select" },
              ].map(({ label, field, type }) => (
                <tr key={field}>
                  <td className="border border-black bg-gray-50 px-3 py-2 font-semibold" style={{ width: "20%" }}>
                    {label}
                  </td>
                  <td className="border border-black p-0">
                    {type === "textarea" ? (
                      <textarea
                        value={(formData as any)[field]}
                        onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full resize-none px-3 py-2 text-sm focus:outline-none"
                        rows={2}
                      />
                    ) : type === "select" ? (
                      <select
                        value={(formData as any)[field]}
                        onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full border-none px-3 py-2 text-sm focus:outline-none"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    ) : (
                      <Input
                        type={type}
                        value={(formData as any)[field]}
                        onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                        className="border-none focus-visible:ring-0"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Items table ── */}
        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold">Invoice Items</h3>
            <Button onClick={addRow} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white text-xs font-bold">
                  {["ITEM", "DESCRIPTION", "COLOUR", "QTY", "W", "H", "D", "PRICE", "AMOUNT", "DISC %", "FINAL", ""].map(h => (
                    <th key={h} className="border border-black px-2 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    {/* ITEM CODE */}
                    <td className="border border-black p-1">
                      <Input
                        value={item.item}
                        onChange={e => handleItemChange(item.id, "item", e.target.value)}
                        placeholder="50B"
                        className={`border-none focus-visible:ring-0 font-mono text-xs ${
                          autoFilling === item.id ? "animate-pulse bg-blue-50" : ""
                        }`}
                      />
                    </td>

                    {/* DESCRIPTION */}
                    <td className="border border-black p-1">
                      <textarea
                        value={item.description}
                        onChange={e => handleDescriptionChange(item.id, e.target.value)}
                        placeholder="Description"
                        rows={2}
                        style={{ minHeight: "35px", lineHeight: "1.3" }}
                        onInput={e => {
                          const t = e.target as HTMLTextAreaElement;
                          t.style.height = "auto";
                          t.style.height = `${t.scrollHeight}px`;
                        }}
                        className={`w-full resize-none text-xs focus:outline-none ${
                          autoFilling === item.id ? "animate-pulse bg-blue-50" : ""
                        }`}
                      />
                    </td>

                    {/* COLOUR */}
                    <td className="border border-black p-1">
                      <Input
                        value={item.color}
                        onChange={e => handleItemChange(item.id, "color", e.target.value)}
                        placeholder="Colour"
                        className="border-none focus-visible:ring-0 text-xs"
                      />
                    </td>

                    {/* QTY */}
                    <td className="border border-black p-1">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleItemChange(item.id, "quantity", e.target.value)}
                        className="border-none text-center focus-visible:ring-0 w-[45px] text-xs"
                      />
                    </td>

                    {/* W / H / D */}
                    {(["width", "height", "depth"] as const).map(dim => (
                      <td key={dim} className="border border-black p-1">
                        <Input
                          type="number"
                          value={item[dim] || ""}
                          onChange={e => handleItemChange(item.id, dim, e.target.value)}
                          placeholder="—"
                          className="border-none text-center focus-visible:ring-0 w-[55px] text-xs"
                        />
                      </td>
                    ))}

                    {/* PRICE */}
                    <td className="border border-black p-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.amount}
                        onChange={e => handleItemChange(item.id, "amount", e.target.value)}
                        className="border-none text-right focus-visible:ring-0 w-[70px] text-xs"
                      />
                    </td>

                    {/* AMOUNT */}
                    <td className="border border-black px-2 py-1 text-right text-xs font-semibold">
                      {fmt(item.line_total)}
                    </td>

                    {/* DISC % */}
                    <td className="border border-black p-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={item.discount_percent || ""}
                        onChange={e => handleItemChange(item.id, "discount_percent", e.target.value)}
                        placeholder="0"
                        className="border-none text-center focus-visible:ring-0 w-[55px] text-xs"
                      />
                    </td>

                    {/* FINAL */}
                    <td className="border border-black px-2 py-1 text-right text-xs">
                      {item.discount_percent && item.discount_percent > 0 ? (
                        <div>
                          <div className="text-xs text-gray-400 line-through">{fmt(item.line_total)}</div>
                          <div className="text-xs font-semibold text-green-700">{fmt(item.discounted_total || 0)}</div>
                        </div>
                      ) : (
                        <span className="font-semibold">{fmt(item.line_total)}</span>
                      )}
                    </td>

                    {/* DELETE */}
                    <td className="border border-black p-1 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(item.id)}
                        className="h-7 w-7 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={12} className="border border-black px-3 py-8 text-center text-gray-500">
                      No items yet. Click "Add Item" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-between">
            <Button onClick={addRow} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </div>

        {/* ── Totals ── */}
        <div className="mb-6 flex justify-end">
          <table className="border-collapse" style={{ width: "40%" }}>
            <tbody>
              <tr>
                <td className="border border-black bg-gray-50 px-3 py-2 font-semibold">SUB TOTAL</td>
                <td className="border border-black px-3 py-2 text-right">{fmt(subtotalBD)}</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-50 px-3 py-2 font-semibold">
                  <div className="flex items-center justify-between gap-2">
                    <span>DISCOUNT</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={globalDiscountPercent}
                        onChange={e => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)}
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                </td>
                <td className="border border-black px-3 py-2 text-right text-red-600">
                  {globalDiscountPercent > 0 ? `-${fmt(discAmt)}` : "—"}
                </td>
              </tr>
              {globalDiscountPercent > 0 && (
                <tr>
                  <td className="border border-black bg-blue-50 px-3 py-2 font-semibold">
                    SUBTOTAL AFTER DISCOUNT
                  </td>
                  <td className="border border-black px-3 py-2 text-right font-semibold">{fmt(subtotal)}</td>
                </tr>
              )}
              <tr>
                <td className="border border-black bg-gray-50 px-3 py-2 font-semibold">
                  <div className="flex items-center justify-between gap-2">
                    <span>VAT</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={vatPercentage}
                        onChange={e => setVatPercentage(parseFloat(e.target.value) || 0)}
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                </td>
                <td className="border border-black px-3 py-2 text-right">{fmt(vat)}</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-50 px-3 py-2 font-bold">TOTAL</td>
                <td className="border border-black px-3 py-2 text-right font-bold">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Notes</label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            placeholder="Any additional notes for this invoice..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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

        {/* Bottom save bar */}
        <div className="mt-10 flex justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}