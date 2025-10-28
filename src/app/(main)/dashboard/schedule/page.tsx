"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem, // <-- ADDED
  DropdownMenuLabel, // <-- ADDED
  DropdownMenuSeparator, // <-- ADDED
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
  Check, // <-- ADDED
  X, // <-- ADDED
  Archive, // <-- ADDED
} from "lucide-react";

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
  team_member?: string; // Assigned To (Name)
  job_type?: string; // <-- ADDED (Task 1)
  created_by?: number; // <-- ADDED (Task 2)
  created_by_name?: string; // <-- ADDED (Task 2)
  updated_by?: number; // <-- ADDED (Task 2)
  updated_by_name?: string; // <-- ADDED (Task 2)
}

// --- CONSTANTS FOR WEEK VIEW ---
const START_HOUR_WEEK = 7; // 7 AM
const HOUR_HEIGHT_PX = 60; // 60px per hour
const timeSlotsWeek = Array.from({ length: 14 }, (_, i) => { // 7 AM to 8 PM (14 hours)
  const hour = i + START_HOUR_WEEK;
  return `${String(hour).padStart(2, '0')}:00`;
});

// --- NEW STATIC LIST FOR JOB TYPES ---
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
  
  // --- MODIFIED STATE FOR VIEW/EDIT MODAL (Task 3) ---
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [originalAssignment, setOriginalAssignment] = useState<Assignment | null>(null); // To restore on cancel
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false); // Renamed from showEditDialog
  const [isEditingAssignment, setIsEditingAssignment] = useState(false); // Controls view/edit state
  // --- END MODIFIED STATE ---

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedAssignment, setDraggedAssignment] = useState<Assignment | null>(null);
  const [newAssignment, setNewAssignment] = useState<Partial<Assignment>>({
    type: "job",
    start_time: "09:00",
    end_time: "17:00",
    priority: "Medium",
    status: "Scheduled", // Default status
    estimated_hours: 8,
  });

  const [viewMode, setViewMode] = useState<"month" | "week" | "year">("month");

  // --- MEMOS FOR CALENDAR DAYS ---

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
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
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
    return assignments.reduce((acc, assignment) => {
      const dateKey = assignment.date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(assignment);
      return acc;
    }, {} as Record<string, Assignment[]>);
  }, [assignments]);

  // --- NEW MEMO FOR DECLINED ASSIGNMENTS (Task 7) ---
  const declinedAssignments = useMemo(() => {
    if (user?.role === 'Manager') return [];
    return assignments.filter(a => a.user_id === user?.id && a.status === 'Declined');
  }, [assignments, user]);


  // --- FORMATTING & NAVIGATION ---

  const formatDateKey = (date: Date | string) => {
    if (typeof date === "string") return date;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatHeaderDate = (date: Date, view: "month" | "week" | "year") => {
    if (view === 'year') {
      return date.getFullYear().toString();
    }
    if (view === 'week') {
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
    // default to month
    return date.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  };

  const navigateView = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === "prev" ? -1 : 1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === "prev" ? -7 : 7));
    } else if (viewMode === 'year') {
      newDate.setFullYear(newDate.getFullYear() + (direction === "prev" ? -1 : 1));
    }
    setCurrentDate(newDate);
  };

  // --- TIME & ASSIGNMENT HELPERS ---

  const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return '';
    const startDate = new Date(`2000-01-01T${start}:00`);
    const endDate = new Date(`2000-01-01T${end}:00`);
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) return '';
    return (diffMs / (1000 * 60 * 60)).toFixed(2);
  };

  const timeToMinutes = (time: string = "00:00") => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  const getAssignmentWeekStyle = (start?: string, end?: string): React.CSSProperties => {
    if (!start || !end) {
      // Default for untimed (e.g., 'note', 'delivery')
      return { top: 0, height: `${HOUR_HEIGHT_PX}px` };
    }

    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);

    const top = ((startMinutes - (START_HOUR_WEEK * 60)) / 60) * HOUR_HEIGHT_PX;
    const durationMinutes = Math.max(30, endMinutes - startMinutes); // Min 30 min height
    const height = (durationMinutes / 60) * HOUR_HEIGHT_PX;

    return {
      top: `${top}px`,
      height: `${height}px`,
      position: 'absolute',
      left: '0.25rem', // p-1
      right: '0.25rem'
    };
  };

  // --- DATA FETCHING & CRUD ---

  const fetchData = async () => {
    if (!token || !user) return;

    try {
      setLoading(true);
      setError(null);

      const [assignmentsRes, jobsRes, customersRes] = await Promise.all([
        fetch('http://127.0.0.1:5000/assignments', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://127.0.0.1:5000/jobs/available', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://127.0.0.1:5000/customers/active', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!assignmentsRes.ok || !jobsRes.ok || !customersRes.ok) {
        throw new Error('API not available');
      }

      const [assignmentsData, jobsData, customersData] = await Promise.all([
        assignmentsRes.json(),
        jobsRes.json(),
        customersRes.json(),
      ]);

      setAssignments(assignmentsData);
      setAvailableJobs(jobsData);
      setCustomers(customersData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // --- MODIFIED createAssignment ---
  const createAssignment = async (assignmentData: Partial<Assignment>) => {
    if (!token) throw new Error('Not authenticated');

    try {
      setSaving(true);

      let title = assignmentData.title || ""; // <-- Check for pre-set title (e.g., from job_type)

      if (!title) { // If no title, generate one
        switch (assignmentData.type) {
          case "job":
            if (assignmentData.job_id) {
              const job = availableJobs.find(j => j.id === assignmentData.job_id);
              title = job ? `${job.job_reference} - ${job.customer_name}` : "Job Assignment";
            } else if (assignmentData.customer_id) {
              const customer = customers.find(c => c.id === assignmentData.customer_id);
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
        // If title *was* set (e.g., "Consultation") and customer was *also* set, but it's not a full job
        const customer = customers.find(c => c.id === assignmentData.customer_id);
        if (customer) {
          title = `${title} - ${customer.name}`; // e.g., "Consultation - John Doe"
        }
      }

      const finalAssignmentData = {
        ...assignmentData,
        title, // Use the determined title
        user_id: assignmentData.user_id || user?.id,
        status: (user?.role === 'Manager' || assignmentData.user_id === user?.id) ? 'Accepted' : 'Scheduled', // Auto-accept self-assigned/manager-assigned
      };

      console.log('Sending assignment data:', finalAssignmentData);

      const response = await fetch('http://127.0.0.1:5000/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(finalAssignmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create assignment');
      }

      const result = await response.json();
      setAssignments(prev => [...prev, result.assignment]);
      return result.assignment;
    } catch (err) {
      console.error('Error creating assignment:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const updateAssignment = async (id: string, assignmentData: Partial<Assignment>) => {
    if (!token) throw new Error('Not authenticated');

    try {
      setSaving(true);
      const response = await fetch(`http://127.0.0.1:5000/assignments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assignmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update assignment');
      }

      const result = await response.json();
      setAssignments(prev => prev.map(a => a.id === id ? result.assignment : a));
      return result.assignment;
    } catch (err)
 {
      console.error('Error updating assignment:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (id: string) => {
    if (!token) throw new Error('Not authenticated');

    try {
      setSaving(true);
      const response = await fetch(`http://127.0.0.1:5000/assignments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete assignment');
      }

      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting assignment:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // --- NEW HANDLER FOR ASSIGNMENT RESPONSE (Task 6) ---
  const handleAssignmentResponse = async (assignment: Assignment, newStatus: "Accepted" | "Declined") => {
    try {
      await updateAssignment(assignment.id, { status: newStatus });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // --- USE EFFECTS ---

  // Fetch employees if manager
  useEffect(() => {
    if (!user || !token) return;

    // Set default visible calendar for all users
    setVisibleCalendars([user.full_name]);

    const fetchEmployees = async () => {
      if (user.role !== 'Manager') return;

      try {
        const res = await fetch('http://127.0.0.1:5000/auth/users/staff', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch staff: ${res.status}`);
        }

        const data = await res.json();
        setEmployees(data.users || []);
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };

    fetchEmployees();
  }, [user, token]);

  // Fetch data on mount
  useEffect(() => {
    if (user && token) {
      fetchData();
    }
  }, [user, token]);

  // --- EVENT HANDLERS & HELPERS ---

  const toggleCalendarVisibility = (name: string) => {
    setVisibleCalendars(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  // --- MODIFIED getAssignmentsForDate (Task 6) ---
  const getAssignmentsForDate = (date: Date) => {
    const dateKey = formatDateKey(date);
    const allDayAssignments = assignments.filter(a => a.date === dateKey);

    if (user?.role === 'Manager') {
      return allDayAssignments.filter(a =>
        visibleCalendars.includes(a.team_member ?? '')
      );
    }

    // Non-manager: Filter out declined
    // Backend already filters by user_id for non-managers
    return allDayAssignments.filter(a => a.status !== 'Declined');
  };

  const getDailyHours = (date: Date) => {
    const dayAssignments = getAssignmentsForDate(date);
    return dayAssignments.reduce((total, a) => {
      const h = typeof a.estimated_hours === 'string' ? parseFloat(a.estimated_hours) : (a.estimated_hours || 0);
      return total + (isNaN(h) ? 0 : h);
    }, 0);
  };

  const isOverbooked = (date: Date) => getDailyHours(date) > 8;

  const getAssignmentColor = (assignment: Assignment) => {
    // Pending status is handled by a separate component render
    
    switch (assignment.type) {
      case "off":
        return "bg-gray-200 text-gray-800 border-gray-300";
      case "delivery":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "note":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "job":
        // Accepted, Scheduled (by self), or Manager view
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.date || !newAssignment.type) {
      alert('Please fill in required fields');
      return;
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
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create assignment');
    }
  };

  // --- MODIFIED handleEditAssignment (Task 3) ---
  const handleEditAssignment = async () => {
    if (!selectedAssignment) return;
    try {
      await updateAssignment(selectedAssignment.id, selectedAssignment);
      setShowAssignmentDialog(false);
      setSelectedAssignment(null);
      setOriginalAssignment(null);
      setIsEditingAssignment(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update assignment');
    }
  };

  // --- MODIFIED handleDeleteAssignment (Task 8) ---
  // This function is no longer called from the modal but is kept for potential future use
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await deleteAssignment(assignmentId);
      setShowAssignmentDialog(false);
      setSelectedAssignment(null);
      setOriginalAssignment(null);
      setIsEditingAssignment(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete assignment');
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

    // Prevent dropping a pending assignment (Task 6)
    if (user?.role !== 'Manager' &&
      draggedAssignment.created_by !== user?.id &&
      draggedAssignment.status === 'Scheduled') {
      alert("Please accept or decline the assignment before moving it.");
      setDraggedAssignment(null);
      return;
    }

    const dateKey = formatDateKey(date);
    try {
      await updateAssignment(draggedAssignment.id, { date: dateKey });
      setDraggedAssignment(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to move assignment');
      setDraggedAssignment(null);
    }
  };

  const gridColumnStyle = { gridTemplateColumns: `repeat(7, 156.4px)` } as React.CSSProperties;
  const weekdayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // --- LOADING / ERROR (Unchanged) ---
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading schedule...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Schedule</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
      </div>
    );
  }


  // --- RENDER FUNCTIONS ---

  // --- MODIFIED renderMonthView (Task 6) ---
  const renderMonthView = () => (
    <div className="p-6 pr-0">
      <div className="border rounded-lg overflow-auto shadow-sm">
        <div className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <div className="grid" style={gridColumnStyle}>
            {weekdayShort.map((wd, idx) => (
              <div key={idx} className="p-3 border-r border-gray-200 text-center min-w-[140px]">
                <div className="text-xs font-medium text-gray-900">{wd}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid" style={gridColumnStyle}>
              {week.map((day, dayIndex) => {
                const dayKey = formatDateKey(day);
                const dayAssignments = getAssignmentsForDate(day);
                const dailyHours = getDailyHours(day);
                const overbooked = isOverbooked(day);

                return (
                  <div
                    key={dayIndex}
                    className="p-2 border-r border-gray-200 min-h-[120px] relative bg-white"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day)}
                  >

                    <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                      <div
                        className={`flex items-center justify-center w-6 h-6 text-[13px] rounded-full ${day.toDateString() === new Date().toDateString()
                            ? 'bg-black text-white'
                            : 'text-gray-500'
                          }`}
                      >
                        {day.getDate()}
                      </div>
                      {dailyHours > 0 && (
                        <div className="text-[11px] text-gray-500">{dailyHours}h</div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-1">
                      {dayAssignments.map((assignment) => {
                        // --- NEW PENDING LOGIC (Task 6) ---
                        const isPending = user?.role !== 'Manager' &&
                          assignment.created_by !== user?.id &&
                          (assignment.status === 'Scheduled' || assignment.status === 'Pending');

                        if (isPending) {
                          return (
                            <div
                              key={assignment.id}
                              className="relative rounded text-xs border p-1 bg-orange-100 border-orange-300"
                              title={assignment.title}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 truncate">
                                  <div className="font-medium text-[11px] truncate">{assignment.title}</div>
                                  <div className="text-[10px] text-orange-700">New assignment</div>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-green-600 hover:bg-green-100"
                                    onClick={(e) => { e.stopPropagation(); handleAssignmentResponse(assignment, 'Accepted'); }}
                                    title="Accept"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-600 hover:bg-red-100"
                                    onClick={(e) => { e.stopPropagation(); handleAssignmentResponse(assignment, 'Declined'); }}
                                    title="Decline"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        // --- END PENDING LOGIC ---

                        return (
                          <div
                            key={assignment.id}
                            className={`relative rounded text-xs border p-1 cursor-pointer ${getAssignmentColor(assignment)}`}
                            draggable
                            onDragStart={() => handleDragStart(assignment)}
                            onClick={() => { // --- MODIFIED CLICK (Task 3) ---
                              setSelectedAssignment(assignment);
                              setOriginalAssignment(assignment); // Store original
                              setIsEditingAssignment(false); // Start in view mode
                              setShowAssignmentDialog(true);
                            }}
                            title={assignment.title}
                          >
                            <div className="flex items-center space-x-1">
                              <div className="flex-shrink-0">
                                <Calendar className="h-2.5 w-2.5" />
                              </div>
                              <div className="flex-1 truncate">
                                <div className="font-medium text-[11px] truncate">{assignment.title}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-1">
                        <button
                          className="text-xs text-gray-400 hover:text-gray-700"
                          onClick={() => {
                            setNewAssignment({
                              type: "job",
                              date: dayKey,
                              estimated_hours: 8,
                              start_time: "09:00",
                              end_time: "17:00",
                              priority: "Medium",
                              status: "Scheduled",
                            });
                            setShowAddDialog(true);
                          }}
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // --- MODIFIED renderWeekView (Task 6) ---
  const renderWeekView = () => (
    <div className="p-6">
      <div
        className="border rounded-lg shadow-sm overflow-auto"
        style={{ maxHeight: 'calc(100vh - 200px)' }} // Limit height and make scrollable
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: '60px repeat(7, minmax(140px, 1fr))' }}
        >
          {/* Header Row */}
          <div className="bg-gray-50 border-b border-r sticky top-0 z-10"></div> {/* Top-left corner */}
          {daysOfWeek.map(day => (
            <div key={day.toISOString()} className="bg-gray-50 border-b border-r p-3 text-center sticky top-0 z-10">
              <div className="text-xs font-medium text-gray-900">
                {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </div>
              <div className={`text-2xl font-semibold ${day.toDateString() === new Date().toDateString() ? 'text-black' : 'text-gray-700'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}

          {/* Time Gutter Column */}
          <div className="border-r bg-gray-50 sticky left-0 z-10">
            {timeSlotsWeek.map(time => (
              <div key={time} style={{ height: `${HOUR_HEIGHT_PX}px` }} className="border-b text-right p-1 pr-2 text-xs text-gray-500">
                {time}
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {daysOfWeek.map(day => {
            const dayKey = formatDateKey(day);
            const dayAssignments = getAssignmentsForDate(day);

            return (
              <div
                key={dayKey}
                className="border-r relative"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
              >
                {/* Grid lines */}
                {timeSlotsWeek.map((_, idx) => (
                  <div key={idx} style={{ height: `${HOUR_HEIGHT_PX}px` }} className="border-b"></div>
                ))}

                {/* Assignments */}
                {dayAssignments.map(a => {
                  // --- NEW PENDING LOGIC (Task 6) ---
                  const isPending = user?.role !== 'Manager' &&
                    a.created_by !== user?.id &&
                    (a.status === 'Scheduled' || a.status === 'Pending');

                  if (isPending) {
                    return (
                      <div
                        key={a.id}
                        className="px-2 py-1 rounded border bg-orange-100 border-orange-300 z-20"
                        style={getAssignmentWeekStyle(a.start_time, a.end_time)}
                        title={a.title}
                      >
                        <div className="font-medium text-xs truncate">{a.title}</div>
                        <div className="text-[10px] text-orange-700 mb-1">New assignment</div>
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600 hover:bg-green-100"
                            onClick={(e) => { e.stopPropagation(); handleAssignmentResponse(a, 'Accepted'); }}
                            title="Accept"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-600 hover:bg-red-100"
                            onClick={(e) => { e.stopPropagation(); handleAssignmentResponse(a, 'Declined'); }}
                            title="Decline"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  // --- END PENDING LOGIC ---

                  return (
                    <div
                      key={a.id}
                      className={`px-2 py-1 rounded border ${getAssignmentColor(a)} cursor-pointer overflow-hidden z-20`}
                      style={getAssignmentWeekStyle(a.start_time, a.end_time)}
                      draggable
                      onDragStart={() => handleDragStart(a)}
                      onClick={() => { // --- MODIFIED CLICK (Task 3) ---
                        setSelectedAssignment(a);
                        setOriginalAssignment(a); // Store original
                        setIsEditingAssignment(false); // Start in view mode
                        setShowAssignmentDialog(true);
                      }}
                      title={a.title}
                    >
                      <div className="font-medium text-xs truncate">{a.title}</div>
                      <div className="text-[11px] text-gray-600">
                        {a.start_time} - {a.end_time}
                      </div>
                      {a.team_member && (
                        <div className="text-[10px] text-gray-500 mt-1 truncate">
                          {a.team_member}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // --- Internal Component for Year View (Unchanged) ---
  const MiniCalendar = ({ month, year }: { month: number; year: number }) => {
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });

    // Logic to get days (copied and adapted from calendarDays)
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
    const totalDays = days.length;
    const remainingDays = totalDays <= 35 ? 35 - totalDays : 42 - totalDays; // 5 or 6 rows
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }

    const today = new Date();
    const todayKey = formatDateKey(today);

    // Get assignments relevant to this user for the dots
    const relevantAssignments = (user?.role === 'Manager')
      ? assignmentsByDate
      : Object.entries(assignmentsByDate).reduce((acc, [date, assignments]) => {
          const userAssignments = assignments.filter(a => a.user_id === user?.id && a.status !== 'Declined');
          if (userAssignments.length > 0) {
            acc[date] = userAssignments;
          }
          return acc;
        }, {} as Record<string, Assignment[]>);

    return (
      <div className="border rounded-lg p-4">
        <button
          className="text-lg font-semibold text-center w-full mb-2 hover:text-black"
          onClick={() => {
            setCurrentDate(new Date(year, month, 1));
            setViewMode('month');
          }}
        >
          {monthName}
        </button>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
          {weekdayShort.map(wd => <div key={wd}>{wd}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const dateKey = formatDateKey(day);
            const dayAssignments = relevantAssignments[dateKey] || [];
            const isCurrentMonth = day.getMonth() === month;
            const isToday = dateKey === todayKey;

            return (
              <div
                key={idx}
                className={`
                  h-8 w-full flex items-center justify-center rounded text-xs relative
                  ${isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}
                  ${isToday ? 'bg-black text-white rounded-full' : ''}
                `}
              >
                {day.getDate()}
                {dayAssignments.length > 0 && isCurrentMonth && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i); // 0 to 11

    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold text-center mb-6">{year}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {months.map(month => (
            <MiniCalendar key={month} month={month} year={year} />
          ))}
        </div>
      </div>
    );
  };


  // --- MAIN RETURN ---

  return (
    <div className="min-h-screen bg-white">
      {/* --- MAIN HEADER (Unchanged) --- */}
      <div className="border-b border-gray-200 bg-white px-6 py-5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">Schedule</h1>

          {/* --- Calendar Navigation --- */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateView("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium px-4 w-64 text-center">
              {formatHeaderDate(currentDate, viewMode)}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateView("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>Add Assignment</Button>
        </div>
      </div>

      {/* --- MODIFIED CONTROLS BAR (Task 7) --- */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* --- View Switcher --- */}
          <Select
            value={viewMode}
            onValueChange={(value: "month" | "week" | "year") => setViewMode(value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>

          {/* --- Employee Selection Dropdown --- */}
          {user?.role === 'Manager' && employees.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  View Calendars <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuCheckboxItem
                  checked={showOwnCalendar && visibleCalendars.includes(user.full_name)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setVisibleCalendars(prev => [...prev, user.full_name]);
                    } else {
                      setVisibleCalendars(prev => prev.filter(n => n !== user.full_name));
                    }
                    setShowOwnCalendar(checked);
                  }}
                >
                  Your Calendar
                </DropdownMenuCheckboxItem>
                <div className="border-t my-1" />
                {employees.map(emp => (
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

        {/* --- Right-aligned Controls --- */}
        <div className="flex items-center space-x-3">
          {/* --- Declined Events Dropdown (Task 7) --- */}
          {user?.role !== 'Manager' && declinedAssignments.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Archive className="mr-2 h-4 w-4" />
                  Declined ({declinedAssignments.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Declined Events</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {declinedAssignments.map(a => (
                  <DropdownMenuItem
                    key={a.id}
                    className="group flex items-center justify-between p-2 text-sm"
                    onSelect={(e) => e.preventDefault()} // Prevent closing
                  >
                    <div className="flex-1 truncate">
                      <div className="font-medium truncate">{a.title}</div>
                      <div className="text-xs text-gray-500">{formatDateKey(a.date)}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-600 opacity-0 group-hover:opacity-100"
                      onClick={() => handleAssignmentResponse(a, 'Accepted')}
                      title="Re-accept"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* --- Active Filters Display --- */}
          {user?.role === 'Manager' && visibleCalendars.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <span className="font-medium">Viewing:</span>
              {visibleCalendars.map(name => (
                <span key={name} className="px-2 py-1 bg-gray-200 rounded">
                  {name === user.full_name ? 'Your Calendar' : name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- CALENDAR GRID (CONDITIONAL) --- */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'year' && renderYearView()}


      {/* --- DIALOGS --- */}

      {/* --- MODIFIED Add Dialog (Task 1) --- */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
            <DialogDescription>Schedule a new assignment for the selected day.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newAssignment.type}
                  onValueChange={(value: any) => {
                    setNewAssignment({ ...newAssignment, type: value });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job">Job</SelectItem>
                    <SelectItem value="off">Day Off</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newAssignment.date || ""}
                  onChange={(e) =>
                    setNewAssignment({ ...newAssignment, date: e.target.value })
                  }
                />
              </div>
            </div>

            {(newAssignment.type === "job" || newAssignment.type === "off") && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newAssignment.start_time || ""}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const newHours = calculateHours(newStart, newAssignment.end_time);
                        setNewAssignment({
                          ...newAssignment,
                          start_time: newStart,
                          estimated_hours: newHours,
                        });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newAssignment.end_time || ""}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        const newHours = calculateHours(newAssignment.start_time, newEnd);
                        setNewAssignment({
                          ...newAssignment,
                          end_time: newEnd,
                          estimated_hours: newHours,
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={newAssignment.user_id?.toString() || ""}
                    onValueChange={(value) =>
                      setNewAssignment({ ...newAssignment, user_id: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Self-assignment option for everyone */}
                      {user && (
  <SelectItem value={user.id.toString()}>
    {user.full_name} (Me)
  </SelectItem>
)}
                      {/* Manager can assign to others */}
                      {user?.role === 'Manager' && employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {newAssignment.type === "job" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Job / Task</Label>
                    <Select
                      value={newAssignment.job_id || newAssignment.title || ""}
                      onValueChange={(value) => {
                        const isTask = interiorDesignJobTypes.includes(value);
                        if (isTask) {
                          // It's a task like "Consultation"
                          setNewAssignment({
                            ...newAssignment,
                            title: value, // Set title to the task name
                            job_type: value, // --- (Task 1) ---
                            job_id: undefined,
                            // Keep customer_id if it was already set
                            customer_id: newAssignment.customer_id,
                          });
                        } else {
                          // It's an existing job
                          const job = availableJobs.find((j) => j.id === value);
                          setNewAssignment({
                            ...newAssignment,
                            title: undefined, // Let createAssignment handle title
                            job_type: job?.job_type, // --- (Task 1) ---
                            job_id: value,
                            customer_id: job?.customer_id,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select job or task" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Tasks</SelectLabel>
                          {interiorDesignJobTypes.map(task => (
                            <SelectItem key={task} value={task}>{task}</SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Active Jobs</SelectLabel>
                          {availableJobs.map((job) => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.job_reference} - {job.customer_name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select
                      value={newAssignment.customer_id || ""}
                      onValueChange={(value) =>
                        setNewAssignment({ ...newAssignment, customer_id: value })
                      }
                      // Disable if a job is selected (customer is auto-set)
                      disabled={!!newAssignment.job_id}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {newAssignment.type === "off" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="full-day-add"
                  checked={newAssignment.start_time === "09:00" && newAssignment.end_time === "17:00"}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setNewAssignment({
                        ...newAssignment,
                        start_time: "09:00",
                        end_time: "17:00",
                        estimated_hours: 8,
                      });
                    }
                  }}
                />
                <Label htmlFor="full-day-add">Full day</Label>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newAssignment.notes || ""}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, notes: e.target.value })
                }
                placeholder="Enter notes..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAssignment} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Assignment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODIFIED View/Edit Dialog (Task 3, 8) --- */}
      <Dialog 
        open={showAssignmentDialog} 
        onOpenChange={(isOpen) => {
          setShowAssignmentDialog(isOpen);
          if (!isOpen) {
            // Reset state on close
            setIsEditingAssignment(false);
            setSelectedAssignment(null);
            setOriginalAssignment(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditingAssignment ? "Edit Assignment" : "View Assignment"}
            </DialogTitle>
            <DialogDescription>
              {isEditingAssignment
                ? "Modify the details of this assignment."
                : "View the details. Click 'Edit' to make changes."
              }
            </DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={selectedAssignment.type}
                    onValueChange={(value: any) =>
                      setSelectedAssignment({ ...selectedAssignment, type: value })
                    }
                    disabled={!isEditingAssignment} // <-- (Task 3)
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job">Job</SelectItem>
                      <SelectItem value="off">Day Off</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={selectedAssignment.date}
                    onChange={(e) =>
                      setSelectedAssignment({ ...selectedAssignment, date: e.target.value })
                    }
                    disabled={!isEditingAssignment} // <-- (Task 3)
                  />
                </div>
              </div>

              {/* --- Display Created By / Assigned To (Task 2) --- */}
              {!isEditingAssignment && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <Label className="text-gray-500">Assigned To</Label>
                    <p>{selectedAssignment.team_member || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-500">Created By</Label>
                    <p>{selectedAssignment.created_by_name || 'N/A'}</p>
                  </div>
                </div>
              )}

              {(selectedAssignment.type === "job" || selectedAssignment.type === "off") && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={selectedAssignment.start_time || ""}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          const newHours = calculateHours(newStart, selectedAssignment.end_time);
                          setSelectedAssignment({
                            ...selectedAssignment,
                            start_time: newStart,
                            estimated_hours: newHours,
                          });
                        }}
                        disabled={!isEditingAssignment} // <-- (Task 3)
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={selectedAssignment.end_time || ""}
                        onChange={(e) => {
                          const newEnd = e.target.value;
                          const newHours = calculateHours(selectedAssignment.start_time, newEnd);
                          setSelectedAssignment({
                            ...selectedAssignment,
                            end_time: newEnd,
                            estimated_hours: newHours,
                          });
                        }}
                        disabled={!isEditingAssignment} // <-- (Task 3)
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Assigned To</Label>
                    <Select
                      value={selectedAssignment.user_id?.toString() || ""}
                      onValueChange={(value) =>
                        setSelectedAssignment({
                          ...selectedAssignment,
                          user_id: parseInt(value),
                        })
                      }
                      disabled={!isEditingAssignment} // <-- (Task 3)
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Self-assignment option for everyone */}
                        {user && (
  <SelectItem value={user.id.toString()}>
    {user.full_name} (Me)
  </SelectItem>
)}
                        {/* Manager can assign to others */}
                        {user?.role === 'Manager' && employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {selectedAssignment.type === "job" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Job / Task</Label>
                      <Select
                        value={selectedAssignment.job_id || selectedAssignment.job_type || ""} // <-- (Task 1)
                        onValueChange={(value) => {
                          const isTask = interiorDesignJobTypes.includes(value);
                          if (isTask) {
                            setSelectedAssignment({
                              ...selectedAssignment,
                              title: value,
                              job_type: value, // <-- (Task 1)
                              job_id: undefined,
                            });
                          } else {
                            const job = availableJobs.find((j) => j.id === value);
                            setSelectedAssignment({
                              ...selectedAssignment,
                              job_id: value,
                              job_type: job?.job_type, // <-- (Task 1)
                              customer_id: job?.customer_id,
                            });
                          }
                        }}
                        disabled={!isEditingAssignment} // <-- (Task 3)
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select job or task" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Tasks</SelectLabel>
                            {interiorDesignJobTypes.map(task => (
                              <SelectItem key={task} value={task}>{task}</SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Active Jobs</SelectLabel>
                            {availableJobs.map((job) => (
                              <SelectItem key={job.id} value={job.id}>
                                {job.job_reference} - {job.customer_name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Customer</Label>
                      <Select
                        value={selectedAssignment.customer_id || ""}
                        onValueChange={(value) =>
                          setSelectedAssignment({ ...selectedAssignment, customer_id: value })
                        }
                        disabled={!isEditingAssignment || !!selectedAssignment.job_id} // <-- (Task 3)
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {selectedAssignment.type === "off" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="full-day-edit"
                    checked={selectedAssignment.start_time === "09:00" && selectedAssignment.end_time === "17:00"}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAssignment({
                          ...selectedAssignment,
                          start_time: "09:00",
                          end_time: "17:00",
                          estimated_hours: 8,
                        });
                      }
                    }}
                    disabled={!isEditingAssignment} // <-- (Task 3)
                  />
                  <Label htmlFor="full-day-edit">Full day</Label>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={selectedAssignment.notes || ""}
                  onChange={(e) =>
                    setSelectedAssignment({ ...selectedAssignment, notes: e.target.value })
                  }
                  placeholder="Enter notes..."
                  disabled={!isEditingAssignment} // <-- (Task 3)
                />
              </div>

              {/* --- MODIFIED FOOTER (Task 3, 8) --- */}
              <div className="flex justify-end space-x-2 pt-4">
                
                {/* Delete button removed per Task 8 */}

                {!isEditingAssignment ? (
                  // --- VIEW MODE ---
                  <>
                    <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
                      Close
                    </Button>
                    <Button onClick={() => setIsEditingAssignment(true)}>
                      Edit
                    </Button>
                  </>
                ) : (
                  // --- EDIT MODE ---
                  <>
                    <Button variant="outline" onClick={() => {
                      setIsEditingAssignment(false);
                      setSelectedAssignment(originalAssignment); // Restore original on cancel
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditAssignment} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}