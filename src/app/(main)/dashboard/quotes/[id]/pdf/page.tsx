// In app/dashboard/quotes/[id]/pdf/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function QuotePDFPage() {
  const params = useParams();
  const quoteId = params?.id as string;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quoteId) return;

    const fetchPDF = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(
          `https://aztec-interior.onrender.com/quotations/${quoteId}/pdf`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          // Open PDF in browser
          const iframe = document.createElement('iframe');
          iframe.style.position = 'fixed';
          iframe.style.top = '0';
          iframe.style.left = '0';
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          iframe.src = url;
          document.body.appendChild(iframe);
          
          setLoading(false);
        } else {
          throw new Error("Failed to load PDF");
        }
      } catch (error) {
        console.error("Error loading PDF:", error);
        alert("Failed to load quote PDF");
        window.close();
      }
    };

    fetchPDF();
  }, [quoteId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p>Loading quote...</p>
        </div>
      </div>
    );
  }

  return null;
}