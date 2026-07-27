import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];

    // جلب جميع العملاء المحتملين الذين حلّ موعد متابعتهم ولم يتواصلوا مؤخراً
    const leads = await base44.asServiceRole.entities.CRMContact.filter({ type: 'عميل محتمل' }).catch(() => []);

    const due = (leads || []).filter((c) => {
      const followup = c.next_followup_date;
      if (!followup) return false;
      return followup <= today;
    });

    let created = 0;
    for (const c of due) {
      // التحقق من عدم وجود تذكير سابق لنفس اليوم لنفس العميل
      const existing = await base44.asServiceRole.entities.Notification.filter({
        related_module: 'sales_agent',
        related_id: c.id,
        trigger_date: today,
      }).catch(() => []);
      if (existing && existing.length) continue;

      // إنشاء مهمة متابعة في CRM
      await base44.asServiceRole.entities.CRMActivity.create({
        type: 'مهمة',
        contact_id: c.id,
        contact_name: c.name,
        subject: 'متابعة عميل محتمل عبر واتساب',
        description: `تذكير بمتابعة العميل ${c.name} الذي حلّ موعد متابعته (${c.next_followup_date}). يُنصح بإرسال رسالة متابعة ودية عبر واتساب.`,
        date: today,
        status: 'قيد التنفيذ',
        next_action: 'إرسال رسالة متابعة عبر واتساب',
        next_action_date: today,
      });

      // إشعار داخلي لفريق المبيعات
      await base44.asServiceRole.entities.Notification.create({
        title: 'متابعة واتساب مستحقة',
        message: `العميل ${c.name} حلّ موعد متابعته (${c.next_followup_date}). أرسل رسالة متابعة عبر واتساب.`,
        type: 'تذكير',
        is_read: false,
        related_module: 'sales_agent',
        related_id: c.id,
        trigger_date: today,
      });
      created++;
    }

    return Response.json({ ok: true, checked: (leads || []).length, due: due.length, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});