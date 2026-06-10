import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PermissionGuard from "../components/shared/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowRightLeft, BarChart3, Warehouse, Zap, Trash2, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import BranchTransferReport from "@/components/transfers/BranchTransferReport";
import WarehouseStockPanel from "@/components/warehouses/WarehouseStockPanel";
import TransferForm from "@/components/warehouses/TransferForm";
import { calcCurrentStock } from "@/utils/inventoryEngine";

const STATUS_COLORS = {
  "مسودة": "bg-gray-100 text-gray-700",
  "معتمد": "bg-blue-100 text-blue-700",
  "مكتمل": "bg-green-100 text-green-700",
  "ملغى": "bg-red-100 text-red-700",
};

export default function StockTransfers() {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [t, w, b, p] = await Promise.all([
      base44.entities.StockTransfer.list("-date"),
      base44.entities.Warehouse.list(),
      base44.entities.Branch.list(),
      base44.entities.Product.list(),
    ]);
    // inject branch_name into warehouses from branches list
    const warehousesWithBranch = w.map(wh => ({
      ...wh,
      branch_name: wh.branch_name || b.find(br => br.id === wh.branch_id)?.name || "",
    }));
    setTransfers(t); setWarehouses(warehousesWithBranch); setBranches(b); setProducts(p);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(t) {
    setEditing(t);
    setDialogOpen(true);
  }

  async function handleDelete(item) {
    if (!confirm("هل أنت متأكد من حذف هذه المناقلة؟")) return;
    await base44.entities.StockTransfer.delete(item.id);
    toast.success("تم الحذف");
    loadData();
  }

  async function handleComplete(transfer) {
    // إتمام مناقلة معتمدة وتحديث المخزون تلقائياً
    const [allInvoices, allTransfers] = await Promise.all([
      base44.entities.Invoice.filter({ status: "مرحّلة" }).catch(() => []),
      base44.entities.StockTransfer.list().catch(() => []),
    ]);

    const fromItems = (transfer.items || []).map(item => {
      const current = calcCurrentStock(item.product_id, transfer.from_warehouse_id, allInvoices, allTransfers);
      return { product_id: item.product_id, product_name: item.product_name, book_quantity: current, actual_quantity: Math.max(0, current - (item.quantity || 0)), surplus: 0, deficit: item.quantity || 0 };
    });
    const toItems = (transfer.items || []).map(item => {
      const current = calcCurrentStock(item.product_id, transfer.to_warehouse_id, allInvoices, allTransfers);
      return { product_id: item.product_id, product_name: item.product_name, book_quantity: current, actual_quantity: current + (item.quantity || 0), surplus: item.quantity || 0, deficit: 0 };
    });

    await Promise.all([
      base44.entities.StockTransfer.update(transfer.id, { status: "مكتمل" }),
      base44.entities.InventoryCount.create({
        count_number: `TR-OUT-${transfer.transfer_number}-${Date.now()}`,
        date: transfer.date, warehouse_id: transfer.from_warehouse_id, warehouse_name: transfer.from_warehouse_name,
        type: "تسوية جردية", status: "معتمد",
        notes: `مناقلة صادرة #${transfer.transfer_number} → ${transfer.to_warehouse_name}`, items: fromItems,
      }),
      base44.entities.InventoryCount.create({
        count_number: `TR-IN-${transfer.transfer_number}-${Date.now()}`,
        date: transfer.date, warehouse_id: transfer.to_warehouse_id, warehouse_name: transfer.to_warehouse_name,
        type: "تسوية جردية", status: "معتمد",
        notes: `مناقلة واردة #${transfer.transfer_number} ← ${transfer.from_warehouse_name}`, items: toItems,
      }),
    ]);

    toast.success("✅ تم الإتمام وتحديث أرصدة المخزون لحظياً", { duration: 4000 });
    loadData();
  }

  async function changeStatus(transfer, status) {
    await base44.entities.StockTransfer.update(transfer.id, { status });
    toast.success(`تم تغيير الحالة إلى: ${status}`);
    loadData();
  }

  const completed = transfers.filter(t => t.status === "مكتمل").length;
  const pending = transfers.filter(t => t.status === "معتمد" || t.status === "مسودة").length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <PermissionGuard module="warehouses">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              إدارة المخازن والمناقلات
            </h1>
            <p className="text-sm text-muted-foreground">نقل الأصناف بين الفروع والمستودعات مع تحديث الأرصدة تلقائياً</p>
          </div>
          {canCreate("warehouses") && (
            <Button onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" /> مناقلة جديدة
            </Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "إجمالي المناقلات", value: transfers.length, color: "text-blue-600" },
            { label: "مكتملة", value: completed, color: "text-green-600" },
            { label: "قيد التنفيذ", value: pending, color: "text-orange-600" },
          ].map((k, i) => (
            <Card key={i}><CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="list" dir="rtl">
          <TabsList className="flex-wrap">
            <TabsTrigger value="list" className="gap-1.5">
              <ArrowRightLeft className="h-4 w-4" /> المناقلات
            </TabsTrigger>
            <TabsTrigger value="stock" className="gap-1.5">
              <Warehouse className="h-4 w-4" /> أرصدة المخازن
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-1.5">
              <BarChart3 className="h-4 w-4" /> تقرير الحركة
            </TabsTrigger>
          </TabsList>

          {/* ── قائمة المناقلات ── */}
          <TabsContent value="list" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-right font-medium">رقم المناقلة</th>
                        <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                        <th className="px-4 py-3 text-right font-medium">من</th>
                        <th className="px-4 py-3 text-right font-medium">إلى</th>
                        <th className="px-4 py-3 text-right font-medium">الأصناف</th>
                        <th className="px-4 py-3 text-center font-medium">الحالة</th>
                        <th className="px-4 py-3 text-right font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-muted-foreground">
                            <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p>لا توجد مناقلات بعد</p>
                          </td>
                        </tr>
                      ) : transfers.map(t => (
                        <tr key={t.id} className="border-t hover:bg-muted/10">
                          <td className="px-4 py-3 font-mono font-bold">{t.transfer_number}</td>
                          <td className="px-4 py-3 text-muted-foreground">{t.date}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-red-700 text-sm">{t.from_branch_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{t.from_warehouse_name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-green-700 text-sm">{t.to_branch_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{t.to_warehouse_name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {t.items?.slice(0, 2).map((item, i) => (
                                <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {item.product_name} ({item.quantity})
                                </span>
                              ))}
                              {(t.items?.length || 0) > 2 && (
                                <span className="text-xs text-muted-foreground">+{t.items.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={STATUS_COLORS[t.status] || STATUS_COLORS["مسودة"]}>
                              {t.status || "مسودة"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {canEdit("warehouses") && t.status !== "مكتمل" && t.status !== "ملغى" && (
                                <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => openEdit(t)}>تعديل</Button>
                              )}
                              {t.status === "مسودة" && canEdit("warehouses") && (
                                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 text-xs h-7 px-2" onClick={() => changeStatus(t, "معتمد")}>اعتماد</Button>
                              )}
                              {t.status === "معتمد" && canEdit("warehouses") && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1 text-xs h-7 px-2" onClick={() => handleComplete(t)}>
                                  <Zap className="h-3 w-3" /> إتمام
                                </Button>
                              )}
                              {t.status === "مكتمل" && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCheck className="h-3.5 w-3.5" /> مُنفَّذ
                                </span>
                              )}
                              {canDelete("warehouses") && t.status !== "مكتمل" && (
                                <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => handleDelete(t)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── أرصدة المخازن ── */}
          <TabsContent value="stock" className="mt-4">
            <WarehouseStockPanel warehouses={warehouses} />
          </TabsContent>

          {/* ── تقرير الحركة ── */}
          <TabsContent value="report" className="mt-4">
            <BranchTransferReport transfers={transfers} branches={branches} warehouses={warehouses} products={products} />
          </TabsContent>
        </Tabs>

        {/* Transfer Form Dialog */}
        {dialogOpen && (
          <TransferForm
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            editing={editing}
            warehouses={warehouses}
            branches={branches}
            products={products}
            transfersCount={transfers.length}
            onSaved={loadData}
          />
        )}
      </div>
    </PermissionGuard>
  );
}