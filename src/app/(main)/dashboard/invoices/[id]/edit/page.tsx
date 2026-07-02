"use client";

import React, { useEffect, useState, useRef } from "react";
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
  autoFitting?: boolean;
  subItems?: InvoiceItem[];
  section?: string;
}

const SECTIONS = [
  "Furniture",
  "Fillers and End Panels",
  "Accessories",
  "Handles",
  "Appliances",
  "Sink and Tap",
  "Worktops",
  "Fittings",
] as const;

const FITTING_CODES_LIST = ["KUNIT", "BUNIT", "ROBE", "APPL", "SINKTAP", "FITDR", "PANW"];

export default function EditInvoicePage() {
  const { id: invoiceId } = useParams() as { id: string };
  const router             = useRouter();
  const { user }           = useAuth();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState("");
  const [autoFilling, setAutoFilling] = useState<string | number | null>(null);
  const [nextId,   setNextId]   = useState(9000);

  const [formData, setFormData] = useState({
    customer_name:    "",
    customer_address: "",
    customer_phone:   "",
    customer_email:   "",
    invoice_date:     "",
    due_date:         "",
    notes:            "",
    room_name:        "",
    carcass_colour:   "",
    door_colour:      "",
    panelwork_colour: "",
    door_style:       "",
  });

  const [items,                  setItems]                  = useState<InvoiceItem[]>([]);
  const [vatPercentage,          setVatPercentage]          = useState(20);
  const [globalDiscountPercent,  setGlobalDiscountPercent]  = useState(0);
  const [deposit,                setDeposit]                = useState(0);
  const [sectionDiscounts,       setSectionDiscounts]       = useState<Record<string, number>>({});
  const [sectionDiscountAmounts, setSectionDiscountAmounts] = useState<Record<string, string>>({});
  const [doorType,               setDoorType]               = useState("Carcass Only");
  const [roomType,               setRoomType]               = useState("Kitchen");

  const itemsRef         = useRef(items);
  const recalcInProgress = useRef(false);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

  const calcDiscounted = (qty: number, amount: number, pct: number) => {
    const base = qty * amount;
    return pct > 0 ? base - base * (pct / 100) : base;
  };

  // ── Load invoice ──────────────────────────────────────────────────────────
  useEffect(() => { fetchInvoice(); }, [invoiceId]);

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
      setDeposit(data.deposit_paid || 0);
      if (data.section_discounts) setSectionDiscounts(data.section_discounts);
      if (data.door_type) setDoorType(data.door_type);
      if (data.room_type) setRoomType(data.room_type);

      setFormData({
        customer_name:    data.customer_name    || "",
        customer_address: data.customer_address || "",
        customer_phone:   data.customer_phone   || "",
        customer_email:   data.customer_email   || "",
        invoice_date:     (data.invoice_date || "").split("T")[0],
        due_date:         (data.due_date     || "").split("T")[0],
        notes:            data.notes  || "",
        room_name:        data.room_name        || "",
        carcass_colour:   data.carcass_colour   || "",
        door_colour:      data.door_colour      || "",
        panelwork_colour: data.panelwork_colour || "",
        door_style:       data.door_style       || "",
      });

      const allItems = data.items || [];
      const topLevel = allItems.filter((i: any) => !i.is_sub_item);
      const subItems = allItems.filter((i: any) => i.is_sub_item);

      // Group sub-items by position — each sub-item follows its parent in order
      // Since there's no parent_item_id, we assign sub-items to the preceding top-level item
      let lastParentIdx = -1;
      const subItemsByParent: Record<number, any[]> = {};
      
      allItems.forEach((i: any) => {
        if (!i.is_sub_item) {
          lastParentIdx++;
          subItemsByParent[lastParentIdx] = [];
        } else if (lastParentIdx >= 0) {
          subItemsByParent[lastParentIdx].push(i);
        }
      });

      const mapped: InvoiceItem[] = topLevel.map((i: any, idx: number) => ({
        id:               i.item_id || i.id || idx + 1,
        item:             i.item || i.item_name || "",
        description:      i.description || "",
        color:            i.color || i.colour || "",
        quantity:         i.quantity || 1,
        amount:           parseFloat((i.amount || 0).toFixed(2)),
        width:            i.width,
        height:           i.height,
        depth:            i.depth,
        line_total:       parseFloat(((i.amount || 0) * (i.quantity || 1)).toFixed(2)),
        discount_percent: i.discount_percent || 0,
        discounted_total: parseFloat((i.discounted_total || (i.amount || 0) * (i.quantity || 1)).toFixed(2)),
        section:          i.section || "Furniture",
        subItems: (subItemsByParent[idx] || []).map((s: any, si: number) => ({
          id:               `sub-loaded-${idx}-${si}`,
          item:             s.item || s.item_name || "",
          description:      s.description || "",
          color:            s.color || s.colour || "",
          quantity:         s.quantity || 1,
          amount:           parseFloat((s.amount || 0).toFixed(2)),
          line_total:       parseFloat(((s.amount || 0) * (s.quantity || 1)).toFixed(2)),
          discount_percent: s.discount_percent || 0,
          discounted_total: parseFloat((s.discounted_total || (s.amount || 0) * (s.quantity || 1)).toFixed(2)),
        })),
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

  // ── Re-price when door/room type changes ──────────────────────────────────
  useEffect(() => {
    const current = itemsRef.current;
    if (current.length === 0 || !current.some(i => i.item && i.item.trim().length > 0)) return;

    const updateAllPrices = async () => {
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      const updates  = await Promise.all(
        current.map(async item => {
          if (!item.item || item.item.trim().length === 0) return null;
          const code        = item.item.trim();
          const hasSuffix   = code.includes("-");
          const baseCode    = code.split("-")[0];
          const isAppliance = /^[A-Z]{2,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;
          const body: any   = { description: code };
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
      setItems(prev => prev.map(item => {
        const hit = updates.find(u => u && u.id === item.id);
        if (!hit) return item;
        return { ...item, amount: hit.price, description: hit.description || item.description, line_total: hit.price * (item.quantity || 1) };
      }));
    };
    updateAllPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorType, roomType]);

  // ── Dynamic fitting recalculation ─────────────────────────────────────────
  useEffect(() => {
    const recalcFittings = async () => {
      if (recalcInProgress.current) return;
      const current     = itemsRef.current;
      const fittingRows = current.filter(i => i.autoFitting && FITTING_CODES_LIST.includes((i.item || "").trim().toUpperCase()));
      if (fittingRows.length === 0) return;
      recalcInProgress.current = true;
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      const snapshot = current
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
                body: JSON.stringify({ description: code, current_items: snapshot }),
              });
              const data = await res.json();
              return { id: row.id, found: data.found, quantity: data.quantity || 0, price: data.price || 0 };
            } catch { return { id: row.id, found: false, quantity: 0, price: 0 }; }
          })
        );
        setItems(prev => {
          let changed = false;
          const updated = prev.map(item => {
            const result = results.find(r => r.id === item.id);
            if (!result) return item;
            if (!result.found || result.quantity === 0) { changed = true; return null; }
            if (item.quantity !== result.quantity || item.amount !== result.price) {
              changed = true;
              return { ...item, quantity: result.quantity, amount: result.price, line_total: result.price * result.quantity,
                discounted_total: item.discount_percent ? calcDiscounted(result.quantity, result.price, item.discount_percent) : result.price * result.quantity };
            }
            return item;
          }).filter((i): i is InvoiceItem => i !== null);
          return changed ? updated : prev;
        });
      } finally { recalcInProgress.current = false; }
    };
    const timer = setTimeout(recalcFittings, 800);
    return () => clearTimeout(timer);
  }, [items]);

  // ── Item code auto-fill + FITTING expansion ────────────────────────────────
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

    if (field !== "item" || !value || value.length < 1) return;
    const trimmed = value.trim().toUpperCase();

    // FITTING EXPANSION
    if (trimmed === "FITTING") {
      setAutoFilling(id);
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      const snapshot = itemsRef.current.filter(i => i.id !== id).map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));
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
              if (data.found && data.quantity > 0) return { code, price: data.price, quantity: data.quantity, name: data.item_name };
              return null;
            } catch { return null; }
          })
        );
        const valid = fittingResults.filter(Boolean) as { code: string; price: number; quantity: number; name: string }[];
        if (valid.length === 0) { alert("No fitting items detected. Add kitchen/bedroom units first."); setAutoFilling(null); return; }
        setItems(prev => {
          const without = prev.filter(i => i.id !== id);
          return [...without, ...valid.map(f => ({
            id: `fitting-${f.code}-${Date.now()}-${Math.random()}`,
            item: f.code, description: f.name, color: "",
            quantity: f.quantity, amount: f.price, line_total: f.price * f.quantity,
            discount_percent: 0, discounted_total: f.price * f.quantity,
            autoFitting: true, section: "Fittings",
          }))];
        });
      } catch (e) { console.error("Fitting expansion failed:", e); }
      finally     { setAutoFilling(null); }
      return;
    }

    if (trimmed.length > 100) return;
    const hasSuffix   = trimmed.includes("-");
    const baseCode    = trimmed.split("-")[0];
    const isAppliance = /^[A-Z]{2,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;
    const MANUAL_FITTING = ["APPL", "SINKTAP", "KUNIT", "BUNIT", "ROBE", "WTJT", "FITDR", "PANW"];
    const snapshot = itemsRef.current.filter(i => i.id !== id).map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));
    const body: any = { description: trimmed, current_items: MANUAL_FITTING.includes(trimmed) ? [] : snapshot };
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
          return { ...item, item: trimmed, description: desc, amount: data.price || 0, quantity: qty,
            width: data.width, height: data.height, depth: data.depth,
            line_total: (data.price || 0) * qty,
            discounted_total: item.discount_percent ? calcDiscounted(qty, data.price || 0, item.discount_percent) : (data.price || 0) * qty };
        }));
      }
    } catch (e) { console.error("Auto-price lookup failed:", e); }
    finally     { setAutoFilling(null); }
  };

  // ── Description auto-fill ──────────────────────────────────────────────────
  const handleDescriptionChange = async (id: string | number, value: string) => {
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
          return { ...item, item: data.item_code || item.item, amount: data.price || 0,
            width: data.width, height: data.height, depth: data.depth,
            line_total: (data.price || 0) * (item.quantity || 1) };
        }));
      }
    } catch (e) { console.error("Description auto-fill failed:", e); }
    finally     { setAutoFilling(null); }
  };

  // ── Sub-item handlers ──────────────────────────────────────────────────────
  const handleAddSubItem = (parentId: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== parentId) return item;
      const newSub: InvoiceItem = {
        id: `sub-${Date.now()}-${Math.random()}`, item: "", description: "", color: "",
        quantity: 1, amount: 0, line_total: 0, discount_percent: 0, discounted_total: 0,
      };
      return { ...item, subItems: [...(item.subItems || []), newSub] };
    }));
  };

  const handleSubItemChange = (parentId: string | number, subId: string | number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== parentId || !item.subItems) return item;
      return {
        ...item,
        subItems: item.subItems.map(sub => {
          if (sub.id !== subId) return sub;
          const updated = { ...sub, [field]: value };
          if (["quantity", "amount", "discount_percent"].includes(field as string)) {
            const qty = field === "quantity"         ? parseFloat(value) || 1 : updated.quantity        || 1;
            const amt = field === "amount"           ? parseFloat(value) || 0 : updated.amount          || 0;
            const pct = field === "discount_percent" ? parseFloat(value) || 0 : updated.discount_percent || 0;
            updated.line_total       = qty * amt;
            updated.discounted_total = calcDiscounted(qty, amt, pct);
          }
          return updated;
        }),
      };
    }));
  };

  const handleRemoveSubItem = (parentId: string | number, subId: string | number) => {
    if (!confirm("Remove this sub-item?")) return;
    setItems(prev => prev.map(item => {
      if (item.id !== parentId || !item.subItems) return item;
      return { ...item, subItems: item.subItems.filter(s => s.id !== subId) };
    }));
  };

  const handleSubItemAutoFill = async (parentId: string | number, subId: string | number, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== parentId || !item.subItems) return item;
      return { ...item, subItems: item.subItems.map(sub => sub.id === subId ? { ...sub, item: value } : sub) };
    }));
    if (!value || value.trim().length < 1) return;
    const trimmed = value.trim().toUpperCase();
    if (trimmed.length > 100) return;
    try {
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      const hasSuffix   = trimmed.includes("-");
      const baseCode    = trimmed.split("-")[0];
      const isAppliance = /^[A-Z]{2,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;
      const body: any = { description: trimmed, current_items: [] };
      if (!hasSuffix && !isAppliance) { body.door_type = doorType; body.room_type = roomType; }
      else if (!isAppliance)          { body.room_type = roomType; }
      const res  = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
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
          if (item.id !== parentId || !item.subItems) return item;
          return {
            ...item,
            subItems: item.subItems.map(sub => {
              if (sub.id !== subId) return sub;
              const qty = fittingQty !== null ? fittingQty : (sub.quantity || 1);
              const price = data.price || 0;
              return { ...sub, item: data.item_code || trimmed, description: desc, amount: price, quantity: qty,
                width: data.width, height: data.height, depth: data.depth,
                line_total: price * qty, discounted_total: sub.discount_percent ? calcDiscounted(qty, price, sub.discount_percent) : price * qty };
            }),
          };
        }));
      }
    } catch (e) { console.error("Sub-item auto-fill failed:", e); }
  };

  const handleAddItem = (section: string) => {
    setItems(prev => [...prev, {
      id: nextId, item: "", description: "", color: "",
      quantity: 1, amount: 0, line_total: 0, discount_percent: 0, discounted_total: 0, section,
    }]);
    setNextId(n => n + 1);
  };

  const handleRemoveItem = (id: string | number) => {
    if (confirm("Remove this item?")) setItems(prev => prev.filter(i => i.id !== id));
  };

  // ── Computed totals ───────────────────────────────────────────────────────
  const subtotalAfterSectionDiscounts = SECTIONS.reduce((total, section) => {
    const sectionItems = items.filter(i => (i.section || 'Furniture') === section);
    const sectionDiscountPct = sectionDiscounts[section] || 0;
    const sectionRaw = sectionItems.reduce((sum, item) => {
      const itemTotal = (item.amount || 0) * (item.quantity || 1);
      const subTotal = (item.subItems || []).reduce((s, sub) =>
        s + (sub.amount || 0) * (sub.quantity || 1), 0);
      return sum + itemTotal + subTotal;
    }, 0);
    return total + sectionRaw * (1 - sectionDiscountPct / 100);
  }, 0);

  const globalDiscountAmount = subtotalAfterSectionDiscounts * (globalDiscountPercent / 100);
  const subtotal = subtotalAfterSectionDiscounts - globalDiscountAmount;
  const vat = subtotal * (vatPercentage / 100);
  const total = subtotal + vat;

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saving) return;
    if (!formData.customer_name?.trim())    { alert("Customer name is required");    return; }
    if (!formData.customer_address?.trim()) { alert("Customer address is required"); return; }

    setSaving(true);
    setSaveMsg("");
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/invoices/${invoiceId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          door_type:               doorType,
          room_type:               roomType,
          vat_rate:                vatPercentage,
          deposit_paid:            deposit,
          total_remaining:         Math.max(0, total - deposit),
          section_discounts:       sectionDiscounts,
					global_discount_percent: globalDiscountPercent,
					global_discount_amount:  globalDiscountAmount,
					items: items
						.filter(i => i.item || i.description || i.line_total > 0)
						.flatMap(i => [
              {
                item:             i.item,
                description:      i.description,
                color:            i.color,
                quantity:         i.quantity || 1,
                amount:           i.amount || 0,
                discount_percent: i.discount_percent || 0,
                discounted_total: i.discounted_total || i.line_total,
                width: i.width, height: i.height, depth: i.depth,
                section: i.section || "Furniture",
                is_sub_item: false,
              },
							...(i.subItems || [])
								.filter(s => (s.item && s.item.trim()) || (s.description && s.description.trim()) || s.line_total > 0)
								.map(s => ({
									item:             s.item || "",
									description:      s.description || "",
									color:            s.color || "",
									quantity:         s.quantity || 1,
                  amount:           s.amount || 0,
                  discount_percent: s.discount_percent || 0,
                  discounted_total: s.discounted_total || s.line_total,
									width: s.width, height: s.height, depth: s.depth,
									section: i.section || "Furniture",
									is_sub_item: true,
								})),
						]),
        }),
      });

      if (res.ok) {
        setSaveMsg("✅ Invoice updated successfully!");
        setTimeout(() => router.push(`/dashboard/invoices/${invoiceId}`), 800);
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

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">Loading invoice...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
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
            <Button variant="outline" onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </div>
        {saveMsg && (
          <div className={`mt-2 rounded-md px-4 py-2 text-sm font-medium ${
            saveMsg.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {saveMsg}
          </div>
        )}
      </div>

      <div className="px-4 py-8">

        {/* Company header */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <Image src="/images/logo3.png" alt="Logo" width={80} height={80} className="object-contain" />
          <div className="text-4xl font-bold tracking-wider text-gray-800">ATELIER LUXE INTERIORS</div>
        </div>
        <div className="mb-6 space-y-1 bg-green-200 p-3 text-sm">
          <p className="font-semibold">Registered to England No 5246881</p>
        </div>
        <div className="mb-6 space-y-1 bg-yellow-200 p-3 text-sm">
          <p className="font-semibold">Acc name : Atelier Luxe Interiors LTD</p>
          <p className="font-semibold">Bank : ClearBank</p>
          <p className="font-semibold">Sort Code: 04 06 05</p>
          <p className="font-semibold">Acc No: 31621197</p>
        </div>
        <div className="mb-6 bg-gray-100 p-3 text-sm">
          <p>Please use your name and/or road name as reference:</p>
        </div>
        <h1 className="mb-6 text-center text-2xl font-bold">INVOICE</h1>

        {/* Door / Room type */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Room Type <span className="text-red-600">*</span></label>
            <select value={roomType} onChange={e => setRoomType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Kitchen">Kitchen</option>
              <option value="Bedroom">Bedroom</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Door Type <span className="text-red-600">*</span></label>
            <select value={doorType} onChange={e => setDoorType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Carcass Only">Carcass Only (No Doors/Drawers)</option>
              <option value="Basic Slab">Slab</option>
              <option value="Acrylic Gloss/Matt">Lacquered Slab</option>
              <option value="Timber">Timber</option>
              <option value="Vinyl">Vinyl</option>
              <option value="Black Glass">Black Glass</option>
            </select>
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4">
          <p className="mb-2 text-sm font-medium text-blue-900">
            💡 Selected: <span className="font-bold">{roomType}</span> with <span className="font-bold">{doorType}</span> doors
          </p>
          <p className="text-xs text-blue-700 mb-2">Prices will be automatically looked up when you enter item codes.</p>
          <div className="mt-3 border-t border-blue-200 pt-3">
            <p className="text-xs font-semibold text-blue-900 mb-1">🎯 Component-Only Pricing (Advanced):</p>
            <ul className="text-xs text-blue-700 mt-1 ml-4 space-y-0.5">
              <li>• <code className="bg-blue-100 px-1 rounded">50B</code> = {doorType === 'Carcass Only' ? 'Carcass only' : `Carcass + ${doorType} total (auto)`}</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-C</code> = Carcass only (when door type selected)</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-S</code> = Slab door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-LS</code> = Lacquered Slab door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-T</code> = Timber door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-VD</code> = Vinyl door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-BG</code> = Black Glass door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">FITTING</code> = Auto-detect all fittings from invoice items</li>
              {doorType === 'Carcass Only' && <>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-ST</code> = Carcass + Slab total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-LST</code> = Carcass + Lacquered Slab total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-TT</code> = Carcass + Timber total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-VDT</code> = Carcass + Vinyl total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-BGT</code> = Carcass + Black Glass total</li>
              </>}
            </ul>
          </div>
        </div>

        {/* Customer info */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              {[
                { label: "INVOICE DATE:", field: "invoice_date", type: "date"     },
                { label: "DUE DATE:",     field: "due_date",     type: "date"     },
                { label: "NAME:",         field: "customer_name",    type: "text" },
                { label: "ADDRESS:",      field: "customer_address", type: "textarea" },
                { label: "TEL:",          field: "customer_phone",   type: "text" },
                { label: "EMAIL:",        field: "customer_email",   type: "email" },
                { label: "ROOM NAME:",        field: "room_name",        type: "text" },
                { label: "CARCASS COLOUR:",   field: "carcass_colour",   type: "text" },
                { label: "DOOR COLOUR:",      field: "door_colour",      type: "text" },
                { label: "PANELWORK COLOUR:", field: "panelwork_colour", type: "text" },
                { label: "DOOR STYLE:",       field: "door_style",       type: "text" },
              ].map(({ label, field, type }) => (
                <tr key={field}>
                  <td className="border border-black px-3 py-2 font-semibold bg-gray-50" style={{ width: "20%" }}>{label}</td>
                  <td className="border border-black p-0">
                    {type === "textarea" ? (
                      <textarea value={(formData as any)[field]}
                        onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full resize-none px-3 py-2 text-sm focus:outline-none" rows={2} />
                    ) : type === "select" ? (
                      <select value={(formData as any)[field]}
                        onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full border-none px-3 py-2 text-sm focus:outline-none">
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    ) : (
                      <Input type={type} value={(formData as any)[field]}
                        onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                        className="border-none focus-visible:ring-0 w-full h-full px-3 py-2" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sections + Items */}
        <div className="mb-4">
          {SECTIONS.map(section => {
            const sectionItems = items.filter(i => (i.section || "Furniture") === section);
            if (sectionItems.length === 0) return null;

            const sectionSubtotal = sectionItems.reduce((sum, item) => {
              return sum + (item.line_total || 0) + (item.subItems || []).reduce((s, sub) => s + (sub.line_total || 0), 0);
            }, 0);
            const sectionDiscounted = sectionItems.reduce((sum, item) => {
              const it = (item.discount_percent && item.discount_percent > 0) ? (item.discounted_total || item.line_total || 0) : (item.line_total || 0);
              const st = (item.subItems || []).reduce((s, sub) => s + ((sub.discount_percent && sub.discount_percent > 0) ? (sub.discounted_total || sub.line_total || 0) : (sub.line_total || 0)), 0);
              return sum + it + st;
            }, 0);
            const sectionItemDiscount = sectionSubtotal - sectionDiscounted;
            const sectionDiscountPct  = sectionDiscounts[section] || 0;
            const sectionDiscountAmt  = sectionSubtotal * (sectionDiscountPct / 100);
            const sectionTotal        = sectionSubtotal - sectionDiscountAmt;

            return (
              <div key={section} className="mb-6">
                <div className="mb-3"><h3 className="text-lg font-bold">{section}</h3></div>

                <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr className="bg-white">
                      <th className="border border-black px-1 py-2 text-left font-bold text-xs"   style={{ width: "8%" }}>ITEM</th>
                      <th className="border border-black px-1 py-2 text-left font-bold text-xs"   style={{ width: "20%" }}>DESCRIPTION</th>
                      <th className="border border-black px-1 py-2 text-left font-bold text-xs"   style={{ width: "7%" }}>COLOUR</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: "5%" }}>QTY</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: "5%" }}>W</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: "5%" }}>H</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: "5%" }}>D</th>
                      <th className="border border-black px-1 py-2 text-right font-bold text-xs"  style={{ width: "8%" }}>PRICE</th>
                      <th className="border border-black px-1 py-2 text-right font-bold text-xs"  style={{ width: "9%" }}>AMOUNT</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: "6%" }}>DISC %</th>
                      <th className="border border-black px-1 py-2 text-right font-bold text-xs"  style={{ width: "9%" }}>FINAL</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: "4%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionItems.map(item => (
                      <React.Fragment key={item.id}>
                        <tr>
                          <td className="border border-black p-0">
                            <Input
                              value={item.item}
                              onChange={(e) => {
                                setItems(prevItems => prevItems.map(i => i.id === item.id ? { ...i, item: e.target.value } : i));
                              }}
                              onBlur={(e) => { const val = e.target.value.trim(); if (val.length >= 1) handleItemChange(item.id, "item", val); }}
                              placeholder="50B"
                              className={`border-none focus-visible:ring-0 min-w-[90px] font-mono text-xs ${autoFilling === item.id ? 'bg-blue-50 animate-pulse' : ''}`}
                            />
                          </td>
                          <td className="border border-black p-0">
                            <textarea value={item.description}
                              onChange={e => handleDescriptionChange(item.id, e.target.value)}
                              placeholder="Description" rows={2}
                              style={{ minHeight: "35px", lineHeight: "1.3" }}
                              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; }}
                              className={`border-none focus-visible:ring-0 min-w-[140px] w-full resize-none overflow-hidden text-xs ${autoFilling === item.id ? "bg-blue-50 animate-pulse" : ""}`} />
                          </td>
                          <td className="border border-black p-0">
                            <Input value={item.color} onChange={e => handleItemChange(item.id, "color", e.target.value)}
                              placeholder="Colour" className="border-none focus-visible:ring-0 min-w-[70px] text-xs" />
                          </td>
                          <td className="border border-black p-0">
                            <Input type="number" value={item.quantity} min="1"
                              onChange={e => handleItemChange(item.id, "quantity", e.target.value)}
                              className="border-none text-center focus-visible:ring-0 w-full text-xs" />
                          </td>
                          {(["width", "height", "depth"] as const).map(dim => (
                            <td key={dim} className="border border-black p-0">
                              <Input type="number" value={item[dim] || ""} placeholder="—" min="0"
                                onChange={e => handleItemChange(item.id, dim, e.target.value)}
                                className="border-none text-center focus-visible:ring-0 w-full text-xs" />
                            </td>
                          ))}
                          <td className="border border-black p-0">
                            <Input type="number" step="0.01" min="0" value={parseFloat((item.amount || 0).toFixed(2))} placeholder="0.00"
                              onChange={e => handleItemChange(item.id, "amount", e.target.value)}
                              className="border-none text-right focus-visible:ring-0 w-full text-xs" />
                          </td>
                          <td className="border border-black px-2 py-1 text-right font-semibold text-xs">{fmt(item.line_total)}</td>
                          <td className="border border-black p-0">
                            <Input type="number" step="0.1" min="0" max="100" value={item.discount_percent || ""} placeholder="0"
                              onChange={e => handleItemChange(item.id, "discount_percent", e.target.value)}
                              className="border-none text-center focus-visible:ring-0 w-full text-xs" />
                          </td>
                          <td className="border border-black px-2 py-1 text-right">
                            {item.discount_percent && item.discount_percent > 0 ? (
                              <div>
                                <div className="text-xs text-gray-500 line-through">{fmt(item.line_total)}</div>
                                <div className="font-semibold text-green-700 text-xs">{fmt(item.discounted_total || 0)}</div>
                              </div>
                            ) : <span className="font-semibold text-xs">{fmt(item.line_total)}</span>}
                          </td>
                          <td className="border border-black p-1 text-center">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 h-7 w-7">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>

                        {/* SUB-ITEMS */}
                        {(item.subItems || []).map(sub => (
                          <tr key={sub.id} className="bg-gray-50">
                            <td className="border border-black p-0 pl-4">
                              <Input
                                value={sub.item}
                                onChange={(e) => {
                                  setItems(prevItems => prevItems.map(it => {
                                    if (it.id !== item.id || !it.subItems) return it;
                                    return {
                                      ...it,
                                      subItems: it.subItems.map(s => s.id === sub.id ? { ...s, item: e.target.value } : s)
                                    };
                                  }));
                                }}
                                onBlur={(e) => handleSubItemAutoFill(item.id, sub.id, e.target.value)}
                                placeholder="sub-code"
                                className="border-none focus-visible:ring-0 w-full text-xs px-1 font-mono"
                              />
                            </td>
                            <td className="border border-black p-0">
                              <Input value={sub.description} onChange={e => handleSubItemChange(item.id, sub.id, "description", e.target.value)}
                                placeholder="Sub-item description" className="border-none focus-visible:ring-0 w-full text-xs px-1" />
                            </td>
                            <td className="border border-black p-0">
                              <Input value={sub.color} onChange={e => handleSubItemChange(item.id, sub.id, "color", e.target.value)}
                                placeholder="Colour" className="border-none focus-visible:ring-0 w-full text-xs px-1" />
                            </td>
                            <td className="border border-black p-0">
                              <Input type="number" value={sub.quantity} min="1"
                                onChange={e => handleSubItemChange(item.id, sub.id, "quantity", e.target.value)}
                                className="border-none text-center focus-visible:ring-0 w-full text-xs px-1" />
                            </td>
                            <td className="border border-black p-0" /><td className="border border-black p-0" /><td className="border border-black p-0" />
                            <td className="border border-black p-0">
                              <Input type="number" step="0.01" value={sub.amount} placeholder="0.00" min="0"
                                onChange={e => handleSubItemChange(item.id, sub.id, "amount", e.target.value)}
                                className="border-none text-right focus-visible:ring-0 w-full text-xs px-1" />
                            </td>
                            <td className="border border-black px-2 py-1 text-right text-xs">{fmt(sub.line_total)}</td>
                            <td className="border border-black p-0">
                              <Input type="number" step="0.1" min="0" max="100" value={sub.discount_percent || ""} placeholder="0"
                                onChange={e => handleSubItemChange(item.id, sub.id, "discount_percent", e.target.value)}
                                className="border-none text-center focus-visible:ring-0 w-full text-xs px-1" />
                            </td>
                            <td className="border border-black px-2 py-1 text-right">
                              {sub.discount_percent && sub.discount_percent > 0 ? (
                                <div>
                                  <div className="text-xs text-gray-500 line-through">{fmt(sub.line_total)}</div>
                                  <div className="font-semibold text-green-700 text-xs">{fmt(sub.discounted_total || 0)}</div>
                                </div>
                              ) : (
                                <span className="font-semibold text-xs">{fmt(sub.line_total)}</span>
                              )}
                            </td>
                            <td className="border border-black p-1 text-center">
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveSubItem(item.id, sub.id)}
                                className="text-red-600 hover:bg-red-50 h-6 w-6">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}

                        {/* ADD SUB-ITEM */}
                        <tr>
                          <td colSpan={12} className="border border-black px-2 py-1 bg-gray-50">
                            <button onClick={() => handleAddSubItem(item.id)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <Plus className="h-3 w-3" /> Add sub-item
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Section totals */}
                <div className="flex justify-end mt-2 mb-4">
                  <table className="border-collapse text-sm" style={{ width: "40%" }}>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-1 font-medium bg-gray-50 text-xs">{section} Subtotal</td>
                        <td className="border border-gray-300 px-3 py-1 text-right text-xs">{fmt(sectionSubtotal)}</td>
                      </tr>
                      {sectionItemDiscount > 0 && (
                        <tr>
                          <td className="border border-gray-300 px-3 py-1 font-medium bg-gray-50 text-xs text-red-600">Item Discounts</td>
                          <td className="border border-gray-300 px-3 py-1 text-right text-xs text-red-600">-{fmt(sectionItemDiscount)}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="border border-gray-300 px-3 py-1 bg-gray-50 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">Section Discount</span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Input type="number" value={sectionDiscountPct || ""}
                                      onChange={(e) => {
                                        const pct = parseFloat(e.target.value) || 0;
                                        const prevSectionPct = sectionDiscounts[section] || 0;
                                        setSectionDiscounts(prev => ({ ...prev, [section]: pct }));
                                        setSectionDiscountAmounts(prev => ({ ...prev, [section]: '' }));
                                        setItems(prevItems => prevItems.map(item => {
                                          if ((item.section || 'Furniture') !== section) return item;
                                          const itemDisc = item.discount_percent || 0;
                                          const updatedItem = (itemDisc > 0 && itemDisc !== prevSectionPct) ? item : {
                                            ...item,
                                            discount_percent: pct,
                                            discounted_total: pct > 0 ? (item.quantity || 1) * (item.amount || 0) * (1 - pct / 100) : (item.quantity || 1) * (item.amount || 0),
                                          };
                                          const updatedSubItems = (item.subItems || []).map(sub => {
                                            const subDisc = sub.discount_percent || 0;
                                            if (subDisc > 0 && subDisc !== prevSectionPct) return sub;
                                            return {
                                              ...sub,
                                              discount_percent: pct,
                                              discounted_total: pct > 0 ? (sub.quantity || 1) * (sub.amount || 0) * (1 - pct / 100) : (sub.quantity || 1) * (sub.amount || 0),
                                            };
                                          });
                                          return { ...updatedItem, subItems: updatedSubItems };
                                        }));
                                      }}
                                  className="border border-gray-300 rounded px-1 py-0.5 w-14 text-right text-xs"
                                  min="0" max="100" step="0.1" placeholder="0" />
                                <span className="text-xs text-gray-500">%</span>
                              </div>
                              <span className="text-xs text-gray-400">or</span>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">£</span>
                                <Input type="number"
                                  value={sectionDiscountAmounts[section] ?? (sectionDiscountAmt > 0 ? sectionDiscountAmt.toFixed(2) : "")}
                                  onChange={e => setSectionDiscountAmounts(prev => ({ ...prev, [section]: e.target.value }))}
                                  onBlur={e => {
                                    const amt = parseFloat(e.target.value) || 0;
                                    const pct = sectionSubtotal > 0 ? (amt / sectionSubtotal) * 100 : 0;
                                    setSectionDiscounts(prev => ({ ...prev, [section]: pct }));
                                    setSectionDiscountAmounts(prev => ({ ...prev, [section]: "" }));
                                  }}
                                  className="border border-gray-300 rounded px-1 py-0.5 w-20 text-right text-xs"
                                  min="0" step="0.01" placeholder="0.00" />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-1 text-right text-xs text-red-600">
                          {sectionDiscountPct > 0 ? `-${fmt(sectionDiscountAmt)}` : "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-1 font-bold bg-gray-100 text-xs">{section} Total</td>
                        <td className="border border-gray-300 px-3 py-1 text-right font-bold text-xs">{fmt(sectionTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Add Item buttons */}
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map(section => (
              <Button key={section} onClick={() => handleAddItem(section)} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add Item to {section}
              </Button>
            ))}
          </div>
        </div>

        {/* Global totals */}
        <div className="mb-6 flex justify-end">
          <table className="border-collapse" style={{ width: "40%" }}>
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">SUB TOTAL</td>
                <td className="border border-black px-3 py-2 text-right">{fmt(subtotalAfterSectionDiscounts)}</td>
              </tr>
							<tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <span>DISCOUNT</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="0" max="100" step="0.1"
                        value={globalDiscountPercent}
                        onChange={e => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)}
                        className="border border-gray-300 rounded px-2 py-1 w-16 text-right text-sm"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                </td>
                <td className="border border-black px-3 py-2 text-right text-red-600">
                  {globalDiscountAmount > 0 ? `-${fmt(globalDiscountAmount)}` : "—"}
                </td>
              </tr>
              {globalDiscountAmount > 0 && (
                <tr>
                  <td className="border border-black px-3 py-2 font-semibold bg-blue-50">SUBTOTAL AFTER DISCOUNT</td>
                  <td className="border border-black px-3 py-2 text-right font-semibold">{fmt(subtotal)}</td>
                </tr>
              )}
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <span>VAT</span>
                    <div className="flex items-center gap-1">
                      <Input type="number" min="0" max="100" step="0.1" value={vatPercentage}
                        onChange={e => setVatPercentage(parseFloat(e.target.value) || 0)}
                        className="border border-gray-300 rounded px-2 py-1 w-16 text-right text-sm" />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                </td>
                <td className="border border-black px-3 py-2 text-right">{fmt(vat)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-bold bg-gray-50">TOTAL</td>
                <td className="border border-black px-3 py-2 text-right font-bold">{fmt(total)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <span>DEPOSIT PAID</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">£</span>
                      <Input type="number" min="0" step="0.01" value={deposit || ""} placeholder="0.00"
                        onChange={e => setDeposit(parseFloat(e.target.value) || 0)}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm" />
                    </div>
                  </div>
                </td>
                <td className="border border-black px-3 py-2 text-right text-green-700 font-semibold">
                  {deposit > 0 ? fmt(deposit) : "—"}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-bold bg-gray-50 text-base">TOTAL REMAINING</td>
                <td className={`border border-black px-3 py-2 text-right font-bold text-base ${total - deposit < 0 ? "text-red-600" : ""}`}>
                  {fmt(Math.max(0, total - deposit))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Notes</label>
          <textarea value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3} placeholder="Any additional notes for this invoice..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
          <Button variant="outline" onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Invoice"}
          </Button>
        </div>

      </div>
    </div>
  );
}