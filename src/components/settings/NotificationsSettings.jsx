import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bell, AlertTriangle, Package, BarChart3, Play } from "lucide-react";

function ToggleRow({ label, desc, value, onChange, icon: Icon, color }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-xl border transition-all",
      value ? "border-primary/40 bg-primary/5" : "bg-muted/20"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {value && <Badge className="bg-green-100 text-green-700 text-xs">مفعّل</Badge>}
        <button
          onClick={() => onChange(!value)}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            value ? "bg-primary" : "bg-gray-200"
          )}
        >
          <span className={cn(
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
            value ? "translate-x-1" : "translate-x-4"
          )} />
        </button>
      </div>
    </div>
  );
}

export default function NotificationsSettings({ settings = {}, update }) {
  const [running, setRunning] = useState(false);

  const ns = {
    overdueInvoices: settings.overdueInvoices ?? false,
    lowStock: settings.lowStock ?? false,
    dailySummary: settings.dailySummary ?? false,
  };

  const runOverdueCheck = async () => {
    setRunning(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const invoices = await base44.entities.Invoice.list("-date", 200);

      // فواتير آجل غير مسددة بالكامل ومتأخرة
      const overdue = invoices.filter(inv =>
        inv.payment_method === "آجل" &&
        inv.status === "مرحّلة" &&
        (inv.remaining_amount || 0) > 0 &&
        inv.date && inv.date < today
      );

      if (overdue.length === 0) {
        toast.info("لا توجد فواتير متأخرة حالياً");
        setRunning(false);
        return;
      }

      // تحقق من الإشعارات الموجودة لتجنب التكرار
      const existing = await base44.entities.Notification.list("-created_date", 100);
      const existingSourceIds = new Set(existing.map(n => n.related_module));

      let created = 0;
      for (const inv of overdue) {
        const key = `overdue-${inv.id}`;
        if (existingSourceIds.has(key)) continue;
        await base44.entities.Notification.create({
          title: `فاتورة متأخرة: ${inv.invoice_number}`,
          message: `فاتورة ${inv.pattern_type || ""} للعميل ${inv.client_name || "—"} بمبلغ متبقٍ ${inv.remaining_amount} — تاريخ الفاتورة: ${inv.date}`,
          type: "فاتورة مستحقة",
          related_module: key,
          is_read: false,
          trigger_date: today,
        });
        created++;
      }

      if (created > 0) toast.success(`تم إنشاء ${created} تنبيه للفواتير المتأخرة`);
      else toast.info("تنبيهات الفواتير المتأخرة موجودة بالفعل");
    } catch (e) {
      toast.error("حدث خطأ: " + e.message);
    }
    setRunning(false);
  };

  const runLowStockCheck = async () => {
    setRunning(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const alerts = await base44.entities.StockAlert.filter({ is_active: true });

      if (alerts.length === 0) {
        toast.info("لا توجد تنبيهات مخزون مضبوطة، أضفها من إدارة المخزون");
        setRunning(false);
        return;
      }

      const existing = await base44.entities.Notification.list("-created_date", 100);
      const existingSourceIds = new Set(existing.map(n => n.related_module));

      let created = 0;
      for (const alert of alerts) {
        const key = `lowstock-${alert.product_id}-${alert.warehouse_id}`;
        if (existingSourceIds.has(key)) continue;
        await base44.entities.Notification.create({
          title: `تنبيه مخزون منخفض: ${alert.product_name || alert.product_id}`,
          message: `الكمية في ${alert.warehouse_name || "المستودع"} أقل من الحد الأدنى (${alert.min_quantity})`,
          type: "تنبيه مخزون",
          related_module: key,
          is_read: false,
          trigger_date: today,
        });
        created++;
      }

      if (created > 0) toast.success(`تم إنشاء ${created} تنبيه للمخزون المنخفض`);
      else toast.info("تنبيهات المخزون موجودة بالفعل");
    } catch (e) {
      toast.error("حدث خطأ: " + e.message);
    }
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b border-border mb-4">
        <h3 className="text-base font-semibold">الإشعارات والتنبيهات</h3>
        <p className="text-sm text-muted-foreground mt-0.5">تفعيل التنبيهات التلقائية للنظام</p>
      </div>

      <div className="space-y-3">
        <ToggleRow
          label="تنبيهات الفواتير المتأخرة"
          desc="إشعار تلقائي عند وجود فواتير آجل لم تُسدَّد بعد تاريخ إصدارها"
          value={ns.overdueInvoices}
          onChange={v => update("notifications", "overdueInvoices", v)}
          icon={Bell}
          color="bg-red-500"
        />
        {ns.overdueInvoices && (
          <div className="mr-4 mr-12 flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-xs text-red-700 flex-1">سيتم فحص الفواتير الآجل غير المسددة وإنشاء إشعار لكل فاتورة متأخرة.</p>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5 shrink-0" onClick={runOverdueCheck} disabled={running}>
              <Play className="h-3.5 w-3.5" />
              فحص الآن
            </Button>
          </div>
        )}

        <ToggleRow
          label="تنبيهات المخزون المنخفض"
          desc="إشعار عند انخفاض كمية صنف عن الحد الأدنى المحدد في إدارة التنبيهات"
          value={ns.lowStock}
          onChange={v => update("notifications", "lowStock", v)}
          icon={Package}
          color="bg-orange-500"
        />
        {ns.lowStock && (
          <div className="mr-12 flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
            <Package className="h-4 w-4 text-orange-600 shrink-0" />
            <p className="text-xs text-orange-700 flex-1">سيتم فحص تنبيهات المخزون المضبوطة وإنشاء إشعار لكل صنف منخفض.</p>
            <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-1.5 shrink-0" onClick={runLowStockCheck} disabled={running}>
              <Play className="h-3.5 w-3.5" />
              فحص الآن
            </Button>
          </div>
        )}

        <ToggleRow
          label="ملخص يومي"
          desc="عرض ملخص بأبرز العمليات والتنبيهات عند فتح النظام يومياً"
          value={ns.dailySummary}
          onChange={v => update("notifications", "dailySummary", v)}
          icon={BarChart3}
          color="bg-blue-500"
        />
      </div>

      <div className="pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          الإشعارات المنشأة ستظهر في <strong>مركز الإشعارات</strong> من القائمة الجانبية.
        </p>
      </div>
    </div>
  );
}