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

// Complete list of stages as per project requirements
const STAGES = [
  "Lead",
  "Quote",
  "Consultation",
  "Survey",
  "Measure",
  "Design",
  "Quoted",
  "Accepted",
  "OnHold",
  "Production",
  "Delivery",
  "Installation",
  "Complete",
  "Remedial",
  "Cancelled",
] as const;

type Stage = (typeof STAGES)[number];

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

// Sales-focused color scheme for stages
const stageColors: Record<Stage, string> = {
  Lead: "#6B7280",
  Quote: "#3B82F6",
  Consultation: "#8B5CF6",
  Survey: "#EC4899",
  Measure: "#F59E0B",
  Design: "#10B981",
  Quoted: "#06B6D4",
  Accepted: "#059669",
  OnHold: "#6D28D9",
  Production: "#D97706",
  Delivery: "#0284C7",
  Installation: "#16A34A",
  Complete: "#065F46",
  Remedial: "#DC2626",
  Cancelled: "#4B5563",
};

// Build columns for Kanban
const makeColumns = () =>
  STAGES.map((name) => ({
    id: `col-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    color: stageColors[name],
  }));

const columnIdToStage = (colId: string): Stage =>
  STAGES.find((s) => `col-${s.toLowerCase().replace(/\s+/g, "-")}` === colId) ?? "Lead";

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
              if (item.type === 'customer') {
                return {
                  id: item.id,
                  type: 'customer' as const,
                  customer: item.customer,
                  reference: `CUST-${item.customer.id.slice(-4).toUpperCase()}`,
                  name: item.customer.name,
                  stage: item.customer.stage,
                  jobType: item.customer.project_types?.join(', '),
                  measureDate: item.customer.date_of_measure,
                  salesperson: item.customer.salesperson,
                };
              } else {
                return {
                  id: item.id,
                  type: 'job' as const,
                  customer: item.customer,
                  job: item.job,
                  reference: item.job.job_reference || `JOB-${item.job.id.slice(-4).toUpperCase()}`,
                  name: item.customer.name,
                  stage: item.job.stage,
                  jobType: item.job.job_type,
                  quotePrice: item.job.quote_price,
                  agreedPrice: item.job.agreed_price,
                  soldAmount: item.job.sold_amount,
                  deposit1: item.job.deposit1,
                  deposit2: item.job.deposit2,
                  deposit1Paid: item.job.deposit1_paid || false,
                  deposit2Paid: item.job.deposit2_paid || false,
                  measureDate: item.job.measure_date || item.customer.date_of_measure,
                  deliveryDate: item.job.delivery_date,
                  salesperson: item.job.salesperson_name || item.customer.salesperson,
                };
              }
            });

            setPipelineItems(items);

            // Convert to kanban format
            const kanbanFeatures = items.map((item: PipelineItem) => ({
              kanbanId: item.id,
              name: `${item.reference} — ${item.name}`,
              column: stageToColumnId(item.stage),
              itemId: item.id,
              itemType: item.type,
              // Explicitly include the properties we need
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
          kanbanId: item.id,
          name: `${item.reference} — ${item.name}`,
          column: stageToColumnId(item.stage),
          itemId: item.id,
          itemType: item.type,
          // Explicitly include the properties we need
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
      
      if (customerJobs.length === 0) {
        // Customer without jobs - show as customer item
        items.push({
          id: `customer-${customer.id}`,
          type: 'customer',
          customer: customer,
          reference: `CUST-${customer.id.slice(-4).toUpperCase()}`,
          name: customer.name,
          stage: customer.stage || 'Lead', // Ensure default stage
          jobType: customer.project_types?.join(', '),
          measureDate: customer.date_of_measure,
          salesperson: customer.salesperson,
        });
      } else {
        // Customer with jobs - show each job as separate item
        customerJobs.forEach(job => {
          items.push({
            id: `job-${job.id}`,
            type: 'job',
            customer: customer,
            job: job,
            reference: job.job_reference || `JOB-${job.id.slice(-4).toUpperCase()}`,
            name: customer.name,
            stage: job.stage || 'Lead', // Ensure default stage
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

  // Filter logic with fuzzy search and date range
  const filteredItems = useMemo(() => {
    if (loading) return [];
    
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
  }, [pipelineItems, searchTerm, filterSalesperson, filterStage, filterType, filterDateRange, loading]);

  const filteredFeatures = useMemo(() => {
    return filteredItems.map((item) => ({
      kanbanId: item.id,
      name: `${item.reference} — ${item.name}`,
      column: stageToColumnId(item.stage),
      itemId: item.id,
      itemType: item.type,
      // Explicitly include the properties we need
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
  }, [filteredItems]);

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
    filteredItems.forEach((item) => {
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
  }, [filteredItems]);

  // Get unique values for filters
  const salespeople = useMemo(() => 
    [...new Set(pipelineItems.map((item) => item.salesperson).filter(Boolean))], 
    [pipelineItems]
  );
  
  const jobTypes = useMemo(() => 
    [...new Set(pipelineItems.map((item) => item.jobType).filter(Boolean))], 
    [pipelineItems]
  );

  // Handle Kanban drag & drop with audit logging
  const handleDataChange = (next: any[]) => {
    const prev = prevFeaturesRef.current;
    const moved = next.filter((n) => {
      const p = prev.find((x) => x.kanbanId === n.kanbanId);
      return p && p.column !== n.column;
    });

    moved.forEach((item) => {
      setEditDialog({ 
        open: true, 
        itemId: item.itemId, 
        newStage: columnIdToStage(item.column),
        itemType: item.itemType
      });
    });

    setFeatures(next);
    prevFeaturesRef.current = next;
  };

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

      // Refresh the entire pipeline data to ensure consistency
      try {
        const pipelineResponse = await fetch('http://127.0.0.1:5000/pipeline');
        if (pipelineResponse.ok) {
          const pipelineData = await pipelineResponse.json();
          
          // Transform the API response into our PipelineItem format
          const items = pipelineData.map((item: any) => {
            if (item.type === 'customer') {
              return {
                id: item.id,
                type: 'customer' as const,
                customer: item.customer,
                reference: `CUST-${item.customer.id.slice(-4).toUpperCase()}`,
                name: item.customer.name,
                stage: item.customer.stage,
                jobType: item.customer.project_types?.join(', '),
                measureDate: item.customer.date_of_measure,
                salesperson: item.customer.salesperson,
              };
            } else {
              return {
                id: item.id,
                type: 'job' as const,
                customer: item.customer,
                job: item.job,
                reference: item.job.job_reference || `JOB-${item.job.id.slice(-4).toUpperCase()}`,
                name: item.customer.name,
                stage: item.job.stage,
                jobType: item.job.job_type,
                quotePrice: item.job.quote_price,
                agreedPrice: item.job.agreed_price,
                soldAmount: item.job.sold_amount,
                deposit1: item.job.deposit1,
                deposit2: item.job.deposit2,
                deposit1Paid: item.job.deposit1_paid || false,
                deposit2Paid: item.job.deposit2_paid || false,
                measureDate: item.job.measure_date || item.customer.date_of_measure,
                deliveryDate: item.job.delivery_date,
                salesperson: item.job.salesperson_name || item.customer.salesperson,
              };
            }
          });

          setPipelineItems(items);

          const updatedFeatures = items.map((item: PipelineItem) => ({
            kanbanId: item.id,
            name: `${item.reference} — ${item.name}`,
            column: stageToColumnId(item.stage),
            itemId: item.id,
            itemType: item.type,
            // Explicitly include the properties we need
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
        // Fallback to individual endpoints refresh
        const customersResponse = await fetch('http://127.0.0.1:5000/customers');
        const jobsResponse = await fetch('http://127.0.0.1:5000/jobs');
        
        if (customersResponse.ok) {
          const customersData = await customersResponse.json();
          let jobsData: any[] = [];
          
          if (jobsResponse.ok) {
            jobsData = await jobsResponse.json();
          }
          
          const items = createPipelineItemsFromSeparateData(customersData, jobsData);
          setPipelineItems(items);
          
          const updatedFeatures = items.map((item: PipelineItem) => ({
            kanbanId: item.id,
            name: `${item.reference} — ${item.name}`,
            column: stageToColumnId(item.stage),
            itemId: item.id,
            itemType: item.type,
            // Explicitly include the properties we need
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
      }

      // Log audit entry
      const auditEntry: AuditLog = {
        audit_id: `audit-${Date.now()}`,
        entity_type: itemType === 'customer' ? 'Customer' : 'Job',
        entity_id: itemId,
        action: "update",
        changed_by: "current_user", // Replace with actual user
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

  const handleExport = () => {
    const csvContent = [
      ["Type", "Reference", "Customer Name", "Address", "Phone", "Job Type", "Contact Made", "Salesperson", "Quote Price", "Agreed Price", "Sold Amount", "Deposit 1", "Deposit 2", "Measure Date", "Delivery Date", "Stage", "Notes"],
      ...filteredItems.map((item) => [
        item.type,
        item.reference,
        item.customer.name,
        item.customer.address || "",
        item.customer.phone || "",
        item.jobType || "",
        item.customer.contact_made,
        item.salesperson || "",
        item.quotePrice?.toString() || "",
        item.agreedPrice?.toString() || "",
        item.soldAmount?.toString() || "",
        item.deposit1 ? `${item.deposit1} (${item.deposit1Paid ? "Paid" : "Unpaid"})` : "",
        item.deposit2 ? `${item.deposit2} (${item.deposit2Paid ? "Paid" : "Unpaid"})` : "",
        item.measureDate || "",
        item.deliveryDate || "",
        item.stage,
        (item.job?.notes || item.customer.notes) || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales_pipeline.csv";
    a.click();
    URL.revokeObjectURL(url);
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

  const formatCurrency = (amount?: number | null) => (amount ? `£${amount.toLocaleString()}` : "N/A");
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Pipeline</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateJob}>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
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
          <div className="h-[calc(100vh-450px)] min-h-[600px] overflow-x-auto">
            <div className="flex flex-row items-start gap-4 h-full w-max">
              <KanbanProvider columns={columns} data={filteredFeatures} onDataChange={handleDataChange}>
                {(column) => (
                  <KanbanBoard
                    id={column.id}
                    key={column.id}
                    className="w-72 min-w-72 h-full flex flex-col"
                  >
                    <KanbanHeader className="flex-shrink-0 p-3 border-b bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} />
                        <span className="font-medium text-sm">{column.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {counts[column.id] ?? 0}
                        </Badge>
                        <div className="ml-auto text-xs text-muted-foreground">
                          {formatCurrency(kpis.stageValues[column.name])}
                        </div>
                      </div>
                    </KanbanHeader>

                    <KanbanCards id={column.id} className="flex-1 overflow-y-auto p-3 space-y-3">
                      {(feature: any) => (
                        <KanbanCard
                          column={column.id}
                          id={feature.kanbanId}
                          key={feature.kanbanId}
                          name={feature.name}
                          className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-grab p-3"
                        >
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm truncate">{feature.reference}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <button
                                    className="truncate hover:underline cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenCustomer(feature.customer.id);
                                    }}
                                    title="View Customer Details"
                                  >
                                    {feature.customer.name}
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 ml-2">
                                {feature.jobType && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {feature.jobType}
                                  </Badge>
                                )}
                                <Badge 
                                  variant={feature.itemType === 'customer' ? 'secondary' : 'default'} 
                                  className="text-xs flex-shrink-0"
                                >
                                  {feature.itemType === 'customer' ? 'Customer' : 'Job'}
                                </Badge>
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
                                  <span className="truncate">Quote: {formatCurrency(feature.quotePrice)}</span>
                                </div>
                              )}
                              {/* Only show agreed price if it exists */}
                              {feature.agreedPrice && (
                                <div className="flex items-center gap-2">
                                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  <span className="truncate">Agreed: {formatCurrency(feature.agreedPrice)}</span>
                                </div>
                              )}
                              {/* Only show sold amount if it exists */}
                              {feature.soldAmount && (
                                <div className="flex items-center gap-2">
                                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  <span className="truncate">Sold: {formatCurrency(feature.soldAmount)}</span>
                                </div>
                              )}
                              {/* Only show deposit 1 if it exists */}
                              {feature.deposit1 && (
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`h-2 w-2 rounded-full flex-shrink-0 ${feature.deposit1Paid ? "bg-green-500" : "bg-red-500"}`}
                                  />
                                  <span className="truncate">
                                    Dep1: {formatCurrency(feature.deposit1)} ({feature.deposit1Paid ? "Paid" : "Pending"})
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
                                    Dep2: {formatCurrency(feature.deposit2)} ({feature.deposit2Paid ? "Paid" : "Pending"})
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
                              {/* Contact status indicator */}
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                                  feature.customer.contact_made === 'Yes' ? 'bg-green-500' : 
                                  feature.customer.contact_made === 'No' ? 'bg-red-500' : 
                                  'bg-yellow-500'
                                }`} />
                                <span className="truncate">Contact: {feature.customer.contact_made}</span>
                              </div>
                            </div>

                            {/* Comments - show customer notes or job notes */}
                            {(feature.customer.notes || (feature.job && feature.job.notes)) && (
                              <div className="text-xs bg-gray-50 p-2 rounded border">
                                <p className="text-gray-600 italic leading-relaxed line-clamp-3">
                                  {feature.job?.notes || feature.customer.notes}
                                </p>
                              </div>
                            )}

                            {/* Quick Actions - conditional based on item type and stage */}
                            <div className="flex gap-1 pt-2 border-t border-gray-100">
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
                              {(feature.stage === 'Measure' || feature.stage === 'Installation' || feature.stage === 'Delivery') && (
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
                              
                              {/* Mark accepted - only show if not already accepted */}
                              {feature.stage !== "Accepted" && feature.stage !== "Complete" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1 text-xs flex-1 hover:bg-green-100 hover:text-green-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditDialog({ 
                                      open: true, 
                                      itemId: feature.itemId, 
                                      newStage: "Accepted",
                                      itemType: feature.itemType
                                    });
                                  }}
                                  title="Mark Accepted"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </KanbanCard>
                      )}
                    </KanbanCards>
                  </KanbanBoard>
                )}
              </KanbanProvider>
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
            {filteredItems.map((item) => (
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
                  <div>{item.quotePrice ? formatCurrency(item.quotePrice) : '-'}</div>
                  <div>{item.soldAmount ? formatCurrency(item.soldAmount) : '-'}</div>
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
                        {(item.stage === 'Measure' || item.stage === 'Installation' || item.stage === 'Delivery') && (
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
                              <span>Deposit 1: {formatCurrency(item.deposit1)}</span>
                              <span className={item.deposit1Paid ? "text-green-600" : "text-red-600"}>
                                ({item.deposit1Paid ? "Paid" : "Unpaid"})
                              </span>
                            </div>
                          )}
                          {item.deposit2 && (
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${item.deposit2Paid ? "bg-green-500" : "bg-red-500"}`}
                              />
                              <span>Deposit 2: {formatCurrency(item.deposit2)}</span>
                              <span className={item.deposit2Paid ? "text-green-600" : "text-red-600"}>
                                ({item.deposit2Paid ? "Paid" : "Unpaid"})
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
            {filteredItems.length === 0 && (
              <Card className="p-8 text-center">
                <div className="text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No items found</h3>
                  <p>Try adjusting your search criteria or filters.</p>
                  <div className="mt-4 space-x-2">
                    <Button variant="outline" size="sm" onClick={handleCreateCustomer}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Customer
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCreateJob}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Job
                    </Button>
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
              Are you sure you want to change the {editDialog.itemType} stage to {editDialog.newStage}?
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