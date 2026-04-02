import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

export default function ProductForm({ open, onClose, onSave, product, groups, warehouses, products }) {
  const [form, setForm] = useState({
    item_code: product?.item_code || "",
    name: product?.name || "",
    group_id: product?.group_id || "",
    origin: product?.origin || "محلي",
    color: product?.color || "",
    size: product?.size || "",
    units: product?.units || [{ name: "قطعة", conversion_factor: 1 }],
    cost_price: product?.cost_price || 0,
    last_purchase_price: product?.last_purchase_price || 0,
    wholesale_price: product?.wholesale_price || 0,
    retail_price: product?.retail_price || 0,
    avg_purchase_price: product?.avg_purchase_price || 0,
    expiry_date: product?.expiry_date || "",
    barcode: product?.barcode || "",
    is_composite: product?.is_composite || false,
    raw_materials: product?.raw_materials || [],
  });

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addUnit() {
    setForm((prev) => ({
      ...prev,
      units: [...prev.units, { name: "", conversion_factor: 1 }],
    }));
  }

  function removeUnit(idx) {
    setForm((prev) => ({
      ...prev,
      units: prev.units.filter((_, i) => i !== idx),
    }));
  }

  function updateUnit(idx, key, value) {
    setForm((prev) => ({
      ...prev,
      units: prev.units.map((u, i) => (i === idx ? { ...u, [key]: value } : u)),
    }));
  }

  function addRawMaterial() {
    setForm((prev) => ({
      ...prev,
      raw_materials: [
        ...prev.raw_materials,
        { product_id: "", product_name: "", weight: 0, quantity: 0, unit: "", price: 0, warehouse_id: "" },
      ],
    }));
  }

  function removeRawMaterial(idx) {
    setForm((prev) => ({
      ...prev,
      raw_materials: prev.raw_materials.filter((_, i) => i !== idx),
    }));
  }

  function updateRawMaterial(idx, key, value) {
    setForm((prev) => ({
      ...prev,
      raw_materials: prev.raw_materials.map((m, i) => (i === idx ? { ...m, [key]: value } : m)),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "تعديل المادة" : "مادة جديدة"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="basic">أساسي</TabsTrigger>
            <TabsTrigger value="units">الوحدات</TabsTrigger>
            <TabsTrigger value="pricing">التسعير</TabsTrigger>
            <TabsTrigger value="composite">تجميعية</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>رمز الصنف</Label>
                <Input value={form.item_code} onChange={(e) => updateField("item_code", e.target.value)} />
              </div>
              <div>
                <Label>اسم الصنف</Label>
                <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} />
              </div>
              <div>
                <Label>المجموعة</Label>
                <Select value={form.group_id} onValueChange={(v) => updateField("group_id", v)}>
                  <SelectTrigger><SelectValue placeholder="اختر المجموعة" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المنشأ</Label>
                <Select value={form.origin} onValueChange={(v) => updateField("origin", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="محلي">محلي</SelectItem>
                    <SelectItem value="مستورد">مستورد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>اللون</Label>
                <Input value={form.color} onChange={(e) => updateField("color", e.target.value)} />
              </div>
              <div>
                <Label>القياس</Label>
                <Input value={form.size} onChange={(e) => updateField("size", e.target.value)} />
              </div>
              <div>
                <Label>تاريخ الصلاحية</Label>
                <Input type="date" value={form.expiry_date} onChange={(e) => updateField("expiry_date", e.target.value)} />
              </div>
              <div>
                <Label>الباركود</Label>
                <Input value={form.barcode} onChange={(e) => updateField("barcode", e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="units" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-base font-semibold">الوحدات</Label>
                <p className="text-xs text-muted-foreground mt-0.5">الوحدة الأولى هي الأساسية (معامل = 1). الوحدات الأخرى تحتوي على N من الوحدة الأساسية.</p>
              </div>
              <Button variant="outline" size="sm" onClick={addUnit}>
                <Plus className="h-3.5 w-3.5 ml-1" /> إضافة وحدة
              </Button>
            </div>
            {form.units.map((unit, idx) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg space-y-2">
                <div className="flex items-center gap-1 mb-1">
                  {idx === 0 && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">الوحدة الأساسية</span>}
                  {idx > 0 && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">وحدة مركبة</span>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">اسم الوحدة</Label>
                    <Input className="mt-1 h-8" value={unit.name} onChange={(e) => updateUnit(idx, "name", e.target.value)} placeholder={idx === 0 ? "قطعة" : "كرتونة"} />
                  </div>
                  <div>
                    <Label className="text-xs">يحتوي على (N {form.units[0]?.name || "وحدة"})</Label>
                    <Input
                      className="mt-1 h-8"
                      type="number"
                      value={unit.conversion_factor}
                      disabled={idx === 0}
                      onChange={(e) => updateUnit(idx, "conversion_factor", parseFloat(e.target.value) || 1)}
                      placeholder="مثال: 12"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">سعر البيع (صفر = تلقائي)</Label>
                    <Input
                      className="mt-1 h-8"
                      type="number"
                      value={unit.price || ""}
                      onChange={(e) => updateUnit(idx, "price", parseFloat(e.target.value) || 0)}
                      placeholder={idx === 0 ? String(form.retail_price || "") : String((form.retail_price || 0) * (unit.conversion_factor || 1))}
                    />
                  </div>
                </div>
                {idx > 0 && (
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      1 {unit.name || "وحدة"} = {unit.conversion_factor || "?"} {form.units[0]?.name || "وحدة أساسية"} | السعر التلقائي: {((form.retail_price || 0) * (unit.conversion_factor || 1)).toLocaleString()}
                    </p>
                    <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={() => removeUnit(idx)}>
                      <Trash2 className="h-3 w-3 ml-1" /> حذف
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>سعر التكلفة</Label>
                <Input type="number" value={form.cost_price} onChange={(e) => updateField("cost_price", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>سعر آخر شراء</Label>
                <Input type="number" value={form.last_purchase_price} onChange={(e) => updateField("last_purchase_price", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>سعر الجملة</Label>
                <Input type="number" value={form.wholesale_price} onChange={(e) => updateField("wholesale_price", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>سعر المستهلك</Label>
                <Input type="number" value={form.retail_price} onChange={(e) => updateField("retail_price", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>متوسط سعر الشراء</Label>
                <Input type="number" value={form.avg_purchase_price} onChange={(e) => updateField("avg_purchase_price", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="composite" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_composite}
                  onCheckedChange={(v) => updateField("is_composite", v)}
                />
                <Label>مادة تجميعية</Label>
              </div>
              {form.is_composite && (
                <Button variant="outline" size="sm" onClick={addRawMaterial}>
                  <Plus className="h-3.5 w-3.5 ml-1" /> إضافة مادة أولية
                </Button>
              )}
            </div>
            {form.is_composite && form.raw_materials.map((mat, idx) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">المادة</Label>
                    <Select
                      value={mat.product_id}
                      onValueChange={(v) => {
                        const p = products.find((pr) => pr.id === v);
                        updateRawMaterial(idx, "product_id", v);
                        if (p) updateRawMaterial(idx, "product_name", p.name);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                      <SelectContent>
                        {products.filter((p) => p.id !== product?.id).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">الوزن</Label>
                    <Input type="number" value={mat.weight} onChange={(e) => updateRawMaterial(idx, "weight", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">الكمية</Label>
                    <Input type="number" value={mat.quantity} onChange={(e) => updateRawMaterial(idx, "quantity", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">الوحدة</Label>
                    <Input value={mat.unit} onChange={(e) => updateRawMaterial(idx, "unit", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">السعر</Label>
                    <Input type="number" value={mat.price} onChange={(e) => updateRawMaterial(idx, "price", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">المستودع</Label>
                    <Select value={mat.warehouse_id} onValueChange={(v) => updateRawMaterial(idx, "warehouse_id", v)}>
                      <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeRawMaterial(idx)}>
                  <Trash2 className="h-3.5 w-3.5 ml-1" /> حذف
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || !form.item_code}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}