import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrency } from "@/hooks/useCurrency";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import ExportButtons from "../../components/shared/ExportButtons";

export default function AccountStatement() {
  const params = useParams();
  const isClient = params.type === "client-statement";
  const title = isClient ? "كشف حساب عميل" : "كشف حساب مورد";
  const { selectedCurrency, localCurrency, isLocalCurrency, getDisplayRate } = useCurrency();
  const showInLocal = !isLocalCurrency();

  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [filters, setFilters] = useState({ account_id: "", date_from: "", date_to: "", movement_type: "الكل" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasForeignCurrency, setHasForeignCurrency] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [accs, invs, vchs, curs] = await Promise.all([
      base44.entities.Account.list(),
      base44.entities.Invoice.list(),
      base44.entities.Voucher.list(),
      base44.entities.Currency.list(),
    ]);
    setAccounts(accs); setInvoices(invs); setVouchers(vchs); setCurrencies(curs);
    setLoading(false);
  }

  function getRate(currencyName) {
    return getDisplayRate ? getDisplayRate(currencyName || localCurrency?.name) : 1;
  }

  function generateReport() {
    if (!filters.account_id) return;
    const movements = [];
    const localCur = currencies.find(c => c.is_local);
    let foundForeign = false;

    // Invoices
    invoices.forEach((inv) => {
      if (inv.client_account_id !== filters.account_id) return;
      if (filters.date_from && inv.date < filters.date_from) return;
      if (filters.date_to && inv.date > filters.date_to) return;
      if (filters.movement_type !== "الكل") {
        const isInvoice = ["مبيعات", "مشتريات", "مرتجع مبيعات", "مرتجع مشتريات"].some(
          (t) => inv.pattern_type === t && filters.movement_type.includes("فواتير")
        );
        if (!isInvoice) return;
      }

      const isForeign = inv.currency && localCur && inv.currency !== localCur.name;
      if (isForeign) foundForeign = true;
      const rate = getRate(inv.currency);
      const isDebit = inv.pattern_type === "مبيعات" || inv.pattern_type === "مرتجع مشتريات";
      const total = inv.total || 0;
      movements.push({
        date: inv.date,
        type: inv.pattern_type,
        number: inv.invoice_number,
        currency: inv.currency,
        exchangeRate: rate,
        debit: isDebit ? total : 0,
        credit: isDebit ? 0 : total,
        debitLocal: isDebit ? total * rate : 0,
        creditLocal: isDebit ? 0 : total * rate,
      });
    });

    // Vouchers
    vouchers.forEach((v) => {
      const isRelevant = v.account_id === filters.account_id || v.counter_account_id === filters.account_id;
      if (!isRelevant) return;
      if (filters.date_from && v.date < filters.date_from) return;
      if (filters.date_to && v.date > filters.date_to) return;
      if (filters.movement_type !== "الكل" && !filters.movement_type.includes("سندات")) return;

      const isMainAccount = v.account_id === filters.account_id;
      const amount = v.amount || 0;
      movements.push({
        date: v.date,
        type: v.type,
        number: v.voucher_number,
        currency: null,
        exchangeRate: 1,
        debit: isMainAccount ? amount : 0,
        credit: isMainAccount ? 0 : amount,
        debitLocal: isMainAccount ? amount : 0,
        creditLocal: isMainAccount ? 0 : amount,
      });

      // Journal entries
      (v.entries || []).forEach((entry) => {
        if (entry.account_id !== filters.account_id) return;
        movements.push({
          date: v.date,
          type: v.type,
          number: v.voucher_number,
          currency: null,
          exchangeRate: 1,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          debitLocal: entry.debit || 0,
          creditLocal: entry.credit || 0,
        });
      });
    });

    setHasForeignCurrency(foundForeign);
    movements.sort((a, b) => (a.date > b.date ? 1 : -1));

    // Calculate running balance
    let balance = 0;
    let balanceLocal = 0;
    const withBalance = movements.map((m) => {
      balance += m.debit - m.credit;
      balanceLocal += m.debitLocal - m.creditLocal;
      return { ...m, balance, balanceLocal };
    });

    setResults(withBalance);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title={title} subtitle={`عرض ${title} مع تفاصيل الحركات`} />

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs">{isClient ? "العميل" : "المورد"}</Label>
              <Select value={filters.account_id} onValueChange={(v) => setFilters({ ...filters, account_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">الحركات</Label>
              <Select value={filters.movement_type} onValueChange={(v) => setFilters({ ...filters, movement_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="الكل">الكل</SelectItem>
                  <SelectItem value="فواتير مبيعات">فواتير مبيعات</SelectItem>
                  <SelectItem value="فواتير مشتريات">فواتير مشتريات</SelectItem>
                  <SelectItem value="سندات">سندات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">من تاريخ</Label>
              <Input className="h-9" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">إلى تاريخ</Label>
              <Input className="h-9" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={generateReport} className="w-full"><Search className="h-4 w-4 ml-1" /> عرض</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 ? (
        <>
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          {showInLocal && selectedCurrency && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
              <span className="text-xs text-primary font-medium">يُعرض بـ: {selectedCurrency.symbol} {selectedCurrency.name}</span>
            </div>
          )}
          <div className="mr-auto">
            <ExportButtons
              columns={showInLocal && hasForeignCurrency
                ? [{key:"date",label:"التاريخ"},{key:"type",label:"نوع العملية"},{key:"number",label:"الرقم"},{key:"debitLocal",label:"مدين (محلي)"},{key:"creditLocal",label:"دائن (محلي)"},{key:"balanceLocal",label:"الرصيد (محلي)"}]
                : [{key:"date",label:"التاريخ"},{key:"type",label:"نوع العملية"},{key:"number",label:"الرقم"},{key:"debit",label:"مدين"},{key:"credit",label:"دائن"},{key:"balance",label:"الرصيد"}]
              }
              data={results} title={title} filename="account-statement" printId="account-statement-table"
            />
          </div>
        </div>
        <div id="account-statement-table" className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right text-xs">التاريخ</TableHead>
                <TableHead className="text-right text-xs">نوع العملية</TableHead>
                <TableHead className="text-right text-xs">الرقم</TableHead>
                {!showInLocal && hasForeignCurrency && <TableHead className="text-right text-xs">العملة</TableHead>}
                <TableHead className="text-right text-xs">{showInLocal ? `مدين (${selectedCurrency?.symbol || ""})` : "مدين"}</TableHead>
                <TableHead className="text-right text-xs">{showInLocal ? `دائن (${selectedCurrency?.symbol || ""})` : "دائن"}</TableHead>
                <TableHead className="text-right text-xs">{showInLocal ? `الرصيد (${selectedCurrency?.symbol || ""})` : "الرصيد"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => {
                const debit = showInLocal && hasForeignCurrency ? r.debitLocal : r.debit;
                const credit = showInLocal && hasForeignCurrency ? r.creditLocal : r.credit;
                const balance = showInLocal && hasForeignCurrency ? r.balanceLocal : r.balance;
                return (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{r.date}</TableCell>
                    <TableCell className="text-sm">{r.type}</TableCell>
                    <TableCell className="text-sm">{r.number}</TableCell>
                    {!showInLocal && hasForeignCurrency && (
                      <TableCell className="text-sm text-muted-foreground">{r.currency || "-"}</TableCell>
                    )}
                    <TableCell className="text-sm text-green-600 font-medium">{debit > 0 ? debit.toLocaleString() : ""}</TableCell>
                    <TableCell className="text-sm text-red-500 font-medium">{credit > 0 ? credit.toLocaleString() : ""}</TableCell>
                    <TableCell className={`text-sm font-bold ${balance >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {balance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        </>
      ) : (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
          حدد الحساب واضغط عرض لإظهار كشف الحساب
        </div>
      )}
    </div>
  );
}