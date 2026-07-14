import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = (body.phone || "").trim();
    if (!phone) return Response.json({ error: 'phone required' }, { status: 400 });

    const base44 = createClientFromRequest(req);

    const settings = (await base44.asServiceRole.entities.PointsSettings.list())[0] || null;

    let client = null;
    const exact = await base44.asServiceRole.entities.LoyaltyPoints.filter({ client_phone: phone }).catch(() => []);
    if (exact.length) {
      client = exact[0];
    } else {
      const all = await base44.asServiceRole.entities.LoyaltyPoints.list(null, 1000).catch(() => []);
      client = all.find(c => (c.client_phone || "").includes(phone));
    }
    if (!client) return Response.json({ found: false });

    const transactions = await base44.asServiceRole.entities.PointsTransaction.filter({ loyalty_id: client.id }).catch(() => []);

    let recentInvoices = [];
    try {
      recentInvoices = await base44.asServiceRole.entities.Invoice.filter({ client_name: client.client_name, pattern_type: 'مبيعات' });
    } catch (_) {}

    const s = settings || {};
    const tierDiscount = (tier) => {
      if (tier === "بلاتيني") return s.platinum_discount || 0;
      if (tier === "ذهبي") return s.gold_discount || 0;
      if (tier === "فضي") return s.silver_discount || 0;
      return 0;
    };
    const nextTier = (pts) => {
      if (pts >= (s.platinum_threshold || 5000)) return null;
      if (pts >= (s.gold_threshold || 1500)) return { name: "بلاتيني", threshold: s.platinum_threshold || 5000 };
      if (pts >= (s.silver_threshold || 500)) return { name: "ذهبي", threshold: s.gold_threshold || 1500 };
      return { name: "فضي", threshold: s.silver_threshold || 500 };
    };
    const tier = client.tier || "برونزي";
    const pts = client.available_points || 0;
    const next = nextTier(pts);

    return Response.json({
      found: true,
      client,
      settings: s,
      tier,
      tierDiscount: tierDiscount(tier),
      nextTier: next,
      pointsToNext: next ? Math.max(0, next.threshold - pts) : 0,
      currencyPerPoint: s.currency_per_point || 0,
      transactions: transactions.slice(-20).reverse(),
      recentInvoices: recentInvoices.slice(0, 5),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});