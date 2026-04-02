import { AppLayout } from "@/components/layout/AppLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ArrowLeft, Clock, DollarSign, FolderKanban, Users, List as ListIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function SpaceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Use the queries we already have
  const { data: spaces = [], isLoading: loadingSpaces } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<any[]>("/projects"),
  });

  const space = spaces.find((s: any) => s.id === id);

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<any[]>("/tasks"),
  });

  const { data: lists = [], isLoading: loadingLists } = useQuery({
    queryKey: ["lists"],
    queryFn: () => api.get<any[]>("/lists"),
  });

  const { data: folders = [], isLoading: loadingFolders } = useQuery({
    queryKey: ["folders"],
    queryFn: () => api.get<any[]>("/folders"),
  });

  const spaceFolders = folders.filter((f: any) => f.space_id === id);
  const spaceLists = lists.filter((l: any) => spaceFolders.some((f: any) => f.id === l.folder_id));
  const spaceTasks = tasks.filter((t: any) => spaceLists.some((sl: any) => sl.id === t.list_id));

  if (loadingSpaces) {
    return (
      <AppLayout title="Loading..." subtitle="Please wait">
        <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  if (!space) {
    return (
      <AppLayout title="Space Not Found" subtitle="This project space does not exist.">
        <div className="flex justify-center mt-12"><Button onClick={() => navigate("/spaces")}>Back to Spaces</Button></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={space.name} subtitle={space.description || "Project Details"}>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/spaces")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{space.name}</h1>
            <p className="text-sm text-muted-foreground">Created {format(new Date(space.created_at || Date.now()), "MMM d, yyyy")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center"><ListIcon className="h-5 w-5 text-info" /></div>
            <div><p className="text-sm font-semibold text-foreground">{spaceLists.length}</p><p className="text-xs text-muted-foreground">Lists/Folders</p></div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center"><FolderKanban className="h-5 w-5 text-success" /></div>
            <div><p className="text-sm font-semibold text-foreground">{spaceTasks.length}</p><p className="text-xs text-muted-foreground">Total Tasks</p></div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-warning" /></div>
            <div><p className="text-sm font-semibold text-foreground">${space.total_budget?.toLocaleString() || 0}</p><p className="text-xs text-muted-foreground">Budget</p></div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize", space.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{space.status}</span>
              <p className="text-xs text-muted-foreground mt-1">Status</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Project Tasks</h3>
          {loadingTasks ? (
             <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : spaceTasks.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-6">No tasks assigned to this project yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {spaceTasks.map((t: any) => (
                <div key={t.id} onClick={() => setSelectedTask(t)} className="p-3 border border-border/50 rounded-lg hover:border-primary/50 cursor-pointer transition-colors bg-secondary/20">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">Status: <span className="capitalize">{t.status.replace("_", " ")}</span></p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <TaskDetailsSheet task={selectedTask} open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} />
    </AppLayout>
  );
}
