import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format } from "date-fns";
import { Mail, Briefcase, DollarSign, Activity, Edit, Trash, Loader2, Save, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useRole } from "@/contexts/RoleContext";

const editEmployeeSchema = z.object({
  id: z.string(),
  full_name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  hourly_rate: z.coerce.number().min(1, "Hourly rate must be greater than 0"),
  contract_type: z.enum(["ft", "pt", "fl"]),
  is_active: z.boolean(),
  user_id: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof editEmployeeSchema>;

interface EmployeeDetailsSheetProps {
  employee: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const contractLabels: Record<string, string> = { ft: "Full-Time", pt: "Part-Time", fl: "Freelancer" };
const contractColors: Record<string, string> = {
  ft: "bg-primary/10 text-primary",
  pt: "bg-info/10 text-info",
  fl: "bg-warning/10 text-warning",
};

const roleLabels: Record<string, string> = { Admin: "Admin", PM: "Project Manager", HR: "HR", Member: "Member", Guest: "Guest" };
const roleColors: Record<string, string> = {
  Admin: "bg-red-500/10 text-red-500",
  PM: "bg-blue-500/10 text-blue-500",
  HR: "bg-purple-500/10 text-purple-500",
  Member: "bg-emerald-500/10 text-emerald-500",
  Guest: "bg-gray-500/10 text-gray-400",
};

export const EmployeeDetailsSheet = ({ employee, open, onOpenChange }: EmployeeDetailsSheetProps) => {
  const queryClient = useQueryClient();
  const { role: currentUserRole } = useRole();
  const isAdmin = currentUserRole === "admin";
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("Member");

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(editEmployeeSchema),
  });

  useEffect(() => {
    if (employee) {
      form.reset(employee);
      setSelectedRole(employee.role ?? "Member");
    }
    if (!open) setIsEditing(false);
  }, [employee, open, form]);

  const { data: payrollLogs = [], isLoading } = useQuery({
    queryKey: ["employee_payrolls", employee?.user_id],
    enabled: !!employee,
    queryFn: () => api.get<any[]>(`/payrolls?userId=${employee?.user_id}`),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => api.put(`/profiles/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_hr"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"], exact: false });
      setIsEditing(false);
      toast.success("Employee updated successfully");
      onOpenChange(false);
    }
  });

  const changeRoleMut = useMutation({
    mutationFn: (data: { user_id: string; role: string }) =>
      api.put<any>("/auth/role", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_hr"] });
      toast.success("Role updated successfully");
    },
    onError: () => {
      toast.error("Failed to update role");
      if (employee) setSelectedRole(employee.role ?? "Member");
    }
  });

  const handleRoleChange = (newRole: string) => {
    if (!employee) return;
    setSelectedRole(newRole);
    changeRoleMut.mutate({ user_id: employee.user_id ?? employee.id, role: newRole });
  };

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_hr"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"], exact: false });
      toast.success("Employee deleted");
      onOpenChange(false);
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] border-l border-border bg-card overflow-y-auto">
        {employee && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => updateMut.mutate(d))}>
              <SheetHeader className="pb-6 border-b border-border/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-primary">
                      {employee.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="space-y-3 flex-1 ml-2">
                       <FormField control={form.control} name="full_name" render={({ field }) => (
                         <FormItem><FormControl><Input {...field} className="font-bold text-lg" /></FormControl><FormMessage /></FormItem>
                       )} />
                       <FormField control={form.control} name="email" render={({ field }) => (
                         <FormItem><FormControl><Input type="email" {...field} className="text-sm" /></FormControl><FormMessage /></FormItem>
                       )} />
                    </div>
                  ) : (
                    <div>
                      <SheetTitle className="text-2xl font-bold text-foreground">{employee.full_name}</SheetTitle>
                      <SheetDescription className="text-sm mt-1 text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {employee.email}
                      </SheetDescription>
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(employee.id)} className="text-destructive hover:text-destructive"><Trash className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-4">
                {isEditing ? (
                  <>
                    <FormField control={form.control} name="contract_type" render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ft">Full-Time</SelectItem>
                            <SelectItem value="pt">Part-Time</SelectItem>
                            <SelectItem value="fl">Freelancer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="is_active" render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={(v) => field.onChange(v === "active")} value={field.value ? "active" : "inactive"}>
                          <FormControl>
                            <SelectTrigger className="w-[100px] h-8 text-xs text-center"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                ) : (
                  <>
                    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5", contractColors[employee.contract_type ?? "ft"])}>
                      <Briefcase className="h-3.5 w-3.5" />
                      {contractLabels[employee.contract_type ?? "ft"]}
                    </span>
                    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5", employee.is_active ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                      <Activity className="h-3.5 w-3.5" />
                      {employee.is_active ? "Active" : "Inactive"}
                    </span>
                  </>
                )}
              </div>
            </SheetHeader>
            
            <div className="py-6 space-y-8">
              {/* Role Management Section — Admin Only */}
              {isAdmin && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Role Management
                  </h4>
                  <div className="glass-card p-4 rounded-xl border border-border/50 bg-secondary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">User Role</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Change this employee's access level</p>
                      </div>
                      <Select value={selectedRole} onValueChange={handleRoleChange} disabled={changeRoleMut.isPending}>
                        <SelectTrigger className="w-[150px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">🔴 Admin</SelectItem>
                          <SelectItem value="PM">🔵 Project Manager</SelectItem>
                          <SelectItem value="HR">🟣 HR</SelectItem>
                          <SelectItem value="Member">🟢 Member</SelectItem>
                          <SelectItem value="Guest">⚪ Guest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {changeRoleMut.isPending && (
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Updating role...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Role Badge (non-admin view) */}
              {!isAdmin && employee?.role && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Role
                  </h4>
                  <span className={cn("text-xs font-semibold px-3 py-1 rounded-full", roleColors[employee.role] ?? roleColors.Member)}>
                    {roleLabels[employee.role] ?? employee.role}
                  </span>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Financial Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-4 rounded-xl border border-border/50 bg-secondary/20">
                    <p className="text-xs text-muted-foreground mb-1">Hourly Rate</p>
                    {isEditing ? (
                       <FormField control={form.control} name="hourly_rate" render={({ field }) => (
                         <FormItem><FormControl><Input type="number" {...field} className="mt-2" /></FormControl><FormMessage /></FormItem>
                       )} />
                    ) : (
                      <p className="text-lg font-mono font-bold text-foreground flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {employee.hourly_rate ?? 0}/hr
                      </p>
                    )}
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-border/50 bg-secondary/20">
                    <p className="text-xs text-muted-foreground mb-1">Currency</p>
                    <p className="text-lg font-bold text-foreground">USD</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Payroll Logs</h4>
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : payrollLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-secondary/30 p-4 rounded-lg text-center border border-border/50">No payroll records found for this employee.</p>
                  ) : (
                    payrollLogs.map((log: any) => (
                      <div key={log.id} className="flex justify-between items-center p-3 rounded-lg border border-border/50 bg-secondary/20">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(log.period_start), "MMM d")} - {format(new Date(log.period_end), "MMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{log.total_hours} hrs total</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold font-mono text-foreground">${log.total_amount?.toLocaleString()}</p>
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wider", log.status === "paid" ? "text-success" : "text-warning")}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
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
