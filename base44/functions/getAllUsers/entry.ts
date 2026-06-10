import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'ممنوع: غير مصرح' }, { status: 401 });
    }

    // Only admins can see the users list
    if (user.role !== 'admin') {
      return Response.json({ users: [user] });
    }

    // Admins only see all users in this app
    const users = await base44.asServiceRole.entities.User.list();
    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});