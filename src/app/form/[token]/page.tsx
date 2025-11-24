"use client";
import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, PenTool, Upload } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { getSidebarItems } from "@/navigation/sidebar/sidebar-items";
import Link from "next/link";

interface Appliance {
  make: string;
  model: string;
  order_date: string;
}

interface AdditionalDoor {
  door_style: string;
  door_color: string;
  quantity: string;
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
  door_color: string;
  glazing_material: string;
  plinth_filler_color: string;
  end_panel_color: string;
  cabinet_color: string;
  additional_doors: AdditionalDoor[];
  handles_code: string;
  handles_quantity: string;
  handles_size: string;
  accessories: string;
  lighting_spec: string;
  worktop_material_type: string; // stone or laminate
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

export default function FormPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = searchParams.get("type");

  const [formType, setFormType] = useState<"bedroom" | "kitchen">("bedroom");
  const [valid, setValid] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const [formData, setFormData] = useState<FormData>({
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    room: "",
    survey_date: "",
    appointment_date: "",
    installation_date: "",
    completion_date: "",
    deposit_date: "",
    door_style: "",
    door_color: "",
    glazing_material: "",
    plinth_filler_color: "",
    end_panel_color: "",
    cabinet_color: "",
    additional_doors: [],
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
      const formTypeParam = urlParams.get("type");

      if (formTypeParam === "kitchen" || formTypeParam === "bedroom") {
        setFormType(formTypeParam);
      }

      setFormData((prev) => ({
        ...prev,
        ...(custName ? { customer_name: custName } : {}),
        ...(custAddress ? { customer_address: custAddress } : {}),
        ...(custPhone ? { customer_phone: custPhone } : {}),
      }));
    }
  }, []);

  const [signatureMode, setSignatureMode] = useState("upload");
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState("");

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  type Point = { x: number; y: number } | null;
  const [lastPoint, setLastPoint] = useState<Point>(null);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLastPoint({ x, y });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
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
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSignatureData("");
  };

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
        additional_doors[index] = { door_style: "", door_color: "", quantity: "" };
      }
      additional_doors[index] = { ...additional_doors[index], [field]: value };
      return { ...prev, additional_doors };
    });
  };

  const addAdditionalDoor = () => {
    setFormData((prev) => ({
      ...prev,
      additional_doors: [...prev.additional_doors, { door_style: "", door_color: "", quantity: "" }],
    }));
  };

  const removeAdditionalDoor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      additional_doors: prev.additional_doors.filter((_, i) => i !== index),
    }));
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const headers: HeadersInit = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const userResponse = await fetch("https://aztec-interiors.onrender.com/users/me", { headers });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };

    fetchUser();
  }, []);

  const validateForm = () => {
    const errors: string[] = [];
    const isClientOwned = formData.appliances_customer_owned === "no";

    if (!formData.customer_name?.trim()) errors.push("Customer Name");
    if (!formData.customer_phone?.trim()) errors.push("Tel/Mobile Number");
    if (!formData.customer_address?.trim()) errors.push("Address");

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

    if (!signatureData) errors.push("Customer Signature");
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

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const confirmMsg = "Are you sure you want to submit this checklist?";
    if (!window.confirm(confirmMsg)) return;

    const redirectUrl = searchParams.get("redirect");
    const token = searchParams.get("token") || "";
    const customerIdFromUrl = searchParams.get("customerId") || "";
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
      signature_data: signatureData,
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
      const response = await fetch("https://aztec-interiors.onrender.com/submit-customer-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          formData: finalFormData,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus({
          type: "success",
          message: result.message || "Form submitted successfully! Redirecting...",
        });

        setTimeout(() => {
          const targetCustomerId = result.customer_id || customerIdFromUrl;

          if (redirectUrl) {
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
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {getSidebarItems(user?.role || "sales").map((group) =>
                  group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={item.title === "Forms/Checklists"}>
                        <Link href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto">{item.badge}</span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <div className="flex-1">
      </div>

      {/* Header - Full Width */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-[1800px] px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Installation Checklist</h1>
              <p className="mt-1 text-gray-600">Complete installation verification form</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container - Full Width */}
      <div className="mx-auto max-w-[1800px] px-8 py-6">
        <form className="rounded-lg border bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-center text-xl font-semibold">
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
          <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
            <h3 className="mb-4 text-xl font-bold text-blue-900">Customer Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">Customer Name</label>
                <Input
                  placeholder="Enter customer name"
                  className="w-full bg-white"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange("customer_name", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">Tel/Mobile Number</label>
                <Input
                  placeholder="Enter phone number"
                  type="tel"
                  className="w-full bg-white"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">Address</label>
                <Input
                  placeholder="Enter full address"
                  className="w-full bg-white"
                  value={formData.customer_address}
                  onChange={(e) => handleInputChange("customer_address", e.target.value)}
                />
              </div>
              {formType === "bedroom" && (
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">Room</label>
                  <Input
                    placeholder="Enter room details"
                    className="w-full bg-white"
                    value={formData.room}
                    onChange={(e) => handleInputChange("room", e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* KITCHEN SPECIFIC SECTIONS */}
          {formType === "kitchen" && (
            <>
              {/* 1. Material Specifications - Green Section */}
              <div className="mb-6 rounded-lg border-2 border-green-200 bg-green-50 p-6">
                <h3 className="mb-4 text-xl font-bold text-green-900">1. Material Specifications (Ordering)</h3>
                <div className="space-y-4">
                  {/* Door Style and Door Color - Same Line */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  </div>

                  {/* Glazing Material - Only if Door Style is Glazed */}
                  {formData.door_style === "glazed" && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    </div>
                  )}

                  {/* Panel Color and Plinth/Filler Color - Same Line */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

                  {/* Cabinet Color - Full Width */}
                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">Cabinet Color</label>
                    <Input
                      placeholder="Enter cabinet color"
                      className="w-full bg-white"
                      value={formData.cabinet_color}
                      onChange={(e) => handleInputChange("cabinet_color", e.target.value)}
                    />
                  </div>

                  {/* Additional Doors Section */}
                  <div className="border-t pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-bold text-gray-700">Door Details (Additional Doors)</label>
                      <Button type="button" size="sm" onClick={addAdditionalDoor} className="bg-green-600">
                        + Add Additional Door
                      </Button>
                    </div>
                    {formData.additional_doors.map((door, idx) => (
                      <div key={idx} className="mb-3 grid grid-cols-1 gap-3 rounded border border-green-300 bg-white p-3 md:grid-cols-4">
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
                            placeholder="Color"
                            className="text-sm"
                            value={door.door_color}
                            onChange={(e) => handleAdditionalDoorChange(idx, "door_color", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-600">Quantity</label>
                          <Input
                            placeholder="QTY"
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
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Hardware Specifications - Purple Section */}
              <div className="mb-6 rounded-lg border-2 border-purple-200 bg-purple-50 p-6">
                <h3 className="mb-4 text-xl font-bold text-purple-900">2. Hardware Specifications</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">Accessories (e.g., Pullouts)</label>
                    <textarea
                      className="h-20 w-full resize-none rounded-md border border-gray-300 bg-white p-3"
                      placeholder="Enter accessory details"
                      value={formData.accessories}
                      onChange={(e) => handleInputChange("accessories", e.target.value)}
                    ></textarea>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">Lighting Specification</label>
                    <textarea
                      className="h-20 w-full resize-none rounded-md border border-gray-300 bg-white p-3"
                      placeholder="Enter lighting details"
                      value={formData.lighting_spec}
                      onChange={(e) => handleInputChange("lighting_spec", e.target.value)}
                    ></textarea>
                  </div>
                </div>

                {/* Lighting Details */}
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">Under Wall Unit Lights</label>
                    <div className="space-y-2">
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white p-2"
                        value={formData.under_wall_unit_lights_color}
                        onChange={(e) => handleInputChange("under_wall_unit_lights_color", e.target.value)}
                      >
                        <option value="">Main Colour</option>
                        <option value="cool-white">Cool White</option>
                        <option value="warm-white">Warm White</option>
                        <option value="N/A">N/A</option>
                      </select>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white p-2"
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
                      className="w-full rounded-md border border-gray-300 bg-white p-2"
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
              <div className="mb-6 rounded-lg border-2 border-orange-200 bg-orange-50 p-6">
                <h3 className="mb-4 text-xl font-bold text-orange-900">3. Worktop Specifications (Ordering)</h3>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-bold text-gray-700">Worktop Further Info</label>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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

              {/* 4. Appliance and Sink & Tap - Yellow Section */}
              <div className="mb-6 rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6">
                <h3 className="mb-4 text-xl font-bold text-yellow-900">4. Appliance and Sink & Tap Information</h3>
                
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

                {!!formData.appliances_customer_owned && (
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

                {!!formData.sink_tap_customer_owned && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="mb-1 block text-sm font-bold text-gray-700">Sink Details</label>
                      <Input
                        placeholder="Sink details (e.g., Make/Size)"
                        className="w-full bg-white"
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
                    <div className="space-y-2">
                      <label className="mb-1 block text-sm font-bold text-gray-700">Tap Details</label>
                      <Input
                        placeholder="Tap details (e.g., Make)"
                        className="w-full bg-white"
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
            </>
          )}

          {/* BEDROOM SPECIFIC SECTIONS */}
          {formType === "bedroom" && (
            <>
              {/* 1. Material Specifications - Green Section */}
              <div className="mb-6 rounded-lg border-2 border-green-200 bg-green-50 p-6">
                <h3 className="mb-4 text-xl font-bold text-green-900">1. Material Specifications</h3>
                <div className="space-y-4">
                  {/* Door Style and Door Color */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  </div>

                  {/* Panel Color and Plinth/Filler Color */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

                  {/* Cabinet Color - Full Width */}
                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">Cabinet Color</label>
                    <Input
                      placeholder="Enter cabinet color"
                      className="w-full bg-white"
                      value={formData.cabinet_color}
                      onChange={(e) => handleInputChange("cabinet_color", e.target.value)}
                    />
                  </div>

                  {/* Worktop Color */}
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
              </div>

              {/* 2. Hardware Specifications - Purple Section */}
              <div className="mb-6 rounded-lg border-2 border-purple-200 bg-purple-50 p-6">
                <h3 className="mb-4 text-xl font-bold text-purple-900">2. Hardware Specifications</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              </div>

              {/* 3. Bedroom Furniture - Orange Section */}
              <div className="mb-6 rounded-lg border-2 border-orange-200 bg-orange-50 p-6">
                <h3 className="mb-4 text-xl font-bold text-orange-900">3. Bedroom Furniture Specifications</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">Bedside Cabinets</label>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white p-2"
                        value={formData.bedside_cabinets_type}
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
                        value={formData.bedside_cabinets_qty}
                        onChange={(e) => handleInputChange("bedside_cabinets_qty", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">Dresser/Desk</label>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white p-2"
                        value={formData.dresser_desk}
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
                        value={formData.dresser_desk_details}
                        onChange={(e) => handleInputChange("dresser_desk_details", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">Internal Mirror</label>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white p-2"
                        value={formData.internal_mirror}
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
                        value={formData.internal_mirror_details}
                        onChange={(e) => handleInputChange("internal_mirror_details", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">Mirror</label>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white p-2"
                        value={formData.mirror_type}
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
                        value={formData.mirror_qty}
                        onChange={(e) => handleInputChange("mirror_qty", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Lighting - Yellow Section */}
              <div className="mb-6 rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6">
                <h3 className="mb-4 text-xl font-bold text-yellow-900">4. Lighting Specifications</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">Soffit Lights</label>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 rounded-md border border-gray-300 bg-white p-2"
                        value={formData.soffit_lights_type}
                        onChange={(e) => handleInputChange("soffit_lights_type", e.target.value)}
                      >
                        <option value="">Select type</option>
                        <option value="spot">Spot</option>
                        <option value="strip">Strip</option>
                        <option value="N/A">N/A</option>
                      </select>
                      <select
                        className="flex-1 rounded-md border border-gray-300 bg-white p-2"
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

                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">Gable Lights</label>
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

              {/* 5. Accessories & Floor Protection - Pink Section */}
              <div className="mb-6 rounded-lg border-2 border-pink-200 bg-pink-50 p-6">
                <h3 className="mb-4 text-xl font-bold text-pink-900">5. Accessories & Floor Protection</h3>
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
            </>
          )}

          {/* Terms and Conditions - Gray Section */}
          <div className="mb-6 rounded-lg border-2 border-gray-300 bg-gray-100 p-6">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Terms & Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                <div>
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
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <p className="mb-3 text-sm font-bold text-gray-700">
              I confirm that the above specification and all annotated plans and elevations with this pack are correct.
            </p>
            <p className="mb-4 text-sm text-gray-600">Please sign below to confirm.</p>
          </div>

          {/* Signature Section */}
          <div className="mb-6 rounded-lg border-2 border-indigo-200 bg-indigo-50 p-6">
            <h3 className="mb-4 text-xl font-bold text-indigo-900">Customer Signature</h3>

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
              </div>

              {signatureMode === "upload" ? (
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
                  {signatureData && (
                    <div className="mt-4">
                      <img src={signatureData} alt="Signature" className="mx-auto max-h-32 rounded border" />
                    </div>
                  )}
                </div>
              ) : (
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

            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">Date</label>
              <Input
                type="date"
                className="w-full bg-white"
                value={formData.signature_date}
                onChange={(e) => handleInputChange("signature_date", e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="border-t pt-6 text-center">
            <Button className="px-8 py-3 text-lg font-bold" onClick={handleSubmit} disabled={isSubmitting} type="button">
              {isSubmitting ? "Submitting..." : "Submit Form"}
            </Button>
          </div>
        </form>
      </div>
    </SidebarProvider> 
  );
}