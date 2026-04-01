import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, BarChart3, PieChartIcon, Activity } from "lucide-react";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d"];

function StatCard({ title, value, change, icon: Icon, color }) {
  const positive = change >= 0;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${positive ? "text-green-600" : "text-red-500"}`}>
                {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold mb-1 text-foreground">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdvancedReports() {
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [groupBy, setGroupBy] = useState("month");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    Promise.all([
      base44.entities.Invoice.list("-date", 500),
      base44.entities.Voucher.list("-date", 500),
      base44.entities.Branch.list(),
      base44.entities.Product.list(),
    ]).then(([inv, vou, br, pr]) => {
      setInvoices(inv); setVouchers(vou); setBranches(br); setProducts(pr);
      setLoading(false);
    });
  }, []);

  const filteredInvoices = useMemo(() =>
    invoices.filter((inv) => inv.date >= dateFrom && inv.date <= dateTo && inv.status === "مرحّلة"),
    [invoices, dateFrom, dateTo]);

  const filteredVouchers = useMemo(() =>
    vouchers.filter((v) => v.date >= dateFrom && v.date <= dateTo && v.status === "مرحّل"),
    [vouchers, dateFrom, dateTo]);

  function getGroupKey(dateStr) {
    if (!dateStr) return "غير محدد";
    if (groupBy === "month") return dateStr.slice(0, 7);
    if (groupBy === "quarter") {
      const m = parseInt(dateStr.slice(5, 7));
      const q = Math.ceil(m / 3);
      return `${dateStr.slice(0, 4)}-Q${q}`;
    }
    return dateStr.slice(0, 4);
  }

  // Sales & Purchase trends
  const trendData = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((inv) => {
      const key = getGroupKey(inv.date);
      if (!map[key]) map[key] = { period: key, مبيعات: 0, مشتريات: 0, أرباح: 0 };
      if (inv.pattern_type === "مبيعات" || inv.pattern_type === "مرتجع مشتريات") {
        map[key].مبيعات += inv.total || 0;
      } else if (inv.pattern_type === "مشتريات" || inv.pattern_type === "مرتجع مبيعات") {
        map[key].مشتريات += inv.total || 0;
      }
    });
    Object.values(map).forEach((v) => { v.أرباح = v.مبيعات - v.مشتريات; });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period));
  }, [filteredInvoices, groupBy]);

  // Cash flow from vouchers
  const cashFlowData = useMemo(() => {
    const map = {};
    filteredVouchers.forEach((v) => {
      const key = getGroupKey(v.date);
      if (!map[key]) map[key] = { period: key, مقبوضات: 0, مدفوعات: 0, صافي: 0 };
      if (v.type === "سند قبض") map[key].مقبوضات += v.amount || 0;
      else if (v.type === "سند دفع") map[key].مدفوعات += v.amount || 0;
    });
    Object.values(map).forEach((v) => { v.صافي = v.مقبوضات - v.مدفوعات; });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period));
  }, [filteredVouchers, groupBy]);

  // Sales by invoice type (pie)
  const salesByType = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((inv) => {
      const t = inv.pattern_type || "أخرى";
      map[t] = (map[t] || 0) + (inv.total || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredInvoices]);

  // Top products
  const topProducts = useMemo(() => {
    const map = {};
    filteredInvoices.filter((inv) => inv.pattern_type === "مبيعات").forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const k = item.product_name || "غير محدد";
        if (!map[k]) map[k] = { name: k, مبيعات: 0, كمية: 0 };
        map[k].مبيعات += item.total || 0;
        map[k].كمية += item.quantity || 0;
      });
    });
    return Object.values(map).sort((a, b) => b.مبيعات - a.مبيعات).slice(0, 8);
  }, [filteredInvoices]);

  // KPIs
  const totalSales = filteredInvoices.filter((i) => i.pattern_type === "مبيعات").reduce((s, i) => s + (i.total || 0), 0);
  const totalPurchases = filteredInvoices.filter((i) => i.pattern_type === "مشتريات").reduce((s, i) => s + (i.total || 0), 0);
  const totalReceipts = filteredVouchers.filter((v) => v.type === "سند قبض").reduce((s, v) => s + (v.amount || 0), 0);
  const totalPayments = filteredVouchers.filter((v) => v.type === "سند دفع").reduce((s, v) => s + (v.amount || 0), 0);
  const grossProfit = totalSales - totalPurchases;
  const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  const TABS = [
    { key: "overview", label: "نظرة عامة", icon: BarChart3 },
    { key: "profit", label: "الأرباح والخسائر", icon: TrendingUp },
    { key: "cashflow", label: "التدفق النقدي", icon: Activity },
    { key: "products", label: "أداء المنتجات", icon: ShoppingCart },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">لوحة التقارير المتقدمة</h1>
        <p className="text-sm text-muted-foreground mt-1">تحليل شامل للأداء المالي والتشغيلي</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">من:</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-36 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">إلى:</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-36 text-sm" />
            </div>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">شهري</SelectItem>
                <SelectItem value="quarter">ربع سنوي</SelectItem>
                <SelectItem value="year">سنوي</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs">{filteredInvoices.length} فاتورة محللة</Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المبيعات" value={totalSales} icon={TrendingUp} color="bg-blue-600" />
        <StatCard title="إجمالي المشتريات" value={totalPurchases} icon={ShoppingCart} color="bg-orange-500" />
        <StatCard title="صافي الربح" value={grossProfit} icon={DollarSign} color={grossProfit >= 0 ? "bg-green-600" : "bg-red-500"} />
        <StatCard title="هامش الربح" value={`${profitMargin.toFixed(1)}%`} icon={PieChartIcon} color="bg-purple-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === t.key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">المبيعات والمشتريات</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="مبيعات" fill="#2563eb" radius={[4,4,0,0]} />
                  <Bar dataKey="مشتريات" fill="#f97316" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع الفواتير</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={salesByType} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {salesByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profit & Loss Tab */}
      {activeTab === "profit" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">منحنى الأرباح والخسائر</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="مبيعات" stroke="#2563eb" fill="url(#salesGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="أرباح" stroke="#16a34a" fill="url(#profitGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* P&L Table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">جدول الأرباح والخسائر التفصيلي</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["الفترة","المبيعات","المشتريات","صافي الربح","هامش %"].map((h) => <th key={h} className="p-2 text-right text-xs text-muted-foreground font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {trendData.map((row) => {
                    const margin = row.مبيعات > 0 ? ((row.أرباح / row.مبيعات) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={row.period} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-2 font-medium">{row.period}</td>
                        <td className="p-2 text-blue-600">{row.مبيعات.toLocaleString()}</td>
                        <td className="p-2 text-orange-500">{row.مشتريات.toLocaleString()}</td>
                        <td className={`p-2 font-bold ${row.أرباح >= 0 ? "text-green-600" : "text-red-500"}`}>{row.أرباح.toLocaleString()}</td>
                        <td className="p-2"><Badge variant={parseFloat(margin) >= 0 ? "default" : "destructive"} className="text-xs">{margin}%</Badge></td>
                      </tr>
                    );
                  })}
                  {trendData.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground py-8">لا توجد بيانات في الفترة المحددة</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cash Flow Tab */}
      {activeTab === "cashflow" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">إجمالي المقبوضات</p>
              <p className="text-xl font-bold text-green-600 mt-1">{totalReceipts.toLocaleString()}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">إجمالي المدفوعات</p>
              <p className="text-xl font-bold text-red-500 mt-1">{totalPayments.toLocaleString()}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">صافي التدفق النقدي</p>
              <p className={`text-xl font-bold mt-1 ${(totalReceipts - totalPayments) >= 0 ? "text-primary" : "text-red-500"}`}>{(totalReceipts - totalPayments).toLocaleString()}</p>
            </CardContent></Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">حركة التدفق النقدي</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="مقبوضات" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="مدفوعات" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="صافي" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">أعلى المنتجات مبيعاً</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="مبيعات" fill="#2563eb" radius={[0,4,4,0]}>
                    {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">تفاصيل أداء المنتجات</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["المنتج","إجمالي المبيعات","الكمية المباعة","متوسط سعر البيع"].map((h) => <th key={h} className="p-2 text-right text-xs text-muted-foreground font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-2 font-medium flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        {p.name}
                      </td>
                      <td className="p-2 text-primary font-semibold">{p.مبيعات.toLocaleString()}</td>
                      <td className="p-2">{p.كمية.toLocaleString()}</td>
                      <td className="p-2 text-muted-foreground">{p.كمية > 0 ? (p.مبيعات / p.كمية).toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                  {topProducts.length === 0 && <tr><td colSpan={4} className="text-center text-muted-foreground py-8">لا توجد بيانات مبيعات في هذه الفترة</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}