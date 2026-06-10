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
  Wrench, TrendingUp, TrendingDown, DollarSign, BarChart3,
  Calendar, RefreshCw, Target, ArrowUpDown, FileText
} from "lucide-react";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#f97316", "#84cc16"];

const PERIODS = [
  { label: "هذا الشهر", days: 30 },
  { label: "3 أشهر", days: 90 },
  { label: "6 أشهر", days: 180 },
  { label: "هذه السنة", days: 365 },
  { label: "كل الوقت", days: 9999 },
];

function getDateFrom(days) {
  if (days === 9999) return "2000-01-01";
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function fmt(n) {
  return (n || 0).toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function ServicesReport() {
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

  const serviceIds = useMemo(() => new Set(products.map(p => p.id)), [products]);
  const serviceMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const dateFrom = getDateFrom(selectedPeriod);

  // فلتر الفواتير المرحّلة في الفترة المحددة
  const filteredInvoices = useMemo(() =>
    invoices.filter(inv => inv.date >= dateFrom),
    [invoices, dateFrom]
  );

  // استخراج بنود الخدمات من الفواتير
  const serviceLines = useMemo(() => {
    const lines = [];
    filteredInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        if (!serviceIds.has(item.product_id)) return;
        const prod = serviceMap[item.product_id];
        const isSale = inv.pattern_type?.includes("مبيعات") && !inv.pattern_type?.includes("مرتجع");
        const isPurchase = inv.pattern_type?.includes("مشتريات") && !inv.pattern_type?.includes("مرتجع");
        const isSaleReturn = inv.pattern_type?.includes("مرتجع مبيعات");
        const isPurchaseReturn = inv.pattern_type?.includes("مرتجع مشتريات");

        lines.push({
          date: inv.date,
          invoice_number: inv.invoice_number,
          client_name: inv.client_name,
          pattern_type: inv.pattern_type,
          product_id: item.product_id,
          product_name: item.product_name || prod?.name,
          quantity: item.quantity || 0,
          price: item.price || 0,
          total: item.total || 0,
          revenue: (isSale ? item.total : isSaleReturn ? -(item.total) : 0) || 0,
          cost: (isPurchase ? item.total : isPurchaseReturn ? -(item.total) : 0) || 0,
        });
      });
    });
    return lines;
  }, [filteredInvoices, serviceIds, serviceMap]);

  // قائمة الخدمات للفلتر
  const serviceNames = useMemo(() => {
    const names = [...new Set(serviceLines.map(l => l.product_name).filter(Boolean))];
    return ["الكل", ...names.sort()];
  }, [serviceLines]);

  // البنود بعد فلتر الخدمة
  const filtered = useMemo(() =>
    selectedService === "الكل"
      ? serviceLines
      : serviceLines.filter(l => l.product_name === selectedService),
    [serviceLines, selectedService]
  );

  // KPIs
  const totalRevenue = filtered.reduce((s, l) => s + l.revenue, 0);
  const totalCost = filtered.reduce((s, l) => s + l.cost, 0);
  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // مقارنة إيرادات وتكاليف كل خدمة
  const serviceComparison = useMemo(() => {
    const map = {};
    filtered.forEach(l => {
      if (!l.product_name) return;
      if (!map[l.product_name]) map[l.product_name] = { name: l.product_name, إيرادات: 0, تكاليف: 0, صافي: 0 };
      map[l.product_name].إيرادات += l.revenue;
      map[l.product_name].تكاليف += l.cost;
      map[l.product_name].صافي += (l.revenue - l.cost);
    });
    return Object.values(map).sort((a, b) => b.إيرادات - a.إيرادات);
  }, [filtered]);

  // اتجاه الإيرادات عبر الزمن
  const trendData = useMemo(() => {
    const map = {};
    filtered.forEach(l => {
      if (!l.date) return;
      const key = selectedPeriod <= 30 ? l.date : l.date.substring(0, 7);
      if (!map[key]) map[key] = { date: key, إيرادات: 0, تكاليف: 0 };
      map[key].إيرادات += l.revenue;
      map[key].تكاليف += l.cost;
    });
    return Object.values(map)
      .sort((a, b) => a.date > b.date ? 1 : -1)
      .map(d => ({
        ...d,
        date: selectedPeriod <= 30
          ? d.date.replace(/\d{4}-/, "").replace("-", "/")
          : d.date.replace(/(\d{4})-(\d{2})/, (_, y, m) => `${m}/${y}`),
      }));
  }, [filtered, selectedPeriod]);

  // توزيع الإيرادات حسب الخدمة (Pie)
  const revenuePie = useMemo(() =>
    serviceComparison.filter(s => s.إيرادات > 0).map(s => ({ name: s.name, value: Math.round(s.إيرادات) })),
    [serviceComparison]
  );

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
            تقرير تحليل الخدمات
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
        <CardContent className="p-3 space-y-3">
          {/* Period */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">الفترة:</span>
            {PERIODS.map(p => (
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
          {/* Service Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">الخدمة:</span>
            <div className="flex gap-1.5 flex-wrap">
              {serviceNames.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedService(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    selectedService === s
                      ? "bg-purple-600 text-white border-purple-600"
                      : "border-border text-muted-foreground hover:border-purple-400 hover:text-purple-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الإيرادات", value: fmt(totalRevenue), Icon: TrendingUp, color: "bg-blue-500", sub: "من فواتير المبيعات" },
          { label: "إجمالي التكاليف", value: fmt(totalCost), Icon: TrendingDown, color: "bg-red-500", sub: "من فواتير المشتريات" },
          { label: "صافي الربح", value: fmt(netProfit), Icon: DollarSign, color: netProfit >= 0 ? "bg-green-500" : "bg-orange-500", sub: netProfit >= 0 ? "ربح" : "خسارة" },
          { label: "هامش الربح", value: `${profitMargin.toFixed(1)}%`, Icon: Target, color: "bg-purple-500", sub: "من الإيرادات" },
        ].map(({ label, value, Icon, color, sub }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
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

      {/* إذا لا توجد بيانات */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد بنود خدمية في هذه الفترة</p>
            <p className="text-sm mt-1">تأكد من إضافة منتجات خدمية وترحيل فواتير تحتوي عليها</p>
          </CardContent>
        </Card>
      )}

      {filtered.length > 0 && (
        <>
          {/* Trend Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                اتجاه الإيرادات والتكاليف عبر الزمن
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString()} />
                  <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="إيرادات" stroke="#2563eb" fill="url(#revGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="تكاليف" stroke="#dc2626" fill="url(#costGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Comparison Chart + Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* مقارنة إيرادات وتكاليف كل خدمة */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-blue-500" />
                  مقارنة الإيرادات والتكاليف لكل خدمة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceComparison.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={serviceComparison} margin={{ top: 5, right: 10, left: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={v => v.toLocaleString()} />
                      <Tooltip formatter={v => v.toLocaleString()} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="إيرادات" fill="#2563eb" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="تكاليف" fill="#dc2626" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="صافي" fill="#16a34a" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* توزيع الإيرادات Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-500" />
                  توزيع الإيرادات حسب الخدمة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenuePie.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">لا توجد إيرادات خدمية</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={revenuePie} cx="50%" cy="50%" outerRadius={100} innerRadius={45}
                        dataKey="value"
                        label={({ name, percent }) => `${name.length > 10 ? name.slice(0, 10) + "…" : name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {revenuePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => v.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* جدول تفصيلي لكل خدمة */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                تفاصيل الأداء لكل خدمة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-right text-muted-foreground font-medium">الخدمة</th>
                      <th className="p-3 text-right text-muted-foreground font-medium">إيرادات البيع</th>
                      <th className="p-3 text-right text-muted-foreground font-medium">تكاليف الشراء</th>
                      <th className="p-3 text-right text-muted-foreground font-medium">صافي الربح</th>
                      <th className="p-3 text-right text-muted-foreground font-medium">هامش الربح</th>
                      <th className="p-3 text-right text-muted-foreground font-medium">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceComparison.map((s) => {
                      const margin = s.إيرادات > 0 ? ((s.صافي / s.إيرادات) * 100).toFixed(1) : null;
                      return (
                        <tr key={s.name} className="border-t border-border hover:bg-muted/20">
                          <td className="p-3 font-medium">{s.name}</td>
                          <td className="p-3 text-blue-600 font-semibold">{fmt(s.إيرادات)}</td>
                          <td className="p-3 text-red-600 font-semibold">{fmt(s.تكاليف)}</td>
                          <td className={`p-3 font-bold ${s.صافي >= 0 ? "text-green-600" : "text-orange-600"}`}>
                            {fmt(s.صافي)}
                          </td>
                          <td className="p-3">
                            {margin !== null ? (
                              <span className={`font-semibold ${parseFloat(margin) >= 30 ? "text-green-600" : parseFloat(margin) >= 0 ? "text-yellow-600" : "text-red-600"}`}>
                                {margin}%
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={
                              s.صافي > 0 ? "text-green-700 border-green-300 bg-green-50" :
                              s.صافي < 0 ? "text-red-700 border-red-300 bg-red-50" :
                              "text-gray-600 border-gray-300"
                            }>
                              {s.صافي > 0 ? "رابحة" : s.صافي < 0 ? "خاسرة" : "متعادلة"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/30 font-semibold border-t-2">
                    <tr>
                      <td className="p-3">الإجمالي</td>
                      <td className="p-3 text-blue-700">{fmt(totalRevenue)}</td>
                      <td className="p-3 text-red-700">{fmt(totalCost)}</td>
                      <td className={`p-3 ${netProfit >= 0 ? "text-green-700" : "text-orange-700"}`}>{fmt(netProfit)}</td>
                      <td className="p-3 text-purple-700">{profitMargin.toFixed(1)}%</td>
                      <td className="p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* سجل الفواتير التفصيلي */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                سجل الفواتير الخدمية ({filtered.length} سطر)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">التاريخ</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">رقم الفاتورة</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">النوع</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">الخدمة</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">العميل/المورد</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">الكمية</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">إيراد</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">تكلفة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice().reverse().map((l, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/20">
                        <td className="p-2.5 text-muted-foreground">{l.date}</td>
                        <td className="p-2.5 font-medium">{l.invoice_number}</td>
                        <td className="p-2.5">
                          <Badge variant="outline" className={`text-[10px] px-1.5 ${
                            l.pattern_type?.includes("مبيعات") ? "text-blue-700 border-blue-300 bg-blue-50" :
                            "text-orange-700 border-orange-300 bg-orange-50"
                          }`}>
                            {l.pattern_type}
                          </Badge>
                        </td>
                        <td className="p-2.5">{l.product_name}</td>
                        <td className="p-2.5 text-muted-foreground">{l.client_name}</td>
                        <td className="p-2.5">{l.quantity}</td>
                        <td className="p-2.5 text-blue-600 font-semibold">{l.revenue > 0 ? fmt(l.revenue) : "—"}</td>
                        <td className="p-2.5 text-red-600 font-semibold">{l.cost > 0 ? fmt(l.cost) : "—"}</td>
                      </tr>
                    ))}
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