"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

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
  team_member?: string;
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
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

  const formatDateKey = (date: Date | string) => {
    if (typeof date === "string") return date;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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

  const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return '';
    const startDate = new Date(`2000-01-01T${start}:00`);
    const endDate = new Date(`2000-01-01T${end}:00`);
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) return '';
    return (diffMs / (1000 * 60 * 60)).toFixed(2);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

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
        title,
      };

      const response = await fetch('http://127.0.0.1:5000/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    try {
      setSaving(true);
      const response = await fetch(`http://127.0.0.1:5000/assignments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update assignment');
      }

      const result = await response.json();
      setAssignments(prev => prev.map(a => a.id === id ? result.assignment : a));
      return result.assignment;
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
      const response = await fetch(`http://127.0.0.1:5000/assignments/${id}`, { 
        method: 'DELETE' 
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

  useEffect(() => {
    fetchData();
  }, []);

  const getAssignmentsForDate = (date: Date) => {
    const dateKey = formatDateKey(date);
    return assignments.filter(a => a.date === dateKey);
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

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (!draggedAssignment) return;

    const dateKey = formatDateKey(date);
    try {
      await updateAssignment(draggedAssignment.id, { date: dateKey });
      setDraggedAssignment(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to move assignment');
      setDraggedAssignment(null);
    }
  };

  const computeBlockHeight = (hours?: number | string) => {
    const hNum = typeof hours === "string" ? parseFloat(hours) : (hours || 0);
    if (!hNum || isNaN(hNum)) return 28;
    const h = Math.max(28, Math.min(120, Math.round((hNum / 8) * 120)));
    return h;
  };

  const gridColumnStyle = { gridTemplateColumns: `repeat(7, 156.4px)` } as React.CSSProperties;

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

  const weekdayShort = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div className="min-h-screen bg-white">
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
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>Add Assignment</Button>
        </div>
      </div>

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
                      {overbooked && (
                        <div className="absolute top-1 right-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                        <div
                          className={`flex items-center justify-center w-6 h-6 text-[13px] rounded-full ${
                            day.toDateString() === new Date().toDateString()
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

                      <div className="flex flex-col space-y-2">
                        {dayAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className={`relative rounded-md text-xs border p-2 cursor-pointer ${getAssignmentColor(assignment)}`}
                            draggable
                            onDragStart={() => handleDragStart(assignment)}
                            onClick={() => { setSelectedAssignment(assignment); setShowEditDialog(true); }}
                            style={{ height: computeBlockHeight(assignment.estimated_hours) }}
                            title={assignment.title}
                          >
                            <div className="flex items-start space-x-2">
                              <div className="flex-shrink-0 mt-[2px]">
                                <Calendar className="h-3 w-3" />
                              </div>
                              <div className="flex-1 truncate">
                                <div className="font-medium text-[12px] truncate">{assignment.title}</div>
                                <div className="text-[11px] text-gray-600">
                                  {assignment.type === "job" && assignment.start_time 
                                    ? `${assignment.start_time} · ${assignment.estimated_hours || ""}h` 
                                    : assignment.notes || assignment.type}
                                </div>
                                {assignment.team_member && (
                                  <div className="text-[10px] text-gray-500 mt-1">
                                    {assignment.team_member}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

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

        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-green-100 border border-green-300 rounded" /> <span>Job</span></div>
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded" /> <span>Day Off</span></div>
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded" /> <span>Delivery</span></div>
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded" /> <span>Note</span></div>
          <div className="flex items-center space-x-2"><AlertTriangle className="h-3 w-3 text-red-500" /> <span>Overbooked (8+ hours)</span></div>
        </div>
      </div>

      {/* Add Dialog */}
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

            {newAssignment.type === "job" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Job</Label>
                    <Select
                      value={newAssignment.job_id || ""}
                      onValueChange={(value) =>
                        setNewAssignment({
                          ...newAssignment,
                          job_id: value,
                          customer_id: availableJobs.find((j) => j.id === value)?.customer_id,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
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

                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select
                      value={newAssignment.customer_id || ""}
                      onValueChange={(value) =>
                        setNewAssignment({ ...newAssignment, customer_id: value })
                      }
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
                  <Label>Team Member</Label>
                  <Select
                    value={newAssignment.team_member || ""}
                    onValueChange={(value) =>
                      setNewAssignment({ ...newAssignment, team_member: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="John Doe">John Doe</SelectItem>
                      <SelectItem value="Sarah Lee">Sarah Lee</SelectItem>
                      <SelectItem value="Michael Chan">Michael Chan</SelectItem>
                      <SelectItem value="Emma Patel">Emma Patel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {newAssignment.type === "off" && (
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

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="full-day-add"
                    checked={newAssignment.start_time === "09:00" && newAssignment.end_time === "17:00" && parseFloat(newAssignment.estimated_hours as string) === 8}
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

                <div className="space-y-2">
                  <Label>Team Member</Label>
                  <Select
                    value={newAssignment.team_member || ""}
                    onValueChange={(value) =>
                      setNewAssignment({ ...newAssignment, team_member: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="John Doe">John Doe</SelectItem>
                      <SelectItem value="Sarah Lee">Sarah Lee</SelectItem>
                      <SelectItem value="Michael Chan">Michael Chan</SelectItem>
                      <SelectItem value="Emma Patel">Emma Patel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>Modify or delete this assignment.</DialogDescription>
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
                  />
                </div>
              </div>

              {selectedAssignment.type === "job" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Job</Label>
                      <Select
                        value={selectedAssignment.job_id || ""}
                        onValueChange={(value) =>
                          setSelectedAssignment({
                            ...selectedAssignment,
                            job_id: value,
                            customer_id: availableJobs.find((j) => j.id === value)?.customer_id,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
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

                    <div className="space-y-2">
                      <Label>Customer</Label>
                      <Select
                        value={selectedAssignment.customer_id || ""}
                        onValueChange={(value) =>
                          setSelectedAssignment({ ...selectedAssignment, customer_id: value })
                        }
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
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Team Member</Label>
                    <Select
                      value={selectedAssignment.team_member || ""}
                      onValueChange={(value) =>
                        setSelectedAssignment({
                          ...selectedAssignment,
                          team_member: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="John Doe">John Doe</SelectItem>
                        <SelectItem value="Sarah Lee">Sarah Lee</SelectItem>
                        <SelectItem value="Michael Chan">Michael Chan</SelectItem>
                        <SelectItem value="Emma Patel">Emma Patel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {selectedAssignment.type === "off" && (
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
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="full-day-edit"
                      checked={selectedAssignment.start_time === "09:00" && selectedAssignment.end_time === "17:00" && parseFloat(selectedAssignment.estimated_hours as string) === 8}
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
                    />
                    <Label htmlFor="full-day-edit">Full day</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Team Member</Label>
                    <Select
                      value={selectedAssignment.team_member || ""}
                      onValueChange={(value) =>
                        setSelectedAssignment({
                          ...selectedAssignment,
                          team_member: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="John Doe">John Doe</SelectItem>
                        <SelectItem value="Sarah Lee">Sarah Lee</SelectItem>
                        <SelectItem value="Michael Chan">Michael Chan</SelectItem>
                        <SelectItem value="Emma Patel">Emma Patel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={selectedAssignment.notes || ""}
                  onChange={(e) =>
                    setSelectedAssignment({ ...selectedAssignment, notes: e.target.value })
                  }
                  placeholder="Enter notes..."
                />
              </div>

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