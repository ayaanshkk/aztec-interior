"use client";
import React, { useState, useEffect } from "react";
import { X, UserCheck } from "lucide-react";
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
import { fetchWithAuth, BACKEND_URL } from "@/lib/api";

type ProjectType = 'Bedroom' | 'Kitchen' | 'Other';

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

export function CreateCustomerModal({
    isOpen,
    onClose,
    onCustomerCreated,
}: CreateCustomerModalProps) {
    const { salespersons, addSalesperson } = useSalespersons();

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

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name || formData.name.trim() === "") {
            newErrors.name = "Name is required";
        }
        if (!formData.phone || formData.phone.trim() === "") {
            newErrors.phone = "Phone is required";
        }
        if (!formData.address || formData.address.trim() === "") {
            newErrors.address = "Address is required";
        }
        if (!formData.postcode || formData.postcode.trim() === "") {
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
        
        // Add new salesperson to the persistent list if a name was entered
        if (formData.salesperson.trim()) {
            addSalesperson(formData.salesperson);
        }

        try {
            // CHANGE: Use BACKEND_URL constant
            const token = localStorage.getItem("token");
            const response = await fetch(`${BACKEND_URL}/customers`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
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
                                className={errors.name ? "border-red-500" : ""}
                            />
                            {errors.name && (
                                <span className="text-red-500 text-xs">{errors.name}</span>
                            )}
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

                    {/* --- Address & Postcode --- */}
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="address">
                            Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="address"
                            placeholder="Enter full address"
                            value={formData.address}
                            onChange={(e) => handleChange("address", e.target.value)}
                            className={errors.address ? "border-red-500" : ""}
                        />
                        {errors.address && (
                            <span className="text-red-500 text-xs">{errors.address}</span>
                        )}
                    </div>

                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="postcode">
                            Postcode <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="postcode"
                            placeholder="Enter postcode"
                            value={formData.postcode}
                            onChange={(e) => handleChange("postcode", e.target.value.toUpperCase())}
                            className={errors.postcode ? "border-red-500" : ""}
                        />
                        {errors.postcode && (
                            <span className="text-red-500 text-xs">{errors.postcode}</span>
                        )}
                    </div>

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