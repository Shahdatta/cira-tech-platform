import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface QuickAction {
  label: string;
  description: string;
  icon: string;
  color: string;
  path: string;
}

const actions: QuickAction[] = [
  { label: "New Task", description: "Create a task in any project", icon: "✏️", color: "bg-primary/10 hover:bg-primary/15 border-primary/20", path: "/tasks" },
  { label: "Log Time", description: "Manual time entry", icon: "⏱️", color: "bg-info/10 hover:bg-info/15 border-info/20", path: "/time-tracking" },
  { label: "Send Invoice", description: "Generate & send invoice", icon: "📄", color: "bg-success/10 hover:bg-success/15 border-success/20", path: "/invoices" },
  { label: "Team Chat", description: "Open messaging hub", icon: "💬", color: "bg-warning/10 hover:bg-warning/15 border-warning/20", path: "/chat" },
];

export function QuickActions() {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const role = user?.role || "Member";

  const visibleActions = actions.filter((action) => {
    if (role === "Member" && (action.label === "New Task" || action.label === "Send Invoice")) return false;
    return true;
  });

  return (
    <div className="glass-card p-5 animate-fade-in opacity-0" style={{ animationDelay: "150ms" }}>
      <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {visibleActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className={cn(
              "flex flex-col items-start p-3 rounded-xl border transition-all text-left hover-lift",
              action.color
            )}
          >
            <span className="text-xl mb-2">{action.icon}</span>
            <span className="text-sm font-semibold text-foreground">{action.label}</span>
            <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">{action.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
