import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    const isNewUser = event.type === 'create';
    const departmentChanged = event.type === 'update' && old_data?.department !== data?.department && data?.department;

    if (!isNewUser && !departmentChanged) {
      return Response.json({ skipped: true });
    }

    let title, message;

    if (isNewUser) {
      title = `مرحباً بك ${data.full_name || data.email}!`;
      message = `تم تفعيل حسابك بنجاح في النظام. يمكنك الآن البدء باستخدام التطبيق.`;
    } else {
      title = `تم تعيينك في قسم جديد`;
      message = `تم تعيينك في قسم "${data.department}". إذا كان لديك أي استفسار تواصل مع المسؤول.`;
    }

    await base44.asServiceRole.entities.Notification.create({
      title,
      message,
      type: isNewUser ? "ترحيب" : "تنبيه",
      related_module: "المستخدمون",
      related_id: data.id,
      is_read: false,
      trigger_date: new Date().toISOString().split("T")[0],
      target_user_id: data.id,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});