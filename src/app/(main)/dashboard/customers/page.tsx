"use client";
import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, ChevronDown, Filter } from "lucide-react";
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
}

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<JobStage | "All">("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Filter customers when user data loads or changes
    if (user?.role === "Sales") {
      console.log("Current user:", user);
      console.log("All customers:", allCustomers);

      const filteredData = allCustomers.filter((customer: Customer) => {
        const matchesCreatedBy = customer.created_by === String(user.id);
        const matchesSalesperson = customer.salesperson === user.name;

        console.log(`Customer ${customer.name}:`, {
          created_by: customer.created_by,
          salesperson: customer.salesperson,
          matchesCreatedBy,
          matchesSalesperson,
        });

        return matchesCreatedBy || matchesSalesperson;
      });

      console.log("Filtered customers for Sales:", filteredData);

      // TEMPORARY: If no customers match, show all customers
      // Remove this after fixing the data
      if (filteredData.length === 0 && allCustomers.length > 0) {
        console.warn("No customers match Sales filter. Showing all customers temporarily.");
        setCustomers(allCustomers);
      } else {
        setCustomers(filteredData);
      }
    } else {
      console.log("Non-sales user, showing all customers");
      setCustomers(allCustomers);
    }
  }, [user, allCustomers]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("https://aztec-interiors.onrender.com/customers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // FIX: Ensure 'postcode' is the definitive key used in the frontend object structure.
        const normalised = data.map((c: any) => ({
          ...c,
          // Use 'postcode' if present, otherwise fallback to 'post_code', otherwise empty string.
          // This overrides any post_code property to ensure consistency with the interface.
          postcode: c.postcode || c.post_code || "",
          
          // Ensure stage is consistently named
          stage: c.stage || c.status || 'Lead'
        }));

        console.log("Raw API Response:", data);
        console.log("Normalised customers:", normalised);
        setAllCustomers(normalised);
      } else {
        console.error("Failed to fetch customers:", response.status);
        setAllCustomers([]);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      setAllCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      (customer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      // The postcode search filtering logic is correct here
      (customer.postcode || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = stageFilter === "All" || customer.stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  const canEditCustomer = (customer: Customer): boolean => {
    if (user?.role === "Manager" || user?.role === "HR") return true;
    if (user?.role === "Sales") {
      return customer.created_by === String(user.id) || customer.salesperson === user.name;
    }
    return false;
  };

  const canDeleteCustomer = (customer: Customer): boolean => {
    // Only Manager and HR can delete customers
    return user?.role === "Manager" || user?.role === "HR";
  };

  const deleteCustomer = async (id: string) => {
    // NOTE: Cannot use window.confirm, using custom modal/alert replacement is preferred.
    // For now, retaining the error-prone 'confirm' until a dedicated UI is implemented.
    if (!canDeleteCustomer(customers.find((c) => c.id === id)!)) {
      alert("You don't have permission to delete customers.");
      return;
    }

    // Replace with custom modal/dialog in a real app
    if (!window.confirm("Are you sure you want to delete this customer?")) return;

    try {
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`https://aztec-interiors.onrender.com/customers/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete customer");
      setCustomers(customers.filter((c) => c.id !== id));
      setAllCustomers(allCustomers.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting customer");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const uniqueStages = Array.from(new Set(customers.map((c) => c.stage)));

  return (
    <div className="w-full p-6">
      <h1 className="mb-6 text-3xl font-bold">{user?.role === "Sales" ? "My Customers" : "Customers"}</h1>

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
              <DropdownMenuItem onClick={() => setStageFilter("All")}>All Stages</DropdownMenuItem>
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

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Postcode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Stage
                </th>
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
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{customer.email || "—"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <div className="text-sm text-gray-900">{customer.address}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* The display logic is correct: show postcode or '—' */}
                    <div className="text-sm text-gray-900">{customer.postcode || "—"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStageColor(customer.stage)}`}
                    >
                      {customer.stage}
                    </span>
                  </td>
                  {(user?.role === "Manager" || user?.role === "HR") && (
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">{customer.salesperson || "—"}</td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {customer.project_types && customer.project_types.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {customer.project_types.map((type, index) => (
                          <span
                            key={index}
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getProjectTypeColor(type)}`}
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
                    <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                      <div className="flex gap-2">
                        {canEditCustomer(customer) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/customers/${customer.id}/edit`);
                            }}
                            title="Edit customer"
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
                            title="Delete customer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-gray-600"></div>
          <p className="mt-4 text-gray-500">Loading customers...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <p className="text-lg">No customers found.</p>
          {user?.role === "Sales" && <p className="mt-2 text-sm">Create your first customer to get started!</p>}
        </div>
      ) : null}

      <CreateCustomerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCustomerCreated={fetchCustomers}
      />
    </div>
  );
}