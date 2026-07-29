import { secrets } from "base44:runtime";

/**
 * Sends a text message to the configured Telegram chat via the bot.
 * Requires secrets: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
 * @param text   Message text (HTML parse_mode by default).
 * @param parseMode  "HTML" | "Markdown" | "MarkdownV2"
 */
export async function sendTelegramMessage(text, parseMode = "HTML") {
  const token = secrets.get("TELEGRAM_BOT_TOKEN");
  const chatId = secrets.get("TELEGRAM_CHAT_ID");

  if (!token || !chatId) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
    });
    const data = await res.json();
    if (!data.ok) {
      return { ok: false, error: data.description || "Telegram API error" };
    }
    return { ok: true, message_id: data.result?.message_id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}