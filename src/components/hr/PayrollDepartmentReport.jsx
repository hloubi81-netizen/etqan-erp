import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Printer, Download, ChevronDown, ChevronRight, Users, DollarSign, TrendingDown, TrendingUp } from "lucide-react";

const STATUS_STYLES = {
  "مسودة": "bg-gray-100 text-gray-700",
  "معتمد": "bg-blue-100 text-blue-700",
  "مدفوع": "bg-green-100 text-green-700",
};

function SummaryCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className={`rounded-xl p-4 flex items-center gap-3 ${colorClass}`}>
      <Icon className="h-7 w-7 opacity-80 shrink-0" />
      <div>
        <p className="text-lg font-bold">{typeof value === "number" ? value.toLocaleString("ar-SA") : value}</p>
        <p className="text-xs opacity-80">{label}</p>
      </div>
    </div>
  );
}

export default function PayrollDepartmentReport({ records, employees, costCenters }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [expandedDept, setExpandedDept] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const periodRecords = useMemo(() =>
    records.filter(r =>
      r.period === period &&
      (filterStatus === "all" || r.status === filterStatus)
    ), [records, period, filterStatus]);

  // تجميع حسب القسم
  const byDept = useMemo(() => {
    const map = {};
    periodRecords.forEach(r => {
      const dept = r.department || "غير محدد";
      if (!map[dept]) map[dept] = [];
      map[dept].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, "ar"));
  }, [periodRecords]);

  const totalBasic = periodRecords.reduce((s, r) => s + (r.basic_salary || 0), 0);
  const totalAllowances = periodRecords.reduce((s, r) => s + (r.allowances || 0) + (r.overtime || 0), 0);
  const totalDeductions = periodRecords.reduce((s, r) => s + (r.deductions || 0) + (r.absence_deduction || 0), 0);
  const totalNet = periodRecords.reduce((s, r) => s + (r.net_salary || 0), 0);
  const paidCount = periodRecords.filter(r => r.status === "مدفوع").length;

  function printReport() {
    const win = window.open("", "_blank");
    const rows = byDept.map(([dept, emps]) => {
      const deptNet = emps.reduce((s, r) => s + (r.net_salary || 0), 0);
      const deptBasic = emps.reduce((s, r) => s + (r.basic_salary || 0), 0);
      const deptAllow = emps.reduce((s, r) => s + (r.allowances || 0) + (r.overtime || 0), 0);
      const deptDeduct = emps.reduce((s, r) => s + (r.deductions || 0) + (r.absence_deduction || 0), 0);
      const empRows = emps.map(r => `
        <tr>
          <td style="padding:6px 10px">${r.employee_name}</td>
          <td style="padding:6px 10px;text-align:center">${r.employee_number || "—"}</td>
          <td style="padding:6px 10px;text-align:right">${(r.basic_salary||0).toLocaleString()}</td>
          <td style="padding:6px 10px;text-align:right;color:green">+${((r.allowances||0)+(r.overtime||0)).toLocaleString()}</td>
          <td style="padding:6px 10px;text-align:right;color:red">-${((r.deductions||0)+(r.absence_deduction||0)).toLocaleString()}</td>
          <td style="padding:6px 10px;text-align:right;font-weight:bold">${(r.net_salary||0).toLocaleString()}</td>
          <td style="padding:6px 10px;text-align:center">${r.status}</td>
          <td style="padding:6px 10px;text-align:center">${r.payment_method||"—"}</td>
        </tr>`).join("");
      return `
        <tr style="background:#f0f4ff">
          <td colspan="8" style="padding:8px 10px;font-weight:bold;font-size:14px">
            🏢 ${dept} (${emps.length} موظف) — الصافي: ${deptNet.toLocaleString()}
          </td>
        </tr>
        ${empRows}
        <tr style="background:#e8f0fe;font-weight:bold">
          <td style="padding:6px 10px" colspan="2">إجمالي القسم</td>
          <td style="padding:6px 10px;text-align:right">${deptBasic.toLocaleString()}</td>
          <td style="padding:6px 10px;text-align:right;color:green">+${deptAllow.toLocaleString()}</td>
          <td style="padding:6px 10px;text-align:right;color:red">-${deptDeduct.toLocaleString()}</td>
          <td style="padding:6px 10px;text-align:right">${deptNet.toLocaleString()}</td>
          <td colspan="2"></td>
        </tr>`;
    }).join("");

    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>مسير رواتب ${period}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
    h1 { text-align: center; color: #1d3a8a; margin-bottom: 4px; }
    .meta { text-align: center; color: #666; margin-bottom: 20px; font-size: 13px; }
    .summary { display: flex; gap: 16px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }
    .scard { border: 1px solid #ddd; border-radius: 8px; padding: 10px 20px; text-align: center; min-width: 120px; }
    .scard .val { font-size: 18px; font-weight: bold; color: #1d3a8a; }
    .scard .lbl { font-size: 11px; color: #888; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #1d3a8a; color: white; padding: 8px 10px; text-align: right; }
    tr:nth-child(even) { background: #f9fafb; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>مسير الرواتب الشهري</h1>
  <p class="meta">الفترة: ${period} | عدد الموظفين: ${periodRecords.length} | تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}</p>
  <div class="summary">
    <div class="scard"><div class="val">${totalBasic.toLocaleString()}</div><div class="lbl">إجمالي الأساسي</div></div>
    <div class="scard"><div class="val" style="color:green">+${totalAllowances.toLocaleString()}</div><div class="lbl">البدلات والإضافي</div></div>
    <div class="scard"><div class="val" style="color:red">-${totalDeductions.toLocaleString()}</div><div class="lbl">الاستقطاعات</div></div>
    <div class="scard"><div class="val" style="font-size:22px">${totalNet.toLocaleString()}</div><div class="lbl">صافي الرواتب</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>اسم الموظف</th><th>الرقم</th><th>الأساسي</th><th>البدلات</th><th>الاستقطاعات</th>
        <th>الصافي</th><th>الحالة</th><th>طريقة الصرف</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tr style="background:#1d3a8a;color:white;font-weight:bold">
      <td colspan="2" style="padding:8px 10px">الإجمالي الكلي</td>
      <td style="padding:8px 10px;text-align:right">${totalBasic.toLocaleString()}</td>
      <td style="padding:8px 10px;text-align:right">+${totalAllowances.toLocaleString()}</td>
      <td style="padding:8px 10px;text-align:right">-${totalDeductions.toLocaleString()}</td>
      <td style="padding:8px 10px;text-align:right;font-size:16px">${totalNet.toLocaleString()}</td>
      <td colspan="2"></td>
    </tr>
  </table>
  <script>window.print();</script>
</body></html>`);
    win.document.close();
  }

  function exportCSV() {
    const header = ["الموظف","الرقم","القسم","مركز التكلفة","الأساسي","البدلات","الإضافي","الاستقطاعات","استقطاع الغياب","الصافي","الحالة","طريقة الصرف","تاريخ الصرف"];
    const rows = periodRecords.map(r => [
      r.employee_name, r.employee_number || "", r.department || "", r.cost_center_name || "",
      r.basic_salary || 0, r.allowances || 0, r.overtime || 0,
      r.deductions || 0, r.absence_deduction || 0, r.net_salary || 0,
      r.status, r.payment_method || "", r.payment_date || ""
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-${period}.csv`;
    a.click();
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="h-9 w-40" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="مسودة">مسودة</SelectItem>
              <SelectItem value="معتمد">معتمد</SelectItem>
              <SelectItem value="مدفوع">مدفوع</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5 h-9" onClick={exportCSV}>
            <Download className="h-4 w-4" /> تصدير CSV
          </Button>
          <Button variant="outline" className="gap-1.5 h-9" onClick={printReport}>
            <Printer className="h-4 w-4" /> طباعة المسير
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="إجمالي الأساسي" value={totalBasic} icon={DollarSign} colorClass="bg-blue-50 text-blue-700" />
        <SummaryCard label="البدلات والإضافي" value={totalAllowances} icon={TrendingUp} colorClass="bg-green-50 text-green-700" />
        <SummaryCard label="إجمالي الاستقطاعات" value={totalDeductions} icon={TrendingDown} colorClass="bg-red-50 text-red-700" />
        <SummaryCard label={`صافي الرواتب (${paidCount} مدفوع)`} value={totalNet} icon={Building2} colorClass="bg-primary/10 text-primary" />
      </div>

      {/* By Department */}
      {byDept.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد رواتب لهذه الفترة</p>
          <p className="text-xs mt-1">استخدم تبويب "توليد الرواتب" لإنشاء المسير</p>
        </CardContent></Card>
      ) : byDept.map(([dept, emps]) => {
        const deptNet = emps.reduce((s, r) => s + (r.net_salary || 0), 0);
        const deptBasic = emps.reduce((s, r) => s + (r.basic_salary || 0), 0);
        const deptAllow = emps.reduce((s, r) => s + (r.allowances || 0) + (r.overtime || 0), 0);
        const deptDeduct = emps.reduce((s, r) => s + (r.deductions || 0) + (r.absence_deduction || 0), 0);
        const isOpen = expandedDept === dept;

        return (
          <Card key={dept} className="overflow-hidden">
            <button
              className="w-full text-right"
              onClick={() => setExpandedDept(isOpen ? null : dept)}
            >
              <CardHeader className="pb-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{dept}</CardTitle>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Users className="h-3 w-3" />{emps.length} موظف
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-sm flex-wrap">
                    <span className="text-muted-foreground">أساسي: <strong>{deptBasic.toLocaleString()}</strong></span>
                    <span className="text-green-600">+{deptAllow.toLocaleString()}</span>
                    <span className="text-red-500">-{deptDeduct.toLocaleString()}</span>
                    <span className="text-primary font-bold text-base">{deptNet.toLocaleString()}</span>
                  </div>
                </div>
              </CardHeader>
            </button>

            {isOpen && (
              <CardContent className="p-0 border-t">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 text-right font-medium">الموظف</th>
                        <th className="px-4 py-2.5 text-center font-medium">الرقم</th>
                        <th className="px-4 py-2.5 text-right font-medium">الأساسي</th>
                        <th className="px-4 py-2.5 text-right font-medium">البدلات</th>
                        <th className="px-4 py-2.5 text-right font-medium">إضافي</th>
                        <th className="px-4 py-2.5 text-right font-medium">استقطاعات</th>
                        <th className="px-4 py-2.5 text-center font-medium">غياب(يوم)</th>
                        <th className="px-4 py-2.5 text-right font-medium font-bold">الصافي</th>
                        <th className="px-4 py-2.5 text-center font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emps.map(r => (
                        <tr key={r.id} className="border-t hover:bg-muted/10">
                          <td className="px-4 py-2.5">
                            <p className="font-medium">{r.employee_name}</p>
                            {r.cost_center_name && <p className="text-xs text-purple-600">{r.cost_center_name}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">{r.employee_number || "—"}</td>
                          <td className="px-4 py-2.5">{(r.basic_salary || 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-green-600">+{(r.allowances || 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-blue-600">
                            {(r.overtime || 0) > 0 ? `+${r.overtime.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-red-500">-{(r.deductions || 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-center">
                            {(r.absence_days || 0) > 0
                              ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{r.absence_days}</span>
                              : <span className="text-green-500 text-xs">✓</span>}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-primary">{(r.net_salary || 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t bg-muted/20 font-semibold text-sm">
                        <td className="px-4 py-2.5" colSpan={2}>إجمالي {dept}</td>
                        <td className="px-4 py-2.5">{deptBasic.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-green-600">+{emps.reduce((s,r)=>s+(r.allowances||0),0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-blue-600">+{emps.reduce((s,r)=>s+(r.overtime||0),0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-red-500">-{emps.reduce((s,r)=>s+(r.deductions||0)+(r.absence_deduction||0),0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-center">{emps.reduce((s,r)=>s+(r.absence_days||0),0)}</td>
                        <td className="px-4 py-2.5 text-primary text-base">{deptNet.toLocaleString()}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}