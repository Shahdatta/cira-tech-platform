import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Plus, MoreHorizontal, Users, Edit, Trash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const editProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "archived"]),
  total_budget: z.coerce.number().optional(),
});

type EditProjectValues = z.infer<typeof editProjectSchema>;

const spaceColors = [
  "bg-primary/10 text-primary border-primary/20",
  "bg-info/10 text-info border-info/20",
  "bg-success/10 text-success border-success/20",
  "bg-warning/10 text-warning border-warning/20",
  "bg-chart-5/10 text-chart-5 border-chart-5/20",
];

const Spaces = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingSpace, setEditingSpace] = useState<any | null>(null);

  const form = useForm<EditProjectValues>({
    resolver: zodResolver(editProjectSchema),
  });

  useEffect(() => {
    if (editingSpace) {
      form.reset({
        id: editingSpace.id,
        name: editingSpace.name,
        description: editingSpace.description || "",
        status: editingSpace.status || "active",
        total_budget: editingSpace.total_budget || 0,
      });
    }
  }, [editingSpace, form]);

  const onEditSubmit = (values: EditProjectValues) => {
    updateMut.mutate({ ...editingSpace, ...values });
  };

  const updateMut = useMutation({
    mutationFn: (data: any) => api.put(`/projects/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces_page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      setEditingSpace(null);
      toast.success("Project updated successfully");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces_page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      toast.success("Project moved to trash");
    },
  });

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["spaces_page"],
    queryFn: () => api.get<any[]>("/projects"),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks_for_spaces"],
    queryFn: () => api.get<any[]>("/tasks"),
  });

  function getSpaceStats(spaceId: string) {
    const spaceTasks = tasks.filter((t: any) => t.list_id && t.status);
    const done = spaceTasks.filter((t) => t.status === "Done").length;
    const progress = spaceTasks.length > 0 ? Math.round((done / spaceTasks.length) * 100) : 0;
    return { total: spaceTasks.length, progress };
  }

  return (
    <AppLayout title="Project Spaces" subtitle="Manage all your project workspaces">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">{isLoading ? "—" : `${spaces.length} spaces`}</p>
          <Button size="sm" onClick={() => navigate("/spaces/new")} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Space</Button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
          </div>
        ) : spaces.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-sm text-muted-foreground">No project spaces yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {spaces.map((s, i) => {
              const stats = getSpaceStats(s.id);
              return (
                <div key={s.id} onClick={() => navigate(`/spaces/${s.id}`)} className="glass-card hover-lift p-5 cursor-pointer animate-fade-in opacity-0" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center", spaceColors[i % spaceColors.length])}>
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/50">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingSpace(s); }} className="cursor-pointer">
                          <Edit className="h-4 w-4 mr-2" /> Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteMut.mutate(s.id); }} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                          <Trash className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{s.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-4">{s.description || "No description"}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>{stats.total} tasks</span>
                    <span>{stats.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${stats.progress}%` }} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", s.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{s.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!editingSpace} onOpenChange={(open) => !open && setEditingSpace(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project Space</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} className="resize-none" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditingSpace(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMut.isPending} className="gap-2">
                  {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Spaces;
