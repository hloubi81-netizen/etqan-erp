import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const emptyForm = { patient_id: "", date: new Date().toISOString().split("T")[0], doctor_name: "", items: [], notes: "" };

export default function PrescriptionsTab() {
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, list] = await Promise.all([base44.entities.Patient.list(), base44.entities.Prescription.list()]);
    setPatients(p); setItems(list); setLoading(false);
  }

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(r) { setEditing(r); setForm({ ...emptyForm, ...r }); setOpen(true); }

  function updateItem(i, field, val) {
    const arr = [...(form.items || [])];
    arr[i] = { ...arr[i], [field]: val };
    setForm({ ...form, items: arr });
  }
  function addItem() { setForm({ ...form, items: [...(form.items || []), { medicine: "", dosage: "", duration: "", instructions: "" }] }); }
  function removeItem(i) { const arr = [...(form.items || [])]; arr.splice(i, 1); setForm({ ...form, items: arr }); }

  async function save() {
    const patient = patients.find(p => p.id === form.patient_id);
    const payload = { ...form, patient_name: patient?.name || "" };
    if (editing) { await base44.entities.Prescription.update(editing.id, payload); toast.success("تم تحديث الوصفة"); }
    else { await base44.entities.Prescription.create(payload); toast.success("تم إضافة الوصفة"); }
    setOpen(false); load();
  }
  async function del(r) { if (confirm("حذف الوصفة؟")) { await base44.entities.Prescription.delete(r.id); toast.success("تم الحذف"); load(); } }

  const columns = [
    { key: "patient_name", label: "المريض" },
    { key: "date", label: "التاريخ" },
    { key: "doctor_name", label: "الطبيب" },
    { key: "items", label: "عدد الأدوية", render: (v) => (v && v.length) || 0 },
  ];

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">الوصفات الطبية</h3>
        <Button size="sm" onClick={openNew}>وصفة جديدة</Button>
      </div>
      <DataTable columns={columns} data={items} onEdit={openEdit} onDelete={del} emptyMessage="لا توجد وصفات" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل الوصفة" : "وصفة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>المريض *</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>التاريخ *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>الطبيب</Label><Input value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label>الأدوية</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 ml-1" /> دواء</Button>
              </div>
              <div className="space-y-2">
                {(form.items || []).map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 items-end border rounded-lg p-2 bg-muted/30">
                    <div className="col-span-4"><Label className="text-[10px]">الدواء</Label><Input value={it.medicine} onChange={(e) => updateItem(i, "medicine", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-3"><Label className="text-[10px]">الجرعة</Label><Input value={it.dosage} onChange={(e) => updateItem(i, "dosage", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">المدة</Label><Input value={it.duration} onChange={(e) => updateItem(i, "duration", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">تعليمات</Label><Input value={it.instructions} onChange={(e) => updateItem(i, "instructions", e.target.value)} className="h-8 text-xs" /></div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {(!form.items || form.items.length === 0) && <p className="text-xs text-muted-foreground">لا توجد أدوية بعد.</p>}
              </div>
            </div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={!form.patient_id || !form.date}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}