import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Wrench, BookOpen } from "lucide-react";
import AccountSearchInput from "@/components/shared/AccountSearchInput";
import { useState as useStateAccounts, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function ProductForm({ open, onClose, onSave, product, groups, warehouses, products, branches = [] }) {
  const [accounts, setAccounts] = useStateAccounts([]);

  useEffect(() => {
    base44.entities.Account.list().then(setAccounts).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    item_code: product?.item_code || "",
    name: product?.name || "",
    group_id: product?.group_id || "",
    branch_id: product?.branch_id || "",
    branch_name: product?.branch_name || "",
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
    is_service: product?.is_service || false,
    service_duration: product?.service_duration || "",
    service_unit: product?.service_unit || "",
    service_provider: product?.service_provider || "",
    service_description: product?.service_description || "",
    service_terms: product?.service_terms || "",
    service_revenue_account_id: product?.service_revenue_account_id || "",
    service_revenue_account_name: product?.service_revenue_account_name || "",
    service_cost_account_id: product?.service_cost_account_id || "",
    service_cost_account_name: product?.service_cost_account_name || "",
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
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="basic">أساسي</TabsTrigger>
            <TabsTrigger value="units">الوحدات</TabsTrigger>
            <TabsTrigger value="pricing">التسعير</TabsTrigger>
            <TabsTrigger value="composite">تجميعية</TabsTrigger>
            <TabsTrigger value="service" className="gap-1">
              <Wrench className="h-3.5 w-3.5" />خدمة
            </TabsTrigger>
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
                <Label>الفرع (اختياري)</Label>
                <Select
                  value={form.branch_id || "all"}
                  onValueChange={(v) => {
                    if (v === "all") {
                      updateField("branch_id", "");
                      updateField("branch_name", "");
                    } else {
                      const b = branches.find((br) => br.id === v);
                      updateField("branch_id", v);
                      updateField("branch_name", b ? b.name : "");
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="كل الفروع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الفروع</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
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

          {/* ── تبويب الخدمة ── */}
          <TabsContent value="service" className="space-y-4 mt-4">
            {/* تفعيل الخدمة */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${form.is_service ? "border-primary/40 bg-primary/5" : "border-dashed border-muted-foreground/30 bg-muted/20"}`}>
              <div>
                <p className="font-semibold text-sm">منتج خدمي (بدون مخزون)</p>
                <p className="text-xs text-muted-foreground mt-0.5">تفعيل هذا الخيار يعني أن الصنف خدمة ولا يحتاج تتبع مخزوني</p>
              </div>
              <Switch checked={form.is_service} onCheckedChange={(v) => updateField("is_service", v)} />
            </div>

            {form.is_service ? (
              <div className="space-y-4">
                {/* معلومات أساسية للخدمة */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">مدة تنفيذ الخدمة</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        className="h-9"
                        placeholder="مثال: 60"
                        value={form.service_duration}
                        onChange={(e) => updateField("service_duration", parseFloat(e.target.value) || "")}
                      />
                      <Select value={form.service_unit || "دقيقة"} onValueChange={(v) => updateField("service_unit", v)}>
                        <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="دقيقة">دقيقة</SelectItem>
                          <SelectItem value="ساعة">ساعة</SelectItem>
                          <SelectItem value="يوم">يوم</SelectItem>
                          <SelectItem value="أسبوع">أسبوع</SelectItem>
                          <SelectItem value="شهر">شهر</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">مزود / منفذ الخدمة</Label>
                    <Input
                      className="mt-1 h-9"
                      placeholder="مثال: فريق الصيانة، اسم الموظف..."
                      value={form.service_provider}
                      onChange={(e) => updateField("service_provider", e.target.value)}
                    />
                  </div>
                </div>

                {/* وصف الخدمة */}
                <div>
                  <Label className="text-xs">وصف الخدمة</Label>
                  <textarea
                    rows={3}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="اكتب وصفاً تفصيلياً للخدمة المقدمة..."
                    value={form.service_description}
                    onChange={(e) => updateField("service_description", e.target.value)}
                  />
                </div>

                {/* شروط وملاحظات */}
                <div>
                  <Label className="text-xs">شروط وملاحظات الخدمة</Label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="أي شروط أو ملاحظات تتعلق بتقديم الخدمة..."
                    value={form.service_terms}
                    onChange={(e) => updateField("service_terms", e.target.value)}
                  />
                </div>

                {/* حسابات الخدمة */}
                <div className="border rounded-xl p-4 space-y-3 bg-muted/10">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <p className="font-semibold text-sm">الحسابات المحاسبية للخدمة</p>
                  </div>
                  <p className="text-xs text-muted-foreground">تُستخدم عند ترحيل الفاتورة لإنشاء القيود المحاسبية تلقائياً</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label className="text-xs text-green-700 font-medium">حساب إيرادات الخدمة (عند البيع)</Label>
                      <AccountSearchInput
                        accounts={accounts}
                        value={form.service_revenue_account_id}
                        onChange={(id, name) => {
                          updateField("service_revenue_account_id", id);
                          updateField("service_revenue_account_name", name);
                        }}
                        placeholder="ابحث عن حساب الإيرادات..."
                      />
                      {form.service_revenue_account_name && (
                        <p className="text-xs text-green-600 mt-1">✓ {form.service_revenue_account_name}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-red-700 font-medium">حساب تكلفة الخدمة (عند الشراء)</Label>
                      <AccountSearchInput
                        accounts={accounts}
                        value={form.service_cost_account_id}
                        onChange={(id, name) => {
                          updateField("service_cost_account_id", id);
                          updateField("service_cost_account_name", name);
                        }}
                        placeholder="ابحث عن حساب التكلفة..."
                      />
                      {form.service_cost_account_name && (
                        <p className="text-xs text-red-600 mt-1">✓ {form.service_cost_account_name}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* تنبيه مخزون */}
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                  <Wrench className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">خدمة — لا مخزون</p>
                    <p className="text-xs text-amber-700 mt-0.5">هذا الصنف لا يُخصم من المخزون عند البيع ولا يُضاف عند الشراء. يمكن إدراجه في الفواتير بحرية دون التأثير على الكميات.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Wrench className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">فعّل خيار "منتج خدمي" أعلاه</p>
                <p className="text-xs mt-1">لإدخال تفاصيل الخدمة كالمدة والمزود والوصف</p>
              </div>
            )}
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