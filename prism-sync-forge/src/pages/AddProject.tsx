import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
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
  assigned_member: string;
  hours_spent: number;
}

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100),
  description: z.string().trim().max(500).optional(),
  status: z.string(),
  total_budget: z.number().min(0).optional(),
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
const emptyTask: TaskEntry = { title: "", description: "", status: "todo", due_date: "", assigned_member: "", hours_spent: 0 };

const AddProject = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Fetch existing members from API
  const { data: existingMembers = [] } = useQuery({
    queryKey: ["profiles_all"],
    queryFn: () => api.get<any[]>("/profiles"),
  });

  const [project, setProject] = useState({
    name: "",
    description: "",
    status: "active",
    total_budget: 0,
  });

  const [newMembers, setNewMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<TaskEntry[]>([{ ...emptyTask }]);

  const updateNewMember = (i: number, field: keyof TeamMember, value: string | number) => {
    setNewMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  };

  const updateTask = (i: number, field: keyof TaskEntry, value: string | number) => {
    setTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
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
    try {
      // 1. Create project space
      const space = await api.post<any>("/projects", {
        name: project.name,
        description: project.description || null,
        status: project.status,
        total_budget: project.total_budget,
      });

      // 2. Create default folder & list
      const folder = await api.post<any>("/folders", {
        name: "General",
        space_id: space.id,
      });

      const list = await api.post<any>("/lists", {
        name: "Backlog",
        folder_id: folder.id,
      });

      // 3. Insert new members and collect their user_ids
      const newMemberUserIds: Record<string, string> = {};
      for (let i = 0; i < newMembers.length; i++) {
        const m = newMembers[i];
        if (!m.full_name.trim()) continue;
        const profile = await api.post<any>("/profiles", {
          full_name: m.full_name.trim(),
          email: m.email.trim(),
          contract_type: m.contract_type,
          hourly_rate: m.hourly_rate,
          is_active: true,
        });
        newMemberUserIds[`new-${i}`] = profile.user_id;
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
        const created = await api.post<any>("/tasks", {
          title: t.title.trim(),
          description: t.description || null,
          status: t.status,
          due_date: t.due_date || null,
          list_id: list.id,
          assignee_id: resolveAssignee(t.assigned_member),
        });
        insertedTasks.push(created);
      }

      // 6. Insert time logs for tasks with hours
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if (!t.title.trim() || t.hours_spent <= 0) continue;
        const assigneeId = resolveAssignee(t.assigned_member);
        const userId = assigneeId || Object.values(newMemberUserIds)[0] || crypto.randomUUID();
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

      queryClient.invalidateQueries({ queryKey: ["profiles_all"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_page"] });
      toast.success("Project created successfully!");
      navigate("/spaces");
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
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
            <div className="space-y-1.5">
              <Label>Budget ($)</Label>
              <Input type="number" min={0} value={project.total_budget} onChange={(e) => setProject({ ...project, total_budget: Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea value={project.description} onChange={(e) => setProject({ ...project, description: e.target.value })} placeholder="Brief project description..." maxLength={500} rows={3} />
            </div>
          </div>
        </section>

        {/* Team Members */}
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">Team Members</h2>

          {existingMembers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Existing Members ({existingMembers.length})</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {existingMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-primary">
                        {m.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{m.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add New Members</p>
              <Button variant="outline" size="sm" onClick={() => setNewMembers([...newMembers, { ...emptyMember }])} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Member
              </Button>
            </div>
            {newMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No new members added. You can assign existing members to tasks below.</p>
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
                    <Select value={t.assigned_member} onValueChange={(v) => updateTask(i, "assigned_member", v)}>
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned">Unassigned</SelectItem>
                        {existingMembers.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.full_name}
                          </SelectItem>
                        ))}
                        {newMembers.map((m, mi) => (
                          m.full_name.trim() && (
                            <SelectItem key={`new-${mi}`} value={`new-${mi}`}>
                              {m.full_name} (new)
                            </SelectItem>
                          )
                        ))}
                      </SelectContent>
                    </Select>
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
