import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import {
  BarChart3, Receipt, FileText, TrendingUp, TrendingDown,
  Calendar, RefreshCw, DollarSign, Wallet, GitBranch, ArrowUpRight, ArrowDownRight
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

export default function BusinessPerformance() {
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [branchFilter, setBranchFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const [inv, vch, br] = await Promise.all([
      base44.entities.Invoice.filter({ status: "مرحّلة" }).catch(() => []),
      base44.entities.Voucher.filter({ status: "مرحّلة" }).catch(() => []),
      base44.entities.Branch.list().catch(() => []),
    ]);
    setInvoices(inv);
    setVouchers(vch);
    setBranches(br);
    setLoading(false);
    setRefreshing(false);
  }

  const dateFrom = getDateFrom(selectedPeriod);

  const filteredInvoices = useMemo(() =>
    invoices.filter((inv) => {
      if (inv.date < dateFrom) return false;
      if (branchFilter !== "all" && inv.branch_id !== branchFilter) return false;
      return true;
    }), [invoices, dateFrom, branchFilter]);

  const filteredVouchers = useMemo(() =>
    vouchers.filter((vch) => {
      if (vch.date < dateFrom) return false;
      if (branchFilter !== "all" && vch.branch_id !== branchFilter) return false;
      return true;
    }), [vouchers, dateFrom, branchFilter]);

  // ── KPIs ──
  const salesInvoices = useMemo(() => filteredInvoices.filter(i => i.pattern_type === "مبيعات"), [filteredInvoices]);
  const purchaseInvoices = useMemo(() => filteredInvoices.filter(i => i.pattern_type === "مشتريات"), [filteredInvoices]);
  const salesReturns = useMemo(() => filteredInvoices.filter(i => i.pattern_type === "مرتجعات مبيعات"), [filteredInvoices]);

  const totalSales = salesInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPurchases = purchaseInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalSalesReturns = salesReturns.reduce((s, i) => s + (i.total || 0), 0);
  const netSales = totalSales - totalSalesReturns;

  const paymentVouchers = useMemo(() => filteredVouchers.filter(v => v.type === "سند دفع"), [filteredVouchers]);
  const receiptVouchers = useMemo(() => filteredVouchers.filter(v => v.type === "سند قبض"), [filteredVouchers]);
  const dailyVouchers = useMemo(() => filteredVouchers.filter(v => v.type === "سند يومية"), [filteredVouchers]);

  const totalPayments = paymentVouchers.reduce((s, v) => s + (v.amount || 0), 0);
  const totalReceipts = receiptVouchers.reduce((s, v) => s + (v.amount || 0), 0);
  const totalDailyVouchers = dailyVouchers.reduce((s, v) => s + (v.amount || 0), 0);
  const totalExpenses = paymentVouchers.reduce((s, v) => s + (v.amount || 0), 0);

  // ── الفواتير حسب النوع (Pie) ──
  const invoiceTypePie = useMemo(() => [
    { name: "مبيعات", value: totalSales, count: salesInvoices.length, color: "#16a34a" },
    { name: "مشتريات", value: totalPurchases, count: purchaseInvoices.length, color: "#dc2626" },
    { name: "مرتجعات مبيعات", value: totalSalesReturns, count: salesReturns.length, color: "#f59e0b" },
  ].filter(d => d.value > 0), [totalSales, totalPurchases, totalSalesReturns]);

  // ── السندات حسب النوع (Pie) ──
  const voucherTypePie = useMemo(() => [
    { name: "سند قبض", value: totalReceipts, count: receiptVouchers.length },
    { name: "سند دفع", value: totalPayments, count: paymentVouchers.length },
    { name: "سند يومية", value: totalDailyVouchers, count: dailyVouchers.length },
  ].filter(d => d.value > 0), [totalReceipts, totalPayments, totalDailyVouchers]);

  // ── الاتجاه الزمني (مبيعات + مصروفات) ──
  const trendData = useMemo(() => {
    const map = {};
    [...salesInvoices, ...paymentVouchers].forEach((record) => {
      const date = record.date;
      if (!date) return;
      const key = selectedPeriod <= 30 ? date : date.substring(0, 7);
      if (!map[key]) map[key] = { date: key, مبيعات: 0, مصروفات: 0 };
      if (record.pattern_type === "مبيعات") {
        map[key].مبيعات += record.total || 0;
      } else if (record.type === "سند دفع") {
        map[key].مصروفات += record.amount || 0;
      }
    });
    return Object.values(map).sort((a, b) => a.date > b.date ? 1 : -1).map(d => ({
      ...d,
      date: selectedPeriod <= 30
        ? d.date.replace(/\d{4}-/, "").replace("-", "/")
        : d.date.replace(/(\d{4})-(\d{2})/, (_, y, m) => `${m}/${y}`),
    }));
  }, [salesInvoices, paymentVouchers, selectedPeriod]);

  // ── ملخص شهري للفواتير ──
  const monthlySummary = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((inv) => {
      const key = inv.date ? inv.date.substring(0, 7) : "غير معروف";
      if (!map[key]) map[key] = { الشهر: key, مبيعات: 0, مشتريات: 0, مرتجعات: 0, عدد_الفواتير: 0 };
      if (inv.pattern_type === "مبيعات") map[key].مبيعات += inv.total || 0;
      else if (inv.pattern_type === "مشتريات") map[key].مشتريات += inv.total || 0;
      else if (inv.pattern_type === "مرتجعات مبيعات") map[key].مرتجعات += inv.total || 0;
      map[key].عدد_الفواتير++;
    });
    return Object.values(map).sort((a, b) => a.الشهر > b.الشهر ? 1 : -1).map(d => ({
      ...d,
      الشهر: d.الشهر.replace(/(\d{4})-(\d{2})/, (_, y, m) => `${m}/${y}`),
    }));
  }, [filteredInvoices]);

  const branchLabel = branchFilter === "all" ? "كل الفروع" : (branches.find(b => b.id === branchFilter)?.name || "فرع");

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
            <BarChart3 className="h-6 w-6 text-primary" />
            ملخص أداء العمل
          </h1>
          <p className="text-sm text-muted-foreground mt-1">نظرة شاملة على الفواتير والمصروفات — {branchLabel}</p>
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
            <div className="flex items-center gap-2">
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
            </div>
            {branches.length > 0 && (
              <div className="flex items-center gap-2 mr-auto">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="كل الفروع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الفروع</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards — الفواتير */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "صافي المبيعات", value: netSales.toLocaleString(), Icon: TrendingUp, color: "bg-green-500", sub: "ريال" },
          { label: "إجمالي المشتريات", value: totalPurchases.toLocaleString(), Icon: TrendingDown, color: "bg-red-500", sub: "ريال" },
          { label: "إجمالي المصروفات", value: totalExpenses.toLocaleString(), Icon: Wallet, color: "bg-orange-500", sub: "ريال" },
          { label: "عدد الفواتير", value: filteredInvoices.length.toLocaleString(), Icon: Receipt, color: "bg-blue-500", sub: "فاتورة" },
          { label: "عدد السندات", value: filteredVouchers.length.toLocaleString(), Icon: FileText, color: "bg-purple-500", sub: "سند" },
        ].map(({ label, value, Icon, color, sub }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
                <div className={`${color} p-2 rounded-xl`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Cards — تفاصيل إضافية */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المبيعات", value: totalSales.toLocaleString(), icon: ArrowUpRight, color: "text-green-600", sub: "ريال" },
          { label: "مرتجعات المبيعات", value: totalSalesReturns.toLocaleString(), icon: ArrowDownRight, color: "text-yellow-600", sub: "ريال" },
          { label: "سندات القبض", value: totalReceipts.toLocaleString(), icon: ArrowUpRight, color: "text-blue-600", sub: "ريال" },
          { label: "سندات اليومية", value: totalDailyVouchers.toLocaleString(), icon: FileText, color: "text-purple-600", sub: "ريال" },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3 bg-card rounded-xl border">
            <Icon className={`h-4 w-4 ${color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-bold">{value} <span className="text-[10px] font-normal text-muted-foreground">{sub}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart — مبيعات ومصروفات */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            اتجاه المبيعات مقابل المصروفات — {PERIODS.find(p => p.days === selectedPeriod)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات في هذه الفترة</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString()} />
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="مبيعات" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="مصروفات" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* الفواتير حسب النوع + السندات حسب النوع */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              توزيع الفواتير حسب النوع
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoiceTypePie.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد فواتير</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={invoiceTypePie} cx="50%" cy="50%" outerRadius={85} innerRadius={40} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {invoiceTypePie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              توزيع السندات حسب النوع
            </CardTitle>
          </CardHeader>
          <CardContent>
            {voucherTypePie.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد سندات</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={voucherTypePie} cx="50%" cy="50%" outerRadius={85} innerRadius={40} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {voucherTypePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ملخص شهري — جدول بياني */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            ملخص شهري للفواتير
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlySummary.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlySummary} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="الشهر" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString()} />
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="مبيعات" fill="#16a34a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="مشتريات" fill="#dc2626" radius={[3, 3, 0, 0]} />
                <Bar dataKey="مرتجعات" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* جداول تفصيلية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* آخر الفواتير */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              آخر الفواتير المسجلة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد فواتير</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">الرقم</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">النوع</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">العميل / المورد</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">التاريخ</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.slice(0, 10).map((inv, i) => (
                      <tr key={inv.id} className="border-t border-border hover:bg-muted/20">
                        <td className="p-2.5 font-medium">{inv.invoice_number}</td>
                        <td className="p-2.5 text-muted-foreground">{inv.pattern_type}</td>
                        <td className="p-2.5 text-muted-foreground max-w-[100px] truncate">{inv.client_name || "—"}</td>
                        <td className="p-2.5 text-muted-foreground">{inv.date}</td>
                        <td className="p-2.5 font-semibold">{inv.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* آخر السندات */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              آخر السندات المسجلة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredVouchers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد سندات</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">الرقم</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">النوع</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">الحساب</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">التاريخ</th>
                      <th className="p-2.5 text-right text-muted-foreground font-medium">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVouchers.slice(0, 10).map((v) => (
                      <tr key={v.id} className="border-t border-border hover:bg-muted/20">
                        <td className="p-2.5 font-medium">{v.voucher_number}</td>
                        <td className="p-2.5 text-muted-foreground">{v.type}</td>
                        <td className="p-2.5 text-muted-foreground max-w-[100px] truncate">{v.account_name || "—"}</td>
                        <td className="p-2.5 text-muted-foreground">{v.date}</td>
                        <td className="p-2.5 font-semibold">{v.amount?.toLocaleString()}</td>
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