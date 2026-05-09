import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  "مسودة": "bg-gray-100 text-gray-700",
  "مستلم": "bg-blue-100 text-blue-700",
  "مطابق": "bg-green-100 text-green-700",
  "به فروقات": "bg-yellow-100 text-yellow-700",
  "ملغى": "bg-red-100 text-red-700",
};
const MATCH_ICONS = {
  "مطابق": <CheckCircle2 className="h-4 w-4 text-green-600" />,
  "فرق في الكمية": <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  "فرق في السعر": <AlertTriangle className="h-4 w-4 text-orange-600" />,
  "فرق مزدوج": <XCircle className="h-4 w-4 text-red-600" />,
  "غير محدد": <span className="h-4 w-4 rounded-full bg-gray-300 inline-block" />,
};

export default function GoodsReceiptList({ receipts, orders, onRefresh }) {
  const [editDialog, setEditDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);

  function openEdit(r) {
    setEditing(r);
    setForm({ ...r, items: r.items ? [...r.items.map(i => ({ ...i }))] : [] });
    setEditDialog(true);
  }

  function updateReceivedQty(idx, val) {
    setForm(f => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const received = parseFloat(val) || 0;
        return { ...it, received_quantity: received, total: received * (it.price || 0) };
      });
      const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
      return { ...f, items, subtotal, total: subtotal };
    });
  }

  function updateCondition(idx, val) {
    setForm(f => {
      const items = f.items.map((it, i) => i !== idx ? it : { ...it, condition: val });
      return { ...f, items };
    });
  }

  async function handleSave() {
    await base44.entities.GoodsReceipt.update(editing.id, { ...form, status: "مستلم" });
    toast.success("تم تأكيد الاستلام");
    setEditDialog(false);
    onRefresh();
  }

  async function handleDelete(r) {
    if (!confirm("هل تريد حذف طلب الاستلام؟")) return;
    await base44.entities.GoodsReceipt.delete(r.id);
    toast.success("تم الحذف");
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">إجمالي {receipts.length} طلب استلام</p>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right font-medium">رقم الطلب</th>
                <th className="px-4 py-3 text-right font-medium">أمر الشراء</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">المورد</th>
                <th className="px-4 py-3 text-right font-medium">المستودع</th>
                <th className="px-4 py-3 text-center font-medium">المطابقة</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">لا توجد طلبات استلام. أنشئ طلباً من أمر شراء معتمد.</td></tr>
              ) : receipts.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono font-semibold">{r.receipt_number}</td>
                  <td className="px-4 py-3 text-blue-700 font-medium">{r.purchase_order_number || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3">{r.supplier_name || "—"}</td>
                  <td className="px-4 py-3">{r.warehouse_name || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {MATCH_ICONS[r.match_status || "غير محدد"]}
                      <span className="text-xs">{r.match_status || "غير محدد"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[r.status] || STATUS_COLORS["مسودة"]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>تفاصيل</Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(r)}>حذف</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل طلب الاستلام — {editing?.receipt_number}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">أمر الشراء</p>
                  <p className="font-semibold text-blue-700">{form.purchase_order_number}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">المورد</p>
                  <p className="font-semibold">{form.supplier_name}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">المستودع</p>
                  <p className="font-semibold">{form.warehouse_name}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">تفاصيل الكميات المستلمة</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-right">الصنف</th>
                        <th className="p-2 text-center w-24">مطلوبة</th>
                        <th className="p-2 text-center w-24">مستلمة</th>
                        <th className="p-2 text-center w-24">السعر</th>
                        <th className="p-2 text-center w-28">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items?.map((item, idx) => {
                        const diff = (item.received_quantity || 0) - (item.ordered_quantity || 0);
                        return (
                          <tr key={idx} className="border-t">
                            <td className="p-2 font-medium">{item.product_name}</td>
                            <td className="p-2 text-center text-muted-foreground">{item.ordered_quantity} {item.unit}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                className={`h-8 text-center ${diff < 0 ? "border-red-300" : diff > 0 ? "border-blue-300" : "border-green-300"}`}
                                value={item.received_quantity}
                                onChange={e => updateReceivedQty(idx, e.target.value)}
                              />
                              {diff !== 0 && <p className={`text-[10px] text-center mt-0.5 ${diff < 0 ? "text-red-500" : "text-blue-500"}`}>{diff > 0 ? "+" : ""}{diff}</p>}
                            </td>
                            <td className="p-2 text-center">{(item.price || 0).toLocaleString()}</td>
                            <td className="p-2">
                              <Select value={item.condition || "مطابق"} onValueChange={v => updateCondition(idx, v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="مطابق">✅ مطابق</SelectItem>
                                  <SelectItem value="تالف جزئي">⚠️ تالف جزئي</SelectItem>
                                  <SelectItem value="مرفوض">❌ مرفوض</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div><Label>ملاحظات</Label><Input value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave}>تأكيد الاستلام</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}