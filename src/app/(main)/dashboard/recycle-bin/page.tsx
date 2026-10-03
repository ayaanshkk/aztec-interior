"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, RotateCcw, Trash2, AlertCircle, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "@/lib/api";

const PER_PAGE = 25;

interface DeletedCustomer {
  id: number;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  stage: string;
  deleted_at: string | null;
  assigned_to: string;
}

const getStageColor = (stage: string) => {
  switch (stage?.toLowerCase()) {
    case "lead":           return "bg-gray-100 text-gray-800";
    case "quote":
    case "consultation":   return "bg-blue-100 text-blue-800";
    case "survey":
    case "measure":        return "bg-yellow-100 text-yellow-800";
    case "design":
    case "quoted":         return "bg-orange-100 text-orange-800";
    case "accepted":
    case "ordered":
    case "production":     return "bg-purple-100 text-purple-800";
    case "delivery":
    case "installation":   return "bg-indigo-100 text-indigo-800";
    case "complete":       return "bg-green-100 text-green-800";
    case "rejected":       return "bg-gray-100 text-gray-600";
    case "remedial":       return "bg-red-100 text-red-800";
    case "cancelled":      return "bg-red-100 text-red-600";
    default:               return "bg-gray-100 text-gray-800";
  }
};

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export default function RecycleBinPage() {
  const [customers, setCustomers]   = useState<DeletedCustomer[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionId, setActionId]     = useState<number | null>(null);
  const router = useRouter();

  const token = () => localStorage.getItem("token");

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/customers/recycle-bin`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCustomers(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return customers.filter(c =>
      (c.name || "").toLowerCase().includes(t) ||
      (c.phone || "").toLowerCase().includes(t) ||
      (c.address || "").toLowerCase().includes(t)
    );
  }, [customers, searchTerm]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, currentPage]);

  const restore = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setActionId(id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/customers/${id}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setCustomers(prev => prev.filter(c => c.id !== id));
      else alert("Failed to restore customer");
    } finally {
      setActionId(null);
    }
  };

  const permanentDelete = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setActionId(id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/customers/${id}/permanent-delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setCustomers(prev => prev.filter(c => c.id !== id));
      else alert("Failed to permanently delete customer");
    } finally {
      setActionId(null);
    }
  };

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 border-t">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{(currentPage - 1) * PER_PAGE + 1}</span> to{" "}
          <span className="font-medium">{Math.min(currentPage * PER_PAGE, filtered.length)}</span>{" "}
          of <span className="font-medium">{filtered.length}</span> customers
        </div>
        <div className="flex space-x-1">
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center px-3 text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full p-6">
      <h1 className="mb-6 text-3xl font-bold">Recycle Bin</h1>

      {/* Search bar */}
      <div className="mb-6 flex justify-between">
        <div className="relative w-64">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder="Search deleted customers..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <p className="text-sm text-gray-500 self-center">
          Deleted customers are shown here. Restore them or remove them permanently.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-12">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Phone</th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase max-w-[180px]">Address</th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-28">Stage</th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-32">Salesperson</th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-32">Deleted On</th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-gray-600" />
                    <p className="mt-4 text-gray-500">Loading...</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Trash2 className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                    <p className="text-lg">
                      {searchTerm ? "No matching deleted customers." : "Recycle bin is empty."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((c, index) => {
                  const serial = (filtered.length - ((currentPage - 1) * PER_PAGE + index))
                    .toString().padStart(3, "0");
                  return (
                    <tr
                      key={c.id}
                      onClick={() => window.open(`/dashboard/customers/${c.id}`, "_blank")}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{serial}</td>

                      <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                        {c.name || "—"}
                      </td>

                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {c.phone || "—"}
                      </td>

                      <td className="px-3 py-2 text-sm text-gray-900 max-w-[180px]">
                        <span className="block truncate" title={c.address}>{c.address || "—"}</span>
                      </td>

                      <td className="px-3 py-2 whitespace-nowrap">
                        {c.stage ? (
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStageColor(c.stage)}`}>
                            {c.stage}
                          </span>
                        ) : "—"}
                      </td>

                      <td className="px-3 py-2 text-sm text-gray-900 w-32">{c.assigned_to || "—"}</td>

                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{fmt(c.deleted_at)}</td>

                      <td className="px-3 py-2 text-right whitespace-nowrap w-36">
                        <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionId === c.id}
                            onClick={e => restore(e, c.id)}
                            title="Restore customer"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionId === c.id}
                            onClick={e => permanentDelete(e, c.id, c.name)}
                            title="Delete permanently"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && <PaginationControls />}
      </div>
    </div>
  );
}
