"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, FileText } from "lucide-react";
import Image from 'next/image';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://aztec-interior.onrender.com";
const API_FORM    = `${BACKEND_URL}/api/form`;

const SECTIONS = ['Furniture', 'Fillers and End Panels', 'Accessories', 'Handles', 'Appliances', 'Sink and Tap', 'Worktops', 'Fittings'] as const;

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

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Loading proforma...</p></div>;
  if (!invoice) return <div className="flex min-h-screen items-center justify-center"><p>Proforma not found</p></div>;

  const sectionDiscountsData = invoice?.section_discounts || {};

  const subtotalAfterSectionDiscounts = SECTIONS.reduce((total, section) => {
    const sectionItems = items.filter(i => (i.section || 'Furniture') === section);
    const sectionTotal = sectionItems.reduce((sum, item) => {
      const itemTotal = (item.discount_percent && item.discount_percent > 0)
        ? (item.discounted_total ?? item.discounted_amount ?? (item.amount || 0) * (item.quantity || 1))
        : (item.amount || 0) * (item.quantity || 1);
      const subTotal = (item.subItems || item.sub_items || []).reduce((s: number, sub: any) =>
        s + ((sub.discount_percent && sub.discount_percent > 0)
          ? (sub.discounted_total ?? sub.discounted_amount ?? (sub.amount || 0) * (sub.quantity || 1))
          : (sub.amount || 0) * (sub.quantity || 1)), 0);
      return sum + itemTotal + subTotal;
    }, 0);
    return total + sectionTotal;
  }, 0);

  const globalDiscountAmount = subtotalAfterSectionDiscounts * (globalDiscountPercent / 100);
  const subtotal = subtotalAfterSectionDiscounts - globalDiscountAmount;
  const vat      = subtotal * (vatPercentage / 100);
  const total    = subtotal + vat;

  const invDate = invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-GB') : '—';
  const dueDate = invoice.due_date     ? new Date(invoice.due_date).toLocaleDateString('en-GB')     : '—';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-gray-50 px-8 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Proforma Invoice {invoice.invoice_number}</h1>
              <p className="text-sm text-gray-600">Customer: {invoice.customer_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.print()} variant="outline">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline"
              onClick={() => window.open(`${API_FORM}/proformas/${invoiceId}/pdf`, "_blank")}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button
              onClick={() => router.push(`/dashboard/proformas/${invoiceId}/edit`)}
              variant="outline">
              Edit Proforma
            </Button>
          </div>
        </div>
      </div>

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
          <p className="font-semibold">Bank : ClearBank</p>
          <p className="font-semibold">Sort Code: 04 06 05</p>
          <p className="font-semibold">Acc No: 31621197</p>
        </div>
        <div className="mb-6 bg-gray-100 p-3 text-sm">
          <p>Please use your name and/or road name as reference:</p>
        </div>
        <h1 className="mb-6 text-center text-2xl font-bold">PROFORMA INVOICE</h1>

        {/* Customer info */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50" style={{ width: '20%' }}>PROFORMA DATE:</td>
                <td className="border border-black px-3 py-2">{invDate}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">VALID UNTIL:</td>
                <td className="border border-black px-3 py-2">{dueDate}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">NAME:</td>
                <td className="border border-black px-3 py-2">{invoice.customer_name || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">ADDRESS:</td>
                <td className="border border-black px-3 py-2">{invoice.customer_address || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">TEL:</td>
                <td className="border border-black px-3 py-2">{invoice.customer_phone || '—'}</td>
              </tr>
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

        {/* Items by section */}
        <div className="mb-4">
          {(() => {
            const validItems = items.filter(item => {
              const hasItem = item.item?.trim() || item.item_name?.trim();
              const hasDescription = item.description?.trim();
              const hasAmount = item.amount && parseFloat(item.amount) > 0;
              return hasItem || hasDescription || hasAmount;
            });

            if (validItems.length === 0) {
              return (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white">
                      <th className="border border-black px-3 py-2 text-left font-bold">ITEM</th>
                      <th className="border border-black px-3 py-2 text-left font-bold">DESCRIPTION</th>
                      <th className="border border-black px-3 py-2 text-left font-bold">COLOUR</th>
                      <th className="border border-black px-3 py-2 text-center font-bold">QTY</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={4} className="border border-black px-3 py-8 text-center text-gray-500">No items in this proforma</td>
                    </tr>
                  </tbody>
                </table>
              );
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
                <div key={section} className="mb-6">
                  <h3 className="mb-3 text-lg font-bold">{section}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-white">
                          <th className="border border-black px-3 py-2 text-left font-bold">ITEM</th>
                          <th className="border border-black px-3 py-2 text-left font-bold">DESCRIPTION</th>
                          <th className="border border-black px-3 py-2 text-left font-bold">COLOUR</th>
                          <th className="border border-black px-3 py-2 text-center font-bold">QTY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionItems.map((item, index) => (
                          <>
                            <tr key={index}>
                              <td className="border border-black px-3 py-2">{item.item || item.item_name || '—'}</td>
                              <td className="border border-black px-3 py-2">{item.description || '—'}</td>
                              <td className="border border-black px-3 py-2">{item.color || item.colour || '—'}</td>
                              <td className="border border-black px-3 py-2 text-center">{item.quantity || 1}</td>
                            </tr>
                            {(item.subItems || item.sub_items || []).map((sub: any, subIndex: number) => (
                              <tr key={`${index}-sub-${subIndex}`} className="bg-gray-50">
                                <td className="border border-black px-3 py-2 pl-6 text-sm">{sub.item || '—'}</td>
                                <td className="border border-black px-3 py-2 text-sm">{sub.description || '—'}</td>
                                <td className="border border-black px-3 py-2 text-sm">{sub.color || sub.colour || '—'}</td>
                                <td className="border border-black px-3 py-2 text-center text-sm">{sub.quantity || 1}</td>
                              </tr>
                            ))}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Section totals */}
                  <div className="flex justify-end mt-2">
                    <table className="border-collapse" style={{ width: '35%' }}>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-1 font-medium bg-gray-50 text-sm">{section} Subtotal</td>
                          <td className="border border-gray-300 px-3 py-1 text-right text-sm">{fmt(sectionRaw)}</td>
                        </tr>
                        {hasItemDiscount && (
                          <tr>
                            <td className="border border-gray-300 px-3 py-1 text-sm text-red-600">Section Discount</td>
                            <td className="border border-gray-300 px-3 py-1 text-right text-sm text-red-600">-{fmt(itemDiscountTotal)}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="border border-gray-300 px-3 py-1 font-bold bg-gray-100 text-sm">{section} Total</td>
                          <td className="border border-gray-300 px-3 py-1 text-right font-bold text-sm">{fmt(sectionAfterItemDiscounts)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Totals */}
        <div className="mb-6 flex justify-end">
          <table className="border-collapse" style={{ width: '40%' }}>
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">SUB TOTAL</td>
                <td className="border border-black px-3 py-2 text-right">{fmt(subtotalAfterSectionDiscounts)}</td>
              </tr>
              {globalDiscountPercent > 0 && (
                <tr>
                  <td className="border border-black px-3 py-2 font-semibold bg-gray-50">DISCOUNT ({globalDiscountPercent}%)</td>
                  <td className="border border-black px-3 py-2 text-right text-red-600">-{fmt(globalDiscountAmount)}</td>
                </tr>
              )}
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">VAT ({vatPercentage}%)</td>
                <td className="border border-black px-3 py-2 text-right">{fmt(vat)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-bold bg-gray-50">TOTAL</td>
                <td className="border border-black px-3 py-2 text-right font-bold">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment terms */}
        <div className="mb-6 space-y-2 text-sm">
          <p className="font-semibold">This is a Proforma Invoice - not a VAT invoice.</p>
          <p className="font-semibold">Payment is required before goods are dispatched or work commences.</p>
        </div>
        <div className="mb-8 text-sm font-semibold text-red-600">
          <p>Please sign here to confirm.</p>
        </div>

        {/* Signature */}
        <div className="space-y-4 text-sm">
          {["Customer Signature:", "Customer Name:", "Date:"].map(label => (
            <div key={label} className="flex items-center">
              <span className="mr-2">{label}</span>
              <span className="flex-1 border-b border-dotted border-black" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}