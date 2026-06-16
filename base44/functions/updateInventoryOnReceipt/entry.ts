import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * يُشغَّل عند إنشاء طلب استلام بضائع.
 * يُحدّث كميات المنتجات مباشرة في المستودع المحدد.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const receipt = body?.data;
    if (!receipt || !receipt.items?.length) {
      return Response.json({ skipped: true, reason: 'لا توجد أصناف' });
    }

    const warehouseId = receipt.warehouse_id;
    if (!warehouseId) {
      return Response.json({ skipped: true, reason: 'لا يوجد مستودع' });
    }

    const productIds = [...new Set(receipt.items.map(i => i.product_id))];
    const products = await base44.asServiceRole.entities.Product.list();
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const updated = [];

    for (const productId of productIds) {
      const product = productMap[productId];
      if (!product || product.is_service) continue;

      const receiptItems = receipt.items.filter(i => i.product_id === productId);
      let totalReceivedQty = 0;
      let totalValue = 0;

      for (const item of receiptItems) {
        const qty = item.received_quantity || item.quantity || 0;
        totalReceivedQty += qty;
        totalValue += qty * (item.price || 0);
      }

      if (totalReceivedQty <= 0) continue;

      const oldQty = product.available_qty || 0;
      const newQty = oldQty + totalReceivedQty;
      const oldAvgCost = product.avg_purchase_price || product.cost_price || 0;
      const avgPrice = totalValue / totalReceivedQty;

      // المتوسط المرجح = (كمية قديمة × متوسط تكلفة قديم + كمية جديدة × سعر شراء جديد) / إجمالي الكمية
      const newAvgCost = oldQty + totalReceivedQty > 0
        ? ((oldQty * oldAvgCost) + (totalReceivedQty * avgPrice)) / (oldQty + totalReceivedQty)
        : avgPrice;

      const updateData = {
        available_qty: newQty,
        last_stock_update: new Date().toISOString(),
        last_stock_warehouse_id: warehouseId,
        last_purchase_price: avgPrice,
        avg_purchase_price: parseFloat(newAvgCost.toFixed(4)),
        total_cost_value: parseFloat((newQty * newAvgCost).toFixed(2)),
      };

      await base44.asServiceRole.entities.Product.update(productId, updateData);
      updated.push({ productId, product_name: product.name, oldQty, addedQty: totalReceivedQty, newQty, newAvgCost });
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});