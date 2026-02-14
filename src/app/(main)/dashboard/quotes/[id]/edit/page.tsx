'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Save, Loader2, Trash2, Plus } from 'lucide-react';

interface QuoteItem {
  id: number;
  item: string;
  description: string;
  color: string;
  quantity: number;
  amount: number;
  needs_manual_pricing: boolean;
}

interface Quotation {
  id: number;
  reference_number: string;
  customer_id: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  total: number;
  status: string;
  items: QuoteItem[];
}

export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params?.id as string;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      console.log('✅ Quote loaded:', data);
      setQuotation(data);
    } catch (error) {
      console.error('Error loading quotation:', error);
      alert('❌ Failed to load quotation. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (itemId: number, field: keyof QuoteItem, value: any) => {
    if (!quotation) return;

    const updatedItems = quotation.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });

    // Recalculate total
    const newTotal = updatedItems.reduce(
      (sum, item) => sum + (item.amount * item.quantity),
      0
    );

    setQuotation({
      ...quotation,
      items: updatedItems,
      total: newTotal,
    });
  };

  const addItem = () => {
    if (!quotation) return;

    const newItem: QuoteItem = {
      id: Date.now(),
      item: '',
      description: '',
      color: '',
      quantity: 1,
      amount: 0,
      needs_manual_pricing: true,
    };

    setQuotation({
      ...quotation,
      items: [...quotation.items, newItem],
    });
  };

  const removeItem = async (itemId: number) => {
    if (!quotation) return;
    if (!confirm('Remove this item?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      
      if (itemId < 1000000) {
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
      }

      const updatedItems = quotation.items.filter((item) => item.id !== itemId);
      const newTotal = updatedItems.reduce(
        (sum, item) => sum + (item.amount * item.quantity),
        0
      );

      setQuotation({
        ...quotation,
        items: updatedItems,
        total: newTotal,
      });

      alert('✅ Item removed!');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('❌ Failed to delete item');
    }
  };

  const handleSave = async () => {
    if (!quotation) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');

      console.log('💾 Saving quote:', quotation);

      // Update quotation total
      const quoteResponse = await fetch(
        `https://aztec-interior.onrender.com/quotations/${quoteId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: quotation.status,
            total: quotation.total,
          }),
        }
      );

      if (!quoteResponse.ok) throw new Error('Failed to update quote');

      // Update each existing item
      for (const item of quotation.items) {
        if (item.id < 1000000) {
          console.log(`💾 Updating item ${item.id}:`, item);
          
          await fetch(
            `https://aztec-interior.onrender.com/quotations/${quoteId}/items/${item.id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                item: item.item,
                description: item.description,
                color: item.color,
                quantity: item.quantity,
                amount: item.amount,
              }),
            }
          );
        }
      }

      alert('✅ Quote saved successfully!');
      
      // Redirect to customer page
      if (quotation.customer_id) {
        router.push(`/dashboard/customers/${quotation.customer_id}`);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('❌ Failed to save quote');
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
    <div className="container mx-auto max-w-6xl space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              Edit Quote - {quotation.reference_number}
            </h1>
            <p className="text-muted-foreground">{quotation.customer_name}</p>
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
          <div className="flex items-center justify-between">
            <CardTitle>Quote Items</CardTitle>
            <Button onClick={addItem} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Item</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="min-w-[100px]">Color</TableHead>
                  <TableHead className="w-[80px]">Qty</TableHead>
                  <TableHead className="w-[120px]">Unit Price (£)</TableHead>
                  <TableHead className="w-[120px]">Total (£)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotation.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input
                        value={item.item}
                        onChange={(e) =>
                          handleItemChange(item.id, 'item', e.target.value)
                        }
                        placeholder="Item name"
                        className="min-w-[140px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(item.id, 'description', e.target.value)
                        }
                        placeholder="Description"
                        className="min-w-[180px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.color}
                        onChange={(e) =>
                          handleItemChange(item.id, 'color', e.target.value)
                        }
                        placeholder="Color"
                        className="min-w-[90px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            'quantity',
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-[70px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            'amount',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-[110px]"
                      />
                    </TableCell>
                    <TableCell className="font-semibold">
                      £{(item.amount * item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Total */}
          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between border-t pt-2 text-2xl font-bold">
                <span>Total:</span>
                <span>£{quotation.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}