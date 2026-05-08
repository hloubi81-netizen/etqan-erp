import { base44 } from "@/api/base44Client";

/**
 * جلب أسعار الصرف من الإنترنت عبر InvokeLLM وتحديث قاعدة البيانات
 */
export async function autoUpdateExchangeRates() {
  const currencies = await base44.entities.Currency.list();
  const foreignCurrencies = currencies.filter(c => !c.is_local);
  if (!foreignCurrencies.length) return { updated: 0, errors: [] };

  const symbols = foreignCurrencies.map(c => c.symbol).join(", ");
  const localCurrency = currencies.find(c => c.is_local);
  const localSymbol = localCurrency?.symbol || "SAR";

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `اجلب أسعار الصرف الحالية مقابل ${localSymbol} للعملات التالية: ${symbols}.
كن دقيقاً وأعطني فقط سعر الصرف كرقم عشري (كم وحدة من ${localSymbol} تساوي وحدة واحدة من العملة الأجنبية).
التاريخ اليوم: ${new Date().toISOString().split('T')[0]}`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        rates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symbol: { type: "string" },
              rate: { type: "number" },
            },
          },
        },
      },
    },
  });

  const rates = result?.rates || [];
  const errors = [];
  let updated = 0;

  for (const { symbol, rate } of rates) {
    if (!symbol || !rate || rate <= 0) continue;
    const cur = foreignCurrencies.find(c => c.symbol.toUpperCase() === symbol.toUpperCase());
    if (!cur) continue;
    try {
      await base44.entities.Currency.update(cur.id, { exchange_rate: rate });
      updated++;
    } catch (e) {
      errors.push(`خطأ في تحديث ${symbol}: ${e.message}`);
    }
  }

  return { updated, errors, rates };
}

/**
 * حساب المبلغ بالعملة المحلية
 */
export function toLocalCurrency(amount, exchangeRate) {
  if (!exchangeRate || exchangeRate === 1) return amount;
  return amount * exchangeRate;
}

/**
 * إنشاء قيد فرق العملة في اليومية
 * يُستدعى عند ترحيل فاتورة بعملة أجنبية
 */
export async function createCurrencyDiffEntry({
  sourceDoc,
  sourceType,
  sourceNumber,
  foreignAmount,
  localAmount,
  foreignCurrency,
  exchangeRate,
  gainAccountId,
  gainAccountName,
  lossAccountId,
  lossAccountName,
  clientAccountId,
  clientAccountName,
}) {
  const diff = localAmount - foreignAmount;
  if (Math.abs(diff) < 0.01) return null; // لا يوجد فرق يُذكر

  const isGain = diff > 0;
  const absDiff = Math.abs(diff);
  const today = sourceDoc?.date || new Date().toISOString().split("T")[0];

  // قيد فرق الصرف
  const entry = {
    entry_number: `FX-${Date.now()}`,
    date: today,
    source_type: sourceType,
    source_id: sourceDoc?.id || "",
    source_number: sourceNumber || "",
    debit_account_id:  isGain ? clientAccountId  : lossAccountId,
    debit_account_name: isGain ? clientAccountName : lossAccountName,
    credit_account_id:  isGain ? gainAccountId  : clientAccountId,
    credit_account_name: isGain ? gainAccountName : clientAccountName,
    amount: absDiff,
    notes: `فرق صرف عملة ${foreignCurrency} | سعر الصرف: ${exchangeRate} | فاتورة: ${sourceNumber}`,
    currency: foreignCurrency,
    exchange_rate: exchangeRate,
  };

  await base44.entities.JournalEntry.create(entry);
  return entry;
}