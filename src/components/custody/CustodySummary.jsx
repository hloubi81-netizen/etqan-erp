import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import { TrendingUp, TrendingDown, Users, CheckCircle2 } from "lucide-react";

const STATUS_COLORS = {
  "مفتوحة": "#3b82f6",
  "قيد التسوية": "#f97316",
  "مسواة": "#22c55e",
  "ملغاة": "#94a3b8",
};

const CAT_COLORS_CHART = ["#3b82f6", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6", "#94a3b8"];

export default function CustodySummary({ custodies, expenses }) {
  const statusData = useMemo(() => {
    const map = {};
    custodies.forEach(c => { map[c.status] = (map[c.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [custodies]);

  const byEmployee = useMemo(() => {
    const map = {};
    custodies.filter(c => c.status !== "ملغاة").forEach(c => {
      const key = c.employee_name || "غير محدد";
      if (!map[key]) map[key] = { name: key, total: 0, expenses: 0, count: 0 };
      map[key].total += c.amount || 0;
      map[key].expenses += c.expenses_total || 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [custodies]);

  const byCategory = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const cat = e.category || "أخرى";
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const totalAmount = custodies.filter(c => c.status !== "ملغاة").reduce((s, c) => s + (c.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const settledCount = custodies.filter(c => c.status === "مسواة").length;
  const overdueCount = custodies.filter(c => {
    if (c.status !== "مفتوحة" && c.status !== "قيد التسوية") return false;
    if (!c.due_date) return false;
    return new Date(c.due_date) < new Date();
  }).length;

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي العهد المصروفة", value: totalAmount.toLocaleString("ar-SA"), icon: TrendingUp, bg: "bg-blue-50", c: "text-blue-700" },
          { label: "إجمالي المصاريف المثبتة", value: totalExpenses.toLocaleString("ar-SA"), icon: TrendingDown, bg: "bg-green-50", c: "text-green-700" },
          { label: "عهد مسواة", value: settledCount, icon: CheckCircle2, bg: "bg-purple-50", c: "text-purple-700" },
          { label: "عهد متأخرة عن الموعد", value: overdueCount, icon: Users, bg: overdueCount > 0 ? "bg-red-50" : "bg-gray-50", c: overdueCount > 0 ? "text-red-700" : "text-gray-500" },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-xl p-4 flex items-center gap-3`}>
            <k.icon className={`h-7 w-7 ${k.c}`} />
            <div><p className={`text-xl font-bold ${k.c}`}>{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Status Pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع العهد حسب الحالة</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع المصاريف حسب التصنيف</CardTitle></CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">لا توجد مصاريف</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {byCategory.map((_, i) => <Cell key={i} fill={CAT_COLORS_CHART[i % CAT_COLORS_CHART.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => v.toLocaleString("ar-SA")} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By Employee Bar */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">المصروف والمصاريف المثبتة حسب الموظف</CardTitle></CardHeader>
        <CardContent>
          {byEmployee.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byEmployee} margin={{ right: 16, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => v.toLocaleString("ar-SA")} />
                <Legend />
                <Bar dataKey="total" name="المبلغ المصروف" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="المصاريف المثبتة" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Overdue List */}
      {overdueCount > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700">⚠️ عهد متأخرة عن موعد التسوية</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-red-50/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-right font-medium">رقم العهدة</th>
                  <th className="px-4 py-2.5 text-right font-medium">الموظف</th>
                  <th className="px-4 py-2.5 text-right font-medium">المبلغ</th>
                  <th className="px-4 py-2.5 text-right font-medium">موعد التسوية</th>
                  <th className="px-4 py-2.5 text-right font-medium">تأخير</th>
                </tr>
              </thead>
              <tbody>
                {custodies.filter(c => {
                  if (c.status !== "مفتوحة" && c.status !== "قيد التسوية") return false;
                  return c.due_date && new Date(c.due_date) < new Date();
                }).map(c => {
                  const days = Math.floor((new Date() - new Date(c.due_date)) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={c.id} className="border-t bg-red-50/20">
                      <td className="px-4 py-2.5 font-mono text-primary">{c.custody_number}</td>
                      <td className="px-4 py-2.5 font-medium">{c.employee_name}</td>
                      <td className="px-4 py-2.5">{(c.amount || 0).toLocaleString("ar-SA")}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.due_date}</td>
                      <td className="px-4 py-2.5 text-red-600 font-semibold">{days} يوم</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}