"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  FileText,
  Receipt,
  DollarSign,
  Link,
  User,
  Copy,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// Define the structure for items
interface FormItem {
  label: string;
  icon: React.ElementType;
  type?: "kitchen" | "bedroom" | "remedial" | "general";
  requiresLink?: boolean; // For items that need link generation
  route?: string; // For direct navigation items
}

interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

const FormsAndChecklistsPage = () => {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [confirmationMessage, setConfirmationMessage] = useState<string>("");
  
  // Customers state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  // Link generation states
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [formType, setFormType] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch customers when component mounts
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        console.error("Failed to fetch customers");
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleFormClick = (item: FormItem) => {
    setSelectedForm(item);
    setSelectedCustomer("");
    setConfirmationMessage("");
    setIsDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedCustomer) {
      setConfirmationMessage("⚠ Please select a customer before continuing.");
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomer);
    if (!customer) return;

    // KITCHEN/BEDROOM FORMS: Always require link generation for the client
    if (selectedForm?.requiresLink && selectedForm?.type) {
      await generateFormLink(selectedForm.type as "kitchen" | "bedroom", customer);
    } 
    // REMEDIAL/GENERAL CHECKLISTS: Staff navigates directly using the shared route
    else if (selectedForm?.route) {
      const queryParams = new URLSearchParams({
        customerId: selectedCustomer,
        customerName: customer.name,
        customerAddress: customer.address,
        customerPhone: customer.phone,
        customerEmail: customer.email || "",
        // Pass the specific checklist type for the destination page
        type: selectedForm.type || "general", 
      });
      
      router.push(`${selectedForm.route}?${queryParams.toString()}`);
      setIsDialogOpen(false);
    } 
    // For other documents
    else {
      setConfirmationMessage(`✅ ${selectedForm?.label} generated/linked for ${customer.name}.`);
    }
  };

  const generateFormLink = async (type: "kitchen" | "bedroom", customer: Customer) => {
    if (generating) return;

    setGenerating(true);
    setConfirmationMessage(""); // Clear any previous messages
    
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/customers/${customer.id}/generate-form-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ formType: type }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const params = new URLSearchParams({
            type: type,
            customerId: customer.id,
            customerName: customer.name,
            customerAddress: customer.address,
            customerPhone: customer.phone,
          });

          // This link is for the CLIENT and is tokenized/external
          const fullLink = `${window.location.origin}/form/${data.token}?${params.toString()}`;
          setGeneratedLink(fullLink);
          setFormType(type);
          setIsDialogOpen(false); // Close customer selection dialog
          setShowLinkDialog(true); // Open link display dialog
        } else {
          const errorMsg = data.error || "Unknown error occurred";
          console.error("Link generation failed:", errorMsg);
          setConfirmationMessage(`⚠ Failed to generate link: ${errorMsg}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        const errorMsg = errorData.error || `Server error: ${response.status}`;
        console.error("Server responded with error:", errorMsg);
        setConfirmationMessage(`⚠ Server error: ${errorMsg}`);
      }
    } catch (error) {
      console.error(`Network error generating ${type} form link:`, error);
      setConfirmationMessage("⚠ Network error: Please check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Grouped sections
  const sections = [
    {
      title: "Checklists",
      items: [
        { 
          label: "Remedial Action Checklist", 
          icon: CheckSquare, 
          // Consolidate these internal staff checklists to a single page path
          route: "/dashboard/checklists/internal",
          type: "remedial" as const,
        },
        { 
          label: "Checklist", 
          icon: CheckSquare, 
          // Consolidate these internal staff checklists to a single page path
          route: "/dashboard/checklists/internal",
          type: "general" as const,
        },
        { 
          label: "Kitchen Checklist Form (Client Link)", 
          icon: Link, 
          type: "kitchen" as const,
          requiresLink: true // Uses generateFormLink
        },
        { 
          label: "Bedroom Checklist Form (Client Link)", 
          icon: Link, 
          type: "bedroom" as const,
          requiresLink: true // Uses generateFormLink
        },
      ] as FormItem[],
    },
    {
      title: "Documents",
      items: [
        { label: "Quotation", icon: FileText },
        { label: "Invoice", icon: FileText },
        { label: "Proforma Invoice", icon: FileText },
        { label: "Payment Terms", icon: DollarSign },
      ] as FormItem[],
    },
    {
      title: "Receipts",
      items: [
        { label: "Receipt", icon: Receipt },
        { label: "Deposit Receipt", icon: Receipt },
        { label: "Final Receipt", icon: Receipt },
      ] as FormItem[],
    },
  ];

  return (
    <div className="p-8 space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Forms & Checklists</h1>
        <p className="text-muted-foreground">
          Generate and manage various customer-related forms and documents.
        </p>
      </div>

      {sections.map((section, idx) => (
        <div key={idx} className="space-y-4">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.items.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleFormClick(item)} 
                  className="flex items-center p-4 rounded-xl border hover:bg-accent hover:text-accent-foreground transition-all space-x-3"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Customer Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>
              Choose a customer to associate with{" "}
              <span className="font-semibold">{selectedForm?.label}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Select onValueChange={setSelectedCustomer} value={selectedCustomer}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingCustomers ? "Loading customers..." : "Select a customer"} />
              </SelectTrigger>
              <SelectContent>
                {loadingCustomers ? (
                  <SelectItem value="loading" disabled>
                    Loading customers...
                  </SelectItem>
                ) : customers.length === 0 ? (
                  <SelectItem value="no-customers" disabled>
                    No customers found
                  </SelectItem>
                ) : (
                  customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{c.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {confirmationMessage && (
              <div
                className={`text-sm font-medium p-2 rounded-md ${
                  confirmationMessage.startsWith("⚠")
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : "bg-green-50 text-green-600 border border-green-200"
                }`}
              >
                {confirmationMessage}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleConfirm} disabled={generating || loadingCustomers || !selectedCustomer}>
              {generating ? "Generating..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Display Dialog - Matches Customer Details Page */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formType === "kitchen" ? "Kitchen" : "Bedroom"} Checklist Form Link Generated
            </DialogTitle>
            <DialogDescription>
              Share this link with{" "}
              {customers.find((c) => c.id === selectedCustomer)?.name || "the customer"} to fill out the{" "}
              {formType === "kitchen" ? "kitchen" : "bedroom"} checklist form. 
              The form data will be linked to their existing customer record.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input
              value={generatedLink}
              readOnly
              className="flex-1"
            />
            <Button onClick={copyToClipboard} variant="outline">
              {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {linkCopied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormsAndChecklistsPage;