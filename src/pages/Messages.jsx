import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mail, Send, Inbox, PenSquare, Reply, Trash2, RefreshCw,
  ChevronLeft, MailOpen, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("inbox"); // inbox | sent
  const [selected, setSelected] = useState(null);
  const [composing, setComposing] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ recipient_email: "", subject: "", body: "" });
  const [sending, setSending] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [me, allUsers, msgs] = await Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.User.list().catch(() => []),
      base44.entities.Message.list("-created_date", 200).catch(() => []),
    ]);
    setUser(me);
    setUsers(allUsers);
    setMessages(msgs);
    setLoading(false);
  };

  // Auto-mark as read when selected
  useEffect(() => {
    if (!selected || !user) return;
    if (selected.recipient_email === user.email && !selected.is_read) {
      base44.entities.Message.update(selected.id, { is_read: true });
      setMessages(prev => prev.map(m => m.id === selected.id ? { ...m, is_read: true } : m));
      setSelected(prev => ({ ...prev, is_read: true }));
    }
  }, [selected]);

  const inbox = messages.filter(m => m.recipient_email === user?.email);
  const sent = messages.filter(m => m.sender_email === user?.email);
  const unreadCount = inbox.filter(m => !m.is_read).length;

  const filtered = (tab === "inbox" ? inbox : sent).filter(m => {
    const q = search.toLowerCase();
    return !q || m.subject?.toLowerCase().includes(q) || m.sender_name?.toLowerCase().includes(q) || m.recipient_name?.toLowerCase().includes(q);
  });

  const handleSend = async () => {
    if (!form.recipient_email || !form.subject || !form.body) return;
    setSending(true);
    const recipientUser = users.find(u => u.email === form.recipient_email);
    await base44.entities.Message.create({
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      recipient_email: form.recipient_email,
      recipient_name: recipientUser?.full_name || form.recipient_email,
      subject: form.subject,
      body: form.body,
      is_read: false,
    });
    setComposing(false);
    setForm({ recipient_email: "", subject: "", body: "" });
    setSending(false);
    load();
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !selected) return;
    setReplying(true);
    await base44.entities.Message.create({
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      recipient_email: selected.sender_email,
      recipient_name: selected.sender_name,
      subject: `رد: ${selected.subject}`,
      body: replyBody,
      is_read: false,
      parent_message_id: selected.id,
    });
    setReplyBody("");
    setReplying(false);
    load();
  };

  const handleDelete = async (msg) => {
    await base44.entities.Message.delete(msg.id);
    if (selected?.id === msg.id) setSelected(null);
    load();
  };

  const fmt = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            الرسائل الداخلية
            {unreadCount > 0 && <Badge className="bg-primary text-white text-xs">{unreadCount}</Badge>}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">التواصل بين مستخدمي النظام</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={() => setComposing(true)} className="gap-1.5">
            <PenSquare className="h-4 w-4" />
            رسالة جديدة
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0" style={{ height: "calc(100vh - 180px)" }}>
        {/* Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              className={cn("flex-1 py-2 text-sm font-medium transition-colors", tab === "inbox" ? "bg-primary text-white" : "hover:bg-muted")}
              onClick={() => { setTab("inbox"); setSelected(null); }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Inbox className="h-3.5 w-3.5" />
                الوارد
                {unreadCount > 0 && <span className="bg-white text-primary text-[10px] font-bold rounded-full px-1.5">{unreadCount}</span>}
              </div>
            </button>
            <button
              className={cn("flex-1 py-2 text-sm font-medium transition-colors", tab === "sent" ? "bg-primary text-white" : "hover:bg-muted")}
              onClick={() => { setTab("sent"); setSelected(null); }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Send className="h-3.5 w-3.5" />
                المُرسَل
              </div>
            </button>
          </div>

          <div className="relative">
            <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-8 h-8 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 border rounded-lg p-1.5 bg-card">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">لا توجد رسائل</div>
            ) : (
              filtered.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => setSelected(msg)}
                  className={cn(
                    "w-full text-right p-2.5 rounded-lg transition-colors text-sm",
                    selected?.id === msg.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted",
                    !msg.is_read && tab === "inbox" ? "font-semibold" : ""
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn("h-2 w-2 mt-1.5 rounded-full shrink-0", !msg.is_read && tab === "inbox" ? "bg-primary" : "bg-transparent")} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-semibold">
                        {tab === "inbox" ? msg.sender_name : msg.recipient_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{msg.subject}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(msg.created_date)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Viewer */}
        <div className="flex-1 border rounded-lg bg-card overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MailOpen className="h-16 w-16 opacity-20" />
              <p className="text-sm">اختر رسالة لعرضها</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Message header */}
              <div className="border-b p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="font-bold text-base">{selected.subject}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>من: <span className="font-medium text-foreground">{selected.sender_name}</span></span>
                    <span>إلى: <span className="font-medium text-foreground">{selected.recipient_name}</span></span>
                    <span>{fmt(selected.created_date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(selected)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Message body */}
              <div className="flex-1 overflow-y-auto p-5 text-sm leading-relaxed whitespace-pre-wrap">
                {selected.body}
              </div>

              {/* Reply box — only in inbox */}
              {tab === "inbox" && (
                <div className="border-t p-4 space-y-2">
                  <Textarea
                    placeholder="اكتب ردّك هنا..."
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <Button size="sm" onClick={handleReply} disabled={!replyBody.trim() || replying} className="gap-1.5">
                    <Reply className="h-4 w-4" />
                    {replying ? "جارٍ الإرسال..." : "إرسال الرد"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composing} onOpenChange={setComposing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenSquare className="h-5 w-5 text-primary" />
              رسالة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المستقبِل</Label>
              <Select value={form.recipient_email} onValueChange={v => setForm({ ...form, recipient_email: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستقبِل" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.email !== user?.email).map(u => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الموضوع</Label>
              <Input
                placeholder="موضوع الرسالة"
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div>
              <Label>نص الرسالة</Label>
              <Textarea
                placeholder="اكتب رسالتك هنا..."
                value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                rows={5}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setComposing(false)}>إلغاء</Button>
              <Button onClick={handleSend} disabled={!form.recipient_email || !form.subject || !form.body || sending} className="gap-1.5">
                <Send className="h-4 w-4" />
                {sending ? "جارٍ الإرسال..." : "إرسال"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}