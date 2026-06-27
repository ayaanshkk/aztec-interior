"use client";

import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { FunnelChart, Funnel, LabelList } from "recharts";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/api";
import { salesPipelineChartConfig } from "./crm.config";
import { format } from "date-fns";

type ActionItem = {
  id: string;
  customer_name: string;
  customer_id: string;
  stage: string;
  priority: "High" | "Medium" | "Low";
  created_at: string;
  completed: boolean;
};

export function OperationalCards() {
  const [salesPipelineChartData, setSalesPipelineChartData] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [pipelineRes, actionsRes] = await Promise.all([
          fetchWithAuth("pipeline"),
          fetchWithAuth("action-items"),
        ]);

        if (pipelineRes.ok) {
          const pipelineData = await pipelineRes.json();
          const stageCounts: Record<string, number> = {};
          pipelineData.forEach((item: any) => {
            const stage = item.stage || 'Lead';
            stageCounts[stage] = (stageCounts[stage] || 0) + 1;
          });
          setSalesPipelineChartData(
            Object.entries(stageCounts).map(([stage, value]) => ({ stage, value }))
          );
        }

        if (actionsRes.ok) {
          const actionsData = await actionsRes.json();
          setActionItems(actionsData);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCompleteAction = async (actionId: string) => {
    // Optimistic update
    setActionItems(prev => prev.filter(item => item.id !== actionId));
    try {
      const response = await fetchWithAuth(`action-items/${actionId}/complete`, {
        method: "PATCH",
        body: JSON.stringify({ notes: '' }),
      });
      if (!response.ok) {
        // Revert on failure
        const actionsRes = await fetchWithAuth("action-items");
        if (actionsRes.ok) setActionItems(await actionsRes.json());
      }
    } catch (error) {
      console.error("Error completing action:", error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="h-96 animate-pulse"><div className="h-full bg-gray-100" /></Card>
        <Card className="h-96 animate-pulse"><div className="h-full bg-gray-100" /></Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2">
      {/* Sales Pipeline Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="size-full">
          <ChartContainer config={salesPipelineChartConfig} className="size-full">
            <FunnelChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <Funnel className="stroke-card stroke-2" dataKey="value" data={salesPipelineChartData}>
                <LabelList className="fill-foreground stroke-0" dataKey="stage" position="right" offset={10} />
                <LabelList className="fill-foreground stroke-0" dataKey="value" position="left" offset={10} />
              </Funnel>
            </FunnelChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">Live data from customer pipeline.</p>
        </CardFooter>
      </Card>

      {/* Action Items */}
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
            <ul className="space-y-2.5 max-h-[400px] overflow-y-auto">
              {actionItems.map((item) => (
                <li key={item.id}
                  className="space-y-2 rounded-md border-2 border-orange-300 bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        Order materials for {item.customer_name}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Customer moved to Accepted stage
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="text-muted-foreground h-3 w-3" />
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(item.created_at), "dd MMM yyyy")}
                        </span>
                        <span className={cn(
                          "ml-auto rounded-md px-2 py-0.5 text-xs font-medium",
                          item.priority === "High" && "text-red-700 bg-red-100",
                          item.priority === "Medium" && "bg-yellow-100 text-yellow-700",
                          item.priority === "Low" && "bg-green-100 text-green-700",
                        )}>
                          {item.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline"
                    className="w-full border-green-200 bg-green-50 hover:bg-green-100 text-green-700"
                    onClick={() => handleCompleteAction(item.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Completed
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