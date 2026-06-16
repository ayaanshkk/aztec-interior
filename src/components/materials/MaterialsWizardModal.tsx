"use client";

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ClipboardList, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BACKEND_URL } from '@/lib/api';

interface OrderItem {
  material: string;
  supplier: string;
  estimated_cost: string;
  order_date: string;
  expected_delivery: string;
  notes: string;
  included: boolean;
}

interface Checklist {
  id: string;
  form_type: string;
  created_at: string;
  room?: string;
}

interface Props {
  customerId: string;
  customerName: string;
  onClose: () => void;
}

export function MaterialsWizardModal({ customerId, customerName, onClose }: Props) {
  const [step, setStep] = useState<'select_checklist' | 'review_items'>('select_checklist');
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchChecklists();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const fetchChecklists = async () => {
    setChecklistsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/form/form-submissions?customer_id=${customerId}`,
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      const list: any[] = Array.isArray(data) ? data : (data.submissions || []);
      setChecklists(list.map((s: any) => ({
        id: s.id,
        form_type: s.form_data?.form_type || s.form_type || 'unknown',
        created_at: s.created_at,
        room: s.form_data?.room || '',
      })));
    } catch {
      setChecklists([]);
    } finally {
      setChecklistsLoading(false);
    }
  };

  const isNA = (v: any) => !v || String(v).trim().toLowerCase() === 'n/a' || String(v).trim() === '0';

	const extractMaterials = (formData: any): string[] => {
		const items: string[] = [];
		const isKitchen = (formData.form_type || '').toLowerCase().includes('kitchen');

		const isNA = (v: any) => !v || String(v).trim().toLowerCase() === 'n/a' || String(v).trim() === '0';

		const push = (label: string, value: any) => {
			if (!value) return;
			const str = String(value).trim();
			if (!str) return;
			const cleaned = str.replace(/N\/A/gi, '').replace(/[-\/\s]/g, '');
			if (!cleaned) return;
			items.push(`${label}: ${value}`);
		};

		// ── Material Specs ──
		push('Door Style', formData.door_style);
		push('Door Type', formData.door_type);
		push('Door Color', formData.door_color);
		push('Door Manufacturer', formData.door_manufacturer);
		push('Door Name', formData.door_name);
		push('Glazing Material', formData.glazing_material);
		push('Panel Color', formData.end_panel_color);
		push('Plinth/Filler Color', formData.plinth_filler_color);
		push('Cabinet Color', formData.cabinet_color);
		push('Worktop Color', formData.worktop_material_color);

		(formData.additional_doors || []).forEach((d: any, i: number) => {
			if (d.door_style || d.door_color) {
				items.push(`\n--- Additional Door ${i + 1} ---`);
				push('Door Style', d.door_style);
				push('Door Type', d.door_type);
				push('Door Color', d.door_color);
				push('Door Manufacturer', d.door_manufacturer);
				push('Door Name', d.door_name);
				push('Glazing Material', d.glazing_material);
				push('Panel Color', d.panel_color);
				push('Plinth Color', d.plinth_color);
				push('Cabinet Color', d.cabinet_color);
				push('Worktop Color', d.worktop_color);
				push('Quantity', d.quantity);
			}
		});

		// ── Hardware ──
		push('Handle Code', formData.handles_code);
		push('Handle Quantity', formData.handles_quantity);
		push('Handle Size', formData.handles_size);

		(formData.additional_handles || []).forEach((h: any, i: number) => {
			if (h.handles_code) {
				items.push(`\n--- Additional Handle ${i + 1} ---`);
				push('Handle Code', h.handles_code);
				push('Handle Quantity', h.handles_quantity);
				push('Handle Size', h.handles_size);
			}
		});

		if (isKitchen) {
			push('Accessories', formData.accessories);
			push('Lighting Spec', formData.lighting_spec);

			if (!isNA(formData.under_wall_unit_lights_color) && !isNA(formData.under_wall_unit_lights_profile)) {
				push('Under Wall Unit Lights', `${formData.under_wall_unit_lights_color} / ${formData.under_wall_unit_lights_profile}`);
			}
			if (!isNA(formData.under_worktop_lights_color)) {
				push('Under Worktop Lights', formData.under_worktop_lights_color);
			}

			// ── Worktop ──
			push('Worktop Material', formData.worktop_material_type);
			push('Worktop Code', formData.worktop_code);
			push('Worktop Size', formData.worktop_size);
			if (formData.worktop_features?.length) {
				push('Worktop Features', formData.worktop_features.join(', '));
			}
			push('Worktop Other', formData.worktop_other_details);

			(formData.additional_worktops || []).forEach((w: any, i: number) => {
				if (w.worktop_material_type || w.worktop_code) {
					items.push(`\n--- Additional Worktop ${i + 1} ---`);
					push('Material', w.worktop_material_type);
					push('Color', w.worktop_material_color);
					push('Code', w.worktop_code);
					push('Size', w.worktop_size);
					if (w.worktop_features?.length) push('Features', w.worktop_features.join(', '));
					push('Other', w.worktop_other_details);
				}
			});

			// ── Appliances ──
			const appLabels = ['Oven', 'Microwave', 'Washing Machine', 'Dryer', 'HOB', 'Extractor', 'INTG Dishwasher'];
			(formData.appliances || []).forEach((a: any, i: number) => {
				if (!a.make && !a.model) return;
				const makeStr = String(a.make || '').trim();
				const modelStr = String(a.model || '').trim();
				if (isNA(makeStr) && isNA(modelStr)) return;
				const makeLower = makeStr.toLowerCase();
				if (
					makeLower.includes('intg fridge') ||
					makeLower.includes('intg freezer') ||
					makeLower.includes('no make specified') ||
					makeLower.includes('no model specified') ||
					(makeLower.includes('n/a') && modelStr === '') ||
					(isNA(makeStr) && isNA(modelStr))
				) return;
				if (i >= 7) return;
				push(appLabels[i] || `Appliance ${i + 1}`, `${makeStr} ${modelStr}`.trim());
			});

			if (formData.integ_fridge_make && !isNA(formData.integ_fridge_make) && !isNA(formData.integ_fridge_qty)) {
				push(
					`INTG Fridge/Freezer (Qty: ${formData.integ_fridge_qty || 1})`,
					`${formData.integ_fridge_make} ${formData.integ_fridge_model || ''}`.trim()
				);
			}
			if (formData.integ_freezer_make && !isNA(formData.integ_freezer_make) && !isNA(formData.integ_freezer_qty)) {
				push(
					`INTG Freezer (Qty: ${formData.integ_freezer_qty || 1})`,
					`${formData.integ_freezer_make} ${formData.integ_freezer_model || ''}`.trim()
				);
			}
			if (!isNA(formData.sink_details)) {
				push('Sink', `${formData.sink_details} (Model: ${formData.sink_model || 'N/A'})`);
			}
			if (!isNA(formData.tap_details)) {
				push('Tap', `${formData.tap_details} (Model: ${formData.tap_model || 'N/A'})`);
			}

		} else {
			// ── Bedroom ──
			push('Worktop Code', formData.worktop_code);

			(formData.additional_worktops || []).forEach((w: any, i: number) => {
				if (w.worktop_material_type || w.worktop_code) {
					items.push(`\n--- Additional Worktop ${i + 1} ---`);
					push('Material', w.worktop_material_type);
					push('Color', w.worktop_material_color);
					push('Code', w.worktop_code);
					push('Size', w.worktop_size);
					if (w.worktop_features?.length) push('Features', w.worktop_features.join(', '));
				}
			});

			if (!isNA(formData.bedside_cabinets_type) && !isNA(formData.bedside_cabinets_qty)) {
				push('Bedside Cabinets', `${formData.bedside_cabinets_type} (Qty: ${formData.bedside_cabinets_qty})`);
			}
			if (formData.dresser_desk === 'yes' && !isNA(formData.dresser_desk_details)) {
				push('Dresser/Desk', formData.dresser_desk_details || 'Yes');
			}
			if (formData.internal_mirror === 'yes' && !isNA(formData.internal_mirror_details)) {
				push('Internal Mirror', formData.internal_mirror_details || 'Yes');
			}
			if (!isNA(formData.mirror_type) && !isNA(formData.mirror_qty)) {
				push('Mirror', `${formData.mirror_type} (Qty: ${formData.mirror_qty})`);
			}
			if (!isNA(formData.soffit_lights_type) && !isNA(formData.soffit_lights_color)) {
				push('Soffit Lights', `${formData.soffit_lights_type} - ${formData.soffit_lights_color}`);
			}
			if (!isNA(formData.gable_lights_type) && !isNA(formData.gable_lights_main_color)) {
				push('Gable Lights', `${formData.gable_lights_type} - ${formData.gable_lights_main_color || ''} / ${formData.gable_lights_profile_color || ''}`);
			}
			if (!isNA(formData.other_accessories)) {
				push('Accessories', formData.other_accessories);
			}
			if (formData.floor_protection?.length) {
				const nonNA = formData.floor_protection.filter(
					(f: string) => !isNA(f) && f !== 'No Floor Protection Required'
				);
				if (nonNA.length > 0) push('Floor Protection', nonNA.join(', '));
			}
		}

		return items.filter(i => {
			if (!i.trim()) return false;
			if (i.startsWith('\n---')) return true;
			const colonIdx = i.indexOf(':');
			if (colonIdx === -1) return true;
			const value = i.substring(colonIdx + 1).trim();
			const cleaned = value.replace(/N\/A/gi, '').replace(/[-\/\s]/g, '');
			return cleaned.length > 0;
		});
	};

  const handleChecklistSelected = async (checklistId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/form/form-submissions/${checklistId}`,
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      const formData = typeof data.form_data === 'string' ? JSON.parse(data.form_data) : data.form_data;
      const materials = extractMaterials(formData);
      setOrderItems(materials.map(m => ({
        material: m,
        supplier: '',
        estimated_cost: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: '',
        notes: '',
        included: !m.startsWith('\n---'),
      })));
      setStep('review_items');
    } catch {
      alert('Failed to load checklist. Please try again.');
    }
  };

  const handleAddItem = () => {
    setOrderItems(prev => [...prev, {
      material: '', supplier: '', estimated_cost: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery: '', notes: '', included: true,
    }]);
  };

  const handleSubmit = async () => {
    const included = orderItems.filter(i => i.included && !i.material.startsWith('\n---') && i.material.trim());
    if (included.length === 0) { alert('No materials selected'); return; }

    setIsSubmitting(true);
    let success = 0, fail = 0;
    try {
      const token = localStorage.getItem('token');
      for (const item of included) {
        const res = await fetch(`${BACKEND_URL}/api/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            client_id: customerId,
            material_description: item.material,
            supplier_name: item.supplier.trim() || null,
            estimated_cost: item.estimated_cost ? parseFloat(item.estimated_cost) : null,
            order_date: item.order_date,
            expected_delivery_date: item.expected_delivery || null,
            notes: item.notes.trim() || null,
            status: 'ordered',
          }),
        });
        if (res.ok) success++; else fail++;
      }
      if (fail === 0) alert(`✅ ${success} order${success > 1 ? 's' : ''} created!`);
      else alert(`⚠️ ${success} created, ${fail} failed.`);
      onClose();
    } catch {
      alert('Failed to create orders.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[85vw] max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'select_checklist' ? 'Order Materials — Select Checklist' : 'Order Materials — Review Items'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Customer: {customerName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step 1: Select Checklist */}
          {step === 'select_checklist' && (
            <div className="space-y-3">
              {checklistsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                  <span className="ml-3 text-gray-500">Loading checklists...</span>
                </div>
							) : checklists.length === 0 ? (
								<div className="text-center py-8">
									<ClipboardList className="h-10 w-10 text-gray-400 mx-auto mb-3" />
									<p className="text-gray-600 mb-1 font-medium">No checklists found for this customer</p>
									<p className="text-sm text-gray-400 mb-6">Please fill in a checklist first, then come back to order materials.</p>
									<div className="flex flex-col sm:flex-row gap-3 justify-center">
										<button
											onClick={() => {
												const params = new URLSearchParams({
													customerId: customerId,
													customerName: customerName,
												});
												window.open(`/checklists/kitchen?${params.toString()}`, '_blank');
											}}
											className="flex items-center justify-center gap-3 p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:border-green-400 hover:bg-green-100 transition-colors text-left w-full sm:w-48"
										>
											<div className="p-2 rounded-lg bg-green-100">
												<ClipboardList className="h-5 w-5 text-green-600" />
											</div>
											<div>
												<p className="font-semibold text-green-900 text-sm">Kitchen</p>
												<p className="text-xs text-green-600">Fill checklist</p>
											</div>
										</button>
										<button
											onClick={() => {
												const params = new URLSearchParams({
													customerId: customerId,
													customerName: customerName,
												});
												window.open(`/checklists/bedroom?${params.toString()}`, '_blank');
											}}
											className="flex items-center justify-center gap-3 p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:border-purple-400 hover:bg-purple-100 transition-colors text-left w-full sm:w-48"
										>
											<div className="p-2 rounded-lg bg-purple-100">
												<ClipboardList className="h-5 w-5 text-purple-600" />
											</div>
											<div>
												<p className="font-semibold text-purple-900 text-sm">Bedroom</p>
												<p className="text-xs text-purple-600">Fill checklist</p>
											</div>
										</button>
									</div>
									<p className="text-xs text-gray-400 mt-4">After submitting, close this dialog and try again.</p>
									<Button variant="outline" onClick={onClose} className="mt-3">Close</Button>
								</div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">Select a checklist to auto-extract materials:</p>
                  {checklists.map(cl => {
                    const isKitchen = (cl.form_type || '').toLowerCase().includes('kitchen');
                    return (
                      <button
                        key={cl.id}
                        onClick={() => handleChecklistSelected(cl.id)}
                        className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isKitchen ? 'bg-green-100' : 'bg-purple-100'}`}>
                            <ClipboardList className={`h-5 w-5 ${isKitchen ? 'text-green-600' : 'text-purple-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {isKitchen ? 'Kitchen' : 'Bedroom'} Checklist
                              {cl.room ? ` — ${cl.room}` : ''}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(cl.created_at)}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Step 2: Review Items */}
          {step === 'review_items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">
                  {orderItems.filter(i => i.included && !i.material.startsWith('\n---')).length} of{' '}
                  {orderItems.filter(i => !i.material.startsWith('\n---')).length} items selected
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={handleAddItem} className="flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Item
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setStep('select_checklist')}>← Back</Button>
                </div>
              </div>

              {orderItems.map((item, idx) => {
                if (item.material.startsWith('\n---')) {
                  return (
                    <p key={idx} className="text-xs font-semibold text-gray-500 uppercase pt-2">
                      {item.material.replace(/\n---\s*/g, '').replace(/\s*---/g, '')}
                    </p>
                  );
                }
                return (
                  <div key={idx} className={`rounded-lg border-2 p-5 transition-colors ${item.included ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={item.included}
                        onChange={e => {
                          const u = [...orderItems];
                          u[idx] = { ...u[idx], included: e.target.checked };
                          setOrderItems(u);
                        }}
                        className="mt-0.5 h-4 w-4 rounded"
                      />
                      {item.material === '' ? (
                        <Input
                          placeholder="Enter material description..."
                          value={item.material}
                          onChange={e => {
                            const u = [...orderItems];
                            u[idx] = { ...u[idx], material: e.target.value };
                            setOrderItems(u);
                          }}
                          className="h-9 text-sm flex-1"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-800 flex-1">{item.material}</span>
                      )}
                    </div>

                    {item.included && (
                      <div className="ml-7 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Supplier</label>
                            <Input placeholder="e.g., Howdens" value={item.supplier}
                              onChange={e => { const u=[...orderItems]; u[idx]={...u[idx],supplier:e.target.value}; setOrderItems(u); }}
                              className="h-10 text-sm" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Estimated Cost (£)</label>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" value={item.estimated_cost}
                              onChange={e => { const u=[...orderItems]; u[idx]={...u[idx],estimated_cost:e.target.value}; setOrderItems(u); }}
                              className="h-10 text-sm" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Date Ordered</label>
                            <input type="date" value={item.order_date}
                              onChange={e => { const u=[...orderItems]; u[idx]={...u[idx],order_date:e.target.value}; setOrderItems(u); }}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Expected Delivery</label>
                            <input type="date" value={item.expected_delivery}
                              onChange={e => { const u=[...orderItems]; u[idx]={...u[idx],expected_delivery:e.target.value}; setOrderItems(u); }}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-600">Notes</label>
                          <textarea rows={2} placeholder="Any special instructions..." value={item.notes}
                            onChange={e => { const u=[...orderItems]; u[idx]={...u[idx],notes:e.target.value}; setOrderItems(u); }}
                            className="w-full resize-none rounded-md border border-gray-300 p-3 text-sm" />
                        </div>
                        <div className="flex justify-end">
                          <Button type="button" variant="ghost" size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                            onClick={() => setOrderItems(prev => prev.filter((_, i) => i !== idx))}>
                            <X className="h-3 w-3 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'review_items' && (
          <div className="border-t p-6 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || orderItems.filter(i => i.included && !i.material.startsWith('\n---') && i.material.trim()).length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? 'Creating Orders...' : `Create ${orderItems.filter(i => i.included && !i.material.startsWith('\n---') && i.material.trim()).length} Order${orderItems.filter(i => i.included && !i.material.startsWith('\n---') && i.material.trim()).length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}