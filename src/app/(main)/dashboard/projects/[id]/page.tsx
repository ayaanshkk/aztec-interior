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
  Clock,
  Plus,
  X,
  ChevronDown,
  CheckSquare,
  Receipt,
  DollarSign,
  Edit,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, cacheUtils } from "@/lib/api";

// ============================================================================
// DEV-ONLY LOGGING
// ============================================================================
const IS_DEV = process.env.NODE_ENV === 'development';
const log = (...args: any[]) => {
  if (IS_DEV) console.log(...args);
};
const warn = (...args: any[]) => {
  if (IS_DEV) console.warn(...args);
};
const error = console.error; // Always log errors

// ============================================================================
// INTERFACES (Keep existing interfaces)
// ============================================================================
interface Project {
  id: string;
  project_name: string;
  project_type: "Kitchen" | "Bedroom" | "Wardrobe" | "Remedial" | "Other";
  stage: string;
  date_of_measure: string | null;
  notes: string;
  form_count: number;
  created_at: string;
  customer_id: string;
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

// ============================================================================
// HELPER FUNCTIONS (Keep existing helpers)
// ============================================================================
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
    case "Kitchen": return "bg-blue-100 text-blue-800";
    case "Bedroom": return "bg-purple-100 text-purple-800";
    case "Wardrobe": return "bg-green-100 text-green-800";
    case "Remedial": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getStageColor = (stage: string) => {
  switch (stage) {
    case "Complete": return "bg-green-100 text-green-800";
    case "Production": return "bg-blue-100 text-blue-800";
    case "Installation": return "bg-orange-100 text-orange-800";
    case "Measure": return "bg-yellow-100 text-yellow-800";
    default: return "bg-gray-100 text-gray-800";
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
    case "bedroom": return "Bedroom Checklist";
    case "kitchen": return "Kitchen Checklist";
    case "remedial": return "Remedial Action Checklist";
    case "checklist": return "General Checklist";
    case "quotation": return "Quotation";
    case "invoice": return "Invoice";
    case "proforma": return "Proforma Invoice";
    case "receipt": return "Receipt";
    case "payment": return "Payment Terms";
    default:
      if (submission.form_data && submission.form_data.customer_name) {
        return `Form - ${submission.form_data.customer_name}`;
      }
      return `Form #${submission.id}`;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // STATE
  // ============================================================================
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [drawings, setDrawings] = useState<DrawingDocument[]>([]);
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrawings, setSelectedDrawings] = useState<Set<string>>(new Set());
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showDeleteDrawingDialog, setShowDeleteDrawingDialog] = useState(false);
  const [drawingToDelete, setDrawingToDelete] = useState<DrawingDocument | null>(null);
  const [isDeletingDrawing, setIsDeletingDrawing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showDeleteFormDialog, setShowDeleteFormDialog] = useState(false);
  const [formToDelete, setFormToDelete] = useState<FormSubmission | null>(null);
  const [isDeletingForm, setIsDeletingForm] = useState(false);

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

  // ============================================================================
  // MEMOIZED PERMISSIONS
  // ============================================================================
  const canEdit = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    return ["manager", "hr", "production", "sales"].includes(role);
  }, [user?.role]);

  const canDelete = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    return ["manager", "hr", "sales"].includes(role);
  }, [user?.role]);

  const canCreateFinancialDocs = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    return ["manager", "sales"].includes(role);
  }, [user?.role]);

  // ============================================================================
  // ✅ OPTIMIZED: Load project data with API layer
  // ============================================================================
  const loadProjectData = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);

    try {
      log("🔄 Loading project data with optimized API...");
      const startTime = performance.now();

      // ✅ PARALLEL FETCHING - All at once
      const [projectData, customerData, drawingsData, formsData] = await Promise.all([
        api.getProject(projectId),
        // Customer will be fetched after we get project data
        Promise.resolve(null),
        // Drawings need customer_id, will fetch after
        Promise.resolve([]),
        api.getProjectForms(projectId),
      ]);

      log("✅ Project loaded:", projectData);
      setProject(projectData);
      setForms(Array.isArray(formsData) ? formsData : []);

      // ✅ NOW fetch customer and drawings with customer_id
      if (projectData.customer_id) {
        const [customerResult, drawingsResult] = await Promise.all([
          api.getCustomerDetails(projectData.customer_id),  // ✅ Use getCustomerDetails
          api.getCustomerDrawings(projectData.customer_id, projectId),
        ]);

        setCustomer(customerResult);
        setDrawings(Array.isArray(drawingsResult) ? drawingsResult : []);

        // Pre-populate task data
        setTaskData(prev => ({
          ...prev,
          jobTask: `${projectData.project_type} - ${projectData.project_name}`,
          notes: `Customer: ${customerResult.name}\nAddress: ${customerResult.address}\nPhone: ${customerResult.phone}`,
        }));
      }

      const endTime = performance.now();
      log(`⏱️ Project loaded in ${((endTime - startTime) / 1000).toFixed(2)}s`);

    } catch (error: any) {
      error("❌ Error loading project data:", error);
      
      if (error.message.includes("404")) {
        alert("Project not found. It may have been deleted.");
      } else {
        alert("Unable to load project. Please try again or contact support.");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      error("No project ID provided");
      return;
    }
    
    if (!user) {
      log("Waiting for user authentication...");
      return;
    }

    log("Loading project:", projectId, "for user:", user.role);
    loadProjectData();
  }, [projectId, user, loadProjectData]);

  // ============================================================================
  // ✅ OPTIMIZED: Parallel file upload
  // ============================================================================
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !project?.customer_id) return;

    const uploadPromises = Array.from(files).map(file =>
      api.uploadDrawing(file, project.customer_id, projectId)
    );

    try {
      const results = await Promise.allSettled(uploadPromises);
      
      const uploadedDocs: DrawingDocument[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.drawing) {
          const data = result.value;
          const file = files[index];
          
          const newDoc: DrawingDocument = {
            id: data.drawing.id,
            filename: data.drawing.filename || data.drawing.file_name || file.name,
            url: data.drawing.url || data.drawing.file_url,
            type: data.drawing.type || data.drawing.category || "other",
            created_at: data.drawing.created_at || new Date().toISOString(),
            project_id: data.drawing.project_id,
          };
          uploadedDocs.push(newDoc);
        } else if (result.status === 'rejected') {
          warn(`Upload failed for file ${index}:`, result.reason);
        }
      });

      if (uploadedDocs.length > 0) {
        setDrawings((prev) => {
          const updated = [...uploadedDocs, ...prev];
          return updated.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
        
        log(`✅ ${uploadedDocs.length} files uploaded successfully`);
      }

    } catch (err) {
      error("Upload error:", err);
      alert("Some files failed to upload. Please try again.");
    }

    if (event.target) event.target.value = "";
  }, [projectId, project?.customer_id]);

  // ============================================================================
  // ✅ OPTIMIZED: Delete drawing with API layer
  // ============================================================================
  const handleConfirmDeleteDrawing = useCallback(async () => {
    if (!drawingToDelete || isDeletingDrawing || !project?.customer_id) return;
    
    setIsDeletingDrawing(true);

    try {
      await api.deleteDrawing(drawingToDelete.id, project.customer_id);
      
      // Optimistic UI update
      setDrawings((prev) => prev.filter((d) => d.id !== drawingToDelete.id));
      setSelectedDrawings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(drawingToDelete.id);
        return newSet;
      });
      
      setShowDeleteDrawingDialog(false);
      setDrawingToDelete(null);
      
      log("✅ Drawing deleted successfully");
    } catch (e) {
      error("Delete drawing error:", e);
      alert("Failed to delete drawing. Please try again.");
    } finally {
      setIsDeletingDrawing(false);
    }
  }, [drawingToDelete, isDeletingDrawing, project?.customer_id]);

  // ============================================================================
  // ✅ OPTIMIZED: Delete form with API layer
  // ============================================================================
  const handleConfirmDeleteForm = useCallback(async () => {
    if (!formToDelete || isDeletingForm) return;
    
    setIsDeletingForm(true);

    try {
      await api.deleteFormSubmission(formToDelete.id, projectId);
      
      // Optimistic UI update
      setForms((prev) => prev.filter((f) => f.id !== formToDelete.id));
      setShowDeleteFormDialog(false);
      setFormToDelete(null);
      
      log("✅ Form deleted successfully");
    } catch (e) {
      error("Delete form error:", e);
      alert("Failed to delete form. Please try again.");
    } finally {
      setIsDeletingForm(false);
    }
  }, [formToDelete, isDeletingForm, projectId]);

  // ============================================================================
  // KEEP ALL OTHER HANDLERS (they're fine - just navigation/UI)
  // ============================================================================
  const handleViewDrawing = useCallback((doc: DrawingDocument) => {
    const BACKEND_URL = "https://aztec-interior.onrender.com";
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

  const handleCreateKitchenChecklist = useCallback(async () => {
    if (generating || !canEdit) return;

    if (!customer?.id) {
      alert("Error: No customer associated with this project");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(
        `https://aztec-interiors.onrender.com/customers/${customer.id}/generate-form-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ formType: "kitchen" }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const params = new URLSearchParams({
            type: "kitchen",
            customerId: customer.id,
            customerName: customer.name || "",
            customerAddress: customer.address || "",
            customerPhone: customer.phone || "",
            projectId: projectId,
          });
          router.push(`/form/${data.token}?${params.toString()}`);
        } else {
          alert(`Failed to generate kitchen form: ${data.error}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to generate kitchen form: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Network error generating kitchen form:", error);
      alert("Network error: Please check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  }, [generating, canEdit, customer, projectId, router]);

  const handleCreateBedroomChecklist = useCallback(async () => {
      if (generating || !canEdit) return;

      if (!customer?.id) {
        alert("Error: No customer associated with this project");
        return;
      }

      setGenerating(true);
      try {
        const response = await fetch(
          `https://aztec-interiors.onrender.com/customers/${customer.id}/generate-form-link`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ formType: "bedroom" }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const params = new URLSearchParams({
              type: "bedroom",
              customerId: customer.id,
              customerName: customer.name || "",
              customerAddress: customer.address || "",
              customerPhone: customer.phone || "",
              projectId: projectId,
            });
            router.push(`/form/${data.token}?${params.toString()}`);
          } else {
            alert(`Failed to generate bedroom form: ${data.error}`);
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          alert(`Failed to generate bedroom form: ${errorData.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Network error generating bedroom form:", error);
        alert("Network error: Please check your connection and try again.");
      } finally {
        setGenerating(false);
      }
    }, [generating, canEdit, customer, projectId, router]);

  const handleCreateRemedialChecklist = useCallback(() => {
      if (!customer?.id) {
        alert("Error: No customer associated with this project");
        return;
      }
      const params = new URLSearchParams({
        customerId: customer.id,
        customerName: customer.name || "",
        customerAddress: customer.address || "",
        customerPhone: customer.phone || "",
      });
      router.push(`/dashboard/checklists/remedial?${params.toString()}`);
    }, [customer, router]);

  const handleCreateChecklist = useCallback(() => {
    if (!customer?.id) {
      alert("Error: No customer associated with this project");
      return;
    }
    router.push(`/dashboard/checklists/create?customerId=${customer.id}`);
  }, [customer, router]);

  const handleCreateQuote = useCallback(() => {
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
    });
    router.push(`/dashboard/quotes/create?${params.toString()}`);
  }, [customer, router]);

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
    });
    router.push(`/dashboard/invoices/create?${params.toString()}`);
  }, [customer, router]);

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
    });
    router.push(`/dashboard/invoices/create?type=proforma&${params.toString()}`);
  }, [customer, router]);

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
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
  }, [customer, router]);

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
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
  }, [customer, router]);

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
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
  }, [customer, router]);

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
    });
    router.push(`/dashboard/payment-terms/create?${params.toString()}`);
  }, [customer, router]);

  const handleDeleteDrawing = useCallback((doc: DrawingDocument) => {
    setDrawingToDelete(doc);
    setShowDeleteDrawingDialog(true);
  }, []);

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

  const handleViewChecklist = useCallback((submission: FormSubmission) => {
    window.open(`/checklist-view?id=${submission.id}`, "_blank");
  }, []);

  const handleEditForm = useCallback((submission: FormSubmission) => {
    log("🔧 Editing form:", submission);
    
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
    } else if (formType === "remedial") {
      editUrl = `/remedial-checklist?token=${token}&edit=true`;
    } else if (formType === "checklist") {
      editUrl = `/checklist-form?token=${token}&edit=true`;
    } else if (formType === "quotation") {
      editUrl = `/quotation?token=${token}&edit=true`;
    } else if (formType === "invoice") {
      editUrl = `/invoice?token=${token}&edit=true`;
    } else if (formType === "proforma") {
      editUrl = `/proforma-invoice?token=${token}&edit=true`;
    } else if (formType === "receipt") {
      editUrl = `/receipt?token=${token}&edit=true`;
    } else if (formType === "payment") {
      editUrl = `/payment-terms?token=${token}&edit=true`;
    } else {
      editUrl = `/checklist-view?id=${submission.id}`;
    }
    
    log("🔗 Opening edit URL:", editUrl);
    window.open(editUrl, "_blank");
  }, []);

  const handleDeleteForm = useCallback((submission: FormSubmission) => {
    setFormToDelete(submission);
    setShowDeleteFormDialog(true);
  }, []);

  // // ✅ NEW: Confirm delete form
  // const handleConfirmDeleteForm = useCallback(async () => {
  //   if (!formToDelete || isDeletingForm) return;
    
  //   setIsDeletingForm(true);
  //   const token = localStorage.getItem("auth_token");
  //   const headers: HeadersInit = {
  //     "Content-Type": "application/json",
  //   };
  //   if (token) headers["Authorization"] = `Bearer ${token}`;

  //   try {
  //     const res = await fetch(
  //       `https://aztec-interior.onrender.com/form-submissions/${formToDelete.id}`,
  //       { 
  //         method: "DELETE", 
  //         headers 
  //       }
  //     );

  //     if (res.ok) {
  //       // Remove from state immediately
  //       setForms((prev) => prev.filter((f) => f.id !== formToDelete.id));
  //       setShowDeleteFormDialog(false);
  //       setFormToDelete(null);
  //       alert("Form deleted successfully!");
  //     } else {
  //       const err = await res.json().catch(() => ({ error: "Server error" }));
  //       alert(`Failed to delete form: ${err.error}`);
  //     }
  //   } catch (e) {
  //     console.error("Delete form error:", e);
  //     alert("Network error: Could not delete form");
  // ;  } finally {
  //     setIsDeletingForm(false);
  //   }
  // }, [formToDelete, isDeletingForm])

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-gray-200 bg-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex space-x-3">
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="mb-8 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8 rounded-lg border bg-white p-6">
            <div className="h-6 w-56 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-full bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8 border-t pt-8">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-6" />
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>

          <div className="border-t pt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) return <div className="p-8">Project not found.</div>;

  return (
    <div className="min-h-screen bg-white">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,image/png,image/jpeg,image/jpg,image/gif"
        multiple
        style={{ display: "none" }}
      />

      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center space-x-3">
                <Package className="h-6 w-6 text-blue-600" />
                <h1 className="text-3xl font-semibold text-gray-900">{project.project_name}</h1>
              </div>
              {customer && (
                <p className="mt-1 text-sm text-gray-600">
                  Customer: {customer.name} • {customer.address}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Create</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user?.role?.toLowerCase() !== "sales" && (
                    <DropdownMenuItem onClick={handleCreateRemedialChecklist} className="flex items-center space-x-2" disabled={generating}>
                      <CheckSquare className="h-4 w-4" />
                      <span>Remedial Action Checklist</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleCreateChecklist} className="flex items-center space-x-2" disabled={generating}>
                    <CheckSquare className="h-4 w-4" />
                    <span>Checklist</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateQuote} className="flex items-center space-x-2" disabled={generating}>
                    <FileText className="h-4 w-4" />
                    <span>Quotation</span>
                  </DropdownMenuItem>
                  {canCreateFinancialDocs && (
                    <>
                      <DropdownMenuItem onClick={handleCreateInvoice} className="flex items-center space-x-2" disabled={generating}>
                        <FileText className="h-4 w-4" />
                        <span>Invoice</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCreateProformaInvoice} className="flex items-center space-x-2" disabled={generating}>
                        <FileText className="h-4 w-4" />
                        <span>Proforma Invoice</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCreateReceipt} className="flex items-center space-x-2" disabled={generating}>
                        <Receipt className="h-4 w-4" />
                        <span>Receipt</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCreateDepositReceipt} className="flex items-center space-x-2" disabled={generating}>
                        <Receipt className="h-4 w-4" />
                        <span>Deposit Receipt</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCreateFinalReceipt} className="flex items-center space-x-2" disabled={generating}>
                        <Receipt className="h-4 w-4" />
                        <span>Final Receipt</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCreatePaymentTerms} className="flex items-center space-x-2" disabled={generating}>
                        <DollarSign className="h-4 w-4" />
                        <span>Payment Terms</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={handleCreateKitchenChecklist}
                    className="flex items-center space-x-2"
                    disabled={generating}
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Kitchen Checklist Form</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCreateBedroomChecklist}
                    className="flex items-center space-x-2"
                    disabled={generating}
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Bedroom Checklist Form</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button onClick={() => setShowAddTaskDialog(true)} className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Schedule Task</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Project Overview */}
        <div className="mb-8 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Project Overview</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-sm text-gray-600">Project Type</span>
              <div className="mt-1">
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getProjectTypeColor(project.project_type)}`}>
                  {project.project_type}
                </span>
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Current Stage</span>
              <div className="mt-1">
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStageColor(project.stage)}`}>
                  {project.stage}
                </span>
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Measure Date</span>
              <p className="mt-1 text-gray-900">{formatDate(project.date_of_measure || "")}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Created</span>
              <p className="mt-1 text-gray-900">{formatDate(project.created_at)}</p>
            </div>
          </div>
          {project.notes && (
            <div className="mt-4">
              <span className="text-sm text-gray-600">Notes</span>
              <p className="mt-1 rounded bg-white p-3 text-gray-900">{project.notes}</p>
            </div>
          )}
        </div>

        {/* Customer Information */}
        {customer && (
          <div className="mb-8 rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Customer Information</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <span className="text-sm text-gray-600">Name</span>
                <p className="mt-1 font-medium text-gray-900">{customer.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Phone</span>
                <p className="mt-1 text-gray-900">{customer.phone}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Email</span>
                <p className="mt-1 text-gray-900">{customer.email || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-sm text-gray-600">Address</span>
                <p className="mt-1 text-gray-900">{customer.address}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Postcode</span>
                <p className="mt-1 text-gray-900">{customer.postcode}</p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ FIXED: Checklists Section with proper display, edit, and delete */}
        <div className="mb-8 border-t border-gray-200 pt-8">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">
            Checklists ({forms.length})
          </h2>
          {forms.length > 0 ? (
            <div className="space-y-4">
              {forms.map((form) => {
                const formTitle = getFormTitle(form);
                
                return (
                  <div
                    key={form.id}
                    className="flex items-center justify-between rounded-lg border bg-gray-50 p-4 transition hover:bg-gray-100"
                  >
                    <div className="flex flex-col">
                      <h3 className="text-lg font-semibold text-gray-900">{formTitle}</h3>
                      <span className="text-sm text-gray-500">Submitted: {formatDate(form.submitted_at)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewChecklist(form)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </Button>

                      {/* ✅ FIXED: Edit button - accessible to all roles */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditForm(form)}
                        className="flex items-center space-x-1"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </Button>

                      {/* ✅ NEW: Delete button - accessible to all roles */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteForm(form)}
                        className="flex items-center space-x-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
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
              <p className="text-sm text-gray-600">Create checklists for this project using the Create dropdown above.</p>
            </div>
          )}
        </div>

        {/* Drawings & Layouts */}
        <div className="mb-8 border-t border-gray-200 pt-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Drawings & Layouts ({drawings.length})
            </h2>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              <Upload className="h-4 w-4" />
              <span>Upload File</span>
            </Button>
          </div>

          {drawings.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {drawings
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((doc) => {
                  const fileExtension = doc.filename.split(".").pop()?.toLowerCase() || "other";
                  const docType =
                    doc.type ||
                    (fileExtension === "pdf"
                      ? "pdf"
                      : ["png", "jpg", "jpeg", "gif"].includes(fileExtension)
                        ? "image"
                        : "other");

                  return (
                    <div
                      key={doc.id}
                      className="rounded-lg border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <Checkbox
                          checked={selectedDrawings.has(doc.id)}
                          onCheckedChange={() => handleToggleDrawingSelection(doc.id)}
                          className="mr-4 mt-1"
                        />
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
                            className="flex items-center space-x-2"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </Button>
                          <Button
                            onClick={() => handleDeleteDrawing(doc)}
                            disabled={isDeletingDrawing}
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
      </div>

      {/* ADD TASK DIALOG */}
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>
              Schedule a task for {project.project_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Input
                id="type"
                value={taskData.type}
                onChange={(e) => setTaskData({ ...taskData, type: e.target.value })}
                className="col-span-3"
                disabled
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={taskData.date}
                onChange={(e) => setTaskData({ ...taskData, date: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={taskData.endDate}
                onChange={(e) => setTaskData({ ...taskData, endDate: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={taskData.startTime}
                  onChange={(e) => setTaskData({ ...taskData, startTime: e.target.value })}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={taskData.endTime}
                  onChange={(e) => setTaskData({ ...taskData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignTo" className="text-right">
                Assign To
              </Label>
              <Input
                id="assignTo"
                placeholder="Type team member name..."
                value={taskData.assignTo}
                onChange={(e) => setTaskData({ ...taskData, assignTo: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="jobTask" className="text-right">
                Job/Task
              </Label>
              <Input
                id="jobTask"
                value={taskData.jobTask}
                onChange={(e) => setTaskData({ ...taskData, jobTask: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="pt-2 text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={taskData.notes}
                onChange={(e) => setTaskData({ ...taskData, notes: e.target.value })}
                className="col-span-3"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DRAWING DIALOG */}
      <Dialog open={showDeleteDrawingDialog} onOpenChange={setShowDeleteDrawingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Drawing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{drawingToDelete?.filename}</strong>? This action cannot be
              undone.
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

      {/* ✅ NEW: DELETE FORM DIALOG */}
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
    </div>
  );
}