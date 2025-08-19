"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// 1. Define an interface for the form data's shape
interface IFormData {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  door_colour: string;
  door_style: string;
  worktop_colour: string;
  worktop_style: string;
  handles_style: string;
  handles_colour: string;
  bedside_cabinets_style: string;
  bedside_cabinets_qty: string;
  dresser_desk_present: string;
  dresser_desk_qty_size: string;
  internal_mirror_present: string;
  internal_mirror_qty_size: string;
  mirror_style: string;
  mirror_qty: string;
  soffit_lights_type: string;
  soffit_lights_colour: string;
  soffit_lights_qty: string;
  gable_lights_colour: string;
  gable_lights_qty: string;
  special_requirements: string;
  budget_range: string;
  preferred_completion_date: string;
}

export default function CustomerFormPage() {
  const params = useParams();
  const router = useRouter();
  
  // 2. Apply the interface to the useState hook
  const [formData, setFormData] = useState<IFormData>({
    // Customer details
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    
    // Kitchen design details
    door_colour: "",
    door_style: "",
    worktop_colour: "",
    worktop_style: "",
    handles_style: "",
    handles_colour: "",
    
    // Bedside Cabinets
    bedside_cabinets_style: "",
    bedside_cabinets_qty: "",
    
    // Dresser/Desk
    dresser_desk_present: "",
    dresser_desk_qty_size: "",
    
    // Internal Mirror
    internal_mirror_present: "",
    internal_mirror_qty_size: "",
    
    // Mirror
    mirror_style: "",
    mirror_qty: "",
    
    // Soffit Lights
    soffit_lights_type: "",
    soffit_lights_colour: "",
    soffit_lights_qty: "",
    
    // Gable Lights
    gable_lights_colour: "",
    gable_lights_qty: "",
    
    // Additional fields
    special_requirements: "",
    budget_range: "",
    preferred_completion_date: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 3. Type the 'field' parameter as a key of the interface
  const handleFieldChange = (field: keyof IFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/submit-customer-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: params.token,
          formData: formData
        }),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          router.push("/thank-you");
        }, 2000);
      } else {
        console.error("Failed to submit form");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Define the type for a section to ensure 'fields' are valid keys
  interface Section {
    title: string;
    fields: (keyof IFormData)[];
  }

  const sections: Section[] = [
    {
      title: "Customer Information",
      fields: ["customer_name", "customer_phone", "customer_email", "customer_address"]
    },
    {
      title: "Kitchen Design Preferences",
      fields: ["door_colour", "door_style", "worktop_colour", "worktop_style", "handles_style", "handles_colour"]
    },
    {
      title: "Bedside Cabinets",
      fields: ["bedside_cabinets_style", "bedside_cabinets_qty"]
    },
    {
      title: "Dresser/Desk",
      fields: ["dresser_desk_present", "dresser_desk_qty_size"]
    },
    {
      title: "Internal Mirror",
      fields: ["internal_mirror_present", "internal_mirror_qty_size"]
    },
    {
      title: "Mirror",
      fields: ["mirror_style", "mirror_qty"]
    },
    {
      title: "Soffit Lights",
      fields: ["soffit_lights_type", "soffit_lights_colour", "soffit_lights_qty"]
    },
    {
      title: "Gable Lights",
      fields: ["gable_lights_colour", "gable_lights_qty"]
    },
    {
      title: "Additional Information",
      fields: ["special_requirements", "budget_range", "preferred_completion_date"]
    }
  ];

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Form Submitted Successfully!</h2>
              <p className="text-gray-600">Thank you for providing your information. We'll be in touch soon.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="shadow-lg border border-gray-200 rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-800">
              Kitchen Design Form
            </CardTitle>
            <CardDescription className="text-gray-600">
              Please fill out this form with your kitchen design preferences and requirements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {sections.map((section, index) => (
                <div key={index} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {section.title}
                  </h3>
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="font-semibold text-gray-800 w-1/2">Field</TableHead>
                        <TableHead className="font-semibold text-gray-800 w-1/2">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.fields.map((field) => (
                        <TableRow key={field} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-3">
                            {field
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </TableCell>
                          <TableCell className="py-3">
                            {field === "special_requirements" ? (
                              <Textarea
                                value={formData[field]}
                                onChange={(e) => handleFieldChange(field, e.target.value)}
                                className="w-full"
                                rows={3}
                                placeholder="Enter any special requirements..."
                              />
                            ) : field === "customer_address" ? (
                              <Textarea
                                value={formData[field]}
                                onChange={(e) => handleFieldChange(field, e.target.value)}
                                className="w-full"
                                rows={2}
                                placeholder="Enter your full address..."
                              />
                            ) : (
                              <Input
                                value={formData[field]}
                                onChange={(e) => handleFieldChange(field, e.target.value)}
                                className="w-full"
                                type={field.includes("email") ? "email" : 
                                     field.includes("phone") ? "tel" : 
                                     field.includes("date") ? "date" : "text"}
                                placeholder={`Enter ${field.replace(/_/g, " ").toLowerCase()}...`}
                                required={section.title === "Customer Information"}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
              
              <div className="flex justify-end pt-6">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-2"
                >
                  {isSubmitting ? "Submitting..." : "Submit Form"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}