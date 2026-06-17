import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Zap, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings.jsx";

function computeSalary(emp, attendanceList, period, settings) {
  const workDays = settings.workDays || 26;
  const workHours = settings.workHours || 8;
  const dailyRate = (emp.salary || 0) / workDays;
  const hourlyRate = dailyRate / workHours;
  const overtimeMultiplier = emp.overtime_rate || settings.overtimeRate || 1.5;

  // حساب الحضور والغياب للفترة
  const empAtt = attendanceList.filter(a => a.employee_id === emp.id && a.date?.startsWith(period));
  const absenceDays = empAtt.filter(a => a.type === "غياب").length;
  const overtimeHours = empAtt.reduce((s, a) => {
    const hours = a.hours || 0;
    return s + Math.max(0, hours - (settings.workHours || 8));
  }, 0);

  const absenceDeduction = absenceDays * dailyRate;
  const overtimeValue = overtimeHours * hourlyRate * overtimeMultiplier;

  // البدلات
  const allowancesDetail = emp.allowances_config || [];
  const allowances = allowancesDetail.reduce((s, a) => s + (a.amount || 0), 0) || (emp.allowances || 0);

  // الاستقطاعات الثابتة
  const socialInsuranceRate = emp.social_insurance_rate || 9;
  const socialInsurance = ((emp.salary || 0) * socialInsuranceRate) / 100;
  const fixedDeductions = (emp.deductions_config || []).reduce((s, d) => s + (d.amount || 0), 0);
  const deductionsDetail = [
    ...(emp.deductions_config || []),
    { name: `تأمين اجتماعي (${socialInsuranceRate}%)`, amount: socialInsurance },
  ];
  const deductions = fixedDeductions + socialInsurance;

  const netSalary = (emp.salary || 0) + allowances + overtimeValue - deductions - absenceDeduction;

  return {
    employee_id: emp.id,
    employee_name: emp.name,
    employee_number: emp.employee_number || "",
    department: emp.department || "",
    cost_center_id: emp.cost_center_id || "",
    cost_center_name: emp.cost_center_name || "",
    period,
    basic_salary: emp.salary || 0,
    work_days: workDays - absenceDays,
    absence_days: absenceDays,
    overtime_hours: overtimeHours,
    allowances,
    allowances_detail: allowancesDetail,
    overtime: Math.round(overtimeValue * 100) / 100,
    deductions: Math.round(deductions * 100) / 100,
    deductions_detail: deductionsDetail,
    absence_deduction: Math.round(absenceDeduction * 100) / 100,
    net_salary: Math.round(netSalary * 100) / 100,
    payment_method: "تحويل بنكي",
    status: "مسودة",
  };
}

export default function PayrollBulkGenerate({ employees, records, attendance, costCenters, onRefresh }) {
  const { getSection } = useAppSettings();
  const hrSettings = getSection("hr");

  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [filterDept, setFilterDept] = useState("all");
  const [filterCC, setFilterCC] = useState("all");
  const [settings, setSettings] = useState({
    workDays: hrSettings.workDaysPerWeek * 4 || 26,
    workHours: hrSettings.workHoursPerDay || 8,
    overtimeRate: hrSettings.overtimeRate || 1.5,
    currency: hrSettings.currency || "ج.م",
  });
  const [preview, setPreview] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeEmployees = employees.filter(e => e.status === "نشط");
  const departments = [...new Set(activeEmployees.map(e => e.department).filter(Boolean))];

  const filteredEmployees = activeEmployees.filter(e => {
    if (filterDept !== "all" && e.department !== filterDept) return false;
    if (filterCC !== "all" && e.cost_center_id !== filterCC) return false;
    return true;
  });

  // موظفون لديهم راتب لهذه الفترة بالفعل
  const alreadyGenerated = new Set(records.filter(r => r.period === period).map(r => r.employee_id));

  function generatePreview() {
    setGenerating(true);
    const result = filteredEmployees
      .filter(emp => !alreadyGenerated.has(emp.id))
      .map(emp => computeSalary(emp, attendance, period, settings));
    setPreview(result);
    setGenerating(false);
  }

  async function saveAll() {
    if (preview.length === 0) return;
    setSaving(true);
    await base44.entities.SalaryRecord.bulkCreate(preview);
    toast.success(`تم توليد ${preview.length} سجل راتب بنجاح`);
    setPreview([]);
    setSaving(false);
    onRefresh();
  }

  const totalNet = preview.reduce((s, r) => s + (r.net_salary || 0), 0);

  return (
    <div className="space-y-5">
      {/* Settings */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4" /> إعدادات توليد الرواتب</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label>الفترة (شهر/سنة)</Label>
              <Input type="month" value={period} onChange={e => { setPeriod(e.target.value); setPreview([]); }} />
            </div>
            <div>
              <Label>أيام العمل الشهرية</Label>
              <Input type="number" value={settings.workDays} onChange={e => setSettings(s => ({ ...s, workDays: +e.target.value }))} />
            </div>
            <div>
              <Label>تصفية بالقسم</Label>
              <Select value={filterDept} onValueChange={v => { setFilterDept(v); setPreview([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>مركز التكلفة</Label>
              <Select value={filterCC} onValueChange={v => { setFilterCC(v); setPreview([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 mt-4 flex-wrap items-center">
            <Button onClick={generatePreview} disabled={generating} className="gap-1.5">
              <Zap className="h-4 w-4" /> معاينة الرواتب ({filteredEmployees.filter(e => !alreadyGenerated.has(e.id)).length} موظف)
            </Button>
            {preview.length > 0 && (
              <Button onClick={saveAll} disabled={saving} variant="default" className="gap-1.5 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4" /> حفظ {preview.length} سجل — إجمالي: {totalNet.toLocaleString()}
              </Button>
            )}
            {alreadyGenerated.size > 0 && (
              <p className="text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                ⚠️ {alreadyGenerated.size} موظف لديهم راتب مسجل لهذه الفترة وسيتم تخطيهم
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      {preview.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">معاينة الرواتب المولَّدة — {period}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">الموظف</th>
                    <th className="px-4 py-3 text-right font-medium">القسم</th>
                    <th className="px-4 py-3 text-right font-medium">مركز التكلفة</th>
                    <th className="px-4 py-3 text-center font-medium">غياب</th>
                    <th className="px-4 py-3 text-center font-medium">إضافي(س)</th>
                    <th className="px-4 py-3 text-right font-medium">أساسي</th>
                    <th className="px-4 py-3 text-right font-medium">بدلات</th>
                    <th className="px-4 py-3 text-right font-medium">استقطاعات</th>
                    <th className="px-4 py-3 text-right font-medium">غياب</th>
                    <th className="px-4 py-3 text-right font-medium font-bold">صافي</th>
                    <th className="px-4 py-3 text-center font-medium">حالة</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className={`border-t ${(r.absence_days || 0) > 0 ? "bg-orange-50/40" : ""}`}>
                      <td className="px-4 py-2.5 font-medium">{r.employee_name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.department || "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-purple-700">{r.cost_center_name || "—"}</td>
                      <td className="px-4 py-2.5 text-center">
                        {r.absence_days > 0
                          ? <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{r.absence_days} يوم</span>
                          : <span className="text-xs text-green-600">✓</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-blue-700 text-xs">{r.overtime_hours > 0 ? `${r.overtime_hours.toFixed(1)} س` : "—"}</td>
                      <td className="px-4 py-2.5">{(r.basic_salary || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-green-600">+{(r.allowances || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-red-500">-{(r.deductions || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-orange-600">{r.absence_deduction > 0 ? `-${r.absence_deduction.toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-2.5 font-bold text-primary">{(r.net_salary || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-center">
                        {r.net_salary >= (r.basic_salary || 0) * 0.5
                          ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          : <AlertCircle className="h-4 w-4 text-orange-500 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/30 font-bold">
                    <td className="px-4 py-3" colSpan={5}>الإجمالي</td>
                    <td className="px-4 py-3">{preview.reduce((s, r) => s + (r.basic_salary || 0), 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-600">+{preview.reduce((s, r) => s + (r.allowances || 0), 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-500">-{preview.reduce((s, r) => s + (r.deductions || 0), 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-orange-600">-{preview.reduce((s, r) => s + (r.absence_deduction || 0), 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-primary text-lg">{totalNet.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}