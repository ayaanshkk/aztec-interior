"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Download, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api";

interface ProformaItem {
  id: string;
  item: string;
  description: string;
  colour: string;
  amount: number;
}

const VAT_RATE = 0.2;

export default function CreateProformaInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [customerId, setCustomerId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    name: "",
    address: "",
    phone: "",
  });

  const [items, setItems] = useState<ProformaItem[]>([
    {
      id: "1",
      item: "",
      description: "",
      colour: "",
      amount: 0,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    const customerIdParam = searchParams.get("customerId");
    const customerName = searchParams.get("customerName");
    const customerAddress = searchParams.get("customerAddress");
    const customerPhone = searchParams.get("customerPhone");

    if (customerIdParam) {
      setCustomerId(customerIdParam);
    }

    if (customerName) {
      setFormData({
        date: new Date().toISOString().split("T")[0],
        name: customerName || "",
        address: customerAddress || "",
        phone: customerPhone || "",
      });
    }
  }, [searchParams]);

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = subtotal * VAT_RATE;
  const total = subtotal + vatAmount;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (id: string, field: keyof ProformaItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      }),
    );
  };

  const addItem = () => {
    const newItem: ProformaItem = {
      id: Date.now().toString(),
      item: "",
      description: "",
      colour: "",
      amount: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      setStatusMessage("❌ Customer name is required");
      setTimeout(() => setStatusMessage(""), 3000);
      return;
    }

    if (!formData.address?.trim()) {
      setStatusMessage("❌ Customer address is required");
      setTimeout(() => setStatusMessage(""), 3000);
      return;
    }

    if (total <= 0) {
      setStatusMessage("❌ Please add at least one item with a valid amount");
      setTimeout(() => setStatusMessage(""), 3000);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("⏳ Saving proforma invoice...");

    try {
      const formDataToSend = {
        ...formData,
        total: total,
        subtotal: subtotal,
        vat: vatAmount,
        items: items
          .filter((item) => item.item.trim() && item.amount > 0)
          .map((item) => ({
            item: item.item,
            description: item.description,
            colour: item.colour,
            amount: item.amount,
          })),
        customer_id: customerId,
      };

      const response = await fetchWithAuth("proforma-invoices", {
        method: "POST",
        body: JSON.stringify(formDataToSend),
      });

      if (!response.ok) {
        let errorMessage = "Failed to save proforma invoice";

        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        throw new Error("Invalid response format from server");
      }

      setStatusMessage(`✅ Proforma Invoice #${responseData.id} created successfully!`);
      
      setTimeout(() => {
        if (customerId) {
          router.push(`/dashboard/customers/${customerId}`);
        } else {
          router.push("/dashboard/proforma-invoices");
        }
      }, 2000);
    } catch (error) {
      console.error("Error saving proforma invoice:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to save proforma invoice";
      setStatusMessage(`❌ ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatusMessage(""), 5000);
    }
  };

  const handleDownloadPdf = async () => {
    if (!formData.name || !formData.address) {
      setStatusMessage("❌ Please fill in customer name and address first");
      setTimeout(() => setStatusMessage(""), 3000);
      return;
    }

    if (items.length === 0 || items.every((item) => !item.item)) {
      setStatusMessage("❌ Please add at least one item");
      setTimeout(() => setStatusMessage(""), 3000);
      return;
    }

    setLoading(true);
    setStatusMessage("⏳ Generating PDF...");

    try {
      const invoiceData = {
        customer_id: customerId,
        customer_name: formData.name,
        customer_address: formData.address,
        customer_phone: formData.phone,
        date: formData.date,
        items: items
          .filter((item) => item.item.trim())
          .map((item) => ({
            item: item.item,
            description: item.description,
            colour: item.colour,
            amount: item.amount,
          })),
        subtotal: subtotal,
        vat: vatAmount,
        total: total,
      };

      const response = await fetchWithAuth("proforma-invoices/generate-pdf", {
        method: "POST",
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate PDF";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Proforma_Invoice_${formData.name.replace(/\s+/g, "_")}_${formData.date}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatusMessage("✅ PDF generated and downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to generate PDF";
      setStatusMessage(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(""), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit}>
        <div className="sticky top-0 z-10 border-b bg-white">
          <div className="flex max-w-6xl items-center justify-between px-8 py-4">
            <div className="flex items-center space-x-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <h1 className="text-2xl font-semibold text-gray-900">Proforma Invoice</h1>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="px-8 pt-4">
            <div
              className={`rounded-md p-3 text-sm font-medium ${
                statusMessage.startsWith("✅")
                  ? "bg-green-100 text-green-800"
                  : statusMessage.startsWith("❌")
                    ? "bg-red-100 text-red-800"
                    : statusMessage.startsWith("⚠️")
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-200 text-gray-800"
              }`}
            >
              {statusMessage}
            </div>
          </div>
        )}

        <div className="max-w-6xl px-8 py-6">
          {/* Company Information Banner */}
          <Card className="mb-6 border-l-4 border-l-lime-500 bg-gradient-to-r from-lime-50 to-white">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">AZTEC INTERIORS</h2>
                  <p className="mt-2 text-sm text-gray-600">Registered to England No: 5248681</p>
                  <p className="text-sm text-gray-600">VAT Reg No: 946 8818 72</p>
                </div>
                <div className="text-sm text-gray-700">
                  <p className="font-semibold">Acc name: Aztec Interiors Leicester LTD</p>
                  <p className="bg-yellow-100 px-2 py-1 font-semibold">Bank: HSBC</p>
                  <p>s/code: 40 28 06</p>
                  <p>acc no: 43820343</p>
                  <p className="mt-2 bg-yellow-100 px-2 py-1 text-xs">
                    Please use your name and/or road name as reference
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Customer name"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    required
                    placeholder="Customer address"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    type="tel" 
                    value={formData.phone} 
                    onChange={handleInputChange}
                    placeholder="Customer phone number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Invoice Items</CardTitle>
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="rounded-lg border bg-gray-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <Label>Item</Label>
                        <Input
                          value={item.item}
                          onChange={(e) => handleItemChange(item.id, "item", e.target.value)}
                          placeholder="Item name"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                          placeholder="Description"
                        />
                      </div>
                      <div>
                        <Label>Colour</Label>
                        <Input
                          value={item.colour}
                          onChange={(e) => handleItemChange(item.id, "colour", e.target.value)}
                          placeholder="Colour"
                        />
                      </div>
                      <div>
                        <Label>Amount (£)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.amount}
                          onChange={(e) => handleItemChange(item.id, "amount", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="ml-auto max-w-md space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>£{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (20%):</span>
                  <span>£{vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Total:</span>
                  <span>£{total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Notice */}
          <Card className="mb-6 border-l-4 border-l-red-500 bg-red-50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">
                  Only Bacs or Cash will be accepted on Delivery and Completion
                </p>
                <p className="text-sm text-gray-700">
                  NOTE: If you wish to proceed with this quote, you will be required to make the full payment upfront
                </p>
                <p className="mt-4 font-semibold text-red-600">Please sign here to confirm.</p>
                <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                  <p>Customer Signature: ....................................................</p>
                  <p>Customer Name: ....................................................</p>
                  <p>Date: ............................</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>

            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPdf}
                className="flex items-center space-x-2"
                disabled={loading || !formData.name || items.every((item) => !item.item)}
              >
                <Download className="h-4 w-4" />
                <span>{loading ? "Generating..." : "Download PDF"}</span>
              </Button>

              <Button 
                type="submit" 
                disabled={isSubmitting || !customerId || total <= 0}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isSubmitting ? "Saving..." : "Save Invoice"}</span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}