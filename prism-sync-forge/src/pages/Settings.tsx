import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { User, Bell, Shield, Palette, Globe, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "general", label: "General", icon: Globe },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <AppLayout title="Settings" subtitle="Manage your account preferences">
      <div className="max-w-[900px] mx-auto">
        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <div className="w-48 shrink-0 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left",
                  activeTab === tab.id ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 glass-card p-6">
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Profile Information</h3>
                  <p className="text-sm text-muted-foreground">Update your personal details</p>
                </div>
                <div className="flex items-center gap-4 pb-6 border-b border-border">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">AH</span>
                  </div>
                  <div>
                    <Button variant="outline" size="sm">Change Photo</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                    <input defaultValue="Admin User" className="w-full h-10 rounded-xl border border-border bg-secondary/30 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                    <input defaultValue="admin@ciratech.com" className="w-full h-10 rounded-xl border border-border bg-secondary/30 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Role</label>
                    <select className="w-full h-10 rounded-xl border border-border bg-secondary/30 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20">
                      <option>Admin</option>
                      <option>PM</option>
                      <option>HR</option>
                      <option>Member</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Timezone</label>
                    <select className="w-full h-10 rounded-xl border border-border bg-secondary/30 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20">
                      <option>UTC+3 (Arabia Standard)</option>
                      <option>UTC+0 (GMT)</option>
                      <option>UTC-5 (EST)</option>
                    </select>
                  </div>
                </div>
                <Button className="gap-1.5"><Save className="h-3.5 w-3.5" /> Save Changes</Button>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Notification Preferences</h3>
                  <p className="text-sm text-muted-foreground">Choose what you want to be notified about</p>
                </div>
                {["Email notifications", "Push notifications", "Task assignments", "Chat mentions", "Payroll updates", "Weekly reports"].map((item) => (
                  <div key={item} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <span className="text-sm text-foreground">{item}</span>
                    <button className="h-6 w-11 rounded-full bg-primary relative transition-colors">
                      <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-primary-foreground shadow-sm transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab !== "profile" && activeTab !== "notifications" && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                  {(() => { const Tab = tabs.find(t => t.id === activeTab)?.icon || Globe; return <Tab className="h-6 w-6 text-muted-foreground" />; })()}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{tabs.find(t => t.id === activeTab)?.label} Settings</h3>
                <p className="text-sm text-muted-foreground">This section will be available soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
