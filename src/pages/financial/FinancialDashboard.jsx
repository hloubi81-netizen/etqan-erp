import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import PageHeader from "../../components/shared/PageHeader";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, ReceiptText, Wallet, Search } from "lucide-react";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2"];

export default function FinancialDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date_from: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    date_to: new Date().toISOString().split("T")[0],
  });
  const [stats, setStats] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [inv, v, acc] = await Promise.all([
      base44.entities.Invoice.list(),
      base44.entities.Voucher.list(),
      base44.entities.Account.list(),
    ]);
    setInvoices(inv); setVouchers(v); setAccounts(acc);
    setLoading(false);
    computeStats(inv, v, acc, filters);
  }

  function computeStats(inv, v, acc, f) {
    const filtered = (arr) => arr.filter((x) => {
      if (f.date_from && x.date < f.date_from) return false;
      if (f.date_to && x.date > f.date_to) return false;
      return true;
    });

    const fInv = filtered(inv);
    const fVou = filtered(v);

    const totalSales = fInv.filter((i) => i.pattern_type === "مبيعات").reduce((s, i) => s + (i.total || 0), 0);
    const totalPurchases = fInv.filter((i) => i.pattern_type === "مشتريات").reduce((s, i) => s + (i.total || 0), 0);
    const salesReturns = fInv.filter((i) => i.pattern_type === "مرتجع مبيعات").reduce((s, i) => s + (i.total || 0), 0);
    const purchaseReturns = fInv.filter((i) => i.pattern_type === "مرتجع مشتريات").reduce((s, i) => s + (i.total || 0), 0);
    const netSales = totalSales - salesReturns;
    const netPurchases = totalPurchases - purchaseReturns;
    const grossProfit = netSales - netPurchases;
    const grossProfitMargin = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : 0;

    const receipts = fVou.filter((v) => v.type === "سند قبض").reduce((s, v) => s + (v.amount || 0), 0);
    const payments = fVou.filter((v) => v.type === "سند دفع").reduce((s, v) => s + (v.amount || 0), 0);
    const netCash = receipts - payments;

    // Monthly data
    const monthlyMap = {};
    fInv.forEach((inv) => {
      if (!inv.date) return;
      const month = inv.date.substring(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { month, مبيعات: 0, مشتريات: 0, ربح: 0 };
      if (inv.pattern_type === "مبيعات") monthlyMap[month]["مبيعات"] += inv.total || 0;
      if (inv.pattern_type === "مشتريات") monthlyMap[month]["مشتريات"] += inv.total || 0;
    });
    Object.values(monthlyMap).forEach((m) => { m["ربح"] = m["مبيعات"] - m["مشتريات"]; });
    const monthlyData = Object.values(monthlyMap).sort((a, b) => a.month > b.month ? 1 : -1)
      .map((m) => ({ ...m, month: m.month.replace(/(\d{4})-(\d{2})/, (_, y, mo) => `${mo}/${y}`) }));

    // Invoice type distribution
    const typeMap = {};
    fInv.forEach((inv) => {
      const t = inv.pattern_type || "أخرى";
      typeMap[t] = (typeMap[t] || 0) + (inv.total || 0);
    });
    const pieData = Object.entries(typeMap).map(([name, value]) => ({ name, value: Math.round(value) }));

    // Cash flow monthly
    const cashMap = {};
    fVou.forEach((v) => {
      if (!v.date) return;
      const month = v.date.substring(0, 7);
      if (!cashMap[month]) cashMap[month] = { month, قبض: 0, دفع: 0 };
      if (v.type === "سند قبض") cashMap[month]["قبض"] += v.amount || 0;
      if (v.type === "سند دفع") cashMap[month]["دفع"] += v.amount || 0;
    });
    const cashData = Object.values(cashMap).sort((a, b) => a.month > b.month ? 1 : -1)
      .map((m) => ({ ...m, month: m.month.replace(/(\d{4})-(\d{2})/, (_, y, mo) => `${mo}/${y}`) }));

    // Top accounts by balance
    const topAccounts = [...acc]
      .filter((a) => !a.is_parent && (a.balance || 0) !== 0)
      .sort((a, b) => Math.abs(b.balance || 0) - Math.abs(a.balance || 0))
      .slice(0, 6)
      .map((a) => ({ name: a.name, رصيد: Math.abs(a.balance || 0) }));

    setStats({
      totalSales, totalPurchases, netSales, netPurchases,
      grossProfit, grossProfitMargin, salesReturns, purchaseReturns,
      receipts, payments, netCash,
      monthlyData, pieData, cashData, topAccounts,
    });
  }

  function handleFilter() {
    computeStats(invoices, vouchers, accounts, filters);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <PageHeader title="لوحة التحليل المالي" subtitle="نظرة شاملة على الأداء المالي والمخططات البيانية" />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div><Label className="text-xs">من تاريخ</Label><Input className="h-9" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></div>
            <div><Label className="text-xs">إلى تاريخ</Label><Input className="h-9" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></div>
            <Button size="sm" onClick={handleFilter}><Search className="h-4 w-4 ml-1" />تحديث</Button>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard icon={DollarSign} label="صافي المبيعات" value={stats.netSales} color="blue" />
            <KpiCard icon={ShoppingCart} label="صافي المشتريات" value={stats.netPurchases} color="orange" />
            <KpiCard icon={TrendingUp} label="مجمل الربح" value={stats.grossProfit} color={stats.grossProfit >= 0 ? "green" : "red"} sub={`هامش ${stats.grossProfitMargin}%`} />
            <KpiCard icon={Wallet} label="صافي التدفق النقدي" value={stats.netCash} color={stats.netCash >= 0 ? "green" : "red"} />
          </div>

          {/* Monthly Sales vs Purchases + Profit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">المبيعات والمشتريات الشهرية</CardTitle></CardHeader>
              <CardContent>
                {stats.monthlyData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات في الفترة المحددة</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="مبيعات" fill="#2563eb" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="مشتريات" fill="#f97316" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">الربح الإجمالي الشهري</CardTitle></CardHeader>
              <CardContent>
                {stats.monthlyData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات في الفترة المحددة</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Area type="monotone" dataKey="ربح" stroke="#16a34a" fill="url(#profitGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pie + Cash Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">توزيع الفواتير حسب النوع</CardTitle></CardHeader>
              <CardContent>
                {stats.pieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">لا توجد فواتير في الفترة المحددة</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={stats.pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {stats.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">التدفقات النقدية الشهرية</CardTitle></CardHeader>
              <CardContent>
                {stats.cashData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">لا توجد سندات في الفترة المحددة</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={stats.cashData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="قبض" stroke="#16a34a" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="دفع" stroke="#dc2626" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Accounts */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">أعلى الحسابات رصيداً</CardTitle></CardHeader>
            <CardContent>
              {stats.topAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">لا توجد حسابات بأرصدة</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.topAccounts} layout="vertical" margin={{ top: 5, right: 40, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={(v) => v.toLocaleString()} />
                    <Bar dataKey="رصيد" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <SummaryCard label="إجمالي المبيعات" value={stats.totalSales} />
            <SummaryCard label="مرتجعات المبيعات" value={stats.salesReturns} negative />
            <SummaryCard label="إجمالي القبض" value={stats.receipts} />
            <SummaryCard label="إجمالي الدفع" value={stats.payments} negative />
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, sub }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-700",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-xl font-bold ${value >= 0 ? "" : "text-red-500"}`}>{value.toLocaleString()}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ label, value, negative }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-base font-bold mt-1 ${negative ? "text-red-500" : "text-foreground"}`}>{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}