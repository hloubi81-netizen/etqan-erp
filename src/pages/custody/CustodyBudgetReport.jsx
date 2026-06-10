import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Wallet, FileBarChart2, Download } from "lucide-react";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
const fmt = v => (v || 0).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function BudgetBar({ budgeted, actual, label }) {
  const pct = budgeted > 0 ? Math.min((actual / budgeted) * 100, 100) : 0;
  const over = actual > budgeted && budgeted > 0;
  const warn = pct > 80 && !over;
  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${over ? "bg-red-500" : warn ? "bg-orange-400" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{fmt(actual)} (فعلي)</span>
        <span className={over ? "text-red-600 font-bold" : ""}>{Math.round(pct)}%</span>
        <span>{fmt(budgeted)} (ميزانية)</span>
      </div>
    </div>
  );
}

function StatusBadge({ pct, over }) {
  if (over) return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><AlertTriangle className="h-3 w-3" />تجاوز الميزانية</Badge>;
  if (pct >= 80) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1"><TrendingUp className="h-3 w-3" />تحذير</Badge>;
  if (pct >= 50) return <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1"><TrendingUp className="h-3 w-3" />طبيعي</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="h-3 w-3" />ضمن الميزانية</Badge>;
}

export default function CustodyBudgetReport() {
  const [costCenters, setCostCenters] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [costEntries, setCostEntries] = useState([]);
  const [custodies, setCustodies] = useState([]);
  const [custodyExpenses, setCustodyExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterCC, setFilterCC] = useState("all");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeCC, setActiveCC] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.CostCenter.list(),
      base44.entities.Budget.list(),
      base44.entities.CostEntry.filter({ status: "مرحّل" }),
      base44.entities.Custody.list(),
      base44.entities.CustodyExpense.list(),
    ]).then(([cc, bud, ce, cust, cexp]) => {
      setCostCenters(cc);
      setBudgets(bud);
      setCostEntries(ce);
      setCustodies(cust);
      setCustodyExpenses(cexp);
      setLoading(false);
    });
  }, []);

  const years = useMemo(() => {
    const ys = new Set(budgets.map(b => b.year).filter(Boolean));
    return [...ys].sort().reverse();
  }, [budgets]);

  // Filter cost entries by date range
  const filteredEntries = useMemo(() => {
    let data = costEntries;
    if (fromDate) data = data.filter(e => e.date >= fromDate);
    if (toDate)   data = data.filter(e => e.date <= toDate);
    if (filterCC !== "all") data = data.filter(e => e.cost_center_id === filterCC);
    return data;
  }, [costEntries, fromDate, toDate, filterCC]);

  // Filter custody expenses by date range
  const filteredCustodyExpenses = useMemo(() => {
    let data = custodyExpenses;
    if (fromDate) data = data.filter(e => e.expense_date >= fromDate);
    if (toDate)   data = data.filter(e => e.expense_date <= toDate);
    return data;
  }, [custodyExpenses, fromDate, toDate]);

  // Build per-cost-center report
  const ccReport = useMemo(() => {
    const activeCenters = filterCC === "all" ? costCenters : costCenters.filter(cc => cc.id === filterCC);

    return activeCenters.map((cc, idx) => {
      // Budgets for this CC in selected year
      const ccBudgets = budgets.filter(b => b.cost_center_id === cc.id && (!filterYear || b.year === filterYear));
      const totalBudgeted = ccBudgets.reduce((s, b) => s + (b.total_budgeted || 0), 0);
      const approvedBudget = ccBudgets.find(b => b.status === "معتمدة");

      // CostEntries (from all sources, including custody)
      const ccEntries = filteredEntries.filter(e => e.cost_center_id === cc.id);
      const entriesTotal = ccEntries.reduce((s, e) => s + (e.total_cost || 0), 0);

      // Direct custody expenses for this CC
      const ccCustodyExpenses = filteredCustodyExpenses.filter(e => {
        if (e.cost_center_id === cc.id) return true;
        // Also include expenses from custodies linked to this CC
        const parentCustody = custodies.find(c => c.id === e.custody_id);
        return parentCustody?.cost_center_id === cc.id;
      });
      const custodyExpTotal = ccCustodyExpenses.reduce((s, e) => s + (e.amount || 0), 0);

      // Custodies linked to this CC
      const ccCustodies = custodies.filter(c => c.cost_center_id === cc.id);
      const custodyIssuedTotal = ccCustodies.reduce((s, c) => s + (c.issued_amount || 0), 0);
      const settledCustodies = ccCustodies.filter(c => c.status === "مسواة");

      // Use entriesTotal as the "actual" (it includes custody-posted entries)
      const actualTotal = entriesTotal;
      const pct = totalBudgeted > 0 ? Math.round((actualTotal / totalBudgeted) * 100) : 0;
      const variance = totalBudgeted - actualTotal;
      const over = actualTotal > totalBudgeted && totalBudgeted > 0;

      // Breakdown by cost type from entries
      const byType = {};
      ccEntries.forEach(e => {
        byType[e.cost_type || "أخرى"] = (byType[e.cost_type || "أخرى"] || 0) + (e.total_cost || 0);
      });

      // Budget items breakdown
      const budgetItems = (approvedBudget?.items || []).map(item => {
        const itemActual = ccEntries
          .filter(e => e.account_id === item.account_id)
          .reduce((s, e) => s + (e.total_cost || 0), 0);
        return { ...item, itemActual };
      });

      return {
        cc, idx,
        totalBudgeted, actualTotal, pct, variance, over,
        approvedBudget, ccBudgets,
        entriesTotal, custodyExpTotal, custodyIssuedTotal,
        ccCustodies, settledCustodies,
        ccEntries, ccCustodyExpenses,
        byType, budgetItems,
        color: COLORS[idx % COLORS.length],
      };
    }).filter(r => r.totalBudgeted > 0 || r.actualTotal > 0 || r.ccCustodies.length > 0);
  }, [costCenters, budgets, filteredEntries, filteredCustodyExpenses, custodies, filterCC, filterYear]);

  // Summary KPIs
  const totalBudgeted = ccReport.reduce((s, r) => s + r.totalBudgeted, 0);
  const totalActual   = ccReport.reduce((s, r) => s + r.actualTotal, 0);
  const totalVariance = totalBudgeted - totalActual;
  const overBudgetCount = ccReport.filter(r => r.over).length;

  // Chart data for budget vs actual comparison
  const comparisonChartData = ccReport.map(r => ({
    name: r.cc.name.length > 10 ? r.cc.name.slice(0, 10) + "…" : r.cc.name,
    الميزانية: r.totalBudgeted,
    الفعلي: r.actualTotal,
    الفارق: Math.max(r.variance, 0),
  }));

  // Pie data for actual distribution
  const pieData = ccReport.filter(r => r.actualTotal > 0).map(r => ({
    name: r.cc.name,
    value: r.actualTotal,
  }));

  function exportCSV() {
    const rows = [["مركز التكلفة", "الميزانية المعتمدة", "المصروف الفعلي", "مصاريف العهد", "الفارق", "نسبة التنفيذ", "الحالة"]];
    ccReport.forEach(r => {
      rows.push([
        r.cc.name,
        r.totalBudgeted,
        r.actualTotal,
        r.custodyExpTotal,
        r.variance,
        `${r.pct}%`,
        r.over ? "تجاوز" : r.pct >= 80 ? "تحذير" : "طبيعي",
      ]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `تقرير_عهد_مراكز_التكلفة_${filterYear}.csv`;
    a.click();
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart2 className="h-6 w-6 text-primary" />
            تقرير العهد ومراكز التكلفة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">مقارنة الميزانية المخصصة مقابل المصاريف الفعلية المترحلة من العهد</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> تصدير CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">مركز التكلفة</Label>
              <Select value={filterCC} onValueChange={setFilterCC}>
                <SelectTrigger className="h-9"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المراكز</SelectItem>
                  {costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">السنة</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>كل السنوات</SelectItem>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  {!years.includes(new Date().getFullYear().toString()) && (
                    <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">من تاريخ</Label>
              <Input className="h-9" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input className="h-9" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {ccReport.length === 0 ? (
        <div className="bg-card border rounded-xl p-16 text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>لا توجد بيانات متاحة لمراكز التكلفة في الفترة المحددة</p>
          <p className="text-xs mt-1">تأكد من ربط العهد بمراكز التكلفة وتسوية العهد لتظهر المصاريف هنا</p>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="pt-5 pb-5 text-center">
                <Wallet className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-700">{fmt(totalBudgeted)}</p>
                <p className="text-xs text-muted-foreground mt-1">إجمالي الميزانيات</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="pt-5 pb-5 text-center">
                <TrendingUp className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-700">{fmt(totalActual)}</p>
                <p className="text-xs text-muted-foreground mt-1">إجمالي الفعلي</p>
              </CardContent>
            </Card>
            <Card className={`border-0 bg-gradient-to-br ${totalVariance >= 0 ? "from-emerald-50 to-emerald-100" : "from-red-50 to-red-100"}`}>
              <CardContent className="pt-5 pb-5 text-center">
                {totalVariance >= 0
                  ? <TrendingDown className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                  : <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                }
                <p className={`text-2xl font-bold ${totalVariance >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(Math.abs(totalVariance))}</p>
                <p className="text-xs text-muted-foreground mt-1">{totalVariance >= 0 ? "الفائض" : "تجاوز الميزانية"}</p>
              </CardContent>
            </Card>
            <Card className={`border-0 bg-gradient-to-br ${overBudgetCount > 0 ? "from-red-50 to-red-100" : "from-slate-50 to-slate-100"}`}>
              <CardContent className="pt-5 pb-5 text-center">
                <AlertTriangle className={`h-6 w-6 mx-auto mb-1 ${overBudgetCount > 0 ? "text-red-600" : "text-slate-400"}`} />
                <p className={`text-2xl font-bold ${overBudgetCount > 0 ? "text-red-700" : "text-slate-500"}`}>{overBudgetCount}</p>
                <p className="text-xs text-muted-foreground mt-1">مراكز تجاوزت الميزانية</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">الميزانية مقابل الفعلي — لكل مركز تكلفة</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={comparisonChartData} margin={{ right: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="الميزانية" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="الفعلي" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">توزيع المصاريف الفعلية بين المراكز</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                      label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""}
                      labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Per Cost Center Cards */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              تفاصيل كل مركز تكلفة
            </h2>

            {ccReport.map(r => (
              <Card key={r.cc.id} className={`border-r-4 transition-all ${r.over ? "border-r-red-500" : r.pct >= 80 ? "border-r-orange-400" : "border-r-emerald-500"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: r.color }}>
                        {r.cc.name.slice(0, 2)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{r.cc.name}</CardTitle>
                        {r.cc.code && <p className="text-xs text-muted-foreground">رمز: {r.cc.code}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge pct={r.pct} over={r.over} />
                      <button
                        onClick={() => setActiveCC(activeCC === r.cc.id ? null : r.cc.id)}
                        className="text-xs text-primary underline"
                      >
                        {activeCC === r.cc.id ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Budget bar */}
                  <BudgetBar budgeted={r.totalBudgeted} actual={r.actualTotal} />

                  {/* KPI row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-base font-bold text-blue-700">{fmt(r.totalBudgeted)}</p>
                      <p className="text-[10px] text-muted-foreground">الميزانية</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-3">
                      <p className="text-base font-bold text-orange-700">{fmt(r.actualTotal)}</p>
                      <p className="text-[10px] text-muted-foreground">الفعلي</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3">
                      <p className="text-base font-bold text-indigo-700">{fmt(r.custodyExpTotal)}</p>
                      <p className="text-[10px] text-muted-foreground">مصاريف العهد</p>
                    </div>
                    <div className={`rounded-xl p-3 ${r.over ? "bg-red-50" : "bg-emerald-50"}`}>
                      <p className={`text-base font-bold ${r.over ? "text-red-700" : "text-emerald-700"}`}>
                        {r.over ? "-" : "+"}{fmt(Math.abs(r.variance))}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{r.over ? "تجاوز" : "فائض"}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3">
                      <p className="text-base font-bold text-purple-700">{r.ccCustodies.length}</p>
                      <p className="text-[10px] text-muted-foreground">عهدة ({r.settledCustodies.length} مسواة)</p>
                    </div>
                  </div>

                  {/* Expandable details */}
                  {activeCC === r.cc.id && (
                    <div className="space-y-4 pt-2 border-t">
                      {/* By cost type breakdown */}
                      {Object.keys(r.byType).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">توزيع المصاريف حسب النوع</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(r.byType).map(([type, val], i) => (
                              <div key={type} className="flex items-center justify-between px-3 py-2 rounded-lg border text-xs">
                                <span>{type}</span>
                                <span className="font-semibold" style={{ color: COLORS[i % COLORS.length] }}>{fmt(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Budget items vs actual */}
                      {r.budgetItems.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">بنود الميزانية مقابل الفعلي</p>
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/40">
                                <tr>
                                  <th className="text-right px-3 py-2 font-medium">الحساب</th>
                                  <th className="text-right px-3 py-2 font-medium">الميزانية</th>
                                  <th className="text-right px-3 py-2 font-medium">الفعلي</th>
                                  <th className="text-right px-3 py-2 font-medium">الفارق</th>
                                  <th className="text-right px-3 py-2 font-medium">نسبة التنفيذ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.budgetItems.map((item, i) => {
                                  const itemVar = (item.budgeted_amount || 0) - (item.itemActual || 0);
                                  const itemPct = item.budgeted_amount > 0 ? Math.round((item.itemActual / item.budgeted_amount) * 100) : 0;
                                  return (
                                    <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                                      <td className="px-3 py-2">{item.account_name || "—"}</td>
                                      <td className="px-3 py-2">{fmt(item.budgeted_amount)}</td>
                                      <td className="px-3 py-2 font-semibold text-orange-600">{fmt(item.itemActual)}</td>
                                      <td className={`px-3 py-2 font-semibold ${itemVar >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                        {itemVar >= 0 ? "+" : ""}{fmt(itemVar)}
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                            <div className={`h-1.5 rounded-full ${itemPct > 100 ? "bg-red-500" : itemPct > 80 ? "bg-orange-400" : "bg-emerald-500"}`}
                                              style={{ width: `${Math.min(itemPct, 100)}%` }} />
                                          </div>
                                          <span className={`text-[10px] font-medium ${itemPct > 100 ? "text-red-600" : ""}`}>{itemPct}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Linked custodies */}
                      {r.ccCustodies.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">العهد المرتبطة بهذا المركز</p>
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/40">
                                <tr>
                                  <th className="text-right px-3 py-2 font-medium">رقم العهدة</th>
                                  <th className="text-right px-3 py-2 font-medium">الموظف</th>
                                  <th className="text-right px-3 py-2 font-medium">الغرض</th>
                                  <th className="text-right px-3 py-2 font-medium">المبلغ المصروف</th>
                                  <th className="text-right px-3 py-2 font-medium">المصاريف الفعلية</th>
                                  <th className="text-right px-3 py-2 font-medium">الحالة</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.ccCustodies.map((c, i) => {
                                  const cExpenses = r.ccCustodyExpenses.filter(e => e.custody_id === c.id);
                                  const cExp = cExpenses.reduce((s, e) => s + (e.amount || 0), 0);
                                  const statusColor = {
                                    "مفتوحة": "bg-blue-100 text-blue-700",
                                    "تحت التسوية": "bg-orange-100 text-orange-700",
                                    "مسواة": "bg-emerald-100 text-emerald-700",
                                    "مغلقة": "bg-gray-100 text-gray-600",
                                  }[c.status] || "bg-gray-100 text-gray-600";
                                  return (
                                    <tr key={c.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                                      <td className="px-3 py-2 font-mono font-medium text-primary">{c.custody_number}</td>
                                      <td className="px-3 py-2">{c.employee_name}</td>
                                      <td className="px-3 py-2 text-muted-foreground truncate max-w-32">{c.purpose}</td>
                                      <td className="px-3 py-2 font-semibold">{fmt(c.issued_amount)}</td>
                                      <td className="px-3 py-2 font-semibold text-orange-600">{fmt(cExp)}</td>
                                      <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>{c.status}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                                <tr className="border-t bg-muted/30 font-bold">
                                  <td colSpan={3} className="px-3 py-2">الإجمالي</td>
                                  <td className="px-3 py-2">{fmt(r.custodyIssuedTotal)}</td>
                                  <td className="px-3 py-2 text-orange-600">{fmt(r.custodyExpTotal)}</td>
                                  <td></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Recent cost entries */}
                      {r.ccEntries.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">آخر قيود التكلفة المترحلة</p>
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/40">
                                <tr>
                                  <th className="text-right px-3 py-2 font-medium">التاريخ</th>
                                  <th className="text-right px-3 py-2 font-medium">نوع التكلفة</th>
                                  <th className="text-right px-3 py-2 font-medium">البيان</th>
                                  <th className="text-right px-3 py-2 font-medium">المبلغ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.ccEntries.slice(0, 8).map((e, i) => (
                                  <tr key={e.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                                    <td className="px-3 py-2">{e.date}</td>
                                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px] py-0">{e.cost_type}</Badge></td>
                                    <td className="px-3 py-2 text-muted-foreground truncate max-w-48">{e.description}</td>
                                    <td className="px-3 py-2 font-semibold text-primary">{fmt(e.total_cost)}</td>
                                  </tr>
                                ))}
                                {r.ccEntries.length > 8 && (
                                  <tr>
                                    <td colSpan={4} className="px-3 py-2 text-center text-muted-foreground text-[10px]">
                                      و{r.ccEntries.length - 8} قيود أخرى...
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">جدول المقارنة الملخص</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-right px-4 py-3 text-xs font-semibold">مركز التكلفة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الميزانية المعتمدة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الفعلي (من قيود)</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">مصاريف العهد</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">عدد العهد</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الفارق</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">التنفيذ</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ccReport.map((r, i) => (
                      <tr key={r.cc.id} className={`border-t ${i % 2 === 0 ? "" : "bg-muted/20"} ${r.over ? "bg-red-50/40" : ""}`}>
                        <td className="px-4 py-3 font-medium">{r.cc.name}</td>
                        <td className="px-4 py-3 text-blue-700 font-semibold">{fmt(r.totalBudgeted)}</td>
                        <td className="px-4 py-3 text-orange-600 font-semibold">{fmt(r.actualTotal)}</td>
                        <td className="px-4 py-3 text-indigo-600">{fmt(r.custodyExpTotal)}</td>
                        <td className="px-4 py-3">{r.ccCustodies.length} ({r.settledCustodies.length} مسواة)</td>
                        <td className={`px-4 py-3 font-bold ${r.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {r.variance >= 0 ? "+" : ""}{fmt(r.variance)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${r.over ? "bg-red-500" : r.pct >= 80 ? "bg-orange-400" : "bg-emerald-500"}`}
                                style={{ width: `${Math.min(r.pct, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-medium ${r.over ? "text-red-600" : ""}`}>{r.pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge pct={r.pct} over={r.over} /></td>
                      </tr>
                    ))}
                    <tr className="border-t-2 bg-muted/50 font-bold">
                      <td className="px-4 py-3">الإجمالي</td>
                      <td className="px-4 py-3 text-blue-700">{fmt(totalBudgeted)}</td>
                      <td className="px-4 py-3 text-orange-600">{fmt(totalActual)}</td>
                      <td className="px-4 py-3 text-indigo-600">{fmt(ccReport.reduce((s, r) => s + r.custodyExpTotal, 0))}</td>
                      <td className="px-4 py-3">{ccReport.reduce((s, r) => s + r.ccCustodies.length, 0)}</td>
                      <td className={`px-4 py-3 ${totalVariance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {totalVariance >= 0 ? "+" : ""}{fmt(totalVariance)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {totalBudgeted > 0 ? Math.round((totalActual / totalBudgeted) * 100) : 0}%
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}