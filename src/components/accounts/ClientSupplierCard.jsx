import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { User, Building2, MapPin, Phone, Mail, FileText, CreditCard, Hash } from "lucide-react";
import { toast } from "sonner";

export default function ClientSupplierCard({ open, onClose, account, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({
    account_id: "",
    account_number: "",
    account_name: "",
    type: "عميل",
    tax_number: "",
    commercial_register: "",
    address: "",
    city: "",
    credit_limit: 0,
    payment_terms: "",
    contact_person: "",
    contact_phone: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    if (account && open) {
      loadExisting();
    }
  }, [account, open]);

  async function loadExisting() {
    try {
      const list = await base44.entities.ClientSupplier.filter({ account_id: account.id });
      if (list.length > 0) {
        const cs = list[0];
        setExisting(cs);
        setForm({
          account_id: account.id,
          account_number: account.account_number || "",
          account_name: account.name || "",
          type: cs.type || detectType(account),
          tax_number: cs.tax_number || "",
          commercial_register: cs.commercial_register || "",
          address: cs.address || "",
          city: cs.city || "",
          credit_limit: cs.credit_limit || 0,
          payment_terms: cs.payment_terms || "",
          contact_person: cs.contact_person || "",
          contact_phone: cs.contact_phone || "",
          email: cs.email || "",
          notes: cs.notes || "",
        });
      } else {
        setExisting(null);
        setForm({
          account_id: account.id,
          account_number: account.account_number || "",
          account_name: account.name || "",
          type: detectType(account),
          tax_number: "",
          commercial_register: "",
          address: "",
          city: "",
          credit_limit: 0,
          payment_terms: "",
          contact_person: "",
          contact_phone: "",
          email: "",
          notes: "",
        });
      }
    } catch (e) {
      setExisting(null);
    }
  }

  function detectType(acc) {
    if (!acc) return "عميل";
    // Check account number prefix: 1221 = عملاء, 2211 = موردون
    const num = acc.account_number || "";
    if (num.startsWith("1221") || num.startsWith("122")) return "عميل";
    if (num.startsWith("2211") || num.startsWith("221")) return "مورد";
    return "عميل";
  }

  async function handleSave() {
    setLoading(true);
    try {
      if (existing) {
        await base44.entities.ClientSupplier.update(existing.id, form);
        toast.success("تم تحديث بطاقة العميل / المورد بنجاح");
      } else {
        await base44.entities.ClientSupplier.create(form);
        toast.success("تم حفظ بطاقة العميل / المورد بنجاح");
      }
      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {existing ? "تعديل بطاقة العميل / المورد" : "بطاقة عميل / مورد جديدة"}
          </DialogTitle>
          {account && (
            <p className="text-sm text-muted-foreground">
              {account.account_number} - {account.name}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="عميل">عميل</SelectItem>
                  <SelectItem value="مورد">مورد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />الرقم الضريبي</Label>
              <Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />السجل التجاري</Label>
              <Input value={form.commercial_register} onChange={(e) => setForm({ ...form, commercial_register: e.target.value })} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />حد الائتمان</Label>
              <Input type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />العنوان</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>المدينة</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>شروط الدفع</Label>
              <Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} placeholder="مثال: 30 يوم" />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-1">
              <User className="h-4 w-4" />الشخص المسؤول
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الاسم</Label>
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />الهاتف</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} dir="ltr" />
              </div>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />البريد الإلكتروني</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
          </div>

          <div>
            <Label>ملاحظات</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "جاري الحفظ..." : existing ? "تحديث" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}