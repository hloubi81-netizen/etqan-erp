import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldX } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { logActivity } from "@/utils/activityLogger";

export default function InvoiceApprovalDialog({ invoice, open, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    const user = await base44.auth.me();
    const approvedAt = new Date().toISOString();
    await base44.entities.Invoice.update(invoice.id, {
      approved_by: user.full_name || user.email,
      approved_at: approvedAt,
      approval_note: note || null,
    });
    await logActivity({
      action: "تعديل",
      documentType: "فاتورة",
      documentNumber: invoice.invoice_number,
      documentSubtype: invoice.pattern_type,
      documentId: invoice.id,
      amount: invoice.total,
      details: `اعتماد فاتورة ${invoice.pattern_type} - ${invoice.client_name || ""} بواسطة ${user.full_name || user.email}`,
    });
    toast.success("تم اعتماد الفاتورة رسمياً ✅");
    setLoading(false);
    onDone?.();
    onClose();
  }

  async function handleRevoke() {
    setLoading(true);
    await base44.entities.Invoice.update(invoice.id, {
      approved_by: null,
      approved_at: null,
      approval_note: null,
    });
    toast.success("تم سحب الاعتماد");
    setLoading(false);
    onDone?.();
    onClose();
  }

  const isApproved = !!invoice?.approved_by;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            {isApproved ? "إدارة الاعتماد" : "اعتماد الفاتورة"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invoice summary */}
          <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم الفاتورة</span>
              <span className="font-semibold">{invoice?.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">العميل</span>
              <span>{invoice?.client_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الإجمالي</span>
              <span className="font-bold text-primary">{(invoice?.total || 0).toLocaleString()}</span>
            </div>
          </div>

          {isApproved ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold text-emerald-700 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> معتمدة من: {invoice.approved_by}
              </p>
              <p className="text-muted-foreground text-xs">
                {new Date(invoice.approved_at).toLocaleString("ar-EG", {
                  year: "numeric", month: "long", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
              {invoice.approval_note && (
                <p className="text-muted-foreground text-xs">"{invoice.approval_note}"</p>
              )}
            </div>
          ) : (
            <div>
              <Label>ملاحظة الاعتماد (اختياري)</Label>
              <Textarea
                placeholder="أضف ملاحظة للاعتماد..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>إلغاء</Button>
          {isApproved ? (
            <Button variant="destructive" onClick={handleRevoke} disabled={loading} className="gap-1.5">
              <ShieldX className="h-4 w-4" /> سحب الاعتماد
            </Button>
          ) : (
            <Button onClick={handleApprove} disabled={loading} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <ShieldCheck className="h-4 w-4" /> اعتماد رسمي
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}