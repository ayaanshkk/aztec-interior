"use client";

import FinancialDocListPage from "../_components/FinancialDocListPage";
import { BACKEND_URL } from "@/lib/api";

export default function PaymentTermsListPage() {
  return (
    <FinancialDocListPage
      config={{
        docType:        "payment-terms",
        title:          "Payment Terms",
        docNumberLabel: "PT #",
        amountLabel:    "Amount Due",
        createPath:     "/dashboard/payment-terms/create",
        editPath:       null,
        viewPath:       (id) => `/dashboard/payment-terms/${id}`,
        deleteApiUrl:   (id) => `${BACKEND_URL}/api/form/payment-terms/${id}`,
        downloadUrl:    (id) => `${BACKEND_URL}/api/form/payment-terms/${id}/pdf`,
        statuses:       ["Draft", "Sent", "Paid", "Partially Paid"],
      }}
    />
  );
}
