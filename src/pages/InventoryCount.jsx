import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function InventoryCount() {
  const [counts, setCounts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    count_number: "", date: new Date().toISOString().split("T")[0],
    warehouse_id: "", warehouse_name: "", type: "محضر جرد",
    items: [], notes: "", status: "مسودة",
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [c, w, p] = await Promise.all([
      base44.entities.InventoryCount.list("-created_date"),
      base44.entities.Warehouse.list(),
      base44.entities.Product.list(),
    ]);
    setCounts(c); setWarehouses(w); setProducts(p);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({
      count_number: String(counts.length + 1).padStart(4, "0"),
      date: new Date().toISOString().split("T")[0],
      warehouse_id: "", warehouse_name: "", type: "محضر جرد",
      items: [], notes: "", status: "مسودة",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    // Calculate surplus/deficit
    const items = form.items.map((i) => ({
      ...i,
      surplus: Math.max(0, (i.actual_quantity || 0) - (i.book_quantity || 0)),
      deficit: Math.max(0, (i.book_quantity || 0) - (i.actual_quantity || 0)),
    }));
    const payload = { ...form, items };
    if (editing) {
      await base44.entities.InventoryCount.update(editing.id, payload);
      toast.success("تم التحديث");
    } else {
      await base44.entities.InventoryCount.create(payload);
      toast.success("تم الإنشاء");
    }
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(item) {
    if (confirm("هل أنت متأكد؟")) {
      await base44.entities.InventoryCount.delete(item.id);
      toast.success("تم الحذف");
      loadData();
    }
  }

  const columns = [
    { key: "count_number", label: "الرقم" },
    { key: "date", label: "التاريخ" },
    { key: "warehouse_name", label: "المستودع" },
    { key: "type", label: "النوع", render: (v) => <Badge variant="outline">{v}</Badge> },
    { key: "status", label: "الحالة", render: (v) => <Badge variant={v === "معتمد" ? "default" : "secondary"}>{v}</Badge> },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="جرد المواد" subtitle="محاضر الجرد والتسويات الجردية" onAdd={openNew} addLabel="جرد جديد" />
      <DataTable columns={columns} data={counts} onEdit={(c) => { setEditing(c); setForm(c); setDialogOpen(true); }} onDelete={handleDelete} emptyMessage="لا توجد محاضر جرد" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل" : "إنشاء"} {form.type}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>الرقم</Label><Input value={form.count_number} readOnly /></div>
              <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div>
                <Label>النوع</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="محضر جرد">محضر جرد</SelectItem>
                    <SelectItem value="تسوية جردية">تسوية جردية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>المستودع</Label>
              <Select value={form.warehouse_id} onValueChange={(v) => { const w = warehouses.find((x) => x.id === v); setForm({ ...form, warehouse_id: v, warehouse_name: w?.name || "" }); }}>
                <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">الأصناف</Label>
              <Button variant="outline" size="sm" onClick={() => setForm((p) => ({ ...p, items: [...p.items, { product_id: "", product_name: "", book_quantity: 0, actual_quantity: 0, surplus: 0, deficit: 0 }] }))}>
                <Plus className="h-3.5 w-3.5 ml-1" /> إضافة صنف
              </Button>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2 items-end p-3 bg-muted/30 rounded-lg">
                <div className="col-span-2">
                  <Label className="text-xs">الصنف</Label>
                  <Select value={item.product_id} onValueChange={(v) => { const p = products.find((x) => x.id === v); const ni = [...form.items]; ni[idx] = { ...item, product_id: v, product_name: p?.name || "" }; setForm({ ...form, items: ni }); }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">الكمية الدفترية</Label><Input className="h-9" type="number" value={item.book_quantity} onChange={(e) => { const ni = [...form.items]; ni[idx] = { ...item, book_quantity: parseFloat(e.target.value) || 0 }; setForm({ ...form, items: ni }); }} /></div>
                <div><Label className="text-xs">الكمية الفعلية</Label><Input className="h-9" type="number" value={item.actual_quantity} onChange={(e) => { const ni = [...form.items]; ni[idx] = { ...item, actual_quantity: parseFloat(e.target.value) || 0 }; setForm({ ...form, items: ni }); }} /></div>
                <div className="flex items-end"><Button variant="ghost" size="icon" className="h-9 text-destructive" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}><Trash2 className="h-4 w-4" /></Button></div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button><Button onClick={handleSave}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}