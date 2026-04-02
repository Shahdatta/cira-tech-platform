import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";

type Column = "todo" | "in_progress" | "in_review" | "done";

const columnConfig: Record<Column, { label: string; color: string }> = {
  todo: { label: "To Do", color: "bg-muted-foreground" },
  in_progress: { label: "In Progress", color: "bg-info" },
  in_review: { label: "In Review", color: "bg-warning" },
  done: { label: "Done", color: "bg-success" },
};

const priorityDot: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-muted-foreground/50",
};

function guessPriority(task: any): "high" | "medium" | "low" {
  if (!task.due_date) return "low";
  const d = new Date(task.due_date);
  const now = new Date();
  if (d <= now) return "high";
  const diff = d.getTime() - now.getTime();
  if (diff < 3 * 86400000) return "medium";
  return "low";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// Map backend Task status values to column keys
function normalizeStatus(status: string): Column {
  const map: Record<string, Column> = {
    "ToDo": "todo",
    "todo": "todo",
    "InProgress": "in_progress",
    "in_progress": "in_progress",
    "InReview": "in_review",
    "in_review": "in_review",
    "Done": "done",
    "done": "done",
  };
  return map[status] ?? "todo";
}

const Tasks = () => {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", status: "todo", list_id: "", assignee_id: "" });
  const queryClient = useQueryClient();
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const role = user?.role || "Member";
  const canManageTasks = role === "Admin" || role === "PM";

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks_page"],
    queryFn: () => api.get<any[]>("/tasks"),
  });

  const { data: lists = [] } = useQuery({
    queryKey: ["lists_for_tasks"],
    queryFn: () => api.get<any[]>("/lists"),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_for_tasks"],
    queryFn: () => api.get<any[]>("/profiles"),
  });

  const profileMap = new Map(profiles.map((p) => [p.user_id, p.full_name]));

  const createTaskMut = useMutation({
    mutationFn: (data: any) => api.post("/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks_page"] });
      toast.success("Task created successfully");
      setIsModalOpen(false);
      setNewTask({ title: "", description: "", status: "todo", list_id: "", assignee_id: "" });
    },
    onError: () => toast.error("Failed to create task"),
  });

  const handleSubmitTask = () => {
    if (!newTask.title || !newTask.list_id) {
      toast.error("Title and List are required");
      return;
    }
    createTaskMut.mutate({
      title: newTask.title,
      description: newTask.description || null,
      status: newTask.status,
      list_id: newTask.list_id,
      assignee_id: newTask.assignee_id || null,
    });
  };

  const board: Record<Column, typeof tasks> = {
    todo: tasks.filter((t) => normalizeStatus(t.status) === "todo"),
    in_progress: tasks.filter((t) => normalizeStatus(t.status) === "in_progress"),
    in_review: tasks.filter((t) => normalizeStatus(t.status) === "in_review"),
    done: tasks.filter((t) => normalizeStatus(t.status) === "done"),
  };

  return (
    <AppLayout title="Tasks" subtitle="Kanban board & task management">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex bg-secondary rounded-lg p-0.5">
              <button onClick={() => setView("kanban")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>Kanban</button>
              <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>List</button>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Filter className="h-3 w-3" /> Filter</Button>
          </div>
          {canManageTasks && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task summary" />
                </div>
                <div className="space-y-2">
                  <Label>Project List *</Label>
                  <Select value={newTask.list_id} onValueChange={(v) => setNewTask({ ...newTask, list_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select a list" /></SelectTrigger>
                    <SelectContent>
                      {lists.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                      {lists.length === 0 && <SelectItem value="none" disabled>No lists available. Create a project first.</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select value={newTask.assignee_id} onValueChange={(v) => setNewTask({ ...newTask, assignee_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {profiles.map((p: any) => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={newTask.status} onValueChange={(v) => setNewTask({ ...newTask, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={3} placeholder="Task details..." />
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSubmitTask} disabled={createTaskMut.isPending} className="gap-2">
                    {createTaskMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Task
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {(Object.keys(columnConfig) as Column[]).map((col) => (
              <div key={col} className="flex flex-col">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={cn("h-2.5 w-2.5 rounded-full", columnConfig[col].color)} />
                  <h3 className="text-sm font-semibold text-foreground">{columnConfig[col].label}</h3>
                  <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full ml-auto">{board[col].length}</span>
                </div>
                <div className="space-y-2.5 min-h-[200px]">
                  {board[col].map((task) => {
                    const priority = guessPriority(task);
                    const assigneeName = task.assignee_id ? profileMap.get(task.assignee_id) : null;
                    return (
                      <div key={task.id} onClick={() => setSelectedTask(task)} className="glass-card p-3.5 hover-lift cursor-pointer group">
                        <div className="flex items-start gap-2 mb-2">
                          <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", priorityDot[priority])} />
                          <p className="text-sm font-medium text-foreground leading-snug">{task.title}</p>
                        </div>
                        <div className="flex items-center justify-between pl-4">
                          <span className="text-[11px] text-muted-foreground">—</span>
                          {assigneeName && (
                            <div className="flex items-center gap-1.5" title={assigneeName}>
                              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-primary">{getInitials(assigneeName)}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground max-w-[80px] truncate">{assigneeName}</span>
                            </div>
                          )}
                        </div>
                        {task.due_date && (
                          <p className="text-[10px] text-muted-foreground pl-4 mt-1">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {canManageTasks && (
                  <Button variant="ghost" className="w-full h-auto py-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl hover:bg-secondary/50 transition-colors" onClick={() => { setNewTask({ ...newTask, status: col, list_id: "" }); setIsModalOpen(true); }}>
                    + Add task
                  </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <TaskDetailsSheet task={selectedTask} open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} />
    </AppLayout>
  );
};

export default Tasks;
