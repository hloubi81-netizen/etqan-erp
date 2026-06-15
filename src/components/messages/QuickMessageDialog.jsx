import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

export default function QuickMessageDialog({ open, onClose, recipient, sender }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return toast.error("يرجى تعبئة الموضوع والنص");
    setSending(true);
    try {
      await base44.entities.Message.create({
        sender_email: sender.email,
        sender_name: sender.full_name || sender.email,
        recipient_email: recipient.email,
        recipient_name: recipient.full_name || recipient.email,
        subject: subject.trim(),
        body: body.trim(),
        is_read: false,
      });
      toast.success("تم إرسال الرسالة بنجاح");
      setSubject("");
      setBody("");
      onClose();
    } catch {
      toast.error("فشل إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-5 w-5 text-primary" />
            رسالة إلى {recipient?.full_name || recipient?.email}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            المرسل: <span className="font-medium">{sender?.full_name}</span>
          </div>
          <div>
            <Label className="text-xs">الموضوع</Label>
            <Input
              placeholder="موضوع الرسالة"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">نص الرسالة</Label>
            <Textarea
              placeholder="اكتب رسالتك هنا..."
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              className="mt-1 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>إلغاء</Button>
            <Button onClick={handleSend} disabled={!subject.trim() || !body.trim() || sending} className="gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              إرسال
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}