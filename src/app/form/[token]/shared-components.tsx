// src/app/form/[token]/shared-components.tsx

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, X } from "lucide-react";
import { BACKEND_URL } from "@/lib/api";
import type { OrderMaterialsDialogProps, AdditionalDoor, AdditionalHandle, Appliance } from "./shared-types";

export function OrderButton({ sectionTitle, onClick, userRole }: { 
  sectionTitle: string; 
  onClick: () => void;
  userRole: string;
}) {
  // Hide order button for Sales and HR roles
  if (userRole === "sales" || userRole === "hr") {
    return null;
  }
  
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

export function OrderMaterialsDialog({ 
  isOpen, 
  onClose, 
  sectionTitle, 
  sectionData,
  customerInfo 
}: OrderMaterialsDialogProps) {
  const [materials, setMaterials] = useState<string[]>([]);
  const [supplier, setSupplier] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const extractedMaterials = extractMaterialsFromSection(sectionTitle, sectionData);
      setMaterials(extractedMaterials);
    }
  }, [isOpen, sectionTitle, sectionData]);

  const extractMaterialsFromSection = (section: string, data: Record<string, any>): string[] => {
    const items: string[] = [];
    
    switch(section) {
      case "Material Specifications":
        if (data.door_style) items.push(`Door Style: ${data.door_style}`);
        if (data.door_color) items.push(`Door Color: ${data.door_color}`);
        if (data.door_manufacturer) items.push(`Door Manufacturer: ${data.door_manufacturer}`);
        if (data.door_name) items.push(`Door Name: ${data.door_name}`);
        if (data.glazing_material) items.push(`Glazing Material: ${data.glazing_material}`);
        if (data.end_panel_color) items.push(`Panel Color: ${data.end_panel_color}`);
        if (data.plinth_filler_color) items.push(`Plinth/Filler Color: ${data.plinth_filler_color}`);
        if (data.cabinet_color) items.push(`Cabinet Color: ${data.cabinet_color}`);
        if (data.worktop_material_color) items.push(`Worktop Color: ${data.worktop_material_color}`);
        
        if (data.additional_doors && data.additional_doors.length > 0) {
          data.additional_doors.forEach((door: any, idx: number) => {
            const hasValues = door.door_style || door.door_color || door.panel_color || 
                            door.plinth_color || door.cabinet_color || door.worktop_color ||
                            door.door_manufacturer || door.door_name || door.glazing_material;
            
            if (hasValues) {
              items.push(`\n--- Additional Door ${idx + 1} ---`);
              if (door.door_style) items.push(`Door Style: ${door.door_style}`);
              if (door.door_color) items.push(`Door Color: ${door.door_color}`);
              if (door.door_manufacturer) items.push(`Door Manufacturer: ${door.door_manufacturer}`);
              if (door.door_name) items.push(`Door Name: ${door.door_name}`);
              if (door.glazing_material) items.push(`Glazing Material: ${door.glazing_material}`);
              if (door.panel_color) items.push(`Panel Color: ${door.panel_color}`);
              if (door.plinth_color) items.push(`Plinth/Filler Color: ${door.plinth_color}`);
              if (door.cabinet_color) items.push(`Cabinet Color: ${door.cabinet_color}`);
              if (door.worktop_color) items.push(`Worktop Color: ${door.worktop_color}`);
              if (door.quantity) items.push(`Quantity: ${door.quantity}`);
            }
          });
        }
        break;
        
      case "Hardware Specifications":
        if (data.handles_code) items.push(`Handle Code: ${data.handles_code}`);
        if (data.handles_quantity) items.push(`Handle Quantity: ${data.handles_quantity}`);
        if (data.handles_size) items.push(`Handle Size: ${data.handles_size}`);
        
        if (data.additional_handles && data.additional_handles.length > 0) {
          data.additional_handles.forEach((handle: any, idx: number) => {
            const hasValues = handle.handles_code || handle.handles_quantity || handle.handles_size;
            
            if (hasValues) {
              items.push(`\n--- Additional Handle ${idx + 1} ---`);
              if (handle.handles_code) items.push(`Handle Code: ${handle.handles_code}`);
              if (handle.handles_quantity) items.push(`Handle Quantity: ${handle.handles_quantity}`);
              if (handle.handles_size) items.push(`Handle Size: ${handle.handles_size}`);
            }
          });
        }
        
        if (data.accessories) items.push(`Accessories: ${data.accessories}`);
        if (data.lighting_spec) items.push(`Lighting: ${data.lighting_spec}`);
        if (data.under_wall_unit_lights_color) items.push(`Under Wall Unit Lights: ${data.under_wall_unit_lights_color} - ${data.under_wall_unit_lights_profile}`);
        if (data.under_worktop_lights_color) items.push(`Under Worktop Lights: ${data.under_worktop_lights_color}`);
        break;
        
      case "Worktop Specifications":
        if (data.worktop_material_type) items.push(`Worktop Material: ${data.worktop_material_type} - ${data.worktop_material_color}`);
        if (data.worktop_size) items.push(`Worktop Size: ${data.worktop_size}`);
        if (data.worktop_features && data.worktop_features.length > 0) {
          items.push(`Features: ${data.worktop_features.join(', ')}`);
        }
        if (data.worktop_other_details) items.push(`Other Details: ${data.worktop_other_details}`);
        break;
        
      case "Appliances":
        if (data.appliances && data.appliances.length > 0) {
          data.appliances.forEach((app: any, idx: number) => {
            if (app.make || app.model) {
              const labels = ['Oven', 'Microwave', 'Washing Machine', 'Dryer', 'HOB', 'Extractor', 'INTG Dishwasher'];
              items.push(`${labels[idx]}: ${app.make} ${app.model}`.trim());
            }
          });
        }
        if (data.integ_fridge_make || data.integ_fridge_model) {
          items.push(`INTG Fridge/Freezer (Qty: ${data.integ_fridge_qty || '1'}): ${data.integ_fridge_make} ${data.integ_fridge_model}`.trim());
        }
        if (data.integ_freezer_make || data.integ_freezer_model) {
          items.push(`INTG Freezer (Qty: ${data.integ_freezer_qty || '1'}): ${data.integ_freezer_make} ${data.integ_freezer_model}`.trim());
        }
        if (data.sink_details) items.push(`Sink: ${data.sink_details} (Model: ${data.sink_model || 'N/A'})`);
        if (data.tap_details) items.push(`Tap: ${data.tap_details} (Model: ${data.tap_model || 'N/A'})`);
        break;
        
      case "Bedroom Furniture":
        if (data.bedside_cabinets_type) items.push(`Bedside Cabinets: ${data.bedside_cabinets_type} (Qty: ${data.bedside_cabinets_qty})`);
        if (data.dresser_desk === 'yes') items.push(`Dresser/Desk: ${data.dresser_desk_details}`);
        if (data.internal_mirror === 'yes') items.push(`Internal Mirror: ${data.internal_mirror_details}`);
        if (data.mirror_type) items.push(`Mirror: ${data.mirror_type} (Qty: ${data.mirror_qty})`);
        break;
        
      case "Lighting":
        if (data.soffit_lights_type) items.push(`Soffit Lights: ${data.soffit_lights_type} - ${data.soffit_lights_color}`);
        if (data.gable_lights_type) items.push(`Gable Lights: ${data.gable_lights_type} - ${data.gable_lights_main_color} / ${data.gable_lights_profile_color}`);
        break;
        
      case "Accessories":
        if (data.other_accessories) items.push(`Accessories: ${data.other_accessories}`);
        if (data.floor_protection && data.floor_protection.length > 0) {
          items.push(`Floor Protection: ${data.floor_protection.join(', ')}`);
        }
        break;
    }
    
    return items.filter(item => item.trim() !== '');
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async () => {
    if (materials.length === 0) {
      alert('No materials to order');
      return;
    }

    setSubmitting(true);
    try {
      const materialDescription = `${sectionTitle}\n${materials.join('\n')}`;
      
      const payload = {
        customer_id: customerInfo.id,
        material_description: materialDescription,
        supplier_name: supplier.trim() || null,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        order_date: orderDate,
        expected_delivery_date: expectedDelivery || null,
        notes: notes.trim() || null,
        status: 'ordered',
      };

      const token = localStorage.getItem('token');

      const response = await fetch(`${BACKEND_URL}/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create material order');
      }

      alert('Material order created successfully!');
      onClose();
      
      // Reset form
      setMaterials([]);
      setSupplier('');
      setEstimatedCost('');
      setOrderDate(new Date().toISOString().split('T')[0]);
      setExpectedDelivery('');
      setNotes('');
      
    } catch (error) {
      console.error('Error creating material order:', error);
      alert('Failed to create material order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Order Materials - {sectionTitle}</h2>
              <p className="text-sm text-gray-500 mt-1">Create material order for {customerInfo.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Customer Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-sm text-blue-900 mb-2">Customer Information</h3>
            <div className="text-sm space-y-1">
              <p><strong>Name:</strong> {customerInfo.name}</p>
              <p><strong>Phone:</strong> {customerInfo.phone}</p>
              <p><strong>Address:</strong> {customerInfo.address}</p>
            </div>
          </div>

          {/* Materials List */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Materials to Order * ({materials.length} items)
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {materials.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No materials found in this section
                </p>
              ) : (
                materials.map((material, index) => (
                  <div key={index} className="flex items-start justify-between bg-white p-2 rounded border">
                    <p className="text-sm flex-1">{material}</p>
                    <button
                      onClick={() => removeMaterial(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                      title="Remove item"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Supplier</label>
            <Input
              placeholder="e.g., Howdens, B&Q"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>

          {/* Estimated Cost */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Estimated Cost (£)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
          </div>

          {/* Date Ordered */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Date Ordered</label>
            <Input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Expected Delivery Date</label>
            <Input
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full resize-none rounded-md border border-gray-300 bg-white p-2 text-sm"
              placeholder="Any special instructions or details..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitOrder}
            disabled={materials.length === 0 || submitting}
          >
            {submitting ? 'Creating Order...' : 'Create Material Order'}
          </Button>
        </div>
      </div>
    </div>
  );
}