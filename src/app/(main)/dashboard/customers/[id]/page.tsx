"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Edit, 
  FileText, 
  ChevronDown, 
  Briefcase, 
  CheckSquare, 
  Link, 
  Copy, 
  Check,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  MapPin,
  Plus,
  Receipt,
  DollarSign
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  contact_made: 'Yes' | 'No' | 'Unknown';
  preferred_contact_method: 'Phone' | 'Email' | 'WhatsApp';
  marketing_opt_in: boolean;
  date_of_measure: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  form_submissions: FormSubmission[];
}

interface FormSubmission {
  id: number;
  token_used: string;
  submitted_at: string;
  form_data: any;
}

// Mapping known form keys to friendly labels
const FIELD_LABELS: Record<string, string> = {
  customer_name: "Customer Name",
  customer_phone: "Phone Number",
  customer_address: "Address",
  room: "Room",
  survey_date: "Survey Date",
  appointment_date: "Appointment Date",
  installation_date: "Installation Date",
  completion_date: "Completion Date",
  deposit_date: "Deposit Date",
  form_type: "Form Type",
  signature_data: "Signature",
  first_name: "First Name",
  last_name: "Last Name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  kitchen_size: "Kitchen Size",
  bedroom_count: "Number of Bedrooms",
  notes: "Notes",
};

// Format date to readable format
const formatDate = (dateString: string) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [formType, setFormType] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // Fetch customer details
    fetch(`http://127.0.0.1:5000/customers/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch customer");
        return res.json();
      })
      .then((data) => setCustomer(data))
      .catch((err) => console.error("Error loading customer:", err));

    // Fetch quotations for the customer
    fetch(`http://127.0.0.1:5000/quotations?customer_id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch quotations");
        return res.json();
      })
      .then((data) => setQuotations(data))
      .catch((err) => console.error("Error loading quotations:", err));

    // Fetch jobs for the customer
    fetch(`http://127.0.0.1:5000/jobs?customer_id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch jobs");
        return res.json();
      })
      .then((data) => setJobs(data))
      .catch((err) => console.error("Error loading jobs:", err))
      .finally(() => setLoading(false));
  }, [id]);

  const generateFormLink = async (type: "bedroom" | "kitchen") => {
    if (generating) return;
    
    setGenerating(true);
    try {
      const response = await fetch(`http://127.0.0.1:5000/customers/${id}/generate-form-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formType: type }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const fullLink = `${window.location.origin}/form/${data.token}?type=${type}&customerId=${id}`;
          setGeneratedLink(fullLink);
          setFormType(type);
          setShowLinkDialog(true);
        } else {
          alert(`Failed to generate ${type} form link: ${data.error}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to generate ${type} form link: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Network error generating ${type} form link:`, error);
      alert(`Network error: Please check your connection and try again.`);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleEdit = () => {
    router.push(`/dashboard/customers/${id}/edit`);
  };

  const handleCreateQuote = () => {
    const queryParams = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || '',
      customerAddress: customer?.address || '',
      customerPhone: customer?.phone || '',
      customerEmail: customer?.email || ''
    });
    router.push(`/dashboard/quotes/create?${queryParams.toString()}`);
  };

  const handleCreateJob = () => {
    const queryParams = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || '',
      customerAddress: customer?.address || '',
      customerPhone: customer?.phone || '',
      customerEmail: customer?.email || ''
    });
    router.push(`/dashboard/jobs/create?${queryParams.toString()}`);
  };

  const handleCreateChecklist = () => {
    router.push(`/dashboard/checklists/create?customerId=${id}`);
  };

  // Handlers for additional create items
  const buildCustomerQuery = () => {
    const qp = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || '',
      customerAddress: customer?.address || '',
      customerPhone: customer?.phone || '',
      customerEmail: customer?.email || ''
    });
    return qp.toString();
  };

  const handleCreateRemedialChecklist = () => {
    router.push(`/dashboard/checklists/remedial/create?${buildCustomerQuery()}`);
  };

  const handleCreateReceipt = () => {
    router.push(`/dashboard/receipts/create?type=receipt&${buildCustomerQuery()}`);
  };

  const handleCreateDepositReceipt = () => {
    router.push(`/dashboard/receipts/create?type=deposit&${buildCustomerQuery()}`);
  };

  const handleCreateFinalReceipt = () => {
    router.push(`/dashboard/receipts/create?type=final&${buildCustomerQuery()}`);
  };

  const handleCreateInvoice = () => {
    router.push(`/dashboard/invoices/create?${buildCustomerQuery()}`);
  };

  const handleCreateProformaInvoice = () => {
    router.push(`/dashboard/invoices/create?type=proforma&${buildCustomerQuery()}`);
  };

  const handleCreatePaymentTerms = () => {
    router.push(`/dashboard/payment-terms/create?${buildCustomerQuery()}`);
  };

  const handleViewQuote = (quoteId: string) => {
    router.push(`/dashboard/quotes/${quoteId}`);
  };

  const handleViewJob = (jobId: string) => {
    router.push(`/dashboard/jobs/${jobId}`);
  };

  const getContactStatusColor = (status: string) => {
    switch (status) {
      case 'Yes': return 'bg-green-100 text-green-800';
      case 'No': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContactMethodIcon = (method: string) => {
    switch (method) {
      case 'Phone': return <Phone className="h-4 w-4" />;
      case 'Email': return <Mail className="h-4 w-4" />;
      case 'WhatsApp': return <MessageSquare className="h-4 w-4" />;
      default: return null;
    }
  };

  const renderFormSubmission = (submission: FormSubmission) => {
    let formData;
    try {
      formData =
        typeof submission.form_data === "string"
          ? JSON.parse(submission.form_data)
          : submission.form_data;
    } catch {
      formData = submission.form_data;
    }

    if (!formData || typeof formData !== "object") {
      return (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Form Data</h4>
          <pre className="text-sm overflow-x-auto text-gray-600">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      );
    }

    return (
      <div className="bg-white border rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {formData.form_type ? `${formData.form_type.charAt(0).toUpperCase() + formData.form_type.slice(1)} Checklist` : 'Form Submission'}
            </h3>
            <span className="text-sm text-gray-500">
              Submitted: {formatDate(submission.submitted_at)}
            </span>
          </div>
          {formData.form_type && (
            <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
              {formData.form_type}
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {Object.entries(formData).map(([key, value]) => {
            // Skip signature data and form type as they're displayed separately
            if (key === 'signature_data' || key === 'form_type') return null;
            
            return (
              <div key={key} className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">
                  {FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="text-gray-900 mt-1 text-base">
                  {typeof value === "object" ? JSON.stringify(value) : String(value) || "—"}
                </span>
              </div>
            );
          })}
        </div>

        {formData.signature_data && (
          <div className="border-t pt-4">
            <span className="text-sm text-gray-500 font-medium">Customer Signature</span>
            <div className="mt-2 p-4 border rounded-lg bg-gray-50">
              <span className="text-sm text-gray-600">Signature captured</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!customer) return <div className="p-8">Customer not found.</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              onClick={() => router.push("/dashboard/customers")}
              className="flex items-center text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900">Customer Details</h1>
          </div>

          <div className="flex items-center space-x-3">
            {/* Generate Form Links Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                  disabled={generating}
                >
                  <Link className="h-4 w-4" />
                  <span>{generating ? 'Generating...' : 'Generate Form'}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => generateFormLink("kitchen")} 
                  className="flex items-center space-x-2"
                  disabled={generating}
                >
                  <Link className="h-4 w-4" />
                  <span>Kitchen Form Link</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => generateFormLink("bedroom")} 
                  className="flex items-center space-x-2"
                  disabled={generating}
                >
                  <Link className="h-4 w-4" />
                  <span>Bedroom Form Link</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Create Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center p-2" aria-label="Create">
                  <Plus className="h-4 w-4" />
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleCreateRemedialChecklist} className="flex items-center space-x-2">
                  <CheckSquare className="h-4 w-4" />
                  <span>Remedial Action Checklist</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateChecklist} className="flex items-center space-x-2">
                  <CheckSquare className="h-4 w-4" />
                  <span>Checklist</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateQuote} className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Quotation</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateInvoice} className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Invoice</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateProformaInvoice} className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Proforma Invoice</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateReceipt} className="flex items-center space-x-2">
                  <Receipt className="h-4 w-4" />
                  <span>Receipt</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateDepositReceipt} className="flex items-center space-x-2">
                  <Receipt className="h-4 w-4" />
                  <span>Deposit Receipt</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateFinalReceipt} className="flex items-center space-x-2">
                  <Receipt className="h-4 w-4" />
                  <span>Final Receipt</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreatePaymentTerms} className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Payment Terms</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateJob} className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4" />
                  <span>Job</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={handleEdit} className="flex items-center space-x-2">
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-8 py-6">
        {/* Customer Information */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
            <div className="flex items-center space-x-4">
              {customer.date_of_measure && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Measure: {formatDate(customer.date_of_measure)}</span>
                </div>
              )}
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getContactStatusColor(customer.contact_made)}`}>
                Contact Made: {customer.contact_made}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Name</span>
              <span className="text-gray-900 mt-1 text-base font-medium">{customer.name || "—"}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Email</span>
              <span className="text-gray-900 mt-1 text-base">{customer.email || "—"}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Phone</span>
              <span className="text-gray-900 mt-1 text-base">{customer.phone || "—"}</span>
            </div>
            
            <div className="flex flex-col md:col-span-2">
              <span className="text-sm text-gray-500 font-medium">Address</span>
              <div className="mt-1">
                <span className="text-gray-900 text-base">{customer.address || "—"}</span>
                {customer.postcode && (
                  <div className="flex items-center mt-1 space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                      {customer.postcode}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Preferred Contact</span>
              <div className="mt-1">
                {customer.preferred_contact_method ? (
                  <div className="flex items-center space-x-2">
                    {getContactMethodIcon(customer.preferred_contact_method)}
                    <span className="text-gray-900 text-base">{customer.preferred_contact_method}</span>
                  </div>
                ) : (
                  <span className="text-gray-900 text-base">—</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Marketing Opt-in</span>
              <span className={`mt-1 text-base ${customer.marketing_opt_in ? 'text-green-600' : 'text-gray-600'}`}>
                {customer.marketing_opt_in ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Customer Since</span>
              <span className="text-gray-900 mt-1 text-base">{formatDate(customer.created_at)}</span>
            </div>
          </div>

          {customer.notes && (
            <div className="mt-6">
              <span className="text-sm text-gray-500 font-medium">Notes</span>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900 text-base whitespace-pre-wrap">{customer.notes}</span>
              </div>
            </div>
          )}
        </div>

        {/* Form Submissions */}
        <div className="border-t border-gray-200 pt-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Form Submissions</h2>
          {customer.form_submissions && customer.form_submissions.length > 0 ? (
            <div className="space-y-6">
              {customer.form_submissions.map((submission) => (
                <div key={submission.id}>
                  {renderFormSubmission(submission)}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 bg-gray-50 p-6 rounded-lg text-center">
              <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="mb-2">No form submissions found for this customer.</p>
              <p className="text-sm">Generate a form link above to collect customer information.</p>
            </div>
          )}
        </div>

        {/* Jobs */}
        <div className="border-t border-gray-200 pt-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Jobs</h2>
          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium">{job.job_reference || `Job #${job.id}`}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          job.stage === 'Complete' ? 'bg-green-100 text-green-800' :
                          job.stage === 'Production' ? 'bg-blue-100 text-blue-800' :
                          job.stage === 'Accepted' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.stage}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Type: {job.type}</p>
                      <p className="text-sm text-gray-500">Created: {formatDate(job.created_at)}</p>
                      {job.quote_price && (
                        <p className="text-sm text-gray-500">Quote Price: £{job.quote_price.toFixed(2)}</p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleViewJob(job.id)}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <Briefcase className="h-4 w-4" />
                      <span>View Job</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 bg-gray-50 p-6 rounded-lg text-center">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>No jobs found for this customer.</p>
            </div>
          )}
        </div>

        {/* Quotations */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quotations</h2>
          {quotations.length > 0 ? (
            <div className="space-y-4">
              {quotations.map((quote) => (
                <div key={quote.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Quote #{quote.id}</h3>
                      <p className="text-sm text-gray-500">Created: {formatDate(quote.created_at)}</p>
                      <p className="text-sm text-gray-500">Total: £{Number(quote.total)?.toFixed(2) ?? "—"}</p>
                    </div>
                    <Button
                      onClick={() => handleViewQuote(quote.id)}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span>View Quote</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 bg-gray-50 p-6 rounded-lg text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>No quotations found for this customer.</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formType === "kitchen" ? "Kitchen" : "Bedroom"} Checklist Form Link Generated</DialogTitle>
            <DialogDescription>
              Share this link with {customer.name} to fill out the {formType === "kitchen" ? "kitchen" : "bedroom"} checklist form. 
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
}