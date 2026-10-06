"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, FileText } from "lucide-react";
import Image from 'next/image';
import { SignatureField } from "@/components/ui/SignatureField";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.aztec.techmynt.com";
const API_FORM    = `${BACKEND_URL}/api/form`;

const SECTIONS = ['Furniture', 'Fillers and End Panels', 'Accessories', 'Handles', 'Appliances', 'Sink and Tap', 'Worktops', 'Fittings', 'Miscellaneous'] as const;

export default function ViewProformaPage() {
  const params    = useParams();
  const router    = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vatPercentage,         setVatPercentage]         = useState(20);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

  useEffect(() => { fetchInvoice(); }, [invoiceId]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_FORM}/proformas/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
        setVatPercentage(data.vat_rate || 20);
        if (data.global_discount_percent) setGlobalDiscountPercent(data.global_discount_percent);
        setItems(data.items || []);
      } else {
        alert("Failed to load proforma");
      }
    } catch (e) {
      console.error(e);
      alert("Error loading proforma");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-t-transparent mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading proforma...</p>
      </div>
    </div>
  );
  if (!invoice) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-500">Proforma not found</p>
    </div>
  );

  const sectionDiscountsData = invoice?.section_discounts || {};

  const subtotalAfterSectionDiscounts = SECTIONS.reduce((total, section) => {
    const sectionItems = items.filter(i => (i.section || 'Furniture') === section);
    const sectionItemTotal = sectionItems.reduce((sum, item) => {
      const itemTotal = (item.discount_percent && item.discount_percent > 0)
        ? (item.discounted_total ?? item.discounted_amount ?? (item.amount || 0) * (item.quantity || 1))
        : (item.amount || 0) * (item.quantity || 1);
      const subTotal = (item.subItems || item.sub_items || []).reduce((s: number, sub: any) =>
        s + ((sub.discount_percent && sub.discount_percent > 0)
          ? (sub.discounted_total ?? sub.discounted_amount ?? (sub.amount || 0) * (sub.quantity || 1))
          : (sub.amount || 0) * (sub.quantity || 1)), 0);
      return sum + itemTotal + subTotal;
    }, 0);
    return total + sectionItemTotal;
  }, 0);

  const globalDiscountAmount = subtotalAfterSectionDiscounts * (globalDiscountPercent / 100);
  const subtotal = subtotalAfterSectionDiscounts - globalDiscountAmount;
  const vat      = subtotal * (vatPercentage / 100);
  const total    = subtotal + vat;

  const invDate = invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-GB') : '—';

  return (
    <div className="min-h-screen bg-white" data-force-light>
      {/* Nav bar */}
      <div className="border-b px-8 py-3 print:hidden flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 font-medium">Proforma Invoice {invoice.invoice_number}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/dashboard/proformas/${invoiceId}/edit`)} variant="outline" size="sm">
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.open(`${API_FORM}/proformas/${invoiceId}/pdf`, "_blank")}>
            <Download className="mr-2 h-3.5 w-3.5" /> Download PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

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
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">Proforma Invoice</p>
            <h1 className="text-2xl font-semibold text-gray-900">{invoice.invoice_number || 'Draft'}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{invDate}</p>
          </div>
        </div>

        {/* Prepared For + Proforma Details */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Prepared For</p>
            <p className="font-semibold text-gray-900">{invoice.customer_name || '—'}</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed whitespace-pre-line">{invoice.customer_address || '—'}</p>
            {invoice.customer_phone && <p className="text-sm text-gray-600">{invoice.customer_phone}</p>}
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Proforma Details</p>
            <div className="space-y-1.5 text-sm">
              {[
                { label: "Proforma No",   value: invoice.invoice_number || '—' },
                { label: "Date",          value: invDate },
                ...(invoice.room_name        ? [{ label: "Order Ref",       value: invoice.room_name }]        : []),
                ...(invoice.carcass_colour   ? [{ label: "Carcass Colour",  value: invoice.carcass_colour }]   : []),
                ...(invoice.door_colour      ? [{ label: "Door Colour",     value: invoice.door_colour }]      : []),
                ...(invoice.panelwork_colour ? [{ label: "Panelwork",       value: invoice.panelwork_colour }] : []),
                ...(invoice.door_style       ? [{ label: "Door Style",      value: invoice.door_style }]       : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-4">
                  <span className="text-gray-400 w-32 flex-shrink-0">{label}</span>
                  <span className="text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Items by section */}
        <div className="mb-10">
          {(() => {
            const validItems = items.filter(item => {
              const hasItem = item.item?.trim() || item.item_name?.trim();
              const hasDescription = item.description?.trim();
              const hasAmount = item.amount && parseFloat(item.amount) > 0;
              return hasItem || hasDescription || hasAmount;
            });

            if (validItems.length === 0) {
              return <p className="text-sm text-gray-400 py-8 text-center">No items in this proforma.</p>;
            }

            return SECTIONS.map(section => {
              const sectionItems = validItems.filter(item => (item.section || 'Furniture') === section);
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
                          <th className="py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center w-12">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionItems.map((item, index) => (
                          <React.Fragment key={index}>
                            <tr className="border-b border-gray-50 transition-colors hover:bg-gray-50/50">
                              <td className="py-3 px-3 text-gray-800">{item.item || item.item_name || '—'}</td>
                              <td className="py-3 px-3 text-gray-600">{item.description || '—'}</td>
                              <td className="py-3 px-3 text-gray-600">{item.color || item.colour || '—'}</td>
                              <td className="py-3 px-3 text-center text-gray-800">{item.quantity || 1}</td>
                            </tr>
                            {(item.subItems || item.sub_items || []).map((sub: any, subIndex: number) => (
                              <tr key={`${index}-sub-${subIndex}`} className="border-b border-gray-50">
                                <td className="py-2 px-3 pl-5 text-xs text-gray-400">{sub.item || '—'}</td>
                                <td className="py-2 px-3 text-xs text-gray-400">{sub.description || '—'}</td>
                                <td className="py-2 px-3 text-xs text-gray-400">{sub.color || sub.colour || '—'}</td>
                                <td className="py-2 px-3 text-center text-xs text-gray-400">{sub.quantity || 1}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end mt-2 mb-8">
                    <div className="w-72 text-sm rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      {hasItemDiscount && (
                        <>
                          <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
                            <span>Subtotal</span><span>{fmt(sectionRaw)}</span>
                          </div>
                          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 text-red-500">
                            <span>Discount</span><span>-{fmt(itemDiscountTotal)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between px-5 py-3.5 font-semibold bg-gray-900 text-white">
                        <span>{section} Total</span><span>{fmt(sectionAfterItemDiscounts)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Grand totals */}
        <div className="flex justify-end mb-12">
          <div className="w-80 rounded-xl border border-gray-100 shadow-md overflow-hidden text-sm mt-6">
            <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
              <span>Subtotal</span><span className="text-gray-800">{fmt(subtotalAfterSectionDiscounts)}</span>
            </div>
            {globalDiscountPercent > 0 && (
              <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
                <span>Discount ({globalDiscountPercent}%)</span>
                <span className="text-gray-800">-{fmt(globalDiscountAmount)}</span>
              </div>
            )}
            {invoice.show_ex_vat_total && (
              <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
                <span>Ex VAT Total</span><span className="text-gray-800">{fmt(subtotal)}</span>
              </div>
            )}
            <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
              <span>VAT ({vatPercentage}%)</span><span className="text-gray-800">{fmt(vat)}</span>
            </div>
            <div className="flex justify-between px-5 py-4 bg-gray-900 text-white font-semibold">
              <span className="text-sm">Total</span><span className="font-bold text-lg">{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment + Terms */}
        <div className="border-t border-gray-200 pt-8 mb-12 grid grid-cols-2 gap-12 text-sm text-gray-600">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Payment Details</p>
            <p>Acc name: Atelier Luxe Interiors LTD</p>
            <p>Bank: ClearBank</p>
            <p>Sort Code: 04 06 05</p>
            <p>Acc No: 31621197</p>
            <p className="mt-2 text-xs text-gray-400">Please use your name and/or road name as reference</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Terms</p>
            <p>This is a Proforma Invoice — not a VAT invoice.</p>
            <p className="mt-1">Payment is required before goods are dispatched or work commences.</p>
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