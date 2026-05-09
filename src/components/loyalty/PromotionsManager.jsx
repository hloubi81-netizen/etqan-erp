import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Tag, Calendar, Search, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_FORM = {
  name: "", type: "خصم بنسبة %", discount_percent: "", discount_amount: "",
  buy_qty: "", free_qty: "", applies_to: "الكل", product_name: "", product_group_name: "",
  min_amount: "", start_date: "", end_date: "", applicable_to: "الكل", is_active: true, notes: ""
};

function isActive(p) {
  if (!p.is_active) return false;
  const today = new Date().toISOString().split("T")[0];
  return (!p.start_date || p.start_date <= today) && (!p.end_date || p.end_date >= today);
}

function daysLeft(endDate) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function PromotionsManager() {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState([]);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Promotion.list("-created_date");
    setPromotions(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = promotions.filter(p => p.name?.includes(search));

  const openAdd = () => { setForm(DEFAULT_FORM); setEditing(null); setShowDialog(true); };
  const openEdit = (p) => {
    setForm({ ...DEFAULT_FORM, ...p });
    setEditing(p);
    setShowDialog(true);
  };

  const save = async () => {
    if (!form.name || !form.type || !form.start_date || !form.end_date) {
      toast({ title: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    const data = { ...form };
    if (editing) await base44.entities.Promotion.update(editing.id, data);
    else await base44.entities.Promotion.create(data);
    setShowDialog(false);
    load();
    toast({ title: "تم الحفظ بنجاح" });
  };

  const toggleActive = async (p) => {
    await base44.entities.Promotion.update(p.id, { is_active: !p.is_active });
    load();
  };

  const del = async (p) => {
    await base44.entities.Promotion.delete(p.id);
    load();
    toast({ title: "تم الحذف" });
  };

  const activeCount = promotions.filter(isActive).length;
  const expiredCount = promotions.filter(p => p.end_date && p.end_date < new Date().toISOString().split("T")[0]).length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "إجمالي العروض", value: promotions.length, color: "bg-blue-500" },
          { label: "العروض النشطة", value: activeCount, color: "bg-green-500" },
          { label: "العروض المنتهية", value: expiredCount, color: "bg-red-400" },
        ].map((k, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold`}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" /> عرض جديد</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-10 text-muted-foreground">جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 text-center py-10 text-muted-foreground">لا توجد عروض</div>
        ) : filtered.map(p => {
          const active = isActive(p);
          const days = daysLeft(p.end_date);
          return (
            <Card key={p.id} className={`border-r-4 ${active ? "border-r-green-500" : "border-r-gray-300"}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.type}</p>
                  </div>
                  <Badge className={active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                    {active ? "نشط" : "غير نشط"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {p.type === "خصم بنسبة %" && (
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">{p.discount_percent}% خصم</span>
                  )}
                  {p.type === "خصم بمبلغ ثابت" && (
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">{p.discount_amount} خصم ثابت</span>
                  )}
                  {p.type === "اشتري X واحصل على Y مجاناً" && (
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-semibold">اشتري {p.buy_qty} واحصل على {p.free_qty} مجاناً</span>
                  )}
                  <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded">{p.applicable_to}</span>
                  {p.applies_to !== "الكل" && (
                    <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{p.product_name || p.product_group_name}</span>
                  )}
                  {p.min_amount > 0 && (
                    <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded">حد أدنى: {p.min_amount}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{p.start_date} ← {p.end_date}</span>
                  {days !== null && (
                    <span className={`font-semibold ${days < 0 ? "text-red-500" : days <= 3 ? "text-orange-500" : "text-green-600"}`}>
                      {days < 0 ? `انتهى منذ ${Math.abs(days)} يوم` : `متبقي ${days} يوم`}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => del(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span>{p.is_active ? "مفعّل" : "معطّل"}</span>
                    <Switch checked={!!p.is_active} onCheckedChange={() => toggleActive(p)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل العرض" : "عرض خاص جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">اسم العرض *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: عرض الصيف 2026" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">نوع العرض *</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="خصم بنسبة %">خصم بنسبة %</SelectItem>
                    <SelectItem value="خصم بمبلغ ثابت">خصم بمبلغ ثابت</SelectItem>
                    <SelectItem value="اشتري X واحصل على Y مجاناً">اشتري X واحصل على Y مجاناً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">يُطبَّق في</label>
                <Select value={form.applicable_to} onValueChange={v => setForm({ ...form, applicable_to: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الكل">الكل</SelectItem>
                    <SelectItem value="العملاء فقط">العملاء فقط</SelectItem>
                    <SelectItem value="نقطة البيع فقط">نقطة البيع فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type === "خصم بنسبة %" && (
              <div>
                <label className="text-sm font-medium mb-1 block">نسبة الخصم %</label>
                <Input type="number" value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: e.target.value })} placeholder="10" />
              </div>
            )}
            {form.type === "خصم بمبلغ ثابت" && (
              <div>
                <label className="text-sm font-medium mb-1 block">مبلغ الخصم</label>
                <Input type="number" value={form.discount_amount} onChange={e => setForm({ ...form, discount_amount: e.target.value })} placeholder="50" />
              </div>
            )}
            {form.type === "اشتري X واحصل على Y مجاناً" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">كمية الشراء (X)</label>
                  <Input type="number" value={form.buy_qty} onChange={e => setForm({ ...form, buy_qty: e.target.value })} placeholder="2" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">الكمية المجانية (Y)</label>
                  <Input type="number" value={form.free_qty} onChange={e => setForm({ ...form, free_qty: e.target.value })} placeholder="1" />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">الحد الأدنى للمبلغ</label>
              <Input type="number" value={form.min_amount} onChange={e => setForm({ ...form, min_amount: e.target.value })} placeholder="0 = بدون حد أدنى" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">تاريخ البداية *</label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">تاريخ الانتهاء *</label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">ملاحظات</label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <label className="text-sm">تفعيل العرض</label>
            </div>

            <Button className="w-full" onClick={save}>حفظ العرض</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}