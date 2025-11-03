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
import { fetchWithAuth } from "@/lib/api"; // Import the centralized API helper

const JOB_TYPES = ["Kitchen", "Bedroom", "Wardrobe", "Remedial", "Other"];

interface FormData {
  job_type: string;
  job_name: string;
  customer_id: string;
  team_member: string;
  start_date: string;
  end_date: string;
  tags: string;
  notes: string;
}

export default function CreateJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [attachedForms, setAttachedForms] = useState<any[]>([]);
  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    job_type: "",
    job_name: "",
    customer_id: searchParams?.get("customerId") || "",
    team_member: "",
    start_date: "",
    end_date: "",
    tags: "",
    notes: "",
  });

  // Fetch customers, team members, and unlinked forms
  useEffect(() => {
    const loadData = async () => {
      try {
        // Use centralized fetchWithAuth
        const customersRes = await fetchWithAuth("customers");
        if (customersRes.ok) setCustomers(await customersRes.json());

        // Mock team members
        setTeamMembers([
          { id: 1, name: "John Smith" },
          { id: 2, name: "Sarah Johnson" },
          { id: 3, name: "Mike Wilson" },
        ]);

        if (formData.customer_id) {
          // Use centralized fetchWithAuth
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
        customer_id: parseInt(formData.customer_id),
        type: formData.job_type,
        job_name: formData.job_name,
        team_member: formData.team_member ? parseInt(formData.team_member) : null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        tags: formData.tags,
        notes: formData.notes,
        attached_forms: attachedForms.map((f) => f.id),
      };

      // Use centralized fetchWithAuth
      const response = await fetchWithAuth("jobs", {
        method: "POST",
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create job");
      }

      const newJob = await response.json();
      router.push(`/dashboard/jobs/${newJob.id}?success=created`);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "Error creating job",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center space-x-3 border-b bg-white px-8 py-6">
        <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="mr-1 h-5 w-5" />
        </button>
        <h1 className="text-3xl font-semibold text-gray-900">Create Job</h1>
      </header>

      {/* Main Form */}
      <main className="mx-auto max-w-3xl px-8 py-10">
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* --- Basic Information --- */}
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
            </div>
          </section>

          {/* --- Customer & Team --- */}
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
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customer_id && <p className="mt-1 text-sm text-red-500">{errors.customer_id}</p>}
              </div>

              <div>
                <Label>Team Member</Label>
                <Select value={formData.team_member} onValueChange={(v) => handleInputChange("team_member", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* --- Schedule --- */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Schedule</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
          </section>

          {/* --- Notes --- */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Notes</h2>
            <div className="space-y-4">
              <div>
                <Label>Tags</Label>
                <Input
                  placeholder="e.g., urgent, VIP"
                  value={formData.tags}
                  onChange={(e) => handleInputChange("tags", e.target.value)}
                />
              </div>

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

          {/* --- Attach Forms --- */}
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

          {/* --- Attached Forms --- */}
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

          {/* --- Error Message --- */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* --- Buttons --- */}
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
