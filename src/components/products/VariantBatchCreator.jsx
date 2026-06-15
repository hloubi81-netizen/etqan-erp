import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Layers, Grid3X3, Wand2, Package, X, Check } from "lucide-react";

function emptyVariant() {
  return { id: Date.now() + Math.random(), name: "", barcode: "", retail_price: "", wholesale_price: "", cost_price: "", size: "" };
}

export default function VariantBatchCreator({ open, onClose, onSuccess, groups, warehouses, branches, products }) {
  const [base, setBase] = useState({
    item_code_prefix: "",
    name_base: "",
    group_id: "",
    branch_id: "",
    branch_name: "",
    origin: "محلي",
    print_department: "",
    expiry_date: "",
    units: [{ name: "قطعة", conversion_factor: 1 }],
    is_service: false,
  });

  const [colors, setColors] = useState([emptyVariant()]);
  const [sizes, setSizes] = useState([]);
  const [matrixMode, setMatrixMode] = useState(false); // true = generate matrix of colors x sizes
  const [variants, setVariants] = useState([]); // list of final variants in manual mode
  const [autoBarcode, setAutoBarcode] = useState(true);
  const [saving, setSaving] = useState(false);

  function updateBase(key, val) {
    setBase(prev => ({ ...prev, [key]: val }));
  }

  function addColor() { setColors(prev => [...prev, emptyVariant()]); }
  function removeColor(id) { setColors(prev => prev.filter(c => c.id !== id)); }
  function updateColor(id, key, val) {
    setColors(prev => prev.map(c => c.id === id ? { ...c, [key]: val } : c));
  }

  function addSize() { setSizes(prev => [...prev, { id: Date.now() + Math.random(), name: "" }]); }
  function removeSize(id) { setSizes(prev => prev.filter(s => s.id !== id)); }
  function updateSize(id, val) {
    setSizes(prev => prev.map(s => s.id === id ? { ...s, name: val } : s));
  }

  function addManualVariant() { setVariants(prev => [...prev, emptyVariant()]); }
  function removeManualVariant(id) { setVariants(prev => prev.filter(v => v.id !== id)); }
  function updateManualVariant(id, key, val) {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [key]: val } : v));
  }

  // Generate matrix from colors x sizes
  function generateMatrix() {
    if (colors.length === 0 || sizes.length === 0) {
      toast.error("يجب إضافة لون واحد ومقاس واحد على الأقل");
      return;
    }
    const matrix = [];
    for (const color of colors) {
      for (const size of sizes) {
        matrix.push({
          id: Date.now() + Math.random() + color.id + size.id,
          name: `${color.name || "?"} - ${size.name || "?"}`,
          colorName: color.name,
          sizeName: size.name,
          barcode: autoBarcode ? `${base.item_code_prefix || "P"}${String(matrix.length + 1).padStart(3, "0")}` : "",
          retail_price: base.retail_price || "",
          wholesale_price: base.wholesale_price || "",
          cost_price: base.cost_price || "",
          size: size.name,
        });
      }
    }
    setVariants(matrix);
    setMatrixMode(true);
  }

  function setDefaultPriceAll(key, val) {
    setVariants(prev => prev.map(v => ({ ...v, [key]: val })));
    setBase(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    const validVariants = matrixMode ? variants : colors;
    if (validVariants.length === 0) {
      toast.error("لا توجد تصنيفات للحفظ");
      return;
    }

    const hasEmpty = validVariants.some(v => !v.name && !v.colorName);
    if (hasEmpty && matrixMode) {
      toast.error("بعض التصنيفات فارغة، تأكد من إدخال جميع البيانات");
      return;
    }

    setSaving(true);
    const branchName = base.branch_id
      ? (branches.find(b => b.id === base.branch_id)?.name || "")
      : "";

    let counter = 0;
    const batch = [];

    if (matrixMode) {
      // Matrix mode: use variants array
      for (const v of variants) {
        batch.push({
          item_code: `${base.item_code_prefix}${String(++counter).padStart(3, "0")}`,
          name: `${base.name_base} ${v.colorName || ""} ${v.sizeName || ""}`.trim(),
          group_id: base.group_id,
          branch_id: base.branch_id,
          branch_name: branchName,
          origin: base.origin,
          color: v.colorName || "",
          size: v.sizeName || "",
          barcode: v.barcode || `${base.item_code_prefix}${String(counter).padStart(3, "0")}`,
          retail_price: parseFloat(v.retail_price) || 0,
          wholesale_price: parseFloat(v.wholesale_price) || 0,
          cost_price: parseFloat(v.cost_price) || 0,
          units: base.units,
          print_department: base.print_department,
          expiry_date: base.expiry_date,
          is_service: base.is_service,
        });
      }
    } else {
      // Color-only mode: use colors array
      for (const c of colors) {
        if (!c.name) continue;
        batch.push({
          item_code: `${base.item_code_prefix}${String(++counter).padStart(3, "0")}`,
          name: `${base.name_base} ${c.name}`.trim(),
          group_id: base.group_id,
          branch_id: base.branch_id,
          branch_name: branchName,
          origin: base.origin,
          color: c.name,
          size: c.size || "",
          barcode: c.barcode || `${base.item_code_prefix}${String(counter).padStart(3, "0")}`,
          retail_price: parseFloat(c.retail_price) || 0,
          wholesale_price: parseFloat(c.wholesale_price) || 0,
          cost_price: parseFloat(c.cost_price) || 0,
          units: base.units,
          print_department: base.print_department,
          expiry_date: base.expiry_date,
          is_service: base.is_service,
        });
      }
    }

    if (batch.length === 0) {
      toast.error("لا توجد منتجات للحفظ");
      setSaving(false);
      return;
    }

    try {
      await base44.entities.Product.bulkCreate(batch);
      toast.success(`تم إنشاء ${batch.length} منتج بنجاح`);
      onSuccess();
      onClose();
    } catch (e) {
      toast.error("فشل في حفظ المنتجات");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            إضافة منتجات بتصنيفات متعددة
          </DialogTitle>
          <p className="text-xs text-muted-foreground">أدخل المعلومات الأساسية ثم أضف التصنيفات (ألوان، مقاسات) لإنشاء المنتجات دفعة واحدة</p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Base Info */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              معلومات المنتج الأساسية
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">بادئة رمز الصنف</Label>
                <Input className="h-8 mt-1" value={base.item_code_prefix} onChange={e => updateBase("item_code_prefix", e.target.value)} placeholder="مثال: TSH" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">الاسم الأساسي للمنتج</Label>
                <Input className="h-8 mt-1" value={base.name_base} onChange={e => updateBase("name_base", e.target.value)} placeholder="مثال: تي شيرت قطني" />
              </div>
              <div>
                <Label className="text-xs">المجموعة</Label>
                <Select value={base.group_id} onValueChange={v => updateBase("group_id", v)}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">الفرع</Label>
                <Select value={base.branch_id || "all"} onValueChange={v => {
                  if (v === "all") { updateBase("branch_id", ""); updateBase("branch_name", ""); }
                  else { updateBase("branch_id", v); updateBase("branch_name", branches.find(b => b.id === v)?.name || ""); }
                }}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="كل الفروع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الفروع</SelectItem>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">المنشأ</Label>
                <Select value={base.origin} onValueChange={v => updateBase("origin", v)}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="محلي">محلي</SelectItem>
                    <SelectItem value="مستورد">مستورد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Default pricing */}
            <div>
              <Label className="text-xs text-muted-foreground">الأسعار الافتراضية (يمكنك تعديل كل تصنيف لاحقاً)</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Input className="h-8" type="number" placeholder="سعر التكلفة" value={base.cost_price || ""}
                  onChange={e => { updateBase("cost_price", e.target.value); if (matrixMode) setDefaultPriceAll("cost_price", e.target.value); }} />
                <Input className="h-8" type="number" placeholder="سعر الجملة" value={base.wholesale_price || ""}
                  onChange={e => { updateBase("wholesale_price", e.target.value); if (matrixMode) setDefaultPriceAll("wholesale_price", e.target.value); }} />
                <Input className="h-8" type="number" placeholder="سعر المستهلك" value={base.retail_price || ""}
                  onChange={e => { updateBase("retail_price", e.target.value); if (matrixMode) setDefaultPriceAll("retail_price", e.target.value); }} />
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <Switch checked={matrixMode} onCheckedChange={v => { setMatrixMode(v); if (v && colors.length && sizes.length) generateMatrix(); }} />
              <Label className="text-sm">وضع المصفوفة (ألوان × مقاسات)</Label>
            </div>
            {matrixMode && (
              <Badge variant="secondary" className="gap-1">
                <Grid3X3 className="h-3 w-3" />
                {variants.length} منتج
              </Badge>
            )}
          </div>

          {!matrixMode ? (
            /* Manual mode: colors + sizes separately */
            <div className="space-y-5">
              {/* Colors */}
              <div className="p-4 rounded-xl border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">الألوان</h3>
                  <Button variant="outline" size="sm" onClick={addColor} className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" /> لون جديد
                  </Button>
                </div>
                {colors.map((c, idx) => (
                  <div key={c.id} className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">لون #{idx + 1}</span>
                      {colors.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-6 text-destructive text-xs" onClick={() => removeColor(c.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-[10px]">اسم اللون</Label>
                        <Input className="h-8 mt-0.5" value={c.name} onChange={e => updateColor(c.id, "name", e.target.value)} placeholder="أحمر" />
                      </div>
                      <div>
                        <Label className="text-[10px]">المقاس (اختياري)</Label>
                        <Input className="h-8 mt-0.5" value={c.size} onChange={e => updateColor(c.id, "size", e.target.value)} placeholder="XL" />
                      </div>
                      <div>
                        <Label className="text-[10px]">الباركود</Label>
                        <Input className="h-8 mt-0.5" value={c.barcode} onChange={e => updateColor(c.id, "barcode", e.target.value)} placeholder={`${base.item_code_prefix}${String(idx + 1).padStart(3, "0")}`} />
                      </div>
                      <div>
                        <Label className="text-[10px]">سعر المستهلك</Label>
                        <Input className="h-8 mt-0.5" type="number" value={c.retail_price} onChange={e => updateColor(c.id, "retail_price", e.target.value)} placeholder={base.retail_price || "0"} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sizes (optional) */}
              <div className="p-4 rounded-xl border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">المقاسات (اختياري - للإشارة فقط)</h3>
                  <Button variant="outline" size="sm" onClick={addSize} className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" /> مقاس جديد
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(s => (
                    <Badge key={s.id} variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
                      <Input className="h-6 w-16 text-xs border-0 bg-transparent p-0" value={s.name}
                        onChange={e => updateSize(s.id, e.target.value)} placeholder="XL" />
                      <button onClick={() => removeSize(s.id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                  {sizes.length === 0 && <p className="text-xs text-muted-foreground">أضف مقاسات للإشارة إليها في أسماء المنتجات</p>}
                </div>
              </div>
            </div>
          ) : (
            /* Matrix Mode */
            <div className="space-y-4">
              {/* Generate Matrix Button */}
              <div className="p-4 rounded-xl border space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  مصفوفة الألوان × المقاسات
                </h3>

                {/* Color inputs in matrix mode */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs">الألوان</Label>
                    <Button variant="ghost" size="sm" onClick={addColor} className="h-6 text-xs text-primary gap-1">
                      <Plus className="h-3 w-3" /> لون
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {colors.map(c => (
                      <Badge key={c.id} variant="outline" className="gap-1 px-2 py-1">
                        <Input className="h-5 w-14 text-[10px] border-0 bg-transparent p-0" value={c.name}
                          onChange={e => updateColor(c.id, "name", e.target.value)} placeholder="أحمر" />
                        <button onClick={() => removeColor(c.id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Size inputs in matrix mode */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs">المقاسات</Label>
                    <Button variant="ghost" size="sm" onClick={addSize} className="h-6 text-xs text-primary gap-1">
                      <Plus className="h-3 w-3" /> مقاس
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sizes.map(s => (
                      <Badge key={s.id} variant="outline" className="gap-1 px-2 py-1">
                        <Input className="h-5 w-14 text-[10px] border-0 bg-transparent p-0" value={s.name}
                          onChange={e => updateSize(s.id, e.target.value)} placeholder="XL" />
                        <button onClick={() => removeSize(s.id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={autoBarcode} onCheckedChange={setAutoBarcode} />
                  <Label className="text-xs">توليد الباركود تلقائياً</Label>
                </div>

                <Button variant="secondary" size="sm" onClick={generateMatrix} className="w-full gap-2">
                  <Wand2 className="h-4 w-4" /> توليد المصفوفة
                </Button>
              </div>

              {/* Matrix Grid */}
              {variants.length > 0 && (
                <div className="p-4 rounded-xl border space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{variants.length} منتج تم توليده</h3>
                    <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => { setVariants([]); setMatrixMode(false); }}>
                      إعادة تعيين
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-right p-2 font-semibold border-b">#</th>
                          <th className="text-right p-2 font-semibold border-b">اللون</th>
                          <th className="text-right p-2 font-semibold border-b">المقاس</th>
                          <th className="text-right p-2 font-semibold border-b hidden md:table-cell">رمز الصنف</th>
                          <th className="text-right p-2 font-semibold border-b">الباركود</th>
                          <th className="text-right p-2 font-semibold border-b">السعر</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((v, idx) => (
                          <tr key={v.id} className="border-b hover:bg-muted/20">
                            <td className="p-1.5 text-center">{idx + 1}</td>
                            <td className="p-1.5">
                              <Input className="h-7 w-20 text-xs" value={v.colorName || ""}
                                onChange={e => {
                                  const updated = [...variants];
                                  updated[idx] = { ...updated[idx], colorName: e.target.value, name: `${e.target.value || "?"} - ${v.sizeName || "?"}` };
                                  setVariants(updated);
                                }} />
                            </td>
                            <td className="p-1.5">
                              <Input className="h-7 w-16 text-xs" value={v.sizeName || ""}
                                onChange={e => {
                                  const updated = [...variants];
                                  updated[idx] = { ...updated[idx], sizeName: e.target.value, name: `${v.colorName || "?"} - ${e.target.value || "?"}` };
                                  setVariants(updated);
                                }} />
                            </td>
                            <td className="p-1.5 hidden md:table-cell">
                              <span className="text-muted-foreground text-[10px]">{base.item_code_prefix}{String(idx + 1).padStart(3, "0")}</span>
                            </td>
                            <td className="p-1.5">
                              <Input className="h-7 w-28 text-xs" value={v.barcode || ""}
                                onChange={e => {
                                  const updated = [...variants];
                                  updated[idx] = { ...updated[idx], barcode: e.target.value };
                                  setVariants(updated);
                                }} />
                            </td>
                            <td className="p-1.5">
                              <Input className="h-7 w-20 text-xs" type="number" value={v.retail_price || ""}
                                onChange={e => {
                                  const updated = [...variants];
                                  updated[idx] = { ...updated[idx], retail_price: e.target.value };
                                  setVariants(updated);
                                }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving || !base.name_base || !base.item_code_prefix} className="gap-2">
            {saving ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الحفظ...
              </span>
            ) : (
              <>
                <Check className="h-4 w-4" />
                حفظ {matrixMode ? variants.length : colors.filter(c => c.name).length} منتج
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}