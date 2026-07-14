import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!data) return Response.json({ ok: true });

    const prev = old_data?.status;
    const curr = data.status;

    // Only notify when the status actually changed (or on creation)
    if (prev === curr && event?.type === 'update') {
      return Response.json({ ok: true, skipped: true });
    }

    const tracking = data.tracking_number || "";
    const label = `الشحنة ${tracking}`;
    const msg = `تم تحديث حالة ${label} إلى: ${curr}.`;
    const today = new Date().toISOString().split("T")[0];

    // Email the recipient if an email is present
    if (data.recipient_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: data.recipient_email,
          subject: `تحديث حالة الشحنة ${tracking}`,
          body: `مرحباً ${data.recipient_name || ""},\n\n${msg}\n\nشكراً لاستخدامكم خدماتنا.`,
        });
      } catch (_) { /* ignore email delivery errors */ }
    }

    // In-app notification
    try {
      await base44.asServiceRole.entities.Notification.create({
        title: "تحديث حالة شحنة",
        message: msg,
        type: "تذكير",
        related_module: "الشحن",
        related_id: data.id,
        is_read: false,
        trigger_date: today,
      });
    } catch (_) { /* ignore */ }

    return Response.json({ ok: true, notified: !!data.recipient_email, status: curr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});