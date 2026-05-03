import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Zap, CheckCircle, Download, Info } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_RULES } from "@/utils/journalEngine";
import AccountSearchInput from "@/components/shared/AccountSearchInput";

const TRIGGERS = ["فاتورة مبيعات", "فاتورة مشتريات", "مرتجع مبيعات", "مرتجع مشتريات", "سند قبض", "سند صرف", "سند يومية"];
const PAYMENT_METHODS = ["الكل", "نقداً", "آجل", "بنك"];

const EMPTY = {
  name: "", trigger: "فاتورة مبيعات", payment_method: "الكل",
  debit_account_id: "", debit_account_name: "",
  credit_account_id: "", credit_account_name: "",
  description_template: "", is_active: true, notes: ""
};

const TRIGGER_COLORS = {
  "فاتورة مبيعات": "bg-emerald-100 text-emerald-700",
  "فاتورة مشتريات": "bg-blue-100 text-blue-700",
  "مرتجع مبيعات": "bg-orange-100 text-orange-700",
  "مرتجع مشتريات": "bg-red-100 text-red-700",
  "سند قبض": "bg-purple-100 text-purple-700",
  "سند صرف": "bg-yellow-100 text-yellow-700",
  "سند يومية": "bg-gray-100 text-gray-700",
};

export default function JournalRules() {
  const [rules, setRules] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.JournalRule.list("-created_date"),
      base44.entities.Account.filter({ is_parent: false })
    ]).then(([r, a]) => { setRules(r); setAccounts(a); setLoading(false); });
  }, []);

  function openAdd() { setForm(EMPTY); setEditing(null); setOpen(true); }
  function openEdit(rule) { setForm({ ...rule }); setEditing(rule.id); setOpen(true); }

  async function save() {
    if (!form.name || !form.debit_account_id || !form.credit_account_id) {
      toast.error("اسم القاعدة وحسابا المدين والدائن مطلوبة");
      return;
    }
    if (editing) {
      await base44.entities.JournalRule.update(editing, form);
      setRules((p) => p.map((r) => r.id === editing ? { ...r, ...form } : r));
    } else {
      const created = await base44.entities.JournalRule.create(form);
      setRules((p) => [created, ...p]);
    }
    toast.success("تم الحفظ");
    setOpen(false);
  }

  async function del(id) {
    if (!confirm("حذف هذه القاعدة؟")) return;
    await base44.entities.JournalRule.delete(id);
    setRules((p) => p.filter((r) => r.id !== id));
    toast.success("تم الحذف");
  }

  async function toggleActive(rule) {
    const updated = { ...rule, is_active: !rule.is_active };
    await base44.entities.JournalRule.update(rule.id, { is_active: updated.is_active });
    setRules((p) => p.map((r) => r.id === rule.id ? updated : r));
  }

  async function importDefaults() {
    if (!confirm("سيتم استيراد القواعد الافتراضية. هل تريد المتابعة؟")) return;
    for (const rule of DEFAULT_RULES) {
      const created = await base44.entities.JournalRule.create(rule);
      setRules((p) => [created, ...p]);
    }
    toast.success(`تم استيراد ${DEFAULT_RULES.length} قواعد افتراضية`);
  }

  function setAccount(idKey, nameKey, accountId) {
    const acc = accounts.find((a) => a.id === accountId);
    setForm((p) => ({ ...p, [idKey]: accountId, [nameKey]: acc?.name || "" }));
  }

  const activeCount = rules.filter((r) => r.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">محرك قواعد اليومية التلقائية</h1>
          <p className="text-sm text-muted-foreground mt-1">أتمتة إنشاء قيود اليومية بناءً على العمليات المحاسبية</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={importDefaults} className="gap-2 text-xs">
            <Download className="h-3.5 w-3.5" />استيراد القواعد الافتراضية
          </Button>
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />إضافة قاعدة</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["إجمالي القواعد", rules.length, "bg-indigo-500"],
          ["قواعد نشطة", activeCount, "bg-emerald-500"],
          ["قواعد معطّلة", rules.length - activeCount, "bg-gray-400"],
          ["أنواع العمليات", new Set(rules.map((r) => r.trigger)).size, "bg-violet-500"],
        ].map(([lbl, val, bg]) => (
          <Card key={lbl}><CardContent className="p-4 flex items-center gap-3">
            <div className={`h-9 w-9 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{lbl}</p>
              <p className="text-xl font-bold">{val}</p>
            </div>
          </CardContent></Card>
        ))}
      </div>

      {/* How it works */}
      <Card className="border-indigo-100 bg-indigo-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
            <div className="text-sm text-indigo-800">
              <p className="font-semibold mb-1">كيف يعمل المحرك؟</p>
              <p className="text-xs text-indigo-600 leading-relaxed">
                عند ترحيل أي عملية (فاتورة، سند...)، يبحث المحرك تلقائياً عن القواعد المطابقة للحدث وطريقة الدفع، ثم ينشئ قيد يومية محاسبي مباشرةً في دفتر الأستاذ بدون تدخل يدوي.
                يمكنك تفعيل القاعدة أو تعطيلها في أي وقت.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : rules.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد قواعد. أضف قاعدة أو استورد القواعد الافتراضية.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["القاعدة", "الحدث المشغّل", "طريقة الدفع", "حساب المدين", "حساب الدائن", "قالب البيان", "الحالة", "إجراءات"].map((h) => (
                  <th key={h} className="p-3 text-right text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3 font-semibold">{rule.name}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${TRIGGER_COLORS[rule.trigger] || "bg-gray-100 text-gray-700"}`}>
                        {rule.trigger}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{rule.payment_method || "الكل"}</td>
                    <td className="p-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{rule.debit_account_name || "—"}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{rule.credit_account_name || "—"}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[160px] truncate">{rule.description_template || "—"}</td>
                    <td className="p-3">
                      <Switch checked={!!rule.is_active} onCheckedChange={() => toggleActive(rule)} />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(rule)} className="text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => del(rule.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "تعديل قاعدة" : "إضافة قاعدة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">اسم القاعدة*</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 h-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الحدث المشغّل*</Label>
                <Select value={form.trigger} onValueChange={(v) => setForm((p) => ({ ...p, trigger: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">طريقة الدفع</Label>
                <Select value={form.payment_method || "الكل"} onValueChange={(v) => setForm((p) => ({ ...p, payment_method: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Debit Account */}
            <div>
              <Label className="text-xs">حساب المدين (Debit)*</Label>
              <AccountSearchInput
                accounts={accounts}
                value={form.debit_account_id || ""}
                onChange={(id, name) => setAccount("debit_account_id", "debit_account_name", id)}
                placeholder="ابحث عن حساب المدين..."
              />
            </div>

            {/* Credit Account */}
            <div>
              <Label className="text-xs">حساب الدائن (Credit)*</Label>
              <AccountSearchInput
                accounts={accounts}
                value={form.credit_account_id || ""}
                onChange={(id, name) => setAccount("credit_account_id", "credit_account_name", id)}
                placeholder="ابحث عن حساب الدائن..."
              />
            </div>

            {/* Description Template */}
            <div>
              <Label className="text-xs">قالب البيان <span className="text-muted-foreground">(يمكن استخدام: {"{رقم}"} {"{عميل}"} {"{تاريخ}"} {"{مبلغ}"})</span></Label>
              <Input value={form.description_template || ""} onChange={(e) => setForm((p) => ({ ...p, description_template: e.target.value }))}
                placeholder="مثال: إيراد مبيعات - فاتورة {رقم} - {عميل}" className="mt-1 h-8 text-xs" />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
              <Label className="text-xs">تفعيل القاعدة</Label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={save} className="flex-1">حفظ</Button>
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}