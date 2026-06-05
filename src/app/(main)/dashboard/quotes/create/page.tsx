"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BACKEND_URL } from "@/lib/api";

interface QuoteItem {
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
}

export default function CreateQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  const [items, setItems] = useState<QuoteItem[]>([
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
    },
  ]);

  // ✅ Always-fresh ref for items (avoids stale closure in async handlers)
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState<string | null>(null);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);

  const [doorType, setDoorType] = useState<string>('Carcass Only');
  const [roomType, setRoomType] = useState<string>('Kitchen');
  const [vatPercentage, setVatPercentage] = useState<number>(20);

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
    const customerName = searchParams.get("customerName");
    const customerAddress = searchParams.get("customerAddress");
    const customerPhone = searchParams.get("customerPhone");
    const customerEmail = searchParams.get("customerEmail");

    if (customerIdParam) setCustomerId(customerIdParam);

    if (customerName) {
      setFormData({
        date: new Date().toISOString().split("T")[0],
        name: customerName || "",
        address: customerAddress || "",
        phone: customerPhone || "",
        email: customerEmail || "",
      });
    }
  }, [searchParams, user]);

  // Update all prices when door/room type changes
  useEffect(() => {
    const updateAllPrices = async () => {
      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";

      const currentItems = itemsRef.current;
      const hasItemsWithCodes = currentItems.some(item => item.item && item.item.trim().length > 0);
      if (!hasItemsWithCodes) return;

      const updatePromises = currentItems.map(async (item) => {
        if (!item.item || item.item.trim().length === 0) return null;

        const itemCode = item.item.trim();
        const hasSuffix = itemCode.includes('-');
        const baseCode = itemCode.split('-')[0];
        const isApplianceCode = /^[A-Z]{2,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;

        const requestBody: any = { description: itemCode };

        if (!hasSuffix && !isApplianceCode) {
          requestBody.door_type = doorType;
          requestBody.room_type = roomType;
        } else if (!isApplianceCode) {
          requestBody.room_type = roomType;
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
            return { id: item.id, price: data.price, description: data.description || data.item_name };
          }
          return null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(updatePromises);

      setItems((prevItems) =>
        prevItems.map((item) => {
          const result = results.find((r) => r && r.id === item.id);
          if (result) {
            return {
              ...item,
              amount: result.price,
              description: result.description,
              line_total: result.price * (item.quantity || 1),
            };
          }
          return item;
        })
      );
    };

    updateAllPrices();
  }, [doorType, roomType]);

  // ============================================================================
  // SMART AUTO-FILL - Triggers when item code is entered
  // ============================================================================
  const handleItemChange = async (id: string, field: keyof QuoteItem, value: any) => {
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

      // ── FITTING EXPANSION ────────────────────────────────────────────
      if (trimmedValue === 'FITTING') {
        setAutoFilling(id);
        const token = localStorage.getItem("token");
        const tenantId = localStorage.getItem("tenantId") || "7";
        const FITTING_CODES = ['KUNIT', 'BUNIT', 'ROBE', 'APPL', 'SINKTAP', 'WTJT', 'FITDR', 'PANW'];
        const currentItemsSnapshot = itemsRef.current
          .filter(i => i.id !== id)
          .map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));
        console.log('📦 FITTING snapshot:', JSON.stringify(currentItemsSnapshot));
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
            alert('No fitting items detected in the quote. Add kitchen/bedroom units first.');
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
      // ── END FITTING EXPANSION ────────────────────────────────────────

      if (trimmedValue.includes(' ') || trimmedValue.length > 20) return;

      setAutoFilling(id);
      try {
        const token = localStorage.getItem("token");
        const tenantId = localStorage.getItem("tenantId") || "7";
        const hasSuffix = trimmedValue.includes('-');
        const baseCode = trimmedValue.split('-')[0];
        const isApplianceCode = /^[A-Z]{2,3}[0-9]{2}[A-Z0-9]{5,}$/i.test(baseCode) && baseCode.length >= 9;
        const currentItemsSnapshot = itemsRef.current
          .filter(i => i.id !== id)
          .map(i => ({ item: i.item, description: i.description, quantity: i.quantity }));
        const requestBody: any = { description: trimmedValue, current_items: currentItemsSnapshot };
        if (!hasSuffix && !isApplianceCode) {
          requestBody.door_type = doorType;
          requestBody.room_type = roomType;
        } else if (!isApplianceCode) {
          requestBody.room_type = roomType;
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
            if (item.id === id) {
              const qty = fittingQty !== null ? fittingQty : (item.quantity || 1);
              return { ...item, item: trimmedValue, description: autoDescription, amount: data.price || 0, quantity: qty, width: data.width, height: data.height, depth: data.depth, line_total: (data.price || 0) * qty };
            }
            return item;
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
        setItems((prevItems) =>
          prevItems.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                item: data.item_code || item.item,
                amount: data.price || 0,
                width: data.width,
                height: data.height,
                depth: data.depth,
                line_total: (data.price || 0) * (item.quantity || 1),
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

  const handleAddItem = () => {
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
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (confirm("Remove this item?")) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleSave = async () => {
    if (saving) return;

    if (!formData.name?.trim()) { alert("Customer name is required"); return; }
    if (!formData.address?.trim()) { alert("Customer address is required"); return; }

    const subtotalBeforeDiscount = items.reduce((sum, item) => {
      const itemTotal = (item.discount_percent && item.discount_percent > 0)
        ? (item.discounted_total || 0)
        : item.line_total;
      return sum + itemTotal;
    }, 0);

    const globalDiscountAmount = subtotalBeforeDiscount * (globalDiscountPercent / 100);
    const subtotal = subtotalBeforeDiscount - globalDiscountAmount;

    if (subtotal <= 0) { alert("Please add at least one item with a valid price"); return; }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const vat = subtotal * (vatPercentage / 100);
      const total = subtotal + vat;

      const response = await fetch(`${BACKEND_URL}/quotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          client_id: customerId,
          customer_name: formData.name,
          customer_address: formData.address,
          customer_phone: formData.phone,
          customer_email: formData.email,
          date: formData.date,
          door_type: doorType,
          room_type: roomType,
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
        const data = await response.json();
        const quoteId = data.quotation_id || data.id;
        alert(`✅ Quote #${quoteId} created successfully!`);
        window.open(`/dashboard/quotes/${quoteId}`, '_blank');
        if (customerId) {
          router.push(`/dashboard/customers/${customerId}`);
        } else {
          router.push("/dashboard/quotes");
        }
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

  const subtotalBeforeDiscount = items.reduce((sum, item) => {
    const itemTotal = (item.discount_percent && item.discount_percent > 0)
      ? (item.discounted_total || 0)
      : item.line_total;
    return sum + itemTotal;
  }, 0);

  const globalDiscountAmount = subtotalBeforeDiscount * (globalDiscountPercent / 100);
  const subtotal = subtotalBeforeDiscount - globalDiscountAmount;
  const vat = subtotal * (vatPercentage / 100);
  const total = subtotal + vat;

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
              <h1 className="text-2xl font-bold">Create New Quotation</h1>
              <p className="text-sm text-gray-600">Fill in the details below to create a quotation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Quotation"}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-8">
        {/* Company Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-4xl font-bold tracking-wider text-gray-800">AZTEC INTERIORS</div>
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

        <h1 className="mb-6 text-center text-2xl font-bold">QUOTATION</h1>

        {/* Door Type and Room Type */}
        <div className="mb-6 grid grid-cols-2 gap-4">
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
              <option value="Basic Slab">Basic Slab</option>
              <option value="Acrylic Gloss/Matt">Acrylic Gloss/Matt</option>
              <option value="Vinyl Doors">Vinyl Doors</option>
              <option value="Black Glass">Black Glass</option>
            </select>
          </div>
        </div>

        <div className="mb-6 rounded-md bg-blue-50 border border-blue-200 p-4">
          <p className="font-medium text-sm text-blue-900 mb-2">
            💡 Selected: <span className="font-bold">{roomType}</span> with <span className="font-bold">{doorType}</span> doors
          </p>
          <p className="text-xs text-blue-700 mb-2">
            Prices will be automatically looked up based on these selections when you enter item codes.
          </p>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs font-semibold text-blue-900 mb-1">🎯 Component-Only Pricing (Advanced):</p>
            <ul className="text-xs text-blue-700 mt-1 ml-4 space-y-0.5">
              <li>• <code className="bg-blue-100 px-1 rounded">50B</code> = {doorType === 'Carcass Only' ? 'Carcass only' : `Carcass + ${doorType} total (auto)`}</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-C</code> = Carcass only (when door type selected)</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-BS</code> = Basic Slab door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-AG</code> = Acrylic door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-VD</code> = Vinyl door component only</li>
              <li>• <code className="bg-blue-100 px-1 rounded">50B-BG</code> = Black Glass door component only</li>
              {doorType === 'Carcass Only' && <>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-BST</code> = Carcass + Basic Slab total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-AGT</code> = Carcass + Acrylic total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-VDT</code> = Carcass + Vinyl total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">50B-BGT</code> = Carcass + Black Glass total</li>
                <li>• <code className="bg-blue-100 px-1 rounded">FITTING</code> = Auto-detect all fittings from quote items</li>
              </>}
            </ul>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50" style={{ width: '20%' }}>DATE:</td>
                <td className="border border-black p-0">
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="border-none focus-visible:ring-0 w-full h-full px-3 py-2" />
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">NAME:</td>
                <td className="border border-black p-0">
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Customer name" className="border-none focus-visible:ring-0 w-full h-full px-3 py-2" required />
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">ADDRESS:</td>
                <td className="border border-black p-0">
                  <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Customer address" className="border-none focus-visible:ring-0 w-full h-full px-3 py-2 resize-none" rows={2} required />
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">TEL:</td>
                <td className="border border-black p-0">
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone number" className="border-none focus-visible:ring-0 w-full h-full px-3 py-2" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <div className="mb-3">
            <h3 className="text-lg font-bold">Quote Items</h3>
          </div>

          <div>
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="bg-white">
                  <th className="border border-black px-1 py-2 text-left font-bold text-xs" style={{ width: '8%' }}>ITEM</th>
                  <th className="border border-black px-1 py-2 text-left font-bold text-xs" style={{ width: '20%' }}>DESCRIPTION</th>
                  <th className="border border-black px-1 py-2 text-left font-bold text-xs" style={{ width: '7%' }}>COLOUR</th>
                  <th className="border border-black px-1 py-2 text-center font-bold text-xs" style={{ width: '4%' }}>QTY</th>
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
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-black p-0">
                      <Input
                        value={item.item}
                        onChange={(e) => handleItemChange(item.id, "item", e.target.value)}
                        onBlur={(e) => { const val = e.target.value.trim(); if (val.length >= 1) handleItemChange(item.id, "item", val); }}
                        placeholder="50B"
                        className={`border-none focus-visible:ring-0 min-w-[90px] font-mono text-xs ${autoFilling === item.id ? 'bg-blue-50 animate-pulse' : ''}`}
                      />
                    </td>
                    <td className="border border-black p-0">
                      <textarea
                        value={item.description}
                        onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                        placeholder="Description"
                        className={`border-none focus-visible:ring-0 min-w-[140px] w-full resize-none overflow-hidden text-xs ${autoFilling === item.id ? 'bg-blue-50 animate-pulse' : ''}`}
                        rows={2}
                        style={{ minHeight: '35px', lineHeight: '1.3' }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                      />
                    </td>
                    <td className="border border-black p-0">
                      <Input value={item.color} onChange={(e) => handleItemChange(item.id, "color", e.target.value)} placeholder="Colour" className="border-none focus-visible:ring-0 min-w-[70px] text-xs" />
                    </td>
                    <td className="border border-black p-0">
                      <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-xs" min="1" />
                    </td>
                    <td className="border border-black p-0">
                      <Input type="number" value={item.width || ''} onChange={(e) => handleItemChange(item.id, "width", e.target.value)} placeholder="—" className="border-none text-center focus-visible:ring-0 w-full text-xs" min="0" />
                    </td>
                    <td className="border border-black p-0">
                      <Input type="number" value={item.height || ''} onChange={(e) => handleItemChange(item.id, "height", e.target.value)} placeholder="—" className="border-none text-center focus-visible:ring-0 w-full text-xs" min="0" />
                    </td>
                    <td className="border border-black p-0">
                      <Input type="number" value={item.depth || ''} onChange={(e) => handleItemChange(item.id, "depth", e.target.value)} placeholder="—" className="border-none text-center focus-visible:ring-0 w-full text-xs" min="0" />
                    </td>
                    <td className="border border-black p-0">
                      <Input type="number" step="0.01" value={item.amount} onChange={(e) => handleItemChange(item.id, "amount", e.target.value)} className="border-none text-right focus-visible:ring-0 w-full text-xs" min="0" placeholder="0.00" />
                    </td>
                    <td className="border border-black px-2 py-1 text-right font-semibold text-xs">
                      {formatCurrency(item.line_total)}
                    </td>
                    <td className="border border-black p-0">
                      <Input type="number" step="0.1" value={item.discount_percent || ''} onChange={(e) => handleItemChange(item.id, "discount_percent", e.target.value)} className="border-none text-center focus-visible:ring-0 w-full text-xs" min="0" max="100" placeholder="0" />
                    </td>
                    <td className="border border-black px-2 py-1 text-right">
                      {item.discount_percent && item.discount_percent > 0 ? (
                        <div>
                          <div className="text-xs text-gray-500 line-through">{formatCurrency(item.line_total)}</div>
                          <div className="font-semibold text-green-700 text-xs">{formatCurrency(item.discounted_total || 0)}</div>
                        </div>
                      ) : (
                        <span className="font-semibold text-xs">{formatCurrency(item.line_total)}</span>
                      )}
                    </td>
                    <td className="border border-black p-1 text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="text-red-600 hover:bg-red-50 hover:text-red-700 h-7 w-7">
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
          <div className="mt-3 flex justify-start">
            <Button onClick={handleAddItem} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Totals */}
        <div className="mb-6 flex justify-end">
          <table className="border-collapse" style={{ width: '40%' }}>
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">SUB TOTAL</td>
                <td className="border border-black px-3 py-2 text-right">{formatCurrency(subtotalBeforeDiscount)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <span>DISCOUNT</span>
                    <div className="flex items-center gap-1">
                      <Input type="number" value={globalDiscountPercent} onChange={(e) => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)} className="border border-gray-300 rounded px-2 py-1 w-16 text-right text-sm" min="0" max="100" step="0.1" />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                </td>
                <td className="border border-black px-3 py-2 text-right text-red-600">
                  {globalDiscountPercent > 0 ? `-${formatCurrency(globalDiscountAmount)}` : '—'}
                </td>
              </tr>
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
                      <Input type="number" value={vatPercentage} onChange={(e) => setVatPercentage(parseFloat(e.target.value) || 0)} className="border border-gray-300 rounded px-2 py-1 w-16 text-right text-sm" min="0" max="100" step="0.1" />
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

        <div className="mb-6 space-y-2 text-sm">
          <p className="font-semibold">Only Bacs or Cash will be accepted on Delivery and Completion</p>
          <p className="font-semibold">NOTE: If you wish to proceed with this quote, you will be required to make the full payment upfront</p>
        </div>

        <div className="mb-8 text-sm font-semibold text-red-600">
          <p>Please sign here to confirm.</p>
        </div>

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