import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useRef, useEffect } from "react";
import { Send, Hash, Plus, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const Chat = () => {
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: "", description: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: channels = [], isLoading: loadingChannels } = useQuery({
    queryKey: ["channels"],
    queryFn: () => api.get<any[]>("/channels"),
  });

  // Auto-select first channel
  const selectedChannel = activeChannel ?? channels[0]?.id ?? null;

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", selectedChannel],
    enabled: !!selectedChannel,
    queryFn: () => api.get<any[]>(`/messages?channelId=${selectedChannel}`),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_chat"],
    queryFn: () => api.get<any[]>("/profiles"),
  });

  function getProfileName(userId: string) {
    return profiles.find((p) => p.user_id === userId)?.full_name ?? "Unknown";
  }

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChannel]);

  const addChannelMut = useMutation({
    mutationFn: (data: any) => api.post("/channels", data),
    onSuccess: (newCh: any) => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Channel created");
      setIsAddChannelOpen(false);
      setNewChannel({ name: "", description: "" });
      if (newCh?.id) setActiveChannel(newCh.id);
    },
    onError: () => toast.error("Failed to create channel"),
  });

  const handleCreateChannel = () => {
    if (!newChannel.name.trim()) return;
    addChannelMut.mutate({
      project_id: null,
      name: newChannel.name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: newChannel.description.trim(),
    });
  };

  const sendMessageMut = useMutation({
    mutationFn: (data: any) => api.post("/messages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedChannel] });
      setMessage("");
    },
  });

  const handleSendMessage = () => {
    if (!message.trim() || !selectedChannel) return;
    sendMessageMut.mutate({
      channel_id: selectedChannel,
      sender_id: profiles[0]?.user_id || "00000000-0000-0000-0000-000000000000",
      content: message.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AppLayout title="Chat" subtitle="Team communication hub">
      <div className="max-w-[1400px] mx-auto h-[calc(100vh-140px)]">
        <div className="glass-card h-full flex overflow-hidden">
          {/* Channel list */}
          <div className="w-56 border-r border-border p-3 shrink-0">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channels</h3>
              <Dialog open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen}>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Channel</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Channel Name</Label>
                      <Input value={newChannel.name} onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })} placeholder="e.g. general-discussion" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Textarea value={newChannel.description} onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })} placeholder="What is this channel about?" rows={2} />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button onClick={handleCreateChannel} disabled={addChannelMut.isPending || !newChannel.name.trim()} className="gap-2">
                        {addChannelMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {loadingChannels ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : channels.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2">No channels yet.</p>
            ) : (
              <div className="space-y-0.5">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors",
                      selectedChannel === ch.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-foreground text-sm">{channels.find((c) => c.id === selectedChannel)?.name ?? "Select a channel"}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loadingMessages ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-3/4" />)}</div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((msg, i) => {
                  const name = getProfileName(msg.sender_id);
                  return (
                    <div key={msg.id} className="flex items-start gap-3 animate-fade-in opacity-0" style={{ animationDelay: `${i * 40}ms` }}>
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{getInitials(name)}</span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-foreground">{name}</span>
                          <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="px-5 py-3 border-t border-border">
              <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-4 py-2 border border-border">
                <button className="text-muted-foreground hover:text-foreground"><Paperclip className="h-4 w-4" /></button>
                <input
                  type="text"
                  placeholder={`Message #${channels.find((c) => c.id === selectedChannel)?.name ?? "channel"}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sendMessageMut.isPending || !selectedChannel}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendMessageMut.isPending || !message.trim() || !selectedChannel}
                  className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {sendMessageMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Chat;
