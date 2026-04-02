import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectsOverviewProps {
  tasks: Tables<"tasks">[];
  projects: Tables<"project_spaces">[];
  isLoading: boolean;
}

type View = "bar" | "pie";

export function ProjectsOverview({ tasks, projects, isLoading }: ProjectsOverviewProps) {
  const [view, setView] = useState<View>("bar");

  // Build bar data: tasks per project (approximated via list→folder→space join)
  const barData = projects.slice(0, 6).map((p) => {
    // Match tasks to this project by traversing the join
    const projectTasks = tasks.filter((t: any) => t.lists?.folders?.project_spaces?.name === p.name);
    const completed = projectTasks.filter((t) => t.status === "done").length;
    return { name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name, tasks: projectTasks.length, completed };
  });

  const statusCounts = {
    done: tasks.filter((t) => t.status === "done").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_review: tasks.filter((t) => t.status === "in_review").length,
  };

  const pieData = [
    { name: "Completed", value: statusCounts.done, color: "hsl(var(--chart-3))" },
    { name: "In Progress", value: statusCounts.in_progress, color: "hsl(var(--chart-1))" },
    { name: "To Do", value: statusCounts.todo, color: "hsl(var(--chart-4))" },
    { name: "In Review", value: statusCounts.in_review, color: "hsl(var(--chart-2))" },
  ].filter((d) => d.value > 0);

  if (isLoading) {
    return (
      <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "200ms" }}>
        <Skeleton className="h-5 w-40 mb-5" />
        <Skeleton className="h-[260px] w-full" />
      </div>
    );
  }

  const isEmpty = tasks.length === 0;

  return (
    <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Projects Overview</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Task progress across all projects</p>
        </div>
        <div className="flex bg-secondary rounded-lg p-0.5">
          <button onClick={() => setView("bar")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "bar" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Bar</button>
          <button onClick={() => setView("pie")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "pie" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Pie</button>
        </div>
      </div>
      <div className="h-[260px]">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No project data yet.</div>
        ) : view === "bar" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12, boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)" }} />
              <Bar dataKey="tasks" fill="hsl(var(--chart-2) / 0.3)" radius={[6, 6, 0, 0]} name="Total" />
              <Bar dataKey="completed" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} name="Done" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: "hsl(var(--foreground))", fontSize: 12 }}>{value}</span>} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
