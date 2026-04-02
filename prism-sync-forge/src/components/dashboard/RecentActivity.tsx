import { CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface RecentActivityProps {
  tasks: Tables<"tasks">[];
  timeLogs: Tables<"time_logs">[];
  isLoading: boolean;
}

interface ActivityItem {
  icon: typeof CheckCircle2;
  color: string;
  bg: string;
  action: string;
  time: string;
  sortDate: Date;
}

export function RecentActivity({ tasks, timeLogs, isLoading }: RecentActivityProps) {
  const activities: ActivityItem[] = [];

  // Recent completed tasks
  tasks
    .filter((t) => t.status === "done")
    .forEach((t) => {
      activities.push({
        icon: CheckCircle2,
        color: "text-success",
        bg: "bg-success/10",
        action: `Task "${t.title}" completed`,
        time: formatDistanceToNow(new Date(t.updated_at), { addSuffix: true }),
        sortDate: new Date(t.updated_at),
      });
    });

  // Recent time logs
  timeLogs.forEach((l) => {
    activities.push({
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
      action: `Logged ${l.duration_hours?.toFixed(1) ?? "—"}h${l.is_billable ? " (billable)" : ""}`,
      time: formatDistanceToNow(new Date(l.created_at), { addSuffix: true }),
      sortDate: new Date(l.created_at),
    });
  });

  activities.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  const recent = activities.slice(0, 5);

  if (isLoading) {
    return (
      <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "350ms" }}>
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "350ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <button className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No recent activity.</p>
      ) : (
        <div className="space-y-3">
          {recent.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", item.bg)}>
                <item.icon className={cn("h-4 w-4", item.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground leading-snug">{item.action}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
