"use client";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Calendar,
  Package,
  FileText,
  Eye,
  Upload,
  Trash2,
  Image,
  Plus,
  X,
  ChevronDown,
  CheckSquare,
  Receipt,
  DollarSign,
  Edit,
  Loader2,
  ClipboardList,
  User,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BACKEND_URL } from "@/lib/api";

interface Project {
  id: string;
  display_id: string;
  project_name: string;
  project_title: string;
  project_type: "Kitchen" | "Bedroom" | "Wardrobe" | "Remedial" | "Other";
  stage: string;
  date_of_measure: string | null;
  notes: string;
  form_count: number;
  created_at: string;
  customer_id: string;
  project_description?: string;
  status?: string;
  priority?: string;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
}

interface DrawingDocument {
  id: string;
  filename: string;
  url: string;
  type: "pdf" | "image" | "other";
  created_at: string;
  project_id?: string;
}

interface FormSubmission {
  id: number;
  token_used: string;
  submitted_at: string;
  form_data: any;
  project_id?: string;
  created_by?: number;
}

interface FinancialDocument {
  id: string | number;
  type: "quotation" | "invoice" | "proforma" | "receipt" | "deposit" | "final" | "payment_terms" | "terms";
  title: string;
  reference?: string;
  total?: number;
  amount_paid?: number;
  balance?: number;
  created_at: string;
  created_by?: string;
  status?: string;
  form_submission_id?: number;
  project_id?: string;
  customer_id?: string;
}

const DRAWING_DOCUMENT_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4 text-red-600" />,
  image: <Image className="h-4 w-4 text-green-600" />,
  other: <FileText className="h-4 w-4 text-gray-600" />,
};

const formatDate = (dateString: string) => {
  if (!dateString) return "—";
  try {
    const isoLike = /^\d{4}-\d{2}-\d{2}$/;
    const date = isoLike.test(dateString) ? new Date(dateString + "T00:00:00") : new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const getProjectTypeColor = (type: string) => {
  switch (type) {
    case "Kitchen":
      return "bg-blue-100 text-blue-800";
    case "Bedroom":
      return "bg-purple-100 text-purple-800";
    case "Wardrobe":
      return "bg-green-100 text-green-800";
    case "Remedial":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStageColor = (stage: string) => {
  switch (stage) {
    case "Complete":
      return "bg-green-100 text-green-800";
    case "Production":
      return "bg-blue-100 text-blue-800";
    case "Installation":
      return "bg-orange-100 text-orange-800";
    case "Measure":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getFormType = (submission: FormSubmission): string => {
  if (submission.form_data && submission.form_data.form_type) {
    return submission.form_data.form_type.toLowerCase();
  }
  
  const token = (submission.token_used || "").toLowerCase();
  if (token.includes("bedroom")) return "bedroom";
  if (token.includes("kitchen")) return "kitchen";
  if (token.includes("remedial")) return "remedial";
  if (token.includes("checklist")) return "checklist";
  if (token.includes("quote") || token.includes("quotation")) return "quotation";
  if (token.includes("invoice") && !token.includes("proforma")) return "invoice";
  if (token.includes("proforma")) return "proforma";
  if (token.includes("receipt")) return "receipt";
  if (token.includes("payment")) return "payment";
  
  return "other";
};

const getFormTitle = (submission: FormSubmission): string => {
  const formType = getFormType(submission);
  
  switch (formType) {
    case "bedroom":
      return "Bedroom Checklist";
    case "kitchen":
      return "Kitchen Checklist";
    case "remedial":
      return "Remedial Action Checklist";
    case "checklist":
      return "General Checklist";
    case "quotation":
      return "Quotation";
    case "invoice":
      return "Invoice";
    case "proforma":
      return "Proforma Invoice";
    case "receipt":
      return "Receipt";
    case "payment":
      return "Payment Terms";
    default:
      if (submission.form_data) {
        if (submission.form_data.customer_name) {
          return `Form - ${submission.form_data.customer_name}`;
        }
      }
      return `Form #${submission.id}`;
  }
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [drawings, setDrawings] = useState<DrawingDocument[]>([]);
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDrawings, setSelectedDrawings] = useState<Set<string>>(new Set());
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showDeleteDrawingDialog, setShowDeleteDrawingDialog] = useState(false);
  const [drawingToDelete, setDrawingToDelete] = useState<DrawingDocument | null>(null);
  const [isDeletingDrawing, setIsDeletingDrawing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [financialDocuments, setFinancialDocuments] = useState<FinancialDocument[]>([]);
  const [showQuoteGenerationDialog, setShowQuoteGenerationDialog] = useState(false);
  const [formSubmissions, setFormSubmissions] = useState<any[]>([]);
  const [checklistForQuote, setChecklistForQuote] = useState<{
    type: string;
    id: number;
  } | null>(null);
  const [showDeleteFormDialog, setShowDeleteFormDialog] = useState(false);
  const [formToDelete, setFormToDelete] = useState<FormSubmission | null>(null);
  const [isDeletingForm, setIsDeletingForm] = useState(false);
  const [deletingQuoteId, setDeletingQuoteId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<{ id: number; reference: string } | null>(null);

  const [taskData, setTaskData] = useState({
    type: "Job",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    endDate: new Date().toISOString().split("T")[0],
    assignTo: "",
    jobTask: "",
    notes: "",
  });

  const canEdit = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    return ["platform admin", "production team", "salesperson"].includes(role);
  }, [user?.role]);

  const canDelete = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    return ["platform admin", "salesperson"].includes(role);
  }, [user?.role]);

  const canCreateFinancialDocs = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    return ["platform admin", "salesperson"].includes(role);
  }, [user?.role]);

  const loadProjectData = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    };

    try {
      const projectRes = await fetch(
        `${BACKEND_URL}/projects/${projectId}`, 
        { headers }
      );

      if (!projectRes.ok) {
        throw new Error("Failed to load project data");
      }

      const projectData = await projectRes.json();

      // ✅ Backend returns nested structure - extract correctly
      const normalizedProject = {
        id: projectData.id || projectData.project_id,
        display_id: projectData.display_id,
        project_name: projectData.project_name || projectData.project_title,
        project_title: projectData.project_title || projectData.project_name,
        project_type: projectData.project_type,  // ✅ REMOVE || "Other"
        stage: projectData.stage || projectData.stage_name,  // ✅ REMOVE || "Survey"
        stage_id: projectData.stage_id,
        date_of_measure: projectData.date_of_measure,
        notes: projectData.notes || "",
        form_count: projectData.forms?.length || 0,
        created_at: projectData.created_at,
        customer_id: projectData.customer?.id || projectData.client_id,
        project_description: projectData.project_description || "",
        status: projectData.status || "Active",
        priority: projectData.priority
      };

      // ✅ DEBUG LOG
      console.log('📊 Project loaded:', {
        project_type: normalizedProject.project_type,
        stage: normalizedProject.stage,
        backend_project_type: projectData.project_type,
        backend_stage: projectData.stage,
        backend_stage_name: projectData.stage_name
      });

      setProject(normalizedProject);

      if (projectData.customer) {
        setCustomer(projectData.customer);
      } else if (projectData.customer_id) {
        try {
          const customerRes = await fetch(
            `${BACKEND_URL}/customers/${projectData.customer_id}`,
            { headers }
          );

          if (customerRes.ok) {
            const customerData = await customerRes.json();
            setCustomer(customerData);
          }
        } catch (err) {
          console.warn("Failed to load customer:", err);
        }
      }

      const fetchWithFallback = async (url: string) => {
        try {
          const response = await fetch(url, { headers });
          if (!response.ok) {
            console.warn(`Failed to fetch ${url}: ${response.status}`);
            return null;
          }
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return await response.json();
          }
          return null;
        } catch (error) {
          console.warn(`Error fetching ${url}:`, error);
          return null;
        }
      };

      if (projectData.forms && Array.isArray(projectData.forms)) {
        setForms(projectData.forms);
        setFormSubmissions(projectData.forms);
      } else {
        const formsData = await fetchWithFallback(`${BACKEND_URL}/form-submissions?project_id=${projectId}`);
        if (formsData && Array.isArray(formsData)) {
          setForms(formsData);
          setFormSubmissions(formsData);
        } else {
          setForms([]);
          setFormSubmissions([]);
        }
      }

      // ✅ FIXED: Filter drawings by project_id
      if (projectData.drawings && Array.isArray(projectData.drawings)) {
        // Backend already filtered by project_id
        setDrawings(projectData.drawings);
      } else {
        // ✅ CRITICAL: Add project_id filter
        const drawingsData = await fetchWithFallback(
          `${BACKEND_URL}/files/documents?project_id=${projectId}&category=drawing`
        );
        if (drawingsData && Array.isArray(drawingsData)) {
          setDrawings(drawingsData);
        } else {
          setDrawings([]);
        }
      }

      const [quotationsData, invoicesData, receiptsData, paymentTermsData] = await Promise.all([
        fetchWithFallback(`${BACKEND_URL}/quotations?project_id=${projectId}`),
        fetchWithFallback(`${BACKEND_URL}/invoices?project_id=${projectId}`),
        fetchWithFallback(`${BACKEND_URL}/receipts?project_id=${projectId}`),
        fetchWithFallback(`${BACKEND_URL}/payment-terms?project_id=${projectId}`)
      ]);

      const allFinancialDocs: FinancialDocument[] = [];

      if (quotationsData && Array.isArray(quotationsData)) {
        quotationsData.forEach((quote) => {
          allFinancialDocs.push({
            id: quote.id,
            type: 'quotation',
            title: `Quotation ${quote.reference_number}`,
            reference: quote.reference_number,
            total: quote.total,
            status: quote.status,
            created_at: quote.created_at,
            project_id: quote.project_id,
          });
        });
      }

      if (invoicesData && Array.isArray(invoicesData)) {
        invoicesData.forEach((invoice) => {
          allFinancialDocs.push({
            id: invoice.id,
            type: invoice.invoice_number?.toLowerCase().includes('proforma') ? 'proforma' : 'invoice',
            title: invoice.invoice_number || `Invoice #${invoice.id}`,
            reference: invoice.invoice_number,
            total: invoice.total,
            status: invoice.status,
            created_at: invoice.created_at,
            project_id: invoice.project_id,
          });
        });
      }

      if (receiptsData && Array.isArray(receiptsData)) {
        receiptsData.forEach((receipt) => {
          const receiptType = receipt.receipt_type?.toLowerCase() || 'receipt';
          allFinancialDocs.push({
            id: receipt.id,
            type: receiptType.includes('deposit') ? 'deposit' : receiptType.includes('final') ? 'final' : 'receipt',
            title: `${receipt.receipt_type || 'Receipt'} - ${formatDate(receipt.payment_date)}`,
            reference: `#${receipt.id}`,
            amount_paid: receipt.amount_paid,
            balance: receipt.balance_to_pay,
            created_at: receipt.created_at,
            project_id: receipt.project_id,
          });
        });
      }

      if (paymentTermsData && Array.isArray(paymentTermsData)) {
        paymentTermsData.forEach((terms) => {
          allFinancialDocs.push({
            id: terms.id,
            type: 'payment_terms',
            title: terms.terms_title || 'Payment Terms',
            reference: `#${terms.id}`,
            total: terms.total_amount,
            created_at: terms.created_at,
            project_id: terms.project_id,
          });
        });
      }

      allFinancialDocs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setFinancialDocuments(allFinancialDocs);

    } catch (error) {
      console.error("Error loading project data:", error);
      setError("Failed to load project data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !user) return;
    loadProjectData();
  }, [projectId, user, loadProjectData]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const uploadedDocs: DrawingDocument[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("client_id", project?.customer_id || "");  // ✅ Use client_id
        formData.append("project_id", projectId);  // ✅ Associate with THIS project
        formData.append("category", "drawing");  // ✅ Specify category

        // ✅ Use unified documents endpoint
        const response = await fetch(`${BACKEND_URL}/files/documents`, {
          method: "POST",
          headers: headers,
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.document && data.document.id) {
            const newDoc: DrawingDocument = {
              id: String(data.document.id),
              filename: data.document.file_name || file.name,
              url: data.document.file_url,
              type: data.document.document_category || "other",
              created_at: new Date().toISOString(),
              project_id: projectId,
            };
            uploadedDocs.push(newDoc);
          }
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    if (uploadedDocs.length > 0) {
      setDrawings((prev) => {
        const updated = [...uploadedDocs, ...prev];
        return updated.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    }

    if (event.target) event.target.value = "";
  }, [projectId, project?.customer_id]);

  const handleViewDrawing = useCallback((doc: DrawingDocument) => {
    let viewUrl = doc.url;

    if (viewUrl && viewUrl.startsWith("http")) {
      window.open(viewUrl, "_blank");
      return;
    }

    if (viewUrl && !viewUrl.startsWith("http")) {
      viewUrl = `${BACKEND_URL}${viewUrl.startsWith("/") ? viewUrl : "/" + viewUrl}`;
    } else if (!viewUrl) {
      alert("Error: Drawing URL is missing or invalid.");
      return;
    }

    window.open(viewUrl, "_blank");
  }, []);

  const handleDeleteDrawing = useCallback((doc: DrawingDocument) => {
    setDrawingToDelete(doc);
    setShowDeleteDrawingDialog(true);
  }, []);
  
  const handleConfirmDeleteDrawing = useCallback(async () => {
    if (!drawingToDelete || isDeletingDrawing) return;
    setIsDeletingDrawing(true);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(
        `${BACKEND_URL}/files/drawings/${drawingToDelete.id}`,
        { method: "DELETE", headers }
      );

      if (res.ok) {
        setDrawings((prev) => prev.filter((d) => d.id !== drawingToDelete.id));
        setSelectedDrawings((prev) => {
          const newSet = new Set(prev);
          newSet.delete(drawingToDelete.id);
          return newSet;
        });
        setShowDeleteDrawingDialog(false);
        setDrawingToDelete(null);
      } else {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        alert(`Failed to delete: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Network error");
    } finally {
      setIsDeletingDrawing(false);
    }
  }, [drawingToDelete, isDeletingDrawing]);

  const handleToggleDrawingSelection = useCallback((drawingId: string) => {
    setSelectedDrawings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(drawingId)) {
        newSet.delete(drawingId);
      } else {
        newSet.add(drawingId);
      }
      return newSet;
    });
  }, []);

  const handleDeleteQuote = async (quoteId: number) => {
    setDeletingQuoteId(quoteId);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/quotations/${quoteId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete quotation');
      }

      await loadProjectData();
      alert('✅ Quotation deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting quotation:', error);
      alert('❌ Failed to delete quotation. Please try again.');
    } finally {
      setDeletingQuoteId(null);
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
    }
  };

  const handleAddTask = useCallback(async () => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const response = await fetch(`${BACKEND_URL}/tasks`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          ...taskData,
          project_id: projectId,
          customer_id: project?.customer_id,
        }),
      });

      if (response.ok) {
        alert("Task scheduled successfully!");
        setShowAddTaskDialog(false);
        setTaskData({
          type: "Job",
          date: new Date().toISOString().split("T")[0],
          startTime: "09:00",
          endTime: "17:00",
          endDate: new Date().toISOString().split("T")[0],
          assignTo: "",
          jobTask: `${project?.project_type} - ${project?.project_name}`,
          notes: `Customer: ${customer?.name}\nAddress: ${customer?.address}\nPhone: ${customer?.phone}`,
        });
      } else {
        const error = await response.json();
        alert(`Failed to create task: ${error.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Network error: Could not create task");
    }
  }, [taskData, projectId, project, customer]);

  const handleCreateKitchenChecklist = useCallback(() => {
    if (!canEdit) return;
    if (!customer?.id) {
      alert("Error: No customer associated with this project");
      return;
    }
    
    const params = new URLSearchParams({
      customerId: customer.id,
      customerName: customer.name || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      customerPostcode: customer.postcode || "",
      projectId: projectId,  // ✅ Include project ID
    });
    
    window.open(`/checklists/kitchen?${params.toString()}`, '_blank');
  }, [canEdit, customer, projectId]);

  const handleCreateBedroomChecklist = useCallback(() => {
    if (!canEdit) return;
    if (!customer?.id) {
      alert("Error: No customer associated with this project");
      return;
    }
    
    const params = new URLSearchParams({
      customerId: customer.id,
      customerName: customer.name || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      customerPostcode: customer.postcode || "",
      projectId: projectId,  // ✅ Include project ID
    });
    
    window.open(`/checklists/bedroom?${params.toString()}`, '_blank');
  }, [canEdit, customer, projectId]);

  const handleCreateQuote = useCallback(async () => {
    if (!customer?.id) {
      alert("Error: No customer associated with this project");
      return;
    }

    const bedroomChecklist = forms.find((form) => {
      try {
        const formDataRaw = typeof form.form_data === "string" 
          ? JSON.parse(form.form_data) 
          : form.form_data;
        const formType = (formDataRaw?.form_type || "").toString().toLowerCase();
        return formType.includes("bed");
      } catch {
        return false;
      }
    });

    const kitchenChecklist = forms.find((form) => {
      try {
        const formDataRaw = typeof form.form_data === "string" 
          ? JSON.parse(form.form_data) 
          : form.form_data;
        const formType = (formDataRaw?.form_type || "").toString().toLowerCase();
        return formType.includes("kitchen");
      } catch {
        return false;
      }
    });

    if (bedroomChecklist || kitchenChecklist) {
      const checklistType = bedroomChecklist ? "bedroom" : "kitchen";
      const checklistId = bedroomChecklist?.id || kitchenChecklist?.id;
      
      setChecklistForQuote({ type: checklistType, id: checklistId! });
      setShowQuoteGenerationDialog(true);
      return;
    }

    createBlankQuote();
  }, [customer, forms]);

  const createBlankQuote = useCallback(() => {
    if (!customer) return;
    
    const params = new URLSearchParams({
      customerId: customer.id,
      customerName: customer.name || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      type: "quotation",
      source: "project",
      projectId: projectId,  // ✅ Already present - GOOD
    });
    router.push(`/dashboard/quotes/create?${params.toString()}`);
  }, [customer, projectId, router]);

  const handleGenerateFromChecklist = useCallback(async () => {
    if (!checklistForQuote) return;

    setShowQuoteGenerationDialog(false);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKEND_URL}/quotations/generate-from-checklist/${checklistForQuote.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // ✅ ADD THIS - Send project_id in request body
          body: JSON.stringify({
            project_id: projectId
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        window.open(`/dashboard/quotes/${data.quotation_id}`, '_blank');
        await loadProjectData();
        
        alert(
          `✅ Quote generated successfully!\n\n` +
          `Reference: ${data.reference_number}\n` +
          `Items: ${data.items_count}\n` +
          `Total: £${data.total.toFixed(2)}`
        );
      } else {
        const error = await response.json();
        alert(`Failed to generate quote: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error generating quote:", error);
      alert("Network error: Could not generate quote");
    } finally {
      setChecklistForQuote(null);
    }
  }, [checklistForQuote, loadProjectData, projectId]);

  const handleCreateInvoice = useCallback(() => {
    if (!customer?.id) {
      alert("Error: No customer associated with this project");
      return;
    }
    const params = new URLSearchParams({
      customerId: customer.id,
      customerName: customer.name || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      type: "invoice",
      source: "project",
      projectId: projectId  // ✅ Verify this exists
    });
    router.push(`/dashboard/checklists/invoice/?${params.toString()}`);
  }, [customer, projectId, router]);

  const handleCreateProformaInvoice = useCallback(() => {
    if (!customer?.id) {
      alert("Error: No customer associated with this project");
      return;
    }
    const params = new URLSearchParams({
      customerId: customer.id,
      customerName: customer.name || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      type: "proforma",
      source: "project",
      projectId: projectId
    });
    router.push(`/dashboard/checklists/invoice/?${params.toString()}`);
  }, [customer, projectId, router]);

  const handleCreateReceipt = useCallback(() => {
    if (!customer?.id) {
      alert("Error: No customer associated with this project");
      return;
    }
    const params = new URLSearchParams({
      customerId: customer.id,
      customerName: customer.name || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      type: "receipt",
      paidAmount: "0.00",
      totalPaidToDate: "0.00",
      balanceToPay: "0.00",
      receiptDate: new Date().toISOString().split("T")[0],
      paymentMethod: "BACS",
      paymentDescription: "Payment received for your Kitchen/Bedroom Cabinetry.",
      projectId: projectId
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
  }, [customer, projectId, router]);

  const handleCreateDepositReceipt = useCallback(() => {
    if (!customer?.id) {
      alert("Error: No customer associated with this project");
      return;
    }
    const params = new URLSearchParams({
      customerId: customer.id,
      customerName: customer.name || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      type: "deposit",
      paidAmount: "0.00",
      totalPaidToDate: "0.00",
      balanceToPay: "0.00",
      receiptDate: new Date().toISOString().split("T")[0],
      paymentMethod: "BACS",
      paymentDescription: "Deposit payment received for your Kitchen/Bedroom Cabinetry.",
      projectId: projectId
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
  }, [customer, projectId, router]);

  const handleCreateFinalReceipt = useCallback(() => {
    if (!customer?.id) {
      alert("Error: No customer associated with this project");
      return;
    }
    const params = new URLSearchParams({
      customerId: customer.id,
      customerName: customer.name || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      type: "final",
      paidAmount: "0.00",
      totalPaidToDate: "0.00",
      balanceToPay: "0.00",
      receiptDate: new Date().toISOString().split("T")[0],
      paymentMethod: "BACS",
      paymentDescription: "Final payment received for your Kitchen/Bedroom Cabinetry.",
      projectId: projectId
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
  }, [customer, projectId, router]);

  const handleCreatePaymentTerms = useCallback(() => {
    if (!customer?.id) {
      alert("Error: No customer associated with this project");
      return;
    }
    const params = new URLSearchParams({
      customerId: customer.id,
      customerName: customer.name || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      type: "payment_terms",
      source: "project",
      projectId: projectId
    });
    router.push(`/dashboard/checklists/payment-terms/?${params.toString()}`);
  }, [customer, projectId, router]);

  const handleViewChecklist = useCallback((submission: FormSubmission) => {
    window.open(`/checklist-view?id=${submission.id}`, "_blank");
  }, []);

  const handleEditForm = useCallback((submission: FormSubmission) => {
    const formType = getFormType(submission);
    const token = submission.token_used;
    
    if (!token) {
      alert("Error: No token found for this form");
      return;
    }
    
    let editUrl = "";
    
    if (formType === "bedroom") {
      editUrl = `/form/${token}?type=bedroom&edit=true`;
    } else if (formType === "kitchen") {
      editUrl = `/form/${token}?type=kitchen&edit=true`;
    } else {
      editUrl = `/checklist-view?id=${submission.id}`;
    }
    
    window.open(editUrl, "_blank");
  }, []);

  const handleDeleteForm = useCallback((submission: FormSubmission) => {
    setFormToDelete(submission);
    setShowDeleteFormDialog(true);
  }, []);

  const handleConfirmDeleteForm = useCallback(async () => {
    if (!formToDelete || isDeletingForm) return;
    
    setIsDeletingForm(true);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(
        `${BACKEND_URL}/form-submissions/${formToDelete.id}`,
        { 
          method: "DELETE", 
          headers 
        }
      );

      if (res.ok) {
        setForms((prev) => prev.filter((f) => f.id !== formToDelete.id));
        setShowDeleteFormDialog(false);
        setFormToDelete(null);
        alert("Form deleted successfully!");
      } else {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        alert(`Failed to delete form: ${err.error}`);
      }
    } catch (e) {
      console.error("Delete form error:", e);
      alert("Network error: Could not delete form");
    } finally {
      setIsDeletingForm(false);
    }
  }, [formToDelete, isDeletingForm]);

  const getFinancialDocIcon = (type: string) => {
    switch (type) {
      case 'quotation':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'invoice':
        return <FileText className="h-5 w-5 text-indigo-600" />;
      case 'proforma':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'receipt':
        return <Receipt className="h-5 w-5 text-green-600" />;
      case 'deposit':
        return <Receipt className="h-5 w-5 text-emerald-600" />;
      case 'final':
        return <Receipt className="h-5 w-5 text-teal-600" />;
      case 'payment_terms':
        return <DollarSign className="h-5 w-5 text-orange-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getFinancialDocColor = (type: string) => {
    switch (type) {
      case 'quotation':
        return 'from-blue-50 to-blue-100';
      case 'invoice':
        return 'from-indigo-50 to-indigo-100';
      case 'proforma':
        return 'from-purple-50 to-purple-100';
      case 'receipt':
        return 'from-green-50 to-green-100';
      case 'deposit':
        return 'from-emerald-50 to-emerald-100';
      case 'final':
        return 'from-teal-50 to-teal-100';
      case 'payment_terms':
        return 'from-orange-50 to-orange-100';
      default:
        return 'from-gray-50 to-gray-100';
    }
  };

  const handleViewFinancialDocument = (doc: FinancialDocument) => {
    switch (doc.type) {
      case 'quotation':
        window.open(`/dashboard/quotes/${doc.id}`, '_blank');
        break;
      case 'invoice':
      case 'proforma':
        window.open(`/dashboard/invoices/${doc.id}`, '_blank');
        break;
      case 'receipt':
      case 'deposit':
      case 'final':
        window.open(`/dashboard/receipts/${doc.id}`, '_blank');
        break;
      case 'payment_terms':
        window.open(`/dashboard/payment-terms/${doc.id}`, '_blank');
        break;
      default:
        alert('Document viewer not available');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="border-b border-gray-200 bg-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-8 py-6">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        </div>
      </div>
    );
  }

  if (!project) return <div className="p-8">Project not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,image/png,image/jpeg,image/jpg,image/gif"
        multiple
        style={{ display: "none" }}
      />

      {/* ✅ HEADER - MATCHING CUSTOMER DETAILS PAGE */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/customers/' + customer?.id)}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Project Details</h1>
              <p className="text-sm text-gray-500">
                ID: {project.display_id || project.id}
              </p>
            </div>
          </div>

          {/* ✅ ACTION BUTTONS - MATCHING CUSTOMER DETAILS */}
          <div className="flex items-center space-x-3">
            {/* Add Checklist Button */}
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800">
                    <CheckSquare className="h-4 w-4" />
                    <span>Add Checklist</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleCreateKitchenChecklist}
                    className="flex items-center space-x-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Kitchen Checklist</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCreateBedroomChecklist}
                    className="flex items-center space-x-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Bedroom Checklist</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Add Financial Document Button */}
            {canCreateFinancialDocs && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Add Financial Document</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleCreateQuote}>
                    <FileText className="mr-2 h-4 w-4" />
                    Quotation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateInvoice}>
                    <FileText className="mr-2 h-4 w-4" />
                    Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateProformaInvoice}>
                    <FileText className="mr-2 h-4 w-4" />
                    Proforma Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreatePaymentTerms}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Payment Terms
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateReceipt}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Receipt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateDepositReceipt}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Deposit Receipt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateFinalReceipt}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Final Receipt
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Edit Button */}
            {canEdit && (
              <Button
                onClick={() => router.push(`/dashboard/projects/${projectId}/edit`)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            )}

            {/* Delete Button */}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this project?')) {
                    // Handle delete
                  }
                }}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ✅ TABS - MATCHING CUSTOMER DETAILS PAGE */}
      <div className="px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="checklists" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Checklists ({forms.length})
            </TabsTrigger>
            <TabsTrigger value="drawings" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Drawings ({drawings.length})
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial ({financialDocuments.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Project Overview Card */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">Project Overview</h2>
              
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Project Type</span>
                    <div className="mt-1">
                      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getProjectTypeColor(project?.project_type || 'Other')}`}>
                        {project?.project_type || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Current Stage</span>
                    <div className="mt-1">
                      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStageColor(project?.stage || 'Survey')}`}>
                        {project?.stage || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Measure Date</span>
                    <span className="mt-1 text-base text-gray-900">{formatDate(project?.date_of_measure || "")}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Created</span>
                    <span className="mt-1 text-base text-gray-900">{formatDate(project?.created_at || "")}</span>
                  </div>
                </div>
              </div>

              {project?.notes && (
                <div className="mt-6">
                  <span className="text-sm font-medium text-gray-500">Notes</span>
                  <div className="mt-2 rounded-lg bg-gray-50 p-3">
                    <span className="text-base whitespace-pre-wrap text-gray-900">{project.notes}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Information Card */}
            {customer && (
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-semibold text-gray-900">Customer Information</h2>
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Name</span>
                      <span className="mt-1 text-base font-medium text-gray-900">{customer.name || "—"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Phone</span>
                      <span className="mt-1 text-base text-gray-900">{customer.phone || "—"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Email</span>
                      <span className="mt-1 text-base text-gray-900">{customer.email || "—"}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="flex flex-col md:col-span-2">
                      <span className="text-sm font-medium text-gray-500">Address</span>
                      <span className="mt-1 text-base text-gray-900">{customer.address || "—"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Postcode</span>
                      <span className="mt-1 text-base text-gray-900">{customer.postcode || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: CHECKLISTS */}
          <TabsContent value="checklists" className="mt-6 space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                Checklist Submissions
              </h2>

              {forms.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {forms.map((form) => {
                    const formTitle = getFormTitle(form);
                    
                    return (
                      <div
                        key={form.id}
                        className="flex items-center justify-between rounded-lg border bg-gray-50 p-4 transition hover:bg-gray-100"
                      >
                        <div className="flex flex-col flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{formTitle}</h3>
                          <span className="text-sm text-gray-500">Submitted: {formatDate(form.submitted_at)}</span>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewChecklist(form)}
                            className="flex items-center space-x-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditForm(form)}
                            className="flex items-center space-x-1"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteForm(form)}
                            className="flex items-center space-x-1 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                  <CheckSquare className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">No Checklists Yet</h3>
                  <p className="text-sm text-gray-600">Create checklists using the Add Checklist button above.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: DRAWINGS */}
          <TabsContent value="drawings" className="mt-6 space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Drawings & Layouts ({drawings.length})
                </h2>
                {canEdit && (
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload File</span>
                  </Button>
                )}
              </div>

              {drawings.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {drawings
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((doc) => {
                      const fileExtension = doc.filename.split(".").pop()?.toLowerCase() || "other";
                      const docType = doc.type || 
                        (fileExtension === "pdf" ? "pdf" : 
                        ["png", "jpg", "jpeg", "gif"].includes(fileExtension) ? "image" : "other");

                      return (
                        <div
                          key={doc.id}
                          className="rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex flex-1 items-start space-x-4">
                              <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-3">
                                {DRAWING_DOCUMENT_ICONS[docType] || <FileText className="h-5 w-5 text-gray-600" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="truncate font-semibold text-gray-900">{doc.filename}</h3>
                                <p className="mt-1 text-sm text-gray-500">Uploaded: {formatDate(doc.created_at)}</p>
                              </div>
                            </div>
                            <div className="ml-6 flex items-center space-x-2">
                              <Button
                                onClick={() => handleViewDrawing(doc)}
                                variant="outline"
                                size="sm"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              {canEdit && (
                                <Button
                                  onClick={() => handleDeleteDrawing(doc)}
                                  disabled={isDeletingDrawing}
                                  variant="outline"
                                  size="sm"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                  <Image className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">No Drawings Yet</h3>
                  <p className="text-sm text-gray-600">Upload CADs, sketches, or photos for this project.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 4: FINANCIAL DOCUMENTS */}
          <TabsContent value="financial" className="mt-6 space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Financial Documents ({financialDocuments.length})
                </h2>
                {financialDocuments.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {financialDocuments.filter(d => d.type === 'quotation').length} Quotations • {' '}
                    {financialDocuments.filter(d => d.type === 'invoice' || d.type === 'proforma').length} Invoices • {' '}
                    {financialDocuments.filter(d => d.type === 'receipt' || d.type === 'deposit' || d.type === 'final').length} Receipts
                  </div>
                )}
              </div>

              {financialDocuments.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {financialDocuments.map((doc) => (
                    <div
                      key={`${doc.type}-${doc.id}`}
                      className={`rounded-lg border bg-gradient-to-br ${getFinancialDocColor(doc.type)} p-6 shadow-sm transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-3 flex items-center space-x-3">
                            <div className="rounded-lg bg-white p-2 shadow-sm">
                              {getFinancialDocIcon(doc.type)}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 line-clamp-1">{doc.title}</h3>
                              <p className="text-xs text-gray-600 capitalize">{doc.type.replace('_', ' ')}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {doc.status && (
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                doc.status === 'Approved' || doc.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                doc.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {doc.status}
                              </span>
                            )}

                            {doc.total !== undefined && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Total:</span>{' '}
                                <span className="font-semibold text-gray-900">£{doc.total.toFixed(2)}</span>
                              </p>
                            )}

                            <p className="text-xs text-gray-600">
                              <Calendar className="mr-1 inline h-3 w-3" />
                              {formatDate(doc.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <Button
                          onClick={() => handleViewFinancialDocument(doc)}
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-white hover:bg-gray-50"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        
                        {doc.type === 'quotation' && canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuoteToDelete({ 
                                id: typeof doc.id === 'string' ? parseInt(doc.id) : doc.id, 
                                reference: doc.reference || doc.title 
                              });
                              setDeleteDialogOpen(true);
                            }}
                            disabled={deletingQuoteId === doc.id}
                            className="text-red-600 hover:bg-red-50 border-red-200"
                          >
                            {deletingQuoteId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                  <DollarSign className="mx-auto mb-6 h-16 w-16 text-gray-300" />
                  <h3 className="mb-4 text-xl font-semibold text-gray-900">No Financial Documents</h3>
                  <p className="text-gray-600">
                    Create financial documents using the Add Financial Document button above.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* DIALOGS */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete quotation "{quoteToDelete?.reference}"? 
              This action cannot be undone and will permanently remove the quotation and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingQuoteId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (quoteToDelete) {
                  handleDeleteQuote(quoteToDelete.id);
                }
              }}
              disabled={deletingQuoteId !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingQuoteId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Quotation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showDeleteDrawingDialog} onOpenChange={setShowDeleteDrawingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Drawing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{drawingToDelete?.filename}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDrawingDialog(false)} disabled={isDeletingDrawing}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteDrawing}
              disabled={isDeletingDrawing}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeletingDrawing ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteFormDialog} onOpenChange={setShowDeleteFormDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{formToDelete && getFormTitle(formToDelete)}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteFormDialog(false)} 
              disabled={isDeletingForm}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteForm}
              disabled={isDeletingForm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeletingForm ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuoteGenerationDialog} onOpenChange={setShowQuoteGenerationDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Generate Quotation</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowQuoteGenerationDialog(false);
                  setChecklistForQuote(null);
                }}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="py-6">
            <p className="mb-6 text-base text-gray-700">
              This project has a <span className="font-semibold text-blue-600">{checklistForQuote?.type}</span> checklist.
            </p>
            <p className="text-sm text-gray-600">
              Would you like to generate a quote from this checklist (auto-extract items) or create a blank quote manually?
            </p>
          </div>

          <DialogFooter className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowQuoteGenerationDialog(false);
                createBlankQuote();
                setChecklistForQuote(null);
              }}
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              No - Create Blank Quote
            </Button>
            <Button
              onClick={handleGenerateFromChecklist}
              className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              Yes - Generate from Checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}