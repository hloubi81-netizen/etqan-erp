import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }) : "";

export default function UserMessageDialog({ user, currentUser, open, onOpenChange }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [thread, setThread] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const loadThread = useCallback(async () => {
    if (!user?.email || !currentUser?.email) return;
    setLoadingThread(true);
    try {
      const all = await base44.entities.Message.list("-created_date", 200);
      const mine = (all || []).filter(
        (m) =>
          (m.sender_email === currentUser.email && m.recipient_email === user.email) ||
          (m.recipient_email === currentUser.email && m.sender_email === user.email)
      );
      mine.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setThread(mine);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingThread(false);
    }
  }, [user?.email, currentUser?.email]);

  useEffect(() => {
    if (open && user?.email && currentUser?.email) {
      setSubject("");
      setBody("");
      loadThread();
    }
  }, [open, user?.email, currentUser?.email, loadThread]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      await base44.entities.Message.create({
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        recipient_email: user.email,
        recipient_name: user.full_name || user.email,
        subject: subject.trim(),
        body: body.trim(),
        is_read: false,
      });
      // Also create an in-app notification for the recipient
      await base44.entities.Notification.create({
        title: `رسالة جديدة من ${currentUser.full_name || currentUser.email}`,
        message: `${subject.trim()}`,
        type: "رسالة",
        related_module: "الرسائل",
        related_id: user.id,
        is_read: false,
        trigger_date: new Date().toISOString().split("T")[0],
        target_user_id: user.id,
      }).catch(() => {});
      toast.success("تم إرسال الرسالة");
      setSubject("");
      setBody("");
      loadThread();
    } catch (err) {
      toast.error(err.message || "تعذر إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              مراسلة {user.full_name || user.email}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadThread} disabled={loadingThread}>
              {loadingThread ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-[180px] max-h-[320px] rounded-lg border bg-muted/20 p-3">
          {thread.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">لا توجد رسائل سابقة</p>
          ) : (
            <div className="space-y-2.5">
              {thread.map((msg) => {
                const mine = msg.sender_email === currentUser.email;
                return (
                  <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border rounded-bl-md"}`}>
                      <p className="text-xs font-semibold mb-0.5">{msg.subject}</p>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                      <p className={`text-[9px] mt-1 ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {fmtDate(msg.created_date)} • {fmtTime(msg.created_date)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs">الموضوع</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع الرسالة" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">نص الرسالة</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب رسالتك..." rows={3} className="resize-none" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button onClick={handleSend} disabled={!subject.trim() || !body.trim() || sending} className="gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "جارٍ الإرسال..." : "إرسال"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}