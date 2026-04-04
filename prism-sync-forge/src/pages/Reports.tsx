import { AppLayout } from "@/components/layout/AppLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCSV, exportToPDF, exportToJSON, type ExportColumn } from "@/lib/export-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Reports = () => {
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices_reports"],
    queryFn: () => api.get<any[]>("/invoices"),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks_reports"],
    queryFn: () => api.get<any[]>("/tasks"),
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects_reports"],
    queryFn: () => api.get<any[]>("/projects"),
  });

  const isLoading = loadingInvoices || loadingTasks || loadingProjects;

  const revenueData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    invoices.filter((i) => i.status?.toLowerCase() === "paid").forEach((i) => {
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

  const paidRevenue = useMemo(
    () => invoices.filter((i) => i.status === "Paid" || i.status === "paid").reduce((sum, i) => sum + (i.total_amount ?? 0), 0),
    [invoices],
  );

  const draftRevenue = useMemo(
    () => invoices.filter((i) => i.status === "Draft" || i.status === "draft").reduce((sum, i) => sum + (i.total_amount ?? 0), 0),
    [invoices],
  );

  const overdueTasks = useMemo(
    () => tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && !["Done", "done"].includes(t.status)).length,
    [tasks],
  );

  const budgetHealth = useMemo(() => {
    return projects.map((project) => {
      const total = Number(project.total_budget ?? 0);
      const spent = Number(project.spent_budget ?? 0);
      const percent = total > 0 ? Math.round((spent / total) * 100) : 0;
      return {
        name: project.name,
        total,
        spent,
        percent,
      };
    }).sort((a, b) => b.percent - a.percent).slice(0, 6);
  }, [projects]);

  return (
    <AppLayout title="Reports" subtitle="Analytics and business intelligence">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5"><Download className="h-4 w-4" /> Export Report</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToCSV(
                revenueData,
                [{ key: 'month', label: 'Month' }, { key: 'revenue', label: 'Revenue' }],
                'revenue-report'
              )}>
                <FileText className="h-4 w-4 mr-2" /> Revenue CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToCSV(
                taskDistribution,
                [{ key: 'name', label: 'Status' }, { key: 'value', label: 'Count' }],
                'task-distribution'
              )}>
                <FileText className="h-4 w-4 mr-2" /> Tasks CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToCSV(
                budgetHealth,
                [
                  { key: 'name', label: 'Project' },
                  { key: 'total', label: 'Total Budget' },
                  { key: 'spent', label: 'Spent' },
                  { key: 'percent', label: 'Utilization %' },
                ],
                'budget-health'
              )}>
                <FileText className="h-4 w-4 mr-2" /> Budget CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const combined = [
                  { section: 'Revenue', data: revenueData },
                  { section: 'Task Distribution', data: taskDistribution },
                  { section: 'Budget Health', data: budgetHealth },
                ];
                exportToJSON(combined, 'full-report');
              }}>
                <FileText className="h-4 w-4 mr-2" /> Full Report JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="glass-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Paid Revenue</p>
            <p className="mt-2 text-2xl font-bold text-foreground">${paidRevenue.toLocaleString()}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Draft Pipeline</p>
            <p className="mt-2 text-2xl font-bold text-foreground">${draftRevenue.toLocaleString()}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Projects</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{projects.length}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Overdue Tasks</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{overdueTasks}</p>
          </div>
        </div>

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

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Budget Health</h3>
            <p className="text-xs text-muted-foreground mb-4">Highest utilization across active projects</p>
            <div className="space-y-4">
              {isLoading ? <Skeleton className="h-[260px] w-full" /> : budgetHealth.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">No project budget data yet.</div>
              ) : (
                budgetHealth.map((project) => (
                  <div key={project.name}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-foreground truncate pr-3">{project.name}</span>
                      <span className="text-muted-foreground">${project.spent.toLocaleString()} / ${project.total.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={project.percent >= 85 ? "h-full bg-destructive" : project.percent >= 60 ? "h-full bg-warning" : "h-full bg-success"}
                        style={{ width: `${Math.min(project.percent, 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{project.percent}% utilized</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
