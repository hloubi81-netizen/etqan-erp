import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Building2, Users, DollarSign } from "lucide-react";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function PayrollCostCenterReport({ records, employees, costCenters }) {
  const [period, setPeriod] = useState("");
  const [filterCC, setFilterCC] = useState("all");

  const filtered = useMemo(() => {
    return records.filter(r =>
      (!period || r.period?.includes(period)) &&
      (filterCC === "all" || r.cost_center_id === filterCC)
    );
  }, [records, period, filterCC]);

  // تجميع بمراكز التكلفة
  const byCostCenter = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const key = r.cost_center_id || "_none";
      const name = r.cost_center_name || "بدون مركز";
      if (!map[key]) map[key] = { name, employees: new Set(), basic: 0, allowances: 0, deductions: 0, overtime: 0, absence_deduction: 0, net: 0, count: 0 };
      map[key].employees.add(r.employee_id);
      map[key].basic += r.basic_salary || 0;
      map[key].allowances += r.allowances || 0;
      map[key].deductions += r.deductions || 0;
      map[key].overtime += r.overtime || 0;
      map[key].absence_deduction += r.absence_deduction || 0;
      map[key].net += r.net_salary || 0;
      map[key].count++;
    });
    return Object.values(map).map(v => ({ ...v, employeeCount: v.employees.size })).sort((a, b) => b.net - a.net);
  }, [filtered]);

  // تجميع بالأقسام
  const byDepartment = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const dept = r.department || "بدون قسم";
      if (!map[dept]) map[dept] = { dept, net: 0, count: 0 };
      map[dept].net += r.net_salary || 0;
      map[dept].count++;
    });
    return Object.values(map).sort((a, b) => b.net - a.net);
  }, [filtered]);

  const totalNet = filtered.reduce((s, r) => s + (r.net_salary || 0), 0);
  const totalBasic = filtered.reduce((s, r) => s + (r.basic_salary || 0), 0);
  const totalAllowances = filtered.reduce((s, r) => s + (r.allowances || 0), 0);
  const totalDeductions = filtered.reduce((s, r) => s + ((r.deductions || 0) + (r.absence_deduction || 0)), 0);

  const chartData = byCostCenter.map(cc => ({
    name: cc.name.length > 12 ? cc.name.slice(0, 12) + "..." : cc.name,
    fullName: cc.name,
    أساسي: Math.round(cc.basic),
    بدلات: Math.round(cc.allowances),
    صافي: Math.round(cc.net),
  }));

  const pieData = byCostCenter.map(cc => ({ name: cc.name, value: Math.round(cc.net) }));

  return (
    <div className="space-y-5">
      {/* Filters */}
      <Card><CardContent className="p-4">
        <div className="flex gap-3 flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">الفترة</label>
            <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-44" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">مركز التكلفة</label>
            <Select value={filterCC} onValueChange={setFilterCC}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent></Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الرواتب الأساسية", value: totalBasic.toLocaleString(), color: "text-blue-600", bg: "bg-blue-50" },
          { label: "إجمالي البدلات", value: totalAllowances.toLocaleString(), color: "text-green-600", bg: "bg-green-50" },
          { label: "إجمالي الاستقطاعات", value: totalDeductions.toLocaleString(), color: "text-red-600", bg: "bg-red-50" },
          { label: "إجمالي الصافي", value: totalNet.toLocaleString(), color: "text-purple-600", bg: "bg-purple-50" },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-xl p-4`}>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع الرواتب على مراكز التكلفة</CardTitle></CardHeader>
          <CardContent>
            {chartData.length === 0 ? <p className="text-center py-8 text-muted-foreground">لا توجد بيانات</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ right: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
                  <Legend />
                  <Bar dataKey="أساسي" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="بدلات" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="صافي" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">نسبة كل مركز من إجمالي الرواتب</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? <p className="text-center py-8 text-muted-foreground">لا توجد بيانات</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => v.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Center Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> تفصيل مراكز التكلفة</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">مركز التكلفة</th>
                  <th className="px-4 py-3 text-center font-medium">موظفون</th>
                  <th className="px-4 py-3 text-center font-medium">سجلات</th>
                  <th className="px-4 py-3 text-right font-medium">أساسي</th>
                  <th className="px-4 py-3 text-right font-medium">بدلات</th>
                  <th className="px-4 py-3 text-right font-medium">وقت إضافي</th>
                  <th className="px-4 py-3 text-right font-medium">استقطاعات</th>
                  <th className="px-4 py-3 text-right font-medium">صافي</th>
                  <th className="px-4 py-3 text-center font-medium">% من الكل</th>
                </tr>
              </thead>
              <tbody>
                {byCostCenter.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">لا توجد بيانات</td></tr>
                ) : byCostCenter.map((cc, i) => (
                  <tr key={i} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{cc.name}</td>
                    <td className="px-4 py-3 text-center">{cc.employeeCount}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{cc.count}</td>
                    <td className="px-4 py-3">{Math.round(cc.basic).toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-600">+{Math.round(cc.allowances).toLocaleString()}</td>
                    <td className="px-4 py-3 text-blue-600">+{Math.round(cc.overtime).toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-500">-{Math.round(cc.deductions + cc.absence_deduction).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-primary">{Math.round(cc.net).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${totalNet > 0 ? (cc.net / totalNet * 100) : 0}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="text-xs w-10 text-right">{totalNet > 0 ? (cc.net / totalNet * 100).toFixed(1) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Department breakdown */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> توزيع الرواتب بالأقسام</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right font-medium">القسم</th>
                <th className="px-4 py-3 text-center font-medium">عدد السجلات</th>
                <th className="px-4 py-3 text-right font-medium">إجمالي الصافي</th>
                <th className="px-4 py-3 text-right font-medium">متوسط الراتب</th>
              </tr>
            </thead>
            <tbody>
              {byDepartment.map((d, i) => (
                <tr key={i} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{d.dept}</td>
                  <td className="px-4 py-3 text-center">{d.count}</td>
                  <td className="px-4 py-3 font-semibold">{Math.round(d.net).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.count > 0 ? Math.round(d.net / d.count).toLocaleString() : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}