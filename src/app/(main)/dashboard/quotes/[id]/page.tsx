"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Edit } from "lucide-react";
import Image from 'next/image';
import { FileText } from "lucide-react";
import { SignatureField } from "@/components/ui/SignatureField";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.aztec.techmynt.com';

const SECTIONS = ['Furniture', 'Fillers and End Panels', 'Accessories', 'Handles', 'Appliances', 'Sink and Tap', 'Worktops', 'Fittings', 'Miscellaneous'] as const;

export default function ViewQuotePage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const [quotation, setQuotation] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vatPercentage, setVatPercentage] = useState<number>(20);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(value);
  };

  useEffect(() => {
    fetchQuotation();
  }, [quoteId]);

  const fetchQuotation = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/quotations/${quoteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("📋 Quotation data received:", data);
        console.log("📋 Raw items array:", data.items);
        console.log("📋 Number of items:", data.items?.length);
        
        // Debug each item
        data.items?.forEach((item: any, idx: number) => {
          console.log(`Item ${idx}:`, {
            item_name: item.item_name,
            item: item.item,
            description: item.description,
            amount: item.amount,
            isEmpty: !item.item_name && !item.item && !item.description && (!item.amount || item.amount === 0)
          });
        });
        
        setQuotation(data);
        setItems(data.items || []);
        
        // Load VAT percentage if saved
        if (data.vat_percentage !== undefined && data.vat_percentage !== null) {
          setVatPercentage(data.vat_percentage);
        }
        if (data.global_discount_percent !== undefined && data.global_discount_percent !== null) {
          setGlobalDiscountPercent(data.global_discount_percent);
        }
      } else {
        alert("Failed to load quotation");
      }
    } catch (error) {
      console.error("Error fetching quotation:", error);
      alert("Error loading quotation");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateInvoice = () => {
    if (!quotation) return;

    const doorTypeMap: Record<string, string> = {
      'Vinyl Doors': 'Vinyl Doors',   // keep as-is if you standardise dropdowns
      'Basic Slab': 'Basic Slab',
      'Acrylic Gloss/Matt': 'Acrylic Gloss/Matt',
      'Timber': 'Timber',
      'Black Glass': 'Black Glass',
      'Carcass Only': 'Carcass Only',
      // legacy aliases
      'Vinyl': 'Vinyl Doors',
      'Slab': 'Basic Slab',
      'Lacquered Slab': 'Acrylic Gloss/Matt',
    };

    const mappedDoorType = doorTypeMap[quotation.door_type] || quotation.door_type || 'Carcass Only';

    localStorage.setItem("invoiceFromQuote", JSON.stringify({
      customer_name:    quotation.customer_name    || "",
      customer_address: quotation.customer_address || quotation.address || "",
      customer_phone:   quotation.customer_phone   || quotation.phone   || "",
      customer_email:   quotation.customer_email   || quotation.email   || "",
      room_name:        quotation.room_name        || "",
      quote_reference:  quotation.quote_reference  || "",
      door_type: mappedDoorType,
      room_type:        quotation.room_type        || "Kitchen",
      carcass_colour:   quotation.carcass_colour   || "",
      door_colour:      quotation.door_colour      || "",
      panelwork_colour: quotation.panelwork_colour || "",
      door_style:       quotation.door_style       || "",
      vat_percentage:   (quotation.vat_percentage !== undefined && quotation.vat_percentage !== null)
                          ? quotation.vat_percentage
                          : (quotation.vat_rate ?? 20),
      client_id:        quotation.client_id        || quotation.customer_id || null,
      section_discounts: quotation.section_discounts || {},
      global_discount_percent: quotation.global_discount_percent || 0,
      items: (quotation.items || []).map((item: any) => {
        const qty = item.quantity || 1;
        const amt = item.amount || 0;
        const pct = item.discount_percent || 0;
        return {
          item:             item.item        || item.item_code || "",
          description:      item.description || "",
          color:            item.colour      || item.color     || "",
          quantity:         qty,
          amount:           amt,
          discounted_total: item.discounted_total || (pct > 0 ? amt * qty * (1 - pct / 100) : amt * qty),
          width:            item.width,
          height:           item.height,
          depth:            item.depth,
          discount_percent: pct,
          section:          item.section     || "Furniture",
          subItems: (item.subItems || item.sub_items || []).map((sub: any) => {
            const sQty = sub.quantity || 1;
            const sAmt = sub.amount || 0;
            const sPct = sub.discount_percent || 0;
            return {
              item:             sub.item        || sub.item_code || "",
              description:      sub.description || "",
              color:            sub.colour      || sub.color     || "",
              quantity:         sQty,
              amount:           sAmt,
              discounted_total: sub.discounted_total || (sPct > 0 ? sAmt * sQty * (1 - sPct / 100) : sAmt * sQty),
              discount_percent: sPct,
            };
          }),
        };
      }),
    }));

    window.open(`/dashboard/invoices/create?fromQuote=1&customerId=${quotation.client_id || quotation.customer_id || ""}`);
  };

  const handleEdit = () => {
    router.push(`/dashboard/quotes/${quoteId}/edit`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading quotation...</p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Quotation not found</p>
      </div>
    );
  }

  const sectionDiscountsData = quotation?.section_discounts || {};

  const subtotalAfterSectionDiscounts = SECTIONS.reduce((acc, section) => {
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
    return acc + sectionItemTotal;
  }, 0);

  const globalDiscountAmount = subtotalAfterSectionDiscounts * (globalDiscountPercent / 100);
  const subtotal = subtotalAfterSectionDiscounts - globalDiscountAmount;
  const vat = subtotal * (vatPercentage / 100);
  const total = subtotal + vat;

  return (
    <div className="min-h-screen bg-white" data-force-light>
      {/* Nav bar */}
      <div className="border-b px-8 py-3 print:hidden flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 font-medium">Quotation {quotation.reference_number}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleEdit} variant="outline" size="sm">
            <Edit className="mr-2 h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.open(`${BACKEND_URL}/quotations/${quoteId}/pdf`, '_blank')}>
            <Download className="mr-2 h-3.5 w-3.5" /> Download PDF
          </Button>
          <Button size="sm" onClick={handleGenerateInvoice} className="bg-gray-900 hover:bg-gray-800 text-white">
            <FileText className="mr-2 h-3.5 w-3.5" /> Generate Invoice
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
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">Quotation</p>
            <h1 className="text-2xl font-semibold text-gray-900">{quotation.reference_number || 'Draft'}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {quotation.created_at ? new Date(quotation.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Prepared For + Specification */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Prepared For</p>
            <p className="font-semibold text-gray-900">{quotation.customer_name || quotation.client_company_name || quotation.client_name || '—'}</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{quotation.customer_address || '—'}</p>
            <p className="text-sm text-gray-600">{quotation.customer_phone || '—'}</p>
          </div>
          {(quotation.room_name || quotation.carcass_colour || quotation.door_colour || quotation.panelwork_colour || quotation.door_style) && (
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Specification</p>
              <div className="space-y-1.5 text-sm">
                {quotation.room_name && (
                  <div className="flex gap-4">
                    <span className="text-gray-400 w-32 flex-shrink-0">Order Ref</span>
                    <span className="text-gray-800">{quotation.room_name}</span>
                  </div>
                )}
                {quotation.carcass_colour && (
                  <div className="flex gap-4">
                    <span className="text-gray-400 w-32 flex-shrink-0">Carcass Colour</span>
                    <span className="text-gray-800">{quotation.carcass_colour}</span>
                  </div>
                )}
                {quotation.door_colour && (
                  <div className="flex gap-4">
                    <span className="text-gray-400 w-32 flex-shrink-0">Door Colour</span>
                    <span className="text-gray-800">{quotation.door_colour}</span>
                  </div>
                )}
                {quotation.panelwork_colour && (
                  <div className="flex gap-4">
                    <span className="text-gray-400 w-32 flex-shrink-0">Panelwork</span>
                    <span className="text-gray-800">{quotation.panelwork_colour}</span>
                  </div>
                )}
                {quotation.door_style && (
                  <div className="flex gap-4">
                    <span className="text-gray-400 w-32 flex-shrink-0">Door Style</span>
                    <span className="text-gray-800">{quotation.door_style}</span>
                  </div>
                )}
              </div>
            </div>
          )}
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
              return <p className="text-sm text-gray-400 py-8 text-center">No items in this quotation.</p>;
            }

            return SECTIONS.map((section) => {
              const sectionItems = validItems.filter((item) => (item.section || 'Furniture') === section);
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
                  <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-1"><table className="w-full text-sm">
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
                  </table></div>
                  <div className="flex justify-end mt-2 mb-8">
                    <div className="w-72 text-sm rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      {hasItemDiscount && (
                        <>
                          <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
                            <span>Subtotal</span><span>{formatCurrency(sectionRaw)}</span>
                          </div>
                          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 text-red-500">
                            <span>Discount</span><span>-{formatCurrency(itemDiscountTotal)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between px-5 py-3.5 font-semibold bg-gray-900 text-white">
                        <span>{section} Total</span><span>{formatCurrency(sectionAfterItemDiscounts)}</span>
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
              <span>Subtotal</span><span className="text-gray-800">{formatCurrency(subtotalAfterSectionDiscounts)}</span>
            </div>
            {globalDiscountPercent > 0 && (
              <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
                <span>Discount ({globalDiscountPercent}%)</span><span className="text-gray-800">-{formatCurrency(globalDiscountAmount)}</span>
              </div>
            )}
            {quotation.show_ex_vat_total && (
              <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
                <span>Ex VAT Total</span><span className="text-gray-800">{formatCurrency(subtotal)}</span>
              </div>
            )}
            <div className="flex justify-between px-5 py-3 border-b border-gray-50 text-gray-600">
              <span>VAT ({vatPercentage}%)</span><span className="text-gray-800">{formatCurrency(vat)}</span>
            </div>
            <div className="flex justify-between px-5 py-4 bg-gray-900 text-white">
              <span className="font-semibold text-sm">Total</span><span className="font-bold text-lg">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

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
              <p>Full payment required upfront to proceed.</p>
              <p>Please use your name and/or road name as payment reference.</p>
            </div>
          </div>
        </div>

        {/* Additional Terms */}
        {quotation.additional_terms && quotation.additional_terms.filter((t: string) => t.trim()).length > 0 && (
          <div className="border-t border-gray-100 pt-4 mb-4 text-sm text-gray-600">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Additional Terms</p>
            <div className="space-y-1">
              {quotation.additional_terms.filter((t: string) => t.trim()).map((term: string, i: number) => (
                <p key={i}>{term}</p>
              ))}
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {quotation.additional_notes && quotation.additional_notes.trim() && (
          <div className="border-t border-gray-100 pt-4 mb-8 text-sm text-gray-600">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Notes</p>
            <p className="whitespace-pre-wrap">{quotation.additional_notes}</p>
          </div>
        )}

        {/* Signature */}
        <SignatureField customerName={quotation.customer_name} initialData={{
          type: (quotation.signature_type as any) || "none",
          imageData: quotation.signature_image || undefined,
          text: quotation.signature_text || "",
          name: quotation.signature_name || "",
          date: quotation.signature_date || "",
        }} />

      </div>
    </div>
  );
}