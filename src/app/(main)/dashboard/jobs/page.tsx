"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Trash2 } from "lucide-react";
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
import { api, cacheUtils } from "@/lib/api";
import JobStageBadge from "@/components/JobStageBadge";

// ============================================================================
// DEV-ONLY LOGGING
// ============================================================================
const IS_DEV = process.env.NODE_ENV === 'development';
const log = (...args: any[]) => {
  if (IS_DEV) console.log(...args);
};
const warn = (...args: any[]) => {
  if (IS_DEV) console.warn(...args);
};
const error = console.error; // Always log errors

// ============================================================================
// CONSTANTS
// ============================================================================
const JOB_TYPES = ["Kitchen", "Bedroom", "Wardrobe", "Remedial", "Other"];

const WORK_STAGES = [
  { value: "Survey", label: "Survey", icon: "📏" },
  { value: "Delivery", label: "Delivery", icon: "🚚" },
  { value: "Installation", label: "Installation", icon: "🏗️" },
];

// ============================================================================
// INTERFACES
// ============================================================================
interface Job {
  id: string;
  job_reference: string;
  job_name: string;
  customer_name: string;
  job_type: string;
  stage: string;
  work_stage?: string;
  priority: string;
  start_date: string;
  end_date: string;
  agreed_price: number;
  created_at: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterWorkStage, setFilterWorkStage] = useState<string>("all");
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ============================================================================
  // ✅ OPTIMIZED: Load jobs with API layer and caching
  // ============================================================================
  const loadJobs = useCallback(async () => {
    setLoading(true);
    const startTime = performance.now();
    
    try {
      log("🔄 Loading jobs...");
      const data = await api.getJobs();
      
      setJobs(Array.isArray(data) ? data : []);

      const endTime = performance.now();
      log(`⏱️ Jobs loaded in ${((endTime - startTime) / 1000).toFixed(2)}s`);
    } catch (err) {
      error("❌ Error loading jobs:", err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // ============================================================================
  // ✅ OPTIMIZED: Memoized filtering (only recomputes when dependencies change)
  // ============================================================================
  const filteredJobs = useMemo(() => {
    let filtered = [...jobs];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.job_reference?.toLowerCase().includes(term) ||
          job.job_name?.toLowerCase().includes(term) ||
          job.customer_name?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (filterType && filterType !== "all") {
      filtered = filtered.filter((job) => job.job_type === filterType);
    }

    // Work stage filter
    if (filterWorkStage && filterWorkStage !== "all") {
      filtered = filtered.filter((job) => job.work_stage === filterWorkStage);
    }

    return filtered;
  }, [jobs, searchTerm, filterType, filterWorkStage]);

  // ============================================================================
  // ✅ OPTIMIZED: Work stage stats (memoized)
  // ============================================================================
  const workStageStats = useMemo(() => {
    return WORK_STAGES.map((stage) => ({
      ...stage,
      count: jobs.filter((j) => j.work_stage === stage.value).length,
    }));
  }, [jobs]);

  // ============================================================================
  // ✅ OPTIMIZED: Update work stage with optimistic UI
  // ============================================================================
  const handleUpdateWorkStage = useCallback(async (jobId: string, newWorkStage: string) => {
    // Store previous state for rollback
    const previousJobs = [...jobs];
    
    // Optimistic update - update UI immediately
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, work_stage: newWorkStage } : j))
    );

    try {
      await api.updateJobWorkStage(jobId, newWorkStage);
      log(`✅ Updated job ${jobId} work stage to ${newWorkStage}`);
    } catch (err) {
      error("Error updating work stage:", err);
      
      // Rollback on error
      setJobs(previousJobs);
      alert(`Failed to update work stage: ${err instanceof Error ? err.message : 'Please try again'}`);
    }
  }, [jobs]);

  // ============================================================================
  // ✅ OPTIMIZED: Delete job with optimistic UI
  // ============================================================================
  const handleDeleteJob = useCallback(async () => {
    if (!jobToDelete || isDeleting) return;

    setIsDeleting(true);
    
    // Store previous state for rollback
    const previousJobs = [...jobs];
    
    // Optimistic update - remove from UI immediately
    setJobs((prev) => prev.filter((j) => j.id !== jobToDelete.id));
    setDeleteDialogOpen(false);

    try {
      await api.deleteJob(jobToDelete.id);
      
      setJobToDelete(null);
      log(`✅ Deleted job ${jobToDelete.id}`);
    } catch (err) {
      error("Error deleting job:", err);
      
      // Rollback on error
      setJobs(previousJobs);
      setDeleteDialogOpen(true); // Re-open dialog
      alert(`Failed to delete job: ${err instanceof Error ? err.message : 'Please try again'}`);
    } finally {
      setIsDeleting(false);
    }
  }, [jobToDelete, jobs, isDeleting]);

  // ============================================================================
  // ✅ OPTIMIZED: Clear filters callback
  // ============================================================================
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setFilterWorkStage("all");
    setFilterType("all");
  }, []);

  // ============================================================================
  // HELPER FUNCTIONS (Keep existing)
  // ============================================================================
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

  // ============================================================================
  // RENDER - LOADING STATE
  // ============================================================================
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

  // ============================================================================
  // RENDER - MAIN UI
  // ============================================================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

      {/* Filters */}
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

          <div className="w-[200px]">
            <Select value={filterWorkStage} onValueChange={setFilterWorkStage}>
              <SelectTrigger>
                <SelectValue placeholder="All Work Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Work Stages</SelectItem>
                {WORK_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    <div className="flex items-center gap-2">
                      <span>{stage.icon}</span>
                      <span>{stage.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || filterWorkStage !== "all" || filterType !== "all") && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
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
          {workStageStats.map((stage) => {
            if (stage.count === 0) return null;
            return (
              <div key={stage.value}>
                <p className="text-sm text-gray-600">{stage.icon} {stage.label}</p>
                <p className="text-2xl font-semibold">{stage.count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Jobs Table */}
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
                      Work Stage
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
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={job.work_stage || "Survey"}
                          onValueChange={(value) => handleUpdateWorkStage(job.id, value)}
                        >
                          <SelectTrigger className="w-[150px] h-8">
                            <SelectValue>
                              {job.work_stage ? (
                                <JobStageBadge stage={job.work_stage as any} size="sm" showIcon={true} />
                              ) : (
                                <span className="text-gray-400">Not set</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {WORK_STAGES.map((stage) => (
                              <SelectItem key={stage.value} value={stage.value}>
                                <div className="flex items-center gap-2">
                                  <span>{stage.icon}</span>
                                  <span>{stage.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

      {/* Delete Confirmation Dialog */}
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
            <AlertDialogCancel 
              onClick={() => {
                setDeleteDialogOpen(false);
                setJobToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJob}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}