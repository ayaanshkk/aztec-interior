"use client";
import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, PenTool, Upload } from "lucide-react";
import { useSearchParams } from "next/dist/client/components/navigation";

interface Appliance {
  details: string;
  order_date: string;
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
  glazing_material: string; // New field for Glazed option
  door_color: string;
  end_panel_color: string;
  plinth_filler_color: string;
  cabinet_color: string;
  worktop_color: string;
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
  gable_lights_light_color: string;
  gable_lights_light_qty: string;
  gable_lights_profile_color: string;
  gable_lights_profile_qty: string;
  other_accessories: string;
  floor_protection: string[];
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
  tap_details: string;
  other_appliances: string;
  appliances: Appliance[];
  terms_date: string;
  gas_electric_info: string;
  appliance_promotion_info: string;
  signature_date: string;
}

export default function FormPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");

  const [formType, setFormType] = useState<"bedroom" | "kitchen">("bedroom");
  const [valid, setValid] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const [formData, setFormData] = useState<FormData>({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    room: '',
    survey_date: '',
    appointment_date: '',
    installation_date: '',
    completion_date: '',
    deposit_date: '',
    door_style: '',
    glazing_material: '', // Initialize new field
    door_color: '',
    end_panel_color: '',
    plinth_filler_color: '',
    cabinet_color: '',
    worktop_color: '',
    bedside_cabinets_type: '',
    bedside_cabinets_qty: '',
    dresser_desk: '',
    dresser_desk_details: '',
    internal_mirror: '',
    internal_mirror_details: '',
    mirror_type: '',
    mirror_qty: '',
    soffit_lights_type: '',
    soffit_lights_color: '',
    gable_lights_light_color: '',
    gable_lights_light_qty: '',
    gable_lights_profile_color: '',
    gable_lights_profile_qty: '',
    other_accessories: '',
    floor_protection: [],
    worktop_features: [],
    worktop_other_details: '',
    worktop_size: '',
    under_wall_unit_lights_color: '',
    under_wall_unit_lights_profile: '',
    under_worktop_lights_color: '',
    kitchen_accessories: '',
    appliances_customer_owned: '',
    sink_tap_customer_owned: '',
    sink_details: '',
    tap_details: '',
    other_appliances: '',
    appliances: [],
    terms_date: '',
    gas_electric_info: '',
    appliance_promotion_info: '',
    signature_date: ''
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

  // Type for fields that are not arrays or the appliances object
  type SingleField = keyof Omit<FormData, 'floor_protection' | 'worktop_features' | 'appliances'>;

  const handleInputChange = (field: SingleField, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckboxChange = (field: 'floor_protection' | 'worktop_features', value: string, checked: boolean) => {
    setFormData(prev => {
      const currentValues = prev[field];
      if (checked) {
        return { ...prev, [field]: [...currentValues, value] };
      } else {
        return { ...prev, [field]: currentValues.filter(v => v !== value) };
      }
    });
  };

  const handleApplianceChange = (index: number, field: keyof Appliance, value: string) => {
    setFormData(prev => {
      const appliances = [...prev.appliances];
      // Ensure the appliance object exists
      if (!appliances[index]) {
        appliances[index] = { details: '', order_date: '' };
      }
      appliances[index] = { ...appliances[index], [field]: value };
      return { ...prev, appliances };
    });
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

  const validateForm = () => {
    const errors: string[] = [];

    // Customer Information
    if (!formData.customer_name?.trim()) errors.push('Customer Name');
    if (!formData.customer_phone?.trim()) errors.push('Tel/Mobile Number');
    if (!formData.customer_address?.trim()) errors.push('Address');
    
    // Design Specifications
    if (formType === "kitchen" && !formData.door_style?.trim()) errors.push('Door Style'); // Only required for Kitchen now
    
    // Conditional Glazing Material
    if (formType === "kitchen" && formData.door_style === 'glazed' && !formData.glazing_material?.trim()) {
        errors.push('Glazing Material');
    }
    
    if (!formData.door_color?.trim()) errors.push('Door Color');
    if (!formData.end_panel_color?.trim()) errors.push('End Panel Color');
    if (!formData.plinth_filler_color?.trim()) errors.push('Plinth/Filler Color');
    if (!formData.cabinet_color?.trim()) errors.push('Cabinet Color');
    if (!formData.worktop_color?.trim()) errors.push('Worktop Color');

    if (formType === "bedroom") {
      if (!formData.room?.trim()) errors.push('Room');
      if (!formData.bedside_cabinets_type?.trim()) errors.push('Bedside Cabinets Type');
      if (!formData.bedside_cabinets_qty?.trim()) errors.push('Bedside Cabinets Quantity');
      if (!formData.dresser_desk?.trim()) errors.push('Dresser/Desk');
      if (!formData.internal_mirror?.trim()) errors.push('Internal Mirror');
      if (!formData.mirror_type?.trim()) errors.push('Mirror Type');
      if (!formData.mirror_qty?.trim()) errors.push('Mirror Quantity');
      if (!formData.soffit_lights_type?.trim()) errors.push('Soffit Lights Type');
      if (!formData.soffit_lights_color?.trim()) errors.push('Soffit Lights Color');
      if (!formData.gable_lights_light_color?.trim()) errors.push('Gable Lights - Light Color');
      if (!formData.gable_lights_light_qty?.trim()) errors.push('Gable Lights - Light Quantity');
      if (!formData.gable_lights_profile_color?.trim()) errors.push('Gable Lights - Profile Color');
      if (!formData.gable_lights_profile_qty?.trim()) errors.push('Gable Lights - Profile Quantity');
      if (!formData.other_accessories?.trim()) errors.push('Other/Misc/Accessories');
      if (formData.floor_protection.length === 0) errors.push('Floor Protection');
    }

    if (formType === "kitchen") {
      if (formData.worktop_features.length === 0) errors.push('Worktop Further Info');
      if (!formData.worktop_size?.trim()) errors.push('Worktop Size');
      if (!formData.under_wall_unit_lights_color?.trim()) errors.push('Under Wall Unit Lights Color');
      if (!formData.under_wall_unit_lights_profile?.trim()) errors.push('Under Wall Unit Lights Profile');
      if (!formData.under_worktop_lights_color?.trim()) errors.push('Under Worktop Lights Color');
      if (!formData.kitchen_accessories?.trim()) errors.push('Accessories');
      if (!formData.appliances_customer_owned?.trim()) errors.push('Appliances Customer Owned');
      if (!formData.sink_tap_customer_owned?.trim()) errors.push('Sink & Tap Customer Owned');
      
      if (formData.appliances_customer_owned === 'no') {
        const hasAppliances = formData.appliances.some(app => app.details?.trim() || app.order_date?.trim());
        if (!hasAppliances) errors.push('At least one Appliance detail');
      }
      
      if (formData.sink_tap_customer_owned === 'no') {
        if (!formData.sink_details?.trim()) errors.push('Sink Details');
        if (!formData.tap_details?.trim()) errors.push('Tap Details');
      }
    }

    // Terms
    if (!formData.terms_date?.trim()) errors.push('Date Terms and Conditions Given');
    if (!formData.gas_electric_info?.trim()) errors.push('Gas and Electric Installation Information');
    if (formType === "kitchen" && !formData.appliance_promotion_info?.trim()) {
      errors.push('Appliance Promotion Information');
    }

    // Signature
    if (!signatureData) errors.push('Customer Signature');
    if (!formData.signature_date?.trim()) errors.push('Signature Date');

    if (errors.length > 0) {
      setSubmitStatus({
        type: 'error',
        message: `Please fill in the following required fields: ${errors.join(', ')}`
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

    const token = searchParams.get("token") || '';
    const customerIdFromUrl = searchParams.get("customerId") || '';
    
    const finalFormData = {
      ...formData,
      signature_data: signatureData,
      form_type: formType,
      customer_id: customerIdFromUrl || formData.customer_id || '',
    };

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const response = await fetch('http://localhost:5000/submit-customer-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token || undefined,
          formData: finalFormData
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus({ 
          type: 'success', 
          message: result.message || 'Form submitted successfully! Redirecting...' 
        });
        
        // Redirect after 2 seconds
        setTimeout(() => {
          if (result.customer_id) {
            // Redirect to customer details page
            window.location.href = `/dashboard/customers/${result.customer_id}`;
          } else {
            // Fallback: redirect to customers list
            window.location.href = '/dashboard/customers';
          }
        }, 2000);
      } else {
        setSubmitStatus({ 
          type: 'error', 
          message: result.error || 'Failed to submit form' 
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: 'Network error. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };	

  if (!valid) return <p className="p-6 text-center">Invalid or expired link.</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Installation Checklist</h1>
              <p className="text-gray-600 mt-1">Complete installation verification form</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <form className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-2 text-center">
            {formType === "kitchen" ? "Kitchen Installation Checklist" : "Bedroom Installation Checklist"}
          </h2>
          <p className="text-sm text-gray-600 text-center mb-6">All fields are mandatory</p>

          {submitStatus.type && (
            <div className={`mb-6 p-4 rounded-lg ${
              submitStatus.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {submitStatus.message}
            </div>
          )}

          {/* Customer Information */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                {/* All Inputs use w-full now */}
                <Input 
                  placeholder="Enter customer name" 
                  className="w-full" 
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tel/Mobile Number</label>
                <Input 
                  placeholder="Enter phone number" 
                  type="tel" 
                  className="w-full" 
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <Input 
                  placeholder="Enter full address" 
                  className="w-full" 
                  value={formData.customer_address}
                  onChange={(e) => handleInputChange('customer_address', e.target.value)}
                />
              </div>
              {formType === "bedroom" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                  <Input 
                    placeholder="Enter room details" 
                    className="w-full" 
                    value={formData.room}
                    onChange={(e) => handleInputChange('room', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Design Specifications */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Design Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
              {/* Door Style - Only visible for Kitchen */}
              {formType === "kitchen" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Door Style</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.door_style}
                    onChange={(e) => handleInputChange('door_style', e.target.value)}
                  >
                    <option value="">Select door style</option>
                    <option value="vinyl">Vinyl</option>
                    <option value="slab">Slab</option>
                    <option value="glazed">Glazed</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {/* Glazing Material - Only visible if Door Style is Glazed (and Form is Kitchen) */}
              {formType === "kitchen" && formData.door_style === 'glazed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Glazing Material</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.glazing_material}
                    onChange={(e) => handleInputChange('glazing_material', e.target.value)}
                  >
                    <option value="">Select material</option>
                    <option value="vinyl">Vinyl</option>
                    <option value="aluprne">Aluprne</option>
                  </select>
                </div>
              )}

              {/* Door Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Door Color</label>
                <Input 
                  placeholder="Enter door color" 
                  className="w-full"
                  value={formData.door_color}
                  onChange={(e) => handleInputChange('door_color', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Panel Color</label>
                <Input 
                  placeholder="Enter end panel color" 
                  className="w-full"
                  value={formData.end_panel_color}
                  onChange={(e) => handleInputChange('end_panel_color', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plinth/Filler Color</label>
                <Input 
                  placeholder="Enter plinth/filler color" 
                  className="w-full"
                  value={formData.plinth_filler_color}
                  onChange={(e) => handleInputChange('plinth_filler_color', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cabinet Color</label>
                <Input 
                  placeholder="Enter cabinet color" 
                  className="w-full"
                  value={formData.cabinet_color}
                  onChange={(e) => handleInputChange('cabinet_color', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formType === "bedroom" ? "Worktop Color" : "Worktop Material/Color"}
                </label>
                <Input 
                  placeholder="Enter worktop details" 
                  className="w-full"
                  value={formData.worktop_color}
                  onChange={(e) => handleInputChange('worktop_color', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Bedroom Specific */}
          {formType === "bedroom" && (
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Bedroom Specifications</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bedside Cabinets</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.bedside_cabinets_type}
                      onChange={(e) => handleInputChange('bedside_cabinets_type', e.target.value)}
                    >
                      <option value="">Select option</option>
                      <option value="floating">Floating</option>
                      <option value="fitted">Fitted</option>
                      <option value="freestand">Freestand</option>
                    </select>
                    <Input 
                      placeholder="Quantity" 
                      className="w-full mt-2" 
                      type="number"
                      value={formData.bedside_cabinets_qty}
                      onChange={(e) => handleInputChange('bedside_cabinets_qty', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dresser/Desk</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.dresser_desk}
                      onChange={(e) => handleInputChange('dresser_desk', e.target.value)}
                    >
                      <option value="">Select option</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <Input 
                      placeholder="QTY/Size" 
                      className="w-full mt-2"
                      value={formData.dresser_desk_details}
                      onChange={(e) => handleInputChange('dresser_desk_details', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Internal Mirror</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.internal_mirror}
                      onChange={(e) => handleInputChange('internal_mirror', e.target.value)}
                    >
                      <option value="">Select option</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <Input 
                      placeholder="QTY/Size" 
                      className="w-full mt-2"
                      value={formData.internal_mirror_details}
                      onChange={(e) => handleInputChange('internal_mirror_details', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mirror</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.mirror_type}
                      onChange={(e) => handleInputChange('mirror_type', e.target.value)}
                    >
                      <option value="">Select option</option>
                      <option value="silver">Silver</option>
                      <option value="bronze">Bronze</option>
                      <option value="grey">Grey</option>
                    </select>
                    <Input 
                      placeholder="Quantity" 
                      className="w-full mt-2" 
                      type="number"
                      value={formData.mirror_qty}
                      onChange={(e) => handleInputChange('mirror_qty', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soffit Lights</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.soffit_lights_type}
                      onChange={(e) => handleInputChange('soffit_lights_type', e.target.value)}
                    >
                      <option value="">Select type</option>
                      <option value="spot">Spot</option>
                      <option value="strip">Strip</option>
                    </select>
                    <Input 
                      placeholder="Colour" 
                      className="w-full mt-2"
                      value={formData.soffit_lights_color}
                      onChange={(e) => handleInputChange('soffit_lights_color', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gable Lights</label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {/* select/Input elements also use w-full via their container/flex-1 */}
                        <select 
                          className="flex-1 p-2 border border-gray-300 rounded-md"
                          value={formData.gable_lights_light_color}
                          onChange={(e) => handleInputChange('gable_lights_light_color', e.target.value)}
                        >
                          <option value="">Light Colour</option>
                          <option value="cool-white">Cool White</option>
                          <option value="warm-white">Warm White</option>
                        </select>
                        <Input 
                          placeholder="QTY" 
                          type="number" 
                          className="w-20"
                          value={formData.gable_lights_light_qty}
                          onChange={(e) => handleInputChange('gable_lights_light_qty', e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 p-2 border border-gray-300 rounded-md"
                          value={formData.gable_lights_profile_color}
                          onChange={(e) => handleInputChange('gable_lights_profile_color', e.target.value)}
                        >
                          <option value="">Profile Colour</option>
                          <option value="black">Black</option>
                          <option value="white">White</option>
                        </select>
                        <Input 
                          placeholder="QTY" 
                          type="number" 
                          className="w-20"
                          value={formData.gable_lights_profile_qty}
                          onChange={(e) => handleInputChange('gable_lights_profile_qty', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other/Misc/Accessories</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-md h-20 resize-none"
                    placeholder="Enter additional items or notes"
                    value={formData.other_accessories}
                    onChange={(e) => handleInputChange('other_accessories', e.target.value)}
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Floor Protection</label>
                  <div className="space-y-2">
                    {['Carpet Protection', 'Floor Tile Protection', 'No Floor Protection Required'].map((item) => (
                      <label key={item} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded"
                          value={item}
                          checked={formData.floor_protection.includes(item)}
                          onChange={(e) => handleCheckboxChange('floor_protection', item, e.target.checked)}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Kitchen Specific */}
          {formType === "kitchen" && (
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Kitchen Specifications</h3>
              <div className="space-y-6">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Worktop Further Info</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Upstand', 'Splashback', 'Wall Cladding', 'Sink Cut Out', 'Drainer Grooves', 'Hob Cut Out', 'Window Cill', 'LED Grooves'].map((item) => (
                      <label key={item} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded"
                          value={item}
                          checked={formData.worktop_features.includes(item)}
                          onChange={(e) => handleCheckboxChange('worktop_features', item, e.target.checked)}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                  </div>
                  <Input 
                    placeholder="Other details" 
                    className="w-full mt-2"
                    value={formData.worktop_other_details}
                    onChange={(e) => handleInputChange('worktop_other_details', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Worktop Size</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.worktop_size}
                    onChange={(e) => handleInputChange('worktop_size', e.target.value)}
                  >
                    <option value="">Select thickness</option>
                    <option value="12mm">12mm</option>
                    <option value="18mm">18mm</option>
                    <option value="20mm">20mm</option>
                    <option value="25mm">25mm</option>
                    <option value="30mm">30mm</option>
                    <option value="38mm">38mm</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Under Wall Unit Lights</label>
                    <div className="space-y-2">
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={formData.under_wall_unit_lights_color}
                        onChange={(e) => handleInputChange('under_wall_unit_lights_color', e.target.value)}
                      >
                        <option value="">Main Colour</option>
                        <option value="cool-white">Cool White</option>
                        <option value="warm-white">Warm White</option>
                      </select>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={formData.under_wall_unit_lights_profile}
                        onChange={(e) => handleInputChange('under_wall_unit_lights_profile', e.target.value)}
                      >
                        <option value="">Profile Colour</option>
                        <option value="black">Black</option>
                        <option value="white">White</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Under Worktop Lights</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.under_worktop_lights_color}
                      onChange={(e) => handleInputChange('under_worktop_lights_color', e.target.value)}
                    >
                      <option value="">Colour</option>
                      <option value="cool-white">Cool White</option>
                      <option value="warm-white">Warm White</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accessories</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-md h-20 resize-none"
                    placeholder="Enter accessory details"
                    value={formData.kitchen_accessories}
                    onChange={(e) => handleInputChange('kitchen_accessories', e.target.value)}
                  ></textarea>
                </div>

                {/* Appliances Customer Owned */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Appliances Customer Owned</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md" // w-full applied here
                    value={formData.appliances_customer_owned}
                    onChange={(e) => handleInputChange('appliances_customer_owned', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {/* Appliances List - Only show if customer owned is "no" */}
                {formData.appliances_customer_owned === 'no' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Appliances</label>
                    <div className="space-y-4">
                      {[
                        'Oven', 'Microwave', 'Washing Machine', 'HOB', 
                        'Extractor', 'INTG Dishwasher', 'INTEG Fridge/Freezer'
                      ].map((appliance, idx) => (
                        <div key={appliance} className="grid grid-cols-2 gap-3"> {/* Changed to 2 columns */}
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{appliance} Details</label>
                            <Input
                              placeholder={`${appliance} details`}
                              className="w-full"
                              value={formData.appliances[idx]?.details || ''}
                              onChange={(e) => handleApplianceChange(idx, 'details', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Order Date</label>
                            <input
                              type="date"
                              className="w-full p-2 border border-gray-300 rounded-md"
                              value={formData.appliances[idx]?.order_date || ''}
                              onChange={(e) => handleApplianceChange(idx, 'order_date', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Other / Misc</label>
                        <Input 
                          placeholder="Enter any additional appliances" 
                          className="w-full"
                          value={formData.other_appliances}
                          onChange={(e) => handleInputChange('other_appliances', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sink & Tap Customer Owned */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sink & Tap Customer Owned</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md" // w-full applied here
                    value={formData.sink_tap_customer_owned}
                    onChange={(e) => handleInputChange('sink_tap_customer_owned', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {/* Sink & Tap Details - Only show if customer owned is "no" */}
                {formData.sink_tap_customer_owned === 'no' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sink</label>
                      <Input 
                        placeholder="Sink details" 
                        className="w-full"
                        value={formData.sink_details}
                        onChange={(e) => handleInputChange('sink_details', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tap</label>
                      <Input 
                        placeholder="Tap details" 
                        className="w-full"
                        value={formData.tap_details}
                        onChange={(e) => handleInputChange('tap_details', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terms and Conditions */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Terms & Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Terms and Conditions Given</label>
                <Input 
                  type="date" 
                  className="w-full" // w-full applied here
                  value={formData.terms_date}
                  onChange={(e) => handleInputChange('terms_date', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gas and Electric Installation {formType === "kitchen" ? "Information" : "Terms"} Given</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md" // w-full applied here
                  value={formData.gas_electric_info}
                  onChange={(e) => handleInputChange('gas_electric_info', e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              {formType === "kitchen" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appliance Promotion Information Given</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md" // w-full applied here
                    value={formData.appliance_promotion_info}
                    onChange={(e) => handleInputChange('appliance_promotion_info', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Statement */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-3 font-medium">
              I confirm that the above specification and all annotated plans and elevations with this pack are correct.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Please sign below to confirm.
            </p>
          </div>

          {/* Signature Section */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Customer Signature</h3>
            
            <div className="mb-4">
              <div className="flex gap-4 mb-3">
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="signature-upload"
                    onChange={handleSignatureUpload}
                  />
                  <label htmlFor="signature-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Click to upload signature image</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                  </label>
                  {signatureData && (
                    <div className="mt-4">
                      <img src={signatureData} alt="Signature" className="max-h-32 mx-auto border rounded" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full cursor-crosshair bg-white rounded-lg"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ touchAction: 'none' }}
                  />
                  <div className="p-2 border-t bg-gray-50 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearSignature}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <Input 
                type="date" 
                className="w-full" // w-full applied here
                value={formData.signature_date}
                onChange={(e) => handleInputChange('signature_date', e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center pt-6 border-t">
            <Button 
              className="px-8 py-2 text-lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Form'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}