import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, PackageCheck, FileText } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  "مسودة": "bg-gray-100 text-gray-700",
  "معتمد": "bg-blue-100 text-blue-700",
  "مستلم جزئياً": "bg-yellow-100 text-yellow-700",
  "مستلم كلياً": "bg-green-100 text-green-700",
  "ملغى": "bg-red-100 text-red-700",
};

const emptyForm = () => ({
  order_number: `PO-${Date.now().toString().slice(-6)}`,
  type: "أمر شراء", date: new Date().toISOString().split("T")[0],
  client_name: "", warehouse_id: "", warehouse_name: "",
  items: [], subtotal: 0, discount_value: 0, tax_amount: 0, total: 0,
  expected_date: "", notes: "", status: "مسودة",
});

export default function PurchaseOrdersList({ orders, products, warehouses, receipts, onRefresh }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

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
      return { ...f, items, subtotal, total: subtotal - (f.discount_value || 0) + (f.tax_amount || 0) };
    });
  }

  async function handleSave(status) {
    const data = { ...form, status: status || form.status };
    if (editing) await base44.entities.PurchaseOrder.update(editing.id, data);
    else await base44.entities.PurchaseOrder.create(data);
    toast.success("تم الحفظ");
    setDialogOpen(false);
    onRefresh();
  }

  async function handleDelete(o) {
    const linked = receipts.filter(r => r.purchase_order_id === o.id);
    if (linked.length > 0) { toast.error("لا يمكن حذف الأمر، يوجد طلبات استلام مرتبطة به"); return; }
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await base44.entities.PurchaseOrder.delete(o.id);
    toast.success("تم الحذف");
    onRefresh();
  }

  function openCreateReceipt(order) {
    setSelectedOrder(order);
    setReceiptDialogOpen(true);
  }

  async function createReceipt() {
    const receiptItems = selectedOrder.items.map(i => ({
      product_id: i.product_id,
      product_name: i.product_name,
      ordered_quantity: i.quantity,
      received_quantity: i.quantity,
      unit: i.unit,
      price: i.price,
      total: i.total,
      condition: "مطابق",
    }));
    const total = receiptItems.reduce((s, i) => s + (i.total || 0), 0);
    await base44.entities.GoodsReceipt.create({
      receipt_number: `GR-${Date.now().toString().slice(-6)}`,
      purchase_order_id: selectedOrder.id,
      purchase_order_number: selectedOrder.order_number,
      date: new Date().toISOString().split("T")[0],
      supplier_name: selectedOrder.client_name,
      warehouse_id: selectedOrder.warehouse_id,
      warehouse_name: selectedOrder.warehouse_name,
      items: receiptItems,
      subtotal: total,
      total,
      status: "مسودة",
      match_status: "غير محدد",
    });
    await base44.entities.PurchaseOrder.update(selectedOrder.id, { status: "مستلم جزئياً" });
    toast.success("تم إنشاء طلب الاستلام — انتقل إلى تبويب طلبات الاستلام");
    setReceiptDialogOpen(false);
    onRefresh();
  }

  const purchaseOrders = orders.filter(o => o.type === "أمر شراء");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">إجمالي {purchaseOrders.length} أمر شراء</p>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> أمر شراء جديد</Button>
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right font-medium">رقم الأمر</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">المورد</th>
                <th className="px-4 py-3 text-right font-medium">الإجمالي</th>
                <th className="px-4 py-3 text-right font-medium">استلامات</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">لا توجد أوامر شراء</td></tr>
              ) : purchaseOrders.map(o => {
                const orderReceipts = receipts.filter(r => r.purchase_order_id === o.id);
                return (
                  <tr key={o.id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-semibold">{o.order_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.date}</td>
                    <td className="px-4 py-3 font-medium">{o.client_name || "—"}</td>
                    <td className="px-4 py-3 font-semibold">{(o.total || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      {orderReceipts.length > 0
                        ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{orderReceipts.length} طلب</span>
                        : <span className="text-xs text-muted-foreground">لا يوجد</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[o.status] || STATUS_COLORS["مسودة"]}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(o)}>تعديل</Button>
                        {o.status === "معتمد" && (
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200 text-xs gap-1" onClick={() => openCreateReceipt(o)}>
                            <PackageCheck className="h-3.5 w-3.5" /> إنشاء استلام
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(o)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      {/* Order Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل أمر الشراء" : "أمر شراء جديد"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><Label>رقم الأمر</Label><Input value={form.order_number} onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} /></div>
            <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>تاريخ الاستلام المتوقع</Label><Input type="date" value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} /></div>
            <div className="col-span-2"><Label>المورد</Label><Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="اسم المورد" /></div>
            <div>
              <Label>المستودع</Label>
              <Select value={form.warehouse_id} onValueChange={v => { const w = warehouses.find(x => x.id === v); setForm(f => ({ ...f, warehouse_id: v, warehouse_name: w?.name || "" })); }}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">بنود الأمر</h3>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 ml-1" /> إضافة صنف</Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr>
                  <th className="p-2 text-right">الصنف</th>
                  <th className="p-2 text-right w-24">الكمية</th>
                  <th className="p-2 text-right w-28">السعر</th>
                  <th className="p-2 text-right w-24">الإجمالي</th>
                  <th className="p-2 w-8"></th>
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
                      <td className="p-2"><Input type="number" className="h-8" value={item.quantity} onChange={e => updateItem(idx, "quantity", +e.target.value)} /></td>
                      <td className="p-2"><Input type="number" className="h-8" value={item.price} onChange={e => updateItem(idx, "price", +e.target.value)} /></td>
                      <td className="p-2 font-medium">{(item.total || 0).toLocaleString()}</td>
                      <td className="p-2"><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setForm(f => { const items = f.items.filter((_, i) => i !== idx); const subtotal = items.reduce((s, i) => s + (i.total || 0), 0); return { ...f, items, subtotal, total: subtotal - (f.discount_value || 0) }; })}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                    </tr>
                  ))}
                  {form.items.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground py-4 text-sm">لا توجد بنود. أضف صنفاً</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-56 space-y-2 text-sm">
              <div className="flex justify-between"><span>المجموع:</span><span>{(form.subtotal || 0).toLocaleString()}</span></div>
              <div className="flex justify-between items-center">
                <span>خصم:</span>
                <Input type="number" className="h-7 w-24" value={form.discount_value} onChange={e => setForm(f => { const d = +e.target.value; return { ...f, discount_value: d, total: (f.subtotal || 0) - d }; })} />
              </div>
              <div className="flex justify-between font-bold border-t pt-2"><span>الإجمالي:</span><span>{(form.total || 0).toLocaleString()}</span></div>
            </div>
          </div>

          <div><Label>ملاحظات</Label><Input value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button variant="secondary" onClick={() => handleSave("مسودة")}><FileText className="h-4 w-4 ml-1" /> حفظ مسودة</Button>
            <Button onClick={() => handleSave("معتمد")}><PackageCheck className="h-4 w-4 ml-1" /> اعتماد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Create Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إنشاء طلب استلام</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            سيتم إنشاء طلب استلام من أمر الشراء <strong>{selectedOrder?.order_number}</strong> لـ <strong>{selectedOrder?.client_name}</strong> بـ {selectedOrder?.items?.length || 0} صنف.
          </p>
          <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">يمكنك تعديل الكميات المستلمة بعد الإنشاء في تبويب طلبات الاستلام.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>إلغاء</Button>
            <Button onClick={createReceipt}>إنشاء طلب الاستلام</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}