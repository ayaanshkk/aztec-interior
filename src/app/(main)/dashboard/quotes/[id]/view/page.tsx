"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Edit } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.aztec.techmynt.com';

export default function ViewQuotePage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const [quotation, setQuotation] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vatPercentage, setVatPercentage] = useState<number>(20);

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
        console.log("📋 Quotation data received:", data);
        console.log("📋 Raw items array:", data.items);
        console.log("📋 Number of items:", data.items?.length);
        
        // Debug each item
        data.items?.forEach((item: any, idx: number) => {
          console.log(`Item ${idx}:`, {
            item_name: item.item_name,
            item: item.item,
            description: item.description,
            amount: item.amount,
            isEmpty: !item.item_name && !item.item && !item.description && (!item.amount || item.amount === 0)
          });
        });
        
        setQuotation(data);
        setItems(data.items || []);
        
        // Load VAT percentage if saved
        if (data.vat_percentage !== undefined && data.vat_percentage !== null) {
          setVatPercentage(data.vat_percentage);
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

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    router.push(`/dashboard/quotes/${quoteId}/edit`);
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
  const vat = subtotal * (vatPercentage / 100);
  const total = subtotal + vat;

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Hidden when printing */}
      <div className="border-b bg-gray-50 px-8 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Quotation {quotation.reference_number}</h1>
              <p className="text-sm text-gray-600">Customer: {quotation.customer_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEdit} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Quote
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={() => window.open(`${BACKEND_URL}/quotations/${quoteId}/pdf`, '_blank')}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Quotation Content */}
      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* Company Header */}
        <div className="flex items-center justify-between border-b-2 border-gray-900 pb-7 mb-10">
          <Image src="/images/logo-full.png" alt="Atelier Luxe Interiors" width={340} height={92} className="object-contain" />
          <div className="text-right text-xs leading-5 text-gray-600">
            <p className="font-semibold text-sm text-gray-900 mb-1">Atelier Luxe Interiors Ltd</p>
            <p>127c Barkby Road, Leicester, LE4 9LG</p>
            <p>M: 07821 328849</p>
            <p>accounts@atelierluxe.co.uk</p>
          </div>
        </div>

        {/* Document title */}
        <div className="flex items-start justify-between mb-8">
          <h1 className="text-lg font-semibold tracking-widest uppercase text-gray-900">Quotation</h1>
          <p className="text-xs text-gray-400">Registered in England No. 17200862</p>
        </div>

        {/* Customer Information */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border-b border-gray-100 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400" style={{ width: '20%' }}>DATE:</td>
                <td className="border-b border-gray-100 px-4 py-2.5">
                  {quotation.created_at ? new Date(quotation.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
                </td>
              </tr>
              <tr>
                <td className="border-b border-gray-100 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">NAME:</td>
                <td className="border-b border-gray-100 px-4 py-2.5">
                  {quotation.customer_name || quotation.client_company_name || quotation.client_name || '—'}
                </td>
              </tr>
              <tr>
                <td className="border-b border-gray-100 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">ADDRESS:</td>
                <td className="border-b border-gray-100 px-4 py-2.5">
                  {quotation.customer_address || quotation.client_address || '—'}
                </td>
              </tr>
              <tr>
                <td className="border-b border-gray-100 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">TEL:</td>
                <td className="border-b border-gray-100 px-4 py-2.5">
                  {quotation.customer_phone || quotation.client_phone || '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white">
                  <th className="border-b border-gray-100 px-4 py-2.5 text-left font-bold">ITEM</th>
                  <th className="border-b border-gray-100 px-4 py-2.5 text-left font-bold">DESCRIPTION</th>
                  <th className="border-b border-gray-100 px-4 py-2.5 text-left font-bold">COLOUR</th>
                  <th className="border-b border-gray-100 px-4 py-2.5 text-center font-bold">QTY</th>
                  <th className="border-b border-gray-100 px-4 py-2.5 text-right font-bold">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {items.filter(item => {
                  // Filter out completely empty items
                  const hasItem = item.item?.trim() || item.item_name?.trim();
                  const hasDescription = item.description?.trim();
                  const hasAmount = item.amount && parseFloat(item.amount) > 0;
                  
                  // Only show items that have at least an item name OR description OR amount > 0
                  return hasItem || hasDescription || hasAmount;
                }).map((item, index) => (
                  <tr key={index}>
                    <td className="border-b border-gray-100 px-4 py-2.5">{item.item || item.item_name || '—'}</td>
                    <td className="border-b border-gray-100 px-4 py-2.5">{item.description || '—'}</td>
                    <td className="border-b border-gray-100 px-4 py-2.5">{item.color || item.colour || '—'}</td>
                    <td className="border-b border-gray-100 px-4 py-2.5 text-center">{item.quantity || 1}</td>
                    <td className="border-b border-gray-100 px-4 py-2.5 text-right font-semibold">
                      {formatCurrency((item.amount || 0) * (item.quantity || 1))}
                    </td>
                  </tr>
                ))}
                
                {items.filter(item => {
                  const hasItem = item.item?.trim() || item.item_name?.trim();
                  const hasDescription = item.description?.trim();
                  const hasAmount = item.amount && parseFloat(item.amount) > 0;
                  return hasItem || hasDescription || hasAmount;
                }).length === 0 && (
                  <tr>
                    <td colSpan={5} className="border-b border-gray-100 px-3 py-8 text-center text-gray-500">
                      No items in this quotation
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
                <td className="border-b border-gray-100 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">SUB TOTAL</td>
                <td className="border-b border-gray-100 px-4 py-2.5 text-right">{formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td className="border-b border-gray-100 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">EX VAT TOTAL</td>
                <td className="border-b border-gray-100 px-4 py-2.5 text-right">{formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td className="border-b border-gray-100 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">VAT ({vatPercentage}%)</td>
                <td className="border-b border-gray-100 px-4 py-2.5 text-right">{formatCurrency(vat)}</td>
              </tr>
              <tr>
                <td className="border-b border-gray-100 px-4 py-2.5 font-bold bg-gray-50">TOTAL</td>
                <td className="border-b border-gray-100 px-4 py-2.5 text-right font-bold">{formatCurrency(total)}</td>
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