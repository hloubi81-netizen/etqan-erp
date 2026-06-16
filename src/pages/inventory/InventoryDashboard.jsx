import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VariantBatchCreator from "@/components/products/VariantBatchCreator";
import InventoryBranchChart from "@/components/inventory/InventoryBranchChart";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import {
  Package, Layers, AlertTriangle, ArrowRightLeft, Search, GitBranch,
  Plus, Barcode, Palette, Ruler, TrendingUp, Warehouse, FolderTree, FileSpreadsheet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/utils/exportUtils";
import { toast } from "sonner";

export default function InventoryDashboard() {
  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterColor, setFilterColor] = useState("all");
  const [batchCreatorOpen, setBatchCreatorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { filterByBranch, isAdmin } = useBranchFilter();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [prods, grps, whs, brs, trs] = await Promise.all([
      base44.entities.Product.list("-updated_date", 1000),
      base44.entities.ProductGroup.list(),
      base44.entities.Warehouse.list(),
      base44.entities.Branch.list(),
      base44.entities.StockTransfer.list("-created_date", 500).catch(() => []),
    ]);
    setProducts(prods);
    setGroups(grps);
    setWarehouses(whs);
    setBranches(brs);
    setTransfers(trs);
    setLoading(false);
  }

  // Stats
  const stats = useMemo(() => {
    const filtered = filterByBranch(products);
    const withVariants = filtered.filter(p => p.color || p.size);
    const withBarcode = filtered.filter(p => p.barcode);
    const lowStock = filtered.filter(p => (p.available_qty || 0) <= 5 && (p.available_qty || 0) > 0 && !p.is_service);
    const outOfStock = filtered.filter(p => (p.available_qty || 0) === 0 && !p.is_service);
    const totalStockValue = filtered.reduce((sum, p) => sum + ((p.available_qty || 0) * (p.cost_price || 0)), 0);

    return {
      total: filtered.length,
      withVariants: withVariants.length,
      withBarcode: withBarcode.length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      totalStockValue,
    };
  }, [products]);

  // All unique colors and sizes
  const allColors = useMemo(() => {
    const colors = new Set();
    products.forEach(p => { if (p.color) colors.add(p.color); });
    return Array.from(colors).sort();
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = filterByBranch(products);
    const s = search.toLowerCase();

    if (s) {
      result = result.filter(p =>
        p.name?.toLowerCase().includes(s) ||
        p.item_code?.toLowerCase().includes(s) ||
        p.barcode?.toLowerCase().includes(s) ||
        p.color?.toLowerCase().includes(s) ||
        p.size?.toLowerCase().includes(s)
      );
    }

    if (filterGroup !== "all") {
      result = result.filter(p => p.group_id === filterGroup);
    }

    if (isAdmin && filterBranch !== "all") {
      result = result.filter(p => p.branch_id === filterBranch);
    }

    if (filterColor !== "all") {
      result = result.filter(p => p.color === filterColor);
    }

    return result;
  }, [products, search, filterGroup, filterBranch, filterColor]);

  // Get product transfers
  function getProductTransfers(productId) {
    return transfers.filter(t => {
      if (!t.items) return false;
      try {
        const items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items;
        return Array.isArray(items) && items.some(item => item.product_id === productId);
      } catch { return false; }
    });
  }

  function getGroupName(id) {
    return groups.find(g => g.id === id)?.name || "-";
  }

  function getBranchName(id) {
    return branches.find(b => b.id === id)?.name || "";
  }

  function handleExport() {
    const cols = [
      { key: "item_code", label: "رمز الصنف" },
      { key: "name", label: "اسم الصنف" },
      { key: "group_id", label: "المجموعة", excelValue: (v) => getGroupName(v) },
      { key: "branch_name", label: "الفرع" },
      { key: "color", label: "اللون" },
      { key: "size", label: "المقاس" },
      { key: "barcode", label: "الباركود" },
      { key: "available_qty", label: "الكمية المتاحة" },
      { key: "retail_price", label: "سعر المستهلك" },
      { key: "cost_price", label: "سعر التكلفة" },
    ];
    exportToExcel(cols, filteredProducts, "ادارة_المخزون", "تقرير المخزون");
  }

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-primary" />
            إدارة المخزون
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">متابعة الأصناف والتصنيفات وحركة المخزون بين الفروع</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            تصدير Excel
          </Button>
          <Button size="sm" onClick={() => setBatchCreatorOpen(true)} className="gap-1.5">
            <Layers className="h-4 w-4" />
            تصنيفات متعددة
          </Button>
          <Link to="/products">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Package className="h-4 w-4" />
              صفحة المنتجات
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-blue-700">إجمالي الأصناف</p>
            </div>
            <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-purple-600" />
              <p className="text-xs text-purple-700">بتصنيفات</p>
            </div>
            <p className="text-2xl font-bold text-purple-800">{stats.withVariants}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Barcode className="h-4 w-4 text-green-600" />
              <p className="text-xs text-green-700">بباركود</p>
            </div>
            <p className="text-2xl font-bold text-green-800">{stats.withBarcode}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-amber-700">مخزون منخفض</p>
            </div>
            <p className="text-2xl font-bold text-amber-800">{stats.lowStock}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-xs text-red-700">نفذ المخزون</p>
            </div>
            <p className="text-2xl font-bold text-red-800">{stats.outOfStock}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              <p className="text-xs text-teal-700">قيمة المخزون</p>
            </div>
            <p className="text-lg font-bold text-teal-800">{stats.totalStockValue.toLocaleString()} ج.م</p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Financial Chart */}
      <InventoryBranchChart />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم، الرمز، الباركود، اللون، المقاس..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-8 h-10"
          />
        </div>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-36 h-10">
            <FolderTree className="h-3.5 w-3.5 text-muted-foreground ml-1" />
            <SelectValue placeholder="المجموعة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المجموعات</SelectItem>
            {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-36 h-10">
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              <SelectValue placeholder="الفرع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفروع</SelectItem>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterColor} onValueChange={setFilterColor}>
          <SelectTrigger className="w-36 h-10">
            <Palette className="h-3.5 w-3.5 text-muted-foreground ml-1" />
            <SelectValue placeholder="اللون" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الألوان</SelectItem>
            {allColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || filterGroup !== "all" || filterBranch !== "all" || filterColor !== "all") && (
          <Badge variant="secondary" className="h-10 px-3 text-sm gap-1">
            {filteredProducts.length} نتيجة
          </Badge>
        )}
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-right p-3 font-semibold">#</th>
                  <th className="text-right p-3 font-semibold">رمز الصنف</th>
                  <th className="text-right p-3 font-semibold">اسم الصنف</th>
                  <th className="text-right p-3 font-semibold">المجموعة</th>
                  <th className="text-right p-3 font-semibold">
                    <div className="flex items-center gap-1"><Palette className="h-3 w-3" /> اللون</div>
                  </th>
                  <th className="text-right p-3 font-semibold">
                    <div className="flex items-center gap-1"><Ruler className="h-3 w-3" /> المقاس</div>
                  </th>
                  <th className="text-right p-3 font-semibold">
                    <div className="flex items-center gap-1"><Barcode className="h-3 w-3" /> الباركود</div>
                  </th>
                  <th className="text-right p-3 font-semibold">الفرع</th>
                  <th className="text-right p-3 font-semibold">الكمية</th>
                  <th className="text-right p-3 font-semibold">سعر المستهلك</th>
                  <th className="text-right p-3 font-semibold">حركة</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">لا توجد أصناف مطابقة للبحث</p>
                      <p className="text-xs mt-1">جرب تغيير معايير التصفية أو إضافة منتجات جديدة</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p, idx) => {
                    const prodTransfers = getProductTransfers(p.id);
                    return (
                      <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-muted-foreground">{idx + 1}</td>
                        <td className="p-3 font-mono text-xs">{p.item_code}</td>
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">{getGroupName(p.group_id)}</Badge>
                        </td>
                        <td className="p-3">
                          {p.color ? (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: translateColor(p.color) }} />
                              {p.color}
                            </Badge>
                          ) : <span className="text-muted-foreground text-xs">-</span>}
                        </td>
                        <td className="p-3">
                          {p.size ? <Badge variant="outline" className="text-xs">{p.size}</Badge> : <span className="text-muted-foreground text-xs">-</span>}
                        </td>
                        <td className="p-3">
                          {p.barcode ? (
                            <span className="font-mono text-xs tracking-wider">{p.barcode}</span>
                          ) : <span className="text-muted-foreground text-xs">-</span>}
                        </td>
                        <td className="p-3">{p.branch_name || <span className="text-muted-foreground text-xs">عام</span>}</td>
                        <td className="p-3">
                          {p.is_service ? (
                            <Badge variant="secondary" className="text-xs">خدمة</Badge>
                          ) : (
                            <span className={cn(
                              "font-bold",
                              (p.available_qty || 0) === 0 && "text-red-600",
                              (p.available_qty || 0) > 0 && (p.available_qty || 0) <= 5 && "text-amber-600",
                              (p.available_qty || 0) > 5 && "text-green-600"
                            )}>
                              {p.available_qty || 0}
                            </span>
                          )}
                        </td>
                        <td className="p-3">{p.retail_price ? p.retail_price.toLocaleString() : "-"}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => setSelectedProduct(p)}
                            >
                              <ArrowRightLeft className="h-3 w-3" />
                              {prodTransfers.length > 0 ? `${prodTransfers.length} حركة` : "عرض"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Product Movement Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              حركة الصنف: {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="grid grid-cols-2 gap-2 text-sm p-3 bg-muted/30 rounded-lg">
                <div><span className="text-muted-foreground">الرمز:</span> <span className="font-mono">{selectedProduct.item_code}</span></div>
                <div><span className="text-muted-foreground">الكمية الحالية:</span> <span className="font-bold">{selectedProduct.available_qty || 0}</span></div>
                {selectedProduct.color && <div><span className="text-muted-foreground">اللون:</span> {selectedProduct.color}</div>}
                {selectedProduct.size && <div><span className="text-muted-foreground">المقاس:</span> {selectedProduct.size}</div>}
                {selectedProduct.barcode && <div><span className="text-muted-foreground">الباركود:</span> <span className="font-mono">{selectedProduct.barcode}</span></div>}
                <div><span className="text-muted-foreground">الفرع:</span> {selectedProduct.branch_name || "عام"}</div>
              </div>

              {/* Transfers */}
              <div>
                <h4 className="font-semibold text-sm mb-2">سجل التحويلات</h4>
                {(() => {
                  const prodTransfers = getProductTransfers(selectedProduct.id);
                  if (prodTransfers.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">لا توجد تحويلات لهذا الصنف</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {prodTransfers.map(t => {
                        let itemQty = 0;
                        try {
                          const items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items;
                          const found = items.find(i => i.product_id === selectedProduct.id);
                          if (found) itemQty = found.quantity || 0;
                        } catch { }
                        return (
                          <div key={t.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{t.date ? new Date(t.date).toLocaleDateString("ar-EG") : "-"}</span>
                              <Badge variant="outline" className="text-xs">{itemQty} وحدة</Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{t.from_warehouse_name || t.from_branch_name || "-"}</span>
                              <ArrowRightLeft className="h-3 w-3" />
                              <span>{t.to_warehouse_name || t.to_branch_name || "-"}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Link to="/transfers">
                  <Button variant="outline" size="sm" className="gap-1">
                    <ArrowRightLeft className="h-4 w-4" />
                    صفحة التحويلات
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Variant Batch Creator */}
      <VariantBatchCreator
        open={batchCreatorOpen}
        onClose={() => setBatchCreatorOpen(false)}
        onSuccess={() => { loadData(); toast.success("تم تحديث بيانات المخزون"); }}
        groups={groups}
        warehouses={warehouses}
        branches={branches}
        products={products}
      />
    </div>
  );
}

// Helper to map color names to CSS colors
function translateColor(name) {
  const map = {
    "أحمر": "#ef4444", "أزرق": "#3b82f6", "أخضر": "#22c55e", "أسود": "#1e293b",
    "أبيض": "#f8fafc", "أصفر": "#eab308", "برتقالي": "#f97316", "بنفسجي": "#a855f7",
    "وردي": "#ec4899", "رمادي": "#6b7280", "بني": "#92400e", "ذهبي": "#d4a853",
    "فضي": "#c0c0c0", "كحلي": "#1e3a8a", "زيتي": "#3f6212", "سماوي": "#06b6d4",
    "بيج": "#d4b896", "موف": "#7c3aed", "فيراني": "#0369a1", "جملي": "#b45309"
  };
  return map[name] || "#94a3b8";
}