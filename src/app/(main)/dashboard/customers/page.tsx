"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, Plus, Edit, Trash2, ChevronDown, Filter, AlertCircle, Clock, FolderOpen, ChevronRight, ChevronLeft, ChevronLast, ChevronFirst, Save, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation"; 
import { CreateCustomerModal } from "@/components/ui/CreateCustomerModal";
// import { CustomerProjectTimeline } from "@/components/materials/CustomerProjectTimeline";
import { useAuth } from "@/contexts/AuthContext";
import { BACKEND_URL } from "@/lib/api";

// ---------------- Constants ----------------
const CUSTOMERS_PER_PAGE = 25;

// All sales pipeline stages
const SALES_STAGES = [
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
];

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
  | "Ordered"
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
  assigned_employee_id?: string;
}

interface Salesperson {
  id: string;
  name: string;
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
    case "Ordered":
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
  const [salespersonFilter, setSalespersonFilter] = useState<string>("All");
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Timeline modal state
  // const [showTimelineModal, setShowTimelineModal] = useState(false);
  // const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  // const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");

  // Project breakdown state
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [customerProjects, setCustomerProjects] = useState<Record<string, Project[]>>({});
  const [loadingProjects, setLoadingProjects] = useState<Record<string, boolean>>({});

  // Inline editing state
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({});

  const router = useRouter();
  const { user } = useAuth();

  // Fetch customers and salespeople initially
  useEffect(() => {
    fetchCustomers();
    fetchSalespeople();
  }, []);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stageFilter, salespersonFilter, projectTypeFilter]);

  // ---------------- Fetch Customers ----------------
  const fetchCustomers = async () => {
    setIsLoading(true);
    const startTime = performance.now();
    
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };

      console.log("Fetching customers from:", `${BACKEND_URL}/customers`);
      
      const response = await fetch(`${BACKEND_URL}/customers`, {
        headers,
      });

      if (!response.ok) {
        console.error(`Customers API returned ${response.status}`);
        throw new Error(`Failed to fetch customers: ${response.status}`);
      }

      const data = await response.json();

      console.log(`Customers received: ${data.length} customers`);

      // Map the data
      const customersWithData = data.map((c: any) => {
        const customer: Customer = {
          ...c,
          postcode: c.postcode || c.post_code || "",
          salesperson: c.salesperson || "",
          project_types: Array.isArray(c.project_types) ? c.project_types : [],
          stage: c.stage || c.status || "Lead",
          project_count: Number(c.project_count) || 0,
          form_submissions: c.form_submissions || [],
          updated_at: c.updated_at || c.created_at,
          // ✅ REMOVED: display_id line
        };

        return customer;
      });

      setAllCustomers(customersWithData);

      const endTime = performance.now();
      console.log(`Page loaded in ${((endTime - startTime) / 1000).toFixed(2)}s`);

    } catch (err) {
      console.error("Error fetching customers:", err);
      setAllCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- Fetch Salespeople ----------------
  const fetchSalespeople = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/salespeople`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSalespeople(data);
      }
    } catch (err) {
      console.error("Error fetching salespeople:", err);
    }
  };

  // ---------------- Fetch Customer Projects ----------------
  const fetchCustomerProjects = async (customerId: string) => {
    if (customerProjects[customerId]) {
      return;
    }

    setLoadingProjects(prev => ({ ...prev, [customerId]: true }));

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKEND_URL}/customers/${customerId}/projects`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch projects");

      const data = await response.json();
      const projects = data.projects || [];

      setCustomerProjects(prev => ({ ...prev, [customerId]: projects }));
    } catch (err) {
      console.error("Error fetching customer projects:", err);
      setCustomerProjects(prev => ({ ...prev, [customerId]: [] }));
    } finally {
      setLoadingProjects(prev => ({ ...prev, [customerId]: false }));
    }
  };

  // ---------------- Toggle Project Breakdown ----------------
  const toggleProjectBreakdown = async (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
    } else {
      setExpandedCustomerId(customerId);
      await fetchCustomerProjects(customerId);
    }
  };

  // ---------------- Update Customer Stage (Syncs with Sales Pipeline) ----------------
  const updateCustomerStage = async (customerId: string, newStage: JobStage) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/customers/${customerId}/stage`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!response.ok) throw new Error("Failed to update stage");

      // Update local state
      setAllCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, stage: newStage, updated_at: new Date().toISOString() } : c
        )
      );

      console.log(`✅ Customer ${customerId} stage updated to ${newStage}`);
    } catch (err) {
      console.error("Error updating stage:", err);
      alert("Failed to update stage");
    }
  };

  // ✅ STEP 1: Apply role-based filtering FIRST
  const roleFilteredCustomers = useMemo(() => {
      if (user?.role === "Salesperson") {
          const filtered = allCustomers.filter((customer: Customer) => {
              // Match by assigned_employee_id instead of created_by
              const customerAssignedId = String(customer.assigned_employee_id || "").trim();
              const userId = String(user.id || "").trim();
              const matchesAssignedId = customerAssignedId === userId;
              
              const customerSalesperson = String(customer.salesperson || "").trim();
              const userName = String(user.employee_name || "").trim();
              const matchesSalesperson = customerSalesperson.toLowerCase() === userName.toLowerCase();
              
              return matchesAssignedId || matchesSalesperson;
          });
          
          return filtered;
      }
      
      return allCustomers;
  }, [allCustomers, user]);

  // ✅ STEP 2: Sort with Accepted stage first, then by created_at DESC (latest first)
  const sortedCustomers = useMemo(() => {
    const sorted = [...roleFilteredCustomers].sort((a, b) => {
      // Latest created_at first (descending) - NEWEST ON TOP
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      
      return bDate - aDate;  // Newest first
    });

    console.log('Sorted customers (top 5):', sorted.slice(0, 5).map(c => ({
      name: c.name,
      created_at: c.created_at,
      stage: c.stage
    })));

    return sorted;
  }, [roleFilteredCustomers]);

  // ✅ STEP 3: Apply search and ALL filters
  const filteredCustomers = useMemo(() => {
    return sortedCustomers.filter((customer) => {
      // Search filter
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (customer.name || "").toLowerCase().includes(term) ||
        (customer.address || "").toLowerCase().includes(term) ||
        // (customer.email || "").toLowerCase().includes(term) ||
        (customer.phone || "").toLowerCase().includes(term) ||
        (customer.postcode || "").toLowerCase().includes(term);

      // Stage filter
      const customerStageLower = (customer.stage || "").trim().toLowerCase();
      const stageFilterLower = (stageFilter === "All" ? "All" : stageFilter).toLowerCase();
      const matchesStage = stageFilterLower === "all" || customerStageLower === stageFilterLower;

      // Salesperson filter
      const matchesSalesperson =
        salespersonFilter === "All" ||
        (customer.salesperson || "").toLowerCase() === salespersonFilter.toLowerCase();

      // Project type filter
      const matchesProjectType =
        projectTypeFilter === "All" ||
        (customer.project_types && customer.project_types.includes(projectTypeFilter as ProjectType));

      return matchesSearch && matchesStage && matchesSalesperson && matchesProjectType;
    });
  }, [sortedCustomers, searchTerm, stageFilter, salespersonFilter, projectTypeFilter]);

  // ---------------- Pagination Calculations ----------------
  const totalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
    const endIndex = startIndex + CUSTOMERS_PER_PAGE;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, currentPage]);

  // ---------------- Permissions ----------------
  const canEditCustomer = (customer: Customer): boolean => {
      if (user?.role === "Platform Admin") return true;
      if (user?.role === "Salesperson") {
          // Use assigned_employee_id instead of created_by
          const customerAssignedId = String(customer.assigned_employee_id || "").trim();
          const userId = String(user.id || "").trim();
          const customerSalesperson = String(customer.salesperson || "").trim().toLowerCase();
          const userName = String(user.employee_name || "").trim().toLowerCase();
          return customerAssignedId === userId || customerSalesperson === userName;
      }
      return false;
  };

  const canDeleteCustomer = (customer: Customer): boolean =>
    user?.role === "Platform Admin";

  // const canViewTimeline = (): boolean => {
  //   return user?.role === "Platform Admin" || user?.role === "Production Team";
  // };

  const isCustomerInAcceptedStage = (customer: Customer): boolean => {
    return (customer.stage || "").trim().toLowerCase() === "accepted";
  };

  // ---------------- Inline Editing Functions ----------------
  const startEditing = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomerId(customer.id);
    setEditFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      postcode: customer.postcode,
    });
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomerId(null);
    setEditFormData({});
  };

  const saveCustomer = async (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/customers/${customerId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) throw new Error("Failed to update customer");

      // Update local state
      setAllCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, ...editFormData } : c
        )
      );

      setEditingCustomerId(null);
      setEditFormData({});

      console.log(`✅ Customer ${customerId} updated successfully`);
    } catch (err) {
      console.error("Error updating customer:", err);
      alert("Failed to update customer");
    }
  };

  // ---------------- Delete Customer ----------------
  const deleteCustomer = async (id: string) => {
    const target = allCustomers.find((c) => c.id === id);
    if (!target || !canDeleteCustomer(target)) {
      alert("You don't have permission to delete customers.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this customer?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/customers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete customer");

      setAllCustomers((prev) => prev.filter((c) => c.id !== id));
      
      if (paginatedCustomers.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting customer");
    }
  };

  // ---------------- Open Timeline Modal ----------------
  // const openTimelineModal = (customerId: string, customerName: string, e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   setSelectedCustomerId(customerId);
  //   setSelectedCustomerName(customerName);
  //   setShowTimelineModal(true);
  // };

  // ---------------- UI ----------------
  const uniqueStages = Array.from(new Set(sortedCustomers.map((c) => c.stage)));
  const uniqueProjectTypes = Array.from(
    new Set(
      sortedCustomers.flatMap((c) => c.project_types || [])
    )
  );

  // Pagination Component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 border-t">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{(currentPage - 1) * CUSTOMERS_PER_PAGE + 1}</span> to{" "}
          <span className="font-medium">
            {Math.min(currentPage * CUSTOMERS_PER_PAGE, filteredCustomers.length)}
          </span>{" "}
          of <span className="font-medium">{filteredCustomers.length}</span> customers
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
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

  // ✅ Serial number with 01, 02, 03 format
  const getSerialNumber = (index: number) => {
    // Calculate total number of customers in the filtered list
    const totalCustomers = filteredCustomers.length;
    
    // Current position in paginated view
    const currentPosition = (currentPage - 1) * CUSTOMERS_PER_PAGE + index;
    
    // Reverse the numbering: total - position
    const reverseNumber = totalCustomers - currentPosition;
    
    return reverseNumber.toString().padStart(3, '0');
  };

  return (
    <div className="w-full p-6">
      <h1 className="mb-6 text-3xl font-bold">
        {user?.role === "Salesperson" ? "My Customers" : "Customers"}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                {salespersonFilter === "All" ? "All Salespeople" : salespersonFilter}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSalespersonFilter("All")}>
                All Salespeople
              </DropdownMenuItem>
              {salespeople.map((sp) => (
                <DropdownMenuItem key={sp.id} onClick={() => setSalespersonFilter(sp.name)}>
                  {sp.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                {projectTypeFilter === "All" ? "All Project Types" : projectTypeFilter}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setProjectTypeFilter("All")}>
                All Project Types
              </DropdownMenuItem>
              {uniqueProjectTypes.map((type) => (
                <DropdownMenuItem key={type} onClick={() => setProjectTypeFilter(type)}>
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {user?.role !== "Production Team" && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Customer Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-12">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Phone
                </th>
                {/* <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Email
                </th> */}
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Address
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-24">
                  Postcode
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-28">
                  Stage
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-20">
                  Projects
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Salesperson
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-24">
                  Types
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-20">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-gray-600"></div>
                    <p className="mt-4 text-gray-500">Loading customers...</p>
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">  
                    <p className="text-lg">No customers found.</p>
                    {user?.role === "Salesperson" && (
                      <p className="mt-2 text-sm">Create your first customer to get started!</p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer, index) => {
                  const isExpanded = expandedCustomerId === customer.id;
                  const projects = customerProjects[customer.id] || [];
                  const isAccepted = isCustomerInAcceptedStage(customer);
                  const isEditing = editingCustomerId === customer.id;

                  return (
                    <React.Fragment key={customer.id}>
                      <tr
                        onClick={() => !isEditing && router.push(`/dashboard/customers/${customer.id}`)}
                        className={`${!isEditing ? 'cursor-pointer' : ''} hover:bg-gray-50 transition-colors ${
                          !customer.has_documents ? 'bg-red-50' : ''
                        } ${isAccepted ? 'bg-purple-50' : ''}`}
                      >
                        {/* Serial Number */}
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {getSerialNumber(index)}
                        </td>

                        {/* Name */}
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                          {isEditing ? (
                            <Input
                              value={editFormData.name || ""}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, name: e.target.value })
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-full"
                            />
                          ) : (
                            <div className="flex items-center space-x-2">
                              {!customer.has_documents && (
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" title="No documents" />
                              )}
                              {isAccepted && (
                                <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse" title="Accepted stage" />
                              )}
                              <span>{customer.name}</span>
                            </div>
                          )}
                        </td>

                        {/* Phone */}
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <Input
                              value={editFormData.phone || ""}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, phone: e.target.value })
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-full"
                            />
                          ) : (
                            customer.phone
                          )}
                        </td>

                        {/* Email */}
                        {/* <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {isEditing ? (
                            <Input
                              value={editFormData.email || ""}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, email: e.target.value })
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-full"
                            />
                          ) : (
                            customer.email || "—"
                          )}
                        </td> */}

                        {/* Address */}
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {isEditing ? (
                            <Input
                              value={editFormData.address || ""}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, address: e.target.value })
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-full"
                            />
                          ) : (
                            customer.address
                          )}
                        </td>

                        {/* Postcode */}
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <Input
                              value={editFormData.postcode || ""}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, postcode: e.target.value })
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-full"
                            />
                          ) : (
                            customer.postcode || "—"
                          )}
                        </td>

                        {/* Stage - Dropdown */}
                        <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={customer.stage}
                            onValueChange={(value) => updateCustomerStage(customer.id, value as JobStage)}
                            disabled={isEditing}
                          >
                            <SelectTrigger className={`w-full ${getStageColor(customer.stage)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SALES_STAGES.map((stage) => (
                                <SelectItem key={stage} value={stage}>
                                  {stage}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Projects */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {customer.project_count > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  onClick={(e) => toggleProjectBreakdown(customer.id, e)}
                                  className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                  disabled={isEditing}
                                >
                                  <FolderOpen className="w-4 h-4 text-gray-600" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {customer.project_count}
                                  </span>
                                  {customer.project_count > 1 && (
                                    <ChevronRight
                                      className={`w-4 h-4 text-gray-400 transition-transform ${
                                        isExpanded ? 'rotate-90' : ''
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
                                                Created {new Date(project.created_at).toLocaleDateString()}
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

                        <td className="px-3 py-2 text-sm text-gray-900">
                          {customer.salesperson || "—"}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap">
                          {customer.project_types && customer.project_types.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {customer.project_types.map((type, idx) => (
                                <span
                                  key={idx}
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

                        {/* Actions */}
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="flex gap-2 justify-end">
                            {/* {canViewTimeline() && isAccepted && !isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => openTimelineModal(customer.id, customer.name, e)}
                                title="View Project Timeline"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            )} */}

                            {canEditCustomer(customer) && (
                              <>
                                {isEditing ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => saveCustomer(customer.id, e)}
                                      title="Save"
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={cancelEditing}
                                      title="Cancel"
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => startEditing(customer, e)}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                            
                            {canDeleteCustomer(customer) && !isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCustomer(customer.id);
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredCustomers.length > 0 && <PaginationControls />}
      </div>

      {showCreateModal && (
        <CreateCustomerModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCustomerCreated={fetchCustomers}
        />
      )}

      {/* <Dialog open={showTimelineModal} onOpenChange={setShowTimelineModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Timeline - {selectedCustomerName}</DialogTitle>
          </DialogHeader>
          {selectedCustomerId && (
            <CustomerProjectTimeline customerId={selectedCustomerId} />
          )}
        </DialogContent>
      </Dialog> */}
    </div>
  );
}