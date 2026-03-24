import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Currencies() {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", symbol: "", unit_name: "", sub_unit: "", exchange_rate: 1, is_local: false });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await base44.entities.Currency.list();
    setCurrencies(data);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: "", symbol: "", unit_name: "", sub_unit: "", exchange_rate: 1, is_local: false });
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ name: item.name, symbol: item.symbol, unit_name: item.unit_name || "", sub_unit: item.sub_unit || "", exchange_rate: item.exchange_rate || 1, is_local: item.is_local || false });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editing) {
      await base44.entities.Currency.update(editing.id, form);
      toast.success("تم التحديث");
    } else {
      await base44.entities.Currency.create(form);
      toast.success("تم الإضافة");
    }
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(item) {
    if (confirm("هل أنت متأكد؟")) {
      await base44.entities.Currency.delete(item.id);
      toast.success("تم الحذف");
      loadData();
    }
  }

  const columns = [
    { key: "name", label: "اسم العملة" },
    { key: "symbol", label: "الرمز" },
    { key: "unit_name", label: "الوحدة" },
    { key: "sub_unit", label: "جزء العملة" },
    { key: "exchange_rate", label: "سعر التعادل" },
    { key: "is_local", label: "النوع", render: (val) => val ? <Badge>محلية</Badge> : <Badge variant="outline">أجنبية</Badge> },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="العملات" subtitle="إدارة العملات وأسعار الصرف" onAdd={openNew} addLabel="عملة جديدة" />
      <DataTable columns={columns} data={currencies} onEdit={openEdit} onDelete={handleDelete} emptyMessage="لا توجد عملات" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل العملة" : "عملة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>اسم العملة</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: دولار أمريكي" /></div>
              <div><Label>الرمز</Label><Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="مثال: USD" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>الوحدة</Label><Input value={form.unit_name} onChange={(e) => setForm({ ...form, unit_name: e.target.value })} placeholder="مثال: دولار" /></div>
              <div><Label>جزء العملة</Label><Input value={form.sub_unit} onChange={(e) => setForm({ ...form, sub_unit: e.target.value })} placeholder="مثال: سنت" /></div>
            </div>
            <div><Label>سعر التعادل</Label><Input type="number" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: parseFloat(e.target.value) || 0 })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_local} onCheckedChange={(v) => setForm({ ...form, is_local: v })} />
              <Label>عملة محلية</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.symbol}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}