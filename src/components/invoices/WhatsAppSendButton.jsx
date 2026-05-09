import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function buildWhatsAppMessage(invoice) {
  const items = (invoice.items || [])
    .filter(i => i.product_name)
    .map(i => `  - ${i.product_name}: ${i.quantity} × ${(i.price || 0).toLocaleString()} = ${(i.total || 0).toLocaleString()}`)
    .join("\n");

  return encodeURIComponent(
    `🧾 *فاتورة ${invoice.pattern_type || "مبيعات"}*\n` +
    `رقم: ${invoice.invoice_number}\n` +
    `التاريخ: ${invoice.date}\n` +
    (invoice.client_name ? `العميل: ${invoice.client_name}\n` : "") +
    `\n*البنود:*\n${items}\n` +
    (invoice.discount_value > 0 ? `\nالخصم: ${invoice.discount_value.toLocaleString()}` : "") +
    `\n\n*الإجمالي: ${(invoice.total || 0).toLocaleString()} ${invoice.currency || ""}*` +
    (invoice.notes ? `\n\nملاحظات: ${invoice.notes}` : "")
  );
}

export default function WhatsAppSendButton({ invoice, phone, size = "sm", className = "" }) {
  function send() {
    const msg = buildWhatsAppMessage(invoice);
    const number = (phone || "").replace(/\D/g, ""); // إزالة كل ما ليس رقماً
    const url = number
      ? `https://wa.me/${number}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={send}
      className={`gap-1.5 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 ${className}`}
      title="إرسال عبر واتساب"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      واتساب
    </Button>
  );
}