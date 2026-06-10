import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  Wrench, Package, TrendingUp, RefreshCw, Landmark,
  AlertTriangle, CheckCircle, Clock, DollarSign, Activity
} from "lucide-react";

const COLORS_SERVICES = "#7c3aed";
const COLORS_PRODUCTS = "#2563eb";
const ASSET_STATUS_COLORS = {
  "نشط": { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", bar: "#16a34a" },
  "مستهلك بالكامل": { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", bar: "#9ca3af" },
  "مباع": { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500", bar: "#2563eb" },
  "مسقط": { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", bar: "#dc2626" },
  "تحت الصيانة": { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", bar: "#f97316" },
};
const PIE_COLORS = ["#7c3aed", "#2563eb", "#16a34a", "#f97316", "#dc2626", "#0891b2"];

export default function ServicesDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const [invoices, products, assets] = await Promise.all([
      base44.entities.Invoice.list("-date", 500).catch(() => []),
      base44.entities.Product.list().catch(() => []),
      base44.entities.FixedAsset.list().catch(() => []),
    ]);

    const serviceProductIds = new Set(products.filter(p => p.is_service).map(p => p.id));

    // Filter invoices by date range
    const filtered = invoices.filter(inv => {
      if (!inv.date) return false;
      if (dateFrom && inv.date < dateFrom) return false;
      if (dateTo && inv.date > dateTo) return false;
      return inv.pattern_type === "مبيعات" || inv.pattern_type === "مشتريات";
    });

    // Split each invoice's items into services vs products
    let servicesSalesTotal = 0, productsSalesTotal = 0;
    let servicesPurchasesTotal = 0, productsPurchasesTotal = 0;
    const monthlyMap = {};

    filtered.forEach(inv => {
      const month = inv.date.substring(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { month, "مبيعات خدمات": 0, "مبيعات منتجات": 0, "مشتريات خدمات": 0, "مشتريات منتجات": 0 };

      const items = inv.items || [];
      const isSales = inv.pattern_type === "مبيعات";

      if (items.length === 0) {
        // No item detail — attribute full total by invoice
        if (isSales) productsSalesTotal += inv.total || 0;
        else productsPurchasesTotal += inv.total || 0;
        if (isSales) monthlyMap[month]["مبيعات منتجات"] += inv.total || 0;
        else monthlyMap[month]["مشتريات منتجات"] += inv.total || 0;
        return;
      }

      items.forEach(item => {
        const isService = serviceProductIds.has(item.product_id);
        const amount = item.total || 0;
        if (isSales) {
          if (isService) { servicesSalesTotal += amount; monthlyMap[month]["مبيعات خدمات"] += amount; }
          else { productsSalesTotal += amount; monthlyMap[month]["مبيعات منتجات"] += amount; }
        } else {
          if (isService) { servicesPurchasesTotal += amount; monthlyMap[month]["مشتريات خدمات"] += amount; }
          else { productsPurchasesTotal += amount; monthlyMap[month]["مشتريات منتجات"] += amount; }
        }
      });
    });

    const monthlyData = Object.values(monthlyMap)
      .sort((a, b) => a.month > b.month ? 1 : -1)
      .map(m => ({ ...m, month: m.month.replace(/(\d{4})-(\d{2})/, (_, y, mo) => `${mo}/${y}`) }));

    // Services vs Products pie for sales
    const salesPieData = [
      { name: "مبيعات الخدمات", value: Math.round(servicesSalesTotal) },
      { name: "مبيعات المنتجات", value: Math.round(productsSalesTotal) },
    ].filter(d => d.value > 0);

    // Asset status breakdown
    const assetStatusMap = {};
    let totalAssetValue = 0;
    let totalDepreciation = 0;
    assets.forEach(a => {
      const s = a.status || "نشط";
      if (!assetStatusMap[s]) assetStatusMap[s] = { count: 0, value: 0, bookValue: 0 };
      assetStatusMap[s].count++;
      assetStatusMap[s].value += a.purchase_cost || 0;
      assetStatusMap[s].bookValue += a.net_book_value || 0;
      totalAssetValue += a.purchase_cost || 0;
      totalDepreciation += a.accumulated_depreciation || 0;
    });

    const assetStatusData = Object.entries(assetStatusMap).map(([status, d]) => ({
      status, ...d,
      color: ASSET_STATUS_COLORS[status]?.bar || "#6b7280"
    }));

    // Top services by revenue
    const serviceRevenueMap = {};
    filtered.filter(inv => inv.pattern_type === "مبيعات").forEach(inv => {
      (inv.items || []).forEach(item => {
        if (!serviceProductIds.has(item.product_id)) return;
        if (!serviceRevenueMap[item.product_name]) serviceRevenueMap[item.product_name] = 0;
        serviceRevenueMap[item.product_name] += item.total || 0;
      });
    });
    const topServices = Object.entries(serviceRevenueMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value).slice(0, 6);

    const totalSales = servicesSalesTotal + productsSalesTotal;
    const serviceSalesPct = totalSales > 0 ? ((servicesSalesTotal / totalSales) * 100).toFixed(1) : 0;

    setData({
      servicesSalesTotal, productsSalesTotal, servicesPurchasesTotal, productsPurchasesTotal,
      monthlyData, salesPieData, assetStatusData, topServices, serviceSalesPct,
      totalAssets: assets.length, totalAssetValue, totalDepreciation,
      activeAssets: assets.filter(a => a.status === "نشط").length,
    });

    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { loadData(); }, []);

  // Real-time: subscribe to invoices & assets changes
  useEffect(() => {
    const unsub1 = base44.entities.Invoice.subscribe(() => loadData(true));
    const unsub2 = base44.entities.FixedAsset.subscribe(() => loadData(true));
    return () => { unsub1(); unsub2(); };
  }, [loadData]);

  const fmt = (n) => (n || 0).toLocaleString("ar-EG", { maximumFractionDigits: 0 });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            لوحة الخدمات والأصول
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            مبيعات الخدمات مقابل المنتجات • حالة الأصول الثابتة بشكل لحظي
            {lastUpdated && <span className="mr-2 text-green-600">● آخر تحديث {lastUpdated.toLocaleTimeString("ar-EG")}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
          <span className="text-xs text-muted-foreground">—</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-36 text-xs" />
          <Button size="sm" onClick={() => loadData()} className="h-8 gap-1.5">تطبيق</Button>
          <Button size="sm" variant="outline" onClick={() => loadData(true)} disabled={refreshing} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {data && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={Wrench} label="مبيعات الخدمات" value={fmt(data.servicesSalesTotal)} sub={`${data.serviceSalesPct}% من إجمالي المبيعات`} color="purple" />
            <KpiCard icon={Package} label="مبيعات المنتجات" value={fmt(data.productsSalesTotal)} color="blue" />
            <KpiCard icon={Landmark} label="إجمالي قيمة الأصول" value={fmt(data.totalAssetValue)} sub={`${data.totalAssets} أصل`} color="green" />
            <KpiCard icon={TrendingUp} label="الإهلاك المتراكم" value={fmt(data.totalDepreciation)} sub={`${data.activeAssets} أصل نشط`} color="orange" />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Monthly Sales: Services vs Products */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  المبيعات الشهرية: خدمات مقابل منتجات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.monthlyData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="مبيعات خدمات" fill={COLORS_SERVICES} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="مبيعات منتجات" fill={COLORS_PRODUCTS} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Sales Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">توزيع المبيعات</CardTitle>
              </CardHeader>
              <CardContent>
                {data.salesPieData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={data.salesPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                          {data.salesPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => v.toLocaleString()} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-1">
                      {data.salesPieData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-semibold">{d.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top services by revenue */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-purple-600" />
                  أعلى الخدمات مبيعاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topServices.length === 0 ? (
                  <EmptyChart text="لا توجد مبيعات خدمات في الفترة المحددة" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.topServices} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 9 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Bar dataKey="value" fill={COLORS_SERVICES} radius={[0, 4, 4, 0]} name="الإيراد" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Monthly Purchases: Services vs Products */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  المشتريات الشهرية: خدمات مقابل منتجات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.monthlyData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="svcGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS_SERVICES} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={COLORS_SERVICES} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS_PRODUCTS} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={COLORS_PRODUCTS} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="مشتريات خدمات" stroke={COLORS_SERVICES} fill="url(#svcGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="مشتريات منتجات" stroke={COLORS_PRODUCTS} fill="url(#prodGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Asset Status Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Landmark className="h-4 w-4 text-green-600" />
                حالة الأصول الثابتة — لحظي
                <span className="flex items-center gap-1 text-xs text-green-600 font-normal mr-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  مباشر
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.assetStatusData.length === 0 ? (
                <EmptyChart text="لا توجد أصول ثابتة مسجلة" />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Status cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {data.assetStatusData.map((s) => {
                      const style = ASSET_STATUS_COLORS[s.status] || { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
                      const StatusIcon = s.status === "نشط" ? CheckCircle : s.status === "تحت الصيانة" ? Clock : AlertTriangle;
                      return (
                        <div key={s.status} className={`rounded-xl p-3 ${style.bg} border border-transparent`}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <StatusIcon className={`h-3.5 w-3.5 ${style.text}`} />
                            <span className={`text-xs font-medium ${style.text}`}>{s.status}</span>
                          </div>
                          <p className={`text-xl font-bold ${style.text}`}>{s.count}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.value.toLocaleString()} ق.ش</p>
                          {s.bookValue > 0 && (
                            <p className="text-xs text-muted-foreground">صافي: {s.bookValue.toLocaleString()}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bar chart by status */}
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.assetStatusData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="status" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v, name) => [v.toLocaleString(), name === "value" ? "تكلفة الشراء" : "الرصيد الدفتري"]} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="value" name="تكلفة الشراء" radius={[3, 3, 0, 0]}>
                        {data.assetStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary comparison */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryTile label="إجمالي مبيعات الخدمات" value={fmt(data.servicesSalesTotal)} accent="purple" />
            <SummaryTile label="إجمالي مبيعات المنتجات" value={fmt(data.productsSalesTotal)} accent="blue" />
            <SummaryTile label="مشتريات الخدمات" value={fmt(data.servicesPurchasesTotal)} accent="purple" />
            <SummaryTile label="مشتريات المنتجات" value={fmt(data.productsPurchasesTotal)} accent="blue" />
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    purple: "bg-purple-50 text-purple-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-lg font-bold truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg shrink-0 ${colorMap[color] || colorMap.blue}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryTile({ label, value, accent }) {
  const border = accent === "purple" ? "border-purple-200 bg-purple-50" : "border-blue-200 bg-blue-50";
  const text = accent === "purple" ? "text-purple-700" : "text-blue-700";
  return (
    <div className={`rounded-xl border p-3 text-center ${border}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-bold mt-1 ${text}`}>{value}</p>
    </div>
  );
}

function EmptyChart({ text = "لا توجد بيانات في الفترة المحددة" }) {
  return (
    <div className="flex items-center justify-center h-36 text-sm text-muted-foreground">{text}</div>
  );
}