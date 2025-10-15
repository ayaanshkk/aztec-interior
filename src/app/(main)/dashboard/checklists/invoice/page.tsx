"use client";

import React, { useState, useEffect, useCallback, ChangeEvent, FocusEvent } from "react";
import { ArrowLeft, Printer, Save, Download, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// Define the shape of the CurrencyInput's props
interface CurrencyInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

// A reusable, controlled input for currency values.
const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, placeholder = "0.00" }) => {
    // Error 7031: Binding element 'value' implicitly has an 'any' type. (Fixed by adding CurrencyInputProps interface)
    // Error 7031: Binding element 'onChange' implicitly has an 'any' type. (Fixed by adding CurrencyInputProps interface)
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        const floatValue = parseFloat(value);
        setLocalValue(isNaN(floatValue) ? "0.00" : floatValue.toFixed(2));
    }, [value]);

    // Error 7006: Parameter 'e' implicitly has an 'any' type. (Fixed by explicitly typing 'e' as ChangeEvent<HTMLInputElement>)
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const cleanValue = e.target.value.replace(/[^0-9.]/g, '');
        setLocalValue(cleanValue);
        // Pass the raw value up for immediate calculation
        onChange(cleanValue);
    };

    const handleBlur = () => {
        const num = parseFloat(localValue);
        const formatted = isNaN(num) ? "0.00" : num.toFixed(2);
        setLocalValue(formatted);
        onChange(formatted); // Pass the formatted value up on blur
    };

    return (
        <Input
            type="text"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="text-right font-mono bg-transparent border-0 focus:ring-0"
        />
    );
};

// Main Invoice Page Component
export default function InvoicePage() {
    // --- Core Invoice State ---
    const [invoiceNumber, setInvoiceNumber] = useState("INV-0001");
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() + 30); // Default due date 30 days from now
        return date.toISOString().split('T')[0];
    });

    // --- Customer State ---
    const [customer, setCustomer] = useState({
        id: "",
        name: "",
        address: "",
        phone: ""
    });

    useEffect(() => {
        // Use standard browser APIs to get URL search parameters
        // This is safe to run because this component is marked "use client"
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setCustomer({
                id: params.get("customerId") || "N/A",
                name: params.get("customerName") || "",
                address: params.get("customerAddress") || "",
                phone: params.get("customerPhone") || "",
            });
        }
    }, []);

    // --- Line Items State ---
    const [items, setItems] = useState([{
        description: "",
        amount: "0.00"
    }, ]);
    const [vatRate, setVatRate] = useState(20.00); // Default VAT rate of 20%

    // --- Calculated Totals ---
    const subTotal = items.reduce((acc, item) => acc + parseFloat(item.amount || '0'), 0); // Use '0' as fallback for safety
    const vatAmount = subTotal * (parseFloat(vatRate.toString()) / 100); // vatRate is a number, converting to string and back for consistency with `parseFloat`
    const totalAmount = subTotal + vatAmount;

    // --- UI State ---
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");

    // --- Item Handlers ---
    const handleItemChange = (index: number, field: keyof typeof items[0], value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, {
            description: "",
            amount: "0.00"
        }]);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    // --- Data Preparation and API Calls ---
    const getInvoiceData = useCallback(() => ({
        customerId: customer.id,
        customerName: customer.name,
        customerAddress: customer.address,
        customerPhone: customer.phone,
        invoiceNumber,
        invoiceDate,
        dueDate,
        // Ensure amount is a number for the API
        items: items.map(item => ({...item, amount: parseFloat(item.amount) })),
        vatRate: parseFloat(vatRate.toString()),
        subTotal,
        vatAmount,
        totalAmount,
    }), [customer, invoiceNumber, invoiceDate, dueDate, items, vatRate, subTotal, vatAmount, totalAmount]);


    const handleSave = async () => {
        setIsSaving(true);
        setMessage("Saving invoice...");

        try {
            const response = await fetch('http://127.0.0.1:5000/invoices/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(getInvoiceData()),
            });

            if (response.ok) {
                setMessage('✅ Invoice saved successfully!');
            } else {
                const error = await response.json();
                setMessage(`❌ Error: ${error.error || 'Failed to save invoice.'}`);
            }
        } catch (error) {
            setMessage('❌ Network error. Could not connect to server.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(""), 5000);
        }
    };
    
    const handleDownloadPdf = async () => {
        setMessage("Generating PDF...");
        try {
            const response = await fetch('http://127.0.0.1:5000/invoices/download-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(getInvoiceData()),
            });

            if (response.ok) {
                const blob = await response.blob();
                const filename = `Invoice_${invoiceNumber}_${customer.name.replace(/\s/g, '_')}.pdf`;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                setMessage('✅ PDF downloaded successfully!');
            } else {
                const error = await response.json();
                setMessage(`❌ Error: ${error.error || 'Failed to generate PDF.'}`);
            }
        } catch (error) {
            setMessage('❌ Network error. Could not connect to server.');
        } finally {
            setTimeout(() => setMessage(""), 5000);
        }
    };


    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-gray-50 min-h-screen p-4 sm:p-8 font-sans">
        <div className="max-w-5xl mx-auto">
            {/* --- Header Actions --- */}
            <div className="flex justify-between items-center mb-6 no-print">
                <Button variant="outline" onClick={() => window.history.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <div className="flex items-center space-x-2">
                    <Button onClick={handleSave} disabled={isSaving} className="bg-slate-800 hover:bg-slate-700 text-white">
                        <Save className="h-4 w-4 mr-2" /> {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="secondary" onClick={handleDownloadPdf}>
                        <Download className="h-4 w-4 mr-2" /> Download
                    </Button>
                    <Button onClick={handlePrint} variant="outline">
                        <Printer className="h-4 w-4 mr-2" /> Print
                    </Button>
                </div>
            </div>

            {/* --- Status Message --- */}
            {message && (
                <div className={`mb-4 p-3 rounded-md text-sm font-medium ${
                    // Using neutral colors for status messages
                    message.startsWith("✅") ? "bg-green-100 text-green-800" :
                    message.startsWith("❌") ? "bg-red-100 text-red-800" :
                    "bg-gray-200 text-gray-800" // Changed blue to a gray for theme
                  } no-print transition-opacity duration-300`}>
                    {message}
                </div>
            )}

            {/* --- Invoice Card --- */}
            <Card className="shadow-lg rounded-xl print:shadow-none print:border-0">
                <CardHeader className="bg-slate-800 text-white p-8 rounded-t-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            {/*  */}
                            <img src="/images/logo2.png" alt="Aztec Interiors Logo" className="h-16 mb-2" style={{ filter: 'brightness(0) invert(1)' }}/>
                            <h1 className="text-3xl font-bold tracking-tight">INVOICE</h1>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-300">Invoice #</p>
                            <Input
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                                className="bg-transparent border-slate-600 focus:border-white text-2xl font-semibold w-48 text-right p-1"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 md:p-10 space-y-10">
                    {/* --- Company / Customer Info --- */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-2">From</h2>
                            <p className="font-bold text-lg">Aztec Interiors (Leicester) Ltd</p>
                            <p className="text-gray-600">127b Barkby Road, Leicester LE4 9LG</p>
                            <p className="text-gray-600">Tel: 0116 2764516</p>
                        </div>
                        <div className="md:text-right">
                            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-2">For</h2>
                            <Input value={customer.name} onChange={(e) => setCustomer({...customer, name: e.target.value})} placeholder="Customer Name" className="font-bold text-lg p-1 md:text-right" />
                            <Textarea value={customer.address} onChange={(e) => setCustomer({...customer, address: e.target.value})} placeholder="Customer Address" className="text-gray-600 p-1 md:text-right resize-none" />
                            <Input value={customer.phone} onChange={(e) => setCustomer({...customer, phone: e.target.value})} placeholder="Customer Phone" className="text-gray-600 p-1 md:text-right" />
                        </div>
                    </div>

                    {/* --- Dates --- */}
                    <div className="flex justify-end space-x-8">
                        <div className="text-right">
                            <label className="text-sm font-semibold text-gray-500 block">Invoice Date</label>
                            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="font-semibold p-1 text-right"/>
                        </div>
                        <div className="text-right">
                            <label className="text-sm font-semibold text-gray-500 block">Due Date</label>
                            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="font-semibold p-1 text-right"/>
                        </div>
                    </div>


                    {/* --- Items Table --- */}
                    <div>
                        <table className="w-full">
                            <thead className="border-b-2 border-gray-200">
                                <tr className="text-left text-sm font-semibold uppercase text-gray-500">
                                    <th className="py-2">Description</th>
                                    <th className="py-2 text-right w-40">Amount</th>
                                    <th className="py-2 text-center w-16 no-print"></th>
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
                                                className="p-1 resize-none w-full"
                                            />
                                        </td>
                                        <td className="py-2">
                                            <div className="flex items-center justify-end">
                                                <span className="text-gray-500 mr-1">£</span>
                                                <CurrencyInput
                                                    value={item.amount}
                                                    onChange={(value) => handleItemChange(index, "amount", value)}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-2 text-center no-print">
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 no-print">
                            {/* Changed color from text-blue-600 to text-slate-600 to match theme */}
                            <Button variant="outline" onClick={addItem} className="text-slate-600 hover:bg-gray-100"> 
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Item
                            </Button>
                        </div>
                    </div>

                    {/* --- Totals Section --- */}
                    <div className="flex justify-end">
                        <div className="w-full max-w-sm space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium font-mono">£{subTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">VAT</span>
                                <div className="flex items-center w-28">
                                    <Input
                                        type="number"
                                        value={vatRate}
                                        onChange={(e) => setVatRate(parseFloat(e.target.value))} // Ensure vatRate state is a number
                                        className="text-right bg-gray-100 rounded-md p-1 font-mono w-16"
                                    />
                                    <span className="ml-1">%</span>
                                </div>
                                <span className="font-medium font-mono">£{isNaN(vatAmount) ? '0.00' : vatAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xl font-bold pt-2 border-t-2">
                                <span>Total</span>
                                <span>£{isNaN(totalAmount) ? '0.00' : totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="bg-gray-50 p-6 text-center text-xs text-gray-500 rounded-b-xl">
                    <div className="w-full">
                        <p className="font-semibold mb-1">Bank Transfer Details</p>
                        <p>Acc Name: Aztec Interiors Leicester LTD | Bank: HSBC</p>
                        <p>Sort Code: 40-28-06 | Acc No: 43820343</p>
                        <p className="mt-2 italic">Please use your name and/or road name as reference.</p>
                    </div>
                </CardFooter>
            </Card>
        </div>

        <style jsx global>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {
                font-family: 'Inter', sans-serif;
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
                .print\\:shadow-none { box-shadow: none !important; }
                .print\\:border-0 { border: 0 !important; }
            }
            /* Simple focus rings for better accessibility, changed blue to a darker gray for theme */
            *:focus-visible {
                outline: 2px solid #374151 !important; /* A dark gray/slate */
                outline-offset: 2px;
                border-radius: 4px;
            }
            /* Remove number input spinners */
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { 
                -webkit-appearance: none; 
                margin: 0; 
            }
            input[type=number] {
                -moz-appearance: textfield;
            }
        `}</style>

        </div>
    );
}