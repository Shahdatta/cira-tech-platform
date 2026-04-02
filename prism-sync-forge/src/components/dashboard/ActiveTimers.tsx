import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInSeconds } from "date-fns";

interface ActiveTimersProps {
  timeLogs: Tables<"time_logs">[];
  isLoading: boolean;
}

function formatElapsed(startTime: string) {
  const secs = differenceInSeconds(new Date(), new Date(startTime));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ActiveTimers({ timeLogs, isLoading }: ActiveTimersProps) {
  // Active timers = time logs with no end_time
  const activeTimers = timeLogs.filter((l) => !l.end_time);

  if (isLoading) {
    return (
      <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "250ms" }}>
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "250ms" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Active Timers</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Live time tracking</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          {activeTimers.length} running
        </span>
      </div>
      {activeTimers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No active timers.</p>
      ) : (
        <div className="space-y-2.5">
          {activeTimers.slice(0, 3).map((timer) => (
            <div
              key={timer.id}
              className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/[0.03] transition-all"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">Time Entry</p>
                <p className="text-xs text-muted-foreground">Started {new Date(timer.start_time).toLocaleTimeString()}</p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 ml-3">
                <span className="text-sm font-mono tabular-nums text-foreground">{formatElapsed(timer.start_time)}</span>
                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/15 text-primary">
                  <Pause className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
