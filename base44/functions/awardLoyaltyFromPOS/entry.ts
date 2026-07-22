import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { event, data, payload_too_large } = body;

    // فقط عند إنشاء جلسة بيع جديدة
    if (event?.type !== 'create') {
      return Response.json({ ok: true, skipped: 'not a create event' });
    }

    // جلب بيانات الجلسة (من الحمولة أو من قاعدة البيانات إذا كانت كبيرة جداً)
    let session = data;
    if (!session && payload_too_large && event.entity_id) {
      const fetched = await base44.asServiceRole.entities.POSSession.filter({ id: event.entity_id });
      session = fetched[0] || null;
    }
    if (!session) {
      return Response.json({ ok: true, skipped: 'no session data' });
    }

    const clientName = (session.client_name || '').trim();
    const sessionStatus = session.status || '';
    const isReturn = !!session.is_return;

    // نتخطى: المرتجعات، الجلسات الملغاة، أو بدون اسم عميل
    if (isReturn) return Response.json({ ok: true, skipped: 'return session' });
    if (sessionStatus === 'ملغاة') return Response.json({ ok: true, skipped: 'cancelled session' });
    if (!clientName) return Response.json({ ok: true, skipped: 'no client name' });

    // جلب إعدادات النقاط
    const settingsList = await base44.asServiceRole.entities.PointsSettings.list().catch(() => []);
    const settings = settingsList[0] || {};
    if (settings.enable_loyalty === false) {
      return Response.json({ ok: true, skipped: 'loyalty disabled' });
    }

    const pointsPerCurrency = settings.points_per_currency || 0;
    if (pointsPerCurrency <= 0) {
      return Response.json({ ok: true, skipped: 'no points rate configured' });
    }

    // البحث عن عميل الولاء بالاسم المطابق
    const exact = await base44.asServiceRole.entities.LoyaltyPoints.filter({ client_name: clientName }).catch(() => []);
    const client = exact[0];
    if (!client) {
      return Response.json({ ok: true, skipped: 'client not found in loyalty' });
    }

    // حساب النقاط المستحقة بناءً على إجمالي الجلسة بالعملة المحلية
    const baseAmount = session.total_local || session.total || 0;
    if (baseAmount <= 0) {
      return Response.json({ ok: true, skipped: 'non-positive amount' });
    }
    const earnedPoints = Math.round(baseAmount * pointsPerCurrency);
    if (earnedPoints <= 0) {
      return Response.json({ ok: true, skipped: 'zero points' });
    }

    // تحديث رصيد العميل
    const newTotal = (client.total_points || 0) + earnedPoints;
    const used = client.used_points || 0;
    const newAvailable = newTotal - used;

    // إعادة حساب المستوى
    const tier = (pts) => {
      if (pts >= (settings.platinum_threshold || 5000)) return 'بلاتيني';
      if (pts >= (settings.gold_threshold || 1500)) return 'ذهبي';
      if (pts >= (settings.silver_threshold || 500)) return 'فضي';
      return 'برونزي';
    };

    await base44.asServiceRole.entities.LoyaltyPoints.update(client.id, {
      total_points: newTotal,
      available_points: newAvailable,
      tier: tier(newTotal),
    });

    // تسجيل حركة النقاط
    await base44.asServiceRole.entities.PointsTransaction.create({
      loyalty_id: client.id,
      client_name: clientName,
      type: 'إضافة',
      points: earnedPoints,
      source: 'POS',
      source_id: session.id || event.entity_id,
      amount: baseAmount,
      notes: `نقاط من جلسة بيع ${session.session_number || ''}`.trim(),
    });

    return Response.json({
      ok: true,
      client: clientName,
      earnedPoints,
      newTotal,
      newAvailable,
      tier: tier(newTotal),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});