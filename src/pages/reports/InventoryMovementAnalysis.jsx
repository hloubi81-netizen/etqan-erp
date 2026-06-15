import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3, Package, TrendingUp, DollarSign, Warehouse, GitBranch,
  FolderTree, Search, ArrowRightLeft, Download, Eye, Calendar,
  Building2, Layers, PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/utils/exportUtils";
import {
  PieChart as RePieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const BRANCH_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1"];

export default function InventoryMovementAnalysis() {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterBranch, setFilterBranch] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productMovements, setProductMovements] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [p, b, w, g, inv, tr] = await Promise.all([
      base44.entities.Product.list("name", 2000),
      base44.entities.Branch.list("name", 100),
      base44.entities.Warehouse.list("name", 100),
      base44.entities.ProductGroup.list("name", 100),
      base44.entities.Invoice.list("-created_date", 1000).catch(() => []),
      base44.entities.StockTransfer.list("-created_date", 500).catch(() => []),
    ]);
    setProducts(p || []);
    setBranches(b || []);
    setWarehouses(w || []);
    setGroups(g || []);
    setInvoices(inv || []);
    setTransfers(tr || []);
    setLoading(false);
  };

  // Group products by branch and compute financials
  const branchAnalysis = useMemo(() => {
    const branchMap = {};
    products.forEach((p) => {
      if (p.is_service) return;
      const branchId = p.branch_id || "unassigned";
      const branchName = p.branch_name || "عام (بدون فرع)";
      if (!branchMap[branchId]) {
        branchMap[branchId] = {
          branch_id: branchId,
          branch_name: branchName,
          total_items: 0,
          total_qty: 0,
          total_cost_value: 0,
          total_retail_value: 0,
          products: [],
        };
      }
      const qty = p.available_qty || 0;
      const cost = p.cost_price || 0;
      const retail = p.retail_price || 0;
      branchMap[branchId].total_items += 1;
      branchMap[branchId].total_qty += qty;
      branchMap[branchId].total_cost_value += qty * cost;
      branchMap[branchId].total_retail_value += qty * retail;
      branchMap[branchId].products.push({
        ...p,
        stock_value_cost: qty * cost,
        stock_value_retail: qty * retail,
      });
    });
    return Object.values(branchMap).sort((a, b) => b.total_cost_value - a.total_cost_value);
  }, [products]);

  // Filtered branches
  const filteredBranches = useMemo(() => {
    let result = branchAnalysis;
    if (filterBranch !== "all") {
      result = result.filter((b) => b.branch_id === filterBranch);
    }
    return result.map((b) => {
      let filteredProducts = b.products;
      if (filterGroup !== "all") {
        filteredProducts = filteredProducts.filter((p) => p.group_id === filterGroup);
      }
      if (filterSearch) {
        const s = filterSearch.toLowerCase();
        filteredProducts = filteredProducts.filter((p) =>
          p.name?.toLowerCase().includes(s) ||
          p.item_code?.toLowerCase().includes(s));
      }
      return { ...b, products: filteredProducts, filtered_count: filteredProducts.length };
    });
  }, [branchAnalysis, filterBranch, filterGroup, filterSearch]);

  // Totals
  const totals = useMemo(() => {
    const allProducts = products.filter((p) => !p.is_service);
    return {
      total_branches: branchAnalysis.length,
      total_items: allProducts.length,
      total_qty: allProducts.reduce((s, p) => s + (p.available_qty || 0), 0),
      total_cost_value: allProducts.reduce((s, p) => s + (p.available_qty || 0) * (p.cost_price || 0), 0),
      total_retail_value: allProducts.reduce((s, p) => s + (p.available_qty || 0) * (p.retail_price || 0), 0),
    };
  }, [products, branchAnalysis]);

  // Pie chart data
  const pieData = useMemo(() => {
    return branchAnalysis
      .filter((b) => b.total_cost_value > 0)
      .map((b, i) => ({
        name: b.branch_name,
        value: Math.round(b.total_cost_value),
        color: BRANCH_COLORS[i % BRANCH_COLORS.length],
      }));
  }, [branchAnalysis]);

  // Bar chart - top 15 products by stock value
  const topProducts = useMemo(() => {
    return products
      .filter((p) => !p.is_service)
      .map((p) => ({
        name: p.name?.substring(0, 25) || "-",
        value: Math.round((p.available_qty || 0) * (p.cost_price || 0)),
        branch: p.branch_name || "عام",
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [products]);

  // Get movements for a product
  const getProductMovements = (product) => {
    const movements = [];
    invoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        if (item.product_id === product.id) {
          movements.push({
            date: inv.date,
            number: inv.invoice_number,
            type: inv.pattern_type,
            quantity: item.quantity,
            price: item.price,
            warehouse: inv.warehouse_name || "-",
            direction: ["مبيعات", "مرتجع مشتريات"].includes(inv.pattern_type) ? "صادر" : "وارد",
          });
        }
      });
    });
    transfers.forEach((tr) => {
      (tr.items || []).forEach((item) => {
        if (item.product_id === product.id) {
          movements.push({
            date: tr.date,
            number: tr.transfer_number,
            type: "مناقلة",
            quantity: item.quantity,
            price: "-",
            warehouse: `${tr.from_warehouse_name || "-"} → ${tr.to_warehouse_name || "-"}`,
            direction: "مناقلة",
          });
        }
      });
    });
    movements.sort((a, b) => (a.date > b.date ? -1 : 1));
    return movements;
  };

  const handleShowMovements = (product) => {
    setSelectedProduct(product);
    setProductMovements(getProductMovements(product));
  };

  const handleExport = () => {
    const rows = [];
    filteredBranches.forEach((b) => {
      b.products.forEach((p) => {
        rows.push({
          branch: b.branch_name,
          code: p.item_code,
          name: p.name,
          group: groups.find((g) => g.id === p.group_id)?.name || "-",
          qty: p.available_qty || 0,
          cost_price: p.cost_price || 0,
          stock_value_cost: p.stock_value_cost || 0,
          retail_price: p.retail_price || 0,
          stock_value_retail: p.stock_value_retail || 0,
          warehouse: p.last_stock_warehouse_name || "-",
        });
      });
    });
    exportToExcel(
      [
        { key: "branch", label: "الفرع" },
        { key: "code", label: "رمز الصنف" },
        { key: "name", label: "اسم الصنف" },
        { key: "group", label: "المجموعة" },
        { key: "qty", label: "الكمية" },
        { key: "cost_price", label: "سعر التكلفة" },
        { key: "stock_value_cost", label: "قيمة المخزون (تكلفة)" },
        { key: "retail_price", label: "سعر المستهلك" },
        { key: "stock_value_retail", label: "قيمة المخزون (بيع)" },
      ],
      rows,
      "تحليل_حركة_المخزون",
      "تقرير تحليل المخزون"
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            تحليل حركة وقيمة المخزون حسب الفروع
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            تقرير تحليلي مفصل لحركة المخزون وإجمالي القيمة المالية لكل فرع
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
          <Download className="h-4 w-4 text-green-600" /> تصدير Excel
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { value: totals.total_branches, label: "عدد الفروع", icon: Building2, bg: "from-blue-50 to-blue-100/50", border: "border-blue-200", text: "text-blue-800", iconColor: "text-blue-600", sub: "text-blue-700" },
          { value: totals.total_items, label: "إجمالي الأصناف", icon: Package, bg: "from-purple-50 to-purple-100/50", border: "border-purple-200", text: "text-purple-800", iconColor: "text-purple-600", sub: "text-purple-700" },
          { value: totals.total_qty.toLocaleString(), label: "إجمالي الكميات", icon: Layers, bg: "from-teal-50 to-teal-100/50", border: "border-teal-200", text: "text-teal-800", iconColor: "text-teal-600", sub: "text-teal-700" },
          { value: totals.total_cost_value.toLocaleString() + " ج.م", label: "قيمة المخزون (تكلفة)", icon: DollarSign, bg: "from-amber-50 to-amber-100/50", border: "border-amber-200", text: "text-amber-800", iconColor: "text-amber-600", sub: "text-amber-700" },
          { value: totals.total_retail_value.toLocaleString() + " ج.م", label: "قيمة المخزون (بيع)", icon: TrendingUp, bg: "from-green-50 to-green-100/50", border: "border-green-200", text: "text-green-800", iconColor: "text-green-600", sub: "text-green-700" },
        ].map((kpi, i) => (
          <Card key={i} className={cn("bg-gradient-to-br border-0", kpi.bg, kpi.border)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-white", kpi.iconColor)}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className={cn("text-xl font-bold", kpi.text)}>{kpi.value}</p>
                <p className={cn("text-xs", kpi.sub)}>{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Branch Distribution */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <PieChart className="h-4 w-4 text-primary" />
              توزيع قيمة المخزون حسب الفروع
            </h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => v.toLocaleString() + " ج.م"} />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Top Products by Value */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              أعلى 15 صنفاً حسب قيمة المخزون
            </h3>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 80, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={80} fontSize={10} />
                  <Tooltip formatter={(v) => v.toLocaleString() + " ج.م"} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث باسم أو رمز الصنف..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="w-44">
            <GitBranch className="h-3.5 w-3.5 ml-1" />
            <SelectValue placeholder="الفرع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفروع</SelectItem>
            {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-44">
            <FolderTree className="h-3.5 w-3.5 ml-1" />
            <SelectValue placeholder="المجموعة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المجموعات</SelectItem>
            {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterSearch || filterBranch !== "all" || filterGroup !== "all") && (
          <Badge variant="secondary" className="h-9 px-3">
            {filteredBranches.reduce((s, b) => s + b.filtered_count, 0)} نتيجة
          </Badge>
        )}
      </div>

      {/* Branch Cards */}
      <div className="space-y-6">
        {filteredBranches.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Warehouse className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد نتائج مطابقة</p>
          </div>
        ) : (
          filteredBranches.map((branch) => (
            <Card key={branch.branch_id} className="border overflow-hidden">
              {/* Branch Header */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{branch.branch_name}</h3>
                    <p className="text-xs text-gray-500">{branch.total_items} صنف • {branch.total_qty.toLocaleString()} وحدة</p>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">قيمة التكلفة</p>
                    <p className="font-bold text-amber-700">{branch.total_cost_value.toLocaleString()} ج.م</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">قيمة البيع</p>
                    <p className="font-bold text-green-700">{branch.total_retail_value.toLocaleString()} ج.م</p>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b">
                        <th className="text-right p-3 font-semibold text-xs">#</th>
                        <th className="text-right p-3 font-semibold text-xs">رمز الصنف</th>
                        <th className="text-right p-3 font-semibold text-xs">اسم الصنف</th>
                        <th className="text-right p-3 font-semibold text-xs">المجموعة</th>
                        <th className="text-right p-3 font-semibold text-xs">الكمية</th>
                        <th className="text-right p-3 font-semibold text-xs">سعر التكلفة</th>
                        <th className="text-right p-3 font-semibold text-xs">قيمة المخزون</th>
                        <th className="text-right p-3 font-semibold text-xs">سعر البيع</th>
                        <th className="text-right p-3 font-semibold text-xs">حركة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branch.products.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                            لا توجد أصناف في هذا الفرع
                          </td>
                        </tr>
                      ) : (
                        branch.products.map((p, idx) => (
                          <tr key={p.id} className="border-b hover:bg-muted/10 transition-colors">
                            <td className="p-3 text-muted-foreground text-xs">{idx + 1}</td>
                            <td className="p-3 font-mono text-xs">{p.item_code}</td>
                            <td className="p-3 font-medium text-sm">{p.name}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs">
                                {groups.find((g) => g.id === p.group_id)?.name || "-"}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <span className={cn(
                                "font-bold text-sm",
                                (p.available_qty || 0) === 0 && "text-red-600",
                                (p.available_qty || 0) > 0 && (p.available_qty || 0) <= 5 && "text-amber-600",
                                (p.available_qty || 0) > 5 && "text-green-600",
                              )}>
                                {p.available_qty || 0}
                              </span>
                            </td>
                            <td className="p-3 text-sm">{p.cost_price ? p.cost_price.toLocaleString() : "-"}</td>
                            <td className="p-3 font-semibold text-sm text-amber-700">
                              {p.stock_value_cost ? p.stock_value_cost.toLocaleString() : "-"} ج.م
                            </td>
                            <td className="p-3 text-sm">{p.retail_price ? p.retail_price.toLocaleString() : "-"}</td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleShowMovements(p)}
                              >
                                <Eye className="h-3 w-3" />
                                عرض الحركة
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Product Movement Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              حركة الصنف: {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {/* Product Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm p-3 bg-muted/30 rounded-lg">
                <div>
                  <span className="text-muted-foreground text-xs">الرمز:</span>
                  <p className="font-mono text-xs">{selectedProduct.item_code}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">الكمية الحالية:</span>
                  <p className="font-bold">{selectedProduct.available_qty || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">سعر التكلفة:</span>
                  <p>{selectedProduct.cost_price ? selectedProduct.cost_price.toLocaleString() : "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">قيمة المخزون:</span>
                  <p className="font-bold text-amber-700">
                    {((selectedProduct.available_qty || 0) * (selectedProduct.cost_price || 0)).toLocaleString()} ج.م
                  </p>
                </div>
              </div>

              {/* Movements Table */}
              <div>
                <h4 className="font-semibold text-sm mb-2">سجل الحركات</h4>
                {productMovements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">لا توجد حركات مسجلة لهذا الصنف</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/30 border-b sticky top-0">
                          <th className="text-right p-2 text-xs font-semibold">التاريخ</th>
                          <th className="text-right p-2 text-xs font-semibold">الرقم</th>
                          <th className="text-right p-2 text-xs font-semibold">النوع</th>
                          <th className="text-right p-2 text-xs font-semibold">الاتجاه</th>
                          <th className="text-right p-2 text-xs font-semibold">الكمية</th>
                          <th className="text-right p-2 text-xs font-semibold">السعر</th>
                          <th className="text-right p-2 text-xs font-semibold">المستودع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productMovements.map((m, i) => (
                          <tr key={i} className="border-b hover:bg-muted/10">
                            <td className="p-2 text-xs flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" /> {m.date}
                            </td>
                            <td className="p-2 text-xs">{m.number}</td>
                            <td className="p-2 text-xs">{m.type}</td>
                            <td className="p-2">
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                m.direction === "صادر" && "text-red-600 border-red-200",
                                m.direction === "وارد" && "text-green-600 border-green-200",
                                m.direction === "مناقلة" && "text-blue-600 border-blue-200",
                              )}>
                                {m.direction}
                              </Badge>
                            </td>
                            <td className="p-2 text-xs font-bold">{m.quantity}</td>
                            <td className="p-2 text-xs">{typeof m.price === "number" ? m.price.toLocaleString() : m.price}</td>
                            <td className="p-2 text-xs text-muted-foreground">{m.warehouse}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}