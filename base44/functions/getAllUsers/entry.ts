import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'ممنوع: غير مصرح' }, { status: 401 });
    }

    // Admins can see all users they are allowed to see by RLS
    // Users with a subscription_id can see all users in their subscription
    // Users without either get nothing
    let users = [];
    
    if (user.role === 'admin') {
      users = await base44.asServiceRole.entities.User.list();
    } else if (user.subscription_id) {
      // Normal users with a subscription_id only see users in their subscription
      users = await base44.asServiceRole.entities.User.filter({
        subscription_id: user.subscription_id
      });
    } else {
      // User has no subscription, return just themselves
      users = [user];
    }
    
    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});