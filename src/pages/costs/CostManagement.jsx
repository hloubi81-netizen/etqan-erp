import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Calculator } from "lucide-react";
import { toast } from "sonner";

const COST_TYPES = ["مواد مباشرة", "عمالة مباشرة", "تكاليف صناعية غير مباشرة", "مصروفات إدارية", "مصروفات بيع", "مصروفات مالية", "أخرى"];
const empty = { date: "", cost_center_id: "", cost_center_name: "", cost_type: "", account_id: "", account_name: "", description: "", quantity: 1, unit: "", unit_cost: 0, total_cost: 0, branch_id: "", branch_name: "", period: "", notes: "", status: "مسودة" };

export default function CostManagement() {
  const [entries, setEntries] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [filterCC, setFilterCC] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.CostEntry.list("-date"),
      base44.entities.CostCenter.list(),
      base44.entities.Account.list(),
      base44.entities.Branch.list(),
    ]).then(([e, cc, ac, br]) => {
      setEntries(e);
      setCostCenters(cc);
      setAccounts(ac);
      setBranches(br);
      setLoading(false);
    });
  }, []);

  function reload() {
    base44.entities.CostEntry.list("-date").then(setEntries);
  }

  function openNew() { setForm({ ...empty, date: new Date().toISOString().split("T")[0] }); setEditId(null); setOpen(true); }
  function openEdit(e) { setForm({ ...e }); setEditId(e.id); setOpen(true); }

  function handleCC(id) {
    const cc = costCenters.find(c => c.id === id);
    setForm(f => ({ ...f, cost_center_id: id, cost_center_name: cc?.name || "" }));
  }

  function handleAccount(id) {
    const ac = accounts.find(a => a.id === id);
    setForm(f => ({ ...f, account_id: id, account_name: ac?.name || "" }));
  }

  function handleBranch(id) {
    const br = branches.find(b => b.id === id);
    setForm(f => ({ ...f, branch_id: id, branch_name: br?.name || "" }));
  }

  function calcTotal(qty, uc) {
    return (parseFloat(qty) || 0) * (parseFloat(uc) || 0);
  }

  async function save() {
    if (!form.date || !form.cost_center_id || !form.cost_type) return toast.error("يرجى تعبئة الحقول المطلوبة");
    const payload = { ...form, total_cost: calcTotal(form.quantity, form.unit_cost) };
    if (!payload.total_cost) return toast.error("إجمالي التكلفة يجب أن يكون أكبر من صفر");
    if (editId) {
      await base44.entities.CostEntry.update(editId, payload);
      toast.success("تم تحديث قيد التكلفة");
    } else {
      await base44.entities.CostEntry.create(payload);
      toast.success("تم إضافة قيد التكلفة");
    }
    setOpen(false);
    reload();
  }

  async function remove(id) {
    if (!confirm("حذف قيد التكلفة؟")) return;
    await base44.entities.CostEntry.delete(id);
    toast.success("تم الحذف");
    reload();
  }

  const filtered = entries.filter(e =>
    (filterCC === "all" || e.cost_center_id === filterCC) &&
    (filterType === "all" || e.cost_type === filterType)
  );

  const total = filtered.reduce((s, e) => s + (e.total_cost || 0), 0);
  const fmt = v => (v || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 });

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"/></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">نظام التكاليف</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة وتتبع تكاليف مراكز الكلفة</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4"/>قيد تكلفة جديد</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">مركز التكلفة</Label>
              <Select value={filterCC} onValueChange={setFilterCC}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="الكل"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المراكز</SelectItem>
                  {costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع التكلفة</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="الكل"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {COST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex items-end">
              <div className="bg-primary/10 rounded-lg px-4 py-2 flex items-center gap-2 w-full">
                <Calculator className="h-4 w-4 text-primary"/>
                <span className="text-sm text-muted-foreground">إجمالي التكاليف:</span>
                <span className="font-bold text-primary">{fmt(total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-right px-4 py-3 text-xs font-semibold">التاريخ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">مركز التكلفة</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">نوع التكلفة</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">البيان</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">الكمية</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">تكلفة الوحدة</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">الإجمالي</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">الحالة</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">لا توجد قيود تكاليف</td></tr>
                ) : filtered.map((e, i) => (
                  <tr key={e.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                    <td className="px-4 py-2.5">{e.date}</td>
                    <td className="px-4 py-2.5">{e.cost_center_name}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{e.cost_type}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.description}</td>
                    <td className="px-4 py-2.5">{e.quantity} {e.unit}</td>
                    <td className="px-4 py-2.5">{fmt(e.unit_cost)}</td>
                    <td className="px-4 py-2.5 font-semibold text-primary">{fmt(e.total_cost)}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={e.status === "مرحّل" ? "default" : "secondary"} className="text-xs">{e.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3 w-3"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(e.id)}><Trash2 className="h-3 w-3"/></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "تعديل قيد التكلفة" : "قيد تكلفة جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">التاريخ *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الفترة (مثال: 2026-03)</Label>
              <Input placeholder="YYYY-MM" value={form.period} onChange={e => setForm(f => ({...f, period: e.target.value}))}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">مركز التكلفة *</Label>
              <Select value={form.cost_center_id} onValueChange={handleCC}>
                <SelectTrigger><SelectValue placeholder="اختر المركز"/></SelectTrigger>
                <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع التكلفة *</Label>
              <Select value={form.cost_type} onValueChange={v => setForm(f => ({...f, cost_type: v}))}>
                <SelectTrigger><SelectValue placeholder="اختر النوع"/></SelectTrigger>
                <SelectContent>{COST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الحساب</Label>
              <Select value={form.account_id} onValueChange={handleAccount}>
                <SelectTrigger><SelectValue placeholder="اختر الحساب"/></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_number} - {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الفرع</Label>
              <Select value={form.branch_id} onValueChange={handleBranch}>
                <SelectTrigger><SelectValue placeholder="اختر الفرع"/></SelectTrigger>
                <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">البيان</Label>
              <Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="وصف التكلفة"/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الكمية</Label>
              <Input type="number" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value, total_cost: calcTotal(e.target.value, f.unit_cost)}))}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الوحدة</Label>
              <Input value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} placeholder="وحدة قياس"/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تكلفة الوحدة</Label>
              <Input type="number" value={form.unit_cost} onChange={e => setForm(f => ({...f, unit_cost: e.target.value, total_cost: calcTotal(f.quantity, e.target.value)}))}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">إجمالي التكلفة</Label>
              <Input type="number" readOnly value={calcTotal(form.quantity, form.unit_cost)} className="bg-muted/30"/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الحالة</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="مسودة">مسودة</SelectItem>
                  <SelectItem value="مرحّل">مرحّل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ملاحظات</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="ملاحظات"/>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>{editId ? "تحديث" : "حفظ"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}