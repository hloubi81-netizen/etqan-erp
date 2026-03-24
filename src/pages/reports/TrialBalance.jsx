import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../../components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import ExportButtons from "../../components/shared/ExportButtons";

export default function TrialBalance() {
  const [accounts, setAccounts] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ account_id: "", date_from: "", date_to: "", type: "بالمجاميع" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [a, v, inv] = await Promise.all([
      base44.entities.Account.list(),
      base44.entities.Voucher.list(),
      base44.entities.Invoice.list(),
    ]);
    setAccounts(a); setVouchers(v); setInvoices(inv);
    setLoading(false);
  }

  function generateReport() {
    const balances = {};

    // Initialize all accounts
    accounts.forEach((acc) => {
      if (filters.account_id && acc.id !== filters.account_id) return;
      balances[acc.id] = {
        account_number: acc.account_number,
        name: acc.name,
        opening_debit: acc.debit_balance || 0,
        opening_credit: acc.credit_balance || 0,
        movement_debit: 0,
        movement_credit: 0,
      };
    });

    // Process voucher entries
    vouchers.forEach((v) => {
      if (filters.date_from && v.date < filters.date_from) return;
      if (filters.date_to && v.date > filters.date_to) return;

      (v.entries || []).forEach((entry) => {
        if (!balances[entry.account_id]) return;
        balances[entry.account_id].movement_debit += entry.debit || 0;
        balances[entry.account_id].movement_credit += entry.credit || 0;
      });

      // Simple vouchers
      if (v.account_id && balances[v.account_id]) {
        balances[v.account_id].movement_debit += v.amount || 0;
      }
      if (v.counter_account_id && balances[v.counter_account_id]) {
        balances[v.counter_account_id].movement_credit += v.amount || 0;
      }
    });

    const resultList = Object.values(balances).map((b) => ({
      ...b,
      total_debit: b.opening_debit + b.movement_debit,
      total_credit: b.opening_credit + b.movement_credit,
      final_debit: Math.max(0, (b.opening_debit + b.movement_debit) - (b.opening_credit + b.movement_credit)),
      final_credit: Math.max(0, (b.opening_credit + b.movement_credit) - (b.opening_debit + b.movement_debit)),
    }));

    setResults(resultList);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const totals = results.reduce((s, r) => ({
    opening_debit: s.opening_debit + r.opening_debit,
    opening_credit: s.opening_credit + r.opening_credit,
    movement_debit: s.movement_debit + r.movement_debit,
    movement_credit: s.movement_credit + r.movement_credit,
    total_debit: s.total_debit + r.total_debit,
    total_credit: s.total_credit + r.total_credit,
    final_debit: s.final_debit + r.final_debit,
    final_credit: s.final_credit + r.final_credit,
  }), { opening_debit: 0, opening_credit: 0, movement_debit: 0, movement_credit: 0, total_debit: 0, total_credit: 0, final_debit: 0, final_credit: 0 });

  return (
    <div>
      <PageHeader title="ميزان المراجعة" subtitle="ميزان المراجعة بالمجاميع والأرصدة" />

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs">الحساب</Label>
              <Select value={filters.account_id} onValueChange={(v) => setFilters({ ...filters, account_id: v === "all" ? "" : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="جميع الحسابات" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحسابات</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">نوع الميزان</Label>
              <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="بالمجاميع">بالمجاميع</SelectItem>
                  <SelectItem value="بالأرصدة">بالأرصدة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">من تاريخ</Label><Input className="h-9" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></div>
            <div><Label className="text-xs">إلى تاريخ</Label><Input className="h-9" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></div>
            <div className="flex items-end"><Button size="sm" onClick={generateReport} className="w-full"><Search className="h-4 w-4 ml-1" /> عرض</Button></div>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 ? (
        <>
        <div className="flex justify-end mb-3">
          <ExportButtons
            columns={[
              {key:"account_number",label:"رقم الحساب"},{key:"name",label:"اسم الحساب"},
              {key:"opening_debit",label:"مدين افتتاحي"},{key:"opening_credit",label:"دائن افتتاحي"},
              {key:"movement_debit",label:"حركة مدين"},{key:"movement_credit",label:"حركة دائن"},
              {key:"final_debit",label:"رصيد مدين"},{key:"final_credit",label:"رصيد دائن"}
            ]}
            data={results} title="ميزان المراجعة" filename="trial-balance" printId="trial-balance-table"
          />
        </div>
        <div id="trial-balance-table" className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right text-xs">رقم الحساب</TableHead>
                <TableHead className="text-right text-xs">اسم الحساب</TableHead>
                <TableHead className="text-right text-xs">أرصدة افتتاحية مدين</TableHead>
                <TableHead className="text-right text-xs">أرصدة افتتاحية دائن</TableHead>
                {filters.type === "بالمجاميع" && <>
                  <TableHead className="text-right text-xs">حركة مدين</TableHead>
                  <TableHead className="text-right text-xs">حركة دائن</TableHead>
                  <TableHead className="text-right text-xs">مجاميع مدين</TableHead>
                  <TableHead className="text-right text-xs">مجاميع دائن</TableHead>
                </>}
                <TableHead className="text-right text-xs">أرصدة مدين</TableHead>
                <TableHead className="text-right text-xs">أرصدة دائن</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{r.account_number}</TableCell>
                  <TableCell className="text-sm font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm">{r.opening_debit > 0 ? r.opening_debit.toLocaleString() : ""}</TableCell>
                  <TableCell className="text-sm">{r.opening_credit > 0 ? r.opening_credit.toLocaleString() : ""}</TableCell>
                  {filters.type === "بالمجاميع" && <>
                    <TableCell className="text-sm">{r.movement_debit > 0 ? r.movement_debit.toLocaleString() : ""}</TableCell>
                    <TableCell className="text-sm">{r.movement_credit > 0 ? r.movement_credit.toLocaleString() : ""}</TableCell>
                    <TableCell className="text-sm font-medium">{r.total_debit > 0 ? r.total_debit.toLocaleString() : ""}</TableCell>
                    <TableCell className="text-sm font-medium">{r.total_credit > 0 ? r.total_credit.toLocaleString() : ""}</TableCell>
                  </>}
                  <TableCell className="text-sm font-bold text-green-600">{r.final_debit > 0 ? r.final_debit.toLocaleString() : ""}</TableCell>
                  <TableCell className="text-sm font-bold text-red-500">{r.final_credit > 0 ? r.final_credit.toLocaleString() : ""}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={2}>الإجمالي</TableCell>
                <TableCell>{totals.opening_debit > 0 ? totals.opening_debit.toLocaleString() : ""}</TableCell>
                <TableCell>{totals.opening_credit > 0 ? totals.opening_credit.toLocaleString() : ""}</TableCell>
                {filters.type === "بالمجاميع" && <>
                  <TableCell>{totals.movement_debit > 0 ? totals.movement_debit.toLocaleString() : ""}</TableCell>
                  <TableCell>{totals.movement_credit > 0 ? totals.movement_credit.toLocaleString() : ""}</TableCell>
                  <TableCell>{totals.total_debit > 0 ? totals.total_debit.toLocaleString() : ""}</TableCell>
                  <TableCell>{totals.total_credit > 0 ? totals.total_credit.toLocaleString() : ""}</TableCell>
                </>}
                <TableCell className="text-green-600">{totals.final_debit > 0 ? totals.final_debit.toLocaleString() : ""}</TableCell>
                <TableCell className="text-red-500">{totals.final_credit > 0 ? totals.final_credit.toLocaleString() : ""}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        </div>
        </>
      ) : (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
          اضغط عرض لإظهار ميزان المراجعة
        </div>
      )}
    </div>
  );
}