"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchWithAuth } from "@/lib/api";

const JOB_TYPES = ["Kitchen", "Bedroom", "Wardrobe", "Remedial", "Other"];

interface FormData {
  job_type: string;
  job_name: string;
  customer_id: string;
  team_member: string;
  salesperson_name: string;
  measure_date: string;
  completion_date: string;
  notes: string;
  priority: string; 
}

export default function CreateJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    customer_id: searchParams?.get("customerId") || "",
    team_member: "",
    salesperson_name: "",
    measure_date: "",
    completion_date: "",
    notes: "",
    priority: "Medium",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch customers
        const customersRes = await fetchWithAuth("customers");
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData);
        }

        // Fetch team members from existing jobs
        const jobsRes = await fetchWithAuth("jobs");
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          
          const uniqueTeamMembers = Array.from(
            new Set(
              jobsData
                .map((job: any) => job.assigned_team_name)
                .filter((name: string | null) => name && name.trim() !== "")
            )
          ) as string[];
          
          setTeamMembers(uniqueTeamMembers);
        }

        // Fetch unlinked forms for selected customer
        if (formData.customer_id) {
          const formsRes = await fetchWithAuth(`forms/unlinked?customer_id=${formData.customer_id}`);
          if (formsRes.ok) setAvailableForms(await formsRes.json());
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [formData.customer_id]);

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
    if (!formData.job_type) newErrors.job_type = "Job type is required";
    if (!formData.customer_id) newErrors.customer_id = "Customer is required";
    if (!formData.measure_date) newErrors.measure_date = "Measure date is required";
    if (!formData.completion_date) newErrors.completion_date = "Completion date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = {
        customer_id: formData.customer_id,
        job_type: formData.job_type,
        job_name: formData.job_name || null,
        team_member: formData.team_member || null,
        salesperson_name: formData.salesperson_name || null,
        measure_date: formData.measure_date,
        completion_date: formData.completion_date,
        priority: formData.priority,
        notes: formData.notes || "",
        attached_forms: attachedForms.map((f) => f.id),
      };

      console.log("📤 Submitting job data:", submitData);

      const response = await fetchWithAuth("jobs", {
        method: "POST",
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create job");
      }

      const newJob = await response.json();
      
      // ✅ FIXED: Redirect to jobs list instead of job details
      router.push(`/dashboard/jobs?success=created`);
      
    } catch (error) {
      console.error("❌ Error creating job:", error);
      setErrors({
        submit: error instanceof Error ? error.message : "Error creating job",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center space-x-3 border-b bg-white px-8 py-6">
        <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="mr-1 h-5 w-5" />
        </button>
        <h1 className="text-3xl font-semibold text-gray-900">Create Job</h1>
      </header>

      <main className="mx-auto max-w-3xl px-8 py-10">
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Basic Information */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Basic Information</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label>Job Type *</Label>
                <Select value={formData.job_type} onValueChange={(v) => handleInputChange("job_type", v)}>
                  <SelectTrigger className={errors.job_type ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select job type" />
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
                <Label>Job Name</Label>
                <Input
                  placeholder="e.g., Kitchen Installation"
                  value={formData.job_name}
                  onChange={(e) => handleInputChange("job_name", e.target.value)}
                />
              </div>

              {/* ✅ NEW: Priority Field */}
              <div>
                <Label>Priority *</Label>
                <Select value={formData.priority} onValueChange={(v) => handleInputChange("priority", v)}>
                  <SelectTrigger className={errors.priority ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && <p className="mt-1 text-sm text-red-500">{errors.priority}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  Default is Medium if not selected
                </p>
              </div>
            </div>
          </section>

          {/* Customer & Team */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Customer & Team</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    <>
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
                          <SelectValue placeholder="Select or add new team member" />
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
                    </>
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
                <p className="mt-1 text-xs text-gray-500">
                  Select from existing team members or add a new one
                </p>
              </div>
            </div>

            {/* ✅ NEW: Salesperson field */}
            <div className="mt-6">
              <Label>Salesperson</Label>
              <Input
                placeholder="e.g., John Smith"
                value={formData.salesperson_name}
                onChange={(e) => handleInputChange("salesperson_name", e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank to use the customer's salesperson
              </p>
            </div>
          </section>

          {/* Schedule */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Schedule</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label>Measure Date *</Label>
                <Input
                  type="date"
                  value={formData.measure_date}
                  onChange={(e) => handleInputChange("measure_date", e.target.value)}
                  className={errors.measure_date ? "border-red-500" : ""}
                />
                {errors.measure_date && <p className="mt-1 text-sm text-red-500">{errors.measure_date}</p>}
              </div>

              <div>
                <Label>Completion Date *</Label>
                <Input
                  type="date"
                  value={formData.completion_date}
                  onChange={(e) => handleInputChange("completion_date", e.target.value)}
                  className={errors.completion_date ? "border-red-500" : ""}
                />
                {errors.completion_date && <p className="mt-1 text-sm text-red-500">{errors.completion_date}</p>}
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Notes</h2>
            <div className="space-y-4">
              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  rows={4}
                  placeholder="Add any extra details..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Attach Forms */}
          {availableForms.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-800">Attach Existing Forms</h2>

              <div className="space-y-3">
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
            </section>
          )}

          {/* Attached Forms */}
          {attachedForms.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-800">Attached Forms</h2>

              <div className="space-y-3">
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
            </section>
          )}

          {/* Error Message */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}