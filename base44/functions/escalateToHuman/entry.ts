import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { contact_name, contact_id, conversation_id, reason, summary } = body || {};

    // إشعار داخلي عاجل لفريق المبيعات
    await base44.asServiceRole.entities.Notification.create({
      title: 'طلب تسليم لفريق المبيعات البشري',
      message: `العميل: ${contact_name || 'غير معروف'}\nالسبب: ${reason || 'طلب العميل التحدث لموظف بشري'}\n${summary ? 'الملخص: ' + summary : ''}\n${conversation_id ? 'المحادثة: ' + conversation_id : ''}`,
      type: 'أخرى',
      is_read: false,
      related_module: 'sales_agent',
      related_id: contact_id || undefined,
    });

    // إرسال بريد لمدراء التطبيق (مستخدمون مسجلون)
    try {
      const users = await base44.asServiceRole.entities.User.list();
      const admins = (users || []).filter((u) => u.role === 'admin' && u.email);
      for (const admin of admins) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: 'طلب متابعة بشرية من وكيل المبيعات سارة',
          body: `مرحباً ${admin.full_name || ''},\n\nطلب العميل "${contact_name || ''}" التحدث لفريق المبيعات البشري.\n\nالسبب: ${reason || 'طلب العميل'}\n${summary ? 'ملخص المحادثة: ' + summary : ''}\n${contact_id ? 'معرف جهة الاتصال: ' + contact_id : ''}\n${conversation_id ? 'معرف المحادثة: ' + conversation_id : ''}\n\nيرجى المتابعة في أقرب وقت.`,
        });
      }
      return Response.json({ ok: true, notified: admins.length });
    } catch (e) {
      return Response.json({ ok: true, notified: 0, email_error: e.message });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});