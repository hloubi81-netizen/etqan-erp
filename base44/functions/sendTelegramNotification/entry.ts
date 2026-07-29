import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendTelegramMessage } from "../../shared/telegram.ts";

const fmtNum = (n) => {
  const v = Number(n || 0);
  return Number.isFinite(v) ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "0";
};

const line = (label, value) => (value !== undefined && value !== null && value !== "" ? `\n${label}: ${value}` : "");

// Per-entity message builders keyed by entity_name
const BUILDERS = {
  Invoice: (d) => ({
    icon: "🧾",
    title: `فاتورة ${d.pattern_type || ""}`.trim(),
    fields: line("الرقم", d.invoice_number) + line("العميل/المورد", d.client_name) +
            line("الإجمالي", `${fmtNum(d.total)} ${d.currency || ""}`.trim()) +
            line("الفرع", d.branch_name) + line("الحالة", d.status) + line("التاريخ", d.date),
  }),
  Voucher: (d) => ({
    icon: "💵",
    title: d.type || "سند",
    fields: line("الرقم", d.voucher_number) + line("الحساب", d.account_name) +
            line("المبلغ", `${fmtNum(d.amount)} ${d.currency || ""}`.trim()) +
            line("الحساب المقابل", d.counter_account_name) + line("الحالة", d.status) + line("التاريخ", d.date),
  }),
  JournalEntry: (d) => ({
    icon: "📒",
    title: "قيد محاسبي",
    fields: line("الرقم", d.entry_number) + line("النوع", d.source_type) +
            line("مدين", d.debit_account_name) + line("دائن", d.credit_account_name) +
            line("المبلغ", `${fmtNum(d.amount)} ${d.currency || ""}`.trim()) +
            line("البيان", d.notes) + line("التاريخ", d.date),
  }),
  CostEntry: (d) => ({
    icon: "📊",
    title: "قيد تكلفة",
    fields: line("الرقم", d.entry_number) + line("النوع", d.cost_type) +
            line("مركز التكلفة", d.cost_center_name) + line("الحساب", d.account_name) +
            line("الإجمالي", fmtNum(d.total_cost)) + line("البيان", d.description) + line("التاريخ", d.date),
  }),
  PaymentRequest: (d) => ({
    icon: "💳",
    title: "طلب دفع اشتراك",
    fields: line("العميل", d.client_name || d.user_name) + line("الباقة", d.plan) +
            line("المبلغ", fmtNum(d.amount)) + line("طريقة الدفع", d.payment_method) +
            line("المرجع", d.transaction_reference) + line("الحالة", d.status),
  }),
  PurchaseOrder: (d) => ({
    icon: "📦",
    title: d.type || "أمر شراء",
    fields: line("الرقم", d.order_number) + line("المورد", d.client_name) +
            line("الإجمالي", fmtNum(d.total)) + line("المستودع", d.warehouse_name) +
            line("الحالة", d.status) + line("التاريخ", d.date),
  }),
  StockTransfer: (d) => ({
    icon: "🔄",
    title: "تحويل مخزون",
    fields: line("الرقم", d.transfer_number) + line("من", d.from_warehouse_name) +
            line("إلى", d.to_warehouse_name) + line("الحالة", d.status) + line("التاريخ", d.date),
  }),
  Shipment: (d) => ({
    icon: "🚚",
    title: "شحنة جديدة",
    fields: line("رقم التتبع", d.tracking_number) + line("شركة الشحن", d.carrier_name) +
            line("المستلم", d.recipient_name) + line("المدينة", d.destination_city) +
            line("تكلفة الشحن", fmtNum(d.shipping_cost)) +
            (d.cod_amount ? line("COD", fmtNum(d.cod_amount)) : "") +
            line("الحالة", d.status) + line("تاريخ الشحن", d.ship_date),
  }),
  EcomOrder: (d) => ({
    icon: "🛒",
    title: `طلب متجر (${d.platform || ""})`.trim(),
    fields: line("الرقم", d.order_number) + line("العميل", d.customer_name) +
            line("الإجمالي", `${fmtNum(d.total_amount)} ${d.currency || ""}`.trim()) +
            line("الحالة", d.status) + line("التاريخ", d.order_date),
  }),
  ProductionOrder: (d) => ({
    icon: "🏭",
    title: "أمر إنتاج",
    fields: line("الرقم", d.order_number) + line("المنتج", d.product_name) +
            line("الكمية", `${fmtNum(d.target_quantity)} ${d.unit || ""}`.trim()) +
            line("مركز التكلفة", d.cost_center_name) + line("المسؤول", d.responsible_name) +
            line("الحالة", d.status) + line("التاريخ", d.date),
  }),
  GoodsReceipt: (d) => ({
    icon: "📥",
    title: "استلام بضائع",
    fields: line("الرقم", d.receipt_number) + line("المورد", d.supplier_name) +
            line("أمر الشراء", d.purchase_order_number) + line("المستودع", d.warehouse_name) +
            line("الحالة", d.status) + line("التاريخ", d.date),
  }),
  CRMContact: (d) => ({
    icon: "🆕",
    title: "عميل محتمل جديد",
    fields: line("الاسم", d.name || d.full_name) + line("الشركة", d.company || d.company_name) +
            line("الهاتف", d.phone) + line("البريد", d.email) + line("النوع", d.type),
  }),
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, title, body: messageBody } = body || {};

    let text = "";
    let source = "manual";

    if (event?.type === 'create' && data) {
      const entityName = event.entity_name || '';
      source = entityName;
      const builder = BUILDERS[entityName];
      if (builder) {
        const msg = builder(data);
        text = `${msg.icon} <b>${msg.title}</b>${msg.fields}`;
      } else {
        // Generic fallback for any other entity
        const name = data.name || data.title || data.number || entityName;
        text = `📝 <b>${entityName || "عملية جديدة"}</b>${line("الاسم", name)}${line("التاريخ", data.date)}`;
      }
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