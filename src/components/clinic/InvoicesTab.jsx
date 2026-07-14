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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["مسودة", "مدفوعة", "غير مدفوعة", "مطالبة تأمين"];
const STATUS_COLOR = { "مسودة": "secondary", "مدفوعة": "success", "غير مدفوعة": "destructive", "مطالبة تأمين": "default" };
const TAX_RATE = 0;
const emptyForm = { invoice_number: "", patient_id: "", date: new Date().toISOString().split("T")[0], services: [], tax: TAX_RATE, paid: 0, status: "مسودة", insurance_claim_id: "", notes: "" };

export default function InvoicesTab() {
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    const [i, p, c] = await Promise.all([base44.entities.ClinicInvoice.list(), base44.entities.Patient.list(), base44.entities.InsuranceClaim.list()]);
    setItems(i); setPatients(p); setClaims(c); setLoading(false);
  }

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(r) { setEditing(r); setForm({ ...emptyForm, ...r }); setOpen(true); }

  function updateService(i, field, val) {
    const arr = [...(form.services || [])];
    arr[i] = { ...arr[i], [field]: field === "description" ? val : (parseFloat(val) || 0) };
    if (field === "quantity" || field === "price") arr[i].total = (arr[i].quantity || 0) * (arr[i].price || 0);
    setForm({ ...form, services: arr });
  }
  function addService() { setForm({ ...form, services: [...(form.services || []), { description: "", quantity: 1, price: 0, total: 0 }] }); }
  function removeService(i) { const arr = [...(form.services || [])]; arr.splice(i, 1); setForm({ ...form, services: arr }); }

  const subtotal = (form.services || []).reduce((s, it) => s + (it.total || 0), 0);
  const taxAmt = subtotal * ((parseFloat(form.tax) || 0) / 100);
  const total = subtotal + taxAmt;
  const remaining = Math.max(0, total - (parseFloat(form.paid) || 0));

  async function save() {
    const patient = patients.find(p => p.id === form.patient_id);
    const payload = { ...form, patient_name: patient?.name || "", subtotal, total, remaining, paid: parseFloat(form.paid) || 0, tax: parseFloat(form.tax) || 0 };
    if (editing) { await base44.entities.ClinicInvoice.update(editing.id, payload); toast.success("تم تحديث الفاتورة"); }
    else { await base44.entities.ClinicInvoice.create(payload); toast.success("تم إنشاء الفاتورة"); }
    setOpen(false); load();
  }
  async function del(r) { if (confirm("حذف الفاتورة؟")) { await base44.entities.ClinicInvoice.delete(r.id); toast.success("تم الحذف"); load(); } }

  const columns = [
    { key: "invoice_number", label: "رقم الفاتورة" },
    { key: "patient_name", label: "المريض" },
    { key: "date", label: "التاريخ" },
    { key: "total", label: "الإجمالي", render: (v) => (v || 0).toLocaleString() },
    { key: "remaining", label: "المتبقي", render: (v) => (v || 0).toLocaleString() },
    { key: "status", label: "الحالة", render: (v) => <Badge variant={STATUS_COLOR[v] || "secondary"}>{v}</Badge> },
  ];

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">فوترة العيادة</h3>
        <Button size="sm" onClick={openNew}>فاتورة جديدة</Button>
      </div>
      <DataTable columns={columns} data={items} onEdit={openEdit} onDelete={del} emptyMessage="لا توجد فواتير" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل الفاتورة" : "فاتورة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>رقم الفاتورة *</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></div>
              <div><Label>التاريخ *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>المريض</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>مطالبة التأمين</Label>
                <Select value={form.insurance_claim_id} onValueChange={(v) => setForm({ ...form, insurance_claim_id: v })}>
                  <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
                  <SelectContent>{claims.map(c => <SelectItem key={c.id} value={c.id}>{c.claim_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label>الخدمات</Label>
                <Button type="button" size="sm" variant="outline" onClick={addService}><Plus className="h-4 w-4 ml-1" /> خدمة</Button>
              </div>
              <div className="space-y-2">
                {(form.services || []).map((s, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 items-end border rounded-lg p-2 bg-muted/30">
                    <div className="col-span-5"><Label className="text-[10px]">الوصف</Label><Input value={s.description} onChange={(e) => updateService(i, "description", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">الكمية</Label><Input type="number" value={s.quantity} onChange={(e) => updateService(i, "quantity", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">السعر</Label><Input type="number" value={s.price} onChange={(e) => updateService(i, "price", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">الإجمالي</Label><Input value={(s.total || 0).toLocaleString()} readOnly className="h-8 text-xs bg-muted" /></div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeService(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {(!form.services || form.services.length === 0) && <p className="text-xs text-muted-foreground">لا توجد خدمات بعد.</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>المجموع</Label><Input value={subtotal.toLocaleString()} readOnly className="bg-muted" /></div>
              <div><Label>الضريبة (%)</Label><Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></div>
              <div><Label>الإجمالي</Label><Input value={total.toLocaleString()} readOnly className="bg-muted font-semibold" /></div>
              <div><Label>المدفوع</Label><Input type="number" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} /></div>
              <div><Label>المتبقي</Label><Input value={remaining.toLocaleString()} readOnly className="bg-muted" /></div>
            </div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={!form.invoice_number || !form.date}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}