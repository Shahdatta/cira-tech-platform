import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import { useState, useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, addDays, format, isWithinInterval } from "date-fns";

interface WeeklyTrendProps {
  timeLogs: Tables<"time_logs">[];
  tasks: Tables<"tasks">[];
  isLoading: boolean;
}

export function WeeklyTrend({ timeLogs, tasks, isLoading }: WeeklyTrendProps) {
  const [metric, setMetric] = useState<"hours" | "tasks">("hours");

  const weeklyData = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);
      const dayEnd = addDays(day, 1);
      const interval = { start: day, end: dayEnd };
      const hours = timeLogs
        .filter((l) => l.start_time && isWithinInterval(new Date(l.start_time), interval))
        .reduce((s, l) => s + (l.duration_hours ?? 0), 0);
      const taskCount = tasks.filter((t) => t.created_at && isWithinInterval(new Date(t.created_at), interval)).length;
      return { day: format(day, "EEE"), hours: Math.round(hours * 10) / 10, tasks: taskCount };
    });
  }, [timeLogs, tasks]);

  if (isLoading) {
    return (
      <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "300ms" }}>
        <Skeleton className="h-5 w-32 mb-5" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Weekly Trend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Team productivity this week</p>
        </div>
        <div className="flex bg-secondary rounded-lg p-0.5">
          <button onClick={() => setMetric("hours")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${metric === "hours" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Hours</button>
          <button onClick={() => setMetric("tasks")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${metric === "tasks" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Tasks</button>
        </div>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyData}>
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12, boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)" }} />
            <Area type="monotone" dataKey={metric} stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorMetric)" dot={{ fill: "hsl(var(--card))", stroke: "hsl(var(--primary))", strokeWidth: 2, r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
