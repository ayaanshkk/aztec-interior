"use client";

import FinancialDocListPage from "../_components/FinancialDocListPage";
import { BACKEND_URL } from "@/lib/api";

export default function InvoicesListPage() {
  return (
    <FinancialDocListPage
      config={{
        docType:        "invoices",
        title:          "Invoices",
        docNumberLabel: "Invoice #",
        referenceLabel: "Quote Ref",
        amountLabel:    "Invoice",
        createPath:     "/dashboard/invoices/create",
        draftKey:       "invoices/create",
        editPath:       (id) => `/dashboard/invoices/${id}/edit`,
        viewPath:       (id) => `/dashboard/invoices/${id}`,
        deleteApiUrl:   (id) => `${BACKEND_URL}/api/form/invoices/${id}`,
        downloadUrl:    (id) => `${BACKEND_URL}/api/form/invoices/${id}/pdf`,
        statuses:       ["Draft", "Sent to Customer", "Paid Partially", "Received"],
      }}
    />
  );
}
