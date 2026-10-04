"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, CheckCircle2, AlertCircle, X, ExternalLink } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { leadsChartConfig } from "./crm.config";

interface PipelineItem {
  id: string;
  type: "client" | "job" | "project";
  customer: { id: number; created_at: string; name: string };
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

const PIPELINE_STAGES = ["Lead", "Quote", "Accepted", "Production", "Complete"];
const PIPELINE_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#06b6d4", "#10b981"];

interface LeadEntry {
  id: number;
  name: string;
  stage: string;
  created_at: string;
  month: string;
}

// ─── shared pipeline hook ─────────────────────────────────────────────────────

function usePipelineData() {
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [leadsChartData, setLeadsChartData] = useState<any[]>([]);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allLeads, setAllLeads] = useState<LeadEntry[]>([]);

  useEffect(() => {
    const fetch_ = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const res = await fetchWithAuth("pipeline");
        if (!res.ok) throw new Error();
        const items: PipelineItem[] = await res.json();
        const clients = items.filter(i => i.type === "client");
        const monthly: Record<string, { newLeads: number; disqualified: number }> = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
          monthly[d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })] = { newLeads: 0, disqualified: 0 };
        }
        const leads: LeadEntry[] = [];
        clients.forEach(item => {
          const dateStr = (item.customer as any).visit_date || item.customer.created_at;
          if (!dateStr) return;
          const key = new Date(dateStr).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
          if (monthly[key]) item.stage === "Rejected" ? monthly[key].disqualified++ : monthly[key].newLeads++;
          leads.push({ id: item.customer.id, name: item.customer.name, stage: item.stage, created_at: dateStr, month: key });
        });
        setAllLeads(leads);
        setLeadsChartData(Object.entries(monthly).map(([month, c]) => ({ date: month, ...c })));
        const thisMonth = new Date().toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
        setNewLeadsCount(monthly[thisMonth]?.newLeads ?? 0);
        const stageCounts: Record<string, number> = { Lead: 0, Quote: 0, Accepted: 0, Production: 0, Complete: 0 };
        items.forEach(item => { if (item.stage in stageCounts) stageCounts[item.stage]++; });
        setPipelineData(PIPELINE_STAGES.map((stage, i) => ({ stage, value: stageCounts[stage], color: PIPELINE_COLORS[i] })));
      } catch { /* ignore */ }
      finally { if (showLoading) setLoading(false); }
    };
    fetch_(true);
    const iv = setInterval(() => fetch_(false), 60000);
    return () => clearInterval(iv);
  }, []);

  return { newLeadsCount, leadsChartData, pipelineData, loading, allLeads };
}

// ─── Leads by Month card ──────────────────────────────────────────────────────

export function LeadsCard() {
  const router = useRouter();
  const { newLeadsCount, leadsChartData, loading, allLeads } = usePipelineData();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const modalLeads = selectedMonth ? allLeads.filter(l => l.month === selectedMonth && l.stage !== "Rejected") : [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Leads by Month</CardTitle>
          <CardDescription>Last 6 months · click a bar to see leads</CardDescription>
        </CardHeader>
        <CardContent className="h-52">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <ChartContainer config={leadsChartConfig} className="h-full w-full">
              <BarChart data={leadsChartData} margin={{ left: 0, right: 0, top: 20, bottom: 30 }} style={{ cursor: "pointer" }}
                onClick={(data) => { if (data?.activeLabel) setSelectedMonth(data.activeLabel); }}>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} angle={-35} textAnchor="end" className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="newLeads" stackId="a" fill="var(--color-newLeads)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="disqualified" stackId="a" fill="var(--color-disqualified)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter>
          <span className="text-sm text-gray-600">
            This month: <span className="text-xl font-semibold ml-1">{newLeadsCount}</span> new leads
          </span>
        </CardFooter>
      </Card>

      {selectedMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">New Leads — {selectedMonth}</h2>
                <p className="text-sm text-gray-500">{modalLeads.length} lead{modalLeads.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setSelectedMonth(null)} className="p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {modalLeads.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No new leads this month.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Stage</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Date Added</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modalLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium">{lead.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">{lead.stage}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(lead.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => router.push(`/dashboard/customers/${lead.id}`)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer">
                            <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sales Pipeline card ──────────────────────────────────────────────────────

export function PipelineCard() {
  const { pipelineData, loading } = usePipelineData();
  const total = pipelineData.reduce((s, d) => s + d.value, 0) || 1;
  const realTotal = pipelineData.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Pipeline</CardTitle>
        <CardDescription>Live stage breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="flex h-4 w-full rounded-full overflow-hidden gap-0.5">
              {pipelineData.map(d => (
                <div key={d.stage}
                  style={{ width: `${(d.value / total) * 100}%`, background: d.color, minWidth: d.value > 0 ? "4px" : "0" }}
                  title={`${d.stage}: ${d.value}`} />
              ))}
            </div>
            <div className="space-y-2 pt-2">
              {pipelineData.map(d => (
                <div key={d.stage} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-700">{d.stage}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${(d.value / total) * 100}%`, background: d.color }} />
                    </div>
                    <span className="font-semibold text-gray-800 w-6 text-right">{d.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 pt-1">Total: {realTotal} in pipeline</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Action Items card ────────────────────────────────────────────────────────

export function ActionItemsCard() {
  const { user } = useAuth();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loadingActions, setLoadingActions] = useState(true);
  const userRole = user?.role || null;

  useEffect(() => {
    const createMissing = async () => {
      try {
        const pipelineRes = await fetchWithAuth("pipeline");
        if (!pipelineRes.ok) return;
        const pipelineItems: PipelineItem[] = await pipelineRes.json();
        const accepted = pipelineItems.filter(
          item => (item.type === "client" || item.type === "project") && item.stage === "Accepted"
        );
        if (accepted.length === 0) return;
        const existingRes = await fetchWithAuth("action-items");
        const existing: ActionItem[] = existingRes.ok ? await existingRes.json() : [];
        const existingIds = new Set(existing.map(i => i.customer_id));
        let created = 0;
        for (const item of accepted) {
          if (existingIds.has(String(item.customer.id))) continue;
          const r = await fetchWithAuth("action-items", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_id: String(item.customer.id) }),
          });
          if (r.ok) created++;
        }
        if (created > 0) {
          const r = await fetchWithAuth("action-items");
          if (r.ok) setActionItems(await r.json());
        }
      } catch { /* ignore */ }
    };

    const fetchActions = async (showLoading = true) => {
      if (!userRole || !["Platform Admin", "Salesperson", "Production Team"].includes(userRole)) {
        setLoadingActions(false);
        return;
      }
      try {
        if (showLoading) setLoadingActions(true);
        const res = await fetchWithAuth("action-items");
        if (res.ok) {
          const data: ActionItem[] = await res.json();
          setActionItems(data);
          if (data.length === 0 && showLoading) await createMissing();
        } else if (showLoading) {
          await createMissing();
        }
      } catch { if (showLoading) await createMissing(); }
      finally { if (showLoading) setLoadingActions(false); }
    };

    if (userRole) {
      fetchActions(true);
      const iv = setInterval(() => fetchActions(false), 60000);
      return () => clearInterval(iv);
    } else {
      setLoadingActions(false);
    }
  }, [userRole]);

  const handleComplete = async (id: string) => {
    const res = await fetchWithAuth(`action-items/${id}/complete`, { method: "PATCH" });
    if (res.ok) setActionItems(prev => prev.filter(i => i.id !== id));
    else alert("Failed to mark action as complete");
  };

  const has = actionItems.length > 0;
  return (
    <Card className={cn("border-2 h-full", has ? "border-red-300 bg-red-50/30" : "border-green-300 bg-green-50/30")}>
      <CardHeader className={cn("border-b", has ? "bg-red-100/50 border-red-200" : "bg-green-100/50 border-green-200")}>
        <div className="flex items-center gap-2">
          {has ? <AlertCircle className="h-5 w-5 text-red-600" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />}
          <CardTitle className={has ? "text-red-900" : "text-green-900"}>Action Items</CardTitle>
        </div>
        <CardDescription className={has ? "text-red-700" : "text-green-700"}>
          {actionItems.length} pending action{actionItems.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-y-auto max-h-52 pt-3">
        {loadingActions ? (
          <div className="flex items-center justify-center h-32">
            <div className={cn("animate-spin rounded-full h-8 w-8 border-b-2", has ? "border-red-600" : "border-green-600")} />
          </div>
        ) : actionItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <CheckCircle2 className="h-12 w-12 mb-2 opacity-50 text-green-500" />
            <p className="font-medium text-green-700">All caught up!</p>
            <p className="text-sm">No pending actions</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {actionItems.map(item => (
              <li key={item.id} className="border-2 border-red-300 bg-white rounded-md p-2 shadow-sm">
                <div className="flex items-start gap-2 mb-2">
                  <Checkbox className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Order materials for {item.customer_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600">{format(new Date(item.created_at), "MMM dd, yyyy")}</span>
                      <span className={cn("ml-auto rounded-md px-2 py-0.5 text-xs font-medium",
                        item.priority === "High" && "text-red-700 bg-red-100",
                        item.priority === "Medium" && "bg-yellow-100 text-yellow-700",
                        item.priority === "Low" && "bg-green-100 text-green-700",
                      )}>{item.priority}</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline"
                  className="w-full text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100 cursor-pointer"
                  onClick={() => handleComplete(item.id)}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Mark Completed
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
