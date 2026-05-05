"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aztec-interior.onrender.com';

interface PriceListItem {
  pricelist_id: number;
  item_code: string;
  item_name: string;
  description: string;
  price: number;
  door_type: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  category: string;
}

interface ProductCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  onProductMatch: (product: PriceListItem) => void;
  doorType?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Product Code Input with Auto-complete and Dimension Auto-fill
 * 
 * When user types a product code (e.g., "40R"), this component:
 * 1. Searches the PriceList_Master for matching items
 * 2. Auto-fills width, height, depth
 * 3. Shows the matched price
 * 4. If door_type is specified, filters for that specific variation
 */
export function ProductCodeInput({
  value,
  onChange,
  onProductMatch,
  doorType,
  label = "Product Code",
  placeholder = "Enter code (e.g., 40R, 50BRS)",
  disabled = false
}: ProductCodeInputProps) {
  const [loading, setLoading] = useState(false);
  const [matchedProduct, setMatchedProduct] = useState<PriceListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced search - wait 500ms after user stops typing
  useEffect(() => {
    if (!value || value.length < 2) {
      setMatchedProduct(null);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      searchProduct(value);
    }, 500);

    return () => clearTimeout(timer);
  }, [value, doorType]);

  const searchProduct = async (code: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Build query URL
      let url = `${BACKEND_URL}/pricelist/search?code=${encodeURIComponent(code.trim())}`;
      if (doorType && doorType !== 'Base Cabinet Only') {
        url += `&door_type=${encodeURIComponent(doorType)}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          setError(`No pricing found for code: ${code}`);
          setMatchedProduct(null);
          return;
        }
        throw new Error("Failed to search product");
      }

      const data = await response.json();

      if (data.found && data.items && data.items.length > 0) {
        // Take the first matching item
        const product = data.items[0];
        setMatchedProduct(product);
        setError(null);
        
        // Notify parent component
        onProductMatch(product);
      } else {
        setError(`No pricing found for code: ${code}`);
        setMatchedProduct(null);
      }
    } catch (err) {
      console.error("Error searching product:", err);
      setError("Failed to search product");
      setMatchedProduct(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="product-code">{label}</Label>
      
      <div className="relative">
        <Input
          id="product-code"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        
        {/* Loading spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
        
        {/* Success checkmark */}
        {!loading && matchedProduct && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Check className="h-4 w-4 text-green-600" />
          </div>
        )}
      </div>

      {/* Matched Product Info */}
      {matchedProduct && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-green-900">{matchedProduct.item_name}</span>
            <Badge variant="outline" className="bg-white">
              £{matchedProduct.price.toFixed(2)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs text-green-700">
            {matchedProduct.width && (
              <div>
                <span className="font-medium">Width:</span> {matchedProduct.width}mm
              </div>
            )}
            {matchedProduct.height && (
              <div>
                <span className="font-medium">Height:</span> {matchedProduct.height}mm
              </div>
            )}
            {matchedProduct.depth && (
              <div>
                <span className="font-medium">Depth:</span> {matchedProduct.depth}mm
              </div>
            )}
          </div>
          
          {matchedProduct.door_type && (
            <div className="mt-2 text-xs text-green-700">
              <span className="font-medium">Door Type:</span> {matchedProduct.door_type}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          {error}
        </div>
      )}
    </div>
  );
}

export default ProductCodeInput;