"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, FileText, Download, CheckCircle } from "lucide-react";

interface QuoteItem {
  id: string;
  item: string;
  description: string;
  colour: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

const VAT_RATE = 0.20; // 20% VAT

// Success Modal Component
const SuccessModal = ({ 
  isOpen, 
  onClose, 
  onDownloadPdf, 
  onGoBack,
  isDownloading 
}: {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPdf: () => void;
  onGoBack: () => void;
  isDownloading: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Quote Created Successfully!
          </h3>
          <p className="text-gray-600 mb-6">
            Your quote has been saved. Would you like to download it as a PDF?
          </p>
          
          <div className="flex flex-col space-y-3">
            <Button 
              onClick={onDownloadPdf}
              disabled={isDownloading}
              className="w-full"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
            
            <Button 
              onClick={onGoBack}
              variant="outline"
              className="w-full"
            >
              Go Back
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
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    address: '',
    phone: '',
    email: '',
    notes: ''
  });
  
  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: '1',
      item: '',
      description: '',
      colour: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);

  // Auto-populate customer data if coming from customer details page
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    const customerName = searchParams.get('customerName');
    const customerAddress = searchParams.get('customerAddress');
    const customerPhone = searchParams.get('customerPhone');
    const customerEmail = searchParams.get('customerEmail');

    if (customerId && customerName) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        name: customerName || '',
        address: customerAddress || '',
        phone: customerPhone || '',
        email: customerEmail || '',
        notes: ''
      });
    }
  }, [searchParams]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = subtotal * VAT_RATE;
  const total = subtotal + vatAmount;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate amount when quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      item: '',
      description: '',
      colour: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const customerId = searchParams.get('customerId');
      if (!customerId) {
        throw new Error("Customer ID is required to save the quotation");
      }

      const quoteData = {
        customer_id: parseInt(customerId),
        total,
        notes: formData.notes,
        items: items.map(item => ({
          item: item.item,
          description: item.description,
          color: item.colour,
          amount: item.amount
        }))
      };

      const response = await fetch('http://127.0.0.1:5000/quotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData),
      });

      if (!response.ok) {
        throw new Error('Failed to save quotation');
      }

      const result = await response.json();
      setSavedQuoteId(result.id);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    
    try {
      const pdfData = {
        date: formData.date,
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
        items: items.map(item => ({
          item: item.item,
          description: item.description,
          colour: item.colour,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount
        })),
        subtotal,
        vatAmount,
        total,
        quoteNumber: savedQuoteId ? `Q${savedQuoteId}` : `Q${Date.now()}`
      };

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pdfData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${pdfData.quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Close modal after successful download
      setTimeout(() => {
        setShowSuccessModal(false);
        router.back();
      }, 1000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGoBack = () => {
    setShowSuccessModal(false);
    router.back();
  };

  const handleGenerateQuote = () => {
    // This will just trigger the same PDF generation as the modal
    handleDownloadPdf();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onDownloadPdf={handleDownloadPdf}
        onGoBack={handleGoBack}
        isDownloading={isDownloading}
      />

      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              onClick={() => router.back()}
              className="flex items-center text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900">Create Quote</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-8 py-6 max-w-6xl">
        {/* Customer Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Items */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quote Items</CardTitle>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="lg:col-span-2">
                      <Label>Item</Label>
                      <Input
                        value={item.item}
                        onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                        placeholder="Item name"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                    <div>
                      <Label>Colour</Label>
                      <Input
                        value={item.colour}
                        onChange={(e) => handleItemChange(item.id, 'colour', e.target.value)}
                        placeholder="Colour"
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Unit Price (£)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>Amount (£)</Label>
                      <Input
                        value={item.amount.toFixed(2)}
                        readOnly
                        className="bg-gray-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quote Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-md ml-auto">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (20%):</span>
                <span>£{vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>£{total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
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
              disabled={!formData.name || items.some(item => !item.item)}
            >
              <FileText className="h-4 w-4" />
              <span>Generate Quote</span>
            </Button>
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Quote'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}