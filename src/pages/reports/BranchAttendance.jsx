import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import {
  Users, Calendar, Clock, AlertCircle, TrendingUp, RefreshCw,
  CheckCircle2, XCircle, Timer, GitBranch, BarChart3
} from "lucide-react";

const COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed"];
const TYPE_ICONS = { "حضور": CheckCircle2, "غياب": XCircle, "إجازة": Calendar, "إجازة مرضية": AlertCircle, "تأخير": Timer };
const TYPE_COLORS = { "حضور": "text-green-600", "غياب": "text-red-500", "إجازة": "text-blue-500", "إجازة مرضية": "text-orange-500", "تأخير": "text-yellow-600" };

export default function BranchAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [branchFilter, setBranchFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const [att, emp, br] = await Promise.all([
      base44.entities.Attendance.list("-date").catch(() => []),
      base44.entities.Employee.filter({ status: "نشط" }).catch(() => []),
      base44.entities.Branch.list().catch(() => []),
    ]);
    setAttendance(att);
    setEmployees(emp);
    setBranches(br);
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    let data = attendance.filter((r) => r.date && r.date.startsWith(selectedMonth));
    if (branchFilter !== "all") {
      const empIds = employees.filter((e) => e.branch_id === branchFilter).map((e) => e.id);
      data = data.filter((r) => empIds.includes(r.employee_id));
    }
    return data;
  }, [attendance, selectedMonth, branchFilter, employees]);

  // ── ملخص الأرقام ──
  const summary = useMemo(() => {
    const counts = { "حضور": 0, "غياب": 0, "إجازة": 0, "إجازة مرضية": 0, "تأخير": 0 };
    let totalHours = 0;
    filtered.forEach((r) => {
      if (counts[r.type] !== undefined) counts[r.type]++;
      totalHours += r.hours || 0;
    });
    return { ...counts, totalHours, totalRecords: filtered.length };
  }, [filtered]);

  // ── توزيع الحضور (Pie) ──
  const typePie = useMemo(() =>
    Object.entries(summary)
      .filter(([k]) => ["حضور", "غياب", "إجازة", "إجازة مرضية", "تأخير"].includes(k))
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
  , [summary]);

  // ── ساعات العمل لكل موظف ──
  const employeeHours = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      if (!r.employee_name) return;
      if (!map[r.employee_name]) map[r.employee_name] = { name: r.employee_name, ساعات: 0, أيام: 0 };
      map[r.employee_name].ساعات += r.hours || 0;
      map[r.employee_name].أيام++;
    });
    return Object.values(map).sort((a, b) => b.ساعات - a.ساعات).slice(0, 15);
  }, [filtered]);

  // ── الحضور اليومي ──
  const dailyTrend = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      if (!r.date) return;
      const key = r.date;
      if (!map[key]) map[key] = { date: key, حضور: 0, غياب: 0, إجازات: 0 };
      if (r.type === "حضور") map[key].حضور++;
      else if (r.type === "غياب") map[key].غياب++;
      else map[key].إجازات++;
    });
    return Object.values(map).sort((a, b) => a.date > b.date ? 1 : -1).map((d) => ({
      ...d,
      date: d.date.replace(/\d{4}-/, "").replace("-", "/"),
    }));
  }, [filtered]);

  // ── ملخص لكل فرع ──
  const branchSummary = useMemo(() => {
    const map = {};
    employees.forEach((emp) => {
      const branchName = emp.branch_name || "بدون فرع";
      if (!map[branchName]) map[branchName] = { name: branchName, موظفون: 0, حضور: 0, غياب: 0, ساعات: 0 };
      map[branchName].موظفون++;
    });
    filtered.forEach((r) => {
      const emp = employees.find((e) => e.id === r.employee_id);
      const branchName = emp?.branch_name || "بدون فرع";
      if (!map[branchName]) map[branchName] = { name: branchName, موظفون: 0, حضور: 0, غياب: 0, ساعات: 0 };
      if (r.type === "حضور") map[branchName].حضور++;
      else if (r.type === "غياب") map[branchName].غياب++;
      map[branchName].ساعات += r.hours || 0;
    });
    return Object.values(map);
  }, [employees, filtered]);

  const branchLabel = branchFilter === "all" ? "كل الفروع" : (branches.find(b => b.id === branchFilter)?.name || "فرع");
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            تقرير أداء الفريق
          </h1>
          <p className="text-sm text-muted-foreground mt-1">نظرة شاملة على حضور وإنتاجية الموظفين — {branchLabel}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">الشهر:</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mr-auto">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="كل الفروع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفروع</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "إجمالي السجلات", value: summary.totalRecords, icon: BarChart3, color: "bg-blue-500", sub: "سجل" },
          { label: "أيام الحضور", value: summary["حضور"], icon: CheckCircle2, color: "bg-green-500", sub: "يوم" },
          { label: "أيام الغياب", value: summary["غياب"], icon: XCircle, color: "bg-red-500", sub: "يوم" },
          { label: "إجمالي الساعات", value: Math.round(summary.totalHours).toLocaleString(), icon: Clock, color: "bg-purple-500", sub: "ساعة" },
          { label: "أيام التأخير", value: summary["تأخير"], icon: Timer, color: "bg-yellow-500", sub: "يوم" },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
                <div className={`${color} p-2 rounded-xl`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* توزيع أنواع الحضور + ساعات العمل لكل موظف */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie: توزيع الحضور */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              توزيع حالات الحضور
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typePie.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={typePie} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {typePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar: ساعات العمل لكل موظف */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              ساعات العمل لكل موظف
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employeeHours.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={employeeHours.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                  <Tooltip formatter={(v) => `${v} ساعة`} />
                  <Bar dataKey="ساعات" radius={[0, 4, 4, 0]} fill="#7c3aed" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* الاتجاه اليومي للحضور */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            الاتجاه اليومي للحضور والغياب — {selectedMonth}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dailyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="حضور" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="غياب" stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="إجازات" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ملخص الفروع */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            ملخص أداء الفروع
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {branchSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">الفرع</th>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">الموظفون</th>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">أيام الحضور</th>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">أيام الغياب</th>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">إجمالي الساعات</th>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">نسبة الحضور</th>
                  </tr>
                </thead>
                <tbody>
                  {branchSummary.map((b) => {
                    const total = b.حضور + b.غياب;
                    const rate = total > 0 ? Math.round((b.حضور / total) * 100) : 0;
                    return (
                      <tr key={b.name} className="border-t border-border hover:bg-muted/20">
                        <td className="p-2.5 font-medium">{b.name}</td>
                        <td className="p-2.5 text-muted-foreground">{b.موظفون}</td>
                        <td className="p-2.5 text-green-600 font-medium">{b.حضور}</td>
                        <td className="p-2.5 text-red-500 font-medium">{b.غياب}</td>
                        <td className="p-2.5 font-medium">{Math.round(b.ساعات).toLocaleString()}</td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${rate >= 80 ? "bg-green-500" : rate >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-muted-foreground">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* جدول تفصيلي للموظفين */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            تقرير الموظفين التفصيلي — {selectedMonth}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {employeeHours.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات لهذا الشهر</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">الموظف</th>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">الفرع</th>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">أيام العمل</th>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">إجمالي الساعات</th>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">متوسط الساعات/يوم</th>
                    <th className="p-2.5 text-right font-medium text-muted-foreground">حالة الحضور</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeHours.map((emp) => {
                    const empData = employees.find((e) => e.name === emp.name);
                    const empAttendance = filtered.filter((r) => r.employee_name === emp.name);
                    const presentDays = empAttendance.filter((r) => r.type === "حضور").length;
                    const absentDays = empAttendance.filter((r) => r.type === "غياب").length;
                    const avgHours = emp.أيام > 0 ? (emp.ساعات / emp.أيام).toFixed(1) : 0;
                    const rate = emp.أيام > 0 ? Math.round((presentDays / emp.أيام) * 100) : 0;
                    return (
                      <tr key={emp.name} className="border-t border-border hover:bg-muted/20">
                        <td className="p-2.5 font-medium">{emp.name}</td>
                        <td className="p-2.5 text-muted-foreground">{empData?.branch_name || "—"}</td>
                        <td className="p-2.5">{emp.أيام}</td>
                        <td className="p-2.5 font-medium">{Math.round(emp.ساعات).toLocaleString()} ساعة</td>
                        <td className="p-2.5 text-muted-foreground">{avgHours} ساعة</td>
                        <td className="p-2.5">
                          <Badge className={`text-[10px] ${rate >= 80 ? "bg-green-100 text-green-700" : rate >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                            {rate}% حضور
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}