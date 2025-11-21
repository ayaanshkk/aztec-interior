"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Eye, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchWithAuth } from "@/lib/api";

const JOB_TYPES = ["Kitchen", "Bedroom", "Wardrobe", "Remedial", "Other"];

interface Job {
  id: string;
  job_reference: string;
  job_name: string;
  customer_name: string;
  job_type: string;
  stage: string;
  priority: string;
  start_date: string;
  end_date: string;
  agreed_price: number;
  created_at: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStage, setFilterStage] = useState("all"); // ✅ MOVED HERE - inside component
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jobs, searchTerm, filterType]);

  const loadJobs = async () => {
    setLoading(true);
    const startTime = performance.now();
    
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.error("❌ No auth token found");
        setLoading(false);
        return;
      }

      console.log("🔄 Fetching jobs...");
      
      const headers: HeadersInit = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // ✅ Retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          response = await fetch("https://aztec-interiors.onrender.com/jobs", {
            headers,
            signal: AbortSignal.timeout(15000), // 15 second timeout
          });

          if (response.ok) {
            break; // Success, exit retry loop
          }

          // If we get a timeout or server error, retry
          if (response.status === 408 || response.status >= 500) {
            retryCount++;
            if (retryCount <= maxRetries) {
              console.log(`⏳ Retry ${retryCount}/${maxRetries} for jobs...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
              continue;
            }
          }

          throw new Error(`Failed to fetch jobs: ${response.status}`);
          
        } catch (error: any) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`⏳ Timeout - Retry ${retryCount}/${maxRetries} for jobs...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
          }
          throw error;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Failed to fetch jobs after ${maxRetries} retries`);
      }

      const data = await response.json();
      console.log(`✅ Jobs received: ${data.length} jobs`);
      
      setJobs(data);

      const endTime = performance.now();
      console.log(`⏱️ Jobs page loaded in ${((endTime - startTime) / 1000).toFixed(2)}s`);

    } catch (error) {
      console.error("❌ Error loading jobs:", error);
      setJobs([]); // Set empty array instead of leaving undefined
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    if (searchTerm) {
      filtered = filtered.filter(
        (job) =>
          job.job_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.job_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType && filterType !== "all") {
      filtered = filtered.filter((job) => job.job_type === filterType);
    }

    setFilteredJobs(filtered);
  };

  // ✅ Delete job handler
  const handleDeleteJob = async () => {
    if (!jobToDelete) return;

    try {
      const response = await fetchWithAuth(`jobs/${jobToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete job");
      }

      // Remove from state
      setJobs((prev) => prev.filter((j) => j.id !== jobToDelete.id));
      setDeleteDialogOpen(false);
      setJobToDelete(null);
      // ✅ No alert on success - dialog closing is enough feedback
    } catch (error) {
      console.error("Error deleting job:", error);
      alert(`Failed to delete job: ${error instanceof Error ? error.message : 'Please try again'}`);
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      Lead: "bg-gray-100 text-gray-800",
      Quote: "bg-blue-100 text-blue-800",
      Survey: "bg-yellow-100 text-yellow-800",
      Measure: "bg-purple-100 text-purple-800",
      Design: "bg-pink-100 text-pink-800",
      Quoted: "bg-indigo-100 text-indigo-800",
      Accepted: "bg-green-100 text-green-800",
      Production: "bg-orange-100 text-orange-800",
      Delivery: "bg-cyan-100 text-cyan-800",
      Installation: "bg-teal-100 text-teal-800",
      Complete: "bg-green-200 text-green-900",
      Cancelled: "bg-red-100 text-red-800",
    };
    return colors[stage] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      High: "text-red-600 font-semibold",
      Medium: "text-yellow-600",
      Low: "text-gray-600",
    };
    return colors[priority] || "text-gray-600";
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Jobs</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and track all your jobs in one place
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard/jobs/create")} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Job
          </Button>
        </div>
      </header>

      <div className="border-b bg-white px-8 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by job reference, name, or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-[200px]">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {JOB_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || filterStage !== "all" || filterType !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFilterStage("all");
                setFilterType("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div className="border-b bg-white px-8 py-4">
        <div className="flex gap-8">
          <div>
            <p className="text-sm text-gray-600">Total Jobs</p>
            <p className="text-2xl font-semibold">{jobs.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Filtered Results</p>
            <p className="text-2xl font-semibold">{filteredJobs.length}</p>
          </div>
        </div>
      </div>

      <main className="px-8 py-6">
        {filteredJobs.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center">
            <Filter className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No jobs found</h3>
            <p className="mt-2 text-sm text-gray-600">
              {jobs.length === 0
                ? "Get started by creating your first job."
                : "Try adjusting your search or filter criteria."}
            </p>
            {jobs.length === 0 && (
              <Button onClick={() => router.push("/dashboard/jobs/create")} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Job
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      Job Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      Job Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredJobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{job.job_reference || "N/A"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">
                          {job.customer_name && job.job_name 
                            ? `${job.customer_name} - ${job.job_name}`
                            : job.job_name || job.customer_name || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">{job.customer_name || "Unknown"}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{job.job_type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(job.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setJobToDelete(job);
                              setDeleteDialogOpen(true);
                            }}
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
        )}
      </main>

      {/* ✅ Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job?</AlertDialogTitle>
            <AlertDialogDescription>
              {jobToDelete && (
                <>
                  <p className="mb-2">
                    Are you sure you want to delete this job?
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                    <p><strong>Job Reference:</strong> {jobToDelete.job_reference}</p>
                    <p><strong>Customer:</strong> {jobToDelete.customer_name}</p>
                    <p><strong>Type:</strong> {jobToDelete.job_type}</p>
                  </div>
                  <p className="mt-3 text-red-600 font-medium">
                    This action cannot be undone.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setJobToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJob}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}