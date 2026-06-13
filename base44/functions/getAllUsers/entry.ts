import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'ممنوع: غير مصرح' }, { status: 401 });
    }

    // Admins see all users in the app
    if (user.role === 'admin') {
      const users = await base44.asServiceRole.entities.User.list();
      return Response.json({ users });
    }

    // Non-admin: see themselves + users they invited (via PendingInvite) within their subscription
    let users = [user];

    if (user.subscription_id) {
      // Get invites created by this user within their subscription
      const myInvites = await base44.asServiceRole.entities.PendingInvite.filter({
        subscription_id: user.subscription_id,
        created_by_id: user.id,
      });

      const invitedEmails = myInvites.map(inv => inv.email);

      if (invitedEmails.length > 0) {
        // Get users whose emails match the invited list
        const allSubUsers = await base44.asServiceRole.entities.User.filter({
          subscription_id: user.subscription_id,
        });

        const invitedUsers = allSubUsers.filter(u =>
          u.id !== user.id && invitedEmails.includes(u.email)
        );

        users = [user, ...invitedUsers];
      }
    }

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});