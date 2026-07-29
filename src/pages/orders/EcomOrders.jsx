import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../../components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShoppingCart, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function EcomOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const data = await base44.entities.EcomOrder.list();
      setOrders(data);
    } catch (error) {
      console.error(error);
      toast.error("فشل في تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  }

  async function syncOrders() {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncEcomOrders", {});
      if (res.data?.success) {
        toast.success("تم مزامنة الطلبات بنجاح");
        await loadOrders();
      } else {
        toast.error(res.data?.error || "سيتم تفعيل المزامنة بعد استكمال ربط المتاجر وإدخال المفاتيح.");
      }
    } catch (error) {
      toast.error("سيتم تفعيل المزامنة بعد استكمال ربط المتاجر من خلال الإعدادات.");
    } finally {
      setSyncing(false);
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "جديد": return "default";
      case "قيد التجهيز": return "warning";
      case "مكتمل": return "success";
      case "ملغى": return "destructive";
      default: return "secondary";
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform) {
      case "Wix": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Shopify": return "bg-green-100 text-green-800 border-green-200";
      case "WooCommerce": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader 
        title="طلبات المتاجر الإلكترونية" 
        subtitle="عرض ومزامنة الطلبات من منصات Wix و Shopify و WooCommerce"
      />

      <div className="flex justify-end mb-4 gap-2">
        <Button asChild variant="outline" className="gap-2">
          <Link to="/ecom-product-mappings">
            <ShoppingCart className="w-4 h-4" />
            ربط المنتجات بالمخزون
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/store-connections">
            <Settings className="w-4 h-4" />
            إعدادات المتاجر
          </Link>
        </Button>
        <Button onClick={syncOrders} disabled={syncing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          مزامنة الطلبات الآن
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right">المنصة</TableHead>
                    <TableHead className="text-right">تاريخ الطلب</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                    <TableHead className="text-right">بالعملة المحلية</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPlatformColor(order.platform)}>
                          {order.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.order_date}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell className="font-bold">
                        {order.total_amount?.toLocaleString()} {order.currency || "ر.س"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.local_amount
                          ? `${order.local_amount.toLocaleString()} ${order.local_currency || ""}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <ShoppingCart className="w-12 h-12 mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-1">لا توجد طلبات حالياً</p>
              <p className="text-sm">يرجى ربط المتاجر الخاصة بك ومن ثم مزامنة الطلبات</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}