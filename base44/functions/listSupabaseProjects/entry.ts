import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');

    const response = await fetch('https://api.supabase.com/v1/projects', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `Supabase API error: ${response.status} ${errText}` }, { status: response.status });
    }

    const projects = await response.json();

    const result = (projects || []).map((p: any) => ({
      id: p.id,
      ref: p.ref,
      name: p.name,
      status: p.status,
      region: p.region,
      organization_id: p.organization_id,
      created_at: p.created_at,
      database: p.database,
    }));

    return Response.json({ projects: result, count: result.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});