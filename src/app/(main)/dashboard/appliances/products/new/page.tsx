"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Edit, Package, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter, useSearchParams } from "next/navigation";
import ProductSelector from "./ProductSelector";
import { fetchWithAuth } from "@/lib/api"; // Import the centralized API helper

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface QuoteItem {
  id?: string;
  type: "product" | "custom";

  // Product items
  product_id?: number;
  product?: {
    id: number;
    model_code: string;
    name: string;
    brand?: { name: string };
    category?: { name: string };
  };
  quantity?: number;
  tier_used?: "low" | "mid" | "high";
  selected_color?: string;

  // Common fields
  item: string;
  description?: string;
  color?: string;
  amount: number;
  custom_notes?: string;
}

interface ProductSelection {
  product: any;
  quantity: number;
  tier: "low" | "mid" | "high";
  selected_color?: string;
  custom_price?: number;
  notes?: string;
}

export default function EnhancedQuotationBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams?.get("customerId");
  const jobId = searchParams?.get("jobId");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || "");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [notes, setNotes] = useState("");
  const [selectedTier, setSelectedTier] = useState<"low" | "mid" | "high">("mid");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCustomers();
    if (customerId) {
      loadCustomer(customerId);
    }
  }, [customerId]);

  const loadCustomers = async () => {
    try {
      // Use centralized fetchWithAuth
      const response = await fetchWithAuth("customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const loadCustomer = async (id: string) => {
    try {
      // Use centralized fetchWithAuth
      const response = await fetchWithAuth(`customers/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
        setSelectedCustomerId(id);
      }
    } catch (error) {
      console.error("Error loading customer:", error);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const selectedCustomer = customers.find((c) => c.id.toString() === customerId);
    setCustomer(selectedCustomer || null);
  };

  const handleProductSelect = (selection: ProductSelection) => {
    const newItem: QuoteItem = {
      id: `product-${Date.now()}`,
      type: "product",
      product_id: selection.product.id,
      product: {
        id: selection.product.id,
        model_code: selection.product.model_code,
        name: selection.product.name,
        brand: selection.product.brand,
        category: selection.product.category,
      },
      quantity: selection.quantity,
      tier_used: selection.tier,
      selected_color: selection.selected_color,
      item: `${selection.product.brand?.name || ""} ${selection.product.model_code}`.trim(),
      description: selection.product.name,
      color: selection.selected_color,
      amount: selection.custom_price || getProductPrice(selection.product, selection.tier),
      custom_notes: selection.notes,
    };

    setItems((prev) => [...prev, newItem]);
  };

  const getProductPrice = (product: any, tier: string) => {
    const pricing = product.pricing;
    switch (tier) {
      case "low":
        return pricing.low_tier_price || pricing.base_price;
      case "mid":
        return pricing.mid_tier_price || pricing.base_price;
      case "high":
        return pricing.high_tier_price || pricing.base_price;
      default:
        return pricing.base_price;
    }
  };

  const addCustomItem = () => {
    const newItem: QuoteItem = {
      id: `custom-${Date.now()}`,
      type: "custom",
      item: "",
      description: "",
      color: "",
      amount: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateLineTotal = (item: QuoteItem) => {
    if (item.type === "product" && item.quantity) {
      return item.amount * item.quantity;
    }
    return item.amount;
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  const calculateVAT = (subtotal: number) => {
    return subtotal * 0.2; // 20% VAT
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const vat = calculateVAT(subtotal);
    return subtotal + vat;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedCustomerId) {
      newErrors.customer = "Please select a customer";
    }

    if (items.length === 0) {
      newErrors.items = "Please add at least one item";
    }

    // Validate each item
    items.forEach((item, index) => {
      if (!item.item.trim()) {
        newErrors[`item-${index}`] = "Item name is required";
      }
      if (item.amount <= 0) {
        newErrors[`amount-${index}`] = "Amount must be greater than 0";
      }
      if (item.type === "product" && (!item.quantity || item.quantity <= 0)) {
        newErrors[`quantity-${index}`] = "Quantity must be greater than 0";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const quotationData = {
        customer_id: parseInt(selectedCustomerId),
        total: calculateTotal(),
        notes,
        items: items.map((item) => {
          if (item.type === "product") {
            return {
              type: "product",
              product_id: item.product_id,
              quantity: item.quantity,
              quoted_price: item.amount,
              tier_used: item.tier_used,
              selected_color: item.selected_color,
              custom_notes: item.custom_notes,
              item: item.item,
              description: item.description,
              color: item.color,
              amount: calculateLineTotal(item),
            };
          } else {
            return {
              type: "custom",
              item: item.item,
              description: item.description,
              color: item.color,
              amount: item.amount,
            };
          }
        }),
      };

      console.log("Submitting quotation:", quotationData);

      // Use centralized fetchWithAuth
      const response = await fetchWithAuth("quotations", {
        method: "POST",
        body: JSON.stringify(quotationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create quotation");
      }

      const newQuote = await response.json();

      // Redirect based on context
      if (jobId) {
        router.push(`/dashboard/jobs/${jobId}?quoteCreated=true`);
      } else if (customerId) {
        router.push(`/dashboard/customers/${customerId}?quoteCreated=true`);
      } else {
        router.push(`/dashboard/quotes/${newQuote.id}?success=created`);
      }
    } catch (error) {
      console.error("Error creating quotation:", error);
      setErrors({ submit: error instanceof Error ? error.message : "Failed to create quotation" });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const subtotal = calculateSubtotal();
  const vat = calculateVAT(subtotal);
  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-semibold text-gray-900">Create Quotation</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Tier: {selectedTier.toUpperCase()}</Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={selectedCustomerId} onValueChange={handleCustomerChange} disabled={!!customerId}>
                    <SelectTrigger className={errors.customer ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} - {customer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customer && <p className="text-sm text-red-500">{errors.customer}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Default Price Tier</Label>
                  <Select
                    value={selectedTier}
                    onValueChange={(value: "low" | "mid" | "high") => setSelectedTier(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Tier</SelectItem>
                      <SelectItem value="mid">Mid Tier</SelectItem>
                      <SelectItem value="high">High Tier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {customer && (
                <div className="mt-4 rounded-lg bg-blue-50 p-4">
                  <h4 className="font-medium text-blue-900">Customer Information</h4>
                  <div className="mt-2 grid grid-cols-1 gap-4 text-sm text-blue-800 md:grid-cols-2">
                    <div>Email: {customer.email}</div>
                    <div>Phone: {customer.phone}</div>
                    <div className="md:col-span-2">Address: {customer.address}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Quote Items</CardTitle>
                <div className="flex gap-2">
                  <ProductSelector
                    onProductSelect={handleProductSelect}
                    selectedTier={selectedTier}
                    trigger={
                      <Button type="button" variant="outline">
                        <Package className="mr-2 h-4 w-4" />
                        Add Product
                      </Button>
                    }
                  />
                  <Button type="button" variant="outline" onClick={addCustomItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom Item
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {errors.items && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{errors.items}</AlertDescription>
                </Alert>
              )}

              {items.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No items added yet</p>
                  <p className="text-sm">Add products from your catalog or create custom items</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                placeholder="Item name"
                                value={item.item}
                                onChange={(e) => updateItem(item.id!, "item", e.target.value)}
                                className={errors[`item-${index}`] ? "border-red-500" : ""}
                              />
                              {item.type === "product" && (
                                <div className="flex items-center gap-2">
                                  <Package className="h-3 w-3" />
                                  <span className="text-muted-foreground text-xs">{item.product?.model_code}</span>
                                  {item.tier_used && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.tier_used.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {errors[`item-${index}`] && (
                                <p className="text-xs text-red-500">{errors[`item-${index}`]}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Description"
                              value={item.description || ""}
                              onChange={(e) => updateItem(item.id!, "description", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Color"
                              value={item.color || ""}
                              onChange={(e) => updateItem(item.id!, "color", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            {item.type === "product" ? (
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity || 1}
                                onChange={(e) => updateItem(item.id!, "quantity", parseInt(e.target.value) || 1)}
                                className={errors[`quantity-${index}`] ? "w-20 border-red-500" : "w-20"}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {errors[`quantity-${index}`] && (
                              <p className="mt-1 text-xs text-red-500">{errors[`quantity-${index}`]}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.amount}
                              onChange={(e) => updateItem(item.id!, "amount", parseFloat(e.target.value) || 0)}
                              className={errors[`amount-${index}`] ? "w-24 border-red-500" : "w-24"}
                            />
                            {errors[`amount-${index}`] && (
                              <p className="mt-1 text-xs text-red-500">{errors[`amount-${index}`]}</p>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{formatPrice(calculateLineTotal(item))}</TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id!)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quote Summary */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Quote Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="text-muted-foreground flex justify-between">
                    <span>VAT (20%):</span>
                    <span>{formatPrice(vat)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any additional notes or terms for this quotation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Error Display */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Submit Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading ? "Creating..." : "Create Quotation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
