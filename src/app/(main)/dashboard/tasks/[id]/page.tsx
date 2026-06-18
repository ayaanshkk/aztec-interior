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
  Plus,
  CheckCircle,
  Trash2,
  Eye,
  Download,
  Image as ImageIcon,
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
import { fetchWithAuth, BACKEND_URL } from "@/lib/api";

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

const getStageColor = (stage: string) => {
  const colors: Record<string, string> = {
    Survey: "bg-purple-100 text-purple-800",
    Delivery: "bg-cyan-100 text-cyan-800",
    Installation: "bg-teal-100 text-teal-800",
    Lead: "bg-gray-100 text-gray-800",
    Quote: "bg-yellow-100 text-yellow-800",
    Consultation: "bg-purple-100 text-purple-800",
    Accepted: "bg-green-100 text-green-800",
    Production: "bg-orange-100 text-orange-800",
    Complete: "bg-emerald-100 text-emerald-800",
  };
  return colors[stage] || "bg-gray-100 text-gray-800";
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

      // ✅ Load task details with customer data already included
      const jobRes = await fetchWithAuth(`tasks/${jobId}`);
      if (!jobRes.ok) {
        const error = await jobRes.json().catch(() => ({ error: 'Failed to fetch task' }));
        throw new Error(error.error || 'Failed to fetch task');
      }
      
      const jobData = await jobRes.json();
      console.log("✅ Task data loaded:", jobData);
      setJob(jobData);

      // ✅ Customer data is already included in the response
      if (jobData.customer) {
        setCustomer(jobData.customer);
      }

      // ✅ Documents are already included in the response
      if (jobData.documents && Array.isArray(jobData.documents)) {
        console.log(`✅ Loaded ${jobData.documents.length} documents`);
        setDocuments(jobData.documents);
      } else {
        setDocuments([]);
      }

      // ✅ Form submissions are already included in the response
      if (jobData.form_submissions && Array.isArray(jobData.form_submissions)) {
        console.log(`✅ Loaded ${jobData.form_submissions.length} form submissions`);
        setFormSubmissions(jobData.form_submissions);
      } else {
        setFormSubmissions([]);
      }

    } catch (error) {
      console.error("Error loading task data:", error);
      alert(`Failed to load task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/tasks/${jobId}/edit`);
  };

  const handleCreateSchedule = () => {
    router.push(`/dashboard/schedules/create?jobId=${jobId}`);
  };

  // Delete job handler
  const handleDeleteJob = async () => {
    try {
      const response = await fetchWithAuth(`tasks/${jobId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete job");
      }

      router.push("/dashboard/tasks?deleted=true");
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Task not found</p>
          <Button onClick={() => router.push("/dashboard/tasks")} className="mt-4">
            Back to Tasks
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
                Task {job.job_reference} created successfully!
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
                onClick={() => router.push("/dashboard/tasks")}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-semibold text-gray-900">
                    {job.job_reference || job.title || `Task #${job.id}`}
                  </h1>
                  {job.stage && (
                    <Badge className={getStageColor(job.stage)}>{job.stage}</Badge>
                  )}
                </div>
                <p className="mt-1 text-lg text-gray-600">
                  {job.title || job.job_type || 'Task'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Task
              </Button>
              
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Task
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
                    <p className="text-sm text-gray-600">
                      {customer?.name || job.customer_name || "Unknown"}
                    </p>
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
                    <p className="text-sm text-gray-600">
                      {formatDate(job.delivery_date || job.end_date)}
                    </p>
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
                      {job.installation_address?.split(",")[0] || 
                       customer?.address?.split(",")[0] || 
                       "—"}
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">
              <FileText className="mr-2 h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="documents">
              <ImageIcon className="mr-2 h-4 w-4" />
              Drawings & Layouts
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-2">{documents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="checklists">
              <CheckSquare className="mr-2 h-4 w-4" />
              Checklists
              {formSubmissions.length > 0 && (
                <Badge variant="secondary" className="ml-2">{formSubmissions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Job Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Task Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Task Reference</p>
                      <p className="text-base">{job.job_reference || `Task #${job.id}`}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Type</p>
                      <p className="text-base">{job.job_type || job.type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Work Stage</p>
                      <Badge className={getStageColor(job.stage || job.work_stage || 'Survey')}>
                        {job.stage || job.work_stage || 'Survey'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <p className="text-base">{job.status || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Created</p>
                      <p className="text-base">{formatDate(job.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Team Member</p>
                      <p className="text-base">
                        {job.team_member || job.salesperson_name || "—"}
                      </p>
                    </div>
                  </div>

                  {job.notes && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-gray-500 mb-2">Notes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.notes}</p>
                    </div>
                  )}
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
                      {customer.contact_name && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Contact Name</p>
                          <p className="text-base">{customer.contact_name}</p>
                        </div>
                      )}
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
                      {customer.postcode && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Postcode</p>
                          <p className="text-base">{customer.postcode}</p>
                        </div>
                      )}
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
                      <p className="text-sm font-medium text-gray-500">Start Date</p>
                      <p className="text-base">{formatDate(job.start_date || job.date)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">End Date</p>
                      <p className="text-base">{formatDate(job.end_date)}</p>
                    </div>
                    {job.measure_date && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Measure Date</p>
                        <p className="text-base">{formatDate(job.measure_date)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Installation Address */}
              {(job.installation_address || customer?.address) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Installation Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base">
                      {job.installation_address || customer?.address || "—"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* DRAWINGS & LAYOUTS TAB */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Drawings & Layouts</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Documents uploaded by the customer
                    </p>
                  </div>
                  {customer && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Upload in Customer Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between rounded border p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{doc.filename}</p>
                            <p className="text-sm text-gray-500">
                              {doc.type && <span className="capitalize">{doc.type}</span>}
                              {doc.created_at && (
                                <>
                                  {doc.type && ' • '}
                                  {formatDate(doc.created_at)}
                                </>
                              )}
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
                                : `${BACKEND_URL}${doc.url}`;
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
                                : `${BACKEND_URL}${doc.url}`;
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
                    <p className="font-medium">No drawings uploaded yet</p>
                    <p className="text-sm mt-1">Customer hasn't uploaded any drawings or layouts</p>
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

          {/* CHECKLISTS TAB */}
          <TabsContent value="checklists" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Checklists & Form Submissions</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Forms submitted by the customer
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
                      
                      // Determine form type and name
                      const formType = form.form_type || formData.form_type || formData.checklistType || 'form';
                      const formName = form.form_name || 
                        (formType.toLowerCase().includes('kitchen') ? 'Kitchen Checklist' :
                         formType.toLowerCase().includes('bedroom') ? 'Bedroom Checklist' :
                         `${formType} Form`);
                      
                      return (
                        <div key={form.id} className="rounded border p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <CheckSquare className="h-5 w-5 text-green-500" />
                              <div>
                                <p className="font-medium">{formName}</p>
                                <p className="text-sm text-gray-500">
                                  Submitted: {formatDate(form.submitted_at || form.created_at)}
                                  {form.submitted_by && form.submitted_by !== 'Public Form' ? ` • by ${form.submitted_by}` : ''}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/checklist-view/?id=${form.id}`, '_blank')}
                            >
                              View Details
                            </Button>
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
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                Are you sure you want to delete this task?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                <p><strong>Task Reference:</strong> {job.job_reference}</p>
                <p><strong>Customer:</strong> {customer?.name || job.customer_name}</p>
                <p><strong>Type:</strong> {job.job_type || job.type}</p>
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
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}