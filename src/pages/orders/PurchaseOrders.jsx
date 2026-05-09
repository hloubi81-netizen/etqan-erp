import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, PackageCheck, FileText, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import PurchaseOrdersList from "@/components/orders/PurchaseOrdersList";
import GoodsReceiptList from "@/components/orders/GoodsReceiptList";
import InvoiceMatchingList from "@/components/orders/InvoiceMatchingList";
import DocumentCycleView from "@/components/orders/DocumentCycleView";

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [o, r, inv, p, w] = await Promise.all([
      base44.entities.PurchaseOrder.list("-created_date"),
      base44.entities.GoodsReceipt.list("-created_date"),
      base44.entities.Invoice.filter({ pattern_type: "مشتريات" }, "-created_date"),
      base44.entities.Product.list(),
      base44.entities.Warehouse.list(),
    ]);
    setOrders(o); setReceipts(r); setInvoices(inv); setProducts(p); setWarehouses(w);
    setLoading(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const sharedProps = { orders, receipts, invoices, products, warehouses, onRefresh: loadAll };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">دورة المستندات - المشتريات</h1>
        <p className="text-sm text-muted-foreground">أمر الشراء ← طلب الاستلام ← فاتورة المورد مع التحقق من التطابق</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "أوامر الشراء", value: orders.filter(o => o.type === "أمر شراء").length, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "طلبات الاستلام", value: receipts.length, icon: PackageCheck, color: "text-green-600", bg: "bg-green-50" },
          { label: "فواتير المورد", value: invoices.length, icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "بانتظار المطابقة", value: receipts.filter(r => r.match_status === "غير محدد" || !r.match_status).length, icon: ArrowRightLeft, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-xl p-4 flex items-center gap-3`}>
            <k.icon className={`h-8 w-8 ${k.color}`} />
            <div><p className={`text-2xl font-bold ${k.color}`}>{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="orders" className="gap-1.5"><ShoppingCart className="h-4 w-4" /> أوامر الشراء</TabsTrigger>
          <TabsTrigger value="receipts" className="gap-1.5"><PackageCheck className="h-4 w-4" /> طلبات الاستلام</TabsTrigger>
          <TabsTrigger value="matching" className="gap-1.5"><FileText className="h-4 w-4" /> مطابقة الفواتير</TabsTrigger>
          <TabsTrigger value="cycle" className="gap-1.5"><ArrowRightLeft className="h-4 w-4" /> دورة المستندات</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <PurchaseOrdersList {...sharedProps} />
        </TabsContent>
        <TabsContent value="receipts" className="mt-4">
          <GoodsReceiptList {...sharedProps} />
        </TabsContent>
        <TabsContent value="matching" className="mt-4">
          <InvoiceMatchingList {...sharedProps} />
        </TabsContent>
        <TabsContent value="cycle" className="mt-4">
          <DocumentCycleView {...sharedProps} />
        </TabsContent>
      </Tabs>
    </div>
  );
}