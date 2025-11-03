// RemedialActionChecklistPage.tsx

"use client";

import React, { useState, useRef } from "react";
// Placeholder for Next.js router/searchParams (for canvas compatibility)
// import { useSearchParams, useRouter } from "next/navigation";
import { CheckSquare, ArrowLeft, Trash2, Download } from "lucide-react";

// Dummy component definitions to make the file self-contained for the canvas environment
const Button = ({ children, onClick, type = "button", variant, size, disabled, className }: any) => (
  <button
    onClick={onClick}
    type={type}
    disabled={disabled}
    className={`rounded-lg px-4 py-2 font-semibold shadow-md transition-colors ${variant === "outline" ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100" : variant === "secondary" ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"} ${className || ""}`}
  >
    {children}
  </button>
);
const Input = ({ value, onChange, type = "text", placeholder, className = "" }: any) => (
  <input
    value={value}
    onChange={onChange}
    type={type}
    placeholder={placeholder}
    className={`w-full rounded-md border border-gray-300 p-2 focus:border-gray-500 focus:ring-gray-500 ${className}`}
  />
);
const Textarea = ({ value, onChange, placeholder, className = "" }: any) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full rounded-md border border-gray-300 p-2 focus:border-gray-500 focus:ring-gray-500 ${className}`}
  />
);
const Card = ({ children, ref }: any) => (
  <div ref={ref} className="overflow-hidden rounded-xl bg-white shadow-2xl" data-slot="card">
    {children}
  </div>
);
const CardHeader = ({ children, className }: any) => <div className={`p-6 ${className}`}>{children}</div>;
const CardTitle = ({ children, className }: any) => <h2 className={`text-2xl font-bold ${className}`}>{children}</h2>;
const CardContent = ({ children, className }: any) => <div className={`p-6 ${className}`}>{children}</div>;

// Define the structure for a single checklist item
interface RemedialItem {
  id: number;
  item: string;
  remedialAction: string;
  colour: string;
  size: string;
  qty: number | "";
}

// Initial state with 6 empty rows, as seen in the CSV
const initialItems: RemedialItem[] = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  item: "",
  remedialAction: "",
  colour: "",
  size: "",
  qty: "",
}));

const RemedialActionChecklistPage = () => {
  // NOTE: useSearchParams and useRouter are typically from 'next/navigation' in a Next.js environment.
  // For portability in this canvas, we define basic placeholders.
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const router = { back: () => window.history.back() };
  const formRef = useRef<HTMLDivElement>(null);

  // State for form data
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fitters, setFitters] = useState("");
  const [nextId, setNextId] = useState(initialItems.length + 1);
  const [checklistItems, setChecklistItems] = useState<RemedialItem[]>(initialItems);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Customer data extracted from URL search params
  const customerId = searchParams.get("customerId") || "N/A";
  const customerName = searchParams.get("customerName") || "N/A";
  const customerAddress = searchParams.get("customerAddress") || "N/A";
  const customerPhone = searchParams.get("customerPhone") || "N/A";

  const handleItemChange = (id: number, field: keyof RemedialItem, value: string | number) => {
    setChecklistItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, [field]: field === "qty" ? (value === "" ? "" : Number(value)) : value } : item,
      ),
    );
  };

  const addNewItemRow = () => {
    setChecklistItems((prevItems) => [
      ...prevItems,
      {
        id: nextId,
        item: "",
        remedialAction: "",
        colour: "",
        size: "",
        qty: "",
      },
    ]);
    setNextId((prevId) => prevId + 1);
  };

  const handleDeleteItem = (id: number) => {
    setChecklistItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveMessage("");

    const formData = {
      checklistType: "remedial",
      customerId,
      customerName,
      date,
      fitters,
      items: checklistItems.filter((item) => item.item || item.remedialAction),
    };

    try {
      const response = await fetch(`https://aztec-interiors.onrender.com/checklists/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSaveMessage("✅ Remedial Action Checklist saved successfully!");
      } else {
        const errorData = await response.json().catch(() => ({ error: "Server error" }));
        setSaveMessage(`❌ Failed to save checklist: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setSaveMessage("❌ Network error: Could not connect to the server.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSaveMessage(""), 5000);
    }
  };

  const downloadAsPdf = async () => {
    const formData = {
      customerName,
      customerAddress,
      customerPhone,
      date,
      fitters,
      items: checklistItems.filter((item) => item.item || item.remedialAction),
    };

    setSaveMessage("⌛ Generating PDF on server...");

    try {
      // Call the Flask backend PDF generation endpoint
      const response = await fetch(`https://aztec-interiors.onrender.com/checklists/download-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const blob = await response.blob();

        // Attempt to extract filename from Content-Disposition header
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = `Remedial_Checklist_${customerName.replace(/\s/g, "_")}_${date}.pdf`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?(.+)"?/);
          if (match && match[1]) {
            filename = match[1];
          }
        }

        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSaveMessage("✅ PDF successfully generated and downloaded!");
      } else {
        const errorData = await response.json().catch(() => ({ error: "Server error" }));
        console.error(`Server PDF generation failed: ${errorData.error || response.statusText}`);
        setSaveMessage(`❌ PDF generation failed on server: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Network error during PDF download:", error);
      setSaveMessage("❌ Network error: Could not connect to the server for PDF generation.");
    } finally {
      setTimeout(() => setSaveMessage(""), 5000);
    }
  };

  const downloadAsCsv = () => {
    const header = `AZTEC INTERIORS\nREMEDIAL WORK CHECKLIST\n\n`;
    const customerInfo = `DATE:,${date}\nCUSTOMER NAME:,${customerName}\nCUSTOMER ADDRESS:,${customerAddress}\nCUSTOMER TEL NO.:,${customerPhone}\nFITTERS:,${fitters}\n\n`;

    let csvContent = header + customerInfo;

    // Table Headers
    csvContent += "NO,ITEM,REMEDIAL ACTION,COLOUR,SIZE,QTY\n";

    // Table Data
    checklistItems.forEach((item, index) => {
      // Filter out commas and new lines from text areas to prevent breaking CSV structure
      const cleanItem = item.item.replace(/,/g, "").replace(/\n/g, " ");
      const cleanAction = item.remedialAction.replace(/,/g, "").replace(/\n/g, " ");

      csvContent += `${index + 1},"${cleanItem}","${cleanAction}",${item.colour},${item.size},${item.qty}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Remedial_Checklist_${customerName.replace(/\s/g, "_")}_${date}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="no-print flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()} className="text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Forms
        </Button>
      </div>

      <Card ref={formRef}>
        <CardHeader className="border-b bg-gray-50 text-center">
          <div className="flex items-center justify-center space-x-3">
            {/* Placeholder for the Image component */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-800">
              <CheckSquare className="h-6 w-6" />
            </div>
            <CardTitle className="text-3xl font-bold text-black">AZTEC INTERIORS</CardTitle>
          </div>
          <p className="mt-1 text-xl font-semibold">REMEDIAL WORK CHECKLIST</p>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer & Date/Fitters Section */}
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="space-y-2">
                <p className="font-semibold">
                  CUSTOMER NAME: <span className="font-normal text-gray-700">{customerName}</span>
                </p>
                <p className="font-semibold">
                  CUSTOMER ADDRESS: <span className="font-normal text-gray-700">{customerAddress}</span>
                </p>
                <p className="font-semibold">
                  CUSTOMER TEL NO.: <span className="font-normal text-gray-700">{customerPhone}</span>
                </p>
              </div>
              <div className="space-y-2 pt-2 md:pt-0">
                <div className="flex items-center space-x-2">
                  <label htmlFor="date" className="w-24 flex-shrink-0 font-semibold">
                    DATE:
                  </label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e: any) => setDate(e.target.value)}
                    className="flex-grow"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label htmlFor="fitters" className="w-24 flex-shrink-0 font-semibold">
                    FITTERS:
                  </label>
                  <Input
                    id="fitters"
                    value={fitters}
                    onChange={(e: any) => setFitters(e.target.value)}
                    placeholder="Enter fitter names"
                    className="flex-grow"
                  />
                </div>
              </div>
            </div>

            {/* Checklist Items Table */}
            <h3 className="mt-8 border-b pb-2 text-lg font-bold">Items Required for Remedial Action</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead>
                  <tr className="bg-gray-50 text-center text-xs font-medium tracking-wider text-gray-500 uppercase">
                    <th className="w-12 p-3">NO</th>
                    <th className="w-1/4 p-3 text-left">ITEM</th>
                    <th className="w-1/4 p-3 text-left">REMEDIAL ACTION</th>
                    <th className="w-20 p-3">COLOUR</th>
                    <th className="w-20 p-3">SIZE</th>
                    <th className="w-16 p-3">QTY</th>
                    <th className="no-print w-16 p-3">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {checklistItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="bg-gray-50 p-3 text-center text-sm font-medium">{index + 1}</td>
                      <td className="p-1">
                        <Textarea
                          value={item.item}
                          onChange={(e: any) => handleItemChange(item.id, "item", e.target.value)}
                          placeholder="Description of the item"
                          className="min-h-[40px] resize-none border-none focus-visible:ring-0"
                        />
                      </td>
                      <td className="p-1">
                        <Textarea
                          value={item.remedialAction}
                          onChange={(e: any) => handleItemChange(item.id, "remedialAction", e.target.value)}
                          placeholder="Action required"
                          className="min-h-[40px] resize-none border-none focus-visible:ring-0"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={item.colour}
                          onChange={(e: any) => handleItemChange(item.id, "colour", e.target.value)}
                          className="h-10 border-none text-center focus-visible:ring-0"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={item.size}
                          onChange={(e: any) => handleItemChange(item.id, "size", e.target.value)}
                          className="h-10 border-none text-center focus-visible:ring-0"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e: any) => handleItemChange(item.id, "qty", e.target.value)}
                          className="h-10 border-none text-center focus-visible:ring-0"
                        />
                      </td>
                      <td className="no-print p-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="no-print flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={addNewItemRow}>
                Add Another Item
              </Button>
              <Button type="button" variant="secondary" onClick={downloadAsCsv} className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
              <Button type="button" variant="secondary" onClick={downloadAsPdf} className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex items-center">
                <CheckSquare className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Checklist"}
              </Button>
            </div>

            {saveMessage && (
              <div
                className={`mt-4 rounded-md p-3 text-sm font-medium ${
                  saveMessage.startsWith("✅")
                    ? "bg-green-100 text-green-700"
                    : saveMessage.startsWith("❌")
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                } no-print`}
              >
                {saveMessage}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RemedialActionChecklistPage;
