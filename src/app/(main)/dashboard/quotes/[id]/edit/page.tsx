'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Save, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface QuoteItem {
  id: number;
  item: string;
  description: string;
  color: string;
  quantity: number;
  width?: number;
  height?: number;
  depth?: number;
  amount: number;
  needs_manual_pricing: boolean;
  price_list_item_id?: number;
}

interface Quotation {
  id: number;
  reference_number: string;
  customer_id: string;
  customer_name: string;
  total: number;
  status: string;
  notes: string;
  items: QuoteItem[];
}

interface DimensionOption {
  width: number;
  height: number;
  depth: number;
  price: number;
  price_list_item_id: number;
  item_name: string;
}

const DOOR_STYLES = [
  { value: 'standard', label: 'Standard' },
  { value: 'corner', label: 'Corner' },
  { value: 'sliding', label: 'Sliding' },
  { value: 'linen_press', label: 'Linen Press' },
];

// Common wardrobe dimensions
const WARDROBE_WIDTHS = [400, 500, 600, 800, 1000, 1200];

export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const quoteId = params?.id as string;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matchingPrices, setMatchingPrices] = useState<Record<number, DimensionOption[]>>({});

  useEffect(() => {
    if (quoteId) {
      loadQuotation();
    }
  }, [quoteId]);

  const loadQuotation = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `https://aztec-interior.onrender.com/quotations/${quoteId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load quotation');

      const data = await response.json();
      setQuotation(data);
    } catch (error) {
      console.error('Error loading quotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchingPrices = async (itemId: number, itemName: string, style?: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `https://aztec-interior.onrender.com/quotations/${quoteId}/available-prices?item_name=${encodeURIComponent(itemName)}&style=${style || 'standard'}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      setMatchingPrices(prev => ({ ...prev, [itemId]: data.options || [] }));
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const handleDimensionChange = async (
    itemId: number,
    field: 'width' | 'height' | 'depth',
    value: number
  ) => {
    if (!quotation) return;

    const updatedItems = quotation.items.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });

    setQuotation({ ...quotation, items: updatedItems });

    // Try to match price automatically
    const item = updatedItems.find(i => i.id === itemId);
    if (item && item.width && item.height && item.depth) {
      await matchItemPrice(itemId, item.width, item.height, item.depth);
    }
  };

  const matchItemPrice = async (
    itemId: number,
    width: number,
    height: number,
    depth: number
  ) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `https://aztec-interior.onrender.com/quotations/${quoteId}/match-prices`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_id: itemId,
            width,
            height,
            depth,
          }),
        }
      );

      if (!response.ok) {
        console.log('No exact match found for dimensions');
        return;
      }

      const data = await response.json();
      
      if (data.success && quotation) {
        // Update the item with new price
        const updatedItems = quotation.items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              amount: data.new_amount,
              needs_manual_pricing: false,
              price_list_item_id: data.matched_item?.id,
            };
          }
          return item;
        });

        setQuotation({
          ...quotation,
          items: updatedItems,
          total: data.new_total,
        });

        toast({
          title: 'Price Matched!',
          description: `£${data.new_amount.toFixed(2)} - ${data.matched_item?.name}`,
        });
      }
    } catch (error) {
      console.error('Error matching price:', error);
    }
  };

  const handleManualPriceChange = (itemId: number, newPrice: number) => {
    if (!quotation) return;

    const updatedItems = quotation.items.map(item => {
      if (item.id === itemId) {
        return { ...item, amount: newPrice };
      }
      return item;
    });

    const newTotal = updatedItems.reduce(
      (sum, item) => sum + item.amount * item.quantity,
      0
    );

    setQuotation({
      ...quotation,
      items: updatedItems,
      total: newTotal,
    });
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!quotation) return;
    
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `https://aztec-interior.onrender.com/quotations/${quoteId}/items/${itemId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete item');

      // Remove item from local state
      const updatedItems = quotation.items.filter(item => item.id !== itemId);
      const newTotal = updatedItems.reduce(
        (sum, item) => sum + item.amount * item.quantity,
        0
      );

      setQuotation({
        ...quotation,
        items: updatedItems,
        total: newTotal,
      });

      toast({
        title: 'Success',
        description: 'Item deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!quotation) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Update each item
      for (const item of quotation.items) {
        await fetch(
          `https://aztec-interior.onrender.com/quotations/${quoteId}/items/${item.id}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              width: item.width,
              height: item.height,
              depth: item.depth,
              amount: item.amount,
              quantity: item.quantity,
            }),
          }
        );
      }

      // Update quotation total
      await fetch(
        `https://aztec-interior.onrender.com/quotations/${quoteId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            total: quotation.total,
          }),
        }
      );

      toast({
        title: 'Success',
        description: 'Quotation saved successfully',
      });

      router.back();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save quotation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Quotation {quotation.reference_number}</h1>
            <p className="text-muted-foreground">Customer: {quotation.customer_name}</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Items - Set Dimensions to Auto-Price</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Width (mm)</TableHead>
                <TableHead>Height (mm)</TableHead>
                <TableHead>Depth (mm)</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price (£)</TableHead>
                <TableHead>Line Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotation.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.item}</TableCell>
                  <TableCell className="text-sm">{item.description}</TableCell>
                  
                  {/* Width */}
                  <TableCell>
                    <Select
                      value={item.width?.toString() || ''}
                      onValueChange={(value) =>
                        handleDimensionChange(item.id, 'width', parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Width" />
                      </SelectTrigger>
                      <SelectContent>
                        {WARDROBE_WIDTHS.map((w) => (
                          <SelectItem key={w} value={w.toString()}>
                            {w}mm
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Height */}
                  <TableCell>
                    <Input
                      type="number"
                      value={item.height || ''}
                      onChange={(e) =>
                        handleDimensionChange(item.id, 'height', parseInt(e.target.value) || 0)
                      }
                      className="w-24"
                      placeholder="Height"
                    />
                  </TableCell>

                  {/* Depth */}
                  <TableCell>
                    <Input
                      type="number"
                      value={item.depth || ''}
                      onChange={(e) =>
                        handleDimensionChange(item.id, 'depth', parseInt(e.target.value) || 0)
                      }
                      className="w-24"
                      placeholder="Depth"
                    />
                  </TableCell>

                  {/* Quantity */}
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const newQty = parseInt(e.target.value) || 1;
                        const updatedItems = quotation.items.map(i =>
                          i.id === item.id ? { ...i, quantity: newQty } : i
                        );
                        const newTotal = updatedItems.reduce(
                          (sum, i) => sum + i.amount * i.quantity,
                          0
                        );
                        setQuotation({ ...quotation, items: updatedItems, total: newTotal });
                      }}
                      className="w-16"
                      min={1}
                    />
                  </TableCell>

                  {/* Price */}
                  <TableCell>
                    <Input
                      type="number"
                      value={item.amount}
                      onChange={(e) =>
                        handleManualPriceChange(item.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-24"
                      step="0.01"
                    />
                  </TableCell>

                  {/* Line Total */}
                  <TableCell className="font-semibold">
                    £{(item.amount * item.quantity).toFixed(2)}
                  </TableCell>

                  {/* Delete Button */}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Total */}
          <div className="mt-6 flex justify-end">
            <Card className="w-64">
              <CardContent className="pt-6">
                <div className="flex justify-between text-2xl font-bold">
                  <span>Total:</span>
                  <span>£{quotation.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}