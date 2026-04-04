import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { AlertCircle, DollarSign, Clock, TrendingUp, FolderKanban, Users, Building2, Briefcase, UserCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProjectTaskBreakdown {
  project_id: string;
  project_name: string;
  total_tasks: number;
  done_tasks: number;
  open_tasks: number;
  overdue_tasks: number;
  members_count: number;
  progress_percent: number;
  status: string;
}

interface DashboardSummary {
  active_projects: number;
  open_tasks: number;
  overdue_tasks: number;
  tasks_in_review: number;
  tasks_due_this_week: number;
  total_hours_logged: number;
  active_members: number;
  total_revenue: number;
  total_budget: number;
  spent_budget: number;
  efficiency: number;
  scope_label: string;
  project_budget_health: Array<{
    project_id: string;
    project_name: string;
    total_budget: number;
    spent_budget: number;
    percent_used: number;
    status: string;
  }>;
  task_status_distribution: Array<{ status: string; count: number }>;
  project_task_breakdown: ProjectTaskBreakdown[];
}

interface MyPayrollSummary {
  payrolls: Array<{
    id: string;
    period_start: string;
    period_end: string;
    net_amount: number;
    status: string;
    reimbursement_amount: number;
    approved_at: string | null;
    paid_at: string | null;
  }>;
  total_earned: number;
  pending_amount: number;
  approved_amount: number;
  paid_amount: number;
}

const STATUS_COLORS: Record<string, string> = {
  ToDo: "#94a3b8",
  InProgress: "#3b82f6",
  InReview: "#f59e0b",
  Done: "#22c55e",
  Rejected: "#ef4444",
};

const BUDGET_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];
function budgetColor(pct: number) {
  if (pct < 60) return BUDGET_COLORS[0];
  if (pct < 85) return BUDGET_COLORS[1];
  return BUDGET_COLORS[2];
}

export function RoleDashboard() {
  const { role } = useRole();
  const { user } = useAuth();

  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard_summary"],
    queryFn: () => api.get("/dashboard/summary"),
  });

  const { data: myPayroll } = useQuery<MyPayrollSummary>({
    queryKey: ["my_payroll"],
    queryFn: () => api.get("/payrolls/my"),
    enabled: role === "member" || role === "guest",
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const isAdmin = role === "admin";
  const isPM = role === "pm";
  const isHR = role === "hr";
  const isMember = role === "member" || role === "guest";

  const scopeBanner = isAdmin
    ? { icon: Building2, label: "Company Overview", color: "bg-primary/10 text-primary border-primary/20" }
    : isPM
    ? { icon: Briefcase, label: summary.scope_label || "My Projects Overview", color: "bg-info/10 text-info border-info/20" }
    : isHR
    ? { icon: Users, label: "HR Overview", color: "bg-warning/10 text-warning border-warning/20" }
    : { icon: UserCircle, label: "My Work Overview", color: "bg-success/10 text-success border-success/20" };

  const ScopeIcon = scopeBanner.icon;

  return (
    <div className="space-y-4">
      {/* Scope Banner */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${scopeBanner.color}`}>
        <ScopeIcon className="h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{scopeBanner.label}</p>
          <p className="text-xs opacity-75">
            {isAdmin && "Viewing analytics for all company projects and teams"}
            {isPM && `Viewing analytics for ${summary.active_projects} project${summary.active_projects !== 1 ? "s" : ""} you manage`}
            {isMember && "Viewing your personal task and payroll summary"}
            {isHR && "Viewing team workforce metrics"}
          </p>
        </div>
        <div className="ml-auto flex gap-4 shrink-0">
          <div className="text-center hidden sm:block">
            <p className="text-lg font-bold">{summary.active_projects}</p>
            <p className="text-[10px] opacity-75">Projects</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-lg font-bold">{summary.open_tasks}</p>
            <p className="text-[10px] opacity-75">Open Tasks</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{summary.efficiency}%</p>
            <p className="text-[10px] opacity-75">Efficiency</p>
          </div>
        </div>
      </div>

      {/* Alerts Row */}
      {(summary.overdue_tasks > 0 || summary.tasks_in_review > 0 || summary.tasks_due_this_week > 0) && (
        <div className="flex flex-wrap gap-3">
          {summary.overdue_tasks > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" />
              {summary.overdue_tasks} overdue task{summary.overdue_tasks > 1 ? "s" : ""} need attention
            </div>
          )}
          {summary.tasks_in_review > 0 && (isAdmin || isPM) && (
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-4 py-2 text-sm font-medium text-warning">
              <Clock className="h-4 w-4" />
              {summary.tasks_in_review} task{summary.tasks_in_review > 1 ? "s" : ""} awaiting review
            </div>
          )}
          {summary.tasks_due_this_week > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-info/10 border border-info/20 px-4 py-2 text-sm font-medium text-info">
              <TrendingUp className="h-4 w-4" />
              {summary.tasks_due_this_week} task{summary.tasks_due_this_week > 1 ? "s" : ""} due this week
            </div>
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TaskDistributionChart data={summary.task_status_distribution} />

        {(isAdmin || isPM) && summary.project_task_breakdown.length > 0 && (
          <ProjectTaskProgressChart data={summary.project_task_breakdown} />
        )}

        {(isAdmin || isPM) && (
          <BudgetHealthChart
            data={summary.project_budget_health}
            totalBudget={summary.total_budget}
            spentBudget={summary.spent_budget}
          />
        )}

        {isMember && myPayroll && <PayrollSelfView data={myPayroll} />}
        {isHR && <HRKpiCard summary={summary} />}
      </div>

      {/* Per-project summary cards — Admin and PM */}
      {(isAdmin || isPM) && summary.project_task_breakdown.length > 0 && (
        <ProjectSummaryGrid data={summary.project_task_breakdown} />
      )}
    </div>
  );
}

// ─── Task Distribution Chart ──────────────────────────────────────────────────
function TaskDistributionChart({ data }: { data: Array<{ status: string; count: number }> }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Task Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No tasks yet</p>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={STATUS_COLORS[d.status] || "#6b7280"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 flex-1">
              {data.map((d) => (
                <div key={d.status} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[d.status] || "#6b7280" }} />
                  <span className="text-muted-foreground">{d.status}</span>
                  <span className="font-semibold ml-auto">{d.count}</span>
                  <span className="text-muted-foreground w-8 text-right">{Math.round(d.count / total * 100)}%</span>
                </div>
              ))}
              <div className="mt-1 pt-1 border-t border-border/50 flex justify-between text-xs font-semibold">
                <span>Total</span><span>{total}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Per-Project Task Progress Chart ──────────────────────────────────────────
function ProjectTaskProgressChart({ data }: { data: ProjectTaskBreakdown[] }) {
  const chartData = data.slice(0, 8).map((p) => ({
    name: p.project_name.length > 14 ? p.project_name.slice(0, 14) + "…" : p.project_name,
    done: p.done_tasks,
    open: p.open_tasks,
    overdue: p.overdue_tasks,
  }));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Task Progress by Project</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No project data</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="done" name="Done" stackId="a" fill="#22c55e" />
              <Bar dataKey="open" name="Open" stackId="a" fill="#3b82f6" />
              <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Budget Health Chart ──────────────────────────────────────────────────────
function BudgetHealthChart({
  data, totalBudget, spentBudget,
}: {
  data: Array<{ project_name: string; total_budget: number; spent_budget: number; percent_used: number }>;
  totalBudget: number;
  spentBudget: number;
}) {
  const pct = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Budget Health</CardTitle>
          <Badge variant={pct < 60 ? "default" : pct < 85 ? "secondary" : "destructive"}>{pct}% used</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-3">
          ${spentBudget.toLocaleString()} spent of ${totalBudget.toLocaleString()} total
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No active projects</p>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data.slice(0, 6)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
              <YAxis type="category" dataKey="project_name" width={90} fontSize={10} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="percent_used" radius={[0, 4, 4, 0]}>
                {data.map((d, i) => (<Cell key={i} fill={budgetColor(d.percent_used)} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Per-Project Summary Cards Grid ──────────────────────────────────────────
function ProjectSummaryGrid({ data }: { data: ProjectTaskBreakdown[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <FolderKanban className="h-4 w-4 text-primary" />
        Project Breakdown
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {data.map((p) => (
          <div key={p.project_id} className="glass-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground line-clamp-1">{p.project_name}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                p.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
              }`}>{p.status}</span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span className="font-semibold text-foreground">{p.progress_percent}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${p.progress_percent}%`,
                    backgroundColor: p.progress_percent >= 80 ? "#22c55e" : p.progress_percent >= 40 ? "#3b82f6" : "#f59e0b",
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="rounded-lg bg-secondary/40 p-1.5">
                <p className="text-xs font-bold text-foreground">{p.total_tasks}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg bg-success/10 p-1.5">
                <p className="text-xs font-bold text-success">{p.done_tasks}</p>
                <p className="text-[10px] text-muted-foreground">Done</p>
              </div>
              <div className={`rounded-lg p-1.5 ${p.overdue_tasks > 0 ? "bg-destructive/10" : "bg-secondary/40"}`}>
                <p className={`text-xs font-bold ${p.overdue_tasks > 0 ? "text-destructive" : "text-muted-foreground"}`}>{p.overdue_tasks}</p>
                <p className="text-[10px] text-muted-foreground">Overdue</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{p.members_count} member{p.members_count !== 1 ? "s" : ""}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Payroll Self-View ────────────────────────────────────────────────────────
function PayrollSelfView({ data }: { data: MyPayrollSummary }) {
  const statusColor: Record<string, string> = {
    Draft: "bg-muted text-muted-foreground",
    Approved: "bg-blue-500/10 text-blue-500",
    Paid: "bg-green-500/10 text-green-500",
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">My Payroll & Reimbursements</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <div className="text-xs text-muted-foreground">Total Earned</div>
            <div className="text-lg font-bold">${data.total_earned.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-green-500/10 p-2 text-center">
            <div className="text-xs text-muted-foreground">Paid Out</div>
            <div className="text-lg font-bold text-green-600">${data.paid_amount.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-2 text-center">
            <div className="text-xs text-muted-foreground">Approved</div>
            <div className="text-sm font-semibold text-blue-600">${data.approved_amount.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="text-sm font-semibold">${data.pending_amount.toLocaleString()}</div>
          </div>
        </div>
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {data.payrolls.slice(0, 5).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground">
                {new Date(p.period_start).toLocaleDateString()} — {new Date(p.period_end).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">${p.net_amount.toLocaleString()}</span>
                <Badge variant="outline" className={`text-[10px] ${statusColor[p.status] || ""}`}>{p.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── HR KPI Card ──────────────────────────────────────────────────────────────
function HRKpiCard({ summary }: { summary: DashboardSummary }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">HR Overview</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="text-xs text-muted-foreground">Active Members</div>
          <div className="text-2xl font-bold">{summary.active_members}</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="text-xs text-muted-foreground">Team Efficiency</div>
          <div className="text-2xl font-bold">{summary.efficiency}%</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="text-xs text-muted-foreground">Total Hours</div>
          <div className="text-lg font-bold">{Math.round(summary.total_hours_logged)}</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="text-xs text-muted-foreground">Open Tasks</div>
          <div className="text-lg font-bold">{summary.open_tasks}</div>
        </div>
      </CardContent>
    </Card>
  );
}
