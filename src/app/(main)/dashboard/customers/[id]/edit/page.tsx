"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mapping known form keys to friendly labels
const FIELD_LABELS: Record<string, string> = {
  first_name: "First Name",
  last_name: "Last Name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  kitchen_size: "Kitchen Size",
  bedroom_count: "Number of Bedrooms",
  notes: "Notes",
};

export default function CustomerEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [customer, setCustomer] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load customer data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`http://127.0.0.1:5000/customers/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch customer");
        return res.json();
      })
      .then((data) => {
        setCustomer(data);
        const submission = Array.isArray(data.form_submissions) && data.form_submissions.length > 0 
          ? data.form_submissions[0] 
          : {};
        const parsedFormData = typeof submission.form_data === "string"
          ? JSON.parse(submission.form_data || "{}")
          : submission.form_data || {};
        setFormData(parsedFormData);
      })
      .catch((err) => console.error("Error loading customer:", err))
      .finally(() => setLoading(false));
  }, [id]);

  // Handle customer field changes
  const handleCustomerChange = (field: string, value: string) => {
    setCustomer((prev: any) => ({ ...prev, [field]: value }));
  };

  // Handle form data changes
  const handleFormDataChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const updatedCustomer = {
        ...customer,
        form_submissions: [{ form_data: formData }],
      };

      const response = await fetch(`http://127.0.0.1:5000/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCustomer),
      });

      if (!response.ok) throw new Error("Failed to update customer");
      router.push(`/dashboard/customers/${id}`);
    } catch (err) {
      console.error("Error updating customer:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push(`/dashboard/customers/${id}`);
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!customer) return <div className="p-8">Customer not found.</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center space-x-2">
          <div
            onClick={() => router.push("/dashboard/customers")}
            className="flex items-center text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900">Update customer details</h1>
        </div>
      </div>

      {/* Main content */}
      <div className="px-8 py-6">
        <form onSubmit={handleSubmit}>
          {/* Customer Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="flex flex-col">
                <Label className="text-sm text-gray-500 font-medium">Name</Label>
                <Input
                  value={customer.name || ""}
                  onChange={(e) => handleCustomerChange("name", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex flex-col">
                <Label className="text-sm text-gray-500 font-medium">Email</Label>
                <Input
                  value={customer.email || ""}
                  onChange={(e) => handleCustomerChange("email", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex flex-col">
                <Label className="text-sm text-gray-500 font-medium">Phone</Label>
                <Input
                  value={customer.phone || ""}
                  onChange={(e) => handleCustomerChange("phone", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex flex-col">
                <Label className="text-sm text-gray-500 font-medium">Address</Label>
                <Input
                  value={customer.address || ""}
                  onChange={(e) => handleCustomerChange("address", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex flex-col">
                <Label className="text-sm text-gray-500 font-medium">Status</Label>
                <Select
                  value={customer.status || "unknown"}
                  onValueChange={(value) => handleCustomerChange("status", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Form Submission */}
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Submission</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <div key={key} className="flex flex-col">
                  <Label className="text-sm text-gray-500 font-medium">{label}</Label>
                  {key === "notes" ? (
                    <Textarea
                      value={formData[key] || ""}
                      onChange={(e) => handleFormDataChange(key, e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <Input
                      value={formData[key] || ""}
                      onChange={(e) => handleFormDataChange(key, e.target.value)}
                      className="mt-1"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Buttons at the end of the page */}
        <div className="mt-8 pt-8 border-t border-gray-200 flex justify-end space-x-2">
          <Button onClick={handleCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>{submitting ? "Saving..." : "Save"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}