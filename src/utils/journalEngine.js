import { base44 } from "@/api/base44Client";

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
 * تحديث أرصدة مجموعة من معرّفات الحسابات تلقائياً
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