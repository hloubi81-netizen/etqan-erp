import { base44 } from "@/api/base44Client";

/**
 * محرك المخزون - خصم وإضافة الكميات تلقائياً
 */

/**
 * خصم الكميات المباعة من المخزون عند ترحيل فاتورة مبيعات
 * يستخدم InventoryCount كسجل لتسوية المخزون
 */
export async function deductSalesInventory(invoice) {
  const items = (invoice.items || []).filter(i => i.product_id && i.quantity > 0);
  if (!items.length || !invoice.warehouse_id) return { success: true, warnings: [] };

  const warnings = [];

  // جلب جميع المنتجات دفعة واحدة
  const productIds = [...new Set(items.map(i => i.product_id))];
  const allProducts = await base44.entities.Product.list().catch(() => []);
  const productMap = Object.fromEntries(allProducts.map(p => [p.id, p]));

  // حساب حركة المخزون الحالية لكل منتج في المستودع
  const [allInvoices, allTransfers] = await Promise.all([
    base44.entities.Invoice.filter({ status: "مرحّلة" }).catch(() => []),
    base44.entities.StockTransfer.list().catch(() => []),
  ]);

  for (const item of items) {
    const prod = productMap[item.product_id];
    if (!prod) continue;

    const baseQty = (item.quantity || 0) * (item.conversion_factor || 1);

    // حساب الكمية الحالية في المستودع
    const currentStock = calcCurrentStock(item.product_id, invoice.warehouse_id, allInvoices, allTransfers);

    if (currentStock < baseQty) {
      warnings.push(`تحذير: صنف "${item.product_name || prod.name}" - الكمية المتاحة ${currentStock.toFixed(2)} أقل من المطلوبة ${baseQty.toFixed(2)}`);
    }
  }

  // إنشاء سجل حركة مخزون (تسوية جردية)
  try {
    const countNumber = `SALE-${invoice.invoice_number}-${Date.now()}`;
    await base44.entities.InventoryCount.create({
      count_number: countNumber,
      date: invoice.date,
      warehouse_id: invoice.warehouse_id,
      warehouse_name: invoice.warehouse_name || "",
      type: "تسوية جردية",
      status: "معتمد",
      notes: `ترحيل تلقائي من فاتورة مبيعات ${invoice.invoice_number} - ${invoice.client_name || ""}`,
      items: items.map(item => {
        const baseQty = (item.quantity || 0) * (item.conversion_factor || 1);
        const currentStock = calcCurrentStock(item.product_id, invoice.warehouse_id, allInvoices, allTransfers);
        return {
          product_id: item.product_id,
          product_name: item.product_name || "",
          book_quantity: currentStock,
          actual_quantity: Math.max(0, currentStock - baseQty),
          surplus: 0,
          deficit: baseQty,
        };
      }),
    });
  } catch (e) {
    console.error("خطأ في تسجيل حركة المخزون:", e);
  }

  return { success: true, warnings };
}

/**
 * إضافة الكميات للمخزون عند ترحيل فاتورة مشتريات
 */
export async function addPurchaseInventory(invoice) {
  const items = (invoice.items || []).filter(i => i.product_id && i.quantity > 0);
  if (!items.length || !invoice.warehouse_id) return { success: true };

  const [allInvoices, allTransfers] = await Promise.all([
    base44.entities.Invoice.filter({ status: "مرحّلة" }).catch(() => []),
    base44.entities.StockTransfer.list().catch(() => []),
  ]);

  try {
    const countNumber = `PURCH-${invoice.invoice_number}-${Date.now()}`;
    await base44.entities.InventoryCount.create({
      count_number: countNumber,
      date: invoice.date,
      warehouse_id: invoice.warehouse_id,
      warehouse_name: invoice.warehouse_name || "",
      type: "تسوية جردية",
      status: "معتمد",
      notes: `إضافة مخزون من فاتورة مشتريات ${invoice.invoice_number} - ${invoice.client_name || ""}`,
      items: items.map(item => {
        const baseQty = (item.quantity || 0) * (item.conversion_factor || 1);
        const currentStock = calcCurrentStock(item.product_id, invoice.warehouse_id, allInvoices, allTransfers);
        return {
          product_id: item.product_id,
          product_name: item.product_name || "",
          book_quantity: currentStock,
          actual_quantity: currentStock + baseQty,
          surplus: baseQty,
          deficit: 0,
        };
      }),
    });
  } catch (e) {
    console.error("خطأ في تسجيل حركة المخزون:", e);
  }

  return { success: true };
}

/**
 * حساب الكمية الحالية لمنتج في مستودع معين
 * بناءً على فواتير المبيعات والمشتريات المرحّلة والتحويلات
 */
export function calcCurrentStock(productId, warehouseId, allInvoices, allTransfers) {
  let qty = 0;

  for (const inv of allInvoices) {
    const items = (inv.items || []).filter(i => i.product_id === productId);
    for (const item of items) {
      const baseQty = (item.quantity || 0) * (item.conversion_factor || 1);
      if (inv.pattern_type?.includes("مشتريات") && inv.warehouse_id === warehouseId) {
        qty += baseQty;
      } else if (inv.pattern_type?.includes("مبيعات") && inv.warehouse_id === warehouseId) {
        qty -= baseQty;
      } else if (inv.pattern_type?.includes("مرتجع مبيعات") && inv.warehouse_id === warehouseId) {
        qty += baseQty;
      } else if (inv.pattern_type?.includes("مرتجع مشتريات") && inv.warehouse_id === warehouseId) {
        qty -= baseQty;
      }
    }
  }

  for (const tr of allTransfers) {
    const items = (tr.items || []).filter(i => i.product_id === productId);
    for (const item of items) {
      const baseQty = (item.quantity || 0) * (item.conversion_factor || 1);
      if (tr.from_warehouse_id === warehouseId) qty -= baseQty;
      if (tr.to_warehouse_id === warehouseId)   qty += baseQty;
    }
  }

  return Math.max(0, qty);
}

/**
 * جلب الكميات المتاحة لجميع منتجات مستودع معين
 */
export async function getWarehouseStock(warehouseId) {
  const [allInvoices, allTransfers, allProducts] = await Promise.all([
    base44.entities.Invoice.filter({ status: "مرحّلة" }).catch(() => []),
    base44.entities.StockTransfer.list().catch(() => []),
    base44.entities.Product.list().catch(() => []),
  ]);

  return allProducts.map(p => ({
    ...p,
    available_qty: calcCurrentStock(p.id, warehouseId, allInvoices, allTransfers),
  }));
}