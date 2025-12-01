"use client";
import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, PenTool, Upload, Download, Package, UserPlus } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSidebarItems } from "@/navigation/sidebar/sidebar-items";

interface Appliance {
  make: string;
  model: string;
  order_date: string;
}

interface AdditionalDoor {
  door_style: string;
  door_color: string;
  door_manufacturer?: string;
  door_name?: string;
  glazing_material?: string;
  panel_color?: string;
  plinth_color?: string;
  cabinet_color?: string;
  worktop_color?: string;
  quantity: string;
}

interface AdditionalHandle {
  handles_code: string;
  handles_quantity: string;
  handles_size: string;
}

interface FormData {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_postcode: string;
  postcode: string;
  room: string;
  survey_date: string;
  appointment_date: string;
  installation_date: string;
  completion_date: string;
  deposit_date: string;
  door_style: string;
  door_color: string;
  door_manufacturer: string;
  door_name: string;
  glazing_material: string;
  plinth_filler_color: string;
  end_panel_color: string;
  cabinet_color: string;
  additional_doors: AdditionalDoor[];
  additional_handles: AdditionalHandle[];
  handles_code: string;
  handles_quantity: string;
  handles_size: string;
  accessories: string;
  lighting_spec: string;
  worktop_material_type: string;
  worktop_material_color: string;
  worktop_features: string[];
  worktop_other_details: string;
  worktop_size: string;
  bedside_cabinets_type: string;
  bedside_cabinets_qty: string;
  dresser_desk: string;
  dresser_desk_details: string;
  internal_mirror: string;
  internal_mirror_details: string;
  mirror_type: string;
  mirror_qty: string;
  soffit_lights_type: string;
  soffit_lights_color: string;
  gable_lights_type: string;
  gable_lights_main_color: string;
  gable_lights_profile_color: string;
  other_accessories: string;
  floor_protection: string[];
  under_wall_unit_lights_color: string;
  under_wall_unit_lights_profile: string;
  under_worktop_lights_color: string;
  kitchen_accessories: string;
  appliances_customer_owned: string;
  sink_tap_customer_owned: string;
  sink_details: string;
  sink_model: string;
  tap_details: string;
  tap_model: string;
  other_appliances: string;
  appliances: Appliance[];
  terms_date: string;
  gas_electric_info: string;
  appliance_promotion_info: string;
  signature_name: string;
  signature_date: string;
  integ_fridge_qty: string;
  integ_fridge_make: string;
  integ_fridge_model: string;
  integ_fridge_order_date: string;
  integ_freezer_qty: string;
  integ_freezer_make: string;
  integ_freezer_model: string;
  integ_freezer_order_date: string;
}

interface OrderMaterialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sectionTitle: string;
  sectionData: Record<string, any>;
  customerInfo: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
}

function OrderMaterialsDialog({ 
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

  // Extract materials from section data when dialog opens
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
        
        // Additional doors with proper formatting
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
        
        // Additional handles with proper formatting
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
          items.push(`INTG Fridge (Qty: ${data.integ_fridge_qty || '1'}): ${data.integ_fridge_make} ${data.integ_fridge_model}`.trim());
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

      const response = await fetch('https://aztec-interior.onrender.com/materials', {
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

export default function FormPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = searchParams.get("type");
  
  const [userRole, setUserRole] = useState<string>("manager");
  const formRef = useRef<HTMLDivElement>(null);
  const sidebarItems = getSidebarItems(userRole);

  const [formType, setFormType] = useState<"bedroom" | "kitchen">("bedroom");
  const [valid, setValid] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDialogSection, setOrderDialogSection] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [isWalkinMode, setIsWalkinMode] = useState(false);


  const [formData, setFormData] = useState<FormData>({
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    customer_postcode: "",
    postcode: "",
    room: "",
    survey_date: "",
    appointment_date: "",
    installation_date: "",
    completion_date: "",
    deposit_date: "",
    door_style: "",
    door_color: "",
    door_manufacturer: "",
    door_name: "",
    glazing_material: "",
    plinth_filler_color: "",
    end_panel_color: "",
    cabinet_color: "",
    additional_doors: [],
    additional_handles: [],
    handles_code: "",
    handles_quantity: "",
    handles_size: "",
    accessories: "",
    lighting_spec: "",
    worktop_material_type: "",
    worktop_material_color: "",
    worktop_features: [],
    worktop_other_details: "",
    worktop_size: "",
    bedside_cabinets_type: "",
    bedside_cabinets_qty: "",
    dresser_desk: "",
    dresser_desk_details: "",
    internal_mirror: "",
    internal_mirror_details: "",
    mirror_type: "",
    mirror_qty: "",
    soffit_lights_type: "",
    soffit_lights_color: "",
    gable_lights_type: "",
    gable_lights_main_color: "",
    gable_lights_profile_color: "",
    other_accessories: "",
    floor_protection: [],
    under_wall_unit_lights_color: "",
    under_wall_unit_lights_profile: "",
    under_worktop_lights_color: "",
    kitchen_accessories: "",
    appliances_customer_owned: "",
    sink_tap_customer_owned: "",
    sink_details: "",
    sink_model: "",
    tap_details: "",
    tap_model: "",
    other_appliances: "",
    appliances: [
      { make: "", model: "", order_date: "" },
      { make: "", model: "", order_date: "" },
      { make: "", model: "", order_date: "" },
      { make: "", model: "", order_date: "" },
      { make: "", model: "", order_date: "" },
      { make: "", model: "", order_date: "" },
      { make: "", model: "", order_date: "" },
    ],
    terms_date: "",
    gas_electric_info: "",
    appliance_promotion_info: "",
    signature_name: "",
    signature_date: "",
    integ_fridge_qty: "",
    integ_fridge_make: "",
    integ_fridge_model: "",
    integ_fridge_order_date: "",
    integ_freezer_qty: "",
    integ_freezer_make: "",
    integ_freezer_model: "",
    integ_freezer_order_date: "",
  });

  const handleSectionNA = (sectionType: string) => {
    if (!window.confirm(`Set all fields in this section to "N/A"?`)) return;

    setFormData((prev) => {
      const updates: Partial<FormData> = {};

      switch (sectionType) {
        case "material_specs":
          updates.door_style = "N/A";
          updates.door_color = "N/A";
          updates.door_manufacturer = "";
          updates.door_name = "";
          updates.glazing_material = "";
          updates.end_panel_color = "N/A";
          updates.plinth_filler_color = "N/A";
          updates.cabinet_color = "N/A";
          updates.worktop_material_color = "N/A";
          break;

        case "hardware_specs":
          updates.handles_code = "N/A";
          updates.handles_quantity = "0";
          updates.handles_size = "N/A";
          updates.accessories = "N/A";
          updates.lighting_spec = "N/A";
          updates.under_wall_unit_lights_color = "N/A";
          updates.under_wall_unit_lights_profile = "N/A";
          updates.under_worktop_lights_color = "N/A";
          break;

        case "worktop_specs":
          updates.worktop_material_type = "";
          updates.worktop_material_color = "N/A";
          updates.worktop_size = "N/A";
          updates.worktop_features = [];
          updates.worktop_other_details = "N/A";
          break;

        case "appliances":
          updates.appliances_customer_owned = "N/A";
          updates.sink_tap_customer_owned = "N/A";
          updates.appliances = [
            { make: "N/A", model: "N/A", order_date: "" },
            { make: "N/A", model: "N/A", order_date: "" },
            { make: "N/A", model: "N/A", order_date: "" },
            { make: "N/A", model: "N/A", order_date: "" },
            { make: "N/A", model: "N/A", order_date: "" },
            { make: "N/A", model: "N/A", order_date: "" },
            { make: "N/A", model: "N/A", order_date: "" },
          ];
          updates.integ_fridge_qty = "0";
          updates.integ_fridge_make = "N/A";
          updates.integ_fridge_model = "N/A";
          updates.integ_freezer_qty = "0";
          updates.integ_freezer_make = "N/A";
          updates.integ_freezer_model = "N/A";
          updates.sink_details = "N/A";
          updates.sink_model = "N/A";
          updates.tap_details = "N/A";
          updates.tap_model = "N/A";
          updates.other_appliances = "N/A";
          break;

        case "bedroom_furniture":
          updates.bedside_cabinets_type = "N/A";
          updates.bedside_cabinets_qty = "0";
          updates.dresser_desk = "N/A";
          updates.dresser_desk_details = "0";
          updates.internal_mirror = "N/A";
          updates.internal_mirror_details = "0";
          updates.mirror_type = "N/A";
          updates.mirror_qty = "0";
          break;

        case "lighting":
          updates.soffit_lights_type = "N/A";
          updates.soffit_lights_color = "N/A";
          updates.gable_lights_type = "N/A";
          updates.gable_lights_main_color = "N/A";
          updates.gable_lights_profile_color = "N/A";
          break;

        case "accessories":
          updates.other_accessories = "N/A";
          updates.floor_protection = ["No Floor Protection Required"];
          break;
      }

      return { ...prev, ...updates };
    });
  };


  const OrderButton = ({ sectionTitle, onClick }: { sectionTitle: string; onClick: () => void }) => {
    // ✅ Hide order button for Sales and HR roles
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
  };

  const NAButton = ({ sectionType, onClick }: { sectionType: string; onClick: () => void }) => {
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
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const custName = urlParams.get("customerName");
      const custAddress = urlParams.get("customerAddress");
      const custPhone = urlParams.get("customerPhone");
      const custPostcode = urlParams.get("customerPostcode");
      const formTypeParam = urlParams.get("type");
      const modeParam = urlParams.get("mode");

      if (modeParam === "walkin") {
        setIsWalkinMode(true);
      }

      if (formTypeParam === "kitchen" || formTypeParam === "bedroom") {
        setFormType(formTypeParam);
      }

      setFormData((prev) => ({
        ...prev,
        ...(custName ? { customer_name: custName } : {}),
        ...(custAddress ? { customer_address: custAddress } : {}),
        ...(custPhone ? { customer_phone: custPhone } : {}),
        ...(custPostcode ? {
          customer_postcode: custPostcode,
          postcode: custPostcode 
        } : {}),
      }));
    }
  }, []);

  type SingleField = keyof Omit<FormData, "floor_protection" | "worktop_features" | "appliances" | "additional_doors">;

  const handleInputChange = (field: SingleField, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCheckboxChange = (field: "floor_protection" | "worktop_features", value: string, checked: boolean) => {
    setFormData((prev) => {
      const currentValues = prev[field];
      if (checked) {
        return { ...prev, [field]: [...currentValues, value] };
      } else {
        return { ...prev, [field]: currentValues.filter((v) => v !== value) };
      }
    });
  };

  const handleApplianceChange = (index: number, field: keyof Appliance, value: string) => {
    setFormData((prev) => {
      const appliances = [...prev.appliances];
      if (!appliances[index]) {
        appliances[index] = { make: "", model: "", order_date: "" };
      }
      appliances[index] = { ...appliances[index], [field]: value };
      return { ...prev, appliances };
    });
  };

  const handleAdditionalDoorChange = (index: number, field: keyof AdditionalDoor, value: string) => {
    setFormData((prev) => {
      const additional_doors = [...prev.additional_doors];
      if (!additional_doors[index]) {
        additional_doors[index] = { 
          door_style: "", 
          door_color: "", 
          door_manufacturer: "",
          door_name: "",
          glazing_material: "",
          panel_color: "", 
          plinth_color: "", 
          cabinet_color: "",
          worktop_color: "",
          quantity: "" 
        };
      }
      additional_doors[index] = { ...additional_doors[index], [field]: value };
      return { ...prev, additional_doors };
    });
  };

  const addAdditionalDoor = () => {
    setFormData((prev) => ({
      ...prev,
      additional_doors: [...prev.additional_doors, { 
        door_style: "", 
        door_color: "", 
        door_manufacturer: "",
        door_name: "",
        glazing_material: "",
        panel_color: "", 
        plinth_color: "", 
        cabinet_color: "",
        worktop_color: "",
        quantity: "" 
      }],
    }));
  };

  const removeAdditionalDoor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      additional_doors: prev.additional_doors.filter((_, i) => i !== index),
    }));
  };

  const handleAdditionalHandleChange = (index: number, field: keyof AdditionalHandle, value: string) => {
  setFormData((prev) => {
    const additional_handles = [...prev.additional_handles];
    if (!additional_handles[index]) {
      additional_handles[index] = { 
        handles_code: "", 
        handles_quantity: "", 
        handles_size: "" 
      };
    }
    additional_handles[index] = { ...additional_handles[index], [field]: value };
    return { ...prev, additional_handles };
  });
};

  const addAdditionalHandle = () => {
    setFormData((prev) => ({
      ...prev,
      additional_handles: [...prev.additional_handles, { 
        handles_code: "", 
        handles_quantity: "", 
        handles_size: ""  
      }],
    }));
  };

  const removeAdditionalHandle = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      additional_handles: prev.additional_handles.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const errors: string[] = [];
    const isClientOwned = formData.appliances_customer_owned === "no";

    if (!formData.customer_name?.trim()) errors.push("Customer Name");
    if (!formData.customer_phone?.trim()) errors.push("Tel/Mobile Number");
    if (!formData.customer_address?.trim()) errors.push("Address");
    if (!formData.customer_postcode?.trim() && !formData.postcode?.trim()) {
      errors.push("Postcode");
    }

    if (formType === "kitchen") {
      if (!formData.door_style?.trim()) errors.push("Door Style");
      if (!formData.door_color?.trim()) errors.push("Door Color");
      if (formData.door_style === "glazed" && !formData.glazing_material?.trim()) errors.push("Glazing Material");
      if (!formData.end_panel_color?.trim()) errors.push("Panel Color");
      if (!formData.plinth_filler_color?.trim()) errors.push("Plinth/Filler Color");
      if (!formData.cabinet_color?.trim()) errors.push("Cabinet Color");
      if (!formData.handles_code?.trim()) errors.push("Handles Code");
      if (!formData.handles_quantity?.trim()) errors.push("Handles Quantity");
      if (!formData.handles_size?.trim()) errors.push("Handles Size");
      if (!formData.worktop_material_type?.trim()) errors.push("Worktop Material Type");
      if (!formData.worktop_material_color?.trim()) errors.push("Worktop Material Color");
      if (formData.worktop_features.length === 0) errors.push("Worktop Further Info");
      if (!formData.worktop_size?.trim()) errors.push("Worktop Size");
    }

    if (formType === "bedroom") {
      if (!formData.room?.trim()) errors.push("Room");
      if (!formData.door_style?.trim()) errors.push("Door Style");
      if (!formData.door_color?.trim()) errors.push("Door Color");
      if (!formData.end_panel_color?.trim()) errors.push("Panel Color");
      if (!formData.plinth_filler_color?.trim()) errors.push("Plinth/Filler Color");
      if (!formData.cabinet_color?.trim()) errors.push("Cabinet Color");
      if (!formData.handles_code?.trim()) errors.push("Handles Code");
      if (!formData.handles_quantity?.trim()) errors.push("Handles Quantity");
      if (!formData.handles_size?.trim()) errors.push("Handles Size");
      if (!formData.bedside_cabinets_type?.trim()) errors.push("Bedside Cabinets Type");
      if (!formData.bedside_cabinets_qty?.trim()) errors.push("Bedside Cabinets Quantity");
      if (!formData.dresser_desk?.trim()) errors.push("Dresser/Desk");
      if (!formData.internal_mirror?.trim()) errors.push("Internal Mirror");
      if (!formData.mirror_type?.trim()) errors.push("Mirror Type");
      if (!formData.mirror_qty?.trim()) errors.push("Mirror Quantity");
      if (!formData.soffit_lights_type?.trim()) errors.push("Soffit Lights Type");
      if (!formData.soffit_lights_color?.trim()) errors.push("Soffit Lights Color");
      if (!formData.gable_lights_type?.trim()) errors.push("Gable Lights Type");
      if (!formData.gable_lights_main_color?.trim()) errors.push("Gable Lights Main Color");
      if (!formData.gable_lights_profile_color?.trim()) errors.push("Gable Lights Profile Color");
      if (!formData.other_accessories?.trim()) errors.push("Other/Misc/Accessories");
      if (formData.floor_protection.length === 0) errors.push("Floor Protection");
    }

    if (!formData.terms_date?.trim()) errors.push("Date Terms and Conditions Given");
    if (!formData.gas_electric_info?.trim()) errors.push("Gas and Electric Installation Information");
    if (formType === "kitchen" && !formData.appliance_promotion_info?.trim()) {
      errors.push("Appliance Promotion Information");
    }

    if (!formData.signature_name?.trim()) errors.push("Customer Signature");
    if (!formData.signature_date?.trim()) errors.push("Signature Date");

    if (errors.length > 0) {
      setSubmitStatus({
        type: "error",
        message: `Please fill in the following required fields: ${errors.join(", ")}`,
      });
      return false;
    }

    return true;
  };

  const handleSavePDF = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const confirmMsg = "Are you sure you want to submit this checklist?";
    if (!window.confirm(confirmMsg)) return;

    const redirectUrl = searchParams.get("redirect");
    const token = searchParams.get("token") || "";
    const customerIdFromUrl = searchParams.get("customerId") || "";
    const projectIdFromUrl = searchParams.get("projectId") || "";  // ✅ ADD THIS LINE
    const isClientOwned = formData.appliances_customer_owned === "no";

    const finalAppliances = [...formData.appliances];

    if (
      formData.integ_fridge_qty?.trim() ||
      formData.integ_fridge_make?.trim() ||
      formData.integ_fridge_model?.trim() ||
      formData.integ_fridge_order_date?.trim()
    ) {
      finalAppliances.push({
        make: `INTG Fridge (QTY: ${formData.integ_fridge_qty || "1"}) - ${formData.integ_fridge_make || "No make specified"}`,
        model: formData.integ_fridge_model || "No model specified",
        order_date: isClientOwned ? formData.integ_fridge_order_date || "" : "",
      });
    }

    if (
      formData.integ_freezer_qty?.trim() ||
      formData.integ_freezer_make?.trim() ||
      formData.integ_freezer_model?.trim() ||
      formData.integ_freezer_order_date?.trim()
    ) {
      finalAppliances.push({
        make: `INTG Freezer (QTY: ${formData.integ_freezer_qty || "1"}) - ${formData.integ_freezer_make || "No make specified"}`,
        model: formData.integ_freezer_model || "No model specified",
        order_date: isClientOwned ? formData.integ_freezer_order_date || "" : "",
      });
    }

    const finalFormData = {
      ...formData,
      appliances: finalAppliances,
      signature_data: formData.signature_name,
      form_type: formType,
      customer_id: customerIdFromUrl || formData.customer_id || "",
      integ_fridge_qty: undefined,
      integ_fridge_make: undefined,
      integ_fridge_model: undefined,
      integ_fridge_order_date: undefined,
      integ_freezer_qty: undefined,
      integ_freezer_make: undefined,
      integ_freezer_model: undefined,
      integ_freezer_order_date: undefined,
    };

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("https://aztec-interior.onrender.com/submit-customer-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          formData: finalFormData,
          projectId: projectIdFromUrl || undefined,
          isWalkinMode: isWalkinMode, 
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const successMsg = isWalkinMode 
        ? "Customer created and form submitted successfully! Redirecting to customer profile..."
        : result.message || "Form submitted successfully! Redirecting...";

        setSubmitStatus({
          type: "success",
          message: result.message || "Form submitted successfully! Redirecting...",
        });

        setTimeout(() => {
          const targetCustomerId = result.customer_id || customerIdFromUrl;

          // ✅ ADD THIS IF BLOCK
          if (projectIdFromUrl) {
            router.push(`/dashboard/projects/${projectIdFromUrl}`);
          } else if (redirectUrl) {
            router.push(redirectUrl);
          } else if (targetCustomerId) {
            router.push(`/dashboard/customers/${targetCustomerId}`);
          } else {
            router.push("/dashboard/customers");
          }
        }, 2000);
      } else {
        setSubmitStatus({
          type: "error",
          message: result.error || "Failed to submit form",
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitStatus({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!valid) return <p className="p-6 text-center">Invalid or expired link.</p>;

  const showOrderDate = formData.appliances_customer_owned === "no";
  const standardApplianceGridTemplate = showOrderDate ? "grid-cols-[1fr_1fr_1fr]" : "grid-cols-[1fr_1fr]";
  const integUnitGridTemplate = showOrderDate ? "grid-cols-[0.5fr_1fr_1fr_1fr]" : "grid-cols-[0.5fr_1fr_1fr]";
  const standardAppliances = ["Oven", "Microwave", "Washing Machine", "Dryer", "HOB", "Extractor", "INTG Dishwasher"];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center space-x-2 px-4 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-900 text-white">
              <span className="text-sm font-bold">AI</span>
            </div>
            <span className="text-lg font-semibold">Aztec Interiors</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {sidebarItems.map((group) => (
            <SidebarGroup key={group.id}>
              {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={item.url === "/dashboard/forms"}>
                        <Link href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 print:hidden">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Installation Checklist</h1>
              <p className="text-sm text-gray-600">Complete installation verification form</p>
            </div>
            <Button onClick={handleSavePDF} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>
        </header>

        {/* ✅ ADD THIS WALK-IN MODE BANNER */}
        {isWalkinMode && (
          <div className="mx-2 mt-2 rounded-lg border-2 border-blue-300 bg-blue-50 p-4 print:hidden">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-500 p-2">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900">Walk-in Customer Mode</h3>
                <p className="text-sm text-blue-700 mt-1">
                  This form is in <strong>walk-in mode</strong>. When you submit this checklist:
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Customer information will be <strong>automatically extracted</strong> from the form</li>
                  <li>A new customer will be <strong>created in your database</strong></li>
                  <li>The checklist will be <strong>linked to this new customer</strong></li>
                  <li>You'll be redirected to the customer's profile page</li>
                </ul>
                <p className="text-xs text-blue-600 mt-3 font-medium">
                  ℹ️ Make sure to fill in customer name, phone, address, and postcode fields
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2 p-2" ref={formRef}>
          <form className="rounded-lg border bg-white p-4 shadow-sm print:shadow-none print:border-0">
            <h2 className="mb-1 text-center text-lg font-semibold">
              {formType === "kitchen" ? "Kitchen Installation Checklist" : "Bedroom Installation Checklist"}
            </h2>
            <p className="mb-6 text-center text-sm text-gray-600">All fields are mandatory</p>

            {submitStatus.type && (
              <div
                className={`mb-6 rounded-lg p-4 ${
                  submitStatus.type === "success"
                    ? "border border-green-200 bg-green-50 text-green-700"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {submitStatus.message}
              </div>
            )}

            {/* Customer Information - Blue Section */}
            <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-6 print:mb-2 print:p-3">
              <h3 className="mb-4 text-xl font-bold text-blue-900 print:mb-2">Customer Information</h3>
              <div className={`grid grid-cols-1 gap-4 ${formType === "bedroom" ? "md:grid-cols-5" : "md:grid-cols-4"} print:gap-2`}>
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">Customer Name</label>
                  <Input 
                    value={formData.customer_name || ""} 
                    onChange={(e) => handleInputChange("customer_name", e.target.value)}
                    readOnly={!isEditing} 
                    className="bg-white" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">Tel/Mobile Number</label>
                  <Input 
                    value={formData.customer_phone || ""} 
                    onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                    readOnly={!isEditing} 
                    className="bg-white" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">Address</label>
                  <Input 
                    value={formData.customer_address || ""} 
                    onChange={(e) => handleInputChange("customer_address", e.target.value)}
                    readOnly={!isEditing} 
                    className="bg-white" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">Postcode</label>
                  <Input 
                    value={formData.customer_postcode || formData.postcode || ""} 
                    onChange={(e) => {
                      // Update BOTH fields to ensure validation passes
                      handleInputChange("customer_postcode", e.target.value);
                      handleInputChange("postcode", e.target.value);
                    }}
                    readOnly={!isEditing} 
                    className="bg-white" 
                    placeholder="Enter postcode"
                  />
                </div>
                {formType === "bedroom" && (
                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">Room</label>
                    <Input 
                      value={formData.room || ""} 
                      onChange={(e) => handleInputChange("room", e.target.value)}
                      readOnly={!isEditing} 
                      className="bg-white" 
                    />
                  </div>
                )}
              </div>
            </div>

          {/* KITCHEN SPECIFIC SECTIONS */}
          {formType === "kitchen" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* 1. Material Specifications - Green Section */}
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-green-900">1. Material Specifications (Ordering)</h3>
                    <div className="flex items-center gap-2">
                      <NAButton 
                        sectionType="material_specs" 
                        onClick={() => handleSectionNA("material_specs")} 
                      />
                      <OrderButton
                        sectionTitle="Material Specifications"
                        onClick={() => {
                          setOrderDialogSection('Material Specifications');
                          setOrderDialogOpen(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Dynamic Grid based on door style */}
                    <div className={`grid gap-4 ${formData.door_style === "vinyl" || formData.door_style === "glazed" ? "grid-cols-2" : "grid-cols-2"}`}>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Door Style</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.door_style}
                          onChange={(e) => handleInputChange("door_style", e.target.value)}
                        >
                          <option value="">Select door style</option>
                          <option value="vinyl">Vinyl</option>
                          <option value="slab">Slab</option>
                          <option value="glazed">Glazed</option>
                          <option value="shaker">Shaker</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Door Color</label>
                        <Input
                          placeholder="Enter door color"
                          className="w-full bg-white"
                          value={formData.door_color}
                          onChange={(e) => handleInputChange("door_color", e.target.value)}
                        />
                      </div>

                      {formData.door_style === "vinyl" && (
                        <>
                          <div>
                            <label className="mb-1 block text-sm font-bold text-gray-700">Door Manufacturer</label>
                            <select
                              className="w-full rounded-md border border-gray-300 bg-white p-2"
                              value={formData.door_manufacturer}
                              onChange={(e) => handleInputChange("door_manufacturer", e.target.value)}
                            >
                              <option value="">Select manufacturer</option>
                              <option value="Integral">Integral</option>
                              <option value="Trade mouldings">Trade mouldings</option>
                              <option value="Hpp">Hpp</option>
                              <option value="Uform">Uform</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-bold text-gray-700">Door Name</label>
                            <Input
                              placeholder="Enter door name"
                              className="w-full bg-white"
                              value={formData.door_name}
                              onChange={(e) => handleInputChange("door_name", e.target.value)}
                            />
                          </div>
                        </>
                      )}

                      {formData.door_style === "glazed" && (
                        <div className="col-span-2">
                          <label className="mb-1 block text-sm font-bold text-gray-700">Glazing Material</label>
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white p-2"
                            value={formData.glazing_material}
                            onChange={(e) => handleInputChange("glazing_material", e.target.value)}
                          >
                            <option value="">Select material</option>
                            <option value="vinyl">Vinyl</option>
                            <option value="aluminium">Aluminium</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Panel Color and Plinth/Filler Color */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Panel Color</label>
                        <Input
                          placeholder="Enter panel color"
                          className="w-full bg-white"
                          value={formData.end_panel_color}
                          onChange={(e) => handleInputChange("end_panel_color", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Plinth/Filler Color</label>
                        <Input
                          placeholder="Enter plinth/filler color"
                          className="w-full bg-white"
                          value={formData.plinth_filler_color}
                          onChange={(e) => handleInputChange("plinth_filler_color", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Cabinet Color */}
                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">Cabinet Color</label>
                      <Input
                        placeholder="Enter cabinet color"
                        className="w-full bg-white"
                        value={formData.cabinet_color}
                        onChange={(e) => handleInputChange("cabinet_color", e.target.value)}
                      />
                    </div>

                    {/* Additional Doors */}
                    <div className="border-t pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700">Door Details (Additional Doors)</label>
                        <Button type="button" size="sm" onClick={addAdditionalDoor} className="bg-green-600">
                          + Add Additional Door
                        </Button>
                      </div>
                      {formData.additional_doors.map((door, idx) => (
                        <div key={idx} className="mb-3 space-y-3 rounded border-2 border-green-300 bg-white p-4">
                          {/* Door Style and Door Color + Conditional Fields */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Door Style</label>
                              <select
                                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                value={door.door_style}
                                onChange={(e) => handleAdditionalDoorChange(idx, "door_style", e.target.value)}
                              >
                                <option value="">Select</option>
                                <option value="vinyl">Vinyl</option>
                                <option value="slab">Slab</option>
                                <option value="glazed">Glazed</option>
                                <option value="shaker">Shaker</option>
                                <option value="N/A">N/A</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Door Color</label>
                              <Input
                                placeholder="Enter door color"
                                className="text-sm"
                                value={door.door_color}
                                onChange={(e) => handleAdditionalDoorChange(idx, "door_color", e.target.value)}
                              />
                            </div>

                            {/* Show Door Manufacturer and Door Name if Vinyl */}
                            {door.door_style === "vinyl" && (
                              <>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Door Manufacturer</label>
                                  <select
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                    value={door.door_manufacturer || ""}
                                    onChange={(e) => handleAdditionalDoorChange(idx, "door_manufacturer", e.target.value)}
                                  >
                                    <option value="">Select manufacturer</option>
                                    <option value="Integral">Integral</option>
                                    <option value="Trade mouldings">Trade mouldings</option>
                                    <option value="Hpp">Hpp</option>
                                    <option value="Uform">Uform</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Door Name</label>
                                  <Input
                                    placeholder="Enter door name"
                                    className="text-sm"
                                    value={door.door_name || ""}
                                    onChange={(e) => handleAdditionalDoorChange(idx, "door_name", e.target.value)}
                                  />
                                </div>
                              </>
                            )}

                            {/* Show Glazing Material if Glazed */}
                            {door.door_style === "glazed" && (
                              <div className="col-span-2">
                                <label className="mb-1 block text-xs font-bold text-gray-600">Glazing Material</label>
                                <select
                                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                  value={door.glazing_material || ""}
                                  onChange={(e) => handleAdditionalDoorChange(idx, "glazing_material", e.target.value)}
                                >
                                  <option value="">Select material</option>
                                  <option value="vinyl">Vinyl</option>
                                  <option value="aluminium">Aluminium</option>
                                  <option value="N/A">N/A</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Panel Color and Plinth/Filler Color */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Panel Color</label>
                              <Input
                                placeholder="Enter panel color"
                                className="text-sm"
                                value={door.panel_color || ""}
                                onChange={(e) => handleAdditionalDoorChange(idx, "panel_color", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Plinth/Filler Color</label>
                              <Input
                                placeholder="Enter plinth/filler color"
                                className="text-sm"
                                value={door.plinth_color || ""}
                                onChange={(e) => handleAdditionalDoorChange(idx, "plinth_color", e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Cabinet Color (full width) */}
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Cabinet Color</label>
                            <Input
                              placeholder="Enter cabinet color"
                              className="text-sm"
                              value={door.cabinet_color || ""}
                              onChange={(e) => handleAdditionalDoorChange(idx, "cabinet_color", e.target.value)}
                            />
                          </div>

                          {/* Quantity and Remove Button */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Quantity</label>
                              <Input
                                placeholder="Enter quantity"
                                type="text"
                                className="text-sm"
                                value={door.quantity}
                                onChange={(e) => handleAdditionalDoorChange(idx, "quantity", e.target.value)}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeAdditionalDoor(idx)}
                                className="w-full"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Hardware Specifications - Purple Section */}
                <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-purple-900">2. Hardware Specifications</h3>
                    <div className="flex items-center gap-2">
                      <NAButton 
                        sectionType="hardware_specs" 
                        onClick={() => handleSectionNA("hardware_specs")} 
                      />
                      <OrderButton
                        sectionTitle="Hardware Specifications"
                        onClick={() => {
                          setOrderDialogSection('Hardware Specifications');
                          setOrderDialogOpen(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Handle Code</label>
                        <Input
                          placeholder="Enter handle code"
                          className="w-full bg-white"
                          value={formData.handles_code}
                          onChange={(e) => handleInputChange("handles_code", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Handle Quantity</label>
                        <Input
                          placeholder="Enter quantity"
                          type="text"
                          className="w-full bg-white"
                          value={formData.handles_quantity}
                          onChange={(e) => handleInputChange("handles_quantity", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Handle Size</label>
                        <Input
                          placeholder="Enter size (e.g., 128mm)"
                          className="w-full bg-white"
                          value={formData.handles_size}
                          onChange={(e) => handleInputChange("handles_size", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* ✅ ADD THIS ENTIRE SECTION - Additional Handles */}
                    <div className="border-t pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700">Handle Details (Additional Handles)</label>
                        <Button type="button" size="sm" onClick={addAdditionalHandle} className="bg-purple-600">
                          + Add Additional Handle
                        </Button>
                      </div>
                      {formData.additional_handles.map((handle, idx) => (
                        <div key={idx} className="mb-3 space-y-3 rounded border-2 border-purple-300 bg-white p-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Handle Code</label>
                              <Input
                                placeholder="Enter handle code"
                                className="text-sm"
                                value={handle.handles_code}
                                onChange={(e) => handleAdditionalHandleChange(idx, "handles_code", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Handle Quantity</label>
                              <Input
                                placeholder="Enter quantity"
                                type="text"
                                className="text-sm"
                                value={handle.handles_quantity}
                                onChange={(e) => handleAdditionalHandleChange(idx, "handles_quantity", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Handle Size</label>
                              <Input
                                placeholder="Size (e.g., 128mm)"
                                className="text-sm"
                                value={handle.handles_size}
                                onChange={(e) => handleAdditionalHandleChange(idx, "handles_size", e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeAdditionalHandle(idx)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">Accessories (e.g., Pullouts)</label>
                      <textarea
                        className="h-16 w-full resize-none rounded-md border border-gray-300 bg-white p-2 text-sm"
                        placeholder="Enter accessory details"
                        value={formData.accessories}
                        onChange={(e) => handleInputChange("accessories", e.target.value)}
                      ></textarea>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">Lighting Specification</label>
                      <textarea
                        className="h-16 w-full resize-none rounded-md border border-gray-300 bg-white p-2 text-sm"
                        placeholder="Enter lighting details"
                        value={formData.lighting_spec}
                        onChange={(e) => handleInputChange("lighting_spec", e.target.value)}
                      ></textarea>
                    </div>

                    {/* Lighting Details */}
                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">Under Wall Unit Lights</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                          value={formData.under_wall_unit_lights_color}
                          onChange={(e) => handleInputChange("under_wall_unit_lights_color", e.target.value)}
                        >
                          <option value="">Main Colour</option>
                          <option value="cool-white">Cool White</option>
                          <option value="warm-white">Warm White</option>
                          <option value="N/A">N/A</option>
                        </select>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                          value={formData.under_wall_unit_lights_profile}
                          onChange={(e) => handleInputChange("under_wall_unit_lights_profile", e.target.value)}
                        >
                          <option value="">Profile Colour</option>
                          <option value="black">Black</option>
                          <option value="white">White</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">Under Worktop Lights</label>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                        value={formData.under_worktop_lights_color}
                        onChange={(e) => handleInputChange("under_worktop_lights_color", e.target.value)}
                      >
                        <option value="">Colour</option>
                        <option value="cool-white">Cool White</option>
                        <option value="warm-white">Warm White</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Worktop Specifications - Orange Section */}
                <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-orange-900">3. Worktop Specifications (Ordering)</h3>
                    <div className="flex items-center gap-2">
                      <NAButton 
                        sectionType="worktop_specs" 
                        onClick={() => handleSectionNA("worktop_specs")} 
                      />
                      <OrderButton
                        sectionTitle="Worktop Specifications"
                        onClick={() => {
                          setOrderDialogSection('Worktop Specifications');
                          setOrderDialogOpen(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Material Type</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.worktop_material_type}
                          onChange={(e) => handleInputChange("worktop_material_type", e.target.value)}
                        >
                          <option value="">Select material type</option>
                          <option value="stone">Stone</option>
                          <option value="laminate">Laminate</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Material Color</label>
                        <Input
                          placeholder="Enter color/finish"
                          className="w-full bg-white"
                          value={formData.worktop_material_color}
                          onChange={(e) => handleInputChange("worktop_material_color", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Size/Thickness</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.worktop_size}
                          onChange={(e) => handleInputChange("worktop_size", e.target.value)}
                        >
                          <option value="">Select thickness</option>
                          <option value="12mm">12mm</option>
                          <option value="18mm">18mm</option>
                          <option value="20mm">20mm</option>
                          <option value="25mm">25mm</option>
                          <option value="30mm">30mm</option>
                          <option value="38mm">38mm</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-700">Worktop Further Info</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          "Upstand",
                          "Splashback",
                          "Wall Cladding",
                          "Sink Cut Out",
                          "Drainer Grooves",
                          "Hob Cut Out",
                          "Window Cill",
                          "LED Grooves",
                        ].map((item) => (
                          <label key={item} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded"
                              value={item}
                              checked={formData.worktop_features.includes(item)}
                              onChange={(e) => handleCheckboxChange("worktop_features", item, e.target.checked)}
                            />
                            <span className="text-sm">{item}</span>
                          </label>
                        ))}
                      </div>
                      <Input
                        placeholder="Other worktop details"
                        className="mt-3 w-full bg-white"
                        value={formData.worktop_other_details}
                        onChange={(e) => handleInputChange("worktop_other_details", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                {/* 4. Appliance and Sink & Tap - Yellow Section */}
                <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-yellow-900">4. Appliance and Sink & Tap Information</h3>
                    <div className="flex items-center gap-2">
                      <NAButton 
                        sectionType="appliances" 
                        onClick={() => handleSectionNA("appliances")} 
                      />
                      <OrderButton
                        sectionTitle="Appliances"
                        onClick={() => {
                          setOrderDialogSection('Appliances');
                          setOrderDialogOpen(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Appliances */}
                  <div className="mb-6">
                    <label className="mb-2 block text-sm font-bold text-gray-700">Appliances Customer Owned</label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white p-2"
                      value={formData.appliances_customer_owned}
                      onChange={(e) => handleInputChange("appliances_customer_owned", e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>

                  {formData.appliances_customer_owned && formData.appliances_customer_owned !== "N/A" && (
                    <div className="mb-6">
                      <label className="mb-2 block text-sm font-bold text-gray-700">
                        {formData.appliances_customer_owned === "yes"
                          ? "Customer Owned Appliances Details"
                          : "Client Supplied Appliances Details"}
                      </label>
                      <div className="space-y-3">
                        {standardAppliances.map((appliance, idx) => (
                          <div key={appliance} className="rounded border border-yellow-300 bg-white p-3">
                            <label className="mb-2 block text-sm font-bold text-gray-700">{appliance}</label>
                            <div className={`grid ${standardApplianceGridTemplate} gap-3`}>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Make</label>
                                <Input
                                  placeholder={`${appliance} make`}
                                  className="w-full"
                                  value={formData.appliances[idx]?.make || ""}
                                  onChange={(e) => handleApplianceChange(idx, "make", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Model</label>
                                <Input
                                  placeholder={`${appliance} model`}
                                  className="w-full"
                                  value={formData.appliances[idx]?.model || ""}
                                  onChange={(e) => handleApplianceChange(idx, "model", e.target.value)}
                                />
                              </div>
                              {showOrderDate && (
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Order Date</label>
                                  <input
                                    type="date"
                                    className="w-full rounded-md border border-gray-300 p-2"
                                    value={formData.appliances[idx]?.order_date || ""}
                                    onChange={(e) => handleApplianceChange(idx, "order_date", e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Integrated Units */}
                        <div className="space-y-3 border-t border-yellow-300 pt-3">
                          <div className="rounded border border-yellow-300 bg-white p-3">
                            <label className="mb-2 block text-sm font-bold text-gray-700">INTG Fridge</label>
                            <div className={`grid ${integUnitGridTemplate} gap-3`}>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">QTY</label>
                                <Input
                                  placeholder="QTY"
                                  type="text"
                                  className="w-full"
                                  value={formData.integ_fridge_qty}
                                  onChange={(e) => handleInputChange("integ_fridge_qty", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Make</label>
                                <Input
                                  placeholder="Make"
                                  className="w-full"
                                  value={formData.integ_fridge_make}
                                  onChange={(e) => handleInputChange("integ_fridge_make", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Model</label>
                                <Input
                                  placeholder="Model"
                                  className="w-full"
                                  value={formData.integ_fridge_model}
                                  onChange={(e) => handleInputChange("integ_fridge_model", e.target.value)}
                                />
                              </div>
                              {showOrderDate && (
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Order Date</label>
                                  <input
                                    type="date"
                                    className="w-full rounded-md border border-gray-300 p-2"
                                    value={formData.integ_fridge_order_date}
                                    onChange={(e) => handleInputChange("integ_fridge_order_date", e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded border border-yellow-300 bg-white p-3">
                            <label className="mb-2 block text-sm font-bold text-gray-700">INTG Freezer</label>
                            <div className={`grid ${integUnitGridTemplate} gap-3`}>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">QTY</label>
                                <Input
                                  placeholder="QTY"
                                  type="text"
                                  className="w-full"
                                  value={formData.integ_freezer_qty}
                                  onChange={(e) => handleInputChange("integ_freezer_qty", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Make</label>
                                <Input
                                  placeholder="Make"
                                  className="w-full"
                                  value={formData.integ_freezer_make}
                                  onChange={(e) => handleInputChange("integ_freezer_make", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Model</label>
                                <Input
                                  placeholder="Model"
                                  className="w-full"
                                  value={formData.integ_freezer_model}
                                  onChange={(e) => handleInputChange("integ_freezer_model", e.target.value)}
                                />
                              </div>
                              {showOrderDate && (
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Order Date</label>
                                  <input
                                    type="date"
                                    className="w-full rounded-md border border-gray-300 p-2"
                                    value={formData.integ_freezer_order_date}
                                    onChange={(e) => handleInputChange("integ_freezer_order_date", e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-600">Other / Misc Appliances</label>
                          <Input
                            placeholder="Enter any additional appliances"
                            className="w-full"
                            value={formData.other_appliances}
                            onChange={(e) => handleInputChange("other_appliances", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sink & Tap */}
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">Sink & Tap Customer Owned</label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white p-2"
                      value={formData.sink_tap_customer_owned}
                      onChange={(e) => handleInputChange("sink_tap_customer_owned", e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>

                  {formData.sink_tap_customer_owned && formData.sink_tap_customer_owned !== "N/A" && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Sink Details</label>
                        <Input
                          placeholder="Sink details (e.g., Make/Size)"
                          className="mb-2 w-full bg-white"
                          value={formData.sink_details}
                          onChange={(e) => handleInputChange("sink_details", e.target.value)}
                        />
                        <Input
                          placeholder="Sink model code"
                          className="w-full bg-white"
                          value={formData.sink_model}
                          onChange={(e) => handleInputChange("sink_model", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Tap Details</label>
                        <Input
                          placeholder="Tap details (e.g., Make)"
                          className="mb-2 w-full bg-white"
                          value={formData.tap_details}
                          onChange={(e) => handleInputChange("tap_details", e.target.value)}
                        />
                        <Input
                          placeholder="Tap model code"
                          className="w-full bg-white"
                          value={formData.tap_model}
                          onChange={(e) => handleInputChange("tap_model", e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BEDROOM SPECIFIC SECTIONS */}
          {formType === "bedroom" && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* 1. Material Specifications - Green Section */}
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-green-900">1. Material Specifications</h3>
                    <div className="flex items-center gap-2">
                      <NAButton 
                        sectionType="material_specs" 
                        onClick={() => handleSectionNA("material_specs")} 
                      />
                      <OrderButton
                        sectionTitle="Material Specifications"
                        onClick={() => {
                          setOrderDialogSection('Material Specifications');
                          setOrderDialogOpen(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Dynamic Grid based on door style */}
                    <div className={`grid gap-4 ${formData.door_style === "vinyl" ? "grid-cols-2" : "grid-cols-2"}`}>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Door Style</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.door_style}
                          onChange={(e) => handleInputChange("door_style", e.target.value)}
                        >
                          <option value="">Select door style</option>
                          <option value="vinyl">Vinyl</option>
                          <option value="slab">Slab</option>
                          <option value="shaker">Shaker</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Door Color</label>
                        <Input
                          placeholder="Enter door color"
                          className="w-full bg-white"
                          value={formData.door_color}
                          onChange={(e) => handleInputChange("door_color", e.target.value)}
                        />
                      </div>

                      {formData.door_style === "vinyl" && (
                        <>
                          <div>
                            <label className="mb-1 block text-sm font-bold text-gray-700">Door Manufacturer</label>
                            <select
                              className="w-full rounded-md border border-gray-300 bg-white p-2"
                              value={formData.door_manufacturer}
                              onChange={(e) => handleInputChange("door_manufacturer", e.target.value)}
                            >
                              <option value="">Select manufacturer</option>
                              <option value="Integral">Integral</option>
                              <option value="Trade mouldings">Trade mouldings</option>
                              <option value="Hpp">Hpp</option>
                              <option value="Uform">Uform</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-bold text-gray-700">Door Name</label>
                            <Input
                              placeholder="Enter door name"
                              className="w-full bg-white"
                              value={formData.door_name}
                              onChange={(e) => handleInputChange("door_name", e.target.value)}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Panel Color and Plinth/Filler Color */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Panel Color</label>
                        <Input
                          placeholder="Enter panel color"
                          className="w-full bg-white"
                          value={formData.end_panel_color}
                          onChange={(e) => handleInputChange("end_panel_color", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Plinth/Filler Color</label>
                        <Input
                          placeholder="Enter plinth/filler color"
                          className="w-full bg-white"
                          value={formData.plinth_filler_color}
                          onChange={(e) => handleInputChange("plinth_filler_color", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Cabinet Color and Worktop Color */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Cabinet Color</label>
                        <Input
                          placeholder="Enter cabinet color"
                          className="w-full bg-white"
                          value={formData.cabinet_color}
                          onChange={(e) => handleInputChange("cabinet_color", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Color</label>
                        <Input
                          placeholder="Enter worktop color"
                          className="w-full bg-white"
                          value={formData.worktop_material_color}
                          onChange={(e) => handleInputChange("worktop_material_color", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Additional Doors */}
                    <div className="border-t pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700">Door Details (Additional Doors)</label>
                        <Button type="button" size="sm" onClick={addAdditionalDoor} className="bg-green-600">
                          + Add Additional Door
                        </Button>
                      </div>
                      {formData.additional_doors.map((door, idx) => (
                        <div key={idx} className="mb-3 space-y-3 rounded border-2 border-green-300 bg-white p-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Door Style</label>
                              <select
                                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                value={door.door_style}
                                onChange={(e) => handleAdditionalDoorChange(idx, "door_style", e.target.value)}
                              >
                                <option value="">Select</option>
                                <option value="vinyl">Vinyl</option>
                                <option value="slab">Slab</option>
                                <option value="shaker">Shaker</option>
                                <option value="N/A">N/A</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Door Color</label>
                              <Input
                                placeholder="Enter door color"
                                className="text-sm"
                                value={door.door_color}
                                onChange={(e) => handleAdditionalDoorChange(idx, "door_color", e.target.value)}
                              />
                            </div>
                            
                            {door.door_style === "vinyl" && (
                              <>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Door Manufacturer</label>
                                  <select
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                    value={door.door_manufacturer || ""}
                                    onChange={(e) => handleAdditionalDoorChange(idx, "door_manufacturer", e.target.value)}
                                  >
                                    <option value="">Select manufacturer</option>
                                    <option value="Integral">Integral</option>
                                    <option value="Trade mouldings">Trade mouldings</option>
                                    <option value="Hpp">Hpp</option>
                                    <option value="Uform">Uform</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Door Name</label>
                                  <Input
                                    placeholder="Enter door name"
                                    className="text-sm"
                                    value={door.door_name || ""}
                                    onChange={(e) => handleAdditionalDoorChange(idx, "door_name", e.target.value)}
                                  />
                                </div>
                              </>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Panel Color</label>
                              <Input
                                placeholder="Enter panel color"
                                className="text-sm"
                                value={door.panel_color || ""}
                                onChange={(e) => handleAdditionalDoorChange(idx, "panel_color", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Plinth/Filler Color</label>
                              <Input
                                placeholder="Enter plinth/filler color"
                                className="text-sm"
                                value={door.plinth_color || ""}
                                onChange={(e) => handleAdditionalDoorChange(idx, "plinth_color", e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Cabinet Color</label>
                              <Input
                                placeholder="Enter cabinet color"
                                className="text-sm"
                                value={door.cabinet_color || ""}
                                onChange={(e) => handleAdditionalDoorChange(idx, "cabinet_color", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Worktop Color</label>
                              <Input
                                placeholder="Enter worktop color"
                                className="text-sm"
                                value={door.worktop_color || ""}
                                onChange={(e) => handleAdditionalDoorChange(idx, "worktop_color", e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Quantity</label>
                              <Input
                                placeholder="Enter quantity"
                                type="text"
                                className="text-sm"
                                value={door.quantity}
                                onChange={(e) => handleAdditionalDoorChange(idx, "quantity", e.target.value)}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeAdditionalDoor(idx)}
                                className="w-full"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Hardware Specifications - Purple Section */}
                <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-purple-900">2. Hardware Specifications</h3>
                    <div className="flex items-center gap-2">
                      <NAButton 
                        sectionType="hardware_specs" 
                        onClick={() => handleSectionNA("hardware_specs")} 
                      />
                      <OrderButton
                        sectionTitle="Hardware Specifications"
                        onClick={() => {
                          setOrderDialogSection('Hardware Specifications');
                          setOrderDialogOpen(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* ✅ CHANGED: Wrapped in space-y-3 container instead of just grid */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Handle Code</label>
                        <Input
                          placeholder="Enter handle code"
                          className="w-full bg-white"
                          value={formData.handles_code}
                          onChange={(e) => handleInputChange("handles_code", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Handle Quantity</label>
                        <Input
                          placeholder="Enter quantity"
                          type="text"
                          className="w-full bg-white"
                          value={formData.handles_quantity}
                          onChange={(e) => handleInputChange("handles_quantity", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Handle Size</label>
                        <Input
                          placeholder="Enter size (e.g., 128mm)"
                          className="w-full bg-white"
                          value={formData.handles_size}
                          onChange={(e) => handleInputChange("handles_size", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* ✅ NEW SECTION: Additional Handles - Copy from Kitchen */}
                    <div className="border-t pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700">Handle Details (Additional Handles)</label>
                        <Button type="button" size="sm" onClick={addAdditionalHandle} className="bg-purple-600">
                          + Add Additional Handle
                        </Button>
                      </div>
                      {formData.additional_handles.map((handle, idx) => (
                        <div key={idx} className="mb-3 space-y-3 rounded border-2 border-purple-300 bg-white p-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Handle Code</label>
                              <Input
                                placeholder="Enter handle code"
                                className="text-sm"
                                value={handle.handles_code}
                                onChange={(e) => handleAdditionalHandleChange(idx, "handles_code", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Handle Quantity</label>
                              <Input
                                placeholder="Enter quantity"
                                type="text"
                                className="text-sm"
                                value={handle.handles_quantity}
                                onChange={(e) => handleAdditionalHandleChange(idx, "handles_quantity", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Handle Size</label>
                              <Input
                                placeholder="Size (e.g., 128mm)"
                                className="text-sm"
                                value={handle.handles_size}
                                onChange={(e) => handleAdditionalHandleChange(idx, "handles_size", e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeAdditionalHandle(idx)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* 3. Accessories & Floor Protection - Pink Section */}
                <div className="rounded-lg border-2 border-pink-200 bg-pink-50 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-pink-900">5. Accessories & Floor Protection</h3>
                    <div className="flex items-center gap-2">
                      <NAButton 
                        sectionType="accessories" 
                        onClick={() => handleSectionNA("accessories")} 
                      />
                      <OrderButton
                        sectionTitle="Accessories"
                        onClick={() => {
                          setOrderDialogSection('Accessories');
                          setOrderDialogOpen(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">Other/Misc/Accessories</label>
                      <textarea
                        className="h-20 w-full resize-none rounded-md border border-gray-300 bg-white p-3"
                        placeholder="Enter additional items or notes"
                        value={formData.other_accessories}
                        onChange={(e) => handleInputChange("other_accessories", e.target.value)}
                      ></textarea>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-700">Floor Protection</label>
                      <div className="space-y-2">
                        {["Carpet Protection", "Floor Tile Protection", "No Floor Protection Required"].map((item) => (
                          <label key={item} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded"
                              value={item}
                              checked={formData.floor_protection.includes(item)}
                              onChange={(e) => handleCheckboxChange("floor_protection", item, e.target.checked)}
                            />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                {/* 4. Bedroom Furniture - Orange Section */}
                <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-orange-900">4. Bedroom Furniture Specifications</h3>
                    <div className="flex items-center gap-2">
                      <NAButton 
                        sectionType="bedroom_furniture" 
                        onClick={() => handleSectionNA("bedroom_furniture")} 
                      />
                      <OrderButton
                        sectionTitle="Bedroom Furniture"
                        onClick={() => {
                          setOrderDialogSection('Bedroom Furniture');
                          setOrderDialogOpen(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Bedside Cabinets</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.bedside_cabinets_type}
                          onChange={(e) => {
                            handleInputChange("bedside_cabinets_type", e.target.value);
                            if (e.target.value === "N/A") {
                              handleInputChange("bedside_cabinets_qty", "0");
                            }
                          }}
                        >
                          <option value="">Select option</option>
                          <option value="floating">Floating</option>
                          <option value="fitted">Fitted</option>
                          <option value="freestand">Freestand</option>
                          <option value="N/A">N/A</option>
                        </select>
                        <Input
                          placeholder="Quantity"
                          className="mt-2 w-full bg-white"
                          type="text"
                          value={formData.bedside_cabinets_qty}
                          onChange={(e) => handleInputChange("bedside_cabinets_qty", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Dresser/Desk</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.dresser_desk}
                          onChange={(e) => {
                            handleInputChange("dresser_desk", e.target.value);
                            if (e.target.value === "N/A" || e.target.value === "no") {
                              handleInputChange("dresser_desk_details", "0");
                            }
                          }}
                        >
                          <option value="">Select option</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="N/A">N/A</option>
                        </select>
                        <Input
                          placeholder="QTY/Size"
                          className="mt-2 w-full bg-white"
                          value={formData.dresser_desk_details}
                          onChange={(e) => handleInputChange("dresser_desk_details", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Internal Mirror</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.internal_mirror}
                          onChange={(e) => {
                            handleInputChange("internal_mirror", e.target.value);
                            if (e.target.value === "N/A" || e.target.value === "no") {
                              handleInputChange("internal_mirror_details", "0");
                            }
                          }}
                        >
                          <option value="">Select option</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="N/A">N/A</option>
                        </select>
                        <Input
                          placeholder="QTY/Size"
                          className="mt-2 w-full bg-white"
                          value={formData.internal_mirror_details}
                          onChange={(e) => handleInputChange("internal_mirror_details", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Mirror</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.mirror_type}
                          onChange={(e) => {
                            handleInputChange("mirror_type", e.target.value);
                            if (e.target.value === "N/A") {
                              handleInputChange("mirror_qty", "0");
                            }
                          }}
                        >
                          <option value="">Select option</option>
                          <option value="silver">Silver</option>
                          <option value="bronze">Bronze</option>
                          <option value="grey">Grey</option>
                          <option value="N/A">N/A</option>
                        </select>
                        <Input
                          placeholder="Quantity"
                          className="mt-2 w-full bg-white"
                          type="text"
                          value={formData.mirror_qty}
                          onChange={(e) => handleInputChange("mirror_qty", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Lighting - Yellow Section */}
                <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-yellow-900">5. Lighting Specifications</h3>
                    <div className="flex items-center gap-2">
                      <NAButton 
                        sectionType="lighting" 
                        onClick={() => handleSectionNA("lighting")} 
                      />
                      <OrderButton
                        sectionTitle="Lighting"
                        onClick={() => {
                          setOrderDialogSection('Lighting');
                          setOrderDialogOpen(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Soffit Lights */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-700">Soffit Lights</label>
                      <div className="grid grid-cols-2 gap-4">
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.soffit_lights_type}
                          onChange={(e) => handleInputChange("soffit_lights_type", e.target.value)}
                        >
                          <option value="">Select type</option>
                          <option value="spot">Spot</option>
                          <option value="strip">Strip</option>
                          <option value="N/A">N/A</option>
                        </select>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.soffit_lights_color}
                          onChange={(e) => handleInputChange("soffit_lights_color", e.target.value)}
                        >
                          <option value="">Colour</option>
                          <option value="cool-white">Cool White</option>
                          <option value="warm-white">Warm White</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </div>
                    </div>

                    {/* Gable Lights */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-700">Gable Lights</label>
                      <div className="space-y-2">
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.gable_lights_type}
                          onChange={(e) => handleInputChange("gable_lights_type", e.target.value)}
                        >
                          <option value="">Select type</option>
                          <option value="rocker">Rocker</option>
                          <option value="sensor">Sensor</option>
                          <option value="N/A">N/A</option>
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white p-2"
                            value={formData.gable_lights_main_color}
                            onChange={(e) => handleInputChange("gable_lights_main_color", e.target.value)}
                          >
                            <option value="">Main Colour</option>
                            <option value="cool-white">Cool White</option>
                            <option value="warm-white">Warm White</option>
                            <option value="N/A">N/A</option>
                          </select>
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white p-2"
                            value={formData.gable_lights_profile_color}
                            onChange={(e) => handleInputChange("gable_lights_profile_color", e.target.value)}
                          >
                            <option value="">Profile Colour</option>
                            <option value="black">Black</option>
                            <option value="white">White</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terms and Conditions - Gray Section */}
          <div className="rounded-lg border-2 border-gray-300 bg-gray-100 p-6">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Terms & Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">Date Terms and Conditions Given</label>
                <Input
                  type="date"
                  className="w-full bg-white"
                  value={formData.terms_date}
                  onChange={(e) => handleInputChange("terms_date", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Gas and Electric Installation {formType === "kitchen" ? "Information" : "Terms"} Given
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white p-2"
                  value={formData.gas_electric_info}
                  onChange={(e) => handleInputChange("gas_electric_info", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
              {formType === "kitchen" && (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-bold text-gray-700">
                    Appliance Promotion Information Given
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white p-2"
                    value={formData.appliance_promotion_info}
                    onChange={(e) => handleInputChange("appliance_promotion_info", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Statement */}
          <div className="rounded-lg bg-gray-50 p-3 mt-3">
            <p className="mb-2 text-sm font-bold text-gray-700">
              I confirm that the above specification and all annotated plans and elevations with this pack are correct.
            </p>
            <p className="mb-2 text-xs text-gray-600">Please sign below to confirm.</p>
          </div>

          {/* Signature Section */}
          <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-3 mt-3">
            <h3 className="mb-2 text-base font-bold text-indigo-900">Customer Signature</h3>
            
            <div className="mb-3">
              <label className="mb-1 block text-sm font-bold text-gray-700">Full Name</label>
              <Input
                placeholder="Type your full name"
                className="w-full bg-white h-10 text-base"
                value={formData.signature_name}
                onChange={(e) => handleInputChange("signature_name", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">Date</label>
              <Input
                type="date"
                className="w-full bg-white h-10"
                value={formData.signature_date}
                onChange={(e) => handleInputChange("signature_date", e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="border-t pt-3 text-center print:hidden">
            <Button className="px-6 py-2 text-base font-bold" onClick={handleSubmit} disabled={isSubmitting} type="button">
              {isSubmitting ? "Submitting..." : "Submit Form"}
            </Button>
          </div>
        </form>
      </div>
    </SidebarInset>

    <OrderMaterialsDialog
      isOpen={orderDialogOpen}
      onClose={() => setOrderDialogOpen(false)}
      sectionTitle={orderDialogSection}
      sectionData={formData}
      customerInfo={{
        id: formData.customer_id,
        name: formData.customer_name,
        phone: formData.customer_phone,
        address: formData.customer_address,
      }}
    />

    {/* Print Styles */}
    <style jsx global>{`
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        
        /* Hide ONLY sidebar, header, and buttons */
        aside,
        header,
        nav,
        button,
        .print\\:hidden {
          display: none !important;
        }
        
        /* FORCE main content to be visible */
        main,
        [role="main"],
        .flex.flex-1.flex-col,
        form {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: static !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
        }
        
        /* Show the form title */
        h2 {
          display: block !important;
          visibility: visible !important;
          page-break-after: avoid;
        }
        
        /* Show all form sections */
        div,
        section,
        .rounded-lg,
        .border-2 {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Typography scaling */
        * {
          font-size: 9px !important;
        }
        
        h1 {
          font-size: 18px !important;
        }
        
        h2 {
          font-size: 14px !important;
          margin-bottom: 4px !important;
        }
        
        h3 {
          font-size: 11px !important;
          margin-bottom: 6px !important;
        }
        
        label {
          font-size: 8px !important;
          margin-bottom: 2px !important;
          font-weight: 600 !important;
        }
        
        input, select, textarea {
          font-size: 8px !important;
          padding: 2px 4px !important;
          min-height: 20px !important;
          height: 20px !important;
          border: 1px solid #d1d5db !important;
        }
        
        textarea {
          height: 30px !important;
          resize: none !important;
        }
        
        /* Checkbox styling */
        input[type="checkbox"] {
          width: 10px !important;
          height: 10px !important;
          min-height: 10px !important;
        }
        
        /* Spacing adjustments */
        .space-y-6 > * + * {
          margin-top: 6px !important;
        }
        
        .space-y-4 > * + * {
          margin-top: 4px !important;
        }
        
        .space-y-3 > * + * {
          margin-top: 3px !important;
        }
        
        .gap-6 {
          gap: 6px !important;
        }
        
        .gap-4 {
          gap: 4px !important;
        }
        
        .gap-3 {
          gap: 3px !important;
        }
        
        /* Padding adjustments */
        .p-6 {
          padding: 8px !important;
        }
        
        .p-4 {
          padding: 6px !important;
        }
        
        .p-3 {
          padding: 4px !important;
        }
        
        /* Margin adjustments */
        .mb-6 {
          margin-bottom: 6px !important;
        }
        
        .mb-4 {
          margin-bottom: 4px !important;
        }
        
        .mb-2 {
          margin-bottom: 2px !important;
        }
        
        /* Kitchen: Force 2-column layout */
        .grid.grid-cols-1.gap-6.lg\\:grid-cols-2 {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
        }
        
        /* Prevent page breaks inside sections */
        .rounded-lg.border-2 {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Ensure colored backgrounds print */
        .bg-blue-50,
        .bg-green-50,
        .bg-purple-50,
        .bg-orange-50,
        .bg-yellow-50,
        .bg-pink-50,
        .bg-gray-50,
        .bg-gray-100,
        .bg-indigo-50 {
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }
        
        /* Bedroom: 2-column layout */
        .grid.grid-cols-1.gap-3.lg\\:grid-cols-2 {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 6px !important;
        }
        
        /* Hide walk-in banner */
        .border-2.border-blue-300 {
          display: none !important;
        }
      }
    `}</style>
  </SidebarProvider>
  );
}