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
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, addDays, isWithinInterval } from "date-fns";

// --- START OF REQUIRED CHANGES ---

// 1. Define the NEW order of stages (Removed Measure, Cancelled, Reordered)
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

// 2. Update stageColors to reflect the remaining and reordered stages
const stageColors: Record<Stage, string> = {
    Lead: "#6B7280",         // New Order: 1 (Grey)
    Survey: "#EC4899",       // New Order: 2 (Pink)
    Design: "#10B981",       // New Order: 3 (Emerald Green)
    Quote: "#3B82F6",        // New Order: 4 (Blue)
    Consultation: "#8B5CF6", // New Order: 5 (Purple)
    Quoted: "#06B6D4",
    Accepted: "#059669",
    OnHold: "#6D28D9",
    Production: "#D97706",
    Delivery: "#0284C7",
    Installation: "#16A34A",
    Complete: "#065F46",
    Remedial: "#DC2626",
};

// The rest of the types and functions below use the updated STAGES constant.

// --- END OF REQUIRED CHANGES ---


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

// Build columns for Kanban
const makeColumns = () =>
    STAGES.map((name) => ({
        id: `col-${name.toLowerCase().replace(/\s+/g, "-")}`,
        name,
        color: stageColors[name],
    }));

const columnIdToStage = (colId: string): Stage => {
    const stage = STAGES.find((s) => `col-${s.toLowerCase().replace(/\s+/g, "-")}` === colId);
    // Use 'Lead' as a safe fallback if the stage is not found (e.g. if the item had 'Measure' previously)
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

    // Fetch data from backend
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // First try the specialized pipeline endpoint, fallback to individual endpoints
                try {
                    const pipelineResponse = await fetch('http://127.0.0.1:5000/pipeline');
                    if (pipelineResponse.ok) {
                        const pipelineData = await pipelineResponse.json();

                        // Transform the response into our PipelineItem format
                        const items = pipelineData.map((item: any) => {
                            const commonItem = {
                                id: item.id,
                                customer: item.customer,
                                name: item.customer.name,
                                salesperson: item.job?.salesperson_name || item.customer.salesperson,
                                measureDate: item.job?.measure_date || item.customer.date_of_measure,
                                // Safely handle stages that no longer exist (e.g., 'Measure')
                                stage: STAGES.includes(item.customer.stage) ? item.customer.stage : 'Lead' as Stage,
                            };

                            if (item.type === 'customer') {
                                return {
                                    ...commonItem,
                                    type: 'customer' as const,
                                    reference: `CUST-${item.customer.id.slice(-4).toUpperCase()}`,
                                    jobType: item.customer.project_types?.join(', '),
                                };
                            } else {
                                return {
                                    ...commonItem,
                                    type: 'job' as const,
                                    job: item.job,
                                    reference: item.job.job_reference || `JOB-${item.job.id.slice(-4).toUpperCase()}`,
                                    stage: STAGES.includes(item.job.stage) ? item.job.stage : 'Lead' as Stage, // Safe stage check for job
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

                        setPipelineItems(items);

                        // Convert to kanban format
                        const kanbanFeatures = items.map((item: PipelineItem) => ({
                            id: item.id, // CRITICAL: Use 'id' not 'kanbanId' for the KanbanProvider
                            name: `${item.reference} — ${item.name}`,
                            column: stageToColumnId(item.stage),
                            itemId: item.id,
                            itemType: item.type,
                            // Include all the properties we need
                            customer: item.customer,
                            job: item.job,
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
                        }));

                        setFeatures(kanbanFeatures);
                        prevFeaturesRef.current = kanbanFeatures;
                        return; // Successfully loaded from pipeline endpoint
                    }
                } catch (pipelineError) {
                    console.log('Pipeline endpoint not available, trying individual endpoints...');
                }

                // Fallback to individual endpoints if pipeline endpoint doesn't work
                const customersResponse = await fetch('http://127.0.0.1:5000/customers');

                if (!customersResponse.ok) {
                    // If customers endpoint also doesn't exist, show helpful error
                    if (customersResponse.status === 404) {
                        throw new Error('API endpoints not found. Please ensure your backend server is running and the database routes are properly configured.');
                    }
                    throw new Error(`Failed to fetch customers: ${customersResponse.statusText}`);
                }

                const customersData = await customersResponse.json();
                setCustomers(customersData);

                // Try to fetch jobs, but don't fail if endpoint doesn't exist
                let jobsData: Job[] = [];
                try {
                    const jobsResponse = await fetch('http://127.0.0.1:5000/jobs');
                    if (jobsResponse.ok) {
                        jobsData = await jobsResponse.json();
                        setJobs(jobsData);
                    }
                } catch (jobsError) {
                    console.log('Jobs endpoint not available, showing customers only');
                }

                // Create pipeline items from customers and jobs (fallback method)
                const items = createPipelineItemsFromSeparateData(customersData, jobsData);
                setPipelineItems(items);

                // Convert to kanban format
                const kanbanFeatures = items.map((item: PipelineItem) => ({
                    id: item.id, // CRITICAL: Use 'id' not 'kanbanId' for the KanbanProvider
                    name: `${item.reference} — ${item.name}`,
                    column: stageToColumnId(item.stage),
                    itemId: item.id,
                    itemType: item.type,
                    // Include all the properties we need
                    customer: item.customer,
                    job: item.job,
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
                }));

                setFeatures(kanbanFeatures);
                prevFeaturesRef.current = kanbanFeatures;

            } catch (err) {
                console.error('Error fetching pipeline data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Fallback method to create pipeline items when using separate endpoints
    const createPipelineItemsFromSeparateData = (customers: any[], jobs: any[]): PipelineItem[] => {
        const items: PipelineItem[] = [];
        const jobsByCustomerId = new Map<string, any[]>();

        // Group jobs by customer
        jobs.forEach(job => {
            if (!jobsByCustomerId.has(job.customer_id)) {
                jobsByCustomerId.set(job.customer_id, []);
            }
            jobsByCustomerId.get(job.customer_id)!.push(job);
        });

        customers.forEach(customer => {
            const customerJobs = jobsByCustomerId.get(customer.id) || [];
            
            // Safely determine the stage, defaulting to 'Lead' if the original stage is invalid
            const customerStage = STAGES.includes(customer.stage) ? customer.stage : 'Lead' as Stage;

            if (customerJobs.length === 0) {
                // Customer without jobs - show as customer item
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
                // Customer with jobs - show each job as separate item
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
                        deposit1Paid: false, // TODO: Calculate from Payment records
                        deposit2Paid: false, // TODO: Calculate from Payment records
                        measureDate: job.measure_date || customer.date_of_measure,
                        deliveryDate: job.delivery_date,
                        salesperson: job.salesperson_name || customer.salesperson,
                    });
                });
            }
        });

        return items;
    };

    // Replace your handleDataChange function with this improved version

    const handleDataChange = async (next: any[]) => {
        console.log('handleDataChange called with:', next.length, 'items');

        const prev = prevFeaturesRef.current;

        // Find items that actually changed columns (not just reordered)
        const moved = next.filter((n) => {
            const p = prev.find((x) => x.id === n.id); // Use 'id' here
            return p && p.column !== n.column;
        });

        console.log('Moved items:', moved.length, 'items');

        if (moved.length > 0) {
            // Update the UI immediately for smooth UX (optimistic update)
            setFeatures(next);
            prevFeaturesRef.current = next;

            try {
                // Batch update all moved items
                const updatePromises = moved.map(async (item) => {
                    const newStage = columnIdToStage(item.column);
                    const entityId = item.itemId.replace('customer-', '').replace('job-', '');

                    const isCustomer = item.itemType === 'customer';
                    const endpoint = isCustomer
                        ? `http://127.0.0.1:5000/customers/${entityId}/stage`
                        : `http://127.0.0.1:5000/jobs/${entityId}/stage`;

                    console.log(`Updating ${item.itemType} ${entityId} to stage ${newStage}`);

                    const response = await fetch(endpoint, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            stage: newStage,
                            reason: "Moved via Kanban board",
                            updated_by: user?.email || "current_user"
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `Failed to update ${item.itemType} ${entityId}`);
                    }

                    const result = await response.json();
                    console.log('Update successful:', result);

                    // Log audit entry (local)
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

                    // Trigger automation for "Accepted" stage (jobs only)
                    if (newStage === "Accepted" && item.itemType === 'job') {
                        try {
                            await fetch(`http://127.0.0.1:5000/invoices`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    jobId: entityId,
                                    templateId: "default_invoice"
                                }),
                            });
                            console.log('Invoice created automatically for accepted job');
                        } catch (e) {
                            console.warn('Failed to create invoice automatically:', e);
                        }
                    }

                    return result;
                });

                // Wait for all updates to complete
                await Promise.all(updatePromises);
                console.log('All stage updates completed successfully');

                // Optional: Only refetch if you need to sync other data
                // For better performance, you can skip this since we already updated the UI optimistically
                // await refetchPipelineData();

            } catch (error) {
                console.error('Failed to update stages:', error);
                // Revert UI on any error (rollback optimistic update)
                setFeatures(prev);
                prevFeaturesRef.current = prev;
                alert(`Failed to update stage: ${error instanceof Error ? error.message : 'Unknown error'}. Changes have been reverted.`);
            }
        } else {
            // Just a reorder within the same column - update UI only
            setFeatures(next);
            prevFeaturesRef.current = next;
        }
    };

    // Add this helper function to refetch pipeline data (kept for completeness, though full refetch is often slow)
    const refetchPipelineData = async () => {
        try {
            const pipelineResponse = await fetch('http://127.0.0.1:5000/pipeline');
            if (pipelineResponse.ok) {
                const pipelineData = await pipelineResponse.json();

                const items = pipelineData.map((item: any) => {
                    const commonItem = {
                        id: item.id,
                        customer: item.customer,
                        name: item.customer.name,
                        salesperson: item.job?.salesperson_name || item.customer.salesperson,
                        measureDate: item.job?.measure_date || item.customer.date_of_measure,
                        stage: STAGES.includes(item.customer.stage) ? item.customer.stage : 'Lead' as Stage,
                    };

                    if (item.type === 'customer') {
                        return {
                            ...commonItem,
                            type: 'customer' as const,
                            reference: `CUST-${item.customer.id.slice(-4).toUpperCase()}`,
                            jobType: item.customer.project_types?.join(', '),
                        };
                    } else {
                        return {
                            ...commonItem,
                            type: 'job' as const,
                            job: item.job,
                            reference: item.job.job_reference || `JOB-${item.job.id.slice(-4).toUpperCase()}`,
                            stage: STAGES.includes(item.job.stage) ? item.job.stage : 'Lead' as Stage,
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

                setPipelineItems(items);

                const updatedFeatures = items.map((item: PipelineItem) => ({
                    id: item.id, // Use 'id' not 'kanbanId'
                    name: `${item.reference} — ${item.name}`,
                    column: stageToColumnId(item.stage),
                    itemId: item.id,
                    itemType: item.type,
                    customer: item.customer,
                    job: item.job,
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
                }));

                setFeatures(updatedFeatures);
                prevFeaturesRef.current = updatedFeatures;
            }
        } catch (pipelineError) {
            console.log('Pipeline refetch failed, using fallback');
            // Fallback logic here if needed
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
            if (item.type === 'job') {
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
    }, [filteredListItems]);

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
                changed_by: user?.email || "current_user", // Replace with actual user
                changed_at: new Date().toISOString(),
                change_summary: `Stage changed to ${newStage}. Reason: ${reason}`,
            };
            setAuditLogs((prev) => [auditEntry, ...prev.slice(0, 4)]);

            // Trigger automation for "Accepted" stage
            if (newStage === "Accepted" && itemType === 'job') {
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
        window.location.href = '/jobs/new';
    };

    const handleCreateCustomer = () => {
        window.location.href = '/customers/new';
    };

    const handleSendQuote = async (itemId: string) => {
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
                <div className="flex gap-2">
                    {user?.role !== "Staff" && (
                        <Button variant="outline" size="sm" onClick={handleCreateJob}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Job
                        </Button>
                    )}
                </div>
            </div>

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

                        {/* Salesperson filter */}
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
                                <KanbanProvider columns={columns} data={filteredFeatures} onDataChange={handleDataChange}>
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
                                                    {(feature: any) => (
                                                        <KanbanCard
                                                            column={column.id}
                                                            id={feature.id} // Use 'id' not 'kanbanId'
                                                            key={feature.id} // Use 'id' not 'kanbanId'
                                                            name={feature.name}
                                                            className={`bg-white border border-gray-200 rounded-md shadow-sm hover:shadow-md transition-shadow cursor-grab p-2 ${feature.itemType === 'job' ? 'pb-0' : ''}`}
                                                        >
                                                            <div className="space-y-3">
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

                                                                {/* Job Details - conditional rendering based on available data */}
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
                                                                    {/* Only show quote price if it exists */}
                                                                    {feature.quotePrice && (
                                                                        <div className="flex items-center gap-2">
                                                                            <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                                        </div>
                                                                    )}
                                                                    {/* Only show agreed price if it exists */}
                                                                    {feature.agreedPrice && (
                                                                        <div className="flex items-center gap-2">
                                                                            <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                                        </div>
                                                                    )}
                                                                    {/* Only show sold amount if it exists */}
                                                                    {feature.soldAmount && (
                                                                        <div className="flex items-center gap-2">
                                                                            <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                                        </div>
                                                                    )}
                                                                    {/* Only show deposit 1 if it exists */}
                                                                    {feature.deposit1 && (
                                                                        <div className="flex items-center gap-2">
                                                                            <div
                                                                                className={`h-2 w-2 rounded-full flex-shrink-0 ${feature.deposit1Paid ? "bg-green-500" : "bg-red-500"}`}
                                                                            />
                                                                            <span className="truncate">
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {/* Only show deposit 2 if it exists */}
                                                                    {feature.deposit2 && (
                                                                        <div className="flex items-center gap-2">
                                                                            <div
                                                                                className={`h-2 w-2 rounded-full flex-shrink-0 ${feature.deposit2Paid ? "bg-green-500" : "bg-red-500"}`}
                                                                            />
                                                                            <span className="truncate">
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {/* Only show delivery date if it exists */}
                                                                    {feature.deliveryDate && (
                                                                        <div className="flex items-center gap-2">
                                                                            <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                                            <span className="truncate">Delivery: {formatDate(feature.deliveryDate)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Comments - show customer notes or job notes */}
                                                                {(feature.customer.notes || (feature.job && feature.job.notes)) && (
                                                                    <div className="text-xs bg-gray-50 p-2 rounded border">
                                                                        <p className="text-gray-600 italic leading-relaxed line-clamp-3">
                                                                            {feature.job?.notes || feature.customer.notes}
                                                                        </p>
                                                                    </div>
                                                                )}

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

                                                                    {/* Only show quote action if appropriate stage and item type */}
                                                                    {(feature.stage === 'Quote' || feature.stage === 'Design' || feature.stage === 'Quoted') && (
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

                                                                    {/* Only show schedule if measure/delivery stages */}
                                                                    {(feature.stage === 'Survey' || feature.stage === 'Installation' || feature.stage === 'Delivery') && (
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
                                                    )}
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
                            <div>Quote Price</div>
                            <div>Sold Amount</div>
                            <div>Contact Made</div>
                            <div>Measure Date</div>
                            <div>Actions</div>
                        </div>

                        {/* Table Rows */}
                        {filteredListItems.map((item) => (
                            <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                                <div className="grid grid-cols-12 gap-4 items-center text-sm">
                                    <div>
                                        <Badge variant={item.type === 'customer' ? 'secondary' : 'default'} className="text-xs">
                                            {item.type === 'customer' ? 'Customer' : 'Job'}
                                        </Badge>
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
                                    <div>{item.quotePrice ? `$${item.quotePrice.toFixed(2)}` : 'N/A'}</div>
                                    <div>{item.soldAmount ? `$${item.soldAmount.toFixed(2)}` : 'N/A'}</div>
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
                                                {/* Conditional menu items based on stage */}
                                                {(item.stage === 'Quote' || item.stage === 'Design' || item.stage === 'Quoted') && (
                                                    <DropdownMenuItem onClick={() => handleSendQuote(item.id)}>
                                                        <Mail className="h-4 w-4 mr-2" />
                                                        Send Quote
                                                    </DropdownMenuItem>
                                                )}
                                                {(item.stage === 'Survey' || item.stage === 'Installation' || item.stage === 'Delivery') && (
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
                                                {item.stage !== "Accepted" && item.stage !== "Complete" && (
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
                                {(item.customer.email || item.customer.notes || (item.job && item.job.notes) || item.deposit1 || item.deposit2) && (
                                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                                        <div className="space-y-1">
                                            {item.customer.email && (
                                                <div>
                                                    <span className="font-medium">Email: </span>
                                                    {item.customer.email}
                                                </div>
                                            )}
                                            {(item.customer.notes || (item.job && item.job.notes)) && (
                                                <div>
                                                    <span className="font-medium">Notes: </span>
                                                    {item.job?.notes || item.customer.notes}
                                                </div>
                                            )}
                                            {(item.deposit1 || item.deposit2) && (
                                                <div className="flex gap-4">
                                                    {item.deposit1 && (
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={`h-2 w-2 rounded-full ${item.deposit1Paid ? "bg-green-500" : "bg-red-500"}`}
                                                            />
                                                            <span className={item.deposit1Paid ? "text-green-600" : "text-red-600"}>
                                                                Deposit 1: ${item.deposit1.toFixed(2)} ({item.deposit1Paid ? "Paid" : "Unpaid"})
                                                            </span>
                                                        </div>
                                                    )}
                                                    {item.deposit2 && (
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={`h-2 w-2 rounded-full ${item.deposit2Paid ? "bg-green-500" : "bg-red-500"}`}
                                                            />
                                                            <span className={item.deposit2Paid ? "text-green-600" : "text-red-600"}>
                                                                Deposit 2: ${item.deposit2.toFixed(2)} ({item.deposit2Paid ? "Paid" : "Unpaid"})
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}

                        {/* Empty state */}
                        {filteredListItems.length === 0 && (
                            <Card className="p-8 text-center">
                                <div className="text-muted-foreground">
                                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium mb-2">No items found</h3>
                                    <p>Try adjusting your search criteria or filters.</p>
                                    <div className="mt-4 space-x-2">
                                        {user?.role !== "Staff" && (
                                            <Button variant="outline" size="sm" onClick={handleCreateJob}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create New Job
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
                            Are you sure you want to change the {editDialog.itemType} stage to **{editDialog.newStage}**?
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
        </div>
    );
}