import { cn } from "@/lib/utils";
import { Check, MoreHorizontal } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface UpcomingTasksProps {
  tasks: Tables<"tasks">[];
  isLoading: boolean;
  onTaskClick?: (task: any) => void;
}

const priorityStyles = {
  high: "text-destructive bg-destructive/10",
  medium: "text-warning bg-warning/10",
  low: "text-muted-foreground bg-muted",
};

function formatDueDate(date: string | null) {
  if (!date) return "No date";
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isPast(d)) return "Overdue";
  return format(d, "MMM d");
}

function guessPriority(task: Tables<"tasks">): "high" | "medium" | "low" {
  if (!task.due_date) return "low";
  const d = new Date(task.due_date);
  if (isPast(d) || isToday(d)) return "high";
  if (isTomorrow(d)) return "medium";
  return "low";
}

export function UpcomingTasks({ tasks, isLoading, onTaskClick }: UpcomingTasksProps) {
  const navigate = useNavigate();
  const upcoming = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 5);

  const pending = tasks.filter((t) => t.status !== "done").length;

  if (isLoading) {
    return (
      <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "200ms" }}>
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Upcoming Tasks</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{pending} pending tasks</p>
        </div>
        <button onClick={() => navigate("/tasks")} className="text-xs text-primary font-medium hover:underline">View all</button>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No upcoming tasks yet.</p>
      ) : (
        <div className="space-y-1">
          {upcoming.map((task) => {
            const priority = guessPriority(task);
            const projectName = (task as any).lists?.folders?.project_spaces?.name ?? "—";
            return (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="flex items-center gap-3 p-2.5 rounded-lg transition-all group hover:bg-secondary/50 cursor-pointer"
              >
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                    task.status === "done" ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                  )}
                >
                  {task.status === "done" && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium text-foreground truncate", task.status === "done" && "line-through opacity-50")}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{projectName}</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className={cn("text-[11px]", priority === "high" ? "text-destructive" : "text-muted-foreground")}>
                      {formatDueDate(task.due_date)}
                    </span>
                  </div>
                </div>
                <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0", priorityStyles[priority])}>
                  {priority}
                </span>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
