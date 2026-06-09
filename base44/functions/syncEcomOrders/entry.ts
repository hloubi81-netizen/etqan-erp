import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const WIX_CONNECTOR_ID = "6a28780b122f1605de605504";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let addedCount = 0;
        let errors = [];

        // 1. Fetch from Wix
        try {
            const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(WIX_CONNECTOR_ID);
            const wixRes = await fetch("https://www.wixapis.com/stores/v3/orders/query", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    query: { paging: { limit: 20 } }
                })
            });
            
            if (wixRes.ok) {
                const wixData = await wixRes.json();
                for (const order of (wixData.orders || [])) {
                    const wixItems = (order.lineItems || []).map(li => ({
                        sku: li.physicalProperties?.sku || li.catalogReference?.catalogItemId || "",
                        name: li.productName?.original || li.itemName || "",
                        quantity: li.quantity || 0,
                        price: parseFloat(li.price?.amount) || 0
                    }));
                    await saveOrderLocally(base44, "Wix", order.number || order.id, order.buyerInfo?.contactId || "عميل Wix", order.totals?.total, order.currency, mapWixStatus(order.status), wixItems, user.id);
                    addedCount++;
                }
            }
        } catch (e) {
            // Log Wix error but continue to others
            console.log("Wix sync skip:", e.message);
        }

        // 2. Fetch from Shopify and WooCommerce (Iterate over custom setups)
        const connections = await base44.asServiceRole.entities.StoreConnection.list();
        const userConnections = connections.filter(c => c.created_by_id === user.id && c.status === "متصل");

        for (const conn of userConnections) {
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
                            const shopifyItems = (order.line_items || []).map(li => ({
                                sku: li.sku || "",
                                name: li.title || "",
                                quantity: li.quantity || 0,
                                price: parseFloat(li.price) || 0
                            }));
                            await saveOrderLocally(base44, "Shopify", order.order_number?.toString() || order.id?.toString(), `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || "عميل Shopify", parseFloat(order.total_price), order.currency, mapShopifyStatus(order.financial_status, order.fulfillment_status), shopifyItems, user.id);
                            addedCount++;
                        }
                    }
                } catch(e) {
                    errors.push(`Shopify: ${e.message}`);
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
                            const wooItems = (order.line_items || []).map(li => ({
                                sku: li.sku || "",
                                name: li.name || "",
                                quantity: li.quantity || 0,
                                price: parseFloat(li.price) || 0
                            }));
                            await saveOrderLocally(base44, "WooCommerce", order.number || order.id?.toString(), `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || "عميل WooCommerce", parseFloat(order.total), order.currency, mapWooStatus(order.status), wooItems, user.id);
                            addedCount++;
                        }
                    }
                } catch(e) {
                    errors.push(`WooCommerce: ${e.message}`);
                }
            }
        }
        
        return Response.json({ success: true, count: addedCount, errors });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function saveOrderLocally(base44, platform, orderNumber, customerName, total, currency, status, items, createdBy) {
    // Check if order already exists
    const existing = await base44.asServiceRole.entities.EcomOrder.filter({ order_number: orderNumber, platform, created_by_id: createdBy });
    
    if (existing && existing.length > 0) {
        // Update status
        await base44.asServiceRole.entities.EcomOrder.update(existing[0].id, {
            status,
            total_amount: total,
            customer_name: customerName,
            items: items || []
        });
    } else {
        // Create new
        await base44.asServiceRole.entities.EcomOrder.create({
            order_number: orderNumber,
            platform,
            customer_name: customerName,
            total_amount: total,
            currency: currency || "ر.س",
            status: status,
            order_date: new Date().toISOString().split('T')[0],
            items: items || [],
            inventory_processed: false,
            created_by_id: createdBy
        });
    }
}

function mapWixStatus(status) {
    if (!status) return "جديد";
    if (status === "FULFILLED") return "مكتمل";
    if (status === "CANCELED") return "ملغى";
    return "قيد التجهيز";
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