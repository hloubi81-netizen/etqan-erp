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
import { Search, Printer } from "lucide-react";
import { toast } from "sonner";
import { printShipmentWaybill } from "@/utils/waybillPrint";

const STATUSES = ["تم الإنشاء", "قيد الشحن", "تم التسليم", "مرتجع", "مفقود"];
const STATUS_COLOR = { "تم الإنشاء": "secondary", "قيد الشحن": "default", "تم التسليم": "success", "مرتجع": "destructive", "مفقود": "destructive" };
const COD_STATUSES = ["غير محدد", "مستحق", "محصّل"];
const emptyForm = { tracking_number: "", carrier_id: "", ship_date: new Date().toISOString().split("T")[0], origin_city: "", destination_city: "", recipient_name: "", recipient_phone: "", recipient_email: "", weight: 0, declared_value: 0, shipping_cost: 0, cod_amount: 0, cod_status: "غير محدد", status: "تم الإنشاء", status_history: [], estimated_delivery: "", actual_delivery: "", linked_invoice_number: "", trip_id: "", notes: "" };

export default function ShipmentsTab() {
  const [items, setItems] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [s, c, t] = await Promise.all([
      base44.entities.Shipment.list(),
      base44.entities.ShippingCarrier.list(),
      base44.entities.ShippingTrip.list(),
    ]);
    setItems(s); setCarriers(c); setTrips(t); setLoading(false);
  }

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(r) { setEditing(r); setForm({ ...emptyForm, ...r }); setOpen(true); }

  function calcCost() {
    const carrier = carriers.find(c => c.id === form.carrier_id);
    const w = parseFloat(form.weight) || 0;
    if (!carrier || !carrier.rates || !w) { setForm({ ...form, shipping_cost: 0 }); return; }
    const tier = carrier.rates.find(r => w >= (r.weight_from || 0) && w <= (r.weight_to || Infinity));
    const cost = tier ? (tier.base_cost || 0) + w * (tier.per_kg_cost || 0) : 0;
    setForm({ ...form, shipping_cost: Math.round(cost * 100) / 100 });
  }

  async function save() {
    const carrier = carriers.find(c => c.id === form.carrier_id);
    const trip = trips.find(t => t.id === form.trip_id);
    const history = Array.isArray(editing?.status_history) ? [...editing.status_history] : [];
    if (!editing || editing.status !== form.status) {
      history.push({ status: form.status, date: new Date().toISOString().split("T")[0], note: "" });
    }
    const payload = {
      ...form,
      carrier_name: carrier?.name || "",
      trip_number: trip?.trip_number || "",
      weight: parseFloat(form.weight) || 0,
      declared_value: parseFloat(form.declared_value) || 0,
      shipping_cost: parseFloat(form.shipping_cost) || 0,
      cod_amount: parseFloat(form.cod_amount) || 0,
      status_history: history,
    };
    if (editing) { await base44.entities.Shipment.update(editing.id, payload); toast.success("تم تحديث الشحنة"); }
    else { await base44.entities.Shipment.create(payload); toast.success("تم إنشاء الشحنة"); }
    setOpen(false); load();
  }

  async function collectCod(r) {
    await base44.entities.Shipment.update(r.id, { cod_status: "محصّل" });
    toast.success("تم تسجيل تحصيل COD");
    load();
  }

  async function del(r) { if (confirm("حذف الشحنة؟")) { await base44.entities.Shipment.delete(r.id); toast.success("تم الحذف"); load(); } }

  const filtered = items.filter(s =>
    !q || (s.tracking_number || "").includes(q) || (s.recipient_name || "").includes(q) || (s.destination_city || "").includes(q));

  const columns = [
    { key: "tracking_number", label: "رقم التتبع" },
    { key: "carrier_name", label: "الشركة" },
    { key: "route", label: "المسار", render: (_, r) => `${r.origin_city || ""} ← ${r.destination_city || ""}` },
    { key: "recipient_name", label: "المستلم" },
    { key: "weight", label: "الوزن", render: (v) => v ? `${v} كغ` : "" },
    { key: "shipping_cost", label: "التكلفة", render: (v) => v ? v.toLocaleString() : "" },
    { key: "cod_amount", label: "COD", render: (v, r) => v ? (
      <div className="flex items-center gap-1">
        <Badge variant={r.cod_status === "محصّل" ? "success" : "warning"}>{v.toLocaleString()}</Badge>
        {r.cod_status === "مستحق" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => collectCod(r)}>تحصيل</Button>}
      </div>
    ) : "—" },
    { key: "status", label: "الحالة", render: (v) => <Badge variant={STATUS_COLOR[v] || "secondary"}>{v}</Badge> },
    { key: "_waybill", label: "بوليصة", render: (_, r) => <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => printShipmentWaybill(r.id).catch(() => toast.error("تعذّر إنشاء البوليصة"))}><Printer className="h-3.5 w-3.5" /> طباعة</Button> },
  ];

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
        <h3 className="font-semibold">الشحنات</h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} className="h-9 pr-8 w-48" />
          </div>
          <Button size="sm" onClick={openNew}>شحنة جديدة</Button>
        </div>
      </div>
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} emptyMessage="لا توجد شحنات" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل الشحنة" : "شحنة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>رقم التتبع *</Label><Input value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} /></div>
              <div><Label>تاريخ الشحن *</Label><Input type="date" value={form.ship_date} onChange={(e) => setForm({ ...form, ship_date: e.target.value })} /></div>
              <div><Label>شركة الشحن</Label>
                <Select value={form.carrier_id} onValueChange={(v) => setForm({ ...form, carrier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الشركة" /></SelectTrigger>
                  <SelectContent>{carriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الرحلة</Label>
                <Select value={form.trip_id} onValueChange={(v) => setForm({ ...form, trip_id: v })}>
                  <SelectTrigger><SelectValue placeholder="بدون رحلة" /></SelectTrigger>
                  <SelectContent>{trips.map(t => <SelectItem key={t.id} value={t.id}>{t.trip_number} — {t.route_from} ← {t.route_to}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>مدينة الإرسال</Label><Input value={form.origin_city} onChange={(e) => setForm({ ...form, origin_city: e.target.value })} /></div>
              <div><Label>مدينة الاستلام</Label><Input value={form.destination_city} onChange={(e) => setForm({ ...form, destination_city: e.target.value })} /></div>
              <div><Label>اسم المستلم</Label><Input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} /></div>
              <div><Label>هاتف المستلم</Label><Input value={form.recipient_phone} onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })} /></div>
              <div><Label>بريد المستلم (للإشعارات)</Label><Input type="email" value={form.recipient_email} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} /></div>
              <div><Label>مبلغ الدفع عند الاستلام (COD)</Label><Input type="number" value={form.cod_amount} onChange={(e) => setForm({ ...form, cod_amount: e.target.value })} /></div>
              <div><Label>حالة تحصيل COD</Label>
                <Select value={form.cod_status} onValueChange={(v) => setForm({ ...form, cod_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COD_STATUSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الوزن (كغ)</Label><Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
              <div><Label>القيمة المعلنة</Label><Input type="number" value={form.declared_value} onChange={(e) => setForm({ ...form, declared_value: e.target.value })} /></div>
              <div className="flex items-end gap-2">
                <div className="flex-1"><Label>تكلفة الشحن</Label><Input type="number" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })} /></div>
                <Button type="button" size="sm" variant="outline" onClick={calcCost} className="mb-0.5">احسب تلقائياً</Button>
              </div>
              <div><Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>التسليم المتوقع</Label><Input type="date" value={form.estimated_delivery} onChange={(e) => setForm({ ...form, estimated_delivery: e.target.value })} /></div>
              <div><Label>التسليم الفعلي</Label><Input type="date" value={form.actual_delivery} onChange={(e) => setForm({ ...form, actual_delivery: e.target.value })} /></div>
              <div><Label>الفاتورة المرتبطة</Label><Input value={form.linked_invoice_number} onChange={(e) => setForm({ ...form, linked_invoice_number: e.target.value })} /></div>
            </div>
            {(editing?.status_history?.length > 0) && (
              <div className="border rounded-lg p-3 bg-muted/30">
                <div className="text-sm font-medium mb-2">سجل حالات الشحنة</div>
                <div className="relative pr-4">
                  <div className="absolute right-[7px] top-1 bottom-1 w-px bg-border" />
                  <div className="space-y-2">
                    {(editing.status_history).map((h, i) => (
                      <div key={i} className="relative flex items-center gap-2 text-xs">
                        <span className="h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
                        <span className="text-muted-foreground">{h.date}</span>
                        <Badge variant={STATUS_COLOR[h.status] || "secondary"}>{h.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            {editing && <Button type="button" variant="secondary" onClick={() => printShipmentWaybill(editing.id).catch(() => toast.error("تعذّر إنشاء البوليصة"))}><Printer className="h-4 w-4" /> طباعة البوليصة</Button>}
            <Button onClick={save} disabled={!form.tracking_number || !form.ship_date}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}