import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Calculator, Wallet, Users } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLOR = { "مسودة": "secondary", "معتمد": "default", "مدفوع": "success" };

export default function PayrollManager({ department }) {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [emp, rec] = await Promise.all([
      base44.entities.Employee.list(),
      base44.entities.SalaryRecord.list("-period"),
    ]);
    const filteredEmp = department ? emp.filter(e => (e.department || "").includes(department) || (e.department || "") === department) : emp;
    setEmployees(filteredEmp);
    setRecords(rec);
    setLoading(false);
  }

  const periodRecords = useMemo(() => records.filter(r => r.period === period), [records, period]);

  function openNew(emp) {
    const wd = emp.working_days_per_month || 26;
    const basic = emp.salary || 0;
    const dailyRate = wd ? basic / wd : 0;
    setEditing(null);
    setForm({
      employee_id: emp.id,
      employee_name: emp.name,
      employee_number: emp.employee_number,
      department: emp.department || department || "",
      cost_center_id: emp.cost_center_id || "",
      cost_center_name: emp.cost_center_name || "",
      period,
      basic_salary: basic,
      work_days: wd,
      absence_days: 0,
      overtime_hours: 0,
      overtime_rate: emp.overtime_rate || 1.5,
      working_days_per_month: wd,
      daily_rate: Math.round(dailyRate * 100) / 100,
      allowances_detail: (emp.allowances_config || []).map(a => ({ ...a })),
      bonuses_detail: [],
      deductions_detail: (emp.deductions_config || []).map(d => ({ ...d })),
      payment_method: "تحويل بنكي",
      notes: "",
      status: "مسودة",
    });
    setOpen(true);
  }

  function openEdit(r) {
    setEditing(r);
    setForm({
      employee_id: r.employee_id, employee_name: r.employee_name, employee_number: r.employee_number,
      department: r.department, cost_center_id: r.cost_center_id, cost_center_name: r.cost_center_name,
      period: r.period, basic_salary: r.basic_salary || 0, work_days: r.work_days || 0, absence_days: r.absence_days || 0,
      overtime_hours: r.overtime_hours || 0, overtime_rate: r.overtime_rate || 1.5, working_days_per_month: r.working_days_per_month || 26,
      daily_rate: r.daily_rate || (r.working_days_per_month ? (r.basic_salary || 0) / r.working_days_per_month : 0),
      allowances_detail: r.allowances_detail || [], bonuses_detail: r.bonuses_detail || [],
      deductions_detail: r.deductions_detail || [], payment_method: r.payment_method || "تحويل بنكي",
      notes: r.notes || "", status: r.status || "مسودة",
    });
    setOpen(true);
  }

  const calc = useMemo(() => {
    if (!form) return null;
    const wd = parseFloat(form.working_days) || 0;
    const abs = parseFloat(form.absence_days) || 0;
    const basic = parseFloat(form.basic_salary) || 0;
    const wdm = parseFloat(form.working_days_per_month) || 26;
    const dailyRate = wdm ? basic / wdm : 0;
    const earnedBasic = Math.round(dailyRate * wd * 100) / 100;
    const absenceDeduction = Math.round(dailyRate * abs * 100) / 100;
    const otHours = parseFloat(form.overtime_hours) || 0;
    const otRate = parseFloat(form.overtime_rate) || 1.5;
    const hourlyRate = wdm ? basic / (wdm * 8) : 0;
    const overtime = Math.round(hourlyRate * otHours * otRate * 100) / 100;
    const allowances = (form.allowances_detail || []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    const bonuses = (form.bonuses_detail || []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    const deductions = (form.deductions_detail || []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    const net = Math.round((earnedBasic + allowances + bonuses + overtime - deductions - absenceDeduction) * 100) / 100;
    return { dailyRate: Math.round(dailyRate * 100) / 100, earnedBasic, absenceDeduction, overtime, allowances, bonuses, deductions, net };
  }, [form]);

  function updateItem(listKey, idx, field, value) {
    const arr = [...(form[listKey] || [])];
    arr[idx] = { ...arr[idx], [field]: field === "amount" ? (parseFloat(value) || 0) : value };
    setForm({ ...form, [listKey]: arr });
  }
  function addItem(listKey) { setForm({ ...form, [listKey]: [...(form[listKey] || []), { name: "", amount: 0 }] }); }
  function removeItem(listKey, idx) { const arr = [...(form[listKey] || [])]; arr.splice(idx, 1); setForm({ ...form, [listKey]: arr }); }

  async function save() {
    if (!form.employee_id || !form.period) { toast.error("الموظف والفترة مطلوبان"); return; }
    const payload = {
      ...form,
      work_days: parseFloat(form.work_days) || 0,
      absence_days: parseFloat(form.absence_days) || 0,
      overtime_hours: parseFloat(form.overtime_hours) || 0,
      basic_salary: parseFloat(form.basic_salary) || 0,
      daily_rate: calc.dailyRate,
      earned_basic: calc.earnedBasic,
      allowances: calc.allowances,
      bonuses: calc.bonuses,
      overtime: calc.overtime,
      deductions: calc.deductions,
      absence_deduction: calc.absenceDeduction,
      net_salary: calc.net,
    };
    try {
      if (editing) { await base44.entities.SalaryRecord.update(editing.id, payload); toast.success("تم تحديث سجل الراتب"); }
      else { await base44.entities.SalaryRecord.create(payload); toast.success("تم حفظ سجل الراتب"); }
      setOpen(false); load();
    } catch (e) { toast.error("تعذّر الحفظ"); }
  }

  async function setStatus(r, status) {
    await base44.entities.SalaryRecord.update(r.id, { status });
    toast.success("تم تحديث الحالة");
    load();
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const totalNet = periodRecords.reduce((s, r) => s + (r.net_salary || 0), 0);
  const totalBonuses = periodRecords.reduce((s, r) => s + (r.bonuses || 0), 0);
  const totalDeductions = periodRecords.reduce((s, r) => s + (r.deductions || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
          <Users className="h-7 w-7 text-blue-600" />
          <div><p className="text-xl font-bold text-blue-600">{employees.length}</p><p className="text-xs text-muted-foreground">الموظفون</p></div>
        </div>
        <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
          <Wallet className="h-7 w-7 text-green-600" />
          <div><p className="text-xl font-bold text-green-600">{totalNet.toLocaleString()}</p><p className="text-xs text-muted-foreground">صافي الرواتب ({period})</p></div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-3">
          <Calculator className="h-7 w-7 text-amber-600" />
          <div><p className="text-xl font-bold text-amber-600">{totalBonuses.toLocaleString()}</p><p className="text-xs text-muted-foreground">إجمالي المكافآت</p></div>
        </div>
        <div className="bg-red-50 rounded-xl p-3 flex items-center gap-3">
          <Calculator className="h-7 w-7 text-red-600" />
          <div><p className="text-xl font-bold text-red-600">{totalDeductions.toLocaleString()}</p><p className="text-xs text-muted-foreground">إجمالي الخصومات</p></div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-sm">الفترة:</Label>
        <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-40" />
        <span className="text-sm text-muted-foreground">{periodRecords.length} سجل</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 text-sm font-medium">الموظفون — اضغط لحساب الراتب</div>
          <div className="divide-y max-h-[420px] overflow-y-auto">
            {employees.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">لا يوجد موظفون في هذا القسم</div>}
            {employees.map(e => {
              const hasRec = periodRecords.some(r => r.employee_id === e.id);
              return (
                <div key={e.id} className="flex items-center justify-between p-3 hover:bg-accent/40">
                  <div>
                    <div className="font-medium text-sm">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.position || e.department || "—"} · راتب: {(e.salary || 0).toLocaleString()}</div>
                  </div>
                  <Button size="sm" variant={hasRec ? "secondary" : "default"} onClick={() => hasRec ? openEdit(periodRecords.find(r => r.employee_id === e.id)) : openNew(e)}>
                    {hasRec ? "تعديل الراتب" : "حساب الراتب"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 text-sm font-medium">سجلات رواتب الفترة</div>
          <div className="divide-y max-h-[420px] overflow-y-auto">
            {periodRecords.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">لا توجد سجلات لهذه الفترة</div>}
            {periodRecords.map(r => (
              <div key={r.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{r.employee_name}</div>
                    <div className="text-xs text-muted-foreground">أيام: {r.work_days} · مكافآت: {(r.bonuses || 0).toLocaleString()} · خصومات: {(r.deductions || 0).toLocaleString()}</div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">{(r.net_salary || 0).toLocaleString()}</div>
                    <Badge variant={STATUS_COLOR[r.status] || "secondary"} className="text-[10px]">{r.status}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(r)}>تعديل</Button>
                  {r.status === "مسودة" && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setStatus(r, "معتمد")}>اعتماد</Button>}
                  {r.status === "معتمد" && <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() => setStatus(r, "مدفوع")}>تسديد</Button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>حساب راتب — {form?.employee_name}</DialogTitle></DialogHeader>
          {form && calc && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>الفترة</Label><Input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
                <div><Label>الراتب الأساسي</Label><Input type="number" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} /></div>
                <div><Label>أيام العمل الشهرية</Label><Input type="number" value={form.working_days_per_month} onChange={(e) => setForm({ ...form, working_days_per_month: e.target.value })} /></div>
                <div><Label>أيام العمل الفعلية</Label><Input type="number" value={form.work_days} onChange={(e) => setForm({ ...form, work_days: e.target.value })} /></div>
                <div><Label>أيام الغياب</Label><Input type="number" value={form.absence_days} onChange={(e) => setForm({ ...form, absence_days: e.target.value })} /></div>
                <div><Label>ساعات إضافية</Label><Input type="number" value={form.overtime_hours} onChange={(e) => setForm({ ...form, overtime_hours: e.target.value })} /></div>
              </div>

              {[
                { key: "bonuses_detail", title: "المكافآت", color: "text-amber-600" },
                { key: "allowances_detail", title: "البدلات", color: "text-blue-600" },
                { key: "deductions_detail", title: "الخصومات", color: "text-red-600" },
              ].map(sec => (
                <div key={sec.key} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${sec.color}`}>{sec.title}</span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addItem(sec.key)}><Plus className="h-3.5 w-3.5" /> إضافة</Button>
                  </div>
                  {(form[sec.key] || []).length === 0 && <div className="text-xs text-muted-foreground">لا توجد عناصر</div>}
                  {(form[sec.key] || []).map((it, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <Input className="flex-1" placeholder="البيان" value={it.name} onChange={(e) => updateItem(sec.key, i, "name", e.target.value)} />
                      <Input type="number" className="w-28" placeholder="المبلغ" value={it.amount} onChange={(e) => updateItem(sec.key, i, "amount", e.target.value)} />
                      <Button size="icon" variant="ghost" onClick={() => removeItem(sec.key, i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              ))}

              <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">الراتب المستحق ({form.work_days} يوم)</span><span>{calc.earnedBasic.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">البدلات</span><span>{calc.allowances.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المكافآت</span><span className="text-amber-600">{calc.bonuses.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الوقت الإضافي</span><span>{calc.overtime.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الخصومات</span><span className="text-red-600">- {calc.deductions.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">استقطاع الغياب</span><span className="text-red-600">- {calc.absenceDeduction.toLocaleString()}</span></div>
                <div className="flex justify-between border-t pt-1 font-bold"><span>صافي الراتب</span><span className="text-green-600">{calc.net.toLocaleString()}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>طريقة الصرف</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["تحويل بنكي", "نقداً", "شيك"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>الحالة</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["مسودة", "معتمد", "مدفوع"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}><Save className="h-4 w-4" /> حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}