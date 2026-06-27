// src/app/form/[token]/shared-components.tsx

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, X } from "lucide-react";
import { BACKEND_URL } from "@/lib/api";
import type { OrderMaterialsDialogProps } from "./shared-types";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OrderItem {
  label: string;
  included: boolean;
  style: string;
  type: string;
  colour: string;
  size: string;
  code: string;
  material: string;
  features: string;
  supplier: string;
  quantity: string;
  estimated_cost: string;
  order_date: string;
  expected_delivery: string;
  notes: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const isNAVal = (v: any) =>
  !v || ['n/a', 'na', '0', '', '[]'].includes(String(v).trim().toLowerCase());

const safeVal = (v: any): string => (isNAVal(v) ? '' : String(v).trim());

function blankItem(label: string): OrderItem {
  return {
    label,
    included: true,
    style: '', type: '', colour: '', size: '', code: '', material: '', features: '',
    supplier: '',
    quantity: '1',
    estimated_cost: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery: '',
    notes: '',
  };
}

function serialiseItem(item: OrderItem): string {
  const lines: string[] = [`[${item.label}]`];
  if (item.style)    lines.push(`Style: ${item.style}`);
  if (item.type)     lines.push(`Type: ${item.type}`);
  if (item.colour)   lines.push(`Colour: ${item.colour}`);
  if (item.size)     lines.push(`Size: ${item.size}`);
  if (item.code)     lines.push(`Code: ${item.code}`);
  if (item.material) lines.push(`Material: ${item.material}`);
  if (item.features) lines.push(`Features: ${item.features}`);
  return lines.join('\n');
}

const DETAIL_FIELDS: Array<{ key: keyof OrderItem; label: string }> = [
  { key: 'style',    label: 'Make / Style' },
  { key: 'type',     label: 'Type' },
  { key: 'colour',   label: 'Colour' },
  { key: 'size',     label: 'Size' },
  { key: 'code',     label: 'Code / Model' },
  { key: 'material', label: 'Material' },
  { key: 'features', label: 'Features' },
];

function extractGroupedItems(sectionTitle: string, data: Record<string, any>): OrderItem[] {
  const items: OrderItem[] = [];

  switch (sectionTitle) {
    case 'Material Specifications': {
      const hasDoor = !isNAVal(data.door_style) || !isNAVal(data.door_color) || !isNAVal(data.door_type);
      if (hasDoor) {
        const d = blankItem('Door');
        d.style    = safeVal(data.door_style);
        d.type     = safeVal(data.door_type);
        d.colour   = safeVal(data.door_color);
        d.code     = [safeVal(data.door_manufacturer), safeVal(data.door_name)].filter(Boolean).join(' – ');
        d.material = safeVal(data.glazing_material);
        items.push(d);
      }
      (data.additional_doors || []).forEach((door: any, i: number) => {
        if (isNAVal(door.door_style) && isNAVal(door.door_color)) return;
        const d = blankItem(`Door (Additional ${i + 1})`);
        d.style    = safeVal(door.door_style);
        d.type     = safeVal(door.door_type);
        d.colour   = safeVal(door.door_color);
        d.code     = [safeVal(door.door_manufacturer), safeVal(door.door_name)].filter(Boolean).join(' – ');
        d.quantity = safeVal(door.quantity) || '1';
        items.push(d);
      });
      if (!isNAVal(data.end_panel_color)) {
        const p = blankItem('End Panel'); p.colour = safeVal(data.end_panel_color); items.push(p);
      }
      if (!isNAVal(data.plinth_filler_color)) {
        const p = blankItem('Plinth / Filler'); p.colour = safeVal(data.plinth_filler_color); items.push(p);
      }
      if (!isNAVal(data.cabinet_color)) {
        const c = blankItem('Cabinet'); c.colour = safeVal(data.cabinet_color); items.push(c);
      }
      break;
    }

    case 'Hardware Specifications': {
      if (!isNAVal(data.handles_code) || !isNAVal(data.handles_quantity)) {
        const h = blankItem('Handles');
        h.code     = safeVal(data.handles_code);
        h.size     = safeVal(data.handles_size);
        h.quantity = safeVal(data.handles_quantity) || '1';
        items.push(h);
      }
      (data.additional_handles || []).forEach((h: any, i: number) => {
        if (isNAVal(h.handles_code)) return;
        const item = blankItem(`Handles (Additional ${i + 1})`);
        item.code     = safeVal(h.handles_code);
        item.size     = safeVal(h.handles_size);
        item.quantity = safeVal(h.handles_quantity) || '1';
        items.push(item);
      });
      if (!isNAVal(data.accessories)) {
        const a = blankItem('Accessories'); a.features = safeVal(data.accessories); items.push(a);
      }
      if (!isNAVal(data.lighting_spec) || !isNAVal(data.under_wall_unit_lights_color)) {
        const l = blankItem('Lighting');
        l.type = safeVal(data.lighting_spec);
        const uwParts = [safeVal(data.under_wall_unit_lights_color), safeVal(data.under_wall_unit_lights_profile)].filter(Boolean);
        if (uwParts.length) l.colour = `Under wall: ${uwParts.join(' / ')}`;
        if (!isNAVal(data.under_worktop_lights_color)) {
          l.colour += (l.colour ? '; ' : '') + `Under worktop: ${data.under_worktop_lights_color}`;
        }
        items.push(l);
      }
      break;
    }

    case 'Worktop Specifications': {
      if (!isNAVal(data.worktop_material_type) || !isNAVal(data.worktop_code) || !isNAVal(data.worktop_material_color)) {
        const w = blankItem('Worktop');
        w.material = safeVal(data.worktop_material_type);
        w.colour   = safeVal(data.worktop_material_color);
        w.code     = safeVal(data.worktop_code);
        w.size     = safeVal(data.worktop_size);
        w.features = (data.worktop_features || []).filter((f: string) => !isNAVal(f)).join(', ');
        if (!isNAVal(data.worktop_other_details)) w.notes = safeVal(data.worktop_other_details);
        items.push(w);
      }
      (data.additional_worktops || []).forEach((wt: any, i: number) => {
        if (isNAVal(wt.worktop_code) && isNAVal(wt.worktop_material_color)) return;
        const w = blankItem(`Worktop (Additional ${i + 1})`);
        w.material = safeVal(wt.worktop_material_type);
        w.colour   = safeVal(wt.worktop_material_color);
        w.code     = safeVal(wt.worktop_code);
        w.size     = safeVal(wt.worktop_size);
        w.features = (wt.worktop_features || []).filter((f: string) => !isNAVal(f)).join(', ');
        items.push(w);
      });
      break;
    }

    case 'Appliances': {
      const appLabels = ['Oven', 'Microwave', 'Washing Machine', 'Dryer', 'Hob', 'Extractor', 'INTG Dishwasher'];
      (data.appliances || []).forEach((a: any, i: number) => {
        if (isNAVal(a.make) && isNAVal(a.model)) return;
        const item = blankItem(appLabels[i] || `Appliance ${i + 1}`);
        item.style = safeVal(a.make);
        item.code  = safeVal(a.model);
        items.push(item);
      });
      if (!isNAVal(data.integ_fridge_make)) {
        const f = blankItem('INTG Fridge / Freezer');
        f.style    = safeVal(data.integ_fridge_make);
        f.code     = safeVal(data.integ_fridge_model);
        f.quantity = safeVal(data.integ_fridge_qty) || '1';
        items.push(f);
      }
      if (!isNAVal(data.integ_freezer_make)) {
        const f = blankItem('INTG Freezer');
        f.style    = safeVal(data.integ_freezer_make);
        f.code     = safeVal(data.integ_freezer_model);
        f.quantity = safeVal(data.integ_freezer_qty) || '1';
        items.push(f);
      }
      if (!isNAVal(data.sink_details)) {
        const s = blankItem('Sink');
        s.type = safeVal(data.sink_details);
        s.code = safeVal(data.sink_model);
        items.push(s);
      }
      if (!isNAVal(data.tap_details)) {
        const t = blankItem('Tap');
        t.type = safeVal(data.tap_details);
        t.code = safeVal(data.tap_model);
        items.push(t);
      }
      break;
    }

    case 'Bedroom Furniture': {
      if (!isNAVal(data.bedside_cabinets_type)) {
        const b = blankItem('Bedside Cabinets');
        b.type     = safeVal(data.bedside_cabinets_type);
        b.quantity = safeVal(data.bedside_cabinets_qty) || '1';
        items.push(b);
      }
      if (data.dresser_desk === 'yes' && !isNAVal(data.dresser_desk_details)) {
        const d = blankItem('Dresser / Desk');
        d.type = safeVal(data.dresser_desk_details);
        items.push(d);
      }
      if (data.internal_mirror === 'yes' && !isNAVal(data.internal_mirror_details)) {
        const m = blankItem('Internal Mirror');
        m.type = safeVal(data.internal_mirror_details);
        items.push(m);
      }
      if (!isNAVal(data.mirror_type)) {
        const m = blankItem('Mirror');
        m.type     = safeVal(data.mirror_type);
        m.quantity = safeVal(data.mirror_qty) || '1';
        items.push(m);
      }
      break;
    }

    case 'Lighting': {
      if (!isNAVal(data.soffit_lights_type)) {
        const l = blankItem('Soffit Lights');
        l.type   = safeVal(data.soffit_lights_type);
        l.colour = safeVal(data.soffit_lights_color);
        items.push(l);
      }
      if (!isNAVal(data.gable_lights_type)) {
        const l = blankItem('Gable Lights');
        l.type   = safeVal(data.gable_lights_type);
        l.colour = [safeVal(data.gable_lights_main_color), safeVal(data.gable_lights_profile_color)].filter(Boolean).join(' / ');
        items.push(l);
      }
      break;
    }

    case 'Accessories': {
      if (!isNAVal(data.other_accessories)) {
        const a = blankItem('Accessories');
        a.features = safeVal(data.other_accessories);
        items.push(a);
      }
      const fp = (data.floor_protection || []).filter(
        (f: string) => !isNAVal(f) && f !== 'No Floor Protection Required'
      );
      if (fp.length) {
        const f = blankItem('Floor Protection');
        f.features = fp.join(', ');
        items.push(f);
      }
      break;
    }
  }

  return items;
}

// ── OrderButton ────────────────────────────────────────────────────────────────

export function OrderButton({
  sectionTitle,
  onClick,
  userRole,
}: {
  sectionTitle: string;
  onClick: () => void;
  userRole: string;
}) {
  if (userRole === 'sales' || userRole === 'hr') return null;
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="flex items-center gap-1 text-xs print:hidden"
      onClick={onClick}
    >
      <Package className="h-3 w-3" />
      Order
    </Button>
  );
}

// ── NAButton ───────────────────────────────────────────────────────────────────

export function NAButton({ sectionType, onClick }: { sectionType: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="flex items-center gap-1 text-xs border-gray-400 text-gray-700 hover:bg-gray-100 print:hidden"
      onClick={onClick}
    >
      <X className="h-3 w-3" />
      Mark All N/A
    </Button>
  );
}

// ── OrderMaterialsDialog ───────────────────────────────────────────────────────

export function OrderMaterialsDialog({
  isOpen,
  onClose,
  sectionTitle,
  sectionData,
  customerInfo,
}: OrderMaterialsDialogProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOrderItems(extractGroupedItems(sectionTitle, sectionData));
    }
  }, [isOpen, sectionTitle, sectionData]);

  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    setOrderItems(prev => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const handleSubmitOrder = async () => {
    const included = orderItems.filter(i => i.included);
    if (included.length === 0) { alert('No materials selected'); return; }

    setSubmitting(true);
    let ok = 0, fail = 0;
    try {
      const token = localStorage.getItem('token');
      for (const item of included) {
        const payload = {
          customer_id: customerInfo.id,
          material_description: serialiseItem(item),
          supplier_name: item.supplier.trim() || null,
          estimated_cost: item.estimated_cost ? parseFloat(item.estimated_cost) : null,
          order_date: item.order_date || null,
          expected_delivery_date: item.expected_delivery || null,
          notes: item.notes.trim() || null,
          quantity: parseInt(item.quantity) || 1,
          status: 'ordered',
        };
        const res = await fetch(`${BACKEND_URL}/api/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        res.ok ? ok++ : fail++;
      }
      if (fail === 0) alert(`✅ ${ok} material order${ok !== 1 ? 's' : ''} created!`);
      else alert(`⚠️ ${ok} created, ${fail} failed.`);
      onClose();
      setOrderItems([]);
    } catch {
      alert('Failed to create orders. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const includedCount = orderItems.filter(i => i.included).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Order Materials</h2>
              <p className="text-sm text-gray-500 mt-1">{sectionTitle} — {customerInfo.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {orderItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No materials found in this section</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">
                {includedCount} of {orderItems.length} items selected
              </p>

              {orderItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border-2 transition-colors ${
                    item.included ? 'border-blue-200 bg-white shadow-sm' : 'border-gray-200 bg-gray-50 opacity-50'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={e => updateItem(idx, { included: e.target.checked })}
                      className="h-4 w-4 rounded accent-blue-600"
                    />
                    <span className="font-semibold text-gray-800 text-sm flex-1">{item.label}</span>
                  </div>

                  {item.included && (
                    <div className="px-4 py-4 space-y-3">
                      {/* Auto-filled detail fields */}
                      <div className="grid grid-cols-2 gap-3">
                        {DETAIL_FIELDS.map(({ key, label }) => (
                          <div key={key}>
                            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                              {label}
                            </label>
                            <Input
                              value={item[key] as string}
                              onChange={e => updateItem(idx, { [key]: e.target.value })}
                              placeholder="—"
                              className="h-8 text-sm bg-gray-50 focus:bg-white"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-dashed border-gray-200 pt-3" />

                      {/* Order fields */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Supplier</label>
                          <Input
                            value={item.supplier}
                            onChange={e => updateItem(idx, { supplier: e.target.value })}
                            placeholder="e.g. Howdens"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Quantity</label>
                          <Input
                            type="number" min="1"
                            value={item.quantity}
                            onChange={e => updateItem(idx, { quantity: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Est. Cost (£)</label>
                          <Input
                            type="number" step="0.01" min="0" placeholder="0.00"
                            value={item.estimated_cost}
                            onChange={e => updateItem(idx, { estimated_cost: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Date Ordered</label>
                          <input
                            type="date"
                            value={item.order_date}
                            onChange={e => updateItem(idx, { order_date: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm h-8"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Expected Delivery</label>
                          <input
                            type="date"
                            value={item.expected_delivery}
                            onChange={e => updateItem(idx, { expected_delivery: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm h-8"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Notes</label>
                        <textarea
                          rows={2}
                          placeholder="Any special instructions..."
                          value={item.notes}
                          onChange={e => updateItem(idx, { notes: e.target.value })}
                          className="w-full resize-none rounded-md border border-gray-300 p-2 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitOrder}
            disabled={submitting || includedCount === 0}
          >
            {submitting
              ? 'Creating Orders...'
              : `Create ${includedCount} Order${includedCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}