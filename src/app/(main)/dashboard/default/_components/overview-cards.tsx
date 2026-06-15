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
import { useAuth } from "@/contexts/AuthContext";

import {
  leadsChartConfig,
  salesPipelineChartConfig,
} from "./crm.config";

interface PipelineItem {
  id: string;
  type: "client" | "job" | "project";
  customer: {
    id: number;
    created_at: string;
    name: string;
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
  const { user } = useAuth();
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [leadsChartData, setLeadsChartData] = useState<any[]>([]);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [loadingActions, setLoadingActions] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const userRole = user?.role || null;

  // Fetch pipeline data (New Leads + Sales Pipeline)
  useEffect(() => {
    const fetchPipelineData = async (showLoading = true) => {
      try {
        if (showLoading) setLoadingPipeline(true);
        
        const pipelineRes = await fetchWithAuth("pipeline");
        if (!pipelineRes.ok) throw new Error(`Pipeline API error: ${pipelineRes.status}`);
        
        const pipelineItems: PipelineItem[] = await pipelineRes.json();

        const clients = pipelineItems.filter(item => item.type === 'client');

        const monthlyData: Record<string, { newLeads: number; disqualified: number }> = {};

        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setDate(1);
          d.setMonth(d.getMonth() - i);
          const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
          monthlyData[key] = { newLeads: 0, disqualified: 0 };
        }

        clients.forEach(item => {
          const dateStr = (item.customer as any).visit_date || item.customer.created_at;
          if (!dateStr) return;
          const d = new Date(dateStr);
          const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
          if (monthlyData[key] !== undefined) {
            if (item.stage === "Rejected") {
              monthlyData[key].disqualified++;
            } else {
              monthlyData[key].newLeads++;
            }
          }
        });

        const chartData = Object.entries(monthlyData).map(([month, counts]) => ({
          date: month,
          ...counts,
        }));

        setLeadsChartData(chartData);

        const currentMonthKey = new Date().toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
        const currentMonthData = monthlyData[currentMonthKey] || { newLeads: 0 };
        setNewLeadsCount(currentMonthData.newLeads);

        const stageCounts: Record<string, number> = {
          Lead: 0, Quote: 0, Accepted: 0, Production: 0, Complete: 0,
        };

        pipelineItems.forEach((item) => {
          const stage = item.stage || 'Lead';
          if (stage in stageCounts) stageCounts[stage]++;
        });

        setPipelineData([
          { stage: "Lead", value: stageCounts['Lead'], fill: "var(--color-lead)" },
          { stage: "Quote", value: stageCounts['Quote'], fill: "var(--color-quote)" },
          { stage: "Accepted", value: stageCounts['Accepted'], fill: "var(--color-accepted)" },
          { stage: "Production", value: stageCounts['Production'], fill: "var(--color-production)" },
          { stage: "Complete", value: stageCounts['Complete'], fill: "var(--color-complete)" },
        ]);
        
      } catch (error) {
        console.error("❌ Error fetching pipeline data:", error);
      } finally {
        if (showLoading) setLoadingPipeline(false);
      }
    };

    fetchPipelineData(true);
    const interval = setInterval(() => fetchPipelineData(false), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Action Items
  useEffect(() => {
    const createMissingActionItems = async () => {
      try {
        const pipelineRes = await fetchWithAuth("pipeline");
        if (!pipelineRes.ok) return;
        
        const pipelineItems: PipelineItem[] = await pipelineRes.json();
        const acceptedItems = pipelineItems.filter(
          item => (item.type === 'client' || item.type === 'project') && item.stage === 'Accepted'
        );
        
        if (acceptedItems.length === 0) return;
        
        const existingRes = await fetchWithAuth("action-items");
        const existingActionItems: ActionItem[] = existingRes.ok ? await existingRes.json() : [];
        const existingCustomerIds = new Set(existingActionItems.map(item => item.customer_id));
        
        let createdCount = 0;
        for (const item of acceptedItems) {
          const customerId = String(item.customer.id);
          if (existingCustomerIds.has(customerId)) continue;
          
          const createRes = await fetchWithAuth("action-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_id: customerId }),
          });
          if (createRes.ok) createdCount++;
        }
        
        if (createdCount > 0) {
          const refreshRes = await fetchWithAuth("action-items");
          if (refreshRes.ok) {
            setActionItems(await refreshRes.json());
          }
        }
      } catch (error) {
        console.error("❌ Error in createMissingActionItems:", error);
      }
    };

    const fetchActionItems = async (showLoading = true) => {
      if (!userRole) {
        setLoadingActions(false);
        return;
      }
      if (!["Platform Admin", "Salesperson", "Production Team"].includes(userRole)) {
        setLoadingActions(false);
        return;
      }

      try {
        if (showLoading) setLoadingActions(true);
        
        const actionsRes = await fetchWithAuth("action-items");
        
        if (actionsRes.ok) {
          const actionsData: ActionItem[] = await actionsRes.json();
          setActionItems(actionsData);
          if (actionsData.length === 0 && showLoading) {
            await createMissingActionItems();
          }
        } else if (showLoading) {
          await createMissingActionItems();
        }
      } catch (error) {
        console.error("❌ Error fetching action items:", error);
        if (showLoading) await createMissingActionItems();
      } finally {
        if (showLoading) setLoadingActions(false);
      }
    };

    if (userRole) {
      fetchActionItems(true);
      const interval = setInterval(() => fetchActionItems(false), 60000);
      return () => clearInterval(interval);
    } else {
      setLoadingActions(false);
    }
  }, [userRole, refreshTrigger]);

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

  const hasActionItems = actionItems.length > 0;
  const cardBorderColor = hasActionItems ? "border-red-300" : "border-green-300";
  const cardBgColor = hasActionItems ? "bg-red-50/30" : "bg-green-50/30";
  const headerBgColor = hasActionItems ? "bg-red-100/50 border-red-200" : "bg-green-100/50 border-green-200";
  const iconColor = hasActionItems ? "text-red-600" : "text-green-600";
  const titleColor = hasActionItems ? "text-red-900" : "text-green-900";
  const descColor = hasActionItems ? "text-red-700" : "text-green-700";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {/* Leads by Month Card */}
      <Card>
        <CardHeader>
          <CardTitle>Leads by Month</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="h-48">
          {loadingPipeline ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ChartContainer config={leadsChartConfig} className="h-full w-full">
              <BarChart data={leadsChartData} margin={{ left: 0, right: 0, top: 20, bottom: 30 }}>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  angle={-35}
                  textAnchor="end"
                  className="text-xs"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="newLeads" stackId="a" fill="var(--color-newLeads)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="disqualified" stackId="a" fill="var(--color-disqualified)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter>
          <span className="text-sm text-gray-600">
            This month:{" "}
            <span className="text-xl font-semibold ml-1">{newLeadsCount}</span> new leads
          </span>
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
      <Card className={cn("border-2", cardBorderColor, cardBgColor)}>
        <CardHeader className={cn("border-b", headerBgColor)}>
          <div className="flex items-center gap-2">
            {hasActionItems ? (
              <AlertCircle className={cn("h-5 w-5", iconColor)} />
            ) : (
              <CheckCircle2 className={cn("h-5 w-5", iconColor)} />
            )}
            <CardTitle className={titleColor}>Action Items</CardTitle>
          </div>
          <CardDescription className={descColor}>
            {actionItems.length} pending action{actionItems.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-48 overflow-y-auto">
          {loadingActions ? (
            <div className="flex items-center justify-center h-full">
              <div className={cn("animate-spin rounded-full h-8 w-8 border-b-2",
                hasActionItems ? "border-red-600" : "border-green-600"
              )}></div>
            </div>
          ) : actionItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <CheckCircle2 className="h-12 w-12 mb-2 opacity-50 text-green-500" />
              <p className="font-medium text-green-700">All caught up!</p>
              <p className="text-sm">No pending actions</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {actionItems.map((item) => (
                <li key={item.id} className="border-2 border-red-300 bg-white rounded-md p-2 shadow-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <Checkbox className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">Order materials for {item.customer_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-600">
                          {format(new Date(item.created_at), "MMM dd, yyyy")}
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