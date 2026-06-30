"use client";
import React, { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, UserPlus } from "lucide-react";
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
import { BACKEND_URL } from "@/lib/api";
import { OrderButton, NAButton, OrderMaterialsDialog } from "./shared-components";
import type { BedroomFormData, AdditionalDoor, AdditionalHandle, AdditionalWorktop } from "./shared-types";

export default function BedroomChecklist() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [userRole, setUserRole] = useState<string>("platform admin");
  const sidebarItems = getSidebarItems(userRole);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDialogSection, setOrderDialogSection] = useState('');
  const [isWalkinMode, setIsWalkinMode] = useState(false);

  const [formData, setFormData] = useState<BedroomFormData>({
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    customer_postcode: "",
    postcode: "",
    room: "",
    door_style: "",
    door_color: "",
    door_type: "",
    door_manufacturer: "",
    door_name: "",
    glazing_material: "",
    plinth_filler_color: "",
    end_panel_color: "",
    cabinet_color: "",
    worktop_material_color: "",
    additional_doors: [],
    additional_handles: [],
    handles_code: "",
    handles_quantity: "",
    handles_size: "",
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
    terms_date: "",
    gas_electric_info: "",
    signature_name: "",
    signature_date: "",
    worktop_code: "",
    additional_worktops: [],
    worktop_material_type: "",
    worktop_size: "",
    worktop_features: [],
    worktop_other_details: "",
  });
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const custName = urlParams.get("customerName");
      const custAddress = urlParams.get("customerAddress");
      const custPhone = urlParams.get("customerPhone");
      const custPostcode = urlParams.get("customerPostcode");
      const modeParam = urlParams.get("mode");

      if (modeParam === "walkin") {
        setIsWalkinMode(true);
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

  type SingleField = keyof Omit<BedroomFormData, "floor_protection" | "additional_doors" | "additional_handles" | "additional_worktops" | "worktop_features">;

  const handleInputChange = (field: SingleField, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCheckboxChange = (field: "floor_protection", value: string, checked: boolean) => {
    setFormData((prev) => {
      const currentValues = prev[field];
      if (checked) {
        return { ...prev, [field]: [...currentValues, value] };
      } else {
        return { ...prev, [field]: currentValues.filter((v) => v !== value) };
      }
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
        door_type: "", 
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

  const handleAdditionalWorktopChange = (index: number, field: keyof AdditionalWorktop, value: any) => {
    setFormData((prev) => {
      const additional_worktops = [...prev.additional_worktops];
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
      return { ...prev, additional_worktops };
    });
  };

  const addAdditionalWorktop = () => {
    setFormData((prev) => ({
      ...prev,
      additional_worktops: [...prev.additional_worktops, {
        worktop_material_type: "",
        worktop_material_color: "",
        worktop_code: "",
        worktop_size: "",
        worktop_features: [],
        worktop_other_details: "",
      }],
    }));
  };

  const removeAdditionalWorktop = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      additional_worktops: prev.additional_worktops.filter((_, i) => i !== index),
    }));
  };

  const handleSectionNA = (sectionType: string) => {
    if (!window.confirm(`Set all fields in this section to "N/A"?`)) return;

    setFormData((prev) => {
      const updates: Partial<BedroomFormData> = {};

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

        case "worktop_specs":
          updates.worktop_material_type = "N/A";  // add N/A option to the select (Fix 2 below)
          updates.worktop_material_color = "N/A";
          updates.worktop_code = "N/A";
          updates.worktop_size = "N/A";
          updates.worktop_features = ["N/A"];     // needs a value to pass validation
          updates.worktop_other_details = "N/A";
          break;

        case "accessories":
          updates.other_accessories = "N/A";
          updates.floor_protection = ["No Floor Protection Required"];
          break;
      }

      return { ...prev, ...updates };
    });
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.customer_name?.trim()) errors.push("Customer Name");
    if (!formData.customer_phone?.trim()) errors.push("Tel/Mobile Number");
    if (!formData.customer_address?.trim()) errors.push("Address");
    if (!formData.customer_postcode?.trim() && !formData.postcode?.trim()) {
      errors.push("Postcode");
    }

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

    if (!formData.terms_date?.trim()) errors.push("Date Terms and Conditions Given");
    if (!formData.gas_electric_info?.trim()) errors.push("Gas and Electric Installation Terms");

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

    const token = searchParams.get("token") || "";
    const customerIdFromUrl = searchParams.get("customerId") || "";
    const projectIdFromUrl = searchParams.get("projectId") || "";

    const finalFormData = {
      ...formData,
      signature_data: formData.signature_name,
      form_type: "bedroom",
      customer_id: customerIdFromUrl || formData.customer_id || "",
    };

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch(`${BACKEND_URL}/api/form/submit-customer-form`, {
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
          message: successMsg,
        });

        setTimeout(() => {
          const targetCustomerId = result.customer_id || customerIdFromUrl;
          const redirectUrl = searchParams.get("redirect");

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

  return (
    <SidebarProvider>
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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 print:hidden">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bedroom Installation Checklist</h1>
              <p className="text-sm text-gray-600">Complete bedroom installation verification form</p>
            </div>
            <Button onClick={handleSavePDF} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-2 p-2" ref={formRef}>
          <form className="rounded-lg border bg-white p-4 shadow-sm print:shadow-none print:border-0">
            <h2 className="mb-1 text-center text-lg font-semibold">Bedroom Installation Checklist</h2>
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

            {/* Customer Information */}
            <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-6 print:mb-2 print:p-3">
              <h3 className="mb-4 text-xl font-bold text-blue-900 print:mb-2">Customer Information</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5 print:gap-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">Customer Name</label>
                  <Input 
                    value={formData.customer_name || ""} 
                    onChange={(e) => handleInputChange("customer_name", e.target.value)}
                    className="bg-white" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">Tel/Mobile Number</label>
                  <Input 
                    value={formData.customer_phone || ""} 
                    onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                    className="bg-white" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">Address</label>
                  <Input 
                    value={formData.customer_address || ""} 
                    onChange={(e) => handleInputChange("customer_address", e.target.value)}
                    className="bg-white" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">Postcode</label>
                  <Input 
                    value={formData.customer_postcode || formData.postcode || ""} 
                    onChange={(e) => {
                      handleInputChange("customer_postcode", e.target.value);
                      handleInputChange("postcode", e.target.value);
                    }}
                    className="bg-white" 
                    placeholder="Enter postcode"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">Room</label>
                  <Input 
                    value={formData.room || ""} 
                    onChange={(e) => handleInputChange("room", e.target.value)}
                    className="bg-white" 
                  />
                </div>
              </div>
            </div>

            {/* Bedroom Specific Sections - 2 Column Layout */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* 1. Material Specifications */}
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
                        userRole={userRole}
                        onClick={() => {
                          setOrderDialogSection('Material Specifications');
                          setOrderDialogOpen(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Door Style, Type, and Color - 3 columns */}
                    <div className="grid grid-cols-3 gap-4">
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
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.door_type}
                          onChange={(e) => handleInputChange("door_type", e.target.value)}
                        >
                          <option value="">Select door type</option>
                          <option value="Slab">Slab</option>
                          <option value="Lacquered Slab">Lacquered Slab</option>
                          <option value="Vinyl">Vinyl doors</option>
                          <option value="Black Glass">Black Glass</option>
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
                    </div>
 
                    {/* Vinyl-specific fields (manufacturer and name) */}
                    {formData.door_style === "vinyl" && (
                      <div className="grid grid-cols-2 gap-4">
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
                      </div>
                    )}
 
                    {/* Panel and Plinth Colors */}
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
                      <label className="mb-1 block text-sm font-bold text-gray-700">Carcass Color</label>
                      <Input
                        placeholder="Enter carcass color"
                        className="w-full bg-white"
                        value={formData.cabinet_color}
                        onChange={(e) => handleInputChange("cabinet_color", e.target.value)}
                      />
                    </div>
 
                    {/* Cabinet and Worktop Colors */}
                    <div className="grid grid-cols-2 gap-4">
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
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Door Style</label>
                              <Input
                                placeholder="Enter door style"
                                className="text-sm"
                                value={door.door_style}
                                onChange={(e) => handleAdditionalDoorChange(idx, "door_style", e.target.value)}
                              />
                            </div>           
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Door Type</label>
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
                          </div>
 
                          {door.door_style === "vinyl" && (
                            <div className="grid grid-cols-2 gap-3">
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
                            </div>
                          )}
 
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
                              <label className="mb-1 block text-xs font-bold text-gray-600">Carcass Color</label>
                              <Input
                                placeholder="Enter carcass color"
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

                {/* 2. Hardware Specifications */}
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
                        userRole={userRole}
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

                    {/* Additional Handles */}
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

                {/* 3. Worktop Specifications */}
                <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-orange-900">3. Worktop Specifications</h3>
                    <div className="flex items-center gap-2">
                      <NAButton sectionType="worktop_specs" onClick={() => handleSectionNA("worktop_specs")} />
                      <OrderButton
                        sectionTitle="Worktop Specifications"
                        userRole={userRole}
                        onClick={() => {
                          setOrderDialogSection('Worktop Specifications');
                          setOrderDialogOpen(true);
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Material Type, Color, Code - 3 columns */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Material Type</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.worktop_material_type || ""}
                          onChange={(e) => handleInputChange("worktop_material_type" as any, e.target.value)}
                        >
                          <option value="">Select material type</option>
                          <option value="stone">Stone</option>
                          <option value="laminate">Laminate</option>
                          <option value="N/A">N/A</option>
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
                        <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Code</label>
                        <Input
                          placeholder="Enter worktop code"
                          className="w-full bg-white"
                          value={formData.worktop_code}
                          onChange={(e) => handleInputChange("worktop_code", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Size/Thickness */}
                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">Worktop Size/Thickness</label>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white p-2"
                        value={formData.worktop_size || ""}
                        onChange={(e) => handleInputChange("worktop_size" as any, e.target.value)}
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

                    {/* Further Info checkboxes */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-700">Worktop Further Info</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Upstand","Splashback","Wall Cladding","Sink Cut Out","Drainer Grooves","Hob Cut Out","Window Cill","LED Grooves"].map((item) => (
                          <label key={item} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={(formData.worktop_features || []).includes(item)}
                              onChange={(e) => {
                                const current = formData.worktop_features || [];
                                const updated = e.target.checked
                                  ? [...current, item]
                                  : current.filter((v) => v !== item);
                                setFormData((prev) => ({ ...prev, worktop_features: updated }));
                              }}
                            />
                            <span className="text-sm">{item}</span>
                          </label>
                        ))}
                      </div>
                      <Input
                        placeholder="Other worktop details"
                        className="mt-3 w-full bg-white"
                        value={formData.worktop_other_details || ""}
                        onChange={(e) => handleInputChange("worktop_other_details" as any, e.target.value)}
                      />
                    </div>

                    {/* Additional Worktops */}
                    <div className="border-t pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700">Additional Worktops</label>
                        <Button type="button" size="sm" onClick={addAdditionalWorktop} className="bg-orange-600">
                          + Add Additional Worktop
                        </Button>
                      </div>
                      {formData.additional_worktops.map((worktop, idx) => (
                        <div key={idx} className="mb-3 space-y-3 rounded border-2 border-orange-300 bg-white p-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Material Type</label>
                              <select
                                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                value={worktop.worktop_material_type}
                                onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_material_type", e.target.value)}
                              >
                                <option value="">Select type</option>
                                <option value="stone">Stone</option>
                                <option value="laminate">Laminate</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Material Color</label>
                              <Input
                                placeholder="Enter color"
                                className="text-sm"
                                value={worktop.worktop_material_color}
                                onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_material_color", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Worktop Code</label>
                              <Input
                                placeholder="Enter code"
                                className="text-sm"
                                value={worktop.worktop_code}
                                onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_code", e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Size/Thickness</label>
                            <select
                              className="w-full rounded-md border border-gray-300 p-2 text-sm"
                              value={worktop.worktop_size}
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
                                      const updated = e.target.checked
                                        ? [...current, item]
                                        : current.filter((v) => v !== item);
                                      handleAdditionalWorktopChange(idx, "worktop_features", updated);
                                    }}
                                  />
                                  <span className="text-xs">{item}</span>
                                </label>
                              ))}
                            </div>
                            <Input
                              placeholder="Other worktop details"
                              className="mt-2 text-sm"
                              value={worktop.worktop_other_details}
                              onChange={(e) => handleAdditionalWorktopChange(idx, "worktop_other_details", e.target.value)}
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button type="button" variant="destructive" size="sm" onClick={() => removeAdditionalWorktop(idx)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* 3. Accessories & Floor Protection */}
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
                        userRole={userRole}
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
                {/* 4. Bedroom Furniture */}
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
                        userRole={userRole}
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

                {/* 5. Lighting */}
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
                        userRole={userRole}
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

            {/* Terms and Conditions */}
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
                    Gas and Electric Installation Terms Given
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
    </SidebarProvider>
  );
}