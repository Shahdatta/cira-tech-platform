import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { Plus, Send, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const statusStyles: Record<string, string> = {
  paid: "bg-success/10 text-success",
  sent: "bg-info/10 text-info",
  draft: "bg-muted text-muted-foreground",
};

const Invoices = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ project_id: "", total_amount: 0, due_date: "", notes: "" });
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices_page"],
    queryFn: () => api.get<any[]>("/invoices"),
  });

  const { data: spaces = [] } = useQuery({
    queryKey: ["spaces_for_invoices"],
    queryFn: () => api.get<any[]>("/projects"),
  });

  const paid = invoices.filter((i) => i.status === "paid" || i.status === "Paid").reduce((s, i) => s + (i.total_amount ?? 0), 0);
  const pending = invoices.filter((i) => i.status === "sent" || i.status === "Sent").reduce((s, i) => s + (i.total_amount ?? 0), 0);
  const draft = invoices.filter((i) => i.status === "draft" || i.status === "Draft").reduce((s, i) => s + (i.total_amount ?? 0), 0);

  const createInvoiceMut = useMutation({
    mutationFn: (data: any) => api.post("/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices_page"] });
      toast.success("Invoice created successfully");
      setIsModalOpen(false);
      setNewInvoice({ project_id: "", total_amount: 0, due_date: "", notes: "" });
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const handleCreate = () => {
    if (!newInvoice.project_id) {
      toast.error("Please select a project space");
      return;
    }
    createInvoiceMut.mutate({
      project_id: newInvoice.project_id,
      invoice_number: `INV-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
      issue_date: new Date().toISOString(),
      due_date: newInvoice.due_date ? new Date(newInvoice.due_date).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
      total_amount: newInvoice.total_amount,
      currency: "USD",
      status: "draft",
      notes: newInvoice.notes || null,
    });
  };

  return (
    <AppLayout title="Invoices" subtitle="Manage client billing and payments">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 text-center">
            <p className="text-2xl font-bold text-success">{isLoading ? "—" : `$${paid.toLocaleString()}`}</p>
            <p className="text-xs text-muted-foreground mt-1">Paid</p>
          </div>
          <div className="glass-card p-5 text-center">
            <p className="text-2xl font-bold text-info">{isLoading ? "—" : `$${pending.toLocaleString()}`}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </div>
          <div className="glass-card p-5 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{isLoading ? "—" : `$${draft.toLocaleString()}`}</p>
            <p className="text-xs text-muted-foreground mt-1">Draft</p>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">All Invoices</h3>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Invoice</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Draft Invoice</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Project Space *</Label>
                    <Select value={newInvoice.project_id} onValueChange={(v) => setNewInvoice({ ...newInvoice, project_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select a space" /></SelectTrigger>
                      <SelectContent>
                        {spaces.map((s: any) => (
                           <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Amount ($)</Label>
                      <Input type="number" min={0} value={newInvoice.total_amount} onChange={(e) => setNewInvoice({ ...newInvoice, total_amount: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="date" value={newInvoice.due_date} onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={newInvoice.notes} onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })} rows={3} placeholder="Thank you for your business..." />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleCreate} disabled={createInvoiceMut.isPending} className="gap-2">
                      {createInvoiceMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Create Invoice
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-3">Invoice</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground pb-3">Amount</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-3">Date</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground pb-3">Status</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors animate-fade-in opacity-0" style={{ animationDelay: `${i * 50}ms` }}>
                      <td className="py-3 text-sm font-mono font-medium text-primary">{inv.invoice_number}</td>
                      <td className="text-right text-sm font-mono font-semibold text-foreground">${(inv.total_amount ?? 0).toLocaleString()}</td>
                      <td className="text-sm text-muted-foreground">{format(new Date(inv.issue_date), "MMM d, yyyy")}</td>
                      <td className="text-center">
                        <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize", statusStyles[inv.status?.toLowerCase() ?? "draft"])}>{inv.status}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button className="h-7 w-7 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><Send className="h-3.5 w-3.5" /></button>
                          <button className="h-7 w-7 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><Download className="h-3.5 w-3.5" /></button>
                          <button className="h-7 w-7 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Invoices;
