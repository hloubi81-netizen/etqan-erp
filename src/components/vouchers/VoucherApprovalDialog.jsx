import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldX } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { logActivity } from "@/utils/activityLogger";
import SignaturePad from "@/components/shared/SignaturePad";

export default function VoucherApprovalDialog({ voucher, open, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(false);

  const isApproved = !!voucher?.approved_by;

  async function handleApprove() {
    setLoading(true);
    const user = await base44.auth.me();
    await base44.entities.Voucher.update(voucher.id, {
      approved_by: user.full_name || user.email,
      approved_at: new Date().toISOString(),
      approval_note: note || null,
      approval_signature: signature || null,
    });
    await logActivity({
      action: "تعديل",
      documentType: "سند",
      documentNumber: voucher.voucher_number,
      documentSubtype: voucher.type,
      documentId: voucher.id,
      amount: voucher.amount || voucher.total_debit,
      details: `اعتماد ${voucher.type} ${voucher.voucher_number} بواسطة ${user.full_name || user.email}`,
    });
    toast.success("تم اعتماد السند رسمياً ✅");
    setLoading(false);
    onDone?.();
    onClose();
  }

  async function handleRevoke() {
    setLoading(true);
    await base44.entities.Voucher.update(voucher.id, {
      approved_by: null,
      approved_at: null,
      approval_note: null,
      approval_signature: null,
    });
    toast.success("تم سحب الاعتماد");
    setLoading(false);
    onDone?.();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            {isApproved ? "إدارة اعتماد السند" : "اعتماد السند"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم السند</span>
              <span className="font-semibold">{voucher?.voucher_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">النوع</span>
              <span>{voucher?.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المبلغ</span>
              <span className="font-bold text-primary">
                {((voucher?.amount || voucher?.total_debit) || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {isApproved ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm space-y-2">
              <p className="font-semibold text-emerald-700 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> معتمد من: {voucher.approved_by}
              </p>
              <p className="text-muted-foreground text-xs">
                {new Date(voucher.approved_at).toLocaleString("ar-EG", {
                  year: "numeric", month: "long", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
              {voucher.approval_note && (
                <p className="text-muted-foreground text-xs">"{voucher.approval_note}"</p>
              )}
              {voucher.approval_signature && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">التوقيع الإلكتروني:</p>
                  <img src={voucher.approval_signature} alt="توقيع" className="border rounded h-12 bg-white" />
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <Label>ملاحظة الاعتماد (اختياري)</Label>
                <Textarea
                  placeholder="أضف ملاحظة..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>
              <div>
                <Label className="mb-2 block">التوقيع الإلكتروني</Label>
                <SignaturePad value={signature} onChange={setSignature} />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>إلغاء</Button>
          {isApproved ? (
            <Button variant="destructive" onClick={handleRevoke} disabled={loading} className="gap-1.5">
              <ShieldX className="h-4 w-4" /> سحب الاعتماد
            </Button>
          ) : (
            <Button
              onClick={handleApprove}
              disabled={loading || !signature}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <ShieldCheck className="h-4 w-4" /> اعتماد رسمي
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}