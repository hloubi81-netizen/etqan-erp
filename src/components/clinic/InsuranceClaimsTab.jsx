import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const STATUSES = ["قيد المراجعة", "مقبولة", "مرفوضة", "مدفوعة"];
const STATUS_COLOR = { "قيد المراجعة": "secondary", "مقبولة": "success", "مرفوضة": "destructive", "مدفوعة": "default" };
const emptyForm = { claim_number: "", patient_id: "", insurance_provider: "", date: new Date().toISOString().split("T")[0], amount: 0, approved_amount: 0, status: "قيد المراجعة", notes: "" };

export default function InsuranceClaimsTab() {
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    const [c, p] = await Promise.all([base44.entities.InsuranceClaim.list(), base44.entities.Patient.list()]);
    setItems(c); setPatients(p); setLoading(false);
  }

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(r) { setEditing(r); setForm({ ...emptyForm, ...r }); setOpen(true); }

  async function save() {
    const patient = patients.find(p => p.id === form.patient_id);
    const payload = { ...form, patient_name: patient?.name || "", insurance_provider: form.insurance_provider || patient?.insurance_provider || "", amount: parseFloat(form.amount) || 0, approved_amount: parseFloat(form.approved_amount) || 0 };
    if (editing) { await base44.entities.InsuranceClaim.update(editing.id, payload); toast.success("تم تحديث المطالبة"); }
    else { await base44.entities.InsuranceClaim.create(payload); toast.success("تم إنشاء المطالبة"); }
    setOpen(false); load();
  }
  async function del(r) { if (confirm("حذف المطالبة؟")) { await base44.entities.InsuranceClaim.delete(r.id); toast.success("تم الحذف"); load(); } }

  const columns = [
    { key: "claim_number", label: "رقم المطالبة" },
    { key: "patient_name", label: "المريض" },
    { key: "insurance_provider", label: "شركة التأمين" },
    { key: "date", label: "التاريخ" },
    { key: "amount", label: "المبلغ", render: (v) => (v || 0).toLocaleString() },
    { key: "approved_amount", label: "المعتمد", render: (v) => (v || 0).toLocaleString() },
    { key: "status", label: "الحالة", render: (v) => <Badge variant={STATUS_COLOR[v] || "secondary"}>{v}</Badge> },
  ];

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">مطالبات التأمين الصحي</h3>
        <Button size="sm" onClick={openNew}>مطالبة جديدة</Button>
      </div>
      <DataTable columns={columns} data={items} onEdit={openEdit} onDelete={del} emptyMessage="لا توجد مطالبات" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "تعديل المطالبة" : "مطالبة تأمين جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>المريض</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>رقم المطالبة *</Label><Input value={form.claim_number} onChange={(e) => setForm({ ...form, claim_number: e.target.value })} /></div>
              <div><Label>شركة التأمين</Label><Input value={form.insurance_provider} onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })} /></div>
              <div><Label>التاريخ *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>المبلغ المطالب به</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>المبلغ المعتمد</Label><Input type="number" value={form.approved_amount} onChange={(e) => setForm({ ...form, approved_amount: e.target.value })} /></div>
            </div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={!form.claim_number || !form.date}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}