import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const event = payload.event || {};
        let order = payload.data;

        // If payload was too large, fetch the order directly
        if (!order && event.entity_id) {
            order = await base44.asServiceRole.entities.EcomOrder.get("EcomOrder", event.entity_id);
        }

        if (!order) {
            return Response.json({ skipped: "no order data" });
        }
        if (order.status === "ملغى") {
            return Response.json({ skipped: "order cancelled" });
        }
        if (order.inventory_processed) {
            return Response.json({ skipped: "already processed" });
        }

        const items = (order.items || []).filter(i => i.quantity > 0);
        if (!items.length) {
            return Response.json({ skipped: "no items in order" });
        }

        const sr = base44.asServiceRole;

        // Get product mappings for this user & platform
        const mappings = await sr.entities.EcomProductMapping.filter({
            created_by_id: order.created_by_id,
            platform: order.platform
        });

        if (!mappings.length) {
            return Response.json({ skipped: "no mappings defined" });
        }

        // Match order items to internal products
        const matched = [];
        for (const item of items) {
            const mapping = mappings.find(m =>
                (m.external_sku && item.sku && m.external_sku.trim() === item.sku.trim()) ||
                (m.external_product_name && item.name && m.external_product_name.trim() === item.name.trim())
            );
            if (mapping) matched.push({ item, mapping });
        }

        if (!matched.length) {
            return Response.json({ skipped: "no items matched mappings" });
        }

        // Fetch posted invoices and transfers for stock calculation (tenant-scoped)
        const [allInvoices, allTransfers] = await Promise.all([
            sr.entities.Invoice.filter({ status: "مرحّلة", created_by_id: order.created_by_id }),
            sr.entities.StockTransfer.filter({ created_by_id: order.created_by_id })
        ]);

        // Group matched items by warehouse
        const byWarehouse = {};
        for (const { item, mapping } of matched) {
            const wid = mapping.warehouse_id;
            if (!byWarehouse[wid]) {
                byWarehouse[wid] = { warehouse_name: mapping.warehouse_name || "", lines: [] };
            }
            byWarehouse[wid].lines.push({ item, mapping });
        }

        // Create inventory deduction record per warehouse
        for (const [wid, group] of Object.entries(byWarehouse)) {
            await sr.entities.InventoryCount.create({
                count_number: `ECOM-${order.platform}-${order.order_number}-${Date.now()}`,
                date: order.order_date || new Date().toISOString().split('T')[0],
                warehouse_id: wid,
                warehouse_name: group.warehouse_name,
                type: "تسوية جردية",
                status: "معتمد",
                notes: `خصم تلقائي من طلب ${order.platform} رقم ${order.order_number} - ${order.customer_name || ""}`,
                created_by_id: order.created_by_id,
                items: group.lines.map(({ item, mapping }) => {
                    const currentStock = calcCurrentStock(mapping.product_id, wid, allInvoices, allTransfers);
                    return {
                        product_id: mapping.product_id,
                        product_name: mapping.product_name || item.name || "",
                        book_quantity: currentStock,
                        actual_quantity: Math.max(0, currentStock - item.quantity),
                        surplus: 0,
                        deficit: item.quantity
                    };
                })
            });
        }

        // Mark order as processed
        await sr.entities.EcomOrder.update(order.id, { inventory_processed: true });

        return Response.json({ success: true, deducted_items: matched.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function calcCurrentStock(productId, warehouseId, allInvoices, allTransfers) {
    let qty = 0;

    for (const inv of allInvoices) {
        const items = (inv.items || []).filter(i => i.product_id === productId);
        for (const item of items) {
            const baseQty = (item.quantity || 0) * (item.conversion_factor || 1);
            if (inv.pattern_type?.includes("مرتجع مبيعات") && inv.warehouse_id === warehouseId) {
                qty += baseQty;
            } else if (inv.pattern_type?.includes("مرتجع مشتريات") && inv.warehouse_id === warehouseId) {
                qty -= baseQty;
            } else if (inv.pattern_type?.includes("مشتريات") && inv.warehouse_id === warehouseId) {
                qty += baseQty;
            } else if (inv.pattern_type?.includes("مبيعات") && inv.warehouse_id === warehouseId) {
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