import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle, BarChart2 } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n || 0);

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-right text-sm min-w-[180px]" dir="rtl">
      <p className="font-bold text-gray-700 mb-2 border-b pb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3 mt-1">
          <span className="font-semibold" style={{ color: p.color }}>{fmt(p.value)}</span>
          <span className="text-gray-500">{p.name}</span>
        </div>
      ))}
    </div>
  );
};

export default function BudgetVsActualDashboard() {
  const [budgets, setBudgets] = useState([]);
  const [costEntries, setCostEntries] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedCC, setSelectedCC] = useState("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Budget.list("-created_date", 200),
      base44.entities.CostEntry.list("-date", 500),
      base44.entities.CostCenter.list("-created_date", 100),
    ]).then(([b, c, cc]) => {
      setBudgets(b);
      setCostEntries(c);
      setCostCenters(cc);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const years = useMemo(() => {
    const ys = new Set(budgets.map(b => b.year).filter(Boolean));
    [new Date().getFullYear().toString(), (new Date().getFullYear() - 1).toString()].forEach(y => ys.add(y));
    return Array.from(ys).sort((a, b) => b - a);
  }, [budgets]);

  // ---- Data: Budget per cost center for selected year ----
  const ccBudgetMap = useMemo(() => {
    const map = {};
    budgets
      .filter(b => b.year === selectedYear)
      .forEach(b => {
        if (!b.cost_center_id) return;
        if (!map[b.cost_center_id]) map[b.cost_center_id] = { name: b.cost_center_name, budgeted: 0, id: b.cost_center_id };
        map[b.cost_center_id].budgeted += b.total_budgeted || 0;
      });
    return map;
  }, [budgets, selectedYear]);

  // ---- Data: Actual per cost center for selected year ----
  const ccActualMap = useMemo(() => {
    const map = {};
    costEntries
      .filter(e => e.date?.startsWith(selectedYear))
      .forEach(e => {
        if (!e.cost_center_id) return;
        if (!map[e.cost_center_id]) map[e.cost_center_id] = { name: e.cost_center_name, actual: 0 };
        map[e.cost_center_id].actual += e.total_cost || 0;
      });
    return map;
  }, [costEntries, selectedYear]);

  // ---- Combined per CC ----
  const ccCompareData = useMemo(() => {
    const ids = new Set([...Object.keys(ccBudgetMap), ...Object.keys(ccActualMap)]);
    return Array.from(ids).map(id => {
      const name = ccBudgetMap[id]?.name || ccActualMap[id]?.name || id;
      const budgeted = ccBudgetMap[id]?.budgeted || 0;
      const actual = ccActualMap[id]?.actual || 0;
      const variance = budgeted - actual;
      const pct = budgeted > 0 ? ((actual / budgeted) * 100).toFixed(1) : 0;
      return { id, name, budgeted, actual, variance, pct: parseFloat(pct) };
    }).sort((a, b) => b.budgeted - a.budgeted);
  }, [ccBudgetMap, ccActualMap]);

  // ---- Monthly trend for selected CC ----
  const monthlyTrend = useMemo(() => {
    const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    return MONTHS.map((label, idx) => {
      const mm = String(idx + 1).padStart(2, "0");
      const prefix = `${selectedYear}-${mm}`;

      const filteredEntries = costEntries.filter(e =>
        e.date?.startsWith(prefix) &&
        (selectedCC === "all" || e.cost_center_id === selectedCC)
      );
      const actual = filteredEntries.reduce((s, e) => s + (e.total_cost || 0), 0);

      const budgetedMonthly = budgets
        .filter(b =>
          b.year === selectedYear &&
          b.period_type === "شهرية" &&
          (selectedCC === "all" || b.cost_center_id === selectedCC) &&
          (b.period_label?.includes(mm) || b.period_label?.includes(label))
        )
        .reduce((s, b) => s + (b.total_budgeted || 0), 0);

      // fallback: divide annual budget by 12
      const annualBudget = budgets
        .filter(b =>
          b.year === selectedYear &&
          b.period_type !== "شهرية" &&
          (selectedCC === "all" || b.cost_center_id === selectedCC)
        )
        .reduce((s, b) => s + (b.total_budgeted || 0), 0);

      const budgeted = budgetedMonthly > 0 ? budgetedMonthly : Math.round(annualBudget / 12);

      return { label, budgeted, actual, variance: budgeted - actual };
    });
  }, [costEntries, budgets, selectedYear, selectedCC]);

  // ---- KPIs ----
  const totals = useMemo(() => {
    const filtered = selectedCC === "all" ? ccCompareData : ccCompareData.filter(c => c.id === selectedCC);
    const budgeted = filtered.reduce((s, c) => s + c.budgeted, 0);
    const actual = filtered.reduce((s, c) => s + c.actual, 0);
    return { budgeted, actual, variance: budgeted - actual, pct: budgeted > 0 ? ((actual / budgeted) * 100).toFixed(1) : 0 };
  }, [ccCompareData, selectedCC]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-blue-600" />
            الميزانية مقابل المصروفات الفعلية
          </h1>
          <p className="text-gray-500 text-sm mt-1">مقارنة تفاعلية لمراكز التكلفة</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="السنة" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedCC} onValueChange={setSelectedCC}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="مركز التكلفة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع مراكز التكلفة</SelectItem>
              {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-blue-600 font-semibold mb-1">الميزانية المقدرة</p>
            <p className="text-xl font-bold text-blue-700">{fmt(totals.budgeted)}</p>
            <Target className="h-4 w-4 text-blue-400 mt-1" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-purple-600 font-semibold mb-1">المصروفات الفعلية</p>
            <p className="text-xl font-bold text-purple-700">{fmt(totals.actual)}</p>
            <TrendingUp className="h-4 w-4 text-purple-400 mt-1" />
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm ${totals.variance >= 0 ? "bg-green-50" : "bg-red-50"}`}>
          <CardContent className="pt-4 pb-3">
            <p className={`text-xs font-semibold mb-1 ${totals.variance >= 0 ? "text-green-600" : "text-red-600"}`}>الفرق (الانحراف)</p>
            <p className={`text-xl font-bold ${totals.variance >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(Math.abs(totals.variance))}</p>
            {totals.variance >= 0
              ? <CheckCircle className="h-4 w-4 text-green-400 mt-1" />
              : <AlertTriangle className="h-4 w-4 text-red-400 mt-1" />}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-amber-600 font-semibold mb-1">نسبة الإنفاق</p>
            <p className="text-xl font-bold text-amber-700">{totals.pct}%</p>
            <div className="h-1.5 bg-amber-200 rounded-full mt-2">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(totals.pct, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Line Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-gray-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            المنحنى الشهري — الميزانية مقابل الفعلي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={v => fmt(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="budgeted" name="الميزانية" fill="#dbeafe" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="actual" name="الفعلي" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: "#8b5cf6" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar Chart: By Cost Center */}
      {selectedCC === "all" && ccCompareData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-700 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-500" />
              مقارنة مراكز التكلفة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ccCompareData.slice(0, 10)} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={v => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="budgeted" name="الميزانية" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="الفعلي" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Variance Bar Chart */}
      {selectedCC === "all" && ccCompareData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-700 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              الانحراف عن الميزانية لكل مركز تكلفة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ccCompareData.slice(0, 10)} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={v => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#374151" strokeWidth={1.5} />
                <Bar dataKey="variance" name="الانحراف" radius={[4, 4, 0, 0]}
                  fill="#10b981"
                  label={false}
                  // color by sign via cell — simplified: use one color for display
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table Summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-gray-700">ملخص مراكز التكلفة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs">
                  <th className="py-2 px-3 font-semibold rounded-r-lg">مركز التكلفة</th>
                  <th className="py-2 px-3 font-semibold">الميزانية</th>
                  <th className="py-2 px-3 font-semibold">الفعلي</th>
                  <th className="py-2 px-3 font-semibold">الانحراف</th>
                  <th className="py-2 px-3 font-semibold rounded-l-lg">نسبة الإنفاق</th>
                </tr>
              </thead>
              <tbody>
                {(selectedCC === "all" ? ccCompareData : ccCompareData.filter(c => c.id === selectedCC)).map((row, i) => (
                  <tr key={row.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                    <td className="py-2.5 px-3 font-medium text-gray-800">{row.name}</td>
                    <td className="py-2.5 px-3 text-blue-600 font-semibold">{fmt(row.budgeted)}</td>
                    <td className="py-2.5 px-3 text-purple-600 font-semibold">{fmt(row.actual)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`font-semibold ${row.variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {row.variance >= 0 ? "▲ " : "▼ "}{fmt(Math.abs(row.variance))}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full max-w-[80px]">
                          <div className={`h-full rounded-full ${row.pct > 100 ? "bg-red-500" : row.pct > 85 ? "bg-amber-500" : "bg-green-500"}`}
                            style={{ width: `${Math.min(row.pct, 100)}%` }} />
                        </div>
                        <Badge variant="outline" className={`text-xs ${row.pct > 100 ? "border-red-300 text-red-600" : row.pct > 85 ? "border-amber-300 text-amber-600" : "border-green-300 text-green-600"}`}>
                          {row.pct}%
                        </Badge>
                      </div>
                    </td>
                  </tr>
                ))}
                {ccCompareData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">لا توجد بيانات للسنة المختارة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}