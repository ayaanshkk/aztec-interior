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
  UserPlus,
  Phone,
  MapPin,
  File,
  AlertCircle,
  Filter,
  Lock,
  FolderOpen,
  X,
  Clock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, addDays, isWithinInterval, differenceInDays } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchWithAuth, BACKEND_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import { CreateCustomerModal } from "@/components/ui/CreateCustomerModal";

// --- START OF STAGE AND ROLE DEFINITIONS ---

const STAGES = [
  "Lead",
  "Survey",
  "Design",
  "Quote",
  "Accepted",
  "Ordered",
  "Production",
  "Delivery",
  "Installation",
  "Complete",
  "Remedial",
  "Rejected"
] as const;

type Stage = (typeof STAGES)[number];

const stageColors: Record<Stage, string> = {
  Lead: "#6B7280",
  Survey: "#EC4899",
  Design: "#10B981",
  Quote: "#3B82F6",
  Accepted: "#059669",
  Rejected: "#6D28D9",
  Ordered: "#9333EA",
  Production: "#D97706",
  Delivery: "#0284C7",
  Installation: "#16A34A",
  Complete: "#065F46",
  Remedial: "#DC2626",
};

const projectTypeColors: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  Kitchen: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-800 border-orange-300",
    text: "text-orange-900"
  },
  Bedroom: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-800 border-purple-300",
    text: "text-purple-900"
  },
  Wardrobe: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
    text: "text-blue-900"
  },
  Remedial: {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800 border-red-300",
    text: "text-red-900"
  },
  Other: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    badge: "bg-gray-100 text-gray-800 border-gray-300",
    text: "text-gray-900"
  }
};

// Helper function to get project type color
const getProjectTypeColor = (jobType: string | undefined) => {
  if (!jobType) return projectTypeColors.Other;
  
  // Handle multiple job types - use the first one for coloring
  const firstType = jobType.split(",")[0].trim();
  
  return projectTypeColors[firstType as keyof typeof projectTypeColors] || projectTypeColors.Other;
};

// Helper function to calculate days in stage
const calculateDaysInStage = (createdAt: string | null | undefined): number => {
  if (!createdAt) return 0;
  try {
    const createdDate = new Date(createdAt);
    const today = new Date();
    return differenceInDays(today, createdDate);
  } catch {
    return 0;
  }
};

type UserRole = "Platform Admin" | "Salesperson" | "Production Team" ;

const ROLE_PERMISSIONS: Record<UserRole, any> = {
  "Platform Admin": {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canViewFinancials: true,
    canDragDrop: true,
    canViewAllRecords: true,
    canSendQuotes: true,
    canSchedule: true,
  },
  Salesperson: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canViewFinancials: true,
    canDragDrop: true,
    canViewAllRecords: true,
    canSendQuotes: true,
    canSchedule: true,
  },
  "Production Team": {
    canCreate: false,
    canEdit: true,
    canDelete: false,
    canViewFinancials: false,
    canDragDrop: true,
    canViewAllRecords: true,
    canSendQuotes: false,
    canSchedule: false,
  },
};

// Updated types for new schema
type Customer = {
  id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  stage?: Stage;
  is_allocated?: boolean;
  is_cleansed?: boolean;
  created_at?: string | null;
};

type Project = {
  id: string;
  title: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
};

type Opportunity = {
  id: string;
  title: string;
  description?: string | null;
  process_stage?: string | null;
  value?: number | null;
  start_date?: string | null;
  end_date?: string | null;
};

// Combined type for pipeline display
type PipelineItem = {
  id: string; // Format: "project-{uuid}", "opportunity-{uuid}", or "client-{uuid}"
  type: "client" | "project" | "opportunity";
  customer: Customer;
  project?: Project;
  opportunity?: Opportunity;
  // Display fields
  reference: string;
  name: string;
  stage: Stage;
  jobType?: string; // Project/Opportunity type (Kitchen, Bedroom, etc.)
  project_count?: number;
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

const columnIdToStage = (colId: string): Stage => {
  const stage = STAGES.find((s) => `col-${s.toLowerCase().replace(/\s+/g, "-")}` === colId);
  return stage ?? "Lead";
};

const stageToColumnId = (stage: Stage) => `col-${stage.toLowerCase().replace(/\s+/g, "-")}`;

export default function EnhancedPipelinePage() {
  const router = useRouter();
  // State management
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const { user, token, loading: authLoading } = useAuth();
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    itemId: string | null;
    newStage?: Stage;
    reason?: string;
    itemType?: "client" | "project" | "opportunity";
  }>({
    open: false,
    itemId: null,
  });
  const prevFeaturesRef = useRef<any[]>([]);
  
  // State for Create Customer Modal
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  
  // Get user role and permissions
  const userRole = (user?.role || "Salesperson") as UserRole;
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS.Salesperson;

  // Filter visible stages/columns based on user role
  const visibleStages: Stage[] = useMemo(() => {
    if (userRole === "Production Team") {
      return ["Accepted", "Ordered", "Production", "Delivery", "Installation", "Complete", "Remedial"] as Stage[];
    }
    
    return STAGES as unknown as Stage[];
  }, [userRole]);

  const visibleColumns = useMemo(() => {
    return visibleStages.map((name) => ({
      id: `col-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      color: stageColors[name],
    }));
  }, [visibleStages]);

  // Helper function to check if user can access an item
  const canUserAccessItem = (item: PipelineItem): boolean => {
    if (!user) {
      return false;
    }
    return true;
  };

  // Helper function to check if user can edit an item
  const canUserEditItem = (item: PipelineItem): boolean => {
    if (!permissions.canEdit) return false;

    if (userRole === "Platform Admin" || userRole === "Salesperson" || userRole === "Production Team") {
      return true;
    }

    // Sales can only edit their own items
    if (userRole === "Salesperson") {
      // TODO: Add salesperson check when that field is available
      return true;
    }

    return false;
  };

  // Function to map PipelineItem to Kanban features
  const mapPipelineToFeatures = useCallback((items: PipelineItem[]) => {
    return items.map((item) => {
      const isProjectItem = item.type === "project";
      const isOpportunityItem = item.type === "opportunity";
      
      let displayName = item.customer.name;
      if (isProjectItem && item.project) {
        displayName = `${item.customer.name} - ${item.project.title}`;
      } else if (isOpportunityItem && item.opportunity) {
        displayName = `${item.customer.name} - ${item.opportunity.title}`;
      }

      return {
        id: item.id,
        name: `${item.reference} — ${displayName}`,
        column: stageToColumnId(item.stage),
        itemId: item.id,
        itemType: item.type,
        customer: item.customer,
        project: item.project,
        opportunity: item.opportunity,
        reference: item.reference,
        stage: item.stage,
        jobType: item.jobType, // Pass through the job type
        project_count: item.project_count || 0,
      };
    });
  }, []);

  // Fetch data from backend
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !token) {
      setError("User not authenticated.");
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
 
        const pipelineResponse = await fetchWithAuth("pipeline");
 
        if (!pipelineResponse.ok) {
          throw new Error(`Failed to fetch: ${pipelineResponse.status}`);
        }
 
        const rawPipelineData = await pipelineResponse.json();
        
        if (isCancelled) return;
        
        processPipelineData(rawPipelineData);
 
      } catch (err: any) {
        if (isCancelled) return;
        
        if (err.name === 'AbortError') {
          setError("Request timeout. Please refresh the page.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
 
    fetchData();
 
    return () => {
      isCancelled = true;
    };
  }, [authLoading, token, user]);

  // Extract the data processing logic into a separate function
  const processPipelineData = useCallback((rawPipelineData: any[]) => {
    requestAnimationFrame(() => {
      const pipelineItemsRetrieved = rawPipelineData
        .map((item: any) => {
          const isProjectItem = item.id.startsWith("project-");
          const isOpportunityItem = item.id.startsWith("opportunity-");
          const isClientItem = item.id.startsWith("client-");
          
          const backendStage = item.stage?.trim() || "Lead";
          const validStage = STAGES.includes(backendStage as Stage) ? backendStage : "Lead" as Stage;

          // Generate reference based on type
          let reference = "";
          let jobType = undefined;
          
          if (isProjectItem) {
            const projectId = String(item.project?.id || '').slice(-4).toUpperCase();
            reference = `PROJ-${projectId}`;
            // Extract project type from project data
            jobType = item.project?.project_type || item.project?.type;
          } else if (isOpportunityItem) {
            const oppId = String(item.opportunity?.id || '').slice(-4).toUpperCase();
            reference = `OPP-${oppId}`;
            // Extract opportunity type if available
            jobType = item.opportunity?.opportunity_type || item.opportunity?.type;
          } else {
            const clientId = String(item.customer?.id || '').slice(-4).toUpperCase();
            reference = `CLIENT-${clientId}`;
            // ✅ For pure clients, extract from customer.project_types array
            if (item.customer?.project_types && Array.isArray(item.customer.project_types) && item.customer.project_types.length > 0) {
              jobType = item.customer.project_types.join(", ");
            }
          }

          const commonItem = {
            id: item.id,
            customer: item.customer,
            stage: validStage,
            reference,
            jobType,
          };

          if (isProjectItem && item.project) {
            return {
              ...commonItem,
              type: "project" as const,
              project: item.project,
              name: `${item.customer.name} - ${item.project.title}`,
            };
          } else if (isOpportunityItem && item.opportunity) {
            return {
              ...commonItem,
              type: "opportunity" as const,
              opportunity: item.opportunity,
              name: `${item.customer.name} - ${item.opportunity.title}`,
            };
          } else {
            return {
              ...commonItem,
              type: "client" as const,
              name: item.customer.name,
              project_count: item.project_count || 0,
            };
          }
        })
        .filter(Boolean);

      const filteredItems = pipelineItemsRetrieved.filter((item: PipelineItem) => canUserAccessItem(item));
      
      setPipelineItems(filteredItems);
      
      const mappedFeatures = mapPipelineToFeatures(filteredItems);
      setFeatures(mappedFeatures);
      prevFeaturesRef.current = mappedFeatures;
    });
  }, [mapPipelineToFeatures]);

  const handleDataChange = async (next: any[]) => {
    console.log("=".repeat(60));
    console.log("🎯 DRAG DETECTED - Starting handleDataChange");
    console.log("📊 Received next array:", next.length, "items");
    
    if (!permissions.canDragDrop) {
      console.warn("⛔ User doesn't have drag permission");
      alert("You don't have permission to move items in the pipeline.");
      return;
    }

    const prev = prevFeaturesRef.current;
    console.log("📊 Previous array:", prev.length, "items");
    
    // Add detailed comparison logging
    const moved = next.filter((n) => {
      const p = prev.find((x) => x.id === n.id);
      if (!p) {
        console.log(`⚠️ Item ${n.id} not found in previous state`);
        return false;
      }
      const hasMoved = p.column !== n.column;
      if (hasMoved) {
        console.log(`✅ MOVED: ${n.id} from "${p.column}" to "${n.column}"`);
      } else {
        console.log(`⏭️ SAME: ${n.id} stayed in "${n.column}"`);
      }
      return hasMoved;
    });
    
    console.log("📊 Total items that moved:", moved.length);
    
    if (moved.length === 0) {
      console.log("⚠️ No items detected as moved - exiting");
      console.log("💡 This might be a reorder within the same column");
      return;
    }

    console.log("🎯 Moved items details:");
    moved.forEach(item => {
      const newStage = columnIdToStage(item.column);
      console.log(`  - ${item.name}: ${item.column} → Stage: ${newStage}`);
    });

    // Create stage updates map
    const stageUpdates = new Map(
      moved.map((item) => [item.itemId, columnIdToStage(item.column)]),
    );

    // Check for unauthorized moves
    const unauthorizedMoves = moved.filter((item) => {
      const originalItem = pipelineItems.find((pi) => pi.id === item.itemId);
      if (!originalItem) return true;
      return !canUserEditItem(originalItem);
    });

    if (unauthorizedMoves.length > 0) {
      console.error("❌ Unauthorized moves detected:", unauthorizedMoves);
      alert("You don't have permission to move some of these items. Reverting changes.");
      return;
    }

    // Take snapshots for potential rollback
    const previousFeaturesSnapshot = prevFeaturesRef.current;
    const previousPipelineSnapshot = pipelineItems;
    console.log("📸 Snapshots taken for rollback");

    // Optimistically update UI
    console.log("🎨 Applying optimistic UI updates...");
    const movedIds = new Set(moved.map((item) => item.id));
    const nextById = new Map(next.map((item) => [item.id, item]));

    const optimisticallyUpdatedFeatures = features.map((feature) => {
      if (!movedIds.has(feature.id)) {
        return feature;
      }

      const nextFeature = nextById.get(feature.id);
      const nextColumn = nextFeature?.column ?? feature.column;
      const nextStage = stageUpdates.get(feature.itemId) ?? feature.stage;

      return {
        ...feature,
        column: nextColumn,
        stage: nextStage,
      };
    });

    setFeatures(optimisticallyUpdatedFeatures);
    prevFeaturesRef.current = optimisticallyUpdatedFeatures;

    setPipelineItems((current) =>
      current.map((item) => {
        const newStage = stageUpdates.get(item.id);
        if (!newStage) {
          return item;
        }
        return {
          ...item,
          stage: newStage,
        };
      }),
    );

    console.log("✅ Optimistic UI updates applied");
    console.log("📤 Starting API calls...");

    try {
      const updatePromises = moved.map(async (item) => {
        const newStage = columnIdToStage(item.column);
        
        console.log(`📡 Processing item:`, {
          itemId: item.itemId,
          itemType: item.itemType,
          column: item.column,
          newStage
        });
        
        const isProject = item.itemId.startsWith("project-");
        const isOpportunity = item.itemId.startsWith("opportunity-");
        const isClient = item.itemId.startsWith("client-");

        let entityId;
        let endpoint;

        if (isProject) {
          entityId = item.itemId.replace("project-", "");
          endpoint = `projects/${entityId}/stage`;
        } else if (isOpportunity) {
          entityId = item.itemId.replace("opportunity-", "");
          endpoint = `opportunities/${entityId}/stage`;
        } else if (isClient) {
          entityId = item.itemId.replace("client-", "");
          endpoint = `clients/${entityId}/stage`;
        } else {
          throw new Error(`Unknown pipeline item type: ${item.itemId}`);
        }

        console.log(`📡 API Call:`, {
          endpoint,
          method: 'PATCH',
          stage: newStage
        });

        const bodyData = {
          stage: newStage,
          reason: "Moved via Kanban board",
          updated_by: user?.email || "current_user",
        };

        const response = await fetchWithAuth(endpoint, {
          method: "PATCH",
          body: JSON.stringify(bodyData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API Error:`, {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          throw new Error(`Failed to update ${item.itemType} ${entityId}: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log(`✅ Successfully updated ${item.itemId}`);
        return result;
      });

      await Promise.all(updatePromises);
      
      console.log("✅ Stage updates completed");

    } catch (error) {
      console.error("❌ Error updating stages:", error);
      
      // Only revert on error
      setFeatures(previousFeaturesSnapshot);
      prevFeaturesRef.current = previousFeaturesSnapshot;
      setPipelineItems(previousPipelineSnapshot);
      
      alert(`Failed to update stage. Changes reverted.`);
    }
  };

  const refetchPipelineData = async () => {
    try {
      const pipelineResponse = await fetchWithAuth("pipeline");
      if (pipelineResponse.ok) {
        const pipelineData = await pipelineResponse.json();
        processPipelineData(pipelineData);
      }
    } catch (pipelineError) {
      console.log("Pipeline refetch failed, using last known state.");
    }
  };

  const filteredFeatures = useMemo(() => {
    if (loading) return [];

    return features.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStage = filterStage === "all" || item.stage === filterStage;
      const isVisibleStage = visibleStages.includes(item.stage as Stage);

      const matchesType = filterType === "all" || item.itemType === filterType;

      const matchesVisibility = visibleStages.includes(item.stage as Stage); 

      return matchesSearch && matchesStage && matchesType && matchesVisibility;
    });
  }, [features, searchTerm, filterStage, filterType, loading, visibleStages]);

  const filteredListItems = useMemo(() => {
    return pipelineItems.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStage = filterStage === "all" || item.stage === filterStage;
      const matchesType = filterType === "all" || item.type === filterType;
      
      const isVisibleStage = visibleStages.includes(item.stage as Stage);
      const matchesVisibility = isVisibleStage;

      return matchesSearch && matchesStage && matchesType && matchesVisibility;
    });
  }, [pipelineItems, searchTerm, filterStage, filterType, visibleStages]);

  const itemTypes = useMemo(
    () => ["client", "project", "opportunity"],
    [],
  );

  // Quick stage change handler
  const handleQuickStageChange = async (
    itemId: string,
    newStage: Stage,
    itemType: "client" | "project" | "opportunity"
  ) => {
    const item = pipelineItems.find((i) => i.id === itemId);
    if (!item || !canUserEditItem(item)) {
      alert("You don't have permission to change the stage of this item.");
      return;
    }

    try {
      const isProject = itemId.startsWith("project-");
      const isOpportunity = itemId.startsWith("opportunity-");
      const isClient = itemId.startsWith("client-");

      let entityId;
      let endpoint;

      if (isProject) {
        entityId = itemId.replace("project-", "");
        endpoint = `projects/${entityId}/stage`;
      } else if (isOpportunity) {
        entityId = itemId.replace("opportunity-", "");
        endpoint = `opportunities/${entityId}/stage`;
      } else if (isClient) {
        entityId = itemId.replace("client-", "");
        endpoint = `clients/${entityId}/stage`;
      } else {
        throw new Error(`Unknown pipeline item type: ${itemId}`);
      }

      const bodyData = {
        stage: newStage,
        reason: "Rejected via quick button on Kanban board",
        updated_by: user?.email || "current_user",
      };

      const response = await fetchWithAuth(endpoint, {
        method: "PATCH",
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update stage`);
      }

      await refetchPipelineData();

    } catch (e) {
      console.error("Failed to quick change stage:", e);
      alert("Failed to move to Rejected. Please try again.");
    }
  };

  // Handle stage change with audit logging
  const handleStageChange = async (
    itemId: string,
    newStage: Stage,
    reason: string,
    itemType: "client" | "project" | "opportunity",
  ) => {
    const item = pipelineItems.find((i) => i.id === itemId);
    if (!item || !canUserEditItem(item)) {
      alert("You don't have permission to change the stage of this item.");
      return;
    }

    try {
      const isProject = itemId.startsWith("project-");
      const isOpportunity = itemId.startsWith("opportunity-");
      const isClient = itemId.startsWith("client-");

      let entityId;
      let endpoint;

      if (isProject) {
        entityId = itemId.replace("project-", "");
        endpoint = `projects/${entityId}/stage`;
      } else if (isOpportunity) {
        entityId = itemId.replace("opportunity-", "");
        endpoint = `opportunities/${entityId}/stage`;
      } else if (isClient) {
        entityId = itemId.replace("client-", "");
        endpoint = `clients/${entityId}/stage`;
      } else {
        throw new Error(`Unknown pipeline item type: ${itemId}`);
      }

      const bodyData = {
        stage: newStage,
        reason: reason,
        updated_by: user?.email || "current_user",
      };

      const response = await fetchWithAuth(endpoint, {
        method: "PATCH",
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
        entity_type: isClient ? "Client" : isProject ? "Project" : "Opportunity",
        entity_id: itemId,
        action: "update",
        changed_by: user?.email || "current_user",
        changed_at: new Date().toISOString(),
        change_summary: `Stage changed to ${newStage}. Reason: ${reason}`,
      };
      setAuditLogs((prev) => [auditEntry, ...prev.slice(0, 4)]);

    } catch (e) {
      console.error("Failed to update stage:", e);
      alert("Failed to update stage. Please try again.");
    }
  };

  // Action handlers
  const handleOpenItem = (itemId: string, itemType: "client" | "project" | "opportunity") => {
    const item = pipelineItems.find((i) => i.id === itemId);
    
    if (!item) {
      console.error("Item not found:", itemId);
      return;
    }

    let url = '';
    
    if (itemType === "client") {
      url = `/dashboard/clients/${item.customer.id}`;
    } else if (itemType === "project") {
      const projectId = itemId.replace("project-", "");
      url = `/dashboard/projects/${projectId}`;
    } else if (itemType === "opportunity") {
      const opportunityId = itemId.replace("opportunity-", "");
      url = `/dashboard/opportunities/${opportunityId}`;
    }
    
    window.open(url, '_blank');
  };

  const handleOpenCustomer = (customerId: string) => {
    const cleanId = customerId.replace('client-', '');
    router.push(`/dashboard/clients/${cleanId}`);
  };

  const handleCreateCustomer = () => {
    if (!permissions.canCreate) {
      alert("You don't have permission to create new customers.");
      return;
    }
    window.location.href = "/dashboard/clients/new";
  };

  // Count per column for Kanban headers
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of visibleColumns) map[c.id] = 0;
    for (const f of filteredFeatures) {
      map[f.column] = (map[f.column] ?? 0) + 1;
    }
    return map;
  }, [visibleColumns, filteredFeatures]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch {
      return "Invalid Date";
    }
  };

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="flex gap-4">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-[300px] flex-shrink-0 space-y-3">
              <div className="h-12 bg-gray-200 rounded animate-pulse" />
              <div className="h-32 bg-gray-100 rounded animate-pulse" />
              <div className="h-32 bg-gray-100 rounded animate-pulse" />
              <div className="h-32 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
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
          <Badge variant="outline" className="text-xs">
            {userRole} View (All Records)
          </Badge>

          {permissions.canCreate && (
            <Button variant="outline" size="sm" onClick={() => setIsCreateCustomerModalOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              New Client
            </Button>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Search className="text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, phone, email, reference..."
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

            {/* Stage filter */}
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger>
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {visibleStages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
                <SelectItem value="project">Projects</SelectItem>
                <SelectItem value="opportunity">Opportunities</SelectItem>
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
          <div className="h-[calc(100vh-280px)]">
            <div
              className="h-full overflow-x-auto overflow-y-hidden rounded-lg bg-gray-50/30"
              style={{
                maxWidth: "100%",
                width: "calc(100vw - 390px)",
              }}
            >
              <div className="flex h-full items-start gap-4 p-3" style={{ width: "max-content", minWidth: "100%" }}>
                <KanbanProvider
                  columns={visibleColumns} 
                  data={filteredFeatures}
                  onDataChange={handleDataChange}
                >
                  {(column) => (
                    <div key={column.id} className="flex-shrink-0">
                      <KanbanBoard
                        id={column.id}
                        className="flex h-full w-[300px] flex-shrink-0 flex-col rounded-lg border border-gray-200 bg-white shadow-sm md:w-[300px]"
                      >
                        <div className="flex h-full flex-col">
                          <KanbanHeader className="flex-shrink-0 rounded-t-lg border-b bg-white p-2.5 sticky top-0 z-10 shadow-sm">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
                              <span className="text-xs font-medium">{column.name}</span>
                              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                {counts[column.id] ?? 0}
                              </Badge>
                            </div>
                          </KanbanHeader>

                          <KanbanCards id={column.id} className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                            {(feature: any) => {
                              const isEditable = canUserEditItem({
                                id: feature.itemId,
                                type: feature.itemType,
                                customer: feature.customer,
                                project: feature.project,
                                opportunity: feature.opportunity,
                                reference: feature.reference,
                                name: feature.customer.name,
                                stage: feature.stage,
                              } as PipelineItem);

                              const daysInStage = calculateDaysInStage(feature.customer.created_at);

                              return (
                                <KanbanCard
                                  column={column.id}
                                  id={feature.id}
                                  key={feature.id}
                                  name={feature.name}
                                  className={`rounded-md border-2 ${getProjectTypeColor(feature.jobType).border} ${getProjectTypeColor(feature.jobType).bg} shadow-sm transition-all hover:shadow-md ${permissions.canDragDrop && isEditable ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-90"} p-3 overflow-hidden relative min-h-fit`}
                                  style={{ maxWidth: '100%', wordBreak: 'break-word' }}
                                >
                                  <div className="space-y-2.5">
                                    {!isEditable && (
                                      <div className="absolute top-2 right-2">
                                        <Lock className="h-3 w-3 text-gray-400" />
                                      </div>
                                    )}

                                    {/* Room Type Badge (if available) - AT THE TOP */}
                                    {feature.jobType && (
                                      <div className="flex flex-wrap gap-1.5 mb-1">
                                        {feature.jobType.split(",").map((type: string, i: number) => {
                                          const typeColor = getProjectTypeColor(type.trim());
                                          return (
                                            <Badge 
                                              key={i} 
                                              className={`text-xs font-semibold ${typeColor.badge} border`}
                                            >
                                              {type.trim()}
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Customer/Client Name */}
                                    <div className="pr-6">
                                      <h3 className={`text-base font-bold leading-tight ${getProjectTypeColor(feature.jobType).text}`}>
                                        {feature.customer.name}
                                      </h3>
                                      
                                      {/* Reference */}
                                      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                                        <span className="font-medium">{feature.reference}</span>
                                      </div>

                                      {/* Date Added and Days in Stage */}
                                      {feature.customer.created_at && (
                                        <div className="mt-1.5 space-y-0.5">
                                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <Calendar className="h-3 w-3 flex-shrink-0" />
                                            <span>Added: {formatDate(feature.customer.created_at)}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 text-xs">
                                            <Clock className="h-3 w-3 flex-shrink-0 text-orange-500" />
                                            <span className="font-medium text-orange-600">
                                              {daysInStage} {daysInStage === 1 ? 'day' : 'days'} in {feature.stage}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Project/Opportunity Title */}
                                    {feature.itemType === "project" && feature.project && (
                                      <div className={`text-sm font-semibold ${getProjectTypeColor(feature.jobType).text} flex items-center gap-1.5`}>
                                        <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{feature.project.title}</span>
                                      </div>
                                    )}

                                    {feature.itemType === "opportunity" && feature.opportunity && (
                                      <div className={`text-sm font-semibold ${getProjectTypeColor(feature.jobType).text} flex items-center gap-1.5`}>
                                        <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{feature.opportunity.title}</span>
                                      </div>
                                    )}

                                    {/* Project Count for clients */}
                                    {feature.itemType === "client" && feature.project_count > 0 && (
                                      <div className="flex items-center gap-1">
                                        <Badge variant="secondary" className="text-xs px-2 py-0.5 flex items-center gap-1 bg-white/80 border border-gray-300">
                                          <FolderOpen className="h-3 w-3" />
                                          <span>{feature.project_count} project{feature.project_count > 1 ? 's' : ''}</span>
                                        </Badge>
                                      </div>
                                    )}

                                    {/* Contact Info */}
                                    {(feature.customer.phone || feature.customer.email) && (
                                      <div className="space-y-1 text-xs text-gray-600">
                                        {feature.customer.phone && (
                                          <div className="flex items-center gap-2">
                                            <Phone className="h-3 w-3 flex-shrink-0 text-gray-500" />
                                            <span className="truncate">{feature.customer.phone}</span>
                                          </div>
                                        )}
                                        {feature.customer.email && (
                                          <div className="flex items-center gap-2">
                                            <Mail className="h-3 w-3 flex-shrink-0 text-gray-500" />
                                            <span className="truncate">{feature.customer.email}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-1 pt-2">
                                      {isEditable && feature.stage !== "Rejected" && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 flex-1 px-1 text-xs hover:bg-red-100 text-red-600 bg-white/50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickStageChange(feature.itemId, "Rejected", feature.itemType);
                                          }}
                                          title="Move to Rejected"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                      
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 flex-1 px-1 text-xs hover:bg-gray-200 bg-white/50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenItem(feature.itemId, feature.itemType);
                                        }}
                                        title={`Open ${feature.itemType}`}
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </KanbanCard>
                              );
                            }}
                          </KanbanCards>
                        </div>
                      </KanbanBoard>
                    </div>
                  )}
                </KanbanProvider>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="mt-6">
          <div className="space-y-4">
            {/* Table Header */}
            <div className="bg-muted/50 grid grid-cols-12 gap-4 rounded-lg p-4 text-sm font-medium">
              <div>Type</div>
              <div>Reference</div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Contact</div>
              <div>Stage</div>
              <div className="col-span-2">Dates</div>
              <div>Actions</div>
            </div>

            {/* Table Rows */}
            {filteredListItems.map((item) => {
              const isEditable = canUserEditItem(item);
              const daysInStage = calculateDaysInStage(item.customer.created_at);

              return (
                <Card
                  key={item.id}
                  className={`p-4 transition-shadow hover:shadow-md ${!isEditable ? "opacity-90" : ""}`}
                >
                  <div className="grid grid-cols-12 items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.type === "client" ? "secondary" : "default"} className="text-xs">
                        {item.type === "client" ? "Client" : item.type === "project" ? "Project" : "Opportunity"}
                      </Badge>
                      {!isEditable && <Lock className="h-3 w-3 text-gray-400" />}
                    </div>
                    <div className="font-medium">{item.reference}</div>
                    <div className="col-span-3">
                      <button
                        className="cursor-pointer font-medium text-blue-600 hover:underline text-left"
                        onClick={() => handleOpenCustomer(item.customer.id)}
                        title="View Client Details"
                      >
                        {item.name}
                      </button>
                      {item.type === "client" && item.project_count && item.project_count > 0 && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.project_count} project{item.project_count > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      {item.customer.phone && (
                        <div className="text-xs text-gray-600">{item.customer.phone}</div>
                      )}
                      {item.customer.email && (
                        <div className="text-xs text-gray-500 truncate">{item.customer.email}</div>
                      )}
                    </div>
                    <div>
                      <Badge style={{ backgroundColor: stageColors[item.stage], color: "white" }}>{item.stage}</Badge>
                    </div>
                    <div className="col-span-2">
                      {item.customer.created_at && (
                        <>
                          <div className="text-xs text-gray-600">
                            Added: {formatDate(item.customer.created_at)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-orange-600 mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span className="font-medium">{daysInStage}d in stage</span>
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenItem(item.id, item.type)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View {item.type === "client" ? "Client" : item.type === "project" ? "Project" : "Opportunity"}
                          </DropdownMenuItem>
                          
                          {permissions.canEdit && isEditable && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Change Stage</DropdownMenuLabel>
                              {visibleStages.filter(stage => stage !== item.stage).map((stage) => {
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
                    Try creating a new client or adjusting your filters.
                  </p>
                  <div className="mt-4 space-x-2">
                    {permissions.canCreate && (
                      <Button variant="outline" size="sm" onClick={handleCreateCustomer}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create New Client
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

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={isCreateCustomerModalOpen}
        onClose={() => setIsCreateCustomerModalOpen(false)}
        onCustomerCreated={async () => {
          await refetchPipelineData();
        }}
      />
    </div>
  );
}