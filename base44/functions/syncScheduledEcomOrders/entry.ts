import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // This is a scheduled task, so we use service role.
        const connections = await base44.asServiceRole.entities.StoreConnection.filter({ status: "متصل" });
        
        let addedCount = 0;
        let errors = [];

        for (const conn of connections) {
            const createdBy = conn.created_by_id;
            
            if (conn.platform === "Shopify" && conn.store_url && conn.access_token) {
                try {
                    const shopifyRes = await fetch(`https://${conn.store_url}/admin/api/2024-01/orders.json?status=any`, {
                        headers: {
                            "X-Shopify-Access-Token": conn.access_token,
                            "Content-Type": "application/json"
                        }
                    });
                    if (shopifyRes.ok) {
                        const shopifyData = await shopifyRes.json();
                        for (const order of (shopifyData.orders || [])) {
                            await saveOrderLocally(base44, "Shopify", order.order_number?.toString() || order.id?.toString(), `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || "عميل Shopify", parseFloat(order.total_price), order.currency, mapShopifyStatus(order.financial_status, order.fulfillment_status), createdBy);
                            addedCount++;
                        }
                    }
                } catch(e) {
                    errors.push(`Shopify (${conn.store_url}): ${e.message}`);
                }
            } else if (conn.platform === "WooCommerce" && conn.store_url && conn.api_key && conn.api_secret) {
                try {
                    const credentials = btoa(`${conn.api_key}:${conn.api_secret}`);
                    const wooRes = await fetch(`${conn.store_url}/wp-json/wc/v3/orders`, {
                        headers: {
                            "Authorization": `Basic ${credentials}`,
                            "Content-Type": "application/json"
                        }
                    });
                    if (wooRes.ok) {
                        const wooData = await wooRes.json();
                        for (const order of wooData) {
                            await saveOrderLocally(base44, "WooCommerce", order.number || order.id?.toString(), `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || "عميل WooCommerce", parseFloat(order.total), order.currency, mapWooStatus(order.status), createdBy);
                            addedCount++;
                        }
                    }
                } catch(e) {
                    errors.push(`WooCommerce (${conn.store_url}): ${e.message}`);
                }
            }
        }
        
        return Response.json({ success: true, count: addedCount, errors });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function saveOrderLocally(base44, platform, orderNumber, customerName, total, currency, status, createdBy) {
    // We need to filter by createdBy to not mix orders between tenants
    const existing = await base44.asServiceRole.entities.EcomOrder.filter({ 
        order_number: orderNumber, 
        platform: platform,
        created_by_id: createdBy 
    });
    
    if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.EcomOrder.update(existing[0].id, {
            status,
            total_amount: total,
            customer_name: customerName
        });
    } else {
        await base44.asServiceRole.entities.EcomOrder.create({
            order_number: orderNumber,
            platform,
            customer_name: customerName,
            total_amount: total,
            currency: currency || "ر.س",
            status: status,
            order_date: new Date().toISOString().split('T')[0],
            created_by_id: createdBy
        });
    }
}

function mapShopifyStatus(financial, fulfillment) {
    if (fulfillment === "fulfilled") return "مكتمل";
    if (financial === "refunded" || financial === "voided") return "ملغى";
    if (financial === "paid") return "قيد التجهيز";
    return "جديد";
}

function mapWooStatus(status) {
    if (status === "completed") return "مكتمل";
    if (status === "cancelled" || status === "refunded" || status === "failed") return "ملغى";
    if (status === "processing") return "قيد التجهيز";
    return "جديد";
}