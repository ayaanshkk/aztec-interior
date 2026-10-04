"use client";
 
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import Image from 'next/image';
import { useSessionDraft } from "@/hooks/useSessionDraft";
import { SignatureField } from "@/components/ui/SignatureField";
 
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.aztec.techmynt.com';

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

const SECTIONS = ['Furniture', 'Fillers and End Panels', 'Accessories', 'Handles', 'Appliances', 'Sink and Tap', 'Worktops', 'Fittings', 'Miscellaneous'] as const;

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
  const initialLoadComplete = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
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
  const [additionalTerms, setAdditionalTerms] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [signatureData, setSignatureData] = useState<import('@/components/ui/SignatureField').SignatureData | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  const { saveDraft, loadDraft, clearDraft } = useSessionDraft(typeof window !== 'undefined' ? window.location.pathname : 'quotes-edit');

  // Customer form data
  const [customerData, setCustomerData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    date: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    quoteReference: '',
  });

  const lastChangedField = useRef<'door' | 'filler' | 'room' | null>(null);

  // After server data loads, check for in-session draft
  useEffect(() => {
    if (loading) return;
    const draft = loadDraft();
    if (!draft) return;
    if (draft.quotation) setQuotation(draft.quotation as typeof quotation);
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
    if (draft.additionalTerms) setAdditionalTerms(draft.additionalTerms as string[]);
    if (draft.additionalNotes !== undefined) setAdditionalNotes(draft.additionalNotes as string);
    if (draft.globalDiscountPercent !== undefined) setGlobalDiscountPercent(draft.globalDiscountPercent as number);
    if (draft.signatureData) setSignatureData(draft.signatureData as typeof signatureData);
    if (draft.customerData) setCustomerData(draft.customerData as typeof customerData);
    setDraftRestored(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Auto-save on state changes
  useEffect(() => {
    if (loading) return;
    saveDraft({ quotation, items, doorType, roomType, vatPercentage, carcassColour, doorColour, panelworkColour, doorStyle, roomName, sectionDiscounts, sectionDiscountAmounts, fillerType, additionalTerms, additionalNotes, globalDiscountPercent, signatureData, customerData });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation, items, doorType, roomType, vatPercentage, carcassColour, doorColour, panelworkColour, doorStyle, roomName, sectionDiscounts, sectionDiscountAmounts, fillerType, additionalTerms, additionalNotes, globalDiscountPercent, signatureData, customerData, loading]);

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
    if (!initialLoadComplete.current) return;

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
          date: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          referenceNumber: data.reference_number || '',
          quoteReference: data.quote_reference || '',
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

        if (finalDoorType) { originalDoorType.current = finalDoorType; }

        if (finalDoorType) setDoorType(finalDoorType);
        if (finalRoomType) setRoomType(finalRoomType);
        if (data.filler_type || data.filler_door_type) {
          setFillerType(data.filler_type || data.filler_door_type);
        }

        // Mark load complete after React has batched and flushed the above state sets
        setTimeout(() => { initialLoadComplete.current = true; }, 200);
        
        setCarcassColour(data.carcass_colour || '');
        setDoorColour(data.door_colour || '');
        setPanelworkColour(data.panelwork_colour || '');
        setDoorStyle(data.door_style || '');
        setRoomName(data.room_name || '');
        if (data.section_discounts) {
          setSectionDiscounts(data.section_discounts);
        }
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
            const newItems = [...prevItems];
            const discPct = newItems[index].discount_percent || sectionDiscounts[newItems[index].section || 'Furniture'] || 0;
            // Replace the FITTING placeholder row with the first fitting
            const [first, ...rest] = validFittings;
            const firstLineTotal = first.price * first.quantity;
            newItems[index] = {
              ...newItems[index],
              item: first.code,
              description: first.name,
              amount: first.price,
              quantity: first.quantity,
              line_total: firstLineTotal,
              discount_percent: discPct,
              discounted_total: discPct > 0 ? firstLineTotal - firstLineTotal * (discPct / 100) : firstLineTotal,
              subItems: [],
            };
            // Insert remaining fittings as separate top-level rows after this index
            const restRows = rest.map(f => {
              const subLine = f.price * f.quantity;
              return {
                item: f.code,
                description: f.name,
                color: '',
                quantity: f.quantity,
                amount: f.price,
                line_total: subLine,
                discount_percent: discPct,
                discounted_total: discPct > 0 ? subLine - subLine * (discPct / 100) : subLine,
                autoFitting: true,
                section: 'Fittings',
              };
            });
            newItems.splice(index + 1, 0, ...restRows);
            return newItems;
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
    const existingDiscount = sectionDiscounts[section] || 0;
    setItems([
      ...items,
      {
        item: "",
        description: "",
        color: "",
        quantity: 1,
        amount: 0,
        line_total: 0,
        discount_percent: existingDiscount,
        discounted_total: 0,
        section,
      },
    ]);
  };
 
  const handleRemoveItem = (index: number) => {
    if (confirm("Remove this item?")) {
      setItems(items.filter((_, i) => i !== index));
    }
  };
 
  const handleSaveDraft = () => handleSaveWithStatus(true);
  const handleSave = () => handleSaveWithStatus(false);

  const handleSaveWithStatus = async (isDraft: boolean) => {
    if (savingRef.current) return;

    if (!isDraft) {
      if (!customerData.name?.trim()) {
        alert("Customer name is required");
        return;
      }
      if (!customerData.address?.trim()) {
        alert("Customer address is required");
        return;
      }
      if (!roomName.trim()) {
        alert("Order reference is required");
        return;
      }
      if (subtotal <= 0) {
        alert("Please add at least one item with a valid price");
        return;
      }
    }

    savingRef.current = true;
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
          client_id: quotation.client_id,
          customer_name: customerData.name,
          customer_address: customerData.address,
          customer_phone: customerData.phone,
          customer_email: customerData.email || '',
          date: customerData.date,
          reference_number: customerData.referenceNumber || undefined,
          quote_reference: customerData.quoteReference,
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
      savingRef.current = false;
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
        const existingDiscount = sectionDiscounts[item.section || 'Furniture'] || 0;
        const newSub: QuoteItem = {
          item: "",
          description: "",
          color: "",
          quantity: 1,
          amount: 0,
          line_total: 0,
          discount_percent: existingDiscount,
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
          const subDiscPct = sub.discount_percent || sectionDiscounts[item.section || 'Furniture'] || 0;
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
            discount_percent: subDiscPct,
            discounted_total: subDiscPct > 0
              ? calculateDiscountedTotal(qty, price, subDiscPct)
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
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
              Save as Draft
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Quotation Form */}
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
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">Quotation</p>
            <h1 className="text-2xl font-semibold text-gray-900">Edit Quotation</h1>
          </div>
        </div>

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
                💡 Selected: <span className="font-bold">{roomType}</span> with <span className="font-bold">{displayDoorType}</span> doors
              </p>
              <p className="text-xs text-blue-700 mb-2">
                Prices will be automatically looked up based on these selections when you enter item codes.
              </p>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs font-semibold text-blue-900 mb-1">🎯 Component-Only Pricing (Advanced):</p>
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

        {/* Customer + Quote Details — 2-column layout */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {/* Left: Bill To */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Bill To</p>
            <Input value={customerData.name} onChange={e => setCustomerData({ ...customerData, name: e.target.value })}
              placeholder="Customer name"
              className="border-none border-b border-gray-100 focus-visible:ring-0 px-0 rounded-none text-base font-medium placeholder:text-gray-300 mb-1 h-auto py-2" />
            <textarea value={customerData.address} onChange={e => setCustomerData({ ...customerData, address: e.target.value })}
              rows={3} placeholder="Address"
              className="w-full bg-transparent border-none outline-none resize-none text-sm text-gray-700 placeholder:text-gray-300 py-2 border-b border-gray-100" />
            <Input value={customerData.phone} onChange={e => setCustomerData({ ...customerData, phone: e.target.value })}
              placeholder="Phone"
              className="border-none border-b border-gray-100 focus-visible:ring-0 px-0 rounded-none text-sm text-gray-700 placeholder:text-gray-300 h-auto py-2" />
          </div>
          {/* Right: Quote Details */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Quote Details</p>
            <div className="space-y-0">
              {([
                { label: 'Quote No', key: 'referenceNumber', type: 'text', val: customerData.referenceNumber, set: (v: string) => setCustomerData({ ...customerData, referenceNumber: v }) },
                { label: 'Date',     key: 'date',            type: 'date', val: customerData.date,            set: (v: string) => setCustomerData({ ...customerData, date: v }) },
              ] as { label: string; key: string; type: string; val: string; set: (v: string) => void }[]).map(({ label, key, type, val, set }) => (
                <div key={key} className="flex items-center border-b border-gray-100 py-0.5">
                  <span className="text-xs text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">{label}</span>
                  <div className="flex-1">
                    <Input type={type} value={val} onChange={e => set(e.target.value)}
                      className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" />
                  </div>
                </div>
              ))}
              <div className="flex items-center border-b border-gray-100 py-0.5">
                <span className="text-xs text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">Quote Ref (£)</span>
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-sm text-gray-500 flex-shrink-0">£</span>
                  <Input value={customerData.quoteReference} onChange={e => setCustomerData({ ...customerData, quoteReference: e.target.value.replace(/[^\d.]/g, '') })}
                    placeholder="Optional" inputMode="decimal"
                    className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" />
                </div>
              </div>
              {([
                { label: 'Order Ref',      val: roomName,        set: setRoomName },
                { label: 'Carcass Colour', val: carcassColour,   set: setCarcassColour },
                { label: 'Door Colour',    val: doorColour,      set: setDoorColour },
                { label: 'Panelwork',      val: panelworkColour, set: setPanelworkColour },
                { label: 'Door Style',     val: doorStyle,       set: setDoorStyle },
              ] as { label: string; val: string; set: (v: string) => void }[]).map(({ label, val, set }) => (
                <div key={label} className="flex items-center border-b border-gray-100 py-0.5">
                  <span className="text-xs text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">{label}</span>
                  <div className="flex-1">
                    <Input value={val} onChange={e => set(e.target.value)}
                      className="border-none focus-visible:ring-0 px-0 text-sm text-gray-700 h-auto py-1.5 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                      <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400" style={{ width: '4%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {indexedItems.map(({ item, index }) => (
                      <React.Fragment key={index}>
                        <tr className="border-b border-gray-50">
                          <td className="border-b border-gray-50 px-2 py-2">
                            <Input
                              value={item.item}
                              onChange={(e) => {
                                setItems(prevItems => prevItems.map((it, i) => i === index ? { ...it, item: e.target.value } : it));
                              }}
                              onBlur={(e) => { const val = e.target.value.trim(); if (val.length >= 1) handleItemChange(index, "item", val); }}
                              placeholder="50B"
                              className={`border-none focus-visible:ring-0 w-full font-mono text-sm h-auto py-0 px-0 placeholder:text-gray-300 ${autoFilling === index ? 'bg-blue-50 animate-pulse' : ''}`}
                            />
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2">
                            <textarea
                              value={item.description}
                              onChange={(e) => handleDescriptionChange(index, e.target.value)}
                              placeholder="Description"
                              className={`border-none outline-none w-full resize-none overflow-hidden text-sm bg-transparent placeholder:text-gray-300 ${autoFilling === index ? 'bg-blue-50 animate-pulse' : ''}`}
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
                            <Input value={item.color} onChange={(e) => handleItemChange(index, "color", e.target.value)} placeholder="—" className="border-none focus-visible:ring-0 text-sm h-auto py-0 px-0 w-full placeholder:text-gray-300" />
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2">
                            <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0" min="1" />
                          </td>
                          {(["width", "height", "depth"] as const).map(dim => {
                            const raw = item[dim];
                            const displayVal = raw != null const displayVal = raw != null && raw !== 0 && raw !== "" ?const displayVal = raw != null && raw !== 0 && raw !== "" ? raw !== 0 ? (Number(raw) % 1 === 0 ? String(Math.round(Number(raw))) : String(raw)) : "";
                            return (
                              <td key={dim} className="border-b border-gray-50 px-2 py-2">
                                <Input type="number" value={displayVal} onChange={(e) => handleItemChange(index, dim, e.target.value)} placeholder="—"
                                  style={{ width: `${Math.max(3, (displayVal || "—").length + 1)}ch` }}
                                  className="border-none text-center focus-visible:ring-0 text-sm h-auto py-0 px-0 placeholder:text-gray-300" min="0" />
                              </td>
                            );
                          })}
                          <td className="border-b border-gray-50 px-2 py-2">
                            <Input type="number" step="0.01" value={item.amount} onChange={(e) => handleItemChange(index, "amount", e.target.value)} className="border-none text-right focus-visible:ring-0 w-full text-sm h-auto py-0 px-0" min="0" placeholder="0.00" />
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2 text-right text-sm text-gray-600">
                            {formatCurrency((item.amount || 0) * (item.quantity || 1))}
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2">
                            <Input type="number" step="0.1" value={item.discount_percent || ''} onChange={(e) => handleItemChange(index, "discount_percent", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" min="0" max="100" placeholder="0" />
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2 text-right">
                            {item.discount_percent && item.discount_percent > 0 ? (
                              <div>
                                <div className="text-xs text-gray-400 line-through">{formatCurrency((item.amount || 0) * (item.quantity || 1))}</div>
                                <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.discounted_total || 0)}</div>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-gray-900">{formatCurrency((item.amount || 0) * (item.quantity || 1))}</span>
                            )}
                          </td>
                          <td className="border-b border-gray-50 px-2 py-2 text-center">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-gray-300 hover:text-red-500 h-7 w-7">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>

                        {/* SUB-ITEMS */}
                        {(item.subItems || []).map((sub, subIndex) => (
                          <tr key={subIndex} className="bg-gray-50/40">
                            <td className="border-b border-gray-50 px-2 py-1.5 pl-6">
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
                                className="border-none focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 font-mono placeholder:text-gray-300"
                              />
                            </td>
                            <td className="border-b border-gray-50 px-2 py-1.5">
                              <Input value={sub.description} onChange={(e) => handleSubItemChange(index, subIndex, "description", e.target.value)} placeholder="Sub-item description" className="border-none focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" />
                            </td>
                            <td className="border-b border-gray-50 px-2 py-1.5">
                              <Input value={sub.color} onChange={(e) => handleSubItemChange(index, subIndex, "color", e.target.value)} placeholder="—" className="border-none focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" />
                            </td>
                            <td className="border-b border-gray-50 px-2 py-1.5">
                              <Input type="number" value={sub.quantity} onChange={(e) => handleSubItemChange(index, subIndex, "quantity", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0" min="1" />
                            </td>
                            <td className="border-b border-gray-50" /><td className="border-b border-gray-50" /><td className="border-b border-gray-50" />
                            <td className="border-b border-gray-50 px-2 py-1.5">
                              <Input type="number" step="0.01" value={sub.amount} onChange={(e) => handleSubItemChange(index, subIndex, "amount", e.target.value)} className="border-none text-right focus-visible:ring-0 w-full text-sm h-auto py-0 px-0" min="0" placeholder="0.00" />
                            </td>
                            <td className="border-b border-gray-50 px-2 py-1.5 text-right text-sm text-gray-500">{formatCurrency(sub.line_total)}</td>
                            <td className="border-b border-gray-50 px-2 py-1.5">
                              <Input type="number" step="0.1" value={sub.discount_percent || ''} onChange={(e) => handleSubItemChange(index, subIndex, "discount_percent", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-sm h-auto py-0 px-0 placeholder:text-gray-300" min="0" max="100" placeholder="0" />
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
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveSubItem(index, subIndex)} className="text-gray-300 hover:text-red-500 h-6 w-6">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}

                        {/* ADD SUB-ITEM BUTTON ROW */}
                        <tr>
                          <td colSpan={12} className="border-b border-gray-50 px-2 py-1">
                            <button onClick={() => handleAddSubItem(index)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <Plus className="h-3 w-3" /> Add sub-item
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                    {/* ADD ITEM BUTTON ROW */}
                    <tr>
                      <td colSpan={12} className="px-3 py-2">
                        <button onClick={() => handleAddItem(section)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
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
                    <div className="flex justify-end mt-2 mb-8">
                      <div className="w-96 text-sm rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Section discount row — inside card, one line */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
                          <span className="text-gray-500 text-sm shrink-0">Section Discount</span>
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
                        {hasItemDiscount && (
                          <div className="flex justify-between px-4 py-2.5 border-b border-gray-50 text-gray-600 text-sm">
                            <span>{section} Subtotal</span>
                            <span>{formatCurrency(sectionRaw)}</span>
                          </div>
                        )}
                        {hasItemDiscount && (
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 text-red-500 text-sm">
                            <span>Item Discounts ({parseFloat(Number(sectionDiscountPct).toFixed(2))}%)</span>
                            <span>-{formatCurrency(itemDiscountTotal)}</span>
                          </div>
                        )}
                        <div className="flex justify-between px-4 py-3.5 font-semibold bg-gray-900 text-white">
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
            <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotalAfterSectionDiscounts)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
              <div className="flex items-center gap-2 text-gray-600">
                <span>Discount</span>
                <Input type="number" min="0" max="100" step="0.1" value={globalDiscountPercent} onChange={e => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)} className="border border-gray-200 rounded px-2 py-0.5 w-14 text-right text-xs h-auto" />
                <span className="text-gray-400 text-xs">%</span>
              </div>
              <span className="text-red-500">{globalDiscountPercent > 0 ? `-${formatCurrency(globalDiscountAmount)}` : "—"}</span>
            </div>
            {globalDiscountPercent > 0 && (
              <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
                <span>After Discount</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
              <div className="flex items-center gap-2 text-gray-600">
                <span>VAT</span>
                <Input type="number" value={vatPercentage} onChange={(e) => setVatPercentage(parseFloat(e.target.value) || 0)} className="border border-gray-200 rounded px-2 py-0.5 w-14 text-right text-xs h-auto" min="0" max="100" step="0.1" />
                <span className="text-gray-400 text-xs">%</span>
              </div>
              <span className="text-gray-600">{formatCurrency(vat)}</span>
            </div>
            <div className="flex justify-between px-5 py-4 bg-gray-900 text-white font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
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
          {/* Terms */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Terms</p>
            <p>Only Bacs or Cash accepted on Delivery and Completion.</p>
            <p className="mt-1">Full payment required upfront to confirm order.</p>
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

        <SignatureField customerName={customerData.name} onChange={setSignatureData} initialData={signatureData || undefined} />
      </div>
    </div>
  );
}