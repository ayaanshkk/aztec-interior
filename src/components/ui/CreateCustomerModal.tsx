"use client";
import React, { useState } from "react";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchWithAuth } from "@/lib/api"; // Import the centralized API helper

type ProjectType = 'Bedroom' | 'Kitchen' | 'Other';

interface Address {
  line_1: string;
  line_2?: string;
  line_3?: string;
  post_town: string;
  postcode: string;
  formatted_address: string;
}

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: () => void;
}

export function CreateCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
}: CreateCustomerModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    postcode: "",
    salesperson: "",
    project_types: [] as ProjectType[],
    marketing_opt_in: false,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<string>("");

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleProjectTypeToggle = (type: ProjectType) => {
    setFormData((prev) => {
      const currentTypes = prev.project_types || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type];
      return { ...prev, project_types: newTypes };
    });
  };

  const searchAddresses = async () => {
    if (!formData.postcode || formData.postcode.trim() === "") {
      setErrors((prev) => ({ ...prev, postcode: "Please enter a postcode" }));
      return;
    }

    setLoadingAddresses(true);
    setAddresses([]);
    setSelectedAddressIndex("");
    setShowManualAddress(false);

    try {
      const apiKey = '4cu8sEIbO0-xTvMTuNam1A48205';
      // Use the Find endpoint - returns all addresses in ONE call
      const cleanPostcode = formData.postcode.replace(/\s/g, '');
      const response = await fetch(
        `https://api.getaddress.io/find/${encodeURIComponent(cleanPostcode)}?api-key=${apiKey}&expand=true`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("API Response:", data);
        
        if (data.addresses && data.addresses.length > 0) {
          const formattedAddresses: Address[] = data.addresses.map((addr: any) => ({
            line_1: addr.line_1 || addr.formatted_address?.[0] || '',
            line_2: addr.line_2 || addr.formatted_address?.[1] || '',
            line_3: addr.line_3 || addr.formatted_address?.[2] || '',
            post_town: addr.town_or_city || addr.formatted_address?.[5] || '',
            postcode: formData.postcode,
            formatted_address: addr.formatted_address?.filter(Boolean).join(', ') || 
                            [addr.line_1, addr.line_2, addr.line_3, addr.town_or_city, formData.postcode]
                              .filter(Boolean).join(', ')
          }));
          
          setAddresses(formattedAddresses);
          console.log("Formatted addresses:", formattedAddresses);
        } else {
          console.log("No addresses in response");
          setShowManualAddress(true);
        }
      } else {
        const errorText = await response.text();
        console.error("API Error:", response.status, response.statusText, errorText);
        
        if (response.status === 404) {
          alert("No addresses found for this postcode, or API key issue.");
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
      setFormData((prev) => ({
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

    if (!formData.phone || formData.phone.trim() === "") {
      newErrors.phone = "Phone is required";
    }

    if (!formData.postcode || formData.postcode.trim() === "") {
      newErrors.postcode = "Postcode is required";
    }

    if (!formData.address || formData.address.trim() === "") {
      newErrors.address = "Address is required";
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
      // Use the centralized fetchWithAuth function
      // It will automatically handle the token and construct the correct URL
      const response = await fetchWithAuth('/customers', { // ✅ Add leading slash
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create customer");
      }

      onCustomerCreated();
      handleClose();
    } catch (error) {
      console.error("Error creating customer:", error);
      alert(`Error creating customer: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      postcode: "",
      salesperson: "",
      project_types: [],
      marketing_opt_in: false,
      notes: "",
    });
    setErrors({});
    setAddresses([]);
    setShowManualAddress(false);
    setSelectedAddressIndex("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
          <DialogDescription>
            Add a new customer to your database. You can generate forms for them later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter customer name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && (
                <span className="text-red-500 text-xs">{errors.phone}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="postcode">
              Postcode <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="postcode"
                placeholder="Enter postcode"
                value={formData.postcode}
                onChange={(e) => {
                  handleChange("postcode", e.target.value.toUpperCase());
                  setAddresses([]);
                  setSelectedAddressIndex("");
                }}
                className={errors.postcode ? "border-red-500" : ""}
              />
              <Button
                type="button"
                onClick={searchAddresses}
                disabled={loadingAddresses}
                variant="outline"
              >
                <Search className="h-4 w-4 mr-2" />
                {loadingAddresses ? "..." : "Find"}
              </Button>
            </div>
            {errors.postcode && (
              <span className="text-red-500 text-xs">{errors.postcode}</span>
            )}
          </div>

          {addresses.length > 0 && (
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="address-select">
                Select Address <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={selectedAddressIndex}
                onValueChange={selectAddress}
              >
                <SelectTrigger id="address-select" className={errors.address ? "border-red-500" : ""}>
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
                <span className="text-red-500 text-xs">{errors.address}</span>
              )}
              <Button
                type="button"
                variant="link"
                className="text-sm self-start p-0 h-auto"
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
            <div className="flex flex-col space-y-1.5">
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                No addresses found for this postcode. Please enter your address manually.
              </div>
              <Label htmlFor="address">
                Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="address"
                placeholder="Enter full address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className={errors.address ? "border-red-500" : ""}
                rows={3}
              />
              {errors.address && (
                <span className="text-red-500 text-xs">{errors.address}</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="salesperson">Salesperson</Label>
              <Select
                value={formData.salesperson}
                onValueChange={(value) => handleChange("salesperson", value)}
              >
                <SelectTrigger id="salesperson">
                  <SelectValue placeholder="Select salesperson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alice Smith">Alice Smith</SelectItem>
                  <SelectItem value="Bob Johnson">Bob Johnson</SelectItem>
                  <SelectItem value="Carol Williams">Carol Williams</SelectItem>
                  <SelectItem value="David Brown">David Brown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label>Project Type</Label>
              <div className="flex flex-col space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bedroom"
                    checked={formData.project_types.includes('Bedroom')}
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
                    checked={formData.project_types.includes('Kitchen')}
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
                    checked={formData.project_types.includes('Other')}
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="marketing"
              checked={formData.marketing_opt_in}
              onCheckedChange={(checked) =>
                handleChange("marketing_opt_in", checked === true)
              }
            />
            <label
              htmlFor="marketing"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Customer consents to marketing communications
            </label>
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes or comments"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Customer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}