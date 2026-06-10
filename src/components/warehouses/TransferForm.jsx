import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { calcCurrentStock } from "@/utils/inventoryEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowDown, AlertTriangle, Zap } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  transfer_number: "", date: new Date().toISOString().split("T")[0],
  from_warehouse_id: "", from_warehouse_name: "", from_branch_id: "", from_branch_name: "",
  to_warehouse_id: "", to_warehouse_name: "", to_branch_id: "", to_branch_name: "",
  status: "مسودة", notes: "", items: [],
};

export default function TransferForm({ open, onClose, editing, warehouses, branches, products, transfersCount, onSaved }) {
  const [form, setForm] = useState(() =>
    editing ? { ...EMPTY_FORM, ...editing } :
    { ...EMPTY_FORM, transfer_number: String(transfersCount + 1).padStart(4, "0") }
  );
  const [saving, setSaving] = useState(false);
  const [stockCache, setStockCache] = useState({});

  // جلب رصيد الصنف في مستودع المصدر
  async function getProductStock(productId, warehouseId) {
    const key = `${productId}_${warehouseId}`;
    if (stockCache[key] !== undefined) return stockCache[key];
    const [allInvoices, allTransfers] = await Promise.all([
      base44.entities.Invoice.filter({ status: "مرحّلة" }).catch(() => []),
      base44.entities.StockTransfer.list().catch(() => []),
    ]);
    const qty = calcCurrentStock(productId, warehouseId, allInvoices, allTransfers);
    setStockCache(prev => ({ ...prev, [key]: qty }));
    return qty;
  }

  function selectWarehouse(side, warehouseId) {
    const w = warehouses.find(x => x.id === warehouseId);
    const b = branches.find(x => x.id === w?.branch_id);
    if (side === "from") {
      setForm(f => ({ ...f, from_warehouse_id: warehouseId, from_warehouse_name: w?.name || "", from_branch_id: w?.branch_id || "", from_branch_name: b?.name || "" }));
      setStockCache({}); // clear cache on warehouse change
    } else {
      setForm(f => ({ ...f, to_warehouse_id: warehouseId, to_warehouse_name: w?.name || "", to_branch_id: w?.branch_id || "", to_branch_name: b?.name || "" }));
    }
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { product_id: "", product_name: "", quantity: 0, unit: "", notes: "", available_qty: null }] }));
  }

  async function updateItem(idx, field, value) {
    const items = [...form.items];
    if (field === "product_id") {
      const p = products.find(x => x.id === value);
      items[idx] = { ...items[idx], product_id: value, product_name: p?.name || "", unit: p?.units?.[0]?.name || "", available_qty: null };
      // جلب الرصيد تلقائياً
      if (form.from_warehouse_id && value) {
        const qty = await getProductStock(value, form.from_warehouse_id);
        items[idx].available_qty = qty;
      }
    } else {
      items[idx] = { ...items[idx], [field]: value };
    }
    setForm(f => ({ ...f, items }));
  }

  async function applyTransfer(transferData) {
    // تحديث المخزون: إنشاء سجلي InventoryCount (خصم من المصدر + إضافة للهدف)
    const today = transferData.date || new Date().toISOString().split("T")[0];
    const [allInvoices, allTransfers] = await Promise.all([
      base44.entities.Invoice.filter({ status: "مرحّلة" }).catch(() => []),
      base44.entities.StockTransfer.list().catch(() => []),
    ]);

    // حساب الأرصدة الحالية
    const fromItems = transferData.items.map(item => {
      const current = calcCurrentStock(item.product_id, transferData.from_warehouse_id, allInvoices, allTransfers);
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        book_quantity: current,
        actual_quantity: Math.max(0, current - (item.quantity || 0)),
        surplus: 0,
        deficit: item.quantity || 0,
      };
    });

    const toItems = transferData.items.map(item => {
      const current = calcCurrentStock(item.product_id, transferData.to_warehouse_id, allInvoices, allTransfers);
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        book_quantity: current,
        actual_quantity: current + (item.quantity || 0),
        surplus: item.quantity || 0,
        deficit: 0,
      };
    });

    await Promise.all([
      base44.entities.InventoryCount.create({
        count_number: `TR-OUT-${transferData.transfer_number}-${Date.now()}`,
        date: today,
        warehouse_id: transferData.from_warehouse_id,
        warehouse_name: transferData.from_warehouse_name,
        type: "تسوية جردية",
        status: "معتمد",
        notes: `مناقلة مخزون صادرة #${transferData.transfer_number} → ${transferData.to_warehouse_name}`,
        items: fromItems,
      }),
      base44.entities.InventoryCount.create({
        count_number: `TR-IN-${transferData.transfer_number}-${Date.now()}`,
        date: today,
        warehouse_id: transferData.to_warehouse_id,
        warehouse_name: transferData.to_warehouse_name,
        type: "تسوية جردية",
        status: "معتمد",
        notes: `مناقلة مخزون واردة #${transferData.transfer_number} ← ${transferData.from_warehouse_name}`,
        items: toItems,
      }),
    ]);
  }

  async function handleSave(autoComplete = false) {
    if (!form.from_warehouse_id || !form.to_warehouse_id) {
      toast.error("يرجى تحديد المستودع المصدر والهدف");
      return;
    }
    if (form.from_warehouse_id === form.to_warehouse_id) {
      toast.error("المستودع المصدر والهدف لا يمكن أن يكونا نفس المستودع");
      return;
    }
    if (form.items.length === 0 || form.items.every(i => !i.product_id)) {
      toast.error("يرجى إضافة صنف واحد على الأقل");
      return;
    }

    setSaving(true);
    const finalStatus = autoComplete ? "مكتمل" : form.status;
    const saveData = { ...form, status: finalStatus };

    let savedTransfer;
    if (editing) {
      savedTransfer = await base44.entities.StockTransfer.update(editing.id, saveData);
      savedTransfer = { ...editing, ...saveData };
    } else {
      savedTransfer = await base44.entities.StockTransfer.create(saveData);
    }

    // إذا مكتمل → تحديث المخزون تلقائياً
    if (finalStatus === "مكتمل" && (!editing || editing.status !== "مكتمل")) {
      await applyTransfer(saveData).catch(e => console.error(e));
      toast.success("✅ تم التحويل المخزني وتحديث الأرصدة لحظياً", { duration: 4000 });
    } else {
      toast.success(editing ? "تم التحديث" : `تم إنشاء المناقلة بحالة: ${finalStatus}`);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  const fromWarehouse = warehouses.find(w => w.id === form.from_warehouse_id);
  const toWarehouse = warehouses.find(w => w.id === form.to_warehouse_id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 rotate-90 text-primary" />
            {editing ? "تعديل مناقلة" : "مناقلة مخزون جديدة"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs">رقم المناقلة</Label><Input value={form.transfer_number} readOnly className="bg-muted/40 h-9" /></div>
            <div><Label className="text-xs">التاريخ</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9" /></div>
          </div>

          {/* From Warehouse */}
          <div className="p-3 bg-red-50 rounded-lg border border-red-100 space-y-2">
            <p className="text-xs font-bold text-red-700">📤 المستودع المصدر</p>
            <Select value={form.from_warehouse_id} onValueChange={v => selectWarehouse("from", v)}>
              <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="اختر مستودع المصدر" /></SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name} {w.branch_name ? `— ${w.branch_name}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fromWarehouse && <p className="text-xs text-red-600 font-medium">{fromWarehouse.name} {fromWarehouse.branch_name ? `← ${fromWarehouse.branch_name}` : ""}</p>}
          </div>

          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="h-px w-12 bg-border" />
              <ArrowDown className="h-5 w-5" />
              <div className="h-px w-12 bg-border" />
            </div>
          </div>

          {/* To Warehouse */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-100 space-y-2">
            <p className="text-xs font-bold text-green-700">📥 المستودع الهدف</p>
            <Select value={form.to_warehouse_id} onValueChange={v => selectWarehouse("to", v)}>
              <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="اختر مستودع الهدف" /></SelectTrigger>
              <SelectContent>
                {warehouses.filter(w => w.id !== form.from_warehouse_id).map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name} {w.branch_name ? `— ${w.branch_name}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {toWarehouse && <p className="text-xs text-green-600 font-medium">{toWarehouse.name} {toWarehouse.branch_name ? `← ${toWarehouse.branch_name}` : ""}</p>}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="font-semibold">الأصناف المحوَّلة</Label>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1 h-8">
                <Plus className="h-3.5 w-3.5" /> إضافة صنف
              </Button>
            </div>

            {form.items.length === 0 && (
              <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm">
                اضغط "إضافة صنف" لإضافة الأصناف المراد تحويلها
              </div>
            )}

            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/20 rounded-lg mb-2">
                <div className="col-span-5">
                  <Label className="text-xs mb-1 block">الصنف</Label>
                  <Select value={item.product_id} onValueChange={v => updateItem(idx, "product_id", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                    <SelectContent>
                      {products.filter(p => !p.is_service).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {item.available_qty !== null && item.available_qty !== undefined && (
                    <p className={`text-[10px] mt-0.5 ${item.available_qty === 0 ? "text-red-500" : item.available_qty < (item.quantity || 0) ? "text-orange-500" : "text-green-600"}`}>
                      {item.available_qty === 0 ? "⚠️ لا يوجد مخزون" : `متاح: ${item.available_qty}`}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">الكمية</Label>
                  <Input className="h-9" type="number" min="0" value={item.quantity}
                    onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                  {item.available_qty !== null && item.quantity > item.available_qty && (
                    <p className="text-[10px] text-red-500 mt-0.5">تجاوز المتاح!</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">الوحدة</Label>
                  <Input className="h-9" value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} placeholder="قطعة" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">ملاحظة</Label>
                  <Input className="h-9" value={item.notes || ""} onChange={e => updateItem(idx, "notes", e.target.value)} />
                </div>
                <div className="col-span-1 flex items-end pb-0.5">
                  <Button variant="ghost" size="icon" className="h-9 text-destructive"
                    onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">الحالة</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="مسودة">مسودة</SelectItem>
                  <SelectItem value="معتمد">معتمد</SelectItem>
                  <SelectItem value="مكتمل">مكتمل</SelectItem>
                  <SelectItem value="ملغى">ملغى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">البيان</Label>
              <Input className="h-9" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="سبب التحويل..." />
            </div>
          </div>

          {/* Auto-transfer info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <Zap className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">التحويل التلقائي</p>
              <p>عند الضغط على "إتمام التحويل" سيتم تحديث أرصدة المخزون في كلا المستودعين لحظياً</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ كمسودة"}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} className="gap-1.5 bg-green-600 hover:bg-green-700">
            <Zap className="h-4 w-4" />
            {saving ? "جاري الإتمام..." : "إتمام التحويل تلقائياً"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}