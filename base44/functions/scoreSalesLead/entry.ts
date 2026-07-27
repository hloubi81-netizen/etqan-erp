import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      contact_id,
      company_size,
      budget_indicated,
      urgency,
      decision_maker,
      requested_demo,
      notes,
    } = body || {};

    if (!contact_id) {
      return Response.json({ error: 'contact_id مطلوب' }, { status: 400 });
    }

    // تقييم العميل المحتمل من 0 إلى 100
    let score = 0;
    const reasons = [];

    if (company_size) {
      const s = String(company_size).toLowerCase();
      if (s.includes('50') || s.includes('كبير') || s.includes('متوسط') || s.includes('large') || s.includes('medium')) {
        score += 25; reasons.push('حجم شركة كبير/متوسط');
      } else if (s.includes('صغير') || s.includes('startup') || s.includes('small')) {
        score += 12; reasons.push('حجم شركة صغير');
      }
    }
    if (budget_indicated) { score += 20; reasons.push('ميزانية مخصصة'); }
    if (urgency) { score += 20; reasons.push('حاجة عاجلة'); }
    if (decision_maker) { score += 20; reasons.push('صانع قرار'); }
    if (requested_demo) { score += 15; reasons.push('طلب عرض توضيحي'); }

    const rating = score >= 60 ? 'ساخن 🔥' : score >= 35 ? 'دافئ' : 'بارد ❄️';

    const existing = await base44.entities.CRMContact.get(contact_id).catch(() => null);
    const prevNotes = existing?.notes || '';
    const scoreLine = `[تقييم آلي: ${rating} (${score}/100) — ${reasons.join('، ') || 'لا إشارات'}]`;
    const newNotes = prevNotes ? `${prevNotes}\n${scoreLine}` : scoreLine;

    await base44.entities.CRMContact.update(contact_id, {
      rating,
      notes: notes ? `${newNotes}\n${notes}` : newNotes,
    });

    return Response.json({ ok: true, contact_id, score, rating, reasons });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});