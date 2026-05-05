"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aztec-interior.onrender.com';

interface QuoteItem {
  id: number;
  item: string;
  description: string;
  color: string;
  amount: number;
  quantity?: number;
}

interface Quote {
  id: number;
  reference_number?: string;
  customer_id: string;
  customer_name: string;
  customer_address?: string;
  customer_phone?: string;
  total: number;
  subtotal?: number;
  vat?: number;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  items: QuoteItem[];
}

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (amount: number) => {
  return `£${(amount || 0).toFixed(2)}`;
};

export default function QuoteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params?.id as string;

  const [quotation, setQuotation] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadQuotation = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${BACKEND_URL}/quotations/${quoteId}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to load quotation");
      }

      const data = await response.json();
      setQuotation(data);
    } catch (err) {
      console.error("Error loading quotation:", err);
      setError(err instanceof Error ? err.message : "Failed to load quotation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!quoteId) {
      setError("No quote ID provided");
      setLoading(false);
      return;
    }

    loadQuotation();
  }, [quoteId]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${BACKEND_URL}/quotations/${quoteId}/pdf`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quotation-${quoteId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert(`Failed to download PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${BACKEND_URL}/quotations/${quoteId}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete quotation");
      }

      router.back();
    } catch (err) {
      console.error("Error deleting quotation:", err);
      alert(`Failed to delete quotation: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="mb-4 text-red-600">{error || "Quotation not found"}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Calculate VAT and subtotal
  const subtotal = quotation.subtotal || quotation.items.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0);
  const vat = quotation.vat || (subtotal * 0.20);
  const total = quotation.total || (subtotal + vat);

  return (
    <div className="min-h-screen bg-white">
      {/* Print-hidden action bar */}
      <div className="border-b bg-gray-50 px-8 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Quotation Content */}
      <div className="mx-auto max-w-4xl px-8 py-8">
        {/* Company Logo & Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-4xl font-bold tracking-wider text-gray-800">
            AZTEC INTERIORS
          </div>
        </div>

        {/* Company Registration Details */}
        <div className="mb-6 space-y-1 bg-green-200 p-3 text-sm">
          <p className="font-semibold">Registered to England No 5246881</p>
          <p className="font-semibold">VAT Reg No.686 8010 72</p>
        </div>

        <div className="mb-6 space-y-1 bg-yellow-200 p-3 text-sm">
          <p className="font-semibold">Acc name : Aztec Interiors Leicester LTD</p>
          <p className="font-semibold">Bank : HSBC</p>
          <p className="font-semibold">s/code: 40 28 06</p>
          <p className="font-semibold">acc no: 43820343</p>
        </div>

        <div className="mb-6 bg-gray-100 p-3 text-sm">
          <p>Please use your name and/or road name as reference:</p>
        </div>

        {/* Quotation Title */}
        <h1 className="mb-6 text-center text-2xl font-bold">QUOTATION</h1>

        {/* Customer Information */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold" style={{ width: '20%' }}>DATE:</td>
                <td className="border border-black px-3 py-2">{formatDate(quotation.created_at)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold">NAME:</td>
                <td className="border border-black px-3 py-2">{quotation.customer_name}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold">ADDRESS:</td>
                <td className="border border-black px-3 py-2">{quotation.customer_address || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold">TEL:</td>
                <td className="border border-black px-3 py-2" style={{ width: '50%' }}>{quotation.customer_phone || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Quote Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="border border-black px-3 py-2 text-left font-bold">ITEM</th>
                <th className="border border-black px-3 py-2 text-left font-bold">DESCRIPTION</th>
                <th className="border border-black px-3 py-2 text-left font-bold">COLOUR</th>
                <th className="border border-black px-3 py-2 text-right font-bold">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items && quotation.items.length > 0 ? (
                quotation.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="border border-black px-3 py-6">{item.item}</td>
                    <td className="border border-black px-3 py-6">{item.description || ''}</td>
                    <td className="border border-black px-3 py-6">{item.color || ''}</td>
                    <td className="border border-black px-3 py-6 text-right">{formatCurrency(item.amount * (item.quantity || 1))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border border-black px-3 py-6" colSpan={4}>No items</td>
                </tr>
              )}
              
              {/* Empty rows for spacing */}
              {[...Array(Math.max(0, 5 - (quotation.items?.length || 0)))].map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-black px-3 py-6">&nbsp;</td>
                  <td className="border border-black px-3 py-6">&nbsp;</td>
                  <td className="border border-black px-3 py-6">&nbsp;</td>
                  <td className="border border-black px-3 py-6">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mb-6 flex justify-end">
          <table className="border-collapse" style={{ width: '40%' }}>
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold">SUB TOTAL</td>
                <td className="border border-black px-3 py-2 text-right">{formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold">VAT</td>
                <td className="border border-black px-3 py-2 text-right">{formatCurrency(vat)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-bold">TOTAL</td>
                <td className="border border-black px-3 py-2 text-right font-bold">{formatCurrency(total)}</td>
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

        {/* Notes */}
        {quotation.notes && (
          <div className="mt-8 border-t border-gray-300 pt-4">
            <p className="mb-2 font-semibold text-sm">Notes:</p>
            <p className="text-sm whitespace-pre-wrap">{quotation.notes}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quotation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}