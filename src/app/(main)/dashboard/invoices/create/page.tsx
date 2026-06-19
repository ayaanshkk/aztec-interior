"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BACKEND_URL } from "@/lib/api";
import Image from "next/image";

const API_FORM = `${BACKEND_URL}/api/form`;

interface InvoiceItem {
  id: string;
  item: string;
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
  autoFitting?: boolean;
}

const FITTING_CODES_LIST = ["KUNIT", "BUNIT", "ROBE", "APPL", "SINKTAP", "FITDR", "PANW"];

export default function CreateInvoicePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user }     = useAuth();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    invoice_date: new Date().toISOString().split("T")[0],
    due_date:     new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    name:         "",
    address:      "",
    phone:        "",
    email:        "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([{
    id: "1", item: "", description: "", color: "",
    quantity: 1, amount: 0, line_total: 0, discount_percent: 0, discounted_total: 0,
  }]);

  // Always-fresh ref for items (avoids stale closure in async handlers)
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const [saving,                setSaving]                = useState(false);
  const [autoFilling,           setAutoFilling]           = useState<string | null>(null);
  const [vatPercentage,         setVatPercentage]         = useState(20);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [doorType,              setDoorType]              = useState("Carcass Only");
  const [roomType,              setRoomType]              = useState("Kitchen");

  const recalcInProgress = useRef(false);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

  const calcDiscounted = (qty: number, amount: number, pct: number) => {
    const base = qty * amount;
    return pct > 0 ? base - base * (pct / 100) : base;
  };

  // Populate customer from URL params
  useEffect(() => {
    const cid  = searchParams.get("customerId");
    const name = searchParams.get("customerName");
    if (cid) setCustomerId(cid);
    if (name) {
      setFormData(prev => ({
        ...prev,
        name:    name                                 || "",
        address: searchParams.get("customerAddress") || "",
        phone:   searchParams.get("customerPhone")   || "",
        email:   searchParams.get("customerEmail")   || "",
      }));
    }
  }, [searchParams]);

  // Re-price all coded items when door/room type changes
  useEffect(() => {
    const currentItems = itemsRef.current;
    if (!currentItems.some(i => i.item && i.item.trim().length > 0)) return;

    const updateAllPrices = async () => {
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";

      const updates = await Promise.all(
        currentItems.map(async item => {
          if (!item.item || item.item.trim().length === 0) return null;
          const code        = item.item.trim().toUpperCase();
          const hasSuffix   = code.includes("-");
          const baseCode    = code.split("-")[0];
          const isAppliance = /^[A-Z]{2,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;

          const body: any = { description: code };
          if (!hasSuffix && !isAppliance) { body.door_type = doorType; body.room_type = roomType; }
          else if (!isAppliance)          { body.room_type = roomType; }

          try {
            const res  = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-ID": tenantId },
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
          return { ...item, amount: hit.price, description: hit.description, line_total: hit.price * (item.quantity || 1) };
        })
      );
    };

    updateAllPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorType, roomType]);

  // Dynamic fitting recalculation — debounced, runs when items change
  useEffect(() => {
    const recalcFittings = async () => {
      if (recalcInProgress.current) return;
      const currentItems = itemsRef.current;
      const fittingRows  = currentItems.filter(
        i => i.autoFitting && FITTING_CODES_LIST.includes((i.item || "").trim().toUpperCase())
      );
      if (fittingRows.length === 0) return;

      recalcInProgress.current = true;
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";

      const nonFittingSnapshot = currentItems
        .filter(i => !FITTING_CODES_LIST.includes((i.item || "").trim().toUpperCase()))
        .map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));

      try {
        const results = await Promise.all(
          fittingRows.map(async row => {
            const code = (row.item || "").trim().toUpperCase();
            try {
              const res  = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-ID": tenantId },
                body: JSON.stringify({ description: code, current_items: nonFittingSnapshot }),
              });
              const data = await res.json();
              return { id: row.id, found: data.found, quantity: data.quantity || 0, price: data.price || 0 };
            } catch { return { id: row.id, found: false, quantity: 0, price: 0 }; }
          })
        );

        setItems(prev => {
          let changed = false;
          const updated = prev
            .map(item => {
              const result = results.find(r => r.id === item.id);
              if (!result) return item;
              if (!result.found || result.quantity === 0) { changed = true; return null; }
              if (item.quantity !== result.quantity || item.amount !== result.price) {
                changed = true;
                return {
                  ...item,
                  quantity:         result.quantity,
                  amount:           result.price,
                  line_total:       result.price * result.quantity,
                  discounted_total: item.discount_percent
                    ? calcDiscounted(result.quantity, result.price, item.discount_percent)
                    : result.price * result.quantity,
                };
              }
              return item;
            })
            .filter((i): i is InvoiceItem => i !== null);
          return changed ? updated : prev;
        });
      } finally { recalcInProgress.current = false; }
    };

    const timer = setTimeout(recalcFittings, 800);
    return () => clearTimeout(timer);
  }, [items]);

  // Item code auto-fill + FITTING expansion
  const handleItemChange = async (id: string, field: keyof InvoiceItem, value: any) => {
    // Always update state first
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

    if (field !== "item" || !value || value.length < 1) return;

    const trimmed = value.trim().toUpperCase();

    // FITTING EXPANSION
    if (trimmed === "FITTING") {
      setAutoFilling(id);
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      const snapshot = itemsRef.current
        .filter(i => i.id !== id)
        .map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));

      try {
        const fittingResults = await Promise.all(
          FITTING_CODES_LIST.map(async code => {
            try {
              const res  = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-ID": tenantId },
                body: JSON.stringify({ description: code, current_items: snapshot }),
              });
              const data = await res.json();
              if (data.found && data.quantity > 0)
                return { code, price: data.price, quantity: data.quantity, name: data.item_name };
              return null;
            } catch { return null; }
          })
        );

        const validFittings = fittingResults.filter(Boolean) as {
          code: string; price: number; quantity: number; name: string;
        }[];

        if (validFittings.length === 0) {
          alert("No fitting items detected. Add kitchen/bedroom units first.");
          setAutoFilling(null);
          return;
        }

        setItems(prev => {
          const withoutPlaceholder = prev.filter(i => i.id !== id);
          const newRows: InvoiceItem[] = validFittings.map(f => ({
            id:               `fitting-${f.code}-${Date.now()}-${Math.random()}`,
            item:             f.code,
            description:      f.name,
            color:            "",
            quantity:         f.quantity,
            amount:           f.price,
            line_total:       f.price * f.quantity,
            discount_percent: 0,
            discounted_total: f.price * f.quantity,
            autoFitting:      true,
          }));
          return [...withoutPlaceholder, ...newRows];
        });
      } catch (e) { console.error("Fitting expansion failed:", e); }
      finally     { setAutoFilling(null); }
      return;
    }
    // END FITTING EXPANSION

    if (trimmed.length > 100) return;

    const hasSuffix   = trimmed.includes("-");
    const baseCode    = trimmed.split("-")[0];
    const isAppliance = /^[A-Z]{2,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;
    const MANUAL_FITTING_CODES = ["APPL", "SINKTAP", "KUNIT", "BUNIT", "ROBE", "WTJT", "FITDR", "PANW"];
    const isFittingCode = MANUAL_FITTING_CODES.includes(trimmed);

    const currentItemsSnapshot = itemsRef.current
      .filter(i => i.id !== id)
      .map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));

    const body: any = {
      description:   trimmed,
      current_items: isFittingCode ? [] : currentItemsSnapshot,
    };
    if (!hasSuffix && !isAppliance) { body.door_type = doorType; body.room_type = roomType; }
    else if (!isAppliance)          { body.room_type = roomType; }

    setAutoFilling(id);
    try {
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      const res      = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-ID": tenantId },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.found) {
        let desc = data.description || data.item_name || "";
        if (data.is_fitting) desc = data.item_name || "";
        else if (isAppliance && data.brand && data.series_level) {
          desc = `${data.item_name} - ${data.brand} ${data.series_level}${data.series_info ? ` (${data.series_info})` : ""}`;
        }
        const fittingQty = data.is_fitting && data.quantity ? data.quantity : null;

        setItems(prev => prev.map(item => {
          if (item.id !== id) return item;
          const qty = fittingQty !== null ? fittingQty : (item.quantity || 1);
          return {
            ...item,
            item:             trimmed,
            description:      desc,
            amount:           data.price || 0,
            quantity:         qty,
            width:            data.width,
            height:           data.height,
            depth:            data.depth,
            line_total:       (data.price || 0) * qty,
            discounted_total: item.discount_percent
              ? calcDiscounted(qty, data.price || 0, item.discount_percent)
              : (data.price || 0) * qty,
          };
        }));
      }
    } catch (e) { console.error("Auto-price lookup failed:", e); }
    finally     { setAutoFilling(null); }
  };

  // Description auto-fill
  const handleDescriptionChange = async (id: string, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, description: value } : i));
    if (!value || value.length < 5) return;

    setAutoFilling(id);
    try {
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      const res      = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-ID": tenantId },
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
    } catch (e) { console.error("Description auto-fill failed:", e); }
    finally     { setAutoFilling(null); }
  };

  const handleAddItem = () => setItems(prev => [
    ...prev,
    { id: Date.now().toString(), item: "", description: "", color: "",
      quantity: 1, amount: 0, line_total: 0, discount_percent: 0, discounted_total: 0 },
  ]);

  const handleRemoveItem = (id: string) => {
    if (confirm("Remove this item?")) setItems(prev => prev.filter(i => i.id !== id));
  };

  // Save
  const handleSave = async () => {
    if (saving) return;
    if (!formData.name?.trim())    { alert("Customer name is required");    return; }
    if (!formData.address?.trim()) { alert("Customer address is required"); return; }

    const subtotalBD = items.reduce((sum, i) =>
      sum + ((i.discount_percent && i.discount_percent > 0) ? (i.discounted_total || 0) : i.line_total), 0);
    const discAmt  = subtotalBD * (globalDiscountPercent / 100);
    const subtotal = subtotalBD - discAmt;

    if (subtotal <= 0) { alert("Please add at least one item with a valid price"); return; }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/invoices`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          client_id:               customerId,
          customer_name:           formData.name,
          customer_address:        formData.address,
          customer_phone:          formData.phone,
          customer_email:          formData.email,
          invoice_date:            formData.invoice_date,
          due_date:                formData.due_date,
          subtotal,
          vat_percentage:          vatPercentage,
          global_discount_percent: globalDiscountPercent,
          global_discount_amount:  discAmt,
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
        const data  = await res.json();
        const invId = data.invoice_id || data.id;
        alert("Invoice created successfully!");
        window.open(`/dashboard/invoices/${invId}`, "_blank");
        router.push(customerId ? `/dashboard/customers/${customerId}` : "/dashboard/invoices");
      } else {
        const err = await res.json();
        alert(`Failed to save: ${err.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error saving invoice");
    } finally {
      setSaving(false);
    }
  };

  // Computed totals
  const subtotalBD = items.reduce((sum, i) =>
    sum + ((i.discount_percent && i.discount_percent > 0) ? (i.discounted_total || 0) : i.line_total), 0);
  const discAmt  = subtotalBD * (globalDiscountPercent / 100);
  const subtotal = subtotalBD - discAmt;
  const vat      = subtotal * (vatPercentage / 100);
  const total    = subtotal + vat;

  const today      = new Date().toLocaleDateString("en-GB");
  const defaultDue = new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-GB");

  return (
    <div className="min-h-screen bg-white">

      {/* Top nav header */}
      <div className="border-b bg-gray-50 px-8 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create New Invoice</h1>
              <p className="text-sm text-gray-600">Fill in the details below to create an invoice</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">

        {/* Company header */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <Image src="/images/logo3.png" alt="Logo" width={80} height={80} className="object-contain" />
          <div className="text-4xl font-bold tracking-wider text-gray-800">ATELIER LUXE INTERIORS</div>
        </div>

        <div className="mb-1 bg-green-200 p-3 text-sm">
          <p className="font-semibold">Registered to England No 5246881 &nbsp;|&nbsp; VAT Reg No.686 8010 72</p>
        </div>
        <div className="mb-1 bg-yellow-200 p-3 text-sm">
          <p className="font-semibold">
            Acc name: Atelier Luxe Interiors LTD &nbsp;|&nbsp; Bank: Tide &nbsp;|&nbsp; Sort Code: 04 06 05 &nbsp;|&nbsp; Acc No: 31621197
          </p>
        </div>
        <div className="mb-6 bg-gray-100 p-3 text-sm">
          <p className="font-semibold">Please use your name and/or road name as reference</p>
        </div>

        <h1 className="mb-4 text-center text-3xl font-bold tracking-widest">INVOICE</h1>

        {/* Right-aligned reference block */}
        <div className="mb-6 flex justify-end">
          <table className="border-collapse text-sm">
            <tbody>
              {[
                { label: "INVOICE NO:", value: "(auto-generated on save)" },
                { label: "DATE:",       value: today },
                { label: "DUE DATE:",   value: defaultDue },
              ].map(({ label, value }) => (
                <tr key={label}>
                  <td className="border border-black bg-gray-100 px-4 py-1.5 font-bold w-36">{label}</td>
                  <td className="border border-black px-4 py-1.5 text-right w-44 text-gray-500 italic">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Door / Room type dropdowns */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Room Type <span className="text-red-600">*</span>
            </label>
            <select value={roomType} onChange={e => setRoomType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Kitchen">Kitchen</option>
              <option value="Bedroom">Bedroom</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Door Type <span className="text-red-600">*</span>
            </label>
            <select value={doorType} onChange={e => setDoorType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
            Selected: <span className="font-bold">{roomType}</span> with{" "}
            <span className="font-bold">{doorType}</span> doors
          </p>
          <p className="text-xs text-blue-700 mb-2">
            Prices are automatically looked up when you enter item codes.
          </p>
          <div className="mt-3 border-t border-blue-200 pt-3">
            <p className="mb-1 text-xs font-semibold text-blue-900">Component-Only Pricing (Advanced):</p>
            <ul className="ml-4 space-y-0.5 text-xs text-blue-700">
              <li>• <code className="rounded bg-blue-100 px-1">50B</code> = Carcass + {doorType} (complete unit)</li>
              <li>• <code className="rounded bg-blue-100 px-1">50B-BS</code> = Basic Slab door component only</li>
              <li>• <code className="rounded bg-blue-100 px-1">50B-AG</code> = Acrylic door component only</li>
              <li>• <code className="rounded bg-blue-100 px-1">50B-VD</code> = Vinyl door component only</li>
              <li>• <code className="rounded bg-blue-100 px-1">50B-BG</code> = Black Glass door component only</li>
              <li>• <code className="rounded bg-blue-100 px-1">FITTING</code> = Auto-detect all fittings from invoice items</li>
            </ul>
          </div>
        </div>

        {/* Customer info table */}
        <div className="mb-8">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2 font-bold" style={{ width: "22%" }}>INVOICE DATE:</td>
                <td className="border border-black p-0">
                  <Input type="date" value={formData.invoice_date}
                    onChange={e => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    className="border-none focus-visible:ring-0 text-sm" />
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2 font-bold">DUE DATE:</td>
                <td className="border border-black p-0">
                  <Input type="date" value={formData.due_date}
                    onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="border-none focus-visible:ring-0 text-sm" />
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2 font-bold">NAME:</td>
                <td className="border border-black p-0">
                  <Input type="text" value={formData.name} placeholder="Customer full name"
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="border-none focus-visible:ring-0 text-sm" />
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2 font-bold">ADDRESS:</td>
                <td className="border border-black p-0">
                  <textarea value={formData.address} rows={2} placeholder="Customer address"
                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full resize-none px-3 py-2 text-sm focus:outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2 font-bold">TEL:</td>
                <td className="border border-black p-0">
                  <Input type="text" value={formData.phone} placeholder="Customer phone"
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="border-none focus-visible:ring-0 text-sm" />
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2 font-bold">EMAIL:</td>
                <td className="border border-black p-0">
                  <Input type="email" value={formData.email} placeholder="Customer email"
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="border-none focus-visible:ring-0 text-sm" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Items table */}
        <div className="mb-4">
          <div className="mb-3">
            <Button onClick={handleAddItem} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr className="bg-gray-100 text-xs font-bold">
                  <th className="border border-black px-1 py-2 text-center" style={{ width: "8%" }}>ITEM</th>
                  <th className="border border-black px-1 py-2 text-left"   style={{ width: "22%" }}>DESCRIPTION</th>
                  <th className="border border-black px-1 py-2 text-center" style={{ width: "7%" }}>COLOUR</th>
                  <th className="border border-black px-1 py-2 text-center" style={{ width: "5%" }}>QTY</th>
                  <th className="border border-black px-1 py-2 text-center" style={{ width: "5%" }}>W</th>
                  <th className="border border-black px-1 py-2 text-center" style={{ width: "5%" }}>H</th>
                  <th className="border border-black px-1 py-2 text-center" style={{ width: "5%" }}>D</th>
                  <th className="border border-black px-1 py-2 text-right"  style={{ width: "8%" }}>PRICE</th>
                  <th className="border border-black px-1 py-2 text-right"  style={{ width: "9%" }}>AMOUNT</th>
                  <th className="border border-black px-1 py-2 text-center" style={{ width: "6%" }}>DISC %</th>
                  <th className="border border-black px-1 py-2 text-right"  style={{ width: "9%" }}>FINAL</th>
                  <th className="border border-black px-1 py-2 text-center" style={{ width: "4%" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className={item.autoFitting ? "bg-orange-50" : ""}>

                    {/* ITEM CODE */}
                    <td className="border border-black p-0">
                      <Input
                        value={item.item}
                        onChange={e => handleItemChange(item.id, "item", e.target.value)}
                        onBlur={e => { const v = e.target.value.trim(); if (v.length >= 1) handleItemChange(item.id, "item", v); }}
                        placeholder="50B"
                        className={`border-none focus-visible:ring-0 font-mono text-xs w-full ${autoFilling === item.id ? "animate-pulse bg-blue-50" : ""}`}
                      />
                    </td>

                    {/* DESCRIPTION */}
                    <td className="border border-black p-0">
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
                        className={`w-full resize-none text-xs focus:outline-none px-1 py-1 ${autoFilling === item.id ? "animate-pulse bg-blue-50" : ""}`}
                      />
                    </td>

                    {/* COLOUR */}
                    <td className="border border-black p-0">
                      <Input value={item.color} placeholder="Colour"
                        onChange={e => handleItemChange(item.id, "color", e.target.value)}
                        className="border-none focus-visible:ring-0 text-xs w-full" />
                    </td>

                    {/* QTY */}
                    <td className="border border-black p-0">
                      <Input type="number" min="1" value={item.quantity}
                        onChange={e => handleItemChange(item.id, "quantity", e.target.value)}
                        className="border-none text-center focus-visible:ring-0 w-full text-xs" />
                    </td>

                    {/* W / H / D */}
                    {(["width", "height", "depth"] as const).map(dim => (
                      <td key={dim} className="border border-black p-0">
                        <Input type="number" value={item[dim] || ""} placeholder="—"
                          onChange={e => handleItemChange(item.id, dim, e.target.value)}
                          className="border-none text-center focus-visible:ring-0 w-full text-xs" />
                      </td>
                    ))}

                    {/* PRICE */}
                    <td className="border border-black p-0">
                      <Input type="number" step="0.01" min="0" value={item.amount} placeholder="0.00"
                        onChange={e => handleItemChange(item.id, "amount", e.target.value)}
                        className="border-none text-right focus-visible:ring-0 w-full text-xs" />
                    </td>

                    {/* AMOUNT */}
                    <td className="border border-black px-2 py-1 text-right text-xs font-semibold">
                      {fmt(item.line_total)}
                    </td>

                    {/* DISC % */}
                    <td className="border border-black p-0">
                      <Input type="number" step="0.1" min="0" max="100"
                        value={item.discount_percent || ""} placeholder="0"
                        onChange={e => handleItemChange(item.id, "discount_percent", e.target.value)}
                        className="border-none text-center focus-visible:ring-0 w-full text-xs" />
                    </td>

                    {/* FINAL */}
                    <td className="border border-black px-2 py-1 text-right text-xs">
                      {item.discount_percent && item.discount_percent > 0 ? (
                        <div>
                          <div className="text-gray-400 line-through">{fmt(item.line_total)}</div>
                          <div className="font-semibold text-green-700">{fmt(item.discounted_total || 0)}</div>
                        </div>
                      ) : (
                        <span className="font-semibold">{fmt(item.line_total)}</span>
                      )}
                    </td>

                    {/* DELETE */}
                    <td className="border border-black p-1 text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}
                        className="h-7 w-7 text-red-600 hover:bg-red-50">
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

          <div className="mt-3">
            <Button onClick={handleAddItem} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>
        </div>

        {/* Totals */}
        <div className="mb-8 flex justify-end">
          <table className="border-collapse text-sm" style={{ width: "42%" }}>
            <tbody>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2 font-bold">SUB TOTAL</td>
                <td className="border border-black px-3 py-2 text-right">{fmt(subtotalBD)}</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2 font-bold">
                  <div className="flex items-center justify-between gap-2">
                    <span>DISCOUNT</span>
                    <div className="flex items-center gap-1">
                      <Input type="number" min="0" max="100" step="0.1" value={globalDiscountPercent}
                        onChange={e => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)}
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-xs" />
                      <span className="text-xs">%</span>
                    </div>
                  </div>
                </td>
                <td className="border border-black px-3 py-2 text-right text-red-600">
                  {globalDiscountPercent > 0 ? `-${fmt(discAmt)}` : "—"}
                </td>
              </tr>
              {globalDiscountPercent > 0 && (
                <tr>
                  <td className="border border-black bg-blue-50 px-3 py-2 font-bold">SUBTOTAL AFTER DISCOUNT</td>
                  <td className="border border-black px-3 py-2 text-right font-bold">{fmt(subtotal)}</td>
                </tr>
              )}
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2 font-bold">
                  <div className="flex items-center justify-between gap-2">
                    <span>VAT</span>
                    <div className="flex items-center gap-1">
                      <Input type="number" min="0" max="100" step="0.1" value={vatPercentage}
                        onChange={e => setVatPercentage(parseFloat(e.target.value) || 0)}
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-xs" />
                      <span className="text-xs">%</span>
                    </div>
                  </div>
                </td>
                <td className="border border-black px-3 py-2 text-right">{fmt(vat)}</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2 font-bold text-base">TOTAL DUE</td>
                <td className="border border-black px-3 py-2 text-right font-bold text-base">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment terms */}
        <div className="mb-4 space-y-1 text-sm">
          <p className="font-semibold">Only Bacs or Cash will be accepted on Delivery and Completion</p>
          <p className="font-semibold">NOTE: Payment is due within 30 days of the invoice date.</p>
        </div>
        <div className="mb-8 text-sm font-semibold text-red-600">
          <p>Please sign here to confirm.</p>
        </div>

        {/* Signature lines */}
        <div className="mb-10 space-y-4 text-sm">
          {["Customer Signature:", "Customer Name:", "Date:"].map(label => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-40 shrink-0">{label}</span>
              <span className="flex-1 border-b border-black" />
            </div>
          ))}
        </div>

        {/* Bottom action bar */}
        <div className="flex justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Invoice"}
          </Button>
        </div>

      </div>
    </div>
  );
}