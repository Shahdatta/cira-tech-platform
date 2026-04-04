import { AppLayout } from "@/components/layout/AppLayout";
import { Users, UserCheck, Clock, DollarSign, Briefcase, Star, TrendingUp, CheckCircle2, AlertCircle, Loader2, Plus, ChevronDown, FileText, Landmark, Banknote, Download } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { cn } from "@/lib/utils";
import { exportToCSV, exportToPDF, exportToJSON, type ExportColumn } from "@/lib/export-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EmployeeDetailsSheet } from "@/components/hr/EmployeeDetailsSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

// ── schemas ──────────────────────────────────────────────────────────────────
const createEmployeeSchema = z.object({
  full_name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  role: z.enum(["Admin", "PM", "HR", "Member", "Guest"]),
  hourly_rate: z.coerce.number().min(0, "Hourly rate must be 0 or more"),
  base_salary: z.coerce.number().min(0).optional(),
  contract_type: z.enum(["ft", "pt", "fl"]),
  is_active: z.boolean(),
});
type EmployeeFormValues = z.infer<typeof createEmployeeSchema>;

const generatePayrollSchema = z.object({
  user_id: z.string().min(1, "Select an employee"),
  period_start: z.string().min(1, "Required"),
  period_end: z.string().min(1, "Required"),
  total_hours: z.coerce.number().min(0),
  overtime_hours: z.coerce.number().min(0),
  deductions: z.coerce.number().min(0),
  notes: z.string().optional(),
  payment_method: z.string().default("BankTransfer"),
});
type GeneratePayrollValues = z.infer<typeof generatePayrollSchema>;

// ── helpers ───────────────────────────────────────────────────────────────────
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
const statusColors: Record<string, string> = {
  Draft:    "bg-muted text-muted-foreground",
  Approved: "bg-info/10 text-info",
  Paid:     "bg-success/10 text-success",
};

const payMethodColors: Record<string, string> = {
  BankTransfer: "bg-blue-500/10 text-blue-500",
  Cash: "bg-amber-500/10 text-amber-500",
};
const payMethodLabels: Record<string, string> = {
  BankTransfer: "Bank Transfer",
  Cash: "Cash",
};

function perfBadge(score: number) {
  if (score >= 90) return <span className="text-[11px] font-semibold text-success">{score} ★</span>;
  if (score >= 75) return <span className="text-[11px] font-semibold text-info">{score} ★</span>;
  if (score > 0)   return <span className="text-[11px] font-semibold text-warning">{score} ★</span>;
  return <span className="text-[11px] text-muted-foreground">—</span>;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function calBonusLabel(pct: number) {
  if (pct >= 90) return "+10% bonus";
  if (pct >= 75) return "+5% bonus";
  return "No bonus";
}

// ── Component ─────────────────────────────────────────────────────────────────
const payrollExportCols: ExportColumn[] = [
  { key: "employee_name", label: "Employee" },
  { key: "contract_type", label: "Type", format: (r) => contractLabels[r.contract_type ?? "ft"] },
  { key: "period_start", label: "Period Start" },
  { key: "period_end", label: "Period End" },
  { key: "total_hours", label: "Hours" },
  { key: "overtime_hours", label: "OT Hours" },
  { key: "base_salary", label: "Base/Rate", format: (r) => r.contract_type === "ft" ? r.base_salary : r.hourly_rate },
  { key: "overtime_pay", label: "OT Pay" },
  { key: "performance_bonus", label: "Perf Bonus" },
  { key: "deductions", label: "Deductions" },
  { key: "net_amount", label: "Net Pay" },
  { key: "payment_method", label: "Payment", format: (r) => payMethodLabels[r.payment_method ?? "BankTransfer"] ?? "Bank Transfer" },
  { key: "status", label: "Status" },
];

const employeeExportCols: ExportColumn[] = [
  { key: "full_name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "contract_type", label: "Contract", format: (r) => contractLabels[r.contract_type ?? "ft"] },
  { key: "hourly_rate", label: "Hourly Rate" },
  { key: "base_salary", label: "Base Salary" },
  { key: "payment_method", label: "Payment", format: (r) => payMethodLabels[r.payment_method ?? "BankTransfer"] ?? "Bank Transfer" },
  { key: "is_active", label: "Status", format: (r) => r.is_active ? "Active" : "Inactive" },
];

const HRHub = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [payrollTab, setPayrollTab] = useState<"all" | "ft" | "pt" | "fl">("all");

  const empForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { full_name: "", email: "", password: "", phone: "", role: "Member", hourly_rate: 0, base_salary: 0, contract_type: "ft", is_active: true },
  });

  const payForm = useForm<GeneratePayrollValues>({
    resolver: zodResolver(generatePayrollSchema),
    defaultValues: {
      user_id: "",
      period_start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"),
      period_end: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd"),
      total_hours: 0,
      overtime_hours: 0,
      deductions: 0,
      notes: "",
      payment_method: "BankTransfer",
    },
  });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["profiles_hr"],
    queryFn: () => api.get<any[]>("/profiles"),
  });

  const { data: payrolls = [], isLoading: loadingPayrolls } = useQuery({
    queryKey: ["payrolls_hr"],
    queryFn: () => api.get<any[]>("/payrolls"),
  });

  const { data: summary } = useQuery({
    queryKey: ["payroll_summary"],
    queryFn: () => api.get<any>("/payrolls/summary"),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createEmpMut = useMutation({
    mutationFn: (data: any) => api.post("/profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_hr"] });
      toast.success("Employee added successfully");
      setIsAddModalOpen(false);
      empForm.reset();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create employee"),
  });

  const generateMut = useMutation({
    mutationFn: (data: any) => api.post("/payrolls", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls_hr"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_summary"] });
      toast.success("Payroll generated successfully");
      setIsGenerateOpen(false);
      payForm.reset();
    },
    onError: (e: any) => toast.error(e.message || "Failed to generate payroll"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/payrolls/${id}/status`, { status }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["payrolls_hr"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_summary"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (vars.status === "Approved") {
        toast.success("Payroll approved — invoice sent for payment.");
      } else {
        toast.success("Status updated");
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to update status"),
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const active       = profiles.filter((p) => p.is_active).length;
  const onLeave      = profiles.length - active;
  const filteredPayrolls = payrolls.filter((p) => payrollTab === "all" || p.contract_type === payrollTab);

  const selectedEmployee4pay = payForm.watch("user_id");
  const periodStart4preview   = payForm.watch("period_start");
  const periodEnd4preview     = payForm.watch("period_end");
  const selectedProfile = profiles.find((p) => p.user_id === selectedEmployee4pay || p.id === selectedEmployee4pay);
  const contractType4pay = selectedProfile?.contract_type ?? "ft";

  // Auto-fetch hours from time logs when employee + period are chosen
  const { data: payPreview, isLoading: loadingPreview } = useQuery({
    queryKey: ["payroll_preview", selectedEmployee4pay, periodStart4preview, periodEnd4preview],
    enabled: !!selectedEmployee4pay && !!periodStart4preview && !!periodEnd4preview && isGenerateOpen,
    queryFn: () =>
      api.get<any>(`/payrolls/preview?userId=${selectedEmployee4pay}&periodStart=${periodStart4preview}&periodEnd=${periodEnd4preview}`),
  });

  // Auto-populate total_hours and overtime_hours from the preview
  useEffect(() => {
    if (payPreview) {
      payForm.setValue("total_hours", payPreview.total_hours ?? 0);
      payForm.setValue("overtime_hours", payPreview.overtime_hours ?? 0);
    }
  }, [payPreview]);

  return (
    <AppLayout title="HR Hub" subtitle="Employee management & payroll overview">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ── Top Stats ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Employees" value={loadingProfiles ? "—" : String(profiles.length)} icon={Users} delay={0} />
          <StatsCard title="Active" value={loadingProfiles ? "—" : String(active)} icon={UserCheck} delay={50} />
          <StatsCard title="On Leave" value={loadingProfiles ? "—" : String(onLeave)} icon={Clock} delay={100} />
          <StatsCard
            title="Total Payroll (Net)"
            value={summary ? `$${Number(summary.grand_total ?? summary.grandTotal ?? 0).toLocaleString()}` : "—"}
            icon={DollarSign}
            delay={150}
          />
        </div>

        {/* ── Payroll by Contract Type ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: "ft", label: "Full-Time", icon: Briefcase, total: summary?.ft_total ?? summary?.ftTotal ?? 0, count: summary?.ft_count ?? summary?.ftCount ?? 0, color: "text-primary" },
            { key: "pt", label: "Part-Time", icon: Clock,     total: summary?.pt_total ?? summary?.ptTotal ?? 0, count: summary?.pt_count ?? summary?.ptCount ?? 0, color: "text-info" },
            { key: "fl", label: "Freelancer", icon: Star,     total: summary?.fl_total ?? summary?.flTotal ?? 0, count: summary?.fl_count ?? summary?.flCount ?? 0, color: "text-warning" },
          ].map(({ key, label, icon: Icon, total, count, color }) => (
            <div key={key} className="glass-card p-5 flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-secondary/60", color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-foreground font-mono">${Number(total).toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">{count} payroll record{count !== 1 ? "s" : ""}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Payroll Management ────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Payroll Records</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Salary calculations per contract type with performance bonuses
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Tab filter */}
              <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
                {(["all", "ft", "pt", "fl"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPayrollTab(t)}
                    className={cn(
                      "px-3 py-1.5 transition-colors",
                      payrollTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60"
                    )}
                  >
                    {t === "all" ? "All" : contractLabels[t]}
                  </button>
                ))}
              </div>

              {/* Generate Payroll */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5"><Download className="h-4 w-4" /> Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportToCSV(filteredPayrolls, payrollExportCols, "payroll-records")}>
                    <FileText className="h-4 w-4 mr-2" /> Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportToPDF(filteredPayrolls, payrollExportCols, "Payroll Records")}>
                    <FileText className="h-4 w-4 mr-2" /> Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportToJSON(filteredPayrolls, "payroll-records")}>
                    <FileText className="h-4 w-4 mr-2" /> Export JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Generate Payroll</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Generate Payroll</DialogTitle>
                  </DialogHeader>
                  <Form {...payForm}>
                    <form onSubmit={payForm.handleSubmit((d) => generateMut.mutate(d))} className="space-y-4 pt-2 overflow-y-auto pr-1 flex-1">
                      <FormField control={payForm.control} name="user_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {profiles.map((p) => (
                                <SelectItem key={p.user_id ?? p.id} value={p.user_id ?? p.id}>
                                  {p.full_name} — {contractLabels[p.contract_type ?? "ft"]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {selectedProfile && (
                        <div className="rounded-lg bg-secondary/30 border border-border/50 px-4 py-3 text-xs space-y-1">
                          <p className="font-semibold text-foreground">Calculation method for {contractLabels[contractType4pay]}:</p>
                          {contractType4pay === "ft" && (
                            <p className="text-muted-foreground">Base salary (${selectedProfile.base_salary ?? 0}/mo) + Overtime (hours × ${selectedProfile.hourly_rate}/hr × 1.5) + Performance bonus</p>
                          )}
                          {(contractType4pay === "pt" || contractType4pay === "fl") && (
                            <p className="text-muted-foreground">Total hours × ${selectedProfile.hourly_rate}/hr + Performance bonus</p>
                          )}
                          <p className="text-muted-foreground">Performance bonus tiers: ≥90 → +10% | ≥75 → +5% | below → 0%</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={payForm.control} name="period_start" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Period Start</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={payForm.control} name="period_end" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Period End</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* ── Hours auto-fill from time logs ── */}
                      {selectedEmployee4pay && periodStart4preview && periodEnd4preview && (
                        <div className="rounded-lg border border-border/50 bg-secondary/20 px-4 py-3 text-xs space-y-2">
                          {loadingPreview ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Calculating hours from time logs…
                            </div>
                          ) : payPreview ? (
                            <>
                              <p className="font-semibold text-foreground">⏱ Hours from time logs ({payPreview.logs_count} entries)</p>
                              <div className="grid grid-cols-2 gap-x-4 text-muted-foreground">
                                <span>Total hours logged:</span>
                                <span className="font-semibold text-foreground">{payPreview.total_hours} hrs</span>
                                {contractType4pay === "ft" && (
                                  <>
                                    <span>Overtime (above 160 h):</span>
                                    <span className="font-semibold text-foreground">{payPreview.overtime_hours} hrs</span>
                                  </>
                                )}
                                <span>Estimated pay:</span>
                                <span className="font-semibold text-success">${payPreview.estimated_pay.toLocaleString()}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">Fields below are pre-filled. Adjust only if needed.</p>
                            </>
                          ) : null}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={payForm.control} name="total_hours" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Hours</FormLabel>
                            <FormControl><Input type="number" step="0.5" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        {contractType4pay === "ft" && (
                          <FormField control={payForm.control} name="overtime_hours" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Overtime Hours</FormLabel>
                              <FormControl><Input type="number" step="0.5" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}
                        <FormField control={payForm.control} name="deductions" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deductions ($)</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={payForm.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (optional)</FormLabel>
                          <FormControl><Input placeholder="e.g. Monthly payroll April 2026" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={payForm.control} name="payment_method" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="BankTransfer">🏦 Bank Transfer</SelectItem>
                              <SelectItem value="Cash">💵 Cash</SelectItem>
                            </SelectContent>
                          </Select>
                          {selectedProfile && field.value === "BankTransfer" && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {selectedProfile.bank_name
                                ? `Bank: ${selectedProfile.bank_name} · Acct: ****${(selectedProfile.account_number ?? "").slice(-4)}`
                                : "⚠ Employee has not added bank details yet"}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={generateMut.isPending} className="gap-2">
                          {generateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {loadingPayrolls ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filteredPayrolls.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No payroll records.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Employee", "Period", "Hours", "Earnings", "Bonus / Deductions", "Net Pay", "Payment", "Status / Actions"].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground pb-3 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayrolls.map((row: any, i: number) => {
                    const perfScore = row.performance_score ?? 0;
                    return (
                      <tr key={row.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors animate-fade-in opacity-0" style={{ animationDelay: `${i * 40}ms` }}>
                        {/* Employee + Type */}
                        <td className="py-3 pr-3">
                          <p className="font-medium whitespace-nowrap">{row.employee_name}</p>
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", contractColors[row.contract_type ?? "ft"])}>
                            {contractLabels[row.contract_type ?? "ft"]}
                          </span>
                        </td>
                        {/* Period */}
                        <td className="pr-3 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(row.period_start), "MMM d")} –<br />{format(new Date(row.period_end), "MMM d, yyyy")}
                        </td>
                        {/* Hours */}
                        <td className="pr-3 font-mono">
                          <p>{row.total_hours}h</p>
                          {row.contract_type === "ft" && row.overtime_hours > 0 && (
                            <p className="text-[11px] text-warning">+{row.overtime_hours}h OT</p>
                          )}
                        </td>
                        {/* Earnings (base + OT) */}
                        <td className="pr-3 font-mono whitespace-nowrap">
                          <p>
                            {row.contract_type === "ft"
                              ? `$${Number(row.base_salary).toLocaleString()}`
                              : `$${row.hourly_rate}/hr`}
                          </p>
                          {row.contract_type === "ft" && row.overtime_pay > 0 && (
                            <p className="text-[11px] text-warning">+${Number(row.overtime_pay).toFixed(0)} OT</p>
                          )}
                        </td>
                        {/* Perf Bonus / Deductions */}
                        <td className="pr-3 font-mono">
                          {row.performance_bonus > 0 && (
                            <p className="text-success text-[11px]">+${Number(row.performance_bonus).toFixed(0)} ({perfBadge(perfScore)})</p>
                          )}
                          {row.deductions > 0 && (
                            <p className="text-destructive text-[11px]">-${Number(row.deductions).toFixed(0)}</p>
                          )}
                          {!row.performance_bonus && !row.deductions && (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                        {/* Net Pay */}
                        <td className="pr-3 font-mono font-bold whitespace-nowrap">
                          ${Number(row.net_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {/* Payment Method */}
                        <td className="pr-3">
                          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", payMethodColors[row.payment_method ?? "BankTransfer"] ?? payMethodColors.BankTransfer)}>
                            {row.payment_method === "Cash" ? "💵 Cash" : "🏦 Bank"}
                          </span>
                        </td>
                        {/* Status + Actions */}
                        <td className="pr-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", statusColors[row.status ?? "Draft"])}>
                            {row.status}
                          </span>
                          {row.status === "Draft" && (
                            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1" disabled={statusMut.isPending}
                              onClick={() => statusMut.mutate({ id: row.id, status: "Approved" })}>
                              <CheckCircle2 className="h-3 w-3" /> Approve
                            </Button>
                          )}
                          {row.status === "Approved" && (
                            <span className="text-[11px] text-info font-medium italic">Invoice sent</span>
                          )}
                          {row.status === "Paid" && (
                            <span className="text-[11px] text-success font-semibold">✓</span>
                          )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border/30 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span><TrendingUp className="inline h-3.5 w-3.5 mr-1 text-success" />Score ≥ 90 → +10% performance bonus</span>
            <span><TrendingUp className="inline h-3.5 w-3.5 mr-1 text-info" />Score 75–89 → +5% performance bonus</span>
            <span><AlertCircle className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />Score &lt; 75 → no bonus</span>
            <span className="text-primary font-semibold">FT: Base + 1.5× OT</span>
            <span className="text-info font-semibold">PT: Hours × Rate</span>
            <span className="text-warning font-semibold">FL: Hours × Rate</span>
          </div>
        </div>

        {/* ── Employee Directory ────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Employee Directory</h3>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5"><Download className="h-4 w-4" /> Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportToCSV(profiles, employeeExportCols, "employee-directory")}>
                    <FileText className="h-4 w-4 mr-2" /> Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportToPDF(profiles, employeeExportCols, "Employee Directory")}>
                    <FileText className="h-4 w-4 mr-2" /> Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportToJSON(profiles, "employee-directory")}>
                    <FileText className="h-4 w-4 mr-2" /> Export JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Employee</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create User Account</DialogTitle>
                </DialogHeader>
                <Form {...empForm}>
                  <form onSubmit={empForm.handleSubmit((d) => createEmpMut.mutate(d))} className="space-y-4 pt-4">
                    <FormField control={empForm.control} name="full_name" render={({ field }) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={empForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={empForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="Min 6 characters" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={empForm.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone (Optional)</FormLabel><FormControl><Input placeholder="+1 555 000 0000" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={empForm.control} name="role" render={({ field }) => (
                      <FormItem><FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="PM">Project Manager</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="Member">Member</SelectItem>
                            <SelectItem value="Guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={empForm.control} name="contract_type" render={({ field }) => (
                      <FormItem><FormLabel>Contract Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="ft">Full-Time</SelectItem>
                            <SelectItem value="pt">Part-Time</SelectItem>
                            <SelectItem value="fl">Freelancer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={empForm.control} name="hourly_rate" render={({ field }) => (
                        <FormItem><FormLabel>Hourly Rate ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={empForm.control} name="base_salary" render={({ field }) => (
                        <FormItem><FormLabel>Base Salary (FT)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={createEmpMut.isPending} className="gap-2">
                        {createEmpMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {loadingProfiles ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No employees yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Employee", "Role", "Contract", "Rate / Salary", "Payment", "Status"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground pb-3 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((e: any, i: number) => (
                    <tr key={e.id} onClick={() => setSelectedEmployee(e)}
                      className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer animate-fade-in opacity-0"
                      style={{ animationDelay: `${200 + i * 50}ms` }}>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">{getInitials(e.full_name)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{e.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">{e.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="pr-3"><span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", roleColors[e.role ?? "Member"] ?? roleColors.Member)}>{roleLabels[e.role ?? "Member"] ?? e.role}</span></td>
                      <td className="pr-3"><span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", contractColors[e.contract_type ?? "ft"])}>{contractLabels[e.contract_type ?? "ft"]}</span></td>
                      <td className="pr-3 text-sm font-mono text-foreground">
                        {e.contract_type === "ft"
                          ? `$${Number(e.base_salary ?? 0).toLocaleString()}/mo`
                          : `$${e.hourly_rate ?? 0}/hr`}
                      </td>
                      <td className="pr-3">
                        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", payMethodColors[e.payment_method ?? "BankTransfer"] ?? payMethodColors.BankTransfer)}>
                          {payMethodLabels[e.payment_method ?? "BankTransfer"] ?? "Bank Transfer"}
                        </span>
                      </td>
                      <td>
                        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", e.is_active ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                          {e.is_active ? "Active" : "Inactive"}
                        </span>
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

