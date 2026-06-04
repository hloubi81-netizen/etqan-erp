import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useLang } from "@/hooks/useLang.jsx";
import { tr } from "@/lib/translations";
import {
  Package, Receipt, FileText, Warehouse, DollarSign,
  BarChart3, ArrowUpLeft, ArrowDownLeft, TrendingUp, Users,
  ShoppingCart, Landmark, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import { SkeletonCard } from "@/components/shared/SkeletonLoader";
import CurrencySelector from "@/components/dashboard/CurrencySelector";

function StatCard({ icon: Icon, label, value, sub, color, loading }) {
  if (loading) return <SkeletonCard />;
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ icon: Icon, label, path, color }) {
  return (
    <Link
      to={path}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="text-xs font-medium text-center">{label}</span>
    </Link>
  );
}

const TYPE_COLORS = {
  "مبيعات":   { bg: "bg-blue-100",   text: "text-blue-700" },
  "مشتريات":  { bg: "bg-green-100",  text: "text-green-700" },
  "مرتجع مبيعات": { bg: "bg-orange-100", text: "text-orange-700" },
  "مرتجع مشتريات": { bg: "bg-red-100", text: "text-red-700" },
  "رصيد أول المدة": { bg: "bg-gray-100", text: "text-gray-700" },
};

export default function Dashboard() {
  const { lang, fNum, fCur } = useLang();
  const l = (key) => tr(key, lang);

  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [branchSales, setBranchSales] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const [products, allInvoices, vouchers, warehouses, employees, users, branches] = await Promise.all([
      base44.entities.Product.list().catch(() => []),
      base44.entities.Invoice.list("-date", 200).catch(() => []),
      base44.entities.Voucher.list("-date", 100).catch(() => []),
      base44.entities.Warehouse.list().catch(() => []),
      base44.entities.Employee.list().catch(() => []),
      base44.entities.User.list().catch(() => []),
      base44.entities.Branch.list().catch(() => []),
    ]);

    const salesInvoices = allInvoices.filter(i => i.pattern_type === "مبيعات");
    const purchaseInvoices = allInvoices.filter(i => i.pattern_type === "مشتريات");
    const totalSales = salesInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalPurchases = purchaseInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalVouchersAmount = vouchers.reduce((s, v) => s + (v.amount || 0), 0);

    // فواتير مبيعات لكل فرع
    const branchMap = {};
    salesInvoices.forEach(inv => {
      const name = inv.branch_name || "غير محدد";
      if (!branchMap[name]) branchMap[name] = { name, total: 0, count: 0 };
      branchMap[name].total += inv.total || 0;
      branchMap[name].count++;
    });
    const branchData = Object.values(branchMap).sort((a, b) => b.total - a.total);
    const maxTotal = branchData[0]?.total || 1;
    setBranchSales(branchData.map(b => ({ ...b, pct: Math.round((b.total / maxTotal) * 100) })));

    // المستخدمون النشطون
    const active = users.filter(u => !u.disabled);
    setActiveUsers(active);

    setStats({
      products: products.length,
      invoices: allInvoices.length,
      warehouses: warehouses.length,
      employees: employees.length,
      totalSales,
      totalPurchases,
      totalVouchersAmount,
      activeUsers: active.length,
      totalUsers: users.length,
    });
    setRecentInvoices(allInvoices.slice(0, 6));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const fmt = (n) => fNum(n || 0, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">ETQAN ERP</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={refreshing} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      <CurrencySelector />
      <AlertsPanel lang={lang} />

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={loading} icon={TrendingUp}   label={lang==='ar'?"إجمالي المبيعات":"Total Sales"}    value={fmt(stats?.totalSales)}     sub={`${fNum(stats?.invoices||0)} ${lang==='ar'?'فاتورة':'invoices'}`}    color="bg-blue-600" />
        <StatCard loading={loading} icon={ArrowDownLeft} label={lang==='ar'?"إجمالي المشتريات":"Total Purchases"}  value={fmt(stats?.totalPurchases)} sub={lang==='ar'?"الكميات المستلمة":"Received quantities"}  color="bg-green-600" />
        <StatCard loading={loading} icon={DollarSign}   label={lang==='ar'?"إجمالي السندات":"Total Vouchers"}     value={fmt(stats?.totalVouchersAmount)} sub={lang==='ar'?"قبض ودفع":"Receipts & Payments"} color="bg-purple-600" />
        <StatCard loading={loading} icon={Package}      label={lang==='ar'?"المنتجات":"Products"}           value={fNum(stats?.products||0)}       sub={`${fNum(stats?.warehouses||0)} ${lang==='ar'?'مستودع':'warehouse'}`}    color="bg-orange-500" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: lang==='ar'?"الفواتير الكلية":"Total Invoices",   val: fNum(stats?.invoices||0),   icon: Receipt,    color: "text-blue-600",   bg: "bg-blue-50" },
          { label: lang==='ar'?"المستودعات":"Warehouses",         val: fNum(stats?.warehouses||0), icon: Warehouse,  color: "text-green-600",  bg: "bg-green-50" },
          { label: lang==='ar'?"الموظفون":"Employees",           val: fNum(stats?.employees||0),  icon: Users,      color: "text-purple-600", bg: "bg-purple-50" },
          { label: lang==='ar'?"الأصناف":"Products",            val: fNum(stats?.products||0),   icon: Package,    color: "text-orange-600", bg: "bg-orange-50" },
        ].map((s, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${s.bg} border border-transparent`}>
            <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{loading ? "..." : s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{l('quickAccess')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            <QuickAction icon={Receipt}      label={l('salesInvoice')}     path="/invoices/sales"     color="bg-blue-600" />
            <QuickAction icon={Receipt}      label={l('purchasesInvoice')} path="/invoices/purchases" color="bg-green-600" />
            <QuickAction icon={FileText}     label={l('receiptVoucher')}   path="/vouchers/receipt"   color="bg-purple-600" />
            <QuickAction icon={FileText}     label={l('paymentVoucher')}   path="/vouchers/payment"   color="bg-red-500" />
            <QuickAction icon={ShoppingCart} label="نقطة البيع"           path="/pos"                color="bg-teal-600" />
            <QuickAction icon={Package}      label={l('productsLabel')}    path="/products"           color="bg-orange-500" />
            <QuickAction icon={BarChart3}    label={l('reports')}          path="/reports/advanced"   color="bg-slate-600" />
          </div>
        </CardContent>
      </Card>

      {/* Users & Branch Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              المستخدمون النشطون
              {!loading && (
                <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                  {stats?.activeUsers || 0} نشط
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-10 rounded-lg bg-muted animate-pulse"/>)}</div>
            ) : activeUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا يوجد مستخدمون</p>
            ) : (
              <div className="space-y-2">
                {activeUsers.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {(u.full_name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs border-0 ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {u.role === "admin" ? "مسؤول" : "مستخدم"}
                    </Badge>
                  </div>
                ))}
                {activeUsers.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">+{activeUsers.length - 5} مستخدم آخر</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branch Sales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              إجمالي الفواتير الصادرة لكل فرع
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-10 rounded-lg bg-muted animate-pulse"/>)}</div>
            ) : branchSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد بيانات مبيعات بعد</p>
            ) : (
              <div className="space-y-3">
                {branchSales.map((b, i) => {
                  const colors = ["bg-blue-500","bg-green-500","bg-purple-500","bg-orange-500","bg-teal-500"];
                  const c = colors[i % colors.length];
                  return (
                    <div key={b.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{b.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{b.count} فاتورة</span>
                          <span className="text-sm font-bold">{fmt(b.total)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className={`h-2 rounded-full ${c} transition-all duration-700`} style={{ width: `${b.pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">{l('recentInvoices')}</CardTitle>
          <Link to="/invoices/sales" className="text-xs text-primary hover:underline">عرض الكل</Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{l('noInvoices')}</p>
          ) : (
            <div className="space-y-1.5">
              {recentInvoices.map((inv) => {
                const tc = TYPE_COLORS[inv.pattern_type] || { bg: "bg-gray-100", text: "text-gray-700" };
                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tc.bg}`}>
                        <Receipt className={`h-4 w-4 ${tc.text}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{inv.invoice_number}</p>
                          <Badge className={`text-[10px] px-1.5 py-0 ${tc.bg} ${tc.text} border-0`}>{inv.pattern_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{inv.client_name || "—"}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{fmt(inv.total)}</p>
                      <p className="text-xs text-muted-foreground">{inv.date ? new Date(inv.date).toLocaleDateString(lang==='ar'?'ar-SA':'en-US') : '—'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}