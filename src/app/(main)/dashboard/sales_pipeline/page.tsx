"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/shadcn-io/kanban";
import { Briefcase } from "lucide-react";

// Keep your canonical stage list in one place
const STAGES = [
  "Lead",
  "Quote",
  "Consultation",
  "Survey",
  "Accepted",
  "Production",
  "Delivery",
  "Complete",
] as const;

type Stage = (typeof STAGES)[number];

type Job = {
  id: number;
  customer_id: number | null;
  customer_name?: string | null;
  type: string;
  stage: Stage;
  quote_price?: number | null;
  delivery_date?: string | null;
};

// ------- Helpers

// Stable colour per column (feel free to tweak)
const stageColours: Record<Stage, string> = {
  Lead: "#6B7280",
  Quote: "#4B5563",
  Consultation: "#0EA5E9",
  Survey: "#6366F1",
  Accepted: "#059669",
  Production: "#F59E0B",
  Delivery: "#22C55E",
  Complete: "#10B981",
};

// Build columns with stable ids derived from stage names (no random uuids)
const makeColumns = () =>
  STAGES.map((name) => ({
    id: `col-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    color: stageColours[name],
  }));

const columnIdToStage = (colId: string): Stage =>
  STAGES.find((s) => `col-${s.toLowerCase().replace(/\s+/g, "-")}` === colId) || "Lead";

const stageToColumnId = (stage: Stage) => `col-${stage.toLowerCase().replace(/\s+/g, "-")}`;

// ------- Component

export default function PipelinePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const prevFeaturesRef = useRef<any[]>([]);
  const columns = useMemo(() => makeColumns(), []);

  // Fetch jobs from backend
  useEffect(() => {
    fetch("http://127.0.0.1:5000/jobs")
      .then((r) => r.json())
      .then((data: Job[]) => {
        setJobs(data);
        // Map jobs -> kanban items (“features”)
        const mapped = data.map((j) => ({
          id: String(j.id),
          name: `${j.customer_name || "Unknown"} — ${j.type}`,
          column: stageToColumnId(j.stage),
          // extra fields we’ll use when rendering / saving
          jobId: j.id,
          stage: j.stage,
          type: j.type,
          quote_price: j.quote_price,
          delivery_date: j.delivery_date,
          customer_name: j.customer_name,
        }));
        setFeatures(mapped);
        prevFeaturesRef.current = mapped;
      })
      .catch((err) => console.error("Error fetching jobs:", err));
  }, []);

  // Handle drag result (data change from Kanban)
  const handleDataChange = (next: any[]) => {
    // Detect which items changed column
    const prev = prevFeaturesRef.current;
    const moved = next.filter((n) => {
      const p = prev.find((x) => x.id === n.id);
      return p && p.column !== n.column;
    });

    setFeatures(next);
    prevFeaturesRef.current = next;

    // Optimistically update backend for each moved item
    moved.forEach(async (item) => {
      const jobId = item.jobId as number;
      const newStage = columnIdToStage(item.column);
      try {
        // If your backend uses PATCH/PUT at /jobs/<id>, enable the corresponding route there.
        await fetch(`http://127.0.0.1:5000/jobs/${jobId}`, {
          method: "PUT", // or "PATCH" if you prefer
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: newStage }),
        });
      } catch (e) {
        console.error("Failed to update job stage:", e);
        // Rollback locally on failure (optional)
        setFeatures((cur) =>
          cur.map((f) => (f.id === String(jobId) ? { ...f, column: stageToColumnId(f.stage) } : f))
        );
      }
    });
  };

  // Count per column for header badges
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of columns) map[c.id] = 0;
    for (const f of features) map[f.column] = (map[f.column] || 0) + 1;
    return map;
  }, [columns, features]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sales Pipeline</h1>

      <KanbanProvider columns={columns} data={features} onDataChange={handleDataChange}>
        {(column) => (
          <KanbanBoard id={column.id} key={column.id}>
            <KanbanHeader>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
                <span className="font-medium">{column.name}</span>
                <Badge variant="secondary">{counts[column.id] || 0}</Badge>
              </div>
            </KanbanHeader>

            <KanbanCards id={column.id}>
              {(feature: any) => (
                <KanbanCard
                  column={column.id}
                  id={feature.id}
                  key={feature.id}
                  name={feature.name}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <p className="m-0 font-medium text-sm flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        {feature.customer_name || "Unknown"}
                      </p>
                      <p className="m-0 text-xs text-muted-foreground">
                        Type: {feature.type}
                      </p>
                      <p className="m-0 text-xs text-muted-foreground">
                        Quote: £{feature.quote_price?.toLocaleString?.() ?? "N/A"}
                      </p>
                      {feature.delivery_date && (
                        <p className="m-0 text-xs text-muted-foreground">
                          Delivery: {feature.delivery_date}
                        </p>
                      )}
                    </div>
                  </div>
                </KanbanCard>
              )}
            </KanbanCards>
          </KanbanBoard>
        )}
      </KanbanProvider>
    </div>
  );
}
