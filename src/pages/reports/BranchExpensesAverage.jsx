import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/shared/SkeletonLoader";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Calendar, TrendingUp, TrendingDown, Wallet, Receipt, Banknote, AlertCircle, RefreshCw } from "lucide-react";

const COLORS = ["#2563eb","#16a34a","#9333ea","#ea580c","#0891b2","#dc2626","#65a30d","#d97706"];

function fmt(n) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "م";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "ك";
  return n.toFixed(0);
}

export default function BranchExpensesAverage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [months, setMonths] = useState("6");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [branches, setBranches] = useState([]);

  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  const loadData = async () => {
    setLoading(true);
    const [inv, vch, brs] = await Promise.all([
      base44.entities.Invoice.list("-date", 2000).catch(() => []),
      base44.entities.Voucher.list("-date", 2000).catch(() => []),
      base44.entities.Branch.list().catch(() => []),
    ]);
    setInvoices(inv);
    setVouchers(vch);
    setBranches(brs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [year]);

  // Generate month labels for the selected period
  const monthLabels = useMemo(() => {
    const labels = [];
    const count = parseInt(months);
    let y = parseInt(year);
    let m = now.getMonth() + 1; // current month (1-12)

    for (let i = 0; i < count; i++) {
      labels.unshift({ year: y, month: m, key: `${y}-${String(m).padStart(2, "0")}` });
      m--;
      if (m === 0) { m = 12; y--; }
    }
    return labels;
  }, [year, months]);

  const branchData = useMemo(() => {
    const branchMap = {};

    branches.forEach(b => {
      branchMap[b.id] = {
        id: b.id,
        name: b.name || "فرع غير مسمى",
        monthlyData: {},
        totalExpenses: 0,
        avgMonthly: 0,
        monthCount: 0,
        trend: 0,
      };
    });

    branchMap["__none__"] = {
      id: "__none__", name: "غير محدد",
      monthlyData: {}, totalExpenses: 0, avgMonthly: 0, monthCount: 0, trend: 0,
    };

    // Initialize monthly data for all branches
    Object.values(branchMap).forEach(b => {
      monthLabels.forEach(ml => {
        b.monthlyData[ml.key] = { purchases: 0, expenses: 0, total: 0 };
      });
    });

    // Process invoices (purchases + purchase returns)
    invoices.forEach(inv => {
      if (!inv.date) return;
      const monthKey = inv.date.substring(0, 7);
      const key = inv.branch_id && branchMap[inv.branch_id] ? inv.branch_id : "__none__";

      if (branchMap[key] && branchMap[key].monthlyData[monthKey] !== undefined) {
        const amount = inv.total || 0;
        if (inv.pattern_type === "مشتريات") {
          branchMap[key].monthlyData[monthKey].purchases += amount;
        } else if (inv.pattern_type === "مرتجع مشتريات") {
          branchMap[key].monthlyData[monthKey].purchases -= amount;
        }
      }
    });

    // Process vouchers (expenses)
    vouchers.forEach(v => {
      if (!v.date) return;
      const monthKey = v.date.substring(0, 7);
      // Payment, daily, and journal vouchers are expenses
      if (v.type !== "سند دفع" && v.type !== "سند يومية" && v.type !== "سند قيد") return;

      const amount = v.amount || v.total_debit || 0;

      let key = "__none__";
      if (v.cost_center_id) {
        const br = branches.find(b => b.id === v.cost_center_id);
        if (br && branchMap[br.id]) key = br.id;
      }

      if (branchMap[key] && branchMap[key].monthlyData[monthKey] !== undefined) {
        branchMap[key].monthlyData[monthKey].expenses += amount;
      }
    });

    // Calculate totals and averages
    Object.values(branchMap).forEach(b => {
      let activeMonths = 0;
      Object.values(b.monthlyData).forEach(md => {
        md.total = md.purchases + md.expenses;
        b.totalExpenses += md.total;
        if (md.total > 0) activeMonths++;
      });
      b.monthCount = activeMonths;
      b.avgMonthly = activeMonths > 0 ? b.totalExpenses / activeMonths : 0;

      // Calculate trend
      const values = Object.values(b.monthlyData).map(md => md.total);
      const nonZero = values.filter(v => v > 0);
      if (nonZero.length >= 2) {
        const first = values.find(v => v > 0) || 0;
        const last = values.reverse().find(v => v > 0) || 0;
        b.trend = first > 0 ? ((last - first) / first) * 100 : 0;
      }
    });

    // Sort by average monthly
    return Object.values(branchMap)
      .filter(b => b.totalExpenses > 0)
      .sort((a, b) => b.avgMonthly - a.avgMonthly);
  }, [invoices, vouchers, branches, monthLabels]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return monthLabels.map(ml => {
      const point = { name: ml.key, label: `${ml.month}/${ml.year}` };
      branchData.forEach((b, i) => {
        if (i < 8) {
          point[b.name] = b.monthlyData[ml.key]?.total || 0;
        }
      });
      return point;
    });
  }, [monthLabels, branchData]);

  const visibleBranches = branchData.slice(0, 8);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-600" />
            توقعات المصروفات الشهرية للفروع
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">متوسط المصروفات الشهرية لكل فرع للمساعدة في تخطيط الميزانية</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 أشهر</SelectItem>
              <SelectItem value="6">6 أشهر</SelectItem>
              <SelectItem value="12">12 شهر</SelectItem>
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-8 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5 h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {branchData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <AlertCircle className="h-10 w-10 opacity-30" />
            <p className="text-sm">لا توجد بيانات كافية لحساب متوسط المصروفات</p>
            <p className="text-xs">قم بتسجيل فواتير المشتريات وسندات الصرف لتظهر البيانات هنا</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top Branches KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {branchData.slice(0, 4).map((b, i) => (
              <Card key={b.id} className="overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <CardTitle className="text-sm font-semibold truncate">{b.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">متوسط المصروفات الشهرية</p>
                      <p className="text-xl font-bold text-amber-700">{b.avgMonthly.toLocaleString("ar-SA")} ر.س</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${b.trend > 10 ? "bg-red-100 text-red-700" : b.trend < -10 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {b.trend > 0 ? <TrendingUp className="h-3 w-3 ml-1" /> : b.trend < 0 ? <TrendingDown className="h-3 w-3 ml-1" /> : null}
                        {b.trend.toFixed(1)}%
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{b.monthCount} شهر نشط</span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Receipt className="h-3 w-3" />مشتريات {fmt(b.totalExpenses).replace("-", "")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trend Line Chart */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
                <CardTitle className="text-sm font-semibold">اتجاه المصروفات الشهرية للفروع</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                  <Tooltip
                    formatter={(v, name) => [v.toLocaleString("ar-SA") + " ر.س", name]}
                    contentStyle={{ fontSize: 11, direction: "rtl" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {visibleBranches.map((b, i) => (
                    <Line
                      key={b.id}
                      type="monotone"
                      dataKey={b.name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Average Expenses Bar Chart */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart className="h-4 w-4 text-blue-600" />
                </div>
                <CardTitle className="text-sm font-semibold">متوسط المصروفات الشهرية لكل فرع</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={branchData} layout="vertical" margin={{ right: 50, left: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmt} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip
                    formatter={(v) => [v.toLocaleString("ar-SA") + " ر.س", "متوسط شهري"]}
                    contentStyle={{ fontSize: 11, direction: "rtl" }}
                  />
                  <Bar dataKey="avgMonthly" radius={[0, 4, 4, 0]} name="متوسط شهري">
                    {branchData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">تفاصيل المصروفات الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-right p-2 font-semibold">الفرع</th>
                      {monthLabels.map(ml => (
                        <th key={ml.key} className="text-center p-2 font-semibold text-muted-foreground">
                          {ml.month}/{ml.year}
                        </th>
                      ))}
                      <th className="text-center p-2 font-semibold text-amber-700">المتوسط</th>
                      <th className="text-center p-2 font-semibold">الاتجاه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchData.map((b, i) => (
                      <tr key={b.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="p-2 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                            {b.name}
                          </div>
                        </td>
                        {monthLabels.map(ml => (
                          <td key={ml.key} className="text-center p-2">
                            {b.monthlyData[ml.key]?.total > 0
                              ? b.monthlyData[ml.key].total.toLocaleString("ar-SA")
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                        ))}
                        <td className="text-center p-2 font-bold text-amber-700">
                          {b.avgMonthly.toLocaleString("ar-SA")}
                        </td>
                        <td className="text-center p-2">
                          <Badge className={`text-[10px] ${b.trend > 10 ? "bg-red-100 text-red-700" : b.trend < -10 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {b.trend > 0 ? "+" : ""}{b.trend.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 font-semibold text-xs">
                      <td className="p-2">الإجمالي الشهري</td>
                      {monthLabels.map(ml => {
                        const total = branchData.reduce((s, b) => s + (b.monthlyData[ml.key]?.total || 0), 0);
                        return (
                          <td key={ml.key} className="text-center p-2 text-amber-700">
                            {total > 0 ? total.toLocaleString("ar-SA") : "—"}
                          </td>
                        );
                      })}
                      <td className="text-center p-2 text-amber-700">
                        {branchData.length > 0
                          ? (branchData.reduce((s, b) => s + b.avgMonthly, 0) / branchData.length).toLocaleString("ar-SA")
                          : "—"}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Budget Prediction */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Banknote className="h-4 w-4 text-green-600" />
                </div>
                <CardTitle className="text-sm font-semibold">الميزانية المتوقعة للفترة القادمة</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {branchData.map((b, i) => {
                  const predicted = Math.round(b.avgMonthly * (1 + b.trend / 100));
                  return (
                    <div key={b.id} className="p-3 rounded-xl border bg-muted/20 flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{b.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          المتوسط الحالي: {b.avgMonthly.toLocaleString("ar-SA")} ر.س
                        </p>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="text-[9px] text-muted-foreground">الميزانية المتوقعة</p>
                        <p className="text-sm font-bold text-green-700">{predicted.toLocaleString("ar-SA")} ر.س</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}