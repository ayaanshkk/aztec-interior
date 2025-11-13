"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider } from "@/components/ui/shadcn-io/kanban";
import {
  Briefcase,
  Search,
  Calendar,
  Mail,
  Check,
  MoreHorizontal,
  Eye,
  Users,
  FileText,
  DollarSign,
  Plus,
  UserPlus,
  Phone,
  MapPin,
  File,
  AlertCircle,
  Filter,
  Lock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, addDays, isWithinInterval } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchWithAuth } from "@/lib/api";
import { useRouter } from "next/navigation";

// --- START OF STAGE AND ROLE DEFINITIONS ---

const STAGES = [
  "Lead",
  "Survey",
  "Design",
  "Quote",
  "Consultation",
  "Quoted",
  "Accepted",
  "OnHold",
  "Production",
  "Delivery",
  "Installation",
  "Complete",
  "Remedial",
] as const;

type Stage = (typeof STAGES)[number];

const stageColors: Record<Stage, string> = {
  Lead: "#6B7280",
  Survey: "#EC4899",
  Design: "#10B981",
  Quote: "#3B82F6",
  Consultation: "#8B5CF6",
  Quoted: "#06B6D4",
  Accepted: "#059669",
  OnHold: "#6D28D9",
  Production: "#D97706",
  Delivery: "#0284C7",
  Installation: "#16A34A",
  Complete: "#065F46",
  Remedial: "#DC2626",
};

type UserRole = "Manager" | "HR" | "Sales" | "Production" | "Staff";

const ROLE_PERMISSIONS: Record<UserRole, any> = {
  Manager: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canViewFinancials: true,
    canDragDrop: true,
    canViewAllRecords: true, // Manager has full visibility
    canSendQuotes: true,
    canSchedule: true,
  },
  HR: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canViewFinancials: true,
    canDragDrop: true,
    canViewAllRecords: true,
    canSendQuotes: true,
    canSchedule: true,
  },
  Sales: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canViewFinancials: true,
    canDragDrop: true,
    canViewAllRecords: false,
    canSendQuotes: true,
    canSchedule: false,
  },
  Production: {
    canCreate: false,
    canEdit: true,
    canDelete: false,
    canViewFinancials: false,
    canDragDrop: true,
    canViewAllRecords: true,
    canSendQuotes: false,
    canSchedule: false,
  },
  Staff: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canViewFinancials: false,
    canDragDrop: false,
    canViewAllRecords: false,
    canSendQuotes: false,
    canSchedule: false,
  },
};

const PRODUCTION_STAGES: Stage[] = [
  "Accepted",
  "OnHold",
  "Production",
  "Delivery",
  "Installation",
  "Complete",
  "Remedial",
];

// --- END OF STAGE AND ROLE DEFINITIONS ---

// Updated types based on your backend models
type Customer = {
  id: string;
  name: string;
  address?: string | null;
  postcode?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_made: "Yes" | "No" | "Unknown";
  preferred_contact_method?: "Phone" | "Email" | "WhatsApp" | null;
  marketing_opt_in: boolean;
  date_of_measure?: string | null;
  stage: Stage;
  notes?: string | null;
  project_types?: string[] | null;
  salesperson?: string | null;
  status: string;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

// Merged Job/Project Type for clarity in pipeline data
type Job = {
  id: string;
  customer_id: string;
  job_reference?: string | null;
  job_name?: string | null; // This will hold the project_name for Project items
  job_type: "Kitchen" | "Bedroom" | "Wardrobe" | "Remedial" | "Other"; // Project type maps here
  stage: Stage;
  quote_price?: number | null;
  agreed_price?: number | null;
  sold_amount?: number | null;
  deposit1?: number | null;
  deposit2?: number | null;
  delivery_date?: string | null;
  measure_date?: string | null;
  completion_date?: string | null;
  installation_address?: string | null;
  notes?: string | null;
  salesperson_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deposit1_paid?: boolean; // Added for the pipeline item
  deposit2_paid?: boolean; // Added for the pipeline item
};

// Combined type for pipeline display
type PipelineItem = {
  id: string; // Can be customer-uuid, job-uuid, or project-uuid
  type: "customer" | "job" | "project"; // 'job' covers both real Job models and Project models for display purposes
  customer: Customer;
  job?: Job; // Job model or Project model fields mapped here
  // Display fields
  reference: string;
  name: string; // Customer name OR Customer Name - Project Name
  stage: Stage;
  jobType?: string;
  quotePrice?: number | null;
  agreedPrice?: number | null;
  soldAmount?: number | null;
  deposit1?: number | null;
  deposit2?: number | null;
  deposit1Paid?: boolean;
  deposit2Paid?: boolean;
  measureDate?: string | null;
  deliveryDate?: string | null;
  salesperson?: string | null;
};

type AuditLog = {
  audit_id: string;
  entity_type: string;
  entity_id: string;
  action: "create" | "update" | "delete";
  changed_by: string;
  changed_at: string;
  change_summary: string;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    throw new Error("No authentication token found. Please log in.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const makeColumns = () =>
  STAGES.map((name) => ({
    id: `col-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    color: stageColors[name],
  }));

const columnIdToStage = (colId: string): Stage => {
  const stage = STAGES.find((s) => `col-${s.toLowerCase().replace(/\s+/g, "-")}` === colId);
  return stage ?? "Lead";
};

const stageToColumnId = (stage: Stage) => `col-${stage.toLowerCase().replace(/\s+/g, "-")}`;

export default function EnhancedPipelinePage() {
  const router = useRouter();
  // State management
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSalesperson, setFilterSalesperson] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const { user, token, loading: authLoading } = useAuth();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    itemId: string | null;
    newStage?: Stage;
    reason?: string;
    itemType?: "customer" | "job" | "project";
  }>({
    open: false,
    itemId: null,
  });
  const prevFeaturesRef = useRef<any[]>([]);
  const columns = useMemo(() => makeColumns(), []);
  // Get user role and permissions
  const userRole = (user?.role || "Staff") as UserRole;
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS.Staff;
  // Helper function to create a standardized user ID for comparison
  const getStandardUserId = (value: string | null | undefined): string => {
    return (value || "").toLowerCase().trim();
  };
  // Helper function to check if user can access an item
  const canUserAccessItem = (item: PipelineItem): boolean => {
    const standardUserEmail = getStandardUserId(user?.email);
    const standardUserName = getStandardUserId(user?.name);

    // Managers, HR (and implicitly Admin if mapped to Manager) see everything
    if (permissions.canViewAllRecords) {
      return true;
    }

    // Sales staff visibility logic (Case-insensitive check)
    if (userRole === "Sales") {
      const standardItemSalesperson = getStandardUserId(item.salesperson);
      const standardItemCreator = getStandardUserId(item.customer.created_by);

      const isAssignedSalesperson =
        standardItemSalesperson === standardUserEmail || standardItemSalesperson === standardUserName;
      const isCreator = standardItemCreator === standardUserEmail || standardItemCreator === standardUserName;

      return isAssignedSalesperson || isCreator;
    }

    // Production staff can see items in production-relevant stages
    if (userRole === "Production") {
      return PRODUCTION_STAGES.includes(item.stage);
    }

    return false;
  };

  // Helper function to check if user can edit an item
  const canUserEditItem = (item: PipelineItem): boolean => {
    if (!permissions.canEdit) return false;

    // Managers and HR can edit everything
    if (userRole === "Manager" || userRole === "HR" || userRole === "Production") {
      return true;
    }

    // Sales staff can only edit their own records (case-insensitive check)
    if (userRole === "Sales") {
      const standardItemSalesperson = getStandardUserId(item.salesperson);
      const standardUserEmail = getStandardUserId(user?.email);
      const standardUserName = getStandardUserId(user?.name);

      return standardItemSalesperson === standardUserEmail || standardItemSalesperson === standardUserName;
    }

    return false;
  };

  // NOTE: All logic related to displaying notes has been removed from the rendering sections.

  // Function to map PipelineItem to Kanban features
  const mapPipelineToFeatures = (items: PipelineItem[]) => {
    return items.map((item) => {
      // DESTRUCTURE the customer/job objects to explicitly REMOVE the 'notes' field
      const { notes: customerNotes, ...customerWithoutNotes } = item.customer;
      // The item.job could be a Job model or a Project model (from the backend fix)
      const jobWithoutNotes = item.job ? (({ notes: jobNotes, ...rest }) => rest)(item.job) : undefined;

      // CRITICAL FIX: The name and reference MUST use the item-specific data
      const isProjectItem = item.id.startsWith("project-");
      const jobName = isProjectItem ? `${item.customer.name} - ${item.job?.job_name || "Project"}` : item.customer.name;
      const jobReference = isProjectItem
        ? item.job?.job_reference || `PROJ-${item.job?.id.slice(-4).toUpperCase()}`
        : item.job?.job_reference || `JOB-${item.job?.id.slice(-4).toUpperCase()}`;

      return {
        id: item.id,
        name: `${jobReference} — ${jobName}`, // Use the corrected, unique name
        column: stageToColumnId(item.stage),
        itemId: item.id,
        itemType: isProjectItem ? "project" : item.type, // Explicitly set 'project' type
        // PASS the new objects that DO NOT have the notes field
        customer: customerWithoutNotes,
        job: jobWithoutNotes,
        reference: jobReference,
        stage: item.stage,
        jobType: item.jobType,
        quotePrice: item.quotePrice,
        agreedPrice: item.agreedPrice,
        soldAmount: item.soldAmount,
        deposit1: item.deposit1,
        deposit2: item.deposit2,
        deposit1Paid: item.deposit1Paid,
        deposit2Paid: item.deposit2Paid,
        measureDate: item.measureDate,
        deliveryDate: item.deliveryDate,
        salesperson: item.salesperson,
      };
    });
  };

  // Fallback method to create pipeline items when using separate endpoints
  // NOTE: This logic is now likely obsolete since the combined /pipeline endpoint is fixed.
  const createPipelineItemsFromSeparateData = (customers: any[], jobs: any[]): PipelineItem[] => {
    const items: PipelineItem[] = [];
    const jobsByCustomerId = new Map<string, any[]>();

    jobs.forEach((job) => {
      if (!jobsByCustomerId.has(job.customer_id)) {
        jobsByCustomerId.set(job.customer_id, []);
      }
      jobsByCustomerId.get(job.customer_id)!.push(job);
    });

    customers.forEach((customer) => {
      const customerJobs = jobsByCustomerId.get(customer.id) || [];

      const customerStage = STAGES.includes(customer.stage) ? customer.stage : ("Lead" as Stage);

      if (customerJobs.length === 0) {
        items.push({
          id: `customer-${customer.id}`,
          type: "customer",
          customer: customer,
          reference: `CUST-${customer.id.slice(-4).toUpperCase()}`,
          name: customer.name,
          stage: customerStage,
          jobType: customer.project_types?.join(", "),
          measureDate: customer.date_of_measure,
          salesperson: customer.salesperson,
        });
      } else {
        customerJobs.forEach((job) => {
          const jobStage = STAGES.includes(job.stage) ? job.stage : ("Lead" as Stage);

          items.push({
            id: `job-${job.id}`,
            type: "job",
            customer: customer,
            job: job,
            reference: job.job_reference || `JOB-${job.id.slice(-4).toUpperCase()}`,
            name: customer.name,
            stage: jobStage,
            jobType: job.job_type,
            quotePrice: job.quote_price,
            agreedPrice: job.agreed_price,
            soldAmount: job.sold_amount,
            deposit1: job.deposit1,
            deposit2: job.deposit2,
            deposit1Paid: false,
            deposit2Paid: false,
            measureDate: job.measure_date || customer.date_of_measure,
            deliveryDate: job.delivery_date,
            salesperson: job.salesperson_name || customer.salesperson,
          });
        });
      }
    });

    return items;
  };

  // Fetch data from backend
  useEffect(() => {
    if (authLoading) {
      console.log("⏳ Auth still loading, skipping fetch...");
      return;
    }

    if (!user || !token) {
      console.warn("⚠️ No user or token available, skipping fetch.");
      setError("User not authenticated.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let pipelineItemsRetrieved: any[] = [];

        // 1. Try fetching from the combined pipeline endpoint
        try {
          const pipelineResponse = await fetchWithAuth("pipeline"); // Updated
          if (pipelineResponse.ok) {
            const rawPipelineData = await pipelineResponse.json();

            pipelineItemsRetrieved = rawPipelineData.map((item: any) => {
              const isProjectItem = item.id.startsWith("project-");

              // CRITICAL FIX: Prioritize the item's job/project stage over the customer's stage
              const primaryStage =
                item.type === "customer" ? item.customer.stage : item.job?.stage || item.customer.stage;

              const validStage = STAGES.includes(primaryStage) ? primaryStage : ("Lead" as Stage);

              const commonItem = {
                id: item.id,
                customer: item.customer,
                name: item.customer.name,
                salesperson: item.job?.salesperson_name || item.customer.salesperson,
                measureDate: item.job?.measure_date || item.customer.date_of_measure,
                stage: validStage,
              };

              if (item.type === "customer") {
                return {
                  ...commonItem,
                  type: "customer" as const,
                  reference: `CUST-${item.customer.id.slice(-4).toUpperCase()}`,
                  jobType: item.customer.project_types?.join(", "),
                };
              } else {
                const jobStage = item.job?.stage
                  ? STAGES.includes(item.job.stage)
                    ? item.job.stage
                    : "Lead"
                  : validStage;

                // CRITICAL FIX: Correctly extract name and reference for Project vs Job
                const jobReference = isProjectItem
                  ? item.job.job_reference || `PROJ-${item.job.id.slice(-4).toUpperCase()}`
                  : item.job.job_reference || `JOB-${item.job.id.slice(-4).toUpperCase()}`;

                // CRITICAL FIX: Generate unique name for Project items
                const jobName = isProjectItem ? `${item.customer.name} - ${item.job.job_name}` : item.customer.name;

                return {
                  ...commonItem,
                  type: isProjectItem ? ("project" as const) : ("job" as const), // Use 'project' type
                  job: item.job,
                  name: jobName,
                  reference: jobReference,
                  stage: jobStage as Stage,
                  jobType: item.job?.job_type,
                  quotePrice: item.job?.quote_price,
                  agreedPrice: item.job?.agreed_price,
                  soldAmount: item.job?.sold_amount,
                  deposit1: item.job?.deposit1,
                  deposit2: item.job?.deposit2,
                  deposit1Paid: item.job?.deposit1_paid || false,
                  deposit2Paid: item.job?.deposit2_paid || false,
                  deliveryDate: item.job?.delivery_date,
                  measureDate: item.job?.measure_date,
                };
              }
            });

            // Filter and set data immediately
            const filteredItems = pipelineItemsRetrieved.filter((item: PipelineItem) => canUserAccessItem(item));
            setPipelineItems(filteredItems);
            setFeatures(mapPipelineToFeatures(filteredItems));
            prevFeaturesRef.current = mapPipelineToFeatures(filteredItems);

            return;
          }
        } catch (pipelineError) {
          console.warn("Pipeline endpoint not available or failed, falling back to individual endpoints...");
        }

        // 2. Fallback (Existing old logic, kept for robustness)
        const customersResponse = await fetchWithAuth("customers"); // Updated
        if (!customersResponse.ok) {
          throw new Error(`Failed to fetch customers: ${customersResponse.statusText}`);
        }
        const customersData = await customersResponse.json();

        let jobsData: Job[] = [];
        try {
          const jobsResponse = await fetchWithAuth("jobs"); // Updated
          if (jobsResponse.ok) {
            jobsData = await jobsResponse.json();
          }
        } catch (jobsError) {
          console.log("Jobs endpoint not available, showing customers only");
        }

        const items = createPipelineItemsFromSeparateData(customersData, jobsData);

        const filteredItems = items.filter(canUserAccessItem);
        setPipelineItems(filteredItems);

        const kanbanFeatures = mapPipelineToFeatures(filteredItems);
        setFeatures(kanbanFeatures);
        prevFeaturesRef.current = kanbanFeatures;
      } catch (err) {
        console.error("Final Error fetching pipeline data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, token, user]);

 // --- FIX: Updated handleDataChange to fix the multi-stage drag-and-refresh issue ---
  const handleDataChange = async (next: any[]) => {
    if (!permissions.canDragDrop) {
      alert("You don't have permission to move items in the pipeline.");
      return;
    }

    const prev = prevFeaturesRef.current;
    const moved = next.filter((n) => {
      const p = prev.find((x) => x.id === n.id);
      return p && p.column !== n.column;
    });

    // ✅ UPDATE UI IMMEDIATELY (smooth visual feedback)
    setFeatures(next);
    prevFeaturesRef.current = next;

    if (moved.length > 0) {
      // ✅ CANCEL any pending API calls (user is still dragging)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        console.log("❌ Cancelled pending API call - user still dragging");
      }

      console.log(
        "Drag detected. Will save after user stops...",
        moved.map((item) => ({
          id: item.itemId,
          targetStage: columnIdToStage(item.column),
        })),
      );

      // Check permissions
      const unauthorizedMoves = moved.filter((item) => {
        const originalItem = pipelineItems.find((pi) => pi.id === item.itemId);
        if (!originalItem) return true;
        return !canUserEditItem(originalItem);
      });

      if (unauthorizedMoves.length > 0) {
        alert("You don't have permission to move some of these items. Reverting changes.");
        setFeatures(prev);
        prevFeaturesRef.current = prev;
        return;
      }

      // ✅ DEBOUNCE: Wait 400ms after user STOPS dragging before saving
      debounceTimerRef.current = setTimeout(async () => {
        console.log("✅ User stopped dragging. Making API call now...");
        
        try {
          const updatePromises = moved.map(async (item) => {
            const newStage = columnIdToStage(item.column);

            const isProject = item.itemId.startsWith("project-");
            const isCustomer = item.itemId.startsWith("customer-");
            const isJob = item.itemId.startsWith("job-");

            let entityId;
            let endpoint;
            let method;

            if (isJob) {
              entityId = item.itemId.replace("job-", "");
              endpoint = `jobs/${entityId}/stage`;
              method = "PATCH";
            } else if (isProject) {
              entityId = item.itemId.replace("project-", "");
              endpoint = `projects/${entityId}`;
              method = "PUT";
            } else if (isCustomer) {
              entityId = item.itemId.replace("customer-", "");
              endpoint = `customers/${entityId}/stage`;
              method = "PATCH";
            } else {
              throw new Error(`Unknown pipeline item type: ${item.itemId}`);
            }

            const originalItem = pipelineItems.find((pi) => pi.id === item.itemId);
            let bodyData: any;

            if (isProject) {
              bodyData = {
                ...originalItem?.job,
                project_name: originalItem?.job?.job_name,
                project_type: originalItem?.job?.job_type,
                stage: newStage,
                updated_by: user?.email || "current_user",
              };
            } else {
              bodyData = {
                stage: newStage,
                reason: "Moved via Kanban board",
                updated_by: user?.email || "current_user",
              };
            }

            const response = await fetchWithAuth(endpoint, {
              method: method,
              body: JSON.stringify(bodyData),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `Failed to update ${item.itemType} ${entityId}`);
            }

            const result = await response.json();

            const auditEntry: AuditLog = {
              audit_id: `audit-${Date.now()}-${item.itemId}`,
              entity_type: isCustomer ? "Customer" : isProject ? "Project" : "Job",
              entity_id: item.itemId,
              action: "update",
              changed_by: user?.email || "current_user",
              changed_at: new Date().toISOString(),
              change_summary: `Stage changed to ${newStage} via Kanban drag & drop`,
            };
            setAuditLogs((prev) => [auditEntry, ...prev.slice(0, 4)]);

            if (
              newStage === "Accepted" &&
              isJob &&
              (userRole === "Manager" || userRole === "HR" || userRole === "Sales")
            ) {
              try {
                await fetchWithAuth(`invoices`, {
                  method: "POST",
                  body: JSON.stringify({
                    jobId: entityId,
                    templateId: "default_invoice",
                  }),
                });
              } catch (e) {
                console.warn("Failed to create invoice automatically:", e);
              }
            }
            
            return result;
          });

          await Promise.all(updatePromises);

          console.log("✅ API call successful!");
          
          // Sync with server
          await refetchPipelineData();

        } catch (error) {
          console.error("❌ Failed to update stages:", error);
          setFeatures(prev);
          prevFeaturesRef.current = prev;
          alert(
            `Failed to update stage: ${error instanceof Error ? error.message : "Unknown error"}. Changes have been reverted.`,
          );
        }
      }, 400); // ✅ Wait 400ms after last drag event
    }
  };

  // --- FIX: Updated refetchPipelineData (simplified for single endpoint reliability) ---
  const refetchPipelineData = async () => {
    try {
      const pipelineResponse = await fetchWithAuth("pipeline");
      if (pipelineResponse.ok) {
        const pipelineData = await pipelineResponse.json();

        const items = pipelineData.map((item: any) => {
          const isProjectItem = item.id.startsWith("project-");

          const primaryStage = item.type === "customer" ? item.customer.stage : item.job?.stage || item.customer.stage;

          const validStage = STAGES.includes(primaryStage) ? primaryStage : ("Lead" as Stage);

          const commonItem = {
            id: item.id,
            customer: item.customer,
            name: item.customer.name,
            salesperson: item.job?.salesperson_name || item.customer.salesperson,
            measureDate: item.job?.measure_date || item.customer.date_of_measure,
            stage: validStage,
          };

          if (item.type === "customer") {
            return {
              ...commonItem,
              type: "customer" as const,
              reference: `CUST-${item.customer.id.slice(-4).toUpperCase()}`,
              jobType: item.customer.project_types?.join(", "),
            };
          } else {
            const jobStage = item.job?.stage ? (STAGES.includes(item.job.stage) ? item.job.stage : "Lead") : validStage;

            // CRITICAL FIX: Correctly extract name and reference for Project vs Job
            const jobReference = isProjectItem
              ? item.job.job_reference || `PROJ-${item.job.id.slice(-4).toUpperCase()}`
              : item.job.job_reference || `JOB-${item.job.id.slice(-4).toUpperCase()}`;

            // CRITICAL FIX: Generate unique name for Project items
            const jobName = isProjectItem ? `${item.customer.name} - ${item.job.job_name}` : item.customer.name;

            return {
              ...commonItem,
              type: isProjectItem ? ("project" as const) : ("job" as const),
              job: item.job,
              name: jobName,
              reference: jobReference,
              stage: jobStage as Stage,
              jobType: item.job.job_type,
              // Note: Quote/Agreed/Deposit fields will be null/false if it's a Project from the backend fix
              quotePrice: item.job.quote_price,
              agreedPrice: item.job.agreed_price,
              soldAmount: item.job.sold_amount,
              deposit1: item.job.deposit1,
              deposit2: item.job.deposit2,
              deposit1Paid: item.job.deposit1_paid || false,
              deposit2Paid: item.job.deposit2_paid || false,
              deliveryDate: item.job.delivery_date,
              measureDate: item.job.measure_date,
            };
          }
        });

        const filteredItems = items.filter((item: PipelineItem) => canUserAccessItem(item));
        setPipelineItems(filteredItems);

        const updatedFeatures = mapPipelineToFeatures(filteredItems);
        setFeatures(updatedFeatures);
        prevFeaturesRef.current = updatedFeatures;
      }
    } catch (pipelineError) {
      console.log("Pipeline refetch failed, using original state fallback");
    }
  };

  const filteredFeatures = useMemo(() => {
    if (loading) return [];

    return features.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSalesperson = filterSalesperson === "all" || item.salesperson === filterSalesperson;
      const matchesStage = filterStage === "all" || item.stage === filterStage;
      const matchesType = filterType === "all" || item.jobType === filterType;

      const matchesDateRange = () => {
        const today = new Date();
        const measureDate = item.measureDate ? new Date(item.measureDate) : null;
        if (filterDateRange === "today") {
          return measureDate && measureDate.toDateString() === today.toDateString();
        } else if (filterDateRange === "week") {
          return measureDate && isWithinInterval(measureDate, { start: today, end: addDays(today, 7) });
        } else if (filterDateRange === "month") {
          return measureDate && measureDate.getMonth() === today.getMonth();
        }
        return true; // "all"
      };

      return matchesSearch && matchesSalesperson && matchesStage && matchesType && matchesDateRange();
    });
  }, [features, searchTerm, filterSalesperson, filterStage, filterType, filterDateRange, loading]);

  // Derives list items from the single source of truth: pipelineItems
  const filteredListItems = useMemo(() => {
    return pipelineItems.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSalesperson = filterSalesperson === "all" || item.salesperson === filterSalesperson;
      const matchesStage = filterStage === "all" || item.stage === filterStage;
      const matchesType = filterType === "all" || item.jobType === filterType;

      const matchesDateRange = () => {
        const today = new Date();
        const measureDate = item.measureDate ? new Date(item.measureDate) : null;
        if (filterDateRange === "today") {
          return measureDate && measureDate.toDateString() === today.toDateString();
        } else if (filterDateRange === "week") {
          return measureDate && isWithinInterval(measureDate, { start: today, end: addDays(today, 7) });
        } else if (filterDateRange === "month") {
          return measureDate && measureDate.getMonth() === today.getMonth();
        }
        return true; // "all"
      };

      return matchesSearch && matchesSalesperson && matchesStage && matchesType && matchesDateRange();
    });
  }, [pipelineItems, searchTerm, filterSalesperson, filterStage, filterType, filterDateRange]);

  // KPIs calculation
  const kpis = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    const stageValues: Record<string, number> = {};
    let outstandingBalance = 0;
    let jobsDueForMeasure = 0;
    let upcomingDeliveries = 0;

    STAGES.forEach((stage) => {
      stageCounts[stage] = 0;
      stageValues[stage] = 0;
    });

    const today = new Date();
    filteredListItems.forEach((item) => {
      stageCounts[item.stage]++;
      const value = item.agreedPrice ?? item.soldAmount ?? item.quotePrice ?? 0;
      stageValues[item.stage] += value;

      // Outstanding balance: unpaid deposits (only for jobs)
      if (item.type === "job" && permissions.canViewFinancials) {
        if (item.deposit1 && !item.deposit1Paid) outstandingBalance += item.deposit1;
        if (item.deposit2 && !item.deposit2Paid) outstandingBalance += item.deposit2;
      }

      // Jobs due for measure
      if (item.measureDate) {
        const measureDate = new Date(item.measureDate);
        if (isWithinInterval(measureDate, { start: today, end: addDays(today, 7) })) {
          jobsDueForMeasure++;
        }
      }

      // Upcoming deliveries
      if (item.deliveryDate) {
        const deliveryDate = new Date(item.deliveryDate);
        if (isWithinInterval(deliveryDate, { start: today, end: addDays(today, 7) })) {
          upcomingDeliveries++;
        }
      }
    });

    return { stageCounts, stageValues, outstandingBalance, jobsDueForMeasure, upcomingDeliveries };
  }, [filteredListItems, permissions.canViewFinancials]);

  // Get unique values for filters
  const salespeople = useMemo(
    () => [...new Set(pipelineItems.map((item) => item.salesperson).filter(Boolean))],
    [pipelineItems],
  );

  const jobTypes = useMemo(
    () => [...new Set(pipelineItems.map((item) => item.jobType).filter(Boolean))],
    [pipelineItems],
  );

  // Handle stage change with audit logging
  const handleStageChange = async (
    itemId: string,
    newStage: Stage,
    reason: string,
    itemType: "customer" | "job" | "project",
  ) => {
    // Check permissions
    const item = pipelineItems.find((i) => i.id === itemId);
    if (!item || !canUserEditItem(item)) {
      alert("You don't have permission to change the stage of this item.");
      return;
    }

    try {
      const isProject = itemId.startsWith("project-");
      const isCustomer = itemId.startsWith("customer-");
      const isJob = itemId.startsWith("job-");

      let entityId;
      let endpoint;
      let method;

      if (isJob) {
        entityId = itemId.replace("job-", "");
        endpoint = `jobs/${entityId}/stage`; // Updated - relative path
        method = "PATCH";
      } else if (isProject) {
        entityId = itemId.replace("project-", "");
        endpoint = `projects/${entityId}`; // Updated - relative path
        method = "PUT";
      } else if (isCustomer) {
        entityId = itemId.replace("customer-", "");
        endpoint = `customers/${entityId}/stage`; // Updated - relative path
        method = "PATCH";
      } else {
        throw new Error(`Unknown pipeline item type: ${itemId}`);
      }

      // Retrieve original item data to send full body for PUT requests (Projects)
      const originalItem = pipelineItems.find((pi) => pi.id === itemId);
      let bodyData: any;

      if (isProject) {
        // For a Project PUT, we must send the whole object (or at least the fields the backend expects).
        // We use the last known good state from pipelineItems and only change the stage.
        bodyData = {
          project_name: originalItem?.job?.job_name,
          project_type: originalItem?.job?.job_type,
          date_of_measure: originalItem?.job?.measure_date,
          notes: originalItem?.job?.notes,
          stage: newStage, // Update the stage
          updated_by: user?.email || "current_user",
        };
      } else {
        // For PATCH (Job/Customer), only send the stage and audit details.
        bodyData = {
          stage: newStage,
          reason: reason,
          updated_by: user?.email || "current_user",
        };
      }

      const response = await fetchWithAuth(endpoint, {
        // Updated
        method: method,
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update stage for ${item.type} ${entityId}`);
      }

      await refetchPipelineData();

      // Log audit entry
      const auditEntry: AuditLog = {
        audit_id: `audit-${Date.now()}`,
        entity_type: isCustomer ? "Customer" : isProject ? "Project" : "Job",
        entity_id: itemId,
        action: "update",
        changed_by: user?.email || "current_user",
        changed_at: new Date().toISOString(),
        change_summary: `Stage changed to ${newStage}. Reason: ${reason}`,
      };
      setAuditLogs((prev) => [auditEntry, ...prev.slice(0, 4)]);

      // Trigger automation for "Accepted" stage - only for real job entities
      if (newStage === "Accepted" && isJob && permissions.canSendQuotes) {
        try {
          await fetchWithAuth(`invoices`, {
            // Updated
            method: "POST",
            body: JSON.stringify({ jobId: entityId, templateId: "default_invoice" }),
          });
        } catch (e) {
          console.warn("Failed to create invoice automatically:", e);
        }
      }
    } catch (e) {
      console.error("Failed to update stage:", e);
      alert("Failed to update stage. Please try again.");
    }
  };

  // Action handlers
  const handleOpenItem = (itemId: string, itemType: "customer" | "job" | "project") => {
    // 💡 FIX: Handle the new 'project-' prefix and route to the correct page (Job page for now, as it holds project context)
    const entityId = itemId.replace("customer-", "").replace("job-", "").replace("project-", "");

    if (itemType === "customer" || itemType === "project") {
      // Projects are usually managed through the Customer's page or a dedicated project page
      // Assuming linking back to the customer's page to view the list of projects is best for now
      // CRITICAL: We need the CUSTOMER ID for the customer page, so we look up the customer object.
      const item = pipelineItems.find((i) => i.id === itemId);
      const customerId = item?.customer.id || entityId;
      window.location.href = `/dashboard/customers/${customerId}`; // Updated to dashboard/customers
    } else {
      // Real Job
      window.location.href = `/dashboard/jobs/${entityId}`; // Updated to dashboard/jobs
    }
  };

  const handleOpenCustomer = (customerId: string) => {
    // Clean the ID just in case it has prefixes
    const cleanId = customerId.replace('customer-', '');
    
    // Use router for smooth navigation
    router.push(`/dashboard/customers/${cleanId}`);
  };

  const handleCreateJob = () => {
    if (!permissions.canCreate) {
      alert("You don't have permission to create new jobs.");
      return;
    }
    router.push("/dashboard/jobs");  // Use router.push instead
  };

  const handleCreateCustomer = () => {
    if (!permissions.canCreate) {
      alert("You don't have permission to create new customers.");
      return;
    }
    window.location.href = "/dashboard/customers/new";
  };

  const handleSendQuote = async (itemId: string) => {
    if (!permissions.canSendQuotes) {
      alert("You don't have permission to send quotes.");
      return;
    }

    try {
      const entityId = itemId.replace("job-", "").replace("customer-", "").replace("project-", "");
      await fetchWithAuth(`jobs/${entityId}/quotes`, {
        // Updated
        method: "POST",
        body: JSON.stringify({ templateId: "default_quote" }),
      });
      alert("Quote sent successfully!");
    } catch (e) {
      console.error("Failed to send quote:", e);
      alert("Failed to send quote. Please try again.");
    }
  };

  const handleSchedule = (itemId: string) => {
    if (!permissions.canSchedule) {
      alert("You don't have permission to schedule items.");
      return;
    }
    console.log("Scheduling for item:", itemId);
    // Open schedule modal or redirect
  };

  const handleViewDocuments = (itemId: string) => {
    console.log("Viewing documents for item:", itemId);
    // Open modal with inline PDF preview
  };

  const handleOpenChecklists = (itemId: string) => {
    console.log("Opening checklists for item:", itemId);
    // Redirect to checklists tab
  };

  // Count per column for Kanban headers
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of columns) map[c.id] = 0;
    for (const f of filteredFeatures) {
      map[f.column] = (map[f.column] ?? 0) + 1;
    }
    return map;
  }, [columns, filteredFeatures]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch {
      return "Invalid Date";
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg">Loading pipeline data...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6 p-6">
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

  return (
    <div className="space-y-6 overflow-x-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sales Pipeline</h1>
        <div className="flex items-center gap-2">
          {/* Show role badge */}
          <Badge variant="outline" className="text-xs">
            {userRole} View
          </Badge>

          {permissions.canCreate && (
            <Button variant="outline" size="sm" onClick={handleCreateJob}>
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Button>
          )}
        </div>
      </div>

      {/* Role-based information alerts */}
      {userRole === "Sales" && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are viewing your assigned customers and leads. Contact your manager to view or reassign other records.
          </AlertDescription>
        </Alert>
      )}

      {userRole === "Production" && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You can manage and move jobs through the pipeline. Pricing information is hidden.
          </AlertDescription>
        </Alert>
      )}

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Search className="text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, address, phone, reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <span>Filters</span>
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 space-y-2 p-2">
            <DropdownMenuLabel>Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Salesperson filter - only show for users with full visibility */}
            {permissions.canViewAllRecords && (
              <Select value={filterSalesperson} onValueChange={setFilterSalesperson}>
                <SelectTrigger>
                  <SelectValue placeholder="All Salespeople" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salespeople</SelectItem>
                  {salespeople.map((person) => (
                    <SelectItem key={person} value={person!}>
                      {person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Stage filter */}
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger>
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Job type filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All Job Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Job Types</SelectItem>
                {jobTypes.map((type) => (
                  <SelectItem key={type} value={type!}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range filter */}
            <Select value={filterDateRange} onValueChange={setFilterDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* View Toggle and Content */}
      <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        {/* Kanban View */}
        <TabsContent value="kanban" className="mt-6">
          <div className="h-[calc(100vh-300px)] min-h-[850px]">
            <div
              className="h-full overflow-x-auto overflow-y-hidden rounded-lg bg-gray-50/30"
              style={{
                maxWidth: "100%",
                width: "calc(100vw - 390px)",
              }}
            >
              <div className="flex h-full items-start gap-4 p-3" style={{ width: "max-content", minWidth: "100%" }}>
                <KanbanProvider
                  columns={columns}
                  data={filteredFeatures}
                  onDataChange={permissions.canDragDrop ? handleDataChange : undefined}
                >
                  {(column) => (
                    <div key={column.id} className="flex-shrink-0">
                      <KanbanBoard
                        id={column.id}
                        className="flex h-full w-[196px] flex-shrink-0 flex-col rounded-lg border border-gray-200 bg-white shadow-sm md:w-[224px]"
                      >
                        <KanbanHeader className="flex-shrink-0 rounded-t-lg border-b bg-gray-50/80 p-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full" />
                            <span className="text-xs font-medium">{column.name}</span>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                              {counts[column.id] ?? 0}
                            </Badge>
                          </div>
                        </KanbanHeader>

                        <KanbanCards id={column.id} className="max-h-[850px] flex-1 space-y-2 overflow-y-auto p-2">
                          {(feature: any) => {
                            const isEditable = canUserEditItem({
                              id: feature.itemId,
                              type: feature.itemType,
                              customer: feature.customer,
                              job: feature.job,
                              reference: feature.reference,
                              name: feature.customer.name,
                              stage: feature.stage,
                              jobType: feature.jobType,
                              salesperson: feature.salesperson,
                            } as PipelineItem);

                            return (
                              <KanbanCard
                                column={column.id}
                                id={feature.id}
                                key={feature.id}
                                name={feature.name}
                                className={`rounded-md border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md ${permissions.canDragDrop && isEditable ? "cursor-grab" : "cursor-not-allowed opacity-90"} p-2 ${feature.itemType === "job" ? "pb-0" : ""}`}
                              >
                                <div className="space-y-3">
                                  {/* Lock icon for non-editable items */}
                                  {!isEditable && (
                                    <div className="absolute top-1 right-1">
                                      <Lock className="h-3 w-3 text-gray-400" />
                                    </div>
                                  )}

                                  {/* Header */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1 pr-2">
                                      <p className="text-sm font-semibold break-words text-black">
                                        {feature.customer.name}
                                      </p>

                                      {/* Show reference below customer name for both types */}
                                      <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                                        <span className="truncate">{feature.reference}</span>
                                      </div>
                                    </div>

                                    <div className="flex flex-shrink-0 flex-col gap-1">
                                      {/* Render each job/project type as its own badge */}
                                      {feature.jobType &&
                                        feature.jobType.split(",").map((t: string, i: number) => (
                                          <Badge key={i} variant="outline" className="text-xs whitespace-nowrap">
                                            {t.trim()}
                                          </Badge>
                                        ))}
                                    </div>
                                  </div>

                                  {/* Contact Info - only show if available */}
                                  {(feature.customer.phone || feature.customer.email || feature.customer.address) && (
                                    <div className="text-muted-foreground space-y-1 text-xs">
                                      {feature.customer.phone && (
                                        <div className="flex items-center gap-2">
                                          <Phone className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{feature.customer.phone}</span>
                                        </div>
                                      )}
                                      {feature.customer.email && (
                                        <div className="flex items-center gap-2">
                                          <Mail className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{feature.customer.email}</span>
                                        </div>
                                      )}
                                      {feature.customer.address && (
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{feature.customer.address}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Job Details - conditional rendering based on available data and permissions */}
                                  <div className="space-y-2 text-xs">
                                    {feature.salesperson && (
                                      <div className="flex items-center gap-2">
                                        <Users className="text-muted-foreground h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{feature.salesperson}</span>
                                      </div>
                                    )}
                                    {feature.measureDate && (
                                      <div className="flex items-center gap-2">
                                        <Calendar className="text-muted-foreground h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">Measure: {formatDate(feature.measureDate)}</span>
                                      </div>
                                    )}

                                    {/* Financial information - only show if user has permission */}
                                    {permissions.canViewFinancials && (
                                      <>
                                        {feature.quotePrice && (
                                          <div className="flex items-center gap-2">
                                            <DollarSign className="text-muted-foreground h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">Quote: £{feature.quotePrice.toFixed(2)}</span>
                                          </div>
                                        )}
                                        {feature.agreedPrice && (
                                          <div className="flex items-center gap-2">
                                            <Check className="h-3 w-3 flex-shrink-0 text-green-500" />
                                            <span className="truncate">Agreed: £{feature.agreedPrice.toFixed(2)}</span>
                                          </div>
                                        )}
                                        {feature.soldAmount && (
                                          <div className="flex items-center gap-2">
                                            <Check className="h-3 w-3 flex-shrink-0 text-green-500" />
                                            <span className="truncate">Sold: £{feature.soldAmount.toFixed(2)}</span>
                                          </div>
                                        )}
                                        {feature.deposit1 && (
                                          <div className="flex items-center gap-2">
                                            <div
                                              className={`h-2 w-2 flex-shrink-0 rounded-full ${feature.deposit1Paid ? "bg-green-500" : "bg-red-500"}`}
                                            />
                                            <span className="truncate">Deposit 1: £{feature.deposit1.toFixed(2)}</span>
                                          </div>
                                        )}
                                        {feature.deposit2 && (
                                          <div className="flex items-center gap-2">
                                            <div
                                              className={`h-2 w-2 flex-shrink-0 rounded-full ${feature.deposit2Paid ? "bg-green-500" : "bg-red-500"}`}
                                            />
                                            <span className="truncate">Deposit 2: £{feature.deposit2.toFixed(2)}</span>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {feature.deliveryDate && (
                                      <div className="flex items-center gap-2">
                                        <Calendar className="text-muted-foreground h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">Delivery: {formatDate(feature.deliveryDate)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Buttons (fixed to the bottom with padding) */}
                                  <div className="flex gap-1 pt-2 pb-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 flex-1 px-1 text-xs hover:bg-gray-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenItem(feature.itemId, feature.itemType);
                                      }}
                                      title={`Open ${feature.itemType === "customer" ? "Customer" : feature.itemType === "project" ? "Project" : "Job"}`}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>

                                    {/* Only show quote action if appropriate stage and user has permission */}
                                    {permissions.canSendQuotes &&
                                      isEditable &&
                                      (feature.stage === "Quote" ||
                                        feature.stage === "Design" ||
                                        feature.stage === "Quoted") && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 flex-1 px-1 text-xs hover:bg-gray-100"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSendQuote(feature.itemId);
                                          }}
                                          title="Send Quote"
                                        >
                                          <Mail className="h-3 w-3" />
                                        </Button>
                                      )}

                                    {/* Only show schedule if user has permission */}
                                    {permissions.canSchedule &&
                                      (feature.stage === "Survey" ||
                                        feature.stage === "Installation" ||
                                        feature.stage === "Delivery") && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 flex-1 px-1 text-xs hover:bg-gray-100"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSchedule(feature.itemId);
                                          }}
                                          title="Schedule"
                                        >
                                          <Calendar className="h-3 w-3" />
                                        </Button>
                                      )}

                                    {/* Show documents for jobs/projects */}
                                    {(feature.itemType === "job" || feature.itemType === "project") && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 flex-1 px-1 text-xs hover:bg-gray-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewDocuments(feature.itemId);
                                        }}
                                        title="View Documents"
                                      >
                                        <File className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </KanbanCard>
                            );
                          }}
                        </KanbanCards>
                      </KanbanBoard>
                    </div>
                  )}
                </KanbanProvider>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* List View - updated to handle both customers and jobs */}
        <TabsContent value="list" className="mt-6">
          <div className="space-y-4">
            {/* Table Header */}
            <div className="bg-muted/50 grid grid-cols-12 gap-4 rounded-lg p-4 text-sm font-medium">
              <div>Type</div>
              <div>Reference</div>
              <div className="col-span-2">Customer</div>
              <div>Job Type</div>
              <div>Salesperson</div>
              <div>Stage</div>
              {permissions.canViewFinancials && (
                <>
                  <div>Quote Price</div>
                  <div>Sold Amount</div>
                </>
              )}
              <div>Contact Made</div>
              <div>Measure Date</div>
              <div>Actions</div>
            </div>

            {/* Table Rows */}
            {filteredListItems.map((item) => {
              const isEditable = canUserEditItem(item);

              return (
                <Card
                  key={item.id}
                  className={`p-4 transition-shadow hover:shadow-md ${!isEditable ? "opacity-90" : ""}`}
                >
                  <div className="grid grid-cols-12 items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.type === "customer" ? "secondary" : "default"} className="text-xs">
                        {item.type === "customer" ? "Customer" : item.type === "project" ? "Project" : "Job"}
                      </Badge>
                      {!isEditable && <Lock className="h-3 w-3 text-gray-400" />}
                    </div>
                    <div className="font-medium">{item.reference}</div>
                    <div className="col-span-2">
                      <button
                        className="cursor-pointer font-medium text-blue-600 hover:underline"
                        onClick={() => handleOpenCustomer(item.customer.id)}
                        title="View Customer Details"
                      >
                        {item.customer.name}
                      </button>
                      {item.customer.phone && (
                        <div className="text-muted-foreground text-xs">{item.customer.phone}</div>
                      )}
                      {item.customer.address && (
                        <div className="text-muted-foreground truncate text-xs">{item.customer.address}</div>
                      )}
                    </div>
                    <div>{item.jobType && <Badge variant="outline">{item.jobType}</Badge>}</div>
                    <div>{item.salesperson}</div>
                    <div>
                      <Badge style={{ backgroundColor: stageColors[item.stage], color: "white" }}>{item.stage}</Badge>
                    </div>
                    {permissions.canViewFinancials ? (
                      <>
                        <div>{item.quotePrice ? `£${item.quotePrice.toFixed(2)}` : "N/A"}</div>
                        <div>{item.soldAmount ? `£${item.soldAmount.toFixed(2)}` : "N/A"}</div>
                      </>
                    ) : (
                      <>
                        {/* Spacers for Production staff who can't see financials */}
                        <div className="col-span-2"></div>
                      </>
                    )}
                    <div>
                      <Badge variant={item.customer.contact_made === "Yes" ? "secondary" : "destructive"}>
                        {item.customer.contact_made}
                      </Badge>
                    </div>
                    <div>{formatDate(item.measureDate)}</div>
                    <div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* REMOVED: "Open Customer" - keeping only View Customer */}
                          <DropdownMenuItem onClick={() => handleOpenCustomer(item.customer.id)}>
                            <Users className="mr-2 h-4 w-4" />
                            View Customer
                          </DropdownMenuItem>
                          
                          {/* Conditional menu items based on permissions and stage */}
                          {permissions.canSendQuotes &&
                            isEditable &&
                            (item.stage === "Quote" || item.stage === "Design" || item.stage === "Quoted") && (
                              <DropdownMenuItem onClick={() => handleSendQuote(item.id)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Quote
                              </DropdownMenuItem>
                            )}
                          
                          {permissions.canSchedule &&
                            (item.stage === "Survey" || item.stage === "Installation" || item.stage === "Delivery") && (
                              <DropdownMenuItem onClick={() => handleSchedule(item.id)}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Schedule
                              </DropdownMenuItem>
                            )}
                          
                          {(item.type === "job" || item.type === "project") && (
                            <DropdownMenuItem onClick={() => handleViewDocuments(item.id)}>
                              <File className="mr-2 h-4 w-4" />
                              View Documents
                            </DropdownMenuItem>
                          )}
                          
                          {/* NEW: Change Stage submenu - shows all available stages */}
                          {permissions.canEdit && isEditable && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Change Stage</DropdownMenuLabel>
                              {STAGES.filter(stage => stage !== item.stage).map((stage) => {
                                // Get the stage color for visual indicator
                                const stageColor = stageColors[stage];
                                
                                return (
                                  <DropdownMenuItem
                                    key={stage}
                                    onClick={() =>
                                      setEditDialog({
                                        open: true,
                                        itemId: item.id,
                                        newStage: stage,
                                        itemType: item.type,
                                      })
                                    }
                                  >
                                    <div 
                                      className="mr-2 h-3 w-3 rounded-full" 
                                      style={{ backgroundColor: stageColor }}
                                    />
                                    Move to {stage}
                                  </DropdownMenuItem>
                                );
                              })}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {(item.customer.email || (permissions.canViewFinancials && (item.deposit1 || item.deposit2))) && (
                    <div className="text-muted-foreground mt-3 border-t pt-3 text-xs">
                      <div className="space-y-1">
                        {item.customer.email && (
                          <div>
                            <span className="font-medium">Email: </span>
                            {item.customer.email}
                          </div>
                        )}

                        {permissions.canViewFinancials && (item.deposit1 || item.deposit2) && (
                          <div className="flex gap-4">
                            {item.deposit1 && (
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-2 w-2 rounded-full ${item.deposit1Paid ? "bg-green-500" : "bg-red-500"}`}
                                />
                                <span className={item.deposit1Paid ? "text-green-600" : "text-red-600"}>
                                  Deposit 1: £{item.deposit1.toFixed(2)} ({item.deposit1Paid ? "Paid" : "Unpaid"})
                                </span>
                              </div>
                            )}
                            {item.deposit2 && (
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-2 w-2 rounded-full ${item.deposit2Paid ? "bg-green-500" : "bg-red-500"}`}
                                />
                                <span className={item.deposit2Paid ? "text-green-600" : "text-red-600"}>
                                  Deposit 2: £{item.deposit2.toFixed(2)} ({item.deposit2Paid ? "Paid" : "Unpaid"})
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Empty state */}
            {filteredListItems.length === 0 && (
              <Card className="p-8 text-center">
                <div className="text-muted-foreground">
                  <Briefcase className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <h3 className="mb-2 text-lg font-medium">No items found</h3>
                  <p>
                    {userRole === "Sales"
                      ? "You have no assigned customers or leads. Try creating one to see it appear, or check your filters."
                      : userRole === "Production"
                        ? "No jobs are currently in production stages."
                        : "Try adjusting your search criteria or filters."}
                  </p>
                  <div className="mt-4 space-x-2">
                    {permissions.canCreate && (
                      <Button variant="outline" size="sm" onClick={handleCreateCustomer}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create New Customer (Lead)
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Confirmation Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Stage Change</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to change the **{editDialog.itemType}** stage to **{editDialog.newStage}**?
            </p>
            <Input
              placeholder="Reason for change"
              value={editDialog.reason || ""}
              onChange={(e) => setEditDialog({ ...editDialog, reason: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, itemId: null })}>
              Cancel
            </Button>
            <Button
              disabled={!editDialog.reason}
              onClick={() => {
                if (editDialog.itemId && editDialog.newStage && editDialog.itemType) {
                  handleStageChange(
                    editDialog.itemId,
                    editDialog.newStage,
                    editDialog.reason || "",
                    editDialog.itemType,
                  );
                  setEditDialog({ open: false, itemId: null });
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI Summary (Removed entire block as per request) */}
    </div>
  );
}