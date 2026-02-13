'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import { BACKEND_URL } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Constants
// =============================================================================

const WARDROBE_WIDTHS = [400, 500, 600, 800, 1000, 1200];

// =============================================================================
// Helper Functions
// =============================================================================

const extractDoorStyleFromDescription = (description: string): string => {
  if (!description) return 'standard';
  const descLower = description.toLowerCase().trim();
  if (descLower.startsWith('slab')) return 'slab';
  if (descLower.startsWith('vinyl')) return 'vinyl';
  if (descLower.startsWith('glazed')) return 'glazed';
  if (descLower.startsWith('shaker')) return 'shaker';
  if (descLower.includes('slab')) return 'slab';
  if (descLower.includes('vinyl')) return 'vinyl';
  if (descLower.includes('glazed')) return 'glazed';
  if (descLower.includes('shaker')) return 'shaker';
  return 'standard';
};

// =============================================================================
// Main Component
// =============================================================================

export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params?.id as string;

  // =============================================================================
  // Reactive State
  // =============================================================================

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matchingPrices, setMatchingPrices] = useState<Record<number, DimensionOption[]>>({});
  const [pricesLoading, setPricesLoading] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Refs
  const loadedPriceOptionsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);

  // =============================================================================
  // Helper: Calculate Total from Items
  // =============================================================================
  
  const recalcTotal = useCallback((items: QuoteItem[]): number => {
    return items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
  }, []);

  // =============================================================================
  // Load Quotation
  // =============================================================================

  useEffect(() => {
    const loadQuotation = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(
          `${BACKEND_URL}/quotations/${quoteId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load quotation');
        }

        const data = await response.json();
        setQuotation(data);
      } catch (err) {
        console.error('❌ Error loading quotation:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quotation');
      } finally {
        setLoading(false);
      }
    };

    if (quoteId) {
      loadQuotation();
    }
  }, [quoteId]);

  // =============================================================================
  // Fetch Matching Prices (Reactive)
  // =============================================================================

  const fetchMatchingPrices = useCallback(async (
    itemId: number,
    itemName: string,
    style?: string
  ): Promise<DimensionOption[]> => {
    try {
      const token = localStorage.getItem('auth_token');
      
      setPricesLoading(prev => ({ ...prev, [itemId]: true }));

      const response = await fetch(
        `${BACKEND_URL}/quotations/${quoteId}/available-prices?item_name=${encodeURIComponent(itemName)}&style=${style || 'standard'}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const options = data.options || [];
      
      setMatchingPrices(prev => ({ ...prev, [itemId]: options }));
      return options;
    } catch (error) {
      console.error('❌ Error fetching prices:', error);
      return [];
    } finally {
      setPricesLoading(prev => ({ ...prev, [itemId]: false }));
    }
  }, [quoteId]);

  // =============================================================================
  // Auto-Price Items on Load (Reactive Effect)
  // =============================================================================

  useEffect(() => {
    if (!quotation || !isFirstLoadRef.current) return;
    
    isFirstLoadRef.current = false;

    const autoPriceItems = async () => {
      let hasUpdates = false;
      
      for (const item of quotation.items) {
        if (item.amount > 0) continue; // Skip already priced items

        const doorStyle = extractDoorStyleFromDescription(item.description);
        const options = await fetchMatchingPrices(item.id, item.item, doorStyle);

        if (options.length > 0) {
          // Apply first (cheapest) option automatically
          const firstOption = options[0];
          
          setQuotation(prev => {
            if (!prev) return prev;
            
            const updatedItems = prev.items.map(i => {
              if (i.id === item.id) {
                return {
                  ...i,
                  amount: firstOption.price,
                  price_list_item_id: firstOption.price_list_item_id,
                };
              }
              return i;
            });

            const newTotal = recalcTotal(updatedItems);
            
            return { ...prev, items: updatedItems, total: newTotal };
          });
          
          hasUpdates = true;
        }
      }
    };

    autoPriceItems();
  }, [quotation, fetchMatchingPrices]);

  // =============================================================================
  // Dimension Change Handler (Reactive)
  // =============================================================================

  const handleDimensionChange = useCallback(async (
    itemId: number,
    field: 'width' | 'height' | 'depth',
    value: number | undefined
  ) => {
    setQuotation(prev => {
      if (!prev) return prev;

      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          return { ...item, [field]: value };
        }
        return item;
      });

      const newTotal = recalcTotal(updatedItems);

      return { ...prev, items: updatedItems, total: newTotal };
    });

    // Fetch prices reactively when all dimensions are present
    const currentItem = quotation?.items.find(i => i.id === itemId);
    if (!currentItem) return;

    const newItem = { ...currentItem, [field]: value };
    const hasAllDimensions = 
      newItem.width && newItem.height && newItem.depth &&
      newItem.width > 0 && newItem.height > 0 && newItem.depth > 0;

    if (hasAllDimensions && !loadedPriceOptionsRef.current.has(itemId)) {
      loadedPriceOptionsRef.current.add(itemId);
      
      const doorStyle = extractDoorStyleFromDescription(newItem.description);
      const options = await fetchMatchingPrices(itemId, newItem.item, doorStyle);

      if (options.length > 0) {
        // Try exact match first
        const match = options.find(
          opt => opt.width === newItem.width && 
                 opt.height === newItem.height && 
                 opt.depth === newItem.depth
        );

        if (match) {
          setQuotation(prev => {
            if (!prev) return prev;

            const updatedItems = prev.items.map(item => {
              if (item.id === itemId) {
                return {
                  ...item,
                  amount: match.price,
                  price_list_item_id: match.price_list_item_id,
                };
              }
              return item;
            });

            const newTotal = recalcTotal(updatedItems);

            return { ...prev, items: updatedItems, total: newTotal };
          });
          return;
        }

        // Fallback: try backend matching
        try {
          const token = localStorage.getItem('auth_token');
          const response = await fetch(
            `${BACKEND_URL}/quotations/${quoteId}/match-prices`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                item_id: itemId,
                width: newItem.width,
                height: newItem.height,
                depth: newItem.depth,
                door_style: doorStyle,
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setQuotation(prev => {
                if (!prev) return prev;

                const updatedItems = prev.items.map(item => {
                  if (item.id === itemId) {
                    return {
                      ...item,
                      amount: data.new_amount,
                      price_list_item_id: data.matched_item?.id,
                    };
                  }
                  return item;
                });

                const newTotal = recalcTotal(updatedItems);

                return { ...prev, items: updatedItems, total: newTotal };
              });
            }
          }
        } catch (err) {
          console.error('❌ Error matching price:', err);
        }
      }
    }
  }, [quotation, quoteId, fetchMatchingPrices]);

  // =============================================================================
  // Quantity Change Handler (Reactive)
  // =============================================================================

  const handleQuantityChange = useCallback((itemId: number, newQuantity: number) => {
    setQuotation(prev => {
      if (!prev) return prev;

      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: Math.max(1, newQuantity) };
        }
        return item;
      });

      const newTotal = recalcTotal(updatedItems);

      return { ...prev, items: updatedItems, total: newTotal };
    });
  }, [recalcTotal]);

  // =============================================================================
  // Manual Price Change Handler (Reactive)
  // =============================================================================

  const handleManualPriceChange = useCallback((itemId: number, newPrice: number) => {
    setQuotation(prev => {
      if (!prev) return prev;

      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          return { ...item, amount: newPrice };
        }
        return item;
      });

      const newTotal = recalcTotal(updatedItems);

      return { ...prev, items: updatedItems, total: newTotal };
    });
  }, [recalcTotal]);

  // =============================================================================
  // Delete Item Handler
  // =============================================================================

  const handleDeleteItem = useCallback(async (itemId: number) => {
    if (!quotation) return;
    
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${BACKEND_URL}/quotations/${quoteId}/items/${itemId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setQuotation(prev => {
        if (!prev) return prev;

        const updatedItems = prev.items.filter(item => item.id !== itemId);
        const newTotal = recalcTotal(updatedItems);

        return { ...prev, items: updatedItems, total: newTotal };
      });
    } catch (err) {
      console.error('❌ Error deleting item:', err);
      alert('❌ Failed to delete item. Please try again.');
    }
  }, [quotation, quoteId, recalcTotal]);

  // =============================================================================
  // Save Handler
  // =============================================================================

  const handleSave = useCallback(async () => {
    if (!quotation) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Update each item
      for (const item of quotation.items) {
        const response = await fetch(
          `${BACKEND_URL}/quotations/${quoteId}/items/${item.id}`,
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

        if (!response.ok) {
          throw new Error(`Failed to update item: ${item.item}`);
        }
      }

      // Update quotation total
      const totalResponse = await fetch(
        `${BACKEND_URL}/quotations/${quoteId}`,
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

      if (!totalResponse.ok) {
        throw new Error('Failed to update quotation total');
      }

      // Show success message and stay on page
      alert('✅ Quotation saved successfully!');
      
      // Optionally refresh the page to get updated data
      window.location.reload();
    } catch (err) {
      console.error('❌ Error saving:', err);
      alert('❌ Failed to save quotation. Please check console for details.');
    } finally {
      setSaving(false);
    }
  }, [quotation, quoteId, router]);

  // =============================================================================
  // Memoized Calculations
  // =============================================================================

  const lineTotals = useMemo(() => {
    if (!quotation) return {};
    
    return quotation.items.reduce((acc, item) => {
      acc[item.id] = item.amount * item.quantity;
      return acc;
    }, {} as Record<number, number>);
  }, [quotation]);

  // =============================================================================
  // Render Loading State
  // =============================================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading quotation...</span>
      </div>
    );
  }

  // =============================================================================
  // Render Error State
  // =============================================================================

  if (error || !quotation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Quotation not found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error || `Quote ID: ${quoteId || 'Missing'}`}
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // =============================================================================
  // Render Main UI
  // =============================================================================

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
          <CardTitle>Quote Items</CardTitle>
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
              {quotation.items.map((item) => {
                const isLoading = pricesLoading[item.id];
                const lineTotal = lineTotals[item.id];
                
                return (
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
                          handleDimensionChange(
                            item.id,
                            'height',
                            e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                          )
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
                          handleDimensionChange(
                            item.id,
                            'depth',
                            e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                          )
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
                          handleQuantityChange(item.id, newQty);
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
                        placeholder="0.00"
                      />
                    </TableCell>

                    {/* Line Total - Reactive */}
                    <TableCell className="font-semibold">
                      {isLoading ? (
                        <span className="flex items-center text-yellow-600">
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Calculating...
                        </span>
                      ) : (
                        `£${lineTotal.toFixed(2)}`
                      )}
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
                );
              })}
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
