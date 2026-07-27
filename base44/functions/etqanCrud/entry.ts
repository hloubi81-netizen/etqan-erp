import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const { operation, entity_name, data = {}, query = {}, limit = 50, skip = 0, sort, record_id } = body;

  function ok(d: object) {
    return new Response(JSON.stringify({ success: true, ...d }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  function err(m: string, s = 400) {
    return new Response(JSON.stringify({ success: false, error: m }), {
      status: s,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const entity = (base44.entities as any)[entity_name];
    if (!entity) return err(`Entity ${entity_name} not found`);

    switch (operation) {
      case 'list': {
        const opts: any = { limit, skip };
        if (sort) opts.sort = sort;
        const records = await entity.list(opts).catch((e: any) => []);
        return ok({ count: records.length, records, has_more: records.length === limit });
      }
      case 'get': {
        if (!record_id) return err('record_id required');
        const record = await entity.get(record_id).catch(() => null);
        if (!record) return err('Record not found');
        return ok({ record });
      }
      case 'create': {
        const record = await entity.create(data);
        return ok({ id: record.id, record });
      }
      case 'update': {
        if (!record_id) return err('record_id required');
        const record = await entity.update(record_id, data);
        return ok({ id: record.id, record });
      }
      case 'delete': {
        if (!record_id) return err('record_id required');
        await entity.delete(record_id);
        return ok({ deleted: true, id: record_id });
      }
      case 'filter': {
        const records = await entity.filter(query).catch((e: any) => []);
        return ok({ count: records.length, records });
      }
      default:
        return err(`Unknown operation: ${operation}`);
    }
  } catch (e: any) {
    return err(e.message, 500);
  }
}