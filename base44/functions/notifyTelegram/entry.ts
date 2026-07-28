import { secrets } from "base44:runtime";

const ENTITY_LABELS = {
  Invoice: { name: "فاتورة", emoji: "🧾", numberField: "invoice_number", amountField: "total", extraFields: ["pattern_type", "client_name", "branch_name"] },
  Voucher: { name: "سند", emoji: "💰", numberField: "voucher_number", amountField: "amount", extraFields: ["type", "account_name", "notes"] },
  JournalEntry: { name: "قيد محاسبي", emoji: "📓", numberField: "entry_number", amountField: "amount", extraFields: ["description", "branch_name"] },
  GoodsReceipt: { name: "استلام بضائع", emoji: "📦", numberField: "receipt_number", amountField: "total", extraFields: ["supplier_name", "warehouse_name", "branch_name"] },
  CostEntry: { name: "تكلفة", emoji: "💸", numberField: "entry_number", amountField: "total_cost", extraFields: ["cost_type", "cost_center_name", "branch_name"] },
  ClinicInvoice: { name: "فاتورة عيادة", emoji: "🏥", numberField: "invoice_number", amountField: "total", extraFields: ["patient_name", "status"] },
};

function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return new Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function buildMessage(event, data) {
  const cfg = ENTITY_LABELS[event.entity_name];
  if (!cfg) return null;
  const lines = [];
  lines.push(`${cfg.emoji} *${cfg.name} جديد*`);
  lines.push(`━━━━━━━━━━━━━━━`);
  if (data[cfg.numberField]) lines.push(`رقم: \`${data[cfg.numberField]}\``);
  if (data.date) lines.push(`التاريخ: ${data.date}`);
  cfg.extraFields.forEach((f) => {
    if (data[f]) lines.push(`${f}: ${data[f]}`);
  });
  if (data[cfg.amountField] !== undefined && data[cfg.amountField] !== null) {
    lines.push(`المبلغ: *${formatNumber(data[cfg.amountField])}*`);
  }
  if (data.created_by_id || data.user_name) {
    lines.push(`بواسطة: ${data.user_name || data.created_by_id || "—"}`);
  }
  return lines.join("\n");
}

export default async function(req) {
  try {
    const token = secrets.get("TELEGRAM_BOT_TOKEN");
    const chatId = secrets.get("TELEGRAM_CHAT_ID");
    if (!token || !chatId) {
      return Response.json({ error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set" }, { status: 500 });
    }

    let payload = {};
    try { payload = await req.json(); } catch { payload = {}; }
    const event = payload.event || {};
    const data = payload.data || {};

    const text = buildMessage(event, data);
    if (!text) {
      return Response.json({ ok: true, skipped: true, reason: `no template for ${event.entity_name}` });
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    if (!tgRes.ok) {
      const errText = await tgRes.text();
      return Response.json({ error: "Telegram API error", details: errText }, { status: 502 });
    }

    return Response.json({ ok: true, entity: event.entity_name, entity_id: event.entity_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}