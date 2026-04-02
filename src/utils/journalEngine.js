import { base44 } from "@/api/base44Client";

/**
 * محرك قواعد اليومية العامة
 * يُشغَّل تلقائياً عند ترحيل أي عملية (فاتورة، سند...)
 */

/**
 * توليد قيد يومية تلقائي بناءً على القواعد المعرّفة
 * @param {string} trigger - نوع الحدث (فاتورة مبيعات، سند قبض، ...)
 * @param {object} sourceDoc - مستند المصدر (الفاتورة أو السند)
 * @param {string} sourceType - نوع المصدر للقيد
 * @param {string} sourceNumber - رقم المستند
 * @returns {Promise<{posted: number, errors: string[]}>}
 */
export async function applyJournalRules(trigger, sourceDoc, sourceType, sourceNumber) {
  const rules = await base44.entities.JournalRule.filter({ trigger, is_active: true });

  const results = { posted: 0, errors: [] };

  for (const rule of rules) {
    // فلترة حسب طريقة الدفع إن وُجدت
    if (rule.payment_method && rule.payment_method !== "الكل") {
      const docPayment = sourceDoc.payment_method;
      if (docPayment && docPayment !== rule.payment_method) continue;
    }

    const amount = sourceDoc.total || sourceDoc.amount || 0;
    if (amount <= 0) continue;

    // بناء بيان القيد
    const notes = buildDescription(rule.description_template, sourceDoc, sourceNumber);

    try {
      await base44.entities.JournalEntry.create({
        entry_number: `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: sourceDoc.date || new Date().toISOString().split("T")[0],
        source_type: sourceType,
        source_id: sourceDoc.id || "",
        source_number: sourceNumber || "",
        debit_account_id: rule.debit_account_id,
        debit_account_name: rule.debit_account_name,
        credit_account_id: rule.credit_account_id,
        credit_account_name: rule.credit_account_name,
        amount,
        notes,
      });
      results.posted++;
    } catch (e) {
      results.errors.push(`خطأ في قاعدة "${rule.name}": ${e.message}`);
    }
  }

  return results;
}

function buildDescription(template, doc, sourceNumber) {
  if (!template) return `قيد تلقائي - ${sourceNumber || ""}`;
  return template
    .replace("{رقم}", sourceNumber || "")
    .replace("{عميل}", doc.client_name || "")
    .replace("{تاريخ}", doc.date || "")
    .replace("{مبلغ}", (doc.total || doc.amount || 0).toLocaleString());
}

/**
 * القواعد الافتراضية المقترحة - لاستيرادها مرة واحدة عند الإعداد
 */
export const DEFAULT_RULES = [
  {
    name: "مبيعات نقدية ← الصندوق",
    trigger: "فاتورة مبيعات",
    payment_method: "نقداً",
    description_template: "إيراد مبيعات نقدي - فاتورة {رقم} - {عميل}",
    is_active: true,
  },
  {
    name: "مبيعات آجلة ← ذمم مدينة",
    trigger: "فاتورة مبيعات",
    payment_method: "آجل",
    description_template: "إيراد مبيعات آجل - فاتورة {رقم} - {عميل}",
    is_active: true,
  },
  {
    name: "مشتريات نقدية ← الصندوق",
    trigger: "فاتورة مشتريات",
    payment_method: "نقداً",
    description_template: "مشتريات نقدية - فاتورة {رقم}",
    is_active: true,
  },
  {
    name: "مشتريات آجلة ← ذمم دائنة",
    trigger: "فاتورة مشتريات",
    payment_method: "آجل",
    description_template: "مشتريات آجلة - فاتورة {رقم}",
    is_active: true,
  },
  {
    name: "سند قبض ← الصندوق",
    trigger: "سند قبض",
    payment_method: "الكل",
    description_template: "قبض من {عميل} - سند {رقم}",
    is_active: true,
  },
  {
    name: "سند صرف ← الصندوق",
    trigger: "سند صرف",
    payment_method: "الكل",
    description_template: "صرف لـ {عميل} - سند {رقم}",
    is_active: true,
  },
];