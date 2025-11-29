"use client";

import { Clock, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { FunnelChart, Funnel, LabelList } from "recharts";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { salesPipelineChartConfig, generateSalesPipelineData, generateNewLeadsData } from "./crm.config";
import { format } from "date-fns";

// ============================================
// TYPES
// ============================================

type ActionItem = {
  id: string;
  customer_name: string;
  customer_id: string;
  stage: string;
  priority: "High" | "Medium" | "Low";
  created_at: string;
  completed: boolean;
};

type PipelineItem = {
  id: string;
  type: "customer" | "job" | "project";
  customer: {
    id: string;
    name: string;
    created_at: string;
    stage: string;
  };
  stage: string;
};

// ============================================
// CONSTANTS
// ============================================

const REFRESH_INTERVAL = 60000; // 60 seconds
const ROLES_WITH_ACTIONS = ["Manager", "HR", "Production"];

// ============================================
// OPTIMIZED OPERATIONAL CARDS COMPONENT
// ============================================

export function OperationalCards() {
  const { user } = useAuth();
  const userRole = user?.role || "Staff";
  
  // State
  const [pipelineData, setPipelineData] = useState<PipelineItem[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Check if user should see action items
  const shouldShowActions = useMemo(
    () => ROLES_WITH_ACTIONS.includes(userRole),
    [userRole]
  );

  // ============================================
  // MEMOIZED DATA PROCESSING
  // ============================================

  // Generate sales pipeline chart data (memoized)
  const salesPipelineChartData = useMemo(() => {
    if (pipelineData.length === 0) return [];
    return generateSalesPipelineData(pipelineData);
  }, [pipelineData]);

  // Generate new leads data (memoized)
  const newLeadsData = useMemo(() => {
    if (pipelineData.length === 0) return { total: 0, disqualified: 0 };
    
    const customers = pipelineData
      .filter((item) => item.type === "customer")
      .map((item) => item.customer);
    
    return generateNewLeadsData(customers);
  }, [pipelineData]);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchPipelineData = useCallback(async () => {
    try {
      const response = await fetchWithAuth("pipeline");
      if (!response.ok) {
        throw new Error(`Pipeline API error: ${response.status}`);
      }
      
      const data = await response.json();
      setPipelineData(data);
      return true;
    } catch (error) {
      console.error("Error fetching pipeline data:", error);
      return false;
    }
  }, []);

  const fetchActionItems = useCallback(async () => {
    if (!shouldShowActions) return true;

    try {
      const response = await fetchWithAuth("action-items");
      if (!response.ok) {
        throw new Error(`Action items API error: ${response.status}`);
      }
      
      const data = await response.json();
      setActionItems(data);
      return true;
    } catch (error) {
      console.error("Error fetching action items:", error);
      return false;
    }
  }, [shouldShowActions]);

  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Fetch both in parallel for better performance
      await Promise.all([
        fetchPipelineData(),
        fetchActionItems()
      ]);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPipelineData, fetchActionItems]);

  // ============================================
  // EFFECTS
  // ============================================

  // Initial load
  useEffect(() => {
    fetchAllData(false);
  }, [fetchAllData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllData(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchAllData]);

  // ============================================
  // ACTION HANDLERS
  // ============================================

  const handleCompleteAction = useCallback(async (actionId: string) => {
    try {
      const response = await fetchWithAuth(`action-items/${actionId}/complete`, {
        method: "PATCH",
      });

      if (response.ok) {
        // Optimistic update - remove immediately
        setActionItems(prev => prev.filter(item => item.id !== actionId));
      } else {
        alert("Failed to mark action as complete");
      }
    } catch (error) {
      console.error("Error completing action:", error);
      alert("Failed to mark action as complete");
    }
  }, []);

  const handleManualRefresh = useCallback(() => {
    fetchAllData(true);
  }, [fetchAllData]);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="h-96 animate-pulse">
          <div className="h-full bg-gray-100 dark:bg-gray-800 rounded-lg" />
        </Card>
        <Card className="h-96 animate-pulse">
          <div className="h-full bg-gray-100 dark:bg-gray-800 rounded-lg" />
        </Card>
        {shouldShowActions && (
          <Card className="h-96 animate-pulse">
            <div className="h-full bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </Card>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4">
      {/* Refresh indicator */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Last updated: {format(lastRefresh, "HH:mm:ss")}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="h-8"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {/* New Leads Card */}
        <Card>
          <CardHeader>
            <CardTitle>New Leads</CardTitle>
            <CardDescription>Last 30 Days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-5xl font-bold">{newLeadsData.total}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">New Leads</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-semibold text-green-600 dark:text-green-500">
                    {newLeadsData.total}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">New Leads</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-semibold text-red-600 dark:text-red-500">
                    {newLeadsData.disqualified}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Disqualified</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground text-xs">
              Live data from customer pipeline
            </p>
          </CardFooter>
        </Card>

        {/* Sales Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ChartContainer config={salesPipelineChartConfig} className="h-full w-full">
              <FunnelChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <Funnel 
                  className="stroke-card stroke-2" 
                  dataKey="value" 
                  data={salesPipelineChartData}
                >
                  <LabelList 
                    className="fill-foreground stroke-0" 
                    dataKey="stage" 
                    position="right" 
                    offset={10} 
                  />
                  <LabelList 
                    className="fill-foreground stroke-0" 
                    dataKey="value" 
                    position="left" 
                    offset={10} 
                  />
                </Funnel>
              </FunnelChart>
            </ChartContainer>
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground text-xs">
              Live data from all customer jobs
            </p>
          </CardFooter>
        </Card>

        {/* Action Items Card - Only for Manager, HR, Production */}
        {shouldShowActions && (
          <ActionItemsCard
            actionItems={actionItems}
            onCompleteAction={handleCompleteAction}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// ACTION ITEMS CARD COMPONENT (MEMOIZED)
// ============================================

const ActionItemsCard = React.memo<{
  actionItems: ActionItem[];
  onCompleteAction: (id: string) => void;
}>(({ actionItems, onCompleteAction }) => {
  const hasItems = actionItems.length > 0;

  return (
    <Card 
      className={cn(
        "border-2 transition-colors",
        hasItems ? "border-orange-200 bg-orange-50/30 dark:bg-orange-950/20" : "border-green-200 bg-green-50/30 dark:bg-green-950/20"
      )}
    >
      <CardHeader 
        className={cn(
          "border-b transition-colors",
          hasItems ? "border-orange-200 bg-orange-100/50 dark:bg-orange-900/30" : "border-green-200 bg-green-100/50 dark:bg-green-900/30"
        )}
      >
        <div className="flex items-center gap-2">
          {hasItems ? (
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
          )}
          <CardTitle 
            className={hasItems ? "text-orange-900 dark:text-orange-100" : "text-green-900 dark:text-green-100"}
          >
            Action Items
          </CardTitle>
        </div>
        <CardDescription 
          className={hasItems ? "text-orange-700 dark:text-orange-300" : "text-green-700 dark:text-green-300"}
        >
          {actionItems.length} pending action{actionItems.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4">
        {actionItems.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 opacity-50 text-green-500" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm mt-1">No pending action items</p>
          </div>
        ) : (
          <ul className="space-y-2.5 max-h-[400px] overflow-y-auto">
            {actionItems.map((item) => (
              <ActionItemRow
                key={item.id}
                item={item}
                onComplete={onCompleteAction}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});

ActionItemsCard.displayName = "ActionItemsCard";

// ============================================
// ACTION ITEM ROW COMPONENT (MEMOIZED)
// ============================================

const ActionItemRow = React.memo<{
  item: ActionItem;
  onComplete: (id: string) => void;
}>(({ item, onComplete }) => {
  const handleComplete = useCallback(() => {
    onComplete(item.id);
  }, [item.id, onComplete]);

  return (
    <li className="space-y-2 rounded-md border-2 border-orange-300 bg-white dark:bg-gray-950 px-3 py-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2">
        <Checkbox 
          id={`action-${item.id}`}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <label 
            htmlFor={`action-${item.id}`}
            className="text-sm font-semibold cursor-pointer block"
          >
            Order materials for {item.customer_name}
          </label>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Customer moved to Accepted stage
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground text-xs font-medium">
              {format(new Date(item.created_at), "MMM dd, yyyy")}
            </span>
            <span
              className={cn(
                "ml-auto w-fit rounded-md px-2 py-0.5 text-xs font-medium",
                item.priority === "High" && "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50",
                item.priority === "Medium" && "bg-yellow-100 text-yellow-700 dark:text-yellow-300 dark:bg-yellow-900/50",
                item.priority === "Low" && "bg-green-100 text-green-700 dark:text-green-300 dark:bg-green-900/50"
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
        className="w-full mt-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:hover:bg-green-900/50 dark:text-green-300"
        onClick={handleComplete}
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Mark as Completed
      </Button>
    </li>
  );
});

ActionItemRow.displayName = "ActionItemRow";

// Export for React.memo
import React from "react";