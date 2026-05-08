import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ShoppingCart, PackageCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";

const STATUS_COLORS = {
  "مسودة": "secondary", "معتمد": "default", "مستلم جزئياً": "outline",
  "مستلم كلياً": "default", "ملغى": "destructive"
};

const emptyForm = () => ({
  order_number: `PO-${Date.now()}`,
  type: "أمر شراء", date: new Date().toISOString().split("T")[0],
  client_name: "", warehouse_id: "", warehouse_name: "",
  items: [], subtotal: 0, discount_value: 0, tax_amount: 0, total: 0,
  expected_date: "", notes: "", status: "مسودة"
});

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [o, p, w] = await Promise.all([
      base44.entities.PurchaseOrder.list("-created_date"),
      base44.entities.Product.list(),
      base44.entities.Warehouse.list()
    ]);
    setOrders(o); setProducts(p); setWarehouses(w);
    setLoading(false);
  }

  function openNew() { setEditing(null); setForm(emptyForm()); setDialogOpen(true); }
  function openEdit(o) { setEditing(o); setForm({ ...o }); setDialogOpen(true); }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { product_id: "", product_name: "", quantity: 1, unit: "", price: 0, total: 0, received_quantity: 0 }] }));
  }

  function updateItem(idx, key, val) {
    setForm(f => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [key]: val };
        if (key === "product_id") {
          const p = products.find(x => x.id === val);
          if (p) { updated.product_name = p.name; updated.price = p.wholesale_price || 0; updated.unit = p.units?.[0]?.name || ""; }
        }
        updated.total = (updated.quantity || 0) * (updated.price || 0);
        return updated;
      });
      const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
      const total = subtotal - (f.discount_value || 0) + (f.tax_amount || 0);
      return { ...f, items, subtotal, total };
    });
  }

  function removeItem(idx) {
    setForm(f => {
      const items = f.items.filter((_, i) => i !== idx);
      const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
      return { ...f, items, subtotal, total: subtotal - (f.discount_value || 0) + (f.tax_amount || 0) };
    });
  }

  async function handleSave(status = form.status) {
    const data = { ...form, status };
    if (editing) await base44.entities.PurchaseOrder.update(editing.id, data);
    else await base44.entities.PurchaseOrder.create(data);
    toast.success("تم الحفظ");
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(o) {
    await base44.entities.PurchaseOrder.delete(o.id);
    toast.success("تم الحذف");
    loadData();
  }

  const columns = [
    { key: "order_number", label: "رقم الأمر" },
    { key: "type", label: "النوع" },
    { key: "date", label: "التاريخ" },
    { key: "client_name", label: "العميل/المورد" },
    { key: "total", label: "الإجمالي", render: v => (v || 0).toLocaleString() },
    { key: "status", label: "الحالة", render: v => <Badge variant={STATUS_COLORS[v] || "secondary"}>{v}</Badge> }
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="أوامر الشراء وعروض الأسعار" subtitle="إدارة طلبات الشراء وعروض أسعار المبيعات" onAdd={openNew} addLabel="أمر جديد" />
      <DataTable columns={columns} data={orders} onEdit={openEdit} onDelete={handleDelete} emptyMessage="لا توجد أوامر" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل الأمر" : "أمر جديد"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>رقم الأمر</Label>
              <Input value={form.order_number} onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} />
            </div>
            <div>
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="أمر شراء">أمر شراء</SelectItem>
                  <SelectItem value="عرض سعر مبيعات">عرض سعر مبيعات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label>العميل / المورد</Label>
              <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="اسم العميل أو المورد" />
            </div>
            <div>
              <Label>المستودع</Label>
              <Select value={form.warehouse_id} onValueChange={v => { const w = warehouses.find(x => x.id === v); setForm(f => ({ ...f, warehouse_id: v, warehouse_name: w?.name || "" })); }}>
                <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الاستلام المتوقع</Label>
              <Input type="date" value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} />
            </div>
          </div>

          {/* Items */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">البنود</h3>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 ml-1" /> إضافة صنف</Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr>
                  <th className="p-2 text-right">الصنف</th><th className="p-2 text-right">الكمية</th>
                  <th className="p-2 text-right">السعر</th><th className="p-2 text-right">الإجمالي</th><th className="p-2"></th>
                </tr></thead>
                <tbody>
                  {form.items.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">
                        <Select value={item.product_id} onValueChange={v => updateItem(idx, "product_id", v)}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="اختر صنف" /></SelectTrigger>
                          <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="p-2"><Input type="number" className="h-8 w-20" value={item.quantity} onChange={e => updateItem(idx, "quantity", +e.target.value)} /></td>
                      <td className="p-2"><Input type="number" className="h-8 w-24" value={item.price} onChange={e => updateItem(idx, "price", +e.target.value)} /></td>
                      <td className="p-2 font-medium">{(item.total || 0).toLocaleString()}</td>
                      <td className="p-2"><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {form.items.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">لا توجد بنود</p>}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mt-3">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between"><span>المجموع:</span><span>{(form.subtotal || 0).toLocaleString()}</span></div>
              <div className="flex justify-between items-center">
                <span>خصم:</span>
                <Input type="number" className="h-7 w-24 text-left" value={form.discount_value} onChange={e => setForm(f => { const d = +e.target.value; return { ...f, discount_value: d, total: (f.subtotal || 0) - d + (f.tax_amount || 0) }; })} />
              </div>
              <div className="flex justify-between font-bold border-t pt-2"><span>الإجمالي:</span><span>{(form.total || 0).toLocaleString()}</span></div>
            </div>
          </div>

          <div>
            <Label>ملاحظات</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button variant="secondary" onClick={() => handleSave("مسودة")}><FileText className="h-4 w-4 ml-1" />حفظ كمسودة</Button>
            <Button onClick={() => handleSave("معتمد")}><PackageCheck className="h-4 w-4 ml-1" />اعتماد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}