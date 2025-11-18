"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Calendar,
  MapPin,
  User,
  FileText,
  CheckSquare,
  Clock,
  Plus,
  CheckCircle,
  Trash2,
  Eye,
  Download,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchWithAuth } from "@/lib/api";

const formatDate = (dateString: string) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (amount: number | null | undefined) => {
  if (!amount && amount !== 0) return "—";
  return `£${amount.toFixed(2)}`;
};

const getStageColor = (stage: string) => {
  const colors: Record<string, string> = {
    Lead: "bg-gray-100 text-gray-800",
    Survey: "bg-blue-100 text-blue-800",
    Quote: "bg-yellow-100 text-yellow-800",
    Consultation: "bg-purple-100 text-purple-800",
    Accepted: "bg-green-100 text-green-800",
    Production: "bg-orange-100 text-orange-800",
    Delivery: "bg-indigo-100 text-indigo-800",
    Complete: "bg-emerald-100 text-emerald-800",
  };
  return colors[stage] || "bg-gray-100 text-gray-800";
};

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    Low: "bg-green-100 text-green-800",
    Medium: "bg-yellow-100 text-yellow-800",
    High: "bg-orange-100 text-orange-800",
    Urgent: "bg-red-100 text-red-800",
  };
  return colors[priority] || "bg-gray-100 text-gray-800";
};

const getApprovalStatusBadge = (status: string) => {
  const variants: Record<string, { className: string; text: string }> = {
    pending: { className: "bg-yellow-100 text-yellow-800", text: "Pending" },
    approved: { className: "bg-green-100 text-green-800", text: "Approved" },
    rejected: { className: "bg-red-100 text-red-800", text: "Rejected" },
  };
  const variant = variants[status] || variants.pending;
  return <Badge className={variant.className}>{variant.text}</Badge>;
};

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params?.id;
  const showSuccess = searchParams?.get("success") === "created";

  const [job, setJob] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    loadJobData();
  }, [jobId]);

  const loadJobData = async () => {
    try {
      setLoading(true);

      // Load job details
      const jobRes = await fetchWithAuth(`jobs/${jobId}`);
      if (!jobRes.ok) throw new Error("Failed to fetch job");
      const jobData = await jobRes.json();
      setJob(jobData);

      // Load customer details
      if (jobData.customer_id) {
        const customerRes = await fetchWithAuth(`customers/${jobData.customer_id}`);
        if (customerRes.ok) {
          const customerData = await customerRes.json();
          setCustomer(customerData);
          
          // ✅ FIXED: Load customer's drawings from correct endpoint
          try {
            const docsRes = await fetchWithAuth(`files/drawings?customer_id=${jobData.customer_id}`);
            if (docsRes.ok) {
              const docsData = await docsRes.json();
              console.log("✅ Loaded documents:", docsData);
              
              // Map the response to match our interface
              const mappedDocs = docsData.map((doc: any) => ({
                id: doc.id,
                filename: doc.file_name || doc.filename,
                url: doc.file_url || doc.url,
                type: doc.category || doc.type || 'other',
                created_at: doc.created_at,
                uploaded_by: doc.uploaded_by
              }));
              
              setDocuments(mappedDocs);
            } else {
              console.log("No drawings found or endpoint returned non-OK status");
              setDocuments([]);
            }
          } catch (error) {
            console.error("Error loading documents:", error);
            setDocuments([]);
          }

          // ✅ FIXED: Get form submissions from customer object
          try {
            // Form submissions are nested in the customer object
            const formSubmissions = customerData.form_submissions || [];
            console.log("✅ Loaded form submissions:", formSubmissions);
            setFormSubmissions(formSubmissions);
          } catch (error) {
            console.error("Error loading form submissions:", error);
            setFormSubmissions([]);
          }
        }
      }

    } catch (error) {
      console.error("Error loading job data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/jobs/${jobId}/edit`);
  };

  const handleCreateSchedule = () => {
    router.push(`/dashboard/schedules/create?jobId=${jobId}`);
  };

  // Delete job handler
  const handleDeleteJob = async () => {
    try {
      const response = await fetchWithAuth(`jobs/${jobId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete job");
      }

      router.push("/dashboard/jobs?deleted=true");
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete job. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Job not found</p>
          <Button onClick={() => router.push("/dashboard/jobs")} className="mt-4">
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Alert */}
      {showSuccess && (
        <div className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-8 py-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Job {job.job_reference} created successfully!
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard/jobs")}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-semibold text-gray-900">{job.job_reference || `Job #${job.id}`}</h1>
                  <Badge className={getStageColor(job.stage)}>{job.stage}</Badge>
                  {job.priority && (
                    <Badge variant="outline" className={getPriorityColor(job.priority)}>
                      {job.priority}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-lg text-gray-600">{job.job_name || job.job_type}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Job
              </Button>
              
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Job
              </Button>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Customer</p>
                    <p className="text-sm text-gray-600">{customer?.name || "Unknown"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Delivery Date</p>
                    <p className="text-sm text-gray-600">{formatDate(job.delivery_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="truncate text-sm text-gray-600">
                      {job.installation_address ? job.installation_address.split(",")[0] : customer?.address?.split(",")[0] || "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="documents">
              Documents
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-2">{documents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="checklists">
              Checklists
              {formSubmissions.length > 0 && (
                <Badge variant="secondary" className="ml-2">{formSubmissions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Job Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Job Reference</p>
                      <p className="text-base">{job.job_reference || `Job #${job.id}`}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Type</p>
                      <p className="text-base">{job.job_type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Stage</p>
                      <Badge className={getStageColor(job.stage)}>{job.stage}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Priority</p>
                      <Badge variant="outline" className={getPriorityColor(job.priority || "Medium")}>
                        {job.priority || "Medium"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Created</p>
                      <p className="text-base">{formatDate(job.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Salesperson</p>
                      <p className="text-base">{job.salesperson_name || customer?.salesperson || "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customer ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Name</p>
                        <p className="text-base">{customer.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-base">{customer.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="text-base">{customer.phone || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Address</p>
                        <p className="text-base">{customer.address || "—"}</p>
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                        >
                          View Customer Profile
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Customer information not available</p>
                  )}
                </CardContent>
              </Card>

              {/* Important Dates */}
              <Card>
                <CardHeader>
                  <CardTitle>Important Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Measure Date</p>
                      <p className="text-base">{formatDate(job.measure_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Delivery Date</p>
                      <p className="text-base">{formatDate(job.delivery_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Completion Date</p>
                      <p className="text-base">{formatDate(job.completion_date)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Installation Address */}
              <Card>
                <CardHeader>
                  <CardTitle>Installation Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base">{job.installation_address || customer?.address || "—"}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* DOCUMENTS TAB - Real-time from Customer's Drawings */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Documents & Drawings</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Documents uploaded by the customer in their profile
                    </p>
                  </div>
                  {customer && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                    >
                      View in Customer Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded border p-4 hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{doc.filename}</p>
                            <p className="text-sm text-gray-500">
                              {doc.type} • {formatDate(doc.created_at)}
                              {doc.uploaded_by && ` • Uploaded by ${doc.uploaded_by}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const viewUrl = doc.url.startsWith('http') 
                                ? doc.url 
                                : `https://aztec-interiors.onrender.com${doc.url}`;
                              window.open(viewUrl, '_blank');
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const downloadUrl = doc.url.startsWith('http') 
                                ? doc.url 
                                : `https://aztec-interiors.onrender.com${doc.url}`;
                              const link = document.createElement('a');
                              link.href = downloadUrl;
                              link.download = doc.filename;
                              link.click();
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500">
                    <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="font-medium">No documents uploaded yet</p>
                    <p className="text-sm mt-1">Customer hasn't uploaded any drawings or documents</p>
                    {customer && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                      >
                        Go to Customer Profile to Upload
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHECKLISTS TAB - Real-time from Customer's Form Submissions */}
          <TabsContent value="checklists" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Form Submissions</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Checklists and forms submitted by the customer
                    </p>
                  </div>
                  {customer && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                    >
                      View in Customer Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {formSubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {formSubmissions.map((form) => {
                      // Parse form data
                      let formData: any = {};
                      try {
                        formData = typeof form.form_data === 'string' 
                          ? JSON.parse(form.form_data) 
                          : form.form_data || {};
                      } catch {
                        formData = {};
                      }
                      
                      const formKeys = Object.keys(formData);
                      const completedFields = formKeys.filter(key => 
                        formData[key] && formData[key] !== ''
                      ).length;
                      
                      // Determine form type
                      const formType = formData.form_type || formData.checklistType || 'form';
                      const isChecklist = formType.toLowerCase().includes('kitchen') || 
                                        formType.toLowerCase().includes('bedroom');
                      
                      return (
                        <div key={form.id} className="rounded border p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <CheckSquare className="h-5 w-5 text-green-500" />
                              <div>
                                <p className="font-medium">
                                  {isChecklist 
                                    ? `${formType.charAt(0).toUpperCase() + formType.slice(1)} Checklist`
                                    : 'Form Submission'} #{form.id}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Submitted: {formatDate(form.submitted_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {form.approval_status && getApprovalStatusBadge(form.approval_status)}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Open checklist in new tab or navigate to customer profile
                                  if (isChecklist) {
                                    window.open(`/streemlyne/checklist-view?id=${form.id}`, '_blank');
                                  } else {
                                    router.push(`/dashboard/customers/${customer.id}?formId=${form.id}`);
                                  }
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {formKeys.length > 0 && (
                            <div className="mb-2">
                              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                                <span>Completion</span>
                                <span>{completedFields}/{formKeys.length} fields</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full transition-all"
                                  style={{ width: `${(completedFields / formKeys.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Show preview of key fields */}
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            {formKeys.slice(0, 4).map((key) => (
                              <div key={key} className="text-gray-600">
                                <span className="font-medium capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </span>{' '}
                                <span className="text-gray-900">
                                  {formData[key] ? String(formData[key]).substring(0, 30) : '—'}
                                  {formData[key] && String(formData[key]).length > 30 ? '...' : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500">
                    <CheckSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="font-medium">No form submissions yet</p>
                    <p className="text-sm mt-1">Customer hasn't submitted any checklists or forms</p>
                    {customer && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                      >
                        Go to Customer Profile
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCHEDULE TAB */}
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Schedule</CardTitle>
                  <Button onClick={handleCreateSchedule}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Schedule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="py-12 text-center text-gray-500">
                  <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="font-medium">No schedule created yet</p>
                  <p className="text-sm mt-1">Create a schedule to track project milestones and deadlines</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleCreateSchedule}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job?</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                Are you sure you want to delete this job?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                <p><strong>Job Reference:</strong> {job.job_reference}</p>
                <p><strong>Customer:</strong> {customer?.name}</p>
                <p><strong>Type:</strong> {job.job_type}</p>
              </div>
              <p className="mt-3 text-red-600 font-medium">
                This action cannot be undone. All associated data will be permanently deleted.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJob}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}