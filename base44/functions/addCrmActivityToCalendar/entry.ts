import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = "6a2f820e9d36c7b03419cd81";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is called by entity automation on CRMActivity create
    const body = await req.json();
    const activity = body.data;

    // Only sync meetings and tasks that have a date
    if (!activity || !activity.date) {
      return Response.json({ status: "skipped", reason: "no_date" });
    }

    const allowedTypes = ["اجتماع", "مهمة"];
    if (!allowedTypes.includes(activity.type)) {
      return Response.json({ status: "skipped", reason: "not_meeting_or_task" });
    }

    // Get the app user's Google Calendar connection
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    // Calculate start and end times
    let startDateTime, endDateTime;

    if (activity.time) {
      startDateTime = `${activity.date}T${activity.time}:00`;
    } else {
      startDateTime = `${activity.date}T09:00:00`;
    }

    const duration = activity.duration_minutes || 60;
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    endDateTime = endDate.toISOString();

    // Build event description
    let description = activity.subject || "";
    if (activity.description) description += `\n\n${activity.description}`;
    if (activity.contact_name) description += `\n\nجهة الاتصال: ${activity.contact_name}`;
    if (activity.outcome) description += `\nالنتيجة: ${activity.outcome}`;

    const event = {
      summary: activity.subject || `نشاط ${activity.type}`,
      description: description,
      start: {
        dateTime: startDateTime,
        timeZone: "Africa/Cairo",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "Africa/Cairo",
      },
    };

    if (activity.contact_name) {
      event.location = `جهة الاتصال: ${activity.contact_name}`;
    }

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return Response.json({ status: "error", message: err }, { status: 500 });
    }

    const createdEvent = await response.json();

    // Update the CRMActivity with the calendar event link and event ID
    await base44.asServiceRole.entities.CRMActivity.update(activity.id, {
      description: (activity.description || "") + `\n\n[رابط تقويم جوجل](${createdEvent.htmlLink})`,
      calendar_event_id: createdEvent.id,
      calendar_event_link: createdEvent.htmlLink,
    });

    // Create activity log for the scheduled meeting
    await base44.asServiceRole.entities.AuditLog.create({
      action: "إنشاء",
      entity: "CRMActivity",
      details: `تم جدولة اجتماع "${activity.subject || "اجتماع جديد"}" مع ${activity.contact_name || "عميل"} في ${activity.date} ${activity.time || "09:00"} ومزامنته مع تقويم جوجل`,
      channel: "مساعد ذكي",
      timestamp: new Date().toISOString(),
      subscription_id: activity.subscription_id || null,
    });

    return Response.json({
      status: "success",
      event_id: createdEvent.id,
      event_link: createdEvent.htmlLink,
    });
  } catch (error) {
    return Response.json({ status: "error", message: error.message }, { status: 500 });
  }
});