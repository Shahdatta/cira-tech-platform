import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { User, Bell, Shield, Palette, Globe, Save, Eye, EyeOff, Loader2, Camera, Check, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "general", label: "General", icon: Globe },
];

const ROLE_COLORS: Record<string, string> = {
  Admin: "bg-red-500/15 text-red-400 border-red-500/30",
  PM: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  HR: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Member: "bg-green-500/15 text-green-400 border-green-500/30",
  Guest: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const AVATAR_COLORS = [
  "from-purple-500 to-blue-500", "from-pink-500 to-rose-500",
  "from-green-500 to-teal-500", "from-orange-500 to-amber-500",
  "from-indigo-500 to-purple-500",
];
function avatarGradient(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Profile Tab ────────────────────────────────────────────────────────
function ProfileTab({ me }: { me: any }) {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();
  const [form, setForm] = useState({
    full_name: me?.full_name ?? "",
    phone: me?.phone ?? "",
    bank_name: me?.bank_name ?? "",
    account_number: me?.account_number ?? "",
    iban: me?.iban ?? "",
    payment_method: me?.payment_method ?? "BankTransfer",
  });

  useEffect(() => {
    if (me) setForm({
      full_name: me.full_name ?? "",
      phone: me.phone ?? "",
      bank_name: me.bank_name ?? "",
      account_number: me.account_number ?? "",
      iban: me.iban ?? "",
      payment_method: me.payment_method ?? "BankTransfer",
    });
  }, [me]);

  const updateMut = useMutation({
    mutationFn: (data: any) => api.put("/auth/me", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      // Sync name change into AuthContext so navbar updates immediately
      if (variables.full_name) updateUser({ full_name: variables.full_name });
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const isDirty = form.full_name !== (me?.full_name ?? "") || form.phone !== (me?.phone ?? "")
    || form.bank_name !== (me?.bank_name ?? "") || form.account_number !== (me?.account_number ?? "")
    || form.iban !== (me?.iban ?? "") || form.payment_method !== (me?.payment_method ?? "BankTransfer");
  const grad = avatarGradient(form.full_name || "U");

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-0.5">Profile Information</h3>
        <p className="text-sm text-muted-foreground">Update your name and contact info visible to teammates</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className={cn("relative h-20 w-20 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg", grad)}>
          <span className="text-2xl font-bold text-white">{initials(form.full_name || "U")}</span>
          <button className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-primary border-2 border-background flex items-center justify-center hover:bg-primary/90 transition-colors">
            <Camera className="h-3 w-3 text-white" />
          </button>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{form.full_name || "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{me?.email}</p>
          <span className={cn("inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full border", ROLE_COLORS[me?.role] ?? ROLE_COLORS.Member)}>
            {me?.role ?? "Member"}
          </span>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Full Name</Label>
          <Input
            value={form.full_name}
            onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
            placeholder="Your full name"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Email <span className="text-xs text-muted-foreground">(read-only)</span></Label>
          <Input value={me?.email ?? ""} disabled className="opacity-60" />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            placeholder="+1 555 000 0000"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Role <span className="text-xs text-muted-foreground">(managed by Admin)</span></Label>
          <Input value={me?.role ?? "Member"} disabled className="opacity-60" />
        </div>
        <div className="space-y-1.5">
          <Label>Contract Type</Label>
          <Input value={me?.contract_type?.toUpperCase() ?? "FT"} disabled className="opacity-60" />
        </div>
        <div className="space-y-1.5">
          <Label>Hours / Week</Label>
          <Input value={me?.hours_per_week ?? 40} disabled className="opacity-60" />
        </div>
      </div>

      {/* Compensation (read-only for non-admin/HR) */}
      {(me?.role === "Admin" || me?.role === "HR") && (
        <div className="rounded-xl border border-border p-4 space-y-3 bg-secondary/20">
          <h4 className="text-sm font-semibold text-foreground">Compensation</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Hourly Rate</p>
              <p className="font-medium text-foreground">${me?.hourly_rate?.toFixed(2)}/hr</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Base Salary</p>
              <p className="font-medium text-foreground">${me?.base_salary?.toFixed(0)}/yr</p>
            </div>
          </div>
        </div>
      )}

      {/* Bank Information */}
      <div className="rounded-xl border border-border p-4 space-y-4 bg-secondary/20">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Bank Information</h4>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Your bank details for salary payments</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <select
              value={form.payment_method}
              onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="BankTransfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Bank Name</Label>
            <Input
              value={form.bank_name}
              onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))}
              placeholder="e.g. Chase, Citi"
              disabled={form.payment_method === "Cash"}
              className={form.payment_method === "Cash" ? "opacity-50" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Account Number</Label>
            <Input
              value={form.account_number}
              onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))}
              placeholder="Account number"
              disabled={form.payment_method === "Cash"}
              className={form.payment_method === "Cash" ? "opacity-50" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label>IBAN</Label>
            <Input
              value={form.iban}
              onChange={e => setForm(p => ({ ...p, iban: e.target.value }))}
              placeholder="e.g. SA0380000000608010167519"
              disabled={form.payment_method === "Cash"}
              className={form.payment_method === "Cash" ? "opacity-50" : ""}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => updateMut.mutate({
            full_name: form.full_name,
            phone: form.phone,
            bank_name: form.bank_name,
            account_number: form.account_number,
            iban: form.iban,
            payment_method: form.payment_method,
          })}
          disabled={updateMut.isPending || !isDirty || !form.full_name.trim()}
          className="gap-1.5"
        >
          {updateMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Changes
        </Button>
        {!isDirty && <span className="flex items-center gap-1 text-xs text-green-500"><Check className="h-3.5 w-3.5" /> Up to date</span>}
      </div>
    </div>
  );
}

// ── Security Tab ────────────────────────────────────────────────────────
function SecurityTab() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const changePwMut = useMutation({
    mutationFn: (d: any) => api.post("/auth/change-password", d),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setForm({ current: "", next: "", confirm: "" });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to change password"),
  });

  const handleSubmit = () => {
    if (!form.current) { toast.error("Enter your current password"); return; }
    if (form.next.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (form.next !== form.confirm) { toast.error("Passwords don't match"); return; }
    changePwMut.mutate({ current_password: form.current, new_password: form.next });
  };

  const strength = form.next.length === 0 ? 0 : form.next.length < 6 ? 1 : form.next.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Strong"];
  const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-green-500"];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-0.5">Change Password</h3>
        <p className="text-sm text-muted-foreground">Use a strong, unique password to secure your account</p>
      </div>
      <div className="max-w-md space-y-4">
        <div className="space-y-1.5">
          <Label>Current Password</Label>
          <div className="relative">
            <Input
              type={showCur ? "text" : "password"}
              value={form.current}
              onChange={e => setForm(p => ({ ...p, current: e.target.value }))}
              placeholder="Enter current password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCur(x => !x)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>New Password</Label>
          <div className="relative">
            <Input
              type={showNew ? "text" : "password"}
              value={form.next}
              onChange={e => setForm(p => ({ ...p, next: e.target.value }))}
              placeholder="At least 6 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew(x => !x)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.next.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", strengthColor[strength])} style={{ width: `${(strength / 3) * 100}%` }} />
              </div>
              <span className={cn("text-xs font-medium", strength === 1 ? "text-red-400" : strength === 2 ? "text-amber-400" : "text-green-400")}>
                {strengthLabel[strength]}
              </span>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Confirm New Password</Label>
          <Input
            type="password"
            value={form.confirm}
            onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
            placeholder="Repeat new password"
            className={cn(form.confirm && form.confirm !== form.next ? "border-red-500 focus-visible:ring-red-500/20" : "")}
          />
          {form.confirm && form.confirm !== form.next && (
            <p className="text-xs text-red-400 mt-0.5">Passwords don't match</p>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={changePwMut.isPending} className="mt-2 gap-1.5">
          {changePwMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Update Password
        </Button>
      </div>

      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-semibold text-foreground mb-3">Active Sessions</h4>
        <div className="rounded-xl border border-border p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Current session</p>
            <p className="text-xs text-muted-foreground mt-0.5">Browser · {window.location.hostname}</p>
          </div>
          <span className="text-xs font-medium text-green-500 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Active
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Notifications Tab ────────────────────────────────────────────────────
const NOTIF_ITEMS = [
  { key: "task_assigned", label: "Task assignments", desc: "When a task is assigned to you" },
  { key: "task_approved", label: "Task approvals", desc: "When your task is approved or rejected" },
  { key: "chat_mention", label: "Chat mentions", desc: "When someone @mentions you" },
  { key: "payroll_update", label: "Payroll updates", desc: "Payroll status changes" },
  { key: "weekly_report", label: "Weekly digest", desc: "Weekly summary of your activity" },
];

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    task_assigned: true, task_approved: true, chat_mention: true, payroll_update: true, weekly_report: false,
  });
  const toggle = (key: string) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-0.5">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground">Choose which events trigger notifications</p>
      </div>
      <div className="divide-y divide-border">
        {NOTIF_ITEMS.map(item => (
          <div key={item.key} className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <Switch checked={prefs[item.key]} onCheckedChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Appearance Tab ────────────────────────────────────────────────────
function AppearanceTab() {
  const [density, setDensity] = useState("comfortable");
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-0.5">Appearance</h3>
        <p className="text-sm text-muted-foreground">Customize how CIRA PM looks for you</p>
      </div>
      <div className="space-y-1.5">
        <Label>Theme</Label>
        <div className="flex gap-3 mt-2">
          {[
            { id: "dark", label: "Dark", bg: "bg-[#0f172a]" },
            { id: "dim", label: "Dim", bg: "bg-[#1e293b]" },
          ].map(t => (
            <button key={t.id} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors", "border-primary")}>
              <div className={cn("h-12 w-20 rounded-lg", t.bg, "border border-white/10")} />
              <span className="text-xs font-medium text-foreground">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Density</Label>
        <div className="flex gap-2 mt-2">
          {["compact", "comfortable", "spacious"].map(d => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize",
                density === d ? "bg-primary/15 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >{d}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Settings page ────────────────────────────────────────────────
const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<any>("/auth/me"),
    enabled: !!user,
  });

  return (
    <AppLayout title="Settings" subtitle="Manage your account preferences">
      <div className="max-w-[960px] mx-auto">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 shrink-0 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 glass-card p-6 min-h-[480px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-60">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {activeTab === "profile" && <ProfileTab me={me} />}
                {activeTab === "security" && <SecurityTab />}
                {activeTab === "notifications" && <NotificationsTab />}
                {activeTab === "appearance" && <AppearanceTab />}
                {activeTab === "general" && (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <Globe className="h-10 w-10 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">General Settings</h3>
                    <p className="text-sm text-muted-foreground">Timezone, language, and locale settings coming soon</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;

