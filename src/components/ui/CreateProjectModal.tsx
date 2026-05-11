"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Briefcase, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BACKEND_URL } from "@/lib/api";

const PROJECT_TYPES = ["Kitchen", "Bedroom", "Wardrobe", "Remedial", "Other"];

const PROJECT_STAGES = [
  "Lead",
  "Quote",
  "Consultation",
  "Survey",
  "Measure",
  "Design",
  "Quoted",
  "Production",
  "Installation",
  "Complete",
  "Remedial",
  "Other",
];

interface FormData {
  project_name: string;
  project_type: string;
  stage: string;
  date_of_measure: string;
  notes: string;
}

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  customerId: string;
  customerName: string;
}

export default function CreateProjectModal({
  open,
  onOpenChange,
  onSuccess,
  customerId,
  customerName,
}: CreateProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    project_name: "",
    project_type: "Kitchen",
    stage: "Lead",
    date_of_measure: "",
    notes: "",
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.project_name.trim()) {
      newErrors.project_name = "Project name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) return;

		setLoading(true);
		try {
			const token = localStorage.getItem("token");

			// ✅ Map stage names to stage_id (stage_type = 4 for projects)
			const stageMapping: Record<string, number> = {
				'Lead': 100,
				'Quote': 101,
				'Consultation': 102,
				'Survey': 103,
				'Measure': 104,
				'Design': 105,
				'Quoted': 106,
				'Accepted': 107,
				'Rejected': 108,
				'Ordered': 109,
				'Production': 110,
				'Delivery': 111,
				'Installation': 112,
				'Complete': 113,
				'Remedial': 114,
				'Cancelled': 115,
				'Other': 103, // Default to Survey
			};

			const submitData = {
				client_id: parseInt(customerId),  // ✅ Use client_id, not customer_id
				project_title: formData.project_name,
				project_type: formData.project_type,  // ✅ Send as-is (Kitchen, Bedroom, etc.)
				stage_id: stageMapping[formData.stage],  // ✅ Convert stage name to stage_id
				date_of_measure: formData.date_of_measure || null,
				notes: formData.notes || "",
			};

			console.log("📤 Submitting project data:", submitData);

			const response = await fetch(`${BACKEND_URL}/customers/${customerId}/projects`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(submitData),
			});

			console.log("📡 Response status:", response.status);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
				throw new Error(errorData.error || `Failed to create project: ${response.status}`);
			}

			const newProject = await response.json();
			console.log("✅ Project created successfully:", newProject);

			// Reset form
			setFormData({
				project_name: "",
				project_type: "Kitchen",
				stage: "Lead",
				date_of_measure: "",
				notes: "",
			});
			setErrors({});

			alert("Project created successfully!");
			onOpenChange(false);
			if (onSuccess) onSuccess();
		} catch (error: any) {
			console.error("❌ Error creating project:", error);
			setErrors({
				submit: error.message || "Failed to create project",
			});
		} finally {
			setLoading(false);
		}
	};

  const handleClose = () => {
    setFormData({
      project_name: "",
      project_type: "Kitchen",
      stage: "Lead",
      date_of_measure: "",
      notes: "",
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
              type="button"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <DialogTitle className="text-2xl font-bold">Create New Project</DialogTitle>
          </div>
        </DialogHeader>

        {/* Customer Info Banner */}
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">
            Linked Customer: {customerName}
          </p>
          <p className="text-xs text-blue-700">ID: {customerId}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project_name" className="text-base">
              Project Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="project_name"
              placeholder="Customer's Project"
              value={formData.project_name}
              onChange={(e) => handleInputChange("project_name", e.target.value)}
              required
              className={`h-11 ${errors.project_name ? "border-red-500" : ""}`}
            />
            {errors.project_name && (
              <p className="text-sm text-red-500">{errors.project_name}</p>
            )}
          </div>

          {/* Project Type and Initial Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_type" className="text-base">
                Project Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.project_type}
                onValueChange={(value) => handleInputChange("project_type", value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage" className="text-base">
                Initial Stage <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => handleInputChange("stage", value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date of Measure */}
          <div className="space-y-2">
            <Label htmlFor="date_of_measure" className="text-base">
              Date of Measure (Optional)
            </Label>
            <Input
              id="date_of_measure"
              type="date"
              value={formData.date_of_measure}
              onChange={(e) => handleInputChange("date_of_measure", e.target.value)}
              className="h-11"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base">
              Notes / Scope of Work (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Enter any initial notes or details about the project scope."
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Error Message */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[200px] bg-gray-900 hover:bg-gray-800"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Briefcase className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}