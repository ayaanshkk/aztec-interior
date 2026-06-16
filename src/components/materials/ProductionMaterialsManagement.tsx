"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, 
  Plus, 
  Edit, 
  Truck, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  DollarSign,
  FileText,
  Trash2,
  X,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  email?: string;
  phone?: string;
  address?: string;
  stage: string;
  customer_stage?: string;
  project_count?: number;
  projects_at_stage?: number;
  project_details?: Array<{
    id: string;
    name: string;
    type: string;
    stage: string;
  }>;
  total_projects?: number;
  has_separate_projects?: boolean;
  is_customer_level?: boolean;
}

interface Checklist {
  id: string;
  form_type: string;
  created_at: string;
  customer_name: string;
  room?: string;
}

// One order item per material line
interface OrderItem {
  material: string;
  supplier: string;
  estimated_cost: string;
  order_date: string;
  expected_delivery: string;
  notes: string;
  included: boolean;
  quantity: string;
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

// ── Wizard steps ──────────────────────────────────────────────────────────────
type WizardStep = 'select_customer' | 'select_checklist' | 'review_items' | 'manual';

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

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('select_customer');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [selectedChecklistId, setSelectedChecklistId] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<MaterialOrder | null>(null);

  // Edit form state
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

  // Manual form (fallback)
  const [newMaterialForm, setNewMaterialForm] = useState<NewMaterialForm>({
    customer_id: '',
    material_description: '',
    supplier_name: '',
    estimated_cost: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/materials`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch materials');
      const data = await response.json();
      const normalized = data.map((m: any) => ({
        ...m,
        customer_name: m.customer_name || m.client_name || 'Unknown',
        id: m.id || m.material_id,
      }));
      setMaterials(normalized);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/customers`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      const accepted = data.filter((c: any) => c.stage?.toLowerCase().trim() === 'accepted');
      setCustomers(accepted.map((c: any) => ({ id: c.id, name: c.name, stage: c.stage })));
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchChecklists = async (customerId: string) => {
    setChecklistsLoading(true);
    setChecklists([]);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKEND_URL}/api/form/form-submissions?customer_id=${customerId}`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch checklists');
      const data = await response.json();
      // data may be array or { submissions: [] }
      const list: any[] = Array.isArray(data) ? data : (data.submissions || []);
      setChecklists(list.map((s: any) => ({
        id: s.id,
        form_type: s.form_data?.form_type || s.form_type || 'unknown',
        created_at: s.created_at,
        customer_name: s.form_data?.customer_name || s.customer_name || '',
        room: s.form_data?.room || '',
      })));
    } catch (error) {
      console.error('Error fetching checklists:', error);
      setChecklists([]);
    } finally {
      setChecklistsLoading(false);
    }
  };

  // ── Extract materials from a checklist's form_data ────────────────────────

  const extractMaterialsFromChecklist = (formData: any): string[] => {
    const items: string[] = [];
    const ft = (formData.form_type || '').toLowerCase();
    const isKitchen = ft.includes('kitchen');

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
        // Skip N/A entries
        const makeStr = String(a.make || '').trim();
        const modelStr = String(a.model || '').trim();
        if (isNA(makeStr) && isNA(modelStr)) return;
        // Skip INTG entries that were appended during submit with N/A values
        if (makeStr.toLowerCase().includes('intg') && (isNA(modelStr) || modelStr.toLowerCase().includes('n/a'))) return;
        if (makeStr.toLowerCase().includes('n/a') || makeStr.toLowerCase().includes('no make')) return;
        push(appLabels[i] || `Appliance ${i + 1}`, `${makeStr} ${modelStr}`.trim());
      });

      // Only push integ fridge/freezer from dedicated fields (not from appliances array)
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

  // ── Wizard handlers ────────────────────────────────────────────────────────

  const handleOpenCreateDialog = () => {
    setWizardStep('select_customer');
    setSelectedCustomerId('');
    setSelectedChecklistId('');
    setChecklists([]);
    setOrderItems([]);
    setNewMaterialForm({
      customer_id: '',
      material_description: '',
      supplier_name: '',
      estimated_cost: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      notes: ''
    });
    fetchCustomers();
    setIsCreateDialogOpen(true);
  };

  const handleCustomerSelected = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setWizardStep('select_checklist');
    await fetchChecklists(customerId);
  };

  const handleChecklistSelected = async (checklistId: string) => {
    setSelectedChecklistId(checklistId);
    // Fetch checklist form_data
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKEND_URL}/api/form/form-submissions/${checklistId}`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch checklist');
      const data = await response.json();
      const formData = typeof data.form_data === 'string' ? JSON.parse(data.form_data) : data.form_data;
      const materials = extractMaterialsFromChecklist(formData);
      setOrderItems(materials.map(m => ({
        material: m,
        supplier: '',
        estimated_cost: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: '',
        notes: '',
        included: !m.startsWith('\n---'),
        quantity: '1',
      })));
      setWizardStep('review_items');
    } catch (err) {
      console.error('Error loading checklist:', err);
      alert('Failed to load checklist data. Please try again.');
    }
  };

  const handleManualEntry = () => {
    setNewMaterialForm(prev => ({ ...prev, customer_id: selectedCustomerId }));
    setWizardStep('manual');
  };

  const handleAddCustomItem = () => {
    setOrderItems(prev => [...prev, {
      material: '',
      supplier: '',
      estimated_cost: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery: '',
      notes: '',
      included: true,
      quantity: '1',
    }]);
  };

  const handleSubmitOrderItems = async () => {
    const included = orderItems.filter(i => i.included && !i.material.startsWith('\n---'));
    if (included.length === 0) {
      alert('No materials selected');
      return;
    }

    setIsSubmittingOrder(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const token = localStorage.getItem("token");
      for (const item of included) {
        const payload = {
          client_id: selectedCustomerId,
          material_description: item.material,
          supplier_name: item.supplier.trim() || null,
          estimated_cost: item.estimated_cost ? parseFloat(item.estimated_cost) : null,
          order_date: item.order_date,
          expected_delivery_date: item.expected_delivery || null,
          notes: item.notes.trim() || null,
          quantity: item.quantity ? parseInt(item.quantity) : 1,
          status: 'ordered',
        };
        const response = await fetch(`${BACKEND_URL}/api/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (response.ok) successCount++; else failCount++;
      }

      if (failCount === 0) {
        alert(`✅ ${successCount} material order${successCount > 1 ? 's' : ''} created successfully!`);
      } else {
        alert(`⚠️ ${successCount} created, ${failCount} failed.`);
      }

      setIsCreateDialogOpen(false);
      await fetchMaterials();
    } catch (err) {
      console.error('Error submitting orders:', err);
      alert('Failed to create orders. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // ── Manual create (unchanged logic) ───────────────────────────────────────

  const handleCreateMaterial = async () => {
    if (!selectedCustomerId && !newMaterialForm.customer_id) {
      alert('Please select a customer');
      return;
    }
    if (!newMaterialForm.material_description.trim()) {
      alert('Please enter a material description');
      return;
    }
    try {
      const payload = {
        client_id: selectedCustomerId || newMaterialForm.customer_id,
        material_description: newMaterialForm.material_description.trim(),
        supplier_name: newMaterialForm.supplier_name.trim() || null,
        estimated_cost: newMaterialForm.estimated_cost ? parseFloat(newMaterialForm.estimated_cost) : null,
        order_date: newMaterialForm.order_date || new Date().toISOString().split('T')[0],
        expected_delivery_date: newMaterialForm.expected_delivery_date || null,
        notes: newMaterialForm.notes.trim() || null,
        status: 'ordered',
      };
      const response = await fetchWithAuth('materials', { method: 'POST', body: JSON.stringify(payload) });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create material order');
      }
      setIsCreateDialogOpen(false);
      await fetchMaterials();
      alert('Material order created successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create material order.');
    }
  };

  // ── Status / update / delete (unchanged) ──────────────────────────────────

  const handleUpdateMaterialStatus = async (materialId: string, newStatus: string, deliveryDate?: string) => {
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'delivered' && deliveryDate) payload.actual_delivery_date = deliveryDate;
      const response = await fetchWithAuth(`materials/${materialId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('Failed to update status');
      await fetchMaterials();
      alert(`Status updated to ${newStatus.replace('_', ' ').toUpperCase()}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update status.');
    }
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
      const response = await fetchWithAuth(`materials/${selectedMaterial.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('Failed to update material');
      await fetchMaterials();
      setIsEditing(false);
      alert('Material updated successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update material.');
    }
  };

  const handleDeleteMaterial = async () => {
    if (!materialToDelete) return;
    try {
      const response = await fetchWithAuth(`materials/${materialToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete material order');
      setDeleteDialogOpen(false);
      setMaterialToDelete(null);
      setIsDetailsDialogOpen(false);
      setSelectedMaterial(null);
      setEditForm(null);
      setIsEditing(false);
      await fetchMaterials();
      alert('Material order deleted successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete material order.');
    }
  };

  const handleMaterialClick = (material: MaterialOrder) => {
    setSelectedMaterial(material);
    setEditForm({
      material_description: material.material_description,
      supplier_name: material.supplier_name || '',
      estimated_cost: material.estimated_cost?.toString() || '',
      order_date: material.order_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: material.expected_delivery_date || '',
      notes: material.notes || '',
      status: material.status,
      quantity: (material as any).quantity?.toString() || '1',
    });
    setIsEditing(false);
    setIsDetailsDialogOpen(true);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const parseMaterialSpecs = useCallback((description: string) => {
    if (!description) return [{ label: '', value: 'No description' }];
    const lines = description.split('\n').filter(line => line.trim());
    const parts: Array<{label: string, value: string}> = [];
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const label = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (label.startsWith('---') || !value) continue;
        parts.push({ label, value });
      } else if (line.includes('---')) {
        parts.push({ label: '', value: line });
      }
    }
    return parts.length > 0 ? parts : [{ label: '', value: description }];
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode; text: string }> = {
      ordered: { className: 'bg-blue-100 text-blue-700 border-blue-300', icon: <FileText className="h-3 w-3" />, text: 'Ordered' },
      delivered: { className: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: <Truck className="h-3 w-3" />, text: 'Delivered' },
      delivered_to_customer: { className: 'bg-green-100 text-green-700 border-green-300', icon: <CheckCircle className="h-3 w-3" />, text: 'Delivered to Customer' },
      in_stock: { className: 'bg-purple-100 text-purple-700 border-purple-300', icon: <Package className="h-3 w-3" />, text: 'In Stock' },
    };
    const v = variants[status] || variants.ordered;
    return <Badge className={`flex items-center gap-1 ${v.className}`} variant="outline">{v.icon}{v.text}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      const matchesFilter = filter === 'all' || material.status === filter;
      const customerName = (material.customer_name || material.client_name || '').toLowerCase();
      const description = (material.material_description || '').toLowerCase();
      const matchesSearch = customerName.includes(searchTerm.toLowerCase()) || description.includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [materials, filter, searchTerm]);

  const stats = useMemo(() => ({
    ordered: materials.filter(m => m.status === 'ordered').length,
    delivered: materials.filter(m => m.status === 'delivered').length,
    delivered_to_customer: materials.filter(m => m.status === 'delivered_to_customer').length,
    in_stock: materials.filter(m => m.status === 'in_stock').length,
  }), [materials]);

  const selectedCustomerName = customers.find(c => c.id === selectedCustomerId)?.name || '';

  // ── Wizard step title / description ──────────────────────────────────────

  const wizardMeta: Record<WizardStep, { title: string; desc: string }> = {
    select_customer: { title: 'Order Materials — Select Customer', desc: 'Choose a customer in Accepted stage' },
    select_checklist: { title: 'Order Materials — Select Checklist', desc: `Checklists for ${selectedCustomerName}` },
    review_items: { title: 'Order Materials — Review Items', desc: 'Review and fill in order details per item' },
    manual: { title: 'Order Materials — Manual Entry', desc: 'Enter material details manually' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600">Loading materials...</p>
        </div>
      </div>
    );
  }

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
              <Plus className="h-4 w-4" />
              Order New Materials
            </Button>
          </DialogTrigger>

          <DialogContent className="!max-w-[85vw] w-[85vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{wizardMeta[wizardStep].title}</DialogTitle>
              <DialogDescription>{wizardMeta[wizardStep].desc}</DialogDescription>
            </DialogHeader>

            {/* ── STEP 1: Select Customer ───────────────────────────────── */}
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
                      <button
                        key={c.id}
                        onClick={() => handleCustomerSelected(c.id)}
                        className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                      >
                        <span className="font-medium text-gray-900">{c.name}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Select Checklist ──────────────────────────────── */}
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
                    <p className="text-gray-600 mb-1">No checklists found for this customer</p>
                    <p className="text-sm text-gray-400 mb-4">You can still enter materials manually</p>
                    <Button onClick={handleManualEntry}>Enter Manually</Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Select a checklist to auto-extract materials:</p>
                    <div className="space-y-2">
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
                                <ClipboardList className={`h-4 w-4 ${isKitchen ? 'text-green-600' : 'text-purple-600'}`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 capitalize">
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
                    </div>
                    <div className="border-t pt-4">
                      <Button variant="outline" className="w-full" onClick={handleManualEntry}>
                        Enter Materials Manually Instead
                      </Button>
                    </div>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={() => setWizardStep('select_customer')}>
                  ← Back
                </Button>
              </div>
            )}

            {/* ── STEP 3: Review Items ──────────────────────────────────── */}
            {wizardStep === 'review_items' && (
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    {orderItems.filter(i => i.included && !i.material.startsWith('\n---')).length} of{' '}
                    {orderItems.filter(i => !i.material.startsWith('\n---')).length} items selected
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddCustomItem}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Item
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setWizardStep('select_checklist')}>
                      ← Back
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {orderItems.map((item, idx) => {
                    // Section separator — just show as heading, not orderable
                    if (item.material.startsWith('\n---')) {
                      return (
                        <p key={idx} className="text-xs font-semibold text-gray-500 uppercase pt-2">
                          {item.material.replace(/\n---\s*/g, '').replace(/\s*---/g, '')}
                        </p>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className={`rounded-lg border-2 p-8 transition-colors ${
                          item.included ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'
                        }`}
                      >
                        {/* Toggle + label */}
                        <div className="flex items-start gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={item.included}
                            onChange={e => {
                              const updated = [...orderItems];
                              updated[idx] = { ...updated[idx], included: e.target.checked };
                              setOrderItems(updated);
                            }}
                            className="mt-0.5 h-4 w-4 rounded"
                          />
                          {item.material === '' ? (
                            <Input
                              placeholder="Enter material description..."
                              value={item.material}
                              onChange={e => {
                                const updated = [...orderItems];
                                updated[idx] = { ...updated[idx], material: e.target.value };
                                setOrderItems(updated);
                              }}
                              className="h-9 text-sm flex-1"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-800 flex-1">{item.material}</span>
                          )}
                        </div>

                        {item.included && (
                          <div className="ml-7 space-y-5 mt-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Supplier</label>
                                <Input
                                  placeholder="e.g., Howdens"
                                  value={item.supplier}
                                  onChange={e => {
                                    const updated = [...orderItems];
                                    updated[idx] = { ...updated[idx], supplier: e.target.value };
                                    setOrderItems(updated);
                                  }}
                                  className="h-10 text-sm"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Quantity</label>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  value={item.quantity}
                                  onChange={e => {
                                    const updated = [...orderItems];
                                    updated[idx] = { ...updated[idx], quantity: e.target.value };
                                    setOrderItems(updated);
                                  }}
                                  className="h-10 text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Estimated Cost (£)</label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={item.estimated_cost}
                                onChange={e => {
                                  const updated = [...orderItems];
                                  updated[idx] = { ...updated[idx], estimated_cost: e.target.value };
                                  setOrderItems(updated);
                                }}
                                className="h-10 text-sm"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Date Ordered</label>
                                <input
                                  type="date"
                                  value={item.order_date}
                                  onChange={e => {
                                    const updated = [...orderItems];
                                    updated[idx] = { ...updated[idx], order_date: e.target.value };
                                    setOrderItems(updated);
                                  }}
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Expected Delivery</label>
                                <input
                                  type="date"
                                  value={item.expected_delivery}
                                  onChange={e => {
                                    const updated = [...orderItems];
                                    updated[idx] = { ...updated[idx], expected_delivery: e.target.value };
                                    setOrderItems(updated);
                                  }}
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Notes</label>
                              <textarea
                                placeholder="Any special instructions..."
                                rows={2}
                                value={item.notes}
                                onChange={e => {
                                  const updated = [...orderItems];
                                  updated[idx] = { ...updated[idx], notes: e.target.value };
                                  setOrderItems(updated);
                                }}
                                className="w-full resize-none rounded-md border border-gray-300 p-3 text-sm"
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                                onClick={() => {
                                  setOrderItems(prev => prev.filter((_, i) => i !== idx));
                                }}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <DialogFooter className="pt-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleSubmitOrderItems}
                    disabled={isSubmittingOrder || orderItems.filter(i => i.included && !i.material.startsWith('\n---')).length === 0}
                  >
                    {isSubmittingOrder
                      ? 'Creating Orders...'
                      : `Create ${orderItems.filter(i => i.included && !i.material.startsWith('\n---')).length} Order${orderItems.filter(i => i.included && !i.material.startsWith('\n---')).length !== 1 ? 's' : ''}`}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* ── STEP 4: Manual Entry ──────────────────────────────────── */}
            {wizardStep === 'manual' && (
              <div className="space-y-4 py-4">
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 font-medium">
                  Customer: {selectedCustomerName}
                </div>

                <div className="space-y-2">
                  <Label>Material Description *</Label>
                  <Textarea
                    placeholder="e.g., Kitchen cabinets - Oak finish, 10 units"
                    value={newMaterialForm.material_description}
                    onChange={e => setNewMaterialForm({ ...newMaterialForm, material_description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Input
                      placeholder="e.g., Howdens"
                      value={newMaterialForm.supplier_name}
                      onChange={e => setNewMaterialForm({ ...newMaterialForm, supplier_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Cost (£)</Label>
                    <Input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={newMaterialForm.estimated_cost}
                      onChange={e => setNewMaterialForm({ ...newMaterialForm, estimated_cost: e.target.value })}
                    />
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
                  <Button
                    onClick={handleCreateMaterial}
                    disabled={!newMaterialForm.material_description.trim()}
                  >
                    Create Order
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Ordered</p><p className="text-2xl font-bold text-blue-600">{stats.ordered}</p></div><FileText className="h-8 w-8 text-blue-400" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Delivered</p><p className="text-2xl font-bold text-yellow-600">{stats.delivered}</p></div><Truck className="h-8 w-8 text-yellow-400" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Delivered to Customer</p><p className="text-2xl font-bold text-green-600">{stats.delivered_to_customer}</p></div><CheckCircle className="h-8 w-8 text-green-400" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">In Stock</p><p className="text-2xl font-bold text-purple-600">{stats.in_stock}</p></div><Package className="h-8 w-8 text-purple-400" /></div></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input placeholder="Search by customer or material..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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

      {/* Materials List */}
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
                    <div className="mb-4 space-y-1.5">
                      {parseMaterialSpecs(material.material_description).map((spec, idx) => (
                        spec.label ? (
                          <div key={idx} className="flex items-baseline gap-2">
                            <span className="font-medium text-gray-600 whitespace-nowrap">{spec.label}:</span>
                            <span className="text-gray-900 flex-1">{spec.value}</span>
                          </div>
                        ) : (
                          <p key={idx} className="text-gray-900">{spec.value}</p>
                        )
                      ))}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div><p className="text-gray-500">Supplier</p><p className="font-medium">{material.supplier_name || '-'}</p></div>
                      <div><p className="text-gray-500">Order Date</p><p className="font-medium">{formatDate(material.order_date)}</p></div>
                      <div><p className="text-gray-500">Expected Delivery</p><p className="font-medium">{formatDate(material.expected_delivery_date)}</p></div>
                      <div><p className="text-gray-500">Cost</p><p className="font-medium">{formatCurrency(material.estimated_cost)}</p></div>
                    </div>
                    {material.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600"><strong>Notes:</strong> {material.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Status buttons */}
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    {[
                      { status: 'ordered', label: 'Ordered', icon: <FileText className="h-3 w-3 mr-1" />, active: 'bg-blue-600 hover:bg-blue-700' },
                      { status: 'delivered', label: 'Delivered', icon: <Truck className="h-3 w-3 mr-1" />, active: 'bg-yellow-600 hover:bg-yellow-700' },
                      { status: 'delivered_to_customer', label: 'To Customer', icon: <CheckCircle className="h-3 w-3 mr-1" />, active: 'bg-green-600 hover:bg-green-700' },
                      { status: 'in_stock', label: 'In Stock', icon: <Package className="h-3 w-3 mr-1" />, active: 'bg-purple-600 hover:bg-purple-700 text-white' },
                    ].map(btn => (
                      <Button
                        key={btn.status}
                        size="sm"
                        variant={material.status === btn.status ? 'default' : 'outline'}
                        className={`justify-start ${material.status === btn.status ? btn.active : ''}`}
                        onClick={e => { e.stopPropagation(); handleUpdateMaterialStatus(material.id, btn.status, btn.status === 'delivered_to_customer' ? new Date().toISOString() : undefined); }}
                      >
                        {btn.icon}{btn.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Details Dialog */}
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
                <p className="text-sm text-gray-600 mb-1">Customer</p>
                <p className="text-lg font-semibold text-gray-900">{selectedMaterial.customer_name}</p>
              </div>

              {!isEditing && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Material Description</Label>
                    <div className="p-4 bg-gray-50 rounded-lg space-y-1.5">
                      {parseMaterialSpecs(selectedMaterial.material_description).map((spec, idx) => (
                        spec.label ? (
                          <div key={idx} className="flex items-start gap-3">
                            <span className="font-medium text-gray-700 whitespace-nowrap min-w-[160px]">{spec.label}:</span>
                            <span className="text-gray-900">{spec.value}</span>
                          </div>
                        ) : <p key={idx} className="text-gray-900">{spec.value}</p>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Supplier</Label><p className="mt-1 text-gray-900">{selectedMaterial.supplier_name || '-'}</p></div>
                    <div><Label>Estimated Cost</Label><p className="mt-1 text-gray-900">{formatCurrency(selectedMaterial.estimated_cost)}</p></div>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <p className="mt-1 text-gray-900">{(selectedMaterial as any).quantity || 1}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Order Date</Label><p className="mt-1 text-gray-900">{formatDate(selectedMaterial.order_date)}</p></div>
                    <div><Label>Expected Delivery</Label><p className="mt-1 text-gray-900">{formatDate(selectedMaterial.expected_delivery_date)}</p></div>
                  </div>
                  <div><Label>Status</Label><div className="mt-1">{getStatusBadge(selectedMaterial.status)}</div></div>
                  {selectedMaterial.notes && <div><Label>Notes</Label><p className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-900">{selectedMaterial.notes}</p></div>}
                </div>
              )}

              {isEditing && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Material Description *</Label>
                    <Textarea value={editForm.material_description} onChange={e => setEditForm({ ...editForm, material_description: e.target.value })} rows={6} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Supplier</Label><Input value={editForm.supplier_name} onChange={e => setEditForm({ ...editForm, supplier_name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Estimated Cost (£)</Label><Input type="number" step="0.01" min="0" value={editForm.estimated_cost} onChange={e => setEditForm({ ...editForm, estimated_cost: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Order Date</Label><Input type="date" value={editForm.order_date} onChange={e => setEditForm({ ...editForm, order_date: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Expected Delivery</Label><Input type="date" value={editForm.expected_delivery_date} onChange={e => setEditForm({ ...editForm, expected_delivery_date: e.target.value })} /></div>
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
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3} /></div>
                </div>
              )}

              <div className="text-xs text-gray-500 space-y-1 pt-4 border-t">
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material Order?</AlertDialogTitle>
            <AlertDialogDescription>
              {materialToDelete && (
                <span className="block space-y-2">
                  <span className="block mb-2">Are you sure you want to delete this material order?</span>
                  <span className="block bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                    <span className="block"><strong>Customer:</strong> {materialToDelete.customer_name}</span>
                    <span className="block"><strong>Material:</strong> {materialToDelete.material_description.substring(0, 100)}...</span>
                    <span className="block"><strong>Status:</strong> {materialToDelete.status.replace('_', ' ').toUpperCase()}</span>
                  </span>
                  <span className="block mt-3 text-red-600 font-medium">This action cannot be undone.</span>
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