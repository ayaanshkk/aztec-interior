"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Task {
  id: string;
  task_id?: string;
  type?: string;
  title: string;
  start_date?: string;
  end_date?: string;
  date?: string;
  job_type?: string;
  customer_name?: string;
  start_time?: string;
  end_time?: string;
  team_member?: string;
  status?: string;
  priority?: string;
  work_stage?: string;
}

// Color coding for task types based on job_type and work_stage
const getTaskColor = (task: Task) => {
  // Priority colors if work_stage is present
  if (task.work_stage) {
    switch (task.work_stage.toLowerCase()) {
      case "survey":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "delivery":
        return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case "installation":
        return "bg-teal-100 text-teal-800 border-teal-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  }
  
  // Fallback to job_type
  switch (task.job_type?.toLowerCase()) {
    case "survey":
      return "bg-purple-100 text-purple-800 border-purple-300";
    case "delivery":
      return "bg-cyan-100 text-cyan-800 border-cyan-300";
    case "installation":
      return "bg-teal-100 text-teal-800 border-teal-300";
    default:
      return "bg-blue-100 text-blue-800 border-blue-300";
  }
};

const formatDateKey = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export function MiniCalendar() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(today.setDate(diff));
  });

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        
        // Calculate date range for the current week view
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 6);
        
        const startDateStr = formatDateKey(currentWeekStart);
        const endDateStr = formatDateKey(weekEnd);
        
        // Use the calendar tasks endpoint with date range filtering
        const tasksData = await api.getCalendarTasks({
          start_date: startDateStr,
          end_date: endDateStr
        });
        
        setTasks(Array.isArray(tasksData) ? tasksData : []);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentWeekStart]);

  // Get week days
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeekStart]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    
    tasks.forEach((task) => {
      // Use start_date as primary date field (from backend)
      if (task.start_date) {
        const dateKey = formatDateKey(new Date(task.start_date));
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(task);
      } else if (task.date) {
        // Fallback to date field if start_date is not present
        const dateKey = formatDateKey(new Date(task.date));
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(task);
      }
    });
    
    return map;
  }, [tasks]);

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === "prev" ? -7 : 7));
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>This Week's Schedule</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, idx) => {
            const dateKey = formatDateKey(day);
            const dayTasks = tasksByDate[dateKey] || [];
            const dayName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx];

            return (
              <div
                key={dateKey}
                className={`min-h-[120px] rounded-lg border p-2 ${
                  isToday(day) ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"
                }`}
              >
                <div className="text-center mb-2">
                  <div className="text-xs font-medium text-gray-600">{dayName}</div>
                  <div className={`text-lg font-bold ${isToday(day) ? "text-blue-600" : ""}`}>
                    {day.getDate()}
                  </div>
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      className={`text-xs p-1 rounded border ${getTaskColor(task)} truncate cursor-pointer hover:opacity-80`}
                      title={`${task.title}${task.start_time ? ` (${task.start_time})` : ''}`}
                      onClick={() => router.push(`/dashboard/schedule/${task.id}`)}
                    >
                      {task.start_time && (
                        <span className="font-semibold mr-1">{task.start_time}</span>
                      )}
                      {task.customer_name || task.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayTasks.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push("/dashboard/schedule")}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Full Schedule
        </Button>
      </CardFooter>
    </Card>
  );
}