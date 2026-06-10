import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, TrendingDown, TrendingUp, UserCheck, AlertTriangle, Eye, ChevronDown, ChevronUp } from "lucide-react";

const TYPE_COLORS = {
  "حضور": "bg-green-100 text-green-700",
  "غياب": "bg-red-100 text-red-700",
  "إجازة": "bg-blue-100 text-blue-700",
  "إجازة مرضية": "bg-purple-100 text-purple-700",
  "تأخير": "bg-orange-100 text-orange-700",
};

function EmployeeAttendanceCard({ emp, attRecords, period, workDays }) {
  const [open, setOpen] = useState(false);
  const empAtt = attRecords.filter(a => a.employee_id === emp.id && a.date?.startsWith(period));

  const presentDays = empAtt.filter(a => a.type === "حضور").length;
  const absenceDays = empAtt.filter(a => a.type === "غياب").length;
  const leaveDays = empAtt.filter(a => a.type === "إجازة" || a.type === "إجازة مرضية").length;
  const delayCount = empAtt.filter(a => a.type === "تأخير").length;
  const totalHours = empAtt.reduce((s, a) => s + (a.hours || 0), 0);
  const overtimeHours = empAtt.reduce((s, a) => s + Math.max(0, (a.hours || 0) - 8), 0);

  const dailyRate = (emp.salary || 0) / workDays;
  const hourlyRate = dailyRate / 8;
  const absenceDeduction = absenceDays * dailyRate;
  const overtimeValue = overtimeHours * hourlyRate * (emp.overtime_rate || 1.5);
  const attendanceRate = workDays > 0 ? Math.round(((presentDays + leaveDays) / workDays) * 100) : 0;

  return (
    <Card className={`overflow-hidden ${absenceDays > 3 ? "border-orange-200" : ""}`}>
      <button className="w-full text-right" onClick={() => setOpen(!open)}>
        <CardHeader className="pb-3 hover:bg-muted/20 transition-colors">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {emp.name?.charAt(0)}
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{emp.name}</p>
                <p className="text-xs text-muted-foreground">{emp.department || "—"} • {emp.employee_number || ""}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {/* نسبة الحضور */}
              <div className="text-center">
                <div className={`text-sm font-bold ${attendanceRate >= 90 ? "text-green-600" : attendanceRate >= 75 ? "text-orange-500" : "text-red-600"}`}>
                  {attendanceRate}%
                </div>
                <p className="text-xs text-muted-foreground">الحضور</p>
              </div>
              {/* أيام */}
              <div className="flex gap-1.5 text-xs">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{presentDays} حضور</span>
                {absenceDays > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{absenceDays} غياب</span>}
                {leaveDays > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{leaveDays} إجازة</span>}
                {delayCount > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{delayCount} تأخير</span>}
              </div>
              {/* التأثير المالي */}
              <div className="text-right text-xs">
                {overtimeValue > 0 && <p className="text-green-600 font-medium">+{Math.round(overtimeValue).toLocaleString()} إضافي</p>}
                {absenceDeduction > 0 && <p className="text-red-500 font-medium">-{Math.round(absenceDeduction).toLocaleString()} غياب</p>}
                {overtimeValue === 0 && absenceDeduction === 0 && <p className="text-muted-foreground">لا تعديلات</p>}
              </div>
              {absenceDays > 3 && (
                <AlertTriangle className="h-4 w-4 text-orange-500" title="غيابات متعددة" />
              )}
            </div>
          </div>
        </CardHeader>
      </button>

      {open && (
        <CardContent className="pt-0 border-t bg-muted/5">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 py-3 text-center text-xs">
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="font-bold text-blue-700">{totalHours.toFixed(1)}</p>
              <p className="text-muted-foreground">ساعات عمل</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <p className="font-bold text-purple-700">{overtimeHours.toFixed(1)}</p>
              <p className="text-muted-foreground">ساعات إضافية</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <p className="font-bold text-green-700">+{Math.round(overtimeValue).toLocaleString()}</p>
              <p className="text-muted-foreground">مكافأة الإضافي</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <p className="font-bold text-red-600">-{Math.round(absenceDeduction).toLocaleString()}</p>
              <p className="text-muted-foreground">خصم الغياب</p>
            </div>
          </div>

          {/* Detailed Records */}
          {empAtt.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-t">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-right">التاريخ</th>
                    <th className="px-3 py-2 text-center">النوع</th>
                    <th className="px-3 py-2 text-center">دخول</th>
                    <th className="px-3 py-2 text-center">خروج</th>
                    <th className="px-3 py-2 text-center">الساعات</th>
                    <th className="px-3 py-2 text-center">إضافي</th>
                    <th className="px-3 py-2 text-right">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {empAtt.sort((a, b) => a.date > b.date ? 1 : -1).map((a, i) => {
                    const ot = Math.max(0, (a.hours || 0) - 8);
                    return (
                      <tr key={i} className={`border-t ${a.type === "غياب" ? "bg-red-50/40" : ""}`}>
                        <td className="px-3 py-1.5">{a.date}</td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${TYPE_COLORS[a.type] || "bg-gray-100"}`}>{a.type}</span>
                        </td>
                        <td className="px-3 py-1.5 text-center text-muted-foreground">{a.check_in || "—"}</td>
                        <td className="px-3 py-1.5 text-center text-muted-foreground">{a.check_out || "—"}</td>
                        <td className="px-3 py-1.5 text-center">{a.hours || "—"}</td>
                        <td className="px-3 py-1.5 text-center text-blue-600">{ot > 0 ? `+${ot.toFixed(1)}` : "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{a.notes || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4 text-xs">لا توجد سجلات حضور لهذه الفترة</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function AttendancePayrollLink({ employees, attendance }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [filterDept, setFilterDept] = useState("all");
  const [workDays, setWorkDays] = useState(26);

  const activeEmps = employees.filter(e => e.status === "نشط");
  const departments = [...new Set(activeEmps.map(e => e.department).filter(Boolean))];

  const filteredEmps = useMemo(() =>
    activeEmps.filter(e => filterDept === "all" || e.department === filterDept),
    [activeEmps, filterDept]
  );

  const periodAtt = useMemo(() =>
    attendance.filter(a => a.date?.startsWith(period)),
    [attendance, period]
  );

  // إحصائيات إجمالية
  const totalAbsence = periodAtt.filter(a => a.type === "غياب").length;
  const totalPresent = periodAtt.filter(a => a.type === "حضور").length;
  const totalOT = periodAtt.reduce((s, a) => s + Math.max(0, (a.hours || 0) - 8), 0);
  const atRiskEmps = filteredEmps.filter(e => {
    const abs = periodAtt.filter(a => a.employee_id === e.id && a.type === "غياب").length;
    return abs > 3;
  }).length;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="h-9 w-40" />
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="القسم" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأقسام</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">أيام العمل:</span>
          <Input type="number" value={workDays} onChange={e => setWorkDays(+e.target.value || 26)} className="h-9 w-16 text-center" min={1} max={31} />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <UserCheck className="h-6 w-6 text-green-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-green-700">{totalPresent}</p>
          <p className="text-xs text-muted-foreground">إجمالي أيام الحضور</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <TrendingDown className="h-6 w-6 text-red-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-red-600">{totalAbsence}</p>
          <p className="text-xs text-muted-foreground">إجمالي أيام الغياب</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <Clock className="h-6 w-6 text-blue-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-blue-700">{totalOT.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">ساعات إضافية</p>
        </div>
        <div className={`${atRiskEmps > 0 ? "bg-orange-50" : "bg-gray-50"} rounded-xl p-3 text-center`}>
          <AlertTriangle className={`h-6 w-6 mx-auto mb-1 ${atRiskEmps > 0 ? "text-orange-500" : "text-gray-400"}`} />
          <p className={`text-lg font-bold ${atRiskEmps > 0 ? "text-orange-600" : "text-gray-500"}`}>{atRiskEmps}</p>
          <p className="text-xs text-muted-foreground">موظفون بغياب متكرر</p>
        </div>
      </div>

      {/* Employee Cards */}
      <div className="space-y-3">
        {filteredEmps.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">لا يوجد موظفون</CardContent></Card>
        ) : filteredEmps.map(emp => (
          <EmployeeAttendanceCard
            key={emp.id}
            emp={emp}
            attRecords={periodAtt}
            period={period}
            workDays={workDays}
          />
        ))}
      </div>
    </div>
  );
}