"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Upload, Plus, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const JOB_TYPES = ["Kitchen", "Bedroom", "Wardrobe", "Remedial", "Other"];
const JOB_STAGES = ["Lead", "Survey", "Quote", "Consultation", "Accepted", "Production", "Delivery", "Complete"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

interface FormData {
  job_reference: string;
  job_type: string;
  job_name: string;
  customer_id: string;
  salesperson: string;
  measure_date: string;
  delivery_date: string;
  completion_date: string;
  stage: string;
  quote_id: string;
  quote_price: string;
  agreed_price: string;
  deposit_amount: string;
  deposit_due_date: string;
  installation_address: string;
  assigned_team: string;
  primary_fitter: string;
  priority: string;
  tags: string;
  notes: string;
  create_counting_sheet: boolean;
  create_schedule: boolean;
  generate_invoice: boolean;
}

export default function CreateJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [fitters, setFitters] = useState<any[]>([]);
  const [attachedForms, setAttachedForms] = useState<any[]>([]);
  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    job_reference: generateJobReference(),
    job_type: "",
    job_name: "",
    customer_id: searchParams?.get("customerId") || "",
    salesperson: "",
    measure_date: "",
    delivery_date: "",
    completion_date: "",
    stage: "Survey",
    quote_id: "",
    quote_price: "",
    agreed_price: "",
    deposit_amount: "",
    deposit_due_date: "",
    installation_address: searchParams?.get("customerAddress") || "",
    assigned_team: "",
    primary_fitter: "",
    priority: "Medium",
    tags: "",
    notes: "",
    create_counting_sheet: false,
    create_schedule: false,
    generate_invoice: false,
  });

  // Generate auto job reference
  function generateJobReference() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    return `AZT-${year}-${month}${day}-${time}`;
  }

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load customers
        const customersRes = await fetch("http://127.0.0.1:5000/customers");
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData);
        }

        // Load salespeople (mock data for now)
        setSalespeople([
          { id: 1, name: "John Smith" },
          { id: 2, name: "Sarah Johnson" },
          { id: 3, name: "Mike Wilson" },
        ]);

        // Load fitters (mock data for now)
        setFitters([
          { id: 1, name: "Team A - Kitchen Specialists" },
          { id: 2, name: "Team B - Bedroom Fitters" },
          { id: 3, name: "Dave Matthews" },
          { id: 4, name: "Tom Harris" },
        ]);

        // If customer is pre-selected, load their quotes
        if (formData.customer_id) {
          const quotesRes = await fetch(`http://127.0.0.1:5000/quotations?customer_id=${formData.customer_id}`);
          if (quotesRes.ok) {
            const quotesData = await quotesRes.json();
            setQuotes(quotesData);
          }

          // Load unlinked forms for this customer
          const formsRes = await fetch(`http://127.0.0.1:5000/forms/unlinked?customer_id=${formData.customer_id}`);
          if (formsRes.ok) {
            const formsData = await formsRes.json();
            setAvailableForms(formsData);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [formData.customer_id]);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const handleCustomerChange = async (customerId: string) => {
    handleInputChange("customer_id", customerId);
    
    // Load quotes for selected customer
    try {
      const quotesRes = await fetch(`http://127.0.0.1:5000/quotations?customer_id=${customerId}`);
      if (quotesRes.ok) {
        const quotesData = await quotesRes.json();
        setQuotes(quotesData);
      }

      // Load customer address
      const customerRes = await fetch(`http://127.0.0.1:5000/customers/${customerId}`);
      if (customerRes.ok) {
        const customerData = await customerRes.json();
        handleInputChange("installation_address", customerData.address || "");
      }
    } catch (error) {
      console.error("Error loading customer data:", error);
    }
  };

  const handleQuoteChange = (quoteId: string) => {
    handleInputChange("quote_id", quoteId);
    
    // Find and prefill quote price
    const selectedQuote = quotes.find(q => q.id === parseInt(quoteId));
    if (selectedQuote) {
      handleInputChange("quote_price", selectedQuote.total.toString());
      handleInputChange("agreed_price", selectedQuote.total.toString());
    }
  };

  const attachForm = (formId: string) => {
    const form = availableForms.find(f => f.id === parseInt(formId));
    if (form && !attachedForms.find(f => f.id === form.id)) {
      setAttachedForms(prev => [...prev, form]);
      setAvailableForms(prev => prev.filter(f => f.id !== form.id));
    }
  };

  const detachForm = (formId: number) => {
    const form = attachedForms.find(f => f.id === formId);
    if (form) {
      setAvailableForms(prev => [...prev, form]);
      setAttachedForms(prev => prev.filter(f => f.id !== formId));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.job_reference.trim()) {
      newErrors.job_reference = "Job reference is required";
    }
    if (!formData.job_type) {
      newErrors.job_type = "Job type is required";
    }
    if (!formData.customer_id) {
      newErrors.customer_id = "Customer is required";
    }
    if (!formData.installation_address.trim()) {
      newErrors.installation_address = "Installation address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Map frontend form data to backend expected format
      const submitData = {
        // Required fields
        customer_id: parseInt(formData.customer_id),
        type: formData.job_type, // Frontend uses 'job_type', backend expects 'type'
        installation_address: formData.installation_address,
        
        // Optional basic fields
        job_reference: formData.job_reference,
        job_name: formData.job_name,
        stage: formData.stage,
        priority: formData.priority,
        
        // Dates (convert to YYYY-MM-DD format)
        measure_date: formData.measure_date || null,
        delivery_date: formData.delivery_date || null,
        completion_date: formData.completion_date || null,
        deposit_due_date: formData.deposit_due_date || null,
        
        // Financial fields (convert strings to numbers)
        quote_id: formData.quote_id ? parseInt(formData.quote_id) : null,
        quote_price: formData.quote_price ? parseFloat(formData.quote_price) : null,
        agreed_price: formData.agreed_price ? parseFloat(formData.agreed_price) : null,
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
        
        // Team assignments (convert strings to numbers)
        assigned_team: formData.assigned_team ? parseInt(formData.assigned_team) : null,
        primary_fitter: formData.primary_fitter ? parseInt(formData.primary_fitter) : null,
        salesperson: formData.salesperson ? parseInt(formData.salesperson) : null,
        
        // Additional fields
        tags: formData.tags,
        notes: formData.notes,
        
        // Checkboxes for related items
        create_counting_sheet: formData.create_counting_sheet,
        create_schedule: formData.create_schedule,
        generate_invoice: formData.generate_invoice,
        
        // Attached forms
        attached_forms: attachedForms.map(f => f.id),
      };

      console.log('Submitting job data:', submitData); // Debug log

      const response = await fetch("http://127.0.0.1:5000/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create job");
      }

      const newJob = await response.json();
      
      // Show success and redirect to job details
      router.push(`/dashboard/jobs/${newJob.id}?success=created`);
    } catch (error) {
      console.error("Error creating job:", error);
      setErrors({ submit: error instanceof Error ? error.message : "Failed to create job. Please try again." });
    } finally {
      setLoading(false);
    }
  };


  const selectedCustomer = customers.find(c => c.id === parseInt(formData.customer_id));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-semibold text-gray-900">Create Job</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="job_reference">Job Reference *</Label>
                  <Input
                    id="job_reference"
                    value={formData.job_reference}
                    onChange={(e) => handleInputChange("job_reference", e.target.value)}
                    className={errors.job_reference ? "border-red-500" : ""}
                  />
                  {errors.job_reference && (
                    <p className="text-sm text-red-500 mt-1">{errors.job_reference}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="job_type">Job Type *</Label>
                  <Select value={formData.job_type} onValueChange={(value) => handleInputChange("job_type", value)}>
                    <SelectTrigger className={errors.job_type ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.job_type && (
                    <p className="text-sm text-red-500 mt-1">{errors.job_type}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="job_name">Job Name</Label>
                  <Input
                    id="job_name"
                    placeholder="e.g., Kitchen Renovation"
                    value={formData.job_name}
                    onChange={(e) => handleInputChange("job_name", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="stage">Stage</Label>
                  <Select value={formData.stage} onValueChange={(value) => handleInputChange("stage", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_STAGES.map(stage => (
                        <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Salesperson */}
          <Card>
            <CardHeader>
              <CardTitle>Customer & Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="customer">Customer *</Label>
                  <Select 
                    value={formData.customer_id} 
                    onValueChange={handleCustomerChange}
                    disabled={!!searchParams?.get("customerId")}
                  >
                    <SelectTrigger className={errors.customer_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} - {customer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customer_id && (
                    <p className="text-sm text-red-500 mt-1">{errors.customer_id}</p>
                  )}
                  {selectedCustomer && (
                    <div className="mt-2 p-3 bg-blue-50 rounded border">
                      <p className="text-sm font-medium">{selectedCustomer.name}</p>
                      <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                      <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="salesperson">Salesperson</Label>
                  <Select value={formData.salesperson} onValueChange={(value) => handleInputChange("salesperson", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select salesperson" />
                    </SelectTrigger>
                    <SelectContent>
                      {salespeople.map(person => (
                        <SelectItem key={person.id} value={person.id.toString()}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="measure_date">Measure Date</Label>
                  <Input
                    id="measure_date"
                    type="date"
                    value={formData.measure_date}
                    onChange={(e) => handleInputChange("measure_date", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="delivery_date">Delivery Date</Label>
                  <Input
                    id="delivery_date"
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => handleInputChange("delivery_date", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="completion_date">Completion Date</Label>
                  <Input
                    id="completion_date"
                    type="date"
                    value={formData.completion_date}
                    onChange={(e) => handleInputChange("completion_date", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financials */}
          <Card>
            <CardHeader>
              <CardTitle>Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="quote_id">Linked Quote</Label>
                <Select value={formData.quote_id} onValueChange={handleQuoteChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quote (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {quotes.map(quote => (
                      <SelectItem key={quote.id} value={quote.id.toString()}>
                        Quote #{quote.id} - £{quote.total.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="quote_price">Quote Price (£)</Label>
                  <Input
                    id="quote_price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.quote_price}
                    onChange={(e) => handleInputChange("quote_price", e.target.value)}
                    readOnly={!!formData.quote_id}
                    className={formData.quote_id ? "bg-gray-50" : ""}
                  />
                  {formData.quote_id && (
                    <p className="text-sm text-gray-500 mt-1">Automatically filled from selected quote</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="agreed_price">Agreed Price (£)</Label>
                  <Input
                    id="agreed_price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.agreed_price}
                    onChange={(e) => handleInputChange("agreed_price", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="deposit_amount">Deposit Amount (£)</Label>
                  <Input
                    id="deposit_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.deposit_amount}
                    onChange={(e) => handleInputChange("deposit_amount", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="deposit_due_date">Deposit Due Date</Label>
                  <Input
                    id="deposit_due_date"
                    type="date"
                    value={formData.deposit_due_date}
                    onChange={(e) => handleInputChange("deposit_due_date", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logistics */}
          <Card>
            <CardHeader>
              <CardTitle>Logistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="installation_address">Installation Address *</Label>
                <Textarea
                  id="installation_address"
                  rows={3}
                  value={formData.installation_address}
                  onChange={(e) => handleInputChange("installation_address", e.target.value)}
                  className={errors.installation_address ? "border-red-500" : ""}
                />
                {errors.installation_address && (
                  <p className="text-sm text-red-500 mt-1">{errors.installation_address}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="assigned_team">Assigned Team</Label>
                  <Select value={formData.assigned_team} onValueChange={(value) => handleInputChange("assigned_team", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {fitters.map(fitter => (
                        <SelectItem key={fitter.id} value={fitter.id.toString()}>
                          {fitter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="primary_fitter">Primary Fitter</Label>
                  <Select value={formData.primary_fitter} onValueChange={(value) => handleInputChange("primary_fitter", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fitter" />
                    </SelectTrigger>
                    <SelectContent>
                      {fitters.map(fitter => (
                        <SelectItem key={fitter.id} value={fitter.id.toString()}>
                          {fitter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(priority => (
                        <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="e.g., rush-job, premium-customer (comma-separated)"
                  value={formData.tags}
                  onChange={(e) => handleInputChange("tags", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes & Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Notes & Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  placeholder="Add any additional notes or special requirements..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create_counting_sheet"
                  checked={formData.create_counting_sheet}
                  onCheckedChange={(checked) => handleInputChange("create_counting_sheet", checked as boolean)}
                />
                <Label htmlFor="create_counting_sheet">Create counting sheet(s)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create_schedule"
                  checked={formData.create_schedule}
                  onCheckedChange={(checked) => handleInputChange("create_schedule", checked as boolean)}
                />
                <Label htmlFor="create_schedule">Create schedule placeholder</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generate_invoice"
                  checked={formData.generate_invoice}
                  onCheckedChange={(checked) => handleInputChange("generate_invoice", checked as boolean)}
                />
                <Label htmlFor="generate_invoice">Generate initial invoice draft</Label>
              </div>
            </CardContent>
          </Card>

          {/* Attach Forms */}
          {availableForms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attach Existing Forms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {availableForms.map(form => (
                    <div key={form.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Form #{form.id}</p>
                        <p className="text-sm text-gray-500">
                          Submitted: {new Date(form.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => attachForm(form.id.toString())}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Attach
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attached Forms */}
          {attachedForms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attached Forms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attachedForms.map(form => (
                    <div key={form.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                      <div>
                        <p className="font-medium">Form #{form.id}</p>
                        <p className="text-sm text-gray-500">
                          Submitted: {new Date(form.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => detachForm(form.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating Job..." : "Create Job"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}