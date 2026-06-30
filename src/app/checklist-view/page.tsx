"use client";
import * as React from "react";
import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Save, 
  X, 
  Trash2, 
  ArrowLeft, 
  Edit, 
  PenTool, 
  Upload,
  Package,
  Download,
  FileText,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aztec-interior.onrender.com';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Appliance {
  make: string;
  model: string;
  order_date: string;
}

interface AdditionalDoor {
  door_style: string;
  door_type: string;
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

interface AdditionalWorktop {
  worktop_material_type: string;
  worktop_material_color: string;
  worktop_code: string;
  worktop_size: string;
  worktop_features: string[];
  worktop_other_details: string;
}

interface FormData {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  room: string;
  survey_date: string;
  appointment_date: string;
  installation_date: string;
  completion_date: string;
  deposit_date: string;
  door_style: string;
  door_type: string;
  door_manufacturer: string;
  door_name: string;
  glazing_material: string;
  door_color: string;
  end_panel_color: string;
  plinth_filler_color: string;
  cabinet_color: string;
  additional_doors: AdditionalDoor[];
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
  worktop_code: string;
  additional_worktops: AdditionalWorktop[];
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
  terms_date: string;
  gas_electric_info: string;
  appliance_promotion_info: string;
  signature_date: string;
  signature_data: string;
  form_type: string;
  integ_fridge_qty: string;
  integ_fridge_make: string;
  integ_fridge_model: string;
  integ_fridge_order_date: string;
  integ_freezer_qty: string;
  integ_freezer_make: string;
  integ_freezer_model: string;
  integ_freezer_order_date: string;
  integ_fridge_freezer_make: string;
  integ_fridge_freezer_model: string;
  integ_fridge_freezer_order_date: string;
}

interface OrderItem {
  label: string;
  isSection: boolean;
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

function ChecklistViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formSubmissionId = searchParams.get("id");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("platform admin");
  const sidebarItems = getSidebarItems(userRole);
  
  const [formData, setFormData] = useState<FormData | null>(null);
  const [originalFormData, setOriginalFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [signatureMode, setSignatureMode] = useState("existing");
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderDialogSection, setOrderDialogSection] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const canEdit = () => {
    if (!user) return true; // Allow edit while loading, button will work once user loads
    const allowedRoles = ["platform admin", "salesperson"];
    return allowedRoles.includes(user.role.toLowerCase());
  };

  const canDelete = () => {
    if (!user) return false;
    const allowedRoles = ["platform admin", "salesperson"];
    return allowedRoles.includes(user.role.toLowerCase());
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const headers: HeadersInit = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const userResponse = await fetch(`${BACKEND_URL}/api/users/me`, { headers });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
          setUserRole(userData.role || "platform admin");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (!formSubmissionId) {
      setError("No form submission ID provided");
      setLoading(false);
      return;
    }

    const fetchFormData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(
          `${BACKEND_URL}/api/form/form-submissions/${formSubmissionId}`,
          { headers }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch form data");
        }

        const data = await response.json();
        let parsedFormData = typeof data.form_data === "string" 
          ? JSON.parse(data.form_data) 
          : data.form_data;

        if (typeof parsedFormData.floor_protection === 'string') {
          parsedFormData.floor_protection = [parsedFormData.floor_protection];
        } else if (!parsedFormData.floor_protection) {
          parsedFormData.floor_protection = [];
        }
        if (typeof parsedFormData.worktop_features === 'string') {
          parsedFormData.worktop_features = [parsedFormData.worktop_features];
        } else if (!parsedFormData.worktop_features) {
          parsedFormData.worktop_features = [];
        }
        if (!parsedFormData.appliances || !Array.isArray(parsedFormData.appliances)) {
          parsedFormData.appliances = [];
        }
        if (!parsedFormData.additional_doors || !Array.isArray(parsedFormData.additional_doors)) {
          parsedFormData.additional_doors = [];
        }
        if (!parsedFormData.additional_worktops || !Array.isArray(parsedFormData.additional_worktops)) {
          parsedFormData.additional_worktops = [];
        }
        if (!parsedFormData.worktop_code) parsedFormData.worktop_code = "";

        // Initialize new fields if they don't exist
        if (!parsedFormData.door_manufacturer) parsedFormData.door_manufacturer = "";
        if (!parsedFormData.door_name) parsedFormData.door_name = "";
        if (!parsedFormData.integ_fridge_freezer_make) parsedFormData.integ_fridge_freezer_make = "";
        if (!parsedFormData.integ_fridge_freezer_model) parsedFormData.integ_fridge_freezer_model = "";
        if (!parsedFormData.integ_fridge_freezer_order_date) parsedFormData.integ_fridge_freezer_order_date = "";

        setFormData(parsedFormData);
        setOriginalFormData(JSON.parse(JSON.stringify(parsedFormData)));
      } catch (err) {
        console.error("Error fetching form data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [formSubmissionId]);

  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam === "true" && !loading && formData) {
      setIsEditing(true);
    }
  }, [loading, formData]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    if (!formData) return;
    setFormData({ ...formData, [field]: value });
  };

  const handleCheckboxChange = (field: "floor_protection" | "worktop_features", value: string, checked: boolean) => {
    if (!formData) return;
    const currentValues = formData[field] || [];
    if (checked) {
      setFormData({ ...formData, [field]: [...currentValues, value] });
    } else {
      setFormData({ ...formData, [field]: currentValues.filter((v) => v !== value) });
    }
  };

  const handleApplianceChange = (index: number, field: keyof Appliance, value: string) => {
    if (!formData) return;
    const appliances = [...(formData.appliances || [])];
    while (appliances.length <= index) {
      appliances.push({ make: "", model: "", order_date: "" });
    }
    appliances[index] = { ...appliances[index], [field]: value };
    setFormData({ ...formData, appliances });
  };

  const handleAdditionalDoorChange = (index: number, field: keyof AdditionalDoor, value: string) => {
    if (!formData) return;
    const additional_doors = [...(formData.additional_doors || [])];
    if (!additional_doors[index]) {
      additional_doors[index] = { 
        door_type: "",
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
    setFormData({ ...formData, additional_doors });
  };

  const addAdditionalDoor = () => {
    if (!formData) return;
    setFormData({
      ...formData,
      additional_doors: [...(formData.additional_doors || []), { 
        door_style: "",
        door_type: "", 
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
    });
  };

  const removeAdditionalDoor = (index: number) => {
    if (!formData) return;
    setFormData({
      ...formData,
      additional_doors: (formData.additional_doors || []).filter((_, i) => i !== index),
    });
  };

  const handleAdditionalWorktopChange = (index: number, field: keyof AdditionalWorktop, value: any) => {
    if (!formData) return;
    const additional_worktops = [...(formData.additional_worktops || [])];
    if (!additional_worktops[index]) {
      additional_worktops[index] = {
        worktop_material_type: "",
        worktop_material_color: "",
        worktop_code: "",
        worktop_size: "",
        worktop_features: [],
        worktop_other_details: "",
      };
    }
    additional_worktops[index] = { ...additional_worktops[index], [field]: value };
    setFormData({ ...formData, additional_worktops });
  };

  const addAdditionalWorktop = () => {
    if (!formData) return;
    setFormData({
      ...formData,
      additional_worktops: [...(formData.additional_worktops || []), {
        worktop_material_type: "",
        worktop_material_color: "",
        worktop_code: "",
        worktop_size: "",
        worktop_features: [],
        worktop_other_details: "",
      }],
    });
  };

  const removeAdditionalWorktop = (index: number) => {
    if (!formData) return;
    setFormData({
      ...formData,
      additional_worktops: (formData.additional_worktops || []).filter((_, i) => i !== index),
    });
  };

  const handleEdit = () => {
    if (!canEdit()) {
      alert("You don't have permission to edit this checklist.");
      return;
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (originalFormData) {
      setFormData(JSON.parse(JSON.stringify(originalFormData)));
    }
    setIsEditing(false);
    setSignatureMode("existing");
  };

  const handleSave = async () => {
    if (!formData || !canEdit() || isSaving) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKEND_URL}/api/form/form-submissions/${formSubmissionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ formData: formData }),
        }
      );

      if (response.ok) {
        alert("Checklist updated successfully!");
        setOriginalFormData(JSON.parse(JSON.stringify(formData)));
        setIsEditing(false);
        setSignatureMode("existing");
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to update checklist: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error updating checklist:", error);
      alert("Network error: Could not update checklist");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkWorktopNA = () => {
    if (!formData) return;
    setFormData({
      ...formData,
      worktop_material_type: '',
      worktop_material_color: 'N/A',
      worktop_code: 'N/A',
      worktop_size: 'N/A',
      worktop_features: [],
      worktop_other_details: 'N/A',
    });
  };

  const handleDelete = () => {
    if (!canDelete()) {
      alert("You don't have permission to delete this checklist.");
      return;
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!canDelete() || isDeleting) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKEND_URL}/api/form/form-submissions/${formSubmissionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        alert("Checklist deleted successfully!");
        window.close();
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to delete checklist: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error deleting checklist:", error);
      alert("Network error: Could not delete checklist");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleGenerateQuote = async () => {
    if (!formSubmissionId || !formData) return;
    
    // Intelligently detect form type from the data
    const detectFormType = (): string => {
      if (formData.form_type) {
        return formData.form_type.toLowerCase().includes("kitchen") ? "kitchen" : "bedroom";
      }
      
      // Fallback: detect from fields present
      const hasKitchenFields = !!(
        formData.worktop_material_type || 
        formData.appliances?.length || 
        formData.sink_details ||
        formData.integ_fridge_make
      );
      
      const hasBedroomFields = !!(
        formData.bedside_cabinets_type ||
        formData.mirror_type ||
        formData.dresser_desk ||
        formData.soffit_lights_type
      );
      
      if (hasKitchenFields && !hasBedroomFields) return "kitchen";
      if (hasBedroomFields && !hasKitchenFields) return "bedroom";
      
      // Default to bedroom if unclear
      return "bedroom";
    };
    
    const detectedType = detectFormType();
    
    const confirmGenerate = window.confirm(
      `Generate a quotation from this ${detectedType} checklist?\n\n` +
      `This will automatically extract all materials and create a draft quote.\n\n` +
      `Customer: ${formData.customer_name || 'N/A'}`
    );
    
    if (!confirmGenerate) return;

    try {
      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenantId") || "7";
      
      const response = await fetch(
        `${BACKEND_URL}/quotations/generate-from-checklist/${formSubmissionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-Tenant-ID": tenantId,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      alert(
        `✅ Quote generated successfully!\n\n` +
        `Reference: ${data.reference_number}\n` +
        `Items extracted: ${data.items_count}\n` +
        `Auto-priced: ${data.matched_items}\n` +
        `Manual pricing needed: ${data.manual_items}\n` +
        `Total: £${data.total.toFixed(2)}\n` +
        `Type: ${data.checklist_type}`
      );
      
      // ✅ NEW: Pass door_type and room_type to the quote editor
      const doorType = data.door_type || formData.door_type || 'Basic Slab';
      const roomType = data.room_type || (detectedType === 'kitchen' ? 'Kitchen' : 'Bedroom');
      
      // Open quote editor in new tab with door type and room type
      window.open(
        `/dashboard/quotes/${data.quotation_id}/edit?source=checklist&doorType=${encodeURIComponent(doorType)}&roomType=${encodeURIComponent(roomType)}`,
        '_blank'
      );
    } catch (error) {
      console.error("Error generating quote:", error);
      alert(`Failed to generate quote: ${error instanceof Error ? error.message : "Network error"}`);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isEditing) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLastPoint({ x, y });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !isEditing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    if (lastPoint) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    setLastPoint({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
    if (canvasRef.current && formData) {
      const signatureData = canvasRef.current.toDataURL();
      setFormData({ ...formData, signature_data: signatureData });
    }
  };

  const isNAVal = (v: any) =>
    !v || ['n/a', 'na', '0', '', '[]'].includes(String(v).trim().toLowerCase());

  const safeVal = (v: any): string => isNAVal(v) ? '' : String(v).trim();

  function blankOrderItem(label: string): OrderItem {
    return {
      label, isSection: false, included: true,
      style: '', type: '', colour: '', size: '', code: '', material: '', features: '',
      supplier: '', quantity: '1', estimated_cost: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery: '', notes: '',
    };
  }

  function serialiseOrderItem(item: OrderItem): string {
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

  const extractGroupedItemsFromSection = (sectionTitle: string): OrderItem[] => {
    if (!formData) return [];
    const items: OrderItem[] = [];

    switch (sectionTitle) {
      case "Material Specifications": {
        const hasDoor = !isNAVal(formData.door_style) || !isNAVal(formData.door_color) || !isNAVal(formData.door_type);
        if (hasDoor) {
          const d = blankOrderItem('Door');
          d.style    = safeVal(formData.door_style);
          d.type     = safeVal(formData.door_type);
          d.colour   = safeVal(formData.door_color);
          d.code     = [safeVal(formData.door_manufacturer), safeVal(formData.door_name)].filter(Boolean).join(' – ');
          d.material = safeVal(formData.glazing_material);
          items.push(d);
        }
        (formData.additional_doors || []).forEach((door, i) => {
          if (isNAVal(door.door_style) && isNAVal(door.door_color)) return;
          const d = blankOrderItem(`Door (Additional ${i + 1})`);
          d.style    = safeVal(door.door_style);
          d.type     = safeVal(door.door_type);
          d.colour   = safeVal(door.door_color);
          d.code     = [safeVal(door.door_manufacturer), safeVal(door.door_name)].filter(Boolean).join(' – ');
          d.quantity = safeVal(door.quantity) || '1';
          items.push(d);
        });
        if (!isNAVal(formData.end_panel_color)) {
          const p = blankOrderItem('End Panel'); p.colour = safeVal(formData.end_panel_color); items.push(p);
        }
        if (!isNAVal(formData.plinth_filler_color)) {
          const p = blankOrderItem('Plinth / Filler'); p.colour = safeVal(formData.plinth_filler_color); items.push(p);
        }
        if (!isNAVal(formData.cabinet_color)) {
          const c = blankOrderItem('Cabinet'); c.colour = safeVal(formData.cabinet_color); items.push(c);
        }
        break;
      }
      case "Hardware Specifications": {
        if (!isNAVal(formData.handles_code) || !isNAVal(formData.handles_quantity)) {
          const h = blankOrderItem('Handles');
          h.code     = safeVal(formData.handles_code);
          h.size     = safeVal(formData.handles_size);
          h.quantity = safeVal(formData.handles_quantity) || '1';
          items.push(h);
        }
        ((formData as any).additional_handles || []).forEach((h: any, i: number) => {
          if (isNAVal(h.handles_code)) return;
          const item = blankOrderItem(`Handles (Additional ${i + 1})`);
          item.code     = safeVal(h.handles_code);
          item.size     = safeVal(h.handles_size);
          item.quantity = safeVal(h.handles_quantity) || '1';
          items.push(item);
        });
        if (!isNAVal(formData.accessories)) {
          const a = blankOrderItem('Accessories'); a.features = safeVal(formData.accessories); items.push(a);
        }
        if (!isNAVal(formData.lighting_spec)) {
          const l = blankOrderItem('Lighting'); l.type = safeVal(formData.lighting_spec);
          const uwParts = [safeVal(formData.under_wall_unit_lights_color), safeVal(formData.under_wall_unit_lights_profile)].filter(Boolean);
          if (uwParts.length) l.colour = `Under wall: ${uwParts.join(' / ')}`;
          if (!isNAVal(formData.under_worktop_lights_color)) {
            l.colour += (l.colour ? '; ' : '') + `Under worktop: ${formData.under_worktop_lights_color}`;
          }
          items.push(l);
        }
        break;
      }
      case "Worktop Specifications": {
        if (!isNAVal(formData.worktop_material_type) || !isNAVal(formData.worktop_code) || !isNAVal(formData.worktop_material_color)) {
          const w = blankOrderItem('Worktop');
          w.material = safeVal(formData.worktop_material_type);
          w.colour   = safeVal(formData.worktop_material_color);
          w.code     = safeVal(formData.worktop_code);
          w.size     = safeVal(formData.worktop_size);
          w.features = (formData.worktop_features || []).filter((f: string) => !isNAVal(f)).join(', ');
          if (!isNAVal(formData.worktop_other_details)) w.notes = safeVal(formData.worktop_other_details);
          items.push(w);
        }
        (formData.additional_worktops || []).forEach((wt, i) => {
          if (isNAVal(wt.worktop_code) && isNAVal(wt.worktop_material_color)) return;
          const w = blankOrderItem(`Worktop (Additional ${i + 1})`);
          w.material = safeVal(wt.worktop_material_type);
          w.colour   = safeVal(wt.worktop_material_color);
          w.code     = safeVal(wt.worktop_code);
          w.size     = safeVal(wt.worktop_size);
          w.features = (wt.worktop_features || []).filter((f: string) => !isNAVal(f)).join(', ');
          items.push(w);
        });
        break;
      }
      case "Appliances": {
        const appLabels = ['Oven', 'Microwave', 'Washing Machine', 'Dryer', 'Hob', 'Extractor', 'INTG Dishwasher'];
        (formData.appliances || []).forEach((a, i) => {
          if (isNAVal(a.make) && isNAVal(a.model)) return;
          const item = blankOrderItem(appLabels[i] || `Appliance ${i + 1}`);
          item.style = safeVal(a.make);
          item.code  = safeVal(a.model);
          items.push(item);
        });
        if (!isNAVal(formData.integ_fridge_make)) {
          const f = blankOrderItem('INTG Fridge / Freezer');
          f.style = safeVal(formData.integ_fridge_make); f.code = safeVal(formData.integ_fridge_model);
          f.quantity = safeVal(formData.integ_fridge_qty) || '1'; items.push(f);
        }
        if (!isNAVal(formData.integ_freezer_make)) {
          const f = blankOrderItem('INTG Freezer');
          f.style = safeVal(formData.integ_freezer_make); f.code = safeVal(formData.integ_freezer_model);
          f.quantity = safeVal(formData.integ_freezer_qty) || '1'; items.push(f);
        }
        if (!isNAVal(formData.sink_details)) {
          const s = blankOrderItem('Sink'); s.type = safeVal(formData.sink_details); s.code = safeVal(formData.sink_model); items.push(s);
        }
        if (!isNAVal(formData.tap_details)) {
          const t = blankOrderItem('Tap'); t.type = safeVal(formData.tap_details); t.code = safeVal(formData.tap_model); items.push(t);
        }
        break;
      }
      case "Bedroom Furniture": {
        if (!isNAVal(formData.bedside_cabinets_type)) {
          const b = blankOrderItem('Bedside Cabinets');
          b.type = safeVal(formData.bedside_cabinets_type); b.quantity = safeVal(formData.bedside_cabinets_qty) || '1'; items.push(b);
        }
        if (formData.dresser_desk === 'yes' && !isNAVal(formData.dresser_desk_details)) {
          const d = blankOrderItem('Dresser / Desk'); d.type = safeVal(formData.dresser_desk_details); items.push(d);
        }
        if (formData.internal_mirror === 'yes' && !isNAVal(formData.internal_mirror_details)) {
          const m = blankOrderItem('Internal Mirror'); m.type = safeVal(formData.internal_mirror_details); items.push(m);
        }
        if (!isNAVal(formData.mirror_type)) {
          const m = blankOrderItem('Mirror'); m.type = safeVal(formData.mirror_type); m.quantity = safeVal(formData.mirror_qty) || '1'; items.push(m);
        }
        break;
      }
      case "Lighting": {
        if (!isNAVal(formData.soffit_lights_type)) {
          const l = blankOrderItem('Soffit Lights');
          l.type = safeVal(formData.soffit_lights_type); l.colour = safeVal(formData.soffit_lights_color); items.push(l);
        }
        if (!isNAVal(formData.gable_lights_type)) {
          const l = blankOrderItem('Gable Lights');
          l.type = safeVal(formData.gable_lights_type);
          l.colour = [safeVal(formData.gable_lights_main_color), safeVal(formData.gable_lights_profile_color)].filter(Boolean).join(' / ');
          items.push(l);
        }
        break;
      }
      case "Accessories": {
        if (!isNAVal(formData.other_accessories)) {
          const a = blankOrderItem('Accessories'); a.features = safeVal(formData.other_accessories); items.push(a);
        }
        const fp = (formData.floor_protection || []).filter((f: string) => !isNAVal(f) && f !== 'No Floor Protection Required');
        if (fp.length) {
          const f = blankOrderItem('Floor Protection'); f.features = fp.join(', '); items.push(f);
        }
        break;
      }
    }
    return items;
  };

  const handleOpenOrderDialog = (sectionTitle: string) => {
    setOrderDialogSection(sectionTitle);
    setOrderItems(extractGroupedItemsFromSection(sectionTitle));
    setShowOrderDialog(true);
  };

  const handleSubmitOrder = async () => {
    const included = orderItems.filter(i => i.included && !i.isSection);
    if (included.length === 0 || !formData) { alert('No materials selected'); return; }

    setIsSubmittingOrder(true);
    let ok = 0, fail = 0;
    try {
      const token = localStorage.getItem('token');
      for (const item of included) {
        const payload = {
          client_id: formData.customer_id,
          material_description: serialiseOrderItem(item),
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
      setShowOrderDialog(false);
      setOrderItems([]);
    } catch { alert('Failed to create orders. Please try again.'); }
    finally { setIsSubmittingOrder(false); }
  };

  const handlePrintPDF = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKEND_URL}/api/form/form-submissions/${formSubmissionId}/pdf`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const clearSignature = () => {
    if (!canvasRef.current || !formData) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setFormData({ ...formData, signature_data: "" });
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && formData) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, signature_data: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading checklist...</p>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">{error || "Form data not found"}</p>
      </div>
    );
  }

  const formType = (formData.form_type || "").toLowerCase().includes("kitchen") ? "kitchen" : "bedroom";
  const showOrderDate = formData.appliances_customer_owned === "no";
  const standardApplianceGridTemplate = showOrderDate ? "grid-cols-[1fr_1fr_1fr]" : "grid-cols-[1fr_1fr]";
  const integUnitGridTemplate = showOrderDate ? "grid-cols-[1fr_1fr_1fr]" : "grid-cols-[1fr_1fr]";
  const standardAppliances = ["Oven", "Microwave", "Washing Machine", "Dryer", "HOB", "Extractor", "INTG Dishwasher"];

  const OrderButton = ({ sectionTitle, onClick }: { sectionTitle: string; onClick: () => void }) => {
  if (!canEdit() || isEditing) return null;
  
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      className="flex items-center gap-1 text-xs print:hidden"
    >
      <Package className="h-3 w-3" />
      Order
    </Button>
  );
};

  return (
    <SidebarProvider>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Checklist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this checklist? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center space-x-2 px-4 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-900 text-white">
              <span className="text-sm font-bold">AI</span>
            </div>
            <span className="text-lg font-semibold">Atelier Luxe Interiors</span>
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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.close()}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Installation Checklist {isEditing ? "- Editing" : ""}
                </h1>
                <p className="text-sm text-gray-600">
                  {isEditing ? "Make changes to the checklist" : "View and manage checklist"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Print/Save PDF Button - Always visible */}
              <Button
                onClick={handlePrintPDF}
                variant="outline"
                className="flex items-center space-x-2 print:hidden"
              >
                <Download className="h-4 w-4" />
                <span>Print / Save as PDF</span>
              </Button>

              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                  </Button>
                </>
              ) : (
                <>
                  {/* Generate Quote Button - ALWAYS SHOW when not editing */}
                  <Button
                    onClick={handleGenerateQuote}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Generate Quote</span>
                  </Button>
                  
                  {canEdit() && (
                    <Button
                      onClick={handleEdit}
                      className="flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Button>
                  )}
                  {user && canDelete() && (
                    <Button
                      onClick={handleDelete}
                      variant="destructive"
                      className="flex items-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="rounded-lg border bg-white p-8 shadow-sm">
            <h2 className="mb-2 text-center text-xl font-semibold print:hidden">
              {formType === "kitchen" ? "Kitchen Installation Checklist" : "Bedroom Installation Checklist"}
            </h2>
            <p className="mb-6 text-center text-sm text-gray-600 print:hidden">
              {isEditing ? "Editing Mode - Make your changes below" : "View Mode - Click Edit to make changes"}
            </p>

            {/* Customer Information - Blue Section */}
            <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-6 print:mb-2 print:p-3">
              <h3 className="mb-4 text-xl font-bold text-blue-900 print:mb-2">Customer Information</h3>
              <div className={`grid grid-cols-1 gap-4 ${formType === "bedroom" ? "md:grid-cols-4" : "md:grid-cols-3"} print:gap-2`}>
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
                      <h3 className="text-xl font-bold text-orange-900">3. Worktop Specifications</h3>
                      <div className="flex items-center gap-2">
                        {isEditing && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleMarkWorktopNA}
                            className="flex items-center gap-1 text-xs border-gray-400 text-gray-700 hover:bg-gray-100 print:hidden"
                          >
                            <X className="h-3 w-3" /> Mark All N/A
                          </Button>
                        )}
                        <OrderButton
                          sectionTitle="Worktop Specifications"
                          onClick={() => handleOpenOrderDialog("Worktop Specifications")}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* Dynamic Grid based on door style - NOW 3 COLUMNS */}
                      <div className="grid gap-4 grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Door Style</label>
                          <Input
                            placeholder="Enter door style"
                            className="w-full bg-white"
                            value={formData.door_style}
                            onChange={(e) => handleInputChange("door_style", e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Door Type</label>
                          {isEditing ? (
                            <select
                              className="w-full rounded-md border border-gray-300 bg-white p-2"
                              value={formData.door_type || ""}
                              onChange={(e) => handleInputChange("door_type", e.target.value)}
                            >
                              <option value="">Select door type</option>
                              <option value="Slab">Slab</option>
                              <option value="Lacquered Slab">Lacquered Slab</option>
                              <option value="Vinyl">Vinyl doors</option>
                              <option value="Black Glass">Black Glass</option>
                              <option value="Timber">Timber</option>
                            </select>

                          ) : (
                            <Input value={formData.door_type || ""} readOnly className="bg-white" />
                          )}
                        </div>
                        
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Door Color</label>
                          <Input 
                            value={formData.door_color || ""} 
                            onChange={(e) => handleInputChange("door_color", e.target.value)}
                            readOnly={!isEditing} 
                            className="bg-white" 
                          />
                        </div>

                        {/* Conditional: Door Manufacturer and Door Name - if Vinyl */}
                        {formData.door_style === "vinyl" && (
                          <>
                            <div>
                              <label className="mb-1 block text-sm font-bold text-gray-700">Door Manufacturer</label>
                              {isEditing ? (
                                <select
                                  className="w-full rounded-md border border-gray-300 bg-white p-2"
                                  value={formData.door_manufacturer || ""}
                                  onChange={(e) => handleInputChange("door_manufacturer", e.target.value)}
                                >
                                  <option value="">Select manufacturer</option>
                                  <option value="Integral">Integral</option>
                                  <option value="Trade mouldings">Trade mouldings</option>
                                  <option value="Hpp">Hpp</option>
                                  <option value="Uform">Uform</option>
                                  <option value="Other">Other</option>
                                </select>
                              ) : (
                                <Input value={formData.door_manufacturer || ""} readOnly className="bg-white" />
                              )}
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-bold text-gray-700">Door Name</label>
                              <Input 
                                value={formData.door_name || ""} 
                                onChange={(e) => handleInputChange("door_name", e.target.value)}
                                readOnly={!isEditing} 
                                className="bg-white" 
                              />
                            </div>
                          </>
                        )}

                        {/* Conditional: Glazing Material - if Glazed */}
                        {formData.door_style === "glazed" && (
                          <div className="col-span-3">
                            <label className="mb-1 block text-sm font-bold text-gray-700">Glazing Material</label>
                            {isEditing ? (
                              <select
                                className="w-full rounded-md border border-gray-300 bg-white p-2"
                                value={formData.glazing_material || ""}
                                onChange={(e) => handleInputChange("glazing_material", e.target.value)}
                              >
                                <option value="">Select material</option>
                                <option value="vinyl">Vinyl</option>
                                <option value="aluminium">Aluminium</option>
                                <option value="N/A">N/A</option>
                              </select>
                            ) : (
                              <Input value={formData.glazing_material || ""} readOnly className="bg-white" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Panel Color and Plinth/Filler Color */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Panel Color</label>
                          <Input 
                            value={formData.end_panel_color || ""} 
                            onChange={(e) => handleInputChange("end_panel_color", e.target.value)}
                            readOnly={!isEditing} 
                            className="bg-white" 
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Plinth/Filler Color</label>
                          <Input 
                            value={formData.plinth_filler_color || ""} 
                            onChange={(e) => handleInputChange("plinth_filler_color", e.target.value)}
                            readOnly={!isEditing} 
                            className="bg-white" 
                          />
                        </div>
                      </div>

                      {/* Cabinet Color */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Carcass Color</label>
                          <Input 
                            value={formData.cabinet_color || ""} 
                            onChange={(e) => handleInputChange("cabinet_color", e.target.value)}
                            readOnly={!isEditing} 
                            className="bg-white" 
                          />
                        </div>
                      </div>

                      {/* Additional Doors */}
                      <div className="border-t pt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <label className="text-sm font-bold text-gray-700">Door Details (Additional Doors)</label>
                          {isEditing && (
                            <Button type="button" size="sm" onClick={addAdditionalDoor} className="bg-green-600">
                              + Add Additional Door
                            </Button>
                          )}
                        </div>
                        {formData.additional_doors && formData.additional_doors.map((door, idx) => (
                          <div key={idx} className="mb-3 space-y-3 rounded border-2 border-green-300 bg-white p-4">
                            {/* Door Style, Type, and Color - 3 columns */}
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Door Style</label>
                                {isEditing ? (
                                  <select
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                    value={door.door_style || ""}
                                    onChange={(e) => handleAdditionalDoorChange(idx, "door_style", e.target.value)}
                                  >
                                    <option value="">Select</option>
                                    <option value="vinyl">Vinyl</option>
                                    <option value="slab">Slab</option>
                                    <option value="glazed">Glazed</option>
                                    <option value="shaker">Shaker</option>
                                    <option value="N/A">N/A</option>
                                  </select>
                                ) : (
                                  <Input value={door.door_style || ""} readOnly className="text-sm" />
                                )}
                              </div>
                              
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Door Type</label>
                                {isEditing ? (
                                  <select
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                    value={door.door_type || ""}
                                    onChange={(e) => handleAdditionalDoorChange(idx, "door_type", e.target.value)}
                                  >
                                    <option value="">Select type</option>
                                    <option value="Slab">Slab</option>
                                    <option value="Lacquered Slab">Lacquered Slab</option>
                                    <option value="Vinyl">Vinyl doors</option>
                                    <option value="Black Glass">Black Glass</option>
                                  </select>
                                ) : (
                                  <Input value={door.door_type || ""} readOnly className="text-sm" />
                                )}
                              </div>
                              
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Door Color</label>
                                <Input 
                                  value={door.door_color || ""} 
                                  onChange={(e) => handleAdditionalDoorChange(idx, "door_color", e.target.value)}
                                  readOnly={!isEditing}
                                  className="text-sm" 
                                />
                              </div>
                            </div>

                            {/* Show Door Manufacturer and Door Name if Vinyl */}
                            {door.door_style === "vinyl" && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Door Manufacturer</label>
                                  {isEditing ? (
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
                                  ) : (
                                    <Input value={door.door_manufacturer || ""} readOnly className="text-sm" />
                                  )}
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Door Name</label>
                                  <Input 
                                    value={door.door_name || ""} 
                                    onChange={(e) => handleAdditionalDoorChange(idx, "door_name", e.target.value)}
                                    readOnly={!isEditing}
                                    className="text-sm" 
                                  />
                                </div>
                              </div>
                            )}

                            {/* Show Glazing Material if Glazed */}
                            {door.door_style === "glazed" && (
                              <div className="col-span-2">
                                <label className="mb-1 block text-xs font-bold text-gray-600">Glazing Material</label>
                                {isEditing ? (
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
                                ) : (
                                  <Input value={door.glazing_material || ""} readOnly className="text-sm" />
                                )}
                              </div>
                            )}

                            {/* Panel Color and Plinth/Filler Color */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Panel Color</label>
                                <Input 
                                  value={door.panel_color || ""} 
                                  onChange={(e) => handleAdditionalDoorChange(idx, "panel_color", e.target.value)}
                                  readOnly={!isEditing}
                                  className="text-sm" 
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Plinth/Filler Color</label>
                                <Input 
                                  value={door.plinth_color || ""} 
                                  onChange={(e) => handleAdditionalDoorChange(idx, "plinth_color", e.target.value)}
                                  readOnly={!isEditing}
                                  className="text-sm" 
                                />
                              </div>
                            </div>

                            {/* Cabinet Color (full width) */}
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Carcass Color</label>
                              <Input 
                                value={door.cabinet_color || ""} 
                                onChange={(e) => handleAdditionalDoorChange(idx, "cabinet_color", e.target.value)}
                                readOnly={!isEditing}
                                className="text-sm" 
                              />
                            </div>

                            {/* Quantity and Remove Button */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Quantity</label>
                                <Input 
                                  value={door.quantity || ""} 
                                  onChange={(e) => handleAdditionalDoorChange(idx, "quantity", e.target.value)}
                                  readOnly={!isEditing}
                                  type="text"
                                  className="text-sm" 
                                />
                              </div>
                              {isEditing && (
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
                              )}
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
                      <OrderButton
                        sectionTitle="Hardware Specifications"
                        onClick={() => handleOpenOrderDialog("Hardware Specifications")}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Handle Code</label>
                          <Input 
                            value={formData.handles_code || ""} 
                            onChange={(e) => handleInputChange("handles_code", e.target.value)}
                            readOnly={!isEditing} 
                            className="bg-white" 
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Handle Quantity</label>
                          <Input 
                            value={formData.handles_quantity || ""} 
                            onChange={(e) => handleInputChange("handles_quantity", e.target.value)}
                            readOnly={!isEditing} 
                            className="bg-white" 
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Handle Size</label>
                          <Input 
                            value={formData.handles_size || ""} 
                            onChange={(e) => handleInputChange("handles_size", e.target.value)}
                            readOnly={!isEditing} 
                            className="bg-white" 
                          />
                        </div>
                      </div>

                      {/* Additional Handles */}
                      {((formData as any).additional_handles?.length > 0 || isEditing) && (
                        <div className="border-t pt-4">
                          <div className="mb-3 flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700">Additional Handles</label>
                            {isEditing && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const current = (formData as any).additional_handles || [];
                                  setFormData({ ...formData, additional_handles: [...current, { handles_code: "", handles_quantity: "", handles_size: "" }] } as any);
                                }}
                                className="bg-purple-600"
                              >
                                + Add Additional Handle
                              </Button>
                            )}
                          </div>
                          {((formData as any).additional_handles || []).map((handle: any, idx: number) => (
                            <div key={idx} className="mb-3 space-y-3 rounded border-2 border-purple-300 bg-white p-4">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Handle Code</label>
                                  <Input
                                    value={handle.handles_code || ""}
                                    onChange={(e) => {
                                      const updated = [...((formData as any).additional_handles || [])];
                                      updated[idx] = { ...updated[idx], handles_code: e.target.value };
                                      setFormData({ ...formData, additional_handles: updated } as any);
                                    }}
                                    readOnly={!isEditing}
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Handle Quantity</label>
                                  <Input
                                    value={handle.handles_quantity || ""}
                                    onChange={(e) => {
                                      const updated = [...((formData as any).additional_handles || [])];
                                      updated[idx] = { ...updated[idx], handles_quantity: e.target.value };
                                      setFormData({ ...formData, additional_handles: updated } as any);
                                    }}
                                    readOnly={!isEditing}
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Handle Size</label>
                                  <Input
                                    value={handle.handles_size || ""}
                                    onChange={(e) => {
                                      const updated = [...((formData as any).additional_handles || [])];
                                      updated[idx] = { ...updated[idx], handles_size: e.target.value };
                                      setFormData({ ...formData, additional_handles: updated } as any);
                                    }}
                                    readOnly={!isEditing}
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                              {isEditing && (
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      const updated = ((formData as any).additional_handles || []).filter((_: any, i: number) => i !== idx);
                                      setFormData({ ...formData, additional_handles: updated } as any);
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Accessories (e.g., Pullouts)</label>
                        <textarea
                          className={`h-16 w-full resize-none rounded-md border border-gray-300 bg-white p-2 text-sm ${!isEditing ? "cursor-not-allowed" : ""}`}
                          value={formData.accessories || ""}
                          onChange={(e) => handleInputChange("accessories", e.target.value)}
                          readOnly={!isEditing}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Lighting Specification</label>
                        <textarea
                          className={`h-16 w-full resize-none rounded-md border border-gray-300 bg-white p-2 text-sm ${!isEditing ? "cursor-not-allowed" : ""}`}
                          value={formData.lighting_spec || ""}
                          onChange={(e) => handleInputChange("lighting_spec", e.target.value)}
                          readOnly={!isEditing}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Under Wall Unit Lights</label>
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                              value={formData.under_wall_unit_lights_color || ""}
                              onChange={(e) => handleInputChange("under_wall_unit_lights_color", e.target.value)}
                            >
                              <option value="">Main Colour</option>
                              <option value="cool-white">Cool White</option>
                              <option value="warm-white">Warm White</option>
                              <option value="N/A">N/A</option>
                            </select>
                            <select
                              className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                              value={formData.under_wall_unit_lights_profile || ""}
                              onChange={(e) => handleInputChange("under_wall_unit_lights_profile", e.target.value)}
                            >
                              <option value="">Profile Colour</option>
                              <option value="black">Black</option>
                              <option value="white">White</option>
                              <option value="N/A">N/A</option>
                            </select>
                          </div>
                        ) : (
                          <Input value={`${formData.under_wall_unit_lights_color || ""} / ${formData.under_wall_unit_lights_profile || ""}`} readOnly className="bg-white" />
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Under Worktop Lights</label>
                        {isEditing ? (
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                            value={formData.under_worktop_lights_color || ""}
                            onChange={(e) => handleInputChange("under_worktop_lights_color", e.target.value)}
                          >
                            <option value="">Colour</option>
                            <option value="cool-white">Cool White</option>
                            <option value="warm-white">Warm White</option>
                            <option value="N/A">N/A</option>
                          </select>
                        ) : (
                          <Input value={formData.under_worktop_lights_color || ""} readOnly className="bg-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Worktop Specifications - Orange Section */}
                  <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-orange-900">3. Worktop Specifications</h3>
                      <div className="flex items-center gap-2">
                        {isEditing && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleMarkWorktopNA}
                            className="flex items-center gap-1 text-xs border-gray-400 text-gray-700 hover:bg-gray-100 print:hidden"
                          >
                            <X className="h-3 w-3" /> Mark All N/A
                          </Button>
                        )}
                        <OrderButton
                          sectionTitle="Worktop Specifications"
                          onClick={() => handleOpenOrderDialog("Worktop Specifications")}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* Material Type, Color, Code - 3 columns */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Material Type</label>
                          {isEditing ? (
                            <select
                              className="w-full rounded-md border border-gray-300 bg-white p-2"
                              value={formData.worktop_material_type || ""}
                              onChange={(e) => handleInputChange("worktop_material_type", e.target.value)}
                            >
                              <option value="">Select material type</option>
                              <option value="stone">Stone</option>
                              <option value="laminate">Laminate</option>
                            </select>
                          ) : (
                            <Input value={formData.worktop_material_type || ""} readOnly className="bg-white" />
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Material Color</label>
                          <Input
                            value={formData.worktop_material_color || ""}
                            onChange={(e) => handleInputChange("worktop_material_color", e.target.value)}
                            readOnly={!isEditing}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Code</label>
                          <Input
                            placeholder="Enter worktop code"
                            value={formData.worktop_code || ""}
                            onChange={(e) => handleInputChange("worktop_code", e.target.value)}
                            readOnly={!isEditing}
                            className="bg-white"
                          />
                        </div>
                      </div>

                      {/* Size/Thickness */}
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Size/Thickness</label>
                        {isEditing ? (
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white p-2"
                            value={formData.worktop_size || ""}
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
                        ) : (
                          <Input value={formData.worktop_size || ""} readOnly className="bg-white" />
                        )}
                      </div>

                      {/* Further Info checkboxes */}
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">Worktop Further Info</label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Upstand","Splashback","Wall Cladding","Sink Cut Out","Drainer Grooves","Hob Cut Out","Window Cill","LED Grooves"].map((item) => (
                            <label key={item} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="rounded"
                                checked={formData.worktop_features?.includes(item) || false}
                                onChange={(e) => handleCheckboxChange("worktop_features", item, e.target.checked)}
                                disabled={!isEditing}
                              />
                              <span className="text-sm">{item}</span>
                            </label>
                          ))}
                        </div>
                        <Input
                          placeholder="Other worktop details"
                          className="mt-3 w-full bg-white"
                          value={formData.worktop_other_details || ""}
                          onChange={(e) => handleInputChange("worktop_other_details", e.target.value)}
                          readOnly={!isEditing}
                        />
                      </div>

                      {/* Additional Worktops */}
                      <div className="border-t pt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <label className="text-sm font-bold text-gray-700">Additional Worktops</label>
                          {isEditing && (
                            <Button type="button" size="sm" onClick={addAdditionalWorktop} className="bg-orange-600">
                              + Add Additional Worktop
                            </Button>
                          )}
                        </div>
                        {formData.additional_worktops && formData.additional_worktops.map((worktop, idx) => (
                          <div key={idx} className="mb-3 space-y-3 rounded border-2 border-orange-300 bg-white p-4">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Material Type</label>
                                {isEditing ? (
                                  <select
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                    value={worktop.worktop_material_type || ""}
                                    onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_material_type", e.target.value)}
                                  >
                                    <option value="">Select type</option>
                                    <option value="stone">Stone</option>
                                    <option value="laminate">Laminate</option>
                                  </select>
                                ) : (
                                  <Input value={worktop.worktop_material_type || ""} readOnly className="text-sm" />
                                )}
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Material Color</label>
                                <Input
                                  className="text-sm"
                                  value={worktop.worktop_material_color || ""}
                                  onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_material_color", e.target.value)}
                                  readOnly={!isEditing}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Worktop Code</label>
                                <Input
                                  className="text-sm"
                                  value={worktop.worktop_code || ""}
                                  onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_code", e.target.value)}
                                  readOnly={!isEditing}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Size/Thickness</label>
                              {isEditing ? (
                                <select
                                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                  value={worktop.worktop_size || ""}
                                  onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_size", e.target.value)}
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
                              ) : (
                                <Input value={worktop.worktop_size || ""} readOnly className="text-sm" />
                              )}
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Further Info</label>
                              <div className="grid grid-cols-2 gap-2">
                                {["Upstand","Splashback","Wall Cladding","Sink Cut Out","Drainer Grooves","Hob Cut Out","Window Cill","LED Grooves"].map((item) => (
                                  <label key={item} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      className="rounded"
                                      checked={worktop.worktop_features?.includes(item) || false}
                                      onChange={(e) => {
                                        const current = worktop.worktop_features || [];
                                        const updated = e.target.checked ? [...current, item] : current.filter((v) => v !== item);
                                        handleAdditionalWorktopChange(idx, "worktop_features", updated);
                                      }}
                                      disabled={!isEditing}
                                    />
                                    <span className="text-xs">{item}</span>
                                  </label>
                                ))}
                              </div>
                              <Input
                                placeholder="Other worktop details"
                                className="mt-2 text-sm"
                                value={worktop.worktop_other_details || ""}
                                onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_other_details", e.target.value)}
                                readOnly={!isEditing}
                              />
                            </div>
                            {isEditing && (
                              <div className="flex justify-end">
                                <Button type="button" variant="destructive" size="sm" onClick={() => removeAdditionalWorktop(idx)}>
                                  Remove
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
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
                      <OrderButton
                        sectionTitle="Appliances"
                        onClick={() => handleOpenOrderDialog("Appliances")}
                      />
                    </div>
                    
                    {/* Appliances */}
                    <div className="mb-6">
                      <label className="mb-2 block text-sm font-bold text-gray-700">Appliances Customer Owned</label>
                      {isEditing ? (
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.appliances_customer_owned || ""}
                          onChange={(e) => handleInputChange("appliances_customer_owned", e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="N/A">N/A</option>
                        </select>
                      ) : (
                        <Input value={formData.appliances_customer_owned || ""} readOnly className="bg-white" />
                      )}
                    </div>

                    {formData.appliances_customer_owned && formData.appliances && formData.appliances.length > 0 && (
                      <div className="mb-6">
                        <label className="mb-2 block text-sm font-bold text-gray-700">
                          {formData.appliances_customer_owned === "yes"
                            ? "Customer Owned Appliances Details"
                            : "Client Supplied Appliances Details"}
                        </label>
                        <div className="space-y-3">
                          {standardAppliances.map((appliance, idx) => {
                            const appData = formData.appliances[idx] || { make: "", model: "", order_date: "" };
                            
                            // Skip if completely empty in view mode
                            if (!isEditing && !appData.make && !appData.model && !appData.order_date) return null;

                            return (
                              <div key={appliance} className="rounded border border-yellow-300 bg-white p-3">
                                <label className="mb-2 block text-sm font-bold text-gray-700">{appliance}</label>
                                <div className={`grid ${standardApplianceGridTemplate} gap-3`}>
                                  <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-600">Make</label>
                                    <Input
                                      value={appData.make || ""}
                                      onChange={(e) => handleApplianceChange(idx, "make", e.target.value)}
                                      readOnly={!isEditing}
                                      className="w-full"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-600">Model</label>
                                    <Input
                                      value={appData.model || ""}
                                      onChange={(e) => handleApplianceChange(idx, "model", e.target.value)}
                                      readOnly={!isEditing}
                                      className="w-full"
                                    />
                                  </div>
                                  {showOrderDate && (
                                    <div>
                                      <label className="mb-1 block text-xs font-bold text-gray-600">Order Date</label>
                                      <input
                                        type="date"
                                        className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "cursor-not-allowed" : ""}`}
                                        value={appData.order_date || ""}
                                        onChange={(e) => handleApplianceChange(idx, "order_date", e.target.value)}
                                        readOnly={!isEditing}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Integrated Units */}
                          <div className="space-y-3 border-t border-yellow-300 pt-3">

                            {/* INTG Fridge */}
                            <div className="rounded border border-yellow-300 bg-white p-3">
                              <label className="mb-2 block text-sm font-bold text-gray-700">INTG Fridge</label>
                              <div className={`grid ${integUnitGridTemplate} gap-3`}>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Make</label>
                                  <Input
                                    placeholder="Make"
                                    className="w-full"
                                    value={formData.integ_fridge_make}
                                    onChange={(e) => handleInputChange("integ_fridge_make", e.target.value)}
                                    readOnly={!isEditing}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Model</label>
                                  <Input
                                    placeholder="Model"
                                    className="w-full"
                                    value={formData.integ_fridge_model}
                                    onChange={(e) => handleInputChange("integ_fridge_model", e.target.value)}
                                    readOnly={!isEditing}
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

                            {/* INTG Freezer */}
                            <div className="rounded border border-yellow-300 bg-white p-3">
                              <label className="mb-2 block text-sm font-bold text-gray-700">INTG Freezer</label>
                              <div className={`grid ${integUnitGridTemplate} gap-3`}>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Make</label>
                                  <Input
                                    placeholder="Make"
                                    className="w-full"
                                    value={formData.integ_freezer_make}
                                    onChange={(e) => handleInputChange("integ_freezer_make", e.target.value)}
                                    readOnly={!isEditing}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Model</label>
                                  <Input
                                    placeholder="Model"
                                    className="w-full"
                                    value={formData.integ_freezer_model}
                                    onChange={(e) => handleInputChange("integ_freezer_model", e.target.value)}
                                    readOnly={!isEditing}
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

                            {/* INTG Fridge/Freezer - existing block unchanged */}
                            <div className="rounded border border-yellow-300 bg-white p-3">
                              <label className="mb-2 block text-sm font-bold text-gray-700">INTG Fridge/Freezer</label>
                              <div className={`grid ${integUnitGridTemplate} gap-3`}>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Make</label>
                                  <Input
                                    placeholder="Make"
                                    className="w-full"
                                    value={formData.integ_fridge_freezer_make}
                                    onChange={(e) => handleInputChange("integ_fridge_freezer_make", e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Model</label>
                                  <Input
                                    placeholder="Model"
                                    className="w-full"
                                    value={formData.integ_fridge_freezer_model}
                                    onChange={(e) => handleInputChange("integ_fridge_freezer_model", e.target.value)}
                                  />
                                </div>
                                {showOrderDate && (
                                  <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-600">Order Date</label>
                                    <input
                                      type="date"
                                      className="w-full rounded-md border border-gray-300 p-2"
                                      value={formData.integ_fridge_freezer_order_date}
                                      onChange={(e) => handleInputChange("integ_fridge_freezer_order_date", e.target.value)}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                          
                          {(isEditing || formData.other_appliances) && (
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Other / Misc Appliances</label>
                              <Input
                                placeholder="Enter any additional appliances"
                                value={formData.other_appliances || ""}
                                onChange={(e) => handleInputChange("other_appliances", e.target.value)}
                                readOnly={!isEditing}
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sink & Tap */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-700">Sink & Tap Customer Owned</label>
                      {isEditing ? (
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.sink_tap_customer_owned || ""}
                          onChange={(e) => handleInputChange("sink_tap_customer_owned", e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="N/A">N/A</option>
                        </select>
                      ) : (
                        <Input value={formData.sink_tap_customer_owned || ""} readOnly className="bg-white" />
                      )}
                    </div>

                    {formData.sink_tap_customer_owned && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Sink Details</label>
                          <Input 
                            placeholder="Sink details (e.g., Make/Size)"
                            className="mb-2 w-full bg-white"
                            value={formData.sink_details || ""}
                            onChange={(e) => handleInputChange("sink_details", e.target.value)}
                            readOnly={!isEditing}
                          />
                          <Input 
                            placeholder="Sink model code"
                            className="w-full bg-white"
                            value={formData.sink_model || ""}
                            onChange={(e) => handleInputChange("sink_model", e.target.value)}
                            readOnly={!isEditing}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Tap Details</label>
                          <Input 
                            placeholder="Tap details (e.g., Make)"
                            className="mb-2 w-full bg-white"
                            value={formData.tap_details || ""}
                            onChange={(e) => handleInputChange("tap_details", e.target.value)}
                            readOnly={!isEditing}
                          />
                          <Input 
                            placeholder="Tap model code"
                            className="w-full bg-white"
                            value={formData.tap_model || ""}
                            onChange={(e) => handleInputChange("tap_model", e.target.value)}
                            readOnly={!isEditing}
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
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                  {/* 1. Material Specifications - Green Section */}
                  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-green-900">1. Material Specifications</h3>
                      <OrderButton
                        sectionTitle="Material Specifications"
                        onClick={() => handleOpenOrderDialog("Material Specifications")}
                      />
                    </div>
                    <div className="space-y-4">
                      {/* Door Style and Door Color */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Door Style</label>
                          <Input
                            placeholder="Enter door style"
                            className="w-full bg-white"
                            value={formData.door_style || ""}
                            onChange={(e) => handleInputChange("door_style", e.target.value)}
                            readOnly={!isEditing}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Door Color</label>
                          <Input
                            value={formData.door_color || ""}
                            onChange={(e) => handleInputChange("door_color", e.target.value)}
                            readOnly={!isEditing}
                            className="bg-white"
                          />
                        </div>
                      </div>

                      {/* Door Type */}
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Door Type</label>
                        {isEditing ? (
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white p-2"
                            value={formData.door_type || ""}
                            onChange={(e) => handleInputChange("door_type", e.target.value)}
                          >
                            <option value="">Select door type</option>
                            <option value="Slab">Slab</option>
                            <option value="Lacquered Slab">Lacquered Slab</option>
                            <option value="Vinyl">Vinyl doors</option>
                            <option value="Black Glass">Black Glass</option>
                          </select>
                        ) : (
                          <Input value={formData.door_type || ""} readOnly className="bg-white" />
                        )}
                      </div>

                      {/* Vinyl-specific fields */}
                      {formData.door_style?.toLowerCase().includes("vinyl") && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-1 block text-sm font-bold text-gray-700">Door Manufacturer</label>
                            {isEditing ? (
                              <select
                                className="w-full rounded-md border border-gray-300 bg-white p-2"
                                value={formData.door_manufacturer || ""}
                                onChange={(e) => handleInputChange("door_manufacturer", e.target.value)}
                              >
                                <option value="">Select manufacturer</option>
                                <option value="Integral">Integral</option>
                                <option value="Trade mouldings">Trade mouldings</option>
                                <option value="Hpp">Hpp</option>
                                <option value="Uform">Uform</option>
                                <option value="Other">Other</option>
                              </select>
                            ) : (
                              <Input value={formData.door_manufacturer || ""} readOnly className="bg-white" />
                            )}
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-bold text-gray-700">Door Name</label>
                            <Input
                              value={formData.door_name || ""}
                              onChange={(e) => handleInputChange("door_name", e.target.value)}
                              readOnly={!isEditing}
                              className="bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Panel Color and Plinth/Filler Color */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Panel Color</label>
                          <Input
                            value={formData.end_panel_color || ""}
                            onChange={(e) => handleInputChange("end_panel_color", e.target.value)}
                            readOnly={!isEditing}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Plinth/Filler Color</label>
                          <Input
                            value={formData.plinth_filler_color || ""}
                            onChange={(e) => handleInputChange("plinth_filler_color", e.target.value)}
                            readOnly={!isEditing}
                            className="bg-white"
                          />
                        </div>
                      </div>

                      {/* Cabinet Color */}
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Carcass Color</label>
                        <Input
                          value={formData.cabinet_color || ""}
                          onChange={(e) => handleInputChange("cabinet_color", e.target.value)}
                          readOnly={!isEditing}
                          className="bg-white"
                        />
                      </div>

                      {/* Additional Doors */}
                      <div className="border-t pt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <label className="text-sm font-bold text-gray-700">Door Details (Additional Doors)</label>
                          {isEditing && (
                            <Button type="button" size="sm" onClick={addAdditionalDoor} className="bg-green-600">
                              + Add Additional Door
                            </Button>
                          )}
                        </div>
                        {formData.additional_doors && formData.additional_doors.map((door, idx) => (
                          <div key={idx} className="mb-3 space-y-3 rounded border-2 border-green-300 bg-white p-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Door Style</label>
                                <Input
                                  value={door.door_style || ""}
                                  onChange={(e) => handleAdditionalDoorChange(idx, "door_style", e.target.value)}
                                  readOnly={!isEditing}
                                  className="text-sm"
                                  placeholder="Enter door style"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Door Color</label>
                                <Input
                                  value={door.door_color || ""}
                                  onChange={(e) => handleAdditionalDoorChange(idx, "door_color", e.target.value)}
                                  readOnly={!isEditing}
                                  className="text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Door Type</label>
                              {isEditing ? (
                                <select
                                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                  value={door.door_type || ""}
                                  onChange={(e) => handleAdditionalDoorChange(idx, "door_type", e.target.value)}
                                >
                                  <option value="">Select type</option>
                                  <option value="Slab">Slab</option>
                                  <option value="Lacquered Slab">Lacquered Slab</option>
                                  <option value="Vinyl">Vinyl doors</option>
                                  <option value="Black Glass">Black Glass</option>
                                </select>
                              ) : (
                                <Input value={door.door_type || ""} readOnly className="text-sm" />
                              )}
                            </div>

                            {door.door_style?.toLowerCase().includes("vinyl") && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Door Manufacturer</label>
                                  {isEditing ? (
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
                                  ) : (
                                    <Input value={door.door_manufacturer || ""} readOnly className="text-sm" />
                                  )}
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Door Name</label>
                                  <Input
                                    value={door.door_name || ""}
                                    onChange={(e) => handleAdditionalDoorChange(idx, "door_name", e.target.value)}
                                    readOnly={!isEditing}
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Panel Color</label>
                                <Input
                                  value={door.panel_color || ""}
                                  onChange={(e) => handleAdditionalDoorChange(idx, "panel_color", e.target.value)}
                                  readOnly={!isEditing}
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Plinth/Filler Color</label>
                                <Input
                                  value={door.plinth_color || ""}
                                  onChange={(e) => handleAdditionalDoorChange(idx, "plinth_color", e.target.value)}
                                  readOnly={!isEditing}
                                  className="text-sm"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Carcass Color</label>
                                <Input
                                  value={door.cabinet_color || ""}
                                  onChange={(e) => handleAdditionalDoorChange(idx, "cabinet_color", e.target.value)}
                                  readOnly={!isEditing}
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Worktop Color</label>
                                <Input
                                  value={door.worktop_color || ""}
                                  onChange={(e) => handleAdditionalDoorChange(idx, "worktop_color", e.target.value)}
                                  readOnly={!isEditing}
                                  className="text-sm"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Quantity</label>
                                <Input
                                  value={door.quantity || ""}
                                  onChange={(e) => handleAdditionalDoorChange(idx, "quantity", e.target.value)}
                                  readOnly={!isEditing}
                                  type="text"
                                  className="text-sm"
                                />
                              </div>
                              {isEditing && (
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
                              )}
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
                      <OrderButton
                        sectionTitle="Hardware Specifications"
                        onClick={() => handleOpenOrderDialog("Hardware Specifications")}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Handle Code</label>
                          <Input
                            value={formData.handles_code || ""}
                            onChange={(e) => handleInputChange("handles_code", e.target.value)}
                            readOnly={!isEditing}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Handle Quantity</label>
                          <Input
                            value={formData.handles_quantity || ""}
                            onChange={(e) => handleInputChange("handles_quantity", e.target.value)}
                            readOnly={!isEditing}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Handle Size</label>
                          <Input
                            value={formData.handles_size || ""}
                            onChange={(e) => handleInputChange("handles_size", e.target.value)}
                            readOnly={!isEditing}
                            className="bg-white"
                          />
                        </div>
                      </div>

                      {/* Additional Handles */}
                      {((formData as any).additional_handles?.length > 0 || isEditing) && (
                        <div className="border-t pt-4">
                          <div className="mb-3 flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700">Additional Handles</label>
                            {isEditing && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const current = (formData as any).additional_handles || [];
                                  setFormData({ ...formData, additional_handles: [...current, { handles_code: "", handles_quantity: "", handles_size: "" }] } as any);
                                }}
                                className="bg-purple-600"
                              >
                                + Add Additional Handle
                              </Button>
                            )}
                          </div>
                          {((formData as any).additional_handles || []).map((handle: any, idx: number) => (
                            <div key={idx} className="mb-3 space-y-3 rounded border-2 border-purple-300 bg-white p-4">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Handle Code</label>
                                  <Input
                                    value={handle.handles_code || ""}
                                    onChange={(e) => {
                                      const updated = [...((formData as any).additional_handles || [])];
                                      updated[idx] = { ...updated[idx], handles_code: e.target.value };
                                      setFormData({ ...formData, additional_handles: updated } as any);
                                    }}
                                    readOnly={!isEditing}
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Handle Quantity</label>
                                  <Input
                                    value={handle.handles_quantity || ""}
                                    onChange={(e) => {
                                      const updated = [...((formData as any).additional_handles || [])];
                                      updated[idx] = { ...updated[idx], handles_quantity: e.target.value };
                                      setFormData({ ...formData, additional_handles: updated } as any);
                                    }}
                                    readOnly={!isEditing}
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-gray-600">Handle Size</label>
                                  <Input
                                    value={handle.handles_size || ""}
                                    onChange={(e) => {
                                      const updated = [...((formData as any).additional_handles || [])];
                                      updated[idx] = { ...updated[idx], handles_size: e.target.value };
                                      setFormData({ ...formData, additional_handles: updated } as any);
                                    }}
                                    readOnly={!isEditing}
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                              {isEditing && (
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      const updated = ((formData as any).additional_handles || []).filter((_: any, i: number) => i !== idx);
                                      setFormData({ ...formData, additional_handles: updated } as any);
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Worktop Specifications - Orange Section */}
                  <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-orange-900">3. Worktop Specifications</h3>
                      <div className="flex items-center gap-2">
                        {isEditing && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleMarkWorktopNA}
                            className="flex items-center gap-1 text-xs border-gray-400 text-gray-700 hover:bg-gray-100 print:hidden"
                          >
                            <X className="h-3 w-3" /> Mark All N/A
                          </Button>
                        )}
                        <OrderButton
                          sectionTitle="Worktop Specifications"
                          onClick={() => handleOpenOrderDialog("Worktop Specifications")}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* Material Type, Color, Code - 3 columns */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Material Type</label>
                          {isEditing ? (
                            <select
                              className="w-full rounded-md border border-gray-300 bg-white p-2"
                              value={formData.worktop_material_type || ""}
                              onChange={(e) => handleInputChange("worktop_material_type", e.target.value)}
                            >
                              <option value="">Select material type</option>
                              <option value="stone">Stone</option>
                              <option value="laminate">Laminate</option>
                            </select>
                          ) : (
                            <Input value={formData.worktop_material_type || ""} readOnly className="bg-white" />
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Material Color</label>
                          <Input
                            value={formData.worktop_material_color || ""}
                            onChange={(e) => handleInputChange("worktop_material_color", e.target.value)}
                            readOnly={!isEditing}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Code</label>
                          <Input
                            value={formData.worktop_code || ""}
                            onChange={(e) => handleInputChange("worktop_code", e.target.value)}
                            readOnly={!isEditing}
                            className="bg-white"
                          />
                        </div>
                      </div>

                      {/* Size/Thickness */}
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Size/Thickness</label>
                        {isEditing ? (
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white p-2"
                            value={formData.worktop_size || ""}
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
                        ) : (
                          <Input value={formData.worktop_size || ""} readOnly className="bg-white" />
                        )}
                      </div>

                      {/* Further Info checkboxes */}
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">Worktop Further Info</label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Upstand","Splashback","Wall Cladding","Sink Cut Out","Drainer Grooves","Hob Cut Out","Window Cill","LED Grooves"].map((item) => (
                            <label key={item} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="rounded"
                                checked={formData.worktop_features?.includes(item) || false}
                                onChange={(e) => handleCheckboxChange("worktop_features", item, e.target.checked)}
                                disabled={!isEditing}
                              />
                              <span className="text-sm">{item}</span>
                            </label>
                          ))}
                        </div>
                        <Input
                          placeholder="Other worktop details"
                          className="mt-3 w-full bg-white"
                          value={formData.worktop_other_details || ""}
                          onChange={(e) => handleInputChange("worktop_other_details", e.target.value)}
                          readOnly={!isEditing}
                        />
                      </div>

                      {/* Additional Worktops */}
                      <div className="border-t pt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <label className="text-sm font-bold text-gray-700">Additional Worktops</label>
                          {isEditing && (
                            <Button type="button" size="sm" onClick={addAdditionalWorktop} className="bg-orange-600">
                              + Add Additional Worktop
                            </Button>
                          )}
                        </div>
                        {formData.additional_worktops && formData.additional_worktops.map((worktop, idx) => (
                          <div key={idx} className="mb-3 space-y-3 rounded border-2 border-orange-300 bg-white p-4">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Material Type</label>
                                {isEditing ? (
                                  <select
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                    value={worktop.worktop_material_type || ""}
                                    onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_material_type", e.target.value)}
                                  >
                                    <option value="">Select type</option>
                                    <option value="stone">Stone</option>
                                    <option value="laminate">Laminate</option>
                                  </select>
                                ) : (
                                  <Input value={worktop.worktop_material_type || ""} readOnly className="text-sm" />
                                )}
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Material Color</label>
                                <Input
                                  className="text-sm"
                                  value={worktop.worktop_material_color || ""}
                                  onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_material_color", e.target.value)}
                                  readOnly={!isEditing}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">Worktop Code</label>
                                <Input
                                  className="text-sm"
                                  value={worktop.worktop_code || ""}
                                  onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_code", e.target.value)}
                                  readOnly={!isEditing}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Size/Thickness</label>
                              {isEditing ? (
                                <select
                                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                  value={worktop.worktop_size || ""}
                                  onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_size", e.target.value)}
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
                              ) : (
                                <Input value={worktop.worktop_size || ""} readOnly className="text-sm" />
                              )}
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Further Info</label>
                              <div className="grid grid-cols-2 gap-2">
                                {["Upstand","Splashback","Wall Cladding","Sink Cut Out","Drainer Grooves","Hob Cut Out","Window Cill","LED Grooves"].map((item) => (
                                  <label key={item} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      className="rounded"
                                      checked={worktop.worktop_features?.includes(item) || false}
                                      onChange={(e) => {
                                        const current = worktop.worktop_features || [];
                                        const updated = e.target.checked ? [...current, item] : current.filter((v) => v !== item);
                                        handleAdditionalWorktopChange(idx, "worktop_features", updated);
                                      }}
                                      disabled={!isEditing}
                                    />
                                    <span className="text-xs">{item}</span>
                                  </label>
                                ))}
                              </div>
                              <Input
                                placeholder="Other worktop details"
                                className="mt-2 text-sm"
                                value={worktop.worktop_other_details || ""}
                                onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_other_details", e.target.value)}
                                readOnly={!isEditing}
                              />
                            </div>
                            {isEditing && (
                              <div className="flex justify-end">
                                <Button type="button" variant="destructive" size="sm" onClick={() => removeAdditionalWorktop(idx)}>
                                  Remove
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Bedroom Furniture - Yellow Section */}
                  <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-yellow-900">4. Bedroom Furniture Specifications</h3>
                      <OrderButton
                        sectionTitle="Bedroom Furniture"
                        onClick={() => handleOpenOrderDialog("Bedroom Furniture")}
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Bedside Cabinets</label>
                          {isEditing ? (
                            <>
                              <select
                                className="w-full rounded-md border border-gray-300 bg-white p-2"
                                value={formData.bedside_cabinets_type || ""}
                                onChange={(e) => handleInputChange("bedside_cabinets_type", e.target.value)}
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
                                value={formData.bedside_cabinets_qty || ""}
                                onChange={(e) => handleInputChange("bedside_cabinets_qty", e.target.value)}
                              />
                            </>
                          ) : (
                            <>
                              <Input value={formData.bedside_cabinets_type || ""} readOnly className="bg-white" />
                              <Input value={formData.bedside_cabinets_qty || ""} readOnly className="mt-2 bg-white" placeholder="Quantity" />
                            </>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Dresser/Desk</label>
                          {isEditing ? (
                            <>
                              <select
                                className="w-full rounded-md border border-gray-300 bg-white p-2"
                                value={formData.dresser_desk || ""}
                                onChange={(e) => handleInputChange("dresser_desk", e.target.value)}
                              >
                                <option value="">Select option</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                                <option value="N/A">N/A</option>
                              </select>
                              <Input
                                placeholder="QTY/Size"
                                className="mt-2 w-full bg-white"
                                value={formData.dresser_desk_details || ""}
                                onChange={(e) => handleInputChange("dresser_desk_details", e.target.value)}
                              />
                            </>
                          ) : (
                            <>
                              <Input value={formData.dresser_desk || ""} readOnly className="bg-white" />
                              <Input value={formData.dresser_desk_details || ""} readOnly className="mt-2 bg-white" placeholder="Details" />
                            </>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Internal Mirror</label>
                          {isEditing ? (
                            <>
                              <select
                                className="w-full rounded-md border border-gray-300 bg-white p-2"
                                value={formData.internal_mirror || ""}
                                onChange={(e) => handleInputChange("internal_mirror", e.target.value)}
                              >
                                <option value="">Select option</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                                <option value="N/A">N/A</option>
                              </select>
                              <Input
                                placeholder="QTY/Size"
                                className="mt-2 w-full bg-white"
                                value={formData.internal_mirror_details || ""}
                                onChange={(e) => handleInputChange("internal_mirror_details", e.target.value)}
                              />
                            </>
                          ) : (
                            <>
                              <Input value={formData.internal_mirror || ""} readOnly className="bg-white" />
                              <Input value={formData.internal_mirror_details || ""} readOnly className="mt-2 bg-white" placeholder="Details" />
                            </>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-bold text-gray-700">Mirror</label>
                          {isEditing ? (
                            <>
                              <select
                                className="w-full rounded-md border border-gray-300 bg-white p-2"
                                value={formData.mirror_type || ""}
                                onChange={(e) => handleInputChange("mirror_type", e.target.value)}
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
                                value={formData.mirror_qty || ""}
                                onChange={(e) => handleInputChange("mirror_qty", e.target.value)}
                              />
                            </>
                          ) : (
                            <>
                              <Input value={formData.mirror_type || ""} readOnly className="bg-white" />
                              <Input value={formData.mirror_qty || ""} readOnly className="mt-2 bg-white" placeholder="Quantity" />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                  {/* 5. Lighting - Pink Section */}
                  <div className="rounded-lg border-2 border-pink-200 bg-pink-50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-pink-900">5. Lighting Specifications</h3>
                      <OrderButton
                        sectionTitle="Lighting"
                        onClick={() => handleOpenOrderDialog("Lighting")}
                      />
                    </div>
                    <div className="space-y-4">
                      {/* Soffit Lights */}
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">Soffit Lights</label>
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-4">
                            <select
                              className="w-full rounded-md border border-gray-300 bg-white p-2"
                              value={formData.soffit_lights_type || ""}
                              onChange={(e) => handleInputChange("soffit_lights_type", e.target.value)}
                            >
                              <option value="">Select type</option>
                              <option value="spot">Spot</option>
                              <option value="strip">Strip</option>
                              <option value="N/A">N/A</option>
                            </select>
                            <select
                              className="w-full rounded-md border border-gray-300 bg-white p-2"
                              value={formData.soffit_lights_color || ""}
                              onChange={(e) => handleInputChange("soffit_lights_color", e.target.value)}
                            >
                              <option value="">Colour</option>
                              <option value="cool-white">Cool White</option>
                              <option value="warm-white">Warm White</option>
                              <option value="N/A">N/A</option>
                            </select>
                          </div>
                        ) : (
                          <Input value={`${formData.soffit_lights_type || ""} - ${formData.soffit_lights_color || ""}`} readOnly className="bg-white" />
                        )}
                      </div>

                      {/* Gable Lights */}
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">Gable Lights</label>
                        {isEditing ? (
                          <div className="space-y-2">
                            <select
                              className="w-full rounded-md border border-gray-300 bg-white p-2"
                              value={formData.gable_lights_type || ""}
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
                                value={formData.gable_lights_main_color || ""}
                                onChange={(e) => handleInputChange("gable_lights_main_color", e.target.value)}
                              >
                                <option value="">Main Colour</option>
                                <option value="cool-white">Cool White</option>
                                <option value="warm-white">Warm White</option>
                                <option value="N/A">N/A</option>
                              </select>
                              <select
                                className="w-full rounded-md border border-gray-300 bg-white p-2"
                                value={formData.gable_lights_profile_color || ""}
                                onChange={(e) => handleInputChange("gable_lights_profile_color", e.target.value)}
                              >
                                <option value="">Profile Colour</option>
                                <option value="black">Black</option>
                                <option value="white">White</option>
                                <option value="N/A">N/A</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Input value={formData.gable_lights_type || ""} readOnly className="mb-2 bg-white" placeholder="Type" />
                            <Input value={`${formData.gable_lights_main_color || ""} / ${formData.gable_lights_profile_color || ""}`} readOnly className="bg-white" placeholder="Colors" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 6. Accessories & Floor Protection - Gray Section */}
                  <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">6. Accessories & Floor Protection</h3>
                      <OrderButton
                        sectionTitle="Accessories"
                        onClick={() => handleOpenOrderDialog("Accessories")}
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Other/Misc/Accessories</label>
                        <textarea
                          className={`h-20 w-full resize-none rounded-md border border-gray-300 bg-white p-3 ${!isEditing ? "cursor-not-allowed" : ""}`}
                          value={formData.other_accessories || ""}
                          onChange={(e) => handleInputChange("other_accessories", e.target.value)}
                          readOnly={!isEditing}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">Floor Protection</label>
                        <div className="space-y-2">
                          {["Carpet Protection", "Floor Tile Protection", "No Floor Protection Required"].map((item) => (
                            <label key={item} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="rounded"
                                checked={formData.floor_protection?.includes(item) || false}
                                onChange={(e) => handleCheckboxChange("floor_protection", item, e.target.checked)}
                                disabled={!isEditing}
                              />
                              <span>{item}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Terms and Conditions - Gray Section (for both kitchen and bedroom) */}
            <div className="terms-page-break mb-6 rounded-lg border-2 border-gray-300 bg-gray-100 p-6">
              <h3 className="mb-4 text-xl font-bold text-gray-900">Terms & Information</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">Date Terms and Conditions Given</label>
                  <Input
                    type="date"
                    className="bg-white"
                    value={formData.terms_date || ""}
                    onChange={(e) => handleInputChange("terms_date", e.target.value)}
                    readOnly={!isEditing}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">
                    Gas and Electric Installation {formType === "kitchen" ? "Information" : "Terms"} Given
                  </label>
                  {isEditing ? (
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white p-2"
                      value={formData.gas_electric_info || ""}
                      onChange={(e) => handleInputChange("gas_electric_info", e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="N/A">N/A</option>
                    </select>
                  ) : (
                    <Input value={formData.gas_electric_info || ""} readOnly className="bg-white" />
                  )}
                </div>
                {formType === "kitchen" && (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-bold text-gray-700">
                      Appliance Promotion Information Given
                    </label>
                    {isEditing ? (
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white p-2"
                        value={formData.appliance_promotion_info || ""}
                        onChange={(e) => handleInputChange("appliance_promotion_info", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="N/A">N/A</option>
                      </select>
                    ) : (
                      <Input value={formData.appliance_promotion_info || ""} readOnly className="bg-white" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Confirmation Statement */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <p className="mb-3 text-sm font-bold text-gray-700">
                I confirm that the above specification and all annotated plans and elevations with this pack are correct.
              </p>
              <p className="mb-4 text-sm text-gray-600">Please sign below to confirm.</p>
            </div>

            {/* Signature Section - Indigo Section */}
            <div className="mb-6 rounded-lg border-2 border-indigo-200 bg-indigo-50 p-6">
              <h3 className="mb-4 text-xl font-bold text-indigo-900">Customer Signature</h3>
              
              {isEditing && (
                <div className="mb-4">
                  <div className="mb-3 flex gap-4">
                    <Button
                      type="button"
                      variant={signatureMode === "upload" ? "default" : "outline"}
                      onClick={() => setSignatureMode("upload")}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Signature
                    </Button>
                    <Button
                      type="button"
                      variant={signatureMode === "draw" ? "default" : "outline"}
                      onClick={() => setSignatureMode("draw")}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <PenTool className="h-4 w-4" />
                      Draw Signature
                    </Button>
                    <Button
                      type="button"
                      variant={signatureMode === "existing" ? "default" : "outline"}
                      onClick={() => setSignatureMode("existing")}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      Keep Existing
                    </Button>
                  </div>

                  {signatureMode === "upload" && (
                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="signature-upload"
                        onChange={handleSignatureUpload}
                      />
                      <label htmlFor="signature-upload" className="cursor-pointer">
                        <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-600">Click to upload signature image</p>
                        <p className="mt-1 text-xs text-gray-400">PNG, JPG up to 10MB</p>
                      </label>
                    </div>
                  )}

                  {signatureMode === "draw" && (
                    <div className="rounded-lg border border-gray-300 bg-white">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={150}
                        className="w-full cursor-crosshair rounded-lg"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        style={{ touchAction: "none" }}
                      />
                      <div className="flex justify-end border-t bg-gray-50 p-2">
                        <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formData.signature_data && (signatureMode === "existing" || !isEditing) && (
                <div className="mb-4 rounded-lg border border-gray-300 bg-white p-4">
                  <img src={formData.signature_data} alt="Customer Signature" className="mx-auto max-h-32" />
                </div>
              )}
              
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">Date</label>
                <Input
                  type="date"
                  className="bg-white"
                  value={formData.signature_date || ""}
                  onChange={(e) => handleInputChange("signature_date", e.target.value)}
                  readOnly={!isEditing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Order Materials Dialog */}
        {showOrderDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
              <div className="sticky top-0 z-10 border-b bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Order Materials</h2>
                    <p className="text-sm text-gray-600">{orderDialogSection} — {formData?.customer_name}</p>
                  </div>
                  <button onClick={() => setShowOrderDialog(false)} className="text-gray-400 hover:text-gray-600">
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
                      {orderItems.filter(i => i.included).length} of {orderItems.length} items selected
                    </p>
                    {orderItems.map((item, idx) => (
                      <div key={idx}
                        className={`rounded-xl border-2 transition-colors ${
                          item.included ? 'border-blue-200 bg-white shadow-sm' : 'border-gray-200 bg-gray-50 opacity-50'
                        }`}
                      >
                        {/* Card header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                          <input
                            type="checkbox"
                            checked={item.included}
                            onChange={e => {
                              const updated = [...orderItems];
                              updated[idx] = { ...updated[idx], included: e.target.checked };
                              setOrderItems(updated);
                            }}
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
                                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
                                  <Input
                                    value={item[key] as string}
                                    onChange={e => {
                                      const updated = [...orderItems];
                                      updated[idx] = { ...updated[idx], [key]: e.target.value };
                                      setOrderItems(updated);
                                    }}
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
                                <Input value={item.supplier}
                                  onChange={e => { const u = [...orderItems]; u[idx] = { ...u[idx], supplier: e.target.value }; setOrderItems(u); }}
                                  placeholder="e.g. Howdens" className="h-8 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Quantity</label>
                                <Input type="number" min="1" value={item.quantity}
                                  onChange={e => { const u = [...orderItems]; u[idx] = { ...u[idx], quantity: e.target.value }; setOrderItems(u); }}
                                  className="h-8 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Est. Cost (£)</label>
                                <Input type="number" step="0.01" min="0" placeholder="0.00" value={item.estimated_cost}
                                  onChange={e => { const u = [...orderItems]; u[idx] = { ...u[idx], estimated_cost: e.target.value }; setOrderItems(u); }}
                                  className="h-8 text-sm" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Date Ordered</label>
                                <input type="date" value={item.order_date}
                                  onChange={e => { const u = [...orderItems]; u[idx] = { ...u[idx], order_date: e.target.value }; setOrderItems(u); }}
                                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm h-8" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Expected Delivery</label>
                                <input type="date" value={item.expected_delivery}
                                  onChange={e => { const u = [...orderItems]; u[idx] = { ...u[idx], expected_delivery: e.target.value }; setOrderItems(u); }}
                                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm h-8" />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Notes</label>
                              <textarea rows={2} placeholder="Any special instructions..." value={item.notes}
                                onChange={e => { const u = [...orderItems]; u[idx] = { ...u[idx], notes: e.target.value }; setOrderItems(u); }}
                                className="w-full resize-none rounded-md border border-gray-300 p-2 text-sm" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="sticky bottom-0 border-t bg-gray-50 p-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowOrderDialog(false)} disabled={isSubmittingOrder}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitOrder}
                  disabled={isSubmittingOrder || orderItems.filter(i => i.included).length === 0}>
                  {isSubmittingOrder
                    ? 'Creating Orders...'
                    : `Create ${orderItems.filter(i => i.included).length} Order${orderItems.filter(i => i.included).length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </div>
        )}

      </SidebarInset>

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
          
          /* Hide non-printable elements */
          .print\\:hidden,
          aside,
          header:has(.sidebar-trigger),
          nav,
          .no-print {
            display: none !important;
          }
          
          /* Ensure main content is visible */
          main,
          .flex.flex-1.flex-col {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Show the form title prominently */
          form > h2:first-of-type {
            display: block !important;
            page-break-after: avoid;
            margin-top: 0 !important;
            padding-top: 0 !important;
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
          
          /* Hide buttons and interactive elements */
          button:not(.print\\:block) {
            display: none !important;
          }
          
          /* Bedroom: 2-column layout */
          .grid.grid-cols-1.gap-3.lg\\:grid-cols-2 {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
          }
          
          /* Status messages and banners */
          .border-2.border-blue-300,
          .rounded-lg.p-4.border {
            display: none !important;
          }
        }
      `}</style>
    </SidebarProvider>
  );
}

export default function ChecklistViewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ChecklistViewContent />
    </Suspense>
  );
}

