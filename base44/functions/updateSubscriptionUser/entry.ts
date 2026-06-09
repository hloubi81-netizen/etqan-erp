import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'ممنوع: غير مصرح' }, { status: 401 });
    }

    const { userId, updates } = await req.json();

    if (!userId || !updates) {
      return Response.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    // Admins can update any user
    if (currentUser.role === 'admin') {
      await base44.asServiceRole.entities.User.update(userId, updates);
      return Response.json({ success: true });
    }

    // Regular users can only update users within their own subscription
    if (!currentUser.subscription_id) {
      return Response.json({ error: 'ليس لديك اشتراك صالح للقيام بهذا الإجراء' }, { status: 403 });
    }

    // Fetch the target user to verify they belong to the same subscription
    const targetUser = await base44.asServiceRole.entities.User.get(userId);
    
    if (!targetUser || targetUser.subscription_id !== currentUser.subscription_id) {
      return Response.json({ error: 'لا يمكنك تعديل هذا المستخدم' }, { status: 403 });
    }

    // Prevent regular users from making someone an admin or making themselves an admin
    if (updates.role === 'admin') {
      return Response.json({ error: 'لا يمكنك ترقية مستخدم إلى مدير' }, { status: 403 });
    }

    await base44.asServiceRole.entities.User.update(userId, updates);
    return Response.json({ success: true });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});