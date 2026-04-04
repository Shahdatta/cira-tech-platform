import { AppLayout } from "@/components/layout/AppLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ArrowLeft, AlertCircle, CalendarClock, Clock, DollarSign, FolderKanban, Users, List as ListIcon, Loader2, MessageSquare, FileText, UploadCloud, Download, Trash2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { format, isAfter, addDays } from "date-fns";
import { toast } from "sonner";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SpaceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectReport, setProjectReport] = useState("");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", status: "ToDo", list_id: "", due_date: "", assignee_ids: [] as string[] });

  const { getCurrentUser } = useAuth();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";
  const isPMOrAdmin = ["admin", "pm"].includes(currentUser?.role?.toLowerCase() ?? "");

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

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["project-members", id],
    enabled: !!id,
    queryFn: () => api.get<any[]>(`/projects/${id}/members`),
  });

  const { data: projectReports = [], isLoading: loadingProjectReports } = useQuery({
    queryKey: ["project_reports", id],
    enabled: !!id && isPMOrAdmin,
    queryFn: () => api.get<any[]>(`/reports/project/${id}`),
  });

  const { data: projectFiles = [], isLoading: loadingFiles } = useQuery({
    queryKey: ["project-files", id],
    enabled: !!id,
    queryFn: () => api.get<any[]>(`/projects/${id}/files`),
  });

  const postProjectReportMut = useMutation({
    mutationFn: (content: string) =>
      api.post("/reports", { space_id: id, report_type: "project", content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_reports", id] });
      toast.success("Report added");
      setProjectReport("");
    },
    onError: () => toast.error("Failed to add report"),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_space_detail"],
    queryFn: () => api.get<any[]>("/profiles"),
  });

  const createTaskMut = useMutation({
    mutationFn: (data: any) => api.post("/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created successfully");
      setIsAddTaskOpen(false);
      setNewTask({ title: "", description: "", status: "ToDo", list_id: "", due_date: "", assignee_ids: [] });
    },
    onError: () => toast.error("Failed to create task"),
  });

  const handleCreateTask = () => {
    if (!newTask.title.trim()) { toast.error("Task title is required"); return; }
    if (!newTask.list_id) { toast.error("Please select a list"); return; }
    createTaskMut.mutate({
      title: newTask.title.trim(),
      description: newTask.description || null,
      status: newTask.status,
      list_id: newTask.list_id,
      due_date: newTask.due_date || null,
      assignee_ids: newTask.assignee_ids,
    });
  };

  const toggleAssignee = (userId: string) => {
    setNewTask(prev => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(userId)
        ? prev.assignee_ids.filter(a => a !== userId)
        : [...prev.assignee_ids, userId],
    }));
  };

  const deleteFileMut = useMutation({
    mutationFn: (fileId: string) => api.delete(`/projects/${id}/files/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-files", id] });
      toast.success("File deleted");
    },
    onError: () => toast.error("Failed to delete file"),
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const token = localStorage.getItem("cira_tech_token");
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    setUploading(true);
    try {
      await fetch(`/api/projects/${id}/files`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      queryClient.invalidateQueries({ queryKey: ["project-files", id] });
      toast.success("Files uploaded successfully");
    } catch {
      toast.error("File upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openFile = async (file: any) => {
    const token = localStorage.getItem("cira_tech_token");
    try {
      const res = await fetch(`/api/projects/${id}/files/${file.id}/download?inline=true`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { toast.error("Could not open file"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error("Could not open file");
    }
  };

  const downloadFile = async (file: any) => {
    const token = localStorage.getItem("cira_tech_token");
    try {
      const res = await fetch(`/api/projects/${id}/files/${file.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { toast.error("Download failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  const spaceFolders = folders.filter((f: any) => f.space_id === id);
  const spaceLists = lists.filter((l: any) => spaceFolders.some((f: any) => f.id === l.folder_id));
  const spaceTasks = tasks.filter((t: any) => spaceLists.some((sl: any) => sl.id === t.list_id));
  const doneTasks = spaceTasks.filter((t: any) => ["Done", "done"].includes(t.status)).length;
  const inReviewTasks = spaceTasks.filter((t: any) => ["InReview", "in_review"].includes(t.status)).length;
  const dueSoonTasks = spaceTasks.filter((t: any) => t.due_date && isAfter(addDays(new Date(), 7), new Date(t.due_date)) && !["Done", "done"].includes(t.status)).length;
  const progress = spaceTasks.length > 0 ? Math.round((doneTasks / spaceTasks.length) * 100) : 0;

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
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{space.name}</h1>
            <p className="text-sm text-muted-foreground">Created {format(new Date(space.created_at || Date.now()), "MMM d, yyyy")}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/chat?project=${id}`)}>
            <MessageSquare className="h-4 w-4" />
            Open Chat
          </Button>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card p-5 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Project Health</h3>
                <p className="text-xs text-muted-foreground mt-1">Live task delivery snapshot for this workspace</p>
              </div>
              <span className="text-2xl font-bold text-foreground">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                <div className="flex items-center gap-2 text-success"><Clock className="h-4 w-4" /><span className="text-xs font-medium">Completed</span></div>
                <p className="mt-2 text-lg font-semibold text-foreground">{doneTasks}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                <div className="flex items-center gap-2 text-warning"><CalendarClock className="h-4 w-4" /><span className="text-xs font-medium">In Review</span></div>
                <p className="mt-2 text-lg font-semibold text-foreground">{inReviewTasks}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" /><span className="text-xs font-medium">Due Soon</span></div>
                <p className="mt-2 text-lg font-semibold text-foreground">{dueSoonTasks}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Project Members</h3>
                <p className="text-xs text-muted-foreground mt-1">Everyone assigned to this workspace</p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{members.length}</span>
            </div>
            {loadingMembers ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No members are linked to this project yet.</p>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {members.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/15 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{member.role}</span>
                      {member.is_manager && <span className="text-[10px] text-muted-foreground">Manager</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Files */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Project Files</h3>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              Upload
            </Button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
          </div>

          {/* Drop zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/20"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
          >
            <UploadCloud className="h-7 w-7 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">Drop files here or click to browse</p>
          </div>

          {loadingFiles ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : projectFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No files uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {projectFiles.map((file: any) => (
                <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20 group">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.original_name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)} · {format(new Date(file.uploaded_at), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Open in browser" onClick={() => openFile(file)}>
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Download" onClick={() => downloadFile(file)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteFileMut.mutate(file.id)} disabled={deleteFileMut.isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PM / Admin: Project-level reports */}
        {isPMOrAdmin && (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Project Reports</h3>
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Textarea
                  value={projectReport}
                  onChange={(e) => setProjectReport(e.target.value)}
                  placeholder="Write a project-level report or note..."
                  rows={3}
                  className="text-sm resize-none"
                />
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={!projectReport.trim() || postProjectReportMut.isPending}
                  onClick={() => postProjectReportMut.mutate(projectReport)}
                >
                  {postProjectReportMut.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5" />
                  )}
                  Add Report
                </Button>
              </div>
            )}

            {loadingProjectReports ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : projectReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No project reports yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {projectReports.map((r: any) => (
                  <div key={r.id} className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">{r.author_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">{r.author_role}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(r.created_at), "MMM d, yyyy · HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-foreground/80">{r.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Project Tasks</h3>
            {isPMOrAdmin && (
              <Button size="sm" className="gap-1.5" onClick={() => setIsAddTaskOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Task
              </Button>
            )}
          </div>
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

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={(open) => { setIsAddTaskOpen(open); if (!open) setNewTask({ title: "", description: "", status: "ToDo", list_id: "", due_date: "", assignee_ids: [] }); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Task to {space?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="task-title"
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                placeholder="Optional description..."
                rows={3}
                className="resize-none text-sm"
                value={newTask.description}
                onChange={(e) => setNewTask(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>List <span className="text-destructive">*</span></Label>
                <Select value={newTask.list_id} onValueChange={(v) => setNewTask(p => ({ ...p, list_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select list" /></SelectTrigger>
                  <SelectContent>
                    {spaceLists.length === 0
                      ? <SelectItem value="__none" disabled>No lists in project</SelectItem>
                      : spaceLists.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={newTask.status} onValueChange={(v) => setNewTask(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ToDo">To Do</SelectItem>
                    <SelectItem value="InProgress">In Progress</SelectItem>
                    <SelectItem value="InReview">In Review</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask(p => ({ ...p, due_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assignees</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-sm">
                    {newTask.assignee_ids.length === 0
                      ? <span className="text-muted-foreground">Select assignees...</span>
                      : <span>{newTask.assignee_ids.length} assignee{newTask.assignee_ids.length > 1 ? "s" : ""} selected</span>
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-2" align="start">
                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {profiles.map((p: any) => (
                      <div key={p.user_id} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary/50 cursor-pointer" onClick={() => toggleAssignee(p.user_id)}>
                        <Checkbox checked={newTask.assignee_ids.includes(p.user_id)} onCheckedChange={() => toggleAssignee(p.user_id)} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={createTaskMut.isPending} className="gap-2">
              {createTaskMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TaskDetailsSheet task={selectedTask} open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} />
    </AppLayout>
  );
}
