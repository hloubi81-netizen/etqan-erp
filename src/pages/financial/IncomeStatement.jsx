import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../../components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, TrendingUp, TrendingDown } from "lucide-react";

export default function IncomeStatement() {
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [filters, setFilters] = useState({ date_from: "", date_to: "" });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInLocal, setShowInLocal] = useState(false);
  const [hasForeignCurrency, setHasForeignCurrency] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [a, inv, v, curs] = await Promise.all([
      base44.entities.Account.list(),
      base44.entities.Invoice.list(),
      base44.entities.Voucher.list(),
      base44.entities.Currency.list(),
    ]);
    setAccounts(a); setInvoices(inv); setVouchers(v); setCurrencies(curs);
    setLoading(false);
  }

  function getExchangeRate(currencyName) {
    if (!currencyName) return 1;
    const localCur = currencies.find(c => c.is_local);
    if (localCur && currencyName === localCur.name) return 1;
    const cur = currencies.find(c => c.name === currencyName);
    return cur?.exchange_rate || 1;
  }

  function getInvoiceTotal(inv) {
    const localCur = currencies.find(c => c.is_local);
    const isForeign = inv.currency && localCur && inv.currency !== localCur.name;
    if (showInLocal && isForeign) return (inv.total || 0) * getExchangeRate(inv.currency);
    return inv.total || 0;
  }

  function generateReport() {
    const localCur = currencies.find(c => c.is_local);
    const filtered = invoices.filter(i => {
      if (filters.date_from && i.date < filters.date_from) return false;
      if (filters.date_to && i.date > filters.date_to) return false;
      return true;
    });
    const hasForeign = filtered.some(i => i.currency && localCur && i.currency !== localCur.name);
    setHasForeignCurrency(hasForeign);

    const sumByType = (type) => filtered.filter(i => i.pattern_type === type).reduce((s, i) => s + getInvoiceTotal(i), 0);

    const totalSales = sumByType("مبيعات");
    const totalSalesReturns = sumByType("مرتجع مبيعات");
    const totalPurchases = sumByType("مشتريات");
    const totalPurchaseReturns = sumByType("مرتجع مشتريات");

    const netSales = totalSales - totalSalesReturns;
    const netPurchases = totalPurchases - totalPurchaseReturns;
    const grossProfit = netSales - netPurchases;

    // Operating expenses from journal entries
    const expenseAccounts = accounts.filter((a) => a.final_account === "التشغيل" || a.financial_statement === "قائمة الدخل");
    let operatingExpenses = 0;
    vouchers.forEach((v) => {
      if (filters.date_from && v.date < filters.date_from) return;
      if (filters.date_to && v.date > filters.date_to) return;
      (v.entries || []).forEach((e) => {
        if (expenseAccounts.some((a) => a.id === e.account_id)) {
          operatingExpenses += (e.debit || 0) - (e.credit || 0);
        }
      });
    });

    const operatingProfit = grossProfit - Math.abs(operatingExpenses);
    const netIncome = operatingProfit;

    setReport({
      totalSales,
      totalSalesReturns,
      netSales,
      totalPurchases,
      totalPurchaseReturns,
      netPurchases,
      grossProfit,
      operatingExpenses: Math.abs(operatingExpenses),
      operatingProfit,
      netIncome,
    });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="قائمة الدخل" subtitle="بيان الإيرادات والمصروفات وصافي الدخل (وفق IAS 1)" />

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div><Label className="text-xs">من تاريخ</Label><Input className="h-9" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></div>
            <div><Label className="text-xs">إلى تاريخ</Label><Input className="h-9" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></div>
            <Button size="sm" onClick={generateReport}><Search className="h-4 w-4 ml-1" /> إعداد القائمة</Button>
            {report && hasForeignCurrency && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <span className="text-xs text-amber-700">عرض بالعملة المحلية</span>
                <button onClick={() => { setShowInLocal(!showInLocal); generateReport(); }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showInLocal ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showInLocal ? "translate-x-4" : "translate-x-1"}`} />
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader className="text-center border-b">
            <CardTitle className="text-xl">قائمة الدخل</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filters.date_from ? `من ${filters.date_from}` : ""} {filters.date_to ? `إلى ${filters.date_to}` : ""}
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <ReportLine label="إجمالي المبيعات" value={report.totalSales} bold />
            <ReportLine label="(-) مرتجعات المبيعات" value={-report.totalSalesReturns} indent />
            <ReportLine label="صافي المبيعات" value={report.netSales} bold highlight />
            
            <div className="border-t my-4" />
            
            <ReportLine label="(-) تكلفة البضاعة المباعة:" value={null} bold />
            <ReportLine label="صافي المشتريات" value={report.netPurchases} indent />
            <ReportLine label="(-) مرتجعات المشتريات" value={-report.totalPurchaseReturns} indent />
            
            <div className="border-t my-4" />
            
            <ReportLine label="مجمل الربح" value={report.grossProfit} bold highlight positive={report.grossProfit >= 0} />
            <ReportLine label="(-) المصروفات التشغيلية" value={-report.operatingExpenses} indent />
            
            <div className="border-t-2 border-primary my-4" />
            
            <ReportLine label="الربح التشغيلي (EBIT)" value={report.operatingProfit} bold positive={report.operatingProfit >= 0} />
            
            <div className="border-t-2 border-foreground my-4" />
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5">
              <div className="flex items-center gap-2">
                {report.netIncome >= 0 ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
                <span className="text-lg font-bold">صافي الدخل</span>
              </div>
              <span className={`text-xl font-bold ${report.netIncome >= 0 ? "text-green-600" : "text-red-500"}`}>
                {report.netIncome.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportLine({ label, value, bold, indent, highlight, positive }) {
  if (value === null) {
    return <p className={`text-sm ${bold ? "font-bold" : ""} ${indent ? "pr-6" : ""}`}>{label}</p>;
  }
  return (
    <div className={`flex justify-between items-center py-1 ${indent ? "pr-6" : ""} ${highlight ? "bg-muted/30 px-3 rounded-lg" : ""}`}>
      <span className={`text-sm ${bold ? "font-bold" : ""}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold" : ""} ${positive === true ? "text-green-600" : positive === false ? "text-red-500" : ""}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}