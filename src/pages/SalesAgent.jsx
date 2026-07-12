import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Users, Calendar, TrendingUp, Loader2, MessageCircle } from "lucide-react";

const AGENT_NAME = "etqan_sales";

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isUser
        ? "bg-primary text-primary-foreground rounded-br-sm"
        : "bg-muted text-foreground rounded-bl-sm"}`}>
        {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
      </div>
    </div>
  );
}

export default function SalesAgent() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    const unsubscribe = base44.agents.subscribeToConversation(selectedId, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [selectedId]);

  const handleSend = async () => {
    if (!input.trim() || !selectedId) return;
    const conv = conversations.find(c => c.id === selectedId);
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await base44.agents.addMessage(conv, { role: "user", content: text });
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const whatsappLink = base44.agents?.getWhatsAppConnectURL?.(AGENT_NAME);

  const stats = {
    total: conversations.length,
    leads: 0,
    demos: 0,
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader title="وكيل مبيعات إتقان" subtitle="إدارة محادثات الوكيل الذكي عبر واتساب ومتابعة العملاء المحتملين" />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">إجمالي المحادثات</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="w-5 h-5 text-success" /></div>
            <div><p className="text-2xl font-bold">{stats.leads}</p><p className="text-xs text-muted-foreground">عملاء محتملون</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-warning/10"><Calendar className="w-5 h-5 text-warning" /></div>
            <div><p className="text-2xl font-bold">{stats.demos}</p><p className="text-xs text-muted-foreground">عروض توضيحية</p></div>
          </CardContent>
        </Card>
        {whatsappLink && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex items-center justify-center p-4">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-success font-medium text-sm hover:underline">
                <MessageCircle className="w-5 h-5" /> ربط واتساب
              </a>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-320px)] min-h-[400px]">
        <Card className="lg:col-span-1 overflow-hidden">
          <CardHeader className="pb-3"><CardTitle className="text-base">المحادثات</CardTitle></CardHeader>
          <ScrollArea className="h-[calc(100%-3rem)]">
            {loading ? (
              <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-4">لا توجد محادثات بعد</p>
            ) : (
              <div className="space-y-1 px-2">
                {conversations.map((conv) => (
                  <button key={conv.id} onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-right p-3 rounded-lg transition-colors ${selectedId === conv.id ? "bg-primary/10" : "hover:bg-muted"}`}>
                    <p className="text-sm font-medium truncate">{conv.metadata?.name || conv.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.metadata?.description || "محادثة جديدة"}</p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">اختر محادثة لعرضها</p></div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-hidden p-4">
                <ScrollArea className="h-full">
                  {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
                </ScrollArea>
              </div>
              <div className="border-t p-3 flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="اكتب رسالة..." disabled={sending} />
                <Button onClick={handleSend} disabled={sending || !input.trim()} size="icon">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}