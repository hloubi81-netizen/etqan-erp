import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    transfer_number: "", date: new Date().toISOString().split("T")[0],
    from_warehouse_id: "", from_warehouse_name: "",
    to_warehouse_id: "", to_warehouse_name: "",
    notes: "", items: [],
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [t, w, p] = await Promise.all([
      base44.entities.StockTransfer.list("-created_date"),
      base44.entities.Warehouse.list(),
      base44.entities.Product.list(),
    ]);
    setTransfers(t);
    setWarehouses(w);
    setProducts(p);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({
      transfer_number: String(transfers.length + 1).padStart(4, "0"),
      date: new Date().toISOString().split("T")[0],
      from_warehouse_id: "", from_warehouse_name: "",
      to_warehouse_id: "", to_warehouse_name: "",
      notes: "", items: [],
    });
    setDialogOpen(true);
  }

  function addItem() {
    setForm((p) => ({ ...p, items: [...p.items, { product_id: "", product_name: "", quantity: 0, weight: 0, unit: "" }] }));
  }

  async function handleSave() {
    if (editing) {
      await base44.entities.StockTransfer.update(editing.id, form);
      toast.success("تم التحديث");
    } else {
      await base44.entities.StockTransfer.create(form);
      toast.success("تم إنشاء المناقلة");
    }
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(item) {
    if (confirm("هل أنت متأكد؟")) {
      await base44.entities.StockTransfer.delete(item.id);
      toast.success("تم الحذف");
      loadData();
    }
  }

  const columns = [
    { key: "transfer_number", label: "رقم المناقلة" },
    { key: "date", label: "التاريخ" },
    { key: "from_warehouse_name", label: "من المستودع" },
    { key: "to_warehouse_name", label: "إلى المستودع" },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="المناقلات" subtitle="مناقلات المواد بين المستودعات" onAdd={openNew} addLabel="مناقلة جديدة" />
      <DataTable columns={columns} data={transfers} onEdit={(t) => { setEditing(t); setForm(t); setDialogOpen(true); }} onDelete={handleDelete} emptyMessage="لا توجد مناقلات" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل" : "إنشاء"} مناقلة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>رقم المناقلة</Label><Input value={form.transfer_number} readOnly /></div>
              <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>من المستودع</Label>
                <Select value={form.from_warehouse_id} onValueChange={(v) => { const w = warehouses.find((x) => x.id === v); setForm({ ...form, from_warehouse_id: v, from_warehouse_name: w?.name || "" }); }}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>إلى المستودع</Label>
                <Select value={form.to_warehouse_id} onValueChange={(v) => { const w = warehouses.find((x) => x.id === v); setForm({ ...form, to_warehouse_id: v, to_warehouse_name: w?.name || "" }); }}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">المواد</Label>
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 ml-1" /> إضافة مادة</Button>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2 items-end p-3 bg-muted/30 rounded-lg">
                <div className="col-span-2">
                  <Label className="text-xs">الصنف</Label>
                  <Select value={item.product_id} onValueChange={(v) => { const p = products.find((x) => x.id === v); const newItems = [...form.items]; newItems[idx] = { ...item, product_id: v, product_name: p?.name || "" }; setForm({ ...form, items: newItems }); }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">الكمية</Label><Input className="h-9" type="number" value={item.quantity} onChange={(e) => { const newItems = [...form.items]; newItems[idx] = { ...item, quantity: parseFloat(e.target.value) || 0 }; setForm({ ...form, items: newItems }); }} /></div>
                <div><Label className="text-xs">الوزن</Label><Input className="h-9" type="number" value={item.weight} onChange={(e) => { const newItems = [...form.items]; newItems[idx] = { ...item, weight: parseFloat(e.target.value) || 0 }; setForm({ ...form, items: newItems }); }} /></div>
                <div className="flex items-end"><Button variant="ghost" size="icon" className="h-9 text-destructive" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}><Trash2 className="h-4 w-4" /></Button></div>
              </div>
            ))}
            <div><Label>البيان</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button><Button onClick={handleSave}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}