import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useRef } from "react";
import { Play, Pause, Plus, Loader2, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const manualEntrySchema = z.object({
  hours: z.coerce.number().min(0.01, "Please enter a valid duration").max(24, "Maximum 24 hours allowed"),
  task_id: z.string().optional(),
  is_billable: z.boolean(),
});

const editEntrySchema = z.object({
  duration_hours: z.coerce.number().min(0.01, "Please enter a valid duration").max(24, "Maximum 24 hours allowed"),
  task_id: z.string().optional(),
  is_billable: z.boolean(),
});

type ManualEntryValues = z.infer<typeof manualEntrySchema>;
type EditEntryValues = z.infer<typeof editEntrySchema>;

const TIMER_KEY = "cira_timer";

function saveTimer(taskId: string, startEpoch: number, taskTitle?: string) {
  localStorage.setItem(TIMER_KEY, JSON.stringify({ taskId, startEpoch, taskTitle }));
}
function clearTimer() {
  localStorage.removeItem(TIMER_KEY);
}
function loadTimer(): { taskId: string; startEpoch: number } | null {
  try { return JSON.parse(localStorage.getItem(TIMER_KEY) || "null"); } catch { return null; }
}

const TimeTracking = () => {
  // Restore any running timer from a previous session / navigation
  const saved = loadTimer();
  const [running, setRunning] = useState(!!saved);
  const [elapsedSeconds, setElapsedSeconds] = useState(
    saved ? Math.floor((Date.now() - saved.startEpoch) / 1000) : 0
  );
  const [activeTaskId, setActiveTaskId] = useState(saved?.taskId ?? "none");
  const startEpochRef = useRef<number>(saved?.startEpoch ?? 0);
  const [taskFilter, setTaskFilter] = useState("all");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any | null>(null);

  const { user: authUser } = useAuth();

  const manualForm = useForm<ManualEntryValues>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: { hours: 1, task_id: "none", is_billable: true },
  });

  const editForm = useForm<EditEntryValues>({
    resolver: zodResolver(editEntrySchema),
  });

  useEffect(() => {
    if (editingLog) {
      editForm.reset({
        duration_hours: editingLog.duration_hours,
        task_id: editingLog.task_id || "none",
        is_billable: editingLog.is_billable,
      });
    }
  }, [editingLog, editForm]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Format seconds to HH:MM:SS
  const h = Math.floor(elapsedSeconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, "0");
  const s = (elapsedSeconds % 60).toString().padStart(2, "0");
  const formattedTime = `${h}:${m}:${s}`;

  const { data: timeLogs = [], isLoading } = useQuery({
    queryKey: ["time_logs_page"],
    queryFn: () => api.get<any[]>("/timelogs"),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks_for_time"],
    queryFn: () => api.get<any[]>("/tasks"),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_mock_user"],
    queryFn: () => api.get<any[]>("/profiles"),
  });

  const currentUser = profiles.find((p: any) => p.email === authUser?.email) || profiles[0];
  // Use the JWT id directly (= Profile.Id = TaskAssignees.AssigneeId) for reliable matching.
  // Also check assignee_ids array so that shared-task members beyond the first assignee still see the task.
  const myUserId = authUser?.id ?? currentUser?.user_id;
  const myTasks = tasks.filter((t: any) =>
    t.assignee_id === myUserId ||
    (Array.isArray(t.assignee_ids) && t.assignee_ids.includes(myUserId))
  );

  const todayHours = timeLogs
    .filter((l) => new Date(l.start_time).toDateString() === new Date().toDateString())
    .reduce((s, l) => s + (l.duration_hours ?? 0), 0);

  const weekHours = timeLogs.reduce((s, l) => s + (l.duration_hours ?? 0), 0);

  const filteredLogs = taskFilter === "all"
    ? timeLogs
    : timeLogs.filter((l) => taskFilter === "none" ? !l.task_id : l.task_id === taskFilter);

  function formatHours(h: number) {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  }

  const logTimeMut = useMutation({
    mutationFn: (data: any) => api.post("/timelogs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_logs_page"] });
      toast.success("Time logged successfully");
      setIsManualModalOpen(false);
      manualForm.reset();
      setElapsedSeconds(0);
      setActiveTaskId("none");
      startEpochRef.current = 0;
      clearTimer();
    },
    onError: () => toast.error("Failed to log time"),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => api.put(`/timelogs/${data.id}`, {
      duration_hours: data.duration_hours,
      task_id: data.task_id === "none" ? null : data.task_id,
      is_billable: data.is_billable,
      reason_manual: data.reason_manual
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_logs_page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      setEditingLog(null);
      toast.success("Time entry updated");
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/timelogs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_logs_page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      toast.success("Time entry deleted");
    }
  });

  const startTaskMut = useMutation({
    mutationFn: (taskId: string) => api.patch(`/tasks/${taskId}/status`, { status: "InProgress" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks_for_time"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_page"] });
    },
  });

  const handleToggleTimer = () => {
    const nowStarting = !running;
    if (nowStarting) {
      // Record actual wall-clock start time so it survives navigation
      const epoch = Date.now() - elapsedSeconds * 1000;
      startEpochRef.current = epoch;
      const selectedTask = (tasks as any[]).find((t: any) => t.id === activeTaskId);
      saveTimer(activeTaskId, epoch, selectedTask?.title);
      window.dispatchEvent(new Event("cira_timer_change"));
      // Auto-advance task from ToDo → InProgress
      if (activeTaskId !== "none" && selectedTask &&
          (selectedTask.status === "ToDo" || selectedTask.status === "todo")) {
        startTaskMut.mutate(activeTaskId);
        toast.info(`"${selectedTask.title}" moved to In Progress`);
      }
    } else {
      clearTimer();
      window.dispatchEvent(new Event("cira_timer_change"));
    }
    setRunning(nowStarting);
  };

  useEffect(() => {
    if (running) {
      // Tick every second; derive elapsed from wall-clock so accuracy survives tab sleep
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startEpochRef.current) / 1000));
      }, 1000);
    } else if (!running && elapsedSeconds > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      const taskName = activeTaskId !== "none"
        ? (tasks as any[]).find((t: any) => t.id === activeTaskId)?.title
        : "Ad-hoc task";
      logTimeMut.mutate({
        task_id: activeTaskId === "none" ? null : activeTaskId,
        user_id: currentUser?.user_id || "00000000-0000-0000-0000-000000000000",
        start_time: new Date(startEpochRef.current).toISOString(),
        end_time: new Date().toISOString(),
        duration_hours: elapsedSeconds / 3600,
        is_billable: true,
        is_manual_entry: false,
        reason_manual: taskName,
      });
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  // Sync: if the timer was stopped from the navbar while this page is open,
  // reset local running state without double-logging (elapsedSeconds is set to 0 first).
  useEffect(() => {
    function onExternalStop() {
      if (!localStorage.getItem(TIMER_KEY)) {
        if (timerRef.current) clearInterval(timerRef.current);
        setElapsedSeconds(0);
        setRunning(false);
        setActiveTaskId("none");
        startEpochRef.current = 0;
      }
    }
    window.addEventListener("cira_timer_change", onExternalStop);
    return () => window.removeEventListener("cira_timer_change", onExternalStop);
  }, []);

  const onManualSubmit = (values: ManualEntryValues) => {
    logTimeMut.mutate({
      task_id: values.task_id === "none" ? null : values.task_id,
      user_id: currentUser?.user_id || "00000000-0000-0000-0000-000000000000",
      start_time: new Date(Date.now() - values.hours * 3600000).toISOString(),
      end_time: new Date().toISOString(),
      duration_hours: values.hours,
      is_billable: values.is_billable,
      is_manual_entry: true,
      reason_manual: "Manual UI Entry",
    });
  };

  const onEditSubmit = (values: EditEntryValues) => {
    updateMut.mutate({
      ...editingLog,
      ...values,
      task_id: values.task_id === "none" ? null : values.task_id
    });
  };

  return (
    <AppLayout title="Time Tracking" subtitle="Track hours across all your projects">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Timer */}
        <div className="glass-card p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <Select value={activeTaskId} onValueChange={setActiveTaskId} disabled={running}>
                <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-border">
                  <SelectValue placeholder="What are you working on?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ad-hoc Tasks (No task assigned)</SelectItem>
                  {myTasks.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono font-bold text-foreground tabular-nums min-w-[120px] text-center">{formattedTime}</span>
              <button
                onClick={handleToggleTimer}
                className={cn("h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-sm", running ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90")}
              >
                {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : formatHours(todayHours)}</p>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : formatHours(weekHours)}</p>
            <p className="text-xs text-muted-foreground mt-1">Recent Entries</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : timeLogs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Entries</p>
          </div>
        </div>

        {/* Time Entries */}
        <div className="glass-card p-5">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Entries</h3>
            <div className="flex items-center gap-3">
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger className="w-[200px] h-9 text-xs bg-secondary/30">
                  <SelectValue placeholder="Filter by Task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entries</SelectItem>
                  <SelectItem value="none">Ad-hoc Tasks</SelectItem>
                  {myTasks.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Plus className="h-3 w-3" /> Manual Entry</Button>
                </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Log Time Manually</DialogTitle>
                    </DialogHeader>
                    <Form {...manualForm}>
                      <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-4 pt-4">
                        <FormField control={manualForm.control} name="task_id" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign to Task (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="No Task" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No Task</SelectItem>
                                {myTasks.map((t: any) => (
                                   <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={manualForm.control} name="hours" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hours Spent</FormLabel>
                            <FormControl><Input type="number" step={0.1} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={manualForm.control} name="is_billable" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Status</FormLabel>
                            <Select onValueChange={(v) => field.onChange(v === "yes")} value={field.value ? "yes" : "no"}>
                              <FormControl>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Billable</SelectItem>
                                <SelectItem value="no">Non-billable</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="flex justify-end pt-2">
                          <Button type="submit" disabled={logTimeMut.isPending} className="gap-2">
                            {logTimeMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save Entry
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
              </Dialog>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filteredLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No time entries found.</p>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((e) => {
                const assignedTask = e.task_id ? tasks.find((t: any) => t.id === e.task_id) : null;
                const logName = assignedTask ? assignedTask.title : (e.reason_manual || "Ad-hoc task");
                return (
                  <div key={e.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-secondary/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{logName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(e.start_time).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", e.is_billable ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                          {e.is_billable ? "Billable" : "Non-billable"}
                        </span>
                        <span className="text-sm font-mono font-medium text-foreground min-w-[60px] text-right">
                          {e.duration_hours ? `${Number(e.duration_hours).toFixed(1)}h` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => setEditingLog(e)} className="h-7 w-7"><Edit className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(e.id)} className="h-7 w-7 text-destructive hover:text-destructive"><Trash className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editingLog} onOpenChange={(o) => !o && setEditingLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>
          {editingLog && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
                <FormField control={editForm.control} name="task_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Task (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="No Task" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Task</SelectItem>
                        {myTasks.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="duration_hours" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours Spent</FormLabel>
                    <FormControl><Input type="number" step={0.1} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="is_billable" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Status</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "yes")} value={field.value ? "yes" : "no"}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Billable</SelectItem>
                        <SelectItem value="no">Non-billable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={updateMut.isPending} className="gap-2">
                    {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default TimeTracking;
