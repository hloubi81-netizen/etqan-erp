import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

const DOC_TYPES = [
  "فاتورة مبيعات", "فاتورة مشتريات", "مرتجع مبيعات", "مرتجع مشتريات",
  "سند قبض", "سند دفع", "طلب شراء", "أخرى",
];

const empty = { name: "", document_type: "فاتورة مبيعات", is_active: true, description: "", steps: [] };

export default function ApprovalWorkflowForm({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editing ? { ...empty, ...editing } : empty);
  }, [editing, open]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addStep = () => setForm(f => ({ ...f, steps: [...(f.steps || []), { order: (f.steps?.length || 0) + 1, approver_name: "", min_amount: 0, notes: "" }] }));
  const updateStep = (i, k, v) => setForm(f => ({ ...f, steps: f.steps.map((s, idx) => idx === i ? { ...s, [k]: v } : s) }));
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editing?.id) await base44.entities.ApprovalWorkflow.update(editing.id, form);
      else await base44.entities.ApprovalWorkflow.create(form);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "تعديل مسار الاعتماد" : "مسار اعتماد جديد"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الاسم</Label>
              <Input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="مثال: اعتماد فواتير المبيعات الكبيرة" />
            </div>
            <div>
              <Label>نوع المستند</Label>
              <Select value={form.document_type} onValueChange={v => setField("document_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>الوصف</Label>
            <Input value={form.description || ""} onChange={e => setField("description", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={v => setField("is_active", v)} />
            <Label>نشط</Label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>خطوات الاعتماد</Label>
              <Button size="sm" variant="outline" onClick={addStep} className="gap-1 h-7"><Plus className="h-3.5 w-3.5" /> إضافة خطوة</Button>
            </div>
            <div className="space-y-2">
              {(form.steps || []).map((s, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">{i + 1}</div>
                  <Input className="flex-1" placeholder="اسم المعتمد / الدور" value={s.approver_name || ""} onChange={e => updateStep(i, "approver_name", e.target.value)} />
                  <Input className="w-28" type="number" placeholder="حد المبلغ" value={s.min_amount || ""} onChange={e => updateStep(i, "min_amount", Number(e.target.value))} />
                  <Button size="icon" variant="ghost" onClick={() => removeStep(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              {(form.steps || []).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">أضف خطوات الاعتماد المتسلسلة</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving || !form.name}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}