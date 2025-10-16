"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
    KanbanBoard,
    KanbanCard,
    KanbanCards,
    KanbanHeader,
    KanbanProvider,
} from "@/components/ui/shadcn-io/kanban";
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
        canEdit: false,
        canDelete: false,
        canViewFinancials: false, 
        canDragDrop: false, 
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

const PRODUCTION_STAGES: Stage[] = ["Accepted", "OnHold", "Production", "Delivery", "Installation", "Complete", "Remedial"];

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

type Job = {
    id: string;
    customer_id: string;
    job_reference?: string | null;
    job_name?: string | null;
    job_type: "Kitchen" | "Bedroom" | "Wardrobe" | "Remedial" | "Other";
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
};

// Combined type for pipeline display
type PipelineItem = {
    id: string;
    type: 'customer' | 'job';
    customer: Customer;
    job?: Job;
    // Display fields
    reference: string;
    name: string;
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
    const [editDialog, setEditDialog] = useState<{
        open: boolean;
        itemId: string | null;
        newStage?: Stage;
        reason?: string;
        itemType?: 'customer' | 'job';
    }>({
        open: false,
        itemId: null,
    });
    const prevFeaturesRef = useRef<any[]>([]);

    const columns = useMemo(() => makeColumns(), []);
    const { user } = useAuth();
    
    // Get user role and permissions
    const userRole = (user?.role || "Staff") as UserRole;
    const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS.Staff;
    
    // Helper function to create a standardized user ID for comparison
    const getStandardUserId = (value: string | null | undefined): string => {
        return (value || '').toLowerCase().trim();
    }

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

            const isAssignedSalesperson = standardItemSalesperson === standardUserEmail || standardItemSalesperson === standardUserName;
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
        if (userRole === "Manager" || userRole === "HR") {
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
            const jobWithoutNotes = item.job ? (({ notes: jobNotes, ...rest }) => rest)(item.job) : undefined;

            return {
                id: item.id,
                name: `${item.reference} — ${item.name}`,
                column: stageToColumnId(item.stage),
                itemId: item.id,
                itemType: item.type,
                // PASS the new objects that DO NOT have the notes field
                customer: customerWithoutNotes,
                job: jobWithoutNotes,
                reference: item.reference,
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
    }


    // Fallback method to create pipeline items when using separate endpoints
    const createPipelineItemsFromSeparateData = (customers: any[], jobs: any[]): PipelineItem[] => {
        const items: PipelineItem[] = [];
        const jobsByCustomerId = new Map<string, any[]>();

        jobs.forEach(job => {
            if (!jobsByCustomerId.has(job.customer_id)) {
                jobsByCustomerId.set(job.customer_id, []);
            }
            jobsByCustomerId.get(job.customer_id)!.push(job);
        });

        customers.forEach(customer => {
            const customerJobs = jobsByCustomerId.get(customer.id) || [];
            
            const customerStage = STAGES.includes(customer.stage) ? customer.stage : 'Lead' as Stage;

            if (customerJobs.length === 0) {
                items.push({
                    id: `customer-${customer.id}`,
                    type: 'customer',
                    customer: customer,
                    reference: `CUST-${customer.id.slice(-4).toUpperCase()}`,
                    name: customer.name,
                    stage: customerStage, 
                    jobType: customer.project_types?.join(', '),
                    measureDate: customer.date_of_measure,
                    salesperson: customer.salesperson,
                });
            } else {
                customerJobs.forEach(job => {
                    const jobStage = STAGES.includes(job.stage) ? job.stage : 'Lead' as Stage;

                    items.push({
                        id: `job-${job.id}`,
                        type: 'job',
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
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                let customersData: Customer[] = [];
                let jobsData: Job[] = [];
                let pipelineItemsRetrieved: any[] = [];

                // 1. Try fetching from the combined pipeline endpoint
                try {
                    const pipelineResponse = await fetch('http://127.0.0.1:5000/pipeline');
                    if (pipelineResponse.ok) {
                        const rawPipelineData = await pipelineResponse.json();
                        
                        pipelineItemsRetrieved = rawPipelineData.map((item: any) => {
                            const primaryStage = item.type === 'customer' 
                                ? item.customer.stage 
                                : (item.job?.stage || item.customer.stage);
                            
                            const validStage = STAGES.includes(primaryStage) ? primaryStage : 'Lead' as Stage;

                            const commonItem = {
                                id: item.id,
                                customer: item.customer,
                                name: item.customer.name,
                                salesperson: item.job?.salesperson_name || item.customer.salesperson,
                                measureDate: item.job?.measure_date || item.customer.date_of_measure,
                                stage: validStage,
                            };

                            if (item.type === 'customer') {
                                return {
                                    ...commonItem,
                                    type: 'customer' as const,
                                    reference: `CUST-${item.customer.id.slice(-4).toUpperCase()}`,
                                    jobType: item.customer.project_types?.join(', '),
                                };
                            } else {
                                const jobStage = item.job?.stage ? 
                                    (STAGES.includes(item.job.stage) ? item.job.stage : 'Lead') : 
                                    validStage;

                                return {
                                    ...commonItem,
                                    type: 'job' as const,
                                    job: item.job,
                                    reference: item.job?.job_reference || `JOB-${item.job.id.slice(-4).toUpperCase()}`,
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
                        return; // Successfully loaded from pipeline endpoint
                    }
                } catch (pipelineError) {
                    console.warn('Pipeline endpoint not available or failed, falling back to individual endpoints...');
                }

                // 2. Fallback to individual endpoints (logic remains the same)
                const customersResponse = await fetch('http://127.0.0.1:5000/customers');
                if (!customersResponse.ok) {
                    throw new Error(`Failed to fetch customers: ${customersResponse.statusText}`);
                }
                customersData = await customersResponse.json();

                try {
                    const jobsResponse = await fetch('http://127.0.0.1:5000/jobs');
                    if (jobsResponse.ok) {
                        jobsData = await jobsResponse.json();
                    }
                } catch (jobsError) {
                    console.log('Jobs endpoint not available, showing customers only');
                }

                const items = createPipelineItemsFromSeparateData(customersData, jobsData);
                
                const filteredItems = items.filter(canUserAccessItem);
                setPipelineItems(filteredItems);

                const kanbanFeatures = mapPipelineToFeatures(filteredItems);
                setFeatures(kanbanFeatures);
                prevFeaturesRef.current = kanbanFeatures;

            } catch (err) {
                console.error('Final Error fetching pipeline data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const handleDataChange = async (next: any[]) => {
        // ... (handleDataChange remains the same)
        if (!permissions.canDragDrop) {
            alert("You don't have permission to move items in the pipeline.");
            return;
        }

        const prev = prevFeaturesRef.current;
        const moved = next.filter((n) => {
            const p = prev.find((x) => x.id === n.id);
            return p && p.column !== n.column;
        });

        if (moved.length > 0) {
            const unauthorizedMoves = moved.filter(item => !canUserEditItem({
                id: item.itemId,
                type: item.itemType,
                customer: item.customer,
                job: item.job,
                reference: item.reference,
                name: item.customer.name,
                stage: item.stage,
                jobType: item.jobType,
                salesperson: item.salesperson,
            } as PipelineItem));

            if (unauthorizedMoves.length > 0) {
                alert("You don't have permission to move some of these items.");
                return;
            }

            setFeatures(next);
            prevFeaturesRef.current = next;

            try {
                const updatePromises = moved.map(async (item) => {
                    const newStage = columnIdToStage(item.column);
                    const entityId = item.itemId.replace('customer-', '').replace('job-', '');

                    const isCustomer = item.itemType === 'customer';
                    const endpoint = isCustomer
                        ? `http://127.0.0.1:5000/customers/${entityId}/stage`
                        : `http://127.0.0.1:5000/jobs/${entityId}/stage`;

                    const response = await fetch(endpoint, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            stage: newStage,
                            // CRITICAL: We include the reason, which will trigger the logging on the backend.
                            reason: "Moved via Kanban board", 
                            updated_by: user?.email || "current_user"
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `Failed to update ${item.itemType} ${entityId}`);
                    }

                    const result = await response.json();
                    
                    const auditEntry: AuditLog = {
                        audit_id: `audit-${Date.now()}-${item.itemId}`, 
                        entity_type: item.itemType === 'customer' ? 'Customer' : 'Job',
                        entity_id: item.itemId,
                        action: "update",
                        changed_by: user?.email || "current_user",
                        changed_at: new Date().toISOString(),
                        change_summary: `Stage changed to ${newStage} via Kanban drag & drop`,
                    };
                    setAuditLogs((prev) => [auditEntry, ...prev.slice(0, 4)]);

                    if (newStage === "Accepted" && item.itemType === 'job' && (userRole === "Manager" || userRole === "HR" || userRole === "Sales")) {
                        try {
                            await fetch(`http://127.0.0.1:5000/invoices`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    jobId: entityId,
                                    templateId: "default_invoice"
                                }),
                            });
                        } catch (e) {
                            console.warn('Failed to create invoice automatically:', e);
                        }
                    }

                    return result;
                });

                await Promise.all(updatePromises);

            } catch (error) {
                console.error('Failed to update stages:', error);
                setFeatures(prev);
                prevFeaturesRef.current = prev;
                alert(`Failed to update stage: ${error instanceof Error ? error.message : 'Unknown error'}. Changes have been reverted.`);
            }
        } else {
            setFeatures(next);
            prevFeaturesRef.current = next;
        }
    };

    const refetchPipelineData = async () => {
        try {
            const pipelineResponse = await fetch('http://127.0.0.1:5000/pipeline');
            if (pipelineResponse.ok) {
                const pipelineData = await pipelineResponse.json();

                const items = pipelineData.map((item: any) => {
                    const primaryStage = item.type === 'customer' 
                        ? item.customer.stage 
                        : (item.job?.stage || item.customer.stage);

                    const validStage = STAGES.includes(primaryStage) ? primaryStage : 'Lead' as Stage;

                    const commonItem = {
                        id: item.id,
                        customer: item.customer,
                        name: item.customer.name,
                        salesperson: item.job?.salesperson_name || item.customer.salesperson,
                        measureDate: item.job?.measure_date || item.customer.date_of_measure,
                        stage: validStage,
                    };

                    if (item.type === 'customer') {
                        return {
                            ...commonItem,
                            type: 'customer' as const,
                            reference: `CUST-${item.customer.id.slice(-4).toUpperCase()}`,
                            jobType: item.customer.project_types?.join(', '),
                        };
                    } else {
                        const jobStage = item.job?.stage ? 
                            (STAGES.includes(item.job.stage) ? item.job.stage : 'Lead') : 
                            validStage;

                        return {
                            ...commonItem,
                            type: 'job' as const,
                            job: item.job,
                            reference: item.job.job_reference || `JOB-${item.job.id.slice(-4).toUpperCase()}`,
                            stage: jobStage as Stage,
                            jobType: item.job.job_type,
                            quotePrice: item.job.quote_price,
                            agreedPrice: item.job.agreed_price,
                            soldAmount: item.job.sold_amount,
                            deposit1: item.job.deposit1,
                            deposit2: item.job.deposit2,
                            deposit1Paid: item.job.deposit1_paid || false,
                            deposit2Paid: item.job.deposit2_paid || false,
                            deliveryDate: item.job.delivery_date,
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
            console.log('Pipeline refetch failed, using fallback');
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
            if (item.type === 'job' && permissions.canViewFinancials) {
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
    const salespeople = useMemo(() =>
        [...new Set(pipelineItems.map((item) => item.salesperson).filter(Boolean))],
        [pipelineItems]
    );

    const jobTypes = useMemo(() =>
        [...new Set(pipelineItems.map((item) => item.jobType).filter(Boolean))],
        [pipelineItems]
    );

    // Handle stage change with audit logging
    const handleStageChange = async (itemId: string, newStage: Stage, reason: string, itemType: 'customer' | 'job') => {
        // Check permissions
        const item = pipelineItems.find(i => i.id === itemId);
        if (!item || !canUserEditItem(item)) {
            alert("You don't have permission to change the stage of this item.");
            return;
        }

        try {
            const entityId = itemId.replace('customer-', '').replace('job-', '');
            const endpoint = itemType === 'customer'
                ? `http://127.0.0.1:5000/customers/${entityId}`
                : `http://127.0.0.1:5000/jobs/${entityId}`;

            const response = await fetch(endpoint, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stage: newStage, reason }),
            });

            if (!response.ok) throw new Error("Failed to update stage");

            // Refresh the entire pipeline data to ensure consistency (using refetch helper)
            await refetchPipelineData();

            // Log audit entry
            const auditEntry: AuditLog = {
                audit_id: `audit-${Date.now()}`,
                entity_type: itemType === 'customer' ? 'Customer' : 'Job',
                entity_id: itemId,
                action: "update",
                changed_by: user?.email || "current_user",
                changed_at: new Date().toISOString(),
                change_summary: `Stage changed to ${newStage}. Reason: ${reason}`,
            };
            setAuditLogs((prev) => [auditEntry, ...prev.slice(0, 4)]);

            // Trigger automation for "Accepted" stage - only for authorized users
            if (newStage === "Accepted" && itemType === 'job' && permissions.canSendQuotes) {
                try {
                    await fetch(`http://127.0.0.1:5000/invoices`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ jobId: entityId, templateId: "default_invoice" }),
                    });
                } catch (e) {
                    console.warn('Failed to create invoice automatically:', e);
                }
            }

        } catch (e) {
            console.error("Failed to update stage:", e);
            alert("Failed to update stage. Please try again.");
        }
    };

    // Action handlers
    const handleOpenItem = (itemId: string, itemType: 'customer' | 'job') => {
        if (itemType === 'customer') {
            const customerId = itemId.replace('customer-', '');
            window.location.href = `/customers/${customerId}`;
        } else {
            const jobId = itemId.replace('job-', '');
            window.location.href = `/jobs/${jobId}`;
        }
    };

    const handleOpenCustomer = (customerId: string) => {
        window.location.href = `/customers/${customerId}`;
    };

    const handleCreateJob = () => {
        if (!permissions.canCreate) {
            alert("You don't have permission to create new jobs.");
            return;
        }
        window.location.href = '/jobs/new';
    };

    const handleCreateCustomer = () => {
        if (!permissions.canCreate) {
            alert("You don't have permission to create new customers.");
            return;
        }
        window.location.href = '/customers/new';
    };

    const handleSendQuote = async (itemId: string) => {
        if (!permissions.canSendQuotes) {
            alert("You don't have permission to send quotes.");
            return;
        }

        try {
            const entityId = itemId.replace('job-', '').replace('customer-', '');
            await fetch(`http://127.0.0.1:5000/jobs/${entityId}/quotes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
            <div className="p-6 space-y-6">
                <div className="flex justify-center items-center h-64">
                    <div className="text-lg">Loading pipeline data...</div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Data</h3>
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button onClick={() => window.location.reload()}>Try Again</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 overflow-x-hidden">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Sales Pipeline</h1>
                <div className="flex items-center gap-2">
                    {/* Show role badge */}
                    <Badge variant="outline" className="text-xs">
                        {userRole} View
                    </Badge>
                    
                    {permissions.canCreate && (
                        <Button variant="outline" size="sm" onClick={handleCreateJob}>
                            <Plus className="h-4 w-4 mr-2" />
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
                        You have read-only access to jobs in production stages. Pricing information is hidden.
                    </AlertDescription>
                </Alert>
            )}

            {/* Search + Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
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
                            className="h-full overflow-x-auto overflow-y-hidden bg-gray-50/30 rounded-lg"
                            style={{
                                maxWidth: '100%',
                                width: 'calc(100vw - 390px)',
                            }}
                        >
                            <div
                                className="flex items-start h-full gap-4 p-3"
                                style={{ width: 'max-content', minWidth: '100%' }}
                            >
                                <KanbanProvider 
                                    columns={columns} 
                                    data={filteredFeatures} 
                                    onDataChange={permissions.canDragDrop ? handleDataChange : undefined}
                                >
                                    {(column) => (
                                        <div
                                            key={column.id}
                                            className="flex-shrink-0"
                                        >
                                            <KanbanBoard
                                                id={column.id}
                                                className="w-[196px] md:w-[224px] flex-shrink-0 h-full flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm"
                                            >
                                                <KanbanHeader className="flex-shrink-0 p-2.5 border-b bg-gray-50/80 rounded-t-lg">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} />
                                                        <span className="font-medium text-xs">{column.name}</span>
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                            {counts[column.id] ?? 0}
                                                        </Badge>
                                                    </div>
                                                </KanbanHeader>

                                                <KanbanCards
                                                    id={column.id}
                                                    className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[850px]"
                                                >
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
                                                        
                                                        // CONFIRMED: All notes rendering logic is explicitly removed from this return block.

                                                        return (
                                                            <KanbanCard
                                                                column={column.id}
                                                                id={feature.id}
                                                                key={feature.id}
                                                                name={feature.name}
                                                                className={`bg-white border border-gray-200 rounded-md shadow-sm hover:shadow-md transition-shadow ${permissions.canDragDrop && isEditable ? 'cursor-grab' : 'cursor-not-allowed opacity-90'} p-2 ${feature.itemType === 'job' ? 'pb-0' : ''}`}
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
                                                                            <p className="font-semibold text-sm text-black break-words">
                                                                                {feature.customer.name}
                                                                            </p>

                                                                            {/* Show reference below customer name for both types */}
                                                                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                                                                <span className="truncate">
                                                                                    {feature.reference}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex flex-col gap-1 flex-shrink-0">
                                                                            {/* Render each job/project type as its own badge */}
                                                                            {feature.jobType &&
                                                                                feature.jobType
                                                                                    .split(",")
                                                                                    .map((t: string, i: number) => (
                                                                                        <Badge key={i} variant="outline" className="text-xs whitespace-nowrap">
                                                                                            {t.trim()}
                                                                                        </Badge>
                                                                                    ))}
                                                                        </div>
                                                                    </div>

                                                                    {/* Contact Info - only show if available */}
                                                                    {(feature.customer.phone || feature.customer.email || feature.customer.address) && (
                                                                        <div className="space-y-1 text-xs text-muted-foreground">
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
                                                                                <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                                                <span className="truncate">{feature.salesperson}</span>
                                                                            </div>
                                                                        )}
                                                                        {feature.measureDate && (
                                                                            <div className="flex items-center gap-2">
                                                                                <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                                                <span className="truncate">Measure: {formatDate(feature.measureDate)}</span>
                                                                            </div>
                                                                        )}
                                                                        
                                                                        {/* Financial information - only show if user has permission */}
                                                                        {permissions.canViewFinancials && (
                                                                            <>
                                                                                {feature.quotePrice && (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                                                        <span className="truncate">Quote: £{feature.quotePrice.toFixed(2)}</span>
                                                                                    </div>
                                                                                )}
                                                                                {feature.agreedPrice && (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                                                        <span className="truncate">Agreed: £{feature.agreedPrice.toFixed(2)}</span>
                                                                                    </div>
                                                                                )}
                                                                                {feature.soldAmount && (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                                                        <span className="truncate">Sold: £{feature.soldAmount.toFixed(2)}</span>
                                                                                    </div>
                                                                                )}
                                                                                {feature.deposit1 && (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div
                                                                                            className={`h-2 w-2 rounded-full flex-shrink-0 ${feature.deposit1Paid ? "bg-green-500" : "bg-red-500"}`}
                                                                                        />
                                                                                        <span className="truncate">
                                                                                            Deposit 1: £{feature.deposit1.toFixed(2)}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                {feature.deposit2 && (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div
                                                                                            className={`h-2 w-2 rounded-full flex-shrink-0 ${feature.deposit2Paid ? "bg-green-500" : "bg-red-500"}`}
                                                                                        />
                                                                                        <span className="truncate">
                                                                                            Deposit 2: £{feature.deposit2.toFixed(2)}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                        
                                                                        {feature.deliveryDate && (
                                                                            <div className="flex items-center gap-2">
                                                                                <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                                                <span className="truncate">Delivery: {formatDate(feature.deliveryDate)}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Action Buttons (fixed to the bottom with padding) */}
                                                                    <div className="flex gap-1 pt-2 pb-1">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="h-6 px-1 text-xs flex-1 hover:bg-gray-100"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleOpenItem(feature.itemId, feature.itemType);
                                                                            }}
                                                                            title={`Open ${feature.itemType === 'customer' ? 'Customer' : 'Job'}`}
                                                                        >
                                                                            <Eye className="h-3 w-3" />
                                                                        </Button>

                                                                        {/* Only show quote action if appropriate stage and user has permission */}
                                                                        {permissions.canSendQuotes && isEditable && (feature.stage === 'Quote' || feature.stage === 'Design' || feature.stage === 'Quoted') && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-6 px-1 text-xs flex-1 hover:bg-gray-100"
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
                                                                        {permissions.canSchedule && (feature.stage === 'Survey' || feature.stage === 'Installation' || feature.stage === 'Delivery') && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-6 px-1 text-xs flex-1 hover:bg-gray-100"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleSchedule(feature.itemId);
                                                                                }}
                                                                                title="Schedule"
                                                                            >
                                                                                <Calendar className="h-3 w-3" />
                                                                            </Button>
                                                                        )}

                                                                        {/* Show documents for jobs */}
                                                                        {feature.itemType === 'job' && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-6 px-1 text-xs flex-1 hover:bg-gray-100"
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
                        <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 rounded-lg font-medium text-sm">
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
                                <Card key={item.id} className={`p-4 hover:shadow-md transition-shadow ${!isEditable ? 'opacity-90' : ''}`}>
                                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={item.type === 'customer' ? 'secondary' : 'default'} className="text-xs">
                                                {item.type === 'customer' ? 'Customer' : 'Job'}
                                            </Badge>
                                            {!isEditable && <Lock className="h-3 w-3 text-gray-400" />}
                                        </div>
                                        <div className="font-medium">{item.reference}</div>
                                        <div className="col-span-2">
                                            <button
                                                className="font-medium text-blue-600 hover:underline cursor-pointer"
                                                onClick={() => handleOpenCustomer(item.customer.id)}
                                                title="View Customer Details"
                                            >
                                                {item.customer.name}
                                            </button>
                                            {item.customer.phone && <div className="text-xs text-muted-foreground">{item.customer.phone}</div>}
                                            {item.customer.address && <div className="text-xs text-muted-foreground truncate">{item.customer.address}</div>}
                                        </div>
                                        <div>
                                            {item.jobType && <Badge variant="outline">{item.jobType}</Badge>}
                                        </div>
                                        <div>{item.salesperson}</div>
                                        <div>
                                            <Badge style={{ backgroundColor: stageColors[item.stage], color: "white" }}>
                                                {item.stage}
                                            </Badge>
                                        </div>
                                        {permissions.canViewFinancials ? (
                                            <>
                                                <div>{item.quotePrice ? `£${item.quotePrice.toFixed(2)}` : 'N/A'}</div>
                                                <div>{item.soldAmount ? `£${item.soldAmount.toFixed(2)}` : 'N/A'}</div>
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
                                                    <DropdownMenuItem onClick={() => handleOpenItem(item.id, item.type)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        Open {item.type === 'customer' ? 'Customer' : 'Job'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleOpenCustomer(item.customer.id)}>
                                                        <Users className="h-4 w-4 mr-2" />
                                                        View Customer
                                                    </DropdownMenuItem>
                                                    {/* Conditional menu items based on permissions and stage */}
                                                    {permissions.canSendQuotes && isEditable && (item.stage === 'Quote' || item.stage === 'Design' || item.stage === 'Quoted') && (
                                                        <DropdownMenuItem onClick={() => handleSendQuote(item.id)}>
                                                            <Mail className="h-4 w-4 mr-2" />
                                                            Send Quote
                                                        </DropdownMenuItem>
                                                    )}
                                                    {permissions.canSchedule && (item.stage === 'Survey' || item.stage === 'Installation' || item.stage === 'Delivery') && (
                                                        <DropdownMenuItem onClick={() => handleSchedule(item.id)}>
                                                            <Calendar className="h-4 w-4 mr-2" />
                                                            Schedule
                                                        </DropdownMenuItem>
                                                    )}
                                                    {item.type === 'job' && (
                                                        <DropdownMenuItem onClick={() => handleViewDocuments(item.id)}>
                                                            <File className="h-4 w-4 mr-2" />
                                                            View Documents
                                                        </DropdownMenuItem>
                                                    )}
                                                    {permissions.canEdit && isEditable && item.stage !== "Accepted" && item.stage !== "Complete" && (
                                                        <DropdownMenuItem onClick={() => setEditDialog({
                                                            open: true,
                                                            itemId: item.id,
                                                            newStage: "Accepted",
                                                            itemType: item.type
                                                        })}>
                                                            <Check className="h-4 w-4 mr-2" />
                                                            Mark Accepted
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Additional Details */}
                                    {(item.customer.email || (permissions.canViewFinancials && (item.deposit1 || item.deposit2))) && (
                                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                                            <div className="space-y-1">
                                                {item.customer.email && (
                                                    <div>
                                                        <span className="font-medium">Email: </span>
                                                        {item.customer.email}
                                                    </div>
                                                )}
                                                {/* CONFIRMED: Notes block is removed from here */}
                                                
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
                                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium mb-2">No items found</h3>
                                    <p>
                                        {userRole === "Sales" 
                                            ? "You have no assigned customers or leads. Try creating one to see it appear, or check your filters."
                                            : userRole === "Production"
                                            ? "No jobs are currently in production stages."
                                            : "Try adjusting your search criteria or filters."
                                        }
                                    </p>
                                    <div className="mt-4 space-x-2">
                                        {permissions.canCreate && (
                                            <Button variant="outline" size="sm" onClick={handleCreateCustomer}>
                                                <UserPlus className="h-4 w-4 mr-2" />
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
                            Are you sure you want to change the {editDialog.itemType} stage to <strong>{editDialog.newStage}</strong>?
                        </p>
                        <Input
                            placeholder="Reason for change"
                            value={editDialog.reason || ""}
                            onChange={(e) => setEditDialog({ ...editDialog, reason: e.target.value })}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditDialog({ open: false, itemId: null })}
                        >
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
                                        editDialog.itemType
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