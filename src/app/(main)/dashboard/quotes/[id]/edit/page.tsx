"use client";
 
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
 
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aztec-interior.onrender.com';

interface QuoteItem {
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
}
 
export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = params.id as string;
 
  const [quotation, setQuotation] = useState<any>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState<number | null>(null);
  
  // ✅ NEW: Door type and room type with URL param initialization
  const [doorType, setDoorType] = useState<string>('Carcass Only');
  const [roomType, setRoomType] = useState<string>('Kitchen');
  
  const [vatPercentage, setVatPercentage] = useState<number>(20);
  
  // Customer form data
  const [customerData, setCustomerData] = useState({
    name: '',
    address: '',
    phone: '',
    date: new Date().toISOString().split('T')[0]
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(value);
  };

  // ✅ NEW: Initialize door type and room type from URL params
  useEffect(() => {
    const urlDoorType = searchParams.get("doorType");
    const urlRoomType = searchParams.get("roomType");
    
    if (urlDoorType) {
      setDoorType(urlDoorType);
      console.log('🚪 Door type from URL:', urlDoorType);
    }
    if (urlRoomType) {
      setRoomType(urlRoomType);
      console.log('🏠 Room type from URL:', urlRoomType);
    }
  }, [searchParams]);
 
  useEffect(() => {
    fetchQuotation();
  }, [quoteId]);

  // ✅ NEW: Update all prices when door type or room type changes
  useEffect(() => {
    const updateAllPrices = async () => {
      // Skip if no items loaded yet
      if (items.length === 0 || loading) return;

      console.log(`🔄 Door/Room type changed - updating all prices...`);
      console.log(`   New Door Type: ${doorType}`);
      console.log(`   New Room Type: ${roomType}`);
  
      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
  
      // Create array of promises for all items that have a description
      const updatePromises = items.map(async (item, index) => {
        // Skip if no description
        if (!item.description || item.description.trim().length === 0) {
          return null;
        }
  
        const description = item.description.trim();
        
        // Detect if this is an appliance code
        const isApplianceCode = /^[A-Z]{2,}[0-9]{2,}[A-Z0-9]{2,}$/i.test(description);
        
        const requestBody: any = {
          description: description,
          door_type: doorType,
          room_type: roomType,
        };
  
        // If it's an appliance code, don't send door_type
        if (isApplianceCode) {
          delete requestBody.door_type;
          delete requestBody.room_type;
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
            console.log(`✅ Updated price for ${description}: £${data.price}`);
            return {
              index,
              price: data.price,
              width: data.width,
              height: data.height,
              depth: data.depth,
            };
          } else {
            console.log(`⚠️ No price found for ${description} with new door type`);
            return null;
          }
        } catch (error) {
          console.error(`Error updating price for ${description}:`, error);
          return null;
        }
      });
  
      // Wait for all price lookups to complete
      const results = await Promise.all(updatePromises);
  
      // Update items with new prices
      setItems((prevItems) =>
        prevItems.map((item, index) => {
          const result = results.find((r) => r && r.index === index);
          if (result) {
            return {
              ...item,
              amount: result.price,
              width: result.width,
              height: result.height,
              depth: result.depth,
              line_total: result.price * (item.quantity || 1),
            };
          }
          return item;
        })
      );
  
      console.log(`🎯 Finished updating all prices`);
    };
  
    // Only run if we have items with descriptions
    const hasItemsWithDescriptions = items.some(item => item.description && item.description.trim().length > 0);
    
    if (hasItemsWithDescriptions && !loading) {
      updateAllPrices();
    }
  }, [doorType, roomType]); // Re-run whenever doorType or roomType changes
 
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
        }));
        setItems(itemsWithTotals);
        
        // Load VAT percentage if saved
        if (data.vat_percentage) {
          setVatPercentage(data.vat_percentage);
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
      const isApplianceCode = /^[A-Z]{2,}[0-9]{2,}[A-Z0-9]{2,}$/i.test(value.trim());
      
      const requestBody: any = {
        description: value,
        door_type: doorType,
        room_type: roomType,
      };

      // If it's an appliance code, don't send door_type
      if (isApplianceCode) {
        console.log('🔥 Detected appliance code pattern');
        delete requestBody.door_type;
        delete requestBody.room_type;
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
        const updatedItems = [...items];
        updatedItems[index] = {
          ...updatedItems[index],
          amount: data.price,
          width: data.width,
          height: data.height,
          depth: data.depth,
          line_total: data.price * (updatedItems[index].quantity || 1),
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
  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
 
    if (field === 'quantity' || field === 'amount') {
      const qty = field === 'quantity' ? parseFloat(value) || 1 : updatedItems[index].quantity || 1;
      const amount = field === 'amount' ? parseFloat(value) || 0 : updatedItems[index].amount || 0;
      updatedItems[index].line_total = qty * amount;
    }
 
    setItems(updatedItems);

    // ✅ Auto-fill when ITEM field changes (code lookup)
    if (field === 'item' && value && value.length >= 2) {
      const trimmedValue = value.trim();
      
      // Skip auto-fill if it looks like a full item name
      if (trimmedValue.includes(' ') || trimmedValue.length > 20) {
        return;
      }

      console.log(`🔍 Item code auto-fill: "${trimmedValue}"`);
      setAutoFilling(index);

      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";

      // ✅ NEW: Detect appliance code pattern
      const isApplianceCode = /^[A-Z]{2,}[0-9]{2,}[A-Z0-9]{2,}$/i.test(trimmedValue);
      
      const requestBody: any = {
        description: trimmedValue,
      };

      // Only send door_type for non-appliances
      if (!isApplianceCode) {
        requestBody.door_type = doorType;
        requestBody.room_type = roomType;
      }

      fetch(`${BACKEND_URL}/quotations/auto-price-lookup`, {
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
          // ✅ Build rich description for appliances
          let autoDescription = data.description || data.item_name || '';
          
          if (isApplianceCode && data.brand && data.series_level) {
            autoDescription = `${data.item_name} - ${data.brand} ${data.series_level}${data.series_info ? ` (${data.series_info})` : ''}`;
          }

          setItems(prevItems => {
            const newItems = [...prevItems];
            newItems[index] = {
              ...newItems[index],
              item: data.item_code || trimmedValue,
              description: autoDescription,
              amount: data.price || 0,
              width: data.width,
              height: data.height,
              depth: data.depth,
              line_total: (data.price || 0) * (newItems[index].quantity || 1),
            };
            return newItems;
          });

          console.log(`✅ Auto-filled: ${data.item_name} - £${data.price}`);
        } else {
          console.log("❌ No pricing found for code:", trimmedValue);
        }
      })
      .catch(error => {
        console.error("Auto-price lookup failed:", error);
      })
      .finally(() => {
        setAutoFilling(null);
      });
    }
  };
 
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        item: "",
        description: "",
        color: "",
        quantity: 1,
        amount: 0,
        line_total: 0,
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
 
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      
      const subtotal = items.reduce((sum, item) => sum + ((item.amount || 0) * (item.quantity || 1)), 0);
      const vat = subtotal * (vatPercentage / 100);
      const total = subtotal + vat;
 
      const response = await fetch(`${BACKEND_URL}/quotations/${quoteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_name: customerData.name,
          customer_address: customerData.address,
          customer_phone: customerData.phone,
          items: items.map(item => ({
            item: item.item,
            description: item.description,
            color: item.color,
            quantity: item.quantity || 1,
            amount: item.amount || 0,
            width: item.width,
            height: item.height,
            depth: item.depth,
          })),
          subtotal,
          vat,
          total,
          vat_percentage: vatPercentage,
        }),
      });
 
      if (response.ok) {
        alert("✅ Quotation saved successfully!");
        // Redirect to view page
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
 
  const subtotal = items.reduce((sum, item) => sum + ((item.amount || 0) * (item.quantity || 1)), 0);
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
      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* Company Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-4xl font-bold tracking-wider text-gray-800">
            AZTEC INTERIORS
          </div>
        </div>

        {/* Company Registration Details */}
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

        {/* Quotation Title */}
        <h1 className="mb-6 text-center text-2xl font-bold">QUOTATION</h1>

        {/* ✅ NEW: Door Type and Room Type Selection */}
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
              <option value="Basic Slab">Basic Slab</option>
              <option value="Acrylic Gloss/Matt">Acrylic Gloss/Matt</option>
              <option value="Vinyl">Vinyl</option>
              <option value="Black Glass">Black Glass</option>
            </select>
          </div>
        </div>

        {/* ✅ NEW: Info Banner */}
        <div className="mb-6 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
          <p className="font-medium">
            💡 Selected: <span className="font-bold">{roomType}</span> with <span className="font-bold">{doorType}</span> doors
          </p>
          <p className="mt-1 text-xs text-blue-600">
            Prices will be automatically updated when you change these selections.
          </p>
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
            </tbody>
          </table>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold">Quote Items</h3>
            <Button onClick={handleAddItem} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white">
                  <th className="border border-black px-3 py-2 text-left font-bold" style={{ minWidth: '150px' }}>ITEM</th>
                  <th className="border border-black px-3 py-2 text-left font-bold" style={{ minWidth: '200px' }}>DESCRIPTION</th>
                  <th className="border border-black px-3 py-2 text-left font-bold" style={{ minWidth: '100px' }}>COLOUR</th>
                  <th className="border border-black px-3 py-2 text-center font-bold" style={{ width: '60px' }}>QTY</th>
                  <th className="border border-black px-3 py-2 text-center font-bold" style={{ width: '80px' }}>WIDTH</th>
                  <th className="border border-black px-3 py-2 text-center font-bold" style={{ width: '80px' }}>HEIGHT</th>
                  <th className="border border-black px-3 py-2 text-center font-bold" style={{ width: '80px' }}>DEPTH</th>
                  <th className="border border-black px-3 py-2 text-right font-bold" style={{ minWidth: '80px' }}>PRICE</th>
                  <th className="border border-black px-3 py-2 text-right font-bold" style={{ minWidth: '100px' }}>AMOUNT</th>
                  <th className="border border-black px-3 py-2 text-center font-bold" style={{ width: '60px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-black p-2">
                      <Input
                        value={item.item}
                        onChange={(e) => handleItemChange(index, "item", e.target.value)}
                        placeholder="Item code"
                        className={`border-none focus-visible:ring-0 min-w-[140px] ${
                          autoFilling === index ? 'bg-blue-50 animate-pulse' : ''
                        }`}
                      />
                    </td>
                    <td className="border border-black p-2">
                      <textarea
                        value={item.description}
                        onChange={(e) => handleDescriptionChange(index, e.target.value)}
                        placeholder="Description"
                        className={`border-none focus-visible:ring-0 min-w-[190px] w-full resize-none overflow-hidden ${
                          autoFilling === index ? 'bg-blue-50 animate-pulse' : ''
                        }`}
                        rows={2}
                        style={{
                          minHeight: '40px',
                          lineHeight: '1.4'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                      />
                    </td>
                    <td className="border border-black p-2">
                      <Input
                        value={item.color}
                        onChange={(e) => handleItemChange(index, "color", e.target.value)}
                        placeholder="Colour"
                        className="border-none focus-visible:ring-0 min-w-[90px]"
                      />
                    </td>
                    <td className="border border-black p-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        className="border-none text-center focus-visible:ring-0 w-[50px]"
                        min="1"
                      />
                    </td>
                    <td className="border border-black p-2">
                      <Input
                        type="number"
                        value={item.width || ''}
                        onChange={(e) => handleItemChange(index, "width", e.target.value)}
                        placeholder="—"
                        className="border-none text-center focus-visible:ring-0 w-[70px]"
                        min="0"
                      />
                    </td>
                    <td className="border border-black p-2">
                      <Input
                        type="number"
                        value={item.height || ''}
                        onChange={(e) => handleItemChange(index, "height", e.target.value)}
                        placeholder="—"
                        className="border-none text-center focus-visible:ring-0 w-[70px]"
                        min="0"
                      />
                    </td>
                    <td className="border border-black p-2">
                      <Input
                        type="number"
                        value={item.depth || ''}
                        onChange={(e) => handleItemChange(index, "depth", e.target.value)}
                        placeholder="—"
                        className="border-none text-center focus-visible:ring-0 w-[70px]"
                        min="0"
                      />
                    </td>
                    <td className="border border-black p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                        className="border-none text-right focus-visible:ring-0 min-w-[70px]"
                        min="0"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-semibold">
                      {formatCurrency((item.amount || 0) * (item.quantity || 1))}
                    </td>
                    <td className="border border-black p-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="mb-6 flex justify-end">
          <table className="border-collapse" style={{ width: '40%' }}>
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">SUB TOTAL</td>
                <td className="border border-black px-3 py-2 text-right">{formatCurrency(subtotal)}</td>
              </tr>
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