"use client";

import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { FinancialInsightsCards } from "./_components/financial-insights-cards";
import { AdminInsightsSection } from "./_components/admin-insights-section";
import { LeadsCard, PipelineCard, ActionItemsCard } from "./_components/overview-cards";
import { TableCards } from "./_components/table-cards";

export default function Page() {
  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your business today.</p>
      </div>

      {/* Financial Insights */}
      <FinancialInsightsCards />

      {/* Admin Insights: Revenue by Job Type, Confirmation Rate, Outstanding */}
      <AdminInsightsSection />

      {/* Two-column layout: left = Schedule + Leads, right = Action Items + Pipeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <MiniCalendar />
          <LeadsCard />
        </div>
        {/* Right column */}
        <div className="flex flex-col gap-6">
          <ActionItemsCard />
          <PipelineCard />
        </div>
      </div>

      {/* Recent Leads Table */}
      <TableCards />
    </div>
  );
}
