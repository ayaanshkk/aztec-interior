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
  DollarSign,
  X,
  Trash2,
} from "lucide-react";

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
  form_submissions: FormSubmission[];
  project_types?: string[];
}

interface FormSubmission {
  id: number;
  token_used: string;
  submitted_at: string;
  form_data: any;
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

const formatDate = (dateString: string) => {
  if (!dateString) return "—";
  try {
    const isoLike = /^\d{4}-\d{2}-\d{2}$/;
    const date = isoLike.test(dateString)
      ? new Date(dateString + "T00:00:00")
      : new Date(dateString);
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
  const [selectedForm, setSelectedForm] = useState<FormSubmission | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formToDelete, setFormToDelete] = useState<FormSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadCustomerData();
  }, [id]);

  const loadCustomerData = () => {
    setLoading(true);

    fetch(`http://127.0.0.1:5000/customers/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch customer");
        return res.json();
      })
      .then((data) => setCustomer(data))
      .catch((err) => console.error("Error loading customer:", err));

    fetch(`http://127.0.0.1:5000/quotations?customer_id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch quotations");
        return res.json();
      })
      .then((data) => setQuotations(data))
      .catch((err) => console.error("Error loading quotations:", err));

    fetch(`http://127.0.0.1:5000/jobs?customer_id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch jobs");
        return res.json();
      })
      .then((data) => setJobs(data))
      .catch((err) => console.error("Error loading jobs:", err))
      .finally(() => setLoading(false));
  };

  const generateFormLink = async (type: "bedroom" | "kitchen") => {
    if (generating) return;

    setGenerating(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/customers/${id}/generate-form-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ formType: type }),
        }
      );

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

  const handleCreateKitchenChecklist = async () => {
    if (generating) return;

    setGenerating(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/customers/${id}/generate-form-link`,
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
    if (generating) return;

    setGenerating(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/customers/${id}/generate-form-link`,
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

  const handleDeleteForm = async () => {
    if (!formToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/form-submissions/${formToDelete.id}`,
        {
          method: "DELETE",
        }
      );

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
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      customerEmail: customer?.email || "",
    });
    router.push(`/dashboard/quotes/create?${queryParams.toString()}`);
  };

  const handleCreateJob = () => {
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
    router.push(`/dashboard/checklists/remedial?${buildCustomerQuery()}`);
  };

  const handleCreateReceipt = () => {
    const params = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      type: "receipt",
      paidAmount: "0.00",
      totalPaidToDate: "0.00",
      balanceToPay: "0.00",
      receiptDate: new Date().toISOString().split('T')[0],
      paymentMethod: "BACS",
      paymentDescription: "Payment received for your Kitchen/Bedroom Cabinetry.",
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
  };

  const handleCreateDepositReceipt = () => {
    const params = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      type: "deposit",
      paidAmount: "0.00",
      totalPaidToDate: "0.00",
      balanceToPay: "0.00",
      receiptDate: new Date().toISOString().split('T')[0],
      paymentMethod: "BACS",
      paymentDescription: "Deposit payment received for your Kitchen/Bedroom Cabinetry.",
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
  };

  const handleCreateFinalReceipt = () => {
    const params = new URLSearchParams({
      customerId: String(id),
      customerName: customer?.name || "",
      customerAddress: customer?.address || "",
      customerPhone: customer?.phone || "",
      type: "final",
      paidAmount: "0.00",
      totalPaidToDate: "0.00",
      balanceToPay: "0.00",
      receiptDate: new Date().toISOString().split('T')[0],
      paymentMethod: "BACS",
      paymentDescription: "Final payment received for your Kitchen/Bedroom Cabinetry.",
    });
    router.push(`/dashboard/checklists/receipt?${params.toString()}`);
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
        const floatValue = parseFloat(cleanStr.replace(/[^0-9.-]/g, ''));
        return isFinancial && !isNaN(floatValue) ? `£${floatValue.toFixed(2)}` : cleanStr;
      }
      
      const floatValue = parseFloat(str.replace(/[^0-9.-]/g, ''));
      return isFinancial && !isNaN(floatValue) ? `£${floatValue.toFixed(2)}` : str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    if (typeof val === "number") {
        const formatted = val.toFixed(2);
        return isFinancial ? `£${formatted}` : String(val);
    }

    if (typeof val === "boolean") return String(val);
    if (Array.isArray(val)) return val.map(v => humanizeValue(v)).join(", ");
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  };

  const getFormType = (submission: FormSubmission) => {
    let formDataRaw;
    try {
      formDataRaw =
        typeof submission.form_data === "string"
          ? JSON.parse(submission.form_data)
          : submission.form_data;
    } catch {
      formDataRaw = submission.form_data || {};
    }

    const formType = (formDataRaw?.form_type || "").toString().toLowerCase();
    
    if (formType.includes("receipt") || formType.includes("deposit") || formType.includes("final") || formType.includes("invoice") || formType.includes("proforma") || formType.includes("terms")) {
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
      formDataRaw =
        typeof submission.form_data === "string"
          ? JSON.parse(submission.form_data)
          : submission.form_data;
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
        // Clean up the form type - remove duplicate words and format properly
        const parts = formTypeRaw.split(/[-_]/);
        // Remove duplicate consecutive words (case-insensitive)
        const cleanedParts = parts.filter((word, index) => {
          if (index === 0) return true;
          return word.toLowerCase() !== parts[index - 1].toLowerCase();
        });
        return cleanedParts
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
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
        return <span className="text-sm whitespace-pre-wrap">{v.map(item => humanizeValue(item, name)).join(", ")}</span>;
      }
      if (typeof v === "object" && v !== null) {
        if (Object.keys(v).some(key => typeof v[key] !== 'string' && typeof v[key] !== 'number')) {
             return <pre className="text-sm whitespace-pre-wrap bg-white p-3 rounded">{JSON.stringify(v, null, 2)}</pre>;
        }
      }
      return <span className="text-sm">{humanizeValue(v, name)}</span>;
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 items-start border-b last:border-b-0">
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
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        return parseFloat(value.replace(/[£$,]/g, '')) || 0;
      }
      return 0;
    };

    const balanceToPay = parseAmount(formData.balance_to_pay || formData.balanceToPay || formData['Balance To Pay']);
    const amountPaid = parseAmount(formData.paid_amount || formData.amount_paid || formData.amountPaid || formData.paidAmount || formData['Paid Amount']);
    const totalPaidToDate = parseAmount(formData.total_paid_to_date || formData.totalPaidToDate || formData.total_paid || formData['Total Paid To Date']) || amountPaid;
    
    console.log("Parsed values:", { balanceToPay, amountPaid, totalPaidToDate });

    const derivedData: Record<string, any> = {
      ...formData,
      balance_to_pay: balanceToPay.toFixed(2),
      amount_paid: amountPaid.toFixed(2), 
      total_paid_to_date: totalPaidToDate.toFixed(2),
      payment_description: formData.payment_description || formData.paymentDescription || formData['Payment Description'],
      payment_method: formData.payment_method || formData.paymentMethod || formData['Payment Method'],
      document_type_display: formData.receipt_type || formData.receiptType || formData['Receipt Type'] || "Receipt",
      date_paid: formData.receipt_date || formData.date_paid || formData.receiptDate || formData['Receipt Date'],
    };

    const customFinancialFields = ["balance_to_pay", "amount_paid", "total_paid_to_date"];
    const customAdditionalFields = ["payment_description", "payment_method", "document_type_display", "date_paid"];

    const keys = Object.keys(derivedData).filter((k) => derivedData[k] !== null && derivedData[k] !== undefined && derivedData[k] !== "");

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
        receiptDate: derivedData.date_paid || new Date().toISOString().split('T')[0],
        paymentMethod: derivedData.payment_method || "BACS",
        paymentDescription: derivedData.payment_description || "Payment received for your Kitchen/Bedroom Cabinetry.",
      });
      // Updated path to match your folder structure
      router.push(`/dashboard/checklists/receipt?${params.toString()}`);
    };

    return (
      <div className="space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold text-gray-900">Financial Overview</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewReceipt}
              className="flex items-center space-x-2"
            >
              <Receipt className="h-4 w-4" />
              <span>View Receipt</span>
            </Button>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            {customFinancialFields
                .filter(k => keys.includes(k) || k === 'balance_to_pay')
                .map(k => (
                    <Row key={k} label={humanizeLabel(k)} value={derivedData[k]} name={k} />
                ))}
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold mb-3 text-gray-900">Additional Information</h3>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            {customAdditionalFields
              .filter(k => derivedData[k])
              .map(k => (
                <Row 
                    key={k} 
                    label={k === 'document_type_display' ? 'Type' : humanizeLabel(k)} 
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
          <h3 className="text-md font-semibold mb-3 text-gray-900">Customer Information</h3>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b">
              <div className="text-sm font-medium text-gray-700">Checklist Type</div>
              <div className="md:col-span-2 text-sm text-gray-900">Remedial Action</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b">
              <div className="text-sm font-medium text-gray-700">Customer Name</div>
              <div className="md:col-span-2 text-sm text-gray-900">{customerName}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b">
              <div className="text-sm font-medium text-gray-700">Phone Number</div>
              <div className="md:col-span-2 text-sm text-gray-900">{customerPhone}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b">
              <div className="text-sm font-medium text-gray-700">Address</div>
              <div className="md:col-span-2 text-sm text-gray-900">{customerAddress}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b">
              <div className="text-sm font-medium text-gray-700">Date</div>
              <div className="md:col-span-2 text-sm text-gray-900">{formatDate(formData.date)}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3">
              <div className="text-sm font-medium text-gray-700">Fitters</div>
              <div className="md:col-span-2 text-sm text-gray-900">{formData.fitters || "—"}</div>
            </div>
          </div>
        </section>

        {items.length > 0 && (
          <section>
            <h3 className="text-md font-semibold mb-3 text-gray-900">Items Required for Remedial Action</h3>
            <div className="bg-white rounded-lg p-4 shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remedial Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Colour</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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

  const renderFormSubmission = (submission: FormSubmission) => {
    return (
      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900">
            {getFormTitle(submission)}
          </h3>
          <span className="text-sm text-gray-500">
            Submitted: {formatDate(submission.submitted_at)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedForm(submission);
              setShowFormDialog(true);
              setFormType(getFormType(submission));
            }}
            className="flex items-center space-x-1"
          >
            <span>Open</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setFormToDelete(submission);
              setShowDeleteDialog(true);
            }}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!customer) return <div className="p-8">Customer not found.</div>;

  return (
    <div className="min-h-screen bg-white">
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
                <DropdownMenuItem onClick={handleCreateKitchenChecklist} className="flex items-center space-x-2" disabled={generating}>
                  <CheckSquare className="h-4 w-4" />
                  <span>Kitchen Checklist Form</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateBedroomChecklist} className="flex items-center space-x-2" disabled={generating}>
                  <CheckSquare className="h-4 w-4" />
                  <span>Bedroom Checklist Form</span>
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

      <div className="px-8 py-6">
        <div className="mb-8 relative">
          <div className="flex items-center justify-between mb-6 pt-6">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Name</span>
                <span className="text-gray-900 mt-1 text-base font-medium">{customer.name || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">
                  Phone <span className="text-red-500">*</span>
                </span>
                <span className="text-gray-900 mt-1 text-base">{customer.phone || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Email</span>
                <span className="text-gray-900 mt-1 text-base">{customer.email || "—"}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">
                  Address <span className="text-red-500">*</span>
                </span>
                <span className="text-gray-900 mt-1 text-base">{customer.address || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">
                  Postcode <span className="text-red-500">*</span>
                </span>
                <div className="mt-1">
                  {customer.postcode ? (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                        {customer.postcode}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-900 text-base">—</span>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Project Type</span>
                <div className="mt-1">
                  {customer.project_types && customer.project_types.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {customer.project_types.map((type, index) => (
                        <span
                          key={index}
                          className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                            type === "Kitchen " ? "bg-blue-100 text-blue-800" : 
                            type === "Bedroom" ? "bg-purple-100 text-purple-800" :
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-900 text-base">—</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Stage</span>
                <span className="text-gray-900 mt-1 text-base">{customer.status || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Customer Since</span>
                <span className="text-gray-900 mt-1 text-base">{formatDate(customer.created_at)}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Marketing Opt-in</span>
                <span className={`mt-1 text-base ${customer.marketing_opt_in ? "text-green-600" : "text-gray-600"}`}>
                  {customer.marketing_opt_in ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
          {customer.notes && !customer.notes.includes('Stage changed from') && (
            <div className="mt-6">
              <span className="text-sm text-gray-500 font-medium">Notes</span>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900 text-base whitespace-pre-wrap">{customer.notes}</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Form Submissions</h2>
          {customer.form_submissions && customer.form_submissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.form_submissions.map((submission) => (
                <div key={submission.id}>{renderFormSubmission(submission)}</div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 bg-gray-50 p-6 rounded-lg text-center">
              <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="mb-2">No form submissions found for this customer.</p>
              <p className="text-sm">Generate a form link or create a checklist to collect customer information.</p>
            </div>
          )}
        </div>

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
                          job.stage === "Complete" ? "bg-green-100 text-green-800" :
                          job.stage === "Production" ? "bg-blue-100 text-blue-800" :
                          job.stage === "Accepted" ? "bg-purple-100 text-purple-800" :
                          "bg-gray-100 text-gray-800"
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this form submission? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setFormToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteForm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="w-[75vw] h-[75vh] max-w-none rounded-lg p-0 overflow-hidden">
          <div className="flex items-start justify-between px-6 py-4 border-b bg-white">
            <div>
              <DialogTitle className="text-lg font-semibold">
                {selectedForm ? getFormTitle(selectedForm) : "Form Submission"}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Submitted: {selectedForm ? formatDate(selectedForm.submitted_at) : "—"}
              </DialogDescription>
            </div>
          </div>
          <div className="p-6 overflow-auto h-[calc(75vh-72px)] bg-gray-50">
            {selectedForm ? (
              (() => {
                let rawData: Record<string, any> = {};
                try {
                  rawData = typeof selectedForm.form_data === "string"
                    ? JSON.parse(selectedForm.form_data)
                    : selectedForm.form_data || {};
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

                const inferredType = (rawData.form_type || "")
                  .toString()
                  .toLowerCase()
                  .includes("bed")
                  ? "bedroom"
                  : (rawData.form_type || "").toString().toLowerCase().includes("kitchen")
                  ? "kitchen"
                  : (formType || "").toLowerCase();

                const displayed = new Set<string>();

                const keys = Object.keys(rawData).filter((k) => {
                  const low = k.toLowerCase();
                  if (low.includes("customer_id") || low === "customerid" || low === "customer id") return false;
                  if (isUUID(String(rawData[k]))) return false;
                  return true;
                });

                const customerInfoFields = ["customer_name", "customer_phone", "customer_address", "room"];
                const designFields = ["fitting_style", "door_color", "drawer_color", "end_panel_color", "plinth_filler_color", "cabinet_color", "worktop_color"];
                const termsFields = ["terms_date", "gas_electric_info", "appliance_promotion_info"];
                const signatureFields = ["signature_data", "signature_date"];
                const bedroomFields = [
                  "bedside_cabinets_type", "bedside_cabinets_qty", "dresser_desk", "dresser_desk_details",
                  "internal_mirror", "internal_mirror_details", "mirror_type", "mirror_qty",
                  "soffit_lights_type", "soffit_lights_color", "gable_lights_light_color", "gable_lights_light_qty",
                  "gable_lights_profile_color", "gable_lights_profile_qty", "other_accessories", "floor_protection"
                ];
                const kitchenFields = [
                  "worktop_features", "worktop_other_details", "worktop_size", "under_wall_unit_lights_color",
                  "under_wall_unit_lights_profile", "under_worktop_lights_color", "kitchen_accessories",
                  "sink_details", "tap_details", "other_appliances", "appliances"
                ];
                
                const auxiliaryFields = ['sink_tap_customer_owned', 'appliances_customer_owned'];
                const dateFields = ['appointment_date', 'completion_date', 'deposit_date', 'installation_date', 'survey_date'];

                return (
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-md font-semibold mb-3 text-gray-900">Customer Information</h3>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        {customerInfoFields
                          .filter(k => keys.includes(k) && (k !== "room" || inferredType === "bedroom"))
                          .map(k => {
                            displayed.add(k);
                            return <Row key={k} label={humanizeLabel(k)} value={rawData[k]} name={k} />;
                          })}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-md font-semibold mb-3 text-gray-900">Design Specifications</h3>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        {designFields
                          .filter(k => keys.includes(k) && (k !== "drawer_color" || inferredType === "kitchen"))
                          .map(k => {
                            displayed.add(k);
                            return <Row key={k} label={humanizeLabel(k)} value={rawData[k]} name={k} />;
                          })}
                      </div>
                    </section>

                    {inferredType === "bedroom" && (
                      <section>
                        <h3 className="text-md font-semibold mb-3 text-gray-900">Bedroom Specifications</h3>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          {bedroomFields
                            .filter(k => keys.includes(k))
                            .map(k => {
                              displayed.add(k);
                              return <Row key={k} label={humanizeLabel(k)} value={rawData[k]} name={k} />;
                            })}
                        </div>
                      </section>
                    )}

                    {inferredType === "kitchen" && (
                      <section>
                        <h3 className="text-md font-semibold mb-3 text-gray-900">Kitchen Specifications</h3>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          {kitchenFields
                            .filter(k => keys.includes(k))
                            .map(k => {
                              displayed.add(k);
                              
                              const sinkTapOwned = String(rawData.sink_tap_customer_owned).trim().toLowerCase();
                              
                              if (k === 'sink_details' || k === 'tap_details') {
                                if (sinkTapOwned === 'yes') {
                                  return <Row key={k} label={humanizeLabel(k)} value="Customer Owned" name={k} />;
                                } else if (String(rawData[k]).trim().toLowerCase() === 'no') {
                                  return <Row key={k} label={humanizeLabel(k)} value="No" name={k} />;
                                }
                                return <Row key={k} label={humanizeLabel(k)} value={rawData[k]} name={k} />;
                              }
                              
                              const appliancesOwned = String(rawData.appliances_customer_owned).trim().toLowerCase();
                              
                              if (k === 'other_appliances' || k === 'appliances') {
                                if (appliancesOwned === 'yes') {
                                  return <Row key={k} label={humanizeLabel(k)} value="Customer Owned" name={k} />;
                                } else if (rawData[k] && Array.isArray(rawData[k])) {
                                  const appliancesList = rawData[k]
                                    .filter((app: any) => app.details || app.order_date)
                                    .map((app: any) => {
                                      const details = app.details || 'N/A';
                                      const orderDate = app.order_date ? ` (Order Date: ${formatDate(app.order_date)})` : '';
                                      return `${details}${orderDate}`;
                                    })
                                    .join(', ');
                                  return <Row key={k} label={humanizeLabel(k)} value={appliancesList || '—'} name={k} />;
                                }
                                
                                return <Row key={k} label={humanizeLabel(k)} value={rawData[k]} name={k} />;
                              }
                              
                              return <Row key={k} label={humanizeLabel(k)} value={rawData[k]} name={k} />;
                            })}
                        </div>
                      </section>
                    )}

                    <section>
                      <h3 className="text-md font-semibold mb-3 text-gray-900">Terms & Information</h3>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        {termsFields
                          .filter(k => keys.includes(k) && (k !== "appliance_promotion_info" || inferredType === "kitchen"))
                          .map(k => {
                            displayed.add(k);
                            return <Row key={k} label={humanizeLabel(k)} value={rawData[k]} name={k} />;
                          })}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-md font-semibold mb-3 text-gray-900">Customer Signature</h3>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        {signatureFields
                          .filter(k => keys.includes(k))
                          .map(k => {
                            displayed.add(k);
                            if (k === "signature_data" && rawData[k]) {
                              return (
                                <div key={k} className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 items-start border-b last:border-b-0">
                                  <div className="md:col-span-1">
                                    <div className="text-sm font-medium text-gray-700">{humanizeLabel(k)}</div>
                                  </div>
                                  <div className="md:col-span-2">
                                    <div className="border rounded-md p-2 bg-gray-50">
                                      <img src={rawData[k]} alt="Signature" className="max-h-40 w-full object-contain" />
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return <Row key={k} label={humanizeLabel(k)} value={rawData[k]} name={k} />;
                          })}
                      </div>
                    </section>

                    {keys.filter(k => !displayed.has(k) && !auxiliaryFields.includes(k) && !dateFields.includes(k)).length > 0 && (
                      <section>
                        <h3 className="text-md font-semibold mb-3 text-gray-900">Additional Information</h3>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          {keys
                            .filter(k => {
                              const allSpecificFields = [
                                ...customerInfoFields, ...designFields, ...termsFields, 
                                ...signatureFields, ...bedroomFields, ...kitchenFields, 
                                ...auxiliaryFields, ...dateFields
                              ];

                              if (allSpecificFields.includes(k) || displayed.has(k)) return false;
                              
                              return true;
                            })
                            .map(k => {
                              displayed.add(k);
                              return <Row key={k} label={humanizeLabel(k)} value={rawData[k]} name={k} />;
                            })}
                        </div>
                      </section>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No form selected.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}