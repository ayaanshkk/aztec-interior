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

// Helper functions - MOVED BEFORE COMPONENT
const formatDateKey = (date: Date | string) => {
  if (typeof date === "string") return date;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Constants
const START_HOUR_WEEK = 7;
const HOUR_HEIGHT_PX = 60;
const timeSlotsWeek = Array.from({ length: 14 }, (_, i) => {
  const hour = i + START_HOUR_WEEK;
  return `${String(hour).padStart(2, "0")}:00`;
});

const interiorDesignJobTypes = [
  "Survey",
  "Delivery", 
  "Installation",
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

  // ✅ Custom assignees and tasks state
  const [customAssignees, setCustomAssignees] = useState<string[]>([]);
  const [customJobTasks, setCustomJobTasks] = useState<string[]>([]);
  const [customAssigneeInput, setCustomAssigneeInput] = useState("");
  const [customTaskInput, setCustomTaskInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedAssignment, setDraggedAssignment] = useState<Assignment | null>(null);
  
  // ✅ FIXED: Pre-fill date and time with defaults
  const [newAssignment, setNewAssignment] = useState<Partial<Assignment>>({
    type: "job",
    date: formatDateKey(new Date()),
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

  // ✅ FIXED: Handle assignments without dates
  const assignmentsByDate = useMemo(() => {
    return assignments.reduce(
      (acc, assignment) => {
        // Skip assignments without a date
        if (!assignment || !assignment.date) {
          console.warn("Assignment without date found:", assignment);
          return acc;
        }
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

      const [assignmentsData, jobsData, customersData] = await Promise.all([
        api.getAssignments().catch(() => []),
        api.getAvailableJobs().catch(() => []),
        api.getActiveCustomers().catch(() => [])
      ]);

      setAssignments(assignmentsData);
      setAvailableJobs(jobsData);
      setCustomers(customersData);

      console.log("✅ Data loaded successfully");
    } catch (err) {
      console.error("❌ Error in fetchData:", err);
      setError("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  };

  // CRUD operations
  const createAssignment = async (assignmentData: Partial<Assignment>) => {
    if (!token) throw new Error("Not authenticated");
    
    // ✅ VALIDATE: Ensure date is provided
    if (!assignmentData.date) {
      throw new Error("Date is required for assignment");
    }

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
      }

      // ✅ Calculate estimated hours if start and end time are provided
      let estimatedHours = assignmentData.estimated_hours;
      if (assignmentData.start_time && assignmentData.end_time && !estimatedHours) {
        const hours = calculateHours(assignmentData.start_time, assignmentData.end_time);
        estimatedHours = hours ? parseFloat(hours) : 8;
      }

      // ✅ CLEAN THE DATA - Remove any invalid fields
      const cleanedData = {
        type: assignmentData.type,
        title: title,
        date: assignmentData.date,
        start_time: assignmentData.start_time,
        end_time: assignmentData.end_time,
        estimated_hours: estimatedHours,
        notes: assignmentData.notes,
        priority: assignmentData.priority,
        status: user?.role === "Manager" || assignmentData.user_id === user?.id ? "Accepted" : "Scheduled",
        user_id: assignmentData.user_id || user?.id,
        team_member: assignmentData.team_member,
        job_id: assignmentData.job_id,
        customer_id: assignmentData.customer_id,
        job_type: assignmentData.job_type,
      };

      // Remove undefined values
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key as keyof typeof cleanedData] === undefined) {
          delete cleanedData[key as keyof typeof cleanedData];
        }
      });

      console.log("📤 Creating assignment with data:", cleanedData);

      const newAssignment = await api.createAssignment(cleanedData);
      setAssignments((prev) => [...prev, newAssignment]);
      return newAssignment;
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
    } finally {
      setSaving(false);
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
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.users || []);
        }
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
    const allDayAssignments = assignments.filter((a) => a && a.date && a.date === dateKey);

    if (user?.role === "Manager") {
      return allDayAssignments.filter((a) => visibleCalendars.includes(a.team_member ?? ""));
    }

    return allDayAssignments.filter((a) => a.status !== "Declined");
  };

  const getDailyHours = (date: Date) => {
    const dayAssignments = getAssignmentsForDate(date);
    return dayAssignments.reduce((total, a) => {
      if (!a || !a.estimated_hours) return total;
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
      alert("Please fill in required fields (Type and Date)");
      return;
    }

    if (customAssigneeInput.trim()) saveCustomAssignee(customAssigneeInput);
    if (customTaskInput.trim()) saveCustomJobTask(customTaskInput);

    try {
      await createAssignment(newAssignment);
      setShowAddDialog(false);
      // ✅ Reset with default values including today's date
      setNewAssignment({
        type: "job",
        date: formatDateKey(new Date()),
        start_time: "09:00",
        end_time: "17:00",
        priority: "Medium",
        status: "Scheduled",
        estimated_hours: 8,
      });
      setCustomAssigneeInput("");
      setCustomTaskInput("");
    } catch (err) {
      console.error("Error creating assignment:", err);
      alert(err instanceof Error ? err.message : "Failed to create assignment");
    }
  };

  const handleEditAssignment = async () => {
    if (!selectedAssignment) return;
    
    if (customAssigneeInput.trim()) saveCustomAssignee(customAssigneeInput);
    if (customTaskInput.trim()) saveCustomJobTask(customTaskInput);
    
    try {
      await updateAssignment(selectedAssignment.id, selectedAssignment);
      setShowAssignmentDialog(false);
      setSelectedAssignment(null);
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

    const dateKey = formatDateKey(date);
    try {
      await updateAssignment(draggedAssignment.id, { date: dateKey });
      setDraggedAssignment(null);
    } catch (err) {
      alert("Failed to move assignment");
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

  // Main render
  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {user?.role === "Manager" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Calendars <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Visible Calendars</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {employees.map((emp) => (
                  <DropdownMenuCheckboxItem
                    key={emp.id}
                    checked={visibleCalendars.includes(emp.full_name)}
                    onCheckedChange={() => toggleCalendarVisibility(emp.full_name)}
                  >
                    {emp.full_name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateView("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateView("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-4 text-xl font-semibold">
            {formatHeaderDate(currentDate, viewMode)}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => {
            // ✅ FIXED: Keep existing defaults, only update date to today if needed
            setNewAssignment(prev => ({
              ...prev,
              type: prev.type || "job",
              date: formatDateKey(new Date()),
              start_time: prev.start_time || "09:00",
              end_time: prev.end_time || "17:00",
              priority: prev.priority || "Medium",
              status: prev.status || "Scheduled",
              estimated_hours: prev.estimated_hours || 8,
            }));
            setShowAddDialog(true);
          }}>
            Add Assignment
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === "month" && (
        <div className="rounded-lg border">
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {weekdayShort.map((day) => (
              <div key={day} className="border-r p-2 text-center text-sm font-medium last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = day.toDateString() === new Date().toDateString();
              const dayAssignments = getAssignmentsForDate(day);
              const overbooked = isOverbooked(day);

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] border-b border-r p-2 last:border-r-0 cursor-pointer transition-colors hover:bg-gray-50 ${
                    isCurrentMonth ? "bg-white" : "bg-gray-50"
                  } ${isToday ? "ring-2 ring-inset ring-blue-500" : ""}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                  onClick={() => {
                    // ✅ FIXED: Set clicked date but keep default times
                    setNewAssignment({
                      type: "job",
                      date: formatDateKey(day),
                      start_time: "09:00",
                      end_time: "17:00",
                      priority: "Medium",
                      status: "Scheduled",
                      estimated_hours: 8,
                    });
                    setShowAddDialog(true);
                  }}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`text-sm ${isToday ? "font-bold text-blue-600" : ""}`}>
                      {day.getDate()}
                    </span>
                    {overbooked && (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayAssignments.slice(0, 3).map((assignment) => (
                    assignment && assignment.id ?
                      <div
                        key={assignment.id}
                        draggable
                        onDragStart={() => handleDragStart(assignment)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAssignment(assignment);
                          setShowAssignmentDialog(true);
                        }}
                        className={`cursor-pointer rounded border px-2 py-1 text-xs ${getAssignmentColor(assignment)}`}
                      >
                        {assignment.title}
                      </div>
                    ))}
                    {dayAssignments.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayAssignments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "week" && (
        <div className="rounded-lg border">
          <div className="grid grid-cols-8 border-b bg-gray-50">
            <div className="border-r p-2"></div>
            {daysOfWeek.map((day) => (
              <div key={day.toISOString()} className="border-r p-2 text-center last:border-r-0">
                <div className="text-sm font-medium">{weekdayShort[day.getDay() === 0 ? 6 : day.getDay() - 1]}</div>
                <div className="text-xs text-gray-600">{day.getDate()}</div>
              </div>
            ))}
          </div>
          <div className="relative grid grid-cols-8">
            <div className="border-r">
              {timeSlotsWeek.map((time) => (
                <div key={time} className="border-b p-2 text-xs text-gray-600" style={{ height: `${HOUR_HEIGHT_PX}px` }}>
                  {time}
                </div>
              ))}
            </div>
            {daysOfWeek.map((day) => {
              const dayAssignments = getAssignmentsForDate(day);
              return (
                <div
                  key={day.toISOString()}
                  className="relative border-r last:border-r-0"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  {timeSlotsWeek.map((time) => (
                    <div
                      key={time}
                      className="border-b"
                      style={{ height: `${HOUR_HEIGHT_PX}px` }}
                    />
                  ))}
                  {dayAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      draggable
                      onDragStart={() => handleDragStart(assignment)}
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setShowAssignmentDialog(true);
                      }}
                      className={`cursor-pointer rounded border p-1 text-xs ${getAssignmentColor(assignment)}`}
                      style={getAssignmentWeekStyle(assignment.start_time, assignment.end_time)}
                    >
                      <div className="font-medium">{assignment.title}</div>
                      <div className="text-xs opacity-75">
                        {assignment.start_time} - {assignment.end_time}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newAssignment.type}
                onValueChange={(value: "job" | "off" | "delivery" | "note") => {
                  setNewAssignment({ ...newAssignment, type: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job">Job</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={newAssignment.date}
                onChange={(e) => setNewAssignment({ ...newAssignment, date: e.target.value })}
              />
            </div>

            {/* Time fields - only for Job and Off */}
            {(newAssignment.type === "job" || newAssignment.type === "off") && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newAssignment.start_time || ""}
                      onChange={(e) => setNewAssignment({ ...newAssignment, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newAssignment.end_time || ""}
                      onChange={(e) => setNewAssignment({ ...newAssignment, end_time: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Assign To */}
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Input
                placeholder="Type team member name..."
                list="assignee-suggestions"
                value={customAssigneeInput}
                onChange={(e) => {
                  setCustomAssigneeInput(e.target.value);
                  setNewAssignment({ ...newAssignment, team_member: e.target.value });
                }}
              />
              <datalist id="assignee-suggestions">
                {customAssignees.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            {/* Job/Task - only for Job type */}
            {newAssignment.type === "job" && (
              <div className="space-y-2">
                <Label>Job/Task</Label>
                <Select
                  value={newAssignment.job_type || newAssignment.title || ""}
                  onValueChange={(value) => {
                    if (value.includes(" - ")) {
                      const jobId = availableJobs.find(
                        (j) => `${j.job_reference} - ${j.customer_name}` === value
                      )?.id;
                      setNewAssignment({
                        ...newAssignment,
                        title: value,
                        job_id: jobId,
                        job_type: undefined,
                      });
                    } else {
                      setNewAssignment({
                        ...newAssignment,
                        title: value,
                        job_type: value,
                        job_id: undefined,
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job or task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Standard Tasks</SelectLabel>
                      {interiorDesignJobTypes.map((task) => (
                        <SelectItem key={task} value={task}>
                          {task}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {customJobTasks.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Custom Tasks</SelectLabel>
                        {customJobTasks.map((task) => (
                          <SelectItem key={task} value={task}>
                            {task}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {availableJobs.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Available Jobs</SelectLabel>
                        {availableJobs.map((job) => (
                          <SelectItem
                            key={job.id}
                            value={`${job.job_reference} - ${job.customer_name}`}
                          >
                            {job.job_reference} - {job.customer_name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Customer Dropdown */}
            <div className="space-y-2">
              <Label>Customer (Optional)</Label>
              <Select
                value={newAssignment.customer_id || "none"}
                onValueChange={(value) => {
                  setNewAssignment({
                    ...newAssignment,
                    customer_id: value === "none" ? undefined : value,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="w-full min-h-[100px] p-2 border rounded-md"
                value={newAssignment.notes || ""}
                onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })}
                placeholder="Add any additional notes..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAssignment} disabled={saving}>
                {saving ? "Adding..." : "Add Assignment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Edit Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditingAssignment ? "Edit Assignment" : "Assignment Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <p className="text-sm">{selectedAssignment.title}</p>
              </div>
              <div>
                <Label>Date</Label>
                <p className="text-sm">{selectedAssignment.date}</p>
              </div>
              {selectedAssignment.start_time && (
                <div>
                  <Label>Time</Label>
                  <p className="text-sm">
                    {selectedAssignment.start_time} - {selectedAssignment.end_time}
                  </p>
                </div>
              )}
              {selectedAssignment.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm">{selectedAssignment.notes}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignmentDialog(false);
                    setSelectedAssignment(null);
                  }}
                >
                  Close
                </Button>
                {user?.role === "Manager" && (
                  <Button
                    variant="destructive"
                    onClick={() => selectedAssignment && handleDeleteAssignment(selectedAssignment.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}