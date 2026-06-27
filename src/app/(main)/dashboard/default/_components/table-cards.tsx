"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { fetchWithAuth } from "@/lib/api";

interface PipelineItem {
  id: string;
  stage: string;
  type: string;
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string;
    created_at: string;
  };
}

export const recentLeadsColumns: ColumnDef<PipelineItem>[] = [
  {
    accessorKey: "customer.name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.customer.name}</span>,
  },
  {
    accessorKey: "customer.phone",
    header: "Phone",
    cell: ({ row }) => <span>{row.original.customer.phone || "—"}</span>,
  },
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        {row.original.stage}
      </span>
    ),
  },
  {
    accessorKey: "customer.created_at",
    header: "Date Added",
    cell: ({ row }) => {
      const date = row.original.customer.created_at;
      return <span>{date ? format(new Date(date), "dd MMM yyyy") : "—"}</span>;
    },
  },
];

export function TableCards() {
  const [recentLeads, setRecentLeads] = useState<PipelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchRecentLeads = async () => {
      try {
        const res = await fetchWithAuth("pipeline");
        if (!res.ok) throw new Error("Failed to fetch pipeline data");

        const pipelineItems: PipelineItem[] = await res.json();

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const leads = pipelineItems
          .filter(item =>
            item.stage === "Lead" &&
            new Date(item.customer.created_at) >= sevenDaysAgo
          )
          .sort((a, b) =>
            new Date(b.customer.created_at).getTime() - new Date(a.customer.created_at).getTime()
          );

        setRecentLeads(leads);
      } catch (error) {
        console.error("Error fetching recent leads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentLeads();
  }, []);

  const table = useDataTableInstance({
    data: recentLeads,
    columns: recentLeadsColumns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
      <Card>
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
          <CardDescription>Leads added in the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent className="flex size-full flex-col gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground text-sm">Loading recent leads...</p>
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground text-sm">No leads added in the last 7 days.</p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium w-1/3">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-medium w-1/4">Phone</th>
                      <th className="px-6 py-3 text-left text-sm font-medium w-1/6">Stage</th>
                      <th className="px-6 py-3 text-left text-sm font-medium w-1/4">Date Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeads.map(lead => (
                      <tr
                        key={lead.id}
                        className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                        onClick={() => window.open(`/dashboard/customers/${lead.customer.id}`, '_blank')}
                      >
                        <td className="px-6 py-4 text-sm font-medium">{lead.customer.name}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{lead.customer.phone || "—"}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {lead.stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {lead.customer.created_at ? format(new Date(lead.customer.created_at), "dd MMM yyyy") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}