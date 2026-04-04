import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useMemo } from "react";
import { Plus, Trash2, Eye, FileText, DollarSign, Send, CheckCircle2, Download, Edit } from "lucide-react";
import { exportToCSV, exportToPDF, exportToJSON, type ExportColumn } from "@/lib/export-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";

//  Types (snake_case to match backend snake_case JSON) 

interface LineItemRow {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  issued_by_name: string;
  space_id: string | null;
  space_name: string | null;
  invoice_type: string;
  recipient_name: string | null;
  notes: string | null;
  payroll_ref_id: string | null;
  issue_date: string;
  due_date: string | null;
  sub_total: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  line_items: InvoiceLineItem[];
  created_at: string;
}

interface ProjectSpace {
  id: string;
  name: string;
}

//  Constants 

const INVOICE_TYPES = ["Payroll", "Tools", "Hardware", "Services"] as const;
const TABS = ["All", ...INVOICE_TYPES] as const;

const TYPE_COLORS: Record<string, string> = {
  Payroll:  "bg-violet-500/10 text-violet-500",
  Tools:    "bg-blue-500/10 text-blue-500",
  Hardware: "bg-orange-500/10 text-orange-500",
  Services: "bg-teal-500/10 text-teal-500",
};

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent:  "bg-info/10 text-info",
  Paid:  "bg-success/10 text-success",
};

const EMPTY_ROW = (): LineItemRow => ({
  description: "", quantity: 1, unit: "item", unit_price: 0,
});

function fmt(n: number) {
  return `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const invoiceExportCols: ExportColumn<Invoice>[] = [
  { key: "invoice_number", label: "Invoice #" },
  { key: "invoice_type", label: "Type" },
  { key: "recipient_name", label: "Recipient" },
  { key: "line_items", label: "Items", format: (r) => r.line_items?.length ?? 0 },
  { key: "sub_total", label: "Sub-Total", format: (r) => r.sub_total?.toFixed(2) ?? "0.00" },
  { key: "tax_amount", label: "Tax", format: (r) => r.tax_amount?.toFixed(2) ?? "0.00" },
  { key: "total_amount", label: "Total", format: (r) => r.total_amount?.toFixed(2) ?? "0.00" },
  { key: "due_date", label: "Due Date", format: (r) => r.due_date ? new Date(r.due_date).toLocaleDateString() : "—" },
  { key: "status", label: "Status" },
];

//  Component 

const Invoices = () => {
  const { user }    = useAuth();
  const { role }    = useRole();
  const qc          = useQueryClient();
  const canManage   = role === "admin" || role === "pm";

  const [activeTab,     setActiveTab]     = useState("All");
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editInvoice,   setEditInvoice]   = useState<Invoice | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  const [form, setForm] = useState({
    invoice_type:   "Services",
    recipient_name: "",
    space_id:       "",
    due_date:       "",
    tax_rate:       "0",
    notes:          "",
  });
  const [recipientMode, setRecipientMode] = useState<"employee" | "other">("employee");
  const [customRecipient, setCustomRecipient] = useState("");
  const [rows, setRows] = useState<LineItemRow[]>([EMPTY_ROW()]);

  //  Queries 
  const invoicesQ = useQuery({
    queryKey: ["invoices"],
    queryFn:  () => api.get<Invoice[]>("/invoices"),
  });

  const spacesQ = useQuery({
    queryKey: ["spaces_invoice"],
    queryFn:  () => api.get<ProjectSpace[]>("/projects"),
  });

  const profilesQ = useQuery({
    queryKey: ["profiles_invoice"],
    queryFn:  () => api.get<any[]>("/profiles"),
  });

  const invoices: Invoice[] = invoicesQ.data ?? [];
  const spaces: ProjectSpace[] = spacesQ.data ?? [];
  const profiles: any[] = profilesQ.data ?? [];

  const displayed = useMemo(() =>
    activeTab === "All"
      ? invoices
      : invoices.filter(i => i.invoice_type === activeTab),
    [invoices, activeTab]);

  const stats = useMemo(() => ({
    paid:  invoices.filter(i => i.status === "Paid").reduce((s, i) => s + (i.total_amount ?? 0), 0),
    sent:  invoices.filter(i => i.status === "Sent").reduce((s, i) => s + (i.total_amount ?? 0), 0),
    draft: invoices.filter(i => i.status === "Draft").reduce((s, i) => s + (i.total_amount ?? 0), 0),
  }), [invoices]);

  //  Line-item helpers 
  const rowTotal  = (r: LineItemRow) => r.quantity * r.unit_price;
  const subTotal  = rows.reduce((s, r) => s + rowTotal(r), 0);
  const taxAmt    = subTotal * (parseFloat(form.tax_rate) || 0) / 100;
  const totalCalc = subTotal + taxAmt;

  const updateRow = (idx: number, field: keyof LineItemRow, val: string | number) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));

  //  Mutations 
  const createMut = useMutation({
    mutationFn: (body: any) => api.post<Invoice>("/invoices", body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Invoice ${data.invoice_number} created`);
      resetCreate();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create invoice"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/invoices/${id}/status`, { status }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["payrolls_hr"] });
      qc.invalidateQueries({ queryKey: ["payroll_summary"] });
      if (detailInvoice) {
        const ns = nextStatus(detailInvoice.status);
        if (ns) setDetailInvoice(prev => prev ? { ...prev, status: ns } : null);
      }
      if (vars.status === "Paid" && detailInvoice?.payroll_ref_id) {
        toast.success("Invoice paid — payroll marked as Paid.");
      } else {
        toast.success("Status updated");
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update status"),
  });

  const editMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.put(`/invoices/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setEditInvoice(null);
      toast.success("Invoice updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update invoice"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setDetailInvoice(null);
      toast.success("Invoice deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete invoice"),
  });

  const openEdit = (inv: Invoice) => {
    setForm({
      invoice_type:   inv.invoice_type,
      recipient_name: inv.recipient_name ?? "",
      space_id:       inv.space_id ?? "",
      due_date:       inv.due_date ? inv.due_date.slice(0, 10) : "",
      tax_rate:       inv.sub_total > 0 ? String(Math.round((inv.tax_amount / inv.sub_total) * 100)) : "0",
      notes:          inv.notes ?? "",
    });
    const isEmployee = profiles.some((p: any) => p.full_name === inv.recipient_name);
    setRecipientMode(isEmployee ? "employee" : "other");
    setCustomRecipient(isEmployee ? "" : (inv.recipient_name ?? ""));
    setRows((inv.line_items ?? []).map(li => ({
      description: li.description,
      quantity:    li.quantity,
      unit:        li.unit,
      unit_price:  li.unit_price,
    })));
    setEditInvoice(inv);
  };

  const handleEdit = () => {
    if (!editInvoice) return;
    const recipientFinal = recipientMode === "other" ? customRecipient.trim() : form.recipient_name.trim();
    if (!recipientFinal)                       { toast.error("Recipient is required"); return; }
    if (rows.some(r => !r.description.trim())) { toast.error("Each line item needs a description"); return; }
    if (rows.some(r => r.unit_price <= 0))     { toast.error("All prices must be > 0"); return; }
    editMut.mutate({
      id: editInvoice.id,
      body: {
        user_id:        editInvoice.user_id,
        space_id:       form.space_id || null,
        invoice_type:   form.invoice_type,
        recipient_name: recipientFinal,
        notes:          form.notes.trim() || null,
        issue_date:     editInvoice.issue_date,
        due_date:       form.due_date ? new Date(form.due_date).toISOString() : null,
        tax_rate:       parseFloat(form.tax_rate) || 0,
        line_items:     rows.map(r => ({
          description: r.description,
          quantity:    r.quantity,
          unit:        r.unit,
          unit_price:  r.unit_price,
        })),
      },
    });
  };

  //  Helpers 
  const resetCreate = () => {
    setCreateOpen(false);
    setForm({ invoice_type: "Services", recipient_name: "", space_id: "", due_date: "", tax_rate: "0", notes: "" });
    setRecipientMode("employee");
    setCustomRecipient("");
    setRows([EMPTY_ROW()]);
  };

  const handleCreate = () => {
    const recipientFinal = recipientMode === "other"
      ? customRecipient.trim()
      : form.recipient_name.trim();
    if (!recipientFinal)                      { toast.error("Recipient is required"); return; }
    if (rows.some(r => !r.description.trim())){ toast.error("Each line item needs a description"); return; }
    if (rows.some(r => r.unit_price <= 0))    { toast.error("All prices must be > 0"); return; }

    createMut.mutate({
      user_id:        user!.id,
      space_id:       form.space_id || null,
      invoice_type:   form.invoice_type,
      recipient_name: recipientFinal,
      notes:          form.notes.trim() || null,
      issue_date:     new Date().toISOString(),
      due_date:       form.due_date ? new Date(form.due_date).toISOString() : null,
      tax_rate:       parseFloat(form.tax_rate) || 0,
      line_items:     rows.map(r => ({
        description: r.description,
        quantity:    r.quantity,
        unit:        r.unit,
        unit_price:  r.unit_price,
      })),
    });
  };

  const nextStatus = (s: string) =>
    s === "Draft" ? "Sent" : s === "Sent" ? "Paid" : null;
  const nextLabel  = (s: string) =>
    s === "Draft" ? "Send" : s === "Sent" ? "Mark Paid" : null;

  //  Render 
  return (
    <AppLayout title="Invoices" subtitle="Manage payroll, tools, hardware, and service invoices">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { label: "Paid", value: stats.paid, icon: CheckCircle2, color: "text-success" },
            { label: "Pending", value: stats.sent, icon: Send, color: "text-info" },
            { label: "Draft", value: stats.draft, icon: FileText, color: "text-muted-foreground" },
          ] as const).map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card p-5 flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-secondary/60", color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-foreground font-mono">{fmt(value)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Actions */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Invoice Records</h3>
              <p className="text-xs text-muted-foreground mt-0.5">All invoices across categories</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3 py-1.5 transition-colors",
                      activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60"
                    )}
                  >
                    {tab}
                    {tab !== "All" && (
                      <span className="ml-1 opacity-70">({invoices.filter(i => i.invoice_type === tab).length})</span>
                    )}
                  </button>
                ))}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5"><Download className="h-4 w-4" /> Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportToCSV(displayed, invoiceExportCols, "invoices")}>
                    <FileText className="h-4 w-4 mr-2" /> Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportToPDF(displayed, invoiceExportCols, "Invoice Records")}>
                    <FileText className="h-4 w-4 mr-2" /> Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportToJSON(displayed, "invoices")}>
                    <FileText className="h-4 w-4 mr-2" /> Export JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {canManage && (
                <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> New Invoice
                </Button>
              )}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Invoice #","Type","Recipient","Items","Sub-Total","Tax","Total","Due Date","Status","Actions"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground pb-3 pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoicesQ.isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/30">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="py-3 pr-3"><Skeleton className="h-4 w-20" /></td>
                      ))}
                    </tr>
                  ))
                : displayed.length === 0
                ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                      No invoices found
                    </td>
                  </tr>
                )
                : displayed.map((inv, i) => {
                  const ns = nextStatus(inv.status);
                  const nl = nextLabel(inv.status);
                  return (
                    <tr key={inv.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors animate-fade-in opacity-0" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="py-3 pr-3 font-mono font-medium">{inv.invoice_number}</td>
                      <td className="pr-3">
                        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", TYPE_COLORS[inv.invoice_type] ?? "")}>
                          {inv.invoice_type}
                        </span>
                      </td>
                      <td className="pr-3 text-sm">{inv.recipient_name ?? ""}</td>
                      <td className="pr-3 font-mono">{inv.line_items?.length ?? 0}</td>
                      <td className="pr-3 font-mono">{fmt(inv.sub_total)}</td>
                      <td className="pr-3 font-mono text-muted-foreground">{fmt(inv.tax_amount)}</td>
                      <td className="pr-3 font-mono font-bold">{fmt(inv.total_amount)}</td>
                      <td className="pr-3 text-xs text-muted-foreground whitespace-nowrap">
                        {inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : ""}
                      </td>
                      <td className="pr-3">
                        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", STATUS_COLORS[inv.status] ?? "")}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="pr-1">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2" onClick={() => setDetailInvoice(inv)} title="View">
                            <Eye className="h-3 w-3" />
                          </Button>
                          {canManage && ns && (ns !== "Paid" || role === "admin") && (
                            <Button variant="outline" size="sm" className="h-6 text-[11px] px-2"
                              onClick={() => statusMut.mutate({ id: inv.id, status: ns })}
                              disabled={statusMut.isPending}>
                              {nl}
                            </Button>
                          )}
                          {role === "admin" && inv.status === "Draft" && (
                            <Button variant="ghost" size="sm"
                              className="h-6 text-[11px] px-2"
                              onClick={(e) => { e.stopPropagation(); openEdit(inv); }}
                              title="Edit">
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {role === "admin" && inv.status === "Draft" && (
                            <Button variant="ghost" size="sm"
                              className="h-6 text-[11px] px-2 text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${inv.invoice_number}?`)) deleteMut.mutate(inv.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/*  Create Dialog  */}
      <Dialog open={createOpen} onOpenChange={v => { if (!v) resetCreate(); else setCreateOpen(true); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <Label>Invoice Number</Label>
              <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
                Auto-generated on save
              </div>
            </div>

            <div className="space-y-1">
              <Label>Invoice Type *</Label>
              <Select value={form.invoice_type} onValueChange={v => setForm(f => ({ ...f, invoice_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVOICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Recipient *</Label>
              <Select
                value={recipientMode === "other" ? "__other__" : (form.recipient_name || "__other__")}
                onValueChange={v => {
                  if (v === "__other__") {
                    setRecipientMode("other");
                    setForm(f => ({ ...f, recipient_name: "" }));
                  } else {
                    setRecipientMode("employee");
                    setForm(f => ({ ...f, recipient_name: v }));
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select an employee or type manually" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p: any) => (
                    <SelectItem key={p.id} value={p.full_name}>{p.full_name}</SelectItem>
                  ))}
                  <SelectItem value="__other__">Other (type manually)…</SelectItem>
                </SelectContent>
              </Select>
              {recipientMode === "other" && (
                <Input
                  className="mt-1.5"
                  placeholder="Company or recipient name"
                  value={customRecipient}
                  onChange={e => setCustomRecipient(e.target.value)}
                  autoFocus
                />
              )}
            </div>

            <div className="space-y-1">
              <Label>Project Space (optional)</Label>
              <Select
                value={form.space_id || "none"}
                onValueChange={v => setForm(f => ({ ...f, space_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder=" None " /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"> None </SelectItem>
                  {spaces.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Tax Rate (%)</Label>
              <Input type="number" min="0" max="100" step="0.5"
                value={form.tax_rate}
                onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Additional information..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {/* Line Items */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Line Items</Label>
              <Button variant="outline" size="sm"
                onClick={() => setRows(prev => [...prev, EMPTY_ROW()])}>
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>

            <div className="rounded border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Description","Qty","Unit","Unit Price","Total",""].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">
                        <Input className="h-8" placeholder="Description"
                          value={r.description}
                          onChange={e => updateRow(idx, "description", e.target.value)} />
                      </td>
                      <td className="px-2 py-1 w-20">
                        <Input className="h-8" type="number" min="0.01" step="any"
                          value={r.quantity}
                          onChange={e => updateRow(idx, "quantity", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="px-2 py-1 w-24">
                        <Input className="h-8" placeholder="item"
                          value={r.unit}
                          onChange={e => updateRow(idx, "unit", e.target.value)} />
                      </td>
                      <td className="px-2 py-1 w-28">
                        <Input className="h-8" type="number" min="0" step="any"
                          value={r.unit_price}
                          onChange={e => updateRow(idx, "unit_price", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="px-2 py-1 w-28 font-medium text-right">{fmt(rowTotal(r))}</td>
                      <td className="px-2 py-1 w-10">
                        {rows.length > 1 && (
                          <Button variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr className="border-t">
                    <td colSpan={4} className="px-3 py-2 text-right text-muted-foreground">Sub-Total</td>
                    <td className="px-3 py-2 font-medium">{fmt(subTotal)}</td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-muted-foreground">Tax ({form.tax_rate}%)</td>
                    <td className="px-3 py-2 font-medium">{fmt(taxAmt)}</td>
                    <td />
                  </tr>
                  <tr className="font-semibold text-base">
                    <td colSpan={4} className="px-3 py-2 text-right">Total</td>
                    <td className="px-3 py-2">{fmt(totalCalc)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={resetCreate}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/*  Edit Dialog (Admin, Draft only)  */}
      <Dialog open={!!editInvoice} onOpenChange={v => { if (!v) { setEditInvoice(null); resetCreate(); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice — {editInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <Label>Invoice Type *</Label>
              <Select value={form.invoice_type} onValueChange={v => setForm(f => ({ ...f, invoice_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVOICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Recipient *</Label>
              <Select
                value={recipientMode === "other" ? "__other__" : (form.recipient_name || "__other__")}
                onValueChange={v => {
                  if (v === "__other__") { setRecipientMode("other"); setForm(f => ({ ...f, recipient_name: "" })); }
                  else { setRecipientMode("employee"); setForm(f => ({ ...f, recipient_name: v })); }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select an employee or type manually" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p: any) => <SelectItem key={p.id} value={p.full_name}>{p.full_name}</SelectItem>)}
                  <SelectItem value="__other__">Other (type manually)…</SelectItem>
                </SelectContent>
              </Select>
              {recipientMode === "other" && (
                <Input className="mt-1.5" placeholder="Company or recipient name"
                  value={customRecipient} onChange={e => setCustomRecipient(e.target.value)} />
              )}
            </div>

            <div className="space-y-1">
              <Label>Project Space (optional)</Label>
              <Select value={form.space_id || "none"} onValueChange={v => setForm(f => ({ ...f, space_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder=" None " /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"> None </SelectItem>
                  {spaces.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Tax Rate (%)</Label>
              <Input type="number" min="0" max="100" step="0.5"
                value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Additional information..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {/* Line Items */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Line Items</Label>
              <Button variant="outline" size="sm" onClick={() => setRows(prev => [...prev, EMPTY_ROW()])}>
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            <div className="rounded border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Description","Qty","Unit","Unit Price","Total",""].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1"><Input className="h-8" placeholder="Description" value={r.description} onChange={e => updateRow(idx, "description", e.target.value)} /></td>
                      <td className="px-2 py-1 w-20"><Input className="h-8" type="number" min="0.01" step="any" value={r.quantity} onChange={e => updateRow(idx, "quantity", parseFloat(e.target.value) || 0)} /></td>
                      <td className="px-2 py-1 w-24"><Input className="h-8" placeholder="item" value={r.unit} onChange={e => updateRow(idx, "unit", e.target.value)} /></td>
                      <td className="px-2 py-1 w-28"><Input className="h-8" type="number" min="0" step="any" value={r.unit_price} onChange={e => updateRow(idx, "unit_price", parseFloat(e.target.value) || 0)} /></td>
                      <td className="px-2 py-1 w-28 font-medium text-right">{fmt(rowTotal(r))}</td>
                      <td className="px-2 py-1 w-10">
                        {rows.length > 1 && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr className="border-t"><td colSpan={4} className="px-3 py-2 text-right text-muted-foreground">Sub-Total</td><td className="px-3 py-2 font-medium">{fmt(subTotal)}</td><td /></tr>
                  <tr><td colSpan={4} className="px-3 py-2 text-right text-muted-foreground">Tax ({form.tax_rate}%)</td><td className="px-3 py-2 font-medium">{fmt(taxAmt)}</td><td /></tr>
                  <tr className="font-semibold text-base"><td colSpan={4} className="px-3 py-2 text-right">Total</td><td className="px-3 py-2">{fmt(totalCalc)}</td><td /></tr>
                </tfoot>
              </table>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setEditInvoice(null); resetCreate(); }}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editMut.isPending}>
              {editMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Sheet open={!!detailInvoice} onOpenChange={v => { if (!v) setDetailInvoice(null); }}>
        {detailInvoice && (
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold">{detailInvoice.invoice_number}</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Type",      value: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[detailInvoice.invoice_type] ?? ""}`}>{detailInvoice.invoice_type}</span> },
                  { label: "Status",    value: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[detailInvoice.status] ?? ""}`}>{detailInvoice.status}</span> },
                  { label: "Recipient", value: detailInvoice.recipient_name ?? "" },
                  { label: "Project",   value: detailInvoice.space_name ?? "" },
                  { label: "Issued By", value: detailInvoice.issued_by_name },
                  { label: "Issued",    value: format(new Date(detailInvoice.issue_date), "MMM d, yyyy") },
                  { label: "Due Date",  value: detailInvoice.due_date ? format(new Date(detailInvoice.due_date), "MMM d, yyyy") : "" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {detailInvoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted/50 rounded p-3">{detailInvoice.notes}</p>
                </div>
              )}

              <div>
                <p className="font-semibold mb-2">Line Items</p>
                <table className="w-full text-sm border rounded overflow-hidden">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Description","Qty","Unit","Unit Price","Total"].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(detailInvoice.line_items ?? []).map(li => (
                      <tr key={li.id} className="border-t">
                        <td className="px-3 py-2">{li.description}</td>
                        <td className="px-3 py-2">{li.quantity}</td>
                        <td className="px-3 py-2 text-muted-foreground">{li.unit}</td>
                        <td className="px-3 py-2">{fmt(li.unit_price)}</td>
                        <td className="px-3 py-2 font-medium">{fmt(li.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30">
                    <tr className="border-t">
                      <td colSpan={4} className="px-3 py-2 text-right text-muted-foreground">Sub-Total</td>
                      <td className="px-3 py-2 font-medium">{fmt(detailInvoice.sub_total)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right text-muted-foreground">Tax</td>
                      <td className="px-3 py-2 font-medium">{fmt(detailInvoice.tax_amount)}</td>
                    </tr>
                    <tr className="font-bold text-base">
                      <td colSpan={4} className="px-3 py-2 text-right">Total</td>
                      <td className="px-3 py-2">{fmt(detailInvoice.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {canManage && (
                <div className="flex gap-2 pt-2">
                  {(nextStatus(detailInvoice.status) === "Sent" ||
                    (role === "admin" && nextStatus(detailInvoice.status) === "Paid")) && (
                    <Button variant="outline"
                      onClick={() => statusMut.mutate({ id: detailInvoice.id, status: nextStatus(detailInvoice.status)! })}
                      disabled={statusMut.isPending}>
                      {nextLabel(detailInvoice.status)}
                    </Button>
                  )}
                  {role === "admin" && detailInvoice.status === "Draft" && (
                    <Button variant="outline"
                      onClick={() => { setDetailInvoice(null); openEdit(detailInvoice); }}>
                      Edit Invoice
                    </Button>
                  )}
                  {role === "admin" && detailInvoice.status === "Draft" && (
                    <Button variant="destructive"
                      onClick={() => {
                        if (confirm(`Delete ${detailInvoice.invoice_number}?`)) deleteMut.mutate(detailInvoice.id);
                      }}>
                      Delete Invoice
                    </Button>
                  )}
                </div>
              )}
            </div>
          </SheetContent>
        )}
      </Sheet>
    </AppLayout>
  );
};

export default Invoices;
