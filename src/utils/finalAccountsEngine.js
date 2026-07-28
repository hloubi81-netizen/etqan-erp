import { base44 } from "@/api/base44Client";

// يجلب بيانات الدليل المحاسبي والسندات والقيود اللازمة للحسابات الختامية
export async function loadFinalAccountData() {
  const [accounts, vouchers, journals] = await Promise.all([
    base44.entities.Account.list(),
    base44.entities.Voucher.list(),
    base44.entities.JournalEntry.list(),
  ]);
  return { accounts, vouchers, journals };
}

// يحسب حركة كل حساب ضمن الفترة ويصنّفها على الجانب المدين أو الدائن
export function buildFinalAccount(data, finalAccountType, dateFrom, dateTo) {
  const { accounts, vouchers, journals } = data;
  const inRange = (date) => {
    if (!date) return true;
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    return true;
  };

  const movement = {};
  const ensure = (id) => {
    if (!movement[id]) movement[id] = { debit: 0, credit: 0 };
    return movement[id];
  };

  // من قيود السندات
  vouchers.forEach((v) => {
    if (!inRange(v.date)) return;
    (v.entries || []).forEach((e) => {
      if (!e.account_id) return;
      ensure(e.account_id).debit += e.debit || 0;
      ensure(e.account_id).credit += e.credit || 0;
    });
  });

  // من القيود المحاسبية المباشرة
  journals.forEach((j) => {
    if (!inRange(j.date)) return;
    const amt = j.amount || 0;
    if (j.debit_account_id) ensure(j.debit_account_id).debit += amt;
    if (j.credit_account_id) ensure(j.credit_account_id).credit += amt;
  });

  // فلترة الحسابات حسب التصنيف الختامي (حسابات فرعية نشطة فقط)
  const filtered = accounts.filter(
    (a) => a.final_account === finalAccountType && !a.is_parent && a.is_active !== false
  );

  const debitSide = [];
  const creditSide = [];
  filtered.forEach((a) => {
    const m = movement[a.id] || { debit: 0, credit: 0 };
    const net = (m.debit || 0) - (m.credit || 0);
    const amount = Math.abs(net);
    if (amount < 0.01) return;
    const item = {
      id: a.id,
      account_number: a.account_number,
      name: a.name,
      account_nature: a.account_nature,
      amount,
    };
    if (net > 0) debitSide.push(item);
    else creditSide.push(item);
  });

  const debitTotal = debitSide.reduce((s, i) => s + i.amount, 0);
  const creditTotal = creditSide.reduce((s, i) => s + i.amount, 0);
  // balance موجب = ربح (الدائن > المدين)، سالب = خسارة
  return { debitSide, creditSide, debitTotal, creditTotal, balance: creditTotal - debitTotal };
}