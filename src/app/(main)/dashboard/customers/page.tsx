"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Plus, Edit, Trash2, ChevronDown, Filter, AlertCircle, Clock, FolderOpen, ChevronRight, ChevronLeft, ChevronLast, ChevronFirst } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { CreateCustomerModal } from "@/components/ui/CreateCustomerModal";
import { CustomerProjectTimeline } from "@/components/materials/CustomerProjectTimeline";
import { useAuth } from "@/contexts/AuthContext";
import { api, fetchParallel } from "@/lib/api"; // ✅ USE OPTIMIZED API

// ---------------- Constants ----------------
const CUSTOMERS_PER_PAGE = 25;
const IS_DEV = process.env.NODE_ENV === 'development';

// Dev-only logging
const log = (...args: any[]) => {
  if (IS_DEV) console.log(...args);
};

// ---------------- Types ----------------
type JobStage =
  | "Lead"
  | "Quote"
  | "Consultation"
  | "Survey"
  | "Measure"
  | "Design"
  | "Quoted"
  | "Accepted"
  | "Rejected"
  | "Production"
  | "Delivery"
  | "Installation"
  | "Complete"
  | "Remedial"
  | "Cancelled";

type ProjectType = "Bedroom" | "Kitchen" | "Other";

interface Project {
  id: string;
  project_name: string;
  stage: JobStage;
  quote_price?: number;
  deposit_amount?: number;
  balance_due?: number;
  expected_delivery_date?: string;
  created_at: string;
  updated_at: string;
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
  stage: JobStage;
  project_count: number;
  notes: string;
  created_at: string;
  created_by: string;
  salesperson?: string;
  project_types?: ProjectType[];
  form_submissions?: any[];
  projects?: Project[];
  drawing_count: number;
  form_count: number;
  form_document_count: number;
  total_documents: number;
  has_documents: boolean;
  updated_at?: string;
}

// ---------------- Utility functions ----------------
const getStageColor = (stage: JobStage): string => {
  switch (stage) {
    case "Lead":
      return "bg-gray-100 text-gray-800";
    case "Quote":
    case "Consultation":
      return "bg-blue-100 text-blue-800";
    case "Survey":
    case "Measure":
      return "bg-yellow-100 text-yellow-800";
    case "Design":
    case "Quoted":
      return "bg-orange-100 text-orange-800";
    case "Accepted":
    case "Production":
      return "bg-purple-100 text-purple-800";
    case "Delivery":
    case "Installation":
      return "bg-indigo-100 text-indigo-800";
    case "Complete":
      return "bg-green-100 text-green-800";
    case "Rejected":
      return "bg-gray-100 text-gray-600";
    case "Remedial":
      return "bg-red-100 text-red-800";
    case "Cancelled":
      return "bg-red-100 text-red-600";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getProjectTypeColor = (type: ProjectType): string => {
  switch (type) {
    case "Bedroom":
      return "bg-purple-100 text-purple-800";
    case "Kitchen":
      return "bg-blue-100 text-blue-800";
    case "Other":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// ---------------- Component ----------------
export default function CustomersPage() {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<JobStage | "All">("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Timeline modal state
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");

  // Project breakdown state
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [customerProjects, setCustomerProjects] = useState<Record<string, Project[]>>({});
  const [loadingProjects, setLoadingProjects] = useState<Record<string, boolean>>({});

  const router = useRouter();
  const { user } = useAuth();

  // ============================================================================
  // ✅ OPTIMIZED: Fetch customers using new API layer with caching
  // ============================================================================
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    const startTime = performance.now();

    try {
      log("🔄 Fetching customers with optimized API...");

      // ✅ USE OPTIMIZED API LAYER (includes caching, retry, deduplication)
      const data = await api.getCustomers();

      const customers = data.customers || data || [];
      log(`✅ Customers received: ${customers.length} customers`);

      // Map the data
      const customersWithData = customers.map((c: any) => {
        const customer: Customer = {
          ...c,
          postcode: c.postcode || c.post_code || "",
          salesperson: c.salesperson || "",
          project_types: Array.isArray(c.project_types) ? c.project_types : [],
          stage: c.stage || c.status || "Lead",
          project_count: Number(c.project_count) || 0,
          form_submissions: c.form_submissions || [],
          updated_at: c.updated_at || c.created_at,
        };

        return customer;
      });

      setAllCustomers(customersWithData);

      const endTime = performance.now();
      log(`⏱️ Page loaded in ${((endTime - startTime) / 1000).toFixed(2)}s`);

      // ✅ Prefetch projects for first 3 customers with multiple projects
      // (improves perceived performance when user expands them)
      const customersWithMultipleProjects = customersWithData
        .filter((c: Customer) => c.project_count > 1)
        .slice(0, 3);

      if (customersWithMultipleProjects.length > 0) {
        log(`🚀 Prefetching projects for ${customersWithMultipleProjects.length} customers...`);
        // Prefetch in background without blocking UI
        customersWithMultipleProjects.forEach((customer: Customer) => {
          prefetchCustomerProjects(customer.id);
        });
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      setAllCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // ✅ Empty deps - only create once

  // ============================================================================
  // ✅ OPTIMIZED: Prefetch projects (background, non-blocking)
  // ============================================================================
  const prefetchCustomerProjects = useCallback(async (customerId: string) => {
    if (customerProjects[customerId]) return;

    try {
      const data = await api.getCustomerProjects(customerId);
      const projects = data.projects || [];
      setCustomerProjects((prev) => ({ ...prev, [customerId]: projects }));
      log(`✅ Prefetched ${projects.length} projects for customer ${customerId}`);
    } catch (err) {
      // Silent fail for prefetch
      log(`⚠️ Prefetch failed for customer ${customerId}`);
    }
  }, [customerProjects]);

  // ============================================================================
  // ✅ OPTIMIZED: Fetch customer projects on-demand (with deduplication)
  // ============================================================================
  const fetchCustomerProjects = useCallback(async (customerId: string) => {
    if (customerProjects[customerId]) return;
    if (loadingProjects[customerId]) return;

    setLoadingProjects((prev) => ({ ...prev, [customerId]: true }));

    try {
      const data = await api.getCustomerProjects(customerId);
      const projects = data.projects || [];
      setCustomerProjects((prev) => ({ ...prev, [customerId]: projects }));
    } catch (err) {
      console.error("Error fetching customer projects:", err);
      setCustomerProjects((prev) => ({ ...prev, [customerId]: [] }));
    } finally {
      setLoadingProjects((prev) => ({ ...prev, [customerId]: false }));
    }
  }, [customerProjects, loadingProjects]);

  // ============================================================================
  // Initial fetch
  // ============================================================================
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stageFilter]);

  // ============================================================================
  // ✅ OPTIMIZED: Single-pass filtering with memoization
  // ============================================================================
  const processedCustomers = useMemo(() => {
    const startTime = performance.now();

    let result = [...allCustomers];

    // STEP 1: Role-based filtering
    if (user?.role === "Sales") {
      result = result.filter((customer) => {
        const customerCreatedBy = String(customer.created_by || "").trim();
        const userId = String(user.id || "").trim();
        const matchesCreatedBy = customerCreatedBy === userId;

        const customerSalesperson = String(customer.salesperson || "").trim();
        const userName = String(user.name || "").trim();
        const matchesSalesperson =
          customerSalesperson.toLowerCase() === userName.toLowerCase();

        return matchesCreatedBy || matchesSalesperson;
      });

      log(`✅ Sales filter: ${result.length} customers visible to ${user.name}`);
    }

    // STEP 2: Sort (Accepted first, then by date)
    result.sort((a, b) => {
      const aIsAccepted = (a.stage || "").trim().toLowerCase() === "accepted";
      const bIsAccepted = (b.stage || "").trim().toLowerCase() === "accepted";

      if (aIsAccepted && !bIsAccepted) return -1;
      if (!aIsAccepted && bIsAccepted) return 1;

      const aDate = new Date(a.updated_at || a.created_at).getTime();
      const bDate = new Date(b.updated_at || b.created_at).getTime();

      return bDate - aDate;
    });

    // STEP 3: Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((customer) => {
        return (
          (customer.name || "").toLowerCase().includes(term) ||
          (customer.address || "").toLowerCase().includes(term) ||
          (customer.email || "").toLowerCase().includes(term) ||
          (customer.phone || "").toLowerCase().includes(term) ||
          (customer.postcode || "").toLowerCase().includes(term)
        );
      });
    }

    // STEP 4: Stage filter
    if (stageFilter !== "All") {
      const stageFilterLower = stageFilter.toLowerCase();
      result = result.filter((customer) => {
        const customerStageLower = (customer.stage || "").trim().toLowerCase();
        return customerStageLower === stageFilterLower;
      });
    }

    const endTime = performance.now();
    log(`⚡ Filtered ${result.length} customers in ${(endTime - startTime).toFixed(2)}ms`);

    return result;
  }, [allCustomers, user, searchTerm, stageFilter]);

  // ============================================================================
  // ✅ OPTIMIZED: Pagination (memoized)
  // ============================================================================
  const totalPages = Math.ceil(processedCustomers.length / CUSTOMERS_PER_PAGE);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
    const endIndex = startIndex + CUSTOMERS_PER_PAGE;
    return processedCustomers.slice(startIndex, endIndex);
  }, [processedCustomers, currentPage]);

  // ============================================================================
  // ✅ OPTIMIZED: Unique stages (memoized)
  // ============================================================================
  const uniqueStages = useMemo(() => {
    return Array.from(new Set(processedCustomers.map((c) => c.stage)));
  }, [processedCustomers]);

  // ============================================================================
  // Toggle Project Breakdown
  // ============================================================================
  const toggleProjectBreakdown = useCallback(async (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
    } else {
      setExpandedCustomerId(customerId);
      await fetchCustomerProjects(customerId);
    }
  }, [expandedCustomerId, fetchCustomerProjects]);

  // ============================================================================
  // Permissions
  // ============================================================================
  const canEditCustomer = useCallback((customer: Customer): boolean => {
    if (user?.role === "Manager" || user?.role === "HR") return true;
    if (user?.role === "Sales") {
      const customerCreatedBy = String(customer.created_by || "").trim();
      const userId = String(user.id || "").trim();
      const customerSalesperson = String(customer.salesperson || "").trim().toLowerCase();
      const userName = String(user.name || "").trim().toLowerCase();
      return customerCreatedBy === userId || customerSalesperson === userName;
    }
    return false;
  }, [user]);

  const canDeleteCustomer = useCallback((customer: Customer): boolean => {
    return user?.role === "Manager" || user?.role === "HR";
  }, [user]);

  const canViewTimeline = useCallback((): boolean => {
    return user?.role === "Manager" || user?.role === "HR" || user?.role === "Production";
  }, [user]);

  const isCustomerInAcceptedStage = useCallback((customer: Customer): boolean => {
    return (customer.stage || "").trim().toLowerCase() === "accepted";
  }, []);

  // ============================================================================
  // ✅ OPTIMIZED: Delete Customer (with cache invalidation)
  // ============================================================================
  const deleteCustomer = useCallback(async (id: string) => {
    const target = allCustomers.find((c) => c.id === id);
    if (!target || !canDeleteCustomer(target)) {
      alert("You don't have permission to delete customers.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this customer?")) return;

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`https://aztec-interior.onrender.com/customers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete customer");

      // ✅ Update local state
      setAllCustomers((prev) => prev.filter((c) => c.id !== id));

      // ✅ Invalidate cache
      const { cacheUtils } = await import("@/lib/api");
      cacheUtils.invalidate("customers");

      // Adjust pagination if needed
      if (paginatedCustomers.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting customer");
    }
  }, [allCustomers, canDeleteCustomer, paginatedCustomers.length, currentPage]);

  // ============================================================================
  // Open Timeline Modal
  // ============================================================================
  const openTimelineModal = useCallback((customerId: string, customerName: string) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomerName(customerName);
    setShowTimelineModal(true);
  }, []);

  // ============================================================================
  // ✅ OPTIMIZED: Skeleton Loader Component
  // ============================================================================
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-40"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-48"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-8"></div>
      </td>
      {(user?.role === "Manager" || user?.role === "HR") && (
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </td>
      )}
      <td className="px-6 py-4">
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
      </td>
      {user?.role !== "Staff" && (
        <td className="px-6 py-4">
          <div className="flex gap-2 justify-end">
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
        </td>
      )}
    </tr>
  );

  // ============================================================================
  // Pagination Component
  // ============================================================================
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 border-t">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{(currentPage - 1) * CUSTOMERS_PER_PAGE + 1}</span> to{" "}
          <span className="font-medium">
            {Math.min(currentPage * CUSTOMERS_PER_PAGE, processedCustomers.length)}
          </span>{" "}
          of <span className="font-medium">{processedCustomers.length}</span> customers
        </div>
        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            title="First Page"
          >
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center px-3 text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            title="Last Page"
          >
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="w-full p-6">
      <h1 className="mb-6 text-3xl font-bold">
        {user?.role === "Sales" ? "My Customers" : "Customers"}
      </h1>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex justify-between">
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
            <Input
              placeholder="Search customers..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                {stageFilter === "All" ? "All Stages" : stageFilter}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStageFilter("All")}>
                All Stages
              </DropdownMenuItem>
              {uniqueStages.map((stage) => (
                <DropdownMenuItem key={stage} onClick={() => setStageFilter(stage as JobStage)}>
                  {stage}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {user?.role !== "Staff" && user?.role !== "Production" && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Customer Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Phone", "Email", "Address", "Postcode", "Stage", "Projects"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
                {(user?.role === "Manager" || user?.role === "HR") && (
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Salesperson
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Project Types
                </th>
                {user?.role !== "Staff" && (
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                // ✅ SKELETON LOADER instead of spinner
                <>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-lg">No customers found.</p>
                    {user?.role === "Sales" && (
                      <p className="mt-2 text-sm">Create your first customer to get started!</p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => {
                  const isExpanded = expandedCustomerId === customer.id;
                  const projects = customerProjects[customer.id] || [];
                  const isAccepted = isCustomerInAcceptedStage(customer);

                  return (
                    <React.Fragment key={customer.id}>
                      <tr
                        onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                        className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                          !customer.has_documents ? "bg-red-50" : ""
                        } ${isAccepted ? "bg-purple-50" : ""}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          <div className="flex items-center space-x-2">
                            {!customer.has_documents && (
                              <div
                                title={`No documents uploaded. Drawings: ${customer.drawing_count}, Forms: ${customer.form_count}, Form Documents: ${customer.form_document_count}`}
                                className="flex items-center"
                              >
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                              </div>
                            )}
                            {isAccepted && (
                              <div className="flex items-center" title="Customer in Accepted stage">
                                <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse" />
                              </div>
                            )}
                            <span>{customer.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.email || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.address}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.postcode || "—"}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStageColor(
                              customer.stage
                            )}`}
                          >
                            {customer.stage}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.project_count > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  onClick={(e) => toggleProjectBreakdown(customer.id, e)}
                                  className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                >
                                  <FolderOpen className="w-4 h-4 text-gray-600" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {customer.project_count}
                                  </span>
                                  {customer.project_count > 1 && (
                                    <ChevronRight
                                      className={`w-4 h-4 text-gray-400 transition-transform ${
                                        isExpanded ? "rotate-90" : ""
                                      }`}
                                    />
                                  )}
                                </button>
                              </PopoverTrigger>

                              {customer.project_count > 1 && (
                                <PopoverContent className="w-80" align="start">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm text-gray-900">
                                      Project Breakdown
                                    </h4>

                                    {loadingProjects[customer.id] ? (
                                      <div className="py-4 text-center text-sm text-gray-500">
                                        Loading projects...
                                      </div>
                                    ) : projects.length > 0 ? (
                                      <div className="space-y-2">
                                        {projects.map((project) => (
                                          <div
                                            key={project.id}
                                            className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                                          >
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-gray-900">
                                                {project.project_name}
                                              </p>
                                              <p className="text-xs text-gray-500">
                                                Created{" "}
                                                {new Date(project.created_at).toLocaleDateString()}
                                              </p>
                                            </div>
                                            <span
                                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStageColor(
                                                project.stage
                                              )}`}
                                            >
                                              {project.stage}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="py-4 text-center text-sm text-gray-500">
                                        No projects found
                                      </div>
                                    )}
                                  </div>
                                </PopoverContent>
                              )}
                            </Popover>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400">
                              <FolderOpen className="w-4 h-4" />
                              <span className="text-sm">0</span>
                            </div>
                          )}
                        </td>

                        {(user?.role === "Manager" || user?.role === "HR") && (
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {customer.salesperson || "—"}
                          </td>
                        )}

                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.project_types && customer.project_types.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {customer.project_types.map((type, index) => (
                                <span
                                  key={index}
                                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getProjectTypeColor(
                                    type
                                  )}`}
                                >
                                  {type}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>

                        {user?.role !== "Staff" && (
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex gap-2 justify-end">
                              {canViewTimeline() && isAccepted && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openTimelineModal(customer.id, customer.name);
                                  }}
                                  title="View Project Timeline & Materials (Accepted Stage)"
                                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                              )}

                              {canEditCustomer(customer) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/dashboard/customers/${customer.id}/edit`);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDeleteCustomer(customer) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCustomer(customer.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && processedCustomers.length > 0 && <PaginationControls />}
      </div>

      {showCreateModal && (
        <CreateCustomerModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCustomerCreated={fetchCustomers}
        />
      )}

      <Dialog open={showTimelineModal} onOpenChange={setShowTimelineModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Timeline - {selectedCustomerName}</DialogTitle>
          </DialogHeader>
          {selectedCustomerId && <CustomerProjectTimeline customerId={selectedCustomerId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}