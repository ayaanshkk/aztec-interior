"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, FileCheck, Clock, CheckCircle, TrendingUp, TrendingDown, PoundSterling, X, ExternalLink, ChevronDown, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

// ─── types ────────────────────────────────────────────────────────────────────

interface StatBox { count: number; total_value: number; }
interface QuoteStat extends StatBox { ref_sum: number; }
interface QuoteDoc {
  id: number; doc_number: string; customer_name: string;
  status: string; doc_reference: string; total: number; created_at: string | null;
}
interface MonthlyRow {
  month: string; count: number; invoice_total: number; ref_total: number; profit: number;
}
interface InvoiceDoc {
  id: number; doc_number: string; customer_name: string;
  status: string; doc_reference: string; month: string; total: number; created_at: string | null;
}
interface DashboardStats {
  quotes: {
    sent: QuoteStat; confirmed: QuoteStat; docs: QuoteDoc[];
  };
  invoices: {
    sent: StatBox; paid_partially: StatBox; received: StatBox;
    total_earnings: number; total_ref: number; profit: number;
    monthly: MonthlyRow[]; docs: InvoiceDoc[];
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(+y, +m - 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_PILL: Record<string, string> = {
  draft:          "bg-gray-100 text-gray-700",
  sent:           "bg-sky-100 text-sky-800",
  senttocustomer: "bg-sky-100 text-sky-800",
  confirmed:      "bg-green-100 text-green-800",
  paid:           "bg-emerald-100 text-emerald-800",
  received:       "bg-green-100 text-green-800",
  paidpartially:  "bg-orange-100 text-orange-800",
  rejected:       "bg-red-100 text-red-700",
};
function pill(status: string) {
  const key = status.toLowerCase().replace(/\s+/g, "");
  return STATUS_PILL[key] ?? "bg-gray-100 text-gray-700";
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-h-[85vh] flex flex-col ${wide ? "max-w-5xl" : "max-w-4xl"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Quote docs table ─────────────────────────────────────────────────────────

function QuoteDocsTable({ docs, filter }: { docs: QuoteDoc[]; filter: "sent" | "confirmed" }) {
  const router = useRouter();
  const filtered = docs.filter(d => {
    const s = d.status.toLowerCase();
    return filter === "sent" ? s.includes("sent") : s.includes("confirm");
  });
  if (filtered.length === 0)
    return <p className="text-center text-gray-400 py-12">No documents found.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Quote #</th>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Ref #</th>
          <th className="px-4 py-3 text-right font-medium text-gray-600">Value</th>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
          <th className="px-4 py-3"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {filtered.map(d => (
          <tr
            key={d.id}
            onClick={() => router.push(`/dashboard/quotes/${d.id}/edit`)}
            className="hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <td className="px-4 py-3 font-medium">{d.doc_number}</td>
            <td className="px-4 py-3">{d.customer_name}</td>
            <td className="px-4 py-3">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${pill(d.status)}`}>
                {d.status}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-500">{d.doc_reference || "—"}</td>
            <td className="px-4 py-3 text-right font-medium">{fmt(d.total)}</td>
            <td className="px-4 py-3 text-gray-500">{fmtDate(d.created_at)}</td>
            <td className="px-4 py-3 text-gray-300 text-right"><ExternalLink className="h-3.5 w-3.5 inline" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Invoice docs table ───────────────────────────────────────────────────────

function InvoiceDocsTable({ docs, filter }: { docs: InvoiceDoc[]; filter: "sent" | "paid_partially" | "received" | "all" }) {
  const router = useRouter();
  const filtered = filter === "all" ? docs : docs.filter(d => {
    const s = d.status.toLowerCase();
    if (filter === "sent") return s.includes("sent");
    if (filter === "paid_partially") return s.includes("partial");
    if (filter === "received") return s.includes("received");
    return true;
  });
  if (filtered.length === 0)
    return <p className="text-center text-gray-400 py-12">No documents found.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Invoice #</th>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Quote Ref</th>
          <th className="px-4 py-3 text-right font-medium text-gray-600">Invoice Total</th>
          <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
          <th className="px-4 py-3"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {filtered.map(d => (
          <tr
            key={d.id}
            onClick={() => router.push(`/dashboard/invoices/${d.id}/edit`)}
            className="hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <td className="px-4 py-3 font-medium">{d.doc_number}</td>
            <td className="px-4 py-3">{d.customer_name}</td>
            <td className="px-4 py-3">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${pill(d.status)}`}>
                {d.status}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-500">{d.doc_reference || "—"}</td>
            <td className="px-4 py-3 text-right font-medium">{fmt(d.total)}</td>
            <td className="px-4 py-3 text-gray-500">{fmtDate(d.created_at)}</td>
            <td className="px-4 py-3 text-gray-300 text-right"><ExternalLink className="h-3.5 w-3.5 inline" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Earnings modal ───────────────────────────────────────────────────────────

function EarningsModalContent({ stats }: { stats: DashboardStats }) {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const months = stats.invoices.monthly;
  const docs = selectedMonth === "all"
    ? stats.invoices.docs
    : stats.invoices.docs.filter(d => d.month === selectedMonth);
  const monthRow = months.find(m => m.month === selectedMonth);
  const earnings = selectedMonth === "all" ? stats.invoices.total_earnings : (monthRow?.invoice_total ?? 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 px-6 py-4 border-b bg-gray-50">
        <div className="relative">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer">
            <option value="all">All time</option>
            {months.map(m => <option key={m.month} value={m.month}>{fmtMonth(m.month)}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-gray-500">Total Earnings</p>
            <p className="text-sm font-semibold text-emerald-700">{fmt(earnings)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Invoices</p>
            <p className="text-sm font-semibold text-gray-700">{docs.length}</p>
          </div>
        </div>
      </div>
      {docs.length === 0
        ? <p className="text-center text-gray-400 py-12">No invoices found.</p>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Invoice Total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map(d => (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/dashboard/invoices/${d.id}/edit`)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium">{d.doc_number}</td>
                  <td className="px-4 py-3">{d.customer_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${pill(d.status)}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(d.total)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(d.created_at)}</td>
                  <td className="px-4 py-3 text-gray-300 text-right"><ExternalLink className="h-3.5 w-3.5 inline" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </div>
  );
}

// ─── Profit modal ─────────────────────────────────────────────────────────────

function ProfitModalContent({ stats }: { stats: DashboardStats }) {
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const router = useRouter();
  const months = stats.invoices.monthly;

  const totalProfit   = stats.invoices.profit;
  const totalInvoiced = stats.invoices.total_earnings;
  const totalRef      = stats.invoices.total_ref;

  const activeMonths  = selectedMonth === "all" ? months : months.filter(m => m.month === selectedMonth);
  const activeProfit  = selectedMonth === "all" ? totalProfit  : (activeMonths[0]?.profit ?? 0);
  const activeInvoiced= selectedMonth === "all" ? totalInvoiced: (activeMonths[0]?.invoice_total ?? 0);
  const activeRef     = selectedMonth === "all" ? totalRef     : (activeMonths[0]?.ref_total ?? 0);
  const activeCount   = selectedMonth === "all"
    ? months.reduce((s, m) => s + m.count, 0)
    : (activeMonths[0]?.count ?? 0);

  const maxProfit = Math.max(...months.map(m => Math.abs(m.profit)), 1);

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-gray-50 shrink-0">
        <span className="text-xs text-gray-500 font-medium">Period</span>
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 appearance-none cursor-pointer"
          >
            <option value="all">All time</option>
            {months.map(m => <option key={m.month} value={m.month}>{fmtMonth(m.month)}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="px-6 py-5 space-y-6 overflow-y-auto">
        {/* KPI summary */}
        <div className="grid grid-cols-4 gap-3">
          <div className={`rounded-xl border p-4 ${activeProfit >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              {activeProfit >= 0
                ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                : <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              }
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${activeProfit >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                {activeProfit >= 0 ? (selectedMonth === "all" ? "Total Profit" : "Profit") : "Net Loss"}
              </p>
            </div>
            <p className={`text-2xl font-bold leading-none ${activeProfit >= 0 ? "text-emerald-900" : "text-red-700"}`}>
              {activeProfit >= 0 ? "" : "−"}{fmt(Math.abs(activeProfit))}
            </p>
            <p className={`text-xs mt-1.5 ${activeProfit >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              Invoice − quote ref
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500 mb-1">Invoiced</p>
            <p className="text-2xl font-bold text-emerald-900 leading-none">{fmt(activeInvoiced)}</p>
            <p className="text-xs text-emerald-500 mt-1.5">Total invoice value</p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-500 mb-1">Quote Ref</p>
            <p className="text-2xl font-bold text-sky-900 leading-none">{fmt(activeRef)}</p>
            <p className="text-xs text-sky-500 mt-1.5">Original quote cost</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Invoices</p>
            <p className="text-2xl font-bold text-gray-800 leading-none">{activeCount}</p>
            <p className="text-xs text-gray-400 mt-1.5">
              {selectedMonth === "all" ? "Across all months" : fmtMonth(selectedMonth)}
            </p>
          </div>
        </div>

        {/* Monthly bar chart — only shown when "All time" selected */}
        {selectedMonth === "all" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Monthly Breakdown</h3>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400" />Profit</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-300" />Loss</span>
              </div>
            </div>
            {months.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No monthly data available.</p>
            ) : (
              <div className="space-y-2.5">
                {months.map(m => {
                  const isPos = m.profit >= 0;
                  const barPct = Math.round((Math.abs(m.profit) / maxProfit) * 100);
                  const margin = activeInvoiced > 0 ? ((m.profit / m.invoice_total) * 100) : 0;
                  return (
                    <button
                      key={m.month}
                      onClick={() => setSelectedMonth(m.month)}
                      className="w-full flex items-center gap-3 group cursor-pointer rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-xs text-gray-500 w-16 shrink-0 font-medium">{fmtMonth(m.month)}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                        <div
                          className={`h-full rounded transition-all ${isPos ? "bg-emerald-400 group-hover:bg-emerald-500" : "bg-red-300 group-hover:bg-red-400"}`}
                          style={{ width: `${Math.max(barPct, 1)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold w-28 text-right shrink-0 ${isPos ? "text-emerald-700" : "text-red-600"}`}>
                        {isPos ? "+" : "−"}{fmt(Math.abs(m.profit))}
                      </span>
                      <span className={`text-xs w-12 text-right shrink-0 ${isPos ? "text-emerald-600" : "text-red-400"}`}>
                        {isPos ? "+" : ""}{margin.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-400 w-10 text-right shrink-0">{m.count} inv</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Month drill-down: invoice list */}
        {selectedMonth !== "all" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Invoices — {fmtMonth(selectedMonth)}</h3>
              <button
                onClick={() => setSelectedMonth("all")}
                className="text-xs text-violet-600 hover:underline cursor-pointer"
              >
                ← Back to all months
              </button>
            </div>
            {(() => {
              const monthDocs = stats.invoices.docs.filter(d => d.month === selectedMonth);
              if (monthDocs.length === 0)
                return <p className="text-center text-gray-400 py-8 text-sm">No invoices for this month.</p>;
              return (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Invoice #</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Customer</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">Invoice Total</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">Quote Ref</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthDocs.map(d => (
                      <tr
                        key={d.id}
                        onClick={() => router.push(`/dashboard/invoices/${d.id}/edit`)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2.5 font-medium text-gray-800">{d.doc_number}</td>
                        <td className="px-3 py-2.5 text-gray-600">{d.customer_name}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${pill(d.status)}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{fmt(d.total)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{d.doc_reference || "—"}</td>
                        <td className="px-3 py-2.5 text-gray-400 text-xs">{fmtDate(d.created_at)}</td>
                        <td className="px-3 py-2.5 text-gray-300 text-right"><ExternalLink className="h-3.5 w-3.5 inline" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  icon: React.ReactNode;
  count: number | undefined;
  value: number | undefined;
  valueLabel: string;
  colors: { border: string; bg: string; hover: string; icon: string; text: string; muted: string; divider: string };
  loading: boolean;
  onClick: () => void;
}

function StatCard({ label, icon, count, value, valueLabel, colors, loading, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-xl border p-5 transition-colors cursor-pointer ${colors.border} ${colors.bg} ${colors.hover}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${colors.icon}`}>{icon}</div>
        <p className={`text-[10px] font-semibold uppercase tracking-widest opacity-70 ${colors.text}`}>{label}</p>
      </div>
      <p className={`text-3xl font-bold leading-none mb-1 ${colors.text}`}>{loading ? "—" : (count ?? 0)}</p>
      <p className={`text-xs mb-3 ${colors.muted}`}>
        {loading ? "" : `${count ?? 0} document${(count ?? 0) !== 1 ? "s" : ""}`}
      </p>
      <div className={`border-t pt-2 space-y-1 ${colors.divider}`}>
        <div className="flex justify-between text-xs">
          <span className={`opacity-60 ${colors.text}`}>{valueLabel}</span>
          <span className={`font-semibold ${colors.text}`}>
            {loading ? <span className="inline-block h-3 w-14 bg-current opacity-20 rounded animate-pulse" /> : fmt(value ?? 0)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type ModalType = "quotes-sent" | "quotes-confirmed" | "inv-sent" | "inv-partial" | "inv-received" | "earnings" | "profit" | null;

export function FinancialInsightsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [hideEarnings, setHideEarnings] = useState<boolean>(() => {
    try { return localStorage.getItem("dashboard_hide_earnings") === "true"; } catch { return false; }
  });
  const [hideProfit, setHideProfit] = useState<boolean>(() => {
    try { return localStorage.getItem("dashboard_hide_profit") === "true"; } catch { return false; }
  });

  const toggleHideEarnings = () => {
    setHideEarnings(prev => {
      const next = !prev;
      try { localStorage.setItem("dashboard_hide_earnings", String(next)); } catch {}
      return next;
    });
  };
  const toggleHideProfit = () => {
    setHideProfit(prev => {
      const next = !prev;
      try { localStorage.setItem("dashboard_hide_profit", String(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    fetchWithAuth("financial-docs/dashboard-stats")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const qs = stats?.quotes;
  const inv = stats?.invoices;

  return (
    <>
      {/* Row 1 — 5 equal stat boxes */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Quotes Sent"
          icon={<Send className="h-4 w-4 text-sky-700" />}
          count={qs?.sent.count} value={qs?.sent.total_value} valueLabel="Quote Value"
          colors={{ border:"border-sky-200", bg:"bg-sky-50", hover:"hover:bg-sky-100", icon:"bg-sky-100", text:"text-sky-900", muted:"text-sky-700", divider:"border-sky-200" }}
          loading={loading} onClick={() => setModal("quotes-sent")}
        />
        <StatCard
          label="Quotes Confirmed"
          icon={<FileCheck className="h-4 w-4 text-green-700" />}
          count={qs?.confirmed.count} value={qs?.confirmed.total_value} valueLabel="Quote Value"
          colors={{ border:"border-green-200", bg:"bg-green-50", hover:"hover:bg-green-100", icon:"bg-green-100", text:"text-green-900", muted:"text-green-700", divider:"border-green-200" }}
          loading={loading} onClick={() => setModal("quotes-confirmed")}
        />
        <StatCard
          label="Invoices Sent"
          icon={<Send className="h-4 w-4 text-indigo-700" />}
          count={inv?.sent.count} value={inv?.sent.total_value} valueLabel="Invoice Value"
          colors={{ border:"border-indigo-200", bg:"bg-indigo-50", hover:"hover:bg-indigo-100", icon:"bg-indigo-100", text:"text-indigo-900", muted:"text-indigo-700", divider:"border-indigo-200" }}
          loading={loading} onClick={() => setModal("inv-sent")}
        />
        <StatCard
          label="Paid Partially"
          icon={<Clock className="h-4 w-4 text-orange-700" />}
          count={inv?.paid_partially.count} value={inv?.paid_partially.total_value} valueLabel="Invoice Value"
          colors={{ border:"border-orange-200", bg:"bg-orange-50", hover:"hover:bg-orange-100", icon:"bg-orange-100", text:"text-orange-900", muted:"text-orange-700", divider:"border-orange-200" }}
          loading={loading} onClick={() => setModal("inv-partial")}
        />
        <StatCard
          label="Received"
          icon={<CheckCircle className="h-4 w-4 text-emerald-700" />}
          count={inv?.received.count} value={inv?.received.total_value} valueLabel="Invoice Value"
          colors={{ border:"border-emerald-200", bg:"bg-emerald-50", hover:"hover:bg-emerald-100", icon:"bg-emerald-100", text:"text-emerald-900", muted:"text-emerald-700", divider:"border-emerald-200" }}
          loading={loading} onClick={() => setModal("inv-received")}
        />
      </div>

      {/* Row 2 — 2 wide boxes */}
      {(() => {
        const profit = inv?.profit ?? 0;
        const isProfitable = profit >= 0;
        const blurEarnings = hideEarnings ? "blur-sm select-none pointer-events-none" : "";
        const blurProfit   = hideProfit   ? "blur-sm select-none pointer-events-none" : "";
        return (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-3">
            {/* Total Earnings — violet */}
            <div className="relative rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors">
              <button
                onClick={e => { e.stopPropagation(); toggleHideEarnings(); }}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-md hover:bg-violet-200 transition-colors cursor-pointer"
                title={hideEarnings ? "Show figures" : "Hide figures"}
              >
                {hideEarnings
                  ? <EyeOff className="h-3.5 w-3.5 text-violet-500" />
                  : <Eye className="h-3.5 w-3.5 text-violet-500" />
                }
              </button>
              <button
                onClick={() => !hideEarnings && setModal("earnings")}
                className="text-left w-full p-5 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-violet-100">
                    <PoundSterling className="h-4 w-4 text-violet-700" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-600 opacity-80">Total Earnings</p>
                </div>
                <p className={`text-3xl font-bold text-violet-900 leading-none transition-all ${blurEarnings}`}>
                  {loading ? "—" : fmt(inv?.total_earnings ?? 0)}
                </p>
                <p className="text-xs text-violet-500 mt-1.5 opacity-70">
                  {hideEarnings ? "Figures hidden · click eye to reveal" : "Click to view monthly breakdown →"}
                </p>
              </button>
            </div>

            {/* Profit — green if profit, red if loss */}
            <div className={`relative rounded-xl border transition-colors ${
              loading
                ? "border-gray-200 bg-gray-50 hover:bg-gray-100"
                : isProfitable
                ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                : "border-red-200 bg-red-50 hover:bg-red-100"
            }`}>
              <button
                onClick={e => { e.stopPropagation(); toggleHideProfit(); }}
                className={`absolute top-3 right-3 z-10 p-1.5 rounded-md transition-colors cursor-pointer ${
                  loading ? "hover:bg-gray-200" : isProfitable ? "hover:bg-emerald-200" : "hover:bg-red-200"
                }`}
                title={hideProfit ? "Show figures" : "Hide figures"}
              >
                {hideProfit
                  ? <EyeOff className={`h-3.5 w-3.5 ${loading ? "text-gray-400" : isProfitable ? "text-emerald-500" : "text-red-500"}`} />
                  : <Eye className={`h-3.5 w-3.5 ${loading ? "text-gray-400" : isProfitable ? "text-emerald-500" : "text-red-500"}`} />
                }
              </button>
              <button
                onClick={() => !hideProfit && setModal("profit")}
                className="text-left w-full p-5 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3 pr-6">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${loading ? "bg-gray-100" : isProfitable ? "bg-emerald-100" : "bg-red-100"}`}>
                      {!loading && !isProfitable
                        ? <AlertTriangle className="h-4 w-4 text-red-600" />
                        : isProfitable
                        ? <TrendingUp className="h-4 w-4 text-emerald-700" />
                        : <TrendingDown className="h-4 w-4 text-gray-400" />
                      }
                    </div>
                    <p className={`text-[10px] font-semibold uppercase tracking-widest opacity-80 ${
                      loading ? "text-gray-400" : isProfitable ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {!loading && !isProfitable ? "Net Loss" : "Profit"}
                    </p>
                  </div>
                  {!loading && !isProfitable && !hideProfit && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                      Loss
                    </span>
                  )}
                </div>
                <p className={`text-3xl font-bold leading-none transition-all ${
                  loading ? "text-gray-400" : isProfitable ? "text-emerald-900" : "text-red-700"
                } ${blurProfit}`}>
                  {loading ? "—" : (isProfitable ? "" : "−") + fmt(Math.abs(profit))}
                </p>
                <p className={`text-xs mt-1.5 opacity-70 ${
                  loading ? "text-gray-400" : isProfitable ? "text-emerald-500" : "text-red-400"
                }`}>
                  {hideProfit ? "Figures hidden · click eye to reveal" : "Invoice total − quote reference · click for breakdown →"}
                </p>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Modals */}
      {modal === "quotes-sent" && stats && (
        <Modal title="Quotes Sent to Customers" onClose={() => setModal(null)}>
          <QuoteDocsTable docs={stats.quotes.docs} filter="sent" />
        </Modal>
      )}
      {modal === "quotes-confirmed" && stats && (
        <Modal title="Confirmed Quotes" onClose={() => setModal(null)}>
          <QuoteDocsTable docs={stats.quotes.docs} filter="confirmed" />
        </Modal>
      )}
      {modal === "inv-sent" && stats && (
        <Modal title="Invoices Sent to Customers" onClose={() => setModal(null)}>
          <InvoiceDocsTable docs={stats.invoices.docs} filter="sent" />
        </Modal>
      )}
      {modal === "inv-partial" && stats && (
        <Modal title="Partially Paid Invoices" onClose={() => setModal(null)}>
          <InvoiceDocsTable docs={stats.invoices.docs} filter="paid_partially" />
        </Modal>
      )}
      {modal === "inv-received" && stats && (
        <Modal title="Received Invoices" onClose={() => setModal(null)}>
          <InvoiceDocsTable docs={stats.invoices.docs} filter="received" />
        </Modal>
      )}
      {modal === "earnings" && stats && (
        <Modal title="Total Earnings — Monthly Breakdown" onClose={() => setModal(null)}>
          <EarningsModalContent stats={stats} />
        </Modal>
      )}
      {modal === "profit" && stats && (
        <Modal title="Profit Analysis" onClose={() => setModal(null)} wide>
          <ProfitModalContent stats={stats} />
        </Modal>
      )}
    </>
  );
}
