import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import {
  Wrench, TrendingUp, TrendingDown, RefreshCw, Calendar,
  DollarSign, Activity, Target, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#f97316", "#84cc16"];

const PERIODS = [
  { label: "هذا الشهر", days: 30 },
  { label: "3 أشهر", days: 90 },
  { label: "6 أشهر", days: 180 },
  { label: "هذه السنة", days: 365 },
  { label: "كل الفترات", days: 9999 },
];

function getDateFrom(days) {
  if (days === 9999) return "2000-01-01";
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function fmt(n) {
  return (n || 0).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ServiceProfitability() {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [selectedService, setSelectedService] = useState("الكل");

  useEffect(() => { loadData(); }, []);

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const [inv, prods] = await Promise.all([
      base44.entities.Invoice.filter({ status: "مرحّلة" }).catch(() => []),
      base44.entities.Product.filter({ is_service: true }).catch(() => []),
    ]);
    setInvoices(inv);
    setProducts(prods);
    setLoading(false);
    setRefreshing(false);
  }

  const dateFrom = getDateFrom(selectedPeriod);

  // --- حساب بيانات الخدمات من الفواتير المرحّلة ---
  const serviceData = useMemo(() => {
    const map = {}; // keyed by product_name

    invoices.forEach((inv) => {
      if (!inv.date || inv.date < dateFrom) return;
      const isSales = inv.pattern_type?.includes("مبيعات") && !inv.pattern_type?.includes("مرتجع");
      const isPurchase = inv.pattern_type?.includes("مشتريات") && !inv.pattern_type?.includes("مرتجع");
      const isSalesReturn = inv.pattern_type?.includes("مرتجع مبيعات");
      const isPurchaseReturn = inv.pattern_type?.includes("مرتجع مشتريات");

      (inv.items || []).forEach((item) => {
        const prod = products.find((p) => p.id === item.product_id);
        if (!prod?.is_service) return;

        const name = item.product_name || prod.name;
        if (!map[name]) {
          map[name] = { name, revenue: 0, cost: 0, salesCount: 0, purchaseCount: 0, months: {} };
        }

        const amount = item.total || 0;
        const month = inv.date.substring(0, 7);

        if (!map[name].months[month]) map[name].months[month] = { month, revenue: 0, cost: 0 };

        if (isSales) {
          map[name].revenue += amount;
          map[name].salesCount++;
          map[name].months[month].revenue += amount;
        } else if (isPurchase) {
          map[name].cost += amount;
          map[name].purchaseCount++;
          map[name].months[month].cost += amount;
        } else if (isSalesReturn) {
          map[name].revenue -= amount;
          map[name].months[month].revenue -= amount;
        } else if (isPurchaseReturn) {
          map[name].cost -= amount;
          map[name].months[month].cost -= amount;
        }
      });
    });

    return Object.values(map).map((s) => ({
      ...s,
      profit: s.revenue - s.cost,
      margin: s.revenue > 0 ? ((s.revenue - s.cost) / s.revenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [invoices, products, dateFrom]);

  const serviceNames = ["الكل", ...serviceData.map((s) => s.name)];

  const filtered = useMemo(() =>
    selectedService === "الكل" ? serviceData : serviceData.filter((s) => s.name === selectedService),
    [serviceData, selectedService]
  );

  // KPIs الإجمالية
  const totalRevenue = filtered.reduce((s, i) => s + i.revenue, 0);
  const totalCost = filtered.reduce((s, i) => s + i.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // بيانات الرسم البياني للمقارنة
  const barData = filtered.map((s) => ({
    name: s.name.length > 18 ? s.name.substring(0, 18) + "…" : s.name,
    الإيرادات: Math.round(s.revenue),
    التكاليف: Math.round(s.cost),
    الربح: Math.round(s.profit),
  }));

  // بيانات التوزيع (Pie) للإيرادات
  const pieData = filtered.map((s) => ({
    name: s.name.length > 20 ? s.name.substring(0, 20) + "…" : s.name,
    value: Math.max(0, Math.round(s.revenue)),
  })).filter((d) => d.value > 0);

  // اتجاه شهري (للخدمة المختارة أو الكل)
  const trendMap = {};
  filtered.forEach((s) => {
    Object.values(s.months).forEach((m) => {
      if (!trendMap[m.month]) trendMap[m.month] = { month: m.month, الإيرادات: 0, التكاليف: 0 };
      trendMap[m.month].الإيرادات += m.revenue;
      trendMap[m.month].التكاليف += m.cost;
    });
  });
  const trendData = Object.values(trendMap)
    .sort((a, b) => a.month > b.month ? 1 : -1)
    .map((d) => ({
      ...d,
      month: d.month.replace(/(\d{4})-(\d{2})/, (_, y, m) => `${m}/${y}`),
    }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            تقرير ربحية الخدمات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">مقارنة إيرادات الخدمات بتكاليفها التشغيلية</p>
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">الفترة:</span>
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
            <div className="mr-auto w-52">
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="الخدمة" />
                </SelectTrigger>
                <SelectContent>
                  {serviceNames.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "إجمالي الإيرادات",
            value: fmt(totalRevenue),
            Icon: TrendingUp,
            color: "bg-blue-500",
            sub: "من الخدمات المباعة",
            positive: true,
          },
          {
            label: "إجمالي التكاليف",
            value: fmt(totalCost),
            Icon: TrendingDown,
            color: "bg-red-500",
            sub: "تكاليف تشغيلية",
            positive: false,
          },
          {
            label: "صافي الربح",
            value: fmt(totalProfit),
            Icon: DollarSign,
            color: totalProfit >= 0 ? "bg-green-500" : "bg-red-600",
            sub: "الإيرادات − التكاليف",
            positive: totalProfit >= 0,
          },
          {
            label: "هامش الربح",
            value: `${avgMargin.toFixed(1)}%`,
            Icon: Target,
            color: avgMargin >= 50 ? "bg-emerald-500" : avgMargin >= 20 ? "bg-yellow-500" : "bg-orange-500",
            sub: avgMargin >= 50 ? "ممتاز" : avgMargin >= 20 ? "جيد" : "يحتاج تحسين",
            positive: avgMargin >= 20,
          },
        ].map(({ label, value, Icon, color, sub, positive }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    {positive
                      ? <ArrowUpRight className="h-3 w-3 text-green-500" />
                      : <ArrowDownRight className="h-3 w-3 text-red-500" />}
                    {sub}
                  </p>
                </div>
                <div className={`${color} p-2.5 rounded-xl shrink-0`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              الاتجاه الشهري — الإيرادات مقابل التكاليف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="الإيرادات" stroke="#2563eb" fill="url(#revGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="التكاليف" stroke="#dc2626" fill="url(#costGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bar + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              مقارنة الإيرادات والتكاليف والربح
            </CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">لا توجد بيانات خدمات في هذه الفترة</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="الإيرادات" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="التكاليف" fill="#dc2626" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="الربح" fill="#16a34a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie revenue distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              توزيع الإيرادات حسب الخدمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">لا توجد بيانات</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            تفاصيل ربحية كل خدمة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">لا توجد خدمات مرحّلة في هذه الفترة</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-right text-muted-foreground font-medium">الخدمة</th>
                    <th className="p-3 text-right text-muted-foreground font-medium">الإيرادات</th>
                    <th className="p-3 text-right text-muted-foreground font-medium">التكاليف</th>
                    <th className="p-3 text-right text-muted-foreground font-medium">صافي الربح</th>
                    <th className="p-3 text-right text-muted-foreground font-medium">هامش الربح</th>
                    <th className="p-3 text-right text-muted-foreground font-medium">مرات البيع</th>
                    <th className="p-3 text-right text-muted-foreground font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.name} className={`border-t border-border hover:bg-muted/20 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3 text-blue-600 font-semibold">{fmt(s.revenue)}</td>
                      <td className="p-3 text-red-600">{fmt(s.cost)}</td>
                      <td className={`p-3 font-bold ${s.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {s.profit >= 0 ? "+" : ""}{fmt(s.profit)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${s.margin >= 50 ? "bg-green-500" : s.margin >= 20 ? "bg-yellow-500" : "bg-red-500"}`}
                              style={{ width: `${Math.min(100, Math.max(0, s.margin))}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{s.margin.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{s.salesCount}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={
                          s.margin >= 50 ? "border-green-300 text-green-700 bg-green-50" :
                          s.margin >= 20 ? "border-yellow-300 text-yellow-700 bg-yellow-50" :
                          "border-red-300 text-red-700 bg-red-50"
                        }>
                          {s.margin >= 50 ? "ممتاز" : s.margin >= 20 ? "مقبول" : "يحتاج مراجعة"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 border-t-2 border-border font-bold">
                  <tr>
                    <td className="p-3">الإجمالي</td>
                    <td className="p-3 text-blue-600">{fmt(totalRevenue)}</td>
                    <td className="p-3 text-red-600">{fmt(totalCost)}</td>
                    <td className={`p-3 ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {totalProfit >= 0 ? "+" : ""}{fmt(totalProfit)}
                    </td>
                    <td className="p-3 text-muted-foreground">{avgMargin.toFixed(1)}%</td>
                    <td className="p-3 text-muted-foreground">{filtered.reduce((s, i) => s + i.salesCount, 0)}</td>
                    <td className="p-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}