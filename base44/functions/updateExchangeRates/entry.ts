import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const sr = base44.asServiceRole;

        const currencies = await sr.entities.Currency.list();
        const localCurrency = currencies.find(c => c.is_local);

        if (!localCurrency?.symbol) {
            return Response.json({ skipped: "لا توجد عملة محلية معرّفة في النظام" });
        }

        const foreign = currencies.filter(c => !c.is_local && c.symbol);
        if (!foreign.length) {
            return Response.json({ updated: 0, message: "لا توجد عملات أجنبية" });
        }

        // Fetch live rates against the local currency (free, no API key needed)
        const baseSymbol = localCurrency.symbol.toUpperCase().trim();
        const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(baseSymbol)}`);

        if (!res.ok) {
            return Response.json({ error: "فشل في جلب أسعار الصرف من المصدر" }, { status: 502 });
        }

        const data = await res.json();
        const rates = data.rates || {};

        let updated = 0;
        const results = [];

        for (const cur of foreign) {
            const symbol = cur.symbol.toUpperCase().trim();
            const apiRate = rates[symbol];

            if (apiRate && apiRate > 0) {
                // apiRate = how many foreign units per 1 local unit
                // exchange_rate in system = how many local units per 1 foreign unit
                const newRate = Math.round((1 / apiRate) * 10000) / 10000;
                await sr.entities.Currency.update(cur.id, { exchange_rate: newRate });
                results.push({ symbol, rate: newRate });
                updated++;
            }
        }

        return Response.json({ success: true, base: baseSymbol, updated, results });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});