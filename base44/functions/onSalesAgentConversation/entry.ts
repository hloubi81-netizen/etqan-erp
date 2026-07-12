import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { event, message, app_user } = body || {};

    if (event?.type !== 'conversation_started') {
      return Response.json({ ok: true, skipped: true });
    }

    const previewText = (message?.text || '').slice(0, 200);

    await base44.asServiceRole.entities.Notification.create({
      title: 'محادثة جديدة مع وكيل المبيعات سارة',
      message: message?.text
        ? `رسالة جديدة: ${previewText}`
        : 'بدأ عميل محتمل محادثة جديدة عبر واتساب',
      type: 'أخرى',
      is_read: false,
      related_module: 'sales_agent',
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});