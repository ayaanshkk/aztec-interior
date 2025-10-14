"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const FIELD_LABELS: Record<string, string> = {
  first_name: "First Name",
  last_name: "Last Name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  postcode: "Postcode",
  kitchen_size: "Kitchen Size",
  bedroom_count: "Number of Bedrooms",
  notes: "Notes",
};

type ProjectType = 'Bedroom' | 'Kitchen' | 'Other';

interface Address {
  line_1: string;
  line_2?: string;
  line_3?: string;
  post_town: string;
  postcode: string;
  formatted_address: string;
}

export default function CustomerEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [customer, setCustomer] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<string>("");

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
        
        // If customer already has an address, show manual input
        if (data.address) {
          setShowManualAddress(true);
        }
      })
      .catch((err) => console.error("Error loading customer:", err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCustomerChange = (field: string, value: string) => {
    setCustomer((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleProjectTypeToggle = (type: ProjectType) => {
    setCustomer((prev: any) => {
      const currentTypes = prev.project_types || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t: ProjectType) => t !== type)
        : [...currentTypes, type];
      return { ...prev, project_types: newTypes };
    });
  };

  const handleFormDataChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const searchAddresses = async () => {
    if (!customer.postcode || customer.postcode.trim() === "") {
      setErrors((prev) => ({ ...prev, postcode: "Please enter a postcode" }));
      return;
    }

    setLoadingAddresses(true);
    setAddresses([]);
    setSelectedAddressIndex("");
    setShowManualAddress(false);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GETADDRESS_API_KEY; // Your API key
      // Use autocomplete endpoint with postcode filter
      const response = await fetch(
        `https://api.getaddress.io/autocomplete/${encodeURIComponent(customer.postcode)}?api-key=${apiKey}&all=true`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("API Response:", data); // Debug log
        
        if (data.suggestions && data.suggestions.length > 0) {
          // Fetch full address details for each suggestion
          const addressPromises = data.suggestions.map((suggestion: any) =>
            fetch(`https://api.getaddress.io/get/${suggestion.id}?api-key=${apiKey}`)
              .then(res => res.json())
          );
          
          const addressDetails = await Promise.all(addressPromises);
          
          const formattedAddresses: Address[] = addressDetails.map((addr: any) => ({
            line_1: addr.line_1,
            line_2: addr.line_2,
            line_3: addr.line_3,
            post_town: addr.town_or_city,
            postcode: customer.postcode,
            formatted_address: [
              addr.line_1,
              addr.line_2,
              addr.line_3,
              addr.town_or_city,
              customer.postcode
            ].filter(Boolean).join(', ')
          }));
          
          setAddresses(formattedAddresses);
          console.log("Formatted addresses:", formattedAddresses); // Debug log
        } else {
          // No addresses found - show manual entry with warning
          console.log("No addresses in response"); // Debug log
          setShowManualAddress(true);
        }
      } else {
        // API error - show manual entry with warning
        const errorText = await response.text();
        console.error("API Error:", response.status, response.statusText, errorText); // Debug log
        
        if (response.status === 404) {
          alert("API Key Error: The getAddress.io API key appears to be invalid. Please check your API key configuration.");
        }
        setShowManualAddress(true);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
      setShowManualAddress(true);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const selectAddress = (index: string) => {
    const address = addresses[parseInt(index)];
    if (address) {
      setSelectedAddressIndex(index);
      setCustomer((prev: any) => ({
        ...prev,
        address: address.formatted_address
      }));
      if (errors.address) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.address;
          return newErrors;
        });
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!customer.phone || customer.phone.trim() === "") {
      newErrors.phone = "Phone is required";
    }

    if (!customer.address || customer.address.trim() === "") {
      newErrors.address = "Address is required";
    }

    if (!customer.postcode || customer.postcode.trim() === "") {
      newErrors.postcode = "Postcode is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

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
      alert("Error updating customer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/customers/${id}`);
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!customer) return <div className="p-8">Customer not found.</div>;

  return (
    <div className="min-h-screen bg-white">
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

      <div className="px-8 py-6">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex flex-col">
              <Label className="text-sm text-gray-500 font-medium mb-1">Name</Label>
              <Input
                value={customer.name || ""}
                onChange={(e) => handleCustomerChange("name", e.target.value)}
              />
            </div>
            
            <div className="flex flex-col">
              <Label className="text-sm text-gray-500 font-medium mb-1">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                value={customer.phone || ""}
                onChange={(e) => handleCustomerChange("phone", e.target.value)}
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && (
                <span className="text-red-500 text-xs mt-1">{errors.phone}</span>
              )}
            </div>

            <div className="flex flex-col">
              <Label className="text-sm text-gray-500 font-medium mb-1">Email</Label>
              <Input
                type="email"
                value={customer.email || ""}
                onChange={(e) => handleCustomerChange("email", e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <Label className="text-sm text-gray-500 font-medium mb-1">
                Postcode <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={customer.postcode || ""}
                  onChange={(e) => {
                    handleCustomerChange("postcode", e.target.value.toUpperCase());
                    setAddresses([]);
                    setSelectedAddressIndex("");
                  }}
                  className={errors.postcode ? "border-red-500" : ""}
                  placeholder="Enter postcode"
                />
                <Button
                  type="button"
                  onClick={searchAddresses}
                  disabled={loadingAddresses}
                  variant="outline"
                  size="sm"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {loadingAddresses ? "..." : "Find"}
                </Button>
              </div>
              {errors.postcode && (
                <span className="text-red-500 text-xs mt-1">{errors.postcode}</span>
              )}
            </div>
          </div>

          {addresses.length > 0 && (
            <div className="flex flex-col mt-6">
              <Label className="text-sm text-gray-500 font-medium mb-1">
                Select Address <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={selectedAddressIndex}
                onValueChange={selectAddress}
              >
                <SelectTrigger className={errors.address ? "border-red-500" : ""}>
                  <SelectValue placeholder="Choose your address from the list" />
                </SelectTrigger>
                <SelectContent>
                  {addresses.map((addr, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {addr.formatted_address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.address && (
                <span className="text-red-500 text-xs mt-1">{errors.address}</span>
              )}
              <Button
                type="button"
                variant="link"
                className="text-sm self-start p-0 h-auto mt-2"
                onClick={() => {
                  setShowManualAddress(true);
                  setAddresses([]);
                  setSelectedAddressIndex("");
                }}
              >
                Can't find your address? Enter manually
              </Button>
            </div>
          )}

          {showManualAddress && (
            <div className="flex flex-col mt-6">
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded mb-3">
                No addresses found for this postcode. Please enter your address manually.
              </div>
              <Label className="text-sm text-gray-500 font-medium mb-1">
                Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={customer.address || ""}
                onChange={(e) => handleCustomerChange("address", e.target.value)}
                className={errors.address ? "border-red-500" : ""}
                rows={3}
              />
              {errors.address && (
                <span className="text-red-500 text-xs mt-1">{errors.address}</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-6">
            <div className="flex flex-col">
              <Label className="text-sm text-gray-500 font-medium mb-1">Preferred Contact Method</Label>
              <Select
                value={customer.preferred_contact_method || "Phone"}
                onValueChange={(value) => handleCustomerChange("preferred_contact_method", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Phone">Phone</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col">
              <Label className="text-sm text-gray-500 font-medium mb-1">Stage</Label>
              <Select
                value={customer.status || "Lead"}
                onValueChange={(value) => handleCustomerChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Quote">Quote</SelectItem>
                  <SelectItem value="Consultation">Consultation</SelectItem>
                  <SelectItem value="Survey">Survey</SelectItem>
                  <SelectItem value="Measure">Measure</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Quoted">Quoted</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="OnHold">On Hold</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Delivery">Delivery</SelectItem>
                  <SelectItem value="Installation">Installation</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="Remedial">Remedial</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col">
              <Label className="text-sm text-gray-500 font-medium mb-2">
                Project Types
              </Label>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bedroom"
                    checked={customer.project_types?.includes('Bedroom')}
                    onCheckedChange={() => handleProjectTypeToggle('Bedroom')}
                  />
                  <label
                    htmlFor="bedroom"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Bedroom
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="kitchen"
                    checked={customer.project_types?.includes('Kitchen')}
                    onCheckedChange={() => handleProjectTypeToggle('Kitchen')}
                  />
                  <label
                    htmlFor="kitchen"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Kitchen
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="other"
                    checked={customer.project_types?.includes('Other')}
                    onCheckedChange={() => handleProjectTypeToggle('Other')}
                  />
                  <label
                    htmlFor="other"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Other
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Label className="text-sm text-gray-500 font-medium mb-1">Notes</Label>
            <Textarea
              value={customer.notes || ""}
              onChange={(e) => handleCustomerChange("notes", e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {Object.entries(FIELD_LABELS).map(([key, label]) => {
              if (key === 'phone' || key === 'address' || key === 'postcode') return null;
              
              return (
                <div key={key} className="flex flex-col">
                  <Label className="text-sm text-gray-500 font-medium mb-1">{label}</Label>
                  {key === "notes" ? (
                    <Textarea
                      value={formData[key] || ""}
                      onChange={(e) => handleFormDataChange(key, e.target.value)}
                    />
                  ) : (
                    <Input
                      value={formData[key] || ""}
                      onChange={(e) => handleFormDataChange(key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 flex justify-end space-x-2">
          <Button onClick={handleCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>{submitting ? "Saving..." : "Save Changes"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}