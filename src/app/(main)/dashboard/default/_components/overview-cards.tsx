"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Bar,
  BarChart,
  XAxis,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/api";

import {
  leadsChartConfig,
  salesPipelineChartConfig,
} from "./crm.config";

interface PipelineItem {
  id: string;
  type: "customer" | "job" | "project";
  customer: {
    id: string;
    created_at: string;
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

export function OverviewCards() {
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [leadsChartData, setLeadsChartData] = useState<any[]>([]);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [loadingActions, setLoadingActions] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Get user role ONCE
  useEffect(() => {
    const role = localStorage.getItem("user_role");
    console.log("👤 User role:", role);
    setUserRole(role);
  }, []);

  // Fetch pipeline data (New Leads + Sales Pipeline)
  useEffect(() => {
    const fetchPipelineData = async () => {
      try {
        setLoadingPipeline(true);
        console.log("🔄 Fetching pipeline data...");
        
        const pipelineRes = await fetchWithAuth("pipeline");
        
        if (!pipelineRes.ok) {
          throw new Error(`Pipeline API error: ${pipelineRes.status}`);
        }
        
        const pipelineItems: PipelineItem[] = await pipelineRes.json();
        console.log("✅ Pipeline data loaded:", pipelineItems.length, "items");

        // Process New Leads
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
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
          
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - period.daysAgoEnd);

          const periodCustomers = pipelineItems.filter(item => {
            if (item.type !== 'customer' || !item.customer.created_at) return false;
            const createdDate = new Date(item.customer.created_at);
            return createdDate >= startDate && createdDate <= endDate;
          });

          return {
            date: period.label,
            newLeads: periodCustomers.filter(c => c.customer.stage !== 'Rejected').length,
            disqualified: periodCustomers.filter(c => c.customer.stage === 'Rejected').length,
          };
        }).reverse();

        setLeadsChartData(chartData);

        const recentCustomers = pipelineItems.filter((item) => {
          if (item.type !== "customer" || !item.customer.created_at) return false;
          return new Date(item.customer.created_at) >= thirtyDaysAgo;
        });
        
        setNewLeadsCount(recentCustomers.filter(c => c.customer.stage !== 'Rejected').length);

        // Process Pipeline
        const stageCounts: Record<string, number> = {
          Lead: 0, Quote: 0, Accepted: 0, Production: 0, Complete: 0,
        };

        pipelineItems.forEach((item) => {
          const stage = item.stage || 'Lead';
          if (stage in stageCounts) {
            stageCounts[stage]++;
          }
        });

        setPipelineData([
          { stage: "Lead", value: stageCounts['Lead'], fill: "var(--color-lead)" },
          { stage: "Quote", value: stageCounts['Quote'], fill: "var(--color-quote)" },
          { stage: "Accepted", value: stageCounts['Accepted'], fill: "var(--color-accepted)" },
          { stage: "Production", value: stageCounts['Production'], fill: "var(--color-production)" },
          { stage: "Complete", value: stageCounts['Complete'], fill: "var(--color-complete)" },
        ]);

        console.log("✅ Pipeline processing complete");
        
      } catch (error) {
        console.error("❌ Error fetching pipeline data:", error);
      } finally {
        setLoadingPipeline(false);
      }
    };

    fetchPipelineData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPipelineData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Action Items SEPARATELY
  useEffect(() => {
    const fetchActionItems = async () => {
      if (!["Manager", "HR", "Production"].includes(userRole || "")) {
        setLoadingActions(false);
        return;
      }

      try {
        setLoadingActions(true);
        console.log("🔄 Fetching action items...");
        
        const actionsRes = await fetchWithAuth("action-items");
        
        if (actionsRes.ok) {
          const actionsData: ActionItem[] = await actionsRes.json();
          console.log("✅ Action items loaded:", actionsData);
          setActionItems(actionsData);
        } else {
          console.warn("⚠️ Action items API returned:", actionsRes.status);
        }
      } catch (error) {
        console.error("❌ Error fetching action items:", error);
      } finally {
        setLoadingActions(false);
      }
    };

    if (userRole) {
      fetchActionItems();
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchActionItems, 30000);
      return () => clearInterval(interval);
    }
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {/* New Leads Card */}
      <Card>
        <CardHeader>
          <CardTitle>New Leads</CardTitle>
          <CardDescription>Last 30 Days</CardDescription>
        </CardHeader>
        <CardContent className="h-48">
          {loadingPipeline ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ChartContainer config={leadsChartConfig} className="h-full w-full">
              <BarChart data={leadsChartData} barSize={8}>
                <XAxis dataKey="date" tickLine={false} axisLine={false} hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="newLeads"
                  stackId="a"
                  fill="var(--color-newLeads)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar dataKey="disqualified" stackId="a" fill="var(--color-disqualified)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter>
          <span className="text-xl font-semibold">{newLeadsCount}</span>
        </CardFooter>
      </Card>

      {/* Sales Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="h-48">
          {loadingPipeline ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ChartContainer config={salesPipelineChartConfig} className="h-full w-full">
              <FunnelChart>
                <Funnel dataKey="value" data={pipelineData}>
                  <LabelList dataKey="stage" position="right" offset={8} className="text-xs" />
                  <LabelList dataKey="value" position="left" offset={8} className="text-xs" />
                </Funnel>
              </FunnelChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-gray-600">Live data from pipeline</p>
        </CardFooter>
      </Card>

      {/* Action Items */}
      <Card className="border-2 border-orange-200 bg-orange-50/30">
        <CardHeader className="bg-orange-100/50 border-b border-orange-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Action Items</CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            {actionItems.length} pending
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 h-48 overflow-y-auto">
          {loadingActions ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : actionItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <CheckCircle2 className="h-12 w-12 mb-2 opacity-50" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No pending actions</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {actionItems.map((item) => (
                <li key={item.id} className="border-2 border-orange-300 bg-white rounded-md p-2 shadow-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <Checkbox className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">Order materials for {item.customer_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-600">
                          {format(new Date(item.created_at), "MMM dd")}
                        </span>
                        <span
                          className={cn(
                            "ml-auto rounded-md px-2 py-0.5 text-xs font-medium",
                            item.priority === "High" && "text-red-700 bg-red-100",
                            item.priority === "Medium" && "bg-yellow-100 text-yellow-700",
                            item.priority === "Low" && "bg-green-100 text-green-700",
                          )}
                        >
                          {item.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    onClick={() => handleCompleteAction(item.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Mark Completed
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}