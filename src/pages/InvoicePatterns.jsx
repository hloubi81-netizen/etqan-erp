import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function InvoicePatterns() {
  const [patterns, setPatterns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", type: "مبيعات", sales_account_id: "", discount_account_id: "",
    default_warehouse_id: "", cost_center_id: "", cost_center_enabled: false,
    tax_rate: 0, start_date: "", end_date: "", default_currency: "",
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [p, a, w, cc, c] = await Promise.all([
      base44.entities.InvoicePattern.list().catch(() => []),
      base44.entities.Account.list().catch(() => []),
      base44.entities.Warehouse.list().catch(() => []),
      base44.entities.CostCenter.list().catch(() => []),
      base44.entities.Currency.list().catch(() => []),
    ]);
    setPatterns(p); setAccounts(a); setWarehouses(w); setCostCenters(cc); setCurrencies(c);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: "", type: "مبيعات", sales_account_id: "", discount_account_id: "", default_warehouse_id: "", cost_center_id: "", cost_center_enabled: false, tax_rate: 0, start_date: "", end_date: "", default_currency: "" });
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ ...item });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editing) {
      await base44.entities.InvoicePattern.update(editing.id, form);
      toast.success("تم التحديث");
    } else {
      await base44.entities.InvoicePattern.create(form);
      toast.success("تم الإنشاء");
    }
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(item) {
    if (confirm("هل أنت متأكد؟")) {
      await base44.entities.InvoicePattern.delete(item.id);
      toast.success("تم الحذف");
      loadData();
    }
  }

  const columns = [
    { key: "name", label: "اسم النمط" },
    { key: "type", label: "نوع الفاتورة", render: (v) => <Badge variant="outline">{v}</Badge> },
    { key: "tax_rate", label: "الضريبة %", render: (v) => v ? `${v}%` : "-" },
    { key: "cost_center_enabled", label: "مركز كلفة", render: (v) => v ? "مفعّل" : "معطّل" },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="أنماط الفواتير" subtitle="تعريف أنماط الفواتير وحساباتها" onAdd={openNew} addLabel="نمط جديد" />
      <DataTable columns={columns} data={patterns} onEdit={openEdit} onDelete={handleDelete} emptyMessage="لا توجد أنماط" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل النمط" : "نمط جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>اسم النمط</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label>نوع الفاتورة</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["مبيعات", "مشتريات", "مرتجع مبيعات", "مرتجع مشتريات", "رصيد أول المدة"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>حساب المبيعات/المشتريات</Label>
                <Select value={form.sales_account_id} onValueChange={(v) => setForm({ ...form, sales_account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>حساب الحسم</Label>
                <Select value={form.discount_account_id} onValueChange={(v) => setForm({ ...form, discount_account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>المستودع الافتراضي</Label>
                <Select value={form.default_warehouse_id} onValueChange={(v) => setForm({ ...form, default_warehouse_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                  <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>نسبة الضريبة %</Label><Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>تاريخ البداية</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>تاريخ النهاية</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.cost_center_enabled} onCheckedChange={(v) => setForm({ ...form, cost_center_enabled: v })} />
              <Label>تفعيل مركز الكلفة</Label>
            </div>
            {form.cost_center_enabled && (
              <div>
                <Label>مركز الكلفة</Label>
                <Select value={form.cost_center_id} onValueChange={(v) => setForm({ ...form, cost_center_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{costCenters.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>العملة الافتراضية</Label>
              <Select value={form.default_currency} onValueChange={(v) => setForm({ ...form, default_currency: v })}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{currencies.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button><Button onClick={handleSave} disabled={!form.name}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}