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

const TYPES = ["شاحنة", "سيارة", "دراجة نارية", "مركبة ثقيلة"];
const STATUSES = ["متاحة", "في رحلة", "صيانة"];
const emptyForm = { plate_number: "", type: "شاحنة", model: "", capacity_kg: 0, driver_id: "", status: "متاحة", purchase_date: "", notes: "" };

export default function VehiclesTab() {
  const [items, setItems] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    const [v, d] = await Promise.all([base44.entities.Vehicle.list(), base44.entities.Driver.list()]);
    setItems(v); setDrivers(d); setLoading(false);
  }

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(r) { setEditing(r); setForm({ ...emptyForm, ...r }); setOpen(true); }

  async function save() {
    const driver = drivers.find(d => d.id === form.driver_id);
    const payload = { ...form, capacity_kg: parseFloat(form.capacity_kg) || 0, driver_name: driver?.name || "" };
    if (editing) { await base44.entities.Vehicle.update(editing.id, payload); toast.success("تم تحديث المركبة"); }
    else { await base44.entities.Vehicle.create(payload); toast.success("تم إضافة المركبة"); }
    setOpen(false); load();
  }

  async function del(r) { if (confirm("حذف المركبة؟")) { await base44.entities.Vehicle.delete(r.id); toast.success("تم الحذف"); load(); } }

  const columns = [
    { key: "plate_number", label: "رقم اللوحة" },
    { key: "type", label: "النوع" },
    { key: "model", label: "الموديل" },
    { key: "capacity_kg", label: "الحمولة", render: (v) => v ? `${v} كغ` : "" },
    { key: "driver_name", label: "السائق" },
    { key: "status", label: "الحالة", render: (v) => <Badge variant={v === "متاحة" ? "success" : v === "في رحلة" ? "default" : "destructive"}>{v}</Badge> },
  ];

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">الأسطول</h3>
        <Button size="sm" onClick={openNew}>مركبة جديدة</Button>
      </div>
      <DataTable columns={columns} data={items} onEdit={openEdit} onDelete={del} emptyMessage="لا توجد مركبات" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "تعديل المركبة" : "مركبة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>رقم اللوحة *</Label><Input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} /></div>
              <div><Label>النوع</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الموديل</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
              <div><Label>الحمولة (كغ)</Label><Input type="number" value={form.capacity_kg} onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })} /></div>
              <div><Label>السائق</Label>
                <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
                  <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>تاريخ الشراء</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
            </div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={!form.plate_number}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}