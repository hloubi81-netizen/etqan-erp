import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const CONNECTOR_ID = "6a2f820e9d36c7b03419cd81";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const meta = body.data?._provider_meta || {};
    const state = meta['x-goog-resource-state'];
    if (state === 'sync') return Response.json({ status: 'sync_ack' });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Load sync token
    const existing = await base44.asServiceRole.entities.SyncState.filter({ provider: "googlecalendar" });
    const syncRecord = existing.length > 0 ? existing[0] : null;

    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100';
    if (syncRecord?.sync_token) {
      url += `&syncToken=${syncRecord.sync_token}`;
    } else {
      url += '&timeMin=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    let res = await fetch(url, { headers: authHeader });
    if (res.status === 410) {
      url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100'
        + '&timeMin=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      res = await fetch(url, { headers: authHeader });
    }
    if (!res.ok) return Response.json({ status: 'api_error', code: res.status });

    const allItems = [];
    let pageData = await res.json();
    let newSyncToken = null;
    while (true) {
      allItems.push(...(pageData.items || []));
      if (pageData.nextSyncToken) newSyncToken = pageData.nextSyncToken;
      if (!pageData.nextPageToken) break;
      const nextRes = await fetch(url + `&pageToken=${pageData.nextPageToken}`, { headers: authHeader });
      if (!nextRes.ok) break;
      pageData = await nextRes.json();
    }

    let processed = 0;
    for (const event of allItems) {
      if (!event.id) continue;

      // Find CRMActivities linked to this calendar event
      const matched = await base44.asServiceRole.entities.CRMActivity.filter({
        calendar_event_id: event.id
      });

      if (matched.length === 0) continue;

      for (const activity of matched) {
        if (event.status === 'cancelled') {
          await base44.asServiceRole.entities.CRMActivity.update(activity.id, {
            status: "ملغي",
            outcome: "مرفوض"
          });
          await base44.asServiceRole.entities.AuditLog.create({
            action: "تعديل",
            entity: "CRMActivity",
            details: `تم إلغاء الاجتماع "${activity.subject || ''}" - حُذف من تقويم جوجل`,
            channel: "أتمتة",
            timestamp: new Date().toISOString(),
            subscription_id: activity.subscription_id || null
          });
        } else {
          const eventData = event.start?.dateTime || event.start?.date;
          if (eventData) {
            const eventDate = new Date(eventData);
            const dateStr = eventDate.toISOString().split('T')[0];
            const timeStr = eventDate.toTimeString().substring(0, 5);

            await base44.asServiceRole.entities.CRMActivity.update(activity.id, {
              date: dateStr,
              time: timeStr,
              subject: event.summary || activity.subject
            });
            await base44.asServiceRole.entities.AuditLog.create({
              action: "تعديل",
              entity: "CRMActivity",
              details: `تم تحديث موعد الاجتماع "${event.summary || activity.subject}" من تقويم جوجل - ${dateStr} ${timeStr}`,
              channel: "أتمتة",
              timestamp: new Date().toISOString(),
              subscription_id: activity.subscription_id || null
            });
          }
        }
        processed++;
      }
    }

    // Save sync token
    if (newSyncToken) {
      if (syncRecord) {
        await base44.asServiceRole.entities.SyncState.update(syncRecord.id, { sync_token: newSyncToken });
      } else {
        await base44.asServiceRole.entities.SyncState.create({ sync_token: newSyncToken, provider: "googlecalendar" });
      }
    }

    return Response.json({ status: 'success', processed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});