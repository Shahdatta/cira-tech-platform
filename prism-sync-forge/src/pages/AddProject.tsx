import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useRef } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";
import { Plus, Trash2, Loader2, ArrowLeft, UploadCloud, FileText, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

interface TeamMember {
  full_name: string;
  email: string;
  contract_type: "ft" | "pt" | "fl";
  hourly_rate: number;
}

interface TaskEntry {
  title: string;
  description: string;
  status: "todo" | "in_progress" | "in_review" | "done";
  due_date: string;
  assigned_members: string[];  // array of member ids / "new-N" keys
  hours_spent: number;
}

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100),
  description: z.string().trim().max(500).optional(),
  status: z.string(),
});

const teamSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  contract_type: z.enum(["ft", "pt", "fl"]),
  hourly_rate: z.number().min(0),
});

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]),
  due_date: z.string().optional(),
  hours_spent: z.number().min(0),
});

const emptyMember: TeamMember = { full_name: "", email: "", contract_type: "ft", hourly_rate: 0 };
const emptyTask: TaskEntry = { title: "", description: "", status: "todo", due_date: "", assigned_members: [], hours_spent: 0 };

const AddProject = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing members from API
  const { data: existingMembers = [] } = useQuery({
    queryKey: ["profiles_all"],
    queryFn: () => api.get<any[]>("/profiles"),
  });

  const [project, setProject] = useState({
    name: "",
    description: "",
    status: "active",
  });

  const [newMembers, setNewMembers] = useState<TeamMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [tasks, setTasks] = useState<TaskEntry[]>([{ ...emptyTask }]);

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const toAdd = Array.from(files).filter(
      (f) => !selectedFiles.some((s) => s.name === f.name && s.size === f.size)
    );
    setSelectedFiles((prev) => [...prev, ...toAdd]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const updateNewMember = (i: number, field: keyof TeamMember, value: string | number) => {
    setNewMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  };

  const updateTask = (i: number, field: keyof TaskEntry, value: string | number) => {
    setTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  };

  const toggleTaskAssignee = (taskIndex: number, memberId: string) => {
    setTasks((prev) => prev.map((t, idx) => {
      if (idx !== taskIndex) return t;
      const next = t.assigned_members.includes(memberId)
        ? t.assigned_members.filter((id) => id !== memberId)
        : [...t.assigned_members, memberId];
      return { ...t, assigned_members: next };
    }));
  };

  const handleSubmit = async () => {
    const projResult = projectSchema.safeParse(project);
    if (!projResult.success) {
      toast.error(projResult.error.issues[0].message);
      return;
    }

    for (let i = 0; i < newMembers.length; i++) {
      const r = teamSchema.safeParse(newMembers[i]);
      if (!r.success) {
        toast.error(`New member ${i + 1}: ${r.error.issues[0].message}`);
        return;
      }
    }

    for (let i = 0; i < tasks.length; i++) {
      if (!tasks[i].title.trim()) continue; // skip empty tasks (they won't be inserted)
      const r = taskSchema.safeParse({
        ...tasks[i],
        description: tasks[i].description || undefined,
        due_date: tasks[i].due_date || undefined,
      });
      if (!r.success) {
        toast.error(`Task ${i + 1}: ${r.error.issues[0].message}`);
        return;
      }
    }

    setSaving(true);
    let step = "project";
    try {
      // 1. Create project space
      step = "project";
      const space = await api.post<any>("/projects", {
        name: project.name,
        description: project.description || null,
        status: project.status,
        total_budget: 0,
      });

      // 2. Create default folder & list
      step = "folder";
      const folder = await api.post<any>("/folders", {
        name: "General",
        space_id: space.id,
      });

      step = "list";
      const list = await api.post<any>("/lists", {
        name: "Backlog",
        folder_id: folder.id,
      });

      // 3. Add selected existing members to the project
      const allMemberUserIds: string[] = [...selectedMemberIds];

      // 4. Insert new members and collect their user_ids
      const newMemberUserIds: Record<string, string> = {};
      for (let i = 0; i < newMembers.length; i++) {
        const m = newMembers[i];
        if (!m.full_name.trim()) continue;
        step = `member (${m.email})`;
        const profile = await api.post<any>("/profiles", {
          full_name: m.full_name.trim(),
          email: m.email.trim(),
          contract_type: m.contract_type,
          hourly_rate: m.hourly_rate,
          is_active: true,
        });
        newMemberUserIds[`new-${i}`] = profile.user_id;
        allMemberUserIds.push(profile.user_id);
      }

      // 4b. Register all selected + new members in the project
      if (allMemberUserIds.length > 0) {
        step = "project members";
        await api.post(`/projects/${space.id}/members`, { user_ids: allMemberUserIds });
      }

      // 4. Resolve assignee user_ids
      const resolveAssignee = (val: string): string | null => {
        if (!val || val === "__unassigned") return null;
        if (val.startsWith("new-")) return newMemberUserIds[val] || null;
        return val;
      };

      // 5. Insert tasks
      const insertedTasks: any[] = [];
      for (const t of tasks) {
        if (!t.title.trim()) continue;
        step = `task "${t.title}"`;
        const resolvedAssigneeIds = t.assigned_members
          .map(resolveAssignee)
          .filter((id): id is string => id !== null);
        const created = await api.post<any>("/tasks", {
          title: t.title.trim(),
          description: t.description || null,
          status: t.status,
          due_date: t.due_date || null,
          list_id: list.id,
          assignee_ids: resolvedAssigneeIds,
        });
        insertedTasks.push(created);
      }

      // 6. Insert time logs for tasks with hours
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if (!t.title.trim() || t.hours_spent <= 0) continue;
        const firstAssigneeId = t.assigned_members.length > 0 ? resolveAssignee(t.assigned_members[0]) : null;
        const userId = firstAssigneeId || Object.values(newMemberUserIds)[0] || crypto.randomUUID();
        const startTime = new Date();
        startTime.setHours(startTime.getHours() - t.hours_spent);
        try {
          await api.post("/timelogs", {
            task_id: insertedTasks[i]?.id || null,
            user_id: userId,
            start_time: startTime.toISOString(),
            end_time: new Date().toISOString(),
            duration_hours: t.hours_spent,
            is_billable: true,
            is_manual_entry: true,
            reason_manual: "Imported from project creation",
          });
        } catch {
          console.warn("Time log insert failed for task", i);
        }
      }

      // 7. Upload files if any
      if (selectedFiles.length > 0) {
        const token = localStorage.getItem("cira_tech_token");
        const formData = new FormData();
        selectedFiles.forEach((f) => formData.append("files", f));
        try {
          await fetch(`/api/projects/${space.id}/files`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });
        } catch {
          toast.warning("Project created but file upload failed. Try uploading from the project page.");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["profiles_all"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_page"] });
      toast.success("Project created successfully!");
      navigate("/spaces");
    } catch (err: any) {
      toast.error(`Failed at step [${step}]: ${err.message || "Unknown error"}`);
      console.error(`Project creation failed at step [${step}]:`, err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Add Project" subtitle="Create a project with team, tasks, and time logs">
      <div className="max-w-3xl mx-auto space-y-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/spaces")} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Spaces
        </Button>

        {/* Project Details */}
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">Project Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Project Name *</Label>
              <Input value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} placeholder="e.g. Website Redesign" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={project.status} onValueChange={(v) => setProject({ ...project, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea value={project.description} onChange={(e) => setProject({ ...project, description: e.target.value })} placeholder="Brief project description..." maxLength={500} rows={3} />
            </div>
          </div>
        </section>

        {/* Team Members */}
        <section className="glass-card p-6 space-y-5">
          <h2 className="text-base font-bold text-foreground">Team Members</h2>

          {/* Existing members — selectable list */}
          {existingMembers.length > 0 && (() => {
            const pms     = existingMembers.filter((m: any) => m.role?.toLowerCase() === "pm");
            const members = existingMembers.filter((m: any) => m.role?.toLowerCase() === "member");

            const MemberRow = ({ m }: { m: any }) => {
              const selected = selectedMemberIds.has(m.user_id);
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggleMember(m.user_id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selected ? "bg-primary/10" : "bg-background hover:bg-secondary/50"
                  }`}
                >
                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selected ? "bg-primary border-primary" : "border-muted-foreground/30"
                  }`}>
                    {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">
                      {m.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {m.contract_type ?? "—"}
                  </span>
                </button>
              );
            };

            return (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select members to join this project
                  {selectedMemberIds.size > 0 && <span className="ml-2 text-primary normal-case font-medium">{selectedMemberIds.size} selected</span>}
                </p>

                {pms.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-info/10 text-info text-[10px] uppercase">PM</span>
                      Project Managers
                    </p>
                    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                      {pms.map((m: any) => <MemberRow key={m.user_id} m={m} />)}
                    </div>
                  </div>
                )}

                {members.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[10px] uppercase">Member</span>
                      Team Members
                    </p>
                    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                      {members.map((m: any) => <MemberRow key={m.user_id} m={m} />)}
                    </div>
                  </div>
                )}

                {pms.length === 0 && members.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">No PMs or Members found in the system yet.</p>
                )}
              </div>
            );
          })()}

          {/* New members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Create New Members</p>
              <Button variant="outline" size="sm" onClick={() => setNewMembers([...newMembers, { ...emptyMember }])} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add New
              </Button>
            </div>
            {newMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">No new members. Select existing members above or create new ones.</p>
            ) : (
              <div className="space-y-3">
                {newMembers.map((m, i) => (
                  <div key={i} className="p-3 rounded-lg bg-secondary/40 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Full Name *</Label>
                        <Input value={m.full_name} onChange={(e) => updateNewMember(i, "full_name", e.target.value)} placeholder="John Doe" maxLength={100} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email *</Label>
                        <Input type="email" value={m.email} onChange={(e) => updateNewMember(i, "email", e.target.value)} placeholder="john@email.com" maxLength={255} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select value={m.contract_type} onValueChange={(v) => updateNewMember(i, "contract_type", v)}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ft">Full-Time</SelectItem>
                            <SelectItem value="pt">Part-Time</SelectItem>
                            <SelectItem value="fl">Freelancer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rate ($/hr)</Label>
                        <Input type="number" min={0} className="w-24" value={m.hourly_rate} onChange={(e) => updateNewMember(i, "hourly_rate", Number(e.target.value))} />
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setNewMembers(newMembers.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Tasks */}
        <section className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Tasks</h2>
            <Button variant="outline" size="sm" onClick={() => setTasks([...tasks, { ...emptyTask }])} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Task
            </Button>
          </div>
          <div className="space-y-4">
            {tasks.map((t, i) => (
              <div key={i} className="p-3 rounded-lg bg-secondary/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Title *</Label>
                    <Input value={t.title} onChange={(e) => updateTask(i, "title", e.target.value)} placeholder="Task title" maxLength={200} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={t.status} onValueChange={(v) => updateTask(i, "status", v)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {tasks.length > 1 && (
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setTasks(tasks.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Assigned To</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-sm font-normal h-9"
                        >
                          {t.assigned_members.length === 0 ? (
                            <span className="text-muted-foreground">Unassigned</span>
                          ) : (
                            <span>
                              {t.assigned_members.length} assignee{t.assigned_members.length > 1 ? "s" : ""}
                            </span>
                          )}
                          <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-2" align="start">
                        <div className="space-y-0.5 max-h-52 overflow-y-auto">
                          {existingMembers
                            .filter((m: any) => selectedMemberIds.has(m.user_id))
                            .map((m: any) => (
                              <div
                                key={m.user_id}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary rounded-md cursor-pointer"
                                onClick={() => toggleTaskAssignee(i, m.user_id)}
                              >
                                <Checkbox
                                  checked={t.assigned_members.includes(m.user_id)}
                                  onCheckedChange={() => toggleTaskAssignee(i, m.user_id)}
                              />
                                <div>
                                  <p className="text-sm">{m.full_name}</p>
                                  <p className="text-[10px] text-muted-foreground capitalize">{m.role}</p>
                                </div>
                              </div>
                            ))}
                          {newMembers.map((m, mi) =>
                            m.full_name.trim() ? (
                              <div
                                key={`new-${mi}`}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary rounded-md cursor-pointer"
                                onClick={() => toggleTaskAssignee(i, `new-${mi}`)}
                              >
                                <Checkbox
                                  checked={t.assigned_members.includes(`new-${mi}`)}
                                  onCheckedChange={() => toggleTaskAssignee(i, `new-${mi}`)}
                                />
                                <div>
                                  <p className="text-sm">{m.full_name}</p>
                                  <p className="text-[10px] text-muted-foreground">New member</p>
                                </div>
                              </div>
                            ) : null
                          )}
                          {selectedMemberIds.size === 0 && newMembers.filter(m => m.full_name.trim()).length === 0 && (
                            <p className="text-xs text-muted-foreground px-2 py-1">Select team members above first.</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hours Spent</Label>
                    <Input type="number" min={0} step={0.5} value={t.hours_spent} onChange={(e) => updateTask(i, "hours_spent", Number(e.target.value))} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due Date</Label>
                    <Input type="date" value={t.due_date} onChange={(e) => updateTask(i, "due_date", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={t.description} onChange={(e) => updateTask(i, "description", e.target.value)} placeholder="Task details..." maxLength={1000} rows={2} className="text-sm" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Files */}
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">Project Files</h2>
          <p className="text-xs text-muted-foreground">Attach documents, designs, or any files related to this project. Supported: any file type, max 50 MB each.</p>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/30"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
          >
            <UploadCloud className="h-9 w-9 text-muted-foreground/60" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-0.5">Select multiple files at once</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected</p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 group">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => navigate("/spaces")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default AddProject;
