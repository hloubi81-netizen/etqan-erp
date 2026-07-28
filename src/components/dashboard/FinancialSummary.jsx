import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/hooks/useLang.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonCard } from "@/components/shared/SkeletonLoader";
import { Receipt, FileText, BookOpen, Landmark, ArrowDownLeft, ArrowUpLeft, Wallet } from "lucide-react";

const FINAL_ACCOUNT_GROUPS = [
  { key: "الميزانية", label: "الميزانية (المركز المالي)", icon: Landmark, color: "text-blue-700", bg: "bg-blue-50" },
  { key: "الأرباح والخسائر", label: "الأرباح والخسائر", icon: TrendingUpIcon, color: "text-green-700", bg: "bg-green-50" },
  { key: "المتاجرة", label: "المتاجرة", icon: Wallet, color: "text-amber-700", bg: "bg-amber-50" },
  { key: "التشغيل", label: "التشغيل", icon: Receipt, color: "text-purple-700", bg: "bg-purple-50" },
];

function TrendingUpIcon(props) {
  return <ArrowUpLeft {...props} />;
}

export default function FinancialSummary() {
  const { lang, fNum } = useLang();
  const isAr = lang === "ar";
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({ totalDebit: 0, totalCredit: 0, net: 0, byGroup: [] });
  const [recentOps, setRecentOps] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [accounts, invoices, vouchers, journals, goods, costEntries] = await Promise.all([
          base44.entities.Account.list().catch(() => []),
          base44.entities.Invoice.list("-created_date", 30).catch(() => []),
          base44.entities.Voucher.list("-created_date", 30).catch(() => []),
          base44.entities.JournalEntry.list("-created_date", 30).catch(() => []),
          base44.entities.GoodsReceipt.list("-created_date", 20).catch(() => []),
          base44.entities.CostEntry.list("-created_date", 20).catch(() => []),
        ]);

        // Aggregate balances by final_account
        const groupMap = {};
        let totalDebit = 0, totalCredit = 0;
        accounts.forEach((a) => {
          const grp = a.final_account || "غير مصنّف";
          if (!groupMap[grp]) groupMap[grp] = { debit: 0, credit: 0, balance: 0, count: 0 };
          groupMap[grp].debit += a.debit_balance || 0;
          groupMap[grp].credit += a.credit_balance || 0;
          groupMap[grp].balance += a.balance || 0;
          groupMap[grp].count += 1;
          totalDebit += a.debit_balance || 0;
          totalCredit += a.credit_balance || 0;
        });

        const byGroup = FINAL_ACCOUNT_GROUPS
          .map((g) => ({ ...g, ...(groupMap[g.key] || { debit: 0, credit: 0, balance: 0, count: 0 }) }))
          .filter((g) => g.count > 0);
        // include uncategorized if present
        if (groupMap["غير مصنّف"]) {
          byGroup.push({
            key: "غير مصنّف",
            label: "غير مصنّف",
            icon: FileText,
            color: "text-gray-700",
            bg: "bg-gray-50",
            ...groupMap["غير مصنّف"],
          });
        }

        setBalances({ totalDebit, totalCredit, net: totalDebit - totalCredit, byGroup });

        // Build recent operations feed
        const ops = [
          ...invoices.map((i) => ({
            id: i.id, date: i.created_date, type: "فاتورة", subtype: i.pattern_type || "",
            number: i.invoice_number, amount: i.total || 0, icon: Receipt,
            color: "text-blue-700", bg: "bg-blue-50", path: `/invoices/${i.pattern_type === "مشتريات" || i.pattern_type === "مرتجع مشتريات" ? "purchases" : "sales"}`,
          })),
          ...vouchers.map((v) => ({
            id: v.id, date: v.created_date, type: "سند", subtype: v.type || "",
            number: v.voucher_number || v.number || "—", amount: v.amount || 0, icon: FileText,
            color: v.type === "قبض" ? "text-green-700" : "text-red-600",
            bg: v.type === "قبض" ? "bg-green-50" : "bg-red-50",
            path: v.type ? `/vouchers/${v.type}` : "/vouchers/daily",
          })),
          ...journals.map((j) => ({
            id: j.id, date: j.created_date, type: "قيد", subtype: j.description || "",
            number: j.entry_number || j.number || "—", amount: j.amount || 0, icon: BookOpen,
            color: "text-purple-700", bg: "bg-purple-50", path: "/reports/general-ledger",
          })),
          ...goods.map((g) => ({
            id: g.id, date: g.created_date, type: "استلام بضائع", subtype: g.supplier_name || "",
            number: g.receipt_number || "—", amount: g.total || 0, icon: ArrowDownLeft,
            color: "text-teal-700", bg: "bg-teal-50", path: "/inventory/goods-receipt",
          })),
          ...costEntries.map((c) => ({
            id: c.id, date: c.created_date, type: "تكلفة", subtype: c.cost_type || "",
            number: c.entry_number || "—", amount: c.total_cost || 0, icon: Wallet,
            color: "text-amber-700", bg: "bg-amber-50", path: "/costs/management",
          })),
        ]
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
          .slice(0, 8);

        setRecentOps(ops);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmt = (n) => fNum(n || 0, { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1"><SkeletonCard /></div>
        <div className="lg:col-span-2"><SkeletonCard /></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* إجمالي الأرصدة */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            {isAr ? "إجمالي أرصدة الحسابات" : "Total Account Balances"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-green-50 p-2">
              <p className="text-[10px] text-muted-foreground">{isAr ? "مدين" : "Debit"}</p>
              <p className="text-sm font-bold text-green-700">{fmt(balances.totalDebit)}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-2">
              <p className="text-[10px] text-muted-foreground">{isAr ? "دائن" : "Credit"}</p>
              <p className="text-sm font-bold text-red-700">{fmt(balances.totalCredit)}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <p className="text-[10px] text-muted-foreground">{isAr ? "الصافي" : "Net"}</p>
              <p className="text-sm font-bold text-primary">{fmt(balances.net)}</p>
            </div>
          </div>

          {balances.byGroup.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {isAr ? "لا توجد أرصدة مسجّلة بعد" : "No balances recorded yet"}
            </p>
          ) : (
            <div className="space-y-1.5 pt-1">
              {balances.byGroup.map((g) => (
                <div key={g.key} className={`flex items-center justify-between p-2 rounded-lg ${g.bg}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <g.icon className={`h-4 w-4 shrink-0 ${g.color}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${g.color}`}>{g.label}</p>
                      <p className="text-[10px] text-muted-foreground">{fNum(g.count)} {isAr ? "حساب" : "accounts"}</p>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <p className={`text-sm font-bold ${g.color}`}>{fmt(g.balance)}</p>
                    <p className="text-[10px] text-muted-foreground">{isAr ? "رصيد" : "balance"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link to="/accounts" className="block text-xs text-center text-primary hover:underline pt-1">
            {isAr ? "عرض الدليل المحاسبي" : "View Chart of Accounts"}
          </Link>
        </CardContent>
      </Card>

      {/* العمليات المسجلة مؤخراً */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            {isAr ? "العمليات المسجّلة مؤخراً" : "Recent Operations"}
          </CardTitle>
          <Link to="/reports/activity-log" className="text-xs text-primary hover:underline">
            {isAr ? "سجل النشاط" : "Activity Log"}
          </Link>
        </CardHeader>
        <CardContent>
          {recentOps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {isAr ? "لا توجد عمليات مسجّلة بعد" : "No operations recorded yet"}
            </p>
          ) : (
            <div className="space-y-1.5">
              {recentOps.map((op) => (
                <Link
                  key={op.id}
                  to={op.path}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${op.bg}`}>
                      <op.icon className={`h-4 w-4 ${op.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{op.type}</p>
                        <span className="text-xs text-muted-foreground">#{op.number}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {op.subtype || (op.date ? new Date(op.date).toLocaleDateString(isAr ? "ar-SA" : "en-US") : "—")}
                      </p>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <p className={`text-sm font-semibold ${op.color}`}>{fmt(op.amount)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {op.date ? new Date(op.date).toLocaleDateString(isAr ? "ar-SA" : "en-US") : "—"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}