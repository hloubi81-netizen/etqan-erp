import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendTelegramMessage } from "../../shared/telegram.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, title, body: messageBody } = body || {};

    let text = "";
    let source = "manual";

    // Entity automation: new lead (CRMContact) created
    if (event?.type === 'create' && data) {
      source = event.entity_name || 'entity';
      const name = data.name || data.full_name || "عميل محتمل";
      const company = data.company || data.company_name;
      const phone = data.phone;
      const email = data.email;
      const type = data.type || "";
      const lines = ["🆕 <b>عميل محتمل جديد</b>", `👤 الاسم: ${name}`];
      if (company) lines.push(`🏢 الشركة: ${company}`);
      if (phone) lines.push(`📞 الهاتف: ${phone}`);
      if (email) lines.push(`✉️ البريد: ${email}`);
      if (type) lines.push(`🏷️ النوع: ${type}`);
      text = lines.join("\n");
    } else if (title || messageBody) {
      const parts = [];
      if (title) parts.push(`<b>${title}</b>`);
      if (messageBody) parts.push(messageBody);
      text = parts.join("\n");
    } else {
      return Response.json({ ok: true, skipped: true, reason: "no payload" });
    }

    const result = await sendTelegramMessage(text);
    return Response.json({ ok: result.ok, source, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}