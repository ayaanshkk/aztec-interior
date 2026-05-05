"use client";
 
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Trash2, Plus, Eye } from "lucide-react";
 
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aztec-interior.onrender.com';
 
export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
 
  const [quotation, setQuotation] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quoteDoorType, setQuoteDoorType] = useState<string>(''); 

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(value);
  };
 
  useEffect(() => {
    fetchQuotation();
  }, [quoteId]);
 
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
        
        const itemsWithTotals = (data.items || []).map((item: any) => ({
          ...item,
          quantity: item.quantity || 1,
          amount: item.amount || 0,
          width: item.width || undefined,
          height: item.height || undefined,
          depth: item.depth || undefined,
          line_total: (item.quantity || 1) * (item.amount || 0),
        }));
        setItems(itemsWithTotals);
        
        // ✅ EXTRACT DOOR TYPE from first Door item
        const doorItem = itemsWithTotals.find((item: any) => 
          item.item?.toLowerCase().includes('door')
        );
        
        if (doorItem) {
          // "Door - Basic Slab" → "Basic Slab"
          const doorTypeMatch = doorItem.item?.match(/Door\s*-\s*(.+)/i);
          if (doorTypeMatch) {
            const extractedDoorType = doorTypeMatch[1].trim();
            setQuoteDoorType(extractedDoorType);
            console.log(`✅ Extracted door type: ${extractedDoorType}`);
          }
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
 
  // ============================================================================
  // SMART AUTO-FILL - Uses door type for ALL items
  // ============================================================================
  const handleDescriptionChange = async (index: number, value: string) => {
    // Update description immediately
    const updatedItems = [...items];
    updatedItems[index].description = value;
    setItems(updatedItems);
 
    // Skip if description is too short
    if (!value || value.length < 3) {
      return;
    }
 
    // ✅ Use the global door type (extracted from "Door - Basic Slab")
    const doorTypeToUse = quoteDoorType || 'Basic Slab'; // Default to Basic Slab if not found
 
    console.log(`🔍 Auto-fill triggered: "${value}" with door type: ${doorTypeToUse}`);
 
    // Call backend for smart auto-price lookup
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
          door_type: doorTypeToUse,  // ← Use global door type
        }),
      });
 
      const data = await response.json();
 
      if (data.found) {
        // Auto-fill price, width, height, depth
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
    }
  };
 
  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
 
    // Recalculate line total when quantity or amount changes
    if (field === 'quantity' || field === 'amount') {
      const qty = field === 'quantity' ? parseFloat(value) || 1 : updatedItems[index].quantity || 1;
      const amount = field === 'amount' ? parseFloat(value) || 0 : updatedItems[index].amount || 0;
      updatedItems[index].line_total = qty * amount;
    }
 
    setItems(updatedItems);
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
      const vat = subtotal * 0.20;
      const total = subtotal + vat;
 
      const response = await fetch(`${BACKEND_URL}/quotations/${quoteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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
        }),
      });
 
      if (response.ok) {
        alert("✅ Quotation saved successfully!");
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
 
  const handleViewQuote = () => {
    router.push(`/dashboard/quotes/${quoteId}`);
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
  const vat = subtotal * 0.20;
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
                Customer: {quotation.customer_name}
                {quoteDoorType && <span className="ml-4 text-blue-600">Door Type: {quoteDoorType}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleViewQuote} variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              View Quote
            </Button>
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

        {/* Customer Information */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50" style={{ width: '20%' }}>DATE:</td>
                <td className="border border-black px-3 py-2">{new Date().toLocaleDateString('en-GB')}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">NAME:</td>
                <td className="border border-black px-3 py-2">{quotation.customer_name}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">ADDRESS:</td>
                <td className="border border-black px-3 py-2">{quotation.customer_address || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">TEL:</td>
                <td className="border border-black px-3 py-2">{quotation.customer_phone || '—'}</td>
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
                        placeholder="Item name"
                        className="border-none focus-visible:ring-0 min-w-[140px]"
                      />
                    </td>
                    <td className="border border-black p-2">
                      <Input
                        value={item.description}
                        onChange={(e) => handleDescriptionChange(index, e.target.value)}
                        placeholder="e.g., Base Unit 150mm wide"
                        className="border-none focus-visible:ring-0 min-w-[190px]"
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
                
                {items.length === 0 && (
                  <tr>
                    <td colSpan={10} className="border border-black px-3 py-8 text-center text-gray-500">
                      No items yet. Click "Add Item" to get started.
                    </td>
                  </tr>
                )}
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
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">VAT</td>
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