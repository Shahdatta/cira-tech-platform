import { AppLayout } from "@/components/layout/AppLayout";
import { Users, UserCheck, Clock, DollarSign } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { EmployeeDetailsSheet } from "@/components/hr/EmployeeDetailsSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const createEmployeeSchema = z.object({
  full_name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  hourly_rate: z.coerce.number().min(1, "Hourly rate must be greater than 0"),
  contract_type: z.enum(["ft", "pt", "fl"]),
  is_active: z.boolean(),
});

type EmployeeFormValues = z.infer<typeof createEmployeeSchema>;

const contractLabels: Record<string, string> = { ft: "Full-Time", pt: "Part-Time", fl: "Freelancer" };
const contractColors: Record<string, string> = {
  ft: "bg-primary/10 text-primary",
  pt: "bg-info/10 text-info",
  fl: "bg-warning/10 text-warning",
};

const roleLabels: Record<string, string> = { Admin: "Admin", PM: "PM", HR: "HR", Member: "Member", Guest: "Guest" };
const roleColors: Record<string, string> = {
  Admin: "bg-red-500/10 text-red-500",
  PM: "bg-blue-500/10 text-blue-500",
  HR: "bg-purple-500/10 text-purple-500",
  Member: "bg-emerald-500/10 text-emerald-500",
  Guest: "bg-gray-500/10 text-gray-400",
};

const HRHub = () => {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { full_name: "", email: "", hourly_rate: 0, contract_type: "ft", is_active: true },
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles_hr"],
    queryFn: () => api.get<any[]>("/profiles"),
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ["payrolls_hr"],
    queryFn: () => api.get<any[]>("/payrolls"),
  });

  const active = profiles.filter((p) => p.is_active).length;
  const totalPayroll = payrolls.reduce((s, p) => s + (p.total_amount ?? 0), 0);

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_hr"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"], exact: false }); // To refresh team member count
      toast.success("Employee added successfully");
      setIsAddModalOpen(false);
      form.reset();
    }
  });

  const onSubmit = (data: EmployeeFormValues) => {
    createMut.mutate(data);
  };

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <AppLayout title="HR Hub" subtitle="Employee management & payroll overview">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Employees" value={isLoading ? "—" : String(profiles.length)} icon={Users} delay={0} />
          <StatsCard title="Active" value={isLoading ? "—" : String(active)} icon={UserCheck} delay={50} />
          <StatsCard title="On Leave" value={isLoading ? "—" : String(profiles.length - active)} icon={Clock} delay={100} />
          <StatsCard title="Payroll Total" value={isLoading ? "—" : `$${totalPayroll.toLocaleString()}`} icon={DollarSign} delay={150} />
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Employee Directory</h3>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Employee</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField control={form.control} name="full_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input placeholder="john@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="hourly_rate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate ($)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="contract_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select contract" /></SelectTrigger>
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
                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={createMut.isPending} className="gap-2">
                        {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Employee"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No employees yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-3">Employee</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-3">Role</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-3">Contract</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground pb-3">Rate</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((e, i) => (
                    <tr key={e.id} onClick={() => setSelectedEmployee(e)} className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer animate-fade-in opacity-0" style={{ animationDelay: `${200 + i * 50}ms` }}>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-primary">{getInitials(e.full_name)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{e.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">{e.email}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", roleColors[e.role ?? "Member"] ?? roleColors.Member)}>{roleLabels[e.role ?? "Member"] ?? e.role}</span></td>
                      <td><span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", contractColors[e.contract_type ?? "ft"])}>{contractLabels[e.contract_type ?? "ft"]}</span></td>
                      <td className="text-right text-sm font-mono text-foreground">${e.hourly_rate ?? 0}/hr</td>
                      <td className="text-center">
                        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", e.is_active ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{e.is_active ? "Active" : "Inactive"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <EmployeeDetailsSheet employee={selectedEmployee} open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)} />
    </AppLayout>
  );
};

export default HRHub;
