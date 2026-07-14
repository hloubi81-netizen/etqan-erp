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

const TYPES = ["كشف", "متابعة", "استشارة", "تطعيم", "إجراء"];
const STATUSES = ["محجوز", "مكتمل", "ملغى", "غائب"];
const STATUS_COLOR = { "محجوز": "default", "مكتمل": "success", "ملغى": "destructive", "غائب": "secondary" };
const emptyForm = { patient_id: "", date: new Date().toISOString().split("T")[0], time: "", doctor_name: "", type: "كشف", status: "محجوز", notes: "" };

export default function AppointmentsTab() {
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    const [a, p] = await Promise.all([base44.entities.Appointment.list(), base44.entities.Patient.list()]);
    setItems(a); setPatients(p); setLoading(false);
  }

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(r) { setEditing(r); setForm({ ...emptyForm, ...r }); setOpen(true); }

  async function save() {
    const patient = patients.find(p => p.id === form.patient_id);
    const payload = { ...form, patient_name: patient?.name || "" };
    if (editing) { await base44.entities.Appointment.update(editing.id, payload); toast.success("تم تحديث الموعد"); }
    else { await base44.entities.Appointment.create(payload); toast.success("تم حجز الموعد"); }
    setOpen(false); load();
  }
  async function del(r) { if (confirm("حذف الموعد؟")) { await base44.entities.Appointment.delete(r.id); toast.success("تم الحذف"); load(); } }

  const columns = [
    { key: "patient_name", label: "المريض" },
    { key: "date", label: "التاريخ" },
    { key: "time", label: "الوقت" },
    { key: "doctor_name", label: "الطبيب" },
    { key: "type", label: "النوع" },
    { key: "status", label: "الحالة", render: (v) => <Badge variant={STATUS_COLOR[v] || "secondary"}>{v}</Badge> },
  ];

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">المواعيد</h3>
        <Button size="sm" onClick={openNew}>موعد جديد</Button>
      </div>
      <DataTable columns={columns} data={items} onEdit={openEdit} onDelete={del} emptyMessage="لا توجد مواعيد" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "تعديل الموعد" : "موعد جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>المريض *</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} {p.phone ? `— ${p.phone}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>التاريخ *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>الوقت</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
              <div><Label>الطبيب</Label><Input value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></div>
              <div><Label>النوع</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
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