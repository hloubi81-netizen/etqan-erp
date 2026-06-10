import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Percent, Star, CheckCircle2, XCircle } from "lucide-react";

const TYPE_COLORS = {
  "قيمة مضافة":    "bg-blue-100 text-blue-700",
  "ضريبة مبيعات":  "bg-indigo-100 text-indigo-700",
  "ضريبة دمغة":    "bg-purple-100 text-purple-700",
  "ضريبة خدمات":   "bg-violet-100 text-violet-700",
  "معفاة":          "bg-green-100 text-green-700",
  "صفرية":          "bg-gray-100 text-gray-600",
};

const EMPTY = { name: "", code: "", rate: 0, type: "قيمة مضافة", applies_to: "مبيعات ومشتريات", is_default: false, is_active: true, description: "", account_id: "", account_name: "" };

export default function TaxRates() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed, {} = new, {id,...} = edit
  const [saving, setSaving] = useState(false);

  const load = () => {
    base44.entities.TaxRate.list("-created_date").then(d => { setRates(d); setLoading(false); });
  };
  useEffect(load, []);

  const openNew = () => setForm({ ...EMPTY });
  const openEdit = (r) => setForm({ ...r });

  const save = async () => {
    if (!form.name || form.rate === undefined || form.rate === "") { toast.error("اسم ونسبة الضريبة مطلوبان"); return; }
    setSaving(true);
    // إذا كانت افتراضية، نلغي الافتراضية من باقي السجلات
    if (form.is_default) {
      const others = rates.filter(r => r.is_default && r.id !== form.id);
      await Promise.all(others.map(r => base44.entities.TaxRate.update(r.id, { is_default: false })));
    }
    if (form.id) {
      await base44.entities.TaxRate.update(form.id, form);
    } else {
      await base44.entities.TaxRate.create(form);
    }
    toast.success("تم الحفظ بنجاح");
    setSaving(false);
    setForm(null);
    load();
  };

  const remove = async (r) => {
    if (!confirm(`حذف "${r.name}"؟`)) return;
    await base44.entities.TaxRate.delete(r.id);
    toast.success("تم الحذف");
    load();
  };

  const toggleActive = async (r) => {
    await base44.entities.TaxRate.update(r.id, { is_active: !r.is_active });
    load();
  };

  const setDefault = async (r) => {
    const others = rates.filter(x => x.is_default && x.id !== r.id);
    await Promise.all(others.map(x => base44.entities.TaxRate.update(x.id, { is_default: false })));
    await base44.entities.TaxRate.update(r.id, { is_default: true });
    toast.success("تم تعيين النسبة الافتراضية");
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            إدارة النسب الضريبية
          </h1>
          <p className="text-sm text-muted-foreground">تعريف نسب ضريبة القيمة المضافة وتطبيقها على الفواتير</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> إضافة نسبة ضريبية
        </Button>
      </div>

      {/* Summary boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "إجمالي النسب", value: rates.length, bg: "bg-blue-50 border-blue-200", color: "text-blue-700" },
          { label: "النسب النشطة", value: rates.filter(r => r.is_active).length, bg: "bg-green-50 border-green-200", color: "text-green-700" },
          { label: "معفاة / صفرية", value: rates.filter(r => r.type === "معفاة" || r.type === "صفرية").length, bg: "bg-gray-50 border-gray-200", color: "text-gray-700" },
          { label: "الافتراضية", value: rates.find(r => r.is_default)?.name || "—", bg: "bg-amber-50 border-amber-200", color: "text-amber-700" },
        ].map((b, i) => (
          <Card key={i} className={`border ${b.bg}`}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">{b.label}</p>
              <p className={`text-xl font-bold ${b.color}`}>{b.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">قائمة النسب الضريبية</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rates.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Percent className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد نسب ضريبية بعد</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openNew}>إضافة أول نسبة</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">الاسم</th>
                    <th className="px-4 py-3 text-right font-medium">الرمز</th>
                    <th className="px-4 py-3 text-right font-medium">النسبة %</th>
                    <th className="px-4 py-3 text-right font-medium">النوع</th>
                    <th className="px-4 py-3 text-right font-medium">تطبّق على</th>
                    <th className="px-4 py-3 text-right font-medium">الحالة</th>
                    <th className="px-4 py-3 text-right font-medium">افتراضية</th>
                    <th className="px-4 py-3 text-right font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map(r => (
                    <tr key={r.id} className={`border-t hover:bg-muted/20 transition-colors ${!r.is_active ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-semibold">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{r.code || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-lg font-bold text-primary">{r.rate}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[r.type] || "bg-gray-100 text-gray-600"}`}>{r.type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.applies_to}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(r)} className="flex items-center gap-1 text-xs">
                          {r.is_active
                            ? <><CheckCircle2 className="h-4 w-4 text-green-500" /> <span className="text-green-600">نشطة</span></>
                            : <><XCircle className="h-4 w-4 text-gray-400" /> <span className="text-gray-400">معطّلة</span></>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {r.is_default
                          ? <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
                          : <button onClick={() => setDefault(r)} className="text-xs text-muted-foreground hover:text-amber-500 transition-colors"><Star className="h-4 w-4" /></button>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {form && (
        <Dialog open onOpenChange={() => setForm(null)}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                {form.id ? "تعديل نسبة ضريبية" : "إضافة نسبة ضريبية جديدة"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="mb-1.5 block text-sm">اسم الضريبة *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: ضريبة القيمة المضافة 15%" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">الرمز (اختياري)</Label>
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="VAT15" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">النسبة % *</Label>
                  <Input type="number" min="0" max="100" step="0.01" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: +e.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">نوع الضريبة</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["قيمة مضافة","ضريبة مبيعات","ضريبة دمغة","ضريبة خدمات","معفاة","صفرية"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">تطبّق على</Label>
                  <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="مبيعات ومشتريات">مبيعات ومشتريات</SelectItem>
                      <SelectItem value="مبيعات فقط">مبيعات فقط</SelectItem>
                      <SelectItem value="مشتريات فقط">مشتريات فقط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="mb-1.5 block text-sm">وصف / ملاحظات</Label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف اختياري" />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted/30">
                  <input type="checkbox" checked={!!form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
                  <div>
                    <p className="text-sm font-medium">النسبة الافتراضية</p>
                    <p className="text-xs text-muted-foreground">ستُطبَّق تلقائياً على الفواتير الجديدة</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted/30">
                  <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
                  <div>
                    <p className="text-sm font-medium">نشطة</p>
                    <p className="text-xs text-muted-foreground">يمكن اختيارها عند إنشاء الفواتير</p>
                  </div>
                </label>
              </div>

              {/* Preview */}
              {form.rate > 0 && (
                <div className="bg-muted/30 rounded-xl p-3 border">
                  <p className="text-xs text-muted-foreground mb-2">معاينة الحساب</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span>مبلغ الفاتورة: <strong>1,000</strong></span>
                    <span>←</span>
                    <span className="text-primary font-bold">ضريبة: {(1000 * form.rate / 100).toFixed(2)}</span>
                    <span>←</span>
                    <span className="font-bold">الإجمالي: {(1000 + 1000 * form.rate / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setForm(null)}>إلغاء</Button>
                <Button onClick={save} disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}