"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Format date to readable format
const formatDate = (dateString: string) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

export default function QuoteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params?.quoteId;
  const [quotation, setQuotation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quoteId) return;
    setLoading(true);

    // Fetch quotation details
    fetch(`http://127.0.0.1:5000/quotations/${quoteId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch quotation");
        return res.json();
      })
      .then((data) => setQuotation(data))
      .catch((err) => console.error("Error loading quotation:", err))
      .finally(() => setLoading(false));
  }, [quoteId]);

  const handleBack = () => {
    router.push("/dashboard/quotes");
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!quotation) return <div className="p-8">Quotation not found.</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="flex items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-semibold text-gray-900">Quote #{quotation.id}</h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-8 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quotation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Customer</span>
                <span className="text-gray-900 mt-1 text-base">{quotation.customer_name || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Created</span>
                <span className="text-gray-900 mt-1 text-base">{formatDate(quotation.created_at)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Total</span>
                <span className="text-gray-900 mt-1 text-base">£{quotation.total.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Notes</span>
                <span className="text-gray-900 mt-1 text-base">{quotation.notes || "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quotation.items.map((item: any) => (
                <div key={item.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-gray-500 font-medium">Item</span>
                      <p className="text-gray-900">{item.item}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 font-medium">Description</span>
                      <p className="text-gray-900">{item.description || "—"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 font-medium">Color</span>
                      <p className="text-gray-900">{item.color || "—"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 font-medium">Amount</span>
                      <p className="text-gray-900">£{item.amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}