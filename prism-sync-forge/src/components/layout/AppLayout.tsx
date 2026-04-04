import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search, Plus, CheckCheck, Timer, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const TYPE_ICONS: Record<string, string> = {
  TaskAssigned: "📋",
  TaskCompleted: "✅",
  TaskInReview: "🔍",
  TaskApproved: "✓",
  TaskRejected: "↩",
  ChannelInvite: "🔒",
  Info: "🔔",
};

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "PM";
  const queryClient = useQueryClient();

  // ── Nav timer widget ────────────────────────────────────────────────────────
  const [activeTimer, setActiveTimer] = useState<{ taskId: string; startEpoch: number; taskTitle?: string } | null>(null);
  const [navElapsed, setNavElapsed] = useState(0);
  const navTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showStopPopover, setShowStopPopover] = useState(false);
  const stopPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const readNavTimer = () => {
      try {
        const raw = localStorage.getItem("cira_timer");
        setActiveTimer(raw ? JSON.parse(raw) : null);
      } catch { setActiveTimer(null); }
    };
    readNavTimer();
    window.addEventListener("cira_timer_change", readNavTimer);
    window.addEventListener("storage", readNavTimer);
    return () => {
      window.removeEventListener("cira_timer_change", readNavTimer);
      window.removeEventListener("storage", readNavTimer);
    };
  }, []);

  useEffect(() => {
    if (navTimerRef.current) clearInterval(navTimerRef.current);
    if (activeTimer) {
      setNavElapsed(Math.floor((Date.now() - activeTimer.startEpoch) / 1000));
      navTimerRef.current = setInterval(() => {
        setNavElapsed(Math.floor((Date.now() - activeTimer.startEpoch) / 1000));
      }, 1000);
    } else {
      setNavElapsed(0);
    }
    return () => { if (navTimerRef.current) clearInterval(navTimerRef.current); };
  }, [activeTimer]);

  const navStopMut = useMutation({
    mutationFn: (data: any) => api.post("/timelogs", data),
    onSuccess: () => {
      localStorage.removeItem("cira_timer");
      window.dispatchEvent(new Event("cira_timer_change"));
      queryClient.invalidateQueries({ queryKey: ["time_logs_page"] });
      toast.success("Time logged");
    },
    onError: () => {
      localStorage.removeItem("cira_timer");
      window.dispatchEvent(new Event("cira_timer_change"));
      toast.error("Timer stopped (log failed)");
    },
  });

  const openStopPopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTimer || navStopMut.isPending) return;
    setShowStopPopover(true);
  };

  const confirmStop = () => {
    if (!activeTimer || navStopMut.isPending) return;
    const now = Date.now();
    const entryName = (activeTimer.taskTitle && activeTimer.taskTitle !== "none")
      ? activeTimer.taskTitle
      : "Time entry";
    navStopMut.mutate({
      task_id: activeTimer.taskId === "none" ? null : activeTimer.taskId,
      user_id: user?.id || "00000000-0000-0000-0000-000000000000",
      start_time: new Date(activeTimer.startEpoch).toISOString(),
      end_time: new Date(now).toISOString(),
      duration_hours: (now - activeTimer.startEpoch) / 3600000,
      is_billable: true,
      is_manual_entry: false,
      reason_manual: entryName,
    });
    setShowStopPopover(false);
  };

  const fmtNavTime = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };
  // ────────────────────────────────────────────────────────────────────────────

  // Close stop-popover when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (stopPopoverRef.current && !stopPopoverRef.current.contains(e.target as Node))
        setShowStopPopover(false);
    }
    if (showStopPopover) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showStopPopover]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifications(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: () => api.get<any[]>("/notifications"),
    refetchInterval: 30000,
    enabled: !!localStorage.getItem("cira_tech_token"),
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const markReadMut = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMut = useMutation({
    mutationFn: () => api.patch("/notifications/read-all", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const acceptInviteMut = useMutation({
    mutationFn: (invId: string) => api.post<{ channel_id: string }>(`/channels/invitations/${invId}/accept`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      setShowNotifications(false);
      navigate("/chat");
      toast.success("Joined channel!");
    },
    onError: () => toast.error("Could not accept invitation"),
  });

  const declineInviteMut = useMutation({
    mutationFn: (invId: string) => api.post(`/channels/invitations/${invId}/decline`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Invitation declined");
    },
    onError: () => toast.error("Could not decline invitation"),
  });

  function handleNotificationClick(n: any) {
    if (!n.is_read) markReadMut.mutate(n.id);
    setShowNotifications(false);
    const TASK_TYPES = ["TaskAssigned", "TaskCompleted", "TaskInReview", "TaskApproved", "TaskRejected"];
    const INVOICE_TITLES = ["New Invoice Created", "Invoice Sent"];
    if (TASK_TYPES.includes(n.type) && n.related_task_id) {
      navigate(`/tasks?task=${n.related_task_id}`);
    } else if (n.type === "ChannelInvite" && n.related_channel_invitation_id) {
      navigate(`/chat?invite=${n.related_channel_invitation_id}`);
    } else if (INVOICE_TITLES.includes(n.title)) {
      navigate("/invoices");
    } else {
      navigate("/tasks");
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border bg-card px-6 shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1" />
              {title && (
                <div>
                  <h1 className="text-lg font-bold text-foreground leading-tight">{title}</h1>
                  {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative mr-2">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="h-9 w-48 rounded-lg border border-border bg-secondary/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30 transition-all"
                />
              </div>

              {/* Active timer chip + stop popover */}
              {activeTimer && (
                <div className="relative mr-1" ref={stopPopoverRef}>
                  {/* Chip */}
                  <button
                    type="button"
                    onClick={() => navigate("/time-tracking")}
                    className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-full bg-success/10 border border-success/30 hover:bg-success/20 transition-colors"
                    title="Timer running — click to open Time Tracking"
                  >
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />
                    <Timer className="h-3.5 w-3.5 text-success shrink-0" />
                    <div className="flex flex-col items-start leading-none">
                      <span className="font-mono text-xs font-bold text-success tabular-nums">
                        {fmtNavTime(navElapsed)}
                      </span>
                      {activeTimer.taskTitle && activeTimer.taskTitle !== "none" && (
                        <span className="text-[10px] text-success/70 truncate max-w-[120px] mt-0.5 hidden sm:block">
                          {activeTimer.taskTitle}
                        </span>
                      )}
                    </div>
                    <span
                      role="button"
                      onClick={openStopPopover}
                      className="ml-1 h-6 w-6 flex items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/25 transition-colors border border-destructive/20"
                      title="Stop timer"
                    >
                      {navStopMut.isPending
                        ? <Loader2 className="h-3 w-3 text-destructive animate-spin" />
                        : <Square className="h-3 w-3 fill-destructive text-destructive" />}
                    </span>
                  </button>

                  {/* Stop confirmation popover */}
                  {showStopPopover && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                          <Square className="h-4 w-4 fill-destructive text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Stop Timer</p>
                          <p className="text-xs text-muted-foreground font-mono">{fmtNavTime(navElapsed)} tracked</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-secondary/50 border border-border px-3 py-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Entry name</p>
                        <p className="text-sm text-foreground truncate">
                          {activeTimer.taskTitle && activeTimer.taskTitle !== "none" ? activeTimer.taskTitle : "Time entry"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                          onClick={() => setShowStopPopover(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs bg-destructive hover:bg-destructive/90 text-white"
                          onClick={confirmStop}
                          disabled={navStopMut.isPending}
                        >
                          {navStopMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Log & Stop"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notification bell */}
              <div className="relative" ref={notifRef}>
                <Button
                  variant="ghost" size="icon"
                  className="text-muted-foreground hover:text-foreground relative"
                  onClick={() => setShowNotifications((v) => !v)}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">
                        Notifications {unreadCount > 0 && <span className="text-destructive">({unreadCount})</span>}
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllReadMut.mutate()}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="h-3 w-3" /> Mark all read
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No notifications yet
                        </p>
                      ) : (
                        notifications.map((n: any) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={cn(
                              "flex gap-3 px-4 py-3 border-b border-border/40 last:border-0 cursor-pointer transition-colors hover:bg-secondary/50",
                              !n.is_read && "bg-primary/5"
                            )}
                          >
                            <span className="mt-0.5 shrink-0 text-base">
                              {TYPE_ICONS[n.type] ?? "🔔"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-semibold text-foreground truncate", !n.is_read && "text-primary")}>
                                {n.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                              </p>
                              {n.type === "ChannelInvite" && n.related_channel_invitation_id && !n.is_read && (
                                <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    className="h-6 text-xs flex-1 bg-primary hover:bg-primary/90 text-white"
                                    disabled={acceptInviteMut.isPending || declineInviteMut.isPending}
                                    onClick={() => {
                                      markReadMut.mutate(n.id);
                                      acceptInviteMut.mutate(n.related_channel_invitation_id);
                                    }}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs flex-1"
                                    disabled={acceptInviteMut.isPending || declineInviteMut.isPending}
                                    onClick={() => {
                                      markReadMut.mutate(n.id);
                                      declineInviteMut.mutate(n.related_channel_invitation_id);
                                    }}
                                  >
                                    Decline
                                  </Button>
                                </div>
                              )}
                            </div>
                            {!n.is_read && (
                              <div className="mt-1.5 shrink-0">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isAdmin && (
                <Button size="sm" className="ml-2 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  onClick={() => navigate("/spaces/new")}>
                  <Plus className="h-3.5 w-3.5" />
                  New Project
                </Button>
              )}

            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
