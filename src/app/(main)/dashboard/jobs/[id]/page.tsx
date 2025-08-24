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
  DollarSign,
  Users,
  MessageSquare,
  Upload,
  Plus,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

const formatCurrency = (amount: number | null | undefined) => {
  if (!amount && amount !== 0) return "—";
  return `£${amount.toFixed(2)}`;
};

const getStageColor = (stage: string) => {
  const colors: Record<string, string> = {
    'Lead': 'bg-gray-100 text-gray-800',
    'Survey': 'bg-blue-100 text-blue-800',
    'Quote': 'bg-yellow-100 text-yellow-800',
    'Consultation': 'bg-purple-100 text-purple-800',
    'Accepted': 'bg-green-100 text-green-800',
    'Production': 'bg-orange-100 text-orange-800',
    'Delivery': 'bg-indigo-100 text-indigo-800',
    'Complete': 'bg-emerald-100 text-emerald-800',
  };
  return colors[stage] || 'bg-gray-100 text-gray-800';
};

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    'Low': 'bg-green-100 text-green-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'High': 'bg-orange-100 text-orange-800',
    'Urgent': 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params?.id;
  const showSuccess = searchParams?.get('success') === 'created';
  
  const [job, setJob] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [quote, setQuote] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (!jobId) return;
    loadJobData();
  }, [jobId]);

  const loadJobData = async () => {
    try {
      setLoading(true);

      // Load job details
      const jobRes = await fetch(`http://127.0.0.1:5000/jobs/${jobId}`);
      if (!jobRes.ok) throw new Error("Failed to fetch job");
      const jobData = await jobRes.json();
      setJob(jobData);

      // Load customer details
      if (jobData.customer_id) {
        const customerRes = await fetch(`http://127.0.0.1:5000/customers/${jobData.customer_id}`);
        if (customerRes.ok) {
          const customerData = await customerRes.json();
          setCustomer(customerData);
        }
      }

      // Load linked quote
      if (jobData.quote_id) {
        const quoteRes = await fetch(`http://127.0.0.1:5000/quotations/${jobData.quote_id}`);
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          setQuote(quoteData);
        }
      }

      // Load documents (mock data for now)
      setDocuments([
        { id: 1, name: "Floor Plan.pdf", type: "PDF", size: "2.1 MB", uploaded_at: "2024-01-15" },
        { id: 2, name: "Kitchen Design.png", type: "Image", size: "1.8 MB", uploaded_at: "2024-01-16" },
      ]);

      // Load checklists (mock data for now)
      setChecklists([
        { id: 1, name: "Pre-Installation Checklist", status: "Complete", items_completed: 8, total_items: 8 },
        { id: 2, name: "Quality Control Checklist", status: "In Progress", items_completed: 3, total_items: 12 },
      ]);

    } catch (error) {
      console.error("Error loading job data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/jobs/${jobId}/edit`);
  };

  const handleAddRooms = () => {
    router.push(`/dashboard/jobs/${jobId}/rooms`);
  };

  const handleCreateCountingSheet = () => {
    router.push(`/dashboard/counting-sheets/create?jobId=${jobId}`);
  };

  const handleCreateSchedule = () => {
    router.push(`/dashboard/schedules/create?jobId=${jobId}`);
  };

  const handleCreateInvoice = () => {
    router.push(`/dashboard/invoices/create?jobId=${jobId}`);
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!job) {
    return <div className="p-8">Job not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Alert */}
      {showSuccess && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-8 py-4">
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
        <div className="max-w-7xl mx-auto px-8 py-6">
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
                  <h1 className="text-3xl font-semibold text-gray-900">
                    {job.job_reference || `Job #${job.id}`}
                  </h1>
                  <Badge className={getStageColor(job.stage)}>
                    {job.stage}
                  </Badge>
                  {job.priority && (
                    <Badge variant="outline" className={getPriorityColor(job.priority)}>
                      {job.priority}
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-gray-600 mt-1">{job.job_name || job.type}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Job
              </Button>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <DollarSign className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Agreed Price</p>
                    <p className="text-sm text-gray-600">{formatCurrency(job.agreed_price)}</p>
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
                    <p className="text-sm text-gray-600 truncate">
                      {job.installation_address ? job.installation_address.split(',')[0] : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Next Steps CTA Panel */}
      {showSuccess && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900">Next Steps</h3>
                <p className="text-sm text-blue-700">Complete your job setup with these quick actions</p>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={handleAddRooms}>
                  Add Rooms
                </Button>
                <Button size="sm" variant="outline" onClick={handleCreateCountingSheet}>
                  Create Counting Sheet
                </Button>
                <Button size="sm" variant="outline" onClick={handleCreateSchedule}>
                  Create Schedule
                </Button>
                <Button size="sm" onClick={handleCreateInvoice}>
                  Create Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="checklists">Checklists</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <p className="text-base">{job.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Stage</p>
                      <Badge className={getStageColor(job.stage)}>{job.stage}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Priority</p>
                      <Badge variant="outline" className={getPriorityColor(job.priority || 'Medium')}>
                        {job.priority || 'Medium'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Created</p>
                      <p className="text-base">{formatDate(job.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Salesperson</p>
                      <p className="text-base">{job.salesperson_name || "—"}</p>
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
                        <p className="text-base">{customer.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="text-base">{customer.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Address</p>
                        <p className="text-base">{customer.address}</p>
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
                  <p className="text-base">{job.installation_address || "—"}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Documents</CardTitle>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-gray-500">{doc.size} • {formatDate(doc.uploaded_at)}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">View</Button>
                          <Button variant="ghost" size="sm">Download</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No documents uploaded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklists" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Checklists</CardTitle>
                  <Button onClick={handleCreateCountingSheet}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Checklist
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {checklists.length > 0 ? (
                  <div className="space-y-3">
                    {checklists.map(checklist => (
                      <div key={checklist.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <CheckSquare className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{checklist.name}</p>
                            <p className="text-sm text-gray-500">
                              {checklist.items_completed}/{checklist.total_items} items completed
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={checklist.status === 'Complete' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {checklist.status}
                          </Badge>
                          <Button variant="outline" size="sm">View</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No checklists created yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Schedule</CardTitle>
                  <Button onClick={handleCreateSchedule}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Create Schedule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No schedule created yet</p>
                  <p className="text-sm mt-2">Create a schedule to track project milestones and deadlines</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pricing Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Quote Price</span>
                      <span className="text-base">{formatCurrency(job.quote_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Agreed Price</span>
                      <span className="text-base font-medium">{formatCurrency(job.agreed_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Deposit Amount</span>
                      <span className="text-base">{formatCurrency(job.deposit_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Deposit Due</span>
                      <span className="text-base">{formatDate(job.deposit_due_date)}</span>
                    </div>
                  </div>
                  
                  {quote && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Linked Quote</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/dashboard/quotes/${quote.id}`)}
                        >
                          View Quote #{quote.id}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invoices & Payments */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Invoices & Payments</CardTitle>
                    <Button size="sm" onClick={handleCreateInvoice}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No invoices created yet</p>
                    <p className="text-sm mt-2">Create invoices to track payments and billing</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Assigned Team</p>
                    <p className="text-base">{job.assigned_team_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Primary Fitter</p>
                    <p className="text-base">{job.primary_fitter_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Salesperson</p>
                    <p className="text-base">{job.salesperson_name || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Notes & Comments</CardTitle>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {job.notes ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded border">
                      <div className="flex items-start space-x-3">
                        <MessageSquare className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Initial Notes</p>
                          <p className="text-sm text-gray-600 mt-1">{job.notes}</p>
                          <p className="text-xs text-gray-500 mt-2">Added: {formatDate(job.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No notes added yet</p>
                    <p className="text-sm mt-2">Add notes to track important information and updates</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}