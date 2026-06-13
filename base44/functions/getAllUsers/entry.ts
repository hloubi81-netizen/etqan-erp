import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'ممنوع: غير مصرح' }, { status: 401 });
    }

    // Super admin: admin WITHOUT a subscription_id sees everyone
    if (user.role === 'admin' && !user.subscription_id) {
      const users = await base44.asServiceRole.entities.User.list();
      return Response.json({ users });
    }

    // Admin WITH subscription_id: sees only users within their own subscription
    if (user.role === 'admin' && user.subscription_id) {
      const subUsers = await base44.asServiceRole.entities.User.filter({
        subscription_id: user.subscription_id,
      });
      return Response.json({ users: subUsers });
    }

    // Non-admin: see themselves + users they invited within their subscription
    let users = [user];

    if (user.subscription_id) {
      const myInvites = await base44.asServiceRole.entities.PendingInvite.filter({
        subscription_id: user.subscription_id,
        created_by_id: user.id,
      });

      const invitedEmails = myInvites.map(inv => inv.email);

      if (invitedEmails.length > 0) {
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