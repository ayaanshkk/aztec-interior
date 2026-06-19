"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, 
  Plus, 
  Edit, 
  Truck, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  FileText,
  Trash2,
  X,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { fetchWithAuth } from '@/lib/api';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// ── Types ──────────────────────────────────────────────────────────────────────

interface MaterialOrder {
  id: string;
  customer_id: string;
  customer_name: string;
  client_name?: string;
  material_description: string;
  supplier_name: string | null;
  supplier_reference: string | null;
  status: 'not_ordered' | 'ordered' | 'delivered' | 'delivered_to_customer' | 'in_stock';
  order_date: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  estimated_cost: number | null;
  ordered_by: string | null;
  notes: string | null;
  created_at: string;
  quantity?: number | null;
}

interface Customer {
  id: string;
  name: string;
  stage: string;
}

interface Checklist {
  id: string;
  form_type: string;
  created_at: string;
  customer_name: string;
  room?: string;
}

// ── Structured material card ───────────────────────────────────────────────────
// Each extracted "group" becomes one OrderItem with structured sub-fields.

interface OrderItem {
  // Display / identity
  label: string;           // e.g. "Door", "Handles", "Worktop"
  isSection: boolean;      // true = just a section heading, not orderable
  included: boolean;

  // Auto-filled from checklist
  style: string;
  type: string;
  colour: string;
  size: string;
  code: string;
  material: string;
  features: string;

  // Manual / editable
  supplier: string;
  quantity: string;
  estimated_cost: string;
  order_date: string;
  expected_delivery: string;
  notes: string;
}

interface NewMaterialForm {
  customer_id: string;
  material_description: string;
  supplier_name: string;
  estimated_cost: string;
  order_date: string;
  expected_delivery_date: string;
  notes: string;
}

type WizardStep = 'select_customer' | 'select_checklist' | 'review_items' | 'manual';

// ── Helpers ────────────────────────────────────────────────────────────────────

const isNA = (v: any) =>
  !v || ['n/a', 'na', '0', '-', ''].includes(String(v).trim().toLowerCase());

const safeVal = (v: any): string =>
  isNA(v) ? '' : String(v).trim();

const today = () => new Date().toISOString().split('T')[0];

function blankItem(label: string): OrderItem {
  return {
    label,
    isSection: false,
    included: true,
    style: '', type: '', colour: '', size: '', code: '', material: '', features: '',
    supplier: '',
    quantity: '1',
    estimated_cost: '',
    order_date: today(),
    expected_delivery: '',
    notes: '',
  };
}

// Serialise an OrderItem back to a human-readable description for the DB
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

// ── Extract grouped items from checklist ──────────────────────────────────────

function extractOrderItems(formData: any): OrderItem[] {
  const items: OrderItem[] = [];
  const ft = (formData.form_type || '').toLowerCase();
  const isKitchen = ft.includes('kitchen');

  // ── DOOR (primary) ──────────────────────────────────────────────────────────
  const hasDoor =
    !isNA(formData.door_style) ||
    !isNA(formData.door_type) ||
    !isNA(formData.door_color) ||
    !isNA(formData.door_manufacturer) ||
    !isNA(formData.door_name);

  if (hasDoor) {
    const door = blankItem('Door');
    door.style    = safeVal(formData.door_style);
    door.type     = safeVal(formData.door_type);
    door.colour   = safeVal(formData.door_color);
    door.code     = [safeVal(formData.door_manufacturer), safeVal(formData.door_name)].filter(Boolean).join(' – ');
    door.material = safeVal(formData.glazing_material);
    items.push(door);
  }

  // ── ADDITIONAL DOORS ────────────────────────────────────────────────────────
  (formData.additional_doors || []).forEach((d: any, i: number) => {
    if (isNA(d.door_style) && isNA(d.door_color)) return;
    const door = blankItem(`Door (Additional ${i + 1})`);
    door.style    = safeVal(d.door_style);
    door.type     = safeVal(d.door_type);
    door.colour   = safeVal(d.door_color);
    door.code     = [safeVal(d.door_manufacturer), safeVal(d.door_name)].filter(Boolean).join(' – ');
    door.material = safeVal(d.glazing_material);
    door.quantity = safeVal(d.quantity) || '1';
    items.push(door);
  });

  // ── PANEL ────────────────────────────────────────────────────────────────────
  if (!isNA(formData.end_panel_color)) {
    const panel = blankItem('End Panel');
    panel.colour = safeVal(formData.end_panel_color);
    items.push(panel);
  }

  // ── PLINTH / FILLER ──────────────────────────────────────────────────────────
  if (!isNA(formData.plinth_filler_color)) {
    const plinth = blankItem('Plinth / Filler');
    plinth.colour = safeVal(formData.plinth_filler_color);
    items.push(plinth);
  }

  // ── CABINET ──────────────────────────────────────────────────────────────────
  if (!isNA(formData.cabinet_color)) {
    const cab = blankItem('Cabinet');
    cab.colour = safeVal(formData.cabinet_color);
    items.push(cab);
  }

  // ── HANDLES (primary) ────────────────────────────────────────────────────────
  const hasHandle = !isNA(formData.handles_code) || !isNA(formData.handles_quantity);
  if (hasHandle) {
    const handle = blankItem('Handles');
    handle.code     = safeVal(formData.handles_code);
    handle.size     = safeVal(formData.handles_size);
    handle.quantity = safeVal(formData.handles_quantity) || '1';
    items.push(handle);
  }

  // ── ADDITIONAL HANDLES ──────────────────────────────────────────────────────
  (formData.additional_handles || []).forEach((h: any, i: number) => {
    if (isNA(h.handles_code)) return;
    const handle = blankItem(`Handles (Additional ${i + 1})`);
    handle.code     = safeVal(h.handles_code);
    handle.size     = safeVal(h.handles_size);
    handle.quantity = safeVal(h.handles_quantity) || '1';
    items.push(handle);
  });

  if (isKitchen) {
    // ── LIGHTING ──────────────────────────────────────────────────────────────
    const hasLighting =
      !isNA(formData.lighting_spec) ||
      (!isNA(formData.under_wall_unit_lights_color) && !isNA(formData.under_wall_unit_lights_profile)) ||
      !isNA(formData.under_worktop_lights_color);

    if (hasLighting) {
      const light = blankItem('Lighting');
      light.type = safeVal(formData.lighting_spec);
      const uwParts = [safeVal(formData.under_wall_unit_lights_color), safeVal(formData.under_wall_unit_lights_profile)].filter(Boolean);
      if (uwParts.length) light.colour = `Under wall: ${uwParts.join(' / ')}`;
      if (!isNA(formData.under_worktop_lights_color)) {
        light.colour += (light.colour ? '; ' : '') + `Under worktop: ${formData.under_worktop_lights_color}`;
      }
      items.push(light);
    }

    // ── WORKTOP (primary) ─────────────────────────────────────────────────────
    const hasWorktop =
      !isNA(formData.worktop_material_type) ||
      !isNA(formData.worktop_code) ||
      !isNA(formData.worktop_material_color);

    if (hasWorktop) {
      const wt = blankItem('Worktop');
      wt.material  = safeVal(formData.worktop_material_type);
      wt.colour    = safeVal(formData.worktop_material_color);
      wt.code      = safeVal(formData.worktop_code);
      wt.size      = safeVal(formData.worktop_size);
      wt.features  = Array.isArray(formData.worktop_features)
        ? formData.worktop_features.filter((f: string) => !isNA(f)).join(', ')
        : safeVal(formData.worktop_features);
      if (!isNA(formData.worktop_other_details)) {
        wt.notes = safeVal(formData.worktop_other_details);
      }
      items.push(wt);
    }

    // ── ADDITIONAL WORKTOPS ───────────────────────────────────────────────────
    (formData.additional_worktops || []).forEach((w: any, i: number) => {
      if (isNA(w.worktop_material_type) && isNA(w.worktop_code)) return;
      const wt = blankItem(`Worktop (Additional ${i + 1})`);
      wt.material = safeVal(w.worktop_material_type);
      wt.colour   = safeVal(w.worktop_material_color);
      wt.code     = safeVal(w.worktop_code);
      wt.size     = safeVal(w.worktop_size);
      wt.features = Array.isArray(w.worktop_features)
        ? w.worktop_features.filter((f: string) => !isNA(f)).join(', ')
        : safeVal(w.worktop_features);
      items.push(wt);
    });

    // ── ACCESSORIES ──────────────────────────────────────────────────────────
    if (!isNA(formData.accessories)) {
      const acc = blankItem('Accessories');
      acc.features = safeVal(formData.accessories);
      items.push(acc);
    }

    // ── APPLIANCES ────────────────────────────────────────────────────────────
    const appLabels = ['Oven', 'Microwave', 'Washing Machine', 'Dryer', 'Hob', 'Extractor', 'INTG Dishwasher'];
    (formData.appliances || []).forEach((a: any, i: number) => {
      const make  = safeVal(a.make);
      const model = safeVal(a.model);
      if (!make && !model) return;
      if (make.toLowerCase().includes('n/a') || make.toLowerCase().includes('no make')) return;
      const appl = blankItem(appLabels[i] || `Appliance ${i + 1}`);
      appl.code  = model;
      appl.style = make;
      items.push(appl);
    });

    // INTG Fridge/Freezer
    if (!isNA(formData.integ_fridge_make)) {
      const fr = blankItem('INTG Fridge / Freezer');
      fr.style    = safeVal(formData.integ_fridge_make);
      fr.code     = safeVal(formData.integ_fridge_model);
      fr.quantity = safeVal(formData.integ_fridge_qty) || '1';
      items.push(fr);
    }
    if (!isNA(formData.integ_freezer_make)) {
      const frz = blankItem('INTG Freezer');
      frz.style    = safeVal(formData.integ_freezer_make);
      frz.code     = safeVal(formData.integ_freezer_model);
      frz.quantity = safeVal(formData.integ_freezer_qty) || '1';
      items.push(frz);
    }

    // ── SINK ──────────────────────────────────────────────────────────────────
    if (!isNA(formData.sink_details)) {
      const sink = blankItem('Sink');
      sink.type = safeVal(formData.sink_details);
      sink.code = safeVal(formData.sink_model);
      items.push(sink);
    }

    // ── TAP ───────────────────────────────────────────────────────────────────
    if (!isNA(formData.tap_details)) {
      const tap = blankItem('Tap');
      tap.type = safeVal(formData.tap_details);
      tap.code = safeVal(formData.tap_model);
      items.push(tap);
    }

  } else {
    // ── BEDROOM-SPECIFIC ──────────────────────────────────────────────────────

    // Worktop (bedroom)
    if (!isNA(formData.worktop_code) || !isNA(formData.worktop_material_color)) {
      const wt = blankItem('Worktop');
      wt.code    = safeVal(formData.worktop_code);
      wt.colour  = safeVal(formData.worktop_material_color);
      wt.size    = safeVal(formData.worktop_size);
      wt.features = Array.isArray(formData.worktop_features)
        ? formData.worktop_features.filter((f: string) => !isNA(f)).join(', ')
        : '';
      items.push(wt);
    }

    (formData.additional_worktops || []).forEach((w: any, i: number) => {
      if (isNA(w.worktop_code) && isNA(w.worktop_material_color)) return;
      const wt = blankItem(`Worktop (Additional ${i + 1})`);
      wt.material = safeVal(w.worktop_material_type);
      wt.colour   = safeVal(w.worktop_material_color);
      wt.code     = safeVal(w.worktop_code);
      wt.size     = safeVal(w.worktop_size);
      items.push(wt);
    });

    if (!isNA(formData.bedside_cabinets_type) && !isNA(formData.bedside_cabinets_qty)) {
      const bc = blankItem('Bedside Cabinets');
      bc.type     = safeVal(formData.bedside_cabinets_type);
      bc.quantity = safeVal(formData.bedside_cabinets_qty) || '1';
      items.push(bc);
    }

    if (formData.dresser_desk === 'yes' && !isNA(formData.dresser_desk_details)) {
      const dd = blankItem('Dresser / Desk');
      dd.type = safeVal(formData.dresser_desk_details);
      items.push(dd);
    }

    if (formData.internal_mirror === 'yes' && !isNA(formData.internal_mirror_details)) {
      const im = blankItem('Internal Mirror');
      im.type = safeVal(formData.internal_mirror_details);
      items.push(im);
    }

    if (!isNA(formData.mirror_type)) {
      const mir = blankItem('Mirror');
      mir.type     = safeVal(formData.mirror_type);
      mir.quantity = safeVal(formData.mirror_qty) || '1';
      items.push(mir);
    }

    if (!isNA(formData.soffit_lights_type)) {
      const sl = blankItem('Soffit Lights');
      sl.type   = safeVal(formData.soffit_lights_type);
      sl.colour = safeVal(formData.soffit_lights_color);
      items.push(sl);
    }

    if (!isNA(formData.gable_lights_type)) {
      const gl = blankItem('Gable Lights');
      gl.type   = safeVal(formData.gable_lights_type);
      gl.colour = [safeVal(formData.gable_lights_main_color), safeVal(formData.gable_lights_profile_color)].filter(Boolean).join(' / ');
      items.push(gl);
    }

    if (!isNA(formData.other_accessories)) {
      const acc = blankItem('Accessories');
      acc.features = safeVal(formData.other_accessories);
      items.push(acc);
    }

    if (Array.isArray(formData.floor_protection)) {
      const nonNA = formData.floor_protection.filter(
        (f: string) => !isNA(f) && f !== 'No Floor Protection Required'
      );
      if (nonNA.length > 0) {
        const fp = blankItem('Floor Protection');
        fp.features = nonNA.join(', ');
        items.push(fp);
      }
    }
  }

  return items;
}

// ── Structured field row labels ───────────────────────────────────────────────
const DETAIL_FIELDS: Array<{ key: keyof OrderItem; label: string }> = [
  { key: 'style',    label: 'Make / Style' },
  { key: 'type',     label: 'Type' },
  { key: 'colour',   label: 'Colour' },
  { key: 'size',     label: 'Size' },
  { key: 'code',     label: 'Code / Model' },
  { key: 'material', label: 'Material' },
  { key: 'features', label: 'Features' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductionMaterialsManagement() {
  const [materials, setMaterials] = useState<MaterialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialOrder | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  const [wizardStep, setWizardStep] = useState<WizardStep>('select_customer');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<MaterialOrder | null>(null);

  const [editForm, setEditForm] = useState<{
    material_description: string;
    supplier_name: string;
    estimated_cost: string;
    order_date: string;
    expected_delivery_date: string;
    notes: string;
    status: string;
    quantity: string;
  } | null>(null);

  const [newMaterialForm, setNewMaterialForm] = useState<NewMaterialForm>({
    customer_id: '',
    material_description: '',
    supplier_name: '',
    estimated_cost: '',
    order_date: today(),
    expected_delivery_date: '',
    notes: ''
  });

  useEffect(() => { fetchMaterials(); }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/materials`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch materials');
      const data = await res.json();
      setMaterials(data.map((m: any) => ({
        ...m,
        customer_name: m.customer_name || m.client_name || 'Unknown',
        id: m.id || m.material_id,
      })));
    } catch (e) {
      console.error(e);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/customers`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCustomers(
        data
          .filter((c: any) => c.stage?.toLowerCase().trim() === 'accepted')
          .map((c: any) => ({ id: c.id, name: c.name, stage: c.stage }))
      );
    } catch { setCustomers([]); }
    finally { setCustomersLoading(false); }
  };

  const fetchChecklists = async (customerId: string) => {
    setChecklistsLoading(true);
    setChecklists([]);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BACKEND_URL}/api/form/form-submissions?customer_id=${customerId}`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data : (data.submissions || []);
      setChecklists(list.map((s: any) => ({
        id: s.id,
        form_type: s.form_data?.form_type || s.form_type || 'unknown',
        created_at: s.created_at,
        customer_name: s.form_data?.customer_name || s.customer_name || '',
        room: s.form_data?.room || '',
      })));
    } catch { setChecklists([]); }
    finally { setChecklistsLoading(false); }
  };

  // ── Wizard handlers ────────────────────────────────────────────────────────

  const handleOpenCreateDialog = () => {
    setWizardStep('select_customer');
    setSelectedCustomerId('');
    setChecklists([]);
    setOrderItems([]);
    setNewMaterialForm({ customer_id: '', material_description: '', supplier_name: '', estimated_cost: '', order_date: today(), expected_delivery_date: '', notes: '' });
    fetchCustomers();
    setIsCreateDialogOpen(true);
  };

  const handleCustomerSelected = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setWizardStep('select_checklist');
    await fetchChecklists(customerId);
  };

  const handleChecklistSelected = async (checklistId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BACKEND_URL}/api/form/form-submissions/${checklistId}`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const formData = typeof data.form_data === 'string' ? JSON.parse(data.form_data) : data.form_data;
      setOrderItems(extractOrderItems(formData));
      setWizardStep('review_items');
    } catch {
      alert('Failed to load checklist data. Please try again.');
    }
  };

  const handleManualEntry = () => {
    setNewMaterialForm(prev => ({ ...prev, customer_id: selectedCustomerId }));
    setWizardStep('manual');
  };

  const handleAddCustomItem = () => {
    setOrderItems(prev => [...prev, blankItem('')]);
  };

  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    setOrderItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  };

  const handleSubmitOrderItems = async () => {
    const included = orderItems.filter(i => i.included && !i.isSection);
    if (included.length === 0) { alert('No materials selected'); return; }

    setIsSubmittingOrder(true);
    let ok = 0, fail = 0;
    try {
      const token = localStorage.getItem("token");
      for (const item of included) {
        const payload = {
          client_id: selectedCustomerId,
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
      setIsCreateDialogOpen(false);
      await fetchMaterials();
    } catch { alert('Failed to create orders.'); }
    finally { setIsSubmittingOrder(false); }
  };

  // ── Manual create ──────────────────────────────────────────────────────────

  const handleCreateMaterial = async () => {
    if (!selectedCustomerId && !newMaterialForm.customer_id) { alert('Please select a customer'); return; }
    if (!newMaterialForm.material_description.trim()) { alert('Please enter a material description'); return; }
    try {
      const payload = {
        client_id: selectedCustomerId || newMaterialForm.customer_id,
        material_description: newMaterialForm.material_description.trim(),
        supplier_name: newMaterialForm.supplier_name.trim() || null,
        estimated_cost: newMaterialForm.estimated_cost ? parseFloat(newMaterialForm.estimated_cost) : null,
        order_date: newMaterialForm.order_date || today(),
        expected_delivery_date: newMaterialForm.expected_delivery_date || null,
        notes: newMaterialForm.notes.trim() || null,
        status: 'ordered',
      };
      const res = await fetchWithAuth('materials', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      setIsCreateDialogOpen(false);
      await fetchMaterials();
      alert('Material order created successfully!');
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  };

  // ── Update / delete ────────────────────────────────────────────────────────

  const handleUpdateMaterialStatus = async (materialId: string, newStatus: string) => {
    try {
      const res = await fetchWithAuth(`materials/${materialId}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error();
      await fetchMaterials();
    } catch { alert('Failed to update status.'); }
  };

  const handleUpdateMaterial = async () => {
    if (!selectedMaterial || !editForm) return;
    try {
      const payload = {
        material_description: editForm.material_description.trim(),
        supplier_name: editForm.supplier_name.trim() || null,
        estimated_cost: editForm.estimated_cost ? parseFloat(editForm.estimated_cost) : null,
        order_date: editForm.order_date,
        expected_delivery_date: editForm.expected_delivery_date || null,
        notes: editForm.notes.trim() || null,
        status: editForm.status,
      };
      const res = await fetchWithAuth(`materials/${selectedMaterial.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      await fetchMaterials();
      setIsEditing(false);
      alert('Updated successfully!');
    } catch { alert('Failed to update.'); }
  };

  const handleDeleteMaterial = async () => {
    if (!materialToDelete) return;
    const deletedId = materialToDelete.id;

    // Instantly remove from UI
    setMaterials(prev => prev.filter(m => m.id !== deletedId));
    setDeleteDialogOpen(false);
    setMaterialToDelete(null);
    setIsDetailsDialogOpen(false);
    setSelectedMaterial(null);
    setEditForm(null);
    setIsEditing(false);

    // Fire delete in background
    try {
      const res = await fetchWithAuth(`materials/${deletedId}`, { method: 'DELETE' });
      if (!res.ok) {
        // Revert if it failed
        await fetchMaterials();
        alert('Failed to delete. Please try again.');
      }
    } catch {
      await fetchMaterials();
      alert('Failed to delete. Please try again.');
    }
  };

  const handleMaterialClick = (material: MaterialOrder) => {
    setSelectedMaterial(material);
    setEditForm({
      material_description: material.material_description,
      supplier_name: material.supplier_name || '',
      estimated_cost: material.estimated_cost?.toString() || '',
      order_date: material.order_date || today(),
      expected_delivery_date: material.expected_delivery_date || '',
      notes: material.notes || '',
      status: material.status,
      quantity: (material as any).quantity?.toString() || '1',
    });
    setIsEditing(false);
    setIsDetailsDialogOpen(true);
  };

  // ── Display helpers ────────────────────────────────────────────────────────

  /** Parse stored description back into spec lines for display */
  const parseMaterialSpecs = useCallback((description: string) => {
    if (!description) return [{ label: '', value: 'No description' }];
    const lines = description.split('\n').filter(l => l.trim());
    return lines.map(line => {
      if (line.startsWith('[') && line.endsWith(']')) {
        return { label: '', value: line.slice(1, -1), isHeading: true };
      }
      const colon = line.indexOf(':');
      if (colon > 0) return { label: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim(), isHeading: false };
      return { label: '', value: line, isHeading: false };
    });
  }, []);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; icon: React.ReactNode; text: string }> = {
      ordered:               { cls: 'bg-blue-100 text-blue-700 border-blue-300',   icon: <FileText className="h-3 w-3" />,    text: 'Ordered' },
      delivered:             { cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: <Truck className="h-3 w-3" />,       text: 'Delivered' },
      delivered_to_customer: { cls: 'bg-green-100 text-green-700 border-green-300',  icon: <CheckCircle className="h-3 w-3" />, text: 'Delivered to Customer' },
      in_stock:              { cls: 'bg-purple-100 text-purple-700 border-purple-300', icon: <Package className="h-3 w-3" />,     text: 'In Stock' },
    };
    const v = map[status] || map.ordered;
    return <Badge className={`flex items-center gap-1 ${v.cls}`} variant="outline">{v.icon}{v.text}</Badge>;
  };

  const formatDate = (d: string | null) => {
    if (!d) return 'Not set';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? 'Invalid Date' : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (a: number | null) =>
    a === null ? '-' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(a);

  const filteredMaterials = useMemo(() =>
    materials.filter(m => {
      const matchFilter = filter === 'all' || m.status === filter;
      const name = (m.customer_name || m.client_name || '').toLowerCase();
      const desc = (m.material_description || '').toLowerCase();
      return matchFilter && (name.includes(searchTerm.toLowerCase()) || desc.includes(searchTerm.toLowerCase()));
    }), [materials, filter, searchTerm]);

  const stats = useMemo(() => ({
    ordered:               materials.filter(m => m.status === 'ordered').length,
    delivered:             materials.filter(m => m.status === 'delivered').length,
    delivered_to_customer: materials.filter(m => m.status === 'delivered_to_customer').length,
    in_stock:              materials.filter(m => m.status === 'in_stock').length,
  }), [materials]);

  const selectedCustomerName = customers.find(c => c.id === selectedCustomerId)?.name || '';

  const wizardMeta: Record<WizardStep, { title: string; desc: string }> = {
    select_customer:  { title: 'Order Materials — Select Customer',  desc: 'Choose a customer in Accepted stage' },
    select_checklist: { title: 'Order Materials — Select Checklist', desc: `Checklists for ${selectedCustomerName}` },
    review_items:     { title: 'Order Materials — Review Items',     desc: 'Review and fill in order details per item' },
    manual:           { title: 'Order Materials — Manual Entry',     desc: 'Enter material details manually' },
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Loading materials...</p>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Materials Management</h1>
          <p className="text-gray-500 mt-1">Track and manage material orders</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={handleOpenCreateDialog}>
              <Plus className="h-4 w-4" />Order New Materials
            </Button>
          </DialogTrigger>

          <DialogContent className="!max-w-[85vw] w-[85vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{wizardMeta[wizardStep].title}</DialogTitle>
              <DialogDescription>{wizardMeta[wizardStep].desc}</DialogDescription>
            </DialogHeader>

            {/* ── STEP 1: Select Customer ────────────────────────────────── */}
            {wizardStep === 'select_customer' && (
              <div className="space-y-4 py-4">
                {customersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                    <span className="ml-3 text-gray-500">Loading customers...</span>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
                    <p className="text-gray-600">No customers in "Accepted" stage</p>
                    <Button variant="link" onClick={fetchCustomers}>Refresh</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customers.map(c => (
                      <button key={c.id} onClick={() => handleCustomerSelected(c.id)}
                        className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left">
                        <span className="font-medium text-gray-900">{c.name}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Select Checklist ───────────────────────────────── */}
            {wizardStep === 'select_checklist' && (
              <div className="space-y-4 py-4">
                {checklistsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                    <span className="ml-3 text-gray-500">Loading checklists...</span>
                  </div>
                ) : checklists.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardList className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-1">No checklists found</p>
                    <p className="text-sm text-gray-400 mb-4">Enter materials manually instead</p>
                    <Button onClick={handleManualEntry}>Enter Manually</Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Select a checklist to auto-extract materials:</p>
                    <div className="space-y-2">
                      {checklists.map(cl => {
                        const isKitchen = cl.form_type.toLowerCase().includes('kitchen');
                        return (
                          <button key={cl.id} onClick={() => handleChecklistSelected(cl.id)}
                            className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isKitchen ? 'bg-green-100' : 'bg-purple-100'}`}>
                                <ClipboardList className={`h-4 w-4 ${isKitchen ? 'text-green-600' : 'text-purple-600'}`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 capitalize">
                                  {isKitchen ? 'Kitchen' : 'Bedroom'} Checklist{cl.room ? ` — ${cl.room}` : ''}
                                </p>
                                <p className="text-xs text-gray-500">{formatDate(cl.created_at)}</p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t pt-4">
                      <Button variant="outline" className="w-full" onClick={handleManualEntry}>
                        Enter Materials Manually Instead
                      </Button>
                    </div>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={() => setWizardStep('select_customer')}>← Back</Button>
              </div>
            )}

            {/* ── STEP 3: Review Items ───────────────────────────────────── */}
            {wizardStep === 'review_items' && (
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    {orderItems.filter(i => i.included && !i.isSection).length} of{' '}
                    {orderItems.filter(i => !i.isSection).length} items selected
                  </p>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={handleAddCustomItem} className="flex items-center gap-1">
                      <Plus className="h-3 w-3" />Add Item
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setWizardStep('select_checklist')}>← Back</Button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-2">
                  {orderItems.map((item, idx) => (
                    <div key={idx}
                      className={`rounded-xl border-2 transition-colors ${
                        item.included ? 'border-blue-200 bg-white shadow-sm' : 'border-gray-200 bg-gray-50 opacity-50'
                      }`}
                    >
                      {/* ── Card header ── */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                        <input
                          type="checkbox"
                          checked={item.included}
                          onChange={e => updateItem(idx, { included: e.target.checked })}
                          className="h-4 w-4 rounded accent-blue-600"
                        />
                        {item.label === '' ? (
                          <Input
                            placeholder="Material name (e.g. Custom Door)"
                            value={item.label}
                            onChange={e => updateItem(idx, { label: e.target.value })}
                            className="h-8 text-sm font-semibold flex-1"
                            autoFocus
                          />
                        ) : (
                          <span className="font-semibold text-gray-800 text-sm flex-1">{item.label}</span>
                        )}
                        <button
                          onClick={() => setOrderItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500 transition-colors ml-auto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* ── Card body ── */}
                      {item.included && (
                        <div className="px-4 py-4 space-y-4">
                          {/* Auto-filled detail fields */}
                          <div className="grid grid-cols-2 gap-3">
                            {DETAIL_FIELDS.map(({ key, label }) => (
                              <div key={key}>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
                                <Input
                                  value={item[key] as string}
                                  onChange={e => updateItem(idx, { [key]: e.target.value })}
                                  placeholder={`—`}
                                  className="h-9 text-sm bg-gray-50 focus:bg-white"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="border-t border-dashed border-gray-200 pt-3" />

                          {/* Order fields */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Supplier</label>
                              <Input value={item.supplier} onChange={e => updateItem(idx, { supplier: e.target.value })}
                                placeholder="e.g. Howdens" className="h-9 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Quantity</label>
                              <Input type="number" min="1" value={item.quantity}
                                onChange={e => updateItem(idx, { quantity: e.target.value })}
                                className="h-9 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Est. Cost (£)</label>
                              <Input type="number" step="0.01" min="0" placeholder="0.00" value={item.estimated_cost}
                                onChange={e => updateItem(idx, { estimated_cost: e.target.value })}
                                className="h-9 text-sm" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Date Ordered</label>
                              <input type="date" value={item.order_date}
                                onChange={e => updateItem(idx, { order_date: e.target.value })}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm h-9" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Expected Delivery</label>
                              <input type="date" value={item.expected_delivery}
                                onChange={e => updateItem(idx, { expected_delivery: e.target.value })}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm h-9" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Notes</label>
                            <textarea rows={2} placeholder="Any special instructions..." value={item.notes}
                              onChange={e => updateItem(idx, { notes: e.target.value })}
                              className="w-full resize-none rounded-md border border-gray-300 p-2 text-sm" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <DialogFooter className="pt-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleSubmitOrderItems}
                    disabled={isSubmittingOrder || orderItems.filter(i => i.included && !i.isSection).length === 0}
                  >
                    {isSubmittingOrder
                      ? 'Creating Orders...'
                      : `Create ${orderItems.filter(i => i.included && !i.isSection).length} Order${orderItems.filter(i => i.included && !i.isSection).length !== 1 ? 's' : ''}`
                    }
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* ── STEP 4: Manual Entry ───────────────────────────────────── */}
            {wizardStep === 'manual' && (
              <div className="space-y-4 py-4">
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 font-medium">
                  Customer: {selectedCustomerName}
                </div>
                <div className="space-y-2">
                  <Label>Material Description *</Label>
                  <Textarea placeholder="e.g., Kitchen cabinets – Oak finish, 10 units"
                    value={newMaterialForm.material_description}
                    onChange={e => setNewMaterialForm({ ...newMaterialForm, material_description: e.target.value })}
                    rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Input placeholder="e.g., Howdens" value={newMaterialForm.supplier_name}
                      onChange={e => setNewMaterialForm({ ...newMaterialForm, supplier_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Cost (£)</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={newMaterialForm.estimated_cost}
                      onChange={e => setNewMaterialForm({ ...newMaterialForm, estimated_cost: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date Ordered</Label>
                    <Input type="date" value={newMaterialForm.order_date}
                      onChange={e => setNewMaterialForm({ ...newMaterialForm, order_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Delivery</Label>
                    <Input type="date" value={newMaterialForm.expected_delivery_date}
                      onChange={e => setNewMaterialForm({ ...newMaterialForm, expected_delivery_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={newMaterialForm.notes}
                    onChange={e => setNewMaterialForm({ ...newMaterialForm, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button variant="ghost" size="sm" onClick={() => setWizardStep('select_checklist')}>← Back</Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateMaterial} disabled={!newMaterialForm.material_description.trim()}>
                    Create Order
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Ordered', value: stats.ordered, color: 'blue', Icon: FileText },
          { label: 'Delivered', value: stats.delivered, color: 'yellow', Icon: Truck },
          { label: 'To Customer', value: stats.delivered_to_customer, color: 'green', Icon: CheckCircle },
          { label: 'In Stock', value: stats.in_stock, color: 'purple', Icon: Package },
        ].map(({ label, value, color, Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
                </div>
                <Icon className={`h-8 w-8 text-${color}-400`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input placeholder="Search by customer or material..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="delivered_to_customer">Delivered to Customer</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Materials list */}
      <div className="space-y-4">
        {filteredMaterials.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No orders found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm || filter !== 'all' ? 'Try adjusting your filters' : 'Click "Order New Materials" to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMaterials.map(material => (
            <Card key={material.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => handleMaterialClick(material)}>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{material.customer_name}</h3>
                      {getStatusBadge(material.status)}
                    </div>

                    {/* Parsed description */}
                    <div className="mb-4 space-y-0.5">
                      {parseMaterialSpecs(material.material_description).map((spec, i) =>
                        (spec as any).isHeading ? (
                          <p key={i} className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2 first:mt-0">
                            {spec.value}
                          </p>
                        ) : spec.label ? (
                          <div key={i} className="flex items-baseline gap-2 text-sm">
                            <span className="text-gray-500 whitespace-nowrap min-w-[110px]">{spec.label}:</span>
                            <span className="text-gray-900">{spec.value}</span>
                          </div>
                        ) : (
                          <p key={i} className="text-sm text-gray-700">{spec.value}</p>
                        )
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><p className="text-gray-400 text-xs uppercase tracking-wide">Supplier</p><p className="font-medium">{material.supplier_name || '—'}</p></div>
                      <div><p className="text-gray-400 text-xs uppercase tracking-wide">Order Date</p><p className="font-medium">{formatDate(material.order_date)}</p></div>
                      <div><p className="text-gray-400 text-xs uppercase tracking-wide">Expected Delivery</p><p className="font-medium">{formatDate(material.expected_delivery_date)}</p></div>
                      <div><p className="text-gray-400 text-xs uppercase tracking-wide">Cost</p><p className="font-medium">{formatCurrency(material.estimated_cost)}</p></div>
                    </div>

                    {material.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600"><strong>Notes:</strong> {material.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Status buttons */}
                  <div className="flex flex-col gap-2 min-w-[170px]">
                    {[
                      { status: 'ordered',               label: 'Ordered',      Icon: FileText,    active: 'bg-blue-600 hover:bg-blue-700' },
                      { status: 'delivered',             label: 'Delivered',    Icon: Truck,       active: 'bg-yellow-600 hover:bg-yellow-700' },
                      { status: 'delivered_to_customer', label: 'To Customer',  Icon: CheckCircle, active: 'bg-green-600 hover:bg-green-700' },
                      { status: 'in_stock',              label: 'In Stock',     Icon: Package,     active: 'bg-purple-600 hover:bg-purple-700' },
                    ].map(btn => (
                      <Button key={btn.status} size="sm"
                        variant={material.status === btn.status ? 'default' : 'outline'}
                        className={`justify-start ${material.status === btn.status ? btn.active : ''}`}
                        onClick={e => { e.stopPropagation(); handleUpdateMaterialStatus(material.id, btn.status); }}
                      >
                        <btn.Icon className="h-3 w-3 mr-1" />{btn.label}
                      </Button>
                    ))}
                    <Button size="sm" variant="outline"
                      className="justify-start text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 mt-1"
                      onClick={e => { e.stopPropagation(); setMaterialToDelete(material); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Details dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={open => {
        setIsDetailsDialogOpen(open);
        if (!open) { setIsEditing(false); setSelectedMaterial(null); setEditForm(null); }
      }}>
        <DialogContent className="!max-w-[600px] w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Material Order' : 'Material Order Details'}</DialogTitle>
            <DialogDescription>{isEditing ? 'Update material order information' : 'View material order information'}</DialogDescription>
          </DialogHeader>

          {selectedMaterial && editForm && (
            <div className="space-y-6 py-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Customer</p>
                <p className="text-lg font-semibold text-gray-900">{selectedMaterial.customer_name}</p>
              </div>

              {!isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-gray-500">Material</Label>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg space-y-1">
                      {parseMaterialSpecs(selectedMaterial.material_description).map((spec, i) =>
                        (spec as any).isHeading ? (
                          <p key={i} className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2 first:mt-0">{spec.value}</p>
                        ) : spec.label ? (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <span className="text-gray-500 min-w-[120px]">{spec.label}:</span>
                            <span className="text-gray-900">{spec.value}</span>
                          </div>
                        ) : <p key={i} className="text-sm text-gray-700">{spec.value}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Supplier</Label><p className="mt-1 text-gray-900">{selectedMaterial.supplier_name || '—'}</p></div>
                    <div><Label>Estimated Cost</Label><p className="mt-1 text-gray-900">{formatCurrency(selectedMaterial.estimated_cost)}</p></div>
                  </div>
                  <div><Label>Quantity</Label><p className="mt-1 text-gray-900">{(selectedMaterial as any).quantity || 1}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Order Date</Label><p className="mt-1 text-gray-900">{formatDate(selectedMaterial.order_date)}</p></div>
                    <div><Label>Expected Delivery</Label><p className="mt-1 text-gray-900">{formatDate(selectedMaterial.expected_delivery_date)}</p></div>
                  </div>
                  <div><Label>Status</Label><div className="mt-1">{getStatusBadge(selectedMaterial.status)}</div></div>
                  {selectedMaterial.notes && <div><Label>Notes</Label><p className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-900">{selectedMaterial.notes}</p></div>}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Material Description *</Label>
                    <Textarea value={editForm.material_description}
                      onChange={e => setEditForm({ ...editForm, material_description: e.target.value })} rows={6} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Supplier</Label>
                      <Input value={editForm.supplier_name} onChange={e => setEditForm({ ...editForm, supplier_name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Estimated Cost (£)</Label>
                      <Input type="number" step="0.01" value={editForm.estimated_cost}
                        onChange={e => setEditForm({ ...editForm, estimated_cost: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Order Date</Label>
                      <Input type="date" value={editForm.order_date}
                        onChange={e => setEditForm({ ...editForm, order_date: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Expected Delivery</Label>
                      <Input type="date" value={editForm.expected_delivery_date}
                        onChange={e => setEditForm({ ...editForm, expected_delivery_date: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="delivered_to_customer">Delivered to Customer</SelectItem>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Notes</Label>
                    <Textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3} /></div>
                </div>
              )}

              <div className="text-xs text-gray-400 space-y-1 pt-4 border-t">
                <p>Created: {formatDate(selectedMaterial.created_at)}</p>
                {selectedMaterial.ordered_by && <p>Ordered by: {selectedMaterial.ordered_by}</p>}
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between items-center">
            <Button variant="destructive" onClick={() => { setMaterialToDelete(selectedMaterial); setDeleteDialogOpen(true); }} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </Button>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button variant="outline" onClick={() => { setIsDetailsDialogOpen(false); setSelectedMaterial(null); setEditForm(null); }}>Close</Button>
                  <Button onClick={() => setIsEditing(true)}><Edit className="h-4 w-4 mr-2" />Edit</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button onClick={handleUpdateMaterial}>Save Changes</Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material Order?</AlertDialogTitle>
            <AlertDialogDescription>
              {materialToDelete && (
                <span className="block space-y-2">
                  <span className="block mb-2">This action cannot be undone.</span>
                  <span className="block bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                    <span className="block"><strong>Customer:</strong> {materialToDelete.customer_name}</span>
                    <span className="block"><strong>Status:</strong> {materialToDelete.status.replace(/_/g, ' ').toUpperCase()}</span>
                  </span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setMaterialToDelete(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMaterial} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProductionMaterialsManagement;