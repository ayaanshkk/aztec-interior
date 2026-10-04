"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, Download, Edit, Trash2, Eye,
  FileText, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { BACKEND_URL, fetchWithAuth } from "@/lib/api";

// ─── types ──────────────────────────────────────────────────────────────────

interface FinancialDoc {
  id: number;
  doc_number: string;
  doc_reference?: string;
  customer_name: string;
  room: string;
  amount: number;
  status: string;
  created_at: string | null;
}

interface StatusTotal {
  status: string;
  count: number;
  total_value: number;
  ref_sum: number;
}

interface ApiResponse {
  data: FinancialDoc[];
  total: number;
  drafts: number;
  sent: number;
  status_totals?: StatusTotal[];
  overall_value?: number;
  overall_ref_sum?: number;
  page: number;
  per_page: number;
  rooms: string[];
}

interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface DocTypeConfig {
  docType: string;
  title: string;
  docNumberLabel: string;
  referenceLabel?: string;
  amountLabel: string;
  createPath: string | null;
  createQueryParams?: Record<string, string>;
  draftKey?: string;
  editPath: ((id: number) => string) | null;
  viewPath: ((id: number) => string) | null;
  deleteApiUrl: (id: number) => string;
  downloadUrl: (id: number) => string;
  statuses: string[];
}

// ─── status colours ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft:         "bg-gray-100 text-gray-700 border-gray-200",
  sent:          "bg-sky-100 text-sky-800 border-sky-200",
  senttocustomer: "bg-sky-100 text-sky-800 border-sky-200",
  issued:        "bg-sky-100 text-sky-800 border-sky-200",
  paid:          "bg-emerald-100 text-emerald-800 border-emerald-200",
  accepted:      "bg-green-100 text-green-800 border-green-200",
  approved:      "bg-green-100 text-green-800 border-green-200",
  confirmed:     "bg-green-100 text-green-800 border-green-200",
  received:      "bg-green-100 text-green-800 border-green-200",
  paidpartially: "bg-orange-100 text-orange-800 border-orange-200",
  rejected:      "bg-red-100 text-red-700 border-red-200",
  cancelled:     "bg-red-100 text-red-700 border-red-200",
  overdue:       "bg-orange-100 text-orange-700 border-orange-200",
  pending:       "bg-yellow-100 text-yellow-700 border-yellow-200",
  proforma:      "bg-purple-100 text-purple-700 border-purple-200",
};

// Row tint — matches the status summary card colors
const ROW_BG: Record<string, string> = {
  draft:         "",
  sent:          "bg-sky-50 hover:bg-sky-100",
  senttocustomer: "bg-sky-50 hover:bg-sky-100",
  issued:        "bg-sky-50 hover:bg-sky-100",
  paid:          "bg-emerald-50 hover:bg-emerald-100",
  accepted:      "bg-green-50 hover:bg-green-100",
  approved:      "bg-green-50 hover:bg-green-100",
  confirmed:     "bg-green-50 hover:bg-green-100",
  received:      "bg-green-50 hover:bg-green-100",
  paidpartially: "bg-orange-50 hover:bg-orange-100",
  rejected:      "bg-red-50 hover:bg-red-100",
  cancelled:     "bg-red-50 hover:bg-red-100",
  overdue:       "bg-orange-50 hover:bg-orange-100",
  pending:       "bg-yellow-50 hover:bg-yellow-100",
  proforma:      "bg-purple-50 hover:bg-purple-100",
};

function getRowBg(status: string): string {
  const key = status.toLowerCase().replace(/\s+/g, "");
  return ROW_BG[key] ?? "";
}

function getSelectStyle(status: string): string {
  const key = status.toLowerCase().replace(/\s+/g, "");
  return STATUS_STYLES[key] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "");
  const style = STATUS_STYLES[key] || "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}

// ─── format helpers ──────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function fmtAmount(n: number): string {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── main component ──────────────────────────────────────────────────────────

export default function FinancialDocListPage({ config }: { config: DocTypeConfig }) {
  const router = useRouter();

  const [docs, setDocs] = useState<FinancialDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [drafts, setDrafts] = useState(0);
  const [sent, setSent] = useState(0);
  const [statusTotals, setStatusTotals] = useState<StatusTotal[]>([]);
  const [overallValue, setOverallValue] = useState(0);
  const [overallRefSum, setOverallRefSum] = useState(0);
  const [rooms, setRooms] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");

  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FinancialDoc | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  // ─── customer picker modal ────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen]       = useState(false);
  const [customers, setCustomers]         = useState<Customer[]>([]);
  const [loadingC, setLoadingC]           = useState(false);
  const [selectedCustomer, setSelected]   = useState("");
  const [pickerBusy, setPickerBusy]       = useState(false);
  const [pickerError, setPickerError]     = useState("");
  const [pickerSearch, setPickerSearch]   = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const openPicker = () => {
    setSelected(""); setPickerError(""); setPickerBusy(false); setPickerSearch("");
    setPickerOpen(true);
    if (customers.length === 0) {
      setLoadingC(true);
      fetchWithAuth("form/customers")
        .then(r => r.ok ? r.json() : [])
        .then(d => setCustomers(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setLoadingC(false));
    }
  };

  const clearCreateDraft = () => {
    if (config.draftKey) {
      try { sessionStorage.removeItem(`draft:${config.draftKey}`); } catch {}
    }
  };

  const handlePickerConfirm = () => {
    if (!selectedCustomer) { setPickerError("Please select a customer."); return; }
    const c = customers.find(c => c.id === selectedCustomer);
    if (!c || !config.createPath) return;
    clearCreateDraft();
    setPickerOpen(false);
    const p = new URLSearchParams({
      customerId:      c.id,
      customerName:    c.name,
      customerAddress: c.address || "",
      customerPhone:   c.phone  || "",
      customerEmail:   c.email  || "",
      ...(config.createQueryParams || {}),
    });
    router.push(`${config.createPath}?${p.toString()}`);
  };

  const handlePickerNewCustomer = () => {
    clearCreateDraft();
    setPickerOpen(false);
    if (config.createPath) router.push(config.createPath);
  };

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        type: config.docType,
        page: String(page),
        per_page: String(perPage),
      });
      if (search)       params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (roomFilter)   params.set("room", roomFilter);

      const res = await fetch(`${BACKEND_URL}/api/financial-docs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: ApiResponse = await res.json();
      setDocs(data.data || []);
      setTotal(data.total || 0);
      setDrafts(data.drafts || 0);
      setSent(data.sent || 0);
      setStatusTotals(data.status_totals || []);
      setOverallValue(data.overall_value || 0);
      setOverallRefSum(data.overall_ref_sum || 0);
      setRooms(data.rooms || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [config.docType, page, search, statusFilter, roomFilter]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleStatusChange = async (doc: FinancialDoc, newStatus: string) => {
    setUpdatingStatus(doc.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/financial-docs/${doc.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ doc_type: config.docType, status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: newStatus } : d));
      fetchDocs(); // refresh stat card counters
    } catch {
      // silently ignore — the select will revert on re-render
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  };

  const clearFilters = () => {
    setSearch(""); setSearchInput(""); setStatusFilter(""); setRoomFilter(""); setPage(1);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
  };

  const handleDelete = async (doc: FinancialDoc) => {
    setDeleting(doc.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(config.deleteApiUrl(doc.id), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteConfirm(null);
      fetchDocs();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (doc: FinancialDoc) => {
    const token = localStorage.getItem("token");
    const url = config.downloadUrl(doc.id);
    // Open PDF in new tab with auth token in URL (since it's a GET PDF endpoint)
    const anchor = document.createElement("a");
    anchor.href = `${url}?token=${token}`;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  };

  const totalPages = Math.ceil(total / perPage);
  const hasFilters = search || statusFilter || roomFilter;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all your {config.title.toLowerCase()}</p>
        </div>
        {config.createPath && (
          <Button onClick={openPicker} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New {config.title.replace(/s$/, "")}
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${config.statuses.length + 1}, 1fr)` }}>
        {/* Overall card */}
        <div className="rounded-xl border p-5 bg-blue-50 border-blue-200 text-blue-800">
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-2">Overall</p>
          <p className="text-3xl font-bold leading-none">{loading ? "—" : total}</p>
          <p className="text-xs text-blue-600 mt-0.5 mb-3">{loading ? "" : `${total} document${total !== 1 ? "s" : ""}`}</p>
          {config.referenceLabel && (
            <div className="border-t border-blue-200 pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="opacity-60">Total Ref Value</span>
                <span className="font-semibold">{loading ? "—" : fmtAmount(overallRefSum)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-60">Total Quote Value</span>
                <span className="font-semibold">{loading ? "—" : fmtAmount(overallValue)}</span>
              </div>
            </div>
          )}
          {!config.referenceLabel && (
            <p className="text-sm font-semibold">{loading ? "—" : fmtAmount(overallValue)}</p>
          )}
        </div>

        {/* One card per configured status — always shown, zeros when empty */}
        {config.statuses.map(statusLabel => {
          const st = statusTotals.find(x => x.status === statusLabel) ?? { status: statusLabel, count: 0, total_value: 0, ref_sum: 0 };
          const s = statusLabel.toLowerCase();
          const [bg, border, text, muted] = s.includes("draft")
            ? ["bg-gray-50", "border-gray-200", "text-gray-700", "text-gray-500"]
            : s.includes("confirm") || s.includes("received")
            ? ["bg-green-50", "border-green-200", "text-green-800", "text-green-600"]
            : s.includes("partial")
            ? ["bg-orange-50", "border-orange-200", "text-orange-800", "text-orange-600"]
            : s.includes("sent")
            ? ["bg-sky-50", "border-sky-200", "text-sky-800", "text-sky-600"]
            : s.includes("paid")
            ? ["bg-emerald-50", "border-emerald-200", "text-emerald-800", "text-emerald-600"]
            : ["bg-gray-50", "border-gray-200", "text-gray-800", "text-gray-600"];
          return (
            <div key={statusLabel} className={`rounded-xl border p-5 ${bg} ${border} ${text}`}>
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-2">{statusLabel}</p>
              <p className="text-3xl font-bold leading-none">{loading ? "—" : st.count}</p>
              <p className={`text-xs mt-0.5 mb-3 ${muted}`}>{loading ? "" : `${st.count} document${st.count !== 1 ? "s" : ""}`}</p>
              {config.referenceLabel && (
                <div className="border-t border-black/10 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="opacity-60">{config.amountLabel} Value</span>
                    <span className="font-semibold">{loading ? "—" : fmtAmount(st.total_value)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="opacity-60">Ref Value</span>
                    <span className="font-semibold">{loading ? "—" : fmtAmount(st.ref_sum)}</span>
                  </div>
                </div>
              )}
              {!config.referenceLabel && (
                <p className="text-sm font-semibold">{loading ? "—" : fmtAmount(st.total_value)}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={`Search by ${config.docNumberLabel.toLowerCase()} or customer…`}
            className="pl-9"
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>

        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {config.statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {rooms.length > 0 && (
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={roomFilter}
            onChange={e => { setRoomFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Order Refs</option>
            {rooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
            <X className="mr-1 h-4 w-4" /> Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-500">Loading…</div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchDocs}>Retry</Button>
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <FileText className="h-10 w-10 text-gray-300" />
            <p>{hasFilters ? "No documents match your filters." : `No ${config.title.toLowerCase()} yet.`}</p>
            {config.createPath && !hasFilters && (
              <Button variant="outline" size="sm" className="mt-2" onClick={openPicker}>
                <Plus className="mr-1 h-4 w-4" /> Create your first
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">{config.docNumberLabel}</th>
                {config.referenceLabel && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">{config.referenceLabel}</th>}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Order Ref</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">{config.amountLabel}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map(doc => (
                <tr
                  key={doc.id}
                  className={`transition-colors cursor-pointer ${getRowBg(doc.status) || "hover:bg-gray-50"}`}
                  onClick={() => {
                    if (config.viewPath) window.open(config.viewPath(doc.id), "_blank");
                  }}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{doc.doc_number}</td>
                  {config.referenceLabel && (
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {doc.doc_reference ? fmtAmount(Number(doc.doc_reference)) : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-700">{doc.customer_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{doc.room || "—"}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{fmtAmount(doc.amount)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select
                      value={doc.status}
                      disabled={updatingStatus === doc.id}
                      onChange={e => handleStatusChange(doc, e.target.value)}
                      className={`h-7 rounded-md border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50 ${getSelectStyle(doc.status)}`}
                    >
                      {config.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                      {!config.statuses.includes(doc.status) && (
                        <option value={doc.status}>{doc.status}</option>
                      )}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(doc.created_at)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {config.viewPath && (
                        <Button
                          variant="ghost" size="icon"
                          title="View"
                          onClick={() => window.open(config.viewPath!(doc.id), "_blank")}
                          className="h-8 w-8 text-gray-500 hover:text-blue-600"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {config.editPath && (
                        <Button
                          variant="ghost" size="icon"
                          title="Edit"
                          onClick={() => router.push(config.editPath!(doc.id))}
                          className="h-8 w-8 text-gray-500 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        title="Download PDF"
                        onClick={() => handleDownload(doc)}
                        className="h-8 w-8 text-gray-500 hover:text-green-600"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        title="Delete"
                        onClick={() => setDeleteConfirm(doc)}
                        className="h-8 w-8 text-gray-500 hover:text-red-600"
                        disabled={deleting === doc.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Delete document?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteConfirm.doc_number}</strong>? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting === deleteConfirm.id}
              >
                {deleting === deleteConfirm.id ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer picker modal */}
      {pickerOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={e => { if (e.target === overlayRef.current) setPickerOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">
                New {config.title.replace(/s$/, "")}
              </h2>
              <button onClick={() => setPickerOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <label className="block text-xs font-medium text-gray-600 mb-1.5">Customer</label>
            {loadingC ? (
              <p className="text-sm text-gray-400 mb-3">Loading customers…</p>
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <Input
                    autoFocus
                    placeholder="Search by name or phone…"
                    className="pl-8 h-9 text-sm"
                    value={pickerSearch}
                    onChange={e => { setPickerSearch(e.target.value); setSelected(""); setPickerError(""); }}
                  />
                </div>
                <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-50">
                  {customers
                    .filter(c => {
                      const t = pickerSearch.toLowerCase();
                      return !t || (c.name || "").toLowerCase().includes(t) || (c.phone || "").toLowerCase().includes(t);
                    })
                    .map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelected(c.id); setPickerError(""); }}
                        className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                          selectedCustomer === c.id
                            ? "bg-gray-900 text-white"
                            : "hover:bg-gray-50 text-gray-800"
                        }`}
                      >
                        <span className="font-medium">{c.name}</span>
                        {c.phone && <span className={`ml-2 text-xs ${selectedCustomer === c.id ? "text-gray-300" : "text-gray-400"}`}>{c.phone}</span>}
                      </button>
                    ))}
                  {customers.filter(c => {
                    const t = pickerSearch.toLowerCase();
                    return !t || (c.name || "").toLowerCase().includes(t) || (c.phone || "").toLowerCase().includes(t);
                  }).length === 0 && (
                    <p className="px-3 py-4 text-sm text-gray-400 text-center">No customers found</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <button
              onClick={handlePickerNewCustomer}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors text-center"
            >
              + New customer
            </button>

            {pickerError && <p className="text-xs text-red-500 mt-3">{pickerError}</p>}

            <button
              onClick={handlePickerConfirm}
              disabled={pickerBusy || !selectedCustomer}
              className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors mt-3"
            >
              {pickerBusy ? "Opening…" : "Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
