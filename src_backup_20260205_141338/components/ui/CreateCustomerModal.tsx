"use client";
import React, { useState, useEffect } from "react";
import { X, Search, UserCheck } from "lucide-react"; // Added UserCheck icon
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
    SelectGroup, // Added SelectGroup for structure
    SelectItem,
    SelectLabel, // Added SelectLabel for structure
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { fetchWithAuth } from "@/lib/api";

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

// Custom Hook for persistent salesperson list
const useSalespersons = () => {
    const [salespersons, setSalespersons] = useState<string[]>([]);

    useEffect(() => {
        // Load from localStorage on mount
        const stored = localStorage.getItem('salespersons');
        if (stored) {
            setSalespersons(JSON.parse(stored));
        }
    }, []);

    const addSalesperson = (name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName || salespersons.includes(trimmedName)) return;

        // Add new name and save to localStorage
        setSalespersons(prev => {
            const newNames = [...prev, trimmedName].sort();
            localStorage.setItem('salespersons', JSON.stringify(newNames));
            return newNames;
        });
    };

    return { salespersons, addSalesperson };
};

// --- MANUAL ADDRESS STATE ---
interface ManualAddressData {
    manual_address_line: string;
    manual_city: string;
    manual_county: string;
    manual_postcode: string; // Used when manual entry is active
}

export function CreateCustomerModal({
    isOpen,
    onClose,
    onCustomerCreated,
}: CreateCustomerModalProps) {
    const { salespersons, addSalesperson } = useSalespersons();

    const initialManualState: ManualAddressData = {
        manual_address_line: "",
        manual_city: "",
        manual_county: "",
        manual_postcode: "",
    };

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        address: "", // Stores final, formatted address
        postcode: "", // Used for API lookup initially
        salesperson: "",
        project_types: [] as ProjectType[],
        marketing_opt_in: false,
        notes: "",
    });
    
    const [manualAddressData, setManualAddressData] = useState<ManualAddressData>(initialManualState);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [showManualAddress, setShowManualAddress] = useState(false);
    const [selectedAddressIndex, setSelectedAddressIndex] = useState<string>("");

    const handleChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear address/postcode-related fields if the main postcode is being edited
        if (field === 'postcode') {
            setAddresses([]);
            setSelectedAddressIndex("");
            setShowManualAddress(false);
            setManualAddressData(initialManualState);
        }
        
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleManualChange = (field: keyof ManualAddressData, value: string) => {
        setManualAddressData((prev) => ({ ...prev, [field]: value }));
        // Clear related form errors when typing
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
        // Sync postcode if manual postcode is entered/edited
        if (field === 'manual_postcode') {
            setFormData(prev => ({ ...prev, postcode: value.toUpperCase() }));
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

    const toggleManualEntry = () => {
        setShowManualAddress(true);
        setAddresses([]);
        setSelectedAddressIndex("");
        // Preserve postcode for manual entry field, clear main address field
        setFormData(prev => ({ ...prev, address: "" })); 
        setManualAddressData(prev => ({ ...prev, manual_postcode: formData.postcode.toUpperCase() }));
    }

    const searchAddresses = async () => {
        if (!formData.postcode || formData.postcode.trim() === "") {
            setErrors((prev) => ({ ...prev, postcode: "Please enter a postcode" }));
            return;
        }

        setLoadingAddresses(true);
        setAddresses([]);
        setSelectedAddressIndex("");
        setShowManualAddress(false);
        setFormData(prev => ({ ...prev, address: "" }));

        try {
            const apiKey = '4cu8sEIbO0-xTvMTuNam1A48205';
            const cleanPostcode = formData.postcode.replace(/\s/g, '');
            const response = await fetch(
                `https://api.getaddress.io/find/${encodeURIComponent(cleanPostcode)}?api-key=${apiKey}&expand=true`
            );

            if (response.ok) {
                const data = await response.json();

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
                    // If results are found, hide manual input (if visible)
                    setShowManualAddress(false);
                } else {
                    // API returned OK but no addresses found (or limit reached)
                    toggleManualEntry(); 
                }
            } else {
                 // API failed/limited/404 -> assume failure and switch to manual
                toggleManualEntry();
            }
        } catch (error) {
             // Network or unexpected error -> switch to manual
            toggleManualEntry();
        } finally {
            setLoadingAddresses(false);
        }
    };

    const selectAddress = (index: string) => {
        const address = addresses[parseInt(index)];
        if (address) {
            setSelectedAddressIndex(index);
            // This is the final formatted address for the database
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
        let addressValid = true;

        if (!formData.name || formData.name.trim() === "") {
            newErrors.name = "Name is required";
        }
        if (!formData.phone || formData.phone.trim() === "") {
            newErrors.phone = "Phone is required";
        }

        if (showManualAddress) {
            // Manual Address Validation
            if (!manualAddressData.manual_address_line.trim()) {
                newErrors.manual_address_line = "Address is required";
                addressValid = false;
            }
            if (!manualAddressData.manual_city.trim()) {
                newErrors.manual_city = "City is required";
                addressValid = false;
            }
            if (!manualAddressData.manual_postcode.trim()) {
                newErrors.manual_postcode = "Postcode is required";
                addressValid = false;
            }
        } else if (!formData.postcode || formData.postcode.trim() === "") {
             // Auto-lookup validation (only postcode is needed for lookup attempt)
            newErrors.postcode = "Postcode is required";
        } else if (addresses.length > 0 && !selectedAddressIndex) {
            // Address lookup success, but none selected yet
            newErrors.address = "Please select an address from the list";
            addressValid = false;
        } else if (!formData.address.trim()) {
             // Final check for empty address field after a selection/manual entry should have occurred
             newErrors.address = "Address is required";
             addressValid = false;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0 && addressValid;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        let finalFormData = { ...formData };

        // 🌟 STEP 1: Process Manual Address if applicable
        if (showManualAddress) {
            const { manual_address_line, manual_city, manual_county, manual_postcode } = manualAddressData;

            // Concatenate manual fields into the single 'address' field, using commas
            const addressParts = [
                manual_address_line,
                manual_city,
                manual_county,
            ].filter(Boolean); // Filter out empty county/city if not mandatory

            finalFormData.address = addressParts.join(', ');
            finalFormData.postcode = manual_postcode.toUpperCase(); // Ensure final postcode is correct
        }
        
        // 🌟 STEP 2: Add new salesperson to the persistent list if a name was entered
        if (finalFormData.salesperson.trim()) {
            addSalesperson(finalFormData.salesperson);
        }

        // 🌟 STEP 3: API submission
        try {
            const response = await fetchWithAuth('/customers', {
                method: "POST",
                body: JSON.stringify(finalFormData),
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
        setManualAddressData(initialManualState);
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
                    {/* --- Basic Customer Info --- */}
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

                    {/* --- Postcode/Address Lookup --- */}
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="postcode">
                            Postcode <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="postcode"
                                placeholder="Enter postcode"
                                value={formData.postcode}
                                onChange={(e) => handleChange("postcode", e.target.value.toUpperCase())}
                                onFocus={() => setShowManualAddress(false)}
                                className={errors.postcode ? "border-red-500" : ""}
                            />
                            <Button
                                type="button"
                                onClick={searchAddresses}
                                disabled={loadingAddresses}
                                variant="outline"
                            >
                                <Search className="h-4 w-4 mr-2" />
                                {loadingAddresses ? "Searching..." : "Find"}
                            </Button>
                        </div>
                        {errors.postcode && (
                            <span className="text-red-500 text-xs">{errors.postcode}</span>
                        )}
                    </div>

                    {/* --- Address Selection (API Success) --- */}
                    {addresses.length > 0 && !showManualAddress && (
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
                                    <SelectGroup>
                                        <SelectLabel>Found {addresses.length} Addresses</SelectLabel>
                                        {addresses.map((addr, index) => (
                                            <SelectItem key={index} value={index.toString()}>
                                                {addr.formatted_address}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {errors.address && (
                                <span className="text-red-500 text-xs">{errors.address}</span>
                            )}
                            <Button
                                type="button"
                                variant="link"
                                className="text-sm self-start p-0 h-auto"
                                onClick={toggleManualEntry}
                            >
                                Can't find your address? **Enter manually**
                            </Button>
                        </div>
                    )}
                    
                    {/* --- Manual Address Entry (API Failure/Limit/Manual Click) --- */}
                    {showManualAddress && (
                        <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
                            <div className="text-sm text-amber-700 bg-amber-100 p-3 rounded">
                                ⚠️ **No addresses found for this postcode.** Please enter your address manually below.
                            </div>
                            
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="manual_address_line">
                                    Address Line / House Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="manual_address_line"
                                    placeholder="Enter street address or building name"
                                    value={manualAddressData.manual_address_line}
                                    onChange={(e) => handleManualChange("manual_address_line", e.target.value)}
                                    className={errors.manual_address_line ? "border-red-500" : ""}
                                />
                                {errors.manual_address_line && (
                                    <span className="text-red-500 text-xs">{errors.manual_address_line}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="manual_city">
                                        City / Town <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="manual_city"
                                        placeholder="City/Town"
                                        value={manualAddressData.manual_city}
                                        onChange={(e) => handleManualChange("manual_city", e.target.value)}
                                        className={errors.manual_city ? "border-red-500" : ""}
                                    />
                                    {errors.manual_city && (
                                        <span className="text-red-500 text-xs">{errors.manual_city}</span>
                                    )}
                                </div>
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="manual_county">County</Label>
                                    <Input
                                        id="manual_county"
                                        placeholder="County (Optional)"
                                        value={manualAddressData.manual_county}
                                        onChange={(e) => handleManualChange("manual_county", e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="manual_postcode">
                                    Postcode (Manual) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="manual_postcode"
                                    placeholder="Postcode"
                                    value={manualAddressData.manual_postcode}
                                    onChange={(e) => handleManualChange("manual_postcode", e.target.value.toUpperCase())}
                                    className={errors.manual_postcode ? "border-red-500" : ""}
                                />
                                {errors.manual_postcode && (
                                    <span className="text-red-500 text-xs">{errors.manual_postcode}</span>
                                )}
                            </div>
                        </div>
                    )}


                    {/* --- Salesperson & Project Type --- */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="salesperson">Salesperson</Label>
                            <Input
                                id="salesperson"
                                placeholder="Type salesperson name"
                                value={formData.salesperson}
                                onChange={(e) => handleChange("salesperson", e.target.value)}
                            />
                            <div className="flex flex-wrap gap-2 mt-2 pt-1">
                                {salespersons.map((person) => (
                                    <Button
                                        key={person}
                                        type="button"
                                        variant={formData.salesperson === person ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleChange("salesperson", person)}
                                        className="flex items-center"
                                    >
                                        {person}
                                        {formData.salesperson === person && <UserCheck className="h-4 w-4 ml-1" />}
                                    </Button>
                                ))}
                            </div>
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

                    {/* --- Marketing and Notes fields --- */}
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