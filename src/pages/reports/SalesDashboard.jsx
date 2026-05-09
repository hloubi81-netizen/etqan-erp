import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from "recharts";
import {
  TrendingUp, ShoppingCart, Package, Building2,
  Calendar, RefreshCw, Trophy, Star, Zap
} from "lucide-react";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#f97316", "#84cc16"];

const PERIODS = [
  { label: "هذا الأسبوع", days: 7 },
  { label: "هذا الشهر", days: 30 },
  { label: "3 أشهر", days: 90 },
  { label: "6 أشهر", days: 180 },
  { label: "هذه السنة", days: 365 },
];

function getDateFrom(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export default function SalesDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const [inv, br] = await Promise.all([
      base44.entities.Invoice.filter({ status: "مرحّلة" }).catch(() => []),
      base44.entities.Branch.list().catch(() => []),
    ]);
    setInvoices(inv);
    setBranches(br);
    setLoading(false);
    setRefreshing(false);
  }

  const dateFrom = getDateFrom(selectedPeriod);

  const filtered = useMemo(() =>
    invoices.filter((inv) =>
      inv.pattern_type === "مبيعات" &&
      inv.date >= dateFrom
    ), [invoices, dateFrom]);

  // ── أعلى المنتجات مبيعاً ──
  const topProducts = useMemo(() => {
    const map = {};
    filtered.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        if (!item.product_name) return;
        if (!map[item.product_name]) map[item.product_name] = { name: item.product_name, كمية: 0, إيرادات: 0, count: 0 };
        map[item.product_name].كمية += item.quantity || 0;
        map[item.product_name].إيرادات += item.total || 0;
        map[item.product_name].count++;
      });
    });
    return Object.values(map).sort((a, b) => b.إيرادات - a.إيرادات).slice(0, 10);
  }, [filtered]);

  // ── أكثر الفروع نشاطاً ──
  const branchActivity = useMemo(() => {
    const map = {};
    filtered.forEach((inv) => {
      const branchName = inv.branch_name || "الفرع الرئيسي";
      if (!map[branchName]) map[branchName] = { name: branchName, مبيعات: 0, فواتير: 0 };
      map[branchName].مبيعات += inv.total || 0;
      map[branchName].فواتير++;
    });
    return Object.values(map).sort((a, b) => b.مبيعات - a.مبيعات);
  }, [filtered]);

  // ── المبيعات اليومية / الأسبوعية ──
  const trendData = useMemo(() => {
    const map = {};
    filtered.forEach((inv) => {
      if (!inv.date) return;
      const key = selectedPeriod <= 30 ? inv.date : inv.date.substring(0, 7);
      if (!map[key]) map[key] = { date: key, مبيعات: 0, فواتير: 0 };
      map[key].مبيعات += inv.total || 0;
      map[key].فواتير++;
    });
    return Object.values(map).sort((a, b) => a.date > b.date ? 1 : -1).map((d) => ({
      ...d,
      date: selectedPeriod <= 30
        ? d.date.replace(/\d{4}-/, "").replace("-", "/")
        : d.date.replace(/(\d{4})-(\d{2})/, (_, y, m) => `${m}/${y}`),
    }));
  }, [filtered, selectedPeriod]);

  // ── توزيع المبيعات حسب طريقة الدفع ──
  const paymentPie = useMemo(() => {
    const map = {};
    filtered.forEach((inv) => {
      const key = inv.payment_type || "آجل";
      map[key] = (map[key] || 0) + (inv.total || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [filtered]);

  // ── KPIs ──
  const totalRevenue = filtered.reduce((s, i) => s + (i.total || 0), 0);
  const totalInvoices = filtered.length;
  const avgInvoice = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
  const totalItems = filtered.reduce((s, i) => s + (i.items?.length || 0), 0);

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
            <TrendingUp className="h-6 w-6 text-primary" />
            لوحة تحكم المبيعات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">تحليل شامل لأداء المبيعات والمنتجات والفروع</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* Period Filter */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground ml-1">الفترة:</span>
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setSelectedPeriod(p.days)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedPeriod === p.days
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted hover:bg-muted-foreground/20 text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الإيرادات", value: totalRevenue.toLocaleString(), Icon: TrendingUp, color: "bg-blue-500", sub: "ريال" },
          { label: "عدد الفواتير", value: totalInvoices.toLocaleString(), Icon: ShoppingCart, color: "bg-green-500", sub: "فاتورة" },
          { label: "متوسط الفاتورة", value: Math.round(avgInvoice).toLocaleString(), Icon: Zap, color: "bg-purple-500", sub: "ريال" },
          { label: "إجمالي الأصناف", value: totalItems.toLocaleString(), Icon: Package, color: "bg-orange-500", sub: "صنف" },
        ].map(({ label, value, Icon, color, sub }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
                <div className={`${color} p-2.5 rounded-xl`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            اتجاه المبيعات — {PERIODS.find((p) => p.days === selectedPeriod)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد مبيعات في هذه الفترة</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
                <Area type="monotone" dataKey="مبيعات" stroke="#2563eb" fill="url(#salesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Products + Branch Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              أعلى المنتجات مبيعاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts.slice(0, 7)} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => v.toLocaleString()} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                  <Bar dataKey="إيرادات" radius={[0, 4, 4, 0]}>
                    {topProducts.slice(0, 7).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Branch Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              أكثر الفروع نشاطاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {branchActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={branchActivity} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="مبيعات" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="فواتير" fill="#16a34a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Pie + Top Products Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              توزيع المبيعات حسب طريقة الدفع
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentPie.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={paymentPie} cx="50%" cy="50%" outerRadius={85} innerRadius={40} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {paymentPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              جدول أعلى المنتجات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">#</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">المنتج</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">الكمية</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">الإيرادات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.slice(0, 8).map((p, i) => (
                      <tr key={p.name} className="border-t border-border hover:bg-muted/20">
                        <td className="p-2.5">
                          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            i === 0 ? "bg-yellow-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-orange-400" : "bg-muted-foreground/30"
                          }`}>{i + 1}</span>
                        </td>
                        <td className="p-2.5 font-medium max-w-[120px] truncate">{p.name}</td>
                        <td className="p-2.5 text-muted-foreground">{p.كمية.toLocaleString()}</td>
                        <td className="p-2.5 font-semibold text-primary">{p.إيرادات.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}