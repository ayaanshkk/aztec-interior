"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, ChevronDown, Filter, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { CreateCustomerModal } from "@/components/ui/CreateCustomerModal";
import { useAuth } from "@/contexts/AuthContext";

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
  | "OnHold"
  | "Production"
  | "Delivery"
  | "Installation"
  | "Complete"
  | "Remedial"
  | "Cancelled";

type ProjectType = "Bedroom" | "Kitchen" | "Other";

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
  notes: string;
  created_at: string;
  created_by: string;
  salesperson?: string;
  project_types?: ProjectType[];
  form_count?: number;
  drawing_count?: number;
  form_document_count?: number;
  has_drawings?: boolean;
  has_forms?: boolean;
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
    case "OnHold":
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<JobStage | "All">("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  // Fetch customers initially
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on user role
  useEffect(() => {
    if (user?.role === "Sales") {
      const filteredData = allCustomers.filter((customer: Customer) => {
        const matchesCreatedBy = customer.created_by === String(user.id);
        const matchesSalesperson = customer.salesperson === user.name;
        return matchesCreatedBy || matchesSalesperson;
      });

      if (filteredData.length === 0 && allCustomers.length > 0) {
        console.warn("No customers match Sales filter. Showing all temporarily.");
        setCustomers(allCustomers);
      } else {
        setCustomers(filteredData);
      }
    } else {
      setCustomers(allCustomers);
    }
  }, [user, allCustomers]);

  // ---------------- Fetch Customers (OPTIMIZED) ----------------
  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      
      const response = await fetch("https://aztec-interiors.onrender.com/customers", {
        headers,
      });

      if (!response.ok) throw new Error("Failed to fetch customers");

      const data = await response.json();
      
      // Map the data directly - backend now includes document counts
      const customersWithDocs = data.map((c: any) => {
        const customer: Customer = {
          ...c,
          postcode: c.postcode || c.post_code || "",
          salesperson: c.salesperson || "",
          project_types: Array.isArray(c.project_types) ? c.project_types : [],
          stage: c.stage || c.status || "Lead",
          // Backend now provides these
          has_drawings: c.has_drawings || c.drawing_count > 0,
          has_forms: c.has_forms || (c.form_count > 0 || c.form_document_count > 0),
          form_count: c.form_count || 0,
          drawing_count: c.drawing_count || 0,
          form_document_count: c.form_document_count || 0,
        };
        
        return customer;
      });

      console.log("Customers loaded:", customersWithDocs.length);
      setAllCustomers(customersWithDocs);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setAllCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- Filtering ----------------
  const filteredCustomers = customers.filter((customer) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (customer.name || "").toLowerCase().includes(term) ||
      (customer.address || "").toLowerCase().includes(term) ||
      (customer.email || "").toLowerCase().includes(term) ||
      (customer.phone || "").toLowerCase().includes(term) ||
      (customer.postcode || "").toLowerCase().includes(term);

    const matchesStage = stageFilter === "All" || customer.stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  // ---------------- Permissions ----------------
  const canEditCustomer = (customer: Customer): boolean => {
    if (user?.role === "Manager" || user?.role === "HR") return true;
    if (user?.role === "Sales") {
      return customer.created_by === String(user.id) || customer.salesperson === user.name;
    }
    return false;
  };

  const canDeleteCustomer = (customer: Customer): boolean =>
    user?.role === "Manager" || user?.role === "HR";

  // ---------------- Delete Customer ----------------
  const deleteCustomer = async (id: string) => {
    const target = customers.find((c) => c.id === id);
    if (!target || !canDeleteCustomer(target)) {
      alert("You don't have permission to delete customers.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this customer?")) return;

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`https://aztec-interiors.onrender.com/customers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete customer");

      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setAllCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting customer");
    }
  };

  // ---------------- UI ----------------
  const uniqueStages = Array.from(new Set(customers.map((c) => c.stage)));

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
                <DropdownMenuItem key={stage} onClick={() => setStageFilter(stage)}>
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
                {["Name", "Phone", "Email", "Address", "Postcode", "Stage"].map((h) => (
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
              {filteredCustomers.map((customer) => {
                // Check if customer has any documents or form submissions
                const hasFormSubmissions = customer.has_forms || (customer.form_count && customer.form_count > 0);
                const hasDrawings = customer.has_drawings || (customer.drawing_count && customer.drawing_count > 0);
                
                // Customer needs attention if they have NO forms AND NO drawings
                const needsAttention = !hasFormSubmissions && !hasDrawings;

                return (
                  <tr
                    key={customer.id}
                    onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                    className={`cursor-pointer hover:bg-gray-50 ${needsAttention ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      <div className="flex items-center space-x-2">
                        {needsAttention && (
                          <div title="No drawings or checklists uploaded" className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loading and Empty States */}
      {isLoading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-gray-600"></div>
          <p className="mt-4 text-gray-500">Loading customers...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <p className="text-lg">No customers found.</p>
          {user?.role === "Sales" && (
            <p className="mt-2 text-sm">Create your first customer to get started!</p>
          )}
        </div>
      ) : null}

      {showCreateModal && (
        <CreateCustomerModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCustomerCreated={fetchCustomers}
        />
      )}
    </div>
  );
}