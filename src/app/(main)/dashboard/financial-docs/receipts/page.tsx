"use client";

import FinancialDocListPage from "../_components/FinancialDocListPage";
import { BACKEND_URL } from "@/lib/api";

export default function ReceiptsListPage() {
  return (
    <FinancialDocListPage
      config={{
        docType:        "receipts",
        title:          "Receipts",
        docNumberLabel: "Receipt #",
        amountLabel:    "Amount Paid",
        createPath:        "/dashboard/receipt",
        createQueryParams: { type: "receipt" },
        editPath:          null,
        viewPath:          null,
        deleteApiUrl:   (id) => `${BACKEND_URL}/api/financial-docs/receipts/${id}`,
        downloadUrl:    (id) => `${BACKEND_URL}/api/form/receipts/${id}/pdf`,
        statuses:       ["Issued", "Draft"],
      }}
    />
  );
}
