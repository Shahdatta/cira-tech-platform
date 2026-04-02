import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  MessageSquare,
  Users,
  FileText,
  BarChart3,
  Settings,
  Zap,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, type AppRole } from "@/contexts/RoleContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; roles: AppRole[] };

const allRoles: AppRole[] = ["admin", "pm", "hr", "member", "guest"];

const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: allRoles },
  { title: "Spaces", url: "/spaces", icon: FolderKanban, roles: ["admin", "pm"] },
  { title: "Tasks", url: "/tasks", icon: CheckSquare, roles: ["admin", "pm", "member"] },
  { title: "Time Tracking", url: "/time-tracking", icon: Clock, roles: ["admin", "pm", "member"] },
];

const commsNav: NavItem[] = [
  { title: "Chat", url: "/chat", icon: MessageSquare, roles: ["admin", "pm", "hr", "member"] },
];

const hrNav: NavItem[] = [
  { title: "HR Hub", url: "/hr", icon: Users, roles: ["admin", "hr"] },
  { title: "Invoices", url: "/invoices", icon: FileText, roles: ["admin", "hr"] },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["admin", "pm", "hr"] },
];

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  pm: "Project Manager",
  hr: "HR Manager",
  member: "Member",
  guest: "Guest",
};

const roleColors: Record<AppRole, string> = {
  admin: "bg-destructive/10 text-destructive",
  pm: "bg-primary/10 text-primary",
  hr: "bg-warning/10 text-warning",
  member: "bg-success/10 text-success",
  guest: "bg-muted text-muted-foreground",
};

function NavSection({
  label,
  items,
  collapsed,
}: {
  label: string;
  items: NavItem[];
  collapsed: boolean;
}) {
  const location = useLocation();
  const { role } = useRole();
  const filtered = items.filter((i) => i.roles.includes(role));
  if (filtered.length === 0) return null;

  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-muted-foreground/70 text-[11px] uppercase tracking-wider font-semibold px-3 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {filtered.map((item) => {
            const active = location.pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <NavLink
                    to={item.url}
                    end
                    className="transition-all duration-150 rounded-lg"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Zap className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground tracking-tight">CIRA Tech</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Management Platform
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <NavSection label="Overview" items={mainNav} collapsed={collapsed} />
        <NavSection label="Communication" items={commsNav} collapsed={collapsed} />
        <NavSection label="Human Resources" items={hrNav} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {/* Role Badge (read-only, from auth) */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleColors[role]}`}>
              {roleLabels[role]}
            </span>
          </div>
        )}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <NavLink
                to="/settings"
                className="transition-colors rounded-lg"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2.5 mt-3 px-2 py-2 rounded-lg bg-secondary/60 cursor-pointer hover:bg-secondary transition-colors">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user?.full_name || "User"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email || ""}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
