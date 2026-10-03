"use client";

import FinancialDocListPage from "../_components/FinancialDocListPage";
import { BACKEND_URL } from "@/lib/api";

export default function QuotationsListPage() {
  return (
    <FinancialDocListPage
      config={{
        docType:        "quotations",
        title:          "Quotations",
        docNumberLabel: "Quote #",
        referenceLabel: "Quote Ref",
        amountLabel:    "Total",
        createPath:     "/dashboard/quotes/create",
        draftKey:       "quotes/create",
        editPath:       (id) => `/dashboard/quotes/${id}/edit`,
        viewPath:       (id) => `/dashboard/quotes/${id}`,
        deleteApiUrl:   (id) => `${BACKEND_URL}/quotations/${id}`,
        downloadUrl:    (id) => `${BACKEND_URL}/quotations/${id}/pdf`,
        statuses:       ["Draft", "Sent to Customer", "Confirmed"],
      }}
    />
  );
}
