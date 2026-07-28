import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'ممنوع: غير مصرح' }, { status: 401 });
    }

    // Only process if user lacks a subscription
    if (currentUser.subscription_id) {
      return Response.json({ message: 'المستخدم مرتبط باشتراك بالفعل' });
    }

    // Find pending invites for this user's email
    const invites = await base44.asServiceRole.entities.PendingInvite.filter({ email: currentUser.email });
    
    if (invites && invites.length > 0) {
      const invite = invites[0];

      // Validate seat limit before accepting the invite
      const subscription = await base44.asServiceRole.entities.Subscription.filter({ id: invite.subscription_id });
      if (subscription && subscription.length > 0) {
        const sub = subscription[0];
        const maxUsers = sub.max_users || 999;
        // Count current users in this subscription
        const allUsers = await base44.asServiceRole.entities.User.filter({ subscription_id: invite.subscription_id });
        const currentCount = allUsers ? allUsers.length : 0;
        if (currentCount >= maxUsers) {
          return Response.json({ error: 'تم الوصول إلى الحد الأقصى لعدد المستخدمين في هذا الاشتراك' }, { status: 403 });
        }
      }

      // Use service role to update user so we can change the role
      await base44.asServiceRole.entities.User.update(currentUser.id, {
        subscription_id: invite.subscription_id,
        role: invite.role || "user"
      });

      // Delete the invite
      await base44.asServiceRole.entities.PendingInvite.delete(invite.id);
      
      return Response.json({ success: true, subscription_id: invite.subscription_id, role: invite.role || "user" });
    }

    // No pending invite: activate an auto free 15-day trial for self-registered users.
    // Skip platform admins (role === 'admin' with no subscription) — they get full access without a subscription.
    if (currentUser.role !== 'admin') {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 15);

      const trial = await base44.asServiceRole.entities.Subscription.create({
        client_name: currentUser.full_name || currentUser.email,
        plan: 'free_trial',
        features: {
          accounting: true, invoices: true, vouchers: true, warehouses: true,
          costs: true, branches: true, reports: true, financial: true, users: true,
        },
        max_users: 1,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_active: true,
        is_trial: true,
        notes: 'تجربة مجانية تلقائية لمدة 15 يومًا — غير قابلة للتجديد',
      });

      await base44.asServiceRole.entities.User.update(currentUser.id, {
        subscription_id: trial.id,
        role: 'admin',
      });

      await base44.asServiceRole.entities.Notification.create({
        title: `تم تفعيل تجربتك المجانية 🎁`,
        message: `مرحباً ${currentUser.full_name || ''}! تم تفعيل باقة تجريبية مجانية كاملة لمدة 15 يومًا. تنتهي في ${endDate.toISOString().split('T')[0]}. هذه الباقة غير قابلة للتجديد.`,
        type: 'ترحيب',
        related_module: 'الاشتراكات',
        related_id: trial.id,
        is_read: false,
        trigger_date: startDate.toISOString().split('T')[0],
        target_user_id: currentUser.id,
      });

      return Response.json({ success: true, subscription_id: trial.id, role: 'admin', trial: true });
    }

    return Response.json({ message: 'لا توجد دعوات معلقة' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});