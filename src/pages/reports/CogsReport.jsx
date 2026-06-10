import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Package, Percent,
  RefreshCw, Printer, Search, ChevronDown, ChevronUp, ShoppingBag,
  AlertTriangle, CheckCircle2, Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";
import ExportButtons from "@/components/shared/ExportButtons";

const PERIODS = [
  { label: "هذا الشهر", days: 30 },
  { label: "3 أشهر", days: 90 },
  { label: "6 أشهر", days: 180 },
  { label: "هذه السنة", days: 365 },
  { label: "الكل", days: 9999 },
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

function ProfitBadge({ margin }) {
  if (margin >= 30) return <Badge className="bg-green-100 text-green-700 border-0">{margin.toFixed(1)}%</Badge>;
  if (margin >= 15) return <Badge className="bg-yellow-100 text-yellow-700 border-0">{margin.toFixed(1)}%</Badge>;
  if (margin >= 0)  return <Badge className="bg-orange-100 text-orange-700 border-0">{margin.toFixed(1)}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-0">{margin.toFixed(1)}%</Badge>;
}

// ── حساب تكلفة البضاعة المباعة لكل بند ──────────────────────────────────────
function calcItemCOGS(item, productMap) {
  const product = productMap[item.product_id];
  if (!product) return 0;
  // أولوية: آخر سعر شراء → متوسط سعر شراء → سعر التكلفة
  const costPrice =
    product.last_purchase_price ||
    product.avg_purchase_price ||
    product.cost_price ||
    0;
  return costPrice * (item.quantity || 0);
}

export default function CogsReport() {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(30);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy] = useState("date_desc");

  useEffect(() => { loadData(); }, []);

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const [inv, prod] = await Promise.all([
      base44.entities.Invoice.filter({ status: "مرحّلة" }).catch(() => []),
      base44.entities.Product.list().catch(() => []),
    ]);
    setInvoices(inv.filter(i => i.pattern_type === "مبيعات"));
    setProducts(prod);
    setLoading(false);
    setRefreshing(false);
  }

  const productMap = useMemo(() =>
    Object.fromEntries(products.map(p => [p.id, p])),
    [products]
  );

  const dateFrom = getDateFrom(period);

  // ── حساب COGS لكل فاتورة ─────────────────────────────────────────────────
  const enrichedInvoices = useMemo(() => {
    return invoices
      .filter(inv => inv.date >= dateFrom)
      .map(inv => {
        const revenue = inv.total || 0;
        const itemsWithCOGS = (inv.items || []).map(item => {
          const cogs = calcItemCOGS(item, productMap);
          const itemRevenue = item.total || 0;
          const profit = itemRevenue - cogs;
          const margin = itemRevenue > 0 ? (profit / itemRevenue) * 100 : 0;
          return { ...item, cogs, profit, margin };
        });
        const totalCOGS = itemsWithCOGS.reduce((s, i) => s + i.cogs, 0);
        const grossProfit = revenue - totalCOGS;
        const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
        return { ...inv, itemsWithCOGS, totalCOGS, grossProfit, grossMargin };
      });
  }, [invoices, productMap, dateFrom]);

  // ── فلترة وترتيب ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = enrichedInvoices;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.client_name?.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "date_desc":  return [...result].sort((a, b) => b.date.localeCompare(a.date));
      case "date_asc":   return [...result].sort((a, b) => a.date.localeCompare(b.date));
      case "profit_desc": return [...result].sort((a, b) => b.grossProfit - a.grossProfit);
      case "margin_desc": return [...result].sort((a, b) => b.grossMargin - a.grossMargin);
      case "margin_asc":  return [...result].sort((a, b) => a.grossMargin - b.grossMargin);
      case "revenue_desc": return [...result].sort((a, b) => b.total - a.total);
      default: return result;
    }
  }, [enrichedInvoices, search, sortBy]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalRevenue = filtered.reduce((s, i) => s + (i.total || 0), 0);
    const totalCOGS    = filtered.reduce((s, i) => s + i.totalCOGS, 0);
    const totalProfit  = filtered.reduce((s, i) => s + i.grossProfit, 0);
    const avgMargin    = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const noCogsCount  = filtered.filter(i => i.totalCOGS === 0).length;
    return { totalRevenue, totalCOGS, totalProfit, avgMargin, count: filtered.length, noCogsCount };
  }, [filtered]);

  // ── رسم بياني COGS vs Revenue ─────────────────────────────────────────────
  const chartData = useMemo(() => {
    const map = {};
    filtered.forEach(inv => {
      const key = inv.date?.substring(0, 7) || "؟";
      if (!map[key]) map[key] = { month: key, إيرادات: 0, "تكلفة المباعة": 0, "مجمل الربح": 0 };
      map[key].إيرادات         += inv.total || 0;
      map[key]["تكلفة المباعة"] += inv.totalCOGS;
      map[key]["مجمل الربح"]    += inv.grossProfit;
    });
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({
        ...d,
        month: d.month.replace(/(\d{4})-(\d{2})/, (_, y, m) => `${m}/${y}`),
        إيرادات: Math.round(d.إيرادات),
        "تكلفة المباعة": Math.round(d["تكلفة المباعة"]),
        "مجمل الربح": Math.round(d["مجمل الربح"]),
      }));
  }, [filtered]);

  // ── أعلى / أدنى المنتجات ربحاً ───────────────────────────────────────────
  const productStats = useMemo(() => {
    const map = {};
    filtered.forEach(inv => {
      inv.itemsWithCOGS.forEach(item => {
        if (!item.product_id || !item.product_name) return;
        if (!map[item.product_id]) map[item.product_id] = {
          name: item.product_name,
          qty: 0, revenue: 0, cogs: 0, profit: 0,
        };
        map[item.product_id].qty     += item.quantity || 0;
        map[item.product_id].revenue += item.total    || 0;
        map[item.product_id].cogs    += item.cogs;
        map[item.product_id].profit  += item.profit;
      });
    });
    return Object.values(map).map(p => ({
      ...p,
      margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
    })).sort((a, b) => b.profit - a.profit);
  }, [filtered]);

  function printReport() {
    const win = window.open("", "_blank", "width=1000,height=750");
    const rows = filtered.map((inv, i) => `
      <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"};">
        <td style="padding:7px 10px;font-size:11px;">${inv.date}</td>
        <td style="padding:7px 10px;font-size:11px;font-weight:600;">${inv.invoice_number}</td>
        <td style="padding:7px 10px;font-size:11px;">${inv.client_name || "—"}</td>
        <td style="padding:7px 10px;font-size:11px;text-align:center;font-family:monospace;">${fmt(inv.total)}</td>
        <td style="padding:7px 10px;font-size:11px;text-align:center;font-family:monospace;color:#dc2626;">${fmt(inv.totalCOGS)}</td>
        <td style="padding:7px 10px;font-size:11px;text-align:center;font-family:monospace;color:${inv.grossProfit >= 0 ? "#16a34a" : "#dc2626"};">${fmt(inv.grossProfit)}</td>
        <td style="padding:7px 10px;font-size:11px;text-align:center;color:${inv.grossMargin >= 20 ? "#16a34a" : "#dc2626"};">${inv.grossMargin.toFixed(1)}%</td>
      </tr>`).join("");

    win.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"/>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Tajawal',Arial,sans-serif;direction:rtl;color:#1e293b;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
      </style></head>
      <body style="padding:20px;">
        <div style="background:#1d4ed8;color:white;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:20px;font-weight:900;">تقرير تكلفة البضاعة المباعة (COGS)</div>
            <div style="font-size:12px;opacity:.85;">تحليل الربحية الإجمالية لكل عملية بيع</div>
          </div>
          <div style="text-align:left;font-size:12px;opacity:.9;">
            <div>عدد الفواتير: ${kpis.count}</div>
            <div>هامش الربح الإجمالي: ${kpis.avgMargin.toFixed(1)}%</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
          <div style="background:#eff6ff;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:10px;color:#1d4ed8;">إجمالي الإيرادات</div>
            <div style="font-size:16px;font-weight:900;color:#1d4ed8;">${fmt(kpis.totalRevenue)}</div>
          </div>
          <div style="background:#fef2f2;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:10px;color:#dc2626;">إجمالي التكلفة</div>
            <div style="font-size:16px;font-weight:900;color:#dc2626;">${fmt(kpis.totalCOGS)}</div>
          </div>
          <div style="background:#f0fdf4;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:10px;color:#16a34a;">مجمل الربح</div>
            <div style="font-size:16px;font-weight:900;color:#16a34a;">${fmt(kpis.totalProfit)}</div>
          </div>
          <div style="background:#fefce8;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:10px;color:#ca8a04;">هامش الربح</div>
            <div style="font-size:16px;font-weight:900;color:#ca8a04;">${kpis.avgMargin.toFixed(1)}%</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#1d4ed8;">
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:right;">التاريخ</th>
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:right;">الفاتورة</th>
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:right;">العميل</th>
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:center;">الإيرادات</th>
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:center;">التكلفة (COGS)</th>
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:center;">مجمل الربح</th>
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:center;">هامش %</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#f1f5f9;font-weight:900;">
              <td colspan="3" style="padding:9px 10px;font-size:12px;">الإجمالي</td>
              <td style="padding:9px 10px;text-align:center;font-family:monospace;font-size:12px;">${fmt(kpis.totalRevenue)}</td>
              <td style="padding:9px 10px;text-align:center;font-family:monospace;font-size:12px;color:#dc2626;">${fmt(kpis.totalCOGS)}</td>
              <td style="padding:9px 10px;text-align:center;font-family:monospace;font-size:12px;color:#16a34a;">${fmt(kpis.totalProfit)}</td>
              <td style="padding:9px 10px;text-align:center;font-size:12px;">${kpis.avgMargin.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top:14px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;">
          طُبع بتاريخ: ${new Date().toLocaleDateString("ar-EG")} — ملاحظة: يُحتسب COGS بناءً على آخر سعر شراء مسجل لكل صنف
        </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            تقرير تكلفة البضاعة المباعة (COGS)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            تحليل الربحية الإجمالية لكل فاتورة مبيعات مع احتساب التكلفة الفعلية آلياً
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={refreshing} className="gap-1.5">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={printReport} className="gap-1.5">
            <Printer className="h-4 w-4" /> طباعة
          </Button>
          <ExportButtons
            columns={[
              { key: "date", label: "التاريخ" },
              { key: "invoice_number", label: "رقم الفاتورة" },
              { key: "client_name", label: "العميل" },
              { key: "total", label: "الإيرادات" },
              { key: "totalCOGS", label: "تكلفة المباعة" },
              { key: "grossProfit", label: "مجمل الربح" },
              { key: "grossMargin", label: "هامش الربح %" },
            ]}
            data={filtered.map(i => ({
              ...i,
              grossMargin: parseFloat(i.grossMargin.toFixed(2)),
              totalCOGS: parseFloat(i.totalCOGS.toFixed(2)),
              grossProfit: parseFloat(i.grossProfit.toFixed(2)),
            }))}
            title="تقرير تكلفة البضاعة المباعة"
            filename="cogs-report"
          />
        </div>
      </div>

      {/* Period Filter */}
      <Card>
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          {PERIODS.map(p => (
            <button key={p.days} onClick={() => setPeriod(p.days)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                period === p.days ? "bg-primary text-white shadow-sm" : "bg-muted hover:bg-muted-foreground/20"
              )}>
              {p.label}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Warning if some invoices have no cost data */}
      {kpis.noCogsCount > 0 && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3.5">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            <span className="font-bold">{kpis.noCogsCount} فاتورة</span> لم يُحسب فيها COGS بشكل كامل بسبب عدم وجود سعر تكلفة لبعض الأصناف.
            يُنصح بتحديث سعر التكلفة في بطاقات الأصناف.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "إجمالي الإيرادات",
            value: fmt(kpis.totalRevenue),
            Icon: TrendingUp,
            color: "bg-blue-500",
            sub: `${kpis.count} فاتورة`
          },
          {
            label: "تكلفة البضاعة المباعة",
            value: fmt(kpis.totalCOGS),
            Icon: ShoppingBag,
            color: "bg-red-500",
            sub: `${kpis.totalRevenue > 0 ? ((kpis.totalCOGS / kpis.totalRevenue) * 100).toFixed(1) : 0}% من الإيرادات`
          },
          {
            label: "مجمل الربح",
            value: fmt(kpis.totalProfit),
            Icon: DollarSign,
            color: kpis.totalProfit >= 0 ? "bg-green-500" : "bg-red-600",
            sub: "بعد خصم التكلفة"
          },
          {
            label: "متوسط هامش الربح",
            value: `${kpis.avgMargin.toFixed(1)}%`,
            Icon: Percent,
            color: kpis.avgMargin >= 20 ? "bg-emerald-500" : kpis.avgMargin >= 10 ? "bg-yellow-500" : "bg-red-500",
            sub: kpis.avgMargin >= 20 ? "ممتاز" : kpis.avgMargin >= 10 ? "جيد" : "يحتاج مراجعة"
          },
        ].map(({ label, value, Icon, color, sub }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-black">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
                <div className={cn("p-2.5 rounded-xl", color)}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              تطور الإيرادات والتكلفة ومجمل الربح شهرياً
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString()} />
                <Tooltip formatter={v => v.toLocaleString()} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="إيرادات" fill="#2563eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="تكلفة المباعة" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="مجمل الربح" fill="#16a34a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top / Bottom Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* أعلى المنتجات ربحاً */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              أعلى الأصناف ربحاً
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-3 py-2 text-right text-muted-foreground">الصنف</th>
                  <th className="px-3 py-2 text-center text-muted-foreground">الإيرادات</th>
                  <th className="px-3 py-2 text-center text-muted-foreground">الربح</th>
                  <th className="px-3 py-2 text-center text-muted-foreground">هامش%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productStats.slice(0, 8).map((p, i) => (
                  <tr key={i} className="hover:bg-muted/10">
                    <td className="px-3 py-2.5 font-medium max-w-[140px] truncate">{p.name}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">{fmt(p.revenue)}</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-green-700">{fmt(p.profit)}</td>
                    <td className="px-3 py-2.5 text-center"><ProfitBadge margin={p.margin} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* أدنى هامش ربح */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              أصناف تحتاج مراجعة التسعير (أدنى هامش)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-3 py-2 text-right text-muted-foreground">الصنف</th>
                  <th className="px-3 py-2 text-center text-muted-foreground">الإيرادات</th>
                  <th className="px-3 py-2 text-center text-muted-foreground">الربح</th>
                  <th className="px-3 py-2 text-center text-muted-foreground">هامش%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...productStats].sort((a, b) => a.margin - b.margin).slice(0, 8).map((p, i) => (
                  <tr key={i} className="hover:bg-muted/10">
                    <td className="px-3 py-2.5 font-medium max-w-[140px] truncate">{p.name}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">{fmt(p.revenue)}</td>
                    <td className={cn("px-3 py-2.5 text-center font-mono font-bold", p.profit >= 0 ? "text-green-700" : "text-red-600")}>{fmt(p.profit)}</td>
                    <td className="px-3 py-2.5 text-center"><ProfitBadge margin={p.margin} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* ── جدول الفواتير التفصيلي ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              تفاصيل الفواتير مع التكاليف ({filtered.length})
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute right-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input className="h-8 pr-8 w-48 text-sm" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">الأحدث أولاً</SelectItem>
                  <SelectItem value="date_asc">الأقدم أولاً</SelectItem>
                  <SelectItem value="profit_desc">أعلى ربح</SelectItem>
                  <SelectItem value="margin_desc">أعلى هامش</SelectItem>
                  <SelectItem value="margin_asc">أدنى هامش</SelectItem>
                  <SelectItem value="revenue_desc">أعلى إيراد</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground w-8"></th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">التاريخ</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">الفاتورة</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">العميل</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">الإيرادات</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">COGS</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">مجمل الربح</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">هامش%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((inv, i) => (
                  <>
                    <tr
                      key={inv.id}
                      className={cn(
                        "hover:bg-muted/10 cursor-pointer transition-colors",
                        i % 2 === 0 ? "" : "bg-muted/5",
                        inv.grossMargin < 0 && "bg-red-50/40"
                      )}
                      onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {expandedId === inv.id
                          ? <ChevronUp className="h-4 w-4" />
                          : <ChevronDown className="h-4 w-4" />
                        }
                      </td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">{inv.date}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-primary">{inv.invoice_number}</td>
                      <td className="px-4 py-2.5 text-sm">{inv.client_name || "—"}</td>
                      <td className="px-4 py-2.5 text-center font-mono">{fmt(inv.total)}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-red-600">{fmt(inv.totalCOGS)}</td>
                      <td className={cn(
                        "px-4 py-2.5 text-center font-mono font-bold",
                        inv.grossProfit >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {fmt(inv.grossProfit)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <ProfitBadge margin={inv.grossMargin} />
                      </td>
                    </tr>

                    {/* تفاصيل بنود الفاتورة */}
                    {expandedId === inv.id && (
                      <tr key={`${inv.id}-detail`}>
                        <td colSpan={8} className="bg-slate-50 border-b px-0 py-0">
                          <div className="p-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">تفاصيل بنود الفاتورة:</p>
                            <table className="w-full text-xs border rounded-lg overflow-hidden">
                              <thead className="bg-slate-100">
                                <tr>
                                  <th className="px-3 py-2 text-right text-muted-foreground">الصنف</th>
                                  <th className="px-3 py-2 text-center text-muted-foreground">الكمية</th>
                                  <th className="px-3 py-2 text-center text-muted-foreground">سعر البيع</th>
                                  <th className="px-3 py-2 text-center text-muted-foreground">إجمالي البند</th>
                                  <th className="px-3 py-2 text-center text-muted-foreground">تكلفة الوحدة</th>
                                  <th className="px-3 py-2 text-center text-muted-foreground">إجمالي التكلفة</th>
                                  <th className="px-3 py-2 text-center text-muted-foreground">ربح البند</th>
                                  <th className="px-3 py-2 text-center text-muted-foreground">الهامش%</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y bg-white">
                                {inv.itemsWithCOGS.map((item, j) => {
                                  const prod = productMap[item.product_id];
                                  const unitCost = prod
                                    ? (prod.last_purchase_price || prod.avg_purchase_price || prod.cost_price || 0)
                                    : 0;
                                  return (
                                    <tr key={j} className={item.margin < 0 ? "bg-red-50/50" : ""}>
                                      <td className="px-3 py-2 font-medium">{item.product_name}</td>
                                      <td className="px-3 py-2 text-center font-mono">{item.quantity}</td>
                                      <td className="px-3 py-2 text-center font-mono text-muted-foreground">{fmt(item.price)}</td>
                                      <td className="px-3 py-2 text-center font-mono">{fmt(item.total)}</td>
                                      <td className="px-3 py-2 text-center font-mono text-red-500">
                                        {unitCost > 0 ? fmt(unitCost) : <span className="text-orange-400">غير محدد</span>}
                                      </td>
                                      <td className="px-3 py-2 text-center font-mono text-red-600">{fmt(item.cogs)}</td>
                                      <td className={cn(
                                        "px-3 py-2 text-center font-mono font-bold",
                                        item.profit >= 0 ? "text-green-700" : "text-red-600"
                                      )}>
                                        {fmt(item.profit)}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <ProfitBadge margin={item.margin} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {inv.totalCOGS === 0 && (
                              <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                لم يُحسب COGS لهذه الفاتورة — تأكد من تحديد سعر التكلفة لأصناف الفاتورة
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
              {/* Footer totals */}
              <tfoot className="border-t-2">
                <tr className="bg-muted/30 font-bold">
                  <td colSpan={4} className="px-4 py-3 text-sm">الإجمالي ({filtered.length} فاتورة)</td>
                  <td className="px-4 py-3 text-center font-mono text-blue-700">{fmt(kpis.totalRevenue)}</td>
                  <td className="px-4 py-3 text-center font-mono text-red-600">{fmt(kpis.totalCOGS)}</td>
                  <td className={cn("px-4 py-3 text-center font-mono", kpis.totalProfit >= 0 ? "text-green-700" : "text-red-700")}>
                    {fmt(kpis.totalProfit)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ProfitBadge margin={kpis.avgMargin} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}