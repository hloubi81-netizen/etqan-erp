import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Clock, LogIn, LogOut, FileCheck2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

const TYPES = ["حضور", "غياب", "إجازة", "إجازة مرضية", "تأخير"];
const TYPE_COLOR = {
  "حضور": "bg-green-100 text-green-700",
  "غياب": "bg-red-100 text-red-700",
  "إجازة": "bg-blue-100 text-blue-700",
  "إجازة مرضية": "bg-purple-100 text-purple-700",
  "تأخير": "bg-orange-100 text-orange-700",
};
const STD_HOURS = 8;

function diffHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [hi, mi] = checkIn.split(":").map(Number);
  const [ho, mo] = checkOut.split(":").map(Number);
  let start = hi + mi / 60;
  let end = ho + mo / 60;
  if (end < start) end += 24;
  return Math.round((end - start) * 100) / 100;
}
function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}
function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceManager({ department }) {
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
    const [emp, att] = await Promise.all([
      base44.entities.Employee.list(),
      base44.entities.Attendance.list("-date", 1000),
    ]);
    const filtered = department ? emp.filter(e => (e.department || "").includes(department) || (e.department || "") === department) : emp;
    setEmployees(filtered);
    setRecords(att);
    setLoading(false);
  }

  const periodAtt = useMemo(() => records.filter(a => a.date?.startsWith(period)), [records, period]);

  // ملخص لكل موظف
  const summary = useMemo(() => employees.map(emp => {
    const att = periodAtt.filter(a => a.employee_id === emp.id);
    const present = att.filter(a => a.type === "حضور").length;
    const late = att.filter(a => a.type === "تأخير").length;
    const absence = att.filter(a => a.type === "غياب").length;
    const leave = att.filter(a => a.type === "إجازة" || a.type === "إجازة مرضية").length;
    const totalHours = att.reduce((s, a) => s + (a.hours || 0), 0);
    const overtime = att.reduce((s, a) => s + Math.max(0, (a.hours || 0) - STD_HOURS), 0);
    const workDays = present + late;
    return { emp, present, late, absence, leave, totalHours: Math.round(totalHours * 100) / 100, overtime: Math.round(overtime * 100) / 100, workDays, count: att.length };
  }), [employees, periodAtt]);

  function openNew(emp, date) {
    setEditing(null);
    setForm({
      employee_id: emp?.id || "",
      date: date || todayDate(),
      type: "حضور",
      check_in: nowTime(),
      check_out: "",
      hours: 0,
      notes: "",
      existingId: null,
    });
    setOpen(true);
  }
  function openEdit(a) {
    setEditing(a);
    setForm({
      employee_id: a.employee_id, date: a.date, type: a.type,
      check_in: a.check_in || "", check_out: a.check_out || "", hours: a.hours || 0, notes: a.notes || "",
      existingId: a.id,
    });
    setOpen(true);
  }

  function onTimesChange(field, value) {
    const next = { ...form, [field]: value };
    if (next.check_in && next.check_out && (next.type === "حضور" || next.type === "تأخير")) {
      next.hours = diffHours(next.check_in, next.check_out);
    }
    setForm(next);
  }

  async function save() {
    const emp = employees.find(e => e.id === form.employee_id);
    if (!emp || !form.date || !form.type) { toast.error("الموظف والتاريخ والنوع مطلوبة"); return; }
    const payload = {
      employee_id: emp.id,
      employee_name: emp.name,
      date: form.date,
      type: form.type,
      check_in: form.type === "غياب" ? "" : form.check_in,
      check_out: form.type === "غياب" ? "" : form.check_out,
      hours: (form.type === "حضور" || form.type === "تأخير") ? (form.check_in && form.check_out ? diffHours(form.check_in, form.check_out) : (parseFloat(form.hours) || 0)) : 0,
      branch_id: emp.branch_id || "",
      branch_name: emp.branch_name || "",
      notes: form.notes,
    };
    try {
      if (editing) { await base44.entities.Attendance.update(editing.id, payload); toast.success("تم تحديث سجل الحضور"); }
      else { await base44.entities.Attendance.create(payload); toast.success("تم تسجيل الحضور"); }
      setOpen(false); load();
    } catch (e) { toast.error("تعذّر الحفظ"); }
  }

  async function quickCheck(emp, field) {
    const today = todayDate();
    const existing = records.find(a => a.employee_id === emp.id && a.date === today);
    const time = nowTime();
    if (field === "in") {
      if (existing) {
        await base44.entities.Attendance.update(existing.id, { check_in: time, type: existing.type === "غياب" ? "حضور" : existing.type });
      } else {
        await base44.entities.Attendance.create({ employee_id: emp.id, employee_name: emp.name, date: today, type: "حضور", check_in: time, check_out: "", hours: 0, branch_id: emp.branch_id || "", branch_name: emp.branch_name || "" });
      }
      toast.success(`تم تسجيل دخول ${emp.name}`);
    } else {
      if (!existing) { toast.error("سجّل الدخول أولاً"); return; }
      const hours = diffHours(existing.check_in || time, time);
      await base44.entities.Attendance.update(existing.id, { check_out: time, hours });
      toast.success(`تم تسجيل خروج ${emp.name} (${hours} ساعة)`);
    }
    load();
  }

  async function remove(id) {
    await base44.entities.Attendance.delete(id);
    toast.success("تم الحذف");
    load();
  }

  // توليد سجل راتب تلقائيًا من بيانات الحضور
  async function generateSalary(s) {
    const emp = s.emp;
    const basic = emp.salary || 0;
    const wdm = emp.working_days_per_month || 26;
    const dailyRate = wdm ? basic / wdm : 0;
    const earnedBasic = Math.round(dailyRate * s.workDays * 100) / 100;
    const absenceDeduction = Math.round(dailyRate * s.absence * 100) / 100;
    const hourlyRate = wdm ? basic / (wdm * STD_HOURS) : 0;
    const overtime = Math.round(hourlyRate * s.overtime * (emp.overtime_rate || 1.5) * 100) / 100;
    const allowances = (emp.allowances_config || []).reduce((sum, a) => sum + (a.amount || 0), 0);
    const deductions = (emp.deductions_config || []).reduce((sum, d) => sum + (d.amount || 0), 0);
    const net = Math.round((earnedBasic + allowances + overtime - deductions - absenceDeduction) * 100) / 100;

    const existing = records; // not salary
    // تحقق من وجود سجل راتب لنفس الموظف والفترة
    let salary = await base44.entities.SalaryRecord.filter({ employee_id: emp.id, period });
    salary = Array.isArray(salary) ? salary : [];
    const payload = {
      employee_id: emp.id, employee_name: emp.name, employee_number: emp.employee_number,
      department: emp.department || department || "", cost_center_id: emp.cost_center_id || "", cost_center_name: emp.cost_center_name || "",
      period, work_days: s.workDays, absence_days: s.absence, overtime_hours: s.overtime,
      basic_salary: basic, daily_rate: Math.round(dailyRate * 100) / 100, earned_basic: earnedBasic,
      allowances_detail: emp.allowances_config || [], allowances, bonuses_detail: [], bonuses: 0,
      overtime, deductions_detail: emp.deductions_config || [], deductions, absence_deduction: absenceDeduction,
      net_salary: net, payment_method: "تحويل بنكي", status: "مسودة",
      notes: `مُولّد تلقائيًا من سجلات الحضور (${s.workDays} يوم عمل، ${s.overtime} ساعة إضافية)`,
    };
    try {
      if (salary.length > 0) {
        await base44.entities.SalaryRecord.update(salary[0].id, payload);
        toast.success("تم تحديث سجل الراتب من بيانات الحضور");
      } else {
        await base44.entities.SalaryRecord.create(payload);
        toast.success(`تم توليد راتب ${emp.name} من الحضور (${net.toLocaleString()})`);
      }
    } catch (e) { toast.error("تعذّر توليد الراتب"); }
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const today = todayDate();
  const todayCount = periodAtt.filter(a => a.date === today).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
          <LogIn className="h-7 w-7 text-green-600" />
          <div><p className="text-xl font-bold text-green-600">{todayCount}</p><p className="text-xs text-muted-foreground">سجلات اليوم</p></div>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
          <CalendarClock className="h-7 w-7 text-blue-600" />
          <div><p className="text-xl font-bold text-blue-600">{periodAtt.length}</p><p className="text-xs text-muted-foreground">سجلات الفترة</p></div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-3">
          <Clock className="h-7 w-7 text-amber-600" />
          <div><p className="text-xl font-bold text-amber-600">{summary.reduce((s, r) => s + r.overtime, 0)}</p><p className="text-xs text-muted-foreground">ساعات إضافية</p></div>
        </div>
        <div className="bg-red-50 rounded-xl p-3 flex items-center gap-3">
          <LogOut className="h-7 w-7 text-red-600" />
          <div><p className="text-xl font-bold text-red-600">{summary.reduce((s, r) => s + r.absence, 0)}</p><p className="text-xs text-muted-foreground">أيام الغياب</p></div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-sm">الفترة:</Label>
        <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-40" />
        <Button size="sm" variant="default" onClick={() => openNew(null)}><Plus className="h-4 w-4" /> تسجيل حضور جديد</Button>
      </div>

      {/* ملخص الموظفين وربط الرواتب */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 text-sm font-medium">ملخص الحضور الشهري والربط بالراتب</div>
        <div className="divide-y">
          {summary.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">لا يوجد موظفون</div>}
          {summary.map(s => (
            <div key={s.emp.id} className="p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-medium text-sm">{s.emp.name}</div>
                  <div className="text-xs text-muted-foreground">{s.emp.position || s.emp.department || "—"} · راتب: {(s.emp.salary || 0).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s.present} حضور</span>
                  {s.late > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{s.late} تأخير</span>}
                  {s.absence > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{s.absence} غياب</span>}
                  {s.leave > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{s.leave} إجازة</span>}
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{s.overtime} ساعة إضافية</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => quickCheck(s.emp, "in")} title="تسجيل دخول الآن"><LogIn className="h-3.5 w-3.5" /> دخول</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => quickCheck(s.emp, "out")} title="تسجيل خروج الآن"><LogOut className="h-3.5 w-3.5" /> خروج</Button>
                  <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => generateSalary(s)}><FileCheck2 className="h-3.5 w-3.5" /> توليد الراتب</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* سجلات الفترة التفصيلية */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 text-sm font-medium">سجلات الحضور والانصراف للفترة</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-right">الموظف</th>
                <th className="px-2 py-2 text-right">التاريخ</th>
                <th className="px-2 py-2 text-center">النوع</th>
                <th className="px-2 py-2 text-center">دخول</th>
                <th className="px-2 py-2 text-center">خروج</th>
                <th className="px-2 py-2 text-center">ساعات</th>
                <th className="px-2 py-2 text-center">إضافي</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {periodAtt.length === 0 && <tr><td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">لا توجد سجلات لهذه الفترة</td></tr>}
              {periodAtt.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(a => (
                <tr key={a.id} className="border-t hover:bg-accent/30">
                  <td className="px-2 py-1.5">{a.employee_name}</td>
                  <td className="px-2 py-1.5">{a.date}</td>
                  <td className="px-2 py-1.5 text-center"><span className={`px-1.5 py-0.5 rounded ${TYPE_COLOR[a.type] || "bg-gray-100"}`}>{a.type}</span></td>
                  <td className="px-2 py-1.5 text-center text-muted-foreground">{a.check_in || "—"}</td>
                  <td className="px-2 py-1.5 text-center text-muted-foreground">{a.check_out || "—"}</td>
                  <td className="px-2 py-1.5 text-center">{a.hours || "—"}</td>
                  <td className="px-2 py-1.5 text-center text-blue-600">{Math.max(0, (a.hours || 0) - STD_HOURS) > 0 ? `+${(a.hours - STD_HOURS).toFixed(1)}` : "—"}</td>
                  <td className="px-2 py-1.5 text-center">
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => openEdit(a)}>تعديل</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "تعديل سجل الحضور" : "تسجيل حضور جديد"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>الموظف</Label>
                <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>النوع</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>وقت الدخول</Label><Input type="time" value={form.check_in} onChange={(e) => onTimesChange("check_in", e.target.value)} disabled={form.type === "غياب"} /></div>
                <div><Label>وقت الخروج</Label><Input type="time" value={form.check_out} onChange={(e) => onTimesChange("check_out", e.target.value)} disabled={form.type === "غياب"} /></div>
                <div><Label>ساعات العمل</Label><Input type="number" value={form.hours} readOnly className="bg-muted/40" /></div>
              </div>
              <div><Label>ملاحظات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}