import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SignaturePad from "@/components/shared/SignaturePad";
import { PenLine, ShieldCheck, User, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function CustodySignatureDialog({ open, onClose, custody, type, onSaved }) {
  // type: "custody" | "expense_batch"
  const [sig, setSig] = useState(null);
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date().toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });

  async function save() {
    if (!sig) { toast.error("يرجى رسم التوقيع أولاً"); return; }
    if (!signerName) { toast.error("يرجى إدخال اسم الموقِّع"); return; }

    setSaving(true);
    const signatureData = {
      signature: sig,
      signer_name: signerName,
      signer_title: signerTitle,
      signed_at: new Date().toISOString(),
      notes,
    };

    await base44.entities.Custody.update(custody.id, {
      approval_signature: sig,
      approved_by: signerName,
      approved_at: new Date().toISOString(),
      approval_note: notes || `اعتُمد من: ${signerName}${signerTitle ? ` — ${signerTitle}` : ""}`,
      signature_meta: JSON.stringify(signatureData),
    });

    toast.success("تم حفظ التوقيع الرقمي واعتماد المستند");
    setSaving(false);
    onSaved();
    onClose();
  }

  function handleClose() {
    setSig(null); setSignerName(""); setSignerTitle(""); setNotes("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <PenLine className="h-5 w-5" />
            التوقيع الرقمي واعتماد المستند
          </DialogTitle>
        </DialogHeader>

        {/* Custody Info */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" />
            <span>تفاصيل المستند</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div><span className="text-muted-foreground">رقم العهدة: </span><strong>{custody?.custody_number}</strong></div>
            <div><span className="text-muted-foreground">الموظف: </span><span>{custody?.employee_name}</span></div>
            <div><span className="text-muted-foreground">المبلغ: </span><strong className="text-blue-700">{(custody?.issued_amount || 0).toLocaleString("ar-SA")}</strong></div>
            <div><span className="text-muted-foreground">الغرض: </span><span className="truncate">{custody?.purpose}</span></div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
            <Calendar className="h-3 w-3" /> تاريخ ووقت الاعتماد: <strong>{now}</strong>
          </div>
        </div>

        {/* Signer Info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="flex items-center gap-1 mb-1"><User className="h-3.5 w-3.5" /> اسم الموقِّع *</Label>
            <Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="مثال: أحمد محمد" />
          </div>
          <div>
            <Label className="mb-1 block">المنصب / الصفة</Label>
            <Input value={signerTitle} onChange={e => setSignerTitle(e.target.value)} placeholder="مثال: المدير المالي" />
          </div>
          <div className="col-span-2">
            <Label className="mb-1 block">ملاحظة الاعتماد</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري: مثال — تمت المراجعة والاعتماد" />
          </div>
        </div>

        {/* Signature Pad */}
        <div>
          <Label className="flex items-center gap-1 mb-2"><PenLine className="h-3.5 w-3.5" /> التوقيع *</Label>
          <SignaturePad value={sig} onChange={setSig} width={400} height={140} />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>إلغاء</Button>
          <Button
            onClick={save}
            disabled={saving || !sig || !signerName}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4" />
            {saving ? "جاري الاعتماد..." : "اعتماد وتوقيع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}