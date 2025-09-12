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

// Job stages enum to match your backend
type JobStage = 
  | 'Lead' 
  | 'Quote' 
  | 'Consultation' 
  | 'Survey' 
  | 'Measure' 
  | 'Design' 
  | 'Quoted' 
  | 'Accepted'
  | 'OnHold' 
  | 'Production' 
  | 'Delivery' 
  | 'Installation' 
  | 'Complete' 
  | 'Remedial' 
  | 'Cancelled';

interface Customer {
  id: string;
  name: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  contact_made: 'Yes' | 'No' | 'Unknown';
  preferred_contact_method: 'Phone' | 'Email' | 'WhatsApp';
  marketing_opt_in: boolean;
  date_of_measure: string;
  status: string;
  stage: JobStage;
  notes: string;
  created_at: string;
  created_by: string;
  salesperson?: string;
  project_types?: string[]; // Changed from project_type to project_types array
}

// Helper function to get stage badge colors
const getStageColor = (stage: JobStage): string => {
  switch (stage) {
    case 'Lead':
      return 'bg-gray-100 text-gray-800';
    case 'Quote':
    case 'Consultation':
      return 'bg-blue-100 text-blue-800';
    case 'Survey':
    case 'Measure':
      return 'bg-yellow-100 text-yellow-800';
    case 'Design':
    case 'Quoted':
      return 'bg-orange-100 text-orange-800';
    case 'Accepted':
    case 'Production':
      return 'bg-purple-100 text-purple-800';
    case 'Delivery':
    case 'Installation':
      return 'bg-indigo-100 text-indigo-800';
    case 'Complete':
      return 'bg-green-100 text-green-800';
    case 'OnHold':
      return 'bg-gray-100 text-gray-600';
    case 'Remedial':
      return 'bg-red-100 text-red-800';
    case 'Cancelled':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<JobStage | 'All'>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  // Fetch customers from Flask API
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = () => {
    fetch("http://127.0.0.1:5000/customers")
      .then((res) => res.json())
      .then(setCustomers)
      .catch((err) => console.error("Error fetching customers:", err));
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      (customer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'All' || customer.stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  const deleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      const res = await fetch(`http://127.0.0.1:5000/customers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete customer");
      setCustomers(customers.filter(c => c.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting customer");
    }
  };

  const syncCustomerStage = async (id: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/customers/${id}/sync-stage`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to sync stage");
      fetchCustomers(); // Refresh data
    } catch (err) {
      console.error("Sync error:", err);
      alert("Error syncing customer stage");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Get unique stages for filter dropdown
  const uniqueStages = Array.from(new Set(customers.map(c => c.stage)));

  return (
    <div className="w-full p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-6">Customers</h1>
      
      {/* Controls */}
      <div className="flex justify-between mb-6">
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
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
                {stageFilter === 'All' ? 'All Stages' : stageFilter}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStageFilter('All')}>
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
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> 
          Add Customer
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesperson</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Types</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <div className="text-sm text-gray-900">{customer.address}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {customer.phone && (
                        <div className="text-sm text-gray-900">{customer.phone}</div>
                      )}
                      {customer.email && (
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(customer.stage)}`}>
                      {customer.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.salesperson || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {customer.project_types && customer.project_types.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {customer.project_types.map((type, index) => (
                          <span 
                            key={index}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              type === 'Kitchen' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-900">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/customers/${customer.id}/edit`);
                        }}
                        title="Edit customer"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCustomerCreated={fetchCustomers}
      />
    </div>
  );
}