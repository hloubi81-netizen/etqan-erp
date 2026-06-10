import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { calcCurrentStock } from "@/utils/inventoryEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, RefreshCw, TrendingDown, AlertTriangle, CheckCircle2, Warehouse } from "lucide-react";

export default function WarehouseStockPanel({ warehouses }) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("all");
  const [search, setSearch] = useState("");
  const [stockData, setStockData] = useState([]); // [{product, warehouseId, qty}]
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { loadStock(); }, []);

  async function loadStock() {
    setLoading(true);
    const [allInvoices, allTransfers, allProducts, alerts] = await Promise.all([
      base44.entities.Invoice.filter({ status: "مرحّلة" }).catch(() => []),
      base44.entities.StockTransfer.list().catch(() => []),
      base44.entities.Product.list().catch(() => []),
      base44.entities.StockAlert.filter({ is_active: true }).catch(() => []),
    ]);

    // حساب رصيد كل منتج في كل مستودع
    const rows = [];
    for (const product of allProducts) {
      if (product.is_service) continue;
      for (const wh of warehouses) {
        const qty = calcCurrentStock(product.id, wh.id, allInvoices, allTransfers);
        if (qty > 0 || allInvoices.some(i => i.warehouse_id === wh.id && i.items?.some(it => it.product_id === product.id))) {
          const alert = alerts.find(a => a.product_id === product.id && a.warehouse_id === wh.id);
          rows.push({
            product_id: product.id,
            product_name: product.name,
            product_code: product.item_code,
            warehouse_id: wh.id,
            warehouse_name: wh.name,
            branch_name: wh.branch_name || "",
            qty,
            min_qty: alert?.min_quantity || 0,
            reorder_qty: alert?.reorder_quantity || 0,
            status: qty === 0 ? "نفد" : alert && qty <= alert.min_quantity ? "منخفض" : "متاح",
          });
        }
      }
    }

    setStockData(rows);
    setLastUpdated(new Date().toLocaleTimeString("ar-EG"));
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return stockData.filter(r => {
      if (selectedWarehouseId !== "all" && r.warehouse_id !== selectedWarehouseId) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.product_name?.toLowerCase().includes(q) && !r.product_code?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [stockData, selectedWarehouseId, search]);

  const summary = useMemo(() => ({
    available: filtered.filter(r => r.status === "متاح").length,
    low: filtered.filter(r => r.status === "منخفض").length,
    empty: filtered.filter(r => r.status === "نفد").length,
  }), [filtered]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-muted-foreground mb-1 block">المستودع</label>
          <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="جميع المستودعات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المستودعات</SelectItem>
              {warehouses.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name} {w.branch_name ? `(${w.branch_name})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px] relative">
          <label className="text-xs text-muted-foreground mb-1 block">بحث بالصنف</label>
          <Search className="absolute right-2.5 top-[calc(1.25rem+4px)] h-3.5 w-3.5 text-muted-foreground" />
          <Input className="h-9 pr-8" placeholder="اسم الصنف أو الرمز..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={loadStock} disabled={loading} className="gap-1.5 self-end">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
        {lastUpdated && <span className="text-xs text-muted-foreground self-end pb-1">آخر تحديث: {lastUpdated}</span>}
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          <span className="text-xs font-semibold text-green-700">متاح: {summary.available}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-xs font-semibold text-orange-600">منخفض: {summary.low}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs font-semibold text-red-600">نفد: {summary.empty}</span>
        </div>
      </div>

      {/* Stock table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>لا توجد بيانات مخزون متاحة</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">رمز الصنف</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">اسم الصنف</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">المستودع</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">الفرع</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">الكمية المتاحة</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">الحد الأدنى</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i} className={`border-t hover:bg-muted/10 ${r.status === "نفد" ? "bg-red-50/40" : r.status === "منخفض" ? "bg-orange-50/40" : ""}`}>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.product_code || "—"}</td>
                      <td className="px-4 py-2.5 font-medium">{r.product_name}</td>
                      <td className="px-4 py-2.5">{r.warehouse_name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.branch_name || "—"}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`font-bold text-base ${r.qty === 0 ? "text-red-600" : r.status === "منخفض" ? "text-orange-600" : "text-green-600"}`}>
                          {r.qty.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">{r.min_qty > 0 ? r.min_qty : "—"}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge className={
                          r.status === "متاح" ? "bg-green-100 text-green-700 border-0" :
                          r.status === "منخفض" ? "bg-orange-100 text-orange-700 border-0" :
                          "bg-red-100 text-red-700 border-0"
                        }>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}