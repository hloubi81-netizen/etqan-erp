import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');

    // List projects
    const projectsRes = await fetch('https://api.supabase.com/v1/projects', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const projects = await projectsRes.json();

    if (!projects || projects.length === 0) {
      return Response.json({
        error: 'No Supabase projects found in your workspace.',
        project_count: 0
      }, { status: 404 });
    }

    const projectRef = projects[0].ref;

    // Get service_role key
    const keysRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const keys = await keysRes.json();
    const serviceRoleKey = (keys || []).find((k: any) => k.name === 'service_role')?.api_key;

    if (!serviceRoleKey) {
      return Response.json({ error: 'Could not retrieve service_role key' }, { status: 500 });
    }

    // Query pg_catalog for table names and columns
    const sql = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      JOIN information_schema.columns c 
        ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position;
    `;

    const queryRes = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/rpc/`,
      {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    // Fallback: use the /pg endpoint via Supabase Management API to run SQL
    const sqlRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!sqlRes.ok) {
      const errText = await sqlRes.text();
      return Response.json({ 
        error: `Schema query failed: ${sqlRes.status}`, 
        details: errText,
        project_ref: projectRef 
      }, { status: sqlRes.status });
    }

    const result = await sqlRes.json();
    return Response.json({ 
      project_ref: projectRef, 
      project_name: projects[0].name,
      schema: result 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});