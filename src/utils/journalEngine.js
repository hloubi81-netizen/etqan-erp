import { base44 } from "@/api/base44Client";

/**
 * محرك قواعد اليومية العامة
 * يُشغَّل تلقائياً عند ترحيل أي عملية (فاتورة، سند...)
 */

/**
 * حساب رصيد حساب معين من البيانات المُحمَّلة مسبقاً
 */
function calcAccountBalance(accountId, allEntries, allVouchers) {
  let debitTotal = 0;
  let creditTotal = 0;

  for (const entry of allEntries) {
    if (entry.debit_account_id === accountId)  debitTotal  += (entry.amount || 0);
    if (entry.credit_account_id === accountId) creditTotal += (entry.amount || 0);
  }

  for (const v of allVouchers) {
    if (!v.entries || v.entries.length === 0) {
      if (v.account_id === accountId)         debitTotal  += (v.amount || 0);
      if (v.counter_account_id === accountId) creditTotal += (v.amount || 0);
    } else {
      for (const e of v.entries) {
        if (e.account_id === accountId) {
          debitTotal  += (e.debit  || 0);
          creditTotal += (e.credit || 0);
        }
      }
    }
  }

  return { debitTotal, creditTotal };
}

/**
 * تحديث أرصدة مجموعة من معرّفات الحسابات
 * يجلب البيانات مرة واحدة فقط لجميع الحسابات
 */
export async function refreshAccountBalances(accountIds = []) {
  const unique = [...new Set(accountIds.filter(Boolean))];
  if (unique.length === 0) return;

  const [allEntries, allVouchers] = await Promise.all([
    base44.entities.JournalEntry.list().catch(() => []),
    base44.entities.Voucher.filter({ status: "مرحّل" }).catch(() => []),
  ]);

  await Promise.all(unique.map((accountId) => {
    const { debitTotal, creditTotal } = calcAccountBalance(accountId, allEntries, allVouchers);
    return base44.entities.Account.update(accountId, {
      debit_balance:  debitTotal,
      credit_balance: creditTotal,
      balance:        Math.abs(debitTotal - creditTotal),
    });
  }));
}

/**
 * توليد قيد يومية تلقائي بناءً على القواعد المعرّفة وتحديث أرصدة الحسابات
 */
export async function applyJournalRules(trigger, sourceDoc, sourceType, sourceNumber) {
  const rules = await base44.entities.JournalRule.filter({ trigger, is_active: true });

  const results = { posted: 0, errors: [] };
  const affectedIds = new Set();

  for (const rule of rules) {
    if (rule.payment_method && rule.payment_method !== "الكل") {
      const docPayment = sourceDoc.payment_method;
      if (docPayment && docPayment !== rule.payment_method) continue;
    }

    const amount = sourceDoc.total || sourceDoc.amount || 0;
    if (amount <= 0) continue;

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
      if (rule.debit_account_id)  affectedIds.add(rule.debit_account_id);
      if (rule.credit_account_id) affectedIds.add(rule.credit_account_id);
    } catch (e) {
      results.errors.push(`خطأ في قاعدة "${rule.name}": ${e.message}`);
    }
  }

  // تحديث فوري لأرصدة الحسابات المتأثرة
  await refreshAccountBalances([...affectedIds]);

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