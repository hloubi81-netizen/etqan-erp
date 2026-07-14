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

const STATUSES = ["مجدولة", "قيد التنفيذ", "مكتملة", "ملغاة"];
const STATUS_COLOR = { "مجدولة": "secondary", "قيد التنفيذ": "default", "مكتملة": "success", "ملغاة": "destructive" };
const emptyForm = { trip_number: "", date: new Date().toISOString().split("T")[0], driver_id: "", vehicle_id: "", route_from: "", route_to: "", status: "مجدولة", start_time: "", end_time: "", notes: "" };

export default function TripsTab() {
  const [items, setItems] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    const [t, d, v, s] = await Promise.all([
      base44.entities.ShippingTrip.list(),
      base44.entities.Driver.list(),
      base44.entities.Vehicle.list(),
      base44.entities.Shipment.list(),
    ]);
    setItems(t); setDrivers(d); setVehicles(v); setShipments(s); setLoading(false);
  }

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(r) { setEditing(r); setForm({ ...emptyForm, ...r }); setOpen(true); }

  async function save() {
    const driver = drivers.find(d => d.id === form.driver_id);
    const vehicle = vehicles.find(v => v.id === form.vehicle_id);
    const linked = shipments.filter(s => s.trip_id === (editing?.id || ""));
    const payload = { ...form, driver_name: driver?.name || "", vehicle_plate: vehicle?.plate_number || "", shipments_count: linked.length };
    if (editing) { await base44.entities.ShippingTrip.update(editing.id, payload); toast.success("تم تحديث الرحلة"); }
    else { await base44.entities.ShippingTrip.create(payload); toast.success("تم إنشاء الرحلة"); }
    setOpen(false); load();
  }

  async function del(r) { if (confirm("حذف الرحلة؟")) { await base44.entities.ShippingTrip.delete(r.id); toast.success("تم الحذف"); load(); } }

  const columns = [
    { key: "trip_number", label: "رقم الرحلة" },
    { key: "date", label: "التاريخ" },
    { key: "route", label: "المسار", render: (_, r) => `${r.route_from || ""} ← ${r.route_to || ""}` },
    { key: "driver_name", label: "السائق" },
    { key: "vehicle_plate", label: "المركبة" },
    { key: "shipments_count", label: "الشحنات", render: (v) => v || 0 },
    { key: "status", label: "الحالة", render: (v) => <Badge variant={STATUS_COLOR[v] || "secondary"}>{v}</Badge> },
  ];

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">رحلات الشحن</h3>
        <Button size="sm" onClick={openNew}>رحلة جديدة</Button>
      </div>
      <DataTable columns={columns} data={items} onEdit={openEdit} onDelete={del} emptyMessage="لا توجد رحلات" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "تعديل الرحلة" : "رحلة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>رقم الرحلة *</Label><Input value={form.trip_number} onChange={(e) => setForm({ ...form, trip_number: e.target.value })} /></div>
              <div><Label>التاريخ *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>السائق</Label>
                <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر السائق" /></SelectTrigger>
                  <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>المركبة</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المركبة" /></SelectTrigger>
                  <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>من</Label><Input value={form.route_from} onChange={(e) => setForm({ ...form, route_from: e.target.value })} /></div>
              <div><Label>إلى</Label><Input value={form.route_to} onChange={(e) => setForm({ ...form, route_to: e.target.value })} /></div>
              <div><Label>وقت البدء</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
              <div><Label>وقت الانتهاء</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
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
            <Button onClick={save} disabled={!form.trip_number || !form.date}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}