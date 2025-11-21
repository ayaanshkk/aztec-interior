"use client";

import { useState, useEffect } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { Wallet, BadgeDollarSign, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  Label,
  Pie,
  PieChart,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/api";

import {
  leadsChartConfig,
  salesPipelineChartConfig,
} from "./crm.config";

// --- Define Types for Fetched Data ---

interface PipelineItem {
  id: string;
  type: "customer" | "job" | "project";
  customer: {
    id: string;
    created_at: string;
    stage: string;
  };
  job?: {
    id: string;
    stage: string;
  };
  stage: string;
}

interface ActionItem {
  id: string;
  customer_name: string;
  customer_id: string;
  stage: string;
  priority: "High" | "Medium" | "Low";
  created_at: string;
  completed: boolean;
}

interface PipelineStage {
  stage: string;
  value: number;
  fill: string;
}

interface LeadsChartData {
  date: string;
  newLeads: number;
  disqualified: number;
}

export function OverviewCards() {
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [newLeadsDisqualified, setNewLeadsDisqualified] = useState(0);
  const [leadsChartData, setLeadsChartData] = useState<LeadsChartData[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelineStage[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get user role
  useEffect(() => {
    const role = localStorage.getItem("user_role");
    setUserRole(role);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch pipeline data
        const pipelineRes = await fetchWithAuth("pipeline");
        if (!pipelineRes.ok) throw new Error("Failed to fetch pipeline data");
        const pipelineItems: PipelineItem[] = await pipelineRes.json();

        // --- 1. Process New Leads (Last 30 Days) with Chart Data ---
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Calculate chart data for 6 periods
        const periods = [
          { label: "1-5", daysAgoStart: 1, daysAgoEnd: 5 },
          { label: "6-10", daysAgoStart: 6, daysAgoEnd: 10 },
          { label: "11-15", daysAgoStart: 11, daysAgoEnd: 15 },
          { label: "16-20", daysAgoStart: 16, daysAgoEnd: 20 },
          { label: "21-25", daysAgoStart: 21, daysAgoEnd: 25 },
          { label: "26-30", daysAgoStart: 26, daysAgoEnd: 30 },
        ];

        const today = new Date();
        const chartData = periods.map(period => {
          const endDate = new Date(today);
          endDate.setDate(today.getDate() - period.daysAgoStart);
          endDate.setHours(23, 59, 59, 999);
          
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - period.daysAgoEnd);
          startDate.setHours(0, 0, 0, 0);

          const periodCustomers = pipelineItems.filter(item => {
            if (item.type !== 'customer' || !item.customer.created_at) return false;
            const createdDate = new Date(item.customer.created_at);
            return createdDate >= startDate && createdDate <= endDate;
          });

          const newLeads = periodCustomers.filter(c => c.customer.stage !== 'Rejected').length;
          const disqualified = periodCustomers.filter(c => c.customer.stage === 'Rejected').length;

          return {
            date: period.label,
            newLeads,
            disqualified,
          };
        }).reverse();

        setLeadsChartData(chartData);

        // Total counts for last 30 days
        const recentCustomers = pipelineItems.filter((item) => {
          if (item.type !== "customer" || !item.customer.created_at) return false;
          return new Date(item.customer.created_at) >= thirtyDaysAgo;
        });
        
        const newLeads = recentCustomers.filter(c => 
          c.customer.stage !== 'Rejected'
        );
        const disqualified = recentCustomers.filter(c => c.customer.stage === 'Rejected');
        
        setNewLeadsCount(newLeads.length);
        setNewLeadsDisqualified(disqualified.length);

        // --- 2. Process Sales Pipeline ---
        const stageCounts: Record<string, number> = {
          Lead: 0,
          Survey: 0,
          Design: 0,
          Quote: 0,
          Accepted: 0,
          Ordered: 0,
          Production: 0,
          Delivery: 0,
          Installation: 0,
          Complete: 0,
          Remedial: 0,
          Rejected: 0,
        };

        pipelineItems.forEach((item) => {
          const stage = item.stage || 'Lead';
          if (stage in stageCounts) {
            stageCounts[stage]++;
          }
        });

        const newPipelineData = [
          { stage: "Lead", value: stageCounts['Lead'] || 0, fill: "var(--color-lead)" },
          { stage: "Quote", value: stageCounts['Quote'] || 0, fill: "var(--color-quote)" },
          { stage: "Accepted", value: stageCounts['Accepted'] || 0, fill: "var(--color-accepted)" },
          { stage: "Production", value: stageCounts['Production'] || 0, fill: "var(--color-production)" },
          { stage: "Complete", value: stageCounts['Complete'] || 0, fill: "var(--color-complete)" },
        ];
        setPipelineData(newPipelineData);

        // --- 3. Fetch Action Items (only for Manager, HR, Production) ---
        if (["Manager", "HR", "Production"].includes(userRole || "")) {
          const actionsRes = await fetchWithAuth("action-items");
          if (actionsRes.ok) {
            const actionsData: ActionItem[] = await actionsRes.json();
            setActionItems(actionsData);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  const handleCompleteAction = async (actionId: string) => {
    try {
      const response = await fetchWithAuth(`action-items/${actionId}/complete`, {
        method: "PATCH",
      });

      if (response.ok) {
        setActionItems(prev => prev.filter(item => item.id !== actionId));
      } else {
        alert("Failed to mark action as complete");
      }
    } catch (error) {
      console.error("Error completing action:", error);
      alert("Failed to mark action as complete");
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-96 animate-pulse">
            <div className="h-full bg-gray-100" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-4">
      {/* New Leads Card */}
      <Card>
        <CardHeader>
          <CardTitle>New Leads</CardTitle>
          <CardDescription>Last 30 Days</CardDescription>
        </CardHeader>
        <CardContent className="size-full">
          <ChartContainer className="size-full min-h-24" config={leadsChartConfig}>
            <BarChart accessibilityLayer data={leadsChartData} barSize={8}>
              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                background={{ fill: "var(--color-background)", radius: 4, opacity: 0.07 }}
                dataKey="newLeads"
                stackId="a"
                fill="var(--color-newLeads)"
                radius={[0, 0, 0, 0]}
              />
              <Bar dataKey="disqualified" stackId="a" fill="var(--color-disqualified)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <span className="text-xl font-semibold tabular-nums">{newLeadsCount}</span>
        </CardFooter>
      </Card>

      {/* Sales Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="size-full">
          <ChartContainer config={salesPipelineChartConfig} className="size-full">
            <FunnelChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <Funnel className="stroke-card stroke-2" dataKey="value" data={pipelineData}>
                <LabelList className="fill-foreground stroke-0 text-xs" dataKey="stage" position="right" offset={8} />
                <LabelList className="fill-foreground stroke-0 text-xs" dataKey="value" position="left" offset={8} />
              </Funnel>
            </FunnelChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">Live data from all customer jobs.</p>
        </CardFooter>
      </Card>

      {/* Action Items Card - Only for Manager, HR, Production */}
      {["Manager", "HR", "Production"].includes(userRole || "") && (
        <Card className="border-2 border-orange-200 bg-orange-50/30">
          <CardHeader className="border-b border-orange-200 bg-orange-100/50">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Action Items</CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              {actionItems.length} pending action{actionItems.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {actionItems.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm mt-1">No pending action items</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                {actionItems.map((item) => (
                  <li 
                    key={item.id} 
                    className="space-y-1.5 rounded-md border-2 border-orange-300 bg-white px-2 py-1.5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox className="size-3" />
                      <span className="text-xs font-medium">Order materials for {item.customer_name}</span>
                      <span
                        className={cn(
                          "ml-auto w-fit rounded-md px-1.5 py-0.5 text-xs font-medium",
                          item.priority === "High" && "text-red-700 bg-red-100",
                          item.priority === "Medium" && "bg-yellow-100 text-yellow-700",
                          item.priority === "Low" && "bg-green-100 text-green-700",
                        )}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="text-muted-foreground size-2.5" />
                      <span className="text-muted-foreground text-xs font-medium">
                        {format(new Date(item.created_at), "MMM dd")}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-1 h-6 text-xs border-green-200 bg-green-50 hover:bg-green-100 text-green-700"
                      onClick={() => handleCompleteAction(item.id)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Mark as Completed
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Placeholder for 4th card - can add another metric here */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Value</CardTitle>
          <CardDescription>Total estimated value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">£0</div>
          <p className="text-xs text-gray-600 mt-2">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}