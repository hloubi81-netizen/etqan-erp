import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');

    // Step 1: List projects to get a project ref
    const projectsRes = await fetch('https://api.supabase.com/v1/projects', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const projects = await projectsRes.json();

    if (!projects || projects.length === 0) {
      return Response.json({
        error: 'No Supabase projects found in your workspace. The AuditLog data lives in your Base44 app database, not in Supabase.',
        project_count: 0
      }, { status: 404 });
    }

    // Use the first project
    const projectRef = projects[0].ref;

    // Step 2: Get the service_role key
    const keysRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const keys = await keysRes.json();
    const serviceRoleKey = (keys || []).find((k: any) => k.name === 'service_role')?.api_key;

    if (!serviceRoleKey) {
      return Response.json({ error: 'Could not retrieve service_role key' }, { status: 500 });
    }

    // Step 3: Query AuditLog table via PostgREST
    const queryRes = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/AuditLog?order=created_date.desc&limit=50`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      }
    );

    if (!queryRes.ok) {
      const errText = await queryRes.text();
      return Response.json({ error: `Query failed: ${queryRes.status} ${errText}`, project_ref: projectRef }, { status: queryRes.status });
    }

    const rows = await queryRes.json();
    return Response.json({ data: rows, count: rows.length, project_ref: projectRef });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});