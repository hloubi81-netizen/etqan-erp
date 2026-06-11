import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getWarehouseStock } from "@/utils/inventoryEngine";
import {
  Plus, Trash2, RefreshCw, TrendingUp, TrendingDown,
  CheckCircle2, AlertTriangle, Minus, Package
} from "lucide-react";
import { cn } from "@/lib/utils";

function DiffBadge({ book, actual }) {
  const diff = (actual ?? 0) - (book ?? 0);
  if (diff === 0) return <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1"><CheckCircle2 className="h-3 w-3" />مطابق</Badge>;
  if (diff > 0)  return <Badge className="bg-blue-100 text-blue-700 border-0 text-xs gap-1"><TrendingUp className="h-3 w-3" />+{diff}</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-0 text-xs gap-1"><TrendingDown className="h-3 w-3" />{diff}</Badge>;
}

export default function InventoryCountForm({ open, onClose, onSaved, editing, warehouses, products, countsLength }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState(() => editing || {
    count_number: String(countsLength + 1).padStart(4, "0"),
    date: today,
    warehouse_id: "", warehouse_name: "",
    type: "محضر جرد", items: [], notes: "", status: "مسودة",
  });
  const [loadingStock, setLoadingStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const selectWarehouse = async (warehouseId) => {
    const w = warehouses.find(x => String(x.id) === String(warehouseId));
    setForm(f => ({ ...f, warehouse_id: warehouseId, warehouse_name: w?.name || "", items: [] }));
  };

  const loadAllStock = async () => {
    if (!form.warehouse_id) return toast.error("اختر المستودع أولاً");
    setLoadingStock(true);
    try {
      const stock = await getWarehouseStock(form.warehouse_id);
      const withQty = stock.filter(p => p.available_qty > 0);
      if (!withQty.length) { toast.info("لا توجد كميات مسجلة في هذا المستودع"); setLoadingStock(false); return; }
      setForm(f => ({
        ...f,
        items: withQty.map(p => ({
          product_id: p.id,
          product_name: p.name,
          book_quantity: p.available_qty,
          actual_quantity: null,
          surplus: 0, deficit: 0,
        }))
      }));
      toast.success(`تم تحميل ${withQty.length} صنف من المستودع`);
    } catch (e) {
      toast.error("خطأ في جلب بيانات المخزون");
    }
    setLoadingStock(false);
  };

  const addProduct = (productId) => {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    if (form.items.find(i => i.product_id === productId)) return toast.error("الصنف موجود بالفعل");
    setForm(f => ({
      ...f,
      items: [...f.items, { product_id: p.id, product_name: p.name, book_quantity: 0, actual_quantity: null, surplus: 0, deficit: 0 }]
    }));
    setProductSearch("");
  };

  const updateActual = (idx, val) => {
    setForm(f => {
      const items = [...f.items];
      const book = items[idx].book_quantity || 0;
      const actual = parseFloat(val) ?? 0;
      items[idx] = { ...items[idx], actual_quantity: val === "" ? null : actual };
      return { ...f, items };
    });
  };

  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleSave = async (status = "مسودة") => {
    if (!form.warehouse_id) return toast.error("اختر المستودع");
    if (!form.items.length) return toast.error("أضف أصنافاً للجرد");
    setSaving(true);
    const items = form.items.map(i => {
      const book = i.book_quantity || 0;
      const actual = i.actual_quantity ?? book;
      return { ...i, actual_quantity: actual, surplus: Math.max(0, actual - book), deficit: Math.max(0, book - actual) };
    });
    try {
      const payload = { ...form, items, status };
      if (editing) {
        await base44.entities.InventoryCount.update(editing.id, payload);
        toast.success("تم تحديث محضر الجرد");
      } else {
        await base44.entities.InventoryCount.create(payload);
        toast.success(status === "معتمد" ? "تم اعتماد محضر الجرد" : "تم حفظ مسودة الجرد");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
    setSaving(false);
  };

  // إحصائيات سريعة
  const counted = form.items.filter(i => i.actual_quantity !== null).length;
  const surplus = form.items.filter(i => (i.actual_quantity || 0) > (i.book_quantity || 0)).length;
  const deficit = form.items.filter(i => i.actual_quantity !== null && (i.actual_quantity || 0) < (i.book_quantity || 0)).length;
  const matched = form.items.filter(i => i.actual_quantity !== null && i.actual_quantity === i.book_quantity).length;

  const filteredProducts = products.filter(p =>
    !form.items.find(i => i.product_id === p.id) &&
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {editing ? "تعديل محضر الجرد" : "نموذج الجرد الميداني"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">رقم المحضر</Label>
              <Input value={form.count_number} readOnly className="bg-muted/50 text-center font-mono font-bold" />
            </div>
            <div>
              <Label className="text-xs">التاريخ</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">النوع</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="محضر جرد">محضر جرد</SelectItem>
                  <SelectItem value="تسوية جردية">تسوية جردية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">المستودع *</Label>
              <Select value={form.warehouse_id} onValueChange={selectWarehouse}>
                <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                <SelectContent>{(warehouses || []).filter(w => w.id).map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Load All Stock Button */}
          {form.warehouse_id && (
            <Button variant="outline" size="sm" onClick={loadAllStock} disabled={loadingStock} className="gap-2 w-full border-dashed">
              <RefreshCw className={cn("h-4 w-4", loadingStock && "animate-spin")} />
              {loadingStock ? "جاري تحميل الكميات الدفترية..." : "تحميل جميع أصناف المستودع تلقائياً"}
            </Button>
          )}

          {/* Stats Row */}
          {form.items.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "إجمالي الأصناف", val: form.items.length, color: "bg-slate-100 text-slate-700" },
                { label: "تم جردها", val: counted, color: "bg-blue-100 text-blue-700" },
                { label: "فائض", val: surplus, color: "bg-green-100 text-green-700" },
                { label: "عجز", val: deficit, color: "bg-red-100 text-red-700" },
              ].map((s, i) => (
                <div key={i} className={cn("rounded-lg p-2 text-center", s.color)}>
                  <p className="text-lg font-bold">{s.val}</p>
                  <p className="text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add Single Product */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="ابحث عن صنف وأضفه يدوياً..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
              {productSearch && filteredProducts.length > 0 && (
                <div className="absolute z-50 mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto w-72">
                  {filteredProducts.slice(0, 10).map(p => (
                    <button key={p.id} className="w-full text-right px-3 py-2 text-sm hover:bg-muted transition-colors border-b last:border-0"
                      onClick={() => addProduct(p.id)}>
                      <span className="font-medium">{p.name}</span>
                      {p.item_code && <span className="text-muted-foreground mr-2 text-xs">({p.item_code})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => {
              if (!form.warehouse_id) return toast.error("اختر المستودع أولاً");
              if (!productSearch) return;
              const p = filteredProducts[0];
              if (p) addProduct(p.id);
            }}>
              <Plus className="h-4 w-4" /> إضافة
            </Button>
          </div>

          {/* Items Table */}
          {form.items.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-0 bg-muted/60 px-4 py-2 text-xs font-semibold text-muted-foreground border-b">
                <div className="col-span-4">الصنف</div>
                <div className="col-span-2 text-center">الكمية الدفترية</div>
                <div className="col-span-2 text-center">الكمية الفعلية</div>
                <div className="col-span-2 text-center">الفرق</div>
                <div className="col-span-1 text-center">الحالة</div>
                <div className="col-span-1"></div>
              </div>

              <div className="divide-y">
                {form.items.map((item, idx) => {
                  const diff = (item.actual_quantity ?? null) !== null
                    ? (item.actual_quantity || 0) - (item.book_quantity || 0)
                    : null;
                  const rowColor = diff === null ? "" : diff > 0 ? "bg-blue-50/40" : diff < 0 ? "bg-red-50/40" : "bg-green-50/30";

                  return (
                    <div key={idx} className={cn("grid grid-cols-12 gap-0 px-4 py-2.5 items-center hover:bg-muted/20 transition-colors", rowColor)}>
                      <div className="col-span-4">
                        <p className="font-medium text-sm">{item.product_name}</p>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-sm font-mono font-semibold text-muted-foreground">{item.book_quantity ?? 0}</span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className={cn(
                            "h-8 w-24 text-center font-mono text-sm",
                            item.actual_quantity === null ? "border-dashed border-orange-300 bg-orange-50" : ""
                          )}
                          placeholder="0"
                          value={item.actual_quantity ?? ""}
                          onChange={e => updateActual(idx, e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 text-center">
                        {diff !== null ? (
                          <span className={cn(
                            "font-mono font-bold text-sm",
                            diff > 0 ? "text-blue-600" : diff < 0 ? "text-red-600" : "text-green-600"
                          )}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {item.actual_quantity !== null && <DiffBadge book={item.book_quantity} actual={item.actual_quantity} />}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Row */}
              <div className="grid grid-cols-12 gap-0 bg-muted/40 px-4 py-2 border-t text-xs font-semibold">
                <div className="col-span-4">الإجمالي</div>
                <div className="col-span-2 text-center font-mono">{form.items.reduce((s, i) => s + (i.book_quantity || 0), 0).toFixed(2)}</div>
                <div className="col-span-2 text-center font-mono">
                  {form.items.filter(i => i.actual_quantity !== null).reduce((s, i) => s + (i.actual_quantity || 0), 0).toFixed(2)}
                </div>
                <div className="col-span-2 text-center font-mono">
                  {(() => {
                    const counted = form.items.filter(i => i.actual_quantity !== null);
                    const d = counted.reduce((s, i) => s + (i.actual_quantity || 0) - (i.book_quantity || 0), 0);
                    return <span className={d >= 0 ? "text-blue-600" : "text-red-600"}>{d >= 0 ? `+${d.toFixed(2)}` : d.toFixed(2)}</span>;
                  })()}
                </div>
                <div className="col-span-2 text-center text-muted-foreground">{counted}/{form.items.length} مُجرَد</div>
              </div>
            </div>
          )}

          {form.items.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed rounded-xl">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">اختر المستودع ثم اضغط "تحميل جميع الأصناف" أو أضف أصنافاً يدوياً</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-xs">ملاحظات</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات إضافية..." />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button variant="secondary" onClick={() => handleSave("مسودة")} disabled={saving}>حفظ كمسودة</Button>
          <Button onClick={() => handleSave("معتمد")} disabled={saving} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            اعتماد المحضر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}