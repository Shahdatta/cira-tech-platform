import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format } from "date-fns";
import { Clock, User, Edit, Trash, Loader2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  assignee_id: z.string().optional().nullable(),
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

  const form = useForm<EditTaskValues>({
    resolver: zodResolver(editTaskSchema),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_sheet"],
    queryFn: () => api.get<any[]>("/profiles"),
  });

  useEffect(() => {
    if (task) {
      form.reset({
        id: task.id,
        title: task.title,
        description: task.description || "",
        status: task.status || "ToDo",
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : null,
        assignee_id: task.assignee_id || "none",
        list_id: task.list_id,
      });
    }
    if (!open) setIsEditing(false);
  }, [task, open, form]);

  const onEditSubmit = (values: EditTaskValues) => {
    updateMut.mutate({ ...task, ...values, assignee_id: values.assignee_id === "none" ? null : values.assignee_id });
  };

  const updateMut = useMutation({
    mutationFn: (data: any) => api.put(`/tasks/${data.id}`, { ...data, status: data.status || "ToDo" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks_for_spaces"] });
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
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_board"] });
      toast.success("Task deleted");
      onOpenChange(false);
    }
  });

  const assigneeId = isEditing ? form.watch("assignee_id") : task?.assignee_id;
  const assignee = assigneeId && assigneeId !== "none" ? profiles.find((p: any) => p.user_id === assigneeId) : null;
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
                  {!isEditing && (
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
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assignee</h4>
                {isEditing ? (
                  <FormField control={form.control} name="assignee_id" render={({ field }) => (
                    <FormItem>
                       <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Assignee" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {assignee ? (
                        <span className="text-sm font-bold text-primary">
                          {assignee.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </span>
                      ) : (
                        <User className="h-5 w-5 text-primary/50" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{assignee ? assignee.full_name : "Unassigned"}</p>
                      {assignee && <p className="text-xs text-muted-foreground">{assignee.email}</p>}
                    </div>
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
