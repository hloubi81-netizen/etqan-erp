import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, DollarSign, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { employee_id: "", employee_name: "", period: "", basic_salary: 0, allowances: 0, deductions: 0, overtime: 0, net_salary: 0, payment_date: "", status: "مسودة", notes: "" };

export default function Payroll() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState("");

  useEffect(() => {
    Promise.all([base44.entities.SalaryRecord.list("-created_date"), base44.entities.Employee.filter({ status: "نشط" })]).then(([r, e]) => {
      setRecords(r); setEmployees(e); setLoading(false);
    });
  }, []);

  function calcNet(f) {
    return (parseFloat(f.basic_salary) || 0) + (parseFloat(f.allowances) || 0) + (parseFloat(f.overtime) || 0) - (parseFloat(f.deductions) || 0);
  }

  function update(key, val) {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      next.net_salary = calcNet(next);
      return next;
    });
  }

  function selectEmployee(id) {
    const emp = employees.find((e) => e.id === id);
    setForm((p) => {
      const next = { ...p, employee_id: id, employee_name: emp?.name || "", basic_salary: emp?.salary || 0, allowances: emp?.allowances || 0 };
      next.net_salary = calcNet(next);
      return next;
    });
  }

  function openAdd() { setForm(EMPTY); setEditing(null); setOpen(true); }
  function openEdit(r) { setForm({ ...r }); setEditing(r.id); setOpen(true); }

  async function save() {
    if (!form.employee_id || !form.period) { toast.error("الموظف والفترة مطلوبان"); return; }
    if (editing) {
      await base44.entities.SalaryRecord.update(editing, form);
      setRecords((prev) => prev.map((r) => r.id === editing ? { ...r, ...form } : r));
    } else {
      const created = await base44.entities.SalaryRecord.create(form);
      setRecords((prev) => [created, ...prev]);
    }
    toast.success("تم الحفظ");
    setOpen(false);
  }

  async function del(id) {
    if (!confirm("حذف هذا السجل؟")) return;
    await base44.entities.SalaryRecord.delete(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    toast.success("تم الحذف");
  }

  async function markPaid(id) {
    await base44.entities.SalaryRecord.update(id, { status: "مدفوع", payment_date: new Date().toISOString().split("T")[0] });
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: "مدفوع" } : r));
    toast.success("تم تسجيل الصرف");
  }

  const filtered = records.filter((r) => !filterPeriod || r.period?.includes(filterPeriod));
  const totalNet = filtered.reduce((a, r) => a + (r.net_salary || 0), 0);
  const paidCount = filtered.filter((r) => r.status === "مدفوع").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">الرواتب</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة رواتب الموظفين</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="فلترة بالفترة (مثال: 2026-03)" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="h-9 w-44 text-sm" />
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />إضافة راتب</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center"><DollarSign className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-muted-foreground">إجمالي الرواتب</p><p className="text-xl font-bold">{totalNet.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 bg-green-600 rounded-xl flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-muted-foreground">مدفوعة</p><p className="text-xl font-bold">{paidCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center"><DollarSign className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-muted-foreground">معلقة</p><p className="text-xl font-bold">{filtered.length - paidCount}</p></div>
        </CardContent></Card>
      </div>

      {loading ? <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["الموظف","الفترة","أساسي","بدلات","استقطاعات","إضافي","صافي","الحالة","إجراءات"].map((h) => <th key={h} className="p-3 text-right font-medium text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={9} className="text-center text-muted-foreground py-10">لا توجد سجلات</td></tr> :
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3 font-medium">{r.employee_name}</td>
                    <td className="p-3 text-muted-foreground">{r.period}</td>
                    <td className="p-3">{(r.basic_salary || 0).toLocaleString()}</td>
                    <td className="p-3 text-green-600">+{(r.allowances || 0).toLocaleString()}</td>
                    <td className="p-3 text-red-500">-{(r.deductions || 0).toLocaleString()}</td>
                    <td className="p-3 text-blue-600">+{(r.overtime || 0).toLocaleString()}</td>
                    <td className="p-3 font-bold text-primary">{(r.net_salary || 0).toLocaleString()}</td>
                    <td className="p-3"><Badge variant={r.status === "مدفوع" ? "default" : "secondary"} className="text-xs">{r.status}</Badge></td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {r.status !== "مدفوع" && <button onClick={() => markPaid(r.id)} className="text-green-600 hover:text-green-700" title="تسجيل كمدفوع"><CheckCircle className="h-3.5 w-3.5" /></button>}
                        <button onClick={() => openEdit(r)} className="text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => del(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "تعديل راتب" : "إضافة راتب"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="col-span-2">
              <Label className="text-xs">الموظف</Label>
              <Select value={form.employee_id} onValueChange={selectEmployee}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">الفترة (شهر/سنة)</Label><Input placeholder="مثال: 2026-03" value={form.period || ""} onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">تاريخ الصرف</Label><Input type="date" value={form.payment_date || ""} onChange={(e) => setForm((p) => ({ ...p, payment_date: e.target.value }))} className="mt-1 h-8" /></div>
            {[["basic_salary","الراتب الأساسي"],["allowances","البدلات"],["overtime","العمل الإضافي"],["deductions","الاستقطاعات"]].map(([k,lbl]) => (
              <div key={k}><Label className="text-xs">{lbl}</Label><Input type="number" value={form[k] || 0} onChange={(e) => update(k, e.target.value)} className="mt-1 h-8" /></div>
            ))}
            <div className="col-span-2 bg-muted/30 rounded-lg p-3 flex justify-between items-center">
              <span className="font-semibold">صافي الراتب</span>
              <span className="text-xl font-bold text-primary">{(form.net_salary || 0).toLocaleString()}</span>
            </div>
            <div className="col-span-2"><Label className="text-xs">ملاحظات</Label><Input value={form.notes || ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="mt-1 h-8" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={save} className="flex-1">حفظ</Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}