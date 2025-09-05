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
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Edit,
  Users,
  FileText,
  TrendingUp,
  DollarSign,
  Plus,
  UserPlus,
  Phone,
  MapPin
} from "lucide-react";

// Sales-focused pipeline stages
const STAGES = [
  "Lead",
  "Quote", 
  "Consultation",
  "Survey",
  "Measure",
  "Design",
  "Quoted",
  "Accepted"
] as const;

type Stage = (typeof STAGES)[number];

type Job = {
  id: number;
  job_reference: string;
  customer_id: number | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_type?: "existing" | "new" | "prospect";
  type: string;
  stage: Stage;
  salesperson?: string | null;
  quote_price?: number | null;
  agreed_price?: number | null;
  deposit1?: number | null;
  deposit1_paid?: boolean;
  deposit2?: number | null;
  deposit2_paid?: boolean;
  delivery_date?: string | null;
  contact_made?: boolean;
  status_comments?: string | null;
  created_at?: string;
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
  Accepted: "#059669"
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSalesperson, setFilterSalesperson] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCustomerType, setFilterCustomerType] = useState("all");
  
  const prevFeaturesRef = useRef<any[]>([]);
  const columns = useMemo(() => makeColumns(), []);

  // Mock data
  useEffect(() => {
    const mockJobs: Job[] = [
      {
        id: 1,
        job_reference: "AZT-2025-001",
        customer_id: 1,
        customer_name: "John Smith",
        customer_email: "john.smith@email.com",
        customer_phone: "+44 7700 900123",
        customer_address: "123 High Street, London",
        customer_type: "existing",
        type: "Kitchen",
        stage: "Lead",
        salesperson: "Alice Johnson",
        quote_price: 15000,
        contact_made: false,
        status_comments: "Existing customer inquiry for second kitchen renovation"
      },
      {
        id: 2,
        job_reference: "AZT-2025-002", 
        customer_id: 2,
        customer_name: "Sarah Wilson",
        customer_email: "sarah.wilson@email.com",
        customer_phone: "+44 7700 900456",
        customer_address: "456 Oak Avenue, Manchester",
        customer_type: "prospect",
        type: "Bedroom",
        stage: "Quote",
        salesperson: "Bob Davis",
        quote_price: 8500,
        contact_made: true,
        status_comments: "New prospect, quote prepared awaiting response"
      },
      {
        id: 3,
        job_reference: "AZT-2025-003",
        customer_id: 1,
        customer_name: "John Smith", 
        customer_email: "john.smith@email.com",
        customer_phone: "+44 7700 900123",
        customer_address: "123 High Street, London",
        customer_type: "existing",
        type: "Wardrobe",
        stage: "Accepted",
        salesperson: "Alice Johnson",
        quote_price: 12000,
        agreed_price: 11500,
        deposit1: 2000,
        deposit1_paid: true,
        contact_made: true,
        delivery_date: "2025-03-15",
        status_comments: "Loyal customer, third project with us"
      }
    ];

    setJobs(mockJobs);
    
    const mapped = mockJobs.map((j) => ({
      kanbanId: String(j.id), // Use kanbanId instead of id to avoid conflicts
      name: `${j.job_reference} — ${j.customer_name}`,
      column: stageToColumnId(j.stage),
      jobId: j.id,
      ...j
    }));
    
    setFeatures(mapped);
    prevFeaturesRef.current = mapped;
  }, []);

  // Filter logic
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = !searchTerm || 
        job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.job_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.type?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSalesperson = filterSalesperson === "all" || job.salesperson === filterSalesperson;
      const matchesStage = filterStage === "all" || job.stage === filterStage;
      const matchesType = filterType === "all" || job.type === filterType;
      const matchesCustomerType = filterCustomerType === "all" || job.customer_type === filterCustomerType;
      
      return matchesSearch && matchesSalesperson && matchesStage && matchesType && matchesCustomerType;
    });
  }, [jobs, searchTerm, filterSalesperson, filterStage, filterType, filterCustomerType]);

  const filteredFeatures = useMemo(() => {
    return filteredJobs.map((job) => ({
      kanbanId: String(job.id), // Use kanbanId consistently
      name: `${job.job_reference} — ${job.customer_name}`,
      column: stageToColumnId(job.stage),
      jobId: job.id,
      job_reference: job.job_reference,
      customer_id: job.customer_id,
      customer_name: job.customer_name,
      customer_email: job.customer_email,
      customer_phone: job.customer_phone,
      customer_address: job.customer_address,
      customer_type: job.customer_type,
      type: job.type,
      stage: job.stage,
      salesperson: job.salesperson,
      quote_price: job.quote_price,
      agreed_price: job.agreed_price,
      deposit1: job.deposit1,
      deposit1_paid: job.deposit1_paid,
      deposit2: job.deposit2,
      deposit2_paid: job.deposit2_paid,
      delivery_date: job.delivery_date,
      contact_made: job.contact_made,
      status_comments: job.status_comments,
      created_at: job.created_at
    }));
  }, [filteredJobs]);

  // KPIs calculation
  const kpis = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    const stageValues: Record<string, number> = {};
    
    STAGES.forEach(stage => {
      stageCounts[stage] = 0;
      stageValues[stage] = 0;
    });
    
    filteredJobs.forEach(job => {
      stageCounts[job.stage]++;
      const value = job.agreed_price ?? job.quote_price ?? 0;
      stageValues[job.stage] += value;
    });
    
    return { stageCounts, stageValues };
  }, [filteredJobs]);

  // Get unique values for filters
  const salespeople = useMemo(() => 
    [...new Set(jobs.map(j => j.salesperson).filter(Boolean))], [jobs]);
  
  const jobTypes = useMemo(() => 
    [...new Set(jobs.map(j => j.type).filter(Boolean))], [jobs]);

  // Handle Kanban drag & drop
  const handleDataChange = (next: any[]) => {
    const prev = prevFeaturesRef.current;
    const moved = next.filter((n) => {
      const p = prev.find((x) => x.kanbanId === n.kanbanId); // Use kanbanId for comparison
      return p && p.column !== n.column;
    });

    setFeatures(next);
    prevFeaturesRef.current = next;

    moved.forEach(async (item) => {
      const jobId = item.jobId as number;
      const newStage = columnIdToStage(item.column);
      
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId ? { ...job, stage: newStage } : job
        )
      );
      
      try {
        await fetch(`http://127.0.0.1:5000/jobs/${jobId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: newStage }),
        });
      } catch (e) {
        console.error("Failed to update job stage:", e);
      }
    });
  };

  // Action handlers
  const handleOpenJob = (jobId: number) => {
    console.log("Opening job:", jobId);
  };

  const handleOpenCustomer = (customerId: number) => {
    console.log("Opening customer:", customerId);
  };

  const handleCreateJob = () => {
    console.log("Creating new job");
  };

  const handleCreateCustomer = () => {
    console.log("Creating new customer");
  };

  const handleSendQuote = (jobId: number) => {
    console.log("Sending quote for job:", jobId);
  };

  const handleSchedule = (jobId: number) => {
    console.log("Scheduling for job:", jobId);
  };

  const handleMarkAccepted = (jobId: number) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId ? { ...job, stage: "Accepted" } : job
      )
    );
    setFeatures(prevFeatures =>
      prevFeatures.map(feature =>
        feature.jobId === jobId ? { ...feature, column: stageToColumnId("Accepted"), stage: "Accepted" } : feature
      )
    );
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

  const formatCurrency = (amount?: number | null) => 
    amount ? `£${amount.toLocaleString()}` : "N/A";

  const formatDate = (dateString?: string | null) =>
    dateString ? new Date(dateString).toLocaleDateString() : "N/A";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Pipeline</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateCustomer}>
            <UserPlus className="h-4 w-4 mr-2" />
            New Customer
          </Button>
          <Button variant="outline" size="sm" onClick={handleCreateJob}>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* KPIs Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Jobs</p>
              <p className="text-2xl font-bold">{filteredJobs.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Pipeline Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(filteredJobs.reduce((sum, job) => 
                  sum + (job.agreed_price ?? job.quote_price ?? 0), 0))}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">Accepted</p>
              <p className="text-2xl font-bold">{kpis.stageCounts.Accepted}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">
                {filteredJobs.length > 0 
                  ? Math.round((kpis.stageCounts.Accepted / filteredJobs.length) * 100) 
                  : 0}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs, customers, references..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          
          <Select value={filterSalesperson} onValueChange={setFilterSalesperson}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Salespeople" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Salespeople</SelectItem>
              {salespeople.map(person => (
                <SelectItem key={person} value={person!}>{person}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map(stage => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {jobTypes.map(type => (
                <SelectItem key={type} value={type!}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCustomerType} onValueChange={setFilterCustomerType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Customer Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customer Types</SelectItem>
              <SelectItem value="existing">Existing Customers</SelectItem>
              <SelectItem value="new">New Customers</SelectItem>
              <SelectItem value="prospect">Prospects</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* View Toggle and Content */}
      <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        {/* Kanban View */}
        <TabsContent value="kanban" className="mt-6">
          <div className="h-[calc(100vh-350px)] min-h-[600px]">
            <KanbanProvider columns={columns} data={filteredFeatures} onDataChange={handleDataChange}>
              {(column) => (
                <KanbanBoard id={column.id} key={column.id} className="w-72 min-w-72 h-full flex flex-col">
                  <KanbanHeader className="flex-shrink-0 p-3 border-b bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} />
                      <span className="font-medium text-sm">{column.name}</span>
                      <Badge variant="secondary" className="text-xs">{counts[column.id] ?? 0}</Badge>
                      <div className="ml-auto text-xs text-muted-foreground">
                        {formatCurrency(kpis.stageValues[column.name])}
                      </div>
                    </div>
                  </KanbanHeader>

                  <KanbanCards id={column.id} className="flex-1 overflow-y-auto p-3 space-y-3">
                    {(feature: any) => (
                      <KanbanCard
                        column={column.id}
                        id={feature.kanbanId} // Use kanbanId here
                        key={feature.kanbanId} // Use kanbanId as key
                        name={feature.name}
                        className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-grab p-3"
                      >
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate">{feature.job_reference}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <button 
                                  className="truncate hover:underline cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCustomer(feature.customer_id);
                                  }}
                                  title="View Customer Details"
                                >
                                  {feature.customer_name}
                                </button>
                                {feature.customer_type && (
                                  <Badge 
                                    variant={
                                      feature.customer_type === "existing" ? "default" :
                                      feature.customer_type === "new" ? "secondary" : "outline"
                                    }
                                    className="text-xs ml-1"
                                  >
                                    {feature.customer_type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                              {feature.type}
                            </Badge>
                          </div>

                          {/* Contact Info */}
                          {(feature.customer_phone || feature.customer_email) && (
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {feature.customer_phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{feature.customer_phone}</span>
                                </div>
                              )}
                              {feature.customer_email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{feature.customer_email}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Job Details */}
                          <div className="space-y-2 text-xs">
                            {feature.salesperson && (
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{feature.salesperson}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">Quote: {formatCurrency(feature.quote_price)}</span>
                            </div>
                            
                            {feature.agreed_price && (
                              <div className="flex items-center gap-2">
                                <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                <span className="truncate">Agreed: {formatCurrency(feature.agreed_price)}</span>
                              </div>
                            )}

                            {feature.deposit1 && (
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${feature.deposit1_paid ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="truncate">Dep1: {formatCurrency(feature.deposit1)} ({feature.deposit1_paid ? 'Paid' : 'Pending'})</span>
                              </div>
                            )}
                          </div>

                          {/* Status Comments */}
                          {feature.status_comments && (
                            <div className="text-xs bg-gray-50 p-2 rounded border">
                              <p className="text-gray-600 italic leading-relaxed line-clamp-3">
                                {feature.status_comments}
                              </p>
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className="flex gap-1 pt-2 border-t border-gray-100">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 px-1 text-xs flex-1 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenJob(feature.jobId);
                              }}
                              title="Open Job"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 px-1 text-xs flex-1 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendQuote(feature.jobId);
                              }}
                              title="Send Quote"
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 px-1 text-xs flex-1 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSchedule(feature.jobId);
                              }}
                              title="Schedule"
                            >
                              <Calendar className="h-3 w-3" />
                            </Button>
                            {feature.stage !== "Accepted" && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-1 text-xs flex-1 hover:bg-green-100 hover:text-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAccepted(feature.jobId);
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
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="mt-6">
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-9 gap-4 p-4 bg-muted/50 rounded-lg font-medium text-sm">
              <div>Reference</div>
              <div>Customer</div>
              <div>Customer Type</div>
              <div>Job Type</div>
              <div>Salesperson</div>
              <div>Stage</div>
              <div>Quote Price</div>
              <div>Contact Made</div>
              <div>Actions</div>
            </div>

            {/* Table Rows */}
            {filteredJobs.map((job) => (
              <Card key={job.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-9 gap-4 items-center text-sm">
                  <div className="font-medium">{job.job_reference}</div>
                  <div>
                    <button 
                      className="font-medium text-blue-600 hover:underline cursor-pointer"
                      onClick={() => handleOpenCustomer(job.customer_id!)}
                      title="View Customer Details"
                    >
                      {job.customer_name}
                    </button>
                    {job.customer_phone && (
                      <div className="text-xs text-muted-foreground">{job.customer_phone}</div>
                    )}
                  </div>
                  <div>
                    <Badge 
                      variant={
                        job.customer_type === "existing" ? "default" :
                        job.customer_type === "new" ? "secondary" : "outline"
                      }
                    >
                      {job.customer_type}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant="outline">{job.type}</Badge>
                  </div>
                  <div>{job.salesperson}</div>
                  <div>
                    <Badge 
                      style={{ 
                        backgroundColor: stageColors[job.stage],
                        color: 'white'
                      }}
                    >
                      {job.stage}
                    </Badge>
                  </div>
                  <div>{formatCurrency(job.quote_price)}</div>
                  <div>
                    {job.contact_made ? (
                      <Badge variant="secondary">Yes</Badge>
                    ) : (
                      <Badge variant="destructive">No</Badge>
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
                        <DropdownMenuItem onClick={() => handleOpenJob(job.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Open Job
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenCustomer(job.customer_id!)}>
                          <Users className="h-4 w-4 mr-2" />
                          View Customer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendQuote(job.id)}>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Quote
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSchedule(job.id)}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        {job.stage !== "Accepted" && (
                          <DropdownMenuItem onClick={() => handleMarkAccepted(job.id)}>
                            <Check className="h-4 w-4 mr-2" />
                            Mark Accepted
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Additional Details */}
                {(job.customer_email || job.customer_address || job.status_comments) && (
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <div className="space-y-1">
                      {job.customer_email && (
                        <div>
                          <span className="font-medium">Email: </span>
                          {job.customer_email}
                        </div>
                      )}
                      {job.customer_address && (
                        <div>
                          <span className="font-medium">Address: </span>
                          {job.customer_address}
                        </div>
                      )}
                      {job.status_comments && (
                        <div>
                          <span className="font-medium">Notes: </span>
                          {job.status_comments}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Deposit Information */}
                {(job.deposit1 || job.deposit2) && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex gap-4 text-xs">
                      {job.deposit1 && (
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${job.deposit1_paid ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>Deposit 1: {formatCurrency(job.deposit1)}</span>
                          <span className={job.deposit1_paid ? 'text-green-600' : 'text-red-600'}>
                            ({job.deposit1_paid ? 'Paid' : 'Unpaid'})
                          </span>
                        </div>
                      )}
                      {job.deposit2 && (
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${job.deposit2_paid ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>Deposit 2: {formatCurrency(job.deposit2)}</span>
                          <span className={job.deposit2_paid ? 'text-green-600' : 'text-red-600'}>
                            ({job.deposit2_paid ? 'Paid' : 'Unpaid'})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {filteredJobs.length === 0 && (
              <Card className="p-8 text-center">
                <div className="text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No jobs found</h3>
                  <p>Try adjusting your search criteria or filters.</p>
                  <div className="mt-4 space-x-2">
                    <Button variant="outline" size="sm" onClick={handleCreateJob}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Job
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCreateCustomer}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Customer
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}