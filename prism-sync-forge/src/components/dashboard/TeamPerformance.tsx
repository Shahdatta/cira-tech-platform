import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamPerformanceProps {
  profiles: Tables<"profiles">[];
  timeLogs: Tables<"time_logs">[];
  tasks: Tables<"tasks">[];
  isLoading: boolean;
}

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-info/15 text-info",
  "bg-chart-5/15 text-chart-5",
  "bg-warning/15 text-warning",
  "bg-success/15 text-success",
];

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", score >= 90 ? "bg-success" : score >= 80 ? "bg-primary" : "bg-warning")}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className={cn("text-xs font-semibold font-mono min-w-[28px]", score >= 90 ? "text-success" : score >= 80 ? "text-primary" : "text-warning")}>{score}%</span>
    </div>
  );
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function TeamPerformance({ profiles, timeLogs, tasks, isLoading }: TeamPerformanceProps) {
  const members = profiles.slice(0, 5).map((p) => {
    const hours = timeLogs
      .filter((l) => l.user_id === p.user_id)
      .reduce((s, l) => s + (l.duration_hours ?? 0), 0);
    const taskCount = tasks.filter((t) => t.assignee_id === p.user_id && t.status === "done").length;
    const totalAssigned = tasks.filter((t) => t.assignee_id === p.user_id).length;
    const score = totalAssigned > 0 ? Math.round((taskCount / totalAssigned) * 100) : 0;
    return { name: p.full_name, email: p.email, hours: Math.round(hours), tasks: taskCount, score, avatar: getInitials(p.full_name) };
  });

  if (isLoading) {
    return (
      <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "300ms" }}>
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Team Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Completion rate overview</p>
        </div>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No team members yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground pb-3 pl-2">Member</th>
                <th className="text-right text-xs font-semibold text-muted-foreground pb-3">Hours</th>
                <th className="text-right text-xs font-semibold text-muted-foreground pb-3">Done</th>
                <th className="text-right text-xs font-semibold text-muted-foreground pb-3 pr-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.email} className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer">
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold", avatarColors[i % avatarColors.length])}>{m.avatar}</div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                    </div>
                  </td>
                  <td className="text-right text-sm font-mono text-foreground">{m.hours}h</td>
                  <td className="text-right text-sm font-mono text-foreground">{m.tasks}</td>
                  <td className="text-right pr-2"><ScoreBar score={m.score} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
