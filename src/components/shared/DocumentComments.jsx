import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function DocumentComments({ documentType, documentId, documentNumber }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [me, setMe] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    base44.entities.DocumentComment.filter({ document_id: documentId }).then(c => setCount(c.length));
  }, [documentId]);

  useEffect(() => {
    if (!open) return;
    loadComments();
    base44.auth.me().then(setMe);
  }, [open]);

  async function loadComments() {
    const list = await base44.entities.DocumentComment.filter({ document_id: documentId }, "created_date");
    setComments(list);
    setCount(list.length);
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 50);
  }

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    const user = me || await base44.auth.me();
    await base44.entities.DocumentComment.create({
      document_type: documentType,
      document_id: documentId,
      document_number: documentNumber || "",
      comment: text.trim(),
      author_name: user?.full_name || "",
      author_email: user?.email || "",
    });
    setText("");
    setSending(false);
    loadComments();
  }

  async function remove(c) {
    await base44.entities.DocumentComment.delete(c.id);
    toast.success("تم حذف التعليق");
    loadComments();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {count > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{count}</Badge>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              تعليقات {documentType} {documentNumber && <span className="font-mono text-sm text-muted-foreground">#{documentNumber}</span>}
            </DialogTitle>
          </DialogHeader>

          <div ref={listRef} className="max-h-72 overflow-y-auto space-y-3 py-2">
            {comments.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">لا توجد تعليقات بعد. ابدأ النقاش!</p>
            ) : (
              comments.map(c => {
                const mine = me && c.author_email === me.email;
                return (
                  <div key={c.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className={`text-[11px] font-semibold ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {c.author_name || c.author_email || "مستخدم"}
                        </span>
                        {(mine || me?.role === "admin") && (
                          <button onClick={() => remove(c)} className={`${mine ? "text-primary-foreground/60 hover:text-primary-foreground" : "text-muted-foreground hover:text-destructive"}`}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap break-words">{c.comment}</p>
                      <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/60" : "text-muted-foreground/70"}`}>
                        {c.created_date ? format(new Date(c.created_date), "yyyy/MM/dd HH:mm") : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex gap-2 items-end pt-2 border-t">
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="اكتب ملاحظة أو تنبيهاً للزملاء..."
              className="min-h-[60px] text-sm"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <Button onClick={send} disabled={sending || !text.trim()} size="icon" className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}