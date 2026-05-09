import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrency } from "@/hooks/useCurrency";
import PageHeader from "../../components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Scale } from "lucide-react";

export default function BalanceSheet() {
  const { selectedCurrency, isLocalCurrency, getDisplayRate } = useCurrency();
  const showInLocal = !isLocalCurrency();

  const [accounts, setAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [filters, setFilters] = useState({ date: new Date().toISOString().split("T")[0] });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [a, curs] = await Promise.all([
      base44.entities.Account.list(),
      base44.entities.Currency.list(),
    ]);
    setAccounts(a); setCurrencies(curs);
    setLoading(false);
  }

  function getAccountBalance(acc, field) {
    const val = acc[field] || 0;
    if (!showInLocal || !acc.currency) return val;
    const rate = getDisplayRate ? getDisplayRate(acc.currency) : 1;
    return val * rate;
  }

  function generateReport() {
    const balanceAccounts = accounts.filter((a) => a.financial_statement === "المركز المالي" || a.final_account === "الميزانية");
    const assets = balanceAccounts.filter((a) => a.account_nature === "مدين");
    const liabilities = balanceAccounts.filter((a) => a.account_nature === "دائن");
    const equity = balanceAccounts.filter((a) => a.account_nature === "كلاهما");

    const totalAssets = assets.reduce((s, a) => s + getAccountBalance(a, "balance") || getAccountBalance(a, "debit_balance"), 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + (getAccountBalance(a, "balance") || getAccountBalance(a, "credit_balance")), 0);
    const totalEquity = equity.reduce((s, a) => s + getAccountBalance(a, "balance"), 0);

    setReport({
      assets, liabilities, equity,
      totalAssets, totalLiabilities, totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="قائمة المركز المالي" subtitle="الميزانية العمومية وفق المعايير الدولية (IAS 1)" />

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div><Label className="text-xs">بتاريخ</Label><Input className="h-9" type="date" value={filters.date} onChange={(e) => setFilters({ date: e.target.value })} /></div>
            <Button size="sm" onClick={generateReport}><Search className="h-4 w-4 ml-1" /> إعداد القائمة</Button>
            {showInLocal && selectedCurrency && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
                <span className="text-xs text-primary font-medium">يُعرض بـ: {selectedCurrency.symbol} {selectedCurrency.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assets */}
          <Card>
            <CardHeader className="border-b bg-blue-50/50">
              <CardTitle className="text-base text-blue-800">الأصول</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {report.assets.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد حسابات أصول معرّفة</p>
              ) : (
                report.assets.map((a) => (
                  <div key={a.id} className="flex justify-between py-1.5 text-sm border-b border-border/50">
                    <span>{a.name}</span>
                    <span className="font-medium">{(a.balance || a.debit_balance || 0).toLocaleString()}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between pt-3 text-base font-bold border-t-2">
                <span>إجمالي الأصول</span>
                <span className="text-blue-700">{report.totalAssets.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities & Equity */}
          <Card>
            <CardHeader className="border-b bg-green-50/50">
              <CardTitle className="text-base text-green-800">الالتزامات وحقوق الملكية</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">الالتزامات</p>
              {report.liabilities.map((a) => (
                <div key={a.id} className="flex justify-between py-1.5 text-sm border-b border-border/50">
                  <span>{a.name}</span>
                  <span className="font-medium">{(a.balance || a.credit_balance || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 text-sm font-bold border-t">
                <span>إجمالي الالتزامات</span>
                <span>{report.totalLiabilities.toLocaleString()}</span>
              </div>

              <p className="text-xs font-semibold text-muted-foreground mb-2 mt-4">حقوق الملكية</p>
              {report.equity.map((a) => (
                <div key={a.id} className="flex justify-between py-1.5 text-sm border-b border-border/50">
                  <span>{a.name}</span>
                  <span className="font-medium">{(a.balance || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 text-sm font-bold border-t">
                <span>إجمالي حقوق الملكية</span>
                <span>{report.totalEquity.toLocaleString()}</span>
              </div>

              <div className="flex justify-between pt-3 text-base font-bold border-t-2">
                <span>الإجمالي</span>
                <span className="text-green-700">{report.totalLiabilitiesAndEquity.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Balance Check */}
          <Card className="md:col-span-2">
            <CardContent className="p-4">
              <div className={`flex items-center justify-center gap-3 p-4 rounded-xl ${report.isBalanced ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                <Scale className="h-5 w-5" />
                <span className="font-bold">
                  {report.isBalanced
                    ? "الميزانية متوازنة ✓ (الأصول = الالتزامات + حقوق الملكية)"
                    : `الميزانية غير متوازنة! الفرق: ${(report.totalAssets - report.totalLiabilitiesAndEquity).toLocaleString()}`
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}