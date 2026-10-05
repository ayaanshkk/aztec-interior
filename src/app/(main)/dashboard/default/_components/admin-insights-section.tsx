"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import {
  AlertCircle, TrendingUp, FileCheck, X, ExternalLink,
  BarChart3, Target, Clock,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────

interface JobTypeRow  { job_type: string; quote_count: number; total_value: number; }
interface ConfirmRate { rate: number; sent: number; confirmed: number; total: number; non_draft: number; }
interface OverdueDoc {
  id: number; doc_number: string; customer_name: string;
  status: string; total: number; days_overdue: number; created_at: string | null;
}
interface AdminInsights {
  revenue_by_job_type: JobTypeRow[];
  confirmation_rate:   ConfirmRate;
  overdue_invoices:    { count: number; total_value: number; docs: OverdueDoc[] };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_PILL: Record<string, string> = {
  draft:          "bg-gray-100 text-gray-600",
  sent:           "bg-sky-100 text-sky-800",
  senttocustomer: "bg-sky-100 text-sky-800",
  paidpartially:  "bg-orange-100 text-orange-800",
  pending:        "bg-yellow-100 text-yellow-700",
};
function pill(s: string) {
  return STATUS_PILL[s.toLowerCase().replace(/\s+/g, "")] ?? "bg-gray-100 text-gray-600";
}

// Fixed palette for job type bars
const BAR_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-sky-500",
  "bg-teal-500",   "bg-amber-500",  "bg-rose-500",
  "bg-emerald-500","bg-cyan-500",
];
const BAR_TEXT = [
  "text-indigo-700", "text-violet-700", "text-sky-700",
  "text-teal-700",   "text-amber-700",  "text-rose-700",
  "text-emerald-700","text-cyan-700",
];
const BAR_BG = [
  "bg-indigo-50", "bg-violet-50", "bg-sky-50",
  "bg-teal-50",   "bg-amber-50",  "bg-rose-50",
  "bg-emerald-50","bg-cyan-50",
];

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Overdue invoices table ───────────────────────────────────────────────────

function OverdueTable({ docs }: { docs: OverdueDoc[] }) {
  const router = useRouter();
  if (docs.length === 0)
    return <p className="text-center text-gray-400 py-12 text-sm">No overdue invoices.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Invoice #</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Issued</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Days Overdue</th>
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
            <td className="px-4 py-3 font-medium text-gray-800">{d.doc_number}</td>
            <td className="px-4 py-3 text-gray-600">{d.customer_name}</td>
            <td className="px-4 py-3">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${pill(d.status)}`}>
                {d.status}
              </span>
            </td>
            <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(d.total)}</td>
            <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(d.created_at)}</td>
            <td className="px-4 py-3 text-right">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                d.days_overdue > 60 ? "bg-red-100 text-red-700" :
                d.days_overdue > 30 ? "bg-orange-100 text-orange-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>
                {d.days_overdue}d
              </span>
            </td>
            <td className="px-4 py-3 text-gray-300 text-right">
              <ExternalLink className="h-3.5 w-3.5 inline" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ModalType = "outstanding" | "job-type" | null;

export function AdminInsightsSection() {
  const [data, setData]       = useState<AdminInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<ModalType>(null);

  useEffect(() => {
    fetchWithAuth("financial-docs/admin-insights")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const jobTypes = data?.revenue_by_job_type ?? [];
  const rate     = data?.confirmation_rate;
  const overdue  = data?.overdue_invoices;

  const maxJobValue = Math.max(...jobTypes.map(j => j.total_value), 1);

  // Skeleton shimmer
  const Shimmer = ({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) => (
    <div className={`${w} ${h} bg-gray-200 rounded animate-pulse`} />
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* ── Revenue by Job Type ─────────────────────────────────────── */}
        <div
          onClick={() => !loading && data && setModal("job-type")}
          className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Revenue by Job Type</p>
                <p className="text-xs text-gray-400">Confirmed & sent quotes by room</p>
              </div>
            </div>
            {!loading && jobTypes.length > 0 && (
              <span className="text-xs text-gray-400">{jobTypes.length} types</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Shimmer key={i} h="h-6" />)}
            </div>
          ) : jobTypes.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No confirmed quote data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {jobTypes.slice(0, 6).map((j, idx) => {
                const pct = Math.round((j.total_value / maxJobValue) * 100);
                return (
                  <div key={j.job_type} className="flex items-center gap-3">
                    <span className={`text-xs font-medium w-24 shrink-0 truncate ${BAR_TEXT[idx % BAR_TEXT.length]}`}>
                      {j.job_type}
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${BAR_COLORS[idx % BAR_COLORS.length]}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-24 text-right shrink-0">
                      {fmt(j.total_value)}
                    </span>
                    <span className="text-xs text-gray-400 w-12 text-right shrink-0">
                      {j.quote_count} {j.quote_count === 1 ? "quote" : "quotes"}
                    </span>
                  </div>
                );
              })}
              {jobTypes.length > 6 && (
                <p className="text-xs text-indigo-500 text-right">+{jobTypes.length - 6} more · click to view all</p>
              )}
            </div>
          )}
        </div>

        {/* ── Right column: Confirmation Rate + Outstanding ─────────── */}
        <div className="flex flex-col gap-4">

          {/* Confirmation Rate */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-green-100">
                <Target className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Confirmation Rate</p>
                <p className="text-xs text-gray-400">Quotes sent → confirmed</p>
              </div>
            </div>

            {loading ? (
              <Shimmer h="h-10" />
            ) : (
              <>
                {/* Big rate */}
                <div className="flex items-end gap-2 mb-3">
                  <p className={`text-4xl font-bold leading-none ${
                    (rate?.rate ?? 0) >= 50 ? "text-green-700" :
                    (rate?.rate ?? 0) >= 25 ? "text-amber-600" : "text-red-600"
                  }`}>
                    {rate?.rate ?? 0}%
                  </p>
                  <p className="text-xs text-gray-400 mb-1">
                    {rate?.confirmed ?? 0} of {rate?.sent ?? 0} sent
                  </p>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (rate?.rate ?? 0) >= 50 ? "bg-green-400" :
                      (rate?.rate ?? 0) >= 25 ? "bg-amber-400" : "bg-red-400"
                    }`}
                    style={{ width: `${Math.min(rate?.rate ?? 0, 100)}%` }}
                  />
                </div>
                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-gray-50 py-1.5">
                    <p className="text-sm font-semibold text-gray-700">{rate?.total ?? 0}</p>
                    <p className="text-[10px] text-gray-400">Total</p>
                  </div>
                  <div className="rounded-lg bg-sky-50 py-1.5">
                    <p className="text-sm font-semibold text-sky-700">{rate?.sent ?? 0}</p>
                    <p className="text-[10px] text-sky-500">Sent</p>
                  </div>
                  <div className="rounded-lg bg-green-50 py-1.5">
                    <p className="text-sm font-semibold text-green-700">{rate?.confirmed ?? 0}</p>
                    <p className="text-[10px] text-green-500">Confirmed</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Overdue Invoices */}
          <div
            onClick={() => !loading && data && setModal("outstanding")}
            className={`flex-1 rounded-xl border p-5 cursor-pointer transition-colors ${
              !loading && (overdue?.count ?? 0) > 0
                ? "border-red-200 bg-red-50 hover:bg-red-100"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${
                  !loading && (overdue?.count ?? 0) > 0 ? "bg-red-100" : "bg-gray-100"
                }`}>
                  <AlertCircle className={`h-4 w-4 ${
                    !loading && (overdue?.count ?? 0) > 0 ? "text-red-600" : "text-gray-400"
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Overdue Invoices</p>
                  <p className="text-xs text-gray-400">Unpaid &amp; older than 30 days</p>
                </div>
              </div>
              {!loading && (overdue?.count ?? 0) > 0 && (
                <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                  {overdue?.count} overdue
                </span>
              )}
            </div>

            {loading ? (
              <Shimmer h="h-8" />
            ) : (overdue?.count ?? 0) === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <FileCheck className="h-5 w-5" />
                <p className="text-sm font-medium">No overdue invoices</p>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-red-800 leading-none">
                  {fmt(overdue?.total_value ?? 0)}
                </p>
                <p className="text-xs text-red-400 mt-1 opacity-80">Click to view all overdue →</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === "job-type" && data && (
        <Modal title="Revenue by Job Type" onClose={() => setModal(null)}>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-3">
              {jobTypes.map((j, idx) => {
                const pct = Math.round((j.total_value / maxJobValue) * 100);
                return (
                  <div key={j.job_type} className={`rounded-xl border p-4 ${BAR_BG[idx % BAR_BG.length]} border-transparent`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${BAR_TEXT[idx % BAR_TEXT.length]}`}>{j.job_type}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{j.quote_count} {j.quote_count === 1 ? "quote" : "quotes"}</span>
                        <span className={`text-sm font-bold ${BAR_TEXT[idx % BAR_TEXT.length]}`}>{fmt(j.total_value)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${BAR_COLORS[idx % BAR_COLORS.length]}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600">Total</span>
              <span className="text-lg font-bold text-gray-800">
                {fmt(jobTypes.reduce((s, j) => s + j.total_value, 0))}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {modal === "outstanding" && data && (
        <Modal title={`Overdue Invoices — ${fmt(overdue?.total_value ?? 0)} owed`} onClose={() => setModal(null)}>
          <OverdueTable docs={overdue?.docs ?? []} />
        </Modal>
      )}
    </>
  );
}
