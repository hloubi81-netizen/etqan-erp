import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Package,
  Receipt,
  FileText,
  Warehouse,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ArrowUpLeft,
  ArrowDownLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatCard({ icon: Icon, label, value, trend, color }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend > 0 ? (
                  <ArrowUpLeft className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <ArrowDownLeft className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className={`text-xs font-medium ${trend > 0 ? "text-green-600" : "text-red-500"}`}>
                  {Math.abs(trend)}%
                </span>
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

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: 0,
    invoices: 0,
    vouchers: 0,
    warehouses: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [products, invoices, vouchers, warehouses] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.Invoice.list("-created_date", 5),
      base44.entities.Voucher.list(),
      base44.entities.Warehouse.list(),
    ]);
    setStats({
      products: products.length,
      invoices: invoices.length,
      vouchers: vouchers.length,
      warehouses: warehouses.length,
    });
    setRecentInvoices(invoices.slice(0, 5));
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-sm text-muted-foreground mt-1">نظرة عامة على النظام المحاسبي</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="المواد" value={stats.products} color="bg-blue-600" />
        <StatCard icon={Receipt} label="الفواتير" value={stats.invoices} color="bg-green-600" />
        <StatCard icon={FileText} label="السندات" value={stats.vouchers} color="bg-purple-600" />
        <StatCard icon={Warehouse} label="المستودعات" value={stats.warehouses} color="bg-orange-500" />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">وصول سريع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <QuickAction icon={Receipt} label="فاتورة مبيعات" path="/invoices/sales" color="bg-blue-600" />
            <QuickAction icon={Receipt} label="فاتورة مشتريات" path="/invoices/purchases" color="bg-green-600" />
            <QuickAction icon={FileText} label="سند قبض" path="/vouchers/receipt" color="bg-purple-600" />
            <QuickAction icon={FileText} label="سند دفع" path="/vouchers/payment" color="bg-red-500" />
            <QuickAction icon={Package} label="المواد" path="/products" color="bg-orange-500" />
            <QuickAction icon={BarChart3} label="التقارير" path="/reports/product-movement" color="bg-teal-600" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">آخر الفواتير</CardTitle>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد فواتير بعد</p>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      inv.pattern_type === "مبيعات" ? "bg-blue-100 text-blue-700" :
                      inv.pattern_type === "مشتريات" ? "bg-green-100 text-green-700" :
                      "bg-orange-100 text-orange-700"
                    }`}>
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{inv.pattern_type} - {inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{inv.client_name || "بدون عميل"}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{(inv.total || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{inv.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}