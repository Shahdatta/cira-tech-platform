import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Send, Hash, Plus, ChevronDown, ChevronRight, Lock,
  Paperclip, Smile, AtSign, Settings, Loader2, UserPlus, Users,
  Bell, BellOff, LogOut, ExternalLink, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isYesterday } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// ── helpers ───────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-green-500",
  "bg-emerald-500", "bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-purple-500", "bg-pink-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
function msgTime(d: string) {
  const dt = new Date(d);
  if (isToday(dt)) return format(dt, "h:mm a");
  if (isYesterday(dt)) return `Yesterday ${format(dt, "h:mm a")}`;
  return format(dt, "MMM d, h:mm a");
}
function dateLabel(d: string) {
  const dt = new Date(d);
  if (isToday(dt)) return "Today";
  if (isYesterday(dt)) return "Yesterday";
  return format(dt, "MMMM d, yyyy");
}
function checkGrouped(prev: any, curr: any) {
  if (!prev || prev.sender_id !== curr.sender_id) return false;
  return new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
}

// ── ChannelItem ───────────────────────────────────────────────────────
function ChannelItem({ ch, active, onClick }: { ch: any; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all",
        active
          ? "bg-primary/20 text-white font-medium"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
      )}
    >
      {ch.is_private
        ? <Lock className="h-3.5 w-3.5 shrink-0 opacity-60" />
        : <Hash className="h-3.5 w-3.5 shrink-0 opacity-60" />}
      <span className="truncate">{ch.name}</span>
    </button>
  );
}

// ── MessageRow ────────────────────────────────────────────────────────
function MessageRow({ msg, isOwn }: { msg: any; isOwn: boolean }) {
  const color = avatarColor(msg.sender_name || "");
  return (
    <>
      {msg.showDate && (
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[11px] text-slate-500 px-2 font-medium">{dateLabel(msg.created_at)}</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
      )}
      <div className={cn(
        "group flex items-start gap-3 px-2 py-0.5 rounded-lg hover:bg-white/[0.03] transition-colors",
        msg.grouped ? "mt-0" : "mt-3",
      )}>
        {msg.grouped ? (
          <div className="w-9 shrink-0 flex items-center justify-end pt-0.5">
            <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 leading-5">
              {format(new Date(msg.created_at), "h:mm")}
            </span>
          </div>
        ) : (
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white", color)}>
            {initials(msg.sender_name || "?")}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {!msg.grouped && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className={cn("text-sm font-semibold", isOwn ? "text-primary" : "text-white")}>
                {msg.sender_name || "Unknown"}
              </span>
              <span className="text-[11px] text-slate-500">{msgTime(msg.created_at)}</span>
            </div>
          )}
          <p className="text-sm text-slate-300 leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    </>
  );
}

// ── Chat page ─────────────────────────────────────────────────────────
const Chat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [message, setMessage] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCh, setNewCh] = useState({ name: "", isPrivate: false, spaceId: "none" });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteSelected, setInviteSelected] = useState<string[]>([]);
  const [muteNotifs, setMuteNotifs] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<any[]>("/projects"),
  });

  const { data: allChannels = [], isLoading: loadingChannels } = useQuery({
    queryKey: ["channels"],
    queryFn: () => api.get<any[]>("/channels"),
  });

  const selectedId = activeChannel ?? (allChannels as any[])[0]?.id ?? null;

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", selectedId],
    enabled: !!selectedId,
    queryFn: () => api.get<any[]>(`/messages?channelId=${selectedId}`),
    refetchInterval: 3000,
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => api.get<any[]>("/profiles"),
  });

  const { data: channelMembers = [] } = useQuery({
    queryKey: ["channel_members", selectedId],
    enabled: !!(selectedId && (allChannels as any[]).find(c => c.id === selectedId)?.is_private),
    queryFn: () => api.get<any[]>(`/channels/${selectedId}/members`),
  });

  const projectMap = useMemo(
    () => Object.fromEntries((projects as any[]).map(p => [p.id, p])),
    [projects],
  );

  const projectsWithChannels = useMemo(() => {
    const ids = new Set((allChannels as any[]).map((c: any) => c.space_id).filter(Boolean));
    return (projects as any[]).filter(p => ids.has(p.id));
  }, [allChannels, projects]);

  const visibleChannels = useMemo(() => {
    if (activeTab === "all") return allChannels as any[];
    return (allChannels as any[]).filter((c: any) => c.space_id === activeTab);
  }, [allChannels, activeTab]);

  // Auto-select first visible channel when tab changes
  useEffect(() => {
    if (visibleChannels.length && !visibleChannels.find(c => c.id === activeChannel)) {
      setActiveChannel(visibleChannels[0].id);
    }
  }, [activeTab]); // eslint-disable-line

  // Deep-link: ?project=<id> → switch to that project's tab and first channel
  useEffect(() => {
    const projectParam = searchParams.get("project");
    if (!projectParam || !(allChannels as any[]).length) return;
    const projectChannels = (allChannels as any[]).filter(c => c.space_id === projectParam);
    if (projectChannels.length) {
      setActiveTab(projectParam);
      setActiveChannel(projectChannels[0].id);
    }
  }, [searchParams, allChannels]); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [message]);

  const sendMut = useMutation({
    mutationFn: (d: any) => api.post("/messages", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
      setMessage("");
    },
    onError: () => toast.error("Failed to send"),
  });

  const addChMut = useMutation({
    mutationFn: (d: any) => api.post("/channels", d),
    onSuccess: (ch: any) => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      toast.success(`#${ch.name} created`);
      setIsAddOpen(false);
      setNewCh({ name: "", isPrivate: false, spaceId: "none" });
      if (ch?.id) setActiveChannel(ch.id);
    },
    onError: () => toast.error("Failed to create channel"),
  });

  const inviteMut = useMutation({
    mutationFn: ({ channelId, userIds }: { channelId: string; userIds: string[] }) =>
      api.post(`/channels/${channelId}/invite`, { user_ids: userIds }),
    onSuccess: () => {
      toast.success("Invitations sent!");
      setShowInviteDialog(false);
      setInviteSelected([]);
    },
    onError: () => toast.error("Failed to send invitations"),
  });

  const acceptInviteOnMountMut = useMutation({
    mutationFn: (invId: string) => api.post<{ channel_id: string }>(`/channels/invitations/${invId}/accept`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      if (data?.channel_id) setActiveChannel(data.channel_id);
      toast.success("Joined channel!");
    },
  });

  // Handle ?invite=<invitationId> URL param — auto-accept on mount
  const [searchParamsHandled, setSearchParamsHandled] = useState(false);
  useEffect(() => {
    if (searchParamsHandled) return;
    const inviteParam = searchParams.get("invite");
    if (inviteParam) {
      setSearchParamsHandled(true);
      acceptInviteOnMountMut.mutate(inviteParam);
    }
  }, [searchParams]); // eslint-disable-line

  const handleSend = useCallback(() => {
    if (!message.trim() || !selectedId) return;
    sendMut.mutate({ channel_id: selectedId, sender_id: user?.id, content: message.trim() });
  }, [message, selectedId, user, sendMut]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleCollapse = (id: string) =>
    setCollapsed(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const processedMessages = useMemo(() =>
    (messages as any[]).map((msg, i) => ({
      ...msg,
      grouped: checkGrouped((messages as any[])[i - 1], msg),
      showDate: i === 0 || dateLabel((messages as any[])[i - 1].created_at) !== dateLabel(msg.created_at),
    })), [messages]);

  const currentChannel = (allChannels as any[]).find(c => c.id === selectedId);
  const currentProject = currentChannel?.space_id ? projectMap[currentChannel.space_id] : null;

  const sidebarGroups = useMemo(() => {
    const groups: { label: string; id: string; channels: any[] }[] = [];
    const global = (allChannels as any[]).filter(c => !c.space_id);
    if (global.length) groups.push({ label: "General", id: "__general", channels: global });
    projectsWithChannels.forEach((p: any) => {
      const chs = (allChannels as any[]).filter(c => c.space_id === p.id);
      if (chs.length) groups.push({ label: p.name, id: p.id, channels: chs });
    });
    return groups;
  }, [allChannels, projectsWithChannels]);

  return (
    <AppLayout title="" subtitle="">
      <div className="flex overflow-hidden rounded-xl border border-border" style={{ height: "calc(100vh - 100px)" }}>

        {/* ── SIDEBAR ── */}
        <aside className="w-[240px] shrink-0 flex flex-col" style={{ background: "#191c2a", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Workspace header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">CP</span>
              </div>
              <span className="font-semibold text-sm text-white">CIRA PM</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded hover:bg-white/10 transition-colors group">
                  <Settings className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-[#1e2235] border-white/10 text-slate-200">
                <DropdownMenuLabel className="text-slate-500 text-[11px]">Chat Settings</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  onClick={() => { setMuteNotifs(v => !v); toast.info(muteNotifs ? "Notifications unmuted" : "Notifications muted"); }}
                  className="gap-2 cursor-pointer hover:bg-white/10 focus:bg-white/10"
                >
                  {muteNotifs
                    ? <Bell className="h-3.5 w-3.5 text-slate-400" />
                    : <BellOff className="h-3.5 w-3.5 text-slate-400" />}
                  {muteNotifs ? "Unmute notifications" : "Mute notifications"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/settings")}
                  className="gap-2 cursor-pointer hover:bg-white/10 focus:bg-white/10"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  onClick={() => setIsAddOpen(true)}
                  className="gap-2 cursor-pointer hover:bg-white/10 focus:bg-white/10"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-400" />
                  New Channel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Project tabs */}
          {projectsWithChannels.length > 0 && (
            <div className="px-3 pt-3 pb-1 flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  activeTab === "all" ? "bg-primary/20 text-primary" : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
                )}
              >All</button>
              {projectsWithChannels.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setActiveTab(p.id)}
                  title={p.name}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors max-w-[90px] truncate",
                    activeTab === p.id ? "bg-primary/20 text-primary" : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
                  )}
                >{p.name}</button>
              ))}
            </div>
          )}

          {/* Channels label + add button */}
          <div className="px-4 pt-4 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Channels</span>
            <button onClick={() => setIsAddOpen(true)} className="text-slate-500 hover:text-white transition-colors">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Channel list */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {loadingChannels ? (
              <div className="space-y-1 px-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" style={{ background: "rgba(255,255,255,0.05)" }} />
                ))}
              </div>
            ) : activeTab !== "all" ? (
              // Single project tab — flat list
              <div className="mt-1 space-y-0.5">
                {visibleChannels.map((ch: any) => (
                  <ChannelItem key={ch.id} ch={ch} active={selectedId === ch.id} onClick={() => setActiveChannel(ch.id)} />
                ))}
                {visibleChannels.length === 0 && (
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
                    onClick={() => { setNewCh(p => ({ ...p, spaceId: activeTab })); setIsAddOpen(true); }}
                  >+ Add a channel</button>
                )}
              </div>
            ) : (
              // All tab — grouped by project with collapsible sections
              <div className="mt-1 space-y-1">
                {sidebarGroups.map(g => (
                  <div key={g.id}>
                    <button
                      onClick={() => toggleCollapse(g.id)}
                      className="w-full flex items-center justify-between px-2 py-1.5 group hover:bg-white/5 rounded transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {collapsed.has(g.id)
                          ? <ChevronRight className="h-3 w-3 text-slate-600" />
                          : <ChevronDown className="h-3 w-3 text-slate-600" />}
                        <span className="text-xs font-semibold text-slate-400 truncate max-w-[140px]">{g.label}</span>
                      </div>
                      <span
                        role="button"
                        onClick={e => {
                          e.stopPropagation();
                          setNewCh(p => ({ ...p, spaceId: g.id === "__general" ? "none" : g.id }));
                          setIsAddOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-all p-0.5"
                      ><Plus className="h-3 w-3" /></span>
                    </button>
                    {!collapsed.has(g.id) && (
                      <div className="space-y-0.5 mb-1">
                        {g.channels.map(ch => (
                          <ChannelItem key={ch.id} ch={ch} active={selectedId === ch.id} onClick={() => setActiveChannel(ch.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {sidebarGroups.length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-600">No channels yet.</p>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: "#0d0f1a" }}>

          {/* Channel header */}
          <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {currentChannel ? (
              <>
                {currentChannel.is_private
                  ? <Lock className="h-4 w-4 text-slate-500 shrink-0" />
                  : <Hash className="h-4 w-4 text-slate-500 shrink-0" />}
                <span className="font-semibold text-white text-sm">{currentChannel.name}</span>
                {currentProject && (
                  <>
                    <span className="text-slate-700 select-none">·</span>
                    <span className="text-xs text-slate-500">{currentProject.name}</span>
                  </>
                )}
                {currentChannel.is_private && (user?.role === "Admin" || user?.role === "PM") && (
                  <button
                    onClick={() => { setInviteSelected([]); setShowInviteDialog(true); }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Invite people to this channel"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Invite
                  </button>
                )}
              </>
            ) : (
              <span className="text-slate-600 text-sm">Select a channel</span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!selectedId ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Hash className="h-8 w-8 text-slate-700" />
                </div>
                <p className="text-slate-600 text-sm">Pick a channel to start chatting</p>
              </div>
            ) : loadingMessages ? (
              <div className="space-y-5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-28" style={{ background: "rgba(255,255,255,0.05)" }} />
                      <Skeleton className="h-4 w-2/3" style={{ background: "rgba(255,255,255,0.05)" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : processedMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Hash className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-white font-semibold">#{currentChannel?.name}</p>
                  <p className="text-slate-500 text-sm mt-1">This is the very beginning of <strong>#{currentChannel?.name}</strong>.</p>
                </div>
              </div>
            ) : (
              <div>
                {processedMessages.map((msg: any) => (
                  <MessageRow key={msg.id} msg={msg} isOwn={msg.sender_id === user?.id} />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sendMut.isPending || !selectedId}
                placeholder={`Message #${currentChannel?.name ?? "channel"}…`}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-600 px-4 pt-3 pb-2 focus:outline-none resize-none disabled:opacity-40"
                style={{ minHeight: "42px" }}
              />
              <div className="flex items-center justify-between px-3 pb-2.5">
                <div className="flex items-center gap-3 text-slate-600">
                  <Paperclip className="h-4 w-4 hover:text-slate-400 cursor-pointer transition-colors" />
                  <Smile className="h-4 w-4 hover:text-slate-400 cursor-pointer transition-colors" />
                  <AtSign className="h-4 w-4 hover:text-slate-400 cursor-pointer transition-colors" />
                </div>
                <button
                  onClick={handleSend}
                  disabled={sendMut.isPending || !message.trim() || !selectedId}
                  className="h-7 w-7 rounded bg-primary text-white flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-30"
                >
                  {sendMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-700 mt-1.5 px-1">
              <kbd className="px-1 rounded" style={{ background: "rgba(255,255,255,0.05)" }}>Enter</kbd> to send ·{" "}
              <kbd className="px-1 rounded" style={{ background: "rgba(255,255,255,0.05)" }}>Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>

      {/* Create Channel Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Create a channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="e.g. design-feedback"
                  value={newCh.name}
                  onChange={e => setNewCh(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">lowercase letters, numbers, and hyphens only</p>
            </div>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={newCh.spaceId} onValueChange={v => setNewCh(p => ({ ...p, spaceId: v }))}>
                <SelectTrigger><SelectValue placeholder="No project (general)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project (general)</SelectItem>
                  {(projects as any[]).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Private channel</p>
                <p className="text-xs text-muted-foreground">Only invited members can view and join</p>
              </div>
              <Switch checked={newCh.isPrivate} onCheckedChange={v => setNewCh(p => ({ ...p, isPrivate: v }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button
                onClick={() => addChMut.mutate({
                  name: newCh.name.trim(),
                  is_private: newCh.isPrivate,
                  space_id: newCh.spaceId === "none" ? null : newCh.spaceId,
                })}
                disabled={addChMut.isPending || !newCh.name.trim()}
              >
                {addChMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Create Channel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Invite People Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Invite to #{currentChannel?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {(() => {
              const memberIds = new Set((channelMembers as any[]).map((m: any) => m.user_id));
              const inviteable = (allProfiles as any[]).filter(
                (p: any) => p.id !== user?.id && !memberIds.has(p.id),
              );
              return inviteable.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All users are already members of this channel.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {inviteable.map((p: any) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <Checkbox
                        checked={inviteSelected.includes(p.id)}
                        onCheckedChange={(checked) => {
                          setInviteSelected(prev =>
                            checked ? [...prev, p.id] : prev.filter(id => id !== p.id),
                          );
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground">{p.role}</p>
                      </div>
                    </label>
                  ))}
                </div>
              );
            })()}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={inviteSelected.length === 0 || inviteMut.isPending}
                onClick={() => {
                  if (selectedId) inviteMut.mutate({ channelId: selectedId, userIds: inviteSelected });
                }}
              >
                {inviteMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Send {inviteSelected.length > 0 ? `(${inviteSelected.length})` : ""} Invitation{inviteSelected.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Chat;
