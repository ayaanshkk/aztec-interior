"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Printer, CheckCircle, Clock, XCircle, AlertCircle, Trash2, Loader2 } from "lucide-react";
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

interface QuoteItem {
  id: number;
  item: string;
  description: string;
  color: string;
  amount: number;
}

interface Quote {
  id: number;
  customer_id: string;
  customer_name: string;
  total: number;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  items: QuoteItem[];
}

const formatDate = (dateString: string) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount || 0);
};

export default function QuoteDetailsPage() {
  const params = useParams();
  const router = useRouter();

  // Handle both [id] and [quoteId] route parameters
  const quoteId = params?.id as string;

  const [quotation, setQuotation] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ✅ Define loadQuotation once before useEffect
  const loadQuotation = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("🔍 Fetching quotation:", quoteId);

      const response = await fetch(`https://aztec-interior.onrender.com/quotations/${quoteId}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to load quotation");
      }

      const data = await response.json();
      console.log("✅ Quotation loaded:", data);
      console.log("💰 Total:", data.total);
      console.log("📦 Items:", data.items);
      setQuotation(data);
    } catch (err) {
      console.error("❌ Error loading quotation:", err);
      setError(err instanceof Error ? err.message : "Failed to load quotation");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Single useEffect
  useEffect(() => {
    console.log("🎬 Route params:", params);
    console.log("🔑 Quote ID:", quoteId);

    if (!quoteId) {
      setError("No quote ID provided");
      setLoading(false);
      return;
    }

    loadQuotation();
    
    // Auto-download PDF if it's a newly generated quote
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoDownload') === 'true') {
      setTimeout(() => {
        handleDownloadPDF();
      }, 1000);
    }
  }, [quoteId]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {};

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("📄 Downloading PDF for quotation:", quoteId);

      const response = await fetch(`https://aztec-interior.onrender.com/quotations/${quoteId}/pdf`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate PDF");
      }

      // Get the blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quotation-${quoteId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("✅ PDF downloaded successfully");
    } catch (err) {
      console.error("❌ Error downloading PDF:", err);
      alert(`Failed to download PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("🗑️ Deleting quotation:", quoteId);

      const response = await fetch(`https://aztec-interior.onrender.com/quotations/${quoteId}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete quotation");
      }

      console.log("✅ Quotation deleted successfully");

      // Navigate back to customer details or quotes list
      router.back();
    } catch (err) {
      console.error("❌ Error deleting quotation:", err);
      alert(`Failed to delete quotation: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "pending":
      case "draft":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="text-gray-600">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Error Loading Quotation</h2>
          <p className="mb-4 text-gray-600">{error || "Quotation not found"}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Print Hidden */}
      <div className="border-b bg-white px-8 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quotation #{quotation.id}</h1>
              <p className="text-sm text-gray-600">Created {formatDate(quotation.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handlePrint} className="border-gray-300">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
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
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Print-only header */}
      <div className="mb-6 hidden border-b-2 border-gray-800 px-8 pt-6 pb-4 print:block">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold">QUOTATION</h1>
          <p className="text-lg text-gray-700">Quotation #{quotation.id}</p>
          <p className="mt-1 text-sm text-gray-600">{formatDate(quotation.created_at)}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-8 py-6">
        {/* Status Badge */}
        {quotation.status && (
          <div className="mb-6 flex items-center space-x-3">
            <div
              className={`inline-flex items-center space-x-2 rounded-md border px-4 py-2 ${getStatusColor(quotation.status)}`}
            >
              {getStatusIcon(quotation.status)}
              <span className="font-semibold capitalize">{quotation.status}</span>
            </div>
          </div>
        )}

        {/* Customer Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium text-gray-600">Customer Name</p>
                <p className="text-base text-gray-900">{quotation.customer_name || "—"}</p>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-gray-600">Customer ID</p>
                <p className="font-mono text-base text-xs text-gray-900">{quotation.customer_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quote Items</CardTitle>
          </CardHeader>
          <CardContent>
            {quotation.items && quotation.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Color
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {quotation.items.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.item || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.color || "—"}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-gray-500">No items in this quotation</p>
            )}
          </CardContent>
        </Card>

        {/* Quote Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quote Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <span className="text-lg font-medium text-gray-600">Total Amount</span>
                <span className="text-3xl font-bold text-gray-900">{formatCurrency(quotation.total)}</span>
              </div>

              {quotation.notes && (
                <div className="pt-3">
                  <p className="mb-2 text-sm font-medium text-gray-600">Notes</p>
                  <p className="rounded-md bg-gray-50 p-3 whitespace-pre-wrap text-gray-900">{quotation.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium text-gray-600">Quotation Number</p>
                <p className="text-base font-semibold text-gray-900">#{quotation.id}</p>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-gray-600">Status</p>
                <p className="text-base font-medium text-gray-900 capitalize">{quotation.status || "Draft"}</p>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-gray-600">Created Date</p>
                <p className="text-base text-gray-900">{formatDate(quotation.created_at)}</p>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-base text-gray-900">{formatDate(quotation.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Quotation #{quotation.id}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
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
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}