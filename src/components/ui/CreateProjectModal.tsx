"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Briefcase, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BACKEND_URL } from "@/lib/api";

const PROJECT_TYPES = ["Kitchen", "Bedroom", "Wardrobe", "Remedial", "Other"];

// stage_type=4 from Stage_Master + Lead (stage_id=1, stage_type=1)
// Backend looks up stage_id by name — no hardcoded mapping needed
const PROJECT_STAGES = [
  "Lead",
  "Survey",
  "Design",
  "Quote",
  "Accepted",
  "Rejected",
  "Ordered",
  "Production",
  "Delivery",
  "Installation",
  "Complete",
  "Remedial",
  "Cancelled",
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

export default function CreateProjectModal({ open, onOpenChange, onSuccess, customerId, customerName }: CreateProjectModalProps) {
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
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_name.trim()) {
      setErrors({ project_name: "Project name is required" });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Send stage_name — backend looks it up in Stage_Master by name
      // No hardcoded ID mapping needed
      const response = await fetch(`${BACKEND_URL}/customers/${customerId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          project_title:   formData.project_name,
          project_type:    formData.project_type,
          stage_name:      formData.stage,
          date_of_measure: formData.date_of_measure || null,
          notes:           formData.notes || "",
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed (${response.status})`);
      }

      setFormData({ project_name: "", project_type: "Kitchen", stage: "Lead", date_of_measure: "", notes: "" });
      setErrors({});
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      setErrors({ submit: error.message || "Failed to create project" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ project_name: "", project_type: "Kitchen", stage: "Lead", date_of_measure: "", notes: "" });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8" type="button">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <DialogTitle className="text-2xl font-bold">Create New Project</DialogTitle>
          </div>
        </DialogHeader>

        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">Linked Customer: {customerName}</p>
          <p className="text-xs text-blue-700">ID: {customerId}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project_name" className="text-base">Project Name <span className="text-red-500">*</span></Label>
            <Input id="project_name" placeholder="e.g. Kitchen Renovation"
              value={formData.project_name}
              onChange={e => handleInputChange("project_name", e.target.value)}
              className={`h-11 ${errors.project_name ? "border-red-500" : ""}`} />
            {errors.project_name && <p className="text-sm text-red-500">{errors.project_name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base">Project Type <span className="text-red-500">*</span></Label>
              <Select value={formData.project_type} onValueChange={v => handleInputChange("project_type", v)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base">Initial Stage <span className="text-red-500">*</span></Label>
              <Select value={formData.stage} onValueChange={v => handleInputChange("stage", v)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_measure" className="text-base">Date of Measure (Optional)</Label>
            <Input id="date_of_measure" type="date" value={formData.date_of_measure}
              onChange={e => handleInputChange("date_of_measure", e.target.value)} className="h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base">Notes / Scope of Work (Optional)</Label>
            <Textarea id="notes" placeholder="Enter any initial notes or details about the project scope."
              value={formData.notes} onChange={e => handleInputChange("notes", e.target.value)}
              className="min-h-[100px] resize-none" />
          </div>

          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading} className="min-w-[200px] bg-gray-900 hover:bg-gray-800">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                       : <><Briefcase className="mr-2 h-4 w-4" />Create Project</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}