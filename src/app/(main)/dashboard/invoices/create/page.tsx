"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BACKEND_URL } from "@/lib/api";
import Image from 'next/image';
import { useSessionDraft } from "@/hooks/useSessionDraft";
import { SignatureField } from "@/components/ui/SignatureField";

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
  subItems?: InvoiceItem[];
  section?: string;
}

const SECTIONS = ['Furniture', 'Fillers and End Panels', 'Accessories', 'Handles', 'Appliances', 'Sink and Tap', 'Worktops', 'Fittings', 'Miscellaneous'] as const;

export default function CreateInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    invoice_date: new Date().toISOString().split("T")[0],
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      item: "",
      description: "",
      color: "",
      quantity: 1,
      amount: 0,
      line_total: 0,
      discount_percent: 0,
      discounted_total: 0,
      section: 'Furniture',
    },
  ]);

  // ✅ Always-fresh ref for items (avoids stale closure in async handlers)
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [autoFilling, setAutoFilling] = useState<string | null>(null);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [doorType, setDoorType] = useState<string>('Carcass Only');
  const [roomType, setRoomType] = useState<string>('Kitchen');
  const [vatPercentage, setVatPercentage] = useState<number>(20);
  const [carcassColour, setCarcassColour] = useState('');
  const [doorColour, setDoorColour] = useState('');
  const [panelworkColour, setPanelworkColour] = useState('');
  const [doorStyle, setDoorStyle] = useState<string>('');
  const [roomName, setRoomName] = useState('');
  const [sectionDiscounts, setSectionDiscounts] = useState<Record<string, number>>({});
  const [sectionDiscountAmounts, setSectionDiscountAmounts] = useState<Record<string, string>>({});
  const [fillerType, setFillerType] = useState<string>('Basic Slab');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [quoteReference, setQuoteReference] = useState('');
  const [additionalTerms, setAdditionalTerms] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [signatureData, setSignatureData] = useState<import('@/components/ui/SignatureField').SignatureData | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  const { saveDraft, loadDraft, clearDraft } = useSessionDraft("invoices/create");

  // Restore draft on mount — skip if customer params are in the URL (fresh navigation)
  useEffect(() => {
    if (searchParams.get("customerId")) { clearDraft(); return; }
    const draft = loadDraft();
    if (!draft) return;
    if (draft.formData) setFormData(draft.formData as typeof formData);
    if (draft.customerId !== undefined) setCustomerId(draft.customerId as string | null);
    if (draft.items) setItems(draft.items as typeof items);
    if (draft.doorType) setDoorType(draft.doorType as string);
    if (draft.roomType) setRoomType(draft.roomType as string);
    if (draft.vatPercentage !== undefined) setVatPercentage(draft.vatPercentage as number);
    if (draft.carcassColour !== undefined) setCarcassColour(draft.carcassColour as string);
    if (draft.doorColour !== undefined) setDoorColour(draft.doorColour as string);
    if (draft.panelworkColour !== undefined) setPanelworkColour(draft.panelworkColour as string);
    if (draft.doorStyle !== undefined) setDoorStyle(draft.doorStyle as string);
    if (draft.roomName !== undefined) setRoomName(draft.roomName as string);
    if (draft.sectionDiscounts) setSectionDiscounts(draft.sectionDiscounts as Record<string, number>);
    if (draft.sectionDiscountAmounts) setSectionDiscountAmounts(draft.sectionDiscountAmounts as Record<string, string>);
    if (draft.fillerType !== undefined) setFillerType(draft.fillerType as string);
    if (draft.invoiceNumber !== undefined) setInvoiceNumber(draft.invoiceNumber as string);
    if (draft.quoteReference !== undefined) setQuoteReference(draft.quoteReference as string);
    if (draft.additionalTerms) setAdditionalTerms(draft.additionalTerms as string[]);
    if (draft.additionalNotes !== undefined) setAdditionalNotes(draft.additionalNotes as string);
    if (draft.globalDiscountPercent !== undefined) setGlobalDiscountPercent(draft.globalDiscountPercent as number);
    if (draft.deposit !== undefined) setDeposit(draft.deposit as number);
    if (draft.signatureData) setSignatureData(draft.signatureData as typeof signatureData);
    setDraftRestored(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save to sessionStorage
  useEffect(() => {
    saveDraft({ formData, customerId, items, doorType, roomType, vatPercentage, carcassColour, doorColour, panelworkColour, doorStyle, roomName, sectionDiscounts, sectionDiscountAmounts, fillerType, invoiceNumber, quoteReference, additionalTerms, additionalNotes, globalDiscountPercent, deposit, signatureData });
  }, [formData, customerId, items, doorType, roomType, vatPercentage, carcassColour, doorColour, panelworkColour, doorStyle, roomName, sectionDiscounts, sectionDiscountAmounts, fillerType, invoiceNumber, quoteReference, additionalTerms, additionalNotes, globalDiscountPercent, deposit, signatureData, saveDraft]);
  const doorRoomSetByLoad = useRef(0);
  const originalItemsRef = useRef<InvoiceItem[]>([]);
  const originalDoorType = useRef<string>('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
  };

  const calculateDiscountedTotal = (quantity: number, amount: number, discountPercent: number) => {
    const baseTotal = quantity * amount;
    if (!discountPercent || discountPercent === 0) return baseTotal;
    return baseTotal - baseTotal * (discountPercent / 100);
  };

  useEffect(() => {
    const customerIdParam = searchParams.get("customerId");
    const fromQuote       = searchParams.get("fromQuote");

    if (fromQuote === "1") {
      // â”€â”€ Load from quote â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const raw = localStorage.getItem("invoiceFromQuote");
      if (raw) {
        try {
          const q = JSON.parse(raw);
          console.table(q.items?.slice(0, 5).map((i: any) => ({
            item: i.item,
            amount: i.amount,
            unit_price: i.unit_price,
            qty: i.quantity,
            disc_pct: i.discount_percent,
            discounted_total: i.discounted_total,
            line_total: i.line_total,
          })));
          localStorage.removeItem("invoiceFromQuote"); // consume immediately

          if (customerIdParam) setCustomerId(customerIdParam);
          else if (q.client_id) setCustomerId(String(q.client_id));

          setFormData(prev => ({
            ...prev,
            name:    q.customer_name    || "",
            address: q.customer_address || "",
            phone:   q.customer_phone   || "",
            email:   q.customer_email   || "",
          }));

          doorRoomSetByLoad.current = 3;
          if (q.door_type) setDoorType(q.door_type);
          if (q.room_type) setRoomType(q.room_type);
          if (q.filler_type || q.filler_door_type) setFillerType(q.filler_type || q.filler_door_type);

          setRoomName(q.room_name || "");
          if (q.carcass_colour)   setCarcassColour(q.carcass_colour);
          if (q.door_colour)      setDoorColour(q.door_colour);
          if (q.panelwork_colour) setPanelworkColour(q.panelwork_colour);
          if (q.door_style)       setDoorStyle(q.door_style);
          if (q.vat_percentage !== undefined && q.vat_percentage !== null) setVatPercentage(q.vat_percentage);
          if (q.section_discounts) setSectionDiscounts(q.section_discounts);
          if (q.global_discount_percent !== undefined && q.global_discount_percent !== null) setGlobalDiscountPercent(q.global_discount_percent);
          if (q.quote_reference) setQuoteReference(q.quote_reference);

          if (q.items && q.items.length > 0) {
            const mapped: InvoiceItem[] = q.items.map((item: any, idx: number) => {
              const qty = item.quantity || 1;
              const amt = item.amount   || 0;
              const pct = item.discount_percent || 0;
              const lineTotal        = qty * amt;
              const discountedTotal  = pct > 0 ? lineTotal - lineTotal * (pct / 100) : lineTotal;
              return {
                id:               `q-${idx}-${Date.now()}`,
                item:             item.item        || "",
                description:      item.description || "",
                color:            item.color       || "",
                quantity:         qty,
                amount:           amt,
                width:            item.width,
                height:           item.height,
                depth:            item.depth,
                line_total:       lineTotal,
                discount_percent: pct,
                discounted_total: discountedTotal,
                section:          item.section || "Furniture",
                subItems: (item.subItems || []).map((sub: any, sIdx: number) => {
                  const sQty = sub.quantity || 1;
                  const sAmt = sub.amount   || 0;
                  const sPct = sub.discount_percent || 0;
                  const sLine = sQty * sAmt;
                  return {
                    id:               `q-sub-${idx}-${sIdx}-${Date.now()}`,
                    item:             sub.item        || "",
                    description:      sub.description || "",
                    color:            sub.color       || "",
                    quantity:         sQty,
                    amount:           sAmt,
                    line_total:       sLine,
                    discount_percent: sPct,
                    discounted_total: sPct > 0 ? sLine - sLine * (sPct / 100) : sLine,
                  };
                }),
              };
            });
            setItems(mapped);
            originalItemsRef.current = mapped;
            originalDoorType.current = q.door_type || 'Carcass Only';
          }
        } catch (e) {
          console.error("Failed to load quote data:", e);
        }
      }
    } else {
      // â”€â”€ Normal customer pre-fill from URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const customerName    = searchParams.get("customerName");
      const customerAddress = searchParams.get("customerAddress");
      const customerPhone   = searchParams.get("customerPhone");
      const customerEmail   = searchParams.get("customerEmail");

      if (customerIdParam) setCustomerId(customerIdParam);
      if (customerName) {
        setFormData(prev => ({
          ...prev,
          name:    customerName    || "",
          address: customerAddress || "",
          phone:   customerPhone   || "",
          email:   customerEmail   || "",
        }));
      }
    }
  }, [searchParams, user]);

  // Update all prices when door/room type changes
  useEffect(() => {
    if (doorRoomSetByLoad.current > 0) {
      doorRoomSetByLoad.current -= 1;
      return;
    }

    const updateAllPrices = async () => {
      const currentItems = itemsRef.current;
      if (!currentItems.some(i => i.item && i.item.trim().length > 0)) return;

      // Restore originals if switched back to original door type
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

      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      const updatePromises = currentItems.map(async (item) => {
        if (!item.item || item.item.trim().length === 0) return null;
        const itemCode = item.item.trim();
        const hasSuffix = itemCode.includes('-');
        const baseCode = itemCode.split('-')[0];
        const isApplianceCode = /^[A-Z]{1,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;
        const requestBody: any = { description: itemCode };
        if (!hasSuffix && !isApplianceCode) {
          requestBody.door_type = doorType;
          requestBody.room_type = roomType;
          requestBody.filler_door_type = fillerType;
        } else if (!isApplianceCode) {
          requestBody.room_type = roomType;
          requestBody.filler_door_type = fillerType;
        }
        try {
          const response = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Tenant-ID": tenantId },
            body: JSON.stringify(requestBody),
          });
          const data = await response.json();
          if (data.found) return { id: item.id, price: data.price, description: data.description || data.item_name };
          return null;
        } catch { return null; }
      });

      const results = await Promise.all(updatePromises);
      setItems(prev => prev.map(item => {
        const result = results.find(r => r && r.id === item.id);
        if (!result) return item;
        const newAmount = result.price;
        const qty = item.quantity || 1;
        const lineTotal = newAmount * qty;
        const discPct = item.discount_percent || 0;
        return {
          ...item,
          amount: newAmount,
          description: result.description || item.description,
          line_total: lineTotal,
          discounted_total: discPct > 0 ? lineTotal - lineTotal * (discPct / 100) : lineTotal,
        };
      }));
    };

    updateAllPrices();
  }, [doorType, roomType, fillerType]);

  // ============================================================================
  // SMART AUTO-FILL - Triggers when item code is entered
  // ============================================================================
  const handleItemChange = async (id: string, field: keyof InvoiceItem, value: any) => {
      const updatedItems = items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (['quantity', 'amount', 'discount_percent'].includes(field)) {
            const qty = field === 'quantity' ? parseFloat(value) || 1 : updatedItem.quantity || 1;
            const amount = field === 'amount' ? parseFloat(value) || 0 : updatedItem.amount || 0;
            const discountPercent = field === 'discount_percent' ? parseFloat(value) || 0 : updatedItem.discount_percent || 0;
            updatedItem.line_total = qty * amount;
            updatedItem.discounted_total = calculateDiscountedTotal(qty, amount, discountPercent);
          }
          return updatedItem;
        }
        return item;
      });
      setItems(updatedItems);

      if (field !== 'item' || !value || value.length < 1) return;

      const trimmedValue = value.trim().toUpperCase();

      // â”€â”€ FITTING EXPANSION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (trimmedValue === 'FITTING') {
        setAutoFilling(id);
        const token = localStorage.getItem("token");
        const tenantId = localStorage.getItem("tenantId") || "7";
        const FITTING_CODES = ['KUNIT', 'BUNIT', 'ROBE', 'APPL', 'SINKTAP', 'PANW'];
        const currentItemsSnapshot = itemsRef.current
          .filter(i => i.id !== id)
          .map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));
        try {
          const fittingResults = await Promise.all(
            FITTING_CODES.map(async (code) => {
              try {
                const res = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Tenant-ID": tenantId },
                  body: JSON.stringify({ description: code, current_items: currentItemsSnapshot }),
                });
                const data = await res.json();
                if (data.found && data.quantity > 0) {
                  return { code, price: data.price, quantity: data.quantity, name: data.item_name };
                }
                return null;
              } catch { return null; }
            })
          );
          const validFittings = fittingResults.filter(Boolean) as { code: string; price: number; quantity: number; name: string }[];
          if (validFittings.length === 0) {
            alert('No fitting items detected in the invoice. Add kitchen/bedroom units first.');
            setAutoFilling(null);
            return;
          }
          setItems(prevItems => {
            const withoutPlaceholder = prevItems.filter(i => i.id !== id);
            const newFittingRows = validFittings.map(f => ({
              id: `fitting-${f.code}-${Date.now()}-${Math.random()}`,
              item: f.code,
              description: f.name,
              color: '',
              quantity: f.quantity,
              amount: f.price,
              line_total: f.price * f.quantity,
              discount_percent: 0,
              discounted_total: f.price * f.quantity,
              autoFitting: true,
              section: 'Fittings',
            }));
            return [...withoutPlaceholder, ...newFittingRows];
          });
        } catch (error) {
          console.error('Fitting expansion failed:', error);
        } finally {
          setAutoFilling(null);
        }
        return;
      }
      // â”€â”€ END FITTING EXPANSION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

      if (trimmedValue.length > 100) return;

      setAutoFilling(id);
      try {
        const token = localStorage.getItem("token");
        const tenantId = localStorage.getItem("tenantId") || "7";
        const hasSuffix = trimmedValue.includes('-');
        const baseCode = trimmedValue.split('-')[0];
        const isApplianceCode = /^[A-Z]{1,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;
        const currentItemsSnapshot = itemsRef.current
          .filter(i => i.id !== id)
          .map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));

        const MANUAL_FITTING_CODES = ['APPL', 'SINKTAP', 'KUNIT', 'BUNIT', 'ROBE', 'WTJT', 'FITDR', 'PANW'];
        const isFittingCode = MANUAL_FITTING_CODES.includes(trimmedValue.toUpperCase());

        const requestBody: any = {
          description: trimmedValue,
          current_items: isFittingCode ? [] : currentItemsSnapshot,
        };

      if (!hasSuffix && !isApplianceCode) {
        requestBody.door_type = doorType;
        requestBody.room_type = roomType;
        requestBody.filler_door_type = fillerType;
      } else if (!isApplianceCode) {
        requestBody.room_type = roomType;
        requestBody.filler_door_type = fillerType;
      }

      const response = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Tenant-ID": tenantId },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      if (data.found) {
        let autoDescription = data.description || data.item_name || '';
        if (data.is_fitting) autoDescription = data.item_name || '';
        else if (isApplianceCode && data.brand && data.series_level) {
          autoDescription = `${data.item_name} - ${data.brand} ${data.series_level}${data.series_info ? ` (${data.series_info})` : ''}`;
        }
        const fittingQty = data.is_fitting && data.quantity ? data.quantity : null;

        setItems(prevItems => prevItems.map(item => {
          if (item.id !== id) return item;
          const qty = fittingQty !== null ? fittingQty : (item.quantity || 1);
          const price = data.price || 0;
          const lineTotal = price * qty;
          const discPct = item.discount_percent || 0;
          return {
            ...item,
            item: trimmedValue,
            description: autoDescription,
            amount: price,
            quantity: qty,
            width: data.width,
            height: data.height,
            depth: data.depth,
            line_total: lineTotal,
            discounted_total: discPct > 0 ? lineTotal - lineTotal * (discPct / 100) : lineTotal,
          };
        }));
      } else {
        console.log("❌ No pricing found for code:", trimmedValue);
      }
      } catch (error) {
        console.error("Auto-price lookup failed:", error);
      } finally {
        setAutoFilling(null);
      }
    };

  // ============================================================================
  // DYNAMIC FITTING RECALCULATION - Auto-update fitting rows when items change
  // ============================================================================
  const FITTING_CODES_LIST = ['KUNIT', 'BUNIT', 'ROBE', 'APPL', 'SINKTAP', 'FITDR', 'PANW'];
  const recalcInProgress = useRef(false);

  useEffect(() => {
    const recalcFittings = async () => {
      if (recalcInProgress.current) return;

      const currentItems = itemsRef.current;
      const fittingRows = currentItems.filter(i => i.autoFitting && FITTING_CODES_LIST.includes((i.item || '').trim().toUpperCase()));
      if (fittingRows.length === 0) return;

      recalcInProgress.current = true;

      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";

      const nonFittingSnapshot = currentItems
        .filter(i => !FITTING_CODES_LIST.includes((i.item || '').trim().toUpperCase()))
        .map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));

      try {
        const results = await Promise.all(
          fittingRows.map(async (row) => {
            const code = (row.item || '').trim().toUpperCase();
            try {
              const res = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Tenant-ID": tenantId },
                body: JSON.stringify({ description: code, current_items: nonFittingSnapshot }),
              });
              const data = await res.json();
              return { id: row.id, code, found: data.found, quantity: data.quantity || 0, price: data.price || 0, name: data.item_name };
            } catch {
              return { id: row.id, code, found: false, quantity: 0, price: 0 };
            }
          })
        );

        setItems(prevItems => {
          let changed = false;
          const updated = prevItems
            .map(item => {
              const result = results.find(r => r.id === item.id);
              if (!result) return item;

              if (!result.found || result.quantity === 0) {
                changed = true;
                return null;
              }

              if (item.quantity !== result.quantity || item.amount !== result.price) {
                changed = true;
                return {
                  ...item,
                  quantity: result.quantity,
                  amount: result.price,
                  line_total: result.price * result.quantity,
                  discounted_total: item.discount_percent
                    ? calculateDiscountedTotal(result.quantity, result.price, item.discount_percent)
                    : result.price * result.quantity,
                };
              }
              return item;
            })
            .filter((item): item is InvoiceItem => item !== null);

          return changed ? updated : prevItems;
        });

      } catch (error) {
        console.error('Fitting recalc failed:', error);
      } finally {
        recalcInProgress.current = false;
      }
    };

    const timer = setTimeout(recalcFittings, 800);
    return () => clearTimeout(timer);
  }, [items]);

  // ============================================================================
  // DESCRIPTION AUTO-FILL
  // ============================================================================
  const handleDescriptionChange = async (id: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) return { ...item, description: value };
        return item;
      })
    );

    if (!value || value.length < 5) return;

    setAutoFilling(id);

    try {
      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";

      const response = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify({
          description: value,
          door_type: doorType,
          room_type: roomType,
        }),
      });

      const data = await response.json();

      if (data.found) {
        setItems((prevItems) => prevItems.map((item) => {
            if (item.id === id) {
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
            }
            return item;
          })
        );
      }
    } catch (error) {
      console.error("Description auto-fill failed:", error);
    } finally {
      setAutoFilling(null);
    }
  };

  const handleAddItem = (section: string) => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        item: "",
        description: "",
        color: "",
        quantity: 1,
        amount: 0,
        line_total: 0,
        section,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (confirm("Remove this item?")) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleAddSubItem = (parentId: string) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === parentId) {
        const newSub: InvoiceItem = {
          id: `sub-${Date.now()}-${Math.random()}`,
          item: "",
          description: "",
          color: "",
          quantity: 1,
          amount: 0,
          line_total: 0,
          discount_percent: 0,
          discounted_total: 0,
        };
        return { ...item, subItems: [...(item.subItems || []), newSub] };
      }
      return item;
    }));
  };

  const handleSubItemChange = (parentId: string, subId: string, field: keyof InvoiceItem, value: any) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== parentId || !item.subItems) return item;
      const updatedSubs = item.subItems.map(sub => {
        if (sub.id !== subId) return sub;
        const updatedSub = { ...sub, [field]: value };
        if (['quantity', 'amount', 'discount_percent'].includes(field)) {
          const qty = field === 'quantity' ? parseFloat(value) || 1 : updatedSub.quantity || 1;
          const amount = field === 'amount' ? parseFloat(value) || 0 : updatedSub.amount || 0;
          const discountPercent = field === 'discount_percent' ? parseFloat(value) || 0 : updatedSub.discount_percent || 0;
          updatedSub.line_total = qty * amount;
          updatedSub.discounted_total = calculateDiscountedTotal(qty, amount, discountPercent);
        }
        return updatedSub;
      });
      return { ...item, subItems: updatedSubs };
    }));
  };

  const handleRemoveSubItem = (parentId: string, subId: string) => {
    if (!confirm("Remove this sub-item?")) return;
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== parentId || !item.subItems) return item;
      return { ...item, subItems: item.subItems.filter(sub => sub.id !== subId) };
    }));
  };

  const handleSubItemAutoFill = async (parentId: string, subId: string, value: string) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== parentId || !item.subItems) return item;
      return {
        ...item,
        subItems: item.subItems.map(sub => sub.id === subId ? { ...sub, item: value } : sub)
      };
    }));

    if (!value || value.trim().length < 1) return;
    const trimmedValue = value.trim().toUpperCase();
    if (trimmedValue.length > 100) return;

    try {
      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      const hasSuffix = trimmedValue.includes('-');
      const baseCode = trimmedValue.split('-')[0];
      const isApplianceCode = /^[A-Z]{1,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;

      const requestBody: any = {
        description: trimmedValue,
        current_items: [],
      };

      if (!hasSuffix && !isApplianceCode) {
        requestBody.door_type = doorType;
        requestBody.room_type = roomType;
        requestBody.filler_door_type = fillerType;
      } else if (!isApplianceCode) {
        requestBody.room_type = roomType;
        requestBody.filler_door_type = fillerType;
      }

      const response = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Tenant-ID": tenantId },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      if (data.found) {
        let autoDescription = data.description || data.item_name || '';
        if (data.is_fitting) autoDescription = data.item_name || '';
        else if (isApplianceCode && data.brand && data.series_level) {
          autoDescription = `${data.item_name} - ${data.brand} ${data.series_level}${data.series_info ? ` (${data.series_info})` : ''}`;
        }
        const fittingQty = data.is_fitting && data.quantity ? data.quantity : null;

        setItems(prevItems => prevItems.map(item => {
          if (item.id !== parentId || !item.subItems) return item;
          return {
            ...item,
            subItems: item.subItems.map(sub => {
              if (sub.id !== subId) return sub;
              const qty = fittingQty !== null ? fittingQty : (sub.quantity || 1);
              const price = data.price || 0;
              return {
                ...sub,
                item: data.item_code || trimmedValue,
                description: autoDescription,
                amount: price,
                quantity: qty,
                width: data.width,
                height: data.height,
                depth: data.depth,
                line_total: price * qty,
                discounted_total: sub.discount_percent
                  ? calculateDiscountedTotal(qty, price, sub.discount_percent)
                  : price * qty,
              };
            })
          };
        }));
      } else {
        console.log("❌ No pricing found for sub-item code:", trimmedValue);
      }
    } catch (error) {
      console.error("Sub-item auto-price lookup failed:", error);
    }
  };

  const handleSaveDraft = () => handleSaveWithStatus(true);
  const handleSave = () => handleSaveWithStatus(false);

  const handleSaveWithStatus = async (isDraft: boolean) => {
    if (savingRef.current) return;

    if (!isDraft) {
        if (!formData.address?.trim()) { alert("Customer address is required"); return; }
      if (!roomName.trim()) { alert("Order reference is required"); return; }
    }

    const subtotalBeforeDiscount = Math.round(SECTIONS.reduce((total, section) => {
      const sectionItems = items.filter(i => (i.section || 'Furniture') === section);
      const sectionTotal = sectionItems.reduce((sum, item) => {
        const qty = item.quantity || 1;
        const amt = item.amount || 0;
        const pct = item.discount_percent || 0;
        const itemTotal = Math.round((pct > 0 ? amt * qty * (1 - pct / 100) : amt * qty) * 100) / 100;
        const subTotal = (item.subItems || []).reduce((s, sub) => {
          const sQty = sub.quantity || 1;
          const sAmt = sub.amount || 0;
          const sPct = sub.discount_percent || 0;
          return s + Math.round((sPct > 0 ? sAmt * sQty * (1 - sPct / 100) : sAmt * sQty) * 100) / 100;
        }, 0);
        return sum + Math.round((itemTotal + subTotal) * 100) / 100;
      }, 0);
      return total + Math.round(sectionTotal * 100) / 100;
    }, 0) * 100) / 100;

    const globalDiscountAmount = Math.round(subtotalBeforeDiscount * (globalDiscountPercent / 100) * 100) / 100;
    const subtotal = Math.round((subtotalBeforeDiscount - globalDiscountAmount) * 100) / 100;

    if (!isDraft && subtotal <= 0) { alert("Please add at least one item with a valid price"); return; }

    savingRef.current = true;
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const vat = Math.round(subtotal * (vatPercentage / 100) * 100) / 100;
      const total = Math.round((subtotal + vat) * 100) / 100;

      const response = await fetch(`${API_FORM}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          client_id: customerId,
          customer_name: formData.name,
          customer_address: formData.address,
          customer_phone: formData.phone,
          customer_email: formData.email,
          invoice_date: formData.invoice_date,
          invoice_number: invoiceNumber || undefined,
          quote_reference: quoteReference,
          door_type: doorType,
          room_type: roomType,
          filler_type: fillerType,
          filler_door_type: fillerType,
          room_name: roomName,
          carcass_colour: carcassColour,
          door_colour: doorColour,
          panelwork_colour: panelworkColour,
          section_discounts: sectionDiscounts,
          door_style: doorStyle,
          deposit_paid: deposit,
          total_remaining: Math.max(0, total - deposit),
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
          subtotal,
          vat,
          total,
          vat_percentage: vatPercentage,
          global_discount_percent: globalDiscountPercent,
          global_discount_amount: globalDiscountAmount,
          additional_terms: additionalTerms.filter(t => t.trim()),
          additional_notes: additionalNotes,
          status: isDraft ? 'Draft' : undefined,
          signature_type: signatureData?.type || 'none',
          signature_image: signatureData?.imageData || null,
          signature_text: signatureData?.text || null,
          signature_name: signatureData?.name || '',
          signature_date: signatureData?.date || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const invoiceId = data.invoice_id || data.id;
        clearDraft();
        if (isDraft) {
          alert(`✅ Invoice #${invoiceId} saved as draft!`);
          router.push(`/dashboard/invoices/${invoiceId}/edit`);
        } else {
          alert(`✅ Invoice #${invoiceId} created successfully!`);
          window.open(`/dashboard/invoices/${invoiceId}`, '_blank');
          if (customerId) {
            router.push(`/dashboard/customers/${customerId}`);
          } else {
            router.push("/dashboard/invoices");
          }
        }
      } else {
        const error = await response.json();
        alert(`❌ Failed to save: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert("❌ Error saving invoice");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const subtotalAfterSectionDiscounts = Math.round(SECTIONS.reduce((total, section) => {
    const sectionItems = items.filter(i => (i.section || 'Furniture') === section);
    const sectionTotal = sectionItems.reduce((sum, item) => {
      const qty = item.quantity || 1;
      const amt = item.amount || 0;
      const pct = item.discount_percent || 0;
      const itemTotal = Math.round((pct > 0 ? amt * qty * (1 - pct / 100) : amt * qty) * 100) / 100;
      const subTotal = (item.subItems || []).reduce((s, sub) => {
        const sQty = sub.quantity || 1;
        const sAmt = sub.amount || 0;
        const sPct = sub.discount_percent || 0;
        return s + Math.round((sPct > 0 ? sAmt * sQty * (1 - sPct / 100) : sAmt * sQty) * 100) / 100;
      }, 0);
      return sum + Math.round((itemTotal + subTotal) * 100) / 100;
    }, 0);
    return total + Math.round(sectionTotal * 100) / 100;
  }, 0) * 100) / 100;

  const globalDiscountAmount = Math.round(subtotalAfterSectionDiscounts * (globalDiscountPercent / 100) * 100) / 100;
  const subtotal = Math.round((subtotalAfterSectionDiscounts - globalDiscountAmount) * 100) / 100;
  const vat = Math.round(subtotal * (vatPercentage / 100) * 100) / 100;
  const total = Math.round((subtotal + vat) * 100) / 100;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b px-8 py-3 print:hidden flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 font-medium">New Invoice</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>Cancel</Button>
          <Button size="sm" variant="outline" onClick={handleSaveDraft} disabled={saving}>
            {saving ? "Saving..." : "Save as Draft"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-gray-800 text-white">
            <Save className="mr-2 h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
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

        {/* Document title */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">Invoice</p>
            <h1 className="text-2xl font-semibold text-gray-900">New Invoice</h1>
          </div>
        </div>

        {/* Door Type and Room Type */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Room Type <span className="text-red-600">*</span>
            </label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
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
              onChange={(e) => setDoorType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Carcass Only">Carcass Only (No Doors/Drawers)</option>
              <option value="Basic Slab">Slab</option>
              <option value="Acrylic Gloss/Matt">Lacquered Slab</option>
              <option value="Timber">Timber</option>
              <option value="Vinyl Doors">Vinyl</option>
              <option value="Black Glass">Black Glass</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Fillers &amp; End Panels Type
            </label>
            <select
              value={fillerType}
              onChange={(e) => setFillerType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Basic Slab">Slab</option>
              <option value="Acrylic Gloss/Matt">Lacquered Slab</option>
              <option value="Vinyl Doors">Vinyl Doors</option>
              <option value="Timber">Timber</option>
            </select>
          </div>
        </div>

        {(() => {
          const DOOR_TYPE_DISPLAY: Record<string, string> = {
            'Acrylic Gloss/Matt': 'Lacquered Slab',
            'Basic Slab': 'Slab',
            'Vinyl Doors': 'Vinyl',
            'Carcass Only': 'Carcass Only',
            'Timber': 'Timber',
            'Black Glass': 'Black Glass',
          };
          const displayDoorType = DOOR_TYPE_DISPLAY[doorType] || doorType;

          return (
            <div className="mb-6 rounded-md bg-blue-50 border border-blue-200 p-4">
              <p className="font-medium text-sm text-blue-900 mb-2">
                Selected: <span className="font-bold">{roomType}</span> with <span className="font-bold">{displayDoorType}</span> doors
              </p>
              <p className="text-xs text-blue-700 mb-2">
                Prices will be automatically looked up based on these selections when you enter item codes.
              </p>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs font-semibold text-blue-900 mb-1">Component-Only Pricing (Advanced):</p>
                <ul className="text-xs text-blue-700 mt-1 ml-4 space-y-0.5">
                  <li>• <code className="bg-blue-100 px-1 rounded">50B</code> = {doorType === 'Carcass Only' ? 'Carcass only' : `Carcass + ${displayDoorType} total (auto)`}</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">50B-C</code> = Carcass only (when door type selected)</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">50B-S</code> = Slab door component only</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">50B-LS</code> = Lacquered Slab door component only</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">50B-T</code> = Timber door component only</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">50B-VD</code> = Vinyl door component only</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">50B-BG</code> = Black Glass door component only</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">50R-BGT</code> = Carcass + Black Glass total</li>
                  {doorType === 'Carcass Only' && <>
                    <li>• <code className="bg-blue-100 px-1 rounded">50B-ST</code> = Carcass + Slab total</li>
                    <li>• <code className="bg-blue-100 px-1 rounded">50B-LST</code> = Carcass + Lacquered Slab total</li>
                    <li>• <code className="bg-blue-100 px-1 rounded">50B-TT</code> = Carcass + Timber total</li>
                    <li>• <code className="bg-blue-100 px-1 rounded">50B-VDT</code> = Carcass + Vinyl total</li>
                    <li>• <code className="bg-blue-100 px-1 rounded">50R-BGT</code> = Carcass + Black Glass total</li>
                    <li>• <code className="bg-blue-100 px-1 rounded">FITTING</code> = Auto-detect all fittings from quote items</li>
                  </>}
                </ul>
              </div>
            </div>
          );
        })()}

        {/* Customer + Invoice Details — 2-column layout */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {/* Left: Bill To */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Bill To</p>
            <div>
              <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Customer Name" className="border-none border-b border-gray-100 focus-visible:ring-0 px-0 rounded-none text-base font-medium placeholder:text-gray-300 mb-1 h-auto py-2" required />
              <textarea value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} placeholder="Address" rows={3} className="w-full bg-transparent border-none outline-none resize-none text-sm text-gray-700 placeholder:text-gray-300 py-2 border-b border-gray-100" required />
              <Input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="Phone" className="border-none border-b border-gray-100 focus-visible:ring-0 px-0 rounded-none text-sm text-gray-700 placeholder:text-gray-300 h-auto py-2" />
              <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="Email" className="border-none border-b border-gray-100 focus-visible:ring-0 px-0 rounded-none text-sm text-gray-700 placeholder:text-gray-300 h-auto py-2" />
            </div>
          </div>

          {/* Right: Invoice Details */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Invoice Details</p>
            <div className="space-y-0">
              {([
                { label: 'Invoice No',       content: <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g. AL-INV-000001" className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" /> },
                { label: 'Invoice Date',     content: <Input type="date" value={formData.invoice_date} onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))} className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" /> },
              ] as const).map(({ label, content }) => (
                <div key={label} className="flex items-center border-b border-gray-100 py-0.5">
                  <span className="text-xs text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">{label}</span>
                  <div className="flex-1">{content}</div>
                </div>
              ))}
              <div className="flex items-center border-b border-gray-100 py-0.5">
                <span className="text-xs text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">Quote Ref (£)</span>
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-sm text-gray-500 flex-shrink-0">£</span>
                  <Input value={quoteReference} onChange={e => setQuoteReference(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="Optional" inputMode="decimal"
                    className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" />
                </div>
              </div>
              {([
                { label: 'Order Ref',        content: <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Kitchen" className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" /> },
                { label: 'Carcass Colour',   content: <Input value={carcassColour} onChange={(e) => setCarcassColour(e.target.value)} placeholder="" className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" /> },
                { label: 'Door Colour',      content: <Input value={doorColour} onChange={(e) => setDoorColour(e.target.value)} placeholder="" className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" /> },
                { label: 'Panelwork',        content: <Input value={panelworkColour} onChange={(e) => setPanelworkColour(e.target.value)} placeholder="" className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" /> },
                { label: 'Door Style',       content: <Input value={doorStyle} onChange={(e) => setDoorStyle(e.target.value)} placeholder="" className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" /> },
              ] as const).map(({ label, content }) => (
                <div key={label} className="flex items-center border-b border-gray-100 py-0.5">
                  <span className="text-xs text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">{label}</span>
                  <div className="flex-1">{content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          {SECTIONS.map((section) => {
            const sectionItems = items.filter((item) => (item.section || 'Furniture') === section);
            if (sectionItems.length === 0) return null;

            const sectionRaw = sectionItems.reduce((sum, item) => {
              const itemRaw = (item.amount || 0) * (item.quantity || 1);
              const subRaw = (item.subItems || []).reduce((s, sub) =>
                s + (sub.amount || 0) * (sub.quantity || 1), 0);
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

            const sectionSubtotal = sectionRaw;
            const itemDiscountTotal = sectionRaw - sectionAfterItemDiscounts;
            const hasItemDiscount = itemDiscountTotal > 0;
            const sectionDiscount = itemDiscountTotal;

            return (
              <div key={section} className="mb-0 mt-8">
                <div className="flex items-center gap-3 mt-8 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 whitespace-nowrap">{section}</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-1"><table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '8%' }}>Item</th>
                      <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '22%' }}>Description</th>
                      <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '10%' }}>Colour</th>
                      <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '5%' }}>Qty</th>
                      <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '4%' }}>W</th>
                      <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '4%' }}>H</th>
                      <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '4%' }}>D</th>
                      <th className="py-3 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '9%' }}>Price</th>
                      <th className="py-3 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '10%' }}>Amount</th>
                      <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '7%' }}>Disc %</th>
                      <th className="py-3 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '10%' }}>Final</th>
                      <th className="py-3 px-3" style={{ width: '4%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionItems.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr>
                          <td className="border-b border-gray-50 px-2 py-2">
                            <Input
                              value={item.item}
                              onChange={(e) => {
                                setItems(prevItems => prevItems.map(i => i.id === item.id ? { ...i, item: e.target.value } : i));
                              }}
                              onBlur={(e) => { const val = e.target.value.trim(); if (val.length >= 1) handleItemChange(item.id, "item", val); }}
                              placeholder="50B"
                              className={`border-none focus-visible:ring-0 font-mono text-sm h-auto py-0 px-0 w-full ${autoFilling === item.id ? 'bg-blue-50 animate-pulse' : ''}`}
                            />
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2">
                            <textarea
                              value={item.description}
                              onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                              placeholder="Description"
                              className={`border-none outline-none w-full resize-none overflow-hidden text-sm bg-transparent placeholder:text-gray-300 ${autoFilling === item.id ? 'bg-blue-50 animate-pulse' : ''}`}
                              rows={1}
                              style={{ minHeight: '24px', lineHeight: '1.5' }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${target.scrollHeight}px`;
                              }}
                            />
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2">
                            <Input value={item.color} onChange={(e) => handleItemChange(item.id, "color", e.target.value)} placeholder="" className="border-none focus-visible:ring-0 text-sm h-auto py-0 px-0 w-full placeholder:text-gray-300" />
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2">
                            <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0" min="1" />
                          </td>
                          {([["width","W"],["height","H"],["depth","D"]] as const).map(([dim, ph]) => {
                            const raw = item[dim as "width"|"height"|"depth"];
                            const displayVal = raw != null && raw !== "" ? (Number(raw) % 1 === 0 ? String(Math.round(Number(raw))) : String(raw)) : "";
                            return (
                              <td key={dim} className="border-b border-gray-50 px-2 py-2">
                                <Input type="number" value={displayVal} onChange={(e) => handleItemChange(item.id, dim as any, e.target.value)} placeholder={ph}
                                  style={{ width: `${Math.max(3, (displayVal || ph).length + 1)}ch` }}
                                  className="border-none text-center focus-visible:ring-0 text-sm h-auto py-0 px-0 placeholder:text-gray-300" min="0" />
                              </td>
                            );
                          })}
                          <td className="border-b border-gray-50 px-2 py-2">
                            <Input type="number" step="0.01" value={parseFloat(Number(item.amount || 0).toFixed(2))} onChange={(e) => handleItemChange(item.id, "amount", e.target.value)} className="border-none text-right focus-visible:ring-0 w-full text-sm h-auto py-0 px-0" min="0" placeholder="0.00" />
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2 text-right text-sm text-gray-600">
                            {formatCurrency(item.line_total)}
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2">
                            <Input type="number" step="0.1" value={item.discount_percent || ''} onChange={(e) => handleItemChange(item.id, "discount_percent", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" min="0" max="100" placeholder="0" />
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2 text-right">
                            {item.discount_percent && item.discount_percent > 0 ? (
                              <div>
                                <div className="text-xs text-gray-400 line-through">{formatCurrency(item.line_total)}</div>
                                <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.discounted_total || 0)}</div>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.line_total)}</span>
                            )}
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2 text-center">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="text-gray-300 hover:text-red-500 h-7 w-7">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>

                        {/* SUB-ITEMS */}
                        {(item.subItems || []).map((sub) => (
                          <tr key={sub.id} className="bg-gray-50/40">
                            <td className="border-b border-gray-50 px-2 py-1.5 pl-6">
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
                                className="border-none focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 font-mono placeholder:text-gray-300"
                              />
                            </td>
                            <td className="border-b border-gray-50 px-2 py-1.5">
                              <Input value={sub.description} onChange={(e) => handleSubItemChange(item.id, sub.id, "description", e.target.value)} placeholder="Sub-item description" className="border-none focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" />
                            </td>
                            <td className="border-b border-gray-50 px-2 py-1.5">
                              <Input value={sub.color} onChange={(e) => handleSubItemChange(item.id, sub.id, "color", e.target.value)} placeholder="" className="border-none focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" />
                            </td>
                            <td className="border-b border-gray-50 px-2 py-1.5">
                              <Input type="number" value={sub.quantity} onChange={(e) => handleSubItemChange(item.id, sub.id, "quantity", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0" min="1" />
                            </td>
                            <td className="border-b border-gray-50" /><td className="border-b border-gray-50" /><td className="border-b border-gray-50" />
                            <td className="border-b border-gray-50 px-2 py-1.5">
                              <Input type="number" step="0.01" value={sub.amount} onChange={(e) => handleSubItemChange(item.id, sub.id, "amount", e.target.value)} className="border-none text-right focus-visible:ring-0 w-full text-sm h-auto py-0 px-0" min="0" placeholder="0.00" />
                            </td>
                            <td className="border-b border-gray-50 px-2 py-1.5 text-right text-sm text-gray-500">{formatCurrency(sub.line_total)}</td>
                            <td className="border-b border-gray-50 px-2 py-1.5">
                              <Input type="number" step="0.1" value={sub.discount_percent || ''} onChange={(e) => handleSubItemChange(item.id, sub.id, "discount_percent", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" min="0" max="100" placeholder="0" />
                            </td>
                            <td className="border-b border-gray-50 px-2 py-1.5 text-right">
                              {sub.discount_percent && sub.discount_percent > 0 ? (
                                <div>
                                  <div className="text-xs text-gray-400 line-through">{formatCurrency(sub.line_total)}</div>
                                  <div className="text-sm font-semibold text-gray-800">{formatCurrency(sub.discounted_total || 0)}</div>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-600">{formatCurrency(sub.line_total)}</span>
                              )}
                            </td>
                            <td className="border-b border-gray-50 px-2 py-1.5 text-center">
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveSubItem(item.id, sub.id)} className="text-gray-300 hover:text-red-500 h-6 w-6">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}

                        {/* ADD SUB-ITEM BUTTON ROW */}
                        <tr>
                          <td colSpan={12} className="border-b border-gray-50 px-2 py-1">
                            <button
                              onClick={() => handleAddSubItem(item.id)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
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
                </table></div>

                {/* Section Totals */}
                {(() => {
                  const sectionDiscountPct = sectionDiscounts[section] || 0;
                  const sectionTotal = sectionAfterItemDiscounts;

                  return (
                    <div className="flex justify-end mt-3 mb-8">
                      <div className="w-96 text-sm rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {hasItemDiscount && (
                          <div className="flex justify-between px-5 py-2.5 border-b border-gray-100 text-gray-600">
                            <span>{section} Subtotal</span>
                            <span>{formatCurrency(sectionRaw)}</span>
                          </div>
                        )}
                        {hasItemDiscount && (
                          <div className="flex justify-between px-5 py-2.5 border-b border-gray-100 text-red-500">
                            <span>Item Discounts ({parseFloat(Number(sectionDiscountPct).toFixed(2))}%)</span>
                            <span>-{formatCurrency(itemDiscountTotal)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100">
                          <span className="text-gray-500 shrink-0">Section Discount</span>
                          <div className="flex items-center gap-1 text-sm flex-nowrap">
                            <Input
                              type="number"
                              value={sectionDiscountPct ? parseFloat(Number(sectionDiscountPct).toFixed(2)) : ''}
                              onChange={(e) => {
                                const pct = parseFloat(e.target.value) || 0;
                                const prevPct = sectionDiscounts[section] || 0;
                                setSectionDiscounts(prev => ({ ...prev, [section]: pct }));
                                setSectionDiscountAmounts(prev => ({ ...prev, [section]: '' }));
                                setItems(prevItems => prevItems.map(item => {
                                  if ((item.section || 'Furniture') !== section) return item;
                                  const itemDisc = item.discount_percent || 0;
                                  const updatedItem = (itemDisc > 0 && itemDisc !== prevPct) ? item : {
                                    ...item,
                                    discount_percent: pct,
                                    discounted_total: calculateDiscountedTotal(item.quantity || 1, item.amount || 0, pct),
                                  };
                                  const updatedSubs = (item.subItems || []).map(sub => {
                                    const subDisc = sub.discount_percent || 0;
                                    if (subDisc > 0 && subDisc !== prevPct) return sub;
                                    return { ...sub, discount_percent: pct, discounted_total: calculateDiscountedTotal(sub.quantity || 1, sub.amount || 0, pct) };
                                  });
                                  return { ...updatedItem, subItems: updatedSubs };
                                }));
                              }}
                              className="border border-gray-200 rounded px-1 py-0.5 w-10 text-right text-sm h-auto"
                              min="0" max="100" step="0.1" placeholder="0"
                            />
                            <span className="text-gray-400 text-sm">%</span>
                            <span className="text-gray-300 whitespace-nowrap">or £</span>
                            <Input
                              type="number"
                              value={
                                sectionDiscountAmounts[section] !== undefined && sectionDiscountAmounts[section] !== ''
                                  ? sectionDiscountAmounts[section]
                                  : itemDiscountTotal > 0 ? Number(itemDiscountTotal).toFixed(2) : ''
                              }
                              onChange={(e) => setSectionDiscountAmounts(prev => ({ ...prev, [section]: e.target.value }))}
                              onBlur={(e) => {
                                const amtVal = parseFloat(e.target.value) || 0;
                                const pct = sectionRaw > 0 ? (amtVal / sectionRaw) * 100 : 0;
                                const prevPct = sectionDiscounts[section] || 0;
                                setSectionDiscounts(prev => ({ ...prev, [section]: pct }));
                                setSectionDiscountAmounts(prev => ({ ...prev, [section]: amtVal > 0 ? amtVal.toFixed(2) : '' }));
                                setItems(prevItems => prevItems.map(item => {
                                  if ((item.section || 'Furniture') !== section) return item;
                                  const itemDisc = item.discount_percent || 0;
                                  if (itemDisc > 0 && itemDisc !== prevPct) return item;
                                  return { ...item, discount_percent: pct, discounted_total: calculateDiscountedTotal(item.quantity || 1, item.amount || 0, pct) };
                                }));
                              }}
                              className="border border-gray-200 rounded px-1 py-0.5 w-12 text-right text-sm h-auto"
                              min="0" step="0.01" placeholder="0.00"
                            />
                            <span className="text-red-500 ml-1 whitespace-nowrap text-sm">{sectionDiscountPct > 0 ? `-${formatCurrency(sectionRaw * sectionDiscountPct / 100)}` : "—"}</span>
                          </div>
                        </div>
                        <div className="flex justify-between px-5 py-3.5 font-semibold bg-gray-900 text-white">
                          <span>{section} Total</span>
                          <span>{formatCurrency(sectionTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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

        {/* Totals */}
        <div className="mb-10 flex justify-end">
          <div className="w-80 rounded-xl border border-gray-100 shadow-md overflow-hidden text-sm">
            <div className="flex justify-between px-5 py-2.5 border-b border-gray-100 text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotalAfterSectionDiscounts)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <span>Discount</span>
                <Input type="number" value={globalDiscountPercent} onChange={(e) => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)} className="border border-gray-200 rounded px-2 py-0.5 w-14 text-right text-xs h-auto" min="0" max="100" step="0.1" />
                <span className="text-gray-400 text-xs">%</span>
              </div>
              <span className="text-red-500">{globalDiscountPercent > 0 ? `-${formatCurrency(globalDiscountAmount)}` : '—'}</span>
            </div>
            {globalDiscountPercent > 0 && (
              <div className="flex justify-between px-5 py-2.5 border-b border-gray-100 text-gray-600">
                <span>After Discount</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <span>VAT</span>
                <Input type="number" value={vatPercentage} onChange={(e) => setVatPercentage(parseFloat(e.target.value) || 0)} className="border border-gray-200 rounded px-2 py-0.5 w-14 text-right text-xs h-auto" min="0" max="100" step="0.1" />
                <span className="text-gray-400 text-xs">%</span>
              </div>
              <span className="text-gray-600">{formatCurrency(vat)}</span>
            </div>
            <div className="flex justify-between px-5 py-4 bg-gray-900 text-white font-semibold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 mt-2">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-sm">Deposit Paid</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-xs">£</span>
                  <Input
                    type="number" min="0" step="0.01"
                    value={deposit || ""}
                    onChange={e => setDeposit(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-24 rounded border border-gray-200 px-2 py-0.5 text-right text-xs h-auto"
                  />
                </div>
              </div>
              <span className="text-green-700">{deposit > 0 ? `-${formatCurrency(deposit)}` : "—"}</span>
            </div>
            <div className="flex justify-between px-5 py-4 bg-gray-900 text-white font-semibold">
              <span>Balance Due</span>
              <span>{formatCurrency(Math.max(0, total - deposit))}</span>
            </div>
          </div>
        </div>

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
                        <div>
          </div>
          {/* Terms */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Terms</p>
            <p>Only Bacs or Cash accepted on Delivery and Completion.</p>
                          <p className="mt-1">Payment is due within 30 days of the invoice date.</p>
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

        <SignatureField customerName={formData.name} onChange={setSignatureData} />
      </div>
    </div>
  );
}