"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Edit, Printer } from "lucide-react";
import Image from "next/image";
import { SignatureField } from "@/components/ui/SignatureField";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.aztec.techmynt.com";
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
  "Miscellaneous",
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
        if (data.vat_rate !== undefined && data.vat_rate !== null)                             setVatPercentage(data.vat_rate);
        if (data.global_discount_percent !== undefined && data.global_discount_percent !== null) setGlobalDiscountPercent(data.global_discount_percent);
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
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
        <p className="text-sm text-gray-500">Loading invoice...</p>
      </div>
    </div>
  );

  if (!invoice) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900 mb-1">Invoice not found</p>
        <p className="text-xs text-gray-500">This invoice could not be loaded</p>
      </div>
    </div>
  );

  // ── Computed totals (mirrors list-page SQL logic exactly) ───────────────
  const validItems = items.filter(item =>
    item.item?.trim() || item.item_name?.trim() || item.description?.trim() ||
    (item.amount && parseFloat(item.amount) > 0)
  );

  const sectionDiscountsData = invoice?.section_discounts || {};

  const subtotalAfterSectionDiscounts = SECTIONS.reduce((acc, section) => {
    const sectionItems = validItems.filter(i => (i.section || 'Furniture') === section);
    return acc + sectionItems.reduce((sum, item) => {
      const itemTotal = (item.discount_percent && item.discount_percent > 0)
        ? (item.discounted_total ?? item.discounted_amount ?? (item.amount || 0) * (item.quantity || 1))
        : (item.amount || 0) * (item.quantity || 1);
      const subTotal = (item.subItems || item.sub_items || []).reduce((s: number, sub: any) =>
        s + ((sub.discount_percent && sub.discount_percent > 0)
          ? (sub.discounted_total ?? sub.discounted_amount ?? (sub.amount || 0) * (sub.quantity || 1))
          : (sub.amount || 0) * (sub.quantity || 1)), 0);
      return sum + itemTotal + subTotal;
    }, 0);
  }, 0);

  const globalDiscountAmount = subtotalAfterSectionDiscounts * (globalDiscountPercent / 100);
  const subtotal             = subtotalAfterSectionDiscounts - globalDiscountAmount;
  const vat                  = Math.round(subtotal * (vatPercentage / 100) * 100) / 100;
  const total                = Math.round((subtotal + vat) * 100) / 100;
  const deposit        = invoice.deposit_paid || 0;
  const totalRemaining = Math.max(0, total - deposit);

  return (
    <div className="min-h-screen bg-white" data-force-light>

      {/* Nav bar */}
      <div className="border-b px-8 py-3 print:hidden flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 font-medium">Invoice {invoice.invoice_number}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-3.5 w-3.5" /> Print
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => window.open(`${API_FORM}/invoices/${invoiceId}/pdf`, "_blank")}>
            <Download className="mr-2 h-3.5 w-3.5" /> Download PDF
          </Button>
          <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white"
            onClick={() => router.push(`/dashboard/invoices/${invoiceId}/edit`)}>
            <Edit className="mr-2 h-3.5 w-3.5" /> Edit Invoice
          </Button>
        </div>
      </div>

      {/* Document */}
      <div className="px-8 py-10">

        {/* Letterhead */}
        <div className="flex items-center justify-between border-b-2 border-gray-900 pb-7 mb-10">
          <Image src="/images/logo-full.png" alt="Atelier Luxe Interiors" width={340} height={92} className="object-contain" />
          <div className="text-right text-xs leading-6 text-gray-600">
            <p className="font-semibold text-sm text-gray-900 mb-1">Atelier Luxe Interiors Ltd</p>
            <p>127c Barkby Road, Leicester, LE4 9LG</p>
            <p>M: 07821 328849</p>
              <p>E: accounts@atelierluxe.co.uk</p>
            <p className="text-gray-400 mt-1">Registered in England No. 17200862</p>
            {vatPercentage > 0 && <p className="text-gray-400">VAT Reg No: 528 7517 62</p>}
          </div>
        </div>

        {/* Document type + reference */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">Invoice</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{invoice.invoice_number || 'Draft'}</h1>
              {invoice.status && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  invoice.status === 'Paid' ? 'bg-green-100 text-green-700' :
                  invoice.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                  invoice.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{invoice.status}</span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {invoice.invoice_date
                ? new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Billed To + Specification */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Billed To</p>
            <p className="font-semibold text-gray-900">{invoice.customer_name || '—'}</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{invoice.customer_address || '—'}</p>
            <p className="text-sm text-gray-600">{invoice.customer_phone || '—'}</p>
            {invoice.customer_email && <p className="text-sm text-gray-600">{invoice.customer_email}</p>}
          </div>
          {(invoice.room_name || invoice.carcass_colour || invoice.door_colour || invoice.panelwork_colour || invoice.door_style) && (
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Specification</p>
              <div className="space-y-1.5 text-sm">
                {invoice.room_name && (
                  <div className="flex gap-4">
                    <span className="text-gray-400 w-32 flex-shrink-0">Order Ref</span>
                    <span className="text-gray-800">{invoice.room_name}</span>
                  </div>
                )}
                {invoice.carcass_colour && (
                  <div className="flex gap-4">
                    <span className="text-gray-400 w-32 flex-shrink-0">Carcass Colour</span>
                    <span className="text-gray-800">{invoice.carcass_colour}</span>
                  </div>
                )}
                {invoice.door_colour && (
                  <div className="flex gap-4">
                    <span className="text-gray-400 w-32 flex-shrink-0">Door Colour</span>
                    <span className="text-gray-800">{invoice.door_colour}</span>
                  </div>
                )}
                {invoice.panelwork_colour && (
                  <div className="flex gap-4">
                    <span className="text-gray-400 w-32 flex-shrink-0">Panelwork</span>
                    <span className="text-gray-800">{invoice.panelwork_colour}</span>
                  </div>
                )}
                {invoice.door_style && (
                  <div className="flex gap-4">
                    <span className="text-gray-400 w-32 flex-shrink-0">Door Style</span>
                    <span className="text-gray-800">{invoice.door_style}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Items by section */}
        <div className="mb-10">
          {validItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No items in this invoice.</p>
          ) : (
            SECTIONS.map(section => {
              const sectionItems = validItems.filter(i => (i.section || "Furniture") === section);
              if (sectionItems.length === 0) return null;

              const sectionRaw = sectionItems.reduce((sum, item) => {
                const itemRaw = (item.amount || 0) * (item.quantity || 1);
                const subRaw = (item.subItems || item.sub_items || []).reduce((s: number, sub: any) =>
                  s + (sub.amount || 0) * (sub.quantity || 1), 0);
                return sum + itemRaw + subRaw;
              }, 0);

              const sectionAfterItemDiscounts = sectionItems.reduce((sum, item) => {
                const itemTotal = (item.discount_percent && item.discount_percent > 0)
                  ? (item.discounted_total ?? item.discounted_amount ?? (item.amount || 0) * (item.quantity || 1))
                  : (item.amount || 0) * (item.quantity || 1);
                const subTotal = (item.subItems || item.sub_items || []).reduce((s: number, sub: any) =>
                  s + ((sub.discount_percent && sub.discount_percent > 0)
                    ? (sub.discounted_total ?? sub.discounted_amount ?? (sub.amount || 0) * (sub.quantity || 1))
                    : (sub.amount || 0) * (sub.quantity || 1)), 0);
                return sum + itemTotal + subTotal;
              }, 0);

              const itemDiscountTotal = sectionRaw - sectionAfterItemDiscounts;
              const hasItemDiscount = itemDiscountTotal > 0;
              const sectionTotal = sectionAfterItemDiscounts;

              return (
                <div key={section} className="mb-10">
                  <div className="flex items-center gap-3 mt-8 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 whitespace-nowrap">{section}</span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>
                  <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 w-1/4">Item</th>
                          <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Description</th>
                          <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 w-32">Colour</th>
                          <th className="py-3 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 w-12">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionItems.map((item, index) => {
                          const isSubItem = item.is_sub_item || false;
                          return (
                            <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className={`py-3 px-3 ${isSubItem ? "pl-5 text-xs text-gray-400" : "text-gray-800"}`}>
                                {item.item || item.item_name || "—"}
                              </td>
                              <td className={`py-3 px-3 ${isSubItem ? "text-xs text-gray-400" : "text-gray-600"}`}>
                                {item.description || "—"}
                              </td>
                              <td className={`py-3 px-3 ${isSubItem ? "text-xs text-gray-400" : "text-gray-600"}`}>
                                {item.color || item.colour || "—"}
                              </td>
                              <td className={`py-3 px-3 text-center ${isSubItem ? "text-xs text-gray-400" : "text-gray-800"}`}>
                                {item.quantity || 1}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end mt-2 mb-8">
                    <div className="w-72 text-sm rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      {hasItemDiscount && (
                        <>
                          <div className="flex justify-between px-5 py-2.5 border-b border-gray-50 text-gray-600">
                            <span>Subtotal</span><span>{fmt(sectionRaw)}</span>
                          </div>
                          <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50 text-red-500">
                            <span>Discount</span><span>-{fmt(itemDiscountTotal)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between px-5 py-3.5 font-semibold bg-gray-900 text-white">
                        <span>{section} Total</span><span>{fmt(sectionTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Grand totals */}
        <div className="flex justify-end mb-12">
          <div className="w-80 rounded-xl border border-gray-100 shadow-md overflow-hidden text-sm mt-6">
            <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
              <span>Subtotal</span><span className="text-gray-800">{fmt(subtotalAfterSectionDiscounts)}</span>
            </div>
            {globalDiscountPercent > 0 && (
              <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
                <span>Discount ({globalDiscountPercent}%)</span><span className="text-gray-800">-{fmt(globalDiscountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
              <span>VAT ({vatPercentage}%)</span><span className="text-gray-800">{fmt(vat)}</span>
            </div>
            <div className="flex justify-between px-5 py-4 bg-gray-900 text-white font-semibold">
              <span className="text-sm">Total</span><span className="font-bold text-lg">{fmt(total)}</span>
            </div>
            {deposit > 0 && (
              <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
                <span>Amount Paid</span><span className="text-gray-800">{fmt(deposit)}</span>
              </div>
            )}
            {deposit > 0 && (
              <div className="flex justify-between px-5 py-4 bg-gray-900 text-white font-semibold">
                <span>Balance Due</span><span className="font-bold">{fmt(Math.max(0, totalRemaining))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-10 border-t border-gray-200 pt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Payment details + terms */}
        <div className="border-t border-gray-200 pt-8 mb-12 grid grid-cols-2 gap-12 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Payment Details</p>
            <div className="space-y-1 text-gray-600">
              <p>Account: Atelier Luxe Interiors LTD</p>
              <p>Bank: ClearBank</p>
              <p>Sort Code: 04 06 05</p>
              <p>Account No: 31621197</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Terms</p>
            <div className="space-y-1.5 text-gray-600">
              <p>Only Bacs or Cash accepted on Delivery and Completion.</p>
              <p>Payment due within 30 days of invoice date.</p>
              <p>Please use your name and/or road name as payment reference.</p>
            </div>
          </div>
        </div>

        {/* Additional Terms */}
        {invoice.additional_terms && invoice.additional_terms.filter((t: string) => t.trim()).length > 0 && (
          <div className="border-t border-gray-100 pt-4 mb-4 text-sm text-gray-600">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Additional Terms</p>
            <div className="space-y-1">
              {invoice.additional_terms.filter((t: string) => t.trim()).map((term: string, i: number) => (
                <p key={i}>{term}</p>
              ))}
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {invoice.additional_notes && invoice.additional_notes.trim() && (
          <div className="border-t border-gray-100 pt-4 mb-8 text-sm text-gray-600">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Notes</p>
            <p className="whitespace-pre-wrap">{invoice.additional_notes}</p>
          </div>
        )}

        {/* Signature */}
        <SignatureField customerName={invoice.customer_name} initialData={{
          type: (invoice.signature_type as any) || "none",
          imageData: invoice.signature_image || undefined,
          text: invoice.signature_text || "",
          name: invoice.signature_name || "",
          date: invoice.signature_date || "",
        }} />

      </div>
    </div>
  );
}