import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, GitBranch, DollarSign,
  ShoppingCart, CreditCard, Award, AlertCircle, Target, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#14b8a6"];

function fmt(n) { return (n || 0).toLocaleString("ar-EG", { maximumFractionDigits: 0 }); }
function pct(a, b) { return b > 0 ? ((a / b) * 100).toFixed(1) : "0.0"; }

function KpiCard({ label, value, sub, icon: Icon, trend, color = "blue" }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-bold text-foreground truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border", colorMap[color])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trend >= 0 ? "text-green-600" : "text-red-500")}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}% عن الفترة السابقة
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-amber-500 font-bold text-lg">🥇</span>;
  if (rank === 2) return <span className="text-slate-400 font-bold text-lg">🥈</span>;
  if (rank === 3) return <span className="text-amber-700 font-bold text-lg">🥉</span>;
  return <span className="text-muted-foreground font-semibold text-sm">#{rank}</span>;
}

export default function BranchPerformance() {
  const [branches, setBranches] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.Branch.list(),
      base44.entities.Invoice.list("-date", 2000),
      base44.entities.Voucher.list("-date", 2000),
    ]).then(([b, inv, vch]) => {
      setBranches(b);
      setInvoices(inv);
      setVouchers(vch);
    }).finally(() => setLoading(false));
  }, []);

  // Filter invoices by selected period
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (!inv.date || inv.status !== "مرحّلة") return false;
      const d = new Date(inv.date);
      if (String(d.getFullYear()) !== year) return false;
      if (month !== "all" && String(d.getMonth()) !== month) return false;
      return true;
    });
  }, [invoices, year, month]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      if (!v.date || v.status !== "مرحّل") return false;
      const d = new Date(v.date);
      if (String(d.getFullYear()) !== year) return false;
      if (month !== "all" && String(d.getMonth()) !== month) return false;
      return true;
    });
  }, [vouchers, year, month]);

  // Per-branch aggregates
  const branchStats = useMemo(() => {
    const map = {};
    branches.forEach(b => {
      map[b.id] = {
        id: b.id,
        name: b.name,
        sales: 0,
        returns: 0,
        purchases: 0,
        expenses: 0,
        invoiceCount: 0,
        invoiceCountByType: {},
      };
    });

    filteredInvoices.forEach(inv => {
      const bid = inv.branch_id;
      if (!bid || !map[bid]) return;
      const total = inv.total || 0;
      map[bid].invoiceCount++;
      if (inv.pattern_type === "مبيعات") map[bid].sales += total;
      else if (inv.pattern_type === "مرتجع مبيعات") map[bid].returns += total;
      else if (inv.pattern_type === "مشتريات") map[bid].purchases += total;
    });

    // Expenses from payment vouchers
    filteredVouchers.forEach(v => {
      if (v.type !== "سند دفع") return;
      // Try to match branch from voucher if available; otherwise skip
      // Voucher entity doesn't have branch_id, so we approximate from activity
    });

    return Object.values(map).map(b => ({
      ...b,
      netSales: b.sales - b.returns,
      grossProfit: b.sales - b.returns - b.purchases,
      expenseRatio: b.sales > 0 ? (b.purchases / b.sales) * 100 : 0,
    })).sort((a, b) => b.netSales - a.netSales);
  }, [branches, filteredInvoices, filteredVouchers]);

  // Monthly trend per branch (for the selected year only)
  const monthlyData = useMemo(() => {
    const data = MONTHS.map((m, idx) => ({ month: m.slice(0,3), ...Object.fromEntries(branches.map(b => [b.name, 0])) }));
    invoices.forEach(inv => {
      if (!inv.date || inv.status !== "مرحّلة" || inv.pattern_type !== "مبيعات") return;
      const d = new Date(inv.date);
      if (String(d.getFullYear()) !== year) return;
      const mi = d.getMonth();
      if (inv.branch_id && branches.find(b => b.id === inv.branch_id)) {
        const bname = branches.find(b => b.id === inv.branch_id).name;
        data[mi][bname] = (data[mi][bname] || 0) + (inv.total || 0);
      }
    });
    return data;
  }, [invoices, branches, year]);

  // Radar chart data
  const radarData = useMemo(() => {
    const maxSales = Math.max(...branchStats.map(b => b.sales), 1);
    const maxCount = Math.max(...branchStats.map(b => b.invoiceCount), 1);
    const maxGross = Math.max(...branchStats.map(b => Math.max(b.grossProfit, 0)), 1);
    return [
      { metric: "حجم المبيعات", ...Object.fromEntries(branchStats.slice(0,5).map(b => [b.name, Math.round((b.sales/maxSales)*100)])) },
      { metric: "عدد الفواتير", ...Object.fromEntries(branchStats.slice(0,5).map(b => [b.name, Math.round((b.invoiceCount/maxCount)*100)])) },
      { metric: "إجمالي الربح", ...Object.fromEntries(branchStats.slice(0,5).map(b => [b.name, Math.round((Math.max(b.grossProfit,0)/maxGross)*100)])) },
      { metric: "المبيعات الصافية", ...Object.fromEntries(branchStats.slice(0,5).map(b => [b.name, Math.round((b.netSales/maxSales)*100)])) },
      { metric: "كفاءة التكلفة", ...Object.fromEntries(branchStats.slice(0,5).map(b => [b.name, Math.round(Math.max(100-b.expenseRatio, 0))])) },
    ];
  }, [branchStats]);

  const totalSales = branchStats.reduce((s, b) => s + b.sales, 0);
  const totalReturns = branchStats.reduce((s, b) => s + b.returns, 0);
  const totalPurchases = branchStats.reduce((s, b) => s + b.purchases, 0);
  const topBranch = branchStats[0];
  const years = Array.from(new Set(invoices.map(i => i.date ? new Date(i.date).getFullYear() : null).filter(Boolean))).sort((a,b)=>b-a);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            لوحة تحليل أداء الفروع
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">مقارنة شاملة لأداء الفروع من حيث المبيعات والتكاليف</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.length ? years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)
                : <SelectItem value={year}>{year}</SelectItem>}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue placeholder="كل الأشهر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأشهر</SelectItem>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="إجمالي المبيعات" value={fmt(totalSales)} sub={`${branches.length} فروع`} icon={TrendingUp} color="blue" />
        <KpiCard label="صافي المبيعات" value={fmt(totalSales - totalReturns)} sub={`مرتجعات: ${fmt(totalReturns)}`} icon={DollarSign} color="green" />
        <KpiCard label="إجمالي المشتريات" value={fmt(totalPurchases)} icon={ShoppingCart} color="amber" />
        <KpiCard label="هامش الربح الإجمالي" value={`${pct(totalSales - totalReturns - totalPurchases, totalSales - totalReturns)}%`} sub={fmt(totalSales - totalReturns - totalPurchases)} icon={Target} color="purple" />
        <KpiCard label="الفرع الأول" value={topBranch?.name || "—"} sub={topBranch ? `${fmt(topBranch.sales)} مبيعات` : ""} icon={Award} color="amber" />
      </div>

      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="comparison" className="text-xs">مقارنة الفروع</TabsTrigger>
          <TabsTrigger value="trend" className="text-xs">الاتجاه الشهري</TabsTrigger>
          <TabsTrigger value="radar" className="text-xs">مؤشرات الأداء</TabsTrigger>
          <TabsTrigger value="table" className="text-xs">جدول التفصيل</TabsTrigger>
        </TabsList>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">حجم المبيعات حسب الفرع</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={branchStats} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v/1000).toFixed(0)+'k'} />
                    <Tooltip formatter={(v) => [fmt(v), ""]} />
                    <Bar dataKey="sales" name="مبيعات" fill="#3b82f6" radius={[4,4,0,0]} />
                    <Bar dataKey="returns" name="مرتجعات" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">نسبة المشتريات من المبيعات (%)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={branchStats} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={v => v+'%'} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={(v) => [v.toFixed(1)+'%', "نسبة المشتريات"]} />
                    <Bar dataKey="expenseRatio" name="نسبة المشتريات" fill="#f59e0b" radius={[0,4,4,0]}
                      label={{ position: 'right', formatter: v => v.toFixed(1)+'%', fontSize: 10 }} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Branch share cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branchStats.map((b, idx) => (
              <Card key={b.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.invoiceCount} فاتورة مرحّلة</p>
                    </div>
                    <RankBadge rank={idx + 1} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">المبيعات</span>
                      <span className="font-semibold text-blue-600">{fmt(b.sales)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">المرتجعات</span>
                      <span className="font-semibold text-red-500">{fmt(b.returns)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">المشتريات</span>
                      <span className="font-semibold text-amber-600">{fmt(b.purchases)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-xs">
                      <span className="text-muted-foreground">هامش الربح</span>
                      <span className={cn("font-bold", b.grossProfit >= 0 ? "text-green-600" : "text-red-500")}>
                        {pct(b.grossProfit, b.netSales)}%
                      </span>
                    </div>
                    {/* Sales share bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>حصة من إجمالي المبيعات</span>
                        <span>{pct(b.sales, totalSales)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct(b.sales, totalSales)}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Monthly Trend */}
        <TabsContent value="trend">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">الاتجاه الشهري للمبيعات حسب الفرع — {year}</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v/1000).toFixed(0)+'k'} />
                  <Tooltip formatter={(v) => [fmt(v), ""]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {branches.map((b, i) => (
                    <Line key={b.id} type="monotone" dataKey={b.name} stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Radar */}
        <TabsContent value="radar">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">مؤشرات الأداء المتوازن (أول 5 فروع)</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {branchStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">لا توجد بيانات للفترة المحددة</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={4} />
                    {branchStats.slice(0, 5).map((b, i) => (
                      <Radar key={b.id} name={b.name} dataKey={b.name}
                        stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.12} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detail Table */}
        <TabsContent value="table">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                جدول تفصيل أداء الفروع
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      {["الترتيب","الفرع","المبيعات","المرتجعات","صافي المبيعات","المشتريات","هامش الربح","نسبة المشتريات","الحصة السوقية","عدد الفواتير"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {branchStats.map((b, i) => (
                      <tr key={b.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 text-center"><RankBadge rank={i+1} /></td>
                        <td className="px-3 py-2.5 font-semibold text-foreground">{b.name}</td>
                        <td className="px-3 py-2.5 text-blue-600 font-mono font-semibold">{fmt(b.sales)}</td>
                        <td className="px-3 py-2.5 text-red-500 font-mono">{fmt(b.returns)}</td>
                        <td className="px-3 py-2.5 text-green-600 font-mono font-semibold">{fmt(b.netSales)}</td>
                        <td className="px-3 py-2.5 text-amber-600 font-mono">{fmt(b.purchases)}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className={cn("text-xs font-semibold", b.grossProfit >= 0 ? "border-green-300 text-green-700 bg-green-50" : "border-red-300 text-red-700 bg-red-50")}>
                            {pct(b.grossProfit, b.netSales)}%
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className={cn("text-xs", b.expenseRatio > 70 ? "border-red-300 text-red-700 bg-red-50" : b.expenseRatio > 40 ? "border-amber-300 text-amber-700 bg-amber-50" : "border-green-300 text-green-700 bg-green-50")}>
                            {b.expenseRatio.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{pct(b.sales, totalSales)}%</td>
                        <td className="px-3 py-2.5 text-center text-xs font-mono">{b.invoiceCount}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/40 font-bold border-t-2">
                      <td colSpan={2} className="px-3 py-2.5 text-xs text-muted-foreground">الإجمالي</td>
                      <td className="px-3 py-2.5 text-blue-600 font-mono text-sm">{fmt(totalSales)}</td>
                      <td className="px-3 py-2.5 text-red-500 font-mono text-sm">{fmt(totalReturns)}</td>
                      <td className="px-3 py-2.5 text-green-600 font-mono text-sm">{fmt(totalSales - totalReturns)}</td>
                      <td className="px-3 py-2.5 text-amber-600 font-mono text-sm">{fmt(totalPurchases)}</td>
                      <td className="px-3 py-2.5">
                        <Badge className="text-xs bg-green-600 text-white">{pct(totalSales-totalReturns-totalPurchases, totalSales-totalReturns)}%</Badge>
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}