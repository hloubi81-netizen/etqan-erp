import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, PackageX, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function AlertsPanel({ lang = "ar" }) {
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState({ overdue: false, stock: false });

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    const today = new Date().toISOString().split("T")[0];
    const [invoices, inventoryCounts] = await Promise.all([
      base44.entities.Invoice.filter({ pattern_type: "مبيعات", status: "مرحّلة" }),
      base44.entities.InventoryCount.filter({ status: "معتمد" }),
    ]);

    // Overdue: sales invoices with remaining amount > 0 and date is past
    const overdue = invoices.filter(
      (inv) => (inv.remaining_amount || 0) > 0 && inv.date < today
    );
    setOverdueInvoices(overdue);

    // Low stock: InventoryCount items with deficit > 0
    const lowStock = [];
    inventoryCounts.forEach((count) => {
      (count.items || []).forEach((item) => {
        if ((item.deficit || 0) > 0) {
          lowStock.push({
            product_name: item.product_name,
            deficit: item.deficit,
            warehouse: count.warehouse_name,
            countId: count.id,
          });
        }
      });
    });
    setLowStockItems(lowStock);
    setLoading(false);
  }

  const totalAlerts = overdueInvoices.length + lowStockItems.length;
  if (loading || totalAlerts === 0) return null;

  const displayedOverdue = showAll.overdue ? overdueInvoices : overdueInvoices.slice(0, 3);
  const displayedStock = showAll.stock ? lowStockItems : lowStockItems.slice(0, 3);

  return (
    <Card className="border-orange-200 bg-orange-50/30 dark:border-orange-900/30 dark:bg-orange-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-base text-orange-700 dark:text-orange-400">
            {lang === "ar" ? "التنبيهات" : "Alerts"}
          </CardTitle>
          <Badge variant="destructive" className="h-5 px-1.5 text-xs">{totalAlerts}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Overdue Receivables */}
        {overdueInvoices.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {lang === "ar" ? "ذمم مدينة متأخرة" : "Overdue Receivables"}
                <span className="mr-1 text-xs font-normal text-muted-foreground">({overdueInvoices.length})</span>
              </span>
            </div>
            <div className="space-y-1.5">
              {displayedOverdue.map((inv) => (
                <Link
                  key={inv.id}
                  to="/invoices/sales"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium">{inv.client_name || "—"}</span>
                    <span className="text-xs text-muted-foreground mr-2">فاتورة {inv.invoice_number}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-red-600">{(inv.remaining_amount || 0).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground block">{inv.date}</span>
                  </div>
                </Link>
              ))}
            </div>
            {overdueInvoices.length > 3 && (
              <button
                className="text-xs text-primary mt-1.5 flex items-center gap-0.5 hover:underline"
                onClick={() => setShowAll((s) => ({ ...s, overdue: !s.overdue }))}
              >
                {showAll.overdue
                  ? (lang === "ar" ? "عرض أقل" : "Show less")
                  : (lang === "ar" ? `عرض الكل (${overdueInvoices.length})` : `Show all (${overdueInvoices.length})`)}
                {showAll.overdue ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>
        )}

        {/* Low Stock */}
        {lowStockItems.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <PackageX className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                {lang === "ar" ? "مواد منخفضة المخزون" : "Low Stock Items"}
                <span className="mr-1 text-xs font-normal text-muted-foreground">({lowStockItems.length})</span>
              </span>
            </div>
            <div className="space-y-1.5">
              {displayedStock.map((item, idx) => (
                <Link
                  key={idx}
                  to="/inventory-count"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium">{item.product_name}</span>
                    <span className="text-xs text-muted-foreground block">{item.warehouse}</span>
                  </div>
                  <Badge variant="outline" className="border-orange-300 text-orange-600 text-xs">
                    {lang === "ar" ? `عجز: ${item.deficit}` : `Deficit: ${item.deficit}`}
                  </Badge>
                </Link>
              ))}
            </div>
            {lowStockItems.length > 3 && (
              <button
                className="text-xs text-primary mt-1.5 flex items-center gap-0.5 hover:underline"
                onClick={() => setShowAll((s) => ({ ...s, stock: !s.stock }))}
              >
                {showAll.stock
                  ? (lang === "ar" ? "عرض أقل" : "Show less")
                  : (lang === "ar" ? `عرض الكل (${lowStockItems.length})` : `Show all (${lowStockItems.length})`)}
                {showAll.stock ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}