import { AppLayout } from "@/components/layout/AppLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

const Reports = () => {
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices_reports"],
    queryFn: () => api.get<any[]>("/invoices"),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks_reports"],
    queryFn: () => api.get<any[]>("/tasks"),
  });

  const isLoading = loadingInvoices || loadingTasks;

  const revenueData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    invoices.filter((i) => i.status === "paid").forEach((i) => {
      const month = new Date(i.issue_date).toLocaleString("default", { month: "short" });
      byMonth[month] = (byMonth[month] ?? 0) + (i.total_amount ?? 0);
    });
    return Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue }));
  }, [invoices]);

  const taskDistribution = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    tasks.forEach((t) => {
      const s = t.status ?? "ToDo";
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    });
    const colors: Record<string, string> = {
      ToDo: "hsl(var(--chart-4))",
      todo: "hsl(var(--chart-4))",
      InProgress: "hsl(var(--chart-1))",
      in_progress: "hsl(var(--chart-1))",
      InReview: "hsl(var(--chart-2))",
      in_review: "hsl(var(--chart-2))",
      Done: "hsl(var(--chart-3))",
      done: "hsl(var(--chart-3))",
    };
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace(/([A-Z])/g, " $1").trim(),
      value,
      color: colors[name] ?? "hsl(var(--chart-5))",
    }));
  }, [tasks]);

  return (
    <AppLayout title="Reports" subtitle="Analytics and business intelligence">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Revenue</h3>
            <p className="text-xs text-muted-foreground mb-4">From paid invoices</p>
            <div className="h-[260px]">
              {isLoading ? <Skeleton className="h-full w-full" /> : revenueData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No revenue data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Task Distribution</h3>
            <p className="text-xs text-muted-foreground mb-4">By status</p>
            <div className="h-[260px]">
              {isLoading ? <Skeleton className="h-full w-full" /> : taskDistribution.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No tasks yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                      {taskDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: "hsl(var(--foreground))", fontSize: 12 }}>{value}</span>} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
