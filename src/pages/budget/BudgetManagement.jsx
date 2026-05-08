import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import { Progress } from "@/components/ui/progress";

const emptyForm = () => ({
  name: "", year: new Date().getFullYear().toString(),
  period_type: "سنوية", period_label: "",
  cost_center_id: "", cost_center_name: "",
  items: [], total_budgeted: 0, total_actual: 0, notes: "", status: "مسودة"
});

export default function BudgetManagement() {
  const [budgets, setBudgets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [b, a, cc] = await Promise.all([
      base44.entities.Budget.list("-created_date"),
      base44.entities.Account.filter({ is_parent: false }),
      base44.entities.CostCenter.list()
    ]);
    setBudgets(b); setAccounts(a); setCostCenters(cc);
    setLoading(false);
  }

  function openNew() { setEditing(null); setForm(emptyForm()); setDialogOpen(true); }
  function openEdit(b) { setEditing(b); setForm({ ...b }); setDialogOpen(true); }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { account_id: "", account_name: "", budgeted_amount: 0, actual_amount: 0, variance: 0 }] }));
  }

  function updateItem(idx, key, val) {
    setForm(f => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [key]: val };
        if (key === "account_id") {
          const a = accounts.find(x => x.id === val);
          if (a) updated.account_name = a.name;
        }
        updated.variance = (updated.budgeted_amount || 0) - (updated.actual_amount || 0);
        return updated;
      });
      const total_budgeted = items.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
      const total_actual = items.reduce((s, i) => s + (i.actual_amount || 0), 0);
      return { ...f, items, total_budgeted, total_actual };
    });
  }

  async function handleSave() {
    if (!form.name) return toast.error("ادخل اسم الميزانية");
    if (editing) await base44.entities.Budget.update(editing.id, form);
    else await base44.entities.Budget.create(form);
    toast.success("تم الحفظ");
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(b) {
    await base44.entities.Budget.delete(b.id);
    toast.success("تم الحذف"); loadData();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="الميزانية والتخطيط المالي" subtitle="إنشاء وتتبع الميزانيات ومقارنتها بالأرقام الفعلية" onAdd={openNew} addLabel="ميزانية جديدة" />

      {!selected ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => {
            const pct = b.total_budgeted > 0 ? Math.min(100, Math.round((b.total_actual / b.total_budgeted) * 100)) : 0;
            const over = b.total_actual > b.total_budgeted;
            return (
              <Card key={b.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(b)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{b.name}</CardTitle>
                    <Badge variant={b.status === "معتمدة" ? "default" : "secondary"}>{b.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.year} · {b.period_type}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الميزانية</span>
                    <span className="font-medium">{(b.total_budgeted || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الفعلي</span>
                    <span className={`font-medium ${over ? "text-destructive" : "text-success"}`}>{(b.total_actual || 0).toLocaleString()}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">{pct}% مستخدم</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={e => { e.stopPropagation(); openEdit(b); }}>تعديل</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); handleDelete(b); }}>حذف</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {budgets.length === 0 && <div className="col-span-3 text-center py-16 text-muted-foreground">لا توجد ميزانيات. أنشئ ميزانية جديدة.</div>}
        </div>
      ) : (
        <div>
          <Button variant="outline" className="mb-4" onClick={() => setSelected(null)}>← رجوع</Button>
          <Card>
            <CardHeader>
              <CardTitle>{selected.name} — {selected.year}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr>
                    <th className="p-3 text-right">الحساب</th>
                    <th className="p-3 text-right">الميزانية</th>
                    <th className="p-3 text-right">الفعلي</th>
                    <th className="p-3 text-right">الفرق</th>
                    <th className="p-3 text-right">%</th>
                  </tr></thead>
                  <tbody>
                    {(selected.items || []).map((item, idx) => {
                      const pct = item.budgeted_amount > 0 ? Math.round((item.actual_amount / item.budgeted_amount) * 100) : 0;
                      const v = item.variance || 0;
                      return (
                        <tr key={idx} className="border-t">
                          <td className="p-3">{item.account_name}</td>
                          <td className="p-3">{(item.budgeted_amount || 0).toLocaleString()}</td>
                          <td className="p-3">{(item.actual_amount || 0).toLocaleString()}</td>
                          <td className={`p-3 font-medium flex items-center gap-1 ${v >= 0 ? "text-success" : "text-destructive"}`}>
                            {v >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            {Math.abs(v).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(pct, 100)} className="h-1.5 w-16" />
                              <span className="text-xs">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted font-bold">
                    <tr>
                      <td className="p-3">الإجمالي</td>
                      <td className="p-3">{(selected.total_budgeted || 0).toLocaleString()}</td>
                      <td className="p-3">{(selected.total_actual || 0).toLocaleString()}</td>
                      <td className="p-3">{((selected.total_budgeted || 0) - (selected.total_actual || 0)).toLocaleString()}</td>
                      <td className="p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل الميزانية" : "ميزانية جديدة"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>الاسم</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>السنة</Label><Input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} /></div>
            <div>
              <Label>نوع الفترة</Label>
              <Select value={form.period_type} onValueChange={v => setForm(f => ({ ...f, period_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="سنوية">سنوية</SelectItem>
                  <SelectItem value="ربع سنوية">ربع سنوية</SelectItem>
                  <SelectItem value="شهرية">شهرية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>مركز التكلفة</Label>
              <Select value={form.cost_center_id} onValueChange={v => { const cc = costCenters.find(x => x.id === v); setForm(f => ({ ...f, cost_center_id: v, cost_center_name: cc?.name || "" })); }}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">بنود الميزانية</h3>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 ml-1" />إضافة بند</Button>
            </div>
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-muted"><tr>
                <th className="p-2 text-right">الحساب</th>
                <th className="p-2 text-right">الميزانية</th>
                <th className="p-2 text-right">الفعلي</th>
                <th className="p-2 text-right">الفرق</th>
                <th className="p-2"></th>
              </tr></thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <Select value={item.account_id} onValueChange={v => updateItem(idx, "account_id", v)}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="الحساب" /></SelectTrigger>
                        <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-2"><Input type="number" className="h-8 w-24" value={item.budgeted_amount} onChange={e => updateItem(idx, "budgeted_amount", +e.target.value)} /></td>
                    <td className="p-2"><Input type="number" className="h-8 w-24" value={item.actual_amount} onChange={e => updateItem(idx, "actual_amount", +e.target.value)} /></td>
                    <td className="p-2 font-medium">{(item.variance || 0).toLocaleString()}</td>
                    <td className="p-2"><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setForm(f => { const items = f.items.filter((_, i) => i !== idx); return { ...f, items }; })}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}