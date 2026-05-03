import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Bell, BellOff, AlertTriangle, Package, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { product_id: "", product_name: "", warehouse_id: "", warehouse_name: "", min_quantity: 0, max_quantity: 0, reorder_quantity: 0, is_active: true };

export default function StockAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventoryCounts, setInventoryCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.StockAlert.list(),
      base44.entities.Product.list(),
      base44.entities.Warehouse.list(),
      base44.entities.InventoryCount.filter({ status: "معتمد" }),
    ]).then(([a, p, w, ic]) => { setAlerts(a); setProducts(p); setWarehouses(w); setInventoryCounts(ic); setLoading(false); });
  }, []);

  // Calculate current stock from inventory counts
  function getCurrentStock(productId, warehouseId) {
    let stock = 0;
    inventoryCounts.forEach((ic) => {
      if (!warehouseId || ic.warehouse_id === warehouseId) {
        const item = ic.items?.find((i) => i.product_id === productId);
        if (item) stock = item.actual_quantity || item.book_quantity || 0;
      }
    });
    return stock;
  }

  function getAlertLevel(alert) {
    const stock = getCurrentStock(alert.product_id, alert.warehouse_id);
    if (stock <= alert.min_quantity) return "critical";
    if (stock <= alert.min_quantity * 1.5) return "warning";
    if (alert.max_quantity > 0 && stock >= alert.max_quantity) return "overstock";
    return "ok";
  }

  function openAdd() { setForm(EMPTY); setEditing(null); setOpen(true); }
  function openEdit(a) { setForm({ ...a }); setEditing(a.id); setOpen(true); }

  async function save() {
    if (!form.product_id || !form.warehouse_id) { toast.error("المنتج والمستودع مطلوبان"); return; }
    if (editing) {
      await base44.entities.StockAlert.update(editing, form);
      setAlerts((p) => p.map((a) => a.id === editing ? { ...a, ...form } : a));
    } else {
      const created = await base44.entities.StockAlert.create(form);
      setAlerts((p) => [created, ...p]);
    }
    toast.success("تم الحفظ");
    setOpen(false);
  }

  async function toggleActive(alert) {
    await base44.entities.StockAlert.update(alert.id, { is_active: !alert.is_active });
    setAlerts((p) => p.map((a) => a.id === alert.id ? { ...a, is_active: !a.is_active } : a));
  }

  async function del(id) {
    if (!confirm("حذف هذا التنبيه؟")) return;
    await base44.entities.StockAlert.delete(id);
    setAlerts((p) => p.filter((a) => a.id !== id));
  }

  const critical = alerts.filter((a) => a.is_active && getAlertLevel(a) === "critical").length;
  const warning = alerts.filter((a) => a.is_active && getAlertLevel(a) === "warning").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">تنبيهات المخزون</h1>
          <p className="text-sm text-muted-foreground mt-1">تحديد حدود التنبيه لمستويات المخزون</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />إضافة تنبيه</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          ["تنبيهات حرجة", critical, "bg-red-500", AlertTriangle],
          ["تحذيرات", warning, "bg-yellow-500", Bell],
          ["إجمالي التنبيهات", alerts.filter((a) => a.is_active).length, "bg-blue-600", Package],
        ].map(([lbl, val, bg, Icon]) => (
          <Card key={lbl}><CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 ${bg} rounded-xl flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
            <div><p className="text-xs text-muted-foreground">{lbl}</p><p className="text-xl font-bold">{val}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : alerts.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">لا توجد تنبيهات. أضف تنبيهاً لمتابعة مستويات المخزون.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["المنتج","المستودع","الحد الأدنى","الحد الأقصى","كمية الطلب","الحالة الحالية","مفعّل","إجراءات"].map((h) => (
                  <th key={h} className="p-3 text-right text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {alerts.map((alert) => {
                  const level = getAlertLevel(alert);
                  const stock = getCurrentStock(alert.product_id, alert.warehouse_id);
                  const levelConfig = {
                    critical: { label: "حرج", variant: "destructive", icon: "🔴" },
                    warning: { label: "تحذير", variant: "secondary", icon: "🟡" },
                    overstock: { label: "فائض", variant: "outline", icon: "🔵" },
                    ok: { label: "طبيعي", variant: "default", icon: "🟢" },
                  }[level];
                  return (
                    <tr key={alert.id} className={`border-t border-border hover:bg-muted/20 ${!alert.is_active ? "opacity-50" : ""}`}>
                      <td className="p-3 font-medium">{alert.product_name}</td>
                      <td className="p-3 text-xs text-muted-foreground">{alert.warehouse_name}</td>
                      <td className="p-3 text-red-600 font-semibold">{alert.min_quantity}</td>
                      <td className="p-3 text-blue-600">{alert.max_quantity || "—"}</td>
                      <td className="p-3 text-orange-600">{alert.reorder_quantity || "—"}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span>{levelConfig.icon}</span>
                          <Badge variant={levelConfig.variant} className="text-xs">{levelConfig.label}</Badge>
                        </div>
                      </td>
                      <td className="p-3"><Switch checked={!!alert.is_active} onCheckedChange={() => toggleActive(alert)} /></td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(alert)} className="text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => del(alert.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل تنبيه" : "إضافة تنبيه مخزون"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">المنتج*</Label>
              <Select value={form.product_id} onValueChange={(v) => { const p = products.find((x) => x.id === v); setForm((f) => ({ ...f, product_id: v, product_name: p?.name || "" })); }}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="اختر منتجاً" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">المستودع*</Label>
              <Select value={form.warehouse_id} onValueChange={(v) => { const w = warehouses.find((x) => x.id === v); setForm((f) => ({ ...f, warehouse_id: v, warehouse_name: w?.name || "" })); }}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="اختر مستودعاً" /></SelectTrigger>
                <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">الحد الأدنى*</Label><Input type="number" value={form.min_quantity} onChange={(e) => setForm((p) => ({ ...p, min_quantity: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
              <div><Label className="text-xs">الحد الأقصى</Label><Input type="number" value={form.max_quantity} onChange={(e) => setForm((p) => ({ ...p, max_quantity: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
              <div><Label className="text-xs">كمية الطلب</Label><Input type="number" value={form.reorder_quantity} onChange={(e) => setForm((p) => ({ ...p, reorder_quantity: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
              <Label className="text-xs">تفعيل التنبيه</Label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={save} className="flex-1">حفظ</Button>
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}