"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchWithAuth } from "@/lib/api";

const JOB_TYPES = ["Kitchen", "Bedroom", "Wardrobe", "Remedial", "Other"];

const WORK_STAGES = [
  { value: "Survey", label: "Survey", icon: "📏" },
  { value: "Delivery", label: "Delivery", icon: "🚚" },
  { value: "Installation", label: "Installation", icon: "🏗️" },
];

interface FormData {
  job_type: string;
  job_name: string;
  customer_id: string;
  team_member: string;
  start_date: string;
  end_date: string;
  notes: string;
  work_stage: string;
}

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  customerId?: string;
}

export default function CreateTaskModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  customerId 
}: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [attachedForms, setAttachedForms] = useState<any[]>([]);
  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCustomTeamMember, setIsCustomTeamMember] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    job_type: "",
    job_name: "",
    customer_id: customerId || "",
    team_member: "",
    start_date: "",
    end_date: "",
    notes: "",
    work_stage: "Survey",
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, formData.customer_id]);

  useEffect(() => {
    if (customerId) {
      setFormData(prev => ({ ...prev, customer_id: customerId }));
    }
  }, [customerId]);

  const loadData = async () => {
    try {
      console.log("🔄 Loading data for create task modal...");
      
      // Fetch customers
      const customersRes = await fetchWithAuth("customers");
      console.log("📡 Customers response:", customersRes.status);
      
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        console.log("✅ Customers loaded:", customersData.length);
        setCustomers(customersData);
      }

      // Fetch team members from existing tasks
      const tasksRes = await fetchWithAuth("tasks");
      console.log("📡 Tasks response:", tasksRes.status);
      
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        
        const uniqueTeamMembers = Array.from(
          new Set(
            tasksData
              .map((task: any) => task.team_member)
              .filter((name: string | null) => name && name.trim() !== "")
          )
        ) as string[];
        
        console.log("✅ Team members loaded:", uniqueTeamMembers.length);
        setTeamMembers(uniqueTeamMembers);
      }

      // Fetch unlinked forms for selected customer
      if (formData.customer_id) {
        const formsRes = await fetchWithAuth(`forms/unlinked?customer_id=${formData.customer_id}`);
        if (formsRes.ok) {
          const formsData = await formsRes.json();
          console.log("✅ Unlinked forms loaded:", formsData.length);
          setAvailableForms(formsData);
        }
      }
    } catch (error) {
      console.error("❌ Error loading data:", error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const attachForm = (formId: string) => {
    const form = availableForms.find((f) => f.id === parseInt(formId));
    if (form && !attachedForms.find((f) => f.id === form.id)) {
      setAttachedForms((prev) => [...prev, form]);
      setAvailableForms((prev) => prev.filter((f) => f.id !== form.id));
    }
  };

  const detachForm = (formId: number) => {
    const form = attachedForms.find((f) => f.id === formId);
    if (form) {
      setAvailableForms((prev) => [...prev, form]);
      setAttachedForms((prev) => prev.filter((f) => f.id !== formId));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.job_type) newErrors.job_type = "Task type is required";
    if (!formData.customer_id) newErrors.customer_id = "Customer is required";
    if (!formData.start_date) newErrors.start_date = "Start date is required";
    if (!formData.end_date) newErrors.end_date = "End date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = {
        client_id: formData.customer_id,
        type: formData.job_type,
        title: formData.job_name || `${formData.job_type} Task`,
        team_member: formData.team_member || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        work_stage: formData.work_stage,
        notes: formData.notes || "",
        job_type: formData.job_type,
        status: "Scheduled",
        attached_forms: attachedForms.map((f) => f.id),
      };

      console.log("📤 Submitting task data:", submitData);

      const response = await fetchWithAuth("tasks", {
        method: "POST",
        body: JSON.stringify(submitData),
      });

      console.log("📡 Response status:", response.status);

      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to create task: ${response.status}`);
        } else {
          const htmlText = await response.text();
          console.error("❌ Server returned HTML instead of JSON:", htmlText.substring(0, 500));
          throw new Error(`Server error (${response.status}): The server encountered an error.`);
        }
      }

      if (contentType && contentType.includes("application/json")) {
        const newTask = await response.json();
        console.log("✅ Task created successfully:", newTask);
        
        // Reset form
        setFormData({
          job_type: "",
          job_name: "",
          customer_id: customerId || "",
          team_member: "",
          start_date: "",
          end_date: "",
          notes: "",
          work_stage: "Survey",
        });
        setAttachedForms([]);
        setErrors({});
        
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        console.error("❌ Response is not JSON:", contentType);
        throw new Error("Server returned an invalid response format");
      }
      
    } catch (error: any) {
      console.error("❌ Error creating task:", error);
      
      let errorMessage = "Error creating task";
      
      if (error.message.includes("not valid JSON") || error.message.includes("<!doctype")) {
        errorMessage = "Server error: The backend returned an invalid response.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timeout: The server is taking too long to respond.";
      } else {
        errorMessage = error.message;
      }
      
      setErrors({
        submit: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new task
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Task Type *</Label>
                <Select value={formData.job_type} onValueChange={(v) => handleInputChange("job_type", v)}>
                  <SelectTrigger className={errors.job_type ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.job_type && <p className="mt-1 text-sm text-red-500">{errors.job_type}</p>}
              </div>

              <div>
                <Label>Task Name</Label>
                <Input
                  placeholder="e.g., Kitchen Installation"
                  value={formData.job_name}
                  onChange={(e) => handleInputChange("job_name", e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Work Stage *</Label>
                <Select value={formData.work_stage} onValueChange={(v) => handleInputChange("work_stage", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select work stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_STAGES.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        <div className="flex items-center gap-2">
                          <span>{stage.icon}</span>
                          <span>{stage.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-500">
                  Track task execution progress (default: Survey)
                </p>
              </div>
            </div>
          </div>

          {/* Customer & Team */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Customer & Team</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Customer *</Label>
                <Select value={formData.customer_id} onValueChange={(v) => handleInputChange("customer_id", v)}>
                  <SelectTrigger className={errors.customer_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customer_id && <p className="mt-1 text-sm text-red-500">{errors.customer_id}</p>}
              </div>

              <div>
                <Label>Team Member</Label>
                <div className="space-y-2">
                  {!isCustomTeamMember ? (
                    <Select 
                      value={formData.team_member} 
                      onValueChange={(v) => {
                        if (v === "__custom__") {
                          setIsCustomTeamMember(true);
                          handleInputChange("team_member", "");
                        } else {
                          handleInputChange("team_member", v);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select or add team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="text-blue-600 font-medium">
                          + Add New Team Member
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter team member name"
                        value={formData.team_member}
                        onChange={(e) => handleInputChange("team_member", e.target.value)}
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCustomTeamMember(false);
                          handleInputChange("team_member", "");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Schedule</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange("start_date", e.target.value)}
                  className={errors.start_date ? "border-red-500" : ""}
                />
                {errors.start_date && <p className="mt-1 text-sm text-red-500">{errors.start_date}</p>}
              </div>

              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange("end_date", e.target.value)}
                  className={errors.end_date ? "border-red-500" : ""}
                />
                {errors.end_date && <p className="mt-1 text-sm text-red-500">{errors.end_date}</p>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
            <div>
              <Label>Additional Notes</Label>
              <Textarea
                rows={3}
                placeholder="Add any extra details..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </div>
          </div>

          {/* Attach Forms */}
          {availableForms.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Attach Existing Forms</h3>
              {availableForms.map((form) => (
                <div key={form.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Form #{form.id}</p>
                    <p className="text-sm text-gray-500">
                      Submitted: {new Date(form.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => attachForm(form.id.toString())}>
                    <Plus className="mr-2 h-4 w-4" />
                    Attach
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Attached Forms */}
          {attachedForms.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Attached Forms</h3>
              {attachedForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3"
                >
                  <div>
                    <p className="font-medium">Form #{form.id}</p>
                    <p className="text-sm text-gray-600">
                      Submitted: {new Date(form.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => detachForm(form.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}