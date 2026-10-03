"use client";

import FinancialDocListPage from "../_components/FinancialDocListPage";
import { BACKEND_URL } from "@/lib/api";

export default function DepositReceiptsListPage() {
  return (
    <FinancialDocListPage
      config={{
        docType:        "deposit-receipts",
        title:          "Deposit Receipts",
        docNumberLabel: "Receipt #",
        amountLabel:    "Amount Paid",
        createPath:        "/dashboard/receipt",
        createQueryParams: { type: "deposit" },
        editPath:          null,
        viewPath:          null,
        deleteApiUrl:   (id) => `${BACKEND_URL}/api/financial-docs/receipts/${id}`,
        downloadUrl:    (id) => `${BACKEND_URL}/api/form/receipts/${id}/pdf`,
        statuses:       ["Issued", "Draft"],
      }}
    />
  );
}
