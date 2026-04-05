import { AppLayout } from "@/components/layout/AppLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import {
  Download, FileText, TrendingUp, CheckCircle2, Clock,
  AlertCircle, FolderKanban, DollarSign, Users, ChevronRight,
  BarChart2, ListChecks, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportToCSV, exportToJSON, exportToPDF } from "@/lib/export-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";

const Reports = () => {
  const { role } = useRole();
  const isAdmin = role === "admin";
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { data: dashData, isLoading: loadingDash } = useQuery({
    queryKey: ["reports_dashboard"],
    queryFn: () => api.get<any>("/dashboard/summary"),
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices_reports"],
    queryFn: () => api.get<any[]>("/invoices"),
    enabled: isAdmin,
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ["projects_for_report_selector"],
    queryFn: () => api.get<any[]>("/projects"),
    enabled: isAdmin,
  });

  const { data: projectReport, isLoading: loadingReport } = useQuery({
    queryKey: ["project_report", selectedProjectId],
    queryFn: () => api.get<any>(`/projects/${selectedProjectId}/report`),
    enabled: isAdmin && !!selectedProjectId,
  });

  const isLoading = loadingDash || (isAdmin && loadingInvoices);

  // ── derived ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    activeProjects: dashData?.active_projects ?? dashData?.activeProjects ?? 0,
    openTasks:      dashData?.open_tasks       ?? dashData?.openTasks      ?? 0,
    overdueTasks:   dashData?.overdue_tasks    ?? dashData?.overdueTasks   ?? 0,
    inReview:       dashData?.tasks_in_review  ?? dashData?.tasksInReview  ?? 0,
    efficiency:     dashData?.efficiency       ?? 0,
    totalHours:     Number(dashData?.total_hours_logged ?? dashData?.totalHoursLogged ?? 0),
    totalBudget:    Number(dashData?.total_budget  ?? dashData?.totalBudget  ?? 0),
    spentBudget:    Number(dashData?.spent_budget  ?? dashData?.spentBudget  ?? 0),
  }), [dashData]);

  const taskDistribution = useMemo(() => {
    const dist: any[] = dashData?.task_status_distribution ?? dashData?.taskStatusDistribution ?? [];
    const colors: Record<string, string> = {
      ToDo: "hsl(var(--chart-4))", InProgress: "hsl(var(--chart-1))",
      InReview: "hsl(var(--chart-2))", Done: "hsl(var(--chart-3))",
    };
    return dist.map((d) => ({
      name:  (d.status ?? d.Status ?? "").replace(/([A-Z])/g, " $1").trim(),
      value: d.count ?? d.Count ?? 0,
      color: colors[d.status ?? d.Status ?? ""] ?? "hsl(var(--chart-5))",
    }));
  }, [dashData]);

  const projectBreakdown: any[] = useMemo(
    () => dashData?.project_task_breakdown ?? dashData?.projectTaskBreakdown ?? [],
    [dashData],
  );

  const budgetHealth: any[] = useMemo(
    () => (dashData?.project_budget_health ?? dashData?.projectBudgetHealth ?? [])
      .sort((a: any, b: any) =>
        Number(b.percent_used ?? b.percentUsed ?? 0) - Number(a.percent_used ?? a.percentUsed ?? 0))
      .slice(0, 6),
    [dashData],
  );

  const revenueData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    invoices.filter((i) => i.status === "Paid").forEach((i) => {
      const month = new Date(i.issue_date).toLocaleString("default", { month: "short" });
      byMonth[month] = (byMonth[month] ?? 0) + (i.total_amount ?? 0);
    });
    return Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue }));
  }, [invoices]);

  const paidRevenue  = useMemo(() => invoices.filter((i) => i.status === "Paid").reduce((s, i)  => s + (i.total_amount ?? 0), 0), [invoices]);
  const draftRevenue = useMemo(() => invoices.filter((i) => i.status === "Draft").reduce((s, i) => s + (i.total_amount ?? 0), 0), [invoices]);

  // ── Project report: Gantt data ───────────────────────────────────────────
  const ganttData = useMemo(() => {
    if (!projectReport?.tasks) return [];
    const tasks: any[] = projectReport.tasks;
    const projectStart = projectReport.start_date
      ? new Date(projectReport.start_date).getTime()
      : Math.min(...tasks.filter((t) => t.created_at).map((t) => new Date(t.created_at).getTime()));
    return tasks
      .filter((t) => t.due_date)
      .map((t) => {
        const start  = new Date(t.created_at ?? projectReport.start_date).getTime();
        const end    = new Date(t.due_date).getTime();
        const offset = Math.max(0, start - projectStart);
        const dur    = Math.max(1, end - start);
        return { name: t.title.length > 28 ? t.title.slice(0, 28) + "…" : t.title, offset, dur, status: t.status, isOverdue: t.is_overdue };
      })
      .slice(0, 20); // cap at 20 rows
  }, [projectReport]);

  // ── Project report: print/export ─────────────────────────────────────────
  const exportProjectReport = () => {
    if (!projectReport) return;
    const pr = projectReport;
    const fmt = (n: number) => `EGP ${Number(n).toLocaleString()}`;
    const statusBg: Record<string, string> = { Done: "#16a34a", InProgress: "#2563eb", InReview: "#d97706", ToDo: "#6b7280" };

    const memberRows = (pr.members ?? []).map((m: any) =>
      `<tr><td>${m.full_name}</td><td>${m.email}</td><td>${m.role}</td><td>${m.tasks_assigned}</td><td>${m.tasks_done}</td><td>${Number(m.hours_logged).toFixed(1)}h</td></tr>`
    ).join("");

    const taskRows = (pr.tasks ?? []).map((t: any) =>
      `<tr><td>${t.title}</td><td>${t.folder_name}/${t.list_name}</td><td><span style="background:${statusBg[t.status]||"#6b7280"};color:#fff;padding:2px 6px;border-radius:4px;font-size:10px">${t.status}</span></td><td>${t.priority}</td><td>${t.assignee_name ?? "—"}</td><td>${t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}</td><td>${t.estimated_hours ?? "—"}</td><td>${Number(t.actual_hours).toFixed(1)}</td></tr>`
    ).join("");

    const phaseRows = (pr.phases ?? []).map((p: any) =>
      `<tr><td><strong>${p.folder_name}</strong></td><td>${p.done_tasks}/${p.total_tasks}</td><td>${p.progress_percent}%</td><td>${(p.lists ?? []).map((l: any) => `${l.name} (${l.done_tasks}/${l.total_tasks})`).join(", ")}</td></tr>`
    ).join("");

    const invoiceRows = (pr.invoices ?? []).map((i: any) =>
      `<tr><td>${i.invoice_number}</td><td>${i.type}</td><td>${i.status}</td><td>${fmt(i.total_amount)}</td><td>${new Date(i.issue_date).toLocaleDateString()}</td></tr>`
    ).join("");

    const budgetPct = pr.total_budget > 0 ? Math.round((pr.spent_budget / pr.total_budget) * 100) : 0;
    const budgetBar = `<div style="background:#e5e7eb;height:8px;border-radius:4px;overflow:hidden"><div style="width:${Math.min(budgetPct,100)}%;height:100%;background:${budgetPct>=85?"#dc2626":budgetPct>=60?"#f59e0b":"#16a34a"}"></div></div>`;

    const html = `<html><head><title>Project Report — ${pr.name}</title><style>
      body{font-family:system-ui,sans-serif;margin:40px;color:#111827;font-size:13px}
      h1{font-size:22px;margin-bottom:2px}h2{font-size:15px;margin:24px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;color:#374151}
      .meta{color:#6b7280;font-size:12px;margin-bottom:24px}.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
      .kpi-card{border:1px solid #e5e7eb;border-radius:8px;padding:12px}.kpi-card .val{font-size:22px;font-weight:700;margin-top:4px}
      .kpi-card .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280}
      table{width:100%;border-collapse:collapse;margin-bottom:8px}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;padding:6px 8px}
      td{padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:12px}tr:last-child td{border:none}
      .badge{display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600}
      @media print{body{margin:20px}}</style></head><body>
      <h1>📋 Project Report: ${pr.name}</h1>
      <div class="meta">Status: <strong>${pr.status}</strong> &nbsp;|&nbsp; Manager: ${pr.manager_name ?? "—"} &nbsp;|&nbsp; ${pr.start_date ? new Date(pr.start_date).toLocaleDateString() : "No start date"} → ${pr.end_date ? new Date(pr.end_date).toLocaleDateString() : "Ongoing"} &nbsp;|&nbsp; Generated: ${new Date(pr.generated_at).toLocaleString()}</div>
      ${pr.description ? `<p style="color:#374151;margin-bottom:24px">${pr.description}</p>` : ""}
      <div class="kpi">
        <div class="kpi-card"><div class="lbl">Completion</div><div class="val">${pr.completion_percent}%</div></div>
        <div class="kpi-card"><div class="lbl">Total Tasks</div><div class="val">${pr.total_tasks}</div></div>
        <div class="kpi-card"><div class="lbl">Done</div><div class="val" style="color:#16a34a">${pr.done_tasks}</div></div>
        <div class="kpi-card"><div class="lbl">Overdue</div><div class="val" style="color:${pr.overdue_tasks>0?"#dc2626":"#111"}">${pr.overdue_tasks}</div></div>
        <div class="kpi-card"><div class="lbl">Hours Logged</div><div class="val">${Number(pr.total_hours_logged).toFixed(1)}h</div></div>
        <div class="kpi-card"><div class="lbl">Hours Est.</div><div class="val">${Number(pr.total_hours_estimated).toFixed(1)}h</div></div>
        <div class="kpi-card"><div class="lbl">Budget</div><div class="val">${fmt(pr.total_budget)}</div></div>
        <div class="kpi-card"><div class="lbl">Spent</div><div class="val" style="color:${budgetPct>=85?"#dc2626":budgetPct>=60?"#f59e0b":"#111"}">${fmt(pr.spent_budget)}</div></div>
      </div>
      <h2>Team Members (${pr.members_count})</h2>
      <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Tasks</th><th>Done</th><th>Hours</th></tr></thead><tbody>${memberRows}</tbody></table>
      <h2>Phases & Deliverables</h2>
      <table><thead><tr><th>Phase (Folder)</th><th>Tasks</th><th>Progress</th><th>Lists</th></tr></thead><tbody>${phaseRows}</tbody></table>
      <h2>Tasks</h2>
      <table><thead><tr><th>Title</th><th>Phase/List</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due</th><th>Est. hrs</th><th>Act. hrs</th></tr></thead><tbody>${taskRows}</tbody></table>
      <h2>Budget Health</h2>
      <p>Total Budget: <strong>${fmt(pr.total_budget)}</strong> | Spent: <strong>${fmt(pr.spent_budget)}</strong> | Utilization: <strong>${budgetPct}%</strong></p>
      ${budgetBar}
      ${invoiceRows ? `<h2>Invoices</h2><table><thead><tr><th>#</th><th>Type</th><th>Status</th><th>Amount</th><th>Date</th></tr></thead><tbody>${invoiceRows}</tbody></table>` : ""}
      </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <AppLayout title="Reports" subtitle="Analytics and business intelligence">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* Export button */}
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Download className="h-4 w-4" /> Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToCSV(projectBreakdown, [
                { key: "project_name", label: "Project" }, { key: "total_tasks", label: "Total Tasks" },
                { key: "done_tasks", label: "Done" }, { key: "progress_percent", label: "Progress %" },
                { key: "overdue_tasks", label: "Overdue" },
              ], "project-achievements")}>
                <FileText className="h-4 w-4 mr-2" /> Projects CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToCSV(taskDistribution,
                [{ key: "name", label: "Status" }, { key: "value", label: "Count" }], "task-distribution")}>
                <FileText className="h-4 w-4 mr-2" /> Tasks CSV
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => exportToCSV(revenueData,
                  [{ key: "month", label: "Month" }, { key: "revenue", label: "Revenue (EGP)" }], "revenue-report")}>
                  <FileText className="h-4 w-4 mr-2" /> Revenue CSV
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => exportToJSON(
                [{ achievements: projectBreakdown, taskDistribution, ...(isAdmin ? { revenueData, budgetHealth } : {}) }],
                "full-report")}>
                <FileText className="h-4 w-4 mr-2" /> Full Report JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 1 — PROJECT ACHIEVEMENTS
        ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Project Achievements</h2>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Active Projects",  value: stats.activeProjects,               icon: FolderKanban, color: "text-primary"          },
              { label: "Open Tasks",       value: stats.openTasks,                    icon: Clock,        color: "text-info"             },
              { label: "In Review",        value: stats.inReview,                     icon: TrendingUp,   color: "text-warning"          },
              { label: "Overdue",          value: stats.overdueTasks,                 icon: AlertCircle,  color: "text-destructive"      },
              { label: "Completion Rate",  value: `${stats.efficiency}%`,             icon: CheckCircle2, color: "text-success"          },
              { label: "Hours Logged",     value: `${Math.round(stats.totalHours)}h`, icon: Clock,        color: "text-muted-foreground" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass-card p-4 flex flex-col gap-1">
                <div className={`flex items-center gap-1.5 ${color}`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                </div>
                {isLoading
                  ? <Skeleton className="mt-1 h-7 w-16" />
                  : <p className="text-2xl font-bold text-foreground">{value}</p>}
              </div>
            ))}
          </div>

          {/* Donut + Project progress table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Task Distribution</h3>
              <p className="text-xs text-muted-foreground mb-4">By status across all projects</p>
              <div className="h-[230px]">
                {isLoading ? <Skeleton className="h-full w-full rounded-lg" /> :
                  taskDistribution.length === 0
                  ? <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No tasks yet.</div>
                  : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={taskDistribution} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={4} dataKey="value">
                          {taskDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: "hsl(var(--foreground))", fontSize: 11 }}>{v}</span>} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
              </div>
            </div>

            <div className="glass-card p-5 lg:col-span-2 overflow-x-auto">
              <h3 className="text-sm font-semibold text-foreground mb-1">Project Progress</h3>
              <p className="text-xs text-muted-foreground mb-4">Completion & overdue breakdown per project</p>
              {isLoading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : projectBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">No projects yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Project", "Progress", "Done / Total", "Overdue", "Members"].map((h) => (
                        <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground pb-3 pr-4 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projectBreakdown.map((p: any) => {
                      const pct     = p.progress_percent ?? p.progressPercent ?? 0;
                      const done    = p.done_tasks       ?? p.doneTasks        ?? 0;
                      const total   = p.total_tasks      ?? p.totalTasks       ?? 0;
                      const overdue = p.overdue_tasks    ?? p.overdueTasks     ?? 0;
                      const members = p.members_count    ?? p.membersCount     ?? 0;
                      return (
                        <tr key={p.project_id ?? p.projectId} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                          <td className="py-3 pr-4 font-medium text-foreground max-w-[160px] truncate">{p.project_name ?? p.projectName}</td>
                          <td className="pr-4 min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 80 ? "bg-success" : pct >= 40 ? "bg-primary" : "bg-warning"}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-foreground tabular-nums w-9 text-right">{pct}%</span>
                            </div>
                          </td>
                          <td className="pr-4 font-mono text-xs">
                            <span className="text-success font-bold">{done}</span>
                            <span className="text-muted-foreground"> / {total}</span>
                          </td>
                          <td className="pr-4">
                            {overdue > 0
                              ? <Badge variant="destructive" className="text-[10px] px-1.5">{overdue}</Badge>
                              : <span className="text-[11px] text-success font-semibold">✓ None</span>}
                          </td>
                          <td className="text-xs text-muted-foreground whitespace-nowrap">{members} member{members !== 1 ? "s" : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2 — MONEY & COSTS  (admin only)
        ═══════════════════════════════════════════════════════════════ */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Money & Costs</h2>
            </div>

            {/* Financial KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Paid Revenue",   value: `EGP ${paidRevenue.toLocaleString()}`,       color: "text-success"     },
                { label: "Draft Pipeline", value: `EGP ${draftRevenue.toLocaleString()}`,      color: "text-warning"     },
                { label: "Total Budget",   value: `EGP ${stats.totalBudget.toLocaleString()}`, color: "text-primary"     },
                {
                  label: "Spent Budget",
                  value: `EGP ${stats.spentBudget.toLocaleString()}`,
                  color: stats.totalBudget > 0 && stats.spentBudget / stats.totalBudget > 0.85 ? "text-destructive" : "text-foreground",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="glass-card p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                  {isLoading ? <Skeleton className="mt-2 h-8 w-32" /> : <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>}
                </div>
              ))}
            </div>

            {/* Revenue chart + Budget health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">Revenue</h3>
                <p className="text-xs text-muted-foreground mb-4">From paid invoices by month</p>
                <div className="h-[260px]">
                  {loadingInvoices ? <Skeleton className="h-full w-full rounded-lg" /> :
                    revenueData.length === 0
                    ? <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No revenue data yet.</div>
                    : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `EGP ${v / 1000}k`} />
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                            formatter={(v: number) => [`EGP ${v.toLocaleString()}`, "Revenue"]}
                          />
                          <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">Budget Health</h3>
                <p className="text-xs text-muted-foreground mb-4">Budget utilization per project</p>
                <div className="space-y-4">
                  {isLoading ? <Skeleton className="h-[260px] w-full rounded-lg" /> :
                    budgetHealth.length === 0
                    ? <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">No project budget data yet.</div>
                    : budgetHealth.map((p: any) => {
                        const pct   = Number(p.percent_used ?? p.percentUsed ?? 0);
                        const spent = Number(p.spent_budget ?? p.spentBudget ?? 0);
                        const total = Number(p.total_budget ?? p.totalBudget ?? 0);
                        return (
                          <div key={p.project_id ?? p.projectId}>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-medium text-foreground truncate pr-3">{p.project_name ?? p.projectName}</span>
                              <span className="text-muted-foreground whitespace-nowrap">EGP {spent.toLocaleString()} / EGP {total.toLocaleString()}</span>
                            </div>
                            <div className="h-2 rounded-full bg-secondary overflow-hidden">
                              <div className={pct >= 85 ? "h-full bg-destructive" : pct >= 60 ? "h-full bg-warning" : "h-full bg-success"} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">{pct}% utilized</p>
                          </div>
                        );
                      })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 3 — PER-PROJECT REPORTS  (admin only)
        ═══════════════════════════════════════════════════════════════ */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Project Report</h2>
            </div>

            {/* Project selector */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Select a project…" />
                </SelectTrigger>
                <SelectContent>
                  {(allProjects as any[]).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProjectId && projectReport && !loadingReport && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={exportProjectReport}>
                    <Download className="h-4 w-4" /> Print / Export PDF
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() =>
                    exportToJSON([projectReport], `project-report-${String(projectReport.name ?? "report").replace(/\s+/g, "-").toLowerCase()}`)}>
                    <FileText className="h-4 w-4" /> Export JSON
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() =>
                    exportToCSV(projectReport.tasks ?? [], [
                      { key: "title", label: "Task" },
                      { key: "folder_name", label: "Phase" },
                      { key: "list_name", label: "List" },
                      { key: "status", label: "Status" },
                      { key: "priority", label: "Priority" },
                      { key: "assignee_name", label: "Assignee" },
                      { key: "due_date", label: "Due Date", format: (r: any) => r.due_date ? new Date(r.due_date).toLocaleDateString() : "" },
                      { key: "estimated_hours", label: "Est. Hours" },
                      { key: "actual_hours", label: "Actual Hours" },
                    ], `tasks-${String(projectReport.name ?? "").replace(/\s+/g, "-").toLowerCase()}`)}>
                    <FileText className="h-4 w-4" /> Tasks CSV
                  </Button>
                </>
              )}
            </div>

            {/* Prompt when no project selected */}
            {!selectedProjectId && (
              <div className="glass-card p-10 flex flex-col items-center gap-3 text-muted-foreground">
                <FolderKanban className="h-10 w-10 opacity-40" />
                <p className="text-sm">Select a project above to view its full report.</p>
              </div>
            )}

            {/* Loading skeleton */}
            {selectedProjectId && loadingReport && (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            )}

            {/* ── Report body ── */}
            {selectedProjectId && projectReport && !loadingReport && (() => {
              const pr = projectReport;
              const budgetPct = (pr.total_budget ?? 0) > 0
                ? Math.round((pr.spent_budget / pr.total_budget) * 100) : 0;
              const statusCls: Record<string, string> = {
                Done: "bg-success/20 text-success", InProgress: "bg-primary/20 text-primary",
                InReview: "bg-warning/20 text-warning-foreground", ToDo: "bg-secondary text-muted-foreground",
              };
              const priorityCls: Record<string, string> = {
                Urgent: "text-destructive font-bold", High: "text-orange-500 font-semibold",
                Medium: "text-foreground", Low: "text-muted-foreground",
              };

              return (
                <div className="space-y-5">

                  {/* Header card */}
                  <div className="glass-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-foreground">{pr.name}</h3>
                          <Badge variant={pr.status === "active" ? "default" : "secondary"} className="capitalize">{pr.status}</Badge>
                        </div>
                        {pr.description && <p className="text-sm text-muted-foreground max-w-2xl">{pr.description}</p>}
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                          {pr.manager_name && <span><strong className="text-foreground">Manager:</strong> {pr.manager_name}</span>}
                          {pr.start_date   && <span><strong className="text-foreground">Start:</strong> {new Date(pr.start_date).toLocaleDateString()}</span>}
                          {pr.end_date     && <span><strong className="text-foreground">End:</strong> {new Date(pr.end_date).toLocaleDateString()}</span>}
                          <span><strong className="text-foreground">Generated:</strong> {new Date(pr.generated_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-4xl font-extrabold text-primary">{pr.completion_percent}%</p>
                        <p className="text-xs text-muted-foreground">complete</p>
                      </div>
                    </div>
                  </div>

                  {/* KPI strip */}
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {[
                      { label: "Total Tasks",  value: pr.total_tasks },
                      { label: "Done",         value: pr.done_tasks,          cls: "text-success" },
                      { label: "In Progress",  value: pr.in_progress_tasks,   cls: "text-primary" },
                      { label: "In Review",    value: pr.in_review_tasks,     cls: "text-warning-foreground" },
                      { label: "To Do",        value: pr.to_do_tasks },
                      { label: "Overdue",      value: pr.overdue_tasks,       cls: pr.overdue_tasks > 0 ? "text-destructive" : "" },
                      { label: "Hours Logged", value: `${Number(pr.total_hours_logged).toFixed(1)}h` },
                      { label: "Members",      value: pr.members_count },
                    ].map(({ label, value, cls = "" }) => (
                      <div key={label} className="glass-card p-3 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-tight">{label}</p>
                        <p className={`text-xl font-bold mt-1 ${cls || "text-foreground"}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Team Members + Phases */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Team Members */}
                    <div className="glass-card p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Team Members</h3>
                        <Badge variant="secondary" className="ml-auto text-xs">{(pr.members ?? []).length}</Badge>
                      </div>
                      {(pr.members ?? []).length === 0
                        ? <p className="text-sm text-muted-foreground">No members found.</p>
                        : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border">
                                  {["Name", "Role", "Tasks", "Done", "Hours"].map((h) => (
                                    <th key={h} className="text-left font-semibold text-muted-foreground pb-2 pr-3">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(pr.members as any[]).map((m: any) => (
                                  <tr key={m.user_id} className="border-b border-border/20 last:border-0">
                                    <td className="py-2 pr-3">
                                      <p className="font-medium text-foreground truncate max-w-[130px]">{m.full_name}</p>
                                      <p className="text-muted-foreground text-[10px] truncate max-w-[130px]">{m.email}</p>
                                    </td>
                                    <td className="pr-3 capitalize text-muted-foreground">{m.role}</td>
                                    <td className="pr-3 font-mono text-center">{m.tasks_assigned}</td>
                                    <td className="pr-3 font-mono text-center text-success font-semibold">{m.tasks_done}</td>
                                    <td className="font-mono">{Number(m.hours_logged).toFixed(1)}h</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                    </div>

                    {/* Phases & Deliverables */}
                    <div className="glass-card p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Phases & Deliverables</h3>
                      </div>
                      {(pr.phases ?? []).length === 0
                        ? <p className="text-sm text-muted-foreground">No phases found.</p>
                        : (
                          <div className="space-y-4">
                            {(pr.phases as any[]).map((ph: any) => (
                              <div key={ph.folder_name}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="font-semibold text-foreground flex items-center gap-1">
                                    <FolderKanban className="h-3 w-3 shrink-0" /> {ph.folder_name}
                                  </span>
                                  <span className="text-muted-foreground shrink-0 ml-2">{ph.done_tasks}/{ph.total_tasks} · {ph.progress_percent}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-2">
                                  <div className={`h-full rounded-full ${ph.progress_percent >= 80 ? "bg-success" : ph.progress_percent >= 40 ? "bg-primary" : "bg-warning"}`} style={{ width: `${ph.progress_percent}%` }} />
                                </div>
                                {(ph.lists as any[]).map((l: any) => (
                                  <div key={l.name} className="flex items-center justify-between text-[11px] text-muted-foreground ml-4 py-0.5">
                                    <span className="flex items-center gap-1 truncate"><ChevronRight className="h-2.5 w-2.5 shrink-0" />{l.name}</span>
                                    <span className={`shrink-0 ml-2 ${l.done_tasks === l.total_tasks && l.total_tasks > 0 ? "text-success font-semibold" : ""}`}>{l.done_tasks}/{l.total_tasks}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Gantt chart */}
                  {ganttData.length > 0 && (
                    <div className="glass-card p-5">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart2 className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Gantt Chart</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">Task timeline — creation → due date (tasks with due dates, capped at 20)</p>
                      <div style={{ height: `${Math.max(200, ganttData.length * 34 + 50)}px` }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ganttData} layout="vertical" margin={{ left: 10, right: 30, top: 4, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis type="number" dataKey="dur"
                              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              tickFormatter={(v) => `${Math.round(v / 86400000)}d`}
                              axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={170}
                              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }}
                              formatter={(val: number, name: string) =>
                                name === "dur" ? [`${Math.round(val / 86400000)} days`, "Duration"] : [null, null]}
                            />
                            <Bar dataKey="offset" stackId="g" fill="transparent" legendType="none" />
                            <Bar dataKey="dur" stackId="g" radius={[0, 4, 4, 0]} name="dur">
                              {ganttData.map((entry, i) => (
                                <Cell key={i} fill={
                                  entry.isOverdue ? "hsl(var(--destructive))"
                                  : entry.status === "Done" ? "hsl(var(--chart-3))"
                                  : entry.status === "InReview" ? "hsl(var(--chart-2))"
                                  : entry.status === "InProgress" ? "hsl(var(--chart-1))"
                                  : "hsl(var(--chart-4))"
                                } />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {[
                          { label: "To Do",       color: "hsl(var(--chart-4))" },
                          { label: "In Progress", color: "hsl(var(--chart-1))" },
                          { label: "In Review",   color: "hsl(var(--chart-2))" },
                          { label: "Done",        color: "hsl(var(--chart-3))" },
                          { label: "Overdue",     color: "hsl(var(--destructive))" },
                        ].map(({ label, color }) => (
                          <div key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks table */}
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <ListChecks className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">All Tasks</h3>
                      <Badge variant="secondary" className="ml-auto text-xs">{(pr.tasks ?? []).length}</Badge>
                    </div>
                    {(pr.tasks ?? []).length === 0
                      ? <p className="text-sm text-muted-foreground">No tasks found.</p>
                      : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                {["Task", "Phase / List", "Status", "Priority", "Assignee", "Due", "Est.h", "Act.h"].map((h) => (
                                  <th key={h} className="text-left font-semibold text-muted-foreground pb-2 pr-3 whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(pr.tasks as any[]).map((t: any) => (
                                <tr key={t.id} className={`border-b border-border/20 last:border-0 ${t.is_overdue ? "bg-destructive/5" : ""}`}>
                                  <td className="py-2 pr-3 max-w-[200px]">
                                    <p className="font-medium text-foreground truncate">{t.title}</p>
                                    {t.is_overdue && <span className="text-[9px] text-destructive font-bold uppercase tracking-wider">⚠ Overdue</span>}
                                  </td>
                                  <td className="pr-3 text-muted-foreground whitespace-nowrap">{t.folder_name}<span className="mx-1 opacity-30">/</span>{t.list_name}</td>
                                  <td className="pr-3">
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusCls[t.status] ?? "bg-secondary text-muted-foreground"}`}>{t.status}</span>
                                  </td>
                                  <td className={`pr-3 ${priorityCls[t.priority] ?? ""}`}>{t.priority}</td>
                                  <td className="pr-3 text-muted-foreground whitespace-nowrap">{t.assignee_name ?? "—"}</td>
                                  <td className="pr-3 whitespace-nowrap text-muted-foreground">{t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}</td>
                                  <td className="pr-3 font-mono text-center">{t.estimated_hours ?? "—"}</td>
                                  <td className="font-mono text-center">{Number(t.actual_hours).toFixed(1)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </div>

                  {/* Costs & Budget */}
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Costs & Budget</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                      {[
                        { label: "Total Budget",   value: `EGP ${Number(pr.total_budget).toLocaleString()}`,   cls: "text-primary"               },
                        { label: "Spent",          value: `EGP ${Number(pr.spent_budget).toLocaleString()}`,    cls: budgetPct >= 85 ? "text-destructive" : "text-foreground" },
                        { label: "Paid Invoices",  value: `EGP ${Number(pr.paid_invoiced).toLocaleString()}`,   cls: "text-success"               },
                        { label: "Total Invoiced", value: `EGP ${Number(pr.total_invoiced).toLocaleString()}`,  cls: "text-foreground"            },
                      ].map(({ label, value, cls }) => (
                        <div key={label} className="bg-secondary/30 rounded-lg p-4">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                          <p className={`text-lg font-bold mt-1 ${cls}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mb-5">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Budget utilization</span>
                        <span className={`font-semibold ${budgetPct >= 85 ? "text-destructive" : budgetPct >= 60 ? "text-warning-foreground" : "text-success"}`}>{budgetPct}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${budgetPct >= 85 ? "bg-destructive" : budgetPct >= 60 ? "bg-warning" : "bg-success"}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                      </div>
                    </div>
                    {(pr.invoices ?? []).length > 0 && (
                      <>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoices</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                {["Invoice #", "Type", "Status", "Amount", "Date", "Notes"].map((h) => (
                                  <th key={h} className="text-left font-semibold text-muted-foreground pb-2 pr-4 whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(pr.invoices as any[]).map((inv: any) => (
                                <tr key={inv.invoice_number} className="border-b border-border/20 last:border-0">
                                  <td className="py-2 pr-4 font-mono font-medium text-foreground">{inv.invoice_number}</td>
                                  <td className="pr-4 text-muted-foreground">{inv.type}</td>
                                  <td className="pr-4">
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${inv.status === "Paid" ? "bg-success/20 text-success" : inv.status === "Sent" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>{inv.status}</span>
                                  </td>
                                  <td className="pr-4 font-mono font-semibold">EGP {Number(inv.total_amount).toLocaleString()}</td>
                                  <td className="pr-4 text-muted-foreground whitespace-nowrap">{new Date(inv.issue_date).toLocaleDateString()}</td>
                                  <td className="text-muted-foreground truncate max-w-[180px]">{inv.notes ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              );
            })()}

          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default Reports;
