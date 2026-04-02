import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
  onClick?: () => void;
}

export function StatsCard({ title, value, change, changeType = "neutral", icon: Icon, iconColor, delay = 0, onClick }: StatsCardProps) {
  const TrendIcon = changeType === "positive" ? TrendingUp : changeType === "negative" ? TrendingDown : Minus;

  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-card hover-lift p-5 animate-fade-in opacity-0",
        onClick && "cursor-pointer"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center",
          iconColor || "bg-primary/10"
        )}>
          <Icon className={cn("h-5 w-5", iconColor ? "text-card-foreground" : "text-primary")} />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            changeType === "positive" && "text-success bg-success/10",
            changeType === "negative" && "text-destructive bg-destructive/10",
            changeType === "neutral" && "text-muted-foreground bg-muted"
          )}>
            <TrendIcon className="h-3 w-3" />
            {change}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{title}</p>
    </div>
  );
}
