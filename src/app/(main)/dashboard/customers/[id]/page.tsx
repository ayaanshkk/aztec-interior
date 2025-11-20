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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ... (keeping all your existing interfaces the same)
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

interface FinancialDocument {
  id: string;
  type: "invoice" | "proforma" | "receipt" | "deposit" | "final" | "terms";
  title: string;
  total?: number;
  amount_paid?: number;
  balance?: number;
  created_at: string;
  created_by: string;
  form_submission_id?: number;
  project_id?: string;
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

// ... (keeping all your existing constants the same - FIELD_LABELS, FINANCIAL_FIELDS, etc.)
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

// ... (keeping all your helper functions the same)
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
  
  // NEW: Bulk delete states
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
  const [financialDocs, setFinancialDocs] = useState<FinancialDocument[]>([]);
  const [drawingDocuments, setDrawingDocuments] = useState<DrawingDocument[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!id) return;
    loadCustomerData();
  }, [id, user]);

  const loadCustomerData = () => {
    setLoading(true);

    const token = localStorage.getItem("auth_token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Fetch customer data
    const customerPromise = fetch(`https://aztec-interiors.onrender.com/customers/${id}`, { headers })
      .then(res => res.json())
      .then((data) => {
        // Normalize post_code → postcode
        const normalizedCustomer = {
          ...data,
          postcode: data.post_code ?? data.postcode ?? "",
        };

        if (user?.role === "Sales" && data.created_by !== user.id && data.salesperson !== user.name) {
          setHasAccess(true);
        } else if (user?.role === "Staff") {
          const hasPermission = data.created_by === user.id || data.salesperson === user.name;
          setHasAccess(hasPermission);
          if (!hasPermission) {
            return;
          }
        } else {
          setHasAccess(true);
        }

        setCustomer(normalizedCustomer);
      })
      .catch((err) => console.error("Error loading customer:", err));

    // Fetch jobs
    const jobsPromise = fetch(`https://aztec-interiors.onrender.com/jobs?customer_id=${id}`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch jobs");
        return res.json();
      })
      .then((data) => {
        if (user?.role === "Sales") {
          const salesStages = ["Lead", "Quote", "Consultation", "Survey", "Measure", "Design", "Quoted"];
          const filteredJobs = data.filter((job: any) => salesStages.includes(job.stage));
          setJobs(filteredJobs);
        } else {
          setJobs(data);
        }
      })
      .catch((err) => console.error("Error loading jobs:", err));

    // Load documents (don't need to wait for these)
    loadFinancialDocuments(headers);
    loadDrawingDocuments(headers);
    loadFormDocuments(headers);

    // Wait for both critical fetches, then stop loading
    Promise.all([customerPromise, jobsPromise])
      .finally(() => setLoading(false));
  };

  const loadFinancialDocuments = (headers: HeadersInit) => {
    console.log("Fetching financial documents for customer:", id);

    Promise.all([
      fetch(`https://aztec-interiors.onrender.com/invoices?customer_id=${id}`, { headers }).catch(() => [] as any[]),
      fetch(`https://aztec-interiors.onrender.com/quotations?customer_id=${id}`, { headers }).catch(() => [] as any[]),
    ])
      .then(async ([invoicesRes, quotesRes]) => {
        let invoices: any[] = [];
        let quotes: any[] = [];

        if (invoicesRes && "ok" in invoicesRes && invoicesRes.ok) {
          try {
            invoices = await invoicesRes.json();
          } catch (e) {
            console.error("Failed to parse invoices JSON", e);
          }
        }
        if (quotesRes && "ok" in quotesRes && quotesRes.ok) {
          try {
            quotes = await quotesRes.json();
          } catch (e) {
            console.error("Failed to parse quotes JSON", e);
          }
        }

        const docs: FinancialDocument[] = [
          ...invoices.map((inv: any) => ({
            id: inv.id,
            type: "invoice" as const,
            title: `Invoice #${inv.id}`,
            total: parseFloat(inv.total) || undefined,
            amount_paid: parseFloat(inv.amount_paid) || undefined,
            balance: parseFloat(inv.balance) || undefined,
            created_at: inv.created_at,
            created_by: inv.created_by,
            project_id: inv.project_id,
          })),
          ...quotes.map((quote: any) => ({
            id: quote.id,
            type: "proforma" as const,
            title: `Quote #${quote.id}`,
            total: parseFloat(quote.total) || undefined,
            amount_paid: 0,
            balance: parseFloat(quote.total) || undefined,
            created_at: quote.created_at,
            created_by: quote.created_by,
            project_id: quote.project_id,
          })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setFinancialDocs(docs);
      })
      .catch((err) => console.error("Error loading financial documents:", err));
  };

  const loadDrawingDocuments = (headers: HeadersInit) => {
    const url = `https://aztec-interiors.onrender.com/files/drawings?customer_id=${id}`;

    fetch(url, { headers })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404 || res.status === 204) {
            setDrawingDocuments([]);
            return null;
          }
          console.error(`Failed to fetch drawings, status: ${res.status}`);
          throw new Error(`Failed to fetch drawings (status: ${res.status})`);
        }
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          return res.json();
        } else {
          return null;
        }
      })
      .then((data) => {
        if (data === null) return;

        if (Array.isArray(data)) {
          setDrawingDocuments(data);
        } else {
          console.warn("Unexpected data format from drawings endpoint:", data);
          setDrawingDocuments([]);
        }
      })
      .catch((err) => {
        console.error("Error loading drawings:", err);
        setDrawingDocuments([]);
      });
  };

  const loadFormDocuments = (headers: HeadersInit) => {
  const url = `https://aztec-interiors.onrender.com/files/forms?customer_id=${id}`;

  fetch(url, { headers })
    .then((res) => {
      if (!res.ok) {
        if (res.status === 404 || res.status === 204) {
          setFormDocuments([]);
          return null;
        }
        console.error(`Failed to fetch form documents, status: ${res.status}`);
        throw new Error(`Failed to fetch form documents (status: ${res.status})`);
      }
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        return res.json();
      } else {
        return null;
      }
    })
    .then((data) => {
      if (data === null) return;

      if (Array.isArray(data)) {
        setFormDocuments(data);
      } else {
        console.warn("Unexpected data format from form documents endpoint:", data);
        setFormDocuments([]);
      }
    })
    .catch((err) => {
      console.error("Error loading form documents:", err);
      setFormDocuments([]);
    });
};

const handleFormFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const token = localStorage.getItem("auth_token");
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  for (const file of Array.from(files)) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("customer_id", id);

      const response = await fetch("https://aztec-interiors.onrender.com/files/forms", {
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

          setFormDocuments((prev) => {
            const updated = [...prev, newDoc];
            return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: `Server returned status ${response.status}` }));
        console.error(`Failed to upload ${file.name}: ${errorData.error || "Server error"}`);
      }
    } catch (error) {
      console.error(`Network error:`, error);
    }
  }

  if (event.target) event.target.value = "";
};

const handleUploadFormDocument = () => {
  if (formFileInputRef.current) {
    formFileInputRef.current.click();
  }
};

const handleViewFormDocument = (doc: FormDocument) => {
  const BACKEND_URL = "https://aztec-interiors.onrender.com";
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
  
  const token = localStorage.getItem("auth_token");
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(
      `https://aztec-interiors.onrender.com/files/forms/${formDocToDelete.id}`,
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

  // NEW: Bulk delete handlers for drawings
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
    const token = localStorage.getItem("auth_token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const deletePromises = Array.from(selectedDrawings).map(drawingId =>
      fetch(`https://aztec-interiors.onrender.com/files/drawings/${drawingId}`, {
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

  // NEW: Bulk delete handlers for form documents
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

  const handleBulkDeleteFormDocs = () => {
    if (selectedFormDocs.size === 0) return;
    setShowBulkDeleteFormDocsDialog(true);
  };

  const handleConfirmBulkDeleteFormDocs = async () => {
    setIsBulkDeleting(true);
    const token = localStorage.getItem("auth_token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const deletePromises = Array.from(selectedFormDocs).map(docId =>
      fetch(`https://aztec-interiors.onrender.com/files/forms/${docId}`, {
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

    const token = localStorage.getItem("auth_token");
    const headers: HeadersInit = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("customer_id", id);

        const response = await fetch("https://aztec-interiors.onrender.com/files/drawings", {
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

            setDrawingDocuments((prev) => {
              const updated = [...prev, newDoc];
              return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            });
          } else {
            console.error("Invalid response structure:", data);
          }
        } else {
          const errorData = await response.json().catch(() => ({
            error: `Server returned status ${response.status}`,
          }));
          console.error(`Upload failed:`, errorData);
        }
      } catch (error) {
        console.error(`Network error:`, error);
      }
    }

    if (event.target) {
      event.target.value = "";
    }
  };

  const handleUploadDrawing = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleViewDrawing = (doc: DrawingDocument) => {
    const BACKEND_URL = "https://aztec-interiors.onrender.com";
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
    const token = localStorage.getItem("auth_token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(
        `https://aztec-interiors.onrender.com/files/drawings/${drawingToDelete.id}`,
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
    const token = localStorage.getItem("auth_token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const projectSpecificForms = customer?.form_submissions.filter((form) => form.project_id === projectId) || [];
    setProjectForms(projectSpecificForms);

    const projectSpecificDocs = financialDocs.filter((doc) => doc.project_id === projectId);
    setProjectDocs(projectSpecificDocs);
  };

  const handleViewProjectDetails = async (project: Project) => {
    setSelectedProject(project);
    await loadProjectData(project.id);
    setShowProjectDialog(true);
  };

  const handleEditProject = (projectId: string) => {
    // Check for permission before editing
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
    const token = localStorage.getItem("auth_token");
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
      const response = await fetch(`https://aztec-interiors.onrender.com/projects/${selectedProject.id}`, {
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

  // --- NEW PERMISSIVE FUNCTION (For Project Creation/Editing) ---
  const canManageProjects = (): boolean => {
    if (!user || !user.role) return false;
    
    // Allow Manager, HR, Production, and Sales to manage projects
    const allowedRoles = ['Manager', 'HR', 'Production', 'Sales'];
    return allowedRoles.some(role => role.toLowerCase() === user.role.toLowerCase());
  };

  // -------------------------------------------------------------

  // Add permission check function
  const canEditForm = (submission: FormSubmission): boolean => {
    if (!user) return false;
    
    const allowedRoles = ['Manager', 'HR', 'Production', 'Sales'];
    const isCreator = submission.created_by === user.id;
    
    return allowedRoles.includes(user.role) || isCreator;
  };

  // Add function to handle edit button click
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

  // Add function to save edited form
  const handleSaveEditedForm = async () => {
    if (!selectedForm || !editFormData || isSavingForm) return;

    setIsSavingForm(true);
    const token = localStorage.getItem("auth_token");

    try {
      const response = await fetch(
        `https://aztec-interiors.onrender.com/form-submissions/${selectedForm.id}`,
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
        loadCustomerData(); // Reload data to show updated form
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

  // Add function to handle field changes
  const handleFormFieldChange = (fieldName: string, value: any) => {
    setEditFormData((prev: any) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const canEdit = (): boolean => {
    if (!customer) return false;
    
    const allowedRoles = ["Manager", "HR", "Production", "Sales"];
    return allowedRoles.includes(user?.role || "");
  };

  const canDelete = (): boolean => {
    if (!user) return false;
    
    const allowedRoles = ['Manager', 'HR', 'Sales'];
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

  const generateFormLink = async (type: "bedroom" | "kitchen") => {
    if (generating || !canEdit()) return;

    setGenerating(true);
    try {
      const response = await fetch(`https://aztec-interiors.onrender.com/customers/${id}/generate-form-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formType: type }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const params = new URLSearchParams({
            type: type,
            customerId: String(id),
            customerName: customer?.name || "",
            customerAddress: customer?.address || "",
            customerPhone: customer?.phone || "",
          });

          const fullLink = `${window.location.origin}/form/${data.token}?${params.toString()}`;
          setGeneratedLink(fullLink);
          setFormType(type);
          setShowLinkDialog(true);
        } else {
          alert(`Failed to generate ${type} form link: ${data.error}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to generate ${type} form link: ${errorData.error || "Unknown error"}`);
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

  const handleCreateQuote = () => {
    if (!canEdit()) {
      alert("You don't have permission to create quotes for this customer.");
      return;
    }
    const queryParams = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      customerEmail: customer?.email || "",
    });
    router.push(`/dashboard/quotes/create?${queryParams.toString()}`);
  };

  const handleCreateJob = () => {
    if (user?.role === "Sales") {
      alert("Sales users cannot directly create jobs. Jobs are created from accepted quotes.");
      return;
    }
    const queryParams = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      customerEmail: customer?.email || "",
    });
    router.push(`/dashboard/jobs/create?${queryParams.toString()}`);
  };

  const handleCreateChecklist = () => {
    if (!canEdit()) {
      alert("You don't have permission to create checklists for this customer.");
      return;
    }
    router.push(`/dashboard/checklists/create?customerId=${id}`);
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
      alert("Sales users cannot create remedial checklists. Please contact your manager.");
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
    router.push(`/dashboard/invoices/create?${buildCustomerQuery()}`);
  };

  const handleCreateProformaInvoice = () => {
    if (!canCreateFinancialDocs()) {
      alert("You don't have permission to create invoices.");
      return;
    }
    router.push(`/dashboard/invoices/create?type=proforma&${buildCustomerQuery()}`);
  };

  const handleCreatePaymentTerms = () => {
    if (!canCreateFinancialDocs()) {
      alert("You don't have permission to create payment terms.");
      return;
    }
    router.push(`/dashboard/payment-terms/create?${buildCustomerQuery()}`);
  };

  const handleCreateKitchenChecklist = async () => {
    if (generating || !canEdit()) return;

    setGenerating(true);
    try {
      const response = await fetch(`https://aztec-interiors.onrender.com/customers/${id}/generate-form-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formType: "kitchen" }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const params = new URLSearchParams({
            type: "kitchen",
            customerId: String(id),
            customerName: customer?.name || "",
            customerAddress: customer?.address || "",
            customerPhone: customer?.phone || "",
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
  };

  const handleCreateBedroomChecklist = async () => {
    if (generating || !canEdit()) return;

    setGenerating(true);
    try {
      const response = await fetch(`https://aztec-interiors.onrender.com/customers/${id}/generate-form-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formType: "bedroom" }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const params = new URLSearchParams({
            type: "bedroom",
            customerId: String(id),
            customerName: customer?.name || "",
            customerAddress: customer?.address || "",
            customerPhone: customer?.phone || "",
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
    // For checklists (bedroom/kitchen), open in new tab
    if (formType === "bedroom" || formType === "kitchen") {
      const viewUrl = `/checklist-view?id=${submission.id}`;
      window.open(viewUrl, "_blank");
    } else {
      // For other forms, open in dialog
      setSelectedForm(submission);
      setIsEditingForm(false);
      setShowFormDialog(true);
      setFormType(formType);
    }
  };

  const renderFormSubmission = (submission: FormSubmission) => {
    const formType = getFormType(submission);
    const isChecklist = formType === "bedroom" || formType === "kitchen";
    
    return (
      <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-4 transition hover:bg-gray-100">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900">{getFormTitle(submission)}</h3>
          <span className="text-sm text-gray-500">Submitted: {formatDate(submission.submitted_at)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewChecklist(submission)}
            className="flex items-center space-x-1"
          >
            <Eye className="h-4 w-4" />
            <span>View{isChecklist ? " Checklist" : ""}</span>  {/* ← CHANGED: Dynamic text */}
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
    const token = localStorage.getItem("auth_token");
    const headers: HeadersInit = {
      "Authorization": `Bearer ${token}`,
    };

    try {
      const response = await fetch(`https://aztec-interiors.onrender.com/projects/${projectToDelete.id}`, {
        method: "DELETE",
        headers: headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Server error" }));
        throw new Error(errorData.error || `Failed to delete project (status: ${response.status})`);
      }

      // Update UI state and reload customer data
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
      const token = localStorage.getItem("auth_token");
      if (!token) {
        alert("You must be logged in to delete form submissions");
        setIsDeleting(false);
        return;
      }

      const response = await fetch(`https://aztec-interiors.onrender.com/form-submissions/${formToDelete.id}`, {
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

  if (loading) return <div className="p-8">Loading...</div>;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-gray-200 bg-white px-8 py-6">
          <div className="flex items-center space-x-2">
            <div
              onClick={() => router.push("/dashboard/customers")}
              className="flex cursor-pointer items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900">Access Denied</h1>
          </div>
        </div>
        <div className="px-8 py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-semibold text-gray-900">No Access</h2>
          <p className="mb-6 text-gray-600">You don't have permission to view this customer's details.</p>
          <Button onClick={() => router.push("/dashboard/customers")}>Return to Customers</Button>
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
    <div className="min-h-screen bg-white">
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

      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              onClick={() => router.push("/dashboard/customers")}
              className="flex cursor-pointer items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900">Customer Details</h1>
          </div>
          <div className="flex items-center space-x-3">
            {canEdit() && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center p-2" aria-label="Create">
                    <Plus className="h-4 w-4" />
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Project Creation uses the permissive canManageProjects() */}
                  <DropdownMenuItem onClick={handleCreateProject} className="flex items-center space-x-2" disabled={!canManageProjects()}>
                    <Briefcase className="h-4 w-4" />
                    <span>New Project</span>
                  </DropdownMenuItem>

                  {user?.role !== "Sales" && (
                    <DropdownMenuItem onClick={handleCreateRemedialChecklist} className="flex items-center space-x-2">
                      <CheckSquare className="h-4 w-4" />
                      <span>Remedial Action Checklist</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleCreateChecklist} className="flex items-center space-x-2">
                    <CheckSquare className="h-4 w-4" />
                    <span>Checklist</span>
                    </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateQuote} className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Quotation</span>
                  </DropdownMenuItem>
                  {canCreateFinancialDocs() && (
                    <>
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
            {canEdit() && (
              <Button onClick={handleEdit} className="flex items-center space-x-2">
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="relative mb-8">
          <div className="mb-6 flex items-center justify-between pt-6">
            <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
            <div className="flex items-center space-x-4">
              {customer.date_of_measure && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Measure: {formatDate(customer.date_of_measure)}</span>
                </div>
              )}
            </div>
          </div>
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
                <span className="text-sm font-medium text-gray-500">Project Type (Legacy)</span>
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
                <span className="text-sm font-medium text-gray-500">Stage</span>
                <span className="mt-1 text-base text-gray-900">{customer.status || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">Customer Since</span>
                <span className="mt-1 text-base text-gray-900">{formatDate(customer.created_at)}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">Marketing Opt-in</span>
                <span className={`mt-1 text-base ${customer.marketing_opt_in ? "text-green-600" : "text-gray-600"}`}>
                  {customer.marketing_opt_in ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
          {customer.notes && !customer.notes.includes("Stage changed from") && (
            <div className="mt-6">
              <span className="text-sm font-medium text-gray-500">Notes</span>
              <div className="mt-2 rounded-lg bg-gray-50 p-3">
                <span className="text-base whitespace-pre-wrap text-gray-900">{customer.notes}</span>
              </div>
            </div>
          )}
        </div>

        {/* PROJECTS SECTION */}
        <div className="mb-8 border-t border-gray-200 pt-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Projects ({customer.projects?.length || 0})</h2>
            {canManageProjects() && (
              <Button onClick={handleCreateProject} className="flex items-center space-x-2">
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
                    className="rounded-lg border bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-6 shadow-sm transition-all duration-200 hover:shadow-md"
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
                      </div>
                      <div className="ml-4 flex flex-shrink-0 flex-col space-y-2">
                        {/* Project Edit Button now uses the permissive canManageProjects() */}
                        {canManageProjects() && (
                          <>
                            <Button
                              onClick={() => handleEditProject(project.id)}
                              variant="default"
                              size="sm"
                              className="flex items-center space-x-2"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit Project</span>
                            </Button>
                            <Button
                              onClick={(e) => { // Corrected syntax here
                                e.stopPropagation();
                                handleDeleteProject(project);
                              }}
                              variant="destructive"
                              size="sm"
                              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete</span>
                            </Button>
                          </>
                        )}
                        <Button
                          onClick={() => handleViewProjectDetails(project)}
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View Details</span>
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

        {/* DRAWINGS & LAYOUTS SECTION */}
        <div className="mb-8 border-t border-gray-200 pt-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Drawings & Layouts</h2>
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
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
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
                  const docType =
                    doc.type ||
                    (fileExtension === "pdf" ? "pdf" : ["png", "jpg", "jpeg", "gif"].includes(fileExtension) ? "image" : "other");

                  return (
                    <div
                      key={doc.id}
                      className="rounded-lg border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        {canEdit() && (
                          <Checkbox
                            checked={selectedDrawings.has(doc.id)}
                            onCheckedChange={() => handleToggleDrawingSelection(doc.id)}
                            className="mr-4 mt-1"
                          />
                        )}
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
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <Image className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">No Drawings or Layouts</h3>
              <p className="text-sm text-gray-600">Upload CADs, sketches, photos, or client documentation here.</p>
            </div>
          )}
        </div>

        {/* FORM SUBMISSIONS SECTION */}
        <div className="mb-8 border-t border-gray-200 pt-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Form Submissions</h2>
            {canEdit() && (
              <Button
                onClick={handleUploadFormDocument}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
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
                  .map((doc) => {
                    const fileExtension = doc.filename.split(".").pop()?.toLowerCase() || "other";
                    const docType = doc.type || 
                      (fileExtension === "pdf" ? "pdf" : 
                       ["xlsx", "xls", "csv"].includes(fileExtension) ? "excel" : "other");

                    return (
                      <div key={doc.id} className="rounded-lg border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                        <div className="flex items-start justify-between">
                          {canEdit() && (
                            <Checkbox
                              checked={selectedFormDocs.has(doc.id)}
                              onCheckedChange={() => handleToggleFormDocSelection(doc.id)}
                              className="mr-4 mt-1"
                            />
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
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Form Submissions */}
          {customer.form_submissions && customer.form_submissions.length > 0 ? (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Form Submissions ({customer.form_submissions.length})
              </h3>
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

        {/* JOBS SECTION */}
        <div className="mb-8 border-t border-gray-200 pt-8">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Jobs</h2>
          {jobs.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-lg border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900">{job.job_reference || `Job #${job.id}`}</h3>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStageColor(job.stage)}`}
                        >
                          {job.stage}
                        </span>
                      </div>
                      <p className="mb-1 text-sm text-gray-500">Type: {job.type}</p>
                      <p className="text-sm text-gray-500">Created: {formatDate(job.created_at)}</p>
                      {job.quote_price && (
                        <p className="mt-1 text-sm text-gray-600">Quote Price: £{job.quote_price.toFixed(2)}</p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleViewJob(job.id)}
                      variant="outline"
                      className="ml-6 flex items-center space-x-2 px-4"
                    >
                      <Briefcase className="h-4 w-4" />
                      <span>View Job</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
              <Briefcase className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">No Jobs</h3>
              <p className="mb-4">Jobs are created from accepted quotations.</p>
            </div>
          )}
        </div>

        {/* FINANCIAL DOCUMENTS SECTION */}
        <div className="border-t border-gray-200 pt-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Financial Documents</h2>
            <div className="text-sm font-medium text-gray-500">
              {financialDocs.length} document{financialDocs.length !== 1 ? "s" : ""}
            </div>
          </div>
          {financialDocs.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {financialDocs.map((doc) => renderFinancialDocument(doc))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 p-12 text-center">
              <DollarSign className="mx-auto mb-6 h-16 w-16 text-blue-400" />
              <h3 className="mb-4 text-xl font-semibold text-gray-900">No Financial Documents</h3>
              <p className="mx-auto mb-8 max-w-2xl text-gray-600">
                Create invoices, receipts, quotes, or payment terms to track this customer's financial activity.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {canCreateFinancialDocs() && (
                  <>
                    <Button onClick={handleCreateInvoice} className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Create Invoice</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCreateProformaInvoice}
                      className="flex items-center space-x-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Proforma Invoice</span>
                    </Button>
                    <Button variant="outline" onClick={handleCreateReceipt} className="flex items-center space-x-2">
                      <Receipt className="h-4 w-4" />
                      <span>Receipt</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs remain the same as in your original code */}
      {/* PROJECT DETAILS DIALOG */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center space-x-2 text-2xl font-bold">
                  <Package className="h-6 w-6 text-blue-600" />
                  <span>{selectedProject?.project_name}</span>
                </DialogTitle>
                <DialogDescription className="mt-2">
                  Detailed view of project information, forms, and documents
                </DialogDescription>
              </div>
              <div className="flex items-center space-x-2">
                {/* Edit Button inside dialog now uses canManageProjects() */}
                {canManageProjects() && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => selectedProject && handleEditProject(selectedProject.id)}
                    className="flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setShowProjectDialog(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {selectedProject && (
            <div className="mt-6 space-y-6">
              <section className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Project Overview</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <span className="text-sm text-gray-600">Project Type</span>
                    <div className="mt-1">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getProjectTypeColor(selectedProject.project_type)}`}
                      >
                        {selectedProject.project_type}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Current Stage</span>
                    <div className="mt-1">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStageColor(selectedProject.stage)}`}
                      >
                        {selectedProject.stage}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Measure Date</span>
                    <p className="mt-1 text-gray-900">{formatDate(selectedProject.date_of_measure || "")}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Created</span>
                    <p className="mt-1 text-gray-900">{formatDate(selectedProject.created_at)}</p>
                  </div>
                </div>
                {selectedProject.notes && (
                  <div className="mt-4">
                    <span className="text-sm text-gray-600">Notes</span>
                    <p className="mt-1 rounded bg-white p-3 text-gray-900">{selectedProject.notes}</p>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Forms ({projectForms.length})</h3>
                {projectForms.length > 0 ? (
                  <div className="space-y-3">
                    {projectForms.map((form) => (
                      <div
                        key={form.id}
                        className="flex items-center justify-between rounded-lg border bg-white p-4 transition hover:bg-gray-50"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">{getFormTitle(form)}</h4>
                          <p className="text-sm text-gray-500">Submitted: {formatDate(form.submitted_at)}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedForm(form);
                            setShowFormDialog(true);
                            setFormType(getFormType(form));
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 p-8 text-center">
                    <CheckSquare className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-gray-500">No forms submitted for this project yet</p>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Financial Documents ({projectDocs.length})</h3>
                {projectDocs.length > 0 ? (
                  <div className="space-y-3">
                    {projectDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-lg border bg-white p-4 transition hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="rounded bg-blue-50 p-2">{FINANCIAL_DOCUMENT_ICONS[doc.type]}</div>
                          <div>
                            <h4 className="font-medium text-gray-900">{doc.title}</h4>
                            <p className="text-sm text-gray-500">Created: {formatDate(doc.created_at)}</p>
                            {doc.total && <p className="text-sm font-medium text-blue-600">£{doc.total.toFixed(2)}</p>}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleViewFinancialDoc(doc)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 p-8 text-center">
                    <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-gray-500">No financial documents for this project yet</p>
                  </div>
                )}
              </section>
            </div>
          )}
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

      {/* FORM DIALOG - WITH EDIT FUNCTIONALITY */}
      <Dialog open={showFormDialog} onOpenChange={(open) => {
        setShowFormDialog(open);
        if (!open) {
          setIsEditingForm(false);
          setEditFormData(null);
        }
      }}>
        <DialogContent className="h-[85vh] w-[85vw] max-w-none overflow-hidden rounded-lg p-0">
          <div className="flex items-start justify-between border-b bg-white px-6 py-4">
            <div>
              <DialogTitle className="text-lg font-semibold">
                {isEditingForm ? "Edit " : ""}{selectedForm ? getFormTitle(selectedForm) : "Form Submission"}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Submitted: {selectedForm ? formatDate(selectedForm.submitted_at) : "—"}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              {isEditingForm && (
                <Button
                  onClick={handleSaveEditedForm}
                  disabled={isSavingForm}
                  className="flex items-center space-x-2"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSavingForm ? "Saving..." : "Save Changes"}</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowFormDialog(false);
                  setIsEditingForm(false);
                  setEditFormData(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="h-[calc(85vh-72px)] overflow-auto bg-gray-50 p-6">
            {selectedForm ? (
              (() => {
                let rawData: Record<string, any> = {};
                try {
                  rawData = isEditingForm && editFormData 
                    ? editFormData 
                    : (typeof selectedForm.form_data === "string"
                        ? JSON.parse(selectedForm.form_data)
                        : selectedForm.form_data || {});
                } catch {
                  rawData = selectedForm.form_data || {};
                }

                const currentFormType = getFormType(selectedForm);

                if (currentFormType === "remedial") {
                  return renderRemedialForm(rawData);
                }

                if (currentFormType === "document") {
                  return renderReceiptData(rawData);
                }

                const inferredType = (rawData.form_type || "").toString().toLowerCase().includes("bed")
                  ? "bedroom"
                  : (rawData.form_type || "").toString().toLowerCase().includes("kitchen")
                    ? "kitchen"
                    : (formType || "").toLowerCase();

                const displayed = new Set<string>();

                const keys = Object.keys(rawData).filter((k) => {
                  const low = k.toLowerCase();
                  if (
                    low.includes("customer_id") ||
                    low === "customerid" ||
                    low === "customer id" ||
                    low === "form_type" ||
                    low === "checklisttype"
                  )
                    return false;
                  if (typeof rawData[k] === "string" && isUUID(rawData[k])) return false;
                  if (rawData[k] === null || rawData[k] === undefined || rawData[k] === "") return false;

                  return true;
                });

                const customerInfoFields = ["customer_name", "customer_phone", "customer_address", "room"];
                const designFields = [
                  "fitting_style",
                  "door_color",
                  "drawer_color",
                  "end_panel_color",
                  "plinth_filler_color",
                  "cabinet_color",
                  "worktop_color",
                ];
                const termsFields = ["terms_date", "gas_electric_info", "appliance_promotion_info"];
                const signatureFields = ["signature_data", "signature_date"];
                const bedroomFields = [
                  "bedside_cabinets_type",
                  "bedside_cabinets_qty",
                  "dresser_desk",
                  "dresser_desk_details",
                  "internal_mirror",
                  "internal_mirror_details",
                  "mirror_type",
                  "mirror_qty",
                  "soffit_lights_type",
                  "soffit_lights_color",
                  "gable_lights_light_color",
                  "gable_lights_light_qty",
                  "gable_lights_profile_color",
                  "gable_lights_profile_qty",
                  "other_accessories",
                  "floor_protection",
                ];
                const kitchenFields = [
                  "worktop_features",
                  "worktop_other_details",
                  "worktop_size",
                  "under_wall_unit_lights_color",
                  "under_wall_unit_lights_profile",
                  "under_worktop_lights_color",
                  "kitchen_accessories",
                  "sink_details",
                  "tap_details",
                  "other_appliances",
                  "appliances",
                ];
                const auxiliaryFields = ["sink_tap_customer_owned", "appliances_customer_owned"];

                // NEW: EditableRow component for edit mode
                const EditableRow: React.FC<{ label: string; value: any; name: string }> = ({ label, value, name }) => {
                  if (!isEditingForm) {
                    return <Row label={label} value={value} name={name} />;
                  }

                  // Don't allow editing signature fields
                  if (name === "signature_data" || name === "signature_date") {
                    return <Row label={label} value={value} name={name} />;
                  }

                  // Render editable input
                  return (
                    <div className="grid grid-cols-1 items-start gap-4 border-b py-3 last:border-b-0 md:grid-cols-3">
                      <div className="md:col-span-1">
                        <div className="text-sm font-medium text-gray-700">{label}</div>
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          value={value || ""}
                          onChange={(e) => handleFormFieldChange(name, e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  );
                };

                const renderSection = (title: string, fields: string[], typeCondition?: string) => {
                  if (typeCondition && inferredType !== typeCondition) return null;

                  const sectionKeys = fields.filter((k) => keys.includes(k));
                  if (sectionKeys.length === 0) return null;

                  return (
                    <section>
                      <h3 className="text-md mb-3 font-semibold text-gray-900">{title}</h3>
                      <div className="rounded-lg bg-white p-4 shadow-sm">
                        {sectionKeys.map((k) => {
                          displayed.add(k);

                          if (inferredType === "kitchen") {
                            const sinkTapOwned = String(rawData.sink_tap_customer_owned).trim().toLowerCase() === "yes";
                            const appliancesOwned =
                              String(rawData.appliances_customer_owned).trim().toLowerCase() === "yes";

                            if ((k === "sink_details" || k === "tap_details") && sinkTapOwned) {
                              return <EditableRow key={k} label={humanizeLabel(k)} value="Customer Owned" name={k} />;
                            }
                            if ((k === "other_appliances" || k === "appliances") && appliancesOwned) {
                              return <EditableRow key={k} label={humanizeLabel(k)} value="Customer Owned" name={k} />;
                            }

                            if (k === "appliances" && Array.isArray(rawData[k])) {
                              const appliances = rawData[k].filter((app: any) => app.make || app.model || app.quantity || app.details || app.order_date);
                              
                              if (appliances.length === 0) {
                                return <EditableRow key={k} label={humanizeLabel(k)} value="—" name={k} />;
                              }

                              // Define standard appliance types for labeling
                              const standardAppliances = ["Oven", "Microwave", "Washing Machine", "HOB", "Extractor", "INTG Dishwasher"];

                              return (
                                <div key={k} className="grid grid-cols-1 items-start gap-4 border-b py-3 last:border-b-0 md:grid-cols-3">
                                  <div className="md:col-span-1">
                                    <div className="text-sm font-medium text-gray-700">{humanizeLabel(k)}</div>
                                  </div>
                                  <div className="md:col-span-2">
                                    <div className="space-y-3">
                                      {appliances.map((app: any, index: number) => {
                                        // Check if this is new format (make/model/quantity) or old format (details)
                                        const hasNewFormat = app.make || app.model || app.quantity;
                                        const hasOldFormat = app.details;
                                        
                                        // Get appliance label
                                        const applianceLabel = index < standardAppliances.length 
                                          ? standardAppliances[index] 
                                          : `Appliance ${index + 1}`;

                                        return (
                                          <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                            <div className="mb-2 text-sm font-semibold text-gray-800">{applianceLabel}</div>
                                            
                                            {hasNewFormat ? (
                                              <div className="space-y-2">
                                                {app.make && (
                                                  <div className="flex items-start">
                                                    <span className="w-24 text-xs font-medium text-gray-600">Make:</span>
                                                    <span className="flex-1 text-sm text-gray-900">{app.make}</span>
                                                  </div>
                                                )}
                                                {app.model && (
                                                  <div className="flex items-start">
                                                    <span className="w-24 text-xs font-medium text-gray-600">Model:</span>
                                                    <span className="flex-1 text-sm text-gray-900">{app.model}</span>
                                                  </div>
                                                )}
                                                {app.quantity && (
                                                  <div className="flex items-start">
                                                    <span className="w-24 text-xs font-medium text-gray-600">Quantity:</span>
                                                    <span className="flex-1 text-sm text-gray-900">{app.quantity}</span>
                                                  </div>
                                                )}
                                                {app.order_date && (
                                                  <div className="flex items-start">
                                                    <span className="w-24 text-xs font-medium text-gray-600">Order Date:</span>
                                                    <span className="flex-1 text-sm text-gray-900">{formatDate(app.order_date)}</span>
                                                  </div>
                                                )}
                                              </div>
                                            ) : hasOldFormat ? (
                                              <div className="space-y-2">
                                                <div className="text-sm text-gray-900">{app.details}</div>
                                                {app.order_date && (
                                                  <div className="flex items-start">
                                                    <span className="w-24 text-xs font-medium text-gray-600">Order Date:</span>
                                                    <span className="flex-1 text-sm text-gray-900">{formatDate(app.order_date)}</span>
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="text-sm text-gray-500">No details provided</div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          }

                          if (k === "signature_data" && rawData[k]) {
                            return (
                              <div
                                key={k}
                                className="grid grid-cols-1 items-start gap-4 border-b py-3 last:border-b-0 md:grid-cols-3"
                              >
                                <div className="md:col-span-1">
                                  <div className="text-sm font-medium text-gray-700">{humanizeLabel(k)}</div>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="rounded-md border bg-gray-50 p-2">
                                    <img src={rawData[k]} alt="Signature" className="max-h-40 w-full object-contain" />
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return <EditableRow key={k} label={humanizeLabel(k)} value={rawData[k]} name={k} />;
                        })}
                      </div>
                    </section>
                  );
                };

                return (
                  <div className="space-y-6">
                    {renderSection("Customer Information", customerInfoFields)}
                    {renderSection("Design Specifications", designFields)}
                    {renderSection("Bedroom Specifications", bedroomFields, "bedroom")}
                    {renderSection("Kitchen Specifications", kitchenFields, "kitchen")}
                    {renderSection("Terms & Information", termsFields)}
                    {renderSection("Customer Signature", signatureFields)}

                    {keys.filter((k) => !displayed.has(k) && !auxiliaryFields.includes(k)).length > 0 && (
                      <section>
                        <h3 className="text-md mb-3 font-semibold text-gray-900">Additional Information</h3>
                        <div className="rounded-lg bg-white p-4 shadow-sm">
                          {keys
                            .filter((k) => !displayed.has(k) && !auxiliaryFields.includes(k))
                            .map((k) => (
                              <EditableRow key={k} label={humanizeLabel(k)} value={rawData[k]} name={k} />
                            ))}
                        </div>
                      </section>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="py-8 text-center text-gray-500">
                <p>No form selected or data available.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}