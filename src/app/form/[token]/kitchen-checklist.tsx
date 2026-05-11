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
import type { KitchenFormData, Appliance, AdditionalDoor, AdditionalHandle } from "./shared-types";

export default function KitchenChecklist() {
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

  const [formData, setFormData] = useState<KitchenFormData>({
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    customer_postcode: "",
    postcode: "",
    survey_date: "",
    appointment_date: "",
    installation_date: "",
    completion_date: "",
    deposit_date: "",
    door_style: "",
    door_color: "",
    door_type: "",
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

  type SingleField = keyof Omit<KitchenFormData, "worktop_features" | "appliances" | "additional_doors" | "additional_handles">;

  const handleInputChange = (field: SingleField, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCheckboxChange = (field: "worktop_features", value: string, checked: boolean) => {
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

  const handleSectionNA = (sectionType: string) => {
    if (!window.confirm(`Set all fields in this section to "N/A"?`)) return;

    setFormData((prev) => {
      const updates: Partial<KitchenFormData> = {};

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

    if (!formData.terms_date?.trim()) errors.push("Date Terms and Conditions Given");
    if (!formData.gas_electric_info?.trim()) errors.push("Gas and Electric Installation Information");
    if (!formData.appliance_promotion_info?.trim()) {
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

    const token = searchParams.get("token") || "";
    const customerIdFromUrl = searchParams.get("customerId") || "";
    const projectIdFromUrl = searchParams.get("projectId") || "";
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
      form_type: "kitchen",
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
              <h1 className="text-2xl font-bold text-gray-900">Kitchen Installation Checklist</h1>
              <p className="text-sm text-gray-600">Complete kitchen installation verification form</p>
            </div>
            <Button onClick={handleSavePDF} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>
        </header>

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
            <h2 className="mb-1 text-center text-lg font-semibold">Kitchen Installation Checklist</h2>
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4 print:gap-2">
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
              </div>
            </div>

            {/* Kitchen Specific Sections - 2 Column Layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* 1. Material Specifications */}
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
                        <label className="mb-1 block text-sm font-bold text-gray-700">Door Type</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white p-2"
                          value={formData.door_type}
                          onChange={(e) => handleInputChange("door_type", e.target.value)}
                        >
                          <option value="">Select door type</option>
                          <option value="Basic Slab">Basic slab frnt door (2250 H) / drawer</option>
                          <option value="Acrylic Gloss/Matt">Acrylic gloss/Matt</option>
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

                    {/* Vinyl-specific fields */}
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

                    {/* Glazed-specific fields */}
                    {formData.door_style === "glazed" && (
                      <div>
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
                          <div className="grid grid-cols-3 gap-3">
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
                              <label className="mb-1 block text-xs font-bold text-gray-600">Door Type</label>
                              <select
                                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                value={door.door_type || ""}
                                onChange={(e) => handleAdditionalDoorChange(idx, "door_type", e.target.value)}
                              >
                                <option value="">Select type</option>
                                <option value="Basic Slab">Basic slab frnt door</option>
                                <option value="Acrylic Gloss/Matt">Acrylic gloss/Matt</option>
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

                          {door.door_style === "glazed" && (
                            <div>
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

                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Cabinet Color</label>
                            <Input
                              placeholder="Enter cabinet color"
                              className="text-sm"
                              value={door.cabinet_color || ""}
                              onChange={(e) => handleAdditionalDoorChange(idx, "cabinet_color", e.target.value)}
                            />
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

                {/* 3. Worktop Specifications */}
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
                        userRole={userRole}
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
                {/* 4. Appliance and Sink & Tap */}
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
                        userRole={userRole}
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
                    Gas and Electric Installation Information Given
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