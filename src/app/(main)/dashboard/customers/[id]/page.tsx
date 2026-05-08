"use client";
import React, { useEffect, useState, useRef } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Edit,
  FileText,
  ChevronDown,
  Briefcase,
  CheckSquare,
  Copy,
  Check,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  MapPin,
  Plus,
  Receipt,
  DollarSign,
  Trash2,
  AlertCircle,
  Eye,
  X,
  Package,
  Image,
  Upload,
  Loader2,
  User,
  FolderOpen,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BACKEND_URL } from "@/lib/api";

interface Project {
  id: string;
  project_name: string;
  project_type: "Kitchen" | "Bedroom" | "Wardrobe" | "Remedial" | "Other";
  stage: string;
  date_of_measure: string | null;
  notes: string;
  form_count: number;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  contact_made: "Yes" | "No" | "Unknown";
  preferred_contact_method: "Phone" | "Email" | "WhatsApp";
  marketing_opt_in: boolean;
  date_of_measure: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  salesperson?: string;
  form_submissions: FormSubmission[];
  project_types?: string[];
  projects?: Project[];
}

interface FormSubmission {
  id: number;
  token_used: string;
  submitted_at: string;
  form_data: any;
  project_id?: string;
  created_by?: number;
}

interface Quotation {
  id?: number;
  quotation_id?: number;
  reference_number?: string;
  total: number;
  status: string;
  notes: string;
  created_at: string;
  items_count?: number;
  project_id?: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  total: number;
  status: string;
  created_at: string;
  customer_id: string;
  project_id?: string;
}

interface Receipt {
  id: number;
  receipt_type: string;
  amount_paid: number;
  total_paid_to_date: number;
  balance_to_pay: number;
  payment_date: string;
  created_at: string;
  customer_id: string;
  project_id?: string;
}

interface PaymentTerms {
  id: number;
  terms_title: string;
  total_amount: number;
  created_at: string;
  customer_id: string;
  project_id?: string;
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

interface DrawingDocument {
  id: string;
  filename: string;
  url: string;
  type: "pdf" | "image" | "other";
  created_at: string;
  project_id?: string;
}

interface FormDocument {
  id: string;
  filename: string;
  url: string;
  type: "excel" | "pdf" | "other";
  created_at: string;
  customer_id: string;
}

const FIELD_LABELS: Record<string, string> = {
  customer_name: "Customer Name",
  customer_phone: "Phone Number",
  customer_address: "Address",
  room: "Room",
  date: "Date",
  fitters: "Fitters",
  items: "Items",
  checklistType: "Checklist Type",
  survey_date: "Survey Date",
  appointment_date: "Appointment Date",
  installation_date: "Professional Installation Date",
  completion_date: "Completion Check Date",
  deposit_date: "Date Deposit Paid",
  fitting_style: "Fitting Style",
  door_color: "Door Color",
  drawer_color: "Drawer Color",
  end_panel_color: "End Panel Color",
  plinth_filler_color: "Plinth/Filler Color",
  cabinet_color: "Cabinet Color",
  worktop_color: "Worktop Color",
  bedside_cabinets_type: "Bedside Cabinets Type",
  bedside_cabinets_qty: "Bedside Cabinets Quantity",
  dresser_desk: "Dresser/Desk",
  dresser_desk_details: "Dresser/Desk Details",
  internal_mirror: "Internal Mirror",
  internal_mirror_details: "Internal Mirror Details",
  mirror_type: "Mirror Type",
  mirror_qty: "Mirror Quantity",
  soffit_lights_type: "Soffit Lights Type",
  soffit_lights_color: "Soffit Lights Color",
  gable_lights_light_color: "Gable Lights Light Color",
  gable_lights_light_qty: "Gable Lights Light Quantity",
  gable_lights_profile_color: "Gable Lights Profile Color",
  gable_lights_profile_qty: "Gable Lights Profile Quantity",
  other_accessories: "Other/Misc/Accessories",
  floor_protection: "Floor Protection",
  worktop_features: "Worktop Features",
  worktop_other_details: "Worktop Other Details",
  worktop_size: "Worktop Size",
  under_wall_unit_lights_color: "Under Wall Unit Lights Color",
  under_wall_unit_lights_profile: "Under Wall Unit Lights Profile",
  under_worktop_lights_color: "Under Worktop Lights Color",
  kitchen_accessories: "Accessories",
  sink_details: "Sink",
  tap_details: "Tap",
  other_appliances: "Other Appliances",
  appliances: "Appliances",
  terms_date: "Date Terms and Conditions Given",
  gas_electric_info: "Gas and Electric Installation Information",
  appliance_promotion_info: "Appliance Promotion Information",
  signature_data: "Signature",
  signature_date: "Signature Date",
  form_type: "Form Type",
  amount_paid: "Paid Amount",
  total_paid_to_date: "Total Paid To Date",
  total_amount: "Total Order Value",
  balance_to_pay: "Balance To Pay",
  date_paid: "Receipt Date",
  payment_method: "Payment Method",
  payment_description: "Payment Description",
  sink_tap_customer_owned: "Sink/Tap Customer Owned",
  appliances_customer_owned: "Appliances Customer Owned",
};

const FINANCIAL_FIELDS = ["amount_paid", "total_paid_to_date", "total_amount", "balance_to_pay"];

const FINANCIAL_DOCUMENT_ICONS: Record<string, React.ReactNode> = {
  invoice: <FileText className="h-4 w-4 text-blue-600" />,
  proforma: <FileText className="h-4 w-4 text-indigo-600" />,
  receipt: <Receipt className="h-4 w-4 text-green-600" />,
  deposit: <Receipt className="h-4 w-4 text-emerald-600" />,
  final: <Receipt className="h-4 w-4 text-teal-600" />,
  terms: <DollarSign className="h-4 w-4 text-purple-600" />,
};

const DRAWING_DOCUMENT_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4 text-red-600" />,
  image: <Image className="h-4 w-4 text-green-600" />,
  other: <FileText className="h-4 w-4 text-gray-600" />,
};

const FORM_DOCUMENT_ICONS: Record<string, React.ReactNode> = {
  excel: <FileText className="h-4 w-4 text-green-600" />,
  pdf: <FileText className="h-4 w-4 text-red-600" />,
  other: <FileText className="h-4 w-4 text-gray-600" />,
};

const PROJECT_TYPES: Project["project_type"][] = ["Kitchen", "Bedroom", "Wardrobe", "Remedial", "Other"];

const PROJECT_STAGES = [
  "Lead",
  "Quote",
  "Consultation",
  "Survey",
  "Measure",
  "Design",
  "Quoted",
  "Production",
  "Installation",
  "Complete",
  "Remedial",
  "Other",
];

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

const formatDateForInput = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  try {
    return dateString.split("T")[0];
  } catch {
    return "";
  }
};

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formFileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState("contact");
  const [selectedDrawings, setSelectedDrawings] = useState<Set<string>>(new Set());
  const [selectedFormDocs, setSelectedFormDocs] = useState<Set<string>>(new Set());
  const [showBulkDeleteDrawingsDialog, setShowBulkDeleteDrawingsDialog] = useState(false);
  const [showBulkDeleteFormDocsDialog, setShowBulkDeleteFormDocsDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const [formDocuments, setFormDocuments] = useState<FormDocument[]>([]);
  const [showDeleteFormDocDialog, setShowDeleteFormDocDialog] = useState(false);
  const [formDocToDelete, setFormDocToDelete] = useState<FormDocument | null>(null);
  const [isDeletingFormDoc, setIsDeletingFormDoc] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [financialDocuments, setFinancialDocuments] = useState<FinancialDocument[]>([]);
  const [drawingDocuments, setDrawingDocuments] = useState<DrawingDocument[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [formType, setFormType] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormSubmission | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formToDelete, setFormToDelete] = useState<FormSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectForms, setProjectForms] = useState<FormSubmission[]>([]);
  const [projectDocs, setProjectDocs] = useState<FinancialDocument[]>([]);
  const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);
  const [editProjectData, setEditProjectData] = useState<Partial<Project>>({});
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [showDeleteDrawingDialog, setShowDeleteDrawingDialog] = useState(false);
  const [drawingToDelete, setDrawingToDelete] = useState<DrawingDocument | null>(null);
  const [isDeletingDrawing, setIsDeletingDrawing] = useState(false);
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [selectedProjectForUpload, setSelectedProjectForUpload] = useState<string | null>(null);
  const [showProjectSelectDialog, setShowProjectSelectDialog] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{type: 'form' | 'drawing', id: string} | null>(null);
  const [dragOverProject, setDragOverProject] = useState<string | null>(null);
  const [showQuoteGenerationDialog, setShowQuoteGenerationDialog] = useState(false);
  const [checklistForQuote, setChecklistForQuote] = useState<{
    type: string;
    id: number;
  } | null>(null);
  const [deletingQuoteId, setDeletingQuoteId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<{ id: number; reference: string } | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomerData, setEditCustomerData] = useState<Partial<Customer>>({});
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [showDeleteCustomerDialog, setShowDeleteCustomerDialog] = useState(false);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    project_name: "",
    project_type: "Kitchen" as Project["project_type"],
    stage: "Lead",
    date_of_measure: "",
    notes: "",
  });
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadCustomerData();
  }, [id, user]);

  const loadCustomerData = async () => {
    setLoading(true);

    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const customerRes = await fetch(`${BACKEND_URL}/customers/${id}`, { headers });

      if (!customerRes.ok) {
        throw new Error("Failed to load customer data");
      }

      const customerData = await customerRes.json();
      
      const normalizedCustomer = {
        ...customerData,
        postcode: customerData.post_code ?? customerData.postcode ?? "",
      };

      if (user?.role === "Sales" && customerData.created_by !== user.id && customerData.salesperson !== user.name) {
        setHasAccess(true);
      } else if (user?.role === "Staff") {
        const hasPermission = customerData.created_by === user.id || customerData.salesperson === user.name;
        setHasAccess(hasPermission);
        if (!hasPermission) {
          setLoading(false);
          return;
        }
      } else {
        setHasAccess(true);
      }

      setCustomer(normalizedCustomer);

      const fetchWithFallback = async (url: string) => {
        try {
          const response = await fetch(url, { headers });
          if (!response.ok) {
            console.warn(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            return null;
          }
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return await response.json();
          }
          console.warn(`Non-JSON response from ${url}`);
          return null;
        } catch (error) {
          console.warn(`Error fetching ${url}:`, error);
          return null;
        }
      };

      const [
        drawingsData,
        formDocsData,
        quotationsData,
        invoicesData,
        receiptsData,
        paymentTermsData
      ] = await Promise.all([
        fetchWithFallback(`${BACKEND_URL}/files/drawings?customer_id=${id}`),
        fetchWithFallback(`${BACKEND_URL}/customers/${id}/forms`),
        fetchWithFallback(`${BACKEND_URL}/quotations?customer_id=${id}`),
        fetchWithFallback(`${BACKEND_URL}/invoices?customer_id=${id}`),
        fetchWithFallback(`${BACKEND_URL}/receipts?customer_id=${id}`),
        fetchWithFallback(`${BACKEND_URL}/payment-terms?customer_id=${id}`)
      ]);

      if (drawingsData && Array.isArray(drawingsData)) {
        const unassignedDrawings = drawingsData.filter(doc => !doc.project_id);
        setDrawingDocuments(unassignedDrawings);
      } else {
        setDrawingDocuments([]);
      }

      if (formDocsData && Array.isArray(formDocsData)) {
        const formSubmissions = formDocsData.filter(form => {
          return form && form.id && form.form_data;
        });
        
        setCustomer(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            form_submissions: formSubmissions
          };
        });
      } else {
        console.log("No form submissions or invalid format");
        setCustomer(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            form_submissions: []
          };
        });
      }

      const allFinancialDocs: FinancialDocument[] = [];

      if (quotationsData && Array.isArray(quotationsData)) {
        console.log('📊 Raw quotations data:', quotationsData);
        
        quotationsData.forEach((quote: Quotation) => {
          console.log('Processing quote:', quote);
          
          const quoteId = quote.id || quote.quotation_id || quote.reference_number;
          
          if (!quoteId) {
            console.warn('⚠️ Skipping quote with no ID:', quote);
            return;
          }
          
          allFinancialDocs.push({
            id: quoteId,
            type: 'quotation',
            title: `Quotation ${quote.reference_number || quoteId}`,
            reference: quote.reference_number,
            total: quote.total,
            status: quote.status,
            created_at: quote.created_at,
            project_id: quote.project_id,
          });
        });
      }

      if (invoicesData && Array.isArray(invoicesData)) {
        invoicesData.forEach((invoice: Invoice) => {
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
        receiptsData.forEach((receipt: Receipt) => {
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
        paymentTermsData.forEach((terms: PaymentTerms) => {
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
      console.error("Error loading customer data:", error);
      setError("Failed to load customer data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const uploadedDocs: FormDocument[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("customer_id", id);

        const response = await fetch("https://aztec-interior.onrender.com/files/forms", {
          method: "POST",
          headers: headers,
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.form_document && data.form_document.id) {
            const newDoc: FormDocument = {
              id: data.form_document.id,
              filename: data.form_document.filename || file.name,
              url: data.form_document.url || data.form_document.file_url,
              type: data.form_document.type || "other",
              created_at: data.form_document.created_at || new Date().toISOString(),
              customer_id: id,
            };

            uploadedDocs.push(newDoc);
          }
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    if (uploadedDocs.length > 0) {
      setFormDocuments(prev => {
        const updated = [...uploadedDocs, ...prev];
        return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });
    }

    if (event.target) event.target.value = "";
  };

  const handleUploadFormDocument = () => {
    if (formFileInputRef.current) {
      formFileInputRef.current.click();
    }
  };

  const handleDragStart = (type: 'form' | 'drawing', id: string) => {
    setDraggedItem({ type, id });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverProject(null);
  };

  const handleDragOver = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    setDragOverProject(projectId);
  };

  const handleDragLeave = () => {
    setDragOverProject(null);
  };

  const handleDrop = async (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    setDragOverProject(null);

    if (!draggedItem) return;

    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = "Bearer " + token;

    try {
      let endpoint = "";
      
      if (draggedItem.type === "form") {
        endpoint = `https://aztec-interior.onrender.com/form-submissions/${draggedItem.id}`;
      } else if (draggedItem.type === "drawing") {
        endpoint = `https://aztec-interior.onrender.com/files/drawings/${draggedItem.id}`;
      }

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify({ project_id: projectId }),
      });

      if (response.ok) {
        if (draggedItem.type === "drawing") {
          setDrawingDocuments(prev => 
            prev.filter(doc => doc.id !== draggedItem.id)
          );
        } else if (draggedItem.type === "form") {
          setCustomer(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              form_submissions: prev.form_submissions.filter(
                form => String(form.id) !== draggedItem.id
              )
            };
          });
        }
      } else {
        const error = await response.json().catch(() => ({ error: "Failed to assign" }));
        alert(`Error: ${error.error || error.message || "Failed to assign to project"}`);
      }
    } catch (error) {
      console.error("Error assigning to project:", error);
      alert("Network error");
    }

    setDraggedItem(null);
  };

  const handleViewFormDocument = (doc: FormDocument) => {
    const BACKEND_URL = "https://aztec-interior.onrender.com";
    let viewUrl = doc.url;

    if (viewUrl && viewUrl.startsWith('http')) {
      window.open(viewUrl, "_blank");
      return;
    }

    if (viewUrl && !viewUrl.startsWith('http')) {
      viewUrl = `${BACKEND_URL}${viewUrl.startsWith('/') ? viewUrl : '/' + viewUrl}`;
    } else if (!viewUrl) {
      alert("Error: Form document URL is missing or invalid.");
      return;
    }

    window.open(viewUrl, "_blank");
  };

  const handleDeleteFormDocument = async (doc: FormDocument) => {
    if (isDeletingFormDoc) return;
    setFormDocToDelete(doc);
    setShowDeleteFormDocDialog(true);
  };

  const handleConfirmDeleteFormDocument = async () => {
    if (!formDocToDelete) return;
    setIsDeletingFormDoc(true);
    
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(
        `https://aztec-interior.onrender.com/files/forms/${formDocToDelete.id}`,
        { method: "DELETE", headers }
      );

      if (res.ok) {
        setFormDocuments((prev) => prev.filter((d) => d.id !== formDocToDelete.id));
        setShowDeleteFormDocDialog(false);
        setFormDocToDelete(null);
      } else {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        alert(`Failed to delete: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Network error");
    } finally {
      setIsDeletingFormDoc(false);
    }
  };

  const handleToggleDrawingSelection = (drawingId: string) => {
    setSelectedDrawings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(drawingId)) {
        newSet.delete(drawingId);
      } else {
        newSet.add(drawingId);
      }
      return newSet;
    });
  };

  const handleSelectAllDrawings = () => {
    if (selectedDrawings.size === drawingDocuments.length) {
      setSelectedDrawings(new Set());
    } else {
      setSelectedDrawings(new Set(drawingDocuments.map(d => d.id)));
    }
  };

  const handleBulkDeleteDrawings = () => {
    if (selectedDrawings.size === 0) return;
    setShowBulkDeleteDrawingsDialog(true);
  };

  const handleConfirmBulkDeleteDrawings = async () => {
    setIsBulkDeleting(true);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const deletePromises = Array.from(selectedDrawings).map(drawingId =>
      fetch(`https://aztec-interior.onrender.com/files/drawings/${drawingId}`, {
        method: "DELETE",
        headers
      })
    );

    try {
      await Promise.all(deletePromises);
      setDrawingDocuments(prev => prev.filter(d => !selectedDrawings.has(d.id)));
      setSelectedDrawings(new Set());
      setShowBulkDeleteDrawingsDialog(false);
    } catch (error) {
      console.error("Error bulk deleting drawings:", error);
      alert("Some files failed to delete. Please try again.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleToggleFormDocSelection = (docId: string) => {
    setSelectedFormDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const handleSelectAllFormDocs = () => {
    if (selectedFormDocs.size === formDocuments.length) {
      setSelectedFormDocs(new Set());
    } else {
      setSelectedFormDocs(new Set(formDocuments.map(d => d.id)));
    }
  };

  const handleDeleteAppliance = (applianceField: string, index: number) => {
    if (!editFormData) return;
    
    const updatedAppliances = [...(editFormData[applianceField] || [])];
    updatedAppliances.splice(index, 1);
    
    setEditFormData((prev: any) => ({
      ...prev,
      [applianceField]: updatedAppliances,
    }));
  };

  const handleBulkDeleteFormDocs = () => {
    if (selectedFormDocs.size === 0) return;
    setShowBulkDeleteFormDocsDialog(true);
  };

  const handleConfirmBulkDeleteFormDocs = async () => {
    setIsBulkDeleting(true);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const deletePromises = Array.from(selectedFormDocs).map(docId =>
      fetch(`https://aztec-interior.onrender.com/files/forms/${docId}`, {
        method: "DELETE",
        headers
      })
    );

    try {
      await Promise.all(deletePromises);
      setFormDocuments(prev => prev.filter(d => !selectedFormDocs.has(d.id)));
      setSelectedFormDocs(new Set());
      setShowBulkDeleteFormDocsDialog(false);
    } catch (error) {
      console.error("Error bulk deleting form documents:", error);
      alert("Some files failed to delete. Please try again.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    setShowProjectSelectDialog(true);
  };

  const handleConfirmProjectUpload = async () => {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    setUploading(true);
    const uploadedDocs: DrawingDocument[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("customer_id", id);
        
        if (selectedProjectForUpload) {
          formData.append("project_id", selectedProjectForUpload);
        }

        const response = await fetch("https://aztec-interior.onrender.com/files/drawings", {
          method: "POST",
          headers: headers,
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();

          if (data.drawing && data.drawing.id) {
            const newDoc: DrawingDocument = {
              id: data.drawing.id,
              filename: data.drawing.filename || data.drawing.file_name || file.name,
              url: data.drawing.url || data.drawing.file_url,
              type: data.drawing.type || data.drawing.category || "other",
              created_at: data.drawing.created_at || new Date().toISOString(),
              project_id: data.drawing.project_id,
            };

            if (!newDoc.project_id) {
              uploadedDocs.push(newDoc);
            }
          }
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    if (uploadedDocs.length > 0) {
      setDrawingDocuments(prev => {
        const updated = [...uploadedDocs, ...prev];
        return updated.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowProjectSelectDialog(false);
    setSelectedProjectForUpload(null);
    setUploading(false);
  };

  const handleUploadDrawing = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleViewDrawing = (doc: DrawingDocument) => {
    const BACKEND_URL = "https://aztec-interior.onrender.com";
    let viewUrl = doc.url;

    if (viewUrl && viewUrl.startsWith('http')) {
      window.open(viewUrl, "_blank");
      return;
    }

    if (viewUrl && !viewUrl.startsWith('http')) {
      viewUrl = `${BACKEND_URL}${viewUrl.startsWith('/') ? viewUrl : '/' + viewUrl}`;
    } else if (!viewUrl) {
      alert("Error: Drawing URL is missing or invalid.");
      return;
    }

    window.open(viewUrl, "_blank");
  };

  const handleDeleteDrawing = async (doc: DrawingDocument) => {
    if (isDeletingDrawing) return;

    setDrawingToDelete(doc);
    setShowDeleteDrawingDialog(true);
  };

  const handleConfirmDeleteDrawing = async () => {
    if (!drawingToDelete) return;

    setIsDeletingDrawing(true);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(
        `https://aztec-interior.onrender.com/files/drawings/${drawingToDelete.id}`,
        { method: "DELETE", headers }
      );

      if (res.ok) {
        setDrawingDocuments((prev) =>
          prev.filter((d) => d.id !== drawingToDelete.id)
        );
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
  };

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

  const handleDeleteQuote = async (quoteId: number) => {
    if (!quoteId || isNaN(quoteId)) {
      console.error('Cannot delete: Invalid quote ID:', quoteId);
      alert('Error: Cannot delete quotation - invalid ID');
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
      return;
    }
    
    setDeletingQuoteId(quoteId);
    
    console.log(`🗑️ Attempting to delete quote ID: ${quoteId}`);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete quotation (${response.status})`);
      }
  
      console.log('✅ Quotation deleted successfully');
      
      await loadCustomerData(); 
      
      alert('✅ Quotation deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting quotation:', error);
      alert(`❌ Failed to delete quotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingQuoteId(null);
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
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

  const renderDrawingDocument = (doc: DrawingDocument) => {
    const fileExtension = doc.filename.split(".").pop()?.toLowerCase() || "other";
    const docType =
      doc.type ||
      (fileExtension === "pdf" ? "pdf" : ["png", "jpg", "jpeg", "gif"].includes(fileExtension) ? "image" : "other");

    return (
      <div
        key={doc.id}
        className="rounded-lg border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-1 items-start space-x-4">
            <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-3">
              {DRAWING_DOCUMENT_ICONS[docType] || <FileText className="h-5 w-5 text-gray-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-gray-900">{doc.filename}</h3>
              <p className="mt-1 text-sm text-gray-500">Uploaded: {formatDate(doc.created_at)}</p>
              {doc.project_id && <p className="mt-1 text-xs text-blue-500">Project ID: {doc.project_id}</p>}
            </div>
          </div>
          <Button
            onClick={() => handleViewDrawing(doc)}
            variant="outline"
            className="ml-6 flex items-center space-x-2 px-4 py-2"
          >
            <Eye className="h-4 w-4" />
            <span>View</span>
          </Button>
        </div>
      </div>
    );
  };

  const loadProjectData = async (projectId: string) => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const projectSpecificForms = customer?.form_submissions.filter((form) => form.project_id === projectId) || [];
    setProjectForms(projectSpecificForms);

    const projectSpecificDocs = financialDocuments.filter((doc) => doc.project_id === projectId);
    setProjectDocs(projectSpecificDocs);
  };

  const handleViewProjectDetails = async (project: Project) => {
    setSelectedProject(project);
    await loadProjectData(project.id);
    setShowProjectDialog(true);
  };

  const handleEditProject = (projectId: string) => {
    if (!canManageProjects()) {
      alert("You do not have permission to edit projects.");
      return;
    }

    const projectToEdit = customer?.projects?.find((p) => p.id === projectId);
    if (!projectToEdit) {
      console.error("Project not found to edit");
      alert("Error: Could not find the project to edit.");
      return;
    }

    setSelectedProject(projectToEdit);

    setEditProjectData({
      project_name: projectToEdit.project_name,
      project_type: projectToEdit.project_type,
      stage: projectToEdit.stage,
      date_of_measure: projectToEdit.date_of_measure,
      notes: projectToEdit.notes,
    });

    setShowEditProjectDialog(true);
    setShowProjectDialog(false);
  };

  const handleEditProjectInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditProjectData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditProjectSelectChange = (name: "project_type" | "stage", value: string) => {
    setEditProjectData((prev) => ({ ...prev, [name]: value as any }));
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || isSavingProject) return;

    setIsSavingProject(true);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const dataToSave = {
      ...editProjectData,
      date_of_measure: editProjectData.date_of_measure || null,
    };

    try {
      const response = await fetch(`https://aztec-interior.onrender.com/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: headers,
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Server error" }));
        throw new Error(errorData.error || `Failed to update project (status: ${response.status})`);
      }

      setShowEditProjectDialog(false);
      alert("Project updated successfully!");
      loadCustomerData();
    } catch (error) {
      console.error("Error saving project:", error);
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setIsSavingProject(false);
    }
  };

  const canManageProjects = (): boolean => {
    if (!user || !user.role) return false;
    
    const allowedRoles = ['Platform Admin', 'Salesperson', 'Production Team'];
    return allowedRoles.some(role => role.toLowerCase() === user.role.toLowerCase());
  };

  const canEditForm = (submission: FormSubmission): boolean => {
    if (!user) return false;
    
    const allowedRoles = ['Platform Admin', 'Salesperson', 'Production Team'];
    const isCreator = submission.created_by === user.id;
    
    return allowedRoles.includes(user.role) || isCreator;
  };

  const handleEditForm = (submission: FormSubmission) => {
    if (!canEditForm(submission)) {
      alert("You don't have permission to edit this form.");
      return;
    }
    
    try {
      const formData = typeof submission.form_data === "string" 
        ? JSON.parse(submission.form_data) 
        : submission.form_data;
      
      setSelectedForm(submission);
      setEditFormData(formData);
      setIsEditingForm(true);
      setShowFormDialog(true);
      setFormType(getFormType(submission));
    } catch (error) {
      console.error("Error parsing form data:", error);
      alert("Error loading form data for editing");
    }
  };

  const handleSaveEditedForm = async () => {
    if (!selectedForm || !editFormData || isSavingForm) return;

    setIsSavingForm(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `https://aztec-interior.onrender.com/form-submissions/${selectedForm.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ formData: editFormData }),
        }
      );

      if (response.ok) {
        alert("Form updated successfully!");
        setShowFormDialog(false);
        setIsEditingForm(false);
        setEditFormData(null);
        loadCustomerData();
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to update form: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error updating form:", error);
      alert("Network error: Could not update form");
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleFormFieldChange = (fieldName: string, value: any) => {
    setEditFormData((prev: any) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const canEdit = (): boolean => {
    if (!customer) return false;
    
    const allowedRoles = ["Platform Admin", "Salesperson", "Production Team"];
    return allowedRoles.includes(user?.role || "");
  };

  const canDelete = (): boolean => {
    if (!user) return false;
    
    const allowedRoles = ['Platform Admin', 'Salesperson', 'Production Team'];
    return allowedRoles.includes(user.role);
  };

  const canCreateFinancialDocs = (): boolean => {
    return user?.role !== "Staff";
  };

  const handleEdit = () => {
    if (!canEdit()) {
      alert("You don't have permission to edit this customer.");
      return;
    }
    router.push(`/dashboard/customers/${id}/edit`);
  };

  const handleCreateProject = () => {
    if (!canManageProjects() || !customer) return;

    const queryParams = new URLSearchParams({
      customerId: customer.id,
      customerName: customer.name || "",
    });

    router.push(`/dashboard/projects/create?${queryParams.toString()}`);
  };

  const generateFormLink = (type: "bedroom" | "kitchen") => {
    if (!canEdit()) return;

    const params = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      customerPostcode: customer?.postcode || "",
    });

    const fullLink = `${window.location.origin}/dashboard/checklists/${type}?${params.toString()}`;
    setGeneratedLink(fullLink);
    setFormType(type);
    setShowLinkDialog(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleCreateQuote = async () => {
    if (!canEdit()) {
      alert("You don't have permission to create quotes for this customer.");
      return;
    }

    const bedroomChecklist = customer?.form_submissions?.find((form) => {
      const type = getFormType(form);
      return type === "bedroom";
    });

    const kitchenChecklist = customer?.form_submissions?.find((form) => {
      const type = getFormType(form);
      return type === "kitchen";
    });

    if (bedroomChecklist || kitchenChecklist) {
      const checklistType = bedroomChecklist ? "bedroom" : "kitchen";
      const checklistId = bedroomChecklist?.id || kitchenChecklist?.id;
      
      setChecklistForQuote({ type: checklistType, id: checklistId! });
      setShowQuoteGenerationDialog(true);
      return;
    }

    createBlankQuote();
  };

  const handleGenerateFromChecklist = async () => {
    if (!checklistForQuote) return;

    setShowQuoteGenerationDialog(false);
    
    try {
      const token = localStorage.getItem("token");
      
      console.log("🔄 Generating quote from checklist:", checklistForQuote);
      
      const response = await fetch(
        `https://aztec-interior.onrender.com/quotations/generate-from-checklist/${checklistForQuote.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("📡 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        
        console.log("✅ Quote data received:", data);
        
        console.log("🔄 Reloading customer data...");
        await loadCustomerData();
        console.log("✅ Customer data reloaded");
        
        const detailsUrl = `/dashboard/quotes/${data.quotation_id}`;
        console.log("🔗 Opening quote details:", detailsUrl);
        window.open(detailsUrl, '_blank');
        
        alert(
          `✅ Quote ${data.message?.includes('already exists') ? 'opened' : 'generated'} successfully!\n\n` +
          `Reference: ${data.reference_number}\n` +
          `Items: ${data.items_count}\n` +
          `Total: £${data.total.toFixed(2)}`
        );
      } else {
        const error = await response.json();
        console.error("❌ Quote generation failed:", error);
        alert(`Failed to generate quote: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("❌ Error generating quote:", error);
      alert("Network error: Could not generate quote");
    } finally {
      setChecklistForQuote(null);
    }
  };

  const createBlankQuote = () => {
    const queryParams = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      customerEmail: customer?.email || "",
      type: "quotation",
      source: "customer",
    });
    router.push(`/dashboard/quotes/create?${queryParams.toString()}`);
  };

  const buildCustomerQuery = () => {
    const qp = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      customerEmail: customer?.email || "",
    });
    return qp.toString();
  };

  const handleCreateRemedialChecklist = () => {
    if (user?.role === "Sales") {
      alert("Sales users cannot create remedial checklists. Please contact your Platform Admin.");
      return;
    }
    router.push(`/dashboard/checklists/remedial?${buildCustomerQuery()}`);
  };

  const handleCreateReceipt = () => {
    if (!canCreateFinancialDocs()) {
      alert("You don't have permission to create receipts.");
      return;
    }
    const params = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      type: "receipt",
      paidAmount: "0.00",
      totalPaidToDate: "0.00",
      balanceToPay: "0.00",
      receiptDate: new Date().toISOString().split("T")[0],
      paymentMethod: "BACS",
      paymentDescription: "Payment received for your Kitchen/Bedroom Cabinetry.",
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
  };

  const handleCreateDepositReceipt = () => {
    if (!canCreateFinancialDocs()) {
      alert("You don't have permission to create receipts.");
      return;
    }
    const params = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      type: "deposit",
      paidAmount: "0.00",
      totalPaidToDate: "0.00",
      balanceToPay: "0.00",
      receiptDate: new Date().toISOString().split("T")[0],
      paymentMethod: "BACS",
      paymentDescription: "Deposit payment received for your Kitchen/Bedroom Cabinetry.",
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
  };

  const handleCreateFinalReceipt = () => {
    if (!canCreateFinancialDocs()) {
      alert("You don't have permission to create receipts.");
      return;
    }
    const params = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      type: "final",
      paidAmount: "0.00",
      totalPaidToDate: "0.00",
      balanceToPay: "0.00",
      receiptDate: new Date().toISOString().split("T")[0],
      paymentMethod: "BACS",
      paymentDescription: "Final payment received for your Kitchen/Bedroom Cabinetry.",
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
  };

  const handleCreateInvoice = () => {
    if (!canCreateFinancialDocs()) {
      alert("You don't have permission to create invoices.");
      return;
    }
    router.push(`/dashboard/checklists/invoice/?${buildCustomerQuery()}`)
  };

  const handleCreateProformaInvoice = () => {
    if (!canCreateFinancialDocs()) {
      alert("You don't have permission to create invoices.");
      return;
    }
    router.push(`/dashboard/checklists/invoices/create?type=proforma&${buildCustomerQuery()}`);
  };

  const handleCreatePaymentTerms = () => {
    if (!canCreateFinancialDocs()) {
      alert("You don't have permission to create payment terms.");
      return;
    }
    router.push(`/dashboard/checklists/payment-terms/?${buildCustomerQuery()}`)
  };

  const handleCreateKitchenChecklist = () => {
    if (!canEdit()) return;
    
    const params = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      customerPostcode: customer?.postcode || "",
    });
    
    window.open(`/checklists/kitchen?${params.toString()}`, '_blank');
  };

  const handleCreateBedroomChecklist = () => {
    if (!canEdit()) return;
    
    const params = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      customerPostcode: customer?.postcode || "",
    });
    
    window.open(`/checklists/bedroom?${params.toString()}`, '_blank');
  };

const handleCreateNewProject = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!newProjectData.project_name) {
    alert("Please enter a project name");
    return;
  }

  setIsCreatingProject(true);
  const token = localStorage.getItem("token");

  try {
    // ✅ Use BACKEND_URL instead of hardcoded URL
    const response = await fetch(`${BACKEND_URL}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        client_id: parseInt(id),  // ✅ Ensure it's an integer
        project_title: newProjectData.project_name,  // ✅ Backend expects project_title
        project_description: newProjectData.notes || "",
        status: "Active",
        stage_id: 100,  // ✅ Default to Survey stage (adjust if needed)
        priority: "Medium",
        start_date: newProjectData.date_of_measure || null,
        notes: newProjectData.notes || "",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Project created:", data);
      alert("Project created successfully!");
      setShowCreateProjectDialog(false);
      setNewProjectData({
        project_name: "",
        project_type: "Kitchen",
        stage: "Lead",
        date_of_measure: "",
        notes: "",
      });
      loadCustomerData();
    } else {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("❌ Project creation error:", errorData);
      alert(`Failed to create project: ${errorData.error}`);
    }
  } catch (error) {
    console.error("❌ Error creating project:", error);
    alert("Network error: Could not create project");
  } finally {
    setIsCreatingProject(false);
  }
};

  const handleViewJob = (jobId: string) => {
    router.push(`/dashboard/jobs/${jobId}`);
  };

  const handleViewFinancialDoc = (doc: FinancialDocument) => {
    switch (doc.type) {
      case "invoice":
        router.push(`/dashboard/invoices/${doc.id}`);
        break;
      case "proforma":
        router.push(`/dashboard/checklists/quotes/${doc.id}`);
        break;
      case "receipt":
      case "deposit":
      case "final":
        router.push(`/dashboard/checklists/receipt?formSubmissionId=${doc.form_submission_id || doc.id}`);
        break;
      case "terms":
        router.push(`/dashboard/payment-terms/${doc.id}`);
        break;
      default:
        alert("Viewing not yet implemented for this document type");
    }
  };

  const getContactMethodIcon = (method: string) => {
    switch (method) {
      case "Phone":
        return <Phone className="h-4 w-4" />;
      case "Email":
        return <Mail className="h-4 w-4" />;
      case "WhatsApp":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const isUUID = (s: string) => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return re.test(s);
  };

  const humanizeLabel = (key: string) => {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    const fromHyphen = key.replace(/-/g, " ");
    const fromUnderscore = key.replace(/_/g, " ");
    const spaced = fromUnderscore.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    return spaced
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const humanizeValue = (val: any, key?: string): string => {
    if (val === null || val === undefined || val === "") return "—";

    const isFinancial = key && FINANCIAL_FIELDS.includes(key);

    if (typeof val === "string") {
      const str = val.trim();
      if (isUUID(str)) return "—";
      if (/^\d{4}-\d{2}-\d{2}$/.test(str) || !isNaN(Date.parse(str))) {
        return formatDate(str);
      }
      if (/[-_]/.test(str)) {
        const cleanStr = str
          .replace(/[-_]/g, " ")
          .split(" ")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");
        const floatValue = parseFloat(cleanStr.replace(/[^0-9.-]/g, ""));
        return isFinancial && !isNaN(floatValue) ? `£${floatValue.toFixed(2)}` : cleanStr;
      }

      const floatValue = parseFloat(str.replace(/[^0-9.-]/g, ""));
      return isFinancial && !isNaN(floatValue)
        ? `£${floatValue.toFixed(2)}`
        : str.charAt(0).toUpperCase() + str.slice(1);
    }

    if (typeof val === "number") {
      const formatted = val.toFixed(2);
      return isFinancial ? `£${formatted}` : String(val);
    }

    if (typeof val === "boolean") return String(val);
    if (Array.isArray(val)) return val.map((v) => humanizeValue(v)).join(", ");
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  };

  const getFormType = (submission: FormSubmission) => {
    let formDataRaw;
    try {
      formDataRaw = typeof submission.form_data === "string" ? JSON.parse(submission.form_data) : submission.form_data;
    } catch {
      formDataRaw = submission.form_data || {};
    }

    const formType = (formDataRaw?.form_type || "").toString().toLowerCase();

    if (
      formType.includes("receipt") ||
      formType.includes("deposit") ||
      formType.includes("final") ||
      formType.includes("invoice") ||
      formType.includes("proforma") ||
      formType.includes("terms")
    ) {
      return "document";
    }

    const checklistType = (formDataRaw?.checklistType || "").toString().toLowerCase();
    if (checklistType === "remedial") {
      return "remedial";
    }

    if (formType.includes("bed")) return "bedroom";
    if (formType.includes("kitchen")) return "kitchen";

    return "form";
  };

  const getFormTitle = (submission: FormSubmission) => {
    const type = getFormType(submission);
    let formDataRaw;
    try {
      formDataRaw = typeof submission.form_data === "string" ? JSON.parse(submission.form_data) : submission.form_data;
    } catch {
      formDataRaw = submission.form_data || {};
    }
    const formTypeRaw = (formDataRaw?.form_type || "").toString();

    switch (type) {
      case "remedial":
        return "Remedial Action Checklist";
      case "bedroom":
        return "Bedroom Checklist";
      case "kitchen":
        return "Kitchen Checklist";
      case "document":
        const parts = formTypeRaw.split(/[-_]/);
        const cleanedParts = parts.filter((word: string, index: number) => {
          if (index === 0) return true;
          return word.toLowerCase() !== parts[index - 1].toLowerCase();
        });
        return cleanedParts.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      default:
        return "Form Submission";
    }
  };

  const Row: React.FC<{ label: string; value: any; name?: string }> = ({ label, value, name }) => {
    const renderValue = (v: any) => {
      if (v === null || v === undefined || v === "") {
        return <span className="text-gray-500">—</span>;
      }
      if (Array.isArray(v)) {
        return (
          <span className="text-sm whitespace-pre-wrap">{v.map((item) => humanizeValue(item, name)).join(", ")}</span>
        );
      }
      if (typeof v === "object" && v !== null) {
        if (Object.keys(v).some((key) => typeof v[key] === "object" && v[key] !== null && !Array.isArray(v[key]))) {
          return <pre className="rounded bg-white p-3 text-sm whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>;
        }
        return (
          <span className="text-sm">
            {Object.entries(v)
              .map(([k, val]) => `${humanizeLabel(k)}: ${humanizeValue(val, k)}`)
              .join(", ")}
          </span>
        );
      }
      return <span className="text-sm">{humanizeValue(v, name)}</span>;
    };

    return (
      <div className="grid grid-cols-1 items-start gap-4 border-b py-3 last:border-b-0 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="text-sm font-medium text-gray-700">{label}</div>
        </div>
        <div className="md:col-span-2">
          <div className="text-sm text-gray-900">{renderValue(value)}</div>
        </div>
      </div>
    );
  };

  const renderReceiptData = (formData: Record<string, any>) => {
    console.log("Receipt formData:", formData);

    const parseAmount = (value: any) => {
      if (!value) return 0;
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        return parseFloat(value.replace(/[£$,]/g, "")) || 0;
      }
      return 0;
    };

    const balanceToPay = parseAmount(formData.balance_to_pay || formData.balanceToPay || formData["Balance To Pay"]);
    const amountPaid = parseAmount(
      formData.paid_amount ||
        formData.amount_paid ||
        formData.amountPaid ||
        formData.paidAmount ||
        formData["Paid Amount"],
    );
    const totalPaidToDate =
      parseAmount(
        formData.total_paid_to_date ||
          formData.totalPaidToDate ||
          formData.total_paid ||
          formData["Total Paid To Date"],
      ) || amountPaid;

    console.log("Parsed values:", { balanceToPay, amountPaid, totalPaidToDate });

    const derivedData: Record<string, any> = {
      ...formData,
      balance_to_pay: balanceToPay.toFixed(2),
      amount_paid: amountPaid.toFixed(2),
      total_paid_to_date: totalPaidToDate.toFixed(2),
      payment_description:
        formData.payment_description || formData.paymentDescription || formData["Payment Description"],
      payment_method: formData.payment_method || formData.paymentMethod || formData["Payment Method"],
      document_type_display: formData.receipt_type || formData.receiptType || formData["Receipt Type"] || "Receipt",
      date_paid: formData.receipt_date || formData.date_paid || formData.receiptDate || formData["Receipt Date"],
    };

    const customFinancialFields = ["amount_paid", "total_paid_to_date", "total_amount", "balance_to_pay"];
    const customAdditionalFields = ["payment_description", "payment_method", "document_type_display", "date_paid"];

    const keys = Object.keys(derivedData).filter(
      (k) => derivedData[k] !== null && derivedData[k] !== undefined && derivedData[k] !== "",
    );

    const handleViewReceipt = () => {
      const params = new URLSearchParams({
        customerId: customer?.id || "",
        customerName: customer?.name || "",
        customerAddress: customer?.address || "",
        customerPhone: customer?.phone || "",
        type: derivedData.document_type_display?.toLowerCase() || "receipt",
        paidAmount: derivedData.amount_paid || "0.00",
        totalPaidToDate: derivedData.total_paid_to_date || "0.00",
        balanceToPay: derivedData.balance_to_pay || "0.00",
        receiptDate: derivedData.date_paid || new Date().toISOString().split("T")[0],
        paymentMethod: derivedData.payment_method || "BACS",
        paymentDescription: derivedData.payment_description || "Payment received for your Kitchen/Bedroom Cabinetry.",
      });
      router.push(`/dashboard/checklists/receipt?formSubmissionId=${selectedForm?.id || ""}`);
    };

    return (
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-md font-semibold text-gray-900">Financial Overview</h3>
            <Button variant="outline" size="sm" onClick={handleViewReceipt} className="flex items-center space-x-2">
              <Receipt className="h-4 w-4" />
              <span>View Receipt</span>
            </Button>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            {customFinancialFields
              .filter((k) => keys.includes(k) || k === "balance_to_pay")
              .map(
                (k) =>
                  derivedData.hasOwnProperty(k) && (
                    <Row key={k} label={humanizeLabel(k)} value={derivedData[k]} name={k} />
                  ),
              )}
          </div>
        </section>

        <section>
          <h3 className="text-md mb-3 font-semibold text-gray-900">Additional Information</h3>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            {customAdditionalFields
              .filter((k) => derivedData[k])
              .map((k) => (
                <Row
                  key={k}
                  label={k === "document_type_display" ? "Type" : humanizeLabel(k)}
                  value={derivedData[k]}
                  name={k}
                />
              ))}
          </div>
        </section>
      </div>
    );
  };

  const handleEditCustomer = () => {
    setEditCustomerData({
      name: customer?.name || "",
      phone: customer?.phone || "",
      email: customer?.email || "",
      address: customer?.address || "",
      postcode: customer?.postcode || "",
      preferred_contact_method: customer?.preferred_contact_method || "Phone",
      date_of_measure: customer?.date_of_measure || "",
      notes: customer?.notes || "",
    });
    setIsEditingCustomer(true);
  };

  const handleCancelEditCustomer = () => {
    setIsEditingCustomer(false);
    setEditCustomerData({});
  };

  const handleSaveCustomer = async () => {
    if (!editCustomerData.name || !editCustomerData.phone || !editCustomerData.address || !editCustomerData.postcode) {
      alert("Please fill in all required fields (Name, Phone, Address, Postcode)");
      return;
    }

    setIsSavingCustomer(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${BACKEND_URL}/customers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editCustomerData.name,
          phone: editCustomerData.phone,
          email: editCustomerData.email || "",
          address: editCustomerData.address,
          postcode: editCustomerData.postcode,
          preferred_contact_method: editCustomerData.preferred_contact_method,
          date_of_measure: editCustomerData.date_of_measure || null,
          notes: editCustomerData.notes || "",
        }),
      });

      if (response.ok) {
        alert("Customer updated successfully!");
        setIsEditingCustomer(false);
        loadCustomerData();
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to update customer: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Network error: Could not update customer");
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Delete Customer Handler
  const handleDeleteCustomer = async () => {
    if (!canDelete()) {
      alert("You don't have permission to delete this customer.");
      return;
    }

    setIsDeletingCustomer(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${BACKEND_URL}/customers/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        alert("Customer deleted successfully!");
        router.push("/dashboard/customers");
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to delete customer: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Network error: Could not delete customer");
    } finally {
      setIsDeletingCustomer(false);
      setShowDeleteCustomerDialog(false);
    }
  };

  const renderRemedialForm = (formData: any) => {
    const items = formData.items || [];

    const customerName = formData.customerName || formData.customer_name || "—";
    const customerPhone = formData.customerPhone || formData.customer_phone || "—";
    const customerAddress = formData.customerAddress || formData.customer_address || "—";

    return (
      <div className="space-y-6">
        <section>
          <h3 className="text-md mb-3 font-semibold text-gray-900">Customer Information</h3>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 border-b py-3 md:grid-cols-3">
              <div className="text-sm font-medium text-gray-700">Checklist Type</div>
              <div className="text-sm text-gray-900 md:col-span-2">Remedial Action</div>
            </div>
            <div className="grid grid-cols-1 gap-4 border-b py-3 md:grid-cols-3">
              <div className="text-sm font-medium text-gray-700">Customer Name</div>
              <div className="text-sm text-gray-900 md:col-span-2">{customerName}</div>
            </div>
            <div className="grid grid-cols-1 gap-4 border-b py-3 md:grid-cols-3">
              <div className="text-sm font-medium text-gray-700">Phone Number</div>
              <div className="text-sm text-gray-900 md:col-span-2">{customerPhone}</div>
            </div>
            <div className="grid grid-cols-1 gap-4 border-b py-3 md:grid-cols-3">
              <div className="text-sm font-medium text-gray-700">Address</div>
              <div className="text-sm text-gray-900 md:col-span-2">{customerAddress}</div>
            </div>
            <div className="grid grid-cols-1 gap-4 border-b py-3 md:grid-cols-3">
              <div className="text-sm font-medium text-gray-700">Date</div>
              <div className="text-sm text-gray-900 md:col-span-2">{formatDate(formData.date)}</div>
            </div>
            <div className="grid grid-cols-1 gap-4 py-3 md:grid-cols-3">
              <div className="text-sm font-medium text-gray-700">Fitters</div>
              <div className="text-sm text-gray-900 md:col-span-2">{formData.fitters || "—"}</div>
            </div>
          </div>
        </section>

        {items.length > 0 && (
          <section>
            <h3 className="text-md mb-3 font-semibold text-gray-900">Items Required for Remedial Action</h3>
            <div className="overflow-x-auto rounded-lg bg-white p-4 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Remedial Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Colour
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.item || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.remedialAction || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.colour || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.size || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.qty || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    );
  };

  const handleViewChecklist = (submission: FormSubmission) => {
    const formType = getFormType(submission);
    if (formType === "bedroom" || formType === "kitchen") {
      const viewUrl = `/checklist-view?id=${submission.id}`;
      window.open(viewUrl, "_blank");
    } else {
      setSelectedForm(submission);
      setIsEditingForm(false);
      setShowFormDialog(true);
      setFormType(formType);
    }
  };

  const renderFormSubmission = (submission: FormSubmission) => {
    const formType = getFormType(submission);
    const isChecklist = formType === "bedroom" || formType === "kitchen";
    const isAssignedToProject = !!submission.project_id;
    
    return (
      <div
        draggable={!isAssignedToProject && canEdit()}
        onDragStart={() => !isAssignedToProject && canEdit() && handleDragStart('form', String(submission.id))}
        onDragEnd={handleDragEnd}
        className={`flex items-center justify-between rounded-lg border bg-gray-50 p-4 transition hover:bg-gray-100 ${
          !isAssignedToProject && canEdit() ? 'cursor-move hover:border-blue-400' : ''
        } ${draggedItem?.type === 'form' && draggedItem?.id === String(submission.id) ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center space-x-3 flex-1">
          {!isAssignedToProject && canEdit() && (
            <div className="flex flex-col items-center">
              <svg 
                className="h-5 w-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          )}
          
          <div className="flex flex-col flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{getFormTitle(submission)}</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Submitted: {formatDate(submission.submitted_at)}
              </span>
              {isAssignedToProject && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  <Package className="mr-1 h-3 w-3" />
                  Assigned to project
                </span>
              )}
              {!isAssignedToProject && canEdit() && (
                <span className="text-xs text-blue-600 font-medium">← Drag to assign</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewChecklist(submission)}
            className="flex items-center space-x-1"
          >
            <Eye className="h-4 w-4" />
            <span>View{isChecklist ? " Checklist" : ""}</span>
          </Button>
          
          {canEditForm(submission) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditForm(submission)}
              className="flex items-center space-x-1"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Button>
          )}
          
          {canDelete() && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFormToDelete(submission);
                setShowDeleteDialog(true);
              }}
              className="text-red-500 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderFinancialDocument = (doc: FinancialDocument) => {
    return (
      <div
        key={doc.id}
        className="rounded-lg border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-1 items-start space-x-4">
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
              {FINANCIAL_DOCUMENT_ICONS[doc.type] || <FileText className="h-5 w-5 text-gray-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-gray-900">{doc.title}</h3>
              <p className="mt-1 text-sm text-gray-500">Created: {formatDate(doc.created_at)}</p>
              <div className="mt-2 space-y-1">
                {doc.total !== undefined && doc.total !== null && (
                  <p className="text-sm font-medium text-gray-900">
                    Total: <span className="text-blue-600">£{doc.total.toFixed(2)}</span>
                  </p>
                )}
                {doc.amount_paid !== undefined && doc.amount_paid !== null && doc.amount_paid > 0 && (
                  <p className="text-sm text-green-600">Paid: £{doc.amount_paid.toFixed(2)}</p>
                )}
                {doc.balance !== undefined && doc.balance !== null && doc.balance > 0 && (
                  <p className="text-sm font-medium text-red-600">Balance: £{doc.balance.toFixed(2)}</p>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={() => handleViewFinancialDoc(doc)}
            variant="outline"
            className="ml-6 flex items-center space-x-2 px-4 py-2"
          >
            <Eye className="h-4 w-4" />
            <span>View</span>
          </Button>
        </div>
      </div>
    );
  };

  const renderFormDocument = (doc: FormDocument) => {
    const fileExtension = doc.filename.split(".").pop()?.toLowerCase() || "other";
    const docType = doc.type || 
      (fileExtension === "pdf" ? "pdf" : 
      ["xlsx", "xls", "csv"].includes(fileExtension) ? "excel" : "other");

    return (
      <div key={doc.id} className="rounded-lg border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-start justify-between">
          {canEdit() && (
            <div className="mr-3">
              <Checkbox
                checked={selectedFormDocs.has(doc.id)}
                onCheckedChange={() => handleToggleFormDocSelection(doc.id)}
              />
            </div>
          )}
          <div className="flex flex-1 items-start space-x-4">
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-blue-50 p-3">
              {FORM_DOCUMENT_ICONS[docType] || <FileText className="h-5 w-5 text-gray-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-gray-900">{doc.filename}</h3>
              <p className="mt-1 text-sm text-gray-500">Uploaded: {formatDate(doc.created_at)}</p>
            </div>
          </div>
          <div className="ml-6 flex items-center space-x-2">
            <Button onClick={() => handleViewFormDocument(doc)} variant="outline" size="sm" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>View</span>
            </Button>
            {canEdit() && (
              <Button
                onClick={() => handleDeleteFormDocument(doc)}
                disabled={isDeletingFormDoc}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-300"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleDeleteProject = (project: Project) => {
    if (!canManageProjects()) {
      alert("You do not have permission to delete projects.");
      return;
    }
    setProjectToDelete(project);
    setShowDeleteProjectDialog(true);
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete || isDeletingProject) return;

    setIsDeletingProject(true);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Authorization": `Bearer ${token}`,
    };

    try {
      const response = await fetch(`https://aztec-interior.onrender.com/projects/${projectToDelete.id}`, {
        method: "DELETE",
        headers: headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Server error" }));
        throw new Error(errorData.error || `Failed to delete project (status: ${response.status})`);
      }

      setShowDeleteProjectDialog(false);
      setProjectToDelete(null);
      alert(`Project "${projectToDelete.project_name}" deleted successfully!`);
      loadCustomerData();
    } catch (error) {
      console.error("Error deleting project:", error);
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleDeleteForm = async () => {
    if (!formToDelete || !canDelete()) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to delete form submissions");
        setIsDeleting(false);
        return;
      }

      const response = await fetch(`https://aztec-interior.onrender.com/form-submissions/${formToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        loadCustomerData();
        setShowDeleteDialog(false);
        setFormToDelete(null);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to delete form: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting form:", error);
      alert("Network error: Could not delete form");
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-medium text-red-900">Error Loading Data</h3>
            <p className="mb-4 text-red-600">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto space-y-8 p-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-full bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!customer) return <div className="p-8">Customer not found.</div>;

  const projectTypesFromProjects = customer.projects?.map((p) => p.project_type) || [];
  const projectTypesFromLegacyField = customer.project_types || [];

  const allProjectTypes = Array.from(new Set([
    ...projectTypesFromProjects,
    ...projectTypesFromLegacyField,
  ])).filter(Boolean);

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

      <input
        type="file"
        ref={formFileInputRef}
        onChange={handleFormFileChange}
        accept=".pdf,.xlsx,.xls,.csv"
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
              onClick={() => router.push("/dashboard/customers")}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Details</h1>
              <p className="text-sm text-gray-500">ID: {customer.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Add Checklist Button */}
            {canEdit() && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800">
                    <CheckSquare className="h-4 w-4" />
                    <span>Add Checklist</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleCreateKitchenChecklist}
                    disabled={generating}
                    className="flex items-center space-x-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Kitchen Checklist</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCreateBedroomChecklist}
                    disabled={generating}
                    className="flex items-center space-x-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Bedroom Checklist</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Add New Project Button */}
            {canManageProjects() && (
              <Button
                onClick={() => setShowCreateProjectDialog(true)}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Project</span>
              </Button>
            )}

            {/* Add Financial Document Button */}
            {canCreateFinancialDocs() && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800">
                    <DollarSign className="h-4 w-4" />
                    <span>Add Financial Document</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
                  <DropdownMenuItem onClick={handleCreatePaymentTerms} className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Payment Terms</span>
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Edit Button */}
            {canEdit() && (
              <Button
                onClick={() => setIsEditingCustomer(true)}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            )}

            {/* Delete Button */}
            {canDelete() && (
              <Button
                onClick={() => setShowDeleteCustomerDialog(true)}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </TabsTrigger>
            <TabsTrigger value="forms" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Checklists
            </TabsTrigger>
            <TabsTrigger value="drawings" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Drawings & Layouts
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Projects ({customer.projects?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Documents
            </TabsTrigger>
          </TabsList>

          {/* Customer Information Tab */}
          <TabsContent value="contact" className="mt-6 space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
                <div className="flex items-center space-x-4">
                  {customer.date_of_measure && !isEditingCustomer && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Measure: {formatDate(customer.date_of_measure)}</span>
                    </div>
                  )}
                  {isEditingCustomer && (
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={handleCancelEditCustomer}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveCustomer}
                        disabled={isSavingCustomer}
                        size="sm"
                        className="bg-gray-900 hover:bg-gray-800"
                      >
                        {isSavingCustomer ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {isEditingCustomer ? (
                // Edit Mode
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="flex flex-col">
                      <Label htmlFor="edit_name" className="mb-2 text-sm font-medium text-gray-500">
                        Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit_name"
                        value={editCustomerData.name || ""}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label htmlFor="edit_phone" className="mb-2 text-sm font-medium text-gray-500">
                        Phone <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit_phone"
                        value={editCustomerData.phone || ""}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label htmlFor="edit_email" className="mb-2 text-sm font-medium text-gray-500">
                        Email
                      </Label>
                      <Input
                        id="edit_email"
                        type="email"
                        value={editCustomerData.email || ""}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="flex flex-col">
                      <Label htmlFor="edit_address" className="mb-2 text-sm font-medium text-gray-500">
                        Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit_address"
                        value={editCustomerData.address || ""}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, address: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label htmlFor="edit_postcode" className="mb-2 text-sm font-medium text-gray-500">
                        Postcode <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit_postcode"
                        value={editCustomerData.postcode || ""}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, postcode: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label htmlFor="edit_preferred_contact" className="mb-2 text-sm font-medium text-gray-500">
                        Preferred Contact
                      </Label>
                      <Select
                        value={editCustomerData.preferred_contact_method || ""}
                        onValueChange={(value) => setEditCustomerData(prev => ({ 
                          ...prev, 
                          preferred_contact_method: value as "Phone" | "Email" | "WhatsApp" 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Phone">Phone</SelectItem>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="flex flex-col">
                      <Label htmlFor="edit_date_of_measure" className="mb-2 text-sm font-medium text-gray-500">
                        Date of Measure
                      </Label>
                      <Input
                        id="edit_date_of_measure"
                        type="date"
                        value={formatDateForInput(editCustomerData.date_of_measure)}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, date_of_measure: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <Label htmlFor="edit_notes" className="mb-2 text-sm font-medium text-gray-500">
                      Notes
                    </Label>
                    <Textarea
                      id="edit_notes"
                      value={editCustomerData.notes || ""}
                      onChange={(e) => setEditCustomerData(prev => ({ ...prev, notes: e.target.value }))}
                      className="min-h-[100px]"
                      placeholder="Add any relevant notes..."
                    />
                  </div>
                </div>
              ) : (
                // View Mode (existing display code)
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Name</span>
                      <span className="mt-1 text-base font-medium text-gray-900">{customer.name || "—"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">
                        Phone <span className="text-red-500">*</span>
                      </span>
                      <span className="mt-1 text-base text-gray-900">{customer.phone || "—"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Email</span>
                      <span className="mt-1 text-base text-gray-900">{customer.email || "—"}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">
                        Address <span className="text-red-500">*</span>
                      </span>
                      <span className="mt-1 text-base text-gray-900">{customer.address || "—"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">
                        Postcode <span className="text-red-500">*</span>
                      </span>
                      <div className="mt-1">
                        {customer.postcode ? (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-900">
                              {customer.postcode}
                            </span>
                          </div>
                        ) : (
                          <span className="text-base text-gray-900">—</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Preferred Contact</span>
                      <div className="mt-1">
                        {customer.preferred_contact_method ? (
                          <div className="flex items-center space-x-2">
                            {getContactMethodIcon(customer.preferred_contact_method)}
                            <span className="text-base text-gray-900">{customer.preferred_contact_method}</span>
                          </div>
                        ) : (
                          <span className="text-base text-gray-900">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Project Type</span>
                      <div className="mt-1">
                        {allProjectTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(new Set(allProjectTypes)).map((type, index) => (
                              <span
                                key={index}
                                className={`inline-flex rounded-full px-2 py-1 text-sm font-semibold ${getProjectTypeColor(type)}`}
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-base text-gray-900">—</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Pipeline Stage</span>
                      <div className="mt-1">
                        {customer.projects && customer.projects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {customer.projects.map((project, index) => (
                              <span
                                key={index}
                                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStageColor(project.stage)}`}
                              >
                                {project.stage}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-base text-gray-900">—</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Customer Since</span>
                      <span className="mt-1 text-base text-gray-900">{formatDate(customer.created_at)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {customer.notes && !customer.notes.includes("Stage changed from") && !isEditingCustomer && (
                <div className="mt-6">
                  <span className="text-sm font-medium text-gray-500">Notes</span>
                  <div className="mt-2 rounded-lg bg-gray-50 p-3">
                    <span className="text-base whitespace-pre-wrap text-gray-900">{customer.notes}</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Forms Tab */}
          <TabsContent value="forms" className="mt-6 space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Checklist Submissions</h2>
                {canEdit() && (
                  <Button
                    onClick={handleUploadFormDocument}
                    className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload Document</span>
                  </Button>
                )}
              </div>

              {/* Uploaded Form Documents */}
              {formDocuments.length > 0 && (
                <div className="mb-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Uploaded Documents ({formDocuments.length})
                    </h3>
                    <div className="flex items-center space-x-2">
                      {canEdit() && selectedFormDocs.size > 0 && (
                        <>
                          <Button
                            onClick={handleBulkDeleteFormDocs}
                            variant="destructive"
                            className="flex items-center space-x-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete Selected ({selectedFormDocs.size})</span>
                          </Button>
                          <Button
                            onClick={() => setSelectedFormDocs(new Set())}
                            variant="outline"
                          >
                            Clear Selection
                          </Button>
                        </>
                      )}
                      {canEdit() && formDocuments.length > 0 && (
                        <Checkbox
                          checked={selectedFormDocs.size === formDocuments.length && formDocuments.length > 0}
                          onCheckedChange={handleSelectAllFormDocs}
                        />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {formDocuments
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map(renderFormDocument)}
                  </div>
                </div>
              )}

              {/* Form Submissions */}
              {customer.form_submissions && customer.form_submissions.length > 0 ? (
                <div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {customer.form_submissions.map((submission) => (
                      <div key={submission.id}>{renderFormSubmission(submission)}</div>
                    ))}
                  </div>
                </div>
              ) : (
                !formDocuments.length && (
                  <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
                    <CheckSquare className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900">No Form Submissions</h3>
                    <p className="text-sm">
                      Generate a form link, create a checklist, or upload documents to collect customer information.
                    </p>
                  </div>
                )
              )}
            </div>
          </TabsContent>

          {/* Drawings Tab */}
          <TabsContent value="drawings" className="mt-6 space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Drawings & Layouts ({drawingDocuments.length})</h2>
                <div className="flex items-center space-x-2">
                  {canEdit() && selectedDrawings.size > 0 && (
                    <>
                      <Button
                        onClick={handleBulkDeleteDrawings}
                        variant="destructive"
                        className="flex items-center space-x-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Selected ({selectedDrawings.size})</span>
                      </Button>
                      <Button
                        onClick={() => setSelectedDrawings(new Set())}
                        variant="outline"
                      >
                        Clear Selection
                      </Button>
                    </>
                  )}
                  {canEdit() && drawingDocuments.length > 0 && (
                    <Checkbox
                      checked={selectedDrawings.size === drawingDocuments.length && drawingDocuments.length > 0}
                      onCheckedChange={handleSelectAllDrawings}
                    />
                  )}
                  {canEdit() && (
                    <Button
                      onClick={handleUploadDrawing}
                      className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload File</span>
                    </Button>
                  )}
                </div>
              </div>

              {drawingDocuments.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {drawingDocuments
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((doc) => {
                      const fileExtension = doc.filename.split(".").pop()?.toLowerCase() || "other";
                      const docType = doc.type || (fileExtension === "pdf" ? "pdf" : ["png", "jpg", "jpeg", "gif"].includes(fileExtension) ? "image" : "other");
                      const isAssignedToProject = !!doc.project_id;

                      return (
                        <div
                          key={doc.id}
                          draggable={!isAssignedToProject && canEdit()}
                          onDragStart={() => !isAssignedToProject && canEdit() && handleDragStart('drawing', doc.id)}
                          onDragEnd={handleDragEnd}
                          className={`rounded-lg border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
                            !isAssignedToProject && canEdit() ? 'cursor-move hover:border-blue-400' : ''
                          } ${draggedItem?.type === 'drawing' && draggedItem?.id === doc.id ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            {canEdit() && (
                              <div className="mr-3 flex flex-col items-center">
                                <Checkbox
                                  checked={selectedDrawings.has(doc.id)}
                                  onCheckedChange={() => handleToggleDrawingSelection(doc.id)}
                                  className="mb-2"
                                />
                                {!isAssignedToProject && (
                                  <svg 
                                    className="h-5 w-5 text-gray-400" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                )}
                              </div>
                            )}
                            <div className="flex flex-1 items-start space-x-4">
                              <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-3">
                                {DRAWING_DOCUMENT_ICONS[docType] || <FileText className="h-5 w-5 text-gray-600" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="truncate font-semibold text-gray-900">{doc.filename}</h3>
                                <p className="mt-1 text-sm text-gray-500">Uploaded: {formatDate(doc.created_at)}</p>
                                {isAssignedToProject ? (
                                  <span className="mt-1 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                    <Package className="mr-1 h-3 w-3" />
                                    Assigned to project
                                  </span>
                                ) : (
                                  canEdit() && (
                                    <p className="mt-1 text-xs text-blue-600">← Drag to assign to project</p>
                                  )
                                )}
                              </div>
                            </div>
                            <div className="ml-6 flex items-center space-x-2">
                              <Button onClick={() => handleViewDrawing(doc)} variant="outline" size="sm" className="flex items-center space-x-2">
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </Button>
                              {canEdit() && (
                                <Button
                                  onClick={() => handleDeleteDrawing(doc)}
                                  disabled={isDeletingDrawing}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center space-x-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-300"
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
                <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                  <Image className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">No Drawings or Layouts</h3>
                  <p className="mb-4 text-sm text-gray-600">Upload CADs, sketches, photos, or client documentation here.</p>
                  {canEdit() && (
                    <Button
                      onClick={handleUploadDrawing}
                      className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload File</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-6 space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Projects ({customer.projects?.length || 0})</h2>
                {canManageProjects() && (
                  <Button onClick={handleCreateProject} className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800">
                    <Plus className="h-4 w-4" />
                    <span>New Project</span>
                  </Button>
                )}
              </div>

              {customer.projects && customer.projects.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {customer.projects
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((project) => (
                      <div
                        key={project.id}
                        className={`rounded-lg border bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
                          dragOverProject === project.id ? 'ring-2 ring-blue-500 bg-blue-100/50' : ''
                        }`}
                        onDragOver={(e) => handleDragOver(e, project.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, project.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1 pr-4">
                            <div className="mb-2 flex items-center space-x-2">
                              <Package className="h-5 w-5 text-blue-600" />
                              <h3 className="truncate text-lg font-semibold text-gray-900">{project.project_name}</h3>
                            </div>
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getProjectTypeColor(project.project_type)}`}
                                >
                                  {project.project_type}
                                </span>
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStageColor(project.stage)}`}
                                >
                                  {project.stage}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                <Calendar className="mr-1 inline h-3 w-3" />
                                Measure: {formatDate(project.date_of_measure || "")}
                              </p>
                              <p className="text-sm text-gray-600">
                                <FileText className="mr-1 inline h-3 w-3" />
                                {project.form_count} Form{project.form_count !== 1 ? "s" : ""}
                              </p>
                            </div>
                            {project.notes && <p className="mt-3 line-clamp-2 text-sm text-gray-500">{project.notes}</p>}
                            {dragOverProject === project.id && (
                              <p className="mt-2 text-xs text-blue-600 font-medium">Drop here to assign</p>
                            )}
                          </div>
                          <div className="ml-4 flex flex-shrink-0 flex-col space-y-2">
                            {canManageProjects() && (
                              <>
                                <Button
                                  onClick={() => handleEditProject(project.id)}
                                  variant="default"
                                  size="sm"
                                  className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800"
                                >
                                  <Edit className="h-4 w-4" />
                                  <span>Edit</span>
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProject(project);
                                  }}
                                  variant="destructive"
                                  size="sm"
                                  className="flex items-center space-x-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Delete</span>
                                </Button>
                              </>
                            )}
                            <Button
                              onClick={() => window.open(`/dashboard/projects/${project.id}`, '_blank')}
                              variant="outline"
                              size="sm"
                              className="flex items-center space-x-2"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
                  <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">No Projects Yet</h3>
                  <p className="text-sm">Create a new project to track specific kitchen/bedroom work.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Financial Documents Tab */}
          <TabsContent value="financial" className="mt-6 space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Financial Documents ({financialDocuments.length})
                </h2>
                {financialDocuments.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {financialDocuments.filter(d => d.type === 'quotation').length} Quotation{financialDocuments.filter(d => d.type === 'quotation').length !== 1 ? 's' : ''} • {' '}
                    {financialDocuments.filter(d => d.type === 'invoice' || d.type === 'proforma').length} Invoice{financialDocuments.filter(d => d.type === 'invoice' || d.type === 'proforma').length !== 1 ? 's' : ''} • {' '}
                    {financialDocuments.filter(d => d.type === 'receipt' || d.type === 'deposit' || d.type === 'final').length} Receipt{financialDocuments.filter(d => d.type === 'receipt' || d.type === 'deposit' || d.type === 'final').length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {financialDocuments.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {financialDocuments.map((doc) => (
                    <div
                      key={`${doc.type}-${doc.id}`}
                      className={`rounded-lg border bg-gradient-to-br ${getFinancialDocColor(doc.type)} p-6 shadow-sm transition-all duration-200 hover:shadow-md`}
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
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                  doc.status === 'Approved' || doc.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                  doc.status === 'Draft' || doc.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                  doc.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {doc.status}
                                </span>
                              </div>
                            )}

                            {doc.total !== undefined && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Total:</span>{' '}
                                <span className="font-semibold text-gray-900">£{doc.total.toFixed(2)}</span>
                              </p>
                            )}

                            {doc.amount_paid !== undefined && doc.amount_paid > 0 && (
                              <p className="text-sm text-green-700">
                                <span className="font-medium">Paid:</span>{' '}
                                <span className="font-semibold">£{doc.amount_paid.toFixed(2)}</span>
                              </p>
                            )}

                            {doc.balance !== undefined && doc.balance > 0 && (
                              <p className="text-sm text-red-700">
                                <span className="font-medium">Balance:</span>{' '}
                                <span className="font-semibold">£{doc.balance.toFixed(2)}</span>
                              </p>
                            )}

                            <p className="text-xs text-gray-600">
                              <Calendar className="mr-1 inline h-3 w-3" />
                              {formatDate(doc.created_at)}
                            </p>

                            {doc.project_id && (
                              <p className="text-xs text-blue-600">
                                <Package className="mr-1 inline h-3 w-3" />
                                Linked to project
                              </p>
                            )}
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
                        
                        {doc.type === 'quotation' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const quoteId = typeof doc.id === 'string' ? parseInt(doc.id) : doc.id;
                              
                              if (!quoteId || isNaN(quoteId)) {
                                console.error('Invalid quote ID:', doc.id);
                                alert('Error: Cannot delete quotation - invalid ID');
                                return;
                              }
                              
                              setQuoteToDelete({
                                id: quoteId,
                                reference: doc.reference || doc.title 
                              });
                              setDeleteDialogOpen(true);
                            }}
                            disabled={deletingQuoteId === doc.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
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
                  <p className="mx-auto mb-8 max-w-2xl text-gray-600">
                    Create invoices, receipts, quotes, or payment terms to track this customer's financial activity.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
            
      {/* Delete Quotation Dialog */}
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
                if (!quoteToDelete) {
                  console.error('No quote selected for deletion');
                  alert('Error: No quote selected');
                  return;
                }
                
                if (!quoteToDelete.id || isNaN(quoteToDelete.id)) {
                  console.error('Invalid quote ID:', quoteToDelete);
                  alert('Error: Invalid quote ID');
                  return;
                }
                
                console.log('Deleting quote ID:', quoteToDelete.id);
                handleDeleteQuote(quoteToDelete.id);
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

      {/* PROJECT SELECTION DIALOG FOR UPLOADS */}
      <Dialog open={showProjectSelectDialog} onOpenChange={setShowProjectSelectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Project for Upload</DialogTitle>
            <DialogDescription>
              Choose which project these drawings belong to, or leave unassigned for general documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div
              onClick={() => setSelectedProjectForUpload(null)}
              className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                selectedProjectForUpload === null
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Image className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">General Documents</h4>
                  <p className="text-sm text-gray-600">Not linked to any specific project</p>
                </div>
              </div>
            </div>

            {customer?.projects && customer.projects.length > 0 && (
              <>
                <div className="text-sm font-medium text-gray-700">Or select a project:</div>
                {customer.projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProjectForUpload(project.id)}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      selectedProjectForUpload === project.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Package className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{project.project_name}</h4>
                        <div className="mt-1 flex items-center space-x-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getProjectTypeColor(project.project_type)}`}>
                            {project.project_type}
                          </span>
                          <span className="text-xs text-gray-500">{project.stage}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowProjectSelectDialog(false);
              setSelectedProjectForUpload(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmProjectUpload}>
              Upload to {selectedProjectForUpload === null ? "General" : "Selected Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE FORM DOCUMENT DIALOG */}
      <Dialog open={showDeleteFormDocDialog} onOpenChange={setShowDeleteFormDocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{formDocToDelete?.filename}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteFormDocDialog(false)} disabled={isDeletingFormDoc}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteFormDocument}
              disabled={isDeletingFormDoc}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeletingFormDoc ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK DELETE DRAWINGS DIALOG */}
      <Dialog open={showBulkDeleteDrawingsDialog} onOpenChange={setShowBulkDeleteDrawingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Multiple Drawings</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedDrawings.size} selected drawing(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDrawingsDialog(false)}
              disabled={isBulkDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBulkDeleteDrawings}
              disabled={isBulkDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isBulkDeleting ? "Deleting..." : `Delete ${selectedDrawings.size} Files`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK DELETE FORM DOCUMENTS DIALOG */}
      <Dialog open={showBulkDeleteFormDocsDialog} onOpenChange={setShowBulkDeleteFormDocsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Multiple Documents</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedFormDocs.size} selected document(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteFormDocsDialog(false)}
              disabled={isBulkDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBulkDeleteFormDocs}
              disabled={isBulkDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isBulkDeleting ? "Deleting..." : `Delete ${selectedFormDocs.size} Files`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FORM LINK DIALOG */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formType === "kitchen" ? "Kitchen" : "Bedroom"} Checklist Form Link Generated</DialogTitle>
            <DialogDescription>
              Share this link with {customer?.name} to fill out the {formType === "kitchen" ? "kitchen" : "bedroom"}{" "}
              checklist form. The form data will be linked to their existing customer record.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input value={generatedLink} readOnly className="flex-1" />
            <Button onClick={copyToClipboard} variant="outline">
              {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {linkCopied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE DRAWING DIALOG */}
      <Dialog open={showDeleteDrawingDialog} onOpenChange={setShowDeleteDrawingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Drawing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{drawingToDelete?.filename}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDrawingDialog(false)}
              disabled={isDeletingDrawing}
            >
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

      {/* DELETE FORM DIALOG */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this form submission? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteForm}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT PROJECT DIALOG */}
      <Dialog open={showEditProjectDialog} onOpenChange={setShowEditProjectDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the details for "{selectedProject?.project_name}". Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProject}>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project_name" className="text-right">
                  Project Name
                </Label>
                <Input
                  id="project_name"
                  name="project_name"
                  value={editProjectData.project_name || ""}
                  onChange={handleEditProjectInputChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project_type" className="text-right">
                  Project Type
                </Label>
                <Select
                  name="project_type"
                  value={editProjectData.project_type || ""}
                  onValueChange={(value) => handleEditProjectSelectChange("project_type", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stage" className="text-right">
                  Stage
                </Label>
                <Select
                  name="stage"
                  value={editProjectData.stage || ""}
                  onValueChange={(value) => handleEditProjectSelectChange("stage", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date_of_measure" className="text-right">
                  Measure Date
                </Label>
                <Input
                  id="date_of_measure"
                  name="date_of_measure"
                  type="date"
                  value={formatDateForInput(editProjectData.date_of_measure)}
                  onChange={handleEditProjectInputChange}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="pt-2 text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={editProjectData.notes || ""}
                  onChange={handleEditProjectInputChange}
                  className="col-span-3 min-h-[100px]"
                  placeholder="Add any relevant project notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditProjectDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingProject}>
                {isSavingProject ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE PROJECT DIALOG */}
      <Dialog open={showDeleteProjectDialog} onOpenChange={setShowDeleteProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete project <strong>{projectToDelete?.project_name}</strong>? This action
              cannot be undone and will not automatically delete associated forms or documents (if they exist outside of
              this project's context).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteProjectDialog(false)}
              disabled={isDeletingProject}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteProject}
              disabled={isDeletingProject}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeletingProject ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUOTE GENERATION DIALOG */}
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
              You have a <span className="font-semibold text-blue-600">{checklistForQuote?.type}</span> checklist on file.
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

      {/* Delete Customer Dialog */}
      <AlertDialog open={showDeleteCustomerDialog} onOpenChange={setShowDeleteCustomerDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete customer "{customer?.name}"? 
              This action cannot be undone and will permanently remove the customer and all associated data including projects, forms, and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCustomer}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              disabled={isDeletingCustomer}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingCustomer ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Customer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProjectDialog} onOpenChange={setShowCreateProjectDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project for {customer?.name}. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          
          {customer && (
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900">
                Linked Customer: {customer.name}
              </p>
              <p className="text-xs text-blue-700">
                ID: {customer.id}
              </p>
            </div>
          )}

          <form onSubmit={handleCreateNewProject}>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project_name">
                  Project Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="project_name"
                  placeholder="Customer's Project"
                  value={newProjectData.project_name}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, project_name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project_type">
                    Project Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={newProjectData.project_type}
                    onValueChange={(value) => setNewProjectData(prev => ({ 
                      ...prev, 
                      project_type: value as Project["project_type"] 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="stage">
                    Initial Stage <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={newProjectData.stage}
                    onValueChange={(value) => setNewProjectData(prev => ({ ...prev, stage: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STAGES.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date_of_measure">Date of Measure (Optional)</Label>
                <Input
                  id="date_of_measure"
                  type="date"
                  value={newProjectData.date_of_measure}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, date_of_measure: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes / Scope of Work (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter any initial notes or details about the project scope."
                  value={newProjectData.notes}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateProjectDialog(false);
                  setNewProjectData({
                    project_name: "",
                    project_type: "Kitchen",
                    stage: "Lead",
                    date_of_measure: "",
                    notes: "",
                  });
                }}
                disabled={isCreatingProject}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingProject}
                className="bg-gray-900 hover:bg-gray-800"
              >
                {isCreatingProject ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Briefcase className="mr-2 h-4 w-4" />
                    Create Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}