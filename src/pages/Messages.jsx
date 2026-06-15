import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Mail, Send, Inbox, PenSquare, Reply, Trash2, RefreshCw,
  MailOpen, Search, Users, ArrowRight, MessageSquare, User, X
} from "lucide-react";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("inbox");
  const [selectedConv, setSelectedConv] = useState(null);
  const [composing, setComposing] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ recipient_email: "", recipient_name: "", subject: "", body: "" });
  const [sending, setSending] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [me, allUsers, msgs] = await Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.User.list().catch(() => []),
      base44.entities.Message.list("-created_date", 300).catch(() => []),
    ]);
    setUser(me);
    setUsers(allUsers);
    setMessages(msgs);
    setLoading(false);
  };

  // Auto-mark conversation as read
  useEffect(() => {
    if (!selectedConv || !user) return;
    const unreadInConv = selectedConv.messages.filter(
      m => m.recipient_email === user.email && !m.is_read
    );
    unreadInConv.forEach(async (msg) => {
      await base44.entities.Message.update(msg.id, { is_read: true });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    });
  }, [selectedConv]);

  // Group messages into conversations
  const conversations = useMemo(() => {
    const convMap = new Map();
    const myMsgs = messages.filter(
      m => m.sender_email === user?.email || m.recipient_email === user?.email
    );

    myMsgs.forEach(msg => {
      // Create a unique key for the conversation pair
      const pair = [msg.sender_email, msg.recipient_email].sort().join("||");
      const otherEmail = msg.sender_email === user.email ? msg.recipient_email : msg.sender_email;
      const otherName = msg.sender_email === user.email ? msg.recipient_name : msg.sender_name;

      if (!convMap.has(pair)) {
        convMap.set(pair, {
          key: pair,
          otherEmail,
          otherName,
          messages: [],
          lastDate: "",
          unread: 0,
          isTeamMember: false,
        });
      }
      const conv = convMap.get(pair);
      conv.messages.push(msg);
      if (msg.created_date > conv.lastDate) conv.lastDate = msg.created_date;
      if (msg.recipient_email === user.email && !msg.is_read) conv.unread++;
      // Sort messages by date
      conv.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    });

    // Mark team members
    const allConv = Array.from(convMap.values());
    allConv.forEach(c => {
      const u = users.find(u => u.email === c.otherEmail);
      if (u) c.isTeamMember = true;
    });

    // Sort by last message date
    allConv.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
    return allConv;
  }, [messages, user]);

  const inboxConvs = conversations.filter(c =>
    c.messages.some(m => m.recipient_email === user?.email) || c.unread > 0
  );
  const sentConvs = conversations.filter(c =>
    c.messages.some(m => m.sender_email === user?.email && m.recipient_email !== user?.email)
  );
  const totalUnread = inboxConvs.reduce((sum, c) => sum + c.unread, 0);

  const currentList = tab === "inbox" ? inboxConvs : sentConvs;

  const filtered = currentList.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      c.otherName?.toLowerCase().includes(q) ||
      c.otherEmail?.toLowerCase().includes(q) ||
      c.messages.some(m => m.subject?.toLowerCase().includes(q) || m.body?.toLowerCase().includes(q));
  });

  const handleSend = async () => {
    if (!form.recipient_email || !form.subject || !form.body) return;
    setSending(true);
    await base44.entities.Message.create({
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      recipient_email: form.recipient_email,
      recipient_name: form.recipient_name || form.recipient_email,
      subject: form.subject,
      body: form.body,
      is_read: false,
    });
    setComposing(false);
    setForm({ recipient_email: "", recipient_name: "", subject: "", body: "" });
    setSending(false);
    load();
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !selectedConv) return;
    setReplying(true);
    await base44.entities.Message.create({
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      recipient_email: selectedConv.otherEmail,
      recipient_name: selectedConv.otherName,
      subject: selectedConv.messages[0]?.subject ? `رد: ${selectedConv.messages[0].subject}` : "رد",
      body: replyBody,
      is_read: false,
    });
    setReplyBody("");
    setReplying(false);
    load();
  };

  const handleDeleteConv = async (conv) => {
    if (!confirm("هل أنت متأكد من حذف جميع رسائل هذه المحادثة؟")) return;
    const myMsgs = conv.messages.filter(m => m.sender_email === user.email);
    for (const msg of myMsgs) {
      await base44.entities.Message.delete(msg.id).catch(() => {});
    }
    setSelectedConv(null);
    load();
  };

  const fmt = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return d.toLocaleDateString("ar-SA", { weekday: "short", hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const initials = (name) => {
    if (!name) return "?";
    return name.split(" ").slice(0, 2).map(n => n[0]).join("");
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            الرسائل الداخلية
            {totalUnread > 0 && (
              <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs">{totalUnread}</Badge>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">محادثات الفريق والتواصل الداخلي</p>
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

      {/* Main Content */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ height: "calc(100vh - 180px)" }}>
        {/* Conversation List */}
        <div className="w-72 shrink-0 flex flex-col gap-2">
          {/* Tabs */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              className={cn("flex-1 py-2 text-sm font-medium transition-colors relative",
                tab === "inbox" ? "bg-primary text-white" : "hover:bg-muted")}
              onClick={() => { setTab("inbox"); setSelectedConv(null); }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Inbox className="h-3.5 w-3.5" />
                الوارد
                {totalUnread > 0 && (
                  <span className="bg-white text-primary text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </div>
            </button>
            <button
              className={cn("flex-1 py-2 text-sm font-medium transition-colors",
                tab === "sent" ? "bg-primary text-white" : "hover:bg-muted")}
              onClick={() => { setTab("sent"); setSelectedConv(null); }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Send className="h-3.5 w-3.5" />
                المُرسَل
              </div>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="بحث في المحادثات..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-8 h-8 text-sm"
            />
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto space-y-1 border rounded-lg p-1.5 bg-card">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">لا توجد محادثات</p>
                <p className="text-xs mt-1">ابدأ محادثة جديدة مع فريقك</p>
              </div>
            ) : (
              filtered.map(conv => (
                <button
                  key={conv.key}
                  onClick={() => setSelectedConv(conv)}
                  className={cn(
                    "w-full text-right p-3 rounded-lg transition-colors text-sm flex items-start gap-2.5",
                    selectedConv?.key === conv.key
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted border border-transparent",
                  )}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                    conv.unread > 0
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {initials(conv.otherName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate text-xs", conv.unread > 0 ? "font-bold text-foreground" : "text-foreground")}>
                        {conv.otherName}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{fmt(conv.lastDate)}</span>
                    </div>
                    <p className={cn("truncate text-xs mt-0.5", conv.unread > 0 ? "font-semibold text-muted-foreground" : "text-muted-foreground")}>
                      {conv.messages[conv.messages.length - 1]?.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="truncate text-[10px] text-muted-foreground flex-1">
                        {conv.messages[conv.messages.length - 1]?.body?.slice(0, 60)}
                      </p>
                      {conv.unread > 0 && (
                        <Badge className="bg-primary text-white text-[10px] h-4 px-1.5 shrink-0">{conv.unread}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation Viewer */}
        <div className="flex-1 border rounded-lg bg-card overflow-hidden flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <MailOpen className="h-10 w-10 opacity-20" />
              </div>
              <p className="text-sm font-medium">اختر محادثة لعرضها</p>
              <p className="text-xs">أو ابدأ رسالة جديدة مع أحد أعضاء الفريق</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Conversation Header */}
              <div className="border-b p-4 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {initials(selectedConv.otherName)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{selectedConv.otherName}</p>
                    <p className="text-xs text-muted-foreground">{selectedConv.otherEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80"
                    onClick={() => handleDeleteConv(selectedConv)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConv.messages.map((msg, i) => {
                  const isMine = msg.sender_email === user.email;
                  const showDate = i === 0 || new Date(msg.created_date) - new Date(selectedConv.messages[i - 1]?.created_date) > 3600000;

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center mb-3">
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {fmt(msg.created_date)}
                          </span>
                        </div>
                      )}
                      <div className={cn("flex gap-2", isMine ? "justify-end" : "justify-start")}>
                        {!isMine && (
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary mt-1">
                            {initials(msg.sender_name)}
                          </div>
                        )}
                        <div className={cn(
                          "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm",
                          isMine
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        )}>
                          {!isMine && (
                            <p className="text-[10px] font-semibold mb-1 opacity-70">{msg.sender_name}</p>
                          )}
                          <p className="text-xs font-semibold mb-1">{msg.subject}</p>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                          <p className={cn("text-[9px] mt-1.5", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
                            {new Date(msg.created_date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <div className="border-t p-4 space-y-2 bg-muted/10">
                <Textarea
                  placeholder={`رد على ${selectedConv.otherName}...`}
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleReply();
                    }
                  }}
                />
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground">Enter للإرسال • Shift+Enter لسطر جديد</p>
                  <Button size="sm" onClick={handleReply} disabled={!replyBody.trim() || replying} className="gap-1.5">
                    <Send className="h-4 w-4" />
                    {replying ? "جارٍ..." : "إرسال"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composing} onOpenChange={setComposing}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenSquare className="h-5 w-5 text-primary" />
              رسالة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المستقبِل</Label>
              <Select
                value={form.recipient_email}
                onValueChange={v => {
                  const u = users.find(u => u.email === v);
                  setForm({ ...form, recipient_email: v, recipient_name: u?.full_name || v });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر عضو الفريق" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.email !== user?.email).map(u => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name || u.email} ({u.email})
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