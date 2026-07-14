import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const emptyForm = { name: "", code: "", contact_person: "", phone: "", email: "", tracking_url: "", account_number: "", rates: [], is_active: true, notes: "" };

export default function CarriersTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await base44.entities.ShippingCarrier.list();
    setItems(data);
    setLoading(false);
  }

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(r) { setEditing(r); setForm({ ...emptyForm, ...r }); setOpen(true); }

  async function save() {
    if (editing) { await base44.entities.ShippingCarrier.update(editing.id, form); toast.success("تم تحديث الشركة"); }
    else { await base44.entities.ShippingCarrier.create(form); toast.success("تم إضافة الشركة"); }
    setOpen(false); load();
  }

  async function del(r) { if (confirm("حذف الشركة؟")) { await base44.entities.ShippingCarrier.delete(r.id); toast.success("تم الحذف"); load(); } }

  function updateRate(i, field, val) {
    const rates = [...(form.rates || [])];
    rates[i] = { ...rates[i], [field]: field === "zone" ? val : (parseFloat(val) || 0) };
    setForm({ ...form, rates });
  }
  function addRate() { setForm({ ...form, rates: [...(form.rates || []), { zone: "", weight_from: 0, weight_to: 0, base_cost: 0, per_kg_cost: 0 }] }); }
  function removeRate(i) { const rates = [...(form.rates || [])]; rates.splice(i, 1); setForm({ ...form, rates }); }

  const columns = [
    { key: "code", label: "الرمز" },
    { key: "name", label: "اسم الشركة" },
    { key: "contact_person", label: "مسؤول التواصل" },
    { key: "phone", label: "الهاتف" },
    { key: "rates", label: "تعريفات", render: (v) => (v && v.length ? `${v.length} شريحة` : "—") },
  ];

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">شركات الشحن والتعريفات</h3>
        <Button size="sm" onClick={openNew}>شركة جديدة</Button>
      </div>
      <DataTable columns={columns} data={items} onEdit={openEdit} onDelete={del} emptyMessage="لا توجد شركات شحن" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل الشركة" : "شركة شحن جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>اسم الشركة *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>الرمز</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>مسؤول التواصل</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>البريد الإلكتروني</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>رقم الحساب</Label><Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></div>
            </div>
            <div><Label>رابط التتبع (استخدم {`{tracking_number}`})</Label><Input value={form.tracking_url} onChange={(e) => setForm({ ...form, tracking_url: e.target.value })} placeholder="https://carrier.com/track?q={tracking_number}" /></div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label>تعريفة الأسعار</Label>
                <Button type="button" size="sm" variant="outline" onClick={addRate}><Plus className="h-4 w-4 ml-1" /> شريحة</Button>
              </div>
              <div className="space-y-2">
                {(form.rates || []).map((r, i) => (
                  <div key={i} className="grid grid-cols-6 gap-1.5 items-end border rounded-lg p-2 bg-muted/30">
                    <div><Label className="text-[10px]">المنطقة</Label><Input value={r.zone} onChange={(e) => updateRate(i, "zone", e.target.value)} className="h-8 text-xs" /></div>
                    <div><Label className="text-[10px]">وزن من</Label><Input type="number" value={r.weight_from} onChange={(e) => updateRate(i, "weight_from", e.target.value)} className="h-8 text-xs" /></div>
                    <div><Label className="text-[10px]">وزن إلى</Label><Input type="number" value={r.weight_to} onChange={(e) => updateRate(i, "weight_to", e.target.value)} className="h-8 text-xs" /></div>
                    <div><Label className="text-[10px]">تكلفة أساس</Label><Input type="number" value={r.base_cost} onChange={(e) => updateRate(i, "base_cost", e.target.value)} className="h-8 text-xs" /></div>
                    <div><Label className="text-[10px]">لكل كغ</Label><Input type="number" value={r.per_kg_cost} onChange={(e) => updateRate(i, "per_kg_cost", e.target.value)} className="h-8 text-xs" /></div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeRate(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {(!form.rates || form.rates.length === 0) && <p className="text-xs text-muted-foreground">لا توجد شرائح تسعير بعد.</p>}
              </div>
            </div>

            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>نشطة</Label></div>
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