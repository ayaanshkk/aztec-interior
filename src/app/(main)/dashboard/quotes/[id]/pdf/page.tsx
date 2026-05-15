// app/dashboard/quotes/[id]/pdf/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/lib/api";

export default function QuotePDFPage() {
  const params = useParams();
  const quoteId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quoteId) return;

    const fetchPDF = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        
        if (!token) {
          throw new Error("Not authenticated. Please log in.");
        }

        console.log(`📄 Fetching PDF for quote ${quoteId}...`);
        console.log(`🔑 Token exists: ${!!token}`);
        console.log(`🔑 Token preview: ${token.substring(0, 20)}...`);
        
        const response = await fetch(
          `${BACKEND_URL}/api/quotations/${quoteId}/pdf`,  // ✅ ADD /api prefix
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log(`📥 Response status: ${response.status}`);

        if (response.status === 401) {
          throw new Error("Authentication failed. Please log in again.");
        }

        if (response.status === 404) {
          throw new Error("Quote not found.");
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to load PDF (${response.status})`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        console.log(`✅ PDF loaded successfully`);
        
        // Open PDF in browser
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.zIndex = '9999';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        setLoading(false);
      } catch (error: any) {
        console.error("❌ Error loading PDF:", error);
        setError(error.message || "Failed to load PDF");
        setLoading(false);
      }
    };

    fetchPDF();
  }, [quoteId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-700 font-medium">Loading quotation PDF...</p>
          <p className="text-gray-500 text-sm mt-2">Quote #{quoteId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Failed to Load PDF</h2>
              <p className="text-sm text-gray-500">Quote #{quoteId}</p>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={() => window.close()}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}