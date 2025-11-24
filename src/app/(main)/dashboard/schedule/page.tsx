"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
  Check,
  X,
  Archive,
} from "lucide-react";
import { fetchWithAuth, api } from "@/lib/api";

// Interfaces
interface Employee {
  id: number;
  full_name: string;
  role?: string;
}

interface Job {
  id: string;
  job_reference: string;
  customer_name: string;
  customer_id: string;
  job_type: string;
  stage: string;
}

interface Customer {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  stage: string;
}

interface Assignment {
  id: string;
  type: "job" | "off" | "delivery" | "note";
  title: string;
  date: string;
  job_id?: string;
  customer_id?: string;
  start_time?: string;
  end_time?: string;
  estimated_hours?: number | string;
  notes?: string;
  priority?: string;
  status?: string;
  user_id?: number;
  team_member?: string;
  job_type?: string;
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
}

// Constants
const START_HOUR_WEEK = 7;
const HOUR_HEIGHT_PX = 60;
const timeSlotsWeek = Array.from({ length: 14 }, (_, i) => {
  const hour = i + START_HOUR_WEEK;
  return `${String(hour).padStart(2, "0")}:00`;
});

const interiorDesignJobTypes = [
  "Consultation",
  "Space Planning",
  "Concept Development",
  "FF&E Sourcing",
  "Site Visit",
  "Project Management",
  "Styling",
];

export default function SchedulePage() {
  const { user, token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [visibleCalendars, setVisibleCalendars] = useState<string[]>([]);
  const [showOwnCalendar, setShowOwnCalendar] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [originalAssignment, setOriginalAssignment] = useState<Assignment | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);

  // ✅ NEW: Custom assignees and tasks state
  const [customAssignees, setCustomAssignees] = useState<string[]>([]);
  const [customJobTasks, setCustomJobTasks] = useState<string[]>([]);

  // ✅ NEW: Input values for custom fields
  const [customAssigneeInput, setCustomAssigneeInput] = useState("");
  const [customTaskInput, setCustomTaskInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedAssignment, setDraggedAssignment] = useState<Assignment | null>(null);
  const [newAssignment, setNewAssignment] = useState<Partial<Assignment>>({
    type: "job",
    start_time: "09:00",
    end_time: "17:00",
    priority: "Medium",
    status: "Scheduled",
    estimated_hours: 8,
  });

  const [viewMode, setViewMode] = useState<"month" | "week" | "year">("month");

  // Memos
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const daysFromPrevMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const days: Date[] = [];

    for (let i = daysFromPrevMonth; i > 0; i--) {
      days.push(new Date(year, month, 1 - i));
    }
    for (let day = 1; day <= lastDay; day++) {
      days.push(new Date(year, month, day));
    }
    const remainingDays = 35 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }
    return days;
  }, [currentDate]);

  const weeks = useMemo(() => {
    const w: Date[][] = [];
    for (let i = 0; i < 5; i++) {
      w.push(calendarDays.slice(i * 7, (i + 1) * 7));
    }
    return w;
  }, [calendarDays]);

  const daysOfWeek = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const newDay = new Date(startOfWeek);
      newDay.setDate(startOfWeek.getDate() + i);
      days.push(newDay);
    }
    return days;
  }, [currentDate]);

  const assignmentsByDate = useMemo(() => {
    return assignments.reduce(
      (acc, assignment) => {
        const dateKey = assignment.date;
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(assignment);
        return acc;
      },
      {} as Record<string, Assignment[]>,
    );
  }, [assignments]);

  const declinedAssignments = useMemo(() => {
    if (user?.role === "Manager") return [];
    return assignments.filter((a) => a.user_id === user?.id && a.status === "Declined");
  }, [assignments, user]);

  // ✅ Load custom values from localStorage on mount
  useEffect(() => {
    const savedAssignees = localStorage.getItem('custom_assignees');
    const savedJobTasks = localStorage.getItem('custom_job_tasks');
    
    if (savedAssignees) {
      try {
        setCustomAssignees(JSON.parse(savedAssignees));
      } catch (e) {
        console.error('Failed to parse custom assignees:', e);
      }
    }
    if (savedJobTasks) {
      try {
        setCustomJobTasks(JSON.parse(savedJobTasks));
      } catch (e) {
        console.error('Failed to parse custom job tasks:', e);
      }
    }
  }, []);

  // ✅ Function to save custom assignee
  const saveCustomAssignee = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName && !customAssignees.includes(trimmedName)) {
      const updated = [...customAssignees, trimmedName];
      setCustomAssignees(updated);
      localStorage.setItem('custom_assignees', JSON.stringify(updated));
    }
  };

  // ✅ Function to save custom job/task
  const saveCustomJobTask = (task: string) => {
    const trimmedTask = task.trim();
    if (trimmedTask && !customJobTasks.includes(trimmedTask) && !interiorDesignJobTypes.includes(trimmedTask)) {
      const updated = [...customJobTasks, trimmedTask];
      setCustomJobTasks(updated);
      localStorage.setItem('custom_job_tasks', JSON.stringify(updated));
    }
  };

  // Helper functions
  const formatDateKey = (date: Date | string) => {
    if (typeof date === "string") return date;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatHeaderDate = (date: Date, view: "month" | "week" | "year") => {
    if (view === "year") {
      return date.getFullYear().toString();
    }
    if (view === "week") {
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
      }
      return `${startOfWeek.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${endOfWeek.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return date.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  };

  const navigateView = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "prev" ? -1 : 1));
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + (direction === "prev" ? -7 : 7));
    } else if (viewMode === "year") {
      newDate.setFullYear(newDate.getFullYear() + (direction === "prev" ? -1 : 1));
    }
    setCurrentDate(newDate);
  };

  const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return "";
    const startDate = new Date(`2000-01-01T${start}:00`);
    const endDate = new Date(`2000-01-01T${end}:00`);
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) return "";
    return (diffMs / (1000 * 60 * 60)).toFixed(2);
  };

  const timeToMinutes = (time: string = "00:00") => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + (minutes || 0);
  };

  const getAssignmentWeekStyle = (start?: string, end?: string): React.CSSProperties => {
    if (!start || !end) {
      return { top: 0, height: `${HOUR_HEIGHT_PX}px` };
    }

    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);

    const top = ((startMinutes - START_HOUR_WEEK * 60) / 60) * HOUR_HEIGHT_PX;
    const durationMinutes = Math.max(30, endMinutes - startMinutes);
    const height = (durationMinutes / 60) * HOUR_HEIGHT_PX;

    return {
      top: `${top}px`,
      height: `${height}px`,
      position: "absolute",
      left: "0.25rem",
      right: "0.25rem",
    };
  };

  // Data fetching
  const fetchData = async () => {
    if (!token || !user) {
      console.warn("⚠️ No token or user found");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Starting data fetch...");
      console.log(`User: ${user.full_name} (${user.role})`);

      let assignmentsData = [];
      try {
        assignmentsData = await api.getAssignments();
        setAssignments(assignmentsData);
      } catch (err) {
        console.error("❌ Failed to fetch assignments:", err);
        setError("Failed to load assignments. Please try again.");
        setAssignments([]);
      }

      const jobsData = await api.getAvailableJobs();
      setAvailableJobs(jobsData);

      const customersData = await api.getActiveCustomers();
      setCustomers(customersData);

      console.log("✅ Data fetch complete");
      console.log(`Summary: ${assignmentsData.length} assignments, ${jobsData.length} jobs, ${customersData.length} customers`);

    } catch (err) {
      console.error("❌ Critical error in fetchData:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // CRUD operations
  const createAssignment = async (assignmentData: Partial<Assignment>) => {
    if (!token) throw new Error("Not authenticated");

    try {
      setSaving(true);

      let title = assignmentData.title || "";

      if (!title) {
        switch (assignmentData.type) {
          case "job":
            if (assignmentData.job_id) {
              const job = availableJobs.find((j) => j.id === assignmentData.job_id);
              title = job ? `${job.job_reference} - ${job.customer_name}` : "Job Assignment";
            } else if (assignmentData.customer_id) {
              const customer = customers.find((c) => c.id === assignmentData.customer_id);
              title = customer ? `Job - ${customer.name}` : "Job Assignment";
            } else {
              title = "Job Assignment";
            }
            break;
          case "off":
            title = "Day Off";
            break;
          case "delivery":
            title = "Deliveries";
            break;
          case "note":
            title = assignmentData.notes || "Note";
            break;
          default:
            title = "Assignment";
        }
      } else if (assignmentData.type === "job" && assignmentData.customer_id && !assignmentData.job_id) {
        const customer = customers.find((c) => c.id === assignmentData.customer_id);
        if (customer) {
          title = `${title} - ${customer.name}`;
        }
      }

      const finalAssignmentData = {
        ...assignmentData,
        title,
        user_id: assignmentData.user_id || user?.id,
        status: user?.role === "Manager" || assignmentData.user_id === user?.id ? "Accepted" : "Scheduled",
      };

      console.log("Sending assignment data:", finalAssignmentData);

      const newAssignment = await api.createAssignment(finalAssignmentData);
      
      setAssignments((prev) => [...prev, newAssignment]);
      return newAssignment;
    } catch (err) {
      console.error("Error creating assignment:", err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const updateAssignment = async (id: string, assignmentData: Partial<Assignment>) => {
    if (!token) throw new Error("Not authenticated");

    try {
      setSaving(true);
      
      const updatedAssignment = await api.updateAssignment(id, assignmentData);
      
      setAssignments((prev) => prev.map((a) => (a.id === id ? updatedAssignment : a)));
      return updatedAssignment;
    } catch (err) {
      console.error("Error updating assignment:", err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (id: string) => {
    if (!token) throw new Error("Not authenticated");

    try {
      setSaving(true);
      
      await api.deleteAssignment(id);
      
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Error deleting assignment:", err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleAssignmentResponse = async (assignment: Assignment, newStatus: "Accepted" | "Declined") => {
    try {
      await updateAssignment(assignment.id, { status: newStatus });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  // Effects
  useEffect(() => {
    if (!user || !token) return;

    setVisibleCalendars([user.full_name]);

    const fetchEmployees = async () => {
      if (user.role !== "Manager") return;

      try {
        const res = await fetchWithAuth("auth/users/staff");

        if (!res.ok) {
          throw new Error(`Failed to fetch staff: ${res.status}`);
        }

        const data = await res.json();
        setEmployees(data.users || []);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };

    fetchEmployees();
  }, [user, token]);

  useEffect(() => {
    if (user && token) {
      fetchData();
    }
  }, [user, token]);

  // Event handlers
  const toggleCalendarVisibility = (name: string) => {
    setVisibleCalendars((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  const getAssignmentsForDate = (date: Date) => {
    const dateKey = formatDateKey(date);
    const allDayAssignments = assignments.filter((a) => a.date === dateKey);

    if (user?.role === "Manager") {
      return allDayAssignments.filter((a) => visibleCalendars.includes(a.team_member ?? ""));
    }

    return allDayAssignments.filter((a) => a.status !== "Declined");
  };

  const getDailyHours = (date: Date) => {
    const dayAssignments = getAssignmentsForDate(date);
    return dayAssignments.reduce((total, a) => {
      const h = typeof a.estimated_hours === "string" ? parseFloat(a.estimated_hours) : a.estimated_hours || 0;
      return total + (isNaN(h) ? 0 : h);
    }, 0);
  };

  const isOverbooked = (date: Date) => getDailyHours(date) > 8;

  const getAssignmentColor = (assignment: Assignment) => {
    switch (assignment.type) {
      case "off":
        return "bg-gray-200 text-gray-800 border-gray-300";
      case "delivery":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "note":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "job":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.date || !newAssignment.type) {
      alert("Please fill in required fields");
      return;
    }

    // ✅ Save custom values if they were typed
    if (customAssigneeInput.trim()) {
      saveCustomAssignee(customAssigneeInput);
    }
    if (customTaskInput.trim()) {
      saveCustomJobTask(customTaskInput);
    }

    try {
      await createAssignment(newAssignment);
      setShowAddDialog(false);
      setNewAssignment({
        type: "job",
        start_time: "09:00",
        end_time: "17:00",
        priority: "Medium",
        status: "Scheduled",
        estimated_hours: 8,
      });
      setCustomAssigneeInput("");
      setCustomTaskInput("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create assignment");
    }
  };

  const handleEditAssignment = async () => {
    if (!selectedAssignment) return;
    
    // ✅ Save custom values if they were typed
    if (customAssigneeInput.trim()) {
      saveCustomAssignee(customAssigneeInput);
    }
    if (customTaskInput.trim()) {
      saveCustomJobTask(customTaskInput);
    }
    
    try {
      await updateAssignment(selectedAssignment.id, selectedAssignment);
      setShowAssignmentDialog(false);
      setSelectedAssignment(null);
      setOriginalAssignment(null);
      setIsEditingAssignment(false);
      setCustomAssigneeInput("");
      setCustomTaskInput("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update assignment");
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;

    try {
      await deleteAssignment(assignmentId);
      setShowAssignmentDialog(false);
      setSelectedAssignment(null);
      setOriginalAssignment(null);
      setIsEditingAssignment(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete assignment");
    }
  };

  const handleDragStart = (assignment: Assignment) => {
    setDraggedAssignment(assignment);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (!draggedAssignment) return;

    if (
      user?.role !== "Manager" &&
      draggedAssignment.created_by !== user?.id &&
      draggedAssignment.status === "Scheduled"
    ) {
      alert("Please accept or decline the assignment before moving it.");
      setDraggedAssignment(null);
      return;
    }

    const dateKey = formatDateKey(date);
    try {
      await updateAssignment(draggedAssignment.id, { date: dateKey });
      setDraggedAssignment(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to move assignment");
      setDraggedAssignment(null);
    }
  };

  const gridColumnStyle = { gridTemplateColumns: `repeat(7, 156.4px)` } as React.CSSProperties;
  const weekdayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Loading/Error states
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading schedule...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-lg font-medium text-red-900">Error Loading Schedule</h3>
          <p className="mb-4 text-red-600">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Render functions (keeping the existing month/week/year view render functions...)
  // [Previous render functions remain the same - too long to repeat here]

  // Main render
  return (
    <div className="min-h-screen bg-white">
      {/* Previous header and toolbar code remains the same */}
      
      {/* Add Dialog - UPDATED */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
            <DialogDescription>Schedule a new assignment for the selected day.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type and Date fields remain the same */}
            
            {(newAssignment.type === "job" || newAssignment.type === "off") && (
              <>
                {/* Start/End Time fields remain the same */}
                
                {/* ✅ NEW: Simple Type-Only Assign To Field */}
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Input
                    placeholder="Type team member name..."
                    list="assignee-suggestions"
                    value={customAssigneeInput || newAssignment.team_member || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomAssigneeInput(value);
                      setNewAssignment({ 
                        ...newAssignment, 
                        team_member: value,
                        user_id: undefined 
                      });
                    }}
                  />
                  <datalist id="assignee-suggestions">
                    {customAssignees.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  {customAssignees.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Previously used: {customAssignees.join(", ")}
                    </p>
                  )}
                </div>
              </>
            )}

            {newAssignment.type === "job" && (
              <>
                {/* ✅ NEW: Simple Type-Only Job/Task Field */}
                <div className="space-y-2">
                  <Label>Job / Task</Label>
                  <Input
                    placeholder="Type job or task..."
                    list="task-suggestions"
                    value={customTaskInput || newAssignment.title || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomTaskInput(value);
                      setNewAssignment({
                        ...newAssignment,
                        title: value,
                        job_type: value,
                        job_id: undefined,
                      });
                    }}
                  />
                  <datalist id="task-suggestions">
                    {interiorDesignJobTypes.map((task) => (
                      <option key={task} value={task} />
                    ))}
                    {customJobTasks.map((task) => (
                      <option key={task} value={task} />
                    ))}
                    {availableJobs.map((job) => (
                      <option 
                        key={job.id} 
                        value={`${job.job_reference} - ${job.customer_name}`} 
                      />
                    ))}
                  </datalist>
                  {(interiorDesignJobTypes.length > 0 || customJobTasks.length > 0) && (
                    <p className="text-xs text-gray-500">
                      Standard tasks: {interiorDesignJobTypes.join(", ")}
                      {customJobTasks.length > 0 && `, Custom: ${customJobTasks.join(", ")}`}
                    </p>
                  )}
                </div>

                {/* Customer field remains the same */}
              </>
            )}

            {/* Rest of the dialog remains the same */}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAssignment} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Assignment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Similar updates */}
    </div>
  );
}