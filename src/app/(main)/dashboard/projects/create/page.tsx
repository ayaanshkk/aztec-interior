"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api"; // Import the centralized API helper

// --- Enums based on your backend models ---
const PROJECT_TYPES = ["Kitchen", "Bedroom", "Wardrobe", "Remedial", "Other"];
const JOB_STAGES = [
  "Lead",
  "Quote",
  "Consultation",
  "Survey",
  "Measure",
  "Design",
  "Quoted",
  "Accepted",
  "Rejected",
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
  date_of_measure: Date | undefined;
  notes?: string; // <--- FIX: Add '?' to make it optional
}

export default function CreateProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const customerId = searchParams.get("customerId") || "";
  const customerName = searchParams.get("customerName") || "New Customer";

  const [formData, setFormData] = useState<FormData>({
    project_name: "",
    project_type: PROJECT_TYPES[0],
    stage: JOB_STAGES[0],
    date_of_measure: undefined,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set a default project name based on the customer once component mounts
    if (customerName && !formData.project_name) {
      setFormData((prev) => ({
        ...prev,
        project_name: `${customerName}'s Project (${formData.project_type})`,
      }));
    }
  }, [customerName, formData.project_type]);

  if (!customerId) {
    return <div className="p-8 text-center text-red-600">Error: Customer ID is missing.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };

      // Update project name default if project type changes
      if (
        name === "project_type" &&
        prev.project_name &&
        prev.project_name.includes(customerName) &&
        prev.project_name.includes(prev.project_type)
      ) {
        // Only update the type part if the name is the auto-generated default
        newFormData.project_name = newFormData.project_name.replace(`(${prev.project_type})`, `(${value})`);
      } else if (name === "project_type" && customerName && !prev.project_name) {
        // If name is empty, create the default
        newFormData.project_name = `${customerName}'s Project (${value})`;
      }

      return newFormData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const token = localStorage.getItem("auth_token");

    // Check for the token before proceeding
    if (!token) {
      setError("Authentication error: Your session has expired. Please log in again.");
      setLoading(false);
      return;
    }

    const projectData = {
      ...formData,
      customer_id: customerId,
      date_of_measure: formData.date_of_measure ? format(formData.date_of_measure, "yyyy-MM-dd") : null,
      created_by: user?.id,
    };

    // Clean up empty notes field
    if (!projectData.notes) delete projectData.notes;

    try {
      // Use centralized fetchWithAuth
      const response = await fetchWithAuth(`customers/${customerId}/projects`, {
        method: "POST",
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Project "${data.project.project_name}" created successfully!`);
        // Navigate back to the customer details page
        router.push(`/dashboard/customers/${customerId}`);
      } else {
        // Improved error handling
        const errorData = await response.json().catch(() => ({
          error: `Server responded with status ${response.status}`,
          statusText: response.statusText,
        }));
        setError(`Failed to create project (${response.status}): ${errorData.error || errorData.statusText}`);
      }
    } catch (err) {
      // Network failure catch
      console.error("Network Error:", err);
      setError("Network error: Could not connect to the API server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-semibold text-gray-900">Create New Project</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-8">
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h2 className="text-lg font-medium text-blue-800">Linked Customer: {customerName}</h2>
          <p className="text-sm text-blue-600">ID: {customerId}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-gray-50 p-6 shadow">
          {/* Project Name */}
          <div className="space-y-2">
            <label htmlFor="project_name" className="text-sm font-medium text-gray-700">
              Project Name
            </label>
            <Input
              id="project_name"
              name="project_name"
              type="text"
              value={formData.project_name}
              onChange={handleChange}
              placeholder={`${customerName}'s Project`}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Project Type */}
            <div className="space-y-2">
              <label htmlFor="project_type" className="text-sm font-medium text-gray-700">
                Project Type
              </label>
              <Select
                name="project_type"
                value={formData.project_type}
                onValueChange={(val) => handleSelectChange("project_type", val)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
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

            {/* Stage */}
            <div className="space-y-2">
              <label htmlFor="stage" className="text-sm font-medium text-gray-700">
                Initial Stage
              </label>
              <Select
                name="stage"
                value={formData.stage}
                onValueChange={(val) => handleSelectChange("stage", val)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Stage" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_STAGES.map((stage) => (
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
            <label htmlFor="date_of_measure" className="text-sm font-medium text-gray-700">
              Date of Measure (Optional)
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date_of_measure && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date_of_measure ? format(formData.date_of_measure, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date_of_measure}
                  onSelect={(date) => setFormData((prev) => ({ ...prev, date_of_measure: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Notes / Scope of Work (Optional)
            </label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Enter any initial notes or details about the project scope."
              rows={4}
            />
          </div>

          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Project...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Project
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
