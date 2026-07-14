import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { toast } from "sonner";

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const emptyForm = { code: "", name: "", phone: "", gender: "ذكر", birth_date: "", blood_type: "", address: "", insurance_provider: "", insurance_number: "", notes: "" };

export default function PatientsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await base44.entities.Patient.list();
    setItems(data); setLoading(false);
  }

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(r) { setEditing(r); setForm({ ...emptyForm, ...r }); setOpen(true); }

  async function save() {
    if (editing) { await base44.entities.Patient.update(editing.id, form); toast.success("تم تحديث المريض"); }
    else { await base44.entities.Patient.create(form); toast.success("تم إضافة المريض"); }
    setOpen(false); load();
  }
  async function del(r) { if (confirm("حذف المريض؟")) { await base44.entities.Patient.delete(r.id); toast.success("تم الحذف"); load(); } }

  const filtered = items.filter(p => !q || (p.name || "").includes(q) || (p.phone || "").includes(q) || (p.code || "").includes(q));
  const columns = [
    { key: "code", label: "الرمز" },
    { key: "name", label: "اسم المريض" },
    { key: "phone", label: "الهاتف" },
    { key: "gender", label: "الجنس" },
    { key: "birth_date", label: "تاريخ الميلاد" },
    { key: "insurance_provider", label: "التأمين" },
  ];

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
        <h3 className="font-semibold">المرضى</h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} className="h-9 pr-8 w-48" />
          </div>
          <Button size="sm" onClick={openNew}>مريض جديد</Button>
        </div>
      </div>
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} emptyMessage="لا يوجد مرضى" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل المريض" : "مريض جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الرمز</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>الجنس</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ذكر">ذكر</SelectItem><SelectItem value="أنثى">أنثى</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>تاريخ الميلاد</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
              <div><Label>فصيلة الدم</Label>
                <Select value={form.blood_type} onValueChange={(v) => setForm({ ...form, blood_type: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{BLOOD.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>شركة التأمين</Label><Input value={form.insurance_provider} onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })} /></div>
              <div><Label>رقم التأمين</Label><Input value={form.insurance_number} onChange={(e) => setForm({ ...form, insurance_number: e.target.value })} /></div>
            </div>
            <div><Label>العنوان</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={!form.name}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}