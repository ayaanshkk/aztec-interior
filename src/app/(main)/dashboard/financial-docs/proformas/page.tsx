"use client";

import FinancialDocListPage from "../_components/FinancialDocListPage";
import { BACKEND_URL } from "@/lib/api";

export default function ProformasListPage() {
  return (
    <FinancialDocListPage
      config={{
        docType:        "proformas",
        title:          "Proforma Invoices",
        docNumberLabel: "Proforma #",
        amountLabel:    "Total",
        createPath:     "/dashboard/proformas/create",
        draftKey:       "proformas/create",
        editPath:       (id) => `/dashboard/proformas/${id}/edit`,
        viewPath:       (id) => `/dashboard/proformas/${id}`,
        deleteApiUrl:   (id) => `${BACKEND_URL}/api/form/proformas/${id}`,
        downloadUrl:    (id) => `${BACKEND_URL}/api/form/proformas/${id}/pdf`,
        statuses:       ["Proforma Draft", "Proforma Sent to Customer", "Proforma Confirmed", "Proforma Paid"],
      }}
    />
  );
}
