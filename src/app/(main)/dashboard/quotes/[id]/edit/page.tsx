"use client";
 
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import Image from 'next/image';
 
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aztec-interior.onrender.com';

interface QuoteItem {
  // id: string;
  item: string;
  description: string;
  color: string;
  quantity: number;
  amount: number;
  width?: number;
  height?: number;
  depth?: number;
  line_total: number;
  price_list_item_id?: number;
  // ADD THESE:
  discount_percent?: number;
  discounted_total?: number;
  autoFitting?: boolean;
  subItems?: QuoteItem[];
  section?: string;
}

const SECTIONS = ['Furniture', 'Fillers and End Panels', 'Accessories', 'Handles', 'Appliances', 'Sink and Tap', 'Worktops', 'Fittings'] as const;

export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = params.id as string;
 
  const [quotation, setQuotation] = useState<any>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const itemsRef = useRef<QuoteItem[]>([]);
  const originalItemsRef = useRef<QuoteItem[]>([]);
  const originalDoorType = useRef<string>('');
  useEffect(() => { itemsRef.current = items; }, [items]);
  const doorRoomSetByLoad = useRef(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState<number | null>(null);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);
  const [sectionDiscountAmounts, setSectionDiscountAmounts] = useState<Record<string, string>>({});
  
  // ✅ NEW: Door type and room type with URL param initialization
  const [doorType, setDoorType] = useState<string>('Carcass Only');
  const [roomType, setRoomType] = useState<string>('Kitchen');
  
  const [vatPercentage, setVatPercentage] = useState<number>(20);
  const [carcassColour, setCarcassColour] = useState('');
  const [doorColour, setDoorColour] = useState('');
  const [panelworkColour, setPanelworkColour] = useState('');
  const [doorStyle, setDoorStyle] = useState<string>('');
  const [roomName, setRoomName] = useState('');
  const [sectionDiscounts, setSectionDiscounts] = useState<Record<string, number>>({});
  const [fillerType, setFillerType] = useState<string>('Basic Slab');
  const lastChangedField = useRef<'door' | 'filler' | 'room' | null>(null);


  // Customer form data
  const [customerData, setCustomerData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',  // ← ADD THIS
    date: new Date().toISOString().split('T')[0]
  });

  const calculateDiscountedTotal = (
    quantity: number,
    amount: number,
    discountPercent: number
  ) => {
    const baseTotal = quantity * amount;
    
    if (!discountPercent || discountPercent === 0) {
      return baseTotal;
    }
    
    const discountAmount = baseTotal * (discountPercent / 100);
    return baseTotal - discountAmount;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(value);
  };

  useEffect(() => {
    fetchQuotation();
  }, [quoteId]);

  // ✅ NEW: Update all prices when door type or room type changes
  useEffect(() => {
    if (doorRoomSetByLoad.current > 0) {
      doorRoomSetByLoad.current -= 1;
      return;
    }

    const updateAllPrices = async () => {
      if (itemsRef.current.length === 0) return;

      const originalFillerType = (originalItemsRef.current as any).__fillerType || null;

      // Restore original prices if user switches back to original door type
      if (lastChangedField.current === 'door' && doorType === originalDoorType.current && originalItemsRef.current.length > 0) {
        setItems(prevItems =>
          prevItems.map((item, index) => {
            const original = originalItemsRef.current[index];
            if (!original) return item;
            return {
              ...item,
              amount: original.amount,
              description: original.description,
              width: original.width,
              height: original.height,
              depth: original.depth,
              line_total: (item.quantity || 1) * original.amount,
              discounted_total: item.discount_percent && item.discount_percent > 0
                ? calculateDiscountedTotal(item.quantity || 1, original.amount, item.discount_percent)
                : (item.quantity || 1) * original.amount,
            };
          })
        );
        lastChangedField.current = null;
        return;
      }

      // Restore filler-section prices if user switches back to original filler type
      if (lastChangedField.current === 'filler' && fillerType === originalFillerType && originalItemsRef.current.length > 0) {
        setItems(prevItems =>
          prevItems.map((item, index) => {
            if (item.section !== 'Fillers and End Panels') return item;
            const original = originalItemsRef.current[index];
            if (!original) return item;
            return {
              ...item,
              amount: original.amount,
              description: original.description,
              line_total: (item.quantity || 1) * original.amount,
              discounted_total: item.discount_percent && item.discount_percent > 0
                ? calculateDiscountedTotal(item.quantity || 1, original.amount, item.discount_percent)
                : (item.quantity || 1) * original.amount,
            };
          })
        );
        lastChangedField.current = null;
        return;
      }

      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      const FITTING_CODES = ['KUNIT', 'BUNIT', 'ROBE', 'APPL', 'SINKTAP', 'FITDR', 'PANW', 'FITTING'];

      const updatePromises = itemsRef.current.map(async (item, index) => {
        const itemCode = (item.item || '').trim();
        if (!itemCode) return null;
        if (FITTING_CODES.includes(itemCode.toUpperCase())) return null;

        const hasSuffix = itemCode.includes('-');
        const baseCode = itemCode.split('-')[0];
        const isApplianceCode = /^[A-Z]{1,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;

        const FILLER_SUFFIXES = ['-S', '-LS', '-V', '-T'];
        const isFillerSuffix = FILLER_SUFFIXES.some(s => itemCode.endsWith(s));
        const isFillerItem = item.section === 'Fillers and End Panels';

        const requestBody: any = { description: itemCode };
        if (isFillerItem || isFillerSuffix) {
          requestBody.room_type = roomType;
          requestBody.filler_door_type = fillerType;
        } else if (!hasSuffix && !isApplianceCode) {
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
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
              "X-Tenant-ID": tenantId,
            },
            body: JSON.stringify(requestBody),
          });
          const data = await response.json();
          if (data.found) {
            let autoDescription = data.description || data.item_name || '';
            if (isApplianceCode && data.brand && data.series_level) {
              autoDescription = `${data.item_name} - ${data.brand} ${data.series_level}${data.series_info ? ` (${data.series_info})` : ''}`;
            }
            return { index, price: data.price, description: autoDescription, width: data.width, height: data.height, depth: data.depth };
          }
          return null;
        } catch (error) {
          console.error(`Error updating price for ${itemCode}:`, error);
          return null;
        }
      });

      const subItemPromises = itemsRef.current.flatMap((item) =>
        (item.subItems || []).map(async (sub: any) => {
          if (!sub.item || sub.item.trim().length === 0) return null;
          const code = sub.item.trim();
          const hasSuffix = code.includes('-');
          const baseCode = code.split('-')[0];
          const isApplianceCode = /^[A-Z]{1,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;
          const requestBody: any = { description: code };
          const FILLER_SUFFIXES_SUB = ['-S', '-LS', '-V', '-T'];
          const isFillerSuffixSub = FILLER_SUFFIXES_SUB.some(s => code.endsWith(s));

          if (!hasSuffix && !isApplianceCode) {
            requestBody.door_type = doorType;
            requestBody.room_type = roomType;
            requestBody.filler_door_type = fillerType;
          } else if (isFillerSuffixSub) {
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
            if (data.found) return { subId: sub.id, price: data.price, description: data.description || data.item_name };
          } catch { /* silent */ }
          return null;
        })
      );

      const [results, subItemResults] = await Promise.all([
        Promise.all(updatePromises),
        Promise.all(subItemPromises),
      ]);

      setItems((prevItems) =>
        prevItems.map((item, index) => {
          const result = results.find((r) => r && r.index === index);
          const updatedItem = result ? {
            ...item,
            amount: result.price,
            description: result.description || item.description,
            width: result.width,
            height: result.height,
            depth: result.depth,
            line_total: result.price * (item.quantity || 1),
            discounted_total: (item.discount_percent || 0) > 0
              ? result.price * (item.quantity || 1) * (1 - (item.discount_percent || 0) / 100)
              : result.price * (item.quantity || 1),
          } : item;

          // ✅ Update sub-items too
          const updatedSubs = (updatedItem.subItems || []).map((sub: any) => {
            const subResult = subItemResults.find((r) => r && r.subId === sub.id);
            if (!subResult) return sub;
            const newAmt = subResult.price;
            const sQty = sub.quantity || 1;
            const sLine = newAmt * sQty;
            const sPct = sub.discount_percent || 0;
            return {
              ...sub,
              amount: newAmt,
              description: subResult.description || sub.description,
              line_total: sLine,
              discounted_total: sPct > 0 ? sLine - sLine * (sPct / 100) : sLine,
            };
          });

          return { ...updatedItem, subItems: updatedSubs };
        })
      );

      lastChangedField.current = null;
    };

    const hasItemsWithCodes = itemsRef.current.some(item => item.item && item.item.trim().length > 0);
    if (hasItemsWithCodes) {
      updateAllPrices();
    }
  }, [doorType, roomType, fillerType]);
 
  const fetchQuotation = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/quotations/${quoteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
 
      if (response.ok) {
        const data = await response.json();
        setQuotation(data);
        
        // Set customer data
        setCustomerData({
          name: data.customer_name || '',
          address: data.customer_address || data.client_address || '',
          phone: data.customer_phone || data.client_phone || '',
          email: data.customer_email || data.client_email || '',
          date: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
        
        const itemsWithTotals = (data.items || []).map((item: any) => ({
          item: item.item || '',
          description: item.description || '',
          color: item.color || '',
          quantity: item.quantity || 1,
          amount: item.amount || 0,
          width: item.width || undefined,
          height: item.height || undefined,
          depth: item.depth || undefined,
          line_total: (item.quantity || 1) * (item.amount || 0),
          price_list_item_id: item.price_list_item_id,
          discount_percent: item.discount_percent || 0,
          discounted_total: item.discounted_total || ((item.quantity || 1) * (item.amount || 0)),
          section: item.section || 'Furniture',
          subItems: (item.subItems || []).map((sub: any) => ({
            item: sub.item || '',
            description: sub.description || '',
            color: sub.color || '',
            quantity: sub.quantity || 1,
            amount: sub.amount || 0,
            width: sub.width || undefined,
            height: sub.height || undefined,
            depth: sub.depth || undefined,
            line_total: (sub.quantity || 1) * (sub.amount || 0),
            price_list_item_id: sub.price_list_item_id,
            discount_percent: sub.discount_percent || 0,
            discounted_total: sub.discounted_total || ((sub.quantity || 1) * (sub.amount || 0)),
          })),
        }));
        setItems(itemsWithTotals);
        originalItemsRef.current = itemsWithTotals;
        (originalItemsRef.current as any).__fillerType = data.filler_type || data.filler_door_type || 'Basic Slab';

        if (data.global_discount_percent) {
          setGlobalDiscountPercent(data.global_discount_percent);
        }
        // Load VAT percentage if saved
        if (data.vat_percentage !== undefined && data.vat_percentage !== null) {
          setVatPercentage(data.vat_percentage);
        }
        if (data.section_discounts) {
          setSectionDiscounts(data.section_discounts);
        }
        const urlDoorType = searchParams.get("doorType");
        const urlRoomType = searchParams.get("roomType");
        const finalDoorType = urlDoorType || data.door_type;
        const finalRoomType = urlRoomType || data.room_type;
        doorRoomSetByLoad.current = 1; // only 1 fire even if 3 states change in same batch

        if (finalDoorType) { originalDoorType.current = finalDoorType; }

        // Use flushSync or just set all 3 together via a single ref, then trigger:
        // React batches these in the same event handler, so effect fires once:
        if (finalDoorType) setDoorType(finalDoorType);
        if (finalRoomType) setRoomType(finalRoomType);
        if (data.filler_type || data.filler_door_type) {
          setFillerType(data.filler_type || data.filler_door_type);
        }
        
        setCarcassColour(data.carcass_colour || '');
        setDoorColour(data.door_colour || '');
        setPanelworkColour(data.panelwork_colour || '');
        setDoorStyle(data.door_style || '');
        setRoomName(data.room_name || '');
        if (data.section_discounts) {
          setSectionDiscounts(data.section_discounts);
        }
      } else {
        alert("Failed to load quotation");
      }
    } catch (error) {
      console.error("Error fetching quotation:", error);
      alert("Error loading quotation");
    } finally {
      setLoading(false);
    }
  };
 
  const handleDescriptionChange = async (index: number, value: string) => {
    const updatedItems = [...items];
    updatedItems[index].description = value;
    setItems(updatedItems);
 
    if (!value || value.length < 3) {
      return;
    }

    console.log(`🔍 Auto-fill triggered: "${value}"`);
    console.log(`   Door Type: ${doorType}`);
    console.log(`   Room Type: ${roomType}`);
    setAutoFilling(index);
 
    try {
      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      
      // Detect if this is an appliance code
      const isApplianceCode = /^[A-Z]{2,}[0-9]{2,}[A-Z0-9]{2,}$/i.test(value.trim()) && value.trim().length >= 8; 
      const requestBody: any = {
        description: value,
        door_type: doorType,
        room_type: roomType,
        filler_door_type: fillerType,
      };
      // If it's an appliance code, don't send door_type
      if (isApplianceCode) {
        console.log('🔥 Detected appliance code pattern');
        delete requestBody.door_type;
        delete requestBody.room_type;
        delete requestBody.filler_door_type;
      }
      
      const response = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify(requestBody),
      });
 
      const data = await response.json();
 
      if (data.found) {
        const price = data.price || 0;
        const qty = updatedItems[index].quantity || 1;
        const lineTotal = price * qty;
        const discPct = updatedItems[index].discount_percent || 0;
        updatedItems[index] = {
          ...updatedItems[index],
          amount: price,
          width: data.width,
          height: data.height,
          depth: data.depth,
          line_total: lineTotal,
          discounted_total: discPct > 0 ? lineTotal - lineTotal * (discPct / 100) : lineTotal,
          price_list_item_id: data.pricelist_id,
        };
        setItems(updatedItems);
 
        console.log(`✅ Auto-filled: ${data.item_name} - £${data.price}`);
        console.log(`   Dimensions: ${data.width}×${data.height}×${data.depth}mm`);
      } else {
        console.log("❌ No pricing found:", data.error);
      }
    } catch (error) {
      console.error("Auto-price lookup failed:", error);
    } finally {
      setAutoFilling(null);
    }
  };

  // ✅ NEW: Handle item code change with auto-fill
  const handleItemChange = async (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    if (['quantity', 'amount', 'discount_percent'].includes(field)) {
      const qty = field === 'quantity' ? parseFloat(value) || 1 : updatedItems[index].quantity || 1;
      const amount = field === 'amount' ? parseFloat(value) || 0 : updatedItems[index].amount || 0;
      const discountPercent = field === 'discount_percent' ? parseFloat(value) || 0 : updatedItems[index].discount_percent || 0;
      updatedItems[index].line_total = qty * amount;
      updatedItems[index].discounted_total = calculateDiscountedTotal(qty, amount, discountPercent);
    }

    setItems(updatedItems);

    if (field === 'item' && value && value.length >= 2) {
      const trimmedValue = value.trim();

      // ── FITTING EXPANSION ──────────────────────────────────────────
      if (trimmedValue.toUpperCase() === 'FITTING') {
        setAutoFilling(index);
        const token = localStorage.getItem("token");
        const tenantId = localStorage.getItem("tenantId") || "7";

        const FITTING_CODES = ['KUNIT', 'BUNIT', 'ROBE', 'APPL', 'SINKTAP', 'PANW'];

        const currentItemsSnapshot = itemsRef.current
          .filter((_, i) => i !== index)
          .map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));

        console.log('📦 FITTING snapshot:', JSON.stringify(currentItemsSnapshot));

        try {
          const fittingResults = await Promise.all(
            FITTING_CODES.map(async (code) => {
              try {
                const res = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "X-Tenant-ID": tenantId,
                  },
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
            alert('No fitting items detected in the quote. Add kitchen/bedroom units first.');
            setAutoFilling(null);
            return;
          }

          setItems(prevItems => {
            const newItems = prevItems.filter((_, i) => i !== index);
            const newFittingRows = validFittings.map(f => ({
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
            return [...newItems, ...newFittingRows];
          });

        } catch (error) {
          console.error('Fitting expansion failed:', error);
        } finally {
          setAutoFilling(null);
        }
        return;
      }
      // ── END FITTING EXPANSION ──────────────────────────────────────

      if (trimmedValue.length > 100) return;

      console.log(`🔍 Item code auto-fill: "${trimmedValue}"`);
      setAutoFilling(index);

      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";

      const isApplianceCode = /^[A-Z]{2,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(trimmedValue) && trimmedValue.length >= 9;
      const currentItemsSnapshot = itemsRef.current
        .filter((_, i) => i !== index)
        .map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));

      const MANUAL_FITTING_CODES = ['APPL', 'SINKTAP', 'KUNIT', 'BUNIT', 'ROBE', 'WTJT', 'FITDR', 'PANW'];
      const isFittingCode = MANUAL_FITTING_CODES.includes(trimmedValue.toUpperCase());

      const requestBody: any = {
        description: trimmedValue,
        current_items: isFittingCode ? [] : currentItemsSnapshot,
      };

      if (!isApplianceCode) {
        requestBody.door_type = doorType;
        requestBody.room_type = roomType;
        requestBody.filler_door_type = fillerType;
      }
      fetch(`${BACKEND_URL}/quotations/auto-price-lookup`,{
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify(requestBody),
      })
      .then(res => res.json())
      .then(data => {
        if (data.found) {
          let autoDescription = data.description || data.item_name || '';
          if (data.is_fitting) {
            autoDescription = data.item_name || '';
          } else if (isApplianceCode && data.brand && data.series_level) {
            autoDescription = `${data.item_name} - ${data.brand} ${data.series_level}${data.series_info ? ` (${data.series_info})` : ''}`;
          }

          setItems(prevItems => {
            const newItems = [...prevItems];
            const fittingQty = data.is_fitting && data.quantity ? data.quantity : null;
            const qty = fittingQty !== null ? fittingQty : (newItems[index].quantity || 1);
            const price = data.price || 0;
            const lineTotal = price * qty;
            const discPct = newItems[index].discount_percent || 0;
            newItems[index] = {
              ...newItems[index],
              item: data.item_code || trimmedValue,
              description: autoDescription,
              amount: price,
              quantity: qty,
              width: data.width,
              height: data.height,
              depth: data.depth,
              line_total: lineTotal,
              discounted_total: discPct > 0 ? lineTotal - lineTotal * (discPct / 100) : lineTotal,
            };
            return newItems;
          });
        } else {
          console.log("❌ No pricing found for code:", trimmedValue);
        }
      })
      .catch(error => console.error("Auto-price lookup failed:", error))
      .finally(() => setAutoFilling(null));
    }
  };

  const FITTING_CODES_LIST = ['KUNIT', 'BUNIT', 'ROBE', 'APPL', 'SINKTAP', 'FITDR', 'PANW'];
  const recalcInProgress = useRef(false);

  useEffect(() => {
    const recalcFittings = async () => {
      if (recalcInProgress.current) return;

      const currentItems = itemsRef.current;
      const fittingIndices = currentItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.autoFitting && FITTING_CODES_LIST.includes((item.item || '').trim().toUpperCase()));

      if (fittingIndices.length === 0) return;

      recalcInProgress.current = true;

      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";

      const nonFittingSnapshot = currentItems
        .filter(item => !FITTING_CODES_LIST.includes((item.item || '').trim().toUpperCase()))
        .map(item => ({ item: item.item, description: item.description, quantity: item.quantity }));

      try {
        const results = await Promise.all(
          fittingIndices.map(async ({ item, idx }) => {
            const code = (item.item || '').trim().toUpperCase();
            try {
              const res = await fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Tenant-ID": tenantId },
                body: JSON.stringify({ description: code, current_items: nonFittingSnapshot }),
              });
              const data = await res.json();
              return { idx, code, found: data.found, quantity: data.quantity || 0, price: data.price || 0 };
            } catch {
              return { idx, code, found: false, quantity: 0, price: 0 };
            }
          })
        );

        setItems(prevItems => {
          let changed = false;
          const updated = prevItems
            .map((item, i) => {
              const result = results.find(r => r.idx === i);
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
            .filter((item): item is QuoteItem => item !== null);

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

  const handleAddItem = (section: string) => {
    setItems([
      ...items,
      {
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
 
  const handleRemoveItem = (index: number) => {
    if (confirm("Remove this item?")) {
      setItems(items.filter((_, i) => i !== index));
    }
  };
 
  const handleSave = async () => {
    if (saving) return;

    if (!customerData.name?.trim()) {
      alert("Customer name is required");
      return;
    }

    if (!customerData.address?.trim()) {
      alert("Customer address is required");
      return;
    }
    if (!roomName.trim()) {  // ✅ ADD THIS
      alert("Room name is required");
      return;
    }
    
    if (subtotal <= 0) {
      alert("Please add at least one item with a valid price");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const vat = Math.round(subtotal * (vatPercentage / 100) * 100) / 100;
      const total = Math.round((subtotal + vat) * 100) / 100;

      const response = await fetch(`${BACKEND_URL}/quotations/${quoteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_id: quotation.client_id, // Use quotation.client_id instead of customerId
          customer_name: customerData.name,
          customer_address: customerData.address,
          customer_phone: customerData.phone,
          customer_email: customerData.email || '', // Add fallback
          date: customerData.date,
          door_type: doorType,
          room_type: roomType,
          filler_type: fillerType,
          filler_door_type: fillerType,
          section_discounts: sectionDiscounts,
          room_name: roomName,
          carcass_colour: carcassColour,
          door_colour: doorColour,
          panelwork_colour: panelworkColour,
          door_style: doorStyle,
          items: items
            .filter(item => {
              const hasItem = item.item && item.item.trim().length > 0;
              const hasDescription = item.description && item.description.trim().length > 0;
              const hasAmount = item.line_total > 0;
              return hasItem || hasDescription || hasAmount;
            })
            .map(item => ({
              item: item.item,
              description: item.description,
              colour: item.color,
              quantity: item.quantity || 1,
              unit_price: item.amount || 0,
              amount: item.amount || 0,
              discount_percent: item.discount_percent || 0,
              discounted_amount: item.discounted_total || item.line_total,
              width: item.width,
              height: item.height,
              depth: item.depth,
              section: item.section || 'Furniture',
              subItems: (item.subItems || [])
                .filter(sub => (sub.item && sub.item.trim()) || (sub.description && sub.description.trim()) || sub.line_total > 0)
                .map(sub => ({
                  item: sub.item,
                  description: sub.description,
                  color: sub.color,
                  quantity: sub.quantity || 1,
                  amount: sub.amount || 0,
                  discount_percent: sub.discount_percent || 0,
                  discounted_amount: sub.discounted_total || sub.line_total,
                  width: sub.width,
                  height: sub.height,
                  depth: sub.depth,
                })),
            })),
          subtotal,
          vat,
          total,
          vat_percentage: vatPercentage,
          global_discount_percent: globalDiscountPercent,
          global_discount_amount: globalDiscountAmount,
        }),
      });

      if (response.ok) {
        alert(`✅ Quote updated successfully!`);
        router.push(`/dashboard/quotes/${quoteId}`);
      } else {
        const error = await response.json();
        alert(`❌ Failed to save: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error saving quotation:", error);
      alert("❌ Error saving quotation");
    } finally {
      setSaving(false);
    }
  };
 
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading quotation...</p>
      </div>
    );
  }
 
  if (!quotation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Quotation not found</p>
      </div>
    );
  }

  // ✅ ADD CALCULATIONS HERE - BEFORE THE RETURN
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
      return sum + itemTotal + subTotal;
    }, 0);
    return total + Math.round(sectionTotal * 100) / 100;
  }, 0) * 100) / 100;


  const handleAddSubItem = (parentIndex: number) => {
    setItems(prevItems => prevItems.map((item, idx) => {
      if (idx === parentIndex) {
        const newSub: QuoteItem = {
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

  const handleSubItemChange = (parentIndex: number, subIndex: number, field: string, value: any) => {
    setItems(prevItems => prevItems.map((item, idx) => {
      if (idx !== parentIndex || !item.subItems) return item;
      const updatedSubs = [...item.subItems];
      const sub = { ...updatedSubs[subIndex], [field]: value };
      if (['quantity', 'amount', 'discount_percent'].includes(field)) {
        const qty = field === 'quantity' ? parseFloat(value) || 1 : sub.quantity || 1;
        const amount = field === 'amount' ? parseFloat(value) || 0 : sub.amount || 0;
        const discountPercent = field === 'discount_percent' ? parseFloat(value) || 0 : sub.discount_percent || 0;
        sub.line_total = qty * amount;
        sub.discounted_total = calculateDiscountedTotal(qty, amount, discountPercent);
      }
      updatedSubs[subIndex] = sub;
      return { ...item, subItems: updatedSubs };
    }));
  };

  const handleRemoveSubItem = (parentIndex: number, subIndex: number) => {
    if (!confirm("Remove this sub-item?")) return;
    setItems(prevItems => prevItems.map((item, idx) => {
      if (idx !== parentIndex || !item.subItems) return item;
      return { ...item, subItems: item.subItems.filter((_, i) => i !== subIndex) };
    }));
  };

  const handleSubItemAutoFill = async (parentIndex: number, subIndex: number, value: string) => {
    setItems(prevItems => prevItems.map((item, idx) => {
      if (idx !== parentIndex || !item.subItems) return item;
      const updatedSubs = [...item.subItems];
      updatedSubs[subIndex] = { ...updatedSubs[subIndex], item: value };
      return { ...item, subItems: updatedSubs };
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
        const price = data.price || 0;

        setItems(prevItems => prevItems.map((item, idx) => {
          if (idx !== parentIndex || !item.subItems) return item;
          const updatedSubs = [...item.subItems];
          const sub = updatedSubs[subIndex];
          const qty = fittingQty !== null ? fittingQty : (sub.quantity || 1);
          updatedSubs[subIndex] = {
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
          return { ...item, subItems: updatedSubs };
        }));
      } else {
        console.log("❌ No pricing found for sub-item code:", trimmedValue);
      }
    } catch (error) {
      console.error("Sub-item auto-price lookup failed:", error);
    }
  };

  const globalDiscountAmount = Math.round(subtotalAfterSectionDiscounts * (globalDiscountPercent / 100) * 100) / 100;
  const subtotal = Math.round((subtotalAfterSectionDiscounts - globalDiscountAmount) * 100) / 100;
  const vat = Math.round(subtotal * (vatPercentage / 100) * 100) / 100;
  const total = Math.round((subtotal + vat) * 100) / 100;
 
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
              <h1 className="text-2xl font-bold">Edit Quotation {quotation.reference_number}</h1>
              <p className="text-sm text-gray-600">
                Customer: {customerData.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Quotation Form */}
      <div className="px-4 py-8">
        {/* Company Header */}
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

        {/* Company Registration Details */}
        <div className="mb-6 space-y-1 bg-green-200 p-3 text-sm">
          <p className="font-semibold">Registered to England No 5246881</p>
          {/* <p className="font-semibold">VAT Reg No.686 8010 72</p> */}
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

        {/* Quotation Title */}
        <h1 className="mb-6 text-center text-2xl font-bold">QUOTATION</h1>

        {/* ✅ NEW: Door Type and Room Type Selection */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Room Type <span className="text-red-600">*</span>
            </label>
            <select
              value={roomType}
              onChange={(e) => { lastChangedField.current = 'room'; setRoomType(e.target.value); }}
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
              onChange={(e) => { lastChangedField.current = 'door'; setDoorType(e.target.value); }}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm"
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
              Fillers & End Panels Type
            </label>
            <select
              value={fillerType}
              onChange={(e) => { lastChangedField.current = 'filler'; setFillerType(e.target.value); }}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Basic Slab">Slab</option>
              <option value="Acrylic Gloss/Matt">Lacquered Slab</option>
              <option value="Vinyl Doors">Vinyl Doors</option>
              <option value="Timber">Timber</option>
            </select>
          </div>
        </div>
        
        {/* ✅ NEW: Info Banner */}
        <div className="mb-6 rounded-md bg-blue-50 border border-blue-200 p-4">
          <p className="font-medium text-sm text-blue-900 mb-2">
            💡 Selected: <span className="font-bold">{roomType}</span> with <span className="font-bold">{doorType}</span> doors
          </p>
          <p className="text-xs text-blue-700 mb-2">
            Prices will be automatically looked up based on these selections when you enter item codes.
          </p>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs font-semibold text-blue-900 mb-1">🎯 Component-Only Pricing (Advanced):</p>
            <p className="text-xs text-blue-700">
              Add a suffix to quote components separately:
            </p>
            <ul className="text-xs text-blue-700 mt-1 ml-4 space-y-0.5">
              <li>• <code className="bg-blue-100 px-1 rounded">50B</code> = {doorType === 'Carcass Only' ? 'Carcass only' : `Carcass + ${doorType} total (auto)`}</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-C</code> = Carcass only (when door type selected)</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-S</code> = Slab door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-LS</code> = Lacquered Slab door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-T</code> = Timber door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-VD</code> = Vinyl door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-BG</code> = Black Glass door component only</li>
              {doorType === 'Carcass Only' && <>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-ST</code> = Carcass + Slab total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-LST</code> = Carcass + Lacquered Slab total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-TT</code> = Carcass + Timber total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-VDT</code> = Carcass + Vinyl total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-BGT</code> = Carcass + Black Glass total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">FITTING</code> = Auto-detect all fittings from quote items</li>
              </>}
            </ul>
          </div>
        </div>

        {/* Customer Information - EDITABLE */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50" style={{ width: '20%' }}>DATE:</td>
                <td className="border border-black p-0">
                  <Input
                    type="date"
                    value={customerData.date}
                    onChange={(e) => setCustomerData({ ...customerData, date: e.target.value })}
                    className="border-none focus-visible:ring-0 w-full h-full px-3 py-2"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">NAME:</td>
                <td className="border border-black p-0">
                  <Input
                    value={customerData.name}
                    onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                    placeholder="Customer name"
                    className="border-none focus-visible:ring-0 w-full h-full px-3 py-2"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">ADDRESS:</td>
                <td className="border border-black p-0">
                  <textarea
                    value={customerData.address}
                    onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                    placeholder="Customer address"
                    className="border-none focus-visible:ring-0 w-full h-full px-3 py-2 resize-none"
                    rows={2}
                  />
                </td>
              </tr>

              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">TEL:</td>
                <td className="border border-black p-0">
                  <Input
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                    placeholder="Phone number"
                    className="border-none focus-visible:ring-0 w-full h-full px-3 py-2"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">ROOM NAME: <span className="text-red-600">*</span></td>
                <td className="border border-black p-0">
                  <Input
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g. Kitchen, Master Bedroom"
                    className="border-none focus-visible:ring-0 w-full h-full px-3 py-2"
                    required
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">CARCASS COLOUR:</td>
                <td className="border border-black p-0">
                  <Input
                    value={carcassColour}
                    onChange={(e) => setCarcassColour(e.target.value)}
                    placeholder="Carcass colour"
                    className="border-none focus-visible:ring-0 w-full h-full px-3 py-2"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">DOOR COLOUR:</td>
                <td className="border border-black p-0">
                  <Input
                    value={doorColour}
                    onChange={(e) => setDoorColour(e.target.value)}
                    placeholder="Door colour"
                    className="border-none focus-visible:ring-0 w-full h-full px-3 py-2"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">PANELWORK COLOUR:</td>
                <td className="border border-black p-0">
                  <Input
                    value={panelworkColour}
                    onChange={(e) => setPanelworkColour(e.target.value)}
                    placeholder="Panelwork colour"
                    className="border-none focus-visible:ring-0 w-full h-full px-3 py-2"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">DOOR STYLE:</td>
                <td className="border border-black p-0">
                  <Input
                    value={doorStyle}
                    onChange={(e) => setDoorStyle(e.target.value)}
                    placeholder="Door style"
                    className="border-none focus-visible:ring-0 w-full h-full px-3 py-2"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          {SECTIONS.map((section) => {
            const indexedItems = items
              .map((item, index) => ({ item, index }))
              .filter(({ item }) => (item.section || 'Furniture') === section);

            if (indexedItems.length === 0) return null;

            // ✅ Section totals
            const sectionRaw = indexedItems.reduce((sum, { item }) => {
              const itemRaw = (item.amount || 0) * (item.quantity || 1);
              const subRaw = (item.subItems || []).reduce((s, sub) =>
                s + (sub.amount || 0) * (sub.quantity || 1), 0);
              return sum + itemRaw + subRaw;
            }, 0);

            // ✅ After item-level discounts (discounted_total reflects section fill-down)
            const sectionAfterItemDiscounts = indexedItems.reduce((sum, { item }) => {
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

            return (
              <div key={section} className="mb-6">
                <div className="mb-3">
                  <h3 className="text-lg font-bold">{section}</h3>
                </div>

                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="bg-white">
                      <th className="border border-black px-1 py-2 text-left font-bold text-xs" style={{ width: '8%' }}>ITEM</th>
                      <th className="border border-black px-1 py-2 text-left font-bold text-xs" style={{ width: '20%' }}>DESCRIPTION</th>
                      <th className="border border-black px-1 py-2 text-left font-bold text-xs" style={{ width: '10%' }}>COLOUR</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: '5%' }}>QTY</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: '5%' }}>W</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: '5%' }}>H</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: '5%' }}>D</th>
                      <th className="border border-black px-1 py-2 text-right font-bold text-xs" style={{ width: '8%' }}>PRICE</th>
                      <th className="border border-black px-1 py-2 text-right font-bold text-xs" style={{ width: '9%' }}>AMOUNT</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: '6%' }}>DISC %</th>
                      <th className="border border-black px-1 py-2 text-right font-bold text-xs" style={{ width: '9%' }}>FINAL</th>
                      <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: '4%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {indexedItems.map(({ item, index }) => (
                      <React.Fragment key={index}>
                        <tr>
                          <td className="border border-black p-1">
                            <Input
                              value={item.item}
                              onChange={(e) => {
                                setItems(prevItems => prevItems.map((it, i) => i === index ? { ...it, item: e.target.value } : it));
                              }}
                              onBlur={(e) => { const val = e.target.value.trim(); if (val.length >= 1) handleItemChange(index, "item", val); }}
                              placeholder="50B"
                              className={`border-none focus-visible:ring-0 min-w-[90px] font-mono text-xs ${autoFilling === index ? 'bg-blue-50 animate-pulse' : ''}`}
                            />
                          </td>
                          <td className="border border-black p-1">
                            <textarea
                              value={item.description}
                              onChange={(e) => handleDescriptionChange(index, e.target.value)}
                              placeholder="Description"
                              className={`border-none focus-visible:ring-0 min-w-[140px] w-full resize-none overflow-hidden text-xs ${autoFilling === index ? 'bg-blue-50 animate-pulse' : ''}`}
                              rows={2}
                              style={{ minHeight: '35px', lineHeight: '1.3' }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${target.scrollHeight}px`;
                              }}
                            />
                          </td>
                          <td className="border border-black p-1">
                            <Input value={item.color} onChange={(e) => handleItemChange(index, "color", e.target.value)} placeholder="Colour" className="border-none focus-visible:ring-0 min-w-[70px] text-xs" />
                          </td>
                          <td className="border border-black p-1">
                            <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-xs" min="1" />
                          </td>
                          <td className="border border-black p-0">
                            <Input type="number" value={item.width || ''} onChange={(e) => handleItemChange(index, "width", e.target.value)} placeholder="—" className="border-none text-center focus-visible:ring-0 w-full text-xs" min="0" />
                          </td>
                          <td className="border border-black p-0">
                            <Input type="number" value={item.height || ''} onChange={(e) => handleItemChange(index, "height", e.target.value)} placeholder="—" className="border-none text-center focus-visible:ring-0 w-full text-xs" min="0" />
                          </td>
                          <td className="border border-black p-0">
                            <Input type="number" value={item.depth || ''} onChange={(e) => handleItemChange(index, "depth", e.target.value)} placeholder="—" className="border-none text-center focus-visible:ring-0 w-[55px] text-xs" min="0" />
                          </td>
                          <td className="border border-black p-0">
                            <Input type="number" step="0.01" value={item.amount} onChange={(e) => handleItemChange(index, "amount", e.target.value)} className="border-none text-right focus-visible:ring-0 w-full text-xs" min="0" placeholder="0.00" />
                          </td>
                          <td className="border border-black px-2 py-1 text-right font-semibold text-xs">
                            {formatCurrency((item.amount || 0) * (item.quantity || 1))}
                          </td>
                          <td className="border border-black p-0">
                            <Input type="number" step="0.1" value={item.discount_percent || ''} onChange={(e) => handleItemChange(index, "discount_percent", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-xs" min="0" max="100" placeholder="0" />
                          </td>
                          <td className="border border-black px-2 py-1 text-right">
                            {item.discount_percent && item.discount_percent > 0 ? (
                              <div>
                                <div className="text-xs text-gray-500 line-through">{formatCurrency((item.amount || 0) * (item.quantity || 1))}</div>
                                <div className="font-semibold text-green-700 text-xs">{formatCurrency(item.discounted_total || 0)}</div>
                              </div>
                            ) : (
                              <span className="font-semibold text-xs">{formatCurrency((item.amount || 0) * (item.quantity || 1))}</span>
                            )}
                          </td>
                          <td className="border border-black p-1 text-center">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-red-600 hover:bg-red-50 hover:text-red-700 h-7 w-7">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>

                        {/* SUB-ITEMS */}
                        {(item.subItems || []).map((sub, subIndex) => (
                          <tr key={subIndex} className="bg-gray-50">
                            <td className="border border-black p-0 pl-4">
                              <Input
                                value={sub.item}
                                onChange={(e) => {
                                  setItems(prevItems => prevItems.map((it, i) => {
                                    if (i !== index || !it.subItems) return it;
                                    const updatedSubs = [...it.subItems];
                                    updatedSubs[subIndex] = { ...updatedSubs[subIndex], item: e.target.value };
                                    return { ...it, subItems: updatedSubs };
                                  }));
                                }}
                                onBlur={(e) => handleSubItemAutoFill(index, subIndex, e.target.value)}
                                placeholder="sub-code"
                                className="border-none focus-visible:ring-0 w-full text-xs px-1 font-mono"
                              />
                            </td>
                            <td className="border border-black p-0">
                              <Input value={sub.description} onChange={(e) => handleSubItemChange(index, subIndex, "description", e.target.value)} placeholder="Sub-item description" className="border-none focus-visible:ring-0 w-full text-xs px-1" />
                            </td>
                            <td className="border border-black p-0">
                              <Input value={sub.color} onChange={(e) => handleSubItemChange(index, subIndex, "color", e.target.value)} placeholder="Colour" className="border-none focus-visible:ring-0 w-full text-xs px-1" />
                            </td>
                            <td className="border border-black p-0">
                              <Input type="number" value={sub.quantity} onChange={(e) => handleSubItemChange(index, subIndex, "quantity", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-xs px-1" min="1" />
                            </td>
                            <td className="border border-black p-0"></td>
                            <td className="border border-black p-0"></td>
                            <td className="border border-black p-0"></td>
                            <td className="border border-black p-0">
                              <Input type="number" step="0.01" value={sub.amount} onChange={(e) => handleSubItemChange(index, subIndex, "amount", e.target.value)} className="border-none text-right focus-visible:ring-0 w-full text-xs px-1" min="0" placeholder="0.00" />
                            </td>
                            <td className="border border-black px-2 py-1 text-right text-xs">{formatCurrency(sub.line_total)}</td>
                            <td className="border border-black p-0">
                              <Input type="number" step="0.1" value={sub.discount_percent || ''} onChange={(e) => handleSubItemChange(index, subIndex, "discount_percent", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-xs px-1" min="0" max="100" placeholder="0" />
                            </td>
                            <td className="border border-black px-2 py-1 text-right">
                              {sub.discount_percent && sub.discount_percent > 0 ? (
                                <div>
                                  <div className="text-xs text-gray-500 line-through">{formatCurrency(sub.line_total)}</div>
                                  <div className="font-semibold text-green-700 text-xs">{formatCurrency(sub.discounted_total || 0)}</div>
                                </div>
                              ) : (
                                <span className="font-semibold text-xs">{formatCurrency(sub.line_total)}</span>
                              )}
                            </td>
                            <td className="border border-black p-1 text-center">
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveSubItem(index, subIndex)} className="text-red-600 hover:bg-red-50 h-6 w-6">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}

                        {/* ADD SUB-ITEM BUTTON ROW */}
                        <tr>
                          <td colSpan={12} className="border border-black px-2 py-1 bg-gray-50">
                            <button onClick={() => handleAddSubItem(index)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <Plus className="h-3 w-3" /> Add sub-item
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                {/* ✅ Section Totals */}
                {(() => {
                  const sectionDiscountPct = sectionDiscounts[section] || 0;
                  const sectionTotal = sectionAfterItemDiscounts;

                  return (
                    <div className="flex justify-end mt-2 mb-2">
                      <table className="border-collapse text-sm" style={{ width: '40%' }}>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-3 py-1 font-medium bg-gray-50 text-xs">
                              {section} Subtotal
                            </td>
                            <td className="border border-gray-300 px-3 py-1 text-right text-xs">
                              {formatCurrency(sectionRaw)}
                            </td>
                          </tr>
                          {hasItemDiscount && (
                            <tr>
                              <td className="border border-gray-300 px-3 py-1 font-medium bg-gray-50 text-xs text-red-600">
                                Section Discount ({parseFloat(sectionDiscountPct.toFixed(2))}%)
                              </td>
                              <td className="border border-gray-300 px-3 py-1 text-right text-xs text-red-600">
                                -{formatCurrency(itemDiscountTotal)}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td className="border border-gray-300 px-3 py-1 bg-gray-50 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">Section Discount</span>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={sectionDiscountPct ? parseFloat(sectionDiscountPct.toFixed(2)) : ''}
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
                                            return {
                                              ...sub,
                                              discount_percent: pct,
                                              discounted_total: calculateDiscountedTotal(sub.quantity || 1, sub.amount || 0, pct),
                                            };
                                          });
                                          return { ...updatedItem, subItems: updatedSubs };
                                        }));
                                      }}
                                      className="border border-gray-300 rounded px-1 py-0.5 w-20 text-right text-xs"
                                      min="0" max="100" step="0.1" placeholder="0"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                  </div>
                                  <span className="text-xs text-gray-400">or</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500">£</span>
                                    <Input
                                      type="number"
                                      value={
                                        sectionDiscountAmounts[section] !== undefined && sectionDiscountAmounts[section] !== ''
                                          ? sectionDiscountAmounts[section]
                                          : itemDiscountTotal > 0 ? itemDiscountTotal.toFixed(2) : ''
                                      }
                                      onChange={(e) => {
                                        setSectionDiscountAmounts(prev => ({ ...prev, [section]: e.target.value }));
                                      }}
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
                                          return {
                                            ...item,
                                            discount_percent: pct,
                                            discounted_total: calculateDiscountedTotal(item.quantity || 1, item.amount || 0, pct),
                                          };
                                        }));
                                      }}
                                      className="border border-gray-300 rounded px-1 py-0.5 w-24 text-right text-xs"
                                      min="0" step="0.01" placeholder="0.00"
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="border border-gray-300 px-3 py-1 text-right text-xs text-red-600">
                              {hasItemDiscount ? `-${formatCurrency(itemDiscountTotal)}` : '—'}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-3 py-1 font-bold bg-gray-100 text-xs">
                              {section} Total
                            </td>
                            <td className="border border-gray-300 px-3 py-1 text-right font-bold text-xs">
                              {formatCurrency(sectionTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

              {/* Sections with no items at all — show an "Add to section" picker */}
                <div className="mt-3 flex justify-start">
                  <Button onClick={() => handleAddItem(section)} size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Sections with no items — show an "Add to section" picker */}
          {SECTIONS.filter((s) => !items.some((item) => (item.section || 'Furniture') === s)).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {SECTIONS.filter((s) => !items.some((item) => (item.section || 'Furniture') === s)).map((s) => (
                <Button key={s} onClick={() => handleAddItem(s)} size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add to {s}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        {/* Totals */}
        <div className="mb-6 flex justify-end">
          <table className="border-collapse" style={{ width: '40%' }}>
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">SUB TOTAL</td>
                <td className="border border-black px-3 py-2 text-right">{formatCurrency(subtotalAfterSectionDiscounts)}</td>
              </tr>
              
              {/* NEW: Global Discount Row */}
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
                  {globalDiscountPercent > 0 ? `-${formatCurrency(globalDiscountAmount)}` : "—"}
                </td>
              </tr>
              
              {/* Show adjusted subtotal if discount applied */}
              {globalDiscountPercent > 0 && (
                <tr>
                  <td className="border border-black px-3 py-2 font-semibold bg-blue-50">SUBTOTAL AFTER DISCOUNT</td>
                  <td className="border border-black px-3 py-2 text-right font-semibold">{formatCurrency(subtotal)}</td>
                </tr>
              )}
              
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <span>VAT</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={vatPercentage}
                        onChange={(e) => setVatPercentage(parseFloat(e.target.value) || 0)}
                        className="border border-gray-300 rounded px-2 py-1 w-16 text-right text-sm"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                </td>
                <td className="border border-black px-3 py-2 text-right">{formatCurrency(vat)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-bold bg-gray-50">TOTAL</td>
                <td className="border border-black px-3 py-2 text-right font-bold">{formatCurrency(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Terms */}
        <div className="mb-6 space-y-2 text-sm">
          <p className="font-semibold">Only Bacs or Cash will be accepted on Delivery and Completion</p>
          <p className="font-semibold">
            NOTE: If you wish to proceed with this quote, you will be required to make the full payment upfront
          </p>
        </div>

        <div className="mb-8 text-sm font-semibold text-red-600">
          <p>Please sign here to confirm.</p>
        </div>

        {/* Signature Section */}
        <div className="space-y-4 text-sm">
          <div className="flex items-center">
            <span className="mr-2">Customer Signature:</span>
            <span className="border-b border-dotted border-black flex-1"></span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">Customer Name:</span>
            <span className="border-b border-dotted border-black flex-1"></span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">Date:</span>
            <span className="border-b border-dotted border-black flex-1"></span>
          </div>
        </div>
      </div>
    </div>
  );
}