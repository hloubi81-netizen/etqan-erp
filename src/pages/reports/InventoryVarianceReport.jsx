import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";
import {
  TrendingUp, TrendingDown, CheckCircle2, AlertTriangle,
  Download, Filter, WarehouseIcon, Package
} from "lucide-react";
import { cn } from "@/lib/utils";

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function DiffBadge({ diff }) {
  if (diff === 0) return <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1"><CheckCircle2 className="h-3 w-3" />مطابق</Badge>;
  if (diff > 0) return <Badge className="bg-blue-100 text-blue-700 border-0 text-xs gap-1"><TrendingUp className="h-3 w-3" />فائض +{diff}</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-0 text-xs gap-1"><TrendingDown className="h-3 w-3" />عجز {diff}</Badge>;
}

export default function InventoryVarianceReport() {
  const [counts, setCounts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [filterType, setFilterType] = useState("all"); // all | surplus | deficit | matched
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    Promise.all([
      base44.entities.InventoryCount.list("-date", 500),
      base44.entities.Warehouse.list(),
    ]).then(([c, w]) => {
      setCounts(c); setWarehouses(w); setLoading(false);
    });
  }, []);

  // Flatten all items from all counts with parent info
  const allItems = useMemo(() => {
    return counts
      .filter(c => c.date >= dateFrom && c.date <= dateTo)
      .filter(c => filterWarehouse === "all" || c.warehouse_id === filterWarehouse)
      .filter(c => filterStatus === "all" || c.status === filterStatus)
      .flatMap(count =>
        (count.items || []).map(item => ({
          ...item,
          count_number: count.count_number,
          count_date: count.date,
          count_id: count.id,
          warehouse_name: count.warehouse_name,
          warehouse_id: count.warehouse_id,
          count_status: count.status,
          count_type: count.type,
          diff: (item.actual_quantity ?? item.book_quantity ?? 0) - (item.book_quantity ?? 0),
        }))
      );
  }, [counts, filterWarehouse, filterStatus, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    return allItems
      .filter(item => {
        if (filterType === "surplus") return item.diff > 0;
        if (filterType === "deficit") return item.diff < 0;
        if (filterType === "matched") return item.diff === 0;
        return true;
      })
      .filter(item =>
        !search || (item.product_name || "").toLowerCase().includes(search.toLowerCase())
      );
  }, [allItems, filterType, search]);

  // Stats
  const totalItems = allItems.length;
  const surplusItems = allItems.filter(i => i.diff > 0).length;
  const deficitItems = allItems.filter(i => i.diff < 0).length;
  const matchedItems = allItems.filter(i => i.diff === 0).length;
  const totalSurplusQty = allItems.filter(i => i.diff > 0).reduce((s, i) => s + i.diff, 0);
  const totalDeficitQty = allItems.filter(i => i.diff < 0).reduce((s, i) => s + Math.abs(i.diff), 0);

  // Chart: variance by warehouse
  const warehouseChart = useMemo(() => {
    const map = {};
    allItems.forEach(item => {
      const key = item.warehouse_name || "غير محدد";
      if (!map[key]) map[key] = { name: key, فائض: 0, عجز: 0, مطابق: 0 };
      if (item.diff > 0) map[key].فائض++;
      else if (item.diff < 0) map[key].عجز++;
      else map[key].مطابق++;
    });
    return Object.values(map);
  }, [allItems]);

  // Chart: top deficit products
  const topDeficit = useMemo(() => {
    const map = {};
    allItems.filter(i => i.diff < 0).forEach(item => {
      const k = item.product_name || "غير محدد";
      if (!map[k]) map[k] = { name: k, عجز: 0 };
      map[k].عجز += Math.abs(item.diff);
    });
    return Object.values(map).sort((a, b) => b.عجز - a.عجز).slice(0, 8);
  }, [allItems]);

  // Pie: status breakdown
  const pieData = [
    { name: "مطابق", value: matchedItems, color: "#16a34a" },
    { name: "فائض", value: surplusItems, color: "#2563eb" },
    { name: "عجز", value: deficitItems, color: "#dc2626" },
  ].filter(d => d.value > 0);

  function exportCSV() {
    const headers = ["رقم المحضر", "التاريخ", "المستودع", "الصنف", "الكمية الدفترية", "الكمية الفعلية", "الفرق", "النوع", "الحالة"];
    const rows = filtered.map(i => [
      i.count_number, i.count_date, i.warehouse_name, i.product_name,
      i.book_quantity ?? 0, i.actual_quantity ?? 0, i.diff,
      i.diff > 0 ? "فائض" : i.diff < 0 ? "عجز" : "مطابق",
      i.count_status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "تقرير_فروقات_الجرد.csv"; a.click();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <WarehouseIcon className="h-5 w-5 text-primary" />
            تقرير فروقات الجرد
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">مقارنة الكميات الفعلية بالكميات الدفترية بعد الجرد الميداني</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
          <Download className="h-4 w-4" /> تصدير CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">من:</span>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">إلى:</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
            <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="كل المستودعات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المستودعات</SelectItem>
                {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="معتمد">معتمد</SelectItem>
                <SelectItem value="مسودة">مسودة</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="ابحث عن صنف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-40 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="إجمالي الأصناف" value={totalItems} icon={Package} color="bg-slate-500" />
        <StatCard label="أصناف مطابقة" value={matchedItems} sub={`${totalItems > 0 ? ((matchedItems/totalItems)*100).toFixed(0) : 0}% من الإجمالي`} icon={CheckCircle2} color="bg-green-600" />
        <StatCard label="أصناف بفائض" value={surplusItems} sub={`+${totalSurplusQty.toFixed(2)} وحدة فائضة`} icon={TrendingUp} color="bg-blue-600" />
        <StatCard label="أصناف بعجز" value={deficitItems} sub={`${totalDeficitQty.toFixed(2)} وحدة عجز`} icon={TrendingDown} color="bg-red-500" />
      </div>

      {/* Charts Row */}
      {allItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart per warehouse */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">الفروقات حسب المستودع</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={warehouseChart} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="مطابق" fill="#16a34a" radius={[3,3,0,0]} />
                  <Bar dataKey="فائض" fill="#2563eb" radius={[3,3,0,0]} />
                  <Bar dataKey="عجز" fill="#dc2626" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">توزيع حالات الجرد</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Deficit Products */}
      {topDeficit.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> أعلى الأصناف عجزاً
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topDeficit} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="عجز" fill="#dc2626" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {[
          { key: "all", label: `الكل (${allItems.length})` },
          { key: "deficit", label: `عجز (${deficitItems})` },
          { key: "surplus", label: `فائض (${surplusItems})` },
          { key: "matched", label: `مطابق (${matchedItems})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilterType(t.key)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
              filterType === t.key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">جدول الفروقات التفصيلي</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  {["رقم المحضر", "التاريخ", "المستودع", "الصنف", "الكمية الدفترية", "الكمية الفعلية", "الفرق", "النوع", "الحالة"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((item, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      "hover:bg-muted/20 transition-colors",
                      item.diff > 0 ? "bg-blue-50/30" : item.diff < 0 ? "bg-red-50/30" : "bg-green-50/20"
                    )}
                  >
                    <td className="px-4 py-2.5 font-mono font-semibold text-xs">{item.count_number}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.count_date}</td>
                    <td className="px-4 py-2.5 text-xs">{item.warehouse_name}</td>
                    <td className="px-4 py-2.5 font-medium">{item.product_name}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-muted-foreground">{item.book_quantity ?? 0}</td>
                    <td className="px-4 py-2.5 text-center font-mono font-semibold">{item.actual_quantity ?? 0}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn(
                        "font-mono font-bold text-sm",
                        item.diff > 0 ? "text-blue-600" : item.diff < 0 ? "text-red-600" : "text-green-600"
                      )}>
                        {item.diff > 0 ? `+${item.diff}` : item.diff}
                      </span>
                    </td>
                    <td className="px-4 py-2.5"><DiffBadge diff={item.diff} /></td>
                    <td className="px-4 py-2.5">
                      <Badge variant={item.count_status === "معتمد" ? "default" : "secondary"} className="text-xs">{item.count_status}</Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-muted-foreground py-12">
                      <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                      لا توجد بيانات جرد في الفترة المحددة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground text-left">
              إجمالي النتائج: {filtered.length} سجل
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}