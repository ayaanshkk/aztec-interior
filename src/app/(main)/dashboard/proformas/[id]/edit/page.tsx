"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { BACKEND_URL } from "@/lib/api";
import { useSessionDraft } from "@/hooks/useSessionDraft";
import { SignatureField } from "@/components/ui/SignatureField";
import AddToPricelistModal from "@/components/ui/AddToPricelistModal";

const API_FORM = `${BACKEND_URL}/api/form`;

interface ProformaItem {
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
  subItems?: ProformaItem[];
  section?: string;
  notInPricelist?: boolean;
}

const SECTIONS = [
  "Furniture", "Fillers and End Panels", "Accessories", "Handles",
  "Appliances", "Sink and Tap", "Worktops", "Fittings", "Miscellaneous",
] as const;

const FITTING_CODES_LIST = ["KUNIT", "BUNIT", "ROBE", "APPL", "SINKTAP", "FITDR", "PANW"];

export default function EditProformaPage() {
  const { id: invoiceId } = useParams() as { id: string };
  const router             = useRouter();

  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const savingRef = useRef(false);
  const [saveMsg,     setSaveMsg]     = useState("");
  const [autoFilling, setAutoFilling] = useState<string | number | null>(null);
  const [nextId,      setNextId]      = useState(9000);

  const [formData, setFormData] = useState({
    customer_name:    "",
    customer_address: "",
    customer_phone:   "",
    customer_email:   "",
    invoice_date:     "",
    notes:            "",
    room_name:        "",
    carcass_colour:   "",
    door_colour:      "",
    panelwork_colour: "",
    door_style:       "",
    invoice_number:   "",
  });

  const [items,                  setItems]                  = useState<ProformaItem[]>([]);
  const [vatPercentage,          setVatPercentage]          = useState(20);
  const [globalDiscountPercent,  setGlobalDiscountPercent]  = useState(0);
  const [showExVat,              setShowExVat]              = useState(true);
  const [pricelistModal, setPricelistModal] = useState<{ open: boolean; itemCode: string; description: string; amount: number; section: string }>({ open: false, itemCode: '', description: '', amount: 0, section: '' });
  const [sectionDiscounts,       setSectionDiscounts]       = useState<Record<string, number>>({});
  const [sectionDiscountAmounts, setSectionDiscountAmounts] = useState<Record<string, string>>({});
  const [doorType,               setDoorType]               = useState("Carcass Only");
  const [roomType,               setRoomType]               = useState("Kitchen");
  const [fillerType,             setFillerType]             = useState("Basic Slab");
  const [additionalTerms,       setAdditionalTerms]        = useState<string[]>([]);
  const [additionalNotes,       setAdditionalNotes]        = useState<string>('');
  const [signatureData, setSignatureData] = useState<import('@/components/ui/SignatureField').SignatureData | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const { saveDraft, loadDraft, clearDraft } = useSessionDraft(typeof window !== "undefined" ? window.location.pathname : "proformas-edit");
  useEffect(() => {
    if (loading) return;
    const draft = loadDraft();
    if (!draft) return;
    if (draft.formData) setFormData(draft.formData as typeof formData);
    if (draft.sectionDiscountAmounts) setSectionDiscountAmounts(draft.sectionDiscountAmounts as Record<string, string>);
    if (draft.signatureData) setSignatureData(draft.signatureData as typeof signatureData);
    setDraftRestored(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  useEffect(() => {
    if (loading) return;
    saveDraft({ formData, sectionDiscountAmounts, signatureData });
  }, [formData, sectionDiscountAmounts, signatureData, loading, saveDraft]);
  const doorRoomSetByLoad = useRef(0);
  const originalItemsRef  = useRef<ProformaItem[]>([]);
  const originalDoorType  = useRef<string>('');

  const itemsRef         = useRef(items);
  const recalcInProgress = useRef(false);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

  const calcDiscounted = (qty: number, amount: number, pct: number) => {
    const base = qty * amount;
    return pct > 0 ? base - base * (pct / 100) : base;
  };

  // ── Load proforma ─────────────────────────────────────────────────────────
  useEffect(() => { fetchProforma(); }, [invoiceId]);

  const fetchProforma = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/proformas/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert("Failed to load proforma"); return; }
      const data = await res.json();

      setVatPercentage(data.vat_rate || 20);
      if (data.section_discounts) setSectionDiscounts(data.section_discounts);
      if (data.show_ex_vat_total !== undefined) setShowExVat(data.show_ex_vat_total);
      if (data.global_discount_percent) setGlobalDiscountPercent(data.global_discount_percent);
      setAdditionalTerms(data.additional_terms || []);
      setAdditionalNotes(data.additional_notes || '');
      if (data.signature_type && data.signature_type !== 'none') {
        setSignatureData({
          type: data.signature_type,
          imageData: data.signature_image || undefined,
          text: data.signature_text || '',
          name: data.signature_name || '',
          date: data.signature_date || '',
        });
      }

      doorRoomSetByLoad.current = 3;
      if (data.door_type) setDoorType(data.door_type);
      if (data.room_type) setRoomType(data.room_type);
      if (data.filler_type || data.filler_door_type) setFillerType(data.filler_type || data.filler_door_type);

      setFormData({
        customer_name:    data.customer_name    || "",
        customer_address: data.customer_address || "",
        customer_phone:   data.customer_phone   || "",
        customer_email:   data.customer_email   || "",
        invoice_date:     (data.invoice_date || "").split("T")[0],
        notes:            data.notes  || "",
        room_name:        data.room_name        || "",
        carcass_colour:   data.carcass_colour   || "",
        door_colour:      data.door_colour      || "",
        panelwork_colour: data.panelwork_colour || "",
        door_style:       data.door_style       || "",
        invoice_number:   data.invoice_number   || "",
      });

      const allItems = data.items || [];
      const topLevel = allItems.filter((i: any) => !i.is_sub_item);

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

      const mapped: ProformaItem[] = topLevel.map((i: any, idx: number) => ({
        id:               i.item_id || i.id || idx + 1,
        item:             i.item || i.item_name || "",
        description:      i.description || "",
        color:            i.color || i.colour || "",
        quantity:         i.quantity || 1,
        amount:           parseFloat(Number(i.amount || 0).toFixed(2)),
        width:            i.width,
        height:           i.height,
        depth:            i.depth,
        line_total:       parseFloat((Number(i.amount || 0) * Number(i.quantity || 1)).toFixed(2)),
        discount_percent: i.discount_percent || 0,
        discounted_total: parseFloat((Number(i.discounted_total || 0) || Number(i.amount || 0) * Number(i.quantity || 1)).toFixed(2)),
        section:          i.section || "Furniture",
        subItems: (subItemsByParent[idx] || []).map((s: any, si: number) => ({
          id:               `sub-loaded-${idx}-${si}`,
          item:             s.item || s.item_name || "",
          description:      s.description || "",
          color:            s.color || s.colour || "",
          quantity:         s.quantity || 1,
          amount:           parseFloat(Number(s.amount || 0).toFixed(2)),
          line_total:       parseFloat((Number(s.amount || 0) * Number(s.quantity || 1)).toFixed(2)),
          discount_percent: s.discount_percent || 0,
          discounted_total: parseFloat((Number(s.discounted_total || 0) || Number(s.amount || 0) * Number(s.quantity || 1)).toFixed(2)),
        })),
      }));

      setItems(mapped);
      originalItemsRef.current = mapped;
      originalDoorType.current = data.door_type || 'Carcass Only';
      setNextId((mapped.length || 0) + 9000);
    } catch (e) {
      console.error(e);
      alert("Error loading proforma");
    } finally {
      setLoading(false);
    }
  };

  // ── Re-price when door/room type changes ──────────────────────────────────
  useEffect(() => {
    if (doorRoomSetByLoad.current > 0) {
      doorRoomSetByLoad.current -= 1;
      return;
    }

    const current = itemsRef.current;
    if (current.length === 0 || !current.some(i => i.item && i.item.trim().length > 0)) return;

    if (doorType === originalDoorType.current && originalItemsRef.current.length > 0) {
      setItems(prev => prev.map((item, idx) => {
        const orig = originalItemsRef.current[idx];
        if (!orig) return item;
        const qty = item.quantity || 1;
        return {
          ...item,
          amount: orig.amount,
          line_total: orig.amount * qty,
          discounted_total: item.discount_percent && item.discount_percent > 0
            ? orig.amount * qty * (1 - item.discount_percent / 100)
            : orig.amount * qty,
        };
      }));
      return;
    }

    const updateAllPrices = async () => {
      const token    = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";

      const updatePromises = current.map(async item => {
        if (!item.item || item.item.trim().length === 0) return null;
        const code        = item.item.trim();
        const hasSuffix   = code.includes("-");
        const baseCode    = code.split("-")[0];
        const isAppliance = /^[A-Z]{2,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;
        const body: any   = { description: code };
        if (!hasSuffix && !isAppliance) { body.door_type = doorType; body.room_type = roomType; body.filler_door_type = fillerType; }
        else if (!isAppliance)          { body.room_type = roomType; body.filler_door_type = fillerType; }
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
      });

      const subItemPromises = current.flatMap(item =>
        (item.subItems || []).map(async (sub: any) => {
          if (!sub.item || sub.item.trim().length === 0) return null;
          const code = sub.item.trim();
          const hasSuffix = code.includes('-');
          const baseCode = code.split('-')[0];
          const isAppliance = /^[A-Z]{2,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;
          const body: any = { description: code };
          if (!hasSuffix && !isAppliance) { body.door_type = doorType; body.room_type = roomType; }
          else if (!isAppliance)          { body.room_type = roomType; }
          try {
            const res = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-ID": tenantId },
              body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.found) return { subId: sub.id, price: data.price, description: data.description || data.item_name };
          } catch { /* silent */ }
          return null;
        })
      );

      const [updates, subItemResults] = await Promise.all([
        Promise.all(updatePromises),
        Promise.all(subItemPromises),
      ]);

      setItems(prev => prev.map(item => {
        const hit = updates.find(u => u && u.id === item.id);
        const updatedItem = hit ? (() => {
          const newAmount = hit.price;
          const qty = item.quantity || 1;
          const lineTotal = newAmount * qty;
          const discPct = item.discount_percent || 0;
          return { ...item, amount: newAmount, description: hit.description || item.description, line_total: lineTotal, discounted_total: discPct > 0 ? lineTotal - lineTotal * (discPct / 100) : lineTotal };
        })() : item;

        const updatedSubs = (updatedItem.subItems || []).map((sub: any) => {
          const subResult = subItemResults.find(r => r && r.subId === sub.id);
          if (!subResult) return sub;
          const newAmt = subResult.price;
          const sQty = sub.quantity || 1;
          const sLine = newAmt * sQty;
          const sPct = sub.discount_percent || 0;
          return { ...sub, amount: newAmt, description: subResult.description || sub.description, line_total: sLine, discounted_total: sPct > 0 ? sLine - sLine * (sPct / 100) : sLine };
        });

        return { ...updatedItem, subItems: updatedSubs };
      }));
    };

    updateAllPrices();
  }, [doorType, roomType, fillerType]);

  // ── Fitting recalc ────────────────────────────────────────────────────────
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
          }).filter((i): i is ProformaItem => i !== null);
          return changed ? updated : prev;
        });
      } finally { recalcInProgress.current = false; }
    };
    const timer = setTimeout(recalcFittings, 800);
    return () => clearTimeout(timer);
  }, [items]);

  // ── Item auto-fill ────────────────────────────────────────────────────────
  const handleItemChange = async (id: string | number, field: keyof ProformaItem, value: any) => {
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
        if (valid.length === 0) { alert("No fitting items detected."); setAutoFilling(null); return; }
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
    if (!hasSuffix && !isAppliance) { body.door_type = doorType; body.room_type = roomType; body.filler_door_type = fillerType; }
    else if (!isAppliance)          { body.room_type = roomType; body.filler_door_type = fillerType; }

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
      } else {
        setItems(prev => prev.map(it => it.id === id ? { ...it, notInPricelist: true } : it));
      }
    } catch (e) { console.error("Auto-price lookup failed:", e); }
    finally     { setAutoFilling(null); }
  };

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
          const price = data.price || 0;
          const qty = item.quantity || 1;
          const lineTotal = price * qty;
          const discPct = item.discount_percent || 0;
          return {
            ...item,
            item: data.item_code || item.item,
            amount: price,
            width: data.width,
            height: data.height,
            depth: data.depth,
            line_total: lineTotal,
            discounted_total: discPct > 0 ? lineTotal - lineTotal * (discPct / 100) : lineTotal,
          };
        }));
      }
    } catch (e) { console.error("Description auto-fill failed:", e); }
    finally     { setAutoFilling(null); }
  };

  // ── Sub-item handlers ─────────────────────────────────────────────────────
  const handleAddSubItem = (parentId: string | number) => {
    const parentItem = itemsRef.current.find(i => i.id === parentId);
    if (parentItem?.notInPricelist && parentItem?.item?.trim()) {
      setPricelistModal({ open: true, itemCode: parentItem.item, description: parentItem.description, amount: parentItem.amount || 0, section: parentItem.section || '' });
    }
    setItems(prev => prev.map(item => {
      if (item.id !== parentId) return item;
      const newSub: ProformaItem = {
        id: `sub-${Date.now()}-${Math.random()}`, item: "", description: "", color: "",
        quantity: 1, amount: 0, line_total: 0, discount_percent: 0, discounted_total: 0,
      };
      return { ...item, subItems: [...(item.subItems || []), newSub] };
    }));
  };

  const handleSubItemChange = (parentId: string | number, subId: string | number, field: keyof ProformaItem, value: any) => {
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
      if (!hasSuffix && !isAppliance) { body.door_type = doorType; body.room_type = roomType; body.filler_door_type = fillerType; }
      else if (!isAppliance)          { body.room_type = roomType; body.filler_door_type = fillerType; }
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
    const notFoundItem = itemsRef.current.find(it => it.section === section && it.notInPricelist && it.item?.trim());
    if (notFoundItem) {
      setPricelistModal({ open: true, itemCode: notFoundItem.item, description: notFoundItem.description, amount: notFoundItem.amount || 0, section: notFoundItem.section || '' });
    }
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
    const sectionItemTotal = sectionItems.reduce((sum, item) => {
      const qty = item.quantity || 1;
      const amt = item.amount || 0;
      const pct = item.discount_percent || 0;
      const itemTotal = pct > 0 ? amt * qty * (1 - pct / 100) : amt * qty;
      const subTotal = (item.subItems || []).reduce((s, sub) => {
        const sQty = sub.quantity || 1;
        const sAmt = sub.amount || 0;
        const sPct = sub.discount_percent || 0;
        return s + (sPct > 0 ? sAmt * sQty * (1 - sPct / 100) : sAmt * sQty);
      }, 0);
      return sum + itemTotal + subTotal;
    }, 0);
    return total + sectionItemTotal;
  }, 0);

  const globalDiscountAmount = Math.round(subtotalAfterSectionDiscounts * (globalDiscountPercent / 100) * 100) / 100;
  const subtotal = Math.round((subtotalAfterSectionDiscounts - globalDiscountAmount) * 100) / 100;
  const vat      = Math.round(subtotal * (vatPercentage / 100) * 100) / 100;
  const total    = Math.round((subtotal + vat) * 100) / 100;

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSaveDraft = () => handleSaveWithStatus(true);
  const handleSave = () => handleSaveWithStatus(false);
  const handleSaveWithStatus = async (isDraft: boolean) => {
    if (savingRef.current) return;
    if (!isDraft) {
      if (!formData.customer_name?.trim())    { alert("Customer name is required");    return; }
      if (!formData.customer_address?.trim()) { alert("Customer address is required"); return; }
    }

    savingRef.current = true;
    setSaving(true);
    setSaveMsg("");
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/proformas/${invoiceId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          door_type:               doorType,
          room_type:               roomType,
          filler_type:             fillerType,
          filler_door_type:        fillerType,
          vat_rate:                vatPercentage,
          section_discounts:       sectionDiscounts,
          show_ex_vat_total:       showExVat,
          global_discount_percent: globalDiscountPercent,
          global_discount_amount:  globalDiscountAmount,
          additional_terms:        additionalTerms.filter(t => t.trim()),
          additional_notes:        additionalNotes,
          signature_type:          signatureData?.type || 'none',
          signature_image:         signatureData?.imageData || null,
          signature_text:          signatureData?.text || null,
          signature_name:          signatureData?.name || '',
          signature_date:          signatureData?.date || '',
          items: items
            .filter(i => i.item || i.description || i.line_total > 0)
            .flatMap(i => [
              {
                item: i.item, description: i.description, color: i.color,
                quantity: i.quantity || 1, amount: i.amount || 0,
                discount_percent: i.discount_percent || 0,
                discounted_total: i.discounted_total || i.line_total,
                width: i.width, height: i.height, depth: i.depth,
                section: i.section || "Furniture", is_sub_item: false,
              },
              ...(i.subItems || [])
                .filter(s => (s.item && s.item.trim()) || (s.description && s.description.trim()) || s.line_total > 0)
                .map(s => ({
                  item: s.item || "", description: s.description || "", color: s.color || "",
                  quantity: s.quantity || 1, amount: s.amount || 0,
                  discount_percent: s.discount_percent || 0,
                  discounted_total: s.discounted_total || s.line_total,
                  width: s.width, height: s.height, depth: s.depth,
                  section: i.section || "Furniture", is_sub_item: true,
                })),
            ]),
        }),
      });

      if (res.ok) {
        clearDraft();
      setSaveMsg("✅ Proforma updated successfully!");
        setTimeout(() => router.push(`/dashboard/proformas/${invoiceId}`), 800);
      } else {
        const err = await res.json();
        setSaveMsg(`❌ Failed: ${err.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      setSaveMsg("❌ Network error saving proforma");
    } finally {
      savingRef.current = false;
      setSaving(false);
      if (saveMsg.startsWith("❌")) setTimeout(() => setSaveMsg(""), 5000);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading proforma...</p></div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-gray-50 px-8 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/proformas/${invoiceId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Proforma</h1>
              <p className="text-sm text-gray-600">{formData.customer_name ? `Customer: ${formData.customer_name}` : "Make your changes and save"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/proformas/${invoiceId}`)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Proforma"}
            </Button>
          </div>
        </div>
        {saveMsg && (
          <div className={`mt-2 rounded-md px-4 py-2 text-sm font-medium ${saveMsg.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {saveMsg}
          </div>
        )}
      </div>

      <div className="px-8 py-10">
        {/* Company Header */}
        <div className="flex items-center justify-between border-b-2 border-gray-900 pb-7 mb-10">
          <Image src="/images/logo-full.png" alt="Atelier Luxe Interiors" width={340} height={92} className="object-contain" />
          <div className="text-right text-xs leading-6 text-gray-600">
            <p className="font-semibold text-sm text-gray-900 mb-1">Atelier Luxe Interiors Ltd</p>
            <p>127c Barkby Road, Leicester, LE4 9LG</p>
            <p>M: 07821 328849</p>
              <p>E: accounts@atelierluxe.co.uk</p>
            <p className="text-gray-400 mt-1">Registered in England No. 17200862</p>
            {vatPercentage > 0 && <p className="text-gray-400">VAT Reg No: 528 7517 62</p>}
          </div>
        </div>
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">Proforma Invoice</p>
            <h1 className="text-2xl font-semibold text-gray-900">Edit Proforma Invoice</h1>
          </div>
        </div>

        {/* Door / Room type */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Room Type <span className="text-red-600">*</span></label>
            <select value={roomType} onChange={e => setRoomType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Kitchen">Kitchen</option>
              <option value="Bedroom">Bedroom</option>
              <option value="Media Wall">Media Wall</option>
              <option value="Office/Study">Office/Study</option>
              <option value="Display Units">Display Units</option>
              <option value="Other">Other</option>
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
              <option value="Vinyl Doors">Vinyl</option>
              <option value="Black Glass">Black Glass</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Fillers &amp; End Panels Type</label>
            <select value={fillerType} onChange={e => setFillerType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Basic Slab">Slab</option>
              <option value="Acrylic Gloss/Matt">Lacquered Slab</option>
              <option value="Vinyl Doors">Vinyl Doors</option>
              <option value="Timber">Timber</option>
            </select>
          </div>
        </div>

        {/* Customer info */}
        <div className="mb-10 grid grid-cols-2 gap-4">
          {/* Left: Bill To */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Bill To</p>
            <Input value={formData.customer_name} onChange={e => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
              placeholder="Customer name"
              className="border-none border-b border-gray-100 focus-visible:ring-0 px-0 rounded-none text-base font-medium placeholder:text-gray-300 mb-1 h-auto py-2" />
            <textarea value={formData.customer_address} onChange={e => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
              placeholder="Address" rows={2}
              className="w-full bg-transparent border-none outline-none resize-none text-sm text-gray-700 placeholder:text-gray-300 py-2 border-b border-gray-100" />
            <Input value={formData.customer_phone} onChange={e => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
              placeholder="Phone"
              className="border-none border-b border-gray-100 focus-visible:ring-0 px-0 rounded-none text-sm text-gray-700 placeholder:text-gray-300 h-auto py-2" />
            <Input type="email" value={formData.customer_email} onChange={e => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
              placeholder="Email"
              className="border-none border-b border-gray-100 focus-visible:ring-0 px-0 rounded-none text-sm text-gray-700 placeholder:text-gray-300 h-auto py-2" />
          </div>
          {/* Right: Proforma Details */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Proforma Details</p>
            <div className="space-y-0">
              {([
                { label: "Proforma No",      field: "invoice_number",   type: "text" },
                { label: "Proforma Date",    field: "invoice_date",     type: "date" },
                { label: "Order Ref",         field: "room_name",        type: "text" },
                { label: "Carcass Colour",   field: "carcass_colour",   type: "text" },
                { label: "Door Colour",      field: "door_colour",      type: "text" },
                { label: "Panelwork Colour", field: "panelwork_colour", type: "text" },
                { label: "Door Style",       field: "door_style",       type: "text" },
              ] as const).map(({ label, field, type }) => (
                <div key={field} className="flex items-center border-b border-gray-100 py-0.5">
                  <span className="text-xs text-gray-400 uppercase tracking-wider w-36 flex-shrink-0">{label}</span>
                  <div className="flex-1">
                    <Input type={type} value={(formData as any)[field]}
                      onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                      className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sections + Items */}
        <div className="mb-4">
          {SECTIONS.map(section => {
            const sectionItems = items.filter(i => (i.section || "Furniture") === section);
            if (sectionItems.length === 0) return null;

            const sectionRaw = sectionItems.reduce((sum, item) => {
              const itemRaw = (item.amount || 0) * (item.quantity || 1);
              const subRaw = (item.subItems || []).reduce((s, sub) => s + (sub.amount || 0) * (sub.quantity || 1), 0);
              return sum + itemRaw + subRaw;
            }, 0);

            const sectionAfterItemDiscounts = sectionItems.reduce((sum, item) => {
              const itemTotal = (item.discount_percent && item.discount_percent > 0)
                ? (item.discounted_total ?? (item.amount || 0) * (item.quantity || 1))
                : (item.amount || 0) * (item.quantity || 1);
              const subTotal = (item.subItems || []).reduce((s, sub) =>
                s + ((sub.discount_percent && sub.discount_percent > 0)
                  ? (sub.discounted_total ?? (sub.amount || 0) * (sub.quantity || 1))
                  : (sub.amount || 0) * (sub.quantity || 1)), 0);
              return sum + itemTotal + subTotal;
            }, 0);

            const itemDiscountTotal = sectionRaw - sectionAfterItemDiscounts;
            const hasItemDiscount = itemDiscountTotal > 0;
            const sectionDiscountPct = sectionDiscounts[section] || 0;
            const sectionDiscountAmt = sectionRaw * (sectionDiscountPct / 100);
            const sectionTotal = sectionAfterItemDiscounts;

            return (
              <div key={section} className="mb-0 mt-8">
                <div className="flex items-center gap-3 mt-8 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 whitespace-nowrap">{section}</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-1">
                  <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "8%" }}>Item</th>
                        <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "22%" }}>Description</th>
                        <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "10%" }}>Colour</th>
                        <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "5%" }}>Qty</th>
                        <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "4%" }}>W</th>
                        <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "4%" }}>H</th>
                        <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "4%" }}>D</th>
                        <th className="py-3 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "9%" }}>Price</th>
                        <th className="py-3 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "10%" }}>Amount</th>
                        <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "7%" }}>Disc %</th>
                        <th className="py-3 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "10%" }}>Final</th>
                        <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: "4%" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionItems.map(item => (
                        <React.Fragment key={item.id}>
                          <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="px-2 py-2">
                              <Input
                                value={item.item}
                                onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, item: e.target.value } : i))}
                                onBlur={e => { const val = e.target.value.trim(); if (val.length >= 1) handleItemChange(item.id, "item", val); }}
                                placeholder="50B"
                                className={`border-none focus-visible:ring-0 w-full font-mono text-sm h-auto py-0 px-0 placeholder:text-gray-300 ${autoFilling === item.id ? 'bg-blue-50 animate-pulse' : ''}`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <textarea value={item.description}
                                onChange={e => handleDescriptionChange(item.id, e.target.value)}
                                placeholder="Description" rows={2}
                                style={{ minHeight: "35px", lineHeight: "1.3" }}
                                onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; }}
                                className={`border-none focus-visible:ring-0 w-full resize-none overflow-hidden text-sm bg-transparent outline-none placeholder:text-gray-300 ${autoFilling === item.id ? "bg-blue-50 animate-pulse" : ""}`} />
                            </td>
                            <td className="px-2 py-2">
                              <Input value={item.color} onChange={e => handleItemChange(item.id, "color", e.target.value)} placeholder="Colour" className="border-none focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" value={item.quantity} min="1" onChange={e => handleItemChange(item.id, "quantity", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0" />
                            </td>
                            {(["width", "height", "depth"] as const).map(dim => {
                              const raw = item[dim];
                              const displayVal = raw != null && raw !== "" ? (Number(raw) % 1 === 0 ? String(Math.round(Number(raw))) : String(raw)) : "";
                              return (
                                <td key={dim} className="px-2 py-2">
                                  <Input type="number" value={displayVal} placeholder="—" min="0"
                                    onChange={e => handleItemChange(item.id, dim, e.target.value)}
                                    style={{ width: `${Math.max(3, (displayVal || "—").length + 1)}ch` }}
                                    className="border-none text-center focus-visible:ring-0 text-sm h-auto py-0 px-0 placeholder:text-gray-300" />
                                </td>
                              );
                            })}
                            <td className="px-2 py-2">
                              <Input type="number" step="0.01" min="0" value={parseFloat(Number(item.amount || 0).toFixed(2))} placeholder="0.00" onChange={e => handleItemChange(item.id, "amount", e.target.value)} className="border-none text-right focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" />
                            </td>
                            <td className="px-2 py-2 text-right text-sm text-gray-600">{fmt(item.line_total)}</td>
                            <td className="px-2 py-2">
                              <Input type="number" step="0.1" min="0" max="100" value={item.discount_percent || ""} placeholder="0" onChange={e => handleItemChange(item.id, "discount_percent", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" />
                            </td>
                            <td className="px-2 py-2 text-right">
                              {item.discount_percent && item.discount_percent > 0 ? (
                                <div>
                                  <div className="text-xs text-gray-400 line-through">{fmt(item.line_total)}</div>
                                  <div className="text-sm font-semibold text-gray-900">{fmt(item.discounted_total || 0)}</div>
                                </div>
                              ) : <span className="text-sm font-semibold text-gray-900">{fmt(item.line_total)}</span>}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="text-gray-300 hover:text-red-500 h-7 w-7">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>

                          {(item.subItems || []).map(sub => (
                            <tr key={sub.id} className="bg-gray-50/40 border-b border-gray-50">
                              <td className="px-2 py-1.5 pl-6">
                                <Input
                                  value={sub.item}
                                  onChange={e => setItems(prev => prev.map(it => {
                                    if (it.id !== item.id || !it.subItems) return it;
                                    return { ...it, subItems: it.subItems.map(s => s.id === sub.id ? { ...s, item: e.target.value } : s) };
                                  }))}
                                  onBlur={e => handleSubItemAutoFill(item.id, sub.id, e.target.value)}
                                  placeholder="sub-code"
                                  className="border-none focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 font-mono placeholder:text-gray-300"
                                />
                              </td>
                              <td className="px-2 py-1.5"><Input value={sub.description} onChange={e => handleSubItemChange(item.id, sub.id, "description", e.target.value)} placeholder="Sub-item description" className="border-none focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" /></td>
                              <td className="px-2 py-1.5"><Input value={sub.color} onChange={e => handleSubItemChange(item.id, sub.id, "color", e.target.value)} placeholder="Colour" className="border-none focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" /></td>
                              <td className="px-2 py-1.5"><Input type="number" value={sub.quantity} min="1" onChange={e => handleSubItemChange(item.id, sub.id, "quantity", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0" /></td>
                              <td className="border-b border-gray-50" /><td className="border-b border-gray-50" /><td className="border-b border-gray-50" />
                              <td className="px-2 py-1.5"><Input type="number" step="0.01" value={sub.amount} placeholder="0.00" min="0" onChange={e => handleSubItemChange(item.id, sub.id, "amount", e.target.value)} className="border-none text-right focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" /></td>
                              <td className="px-2 py-1.5 text-right text-sm text-gray-500">{fmt(sub.line_total)}</td>
                              <td className="px-2 py-1.5"><Input type="number" step="0.1" min="0" max="100" value={sub.discount_percent || ""} placeholder="0" onChange={e => handleSubItemChange(item.id, sub.id, "discount_percent", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" /></td>
                              <td className="px-2 py-1.5 text-right">
                                {sub.discount_percent && sub.discount_percent > 0 ? (
                                  <div>
                                    <div className="text-xs text-gray-400 line-through">{fmt(sub.line_total)}</div>
                                    <div className="text-sm font-semibold text-gray-800">{fmt(sub.discounted_total || 0)}</div>
                                  </div>
                                ) : <span className="text-sm text-gray-600">{fmt(sub.line_total)}</span>}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveSubItem(item.id, sub.id)} className="text-gray-300 hover:text-red-500 h-6 w-6">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}

                          <tr>
                            <td colSpan={12} className="border-b border-gray-50 px-2 py-1">
                              <button onClick={() => handleAddSubItem(item.id)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <Plus className="h-3 w-3" /> Add sub-item
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                      {/* ADD ITEM BUTTON ROW */}
                      <tr>
                        <td colSpan={12} className="px-3 py-2">
                          <button
                            onClick={() => handleAddItem(section)}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add item
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section totals */}
                <div className="flex justify-end mt-2 mb-8">
                  <div className="w-96 text-sm rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
                      <span className="text-gray-500 text-sm shrink-0">Section Discount</span>
                      <div className="flex items-center gap-1 text-sm flex-nowrap">
                        <Input type="number" value={sectionDiscountPct ? parseFloat(Number(sectionDiscountPct).toFixed(2)) : ""}
                          onChange={e => {
                            const pct = parseFloat(e.target.value) || 0;
                            const prevPct = sectionDiscounts[section] || 0;
                            setSectionDiscounts(prev => ({ ...prev, [section]: pct }));
                            setSectionDiscountAmounts(prev => ({ ...prev, [section]: '' }));
                            setItems(prevItems => prevItems.map(item => {
                              if ((item.section || 'Furniture') !== section) return item;
                              const itemDisc = item.discount_percent || 0;
                              const updatedItem = (itemDisc > 0 && itemDisc !== prevPct) ? item : {
                                ...item, discount_percent: pct,
                                discounted_total: calcDiscounted(item.quantity || 1, item.amount || 0, pct),
                              };
                              const updatedSubs = (item.subItems || []).map(sub => {
                                const subDisc = sub.discount_percent || 0;
                                if (subDisc > 0 && subDisc !== prevPct) return sub;
                                return { ...sub, discount_percent: pct, discounted_total: calcDiscounted(sub.quantity || 1, sub.amount || 0, pct) };
                              });
                              return { ...updatedItem, subItems: updatedSubs };
                            }));
                          }}
                          className="border border-gray-200 rounded px-1 py-0.5 w-10 text-right text-sm h-auto"
                          min="0" max="100" step="0.1" placeholder="0" />
                        <span className="text-gray-400 text-sm">%</span>
                        <span className="text-gray-300 whitespace-nowrap">or £</span>
                        <Input
                          type="number"
                          value={sectionDiscountAmounts[section] ?? (itemDiscountTotal > 0 ? Number(itemDiscountTotal).toFixed(2) : '')}
                          onChange={e => setSectionDiscountAmounts(prev => ({ ...prev, [section]: e.target.value }))}
                          onBlur={e => {
                            const amtVal = parseFloat(e.target.value) || 0;
                            const pct = sectionRaw > 0 ? (amtVal / sectionRaw) * 100 : 0;
                            const prevPct = sectionDiscounts[section] || 0;
                            setSectionDiscounts(prev => ({ ...prev, [section]: pct }));
                            setSectionDiscountAmounts(prev => ({ ...prev, [section]: amtVal > 0 ? amtVal.toFixed(2) : '' }));
                            setItems(prevItems => prevItems.map(item => {
                              if ((item.section || 'Furniture') !== section) return item;
                              const itemDisc = item.discount_percent || 0;
                              if (itemDisc > 0 && itemDisc !== prevPct) return item;
                              return { ...item, discount_percent: pct, discounted_total: calcDiscounted(item.quantity || 1, item.amount || 0, pct) };
                            }));
                          }}
                          className="border border-gray-200 rounded px-1 py-0.5 w-12 text-right text-sm h-auto"
                          min="0" step="0.01" placeholder="0.00"
                        />
                        <span className="text-red-500 ml-1 whitespace-nowrap text-sm">{sectionDiscountPct > 0 ? `-${fmt(sectionDiscountPct / 100 * sectionRaw)}` : "—"}</span>
                      </div>
                    </div>
                    {hasItemDiscount && (
                      <div className="flex justify-between px-4 py-2.5 border-b border-gray-50 text-gray-600 text-sm">
                        <span>{section} Subtotal</span>
                        <span>{fmt(sectionRaw)}</span>
                      </div>
                    )}
                    {hasItemDiscount && (
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 text-red-500 text-sm">
                        <span>Item Discounts ({parseFloat(Number(sectionDiscountPct).toFixed(2))}%)</span>
                        <span>-{fmt(itemDiscountTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-4 py-3.5 font-semibold bg-gray-900 text-white">
                      <span>{section} Total</span>
                      <span>{fmt(sectionTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        {/* Dynamic Add Section buttons — shown for sections with no items */}
        {(() => {
          const emptySections = SECTIONS.filter(s => !items.some(item => (item.section || 'Furniture') === s));
          if (emptySections.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-2 mt-6 mb-4">
              {emptySections.map(section => (
                <button
                  key={section}
                  onClick={() => handleAddItem(section)}
                  className="text-xs text-gray-500 border border-dashed border-gray-300 hover:border-gray-500 hover:text-gray-700 rounded-lg px-3 py-2 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="h-3 w-3" /> Add {section}
                </button>
              ))}
            </div>
          );
        })()}

        </div>

        {/* Global totals */}
        <div className="mb-10 flex justify-end">
          <div className="w-80 rounded-xl border border-gray-100 shadow-md overflow-hidden text-sm mt-6">
            <div className="flex justify-between px-4 py-2.5 border-b border-gray-50 text-gray-600">
              <span>Subtotal</span>
              <span>{fmt(subtotalAfterSectionDiscounts)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
              <div className="flex items-center gap-2 text-gray-600">
                <span>Discount</span>
                <Input type="number" min="0" max="100" step="0.1" value={globalDiscountPercent} onChange={e => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)} className="border border-gray-200 rounded px-2 py-0.5 w-14 text-right text-xs h-auto" />
                <span className="text-gray-400 text-xs">%</span>
              </div>
              <span className="text-red-500">{globalDiscountAmount > 0 ? `-${fmt(globalDiscountAmount)}` : "—"}</span>
            </div>
            <div className={`flex justify-between px-4 py-2.5 border-b border-gray-50 ${!showExVat ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" checked={showExVat} onChange={e => setShowExVat(e.target.checked)}
                  className="w-3.5 h-3.5 accent-gray-700 cursor-pointer" />
                <span>Ex VAT Total</span>
              </div>
              <span className="text-gray-600">{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
              <div className="flex items-center gap-2 text-gray-600">
                <span>VAT</span>
                <Input type="number" min="0" max="100" step="0.1" value={vatPercentage} onChange={e => setVatPercentage(parseFloat(e.target.value) || 0)} className="border border-gray-200 rounded px-2 py-0.5 w-14 text-right text-xs h-auto" />
                <span className="text-gray-400 text-xs">%</span>
              </div>
              <span className="text-gray-600">{fmt(vat)}</span>
            </div>
            <div className="flex justify-between px-4 py-3.5 bg-gray-900 text-white font-bold">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment + Terms */}
        <div className="border-t border-gray-200 pt-8 mb-6 text-sm text-gray-600">
          {/* Payment Details */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 shadow-sm mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Payment Details</p>
            <p>Acc name: Atelier Luxe Interiors LTD</p>
            <p>Bank: ClearBank</p>
            <p>Sort Code: 04 06 05</p>
            <p>Acc No: 31621197</p>
            <p className="mt-2 text-xs text-gray-400">Please use your name and/or road name as reference</p>
          </div>
          {/* Terms */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Terms</p>
            <p>This is a Proforma Invoice — not a VAT invoice.</p>
            <p className="mt-1">Payment is required before goods are dispatched or work commences.</p>
              {additionalTerms.map((term, i) => (
                <div key={i} className="flex items-center gap-2 mt-1.5">
                  <input
                    type="text"
                    value={term}
                    onChange={e => setAdditionalTerms(prev => prev.map((t, idx) => idx === i ? e.target.value : t))}
                    placeholder="Additional term..."
                    className="flex-1 text-sm border-b border-gray-200 bg-transparent focus:outline-none focus:border-gray-400 py-0.5"
                  />
                  <button onClick={() => setAdditionalTerms(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                </div>
              ))}
              <button
                onClick={() => setAdditionalTerms(prev => [...prev, ''])}
                className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                + Add term
              </button>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Additional Notes <span className="normal-case font-normal">(optional)</span></p>
            <textarea
              value={additionalNotes}
              onChange={e => setAdditionalNotes(e.target.value)}
              placeholder="Add any additional notes for the customer..."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:border-gray-400 resize-none placeholder:text-gray-300"
            />
          </div>
        </div>

        <SignatureField customerName={formData.customer_name} onChange={setSignatureData} initialData={signatureData || undefined} />

        <AddToPricelistModal
          open={pricelistModal.open}
          onClose={() => setPricelistModal(p => ({ ...p, open: false }))}
          itemCode={pricelistModal.itemCode}
          description={pricelistModal.description}
          amount={pricelistModal.amount}
          section={pricelistModal.section}
          doorType={doorType}
          roomType={roomType}
        />

        <div className="mt-10 flex justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={() => router.push(`/dashboard/proformas/${invoiceId}`)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Proforma"}
          </Button>
        </div>
      </div>
    </div>
  );
}