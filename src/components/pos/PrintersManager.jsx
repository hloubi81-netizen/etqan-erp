import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Plus, Pencil, Trash2, Wifi, WifiOff, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMPTY = { name: "", ip_address: "", port: 9100, department: "", is_main: false, is_active: true, notes: "" };

export default function PrintersManager() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPrinters(); }, []);

  async function fetchPrinters() {
    setLoading(true);
    const data = await base44.entities.Printer.list();
    setPrinters(data);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setShowDialog(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({ ...p });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.name || !form.ip_address || !form.department) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    setSaving(true);
    if (editing) {
      await base44.entities.Printer.update(editing.id, form);
      toast.success("تم تحديث الطابعة");
    } else {
      await base44.entities.Printer.create(form);
      toast.success("تمت إضافة الطابعة");
    }
    setSaving(false);
    setShowDialog(false);
    fetchPrinters();
  }

  async function handleDelete(id) {
    await base44.entities.Printer.delete(id);
    toast.success("تم حذف الطابعة");
    fetchPrinters();
  }

  async function toggleActive(p) {
    await base44.entities.Printer.update(p.id, { is_active: !p.is_active });
    fetchPrinters();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Printer className="h-4 w-4 text-primary" />
            إدارة طابعات الأقسام
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">ربط طابعة بكل قسم لطباعة الطلبات تلقائياً</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          إضافة طابعة
        </Button>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : printers.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl">
          <Printer className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">لا توجد طابعات مضافة</p>
          <p className="text-xs mt-1">أضف طابعة لكل قسم لتفعيل الطباعة التلقائية</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {printers.map((p) => (
            <div key={p.id} className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all",
              p.is_active ? "bg-card" : "bg-muted/20 opacity-60"
            )}>
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                p.is_active ? "bg-primary/10" : "bg-muted"
              )}>
                {p.is_active ? (
                  <Wifi className="h-5 w-5 text-primary" />
                ) : (
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{p.name}</p>
                  {p.is_main && (
                    <Badge className="text-[10px] px-1.5 py-0 gap-1 bg-amber-100 text-amber-700 border-amber-200">
                      <Star className="h-2.5 w-2.5" />
                      رئيسية
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {p.department}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.ip_address}:{p.port || 9100}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(p)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-md border transition-colors",
                    p.is_active ? "text-green-700 border-green-200 bg-green-50 hover:bg-green-100" : "text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {p.is_active ? "مفعلة" : "معطلة"}
                </button>
                <button onClick={() => openEdit(p)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs space-y-1">
        <p className="font-semibold">كيف يعمل النظام؟</p>
        <p>• عند إتمام طلب في نقطة البيع، يتم تحليل منتجات الطلب حسب قسم الطباعة المحدد لكل منتج</p>
        <p>• يُرسل تلقائياً ورقة طباعة مخصصة لكل قسم (مثل: المطبخ، البار)</p>
        <p>• الطابعة الرئيسية تطبع الإيصال الكامل للعميل</p>
        <p>• تأكد من أن جميع الطابعات متصلة بنفس الشبكة وتدعم بروتوكول ESC/POS</p>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-primary" />
              {editing ? "تعديل الطابعة" : "إضافة طابعة جديدة"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="mb-1.5 block text-sm">اسم الطابعة *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: طابعة المطبخ" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">عنوان IP *</Label>
                <Input value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} placeholder="192.168.1.100" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">المنفذ (Port)</Label>
                <Input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: +e.target.value }))} placeholder="9100" />
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5 block text-sm">القسم *</Label>
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="مثال: المطبخ، البار، المشويات..." />
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5 block text-sm">ملاحظات</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="أي ملاحظات إضافية" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_main} onChange={e => setForm(f => ({ ...f, is_main: e.target.checked }))} className="rounded" />
                <span className="text-sm">طابعة رئيسية (تطبع الإيصال الكامل للعميل)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                <span className="text-sm">مفعلة</span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}