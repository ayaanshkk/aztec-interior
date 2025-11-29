"use client";

import { useState, useEffect } from "react";
import { Search, Plus, ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fetchWithAuth } from "@/lib/api"; // Import the centralized API helper

interface Product {
  id: number;
  model_code: string;
  name: string;
  brand?: { name: string };
  category?: { name: string };
  series?: string;
  pricing: {
    base_price?: number;
    low_tier_price?: number;
    mid_tier_price?: number;
    high_tier_price?: number;
  };
  color_options?: string[];
  energy_rating?: string;
  warranty_years?: number;
  in_stock: boolean;
  lead_time_weeks?: number;
}

interface ProductSelection {
  product: Product;
  quantity: number;
  tier: "low" | "mid" | "high";
  selected_color?: string;
  custom_price?: number;
  notes?: string;
}

interface ProductSelectorProps {
  onProductSelect: (selection: ProductSelection) => void;
  selectedTier?: "low" | "mid" | "high";
  trigger?: React.ReactNode;
}

export default function ProductSelector({ onProductSelect, selectedTier = "mid", trigger }: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [tier, setTier] = useState<"low" | "mid" | "high">(selectedTier);
  const [selectedColor, setSelectedColor] = useState("");
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Search products with debouncing
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchProducts();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchProducts = async () => {
    try {
      setLoading(true);
      // Use centralized fetchWithAuth
      const response = await fetchWithAuth(`products/search?q=${encodeURIComponent(searchTerm)}&limit=20`);
      if (response.ok) {
        const products = await response.json();
        setSearchResults(products);
      }
    } catch (error) {
      console.error("Error searching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCustomPrice(null);
    setSelectedColor(product.color_options?.[0] || "");
    setNotes("");
  };

  const getProductPrice = (product: Product, pricesTier: string) => {
    const pricing = product.pricing;
    switch (pricesTier) {
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

  const handleAddProduct = () => {
    if (!selectedProduct) return;

    const selection: ProductSelection = {
      product: selectedProduct,
      quantity,
      tier,
      selected_color: selectedColor || undefined,
      custom_price: customPrice || undefined,
      notes: notes || undefined,
    };

    onProductSelect(selection);

    // Reset form
    setSelectedProduct(null);
    setQuantity(1);
    setSelectedColor("");
    setCustomPrice(null);
    setNotes("");
    setSearchTerm("");
    setSearchResults([]);
    setOpen(false);
  };

  const formatPrice = (price?: number) => {
    if (!price) return "—";
    return `£${price.toFixed(2)}`;
  };

  const currentPrice = selectedProduct ? getProductPrice(selectedProduct, tier) : null;
  const totalPrice = customPrice ? customPrice * quantity : currentPrice ? currentPrice * quantity : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Product to Quote</DialogTitle>
          <DialogDescription>Search and select a product from your appliance catalog</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Search */}
          <div className="space-y-2">
            <Label>Search Products</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search by model code, name, or series..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Search Results */}
          {loading && (
            <div className="py-4 text-center">
              <div className="border-primary mx-auto h-6 w-6 animate-spin rounded-full border-b-2"></div>
              <p className="text-muted-foreground mt-2 text-sm">Searching...</p>
            </div>
          )}

          {searchResults.length > 0 && !selectedProduct && (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              <Label>Search Results</Label>
              {searchResults.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => selectProduct(product)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="text-muted-foreground h-4 w-4" />
                          <span className="font-medium">{product.model_code}</span>
                          <Badge variant={product.in_stock ? "outline" : "destructive"} className="text-xs">
                            {product.in_stock ? "In Stock" : "Out of Stock"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">{product.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {product.brand?.name} • {product.category?.name}
                          {product.series && ` • ${product.series}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(product.pricing.base_price)}</p>
                        {product.energy_rating && (
                          <p className="text-muted-foreground text-xs">Energy: {product.energy_rating}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Selected Product Details */}
          {selectedProduct && (
            <div className="space-y-4">
              <Separator />

              <div className="space-y-3">
                <Label>Selected Product</Label>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{selectedProduct.model_code}</h4>
                        <Badge variant={selectedProduct.in_stock ? "outline" : "destructive"}>
                          {selectedProduct.in_stock ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </div>
                      <p className="text-sm">{selectedProduct.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {selectedProduct.brand?.name} • {selectedProduct.category?.name}
                        {selectedProduct.series && ` • ${selectedProduct.series}`}
                      </p>
                      {selectedProduct.lead_time_weeks && (
                        <p className="text-muted-foreground text-xs">
                          Lead time: {selectedProduct.lead_time_weeks} weeks
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Configuration */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier">Price Tier</Label>
                  <Select value={tier} onValueChange={(value: "low" | "mid" | "high") => setTier(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - {formatPrice(selectedProduct.pricing.low_tier_price)}</SelectItem>
                      <SelectItem value="mid">Mid - {formatPrice(selectedProduct.pricing.mid_tier_price)}</SelectItem>
                      <SelectItem value="high">
                        High - {formatPrice(selectedProduct.pricing.high_tier_price)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedProduct.color_options && selectedProduct.color_options.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Select value={selectedColor} onValueChange={setSelectedColor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProduct.color_options.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="custom-price">Custom Price (Optional)</Label>
                  <Input
                    id="custom-price"
                    type="number"
                    step="0.01"
                    placeholder={formatPrice(currentPrice ?? undefined)}
                    value={customPrice || ""}
                    onChange={(e) => setCustomPrice(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Additional notes or specifications..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Price Summary */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Unit Price ({tier} tier):</span>
                      <span>{formatPrice(customPrice ?? currentPrice ?? undefined)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span>{quantity}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>{formatPrice(totalPrice)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddProduct} disabled={!selectedProduct} className="min-w-24">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
