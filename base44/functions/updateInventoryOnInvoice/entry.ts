import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * يُشغَّل تلقائياً عند ترحيل فاتورة (تغيير الحالة إلى "مرحّلة").
 * يحسب رصيد المخزون الحالي لكل منتج في المستودع المحدد
 * ثم يُحدّث حقل available_qty على المنتج مباشرةً.
 */

function calcCurrentStock(productId, warehouseId, allInvoices, allTransfers) {
  let qty = 0;

  for (const inv of allInvoices) {
    const items = (inv.items || []).filter(i => i.product_id === productId);
    for (const item of items) {
      const baseQty = (item.quantity || 0) * (item.conversion_factor || 1);
      if (!inv.warehouse_id || inv.warehouse_id !== warehouseId) continue;
      const t = inv.pattern_type || "";
      if (t.includes("مشتريات") && !t.includes("مرتجع")) {
        qty += baseQty;
      } else if (t.includes("مبيعات") && !t.includes("مرتجع")) {
        qty -= baseQty;
      } else if (t.includes("مرتجع مبيعات")) {
        qty += baseQty;
      } else if (t.includes("مرتجع مشتريات")) {
        qty -= baseQty;
      }
    }
  }

  for (const tr of allTransfers) {
    const items = (tr.items || []).filter(i => i.product_id === productId);
    for (const item of items) {
      const baseQty = (item.quantity || 0) * (item.conversion_factor || 1);
      if (tr.from_warehouse_id === warehouseId) qty -= baseQty;
      if (tr.to_warehouse_id === warehouseId) qty += baseQty;
    }
  }

  return Math.max(0, qty);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // يُستدعى من automation أو مباشرةً
    const invoice = body?.data || body?.invoice;

    if (!invoice) {
      return Response.json({ error: 'لا توجد بيانات فاتورة' }, { status: 400 });
    }

    // فقط الفواتير المرحّلة التي لها مستودع وأصناف
    if (invoice.status !== 'مرحّلة') {
      return Response.json({ skipped: true, reason: 'الفاتورة ليست مرحّلة' });
    }

    const warehouseId = invoice.warehouse_id;
    if (!warehouseId) {
      return Response.json({ skipped: true, reason: 'لا يوجد مستودع محدد' });
    }

    const items = (invoice.items || []).filter(i => i.product_id && i.quantity > 0);
    if (!items.length) {
      return Response.json({ skipped: true, reason: 'لا توجد أصناف في الفاتورة' });
    }

    // جلب جميع الفواتير المرحّلة والتحويلات دفعة واحدة
    const [allInvoices, allTransfers] = await Promise.all([
      base44.asServiceRole.entities.Invoice.filter({ status: 'مرحّلة' }),
      base44.asServiceRole.entities.StockTransfer.list(),
    ]);

    const productIds = [...new Set(items.map(i => i.product_id))];
    const updated = [];

    for (const productId of productIds) {
      const newQty = calcCurrentStock(productId, warehouseId, allInvoices, allTransfers);
      await base44.asServiceRole.entities.Product.update(productId, {
        available_qty: newQty,
        last_stock_update: new Date().toISOString(),
        last_stock_warehouse_id: warehouseId,
      }).catch(e => console.error(`خطأ تحديث المنتج ${productId}:`, e.message));

      updated.push({ productId, newQty });
    }

    // فحص تنبيهات المخزون
    const alerts = await base44.asServiceRole.entities.StockAlert.filter({ is_active: true }).catch(() => []);
    const relevantAlerts = alerts.filter(a => a.warehouse_id === warehouseId && productIds.includes(a.product_id));
    const today = new Date().toISOString().split('T')[0];

    for (const alert of relevantAlerts) {
      const currentQty = updated.find(u => u.productId === alert.product_id)?.newQty ?? 0;
      if (currentQty <= alert.min_quantity) {
        const level = currentQty === 0 ? 'نفدت الكمية' : 'وصل للحد الأدنى';
        const alertKey = `${alert.product_id}-${alert.warehouse_id}`;
        const existing = await base44.asServiceRole.entities.Notification.filter({
          type: 'تنبيه مخزون',
          trigger_date: today,
          related_id: alertKey,
        }).catch(() => []);
        if (!existing.length) {
          await base44.asServiceRole.entities.Notification.create({
            title: `⚠️ تنبيه مخزون: ${alert.product_name}`,
            message: `${level} في مستودع "${alert.warehouse_name}" — الكمية الحالية: ${currentQty} | الحد الأدنى: ${alert.min_quantity}`,
            type: 'تنبيه مخزون',
            related_module: 'StockAlert',
            related_id: alertKey,
            is_read: false,
            trigger_date: today,
          }).catch(() => {});
        }
      }
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});