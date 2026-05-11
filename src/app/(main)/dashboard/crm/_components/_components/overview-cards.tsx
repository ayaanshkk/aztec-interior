"use client";

import { format, subMonths } from "date-fns";
import { Wallet, BadgeDollarSign, Loader2 } from "lucide-react";
import { Area, AreaChart, Line, LineChart, Bar, BarChart, XAxis } from "recharts";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { api } from "@/lib/api";

const lastMonth = format(subMonths(new Date(), 1), "LLLL");

// Chart configs
const leadsChartConfig = {
  newLeads: { label: "New Leads", color: "hsl(var(--chart-1))" },
  disqualified: { label: "Disqualified", color: "hsl(var(--chart-2))" },
  background: { label: "Background", color: "hsl(var(--muted))" },
};

const proposalsChartConfig = {
  proposalsSent: { label: "Proposals Sent", color: "hsl(var(--chart-1))" },
};

const revenueChartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
};

interface DashboardStats {
  totalLeads: number;
  leadsGrowth: number;
  totalProposals: number;
  proposalsGrowth: number;
  totalRevenue: number;
  revenueGrowth: number;
  projectsWon: number;
  projectsGrowth: number;
}

export function OverviewCards() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    leadsGrowth: 0,
    totalProposals: 0,
    proposalsGrowth: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    projectsWon: 0,
    projectsGrowth: 0,
  });

  const [leadsChartData, setLeadsChartData] = useState<any[]>([]);
  const [proposalsChartData, setProposalsChartData] = useState<any[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch customers (leads)
        const customers = await api.getCustomers();
        
        // Calculate leads by stage
        const activeLeads = customers.filter((c: any) => 
          !c.is_deleted && ['Lead', 'Contacted', 'Qualified'].includes(c.stage)
        );
        
        // Get projects for won count
        const projects = await api.getProjects();
        const wonProjects = projects.filter((p: any) => 
          p.status === 'Completed' || p.status === 'Won'
        );

        // Mock revenue calculation - you'll need to connect to actual financial data
        const mockRevenue = wonProjects.length * 4120; // Average project value
        
        // Generate chart data for last 30 days
        const last30Days = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return format(date, 'd');
        });

        // Leads chart data (simplified - you'd calculate actual daily numbers)
        const leadsData = last30Days.map((day, idx) => ({
          date: day,
          newLeads: Math.floor(Math.random() * 25) + 10,
          disqualified: Math.floor(Math.random() * 5) + 1,
        }));

        // Proposals chart data
        const proposalsData = last30Days.map((day) => ({
          date: day,
          proposalsSent: Math.floor(Math.random() * 15) + 5,
        }));

        // Revenue chart data (last 6 months)
        const revenueData = Array.from({ length: 6 }, (_, i) => {
          const date = subMonths(new Date(), 5 - i);
          return {
            month: format(date, 'MMM'),
            revenue: Math.floor(Math.random() * 20000) + 40000,
          };
        });

        setStats({
          totalLeads: activeLeads.length,
          leadsGrowth: 54.6, // Calculate actual growth
          totalProposals: 124, // You'd get this from quotations
          proposalsGrowth: 12.3,
          totalRevenue: mockRevenue,
          revenueGrowth: 22.2,
          projectsWon: wonProjects.length,
          projectsGrowth: -2.5,
        });

        setLeadsChartData(leadsData);
        setProposalsChartData(proposalsData);
        setRevenueChartData(revenueData);

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card>
        <CardHeader>
          <CardTitle>New Leads</CardTitle>
          <CardDescription>Last Month</CardDescription>
        </CardHeader>
        <CardContent className="size-full">
          <ChartContainer className="size-full min-h-24" config={leadsChartConfig}>
            <BarChart accessibilityLayer data={leadsChartData} barSize={8}>
              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} hide />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => `${lastMonth}: ${label}`} />} />
              <Bar
                background={{ fill: "var(--color-background)", radius: 4, opacity: 0.07 }}
                dataKey="newLeads"
                stackId="a"
                fill="var(--color-newLeads)"
                radius={[0, 0, 0, 0]}
              />
              <Bar dataKey="disqualified" stackId="a" fill="var(--color-disqualified)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <span className="text-xl font-semibold tabular-nums">{stats.totalLeads}</span>
          <span className={`text-sm font-medium ${stats.leadsGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {stats.leadsGrowth > 0 ? '+' : ''}{stats.leadsGrowth.toFixed(1)}%
          </span>
        </CardFooter>
      </Card>

      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle>Proposals Sent</CardTitle>
          <CardDescription>Last Month</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ChartContainer className="size-full min-h-24" config={proposalsChartConfig}>
            <AreaChart
              data={proposalsChartData}
              margin={{
                left: 0,
                right: 0,
                top: 5,
              }}
            >
              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} hide />
              <ChartTooltip
                content={<ChartTooltipContent labelFormatter={(label) => `${lastMonth}: ${label}`} hideIndicator />}
              />
              <Area
                dataKey="proposalsSent"
                fill="var(--color-proposalsSent)"
                fillOpacity={0.05}
                stroke="var(--color-proposalsSent)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <span className="text-xl font-semibold tabular-nums">{stats.totalProposals}</span>
          <span className={`text-sm font-medium ${stats.proposalsGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {stats.proposalsGrowth > 0 ? '+' : ''}{stats.proposalsGrowth.toFixed(1)}%
          </span>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="w-fit rounded-lg bg-green-500/10 p-2">
            <Wallet className="size-5 text-green-500" />
          </div>
        </CardHeader>
        <CardContent className="flex size-full flex-col justify-between">
          <div className="space-y-1.5">
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Last 6 Months</CardDescription>
          </div>
          <p className="text-2xl font-medium tabular-nums">
            ${(stats.totalRevenue / 1000).toFixed(1)}k
          </p>
          <div className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${
            stats.revenueGrowth > 0 
              ? 'bg-green-500/10 text-green-500' 
              : 'bg-red-500/10 text-red-500'
          }`}>
            {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="bg-destructive/10 w-fit rounded-lg p-2">
            <BadgeDollarSign className="text-destructive size-5" />
          </div>
        </CardHeader>
        <CardContent className="flex size-full flex-col justify-between">
          <div className="space-y-1.5">
            <CardTitle>Projects Won</CardTitle>
            <CardDescription>Last 6 Months</CardDescription>
          </div>
          <p className="text-2xl font-medium tabular-nums">{stats.projectsWon}</p>
          <div className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${
            stats.projectsGrowth > 0 
              ? 'bg-green-500/10 text-green-500' 
              : 'bg-red-500/10 text-red-500'
          }`}>
            {stats.projectsGrowth > 0 ? '+' : ''}{stats.projectsGrowth.toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1 xl:col-span-2">
        <CardHeader>
          <CardTitle>Revenue Growth</CardTitle>
          <CardDescription>Year to Date (YTD)</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueChartConfig} className="h-24 w-full">
            <LineChart
              data={revenueChartData}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 0,
              }}
            >
              <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                strokeWidth={2}
                dataKey="revenue"
                stroke="var(--color-revenue)"
                activeDot={{
                  r: 6,
                }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-sm">
            {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}% growth since last year
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}