import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, Package, Calendar, FileText, Warehouse,
  ShoppingCart, Save, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAppSettings } from "@/hooks/useAppSettings.jsx";

function generateReceiptNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `GR-${y}${m}${d}-${rand}`;
}

export default function QuickGoodsReceipt() {
  const { getSection } = useAppSettings();
  const warehouseSettings = getSection("warehouse");

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const [form, setForm] = useState({
    date: today,
    invoice_id: "",
    invoice_number: "",
    supplier_name: "",
    warehouse_id: "",
    warehouse_name: "",
    quickItem: { product_id: "", quantity: 1, price: 0 },
    items: [],
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [p, w, invs] = await Promise.all([
      base44.entities.Product.list("name", 500),
      base44.entities.Warehouse.list("name", 100),
      base44.entities.Invoice.filter({ pattern_type: "مشتريات", status: "مرحّلة" }, "-created_date", 100),
    ]);
    setProducts(p || []);
    setWarehouses(w || []);
    setPurchaseInvoices(invs || []);
  };

  const selectInvoice = (invId) => {
    const inv = purchaseInvoices.find(i => i.id === invId);
    if (inv) {
      setForm(f => ({
        ...f,
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        supplier_name: inv.client_name || "",
        warehouse_id: inv.warehouse_id || f.warehouse_id,
        warehouse_name: inv.warehouse_name || f.warehouse_name,
      }));
    }
  };

  const addItem = () => {
    const { product_id, quantity, price } = form.quickItem;
    if (!product_id || !quantity) return;
    const prod = products.find(p => p.id === product_id);
    const item = {
      product_id,
      product_name: prod?.name || "",
      received_quantity: Number(quantity),
      unit: prod?.units?.[0]?.name || "",
      price: Number(price) || 0,
      total: Number(quantity) * (Number(price) || 0),
      condition: "مطابق",
    };
    setForm(f => ({
      ...f,
      items: [...f.items, item],
      quickItem: { product_id: "", quantity: 1, price: 0 },
    }));
  };

  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const subtotal = form.items.reduce((s, i) => s + (i.total || 0), 0);

  const handleSave = async () => {
    if (warehouseSettings.requireWarehouse && !form.warehouse_id) { toast.error("اختيار المستودع إلزامي حسب إعدادات النظام"); return; }
    if (!form.warehouse_id) { toast.error("اختر المستودع أولاً"); return; }
    if (!form.items.length) { toast.error("أضف صنفاً واحداً على الأقل"); return; }

    setLoading(true);
    try {
      await base44.entities.GoodsReceipt.create({
        receipt_number: generateReceiptNumber(),
        purchase_order_id: "",
        purchase_order_number: "",
        date: form.date,
        supplier_name: form.supplier_name,
        warehouse_id: form.warehouse_id,
        warehouse_name: form.warehouse_name,
        linked_invoice_id: form.invoice_id,
        linked_invoice_number: form.invoice_number,
        items: form.items,
        subtotal,
        total: subtotal,
        status: "مستلم",
        match_status: "غير محدد",
        notes: form.notes,
      });
      toast.success("تم استلام البضائع وتحديث المخزون");
      setSaved(true);
      resetForm();
    } catch (e) { toast.error("حدث خطأ أثناء الحفظ"); }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      date: today,
      invoice_id: "",
      invoice_number: "",
      supplier_name: "",
      warehouse_id: "",
      warehouse_name: "",
      quickItem: { product_id: "", quantity: 1, price: 0 },
      items: [],
      notes: "",
    });
  };

  const newReceipt = () => {
    setSaved(false);
    resetForm();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {saved ? (
        <div className="text-center py-16">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">تم استلام البضائع بنجاح</h3>
          <p className="text-gray-500 mb-6">تم تحديث كميات المخزون تلقائياً</p>
          <Button onClick={newReceipt} className="gap-2">
            <Plus className="h-4 w-4" /> استلام بضائع جديدة
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> فاتورة المورد
                </Label>
                <Select value={form.invoice_id} onValueChange={selectInvoice}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="اختر فاتورة مشتريات..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {purchaseInvoices.map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} — {inv.client_name || "بدون مورد"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> تاريخ الاستلام
                </Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  <ShoppingCart className="h-3.5 w-3.5" /> المورد
                </Label>
                <Input
                  value={form.supplier_name}
                  onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}
                  className="h-10"
                  placeholder="اسم المورد"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  <Warehouse className="h-3.5 w-3.5" /> المستودع
                </Label>
                <Select value={form.warehouse_id} onValueChange={v => {
                  const wh = warehouses.find(w => w.id === v);
                  setForm(f => ({ ...f, warehouse_id: v, warehouse_name: wh?.name || "" }));
                }}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Add Item */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 space-y-3">
                <Label className="text-sm text-blue-700 font-semibold flex items-center gap-1">
                  <Package className="h-4 w-4" /> إضافة صنف سريع
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-5">
                    <Select value={form.quickItem.product_id} onValueChange={v => setForm(f => ({ ...f, quickItem: { ...f.quickItem, product_id: v } }))}>
                      <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="اختر الصنف..." /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {products.filter(p => !p.is_service).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.item_code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="الكمية"
                      value={form.quickItem.quantity}
                      onChange={e => setForm(f => ({ ...f, quickItem: { ...f.quickItem, quantity: Number(e.target.value) || 1 } }))}
                      className="h-10 bg-white text-center"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="سعر الوحدة"
                      value={form.quickItem.price || ""}
                      onChange={e => setForm(f => ({ ...f, quickItem: { ...f.quickItem, price: e.target.value ? Number(e.target.value) : 0 } }))}
                      className="h-10 bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={addItem} disabled={!form.quickItem.product_id} className="h-10 w-full gap-1">
                      <Plus className="h-4 w-4" /> إضافة
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            {form.items.length > 0 && (
              <div>
                <Label className="text-xs text-gray-500 mb-2 block">
                  الأصناف المضافة ({form.items.length})
                </Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-right">#</th>
                        <th className="p-2 text-right">الصنف</th>
                        <th className="p-2 text-center w-20">الكمية</th>
                        <th className="p-2 text-center w-20">الوحدة</th>
                        <th className="p-2 text-center w-28">السعر</th>
                        <th className="p-2 text-center w-28">الإجمالي</th>
                        <th className="p-2 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="p-2 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="p-2 font-medium">{item.product_name}</td>
                          <td className="p-2 text-center">{item.received_quantity}</td>
                          <td className="p-2 text-center text-gray-500">{item.unit}</td>
                          <td className="p-2 text-center">{item.price?.toLocaleString()}</td>
                          <td className="p-2 text-center font-medium">{item.total?.toLocaleString()}</td>
                          <td className="p-2 text-center">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center mt-2 px-2">
                  <div className="space-y-1.5 flex-1 max-w-xs">
                    <Input
                      placeholder="ملاحظات..."
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-500">المجموع</p>
                    <p className="text-xl font-bold text-gray-800">{subtotal.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Summary + Save */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-gray-700">ملخص الاستلام</h3>
                <div className="space-y-2 text-sm">
                  {form.invoice_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">رقم الفاتورة</span>
                      <span className="font-mono font-bold text-blue-700">{form.invoice_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">المورد</span>
                    <span className="font-medium">{form.supplier_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">المستودع</span>
                    <span className="font-medium">{form.warehouse_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">التاريخ</span>
                    <span className="font-medium">{form.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">عدد الأصناف</span>
                    <span className="font-bold">{form.items.length}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg font-bold">
                    <span>الإجمالي</span>
                    <span className="text-blue-700">{subtotal.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSave}
              disabled={!form.items.length || loading}
              className="w-full h-12 text-base gap-2 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              حفظ واستلام البضائع
            </Button>

            <p className="text-xs text-gray-400 text-center">
              سيتم تحديث كميات المخزون فور الحفظ
            </p>
          </div>
        </div>
      )}
    </div>
  );
}