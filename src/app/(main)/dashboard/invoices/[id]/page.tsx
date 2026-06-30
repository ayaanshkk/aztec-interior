"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Edit, Printer } from "lucide-react";
import Image from "next/image";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://aztec-interior.onrender.com";
const API_FORM    = `${BACKEND_URL}/api/form`;

const SECTIONS = [
  "Furniture",
  "Fillers and End Panels",
  "Accessories",
  "Handles",
  "Appliances",
  "Sink and Tap",
  "Worktops",
  "Fittings",
] as const;

export default function ViewInvoicePage() {
  const params    = useParams();
  const router    = useRouter();
  const invoiceId = params.id as string;

  const [invoice,  setInvoice]  = useState<any>(null);
  const [items,    setItems]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [vatPercentage,        setVatPercentage]        = useState(20);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

  useEffect(() => { fetchInvoice(); }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
        setItems(data.items || []);
        if (data.vat_rate)               setVatPercentage(data.vat_rate);
        if (data.global_discount_percent) setGlobalDiscountPercent(data.global_discount_percent);
      } else {
        alert("Failed to load invoice");
      }
    } catch (e) {
      console.error(e);
      alert("Error loading invoice");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">Loading invoice...</p>
    </div>
  );

  if (!invoice) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">Invoice not found</p>
    </div>
  );

  // ── Computed totals ──────────────────────────────────────────────────────
  const validItems = items.filter(item =>
    item.item?.trim() || item.item_name?.trim() || item.description?.trim() ||
    (item.amount && parseFloat(item.amount) > 0)
  );

  const sectionDiscountsData = invoice?.section_discounts || {};

  const subtotalAfterSectionDiscounts = validItems.reduce((sum, item) => {
    const section = item.section || 'Furniture';
    const sectionDiscountPct = sectionDiscountsData[section] || 0;
    const lineTotal = (item.amount || 0) * (item.quantity || 1);
    const itemTotal = (item.discount_percent && item.discount_percent > 0)
      ? (item.discounted_total || item.discounted_amount || lineTotal)
      : lineTotal;
    const subTotal = (item.subItems || item.sub_items || []).reduce((s: number, sub: any) => {
      const subLine = (sub.amount || 0) * (sub.quantity || 1);
      return s + ((sub.discount_percent && sub.discount_percent > 0)
        ? (sub.discounted_total || sub.discounted_amount || subLine) : subLine);
    }, 0);
    const itemPlusSubTotal = itemTotal + subTotal;
    return sum + itemPlusSubTotal * (1 - sectionDiscountPct / 100);
  }, 0);

  const globalDiscountAmount = subtotalAfterSectionDiscounts * (globalDiscountPercent / 100);
  const subtotal             = subtotalAfterSectionDiscounts - globalDiscountAmount;
  const vat                  = subtotal * (vatPercentage / 100);
  const total                = subtotal + vat;
  const deposit              = invoice.deposit_paid    || 0;
  const totalRemaining       = invoice.total_remaining ?? Math.max(0, total - deposit);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Top nav header ── */}
      <div className="border-b bg-gray-50 px-8 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Invoice {invoice.invoice_number}</h1>
              <p className="text-sm text-gray-600">Customer: {invoice.customer_name || "—"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline"
              onClick={() => window.open(`${API_FORM}/invoices/${invoiceId}/pdf`, "_blank")}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button onClick={() => router.push(`/dashboard/invoices/${invoiceId}/edit`)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* ── Document body ── */}
      <div className="mx-auto max-w-6xl px-8 py-8">

        {/* Company header */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <Image src="/images/logo3.png" alt="Logo" width={80} height={80} className="object-contain" />
          <div className="text-4xl font-bold tracking-wider text-gray-800">ATELIER LUXE INTERIORS</div>
        </div>

        <div className="mb-6 space-y-1 bg-green-200 p-3 text-sm">
          <p className="font-semibold">Registered to England No 5246881</p>
        </div>
        <div className="mb-6 space-y-1 bg-yellow-200 p-3 text-sm">
          <p className="font-semibold">Acc name : Atelier Luxe Interiors LTD</p>
          <p className="font-semibold">Bank : Tide</p>
          <p className="font-semibold">Sort Code: 04 06 05</p>
          <p className="font-semibold">Acc No: 31621197</p>
        </div>
        <div className="mb-6 bg-gray-100 p-3 text-sm">
          <p>Please use your name and/or road name as reference:</p>
        </div>

        <h1 className="mb-6 text-center text-2xl font-bold">INVOICE</h1>

        {/* Customer info */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50" style={{ width: "22%" }}>INVOICE DATE:</td>
                <td className="border border-black px-3 py-2">
                  {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString("en-GB") : "—"}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">DUE DATE:</td>
                <td className="border border-black px-3 py-2">
                  {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-GB") : "—"}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">NAME:</td>
                <td className="border border-black px-3 py-2">{invoice.customer_name || "—"}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">ADDRESS:</td>
                <td className="border border-black px-3 py-2">{invoice.customer_address || "—"}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">TEL:</td>
                <td className="border border-black px-3 py-2">{invoice.customer_phone || "—"}</td>
              </tr>
              {invoice.customer_email && (
                <tr>
                  <td className="border border-black px-3 py-2 font-semibold bg-gray-50">EMAIL:</td>
                  <td className="border border-black px-3 py-2">{invoice.customer_email}</td>
                </tr>
              )}
              {invoice.room_name && (
                <tr>
                  <td className="border border-black px-3 py-2 font-semibold bg-gray-50">ROOM NAME:</td>
                  <td className="border border-black px-3 py-2">{invoice.room_name}</td>
                </tr>
              )}
              {invoice.carcass_colour && (
                <tr>
                  <td className="border border-black px-3 py-2 font-semibold bg-gray-50">CARCASS COLOUR:</td>
                  <td className="border border-black px-3 py-2">{invoice.carcass_colour}</td>
                </tr>
              )}
              {invoice.door_colour && (
                <tr>
                  <td className="border border-black px-3 py-2 font-semibold bg-gray-50">DOOR COLOUR:</td>
                  <td className="border border-black px-3 py-2">{invoice.door_colour}</td>
                </tr>
              )}
              {invoice.panelwork_colour && (
                <tr>
                  <td className="border border-black px-3 py-2 font-semibold bg-gray-50">PANELWORK COLOUR:</td>
                  <td className="border border-black px-3 py-2">{invoice.panelwork_colour}</td>
                </tr>
              )}
              {invoice.door_style && (
                <tr>
                  <td className="border border-black px-3 py-2 font-semibold bg-gray-50">DOOR STYLE:</td>
                  <td className="border border-black px-3 py-2">{invoice.door_style}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sections + Items */}
        <div className="mb-4">
          {validItems.length === 0 ? (
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td colSpan={5} className="border border-black px-3 py-8 text-center text-gray-500">
                    No items in this invoice
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            SECTIONS.map(section => {
              const sectionItems = validItems.filter(i => (i.section || "Furniture") === section);
              if (sectionItems.length === 0) return null;

              // Section totals
              const sectionSubtotal = sectionItems.reduce((sum, item) => {
                const lineTotal = (item.amount || 0) * (item.quantity || 1);
                const subTotal  = (item.subItems || item.sub_items || []).reduce((s: number, sub: any) =>
                  s + (sub.amount || 0) * (sub.quantity || 1), 0);
                return sum + lineTotal + subTotal;
              }, 0);

              const sectionDiscounted = sectionItems.reduce((sum, item) => {
                const lineTotal = (item.amount || 0) * (item.quantity || 1);
                const itemTotal = (item.discount_percent && item.discount_percent > 0)
                  ? (item.discounted_total || item.discounted_amount || lineTotal) : lineTotal;
                const subTotal  = (item.subItems || item.sub_items || []).reduce((s: number, sub: any) => {
                  const subLine = (sub.amount || 0) * (sub.quantity || 1);
                  return s + ((sub.discount_percent && sub.discount_percent > 0)
                    ? (sub.discounted_total || sub.discounted_amount || subLine) : subLine);
                }, 0);
                return sum + itemTotal + subTotal;
              }, 0);

              const sectionDiscount = sectionSubtotal - sectionDiscounted;

              return (
                <div key={section} className="mb-6">
                  <h3 className="mb-3 text-lg font-bold">{section}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-white">
                          <th className="border border-black px-3 py-2 text-left font-bold text-sm">ITEM</th>
                          <th className="border border-black px-3 py-2 text-left font-bold text-sm">DESCRIPTION</th>
                          <th className="border border-black px-3 py-2 text-left font-bold text-sm">COLOUR</th>
                          <th className="border border-black px-3 py-2 text-center font-bold text-sm">QTY</th>
                          <th className="border border-black px-3 py-2 text-right font-bold text-sm">UNIT PRICE</th>
                          <th className="border border-black px-3 py-2 text-right font-bold text-sm">AMOUNT</th>
                          <th className="border border-black px-3 py-2 text-center font-bold text-sm">DISC %</th>
                          <th className="border border-black px-3 py-2 text-right font-bold text-sm">FINAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionItems.map((item, idx) => {
                          const isSubItem = item.is_sub_item || false;
                          const qty       = item.quantity || 1;
                          const unitPrice = item.amount   || 0;
                          const lineTotal = unitPrice * qty;
                          const discPct   = item.discount_percent || 0;
                          const finalAmt  = discPct > 0
                            ? (item.discounted_total || item.discounted_amount || lineTotal - lineTotal * (discPct / 100))
                            : lineTotal;

                          return (
                            <tr key={idx} className={isSubItem ? "bg-gray-50" : "hover:bg-gray-50"}>
                              <td className={`border border-black px-3 py-2 font-mono text-sm ${isSubItem ? "pl-6 text-gray-600" : ""}`}>
                                {isSubItem ? `${item.item || item.item_name || "—"}` : (item.item || item.item_name || "—")}
                              </td>
                              <td className="border border-black px-3 py-2 text-sm">{item.description || "—"}</td>
                              <td className="border border-black px-3 py-2 text-sm">{item.color || item.colour || "—"}</td>
                              <td className="border border-black px-3 py-2 text-center text-sm">{qty}</td>
                              <td className="border border-black px-3 py-2 text-right text-sm">{fmt(unitPrice)}</td>
                              <td className="border border-black px-3 py-2 text-right font-semibold text-sm">{fmt(lineTotal)}</td>
                              <td className="border border-black px-3 py-2 text-center text-sm">
                                {discPct > 0 ? `${discPct}%` : "—"}
                              </td>
                              <td className="border border-black px-3 py-2 text-right font-semibold text-sm">
                                {discPct > 0 ? (
                                  <div>
                                    <div className="text-gray-400 line-through text-xs">{fmt(lineTotal)}</div>
                                    <div className="text-green-700">{fmt(finalAmt)}</div>
                                  </div>
                                ) : fmt(finalAmt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Section totals */}
                  <div className="flex justify-end mt-2 mb-2">
                    <table className="border-collapse" style={{ width: "35%" }}>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-1 font-medium bg-gray-50 text-sm">
                            {section} Subtotal
                          </td>
                          <td className="border border-gray-300 px-3 py-1 text-right text-sm">
                            {fmt(sectionSubtotal)}
                          </td>
                        </tr>
                        {sectionDiscount > 0 && (
                          <tr>
                            <td className="border border-gray-300 px-3 py-1 font-medium bg-gray-50 text-sm text-red-600">
                              Discount
                            </td>
                            <td className="border border-gray-300 px-3 py-1 text-right text-sm text-red-600">
                              -{fmt(sectionDiscount)}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="border border-gray-300 px-3 py-1 font-bold bg-gray-100 text-sm">
                            {section} Total
                          </td>
                          <td className="border border-gray-300 px-3 py-1 text-right font-bold text-sm">
                            {fmt(sectionDiscounted)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Global totals */}
        <div className="mb-6 flex justify-end">
          <table className="border-collapse" style={{ width: "40%" }}>
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">SUB TOTAL</td>
                <td className="border border-black px-3 py-2 text-right">{fmt(subtotalAfterSectionDiscounts)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">
                  DISCOUNT {globalDiscountPercent > 0 ? `(${globalDiscountPercent}%)` : ""}  
                </td>
                <td className="border border-black px-3 py-2 text-right text-red-600">
                  {globalDiscountPercent > 0 ? `-${fmt(globalDiscountAmount)}` : "—"}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">VAT ({vatPercentage}%)</td>
                <td className="border border-black px-3 py-2 text-right">{fmt(vat)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-bold bg-gray-50">TOTAL</td>
                <td className="border border-black px-3 py-2 text-right font-bold">{fmt(total)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">DEPOSIT PAID</td>
                <td className="border border-black px-3 py-2 text-right text-green-700 font-semibold">
                  {deposit > 0 ? fmt(deposit) : "—"}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-bold bg-gray-50 text-base">TOTAL REMAINING</td>
                <td className={`border border-black px-3 py-2 text-right font-bold text-base ${totalRemaining < 0 ? "text-red-600" : ""}`}>
                  {fmt(Math.max(0, totalRemaining))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="mb-1 font-semibold text-gray-700">Notes:</p>
            <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Payment terms */}
        <div className="mb-4 space-y-1 text-sm">
          <p className="font-semibold">Only Bacs or Cash will be accepted on Delivery and Completion</p>
          <p className="font-semibold">NOTE: Payment is due within 30 days of the invoice date.</p>
        </div>
        <div className="mb-8 text-sm font-semibold text-red-600">
          <p>Please sign here to confirm.</p>
        </div>

        {/* Signature */}
        <div className="mb-10 space-y-4 text-sm">
          {["Customer Signature:", "Customer Name:", "Date:"].map(label => (
            <div key={label} className="flex items-center">
              <span className="mr-2">{label}</span>
              <span className="flex-1 border-b border-dotted border-black" />
            </div>
          ))}
        </div>

        {/* Bottom action bar */}
        <div className="flex justify-end gap-3 border-t pt-6 print:hidden">
          <Button variant="outline" onClick={() => router.back()}>Back</Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline"
            onClick={() => window.open(`${API_FORM}/invoices/${invoiceId}/pdf`, "_blank")}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={() => router.push(`/dashboard/invoices/${invoiceId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Invoice
          </Button>
        </div>

      </div>
    </div>
  );
}