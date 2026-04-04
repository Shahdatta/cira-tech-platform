import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format } from "date-fns";
import { Clock, User, Edit, Trash, Loader2, Save, X, CheckCircle, XCircle, ArrowRight, ChevronDown, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const editTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(3, "Task title must be at least 3 characters"),
  description: z.string().optional(),
  status: z.enum(["ToDo", "InProgress", "InReview", "Done"]),
  due_date: z.string().optional().nullable(),
  assignee_ids: z.array(z.string()).default([]),
  list_id: z.string(),
});

type EditTaskValues = z.infer<typeof editTaskSchema>;

interface TaskDetailsSheetProps {
  task: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColor: Record<string, string> = {
  todo: "bg-muted-foreground/20 text-muted-foreground",
  in_progress: "bg-info/20 text-info",
  in_review: "bg-warning/20 text-warning",
  done: "bg-success/20 text-success",
};

export const TaskDetailsSheet = ({ task, open, onOpenChange }: TaskDetailsSheetProps) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [submitReport, setSubmitReport] = useState("");
  const [approveReport, setApproveReport] = useState("");
  const [rejectReport, setRejectReport] = useState("");
  const { getCurrentUser } = useAuth();
  const currentUser = getCurrentUser();
  const currentRole = currentUser?.role || "Member";
  const canManage = currentRole === "Admin" || currentRole === "PM";

  const form = useForm<EditTaskValues>({
    resolver: zodResolver(editTaskSchema),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_sheet"],
    queryFn: () => api.get<any[]>("/profiles"),
  });

  const { data: taskReports = [] } = useQuery({
    queryKey: ["task_reports", task?.id],
    enabled: !!task?.id && open,
    queryFn: () => api.get<any[]>(`/reports/task/${task.id}`),
  });

  useEffect(() => {
    if (task) {
      form.reset({
        id: task.id,
        title: task.title,
        description: task.description || "",
        status: task.status || "ToDo",
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : null,
        assignee_ids: task.assignee_ids?.map(String) || [],
        list_id: task.list_id,
      });
    }
    if (!open) {
      setIsEditing(false);
      setSubmitReport("");
      setApproveReport("");
      setRejectReport("");
    }
  }, [task, open, form]);

  const onEditSubmit = (values: EditTaskValues) => {
    updateMut.mutate({ ...task, ...values });
  };

  const updateMut = useMutation({
    mutationFn: (data: any) => api.put(`/tasks/${data.id}`, { ...data, status: data.status || "ToDo", assignee_ids: data.assignee_ids || [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks_for_spaces"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_board"] });
      setIsEditing(false);
      toast.success("Task updated");
      onOpenChange(false);
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks_for_spaces"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_board"] });
      toast.success("Task deleted");
      onOpenChange(false);
    }
  });

  const submitReviewMut = useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/submit-review`, { content: submitReport }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks_page"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_for_spaces"] });
      queryClient.invalidateQueries({ queryKey: ["task_reports", task?.id] });
      toast.success("Task submitted for review");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to submit for review"),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/approve`, { content: approveReport }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks_page"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_for_spaces"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      queryClient.invalidateQueries({ queryKey: ["task_reports", task?.id] });
      toast.success("Task approved ✓");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to approve task"),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/reject`, { content: rejectReport }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks_page"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_for_spaces"] });
      queryClient.invalidateQueries({ queryKey: ["task_reports", task?.id] });
      toast.success("Task sent back to In Progress");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to reject task"),
  });

  const assigneeIds: string[] = isEditing ? (form.watch("assignee_ids") || []) : (task?.assignee_ids?.map(String) || []);
  const assignees = assigneeIds.map((id: string) => profiles.find((p: any) => p.user_id === id)).filter(Boolean);

  const toggleEditAssignee = (userId: string) => {
    const current = form.getValues("assignee_ids") || [];
    form.setValue(
      "assignee_ids",
      current.includes(userId) ? current.filter((id: string) => id !== userId) : [...current, userId]
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] border-l border-border bg-card overflow-y-auto">
        {task && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)}>
              <SheetHeader className="pb-6 border-b border-border/50">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-2 items-center">
                        <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ToDo">To Do</SelectItem>
                                <SelectItem value="InProgress">In Progress</SelectItem>
                                <SelectItem value="InReview">In Review</SelectItem>
                                <SelectItem value="Done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="due_date" render={({ field }) => (
                          <FormItem>
                            <FormControl><Input type="date" {...field} value={field.value || ""} className="h-8 max-w-[150px] text-xs" /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    ) : (
                      <>
                        <span className={cn("text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full", statusColor[task.status?.toLowerCase() || "todo"])}>
                          {task.status}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Due {format(new Date(task.due_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {!isEditing && canManage && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(task.id)} className="h-7 w-7 text-destructive hover:text-destructive"><Trash className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
              
              {isEditing ? (
                <div className="space-y-4 mt-6">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl><Input {...field} className="font-bold text-lg" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea {...field} className="text-sm min-h-[100px]" placeholder="Description..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              ) : (
                <>
                  <SheetTitle className="text-xl font-bold">{task.title}</SheetTitle>
                  <SheetDescription className="text-sm mt-4 text-foreground/80 whitespace-pre-wrap">
                    {task.description || "No description provided."}
                  </SheetDescription>
                </>
              )}
            </SheetHeader>
            
            <div className="py-6 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assignees</h4>
                {isEditing ? (
                  <div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-sm font-normal h-9">
                          {assigneeIds.length === 0
                            ? <span className="text-muted-foreground">Unassigned</span>
                            : <span>{assigneeIds.length} member{assigneeIds.length > 1 ? "s" : ""} assigned</span>}
                          <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-2" align="start">
                        <div className="space-y-0.5 max-h-52 overflow-y-auto">
                          {profiles.map((p: any) => (
                            <div
                              key={p.user_id}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary rounded-md cursor-pointer"
                              onClick={() => toggleEditAssignee(p.user_id)}
                            >
                              <Checkbox
                                checked={assigneeIds.includes(p.user_id)}
                                onCheckedChange={() => toggleEditAssignee(p.user_id)}
                              />
                              <div>
                                <p className="text-sm">{p.full_name}</p>
                                <p className="text-[10px] text-muted-foreground">{p.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignees.length === 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Unassigned</p>
                      </div>
                    ) : (
                      assignees.map((a: any) => (
                        <div key={a.user_id} className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {a.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{a.full_name}</p>
                            <p className="text-xs text-muted-foreground">{a.email}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">System Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Task ID</span>
                    <span className="font-mono text-xs">{task.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Created At</span>
                    <span>{format(new Date(task.created_at || Date.now()), "MMM d, yyyy HH:mm")}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">List ID</span>
                    <span className="font-mono text-xs truncate max-w-[200px]">{task.list_id}</span>
                  </div>
                </div>
              </div>

              {/* Member: submit their own InProgress task for review */}
              {!isEditing && !canManage && (task.assignee_ids?.includes(currentUser?.id) || task.assignee_id === currentUser?.id) && (task.status === "InProgress" || task.status === "in_progress") && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submit for Review</h4>
                  <Textarea
                    value={submitReport}
                    onChange={(e) => setSubmitReport(e.target.value)}
                    placeholder="Add a report about your work on this task (optional)..."
                    rows={3}
                    className="text-sm"
                  />
                  <Button type="button" onClick={() => submitReviewMut.mutate(task.id)} disabled={submitReviewMut.isPending} className="w-full gap-2">
                    {submitReviewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Submit for Review
                  </Button>
                </div>
              )}

              {/* Admin/PM: approve or reject tasks in review */}
              {!isEditing && canManage && (task.status === "InReview" || task.status === "in_review") && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Review Decision</h4>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Approval note (optional)</p>
                    <Textarea
                      value={approveReport}
                      onChange={(e) => setApproveReport(e.target.value)}
                      placeholder="Add a note for the member on approval..."
                      rows={2}
                      className="text-sm"
                    />
                    <Button type="button" onClick={() => approveMut.mutate(task.id)} disabled={approveMut.isPending || rejectMut.isPending} className="w-full gap-2 bg-success hover:bg-success/90 text-white">
                      {approveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Approve
                    </Button>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <p className="text-xs text-muted-foreground">Rejection reason (required)</p>
                    <Textarea
                      value={rejectReport}
                      onChange={(e) => setRejectReport(e.target.value)}
                      placeholder="Explain why the task is being returned for revision..."
                      rows={2}
                      className="text-sm"
                    />
                    <Button type="button" onClick={() => { if (!rejectReport.trim()) { toast.error("Please provide a rejection reason"); return; } rejectMut.mutate(task.id); }} disabled={approveMut.isPending || rejectMut.isPending} variant="destructive" className="w-full gap-2">
                      {rejectMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Reject & Return
                    </Button>
                  </div>
                </div>
              )}

              {/* Reports / Comments thread */}
              {taskReports.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Reports ({taskReports.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {taskReports.map((r: any) => {
                      const typeColor: Record<string, string> = {
                        submit: "bg-info/10 text-info border-info/20",
                        approve: "bg-success/10 text-success border-success/20",
                        reject: "bg-destructive/10 text-destructive border-destructive/20",
                        project: "bg-primary/10 text-primary border-primary/20",
                      };
                      const typeLabel: Record<string, string> = {
                        submit: "Submitted",
                        approve: "Approved",
                        reject: "Rejected",
                        project: "Project Note",
                      };
                      return (
                        <div key={r.id} className={cn("rounded-lg border p-3 text-sm", typeColor[r.report_type] || "bg-muted/10 border-border/30")}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs">{r.author_name} <span className="opacity-60">({r.author_role})</span></span>
                            <span className="text-[10px] opacity-60">{format(new Date(r.created_at), "MMM d, HH:mm")}</span>
                          </div>
                          <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{typeLabel[r.report_type] || r.report_type}</span>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{r.content}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="flex justify-end gap-2 pt-6 border-t border-border/50">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateMut.isPending} className="gap-2">
                    {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save</>}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </Form>
      )}
      </SheetContent>
    </Sheet>
  );
};
