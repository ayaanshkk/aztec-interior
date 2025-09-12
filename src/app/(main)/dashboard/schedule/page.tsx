"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  Truck,
  Coffee,
  Briefcase,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  team_id?: number;
}

const MOCK_TEAM_MEMBERS: TeamMember[] = [
  { id: 1, name: "John Smith", role: "Installer" },
  { id: 2, name: "Mike Johnson", role: "Installer" },
  { id: 3, name: "Sarah Wilson", role: "Measuring" },
  { id: 4, name: "Tom Brown", role: "Installer" },
  { id: 5, name: "Lisa Davis", role: "Delivery" },
];

interface Job {
  id: string;
  job_reference: string;
  customer_name: string;
  customer_id: string;
  job_type: string;
  stage: string;
  installation_address?: string;
  priority?: string;
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
  date: string; // YYYY-MM-DD
  staff_id: string | number;
  job_id?: string;
  customer_id?: string;
  start_time?: string; // HH:MM
  end_time?: string;
  estimated_hours?: number | string;
  notes?: string;
  priority?: string;
  status?: string;
  staff_name?: string;
  job_reference?: string;
  customer_name?: string;
}

const TEAM_MEMBER_COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16", "#F97316"
];

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(MOCK_TEAM_MEMBERS);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
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

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const days: Date[] = [];
    for (let day = 1; day <= lastDay; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  }, [currentDate]);

  // FILTER: only keep Monday (1), Tuesday (2), Wednesday (3)
  const displayDays = calendarDays;

  const formatDateKey = (date: Date | string) => {
    if (typeof date === "string") return date;
    // Use local date components to avoid ISO timezone shifts
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  // API functions with fallback for demo
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from backend, fallback to demo data if fails
      try {
        const [assignmentsRes, jobsRes, customersRes] = await Promise.all([
          fetch('http://127.0.0.1:5000/assignments'),
          fetch('http://127.0.0.1:5000/jobs/available'),
          fetch('http://127.0.0.1:5000/customers/active'),
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
        
        // ensure team members are the mock list (defensive)
        setTeamMembers(MOCK_TEAM_MEMBERS);
      } catch (apiError) {
        console.log('API not available');
        // Fallback to demo data
        setTeamMembers(MOCK_TEAM_MEMBERS);

        setAvailableJobs([
          { id: "1", job_reference: "JOB-2024-001", customer_name: "Alice Johnson", customer_id: "1", job_type: "Kitchen", stage: "ready" },
          { id: "2", job_reference: "JOB-2024-002", customer_name: "Bob Smith", customer_id: "2", job_type: "Bedroom", stage: "ready" },
          { id: "3", job_reference: "JOB-2024-003", customer_name: "Carol Brown", customer_id: "3", job_type: "Kitchen", stage: "ready" },
        ]);

        setCustomers([
          { id: "1", name: "Alice Johnson", stage: "active" },
          { id: "2", name: "Bob Smith", stage: "active" },
          { id: "3", name: "Carol Brown", stage: "active" },
        ]);

        // Sample assignments for demo
        const todayKey = formatDateKey(new Date());
        setAssignments([
          {
            id: "demo-1",
            type: "job",
            title: "JOB-2024-001 - Alice Johnson",
            date: todayKey,
            staff_id: "1",
            job_id: "1",
            customer_id: "1",
            estimated_hours: 4,
            start_time: "09:00",
            end_time: "13:00",
            staff_name: "John Smith",
            job_reference: "JOB-2024-001",
            customer_name: "Alice Johnson"
          },
          {
            id: "demo-2",
            type: "off",
            title: "Day Off",
            date: todayKey,
            staff_id: "2",
            estimated_hours: 8,
            staff_name: "Mike Johnson"
          },
          {
            id: "demo-3",
            type: "delivery",
            title: "Deliveries",
            date: todayKey,
            staff_id: "5",
            notes: "Van 3",
            estimated_hours: 3,
            staff_name: "Lisa Davis"
          },
        ]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (assignmentData: Partial<Assignment>) => {
    try {
      setSaving(true);
      
      // Generate title based on type and data
      let title = "";
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

      const finalAssignmentData = {
        ...assignmentData,
        title
      };

      try {
        const response = await fetch('http://127.0.0.1:5000/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalAssignmentData),
        });

        if (!response.ok) {
          throw new Error('API not available');
        }

        const result = await response.json();
        setAssignments(prev => [...prev, result.assignment]);
        return result.assignment;
      } catch (apiError) {
        // Fallback to local state management
        const newAssignment: Assignment = {
          id: `local-${Date.now()}`,
          type: (finalAssignmentData.type as Assignment["type"]) || "job",
          title,
          date: finalAssignmentData.date!,
          staff_id: finalAssignmentData.staff_id!,
          job_id: finalAssignmentData.job_id,
          customer_id: finalAssignmentData.customer_id,
          estimated_hours: finalAssignmentData.estimated_hours,
          start_time: finalAssignmentData.start_time,
          end_time: finalAssignmentData.end_time,
          notes: finalAssignmentData.notes,
          priority: finalAssignmentData.priority,
          status: finalAssignmentData.status || "Scheduled",
        };

        setAssignments(prev => [...prev, newAssignment]);
        return newAssignment;
      }
    } catch (err) {
      console.error('Error creating assignment:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const updateAssignment = async (id: string, assignmentData: Partial<Assignment>) => {
    try {
      setSaving(true);
      
      try {
        const response = await fetch(`http://127.0.0.1:5000/assignments/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assignmentData),
        });

        if (!response.ok) {
          throw new Error('API not available');
        }

        const result = await response.json();
        setAssignments(prev => prev.map(a => a.id === id ? result.assignment : a));
        return result.assignment;
      } catch (apiError) {
        // Fallback to local state management
        setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...assignmentData } : a));
      }
    } catch (err) {
      console.error('Error updating assignment:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      setSaving(true);
      
      try {
        const response = await fetch(`http://127.0.0.1:5000/assignments/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('API not available');
        }
      } catch (apiError) {
        // Continue with local deletion even if API fails
      }

      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting assignment:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const getAssignmentsForDateAndStaff = (date: Date, staffId: string) => {
    const dateKey = formatDateKey(date);
    return assignments.filter((assignment) => 
      assignment.date === dateKey && String(assignment.staff_id) === String(staffId)
    );
  };

  const getStaffDailyHours = (date: Date, staffId: string) => {
    const dayAssignments = getAssignmentsForDateAndStaff(date, staffId);
    return dayAssignments.reduce((total, assignment) => {
      if (assignment.type === "job" && assignment.estimated_hours) {
        const h = typeof assignment.estimated_hours === "string" ? parseFloat(assignment.estimated_hours) : (assignment.estimated_hours || 0);
        return total + (isNaN(h) ? 0 : h);
      }
      return total;
    }, 0);
  };

  const isOverbooked = (date: Date, staffId: string) => {
    return getStaffDailyHours(date, staffId) > 8;
  };

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

  const getAssignmentIcon = (type: string) => {
    switch (type) {
      case "off":
        return <Coffee className="h-3 w-3" />;
      case "delivery":
        return <Truck className="h-3 w-3" />;
      case "note":
        return <Calendar className="h-3 w-3" />;
      case "job":
        return <Briefcase className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getMemberColor = (memberId: number) => {
    return TEAM_MEMBER_COLORS[memberId % TEAM_MEMBER_COLORS.length];
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.staff_id || !newAssignment.date || !newAssignment.type) {
      alert('Please fill in all required fields');
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

  const handleEditAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      await updateAssignment(selectedAssignment.id, selectedAssignment);
      setShowEditDialog(false);
      setSelectedAssignment(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await deleteAssignment(assignmentId);
      setShowEditDialog(false);
      setSelectedAssignment(null);
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

  const handleDrop = async (e: React.DragEvent, date: Date, staffId: string) => {
    e.preventDefault();
    if (!draggedAssignment) return;
    
    const dateKey = formatDateKey(date);
    
    try {
      await updateAssignment(draggedAssignment.id, {
        date: dateKey,
        staff_id: staffId,
      });
      setDraggedAssignment(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to move assignment');
      setDraggedAssignment(null);
    }
  };

  // Small helper to convert hours to a visual block height
  const computeBlockHeight = (hours?: number | string) => {
    const hNum = typeof hours === "string" ? parseFloat(hours) : (hours || 0);
    if (!hNum || isNaN(hNum)) return 28; // minimal block
    const h = Math.max(28, Math.min(120, Math.round((hNum / 8) * 120)));
    return h;
  };

  // Prepare inline grid columns - use filtered days
  const gridTemplateColumns = `220px repeat(${displayDays.length}, 160px)`;

  // Loading state
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

  // Error state
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">Schedule</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium px-4">{formatMonthYear(currentDate)}</span>
            <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Assignment</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Assignment</DialogTitle>
                <DialogDescription>Schedule a new assignment for a team member.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select 
                    value={newAssignment.type} 
                    onValueChange={(value: any) => setNewAssignment({ ...newAssignment, type: value })}
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
                  <Label>Team Member</Label>
                  <Select
  value={newAssignment.staff_id?.toString()}
  onValueChange={(value) =>
    setNewAssignment({ ...newAssignment, staff_id: value })
  }
>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.name} ({member.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={newAssignment.date || ''} 
                    onChange={(e) => setNewAssignment({ ...newAssignment, date: e.target.value })} 
                  />
                </div>

                {newAssignment.type === "job" && (
                  <>
                    <div className="space-y-2">
                      <Label>Job (Optional)</Label>
                      <Select 
                        value={newAssignment.job_id || ''} 
                        onValueChange={(value) => setNewAssignment({ ...newAssignment, job_id: value, customer_id: availableJobs.find(j => j.id === value)?.customer_id })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select existing job" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableJobs.map((job) => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.job_reference} - {job.customer_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!newAssignment.job_id && (
                      <div className="space-y-2">
                        <Label>Customer</Label>
                        <Select 
                          value={newAssignment.customer_id || ''} 
                          onValueChange={(value) => setNewAssignment({ ...newAssignment, customer_id: value })}
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
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input 
                          type="time" 
                          value={newAssignment.start_time || ''} 
                          onChange={(e) => setNewAssignment({ ...newAssignment, start_time: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input 
                          type="time" 
                          value={newAssignment.end_time || ''} 
                          onChange={(e) => setNewAssignment({ ...newAssignment, end_time: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Estimated Hours</Label>
                      <Input 
                        type="number" 
                        step="0.5" 
                        value={newAssignment.estimated_hours || ''} 
                        onChange={(e) => setNewAssignment({ ...newAssignment, estimated_hours: parseFloat(e.target.value) })} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select 
                        value={newAssignment.priority || 'Medium'} 
                        onValueChange={(value) => setNewAssignment({ ...newAssignment, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {(newAssignment.type === "note" || newAssignment.type === "delivery") && (
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea 
                      value={newAssignment.notes || ''} 
                      onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })} 
                      placeholder="Enter notes..." 
                    />
                  </div>
                )}

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
        </div>
      </div>

      {/* Calendar area */}
      <div className="p-6">
        <div className="border rounded-lg overflow-auto shadow-sm">
          {/* Header row - sticky */}
          <div className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <div className="grid" style={{ gridTemplateColumns }}>
              <div className="p-3 border-r border-gray-200 font-medium text-sm text-gray-900 bg-gray-50 sticky left-0 z-20">
                Team Member
              </div>
              {displayDays.map((day, idx) => (
                <div key={idx} className="p-3 border-r border-gray-200 text-center min-w-[140px]">
                  <div className="text-xs font-medium text-gray-900">{formatDate(day)}</div>
                  <div className="text-xxs text-gray-500 text-[11px]">{day.getDate()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Body rows */}
          <div className="divide-y divide-gray-200">
            {teamMembers.map((member) => (
              <div key={member.id} className="grid" style={{ gridTemplateColumns }}>
                {/* left column */}
                <div className="p-3 border-r border-gray-200 bg-white sticky left-0 z-10">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getMemberColor(member.id) }} />
                    <div>
                      <div className="font-medium text-sm text-gray-900">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.role}</div>
                    </div>
                  </div>
                </div>

                {/* date cells for this member */}
                {displayDays.map((day, dayIndex) => {
                  const dayKey = formatDateKey(day);
                  const dayAssignments = getAssignmentsForDateAndStaff(day, member.id.toString());
                  const dailyHours = getStaffDailyHours(day, member.id.toString());
                  const overbooked = isOverbooked(day, member.id.toString());

                  return (
                    <div
                      key={dayIndex}
                      className="p-2 border-r border-gray-200 min-h-[96px] relative bg-white"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day, member.id.toString())}
                    >
                      {/* Overbooking indicator */}
                      {overbooked && (
                        <div className="absolute top-1 right-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </div>
                      )}

                      {/* Hours indicator */}
                      {dailyHours > 0 && <div className="absolute bottom-1 right-1 text-xs text-gray-500">{dailyHours}h</div>}

                      {/* Assignments rendered as block-like items */}
                      <div className="flex flex-col space-y-2">
                        {dayAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className={`relative rounded-md text-xs border p-2 cursor-pointer ${getAssignmentColor(assignment)}`}
                            draggable
                            onDragStart={() => handleDragStart(assignment)}
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowEditDialog(true);
                            }}
                            style={{ height: computeBlockHeight(assignment.estimated_hours) }}
                            title={assignment.title}
                          >
                            <div className="flex items-start space-x-2">
                              <div className="flex-shrink-0 mt-[2px]">{getAssignmentIcon(assignment.type)}</div>
                              <div className="flex-1 truncate">
                                <div className="font-medium text-[12px] truncate">{assignment.title}</div>
                                <div className="text-[11px] text-gray-600">
                                  {assignment.type === "job" && assignment.start_time 
                                    ? `${assignment.start_time} · ${assignment.estimated_hours || ""}h` 
                                    : assignment.notes || assignment.type}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* empty cell quick add */}
                        <div className="pt-1">
                          <button
                            className="text-xs text-gray-400 hover:text-gray-700"
                            onClick={() => {
                              setNewAssignment({ 
                                type: "job", 
                                staff_id: member.id.toString(), 
                                date: dayKey, 
                                estimated_hours: 8, 
                                start_time: "09:00", 
                                end_time: "17:00",
                                priority: "Medium",
                                status: "Scheduled"
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

        {/* Legend */}
        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
            <span>Job</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded" />
            <span>Day Off</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded" />
            <span>Delivery</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded" />
            <span>Note</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-3 w-3 text-red-500" />
            <span>Overbooked (8+ hours)</span>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>Modify or delete this assignment.</DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={selectedAssignment.type} 
                  onValueChange={(value: any) => setSelectedAssignment({ ...selectedAssignment, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>Team Member</Label>
                <Select 
                  value={String(selectedAssignment.staff_id)} 
                  onValueChange={(value) => setSelectedAssignment({ ...selectedAssignment, staff_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.name} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={selectedAssignment.date} 
                  onChange={(e) => setSelectedAssignment({ ...selectedAssignment, date: e.target.value })} 
                />
              </div>

              {selectedAssignment.type === "job" && (
                <>
                  <div className="space-y-2">
                    <Label>Job</Label>
                    <Select 
                      value={selectedAssignment.job_id || ''} 
                      onValueChange={(value) => setSelectedAssignment({ 
                        ...selectedAssignment, 
                        job_id: value, 
                        customer_id: availableJobs.find(j => j.id === value)?.customer_id 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select job" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableJobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.job_reference} - {job.customer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!selectedAssignment.job_id && (
                    <div className="space-y-2">
                      <Label>Customer</Label>
                      <Select 
                        value={selectedAssignment.customer_id || ''} 
                        onValueChange={(value) => setSelectedAssignment({ ...selectedAssignment, customer_id: value })}
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
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input 
                        type="time" 
                        value={selectedAssignment.start_time || ''} 
                        onChange={(e) => setSelectedAssignment({ ...selectedAssignment, start_time: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input 
                        type="time" 
                        value={selectedAssignment.end_time || ''} 
                        onChange={(e) => setSelectedAssignment({ ...selectedAssignment, end_time: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estimated Hours</Label>
                    <Input 
                      type="number" 
                      step="0.5" 
                      value={selectedAssignment.estimated_hours || ''} 
                      onChange={(e) => setSelectedAssignment({ ...selectedAssignment, estimated_hours: parseFloat(e.target.value) })} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select 
                      value={selectedAssignment.priority || 'Medium'} 
                      onValueChange={(value) => setSelectedAssignment({ ...selectedAssignment, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {(selectedAssignment.type === "note" || selectedAssignment.type === "delivery") && (
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={selectedAssignment.notes || ''} 
                    onChange={(e) => setSelectedAssignment({ ...selectedAssignment, notes: e.target.value })} 
                    placeholder="Enter notes..." 
                  />
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteAssignment(selectedAssignment.id)} 
                  className="flex items-center space-x-2"
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </Button>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditAssignment} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
