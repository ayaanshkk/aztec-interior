"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Edit } from "lucide-react";
import Image from 'next/image';
import { FileText } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aztec-interior.onrender.com';

const SECTIONS = ['Furniture', 'Fillers and End Panels', 'Accessories', 'Handles', 'Appliances', 'Sink and Tap', 'Worktops', 'Fittings'] as const;

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
        if (data.vat_percentage) {
          setVatPercentage(data.vat_percentage);
        }
        if (data.global_discount_percent) {
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

    localStorage.setItem("invoiceFromQuote", JSON.stringify({
      customer_name:    quotation.customer_name    || "",
      customer_address: quotation.customer_address || quotation.address || "",
      customer_phone:   quotation.customer_phone   || quotation.phone   || "",
      customer_email:   quotation.customer_email   || quotation.email   || "",
      room_name:        quotation.room_name        || "",
      door_type:        quotation.door_type        || "Carcass Only",
      room_type:        quotation.room_type        || "Kitchen",
      carcass_colour:   quotation.carcass_colour   || "",
      door_colour:      quotation.door_colour      || "",
      panelwork_colour: quotation.panelwork_colour || "",
      door_style:       quotation.door_style       || "",
      vat_percentage:   quotation.vat_percentage   || quotation.vat_rate || 20,
      client_id:        quotation.client_id        || quotation.customer_id || null,
      section_discounts: quotation.section_discounts || {},
      items: (quotation.items || []).map((item: any) => ({
        item:             item.item        || item.item_code || "",
        description:      item.description || "",
        color:            item.colour      || item.color     || "",
        quantity:         item.quantity    || 1,
        amount:           item.unit_price  || item.amount    || 0,
        width:            item.width,
        height:           item.height,
        depth:            item.depth,
        discount_percent: item.discount_percent || 0,
        section:          item.section     || "Furniture",
        subItems: (item.subItems || item.sub_items || []).map((sub: any) => ({
          item:             sub.item        || sub.item_code || "",
          description:      sub.description || "",
          color:            sub.colour      || sub.color     || "",
          quantity:         sub.quantity    || 1,
          amount:           sub.unit_price  || sub.amount    || 0,
          discount_percent: sub.discount_percent || 0,
        })),
      })),
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

  const subtotalAfterSectionDiscounts = items.reduce((sum, item) => {
    const section = item.section || 'Furniture';
    const sectionDiscountPct = sectionDiscountsData[section] || 0;
    const itemTotal = (item.discount_percent && item.discount_percent > 0)
      ? (item.discounted_total || item.discounted_amount || (item.amount || 0) * (item.quantity || 1))
      : (item.amount || 0) * (item.quantity || 1);
    const subTotal = (item.subItems || item.sub_items || []).reduce((s: number, sub: any) => {
      return s + ((sub.discount_percent && sub.discount_percent > 0)
        ? (sub.discounted_total || sub.discounted_amount || (sub.amount || 0) * (sub.quantity || 1))
        : (sub.amount || 0) * (sub.quantity || 1));
    }, 0);

    const itemPlusSubTotal = itemTotal + subTotal;
    return sum + itemPlusSubTotal * (1 - sectionDiscountPct / 100);
  }, 0);

  const globalDiscountAmount = subtotalAfterSectionDiscounts * (globalDiscountPercent / 100);
  const subtotal = subtotalAfterSectionDiscounts - globalDiscountAmount;
  const vat = subtotal * (vatPercentage / 100);
  const total = subtotal + vat;

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Hidden when printing */}
      <div className="border-b bg-gray-50 px-8 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Quotation {quotation.reference_number}</h1>
              <p className="text-sm text-gray-600">Customer: {quotation.customer_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEdit} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Quote
            </Button>
            {/* <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button> */}
            <Button onClick={() => window.open(`${BACKEND_URL}/quotations/${quoteId}/pdf`, '_blank')}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button
              onClick={handleGenerateInvoice}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileText className="mr-2 h-4 w-4" /> Generate Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Quotation Content */}
      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* Company Header */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <Image
            src="/images/logo3.png"
            alt="Logo"
            width={80}
            height={80}
            className="object-contain"
          />
          <div className="text-4xl font-bold tracking-wider text-gray-800">
            ATELIER LUXE INTERIORS
          </div>
        </div>

        {/* Company Registration Details */}
        <div className="mb-6 space-y-1 bg-green-200 p-3 text-sm">
          <p className="font-semibold">Registered to England No 5246881</p>
          {/* <p className="font-semibold">VAT Reg No.686 8010 72</p> */}
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

        {/* Quotation Title */}
        <h1 className="mb-6 text-center text-2xl font-bold">QUOTATION</h1>

        {/* Customer Information */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50" style={{ width: '20%' }}>DATE:</td>
                <td className="border border-black px-3 py-2">
                  {quotation.created_at ? new Date(quotation.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">NAME:</td>
                <td className="border border-black px-3 py-2">
                  {quotation.customer_name || quotation.client_company_name || quotation.client_name || '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">ADDRESS:</td>
                <td className="border border-black px-3 py-2">
                  {quotation.customer_address || quotation.client_address || '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">TEL:</td>
                <td className="border border-black px-3 py-2">
                  {quotation.customer_phone || quotation.client_phone || '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">ROOM NAME:</td>
                <td className="border border-black px-3 py-2">{quotation.room_name || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">CARCASS COLOUR:</td>
                <td className="border border-black px-3 py-2">{quotation.carcass_colour || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">DOOR COLOUR:</td>
                <td className="border border-black px-3 py-2">{quotation.door_colour || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">PANELWORK COLOUR:</td>
                <td className="border border-black px-3 py-2">{quotation.panelwork_colour || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">DOOR STYLE:</td>
                <td className="border border-black px-3 py-2">{quotation.door_style || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Items Table */}
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
                      <td colSpan={4} className="border border-black px-3 py-8 text-center text-gray-500">No items in this quotation</td>
                    </tr>
                  </tbody>
                </table>
              );
            }

            return SECTIONS.map((section) => {
              const sectionItems = validItems.filter((item) => (item.section || 'Furniture') === section);
              if (sectionItems.length === 0) return null;

              // ✅ Section totals
              const sectionSubtotal = sectionItems.reduce((sum, item) => {
                const lineTotal = (item.amount || 0) * (item.quantity || 1);
                const subTotal = (item.subItems || item.sub_items || []).reduce((s: number, sub: any) =>
                  s + (sub.amount || 0) * (sub.quantity || 1), 0);
                return sum + lineTotal + subTotal;
              }, 0);

              const sectionDiscounted = sectionItems.reduce((sum, item) => {
                const lineTotal = (item.amount || 0) * (item.quantity || 1);
                const itemTotal = (item.discount_percent && item.discount_percent > 0)
                  ? (item.discounted_total || item.discounted_amount || lineTotal)
                  : lineTotal;
                const subTotal = (item.subItems || item.sub_items || []).reduce((s: number, sub: any) => {
                  const subLine = (sub.amount || 0) * (sub.quantity || 1);
                  return s + ((sub.discount_percent && sub.discount_percent > 0)
                    ? (sub.discounted_total || sub.discounted_amount || subLine)
                    : subLine);
                }, 0);
                return sum + itemTotal + subTotal;
              }, 0);

              const sectionDiscount = sectionSubtotal - sectionDiscounted;
              const hasDiscount = sectionDiscount > 0;

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
                          <React.Fragment key={index}>
                            <tr>
                              <td className="border border-black px-3 py-2">{item.item || item.item_name || '—'}</td>
                              <td className="border border-black px-3 py-2">{item.description || '—'}</td>
                              <td className="border border-black px-3 py-2">{item.color || item.colour || '—'}</td>
                              <td className="border border-black px-3 py-2 text-center">{item.quantity || 1}</td>
                            </tr>
                            {(item.subItems || item.sub_items || []).map((sub: any, subIndex: number) => (
                              <tr key={`${index}-sub-${subIndex}`} className="bg-gray-50">
                                <td className="border border-black px-3 py-2 pl-6 text-sm">↳ {sub.item || '—'}</td>
                                <td className="border border-black px-3 py-2 text-sm">{sub.description || '—'}</td>
                                <td className="border border-black px-3 py-2 text-sm">{sub.color || sub.colour || '—'}</td>
                                <td className="border border-black px-3 py-2 text-center text-sm">{sub.quantity || 1}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ✅ Section Totals */}
                  <div className="flex justify-end mt-2">
                    <table className="border-collapse" style={{ width: '35%' }}>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-1 font-medium bg-gray-50 text-sm">{section} Subtotal</td>
                          <td className="border border-gray-300 px-3 py-1 text-right text-sm">{formatCurrency(sectionSubtotal)}</td>
                        </tr>
                        {hasDiscount && (
                          <tr>
                            <td className="border border-gray-300 px-3 py-1 font-medium bg-gray-50 text-sm text-red-600">Discount</td>
                            <td className="border border-gray-300 px-3 py-1 text-right text-sm text-red-600">-{formatCurrency(sectionDiscount)}</td>
                          </tr>
                        )}
                        {(() => {
                          const secDiscPct = sectionDiscountsData[section] || 0;
                          const secDiscAmt = sectionDiscounted * (secDiscPct / 100);
                          const secTotal = sectionDiscounted - secDiscAmt;
                          return (
                            <>
                              {secDiscPct > 0 && (
                                <tr>
                                  <td className="border border-gray-300 px-3 py-1 text-sm text-red-600">Section Discount</td>
                                  <td className="border border-gray-300 px-3 py-1 text-right text-sm text-red-600">-{formatCurrency(secDiscAmt)}</td>
                                </tr>
                              )}
                              <tr>
                                <td className="border border-gray-300 px-3 py-1 font-bold bg-gray-100 text-sm">{section} Total</td>
                                <td className="border border-gray-300 px-3 py-1 text-right font-bold text-sm">{formatCurrency(secTotal)}</td>
                              </tr>
                            </>
                          );
                        })()}
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
                <td className="border border-black px-3 py-2 text-right">{formatCurrency(subtotalAfterSectionDiscounts)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">DISCOUNT {globalDiscountPercent > 0 ? `(${globalDiscountPercent}%)` : ''}</td>
                <td className="border border-black px-3 py-2 text-right text-red-600">
                  {globalDiscountPercent > 0 ? `-${formatCurrency(globalDiscountAmount)}` : '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-semibold bg-gray-50">VAT ({vatPercentage}%)</td>
                <td className="border border-black px-3 py-2 text-right">{formatCurrency(vat)}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-2 font-bold bg-gray-50">TOTAL</td>
                <td className="border border-black px-3 py-2 text-right font-bold">{formatCurrency(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Terms */}
        <div className="mb-6 space-y-2 text-sm">
          <p className="font-semibold">Only Bacs or Cash will be accepted on Delivery and Completion</p>
          <p className="font-semibold">
            NOTE: If you wish to proceed with this quote, you will be required to make the full payment upfront
          </p>
        </div>

        <div className="mb-8 text-sm font-semibold text-red-600">
          <p>Please sign here to confirm.</p>
        </div>

        {/* Signature Section */}
        <div className="space-y-4 text-sm">
          <div className="flex items-center">
            <span className="mr-2">Customer Signature:</span>
            <span className="border-b border-dotted border-black flex-1"></span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">Customer Name:</span>
            <span className="border-b border-dotted border-black flex-1"></span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">Date:</span>
            <span className="border-b border-dotted border-black flex-1"></span>
          </div>
        </div>
      </div>
    </div>
  );
}