"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Edit, FileText, ChevronDown, Briefcase, CheckSquare } from "lucide-react";

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

// Format date to readable format (date only)
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
  const id = params?.id;
  const [customer, setCustomer] = useState<any | null>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleViewQuote = (quoteId: string) => {
    router.push(`/dashboard/quotes/${quoteId}`);
  };

  const handleViewJob = (jobId: string) => {
    router.push(`/dashboard/jobs/${jobId}`);
  };

  const renderFormSubmission = (submission: any) => {
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
        <div className="bg-gray-50 p-4 rounded">
          <pre className="text-sm overflow-x-auto">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Form Submission</h2>
          <span className="text-sm text-gray-500">
            Submitted: {formatDate(submission.submitted_at)}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">
                {FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <span className="text-gray-900 mt-1 text-base">
                {typeof value === "object" ? JSON.stringify(value) : String(value) || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!customer) return <div className="p-8">Customer not found.</div>;

  const formSubmission = Array.isArray(customer.form_submissions) && customer.form_submissions.length > 0 
    ? customer.form_submissions[0] 
    : null;

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
            {/* Create Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <span>Create</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCreateQuote} className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Quote</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateJob} className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4" />
                  <span>Job</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateChecklist} className="flex items-center space-x-2">
                  <CheckSquare className="h-4 w-4" />
                  <span>Checklist</span>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Name</span>
              <span className="text-gray-900 mt-1 text-base">{customer.name || "—"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Email</span>
              <span className="text-gray-900 mt-1 text-base">{customer.email || "—"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Phone</span>
              <span className="text-gray-900 mt-1 text-base">{customer.phone || "—"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Address</span>
              <span className="text-gray-900 mt-1 text-base">{customer.address || "—"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Status</span>
              <span className="text-gray-900 mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  customer.status === 'active' ? 'bg-green-100 text-green-800' : 
                  customer.status === 'inactive' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {customer.status || "Unknown"}
                </span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Customer Since</span>
              <span className="text-gray-900 mt-1 text-base">{formatDate(customer.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Form Submission */}
        <div className="border-t border-gray-200 pt-8 mb-8">
          {formSubmission ? (
            renderFormSubmission(formSubmission)
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Submission</h2>
              <div className="text-gray-500">
                <p>No form submission found for this customer.</p>
              </div>
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
            <div className="text-gray-500">
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
                      <p className="text-sm text-gray-500">Total: £{quote.total.toFixed(2)}</p>
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
            <div className="text-gray-500">
              <p>No quotations found for this customer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}