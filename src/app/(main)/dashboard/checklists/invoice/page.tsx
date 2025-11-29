"use client";

import React, { useState, useEffect, useCallback, ChangeEvent, FocusEvent } from "react";
import { ArrowLeft, Printer, Save, Download, PlusCircle, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// --- CurrencyInput component remains the same ---

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, placeholder = "0.00" }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    if (localValue === "0.00") {
      setLocalValue("");
    } else {
      e.target.select();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let cleanValue = e.target.value.replace(/[^0-9.]/g, "");
    const decimalCount = (cleanValue.match(/\./g) || []).length;

    if (decimalCount > 1) {
      return;
    }

    setLocalValue(cleanValue);
    onChange(cleanValue);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    let finalValue = e.target.value;
    let num = parseFloat(finalValue);

    if (isNaN(num) || finalValue.trim() === "" || finalValue.trim() === ".") {
      num = 0;
    }

    const formatted = num.toFixed(2);
    setLocalValue(formatted);
    onChange(formatted);
  };

  return (
    <Input
      type="text"
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className="border-0 bg-transparent text-right font-mono focus:ring-0"
    />
  );
};

const getNextInvoiceNumber = (lastNumber: string): string => {
  const prefix = lastNumber.split("-")[0] + "-";
  const numPart = parseInt(lastNumber.split("-")[1] || "0", 10);
  const nextNum = numPart + 1;
  return prefix + nextNum.toString().padStart(4, "0");
};

export default function InvoicePage() {
  // 1. User role state
  const [userRole, setUserRole] = useState<string | null>(null);

  // Initial approval status must be 'pending' or null, so it only changes after save/check
  const [invoiceNumber, setInvoiceNumber] = useState("INV-0001");
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>("pending"); // Default to pending
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // --- Role and Invoice Number Setup ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Fetch the user role (e.g., from local storage)
      const storedRole = localStorage.getItem("user_role");
      setUserRole(storedRole || "manager"); // <<< MOCK: Replace 'manager' with a proper default/null

      const lastUsedNumber = localStorage.getItem("lastInvoiceNumber") || "INV-0000";
      const nextNumber = getNextInvoiceNumber(lastUsedNumber);
      setInvoiceNumber(nextNumber);

      // Note: We deliberately do NOT set approvalStatus here. It should be pending/unknown until saved.
    }
  }, []);
  // ------------------------------------

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });

  const [customer, setCustomer] = useState({
    id: "",
    name: "",
    address: "",
    phone: "",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setCustomer({
        id: params.get("customerId") || "N/A",
        name: params.get("customerName") || "",
        address: params.get("customerAddress") || "",
        phone: params.get("customerPhone") || "",
      });
    }
  }, []);

  const [items, setItems] = useState([
    {
      description: "",
      amount: "0.00",
    },
  ]);
  const [vatRate, setVatRate] = useState(20.0);

  const subTotal = items.reduce((acc, item) => acc + parseFloat(item.amount || "0"), 0);
  const vatAmount = subTotal * (parseFloat(vatRate.toString()) / 100);
  const totalAmount = subTotal + vatAmount;

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleItemChange = (index: number, field: keyof (typeof items)[0], value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        description: "",
        amount: "0.00",
      },
    ]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const getInvoiceData = useCallback(
    () => ({
      customerId: customer.id,
      customerName: customer.name,
      customerAddress: customer.address,
      customerPhone: customer.phone,
      invoiceNumber,
      invoiceDate,
      dueDate,
      items: items.map((item) => ({ ...item, amount: parseFloat(item.amount) })),
      vatRate: parseFloat(vatRate.toString()),
      subTotal,
      vatAmount,
      totalAmount,
      submission_id: submissionId,
      userRole: userRole,
    }),
    [
      customer,
      invoiceNumber,
      invoiceDate,
      dueDate,
      items,
      vatRate,
      subTotal,
      vatAmount,
      totalAmount,
      submissionId,
      userRole,
    ],
  );

  const handleSave = async () => {
    if (!userRole) {
      setMessage("❌ User role not determined. Cannot save.");
      return;
    }

    setIsSaving(true);
    setMessage("Saving invoice...");

    // 🚨 CRITICAL CHANGE HERE: Optimistically set status for manager
    // This ensures the status badge updates instantly before the network call resolves.
    if (userRole === "manager") {
      setApprovalStatus("approved");
      setMessage("Saving invoice... (Auto-approving as Manager)");
    }

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        setMessage("❌ You must be logged in to save invoices.");
        setIsSaving(false);
        return;
      }

      const invoiceData = getInvoiceData();

      const response = await fetch("https://aztec-interior.onrender.com/invoices/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(invoiceData),
      });

      const data = await response.json();

      if (response.ok) {
        if (typeof window !== "undefined") {
          localStorage.setItem("lastInvoiceNumber", invoiceNumber);
        }

        // Set submission ID
        setSubmissionId(data.form_submission_id);

        // 🔄 FINAL STATUS CHECK: Update status from server, or use local 'approved' for manager
        let newApprovalStatus = data.approval_status;
        if (!newApprovalStatus) {
          newApprovalStatus = userRole === "manager" ? "approved" : "pending";
        }
        setApprovalStatus(newApprovalStatus);

        if (newApprovalStatus === "pending") {
          setMessage("✅ Invoice saved and sent for approval!");
        } else if (newApprovalStatus === "approved") {
          setMessage("✅ Invoice saved and automatically **approved** (Manager role)!");
        } else {
          setMessage("✅ Invoice saved successfully!");
        }
      } else {
        // If save fails, revert optimistic change (only for manager)
        if (userRole === "manager") {
          setApprovalStatus("pending");
        }
        setMessage(`❌ Error: ${data.error || "Failed to save invoice."}`);
      }
    } catch (error) {
      // If save fails, revert optimistic change (only for manager)
      if (userRole === "manager") {
        setApprovalStatus("pending");
      }
      setMessage("❌ Network error. Could not connect to server.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // Check approval status before download
  const checkApprovalStatus = async () => {
    if (approvalStatus === "approved") {
      return true;
    }

    if (!submissionId) {
      setMessage("⚠️ Please save the invoice first.");
      return false;
    }

    try {
      const response = await fetch(`https://aztec-interior.onrender.com/approvals/status/${submissionId}`);
      const data = await response.json();

      setApprovalStatus(data.approval_status);
      setRejectionReason(data.rejection_reason || "");

      if (data.approval_status === "rejected") {
        setMessage(`❌ This invoice was rejected. Reason: ${data.rejection_reason}`);
        return false;
      } else if (data.approval_status === "pending") {
        setMessage("⚠️ This invoice is pending manager approval. You cannot download it yet.");
        return false;
      }

      return true;
    } catch (error) {
      setMessage("❌ Failed to check approval status.");
      return false;
    }
  };

  const handleDownloadPdf = async () => {
    const canDownload = await checkApprovalStatus();
    if (!canDownload) {
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    setMessage("Generating PDF...");
    try {
      const response = await fetch("https://aztec-interior.onrender.com/invoices/download-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getInvoiceData()),
      });

      if (response.ok) {
        const blob = await response.blob();
        const filename = `Invoice_${invoiceNumber}_${customer.name.replace(/\s/g, "_")}.pdf`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setMessage("✅ PDF downloaded successfully!");
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.error || "Failed to generate PDF."}`);
      }
    } catch (error) {
      setMessage("❌ Network error. Could not connect to server.");
    } finally {
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans sm:p-8">
      <div className="mx-auto max-w-5xl">
        {/* 3. Remove/Hide the save/download/print buttons from the top */}
        <div className="no-print mb-6 flex items-center justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {/* Removed action buttons from here */}
        </div>

        {/* 2. Approval Status Badge is now ONLY shown if a submissionId exists */}
        {submissionId && (
          <div
            className={`mb-4 rounded-lg border-l-4 p-3 ${
              approvalStatus === "approved"
                ? "border-green-500 bg-green-50"
                : approvalStatus === "rejected"
                  ? "border-red-500 bg-red-50"
                  : "border-yellow-500 bg-yellow-50"
            } no-print`}
          >
            <div className="flex items-center">
              <AlertCircle
                className={`mr-2 h-5 w-5 ${
                  approvalStatus === "approved"
                    ? "text-green-600"
                    : approvalStatus === "rejected"
                      ? "text-red-600"
                      : "text-yellow-600"
                }`}
              />
              <span className="font-medium">
                Status: <span className="capitalize">{approvalStatus}</span>
                {userRole && <span className="ml-2 text-sm text-gray-500">({userRole} role)</span>}
              </span>
            </div>
            {approvalStatus === "rejected" && rejectionReason && (
              <p className="mt-1 ml-7 text-sm text-red-700">Reason: {rejectionReason}</p>
            )}
            {approvalStatus === "pending" && (
              <p className="mt-1 ml-7 text-sm text-yellow-700">
                Waiting for manager approval before PDF download is available.
              </p>
            )}
          </div>
        )}

        {message && (
          <div
            className={`mb-4 rounded-md p-3 text-sm font-medium ${
              message.startsWith("✅")
                ? "bg-green-100 text-green-800"
                : message.startsWith("❌")
                  ? "bg-red-100 text-red-800"
                  : message.startsWith("⚠️")
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-200 text-gray-800"
            } no-print transition-opacity duration-300`}
          >
            {message}
          </div>
        )}

        <Card className="rounded-xl shadow-lg print:border-0 print:shadow-none">
          {/* ... CardHeader and CardContent remain the same */}
          <CardHeader className="rounded-t-xl bg-slate-800 p-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <img
                  src="/images/logo2.png"
                  alt="Aztec Interiors Logo"
                  className="mb-2 h-16"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
                <h1 className="text-3xl font-bold tracking-tight">INVOICE</h1>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-300">Invoice #</p>
                <Input
                  value={invoiceNumber}
                  readOnly
                  className="w-48 cursor-default border-slate-600 bg-transparent p-1 text-right text-2xl font-semibold focus:border-white"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-10 p-8 md:p-10">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h2 className="mb-2 text-sm font-semibold text-gray-500 uppercase">From</h2>
                <p className="text-lg font-bold">Aztec Interiors (Leicester) Ltd</p>
                <p className="text-gray-600">127b Barkby Road, Leicester LE4 9LG</p>
                <p className="text-gray-600">Tel: 0116 2764516</p>
              </div>
              <div className="md:text-right">
                <h2 className="mb-2 text-sm font-semibold text-gray-500 uppercase">For</h2>
                <Input
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Customer Name"
                  className="p-1 text-lg font-bold md:text-right"
                />
                <Textarea
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  placeholder="Customer Address"
                  className="resize-none p-1 text-gray-600 md:text-right"
                />
                <Input
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="Customer Phone"
                  className="p-1 text-gray-600 md:text-right"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-8">
              <div className="text-right">
                <label className="block text-sm font-semibold text-gray-500">Invoice Date</label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="p-1 text-right font-semibold"
                />
              </div>
              <div className="text-right">
                <label className="block text-sm font-semibold text-gray-500">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="p-1 text-right font-semibold"
                />
              </div>
            </div>

            <div>
              <table className="w-full">
                <thead className="border-b-2 border-gray-200">
                  <tr className="text-left text-sm font-semibold text-gray-500 uppercase">
                    <th className="py-2">Description</th>
                    <th className="w-40 py-2 text-right">Amount</th>
                    <th className="no-print w-16 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2">
                        <Textarea
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          placeholder={`Item description ${index + 1}`}
                          className="w-full resize-none p-1"
                        />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-end">
                          <span className="mr-1 text-gray-500">£</span>
                          <CurrencyInput
                            value={item.amount}
                            onChange={(value) => handleItemChange(index, "amount", value)}
                          />
                        </div>
                      </td>
                      <td className="no-print py-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="no-print mt-4">
                <Button variant="outline" onClick={addItem} className="text-slate-600 hover:bg-gray-100">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-mono font-medium">£{subTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">VAT</span>
                  <div className="flex w-28 items-center">
                    <Input
                      type="number"
                      value={vatRate}
                      onChange={(e) => setVatRate(parseFloat(e.target.value))}
                      className="w-16 rounded-md bg-gray-100 p-1 text-right font-mono"
                    />
                    <span className="ml-1">%</span>
                  </div>
                  <span className="font-mono font-medium">£{isNaN(vatAmount) ? "0.00" : vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t-2 pt-2 text-xl font-bold">
                  <span>Total</span>
                  <span>£{isNaN(totalAmount) ? "0.00" : totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
          {/* 4. Move action buttons to CardFooter for better flow and placement */}
          <CardFooter className="no-print flex items-center justify-between rounded-b-xl bg-gray-100 p-6">
            <div className="hidden flex-1 text-sm text-gray-500 sm:block">
              <p>Draft Mode. Click "Save" to finalize and process the invoice.</p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleSave} disabled={isSaving} className="bg-slate-800 text-white hover:bg-slate-700">
                <Save className="mr-2 h-4 w-4" /> {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button variant="secondary" onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
              <Button onClick={handlePrint} variant="outline">
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </div>
          </CardFooter>

          {/* Original Bank Details footer now separate */}
          <CardFooter className="bg-gray-50 p-6 text-center text-xs text-gray-500">
            <div className="w-full">
              <p className="mb-1 font-semibold">Bank Transfer Details</p>
              <p>Acc Name: Aztec Interiors Leicester LTD | Bank: HSBC</p>
              <p>Sort Code: 40-28-06 | Acc No: 43820343</p>
              <p className="mt-2 italic">Please use your name and/or road name as reference.</p>
            </div>
          </CardFooter>
        </Card>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
        body {
          font-family: "Inter", sans-serif;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
        }
        *:focus-visible {
          outline: 2px solid #374151 !important;
          outline-offset: 2px;
          border-radius: 4px;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
