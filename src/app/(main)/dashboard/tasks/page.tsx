"use client";

import { useState, useEffect } from "react";
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
import { fetchWithAuth } from "@/lib/api";
import JobStageBadge from "@/components/JobStageBadge";
import CreateTaskModal from "@/components/ui/CreateTaskModal";

const JOB_TYPES = ["Kitchen", "Bedroom", "Wardrobe", "Remedial", "Other"];

// ✅ Work stages definition (Survey → Delivery → Installation)
const WORK_STAGES = [
  { value: "Survey", label: "Survey", icon: "📏" },
  { value: "Delivery", label: "Delivery", icon: "🚚" },
  { value: "Installation", label: "Installation", icon: "🏗️" },
];

interface Task {
  id: string;
  title: string;
  customer_name: string;
  job_type: string;
  type: string;
  work_stage?: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterWorkStage, setFilterWorkStage] = useState<string>("all");
  
  // Create task modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, searchTerm, filterType, filterWorkStage]);

  const loadTasks = async () => {
    setLoading(true);
    const startTime = performance.now();
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("ERROR: No auth token found");
        setLoading(false);
        return;
      }

      console.log("Fetching tasks...");
      
      const headers: HeadersInit = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // ✅ FIXED: Changed endpoint from /jobs to /tasks
      let response;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tasks`, {
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
              console.log(`Retry ${retryCount}/${maxRetries} for tasks...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
              continue;
            }
          }

          throw new Error(`Failed to fetch tasks: ${response.status}`);
          
        } catch (error: any) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Timeout - Retry ${retryCount}/${maxRetries} for tasks...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
          }
          throw error;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Failed to fetch tasks after ${maxRetries} retries`);
      }

      const data = await response.json();
      console.log(`✅ Tasks received: ${data.length} tasks`);
      
      setTasks(data);

      const endTime = performance.now();
      console.log(`⏱️ Tasks page loaded in ${((endTime - startTime) / 1000).toFixed(2)}s`);

    } catch (error) {
      console.error("❌ Error loading tasks:", error);
      setTasks([]); // Set empty array instead of leaving undefined
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    if (searchTerm) {
      filtered = filtered.filter(
        (task) =>
          task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType && filterType !== "all") {
      filtered = filtered.filter((task) => task.job_type === filterType || task.type === filterType);
    }

    // Filter by work stage
    if (filterWorkStage && filterWorkStage !== "all") {
      filtered = filtered.filter((task) => task.work_stage === filterWorkStage);
    }

    setFilteredTasks(filtered);
  };

  // Update task work stage
  const handleUpdateWorkStage = async (taskId: string, newWorkStage: string) => {
    try {
      const response = await fetchWithAuth(`tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ work_stage: newWorkStage }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update work stage");
      }

      const updatedTask = await response.json();
      
      // Update state
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, work_stage: updatedTask.work_stage } : t))
      );
      
      console.log(`Updated task ${taskId} work stage to ${newWorkStage}`);
    } catch (error) {
      console.error("Error updating work stage:", error);
      alert(`Failed to update work stage: ${error instanceof Error ? error.message : 'Please try again'}`);
    }
  };

  // Delete task handler
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      const response = await fetchWithAuth(`tasks/${taskToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete task");
      }

      // Remove from state
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error("Error deleting task:", error);
      alert(`Failed to delete task: ${error instanceof Error ? error.message : 'Please try again'}`);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Scheduled: "bg-blue-100 text-blue-800",
      "In Progress": "bg-yellow-100 text-yellow-800",
      Completed: "bg-green-100 text-green-800",
      Cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Tasks</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and track all your tasks in one place
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Task
          </Button>
        </div>
      </header>

      <div className="border-b bg-white px-8 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by task name or customer..."
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

          {/* Work Stage Filter */}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFilterWorkStage("all");
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
            <p className="text-sm text-gray-600">Total Tasks</p>
            <p className="text-2xl font-semibold">{tasks.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Filtered Results</p>
            <p className="text-2xl font-semibold">{filteredTasks.length}</p>
          </div>
          {/* Work stage counts */}
          {WORK_STAGES.map((stage) => {
            const count = tasks.filter((t) => t.work_stage === stage.value).length;
            if (count === 0) return null;
            return (
              <div key={stage.value}>
                <p className="text-sm text-gray-600">{stage.icon} {stage.label}</p>
                <p className="text-2xl font-semibold">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      <main className="px-8 py-6">
        {filteredTasks.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center">
            <Filter className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No tasks found</h3>
            <p className="mt-2 text-sm text-gray-600">
              {tasks.length === 0
                ? "Get started by creating your first task."
                : "Try adjusting your search or filter criteria."}
            </p>
            {tasks.length === 0 && (
              <Button onClick={() => setCreateModalOpen(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Task
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
                      Task ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      Task Name
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
                      Status
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
                  {filteredTasks.map((task) => {
                    // Format task ID as Task-XXX
                    const taskNumber = task.id.split('-').pop() || task.id;
                    const formattedId = `Task-${taskNumber.padStart(3, '0')}`;
                    
                    // Determine actual task type and work stage
                    const taskType = task.job_type || task.type;
                    const workStage = task.work_stage || 
                      (taskType === 'Survey' || taskType === 'Delivery' || taskType === 'Installation' 
                        ? taskType 
                        : 'Survey');
                    
                    // If type is a work stage, show it in work stage instead
                    const displayType = ['Survey', 'Delivery', 'Installation'].includes(taskType) 
                      ? 'Other' 
                      : taskType;
                    
                    return (
                    <tr
                      key={task.id}
                      onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{formattedId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">{task.title || "Untitled Task"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">{task.customer_name || "Unknown"}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{displayType}</span>
                      </td>
                      {/* Work Stage cell with inline editing */}
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={workStage}
                          onValueChange={(value) => handleUpdateWorkStage(task.id, value)}
                        >
                          <SelectTrigger className="w-[150px] h-8">
                            <SelectValue>
                              {workStage ? (
                                <JobStageBadge stage={workStage as any} size="sm" showIcon={true} />
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(task.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskToDelete(task);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Create Task Modal */}
      <CreateTaskModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen}
        onSuccess={loadTasks}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              {taskToDelete && (
                <>
                  <p className="mb-2">
                    Are you sure you want to delete this task?
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                    <p><strong>Task ID:</strong> #{taskToDelete.id}</p>
                    <p><strong>Customer:</strong> {taskToDelete.customer_name}</p>
                    <p><strong>Type:</strong> {taskToDelete.job_type || taskToDelete.type}</p>
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
              setTaskToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
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