"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, FileText, Download, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface QuoteItem {
  id: string;
  item: string;
  description: string;
  colour: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

const VAT_RATE = 0.2;

// Success Modal Component
const SuccessModal = ({
  isOpen,
  onClose,
  onDownloadPdf,
  onGoBack,
  isDownloading,
  approvalStatus,
  userRole,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPdf: () => void;
  onGoBack: () => void;
  isDownloading: boolean;
  approvalStatus: string;
  userRole?: string;
}) => {
  if (!isOpen) return null;

  const isPending = approvalStatus === "pending" && userRole !== "Manager";

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
        <div className="text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Quote Saved Successfully!</h3>

          {isPending ? (
            <>
              <p className="mb-4 text-gray-600">Your quote has been saved and sent to the manager for approval.</p>
              <div className="mb-4 border-l-4 border-yellow-500 bg-yellow-50 p-3 text-left">
                <div className="flex items-start">
                  <AlertCircle className="mt-0.5 mr-2 h-5 w-5 flex-shrink-0 text-yellow-600" />
                  <p className="text-sm text-yellow-700">PDF download will be available after manager approval.</p>
                </div>
              </div>
            </>
          ) : (
            <p className="mb-6 text-gray-600">
              {userRole === "Manager" ? "Quote has been automatically approved." : "Quote is ready."} Would you like to
              download the quote as a PDF?
            </p>
          )}

          <div className="flex flex-col space-y-3">
            {!isPending && (
              <Button onClick={onDownloadPdf} disabled={isDownloading} className="w-full">
                {isDownloading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
            )}

            <Button onClick={onGoBack} variant={!isPending ? "outline" : "default"} className="w-full">
              {!isPending ? "Go Back" : "Close"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    notes: "",
  });

  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: "1",
      item: "",
      description: "",
      colour: "",
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);

  // Approval workflow state
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>("pending");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    const customerIdParam = searchParams.get("customerId");
    const customerName = searchParams.get("customerName");
    const customerAddress = searchParams.get("customerAddress");
    const customerPhone = searchParams.get("customerPhone");
    const customerEmail = searchParams.get("customerEmail");

    if (customerIdParam) {
      setCustomerId(customerIdParam);
      console.log("Customer ID loaded:", customerIdParam);
      console.log("Current user role:", user?.role);
    }

    if (customerName) {
      setFormData({
        date: new Date().toISOString().split("T")[0],
        name: customerName || "",
        address: customerAddress || "",
        phone: customerPhone || "",
        email: customerEmail || "",
        notes: "",
      });
    }
  }, [searchParams, user]);

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

  const handleItemChange = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          if (field === "quantity" || field === "unitPrice") {
            updatedItem.amount = (updatedItem.quantity as number) * (updatedItem.unitPrice as number);
          }

          return updatedItem;
        }
        return item;
      }),
    );
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      item: "",
      description: "",
      colour: "",
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Fixed handleSubmit function with proper error handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      alert("Customer name is required");
      return;
    }

    if (!formData.address?.trim()) {
      alert("Customer address is required");
      return;
    }

    if (total <= 0) {
      alert("Please add at least one item with a valid price");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

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
            quantity: item.quantity,
            unit_price: item.unitPrice,
            amount: item.amount,
          })),
        customer_id: customerId,
      };

      const response = await fetch("https://aztec-interior.onrender.com/quotations", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(formDataToSend),
      });

      // Improved error handling - no undefined variables
      if (!response.ok) {
        let errorMessage = "Failed to save quote";

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

      // Parse successful JSON response
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        throw new Error("Invalid response format from server");
      }

      alert(`Quote #${responseData.id} created successfully!`);
      router.push(`/dashboard/customers/${customerId}`);
    } catch (error) {
      console.error("Error saving quote:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to save quote";
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateQuote = async () => {
    try {
      if (!customerId) {
        setStatusMessage("❌ Error: Customer ID is missing. Please select a customer first.");
        return;
      }

      if (!formData.name || !formData.address) {
        setStatusMessage("❌ Error: Customer name and address are required.");
        return;
      }

      if (items.length === 0 || items.every((item) => !item.item)) {
        setStatusMessage("❌ Error: Please add at least one item to the quote.");
        return;
      }

      setLoading(true);
      setStatusMessage("⏳ Generating quote...");

      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const quoteData = {
        customer_id: customerId,
        customer_name: formData.name,
        customer_address: formData.address,
        customer_phone: formData.phone,
        customer_email: formData.email,
        date: formData.date,
        items: items
          .filter((item) => item.item.trim())
          .map((item) => ({
            item: item.item,
            description: item.description,
            colour: item.colour,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            amount: item.amount,
          })),
        subtotal: subtotal,
        vat: vatAmount,
        total: total,
        notes: formData.notes,
      };

      console.log("Sending quote data:", quoteData);

      const response = await fetch("https://aztec-interior.onrender.com/quotations/generate-quote", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(quoteData),
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate quote";
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
      a.download = `Quote_${formData.name.replace(/\s+/g, "_")}_${formData.date}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatusMessage("✅ Quote generated and downloaded successfully!");

      setTimeout(() => {
        setStatusMessage("");
      }, 5000);
    } catch (error) {
      console.error("Error generating quote:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to generate quote";
      setStatusMessage(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!savedQuoteId) {
      alert("No quote ID available");
      return;
    }

    setIsDownloading(true);

    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {};

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`https://aztec-interior.onrender.com/quotations/${savedQuoteId}/pdf`, {
        method: "GET",
        headers: headers,
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quote_${savedQuoteId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onDownloadPdf={handleDownloadPdf}
        onGoBack={() => {
          setShowSuccessModal(false);
          if (customerId) {
            router.push(`/dashboard/customers/${customerId}`);
          } else {
            router.push("/dashboard/checklists/quotes");
          }
        }}
        isDownloading={isDownloading}
        approvalStatus={approvalStatus}
        userRole={user?.role}
      />

      <form onSubmit={handleSubmit}>
        <div className="sticky top-0 z-10 border-b bg-white">
          <div className="flex max-w-6xl items-center justify-between px-8 py-4">
            <div className="flex items-center space-x-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <h1 className="text-2xl font-semibold text-gray-900">Create Quote</h1>
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
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={3} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Quote Items</CardTitle>
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

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
                      <div className="lg:col-span-2">
                        <Label>Item</Label>
                        <Input
                          value={item.item}
                          onChange={(e) => handleItemChange(item.id, "item", e.target.value)}
                          placeholder="Item name"
                        />
                      </div>
                      <div className="lg:col-span-2">
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
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, "quantity", parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Unit Price (£)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Amount (£)</Label>
                        <Input value={item.amount.toFixed(2)} readOnly className="bg-gray-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
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

          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>

            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateQuote}
                className="flex items-center space-x-2"
                disabled={!formData.name || items.some((item) => !item.item) || !customerId}
              >
                <FileText className="h-4 w-4" />
                <span>Generate Quote</span>
              </Button>

              <Button type="submit" disabled={isSubmitting || !customerId || total <= 0}>
                {isSubmitting ? "Saving..." : "Save Quote"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
