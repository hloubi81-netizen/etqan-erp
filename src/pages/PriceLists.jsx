import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, Search, X, Percent, List } from "lucide-react";
import { cn } from "@/lib/utils";

const CUSTOMER_TYPES = ["تجزئة", "جملة", "موزع", "VIP", "مخصص"];
const PRICE_LEVELS = ["سعر التجزئة", "سعر الجملة", "سعر التكلفة + هامش", "مخصص"];

const TYPE_COLORS = {
  "تجزئة": "bg-blue-100 text-blue-700",
  "جملة": "bg-green-100 text-green-700",
  "موزع": "bg-purple-100 text-purple-700",
  "VIP": "bg-yellow-100 text-yellow-700",
  "مخصص": "bg-slate-100 text-slate-700",
};

function PriceListForm({ open, onClose, onSaved, editing, products }) {
  const empty = {
    name: "", code: "", customer_type: "تجزئة", price_level: "سعر التجزئة",
    discount_percent: 0, margin_percent: 0, items: [],
    valid_from: "", valid_to: "", is_active: true, notes: "",
  };
  const [form, setForm] = useState(editing || empty);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);

  useEffect(() => { setForm(editing || empty); }, [editing]);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function addProductOverride(product) {
    if (form.items.find(i => i.product_id === product.id)) {
      return toast.error("الصنف موجود بالفعل");
    }
    const basePrice = product.retail_price || product.wholesale_price || 0;
    setForm(p => ({
      ...p,
      items: [...p.items, { product_id: product.id, product_name: product.name, price: basePrice, discount_percent: 0 }]
    }));
    setProductSearch("");
    setShowProductSearch(false);
  }

  function updateItem(idx, key, val) {
    setForm(p => ({
      ...p,
      items: p.items.map((item, i) => i === idx ? { ...item, [key]: val } : item)
    }));
  }

  function removeItem(idx) {
    setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.name) return toast.error("أدخل اسم قائمة الأسعار");
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.PriceList.update(editing.id, form);
        toast.success("تم تحديث قائمة الأسعار");
      } else {
        await base44.entities.PriceList.create(form);
        toast.success("تم إنشاء قائمة الأسعار");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
    setSaving(false);
  }

  const filteredProducts = products.filter(p =>
    !form.items.find(i => i.product_id === p.id) &&
    (p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.item_code?.includes(productSearch))
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            {editing ? "تعديل قائمة الأسعار" : "قائمة أسعار جديدة"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs">اسم قائمة الأسعار *</Label>
              <Input value={form.name} onChange={e => f("name", e.target.value)} placeholder="مثال: أسعار الموزعين" className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">الرمز</Label>
              <Input value={form.code} onChange={e => f("code", e.target.value)} placeholder="PL-001" className="h-9 mt-1 font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">فئة العميل</Label>
              <Select value={form.customer_type} onValueChange={v => f("customer_type", v)}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CUSTOMER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">مستوى السعر الأساسي</Label>
              <Select value={form.price_level} onValueChange={v => f("price_level", v)}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{PRICE_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">
                {form.price_level === "سعر التكلفة + هامش" ? "هامش الربح %" : "خصم إجمالي %"}
              </Label>
              {form.price_level === "سعر التكلفة + هامش" ? (
                <Input type="number" min="0" max="500" value={form.margin_percent}
                  onChange={e => f("margin_percent", parseFloat(e.target.value) || 0)} className="h-9 mt-1" />
              ) : (
                <Input type="number" min="0" max="100" value={form.discount_percent}
                  onChange={e => f("discount_percent", parseFloat(e.target.value) || 0)} className="h-9 mt-1" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">صالحة من</Label>
              <Input type="date" value={form.valid_from} onChange={e => f("valid_from", e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">صالحة حتى</Label>
              <Input type="date" value={form.valid_to} onChange={e => f("valid_to", e.target.value)} className="h-9 mt-1" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.is_active} onCheckedChange={v => f("is_active", v)} />
            <Label className="text-sm">قائمة الأسعار نشطة</Label>
          </div>

          {/* Product-specific overrides */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">أسعار مخصصة لأصناف بعينها (اختياري)</Label>
              <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setShowProductSearch(v => !v)}>
                <Plus className="h-3.5 w-3.5" /> إضافة صنف
              </Button>
            </div>

            {showProductSearch && (
              <div className="relative mb-2">
                <Search className="absolute right-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  className="pr-8 h-9"
                  placeholder="ابحث عن صنف..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
                {productSearch && filteredProducts.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-card border rounded-lg shadow-lg max-h-44 overflow-y-auto">
                    {filteredProducts.slice(0, 10).map(p => (
                      <button key={p.id} className="w-full text-right px-3 py-2 text-sm hover:bg-muted border-b last:border-0 flex justify-between items-center"
                        onClick={() => addProductOverride(p)}>
                        <span className="text-muted-foreground text-xs font-mono">{p.item_code}</span>
                        <span className="font-medium">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.items.length > 0 && (
              <div className="border rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                  <div className="col-span-5">الصنف</div>
                  <div className="col-span-3 text-center">السعر المخصص</div>
                  <div className="col-span-3 text-center">خصم %</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="divide-y">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 px-3 py-2 items-center gap-1">
                      <div className="col-span-5 text-sm font-medium">{item.product_name}</div>
                      <div className="col-span-3">
                        <Input type="number" min="0" step="0.01" value={item.price}
                          onChange={e => updateItem(idx, "price", parseFloat(e.target.value) || 0)}
                          className="h-7 text-center text-xs font-mono" />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" min="0" max="100" step="0.1" value={item.discount_percent}
                          onChange={e => updateItem(idx, "discount_percent", parseFloat(e.target.value) || 0)}
                          className="h-7 text-center text-xs" />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.items.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                سيُطبَّق الخصم الإجمالي على جميع الأصناف — أضف أصنافاً بعينها لتجاوز السعر الإجمالي
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PriceLists() {
  const [lists, setLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [pl, pr] = await Promise.all([
      base44.entities.PriceList.list().catch(() => []),
      base44.entities.Product.list().catch(() => []),
    ]);
    setLists(pl);
    setProducts(pr);
    setLoading(false);
  }

  async function toggleActive(item) {
    await base44.entities.PriceList.update(item.id, { is_active: !item.is_active });
    loadData();
    toast.success(item.is_active ? "تم تعطيل قائمة الأسعار" : "تم تفعيل قائمة الأسعار");
  }

  async function handleDelete(item) {
    if (!confirm(`هل أنت متأكد من حذف قائمة "${item.name}"؟`)) return;
    await base44.entities.PriceList.delete(item.id);
    toast.success("تم الحذف");
    loadData();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            قوائم الأسعار ومستويات التسعير
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة أسعار متعددة لكل فئة من العملاء والموزعين</p>
        </div>
        <Button className="gap-1.5" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> قائمة جديدة
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">لا توجد قوائم أسعار — أنشئ قائمة جديدة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lists.map(pl => (
            <Card key={pl.id} className={cn("transition-all", !pl.is_active && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn("text-xs", TYPE_COLORS[pl.customer_type] || "bg-slate-100 text-slate-700")}>
                      {pl.customer_type}
                    </Badge>
                    <Badge variant={pl.is_active ? "default" : "secondary"} className="text-xs">
                      {pl.is_active ? "نشطة" : "معطلة"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(pl); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(pl)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-bold text-base">{pl.name}</h3>
                {pl.code && <p className="text-xs text-muted-foreground font-mono mt-0.5">{pl.code}</p>}

                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Percent className="h-3.5 w-3.5" />
                    <span>
                      {pl.price_level}
                      {pl.price_level === "سعر التكلفة + هامش"
                        ? ` + ${pl.margin_percent || 0}% هامش`
                        : pl.discount_percent > 0
                        ? ` — خصم ${pl.discount_percent}%`
                        : ""}
                    </span>
                  </div>
                  {(pl.items?.length || 0) > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <List className="h-3.5 w-3.5" />
                      <span>{pl.items.length} صنف بسعر مخصص</span>
                    </div>
                  )}
                  {(pl.valid_from || pl.valid_to) && (
                    <p className="text-xs text-muted-foreground">
                      الصلاحية: {pl.valid_from || "—"} → {pl.valid_to || "—"}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Switch checked={pl.is_active} onCheckedChange={() => toggleActive(pl)} />
                  <span className="text-xs text-muted-foreground">{pl.is_active ? "نشطة" : "معطلة"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dialogOpen && (
        <PriceListForm
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditing(null); }}
          onSaved={loadData}
          editing={editing}
          products={products}
        />
      )}
    </div>
  );
}