// "use client";

// import React, { useState, useEffect, useMemo } from "react";
// import { Search, Plus, Edit, Trash2, ChevronDown, Filter, AlertCircle, Clock, FolderOpen, ChevronRight, ChevronLeft, ChevronLast, ChevronFirst } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { useRouter } from "next/navigation";
// import { CreateCustomerModal } from "@/components/ui/CreateCustomerModal";
// import { CustomerProjectTimeline } from "@/components/materials/CustomerProjectTimeline";
// import { useAuth } from "@/contexts/AuthContext";

// // ---------------- Constants ----------------
// const CUSTOMERS_PER_PAGE = 25;

// // ---------------- Types ----------------
// type JobStage =
//   | "Lead"
//   | "Quote"
//   | "Consultation"
//   | "Survey"
//   | "Measure"
//   | "Design"
//   | "Quoted"
//   | "Accepted"
//   | "Rejected"
//   | "Production"
//   | "Delivery"
//   | "Installation"
//   | "Complete"
//   | "Remedial"
//   | "Cancelled";

// type ProjectType = "Bedroom" | "Kitchen" | "Other";

// interface Project {
//   id: string;
//   project_name: string;
//   stage: JobStage;
//   quote_price?: number;
//   deposit_amount?: number;
//   balance_due?: number;
//   expected_delivery_date?: string;
//   created_at: string;
//   updated_at: string;
// }

// interface Customer {
//   id: string;
//   name: string;
//   address: string;
//   postcode: string;
//   phone: string;
//   email: string;
//   contact_made: "Yes" | "No" | "Unknown";
//   preferred_contact_method: "Phone" | "Email" | "WhatsApp";
//   marketing_opt_in: boolean;
//   date_of_measure: string;
//   status: string;
//   stage: JobStage;
//   project_count: number;
//   notes: string;
//   created_at: string;
//   created_by: string;
//   salesperson?: string;
//   project_types?: ProjectType[];
//   form_submissions?: any[];
//   projects?: Project[];
//   // Document counts from backend
//   drawing_count: number;
//   form_count: number;
//   form_document_count: number;
//   total_documents: number;
//   has_documents: boolean;
// }

// // ---------------- Utility functions ----------------
// const getStageColor = (stage: JobStage): string => {
//   switch (stage) {
//     case "Lead":
//       return "bg-gray-100 text-gray-800";
//     case "Quote":
//     case "Consultation":
//       return "bg-blue-100 text-blue-800";
//     case "Survey":
//     case "Measure":
//       return "bg-yellow-100 text-yellow-800";
//     case "Design":
//     case "Quoted":
//       return "bg-orange-100 text-orange-800";
//     case "Accepted":
//     case "Production":
//       return "bg-purple-100 text-purple-800";
//     case "Delivery":
//     case "Installation":
//       return "bg-indigo-100 text-indigo-800";
//     case "Complete":
//       return "bg-green-100 text-green-800";
//     case "Rejected":
//       return "bg-gray-100 text-gray-600";
//     case "Remedial":
//       return "bg-red-100 text-red-800";
//     case "Cancelled":
//       return "bg-red-100 text-red-600";
//     default:
//       return "bg-gray-100 text-gray-800";
//   }
// };

// const getProjectTypeColor = (type: ProjectType): string => {
//   switch (type) {
//     case "Bedroom":
//       return "bg-purple-100 text-purple-800";
//     case "Kitchen":
//       return "bg-blue-100 text-blue-800";
//     case "Other":
//       return "bg-gray-100 text-gray-800";
//     default:
//       return "bg-gray-100 text-gray-800";
//   }
// };

// // ---------------- Component ----------------
// export default function CustomersPage() {
//   const [customers, setCustomers] = useState<Customer[]>([]);
//   const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [stageFilter, setStageFilter] = useState<JobStage | "All">("All");
//   const [showCreateModal, setShowCreateModal] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);

//   // Pagination state
//   const [currentPage, setCurrentPage] = useState(1);

//   // Timeline modal state
//   const [showTimelineModal, setShowTimelineModal] = useState(false);
//   const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
//   const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");

//   // Project breakdown state
//   const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
//   const [customerProjects, setCustomerProjects] = useState<Record<string, Project[]>>({});
//   const [loadingProjects, setLoadingProjects] = useState<Record<string, boolean>>({});

//   const router = useRouter();
//   const { user } = useAuth();

//   // Fetch customers initially
//   useEffect(() => {
//     fetchCustomers();
//   }, []);

//   // Filter customers based on user role
//   useEffect(() => {
//     if (user?.role === "Sales") {
//       const filteredData = allCustomers.filter((customer: Customer) => {
//         const matchesCreatedBy = customer.created_by === String(user.id);
//         const matchesSalesperson = customer.salesperson === user.name;
//         return matchesCreatedBy || matchesSalesperson;
//       });

//       if (filteredData.length === 0 && allCustomers.length > 0) {
//         console.warn("No customers match Sales filter. Showing all temporarily.");
//         setCustomers(allCustomers);
//       } else {
//         setCustomers(filteredData);
//       }
//     } else {
//       setCustomers(allCustomers);
//     }
//   }, [user, allCustomers]);

//   // Reset page when filters/search change
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchTerm, stageFilter]);

//   // ---------------- Fetch Customers - OPTIMIZED ----------------
//   const fetchCustomers = async () => {
//     setIsLoading(true);
//     const startTime = performance.now();
    
//     try {
//       const token = localStorage.getItem("auth_token");
//       const headers: HeadersInit = { Authorization: `Bearer ${token}` };

//       console.log("🔄 Fetching customers...");
      
//       const response = await fetch("https://aztec-interiors.onrender.com/customers", {
//         headers,
//       });

//       if (!response.ok) throw new Error("Failed to fetch customers");

//       const data = await response.json();

//       console.log(`✅ Customers received: ${data.length} customers`);

//       // Map the data
//       const customersWithData = data.map((c: any) => {
//         const customer: Customer = {
//           ...c,
//           postcode: c.postcode || c.post_code || "",
//           salesperson: c.salesperson || "",
//           project_types: Array.isArray(c.project_types) ? c.project_types : [],
//           stage: c.stage || c.status || "Lead",
//           project_count: Number(c.project_count) || 0,
//           form_submissions: c.form_submissions || [],
//         };

//         return customer;
//       });

//       setAllCustomers(customersWithData);

//       const endTime = performance.now();
//       console.log(`⏱️ Page loaded in ${((endTime - startTime) / 1000).toFixed(2)}s`);

//       // ✅ OPTIMIZATION: Document checks removed
//       // Previously this made 2 API calls per customer (drawings + forms)
//       // For 100 customers = 200 API calls = 30+ seconds load time
//       // Now: Only 1 API call = instant load
//       // Document alerts will be shown on individual customer detail pages

//     } catch (err) {
//       console.error("Error fetching customers:", err);
//       setAllCustomers([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // ---------------- Fetch Customer Projects (for expansion) ----------------
//   const fetchCustomerProjects = async (customerId: string) => {
//     if (customerProjects[customerId]) {
//       return;
//     }

//     setLoadingProjects(prev => ({ ...prev, [customerId]: true }));

//     try {
//       const token = localStorage.getItem("auth_token");
//       const response = await fetch(
//         `https://aztec-interiors.onrender.com/customers/${customerId}/projects`,
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );

//       if (!response.ok) throw new Error("Failed to fetch projects");

//       const data = await response.json();
//       const projects = data.projects || [];

//       setCustomerProjects(prev => ({ ...prev, [customerId]: projects }));
//     } catch (err) {
//       console.error("Error fetching customer projects:", err);
//       setCustomerProjects(prev => ({ ...prev, [customerId]: [] }));
//     } finally {
//       setLoadingProjects(prev => ({ ...prev, [customerId]: false }));
//     }
//   };

//   // ---------------- Toggle Project Breakdown ----------------
//   const toggleProjectBreakdown = async (customerId: string, e: React.MouseEvent) => {
//     e.stopPropagation();

//     if (expandedCustomerId === customerId) {
//       setExpandedCustomerId(null);
//     } else {
//       setExpandedCustomerId(customerId);
//       await fetchCustomerProjects(customerId);
//     }
//   };

//   // ---------------- Filtering ----------------
//   const filteredCustomers = useMemo(() => {
//     return customers.filter((customer) => {
//       const term = searchTerm.toLowerCase();
//       const matchesSearch =
//         (customer.name || "").toLowerCase().includes(term) ||
//         (customer.address || "").toLowerCase().includes(term) ||
//         (customer.email || "").toLowerCase().includes(term) ||
//         (customer.phone || "").toLowerCase().includes(term) ||
//         (customer.postcode || "").toLowerCase().includes(term);

//       const matchesStage = stageFilter === "All" || customer.stage === stageFilter;

//       return matchesSearch && matchesStage;
//     });
//   }, [customers, searchTerm, stageFilter]);

//   // ---------------- Pagination Calculations ----------------
//   const totalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);

//   const paginatedCustomers = useMemo(() => {
//     const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
//     const endIndex = startIndex + CUSTOMERS_PER_PAGE;
//     return filteredCustomers.slice(startIndex, endIndex);
//   }, [filteredCustomers, currentPage]);

//   // ---------------- Permissions ----------------
//   const canEditCustomer = (customer: Customer): boolean => {
//     if (user?.role === "Manager" || user?.role === "HR") return true;
//     if (user?.role === "Sales") {
//       return customer.created_by === String(user.id) || customer.salesperson === user.name;
//     }
//     return false;
//   };

//   const canDeleteCustomer = (customer: Customer): boolean =>
//     user?.role === "Manager" || user?.role === "HR";

//   const canViewTimeline = (): boolean => {
//     return user?.role === "Manager" || user?.role === "HR" || user?.role === "Production";
//   };

//   // ---------------- Delete Customer ----------------
//   const deleteCustomer = async (id: string) => {
//     const target = customers.find((c) => c.id === id);
//     if (!target || !canDeleteCustomer(target)) {
//       alert("You don't have permission to delete customers.");
//       return;
//     }
//     if (!window.confirm("Are you sure you want to delete this customer?")) return;

//     try {
//       const token = localStorage.getItem("auth_token");
//       const res = await fetch(`https://aztec-interiors.onrender.com/customers/${id}`, {
//         method: "DELETE",
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (!res.ok) throw new Error("Failed to delete customer");

//       setCustomers((prev) => prev.filter((c) => c.id !== id));
//       setAllCustomers((prev) => prev.filter((c) => c.id !== id));
      
//       // Re-evaluate current page after deletion
//       if (paginatedCustomers.length === 1 && currentPage > 1) {
//         setCurrentPage(prev => prev - 1);
//       }
//     } catch (err) {
//       console.error("Delete error:", err);
//       alert("Error deleting customer");
//     }
//   };

//   // ---------------- Open Timeline Modal ----------------
//   const openTimelineModal = (customerId: string, customerName: string) => {
//     setSelectedCustomerId(customerId);
//     setSelectedCustomerName(customerName);
//     setShowTimelineModal(true);
//   };

//   // ---------------- UI ----------------
//   const uniqueStages = Array.from(new Set(customers.map((c) => c.stage)));

//   // Pagination Component
//   const PaginationControls = () => {
//     if (totalPages <= 1) return null;

//     return (
//       <div className="flex items-center justify-between py-3 px-4 bg-gray-50 border-t">
//         <div className="text-sm text-gray-700">
//           Showing <span className="font-medium">{(currentPage - 1) * CUSTOMERS_PER_PAGE + 1}</span> to{" "}
//           <span className="font-medium">
//             {Math.min(currentPage * CUSTOMERS_PER_PAGE, filteredCustomers.length)}
//           </span>{" "}
//           of <span className="font-medium">{filteredCustomers.length}</span> customers
//         </div>
//         <div className="flex space-x-1">
//           <Button
//             variant="outline"
//             size="icon"
//             onClick={() => setCurrentPage(1)}
//             disabled={currentPage === 1}
//             title="First Page"
//           >
//             <ChevronFirst className="h-4 w-4" />
//           </Button>
//           <Button
//             variant="outline"
//             size="icon"
//             onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
//             disabled={currentPage === 1}
//             title="Previous Page"
//           >
//             <ChevronLeft className="h-4 w-4" />
//           </Button>
          
//           {/* Page numbers */}
//           <div className="flex items-center px-3 text-sm text-gray-700">
//             Page {currentPage} of {totalPages}
//           </div>
          
//           <Button
//             variant="outline"
//             size="icon"
//             onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
//             disabled={currentPage === totalPages}
//             title="Next Page"
//           >
//             <ChevronRight className="h-4 w-4" />
//           </Button>
//           <Button
//             variant="outline"
//             size="icon"
//             onClick={() => setCurrentPage(totalPages)}
//             disabled={currentPage === totalPages}
//             title="Last Page"
//           >
//             <ChevronLast className="h-4 w-4" />
//           </Button>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="w-full p-6">
//       <h1 className="mb-6 text-3xl font-bold">
//         {user?.role === "Sales" ? "My Customers" : "Customers"}
//       </h1>

//       {/* Search and Filter Bar */}
//       <div className="mb-6 flex justify-between">
//         <div className="flex gap-3">
//           <div className="relative w-64">
//             <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
//             <Input
//               placeholder="Search customers..."
//               className="pl-8"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>

//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="outline">
//                 <Filter className="mr-2 h-4 w-4" />
//                 {stageFilter === "All" ? "All Stages" : stageFilter}
//                 <ChevronDown className="ml-1 h-3 w-3" />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent>
//               <DropdownMenuItem onClick={() => setStageFilter("All")}>
//                 All Stages
//               </DropdownMenuItem>
//               {uniqueStages.map((stage) => (
//                 <DropdownMenuItem key={stage} onClick={() => setStageFilter(stage)}>
//                   {stage}
//                 </DropdownMenuItem>
//               ))}
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </div>

//         {user?.role !== "Staff" && user?.role !== "Production" && (
//           <Button onClick={() => setShowCreateModal(true)}>
//             <Plus className="mr-2 h-4 w-4" />
//             Add Customer
//           </Button>
//         )}
//       </div>

//       {/* Customer Table */}
//       <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 {["Name", "Phone", "Email", "Address", "Postcode", "Stage", "Projects"].map((h) => (
//                   <th
//                     key={h}
//                     className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
//                   >
//                     {h}
//                   </th>
//                 ))}
//                 {(user?.role === "Manager" || user?.role === "HR") && (
//                   <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
//                     Salesperson
//                   </th>
//                 )}
//                 <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
//                   Project Types
//                 </th>
//                 {user?.role !== "Staff" && (
//                   <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
//                     Actions
//                   </th>
//                 )}
//               </tr>
//             </thead>

//             <tbody className="divide-y divide-gray-200 bg-white">
//               {isLoading ? (
//                 <tr>
//                   <td colSpan={10} className="px-6 py-12 text-center">
//                     <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-gray-600"></div>
//                     <p className="mt-4 text-gray-500">Loading customers...</p>
//                   </td>
//                 </tr>
//               ) : paginatedCustomers.length === 0 ? (
//                 <tr>
//                   <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
//                     <p className="text-lg">No customers found.</p>
//                     {user?.role === "Sales" && (
//                       <p className="mt-2 text-sm">Create your first customer to get started!</p>
//                     )}
//                   </td>
//                 </tr>
//               ) : (
//                 paginatedCustomers.map((customer) => {
//                   const isExpanded = expandedCustomerId === customer.id;
//                   const projects = customerProjects[customer.id] || [];

//                   return (
//                     <React.Fragment key={customer.id}>
//                       {/* Main Customer Row */}
//                       <tr
//                         onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
//                         className={`cursor-pointer hover:bg-gray-50 transition-colors ${
//                           !customer.has_documents ? 'bg-red-50' : ''
//                         }`}
//                       >
//                         <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
//                           <div className="flex items-center space-x-2">
//                             {!customer.has_documents && (
//                               <div
//                                 title={`No documents uploaded. Drawings: ${customer.drawing_count}, Forms: ${customer.form_count}, Form Documents: ${customer.form_document_count}`}
//                                 className="flex items-center"
//                               >
//                                 <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
//                               </div>
//                             )}
//                             <span>{customer.name}</span>
//                           </div>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                           {customer.phone}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                           {customer.email || "—"}
//                         </td>
//                         <td className="px-6 py-4 text-sm text-gray-900">{customer.address}</td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                           {customer.postcode || "—"}
//                         </td>

//                         {/* Stage */}
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <span
//                             className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStageColor(
//                               customer.stage
//                             )}`}
//                           >
//                             {customer.stage}
//                           </span>
//                         </td>

//                         {/* Projects - With Expandable Breakdown */}
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           {customer.project_count > 0 ? (
//                             <Popover>
//                               <PopoverTrigger asChild>
//                                 <button
//                                   onClick={(e) => toggleProjectBreakdown(customer.id, e)}
//                                   className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
//                                 >
//                                   <FolderOpen className="w-4 h-4 text-gray-600" />
//                                   <span className="text-sm font-medium text-gray-900">
//                                     {customer.project_count}
//                                   </span>
//                                   {customer.project_count > 1 && (
//                                     <ChevronRight
//                                       className={`w-4 h-4 text-gray-400 transition-transform ${
//                                         isExpanded ? 'rotate-90' : ''
//                                       }`}
//                                     />
//                                   )}
//                                 </button>
//                               </PopoverTrigger>

//                               {customer.project_count > 1 && (
//                                 <PopoverContent className="w-80" align="start">
//                                   <div className="space-y-2">
//                                     <h4 className="font-semibold text-sm text-gray-900">
//                                       Project Breakdown
//                                     </h4>

//                                     {loadingProjects[customer.id] ? (
//                                       <div className="py-4 text-center text-sm text-gray-500">
//                                         Loading projects...
//                                       </div>
//                                     ) : projects.length > 0 ? (
//                                       <div className="space-y-2">
//                                         {projects.map((project) => (
//                                           <div
//                                             key={project.id}
//                                             className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
//                                           >
//                                             <div className="flex-1">
//                                               <p className="text-sm font-medium text-gray-900">
//                                                 {project.project_name}
//                                               </p>
//                                               <p className="text-xs text-gray-500">
//                                                 Created {new Date(project.created_at).toLocaleDateString()}
//                                               </p>
//                                             </div>
//                                             <span
//                                               className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStageColor(
//                                                 project.stage
//                                               )}`}
//                                             >
//                                               {project.stage}
//                                             </span>
//                                           </div>
//                                         ))}
//                                       </div>
//                                     ) : (
//                                       <div className="py-4 text-center text-sm text-gray-500">
//                                         No projects found
//                                       </div>
//                                     )}
//                                   </div>
//                                 </PopoverContent>
//                               )}
//                             </Popover>
//                           ) : (
//                             <div className="flex items-center gap-2 text-gray-400">
//                               <FolderOpen className="w-4 h-4" />
//                               <span className="text-sm">0</span>
//                             </div>
//                           )}
//                         </td>

//                         {(user?.role === "Manager" || user?.role === "HR") && (
//                           <td className="px-6 py-4 text-sm text-gray-900">
//                             {customer.salesperson || "—"}
//                           </td>
//                         )}

//                         <td className="px-6 py-4 whitespace-nowrap">
//                           {customer.project_types && customer.project_types.length > 0 ? (
//                             <div className="flex flex-wrap gap-1">
//                               {customer.project_types.map((type, index) => (
//                                 <span
//                                   key={index}
//                                   className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getProjectTypeColor(
//                                     type
//                                   )}`}
//                                 >
//                                   {type}
//                                 </span>
//                               ))}
//                             </div>
//                           ) : (
//                             <span className="text-sm text-gray-500">—</span>
//                           )}
//                         </td>

//                         {user?.role !== "Staff" && (
//                           <td className="px-6 py-4 text-right whitespace-nowrap">
//                             <div className="flex gap-2 justify-end">
//                               {canViewTimeline() && (
//                                 <Button
//                                   variant="ghost"
//                                   size="sm"
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     openTimelineModal(customer.id, customer.name);
//                                   }}
//                                   title="View Project Timeline & Materials"
//                                 >
//                                   <Clock className="h-4 w-4 text-blue-600" />
//                                 </Button>
//                               )}

//                               {canEditCustomer(customer) && (
//                                 <Button
//                                   variant="ghost"
//                                   size="sm"
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     router.push(`/dashboard/customers/${customer.id}/edit`);
//                                   }}
//                                 >
//                                   <Edit className="h-4 w-4" />
//                                 </Button>
//                               )}
//                               {canDeleteCustomer(customer) && (
//                                 <Button
//                                   variant="ghost"
//                                   size="sm"
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     deleteCustomer(customer.id);
//                                   }}
//                                 >
//                                   <Trash2 className="h-4 w-4" />
//                                 </Button>
//                               )}
//                             </div>
//                           </td>
//                         )}
//                       </tr>
//                     </React.Fragment>
//                   );
//                 })
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* Pagination Controls */}
//         {!isLoading && filteredCustomers.length > 0 && <PaginationControls />}
//       </div>

//       {/* Create Customer Modal */}
//       {showCreateModal && (
//         <CreateCustomerModal
//           isOpen={showCreateModal}
//           onClose={() => setShowCreateModal(false)}
//           onCustomerCreated={fetchCustomers}
//         />
//       )}

//       {/* Timeline Modal */}
//       <Dialog open={showTimelineModal} onOpenChange={setShowTimelineModal}>
//         <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Project Timeline - {selectedCustomerName}</DialogTitle>
//           </DialogHeader>
//           {selectedCustomerId && (
//             <CustomerProjectTimeline customerId={selectedCustomerId} />
//           )}
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }


"use client";

import React, { useState, useEffect, useMemo } from "react";
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
// 🛑 FIX START: Changed import path from an erroneous path to the correct package name.
import { useRouter } from "next/navigation"; 
// 🛑 FIX END
import { CreateCustomerModal } from "@/components/ui/CreateCustomerModal";
import { CustomerProjectTimeline } from "@/components/materials/CustomerProjectTimeline";
import { useAuth } from "@/contexts/AuthContext";

// ---------------- Constants ----------------
const CUSTOMERS_PER_PAGE = 25;

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
  // Document counts from backend
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<JobStage | "All">("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
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

  // Fetch customers initially
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on user role
  useEffect(() => {
    // No role filtering applied here, based on previous user request ("all the customers shown for all the roles")
    setCustomers(allCustomers);
  }, [user, allCustomers]);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stageFilter]);

  // ---------------- Fetch Customers - OPTIMIZED ----------------
  const fetchCustomers = async () => {
    setIsLoading(true);
    const startTime = performance.now();
    
    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };

      console.log("🔄 Fetching customers...");
      
      const response = await fetch("https://aztec-interiors.onrender.com/customers", {
        headers,
      });

      if (!response.ok) throw new Error("Failed to fetch customers");

      const data = await response.json();

      console.log(`✅ Customers received: ${data.length} customers`);

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
        };

        return customer;
      });

      setAllCustomers(customersWithData);

      const endTime = performance.now();
      console.log(`⏱️ Page loaded in ${((endTime - startTime) / 1000).toFixed(2)}s`);

    } catch (err) {
      console.error("Error fetching customers:", err);
      setAllCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- Fetch Customer Projects (for expansion) ----------------
  const fetchCustomerProjects = async (customerId: string) => {
    if (customerProjects[customerId]) {
      return;
    }

    setLoadingProjects(prev => ({ ...prev, [customerId]: true }));

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `https://aztec-interiors.onrender.com/customers/${customerId}/projects`,
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

  // ✅ NEW: Sorting Logic - Accepted Stage first, then by date (applies to all existing)
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      // Priority 1: Accepted stage customers come first (sort order: Accepted -> Others)
      const aIsAccepted = a.stage === "Accepted";
      const bIsAccepted = b.stage === "Accepted";
      
      if (aIsAccepted && !bIsAccepted) return -1;
      if (!aIsAccepted && bIsAccepted) return 1;
      
      // Priority 2: Within the same priority group, sort by most recent update
      const aDate = new Date(a.updated_at || a.created_at).getTime();
      const bDate = new Date(b.updated_at || b.created_at).getTime();
      
      return bDate - aDate; // Descending order (Most recent first)
    });
  }, [customers]);

  // ---------------- Filtering ----------------
  const filteredCustomers = useMemo(() => {
    return sortedCustomers.filter((customer) => {
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
  }, [sortedCustomers, searchTerm, stageFilter]);

  // ---------------- Pagination Calculations ----------------
  const totalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
    const endIndex = startIndex + CUSTOMERS_PER_PAGE;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, currentPage]);

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

  const canViewTimeline = (): boolean => {
    return user?.role === "Manager" || user?.role === "HR" || user?.role === "Production";
  };

  // ✅ UPDATED: Check if customer is in Accepted stage (for icon display)
  const isCustomerInAcceptedStage = (customer: Customer): boolean => {
    return customer.stage === "Accepted";
  };

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
      
      // Re-evaluate current page after deletion
      if (paginatedCustomers.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting customer");
    }
  };

  // ---------------- Open Timeline Modal ----------------
  const openTimelineModal = (customerId: string, customerName: string) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomerName(customerName);
    setShowTimelineModal(true);
  };

  // ---------------- UI ----------------
  const uniqueStages = Array.from(new Set(customers.map((c) => c.stage)));

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
          
          {/* Page numbers */}
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
                    {user?.role === "Sales" && (
                      <p className="mt-2 text-sm">Create your first customer to get started!</p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => {
                  const isExpanded = expandedCustomerId === customer.id;
                  const projects = customerProjects[customer.id] || [];
                  const showTimelineIcon = isCustomerInAcceptedStage(customer);

                  return (
                    <React.Fragment key={customer.id}>
                      {/* Main Customer Row */}
                      <tr
                        onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                        className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                          !customer.has_documents ? 'bg-red-50' : ''
                        } ${customer.stage === 'Accepted' ? 'bg-purple-50' : ''}`}
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
                            {customer.stage === 'Accepted' && (
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

                        {/* Stage */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStageColor(
                              customer.stage
                            )}`}
                          >
                            {customer.stage}
                          </span>
                        </td>

                        {/* Projects - With Expandable Breakdown */}
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
                              {/* ✅ IMPLEMENTATION: Clock icon visible only if in Accepted stage */}
                              {canViewTimeline() && isCustomerInAcceptedStage(customer) && (
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

        {/* Pagination Controls */}
        {!isLoading && filteredCustomers.length > 0 && <PaginationControls />}
      </div>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <CreateCustomerModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCustomerCreated={fetchCustomers}
        />
      )}

      {/* Timeline Modal */}
      <Dialog open={showTimelineModal} onOpenChange={setShowTimelineModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Timeline - {selectedCustomerName}</DialogTitle>
          </DialogHeader>
          {selectedCustomerId && (
            <CustomerProjectTimeline customerId={selectedCustomerId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}