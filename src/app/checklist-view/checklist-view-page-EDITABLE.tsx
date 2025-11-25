"use client";
import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, X, Trash2, ArrowLeft, Edit, Upload, PenTool } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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

interface FormData {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  room: string;
  fitting_style: string;
  door_style: string;
  glazing_material: string;
  door_color: string;
  end_panel_color: string;
  plinth_filler_color: string;
  worktop_color: string;
  cabinet_color: string;
  handles_code: string;
  handles_quantity: string;
  handles_size: string;
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
  signature_data: string;
  form_type: string;
}

export default function ChecklistViewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formSubmissionId = searchParams.get("id");
  
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [originalFormData, setOriginalFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Signature drawing states
  const [signatureMode, setSignatureMode] = useState("view");
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempSignatureData, setTempSignatureData] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  type Point = { x: number; y: number } | null;
  const [lastPoint, setLastPoint] = useState<Point>(null);

  // Check permissions
  const canEdit = () => {
    if (!user) return false;
    return ["Manager", "HR", "Sales", "Production"].includes(user.role);
  };

  const canDelete = () => {
    if (!user) return false;
    return ["Manager", "HR", "Sales", "Production"].includes(user.role);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          router.push("/login");
          return;
        }

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
  }, [router]);

  useEffect(() => {
    if (!formSubmissionId) {
      setError("No form submission ID provided");
      setLoading(false);
      return;
    }

    const fetchFormData = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(
          `https://aztec-interiors.onrender.com/form-submissions/${formSubmissionId}`,
          { headers }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch form data");
        }

        const data = await response.json();
        let parsedFormData = typeof data.form_data === "string" 
          ? JSON.parse(data.form_data) 
          : data.form_data;

        // Ensure arrays are properly formatted
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

  // Signature drawing functions
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
      setTempSignatureData(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setTempSignatureData("");
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempSignatureData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const applySignature = () => {
    if (tempSignatureData) {
      setFormData(prev => prev ? { ...prev, signature_data: tempSignatureData } : null);
    }
    setSignatureMode("view");
    setTempSignatureData("");
  };

  const cancelSignatureEdit = () => {
    setSignatureMode("view");
    setTempSignatureData("");
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
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
    setSignatureMode("view");
    setTempSignatureData("");
  };

  const handleSave = async () => {
    if (!formData || !canEdit() || isSaving) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `https://aztec-interiors.onrender.com/form-submissions/${formSubmissionId}`,
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
        setSignatureMode("view");
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
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `https://aztec-interiors.onrender.com/form-submissions/${formSubmissionId}`,
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
  const integUnitGridTemplate = showOrderDate ? "grid-cols-[0.5fr_1fr_1fr_1fr]" : "grid-cols-[0.5fr_1fr_1fr]";
  const standardAppliances = ["Oven", "Microwave", "Washing Machine", "HOB", "Extractor", "INTG Dishwasher"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Delete Dialog */}
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

      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
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
                <p className="mt-1 text-gray-600">
                  {isEditing ? "Make changes to the checklist" : "View and manage checklist"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
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
                  {canEdit() && (
                    <Button
                      onClick={handleEdit}
                      className="flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Button>
                  )}
                  {canDelete() && (
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
        </div>
      </div>

      {/* Form Content */}
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-center text-xl font-semibold">
            {formType === "kitchen" ? "Kitchen Installation Checklist" : "Bedroom Installation Checklist"}
          </h2>
          <p className="mb-6 text-center text-sm text-gray-600">
            {isEditing ? "Editing Mode - Make your changes below" : "View Mode - Click Edit to make changes"}
          </p>

          {/* Customer Information */}
          <div className="mb-8">
            <h3 className="mb-4 border-b pb-2 text-lg font-medium text-gray-800">Customer Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Customer Name</label>
                <Input
                  placeholder="Enter customer name"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange("customer_name", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tel/Mobile Number</label>
                <Input
                  placeholder="Enter phone number"
                  type="tel"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
                <Input
                  placeholder="Enter full address"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.customer_address}
                  onChange={(e) => handleInputChange("customer_address", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              {formType === "bedroom" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Room</label>
                  <Input
                    placeholder="Enter room details"
                    className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                    value={formData.room}
                    onChange={(e) => handleInputChange("room", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Design Specifications */}
          <div className="mb-8">
            <h3 className="mb-4 border-b pb-2 text-lg font-medium text-gray-800">Design Specifications</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Fitting Style */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fitting Style</label>
                <select
                  className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.fitting_style}
                  onChange={(e) => handleInputChange("fitting_style", e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="">Select fitting style</option>
                  <option value="inframe">Inframe</option>
                  <option value="overlay">Overlay</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              {/* Door Style */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Door Style</label>
                <select
                  className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.door_style}
                  onChange={(e) => handleInputChange("door_style", e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="">Select door style</option>
                  <option value="vinyl">Vinyl</option>
                  <option value="slab">Slab</option>
                  {formType === "kitchen" && <option value="glazed">Glazed</option>}
                  <option value="shaker">Shaker</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              {/* Glazing Material - Only visible if Door Style is Glazed (Kitchen only) */}
              {formType === "kitchen" && formData.door_style === "glazed" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Glazing Material</label>
                  <select
                    className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                    value={formData.glazing_material}
                    onChange={(e) => handleInputChange("glazing_material", e.target.value)}
                    disabled={!isEditing}
                  >
                    <option value="">Select material</option>
                    <option value="vinyl">Vinyl</option>
                    <option value="aluminium">Aluminium</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              )}

              {/* Door Color */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Door Color</label>
                <Input
                  placeholder="Enter door color"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.door_color}
                  onChange={(e) => handleInputChange("door_color", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">End Panel Color</label>
                <Input
                  placeholder="Enter end panel color"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.end_panel_color}
                  onChange={(e) => handleInputChange("end_panel_color", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Plinth/Filler Color</label>
                <Input
                  placeholder="Enter plinth/filler color"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.plinth_filler_color}
                  onChange={(e) => handleInputChange("plinth_filler_color", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {formType === "bedroom" ? "Worktop Color" : "Worktop Material/Color"}
                </label>
                <Input
                  placeholder="Enter worktop details"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.worktop_color}
                  onChange={(e) => handleInputChange("worktop_color", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cabinet Color</label>
                <Input
                  placeholder="Enter cabinet color"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.cabinet_color}
                  onChange={(e) => handleInputChange("cabinet_color", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              {/* Handles - Code, Quantity, Size */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Handles Code</label>
                <Input
                  placeholder="Enter handles code"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.handles_code}
                  onChange={(e) => handleInputChange("handles_code", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Handles Quantity</label>
                <Input
                  placeholder="Enter quantity"
                  type="text"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.handles_quantity}
                  onChange={(e) => handleInputChange("handles_quantity", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Handles Size</label>
                <Input
                  placeholder="Enter size (e.g., 128mm)"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.handles_size}
                  onChange={(e) => handleInputChange("handles_size", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* Bedroom Specific */}
          {formType === "bedroom" && (
            <div className="mb-8">
              <h3 className="mb-4 border-b pb-2 text-lg font-medium text-gray-800">Bedroom Specifications</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Bedside Cabinets</label>
                    <select
                      className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                      value={formData.bedside_cabinets_type}
                      onChange={(e) => handleInputChange("bedside_cabinets_type", e.target.value)}
                      disabled={!isEditing}
                    >
                      <option value="">Select option</option>
                      <option value="floating">Floating</option>
                      <option value="fitted">Fitted</option>
                      <option value="freestand">Freestand</option>
                      <option value="N/A">N/A</option>
                    </select>
                    <Input
                      placeholder="Quantity"
                      className={`mt-2 w-full ${!isEditing ? "bg-gray-50" : ""}`}
                      type="text"
                      value={formData.bedside_cabinets_qty}
                      onChange={(e) => handleInputChange("bedside_cabinets_qty", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Dresser/Desk</label>
                    <select
                      className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                      value={formData.dresser_desk}
                      onChange={(e) => handleInputChange("dresser_desk", e.target.value)}
                      disabled={!isEditing}
                    >
                      <option value="">Select option</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="N/A">N/A</option>
                    </select>
                    <Input
                      placeholder="QTY/Size"
                      className={`mt-2 w-full ${!isEditing ? "bg-gray-50" : ""}`}
                      value={formData.dresser_desk_details}
                      onChange={(e) => handleInputChange("dresser_desk_details", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Internal Mirror</label>
                    <select
                      className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                      value={formData.internal_mirror}
                      onChange={(e) => handleInputChange("internal_mirror", e.target.value)}
                      disabled={!isEditing}
                    >
                      <option value="">Select option</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="N/A">N/A</option>
                    </select>
                    <Input
                      placeholder="QTY/Size"
                      className={`mt-2 w-full ${!isEditing ? "bg-gray-50" : ""}`}
                      value={formData.internal_mirror_details}
                      onChange={(e) => handleInputChange("internal_mirror_details", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Mirror</label>
                    <select
                      className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                      value={formData.mirror_type}
                      onChange={(e) => handleInputChange("mirror_type", e.target.value)}
                      disabled={!isEditing}
                    >
                      <option value="">Select option</option>
                      <option value="silver">Silver</option>
                      <option value="bronze">Bronze</option>
                      <option value="grey">Grey</option>
                      <option value="N/A">N/A</option>
                    </select>
                    <Input
                      placeholder="Quantity"
                      className={`mt-2 w-full ${!isEditing ? "bg-gray-50" : ""}`}
                      type="text"
                      value={formData.mirror_qty}
                      onChange={(e) => handleInputChange("mirror_qty", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {/* Soffit Lights and Gable Lights in same row */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Soffit Lights</label>
                    <div className="flex gap-2">
                      <select
                        className={`flex-1 rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                        value={formData.soffit_lights_type}
                        onChange={(e) => handleInputChange("soffit_lights_type", e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="">Select type</option>
                        <option value="spot">Spot</option>
                        <option value="strip">Strip</option>
                        <option value="N/A">N/A</option>
                      </select>
                      <select
                        className={`flex-1 rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                        value={formData.soffit_lights_color}
                        onChange={(e) => handleInputChange("soffit_lights_color", e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="">Colour</option>
                        <option value="cool-white">Cool White</option>
                        <option value="warm-white">Warm White</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Gable Lights</label>
                    <div className="space-y-2">
                      <select
                        className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                        value={formData.gable_lights_type}
                        onChange={(e) => handleInputChange("gable_lights_type", e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="">Select type</option>
                        <option value="rocker">Rocker</option>
                        <option value="sensor">Sensor</option>
                        <option value="N/A">N/A</option>
                      </select>
                      <select
                        className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                        value={formData.gable_lights_main_color}
                        onChange={(e) => handleInputChange("gable_lights_main_color", e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="">Main Colour</option>
                        <option value="cool-white">Cool White</option>
                        <option value="warm-white">Warm White</option>
                        <option value="N/A">N/A</option>
                      </select>
                      <select
                        className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                        value={formData.gable_lights_profile_color}
                        onChange={(e) => handleInputChange("gable_lights_profile_color", e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="">Profile Colour</option>
                        <option value="black">Black</option>
                        <option value="white">White</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Other/Misc/Accessories</label>
                  <textarea
                    className={`h-20 w-full resize-none rounded-md border border-gray-300 p-3 ${!isEditing ? "bg-gray-50" : ""}`}
                    placeholder="Enter additional items or notes"
                    value={formData.other_accessories}
                    onChange={(e) => handleInputChange("other_accessories", e.target.value)}
                    disabled={!isEditing}
                  ></textarea>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Floor Protection</label>
                  <div className="space-y-2">
                    {["Carpet Protection", "Floor Tile Protection", "No Floor Protection Required"].map((item) => (
                      <label key={item} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          className="rounded"
                          value={item}
                          checked={formData.floor_protection.includes(item)}
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
          )}

          {/* Kitchen Specific */}
          {formType === "kitchen" && (
            <div className="mb-8">
              <h3 className="mb-4 border-b pb-2 text-lg font-medium text-gray-800">Kitchen Specifications</h3>
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Worktop Further Info</label>
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
                          disabled={!isEditing}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                  </div>
                  <Input
                    placeholder="Other details"
                    className={`mt-2 w-full ${!isEditing ? "bg-gray-50" : ""}`}
                    value={formData.worktop_other_details}
                    onChange={(e) => handleInputChange("worktop_other_details", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Worktop Size</label>
                  <select
                    className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                    value={formData.worktop_size}
                    onChange={(e) => handleInputChange("worktop_size", e.target.value)}
                    disabled={!isEditing}
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Under Wall Unit Lights</label>
                    <div className="space-y-2">
                      <select
                        className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                        value={formData.under_wall_unit_lights_color}
                        onChange={(e) => handleInputChange("under_wall_unit_lights_color", e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="">Main Colour</option>
                        <option value="cool-white">Cool White</option>
                        <option value="warm-white">Warm White</option>
                        <option value="N/A">N/A</option>
                      </select>
                      <select
                        className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                        value={formData.under_wall_unit_lights_profile}
                        onChange={(e) => handleInputChange("under_wall_unit_lights_profile", e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="">Profile Colour</option>
                        <option value="black">Black</option>
                        <option value="white">White</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Under Worktop Lights</label>
                    <select
                      className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                      value={formData.under_worktop_lights_color}
                      onChange={(e) => handleInputChange("under_worktop_lights_color", e.target.value)}
                      disabled={!isEditing}
                    >
                      <option value="">Colour</option>
                      <option value="cool-white">Cool White</option>
                      <option value="warm-white">Warm White</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Accessories</label>
                  <textarea
                    className={`h-20 w-full resize-none rounded-md border border-gray-300 p-3 ${!isEditing ? "bg-gray-50" : ""}`}
                    placeholder="Enter accessory details"
                    value={formData.kitchen_accessories}
                    onChange={(e) => handleInputChange("kitchen_accessories", e.target.value)}
                    disabled={!isEditing}
                  ></textarea>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Appliances Customer Owned</label>
                  <select
                    className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                    value={formData.appliances_customer_owned}
                    onChange={(e) => handleInputChange("appliances_customer_owned", e.target.value)}
                    disabled={!isEditing}
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>

                {!!formData.appliances_customer_owned && (
                  <div>
                    <label className="mt-4 mb-2 block text-sm font-medium text-gray-700">
                      {formData.appliances_customer_owned === "yes"
                        ? "Customer Owned Appliances Details"
                        : "Client Supplied Appliances Details (Require Order Date/Make/Model)"}
                    </label>
                    <div className="space-y-4">
                      {standardAppliances.map((appliance, idx) => (
                        <div key={appliance} className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">{appliance}</label>
                          <div className={`grid ${standardApplianceGridTemplate} gap-3`}>
                            <div>
                              <label className="mb-1 block text-xs text-gray-600">Make</label>
                              <Input
                                placeholder={`${appliance} make`}
                                className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                                value={formData.appliances[idx]?.make || ""}
                                onChange={(e) => handleApplianceChange(idx, "make", e.target.value)}
                                disabled={!isEditing}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-gray-600">Model</label>
                              <Input
                                placeholder={`${appliance} model`}
                                className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                                value={formData.appliances[idx]?.model || ""}
                                onChange={(e) => handleApplianceChange(idx, "model", e.target.value)}
                                disabled={!isEditing}
                              />
                            </div>
                            {showOrderDate && (
                              <div>
                                <label className="mb-1 block text-xs text-gray-600">Order Date</label>
                                <input
                                  type="date"
                                  className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                                  value={formData.appliances[idx]?.order_date || ""}
                                  onChange={(e) => handleApplianceChange(idx, "order_date", e.target.value)}
                                  disabled={!isEditing}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Other / Misc Appliances</label>
                        <Input
                          placeholder="Enter any additional appliances"
                          className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                          value={formData.other_appliances}
                          onChange={(e) => handleInputChange("other_appliances", e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Sink & Tap Customer Owned</label>
                  <select
                    className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                    value={formData.sink_tap_customer_owned}
                    onChange={(e) => handleInputChange("sink_tap_customer_owned", e.target.value)}
                    disabled={!isEditing}
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>

                {!!formData.sink_tap_customer_owned && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Sink Details</label>
                      <Input
                        placeholder="Sink details (e.g., Make/Model/Size)"
                        className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                        value={formData.sink_details}
                        onChange={(e) => handleInputChange("sink_details", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Tap Details</label>
                      <Input
                        placeholder="Tap details (e.g., Make/Model)"
                        className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                        value={formData.tap_details}
                        onChange={(e) => handleInputChange("tap_details", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terms and Conditions */}
          <div className="mb-8">
            <h3 className="mb-4 border-b pb-2 text-lg font-medium text-gray-800">Terms & Information</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date Terms and Conditions Given</label>
                <Input
                  type="date"
                  className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.terms_date}
                  onChange={(e) => handleInputChange("terms_date", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Gas and Electric Installation {formType === "kitchen" ? "Information" : "Terms"} Given
                </label>
                <select
                  className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                  value={formData.gas_electric_info}
                  onChange={(e) => handleInputChange("gas_electric_info", e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
              {formType === "kitchen" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Appliance Promotion Information Given
                  </label>
                  <select
                    className={`w-full rounded-md border border-gray-300 p-2 ${!isEditing ? "bg-gray-50" : ""}`}
                    value={formData.appliance_promotion_info}
                    onChange={(e) => handleInputChange("appliance_promotion_info", e.target.value)}
                    disabled={!isEditing}
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
          <div className="mb-8 rounded-lg bg-gray-50 p-4">
            <p className="mb-3 text-sm font-medium text-gray-700">
              I confirm that the above specification and all annotated plans and elevations with this pack are correct.
            </p>
            <p className="mb-4 text-sm text-gray-600">Customer signature below.</p>
          </div>

          {/* Signature Section */}
          <div className="mb-8">
            <h3 className="mb-4 border-b pb-2 text-lg font-medium text-gray-800">Customer Signature</h3>

            {!isEditing || signatureMode === "view" ? (
              <div>
                <div className="mb-4 rounded-lg border border-gray-300 bg-white p-4">
                  {formData.signature_data ? (
                    <img 
                      src={formData.signature_data} 
                      alt="Customer Signature" 
                      className="mx-auto max-h-40 rounded"
                    />
                  ) : (
                    <p className="text-center text-gray-400">No signature available</p>
                  )}
                </div>
                {isEditing && (
                  <div className="mb-3 flex gap-4">
                    <Button
                      type="button"
                      onClick={() => setSignatureMode("upload")}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload New Signature
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setSignatureMode("draw")}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <PenTool className="h-4 w-4" />
                      Draw New Signature
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {signatureMode === "upload" ? (
                  <div className="mb-4 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="signature-upload-edit"
                      onChange={handleSignatureUpload}
                    />
                    <label htmlFor="signature-upload-edit" className="cursor-pointer">
                      <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600">Click to upload signature image</p>
                      <p className="mt-1 text-xs text-gray-400">PNG, JPG up to 10MB</p>
                    </label>
                    {tempSignatureData && (
                      <div className="mt-4">
                        <img src={tempSignatureData} alt="New Signature" className="mx-auto max-h-32 rounded border" />
                      </div>
                    )}
                  </div>
                ) : signatureMode === "draw" ? (
                  <div className="mb-4 rounded-lg border border-gray-300">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={150}
                      className="w-full cursor-crosshair rounded-lg bg-white"
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
                ) : null}

                {signatureMode !== "view" && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelSignatureEdit}
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={applySignature}
                      size="sm"
                      disabled={!tempSignatureData}
                    >
                      Apply Signature
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
              <Input
                type="date"
                className={`w-full ${!isEditing ? "bg-gray-50" : ""}`}
                value={formData.signature_date}
                onChange={(e) => handleInputChange("signature_date", e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}