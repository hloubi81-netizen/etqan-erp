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

export default function Ledger() {
  const [accounts, setAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ account_id: "", date_from: "", date_to: "", movement_type: "الكل", currency: "" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [a, c, v, inv] = await Promise.all([
      base44.entities.Account.list(),
      base44.entities.Currency.list(),
      base44.entities.Voucher.list(),
      base44.entities.Invoice.list(),
    ]);
    setAccounts(a); setCurrencies(c); setVouchers(v); setInvoices(inv);
    setLoading(false);
  }

  function generateReport() {
    if (!filters.account_id) return;
    const movements = [];

    vouchers.forEach((v) => {
      if (filters.date_from && v.date < filters.date_from) return;
      if (filters.date_to && v.date > filters.date_to) return;
      if (filters.movement_type === "فواتير") return;

      // Simple vouchers
      if (v.account_id === filters.account_id) {
        movements.push({ date: v.date, type: v.type, number: v.voucher_number, debit: v.amount || 0, credit: 0, notes: v.notes || "" });
      }
      if (v.counter_account_id === filters.account_id) {
        movements.push({ date: v.date, type: v.type, number: v.voucher_number, debit: 0, credit: v.amount || 0, notes: v.notes || "" });
      }
      // Entries
      (v.entries || []).forEach((e) => {
        if (e.account_id === filters.account_id) {
          movements.push({ date: v.date, type: v.type, number: v.voucher_number, debit: e.debit || 0, credit: e.credit || 0, notes: e.notes || v.notes || "" });
        }
      });
    });

    invoices.forEach((inv) => {
      if (filters.date_from && inv.date < filters.date_from) return;
      if (filters.date_to && inv.date > filters.date_to) return;
      if (filters.movement_type === "سندات") return;
      if (inv.client_account_id !== filters.account_id) return;

      const isSale = inv.pattern_type === "مبيعات" || inv.pattern_type === "مرتجع مشتريات";
      movements.push({
        date: inv.date, type: inv.pattern_type, number: inv.invoice_number,
        debit: isSale ? (inv.total || 0) : 0,
        credit: isSale ? 0 : (inv.total || 0),
        notes: inv.notes || "",
      });
    });

    movements.sort((a, b) => (a.date > b.date ? 1 : -1));
    let balance = 0;
    setResults(movements.map((m) => { balance += m.debit - m.credit; return { ...m, balance }; }));
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="دفتر الأستاذ" subtitle="عرض حركات الحسابات بالتفصيل" />
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs">الحساب</Label>
              <Select value={filters.account_id} onValueChange={(v) => setFilters({ ...filters, account_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.account_number} - {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">الحركات</Label>
              <Select value={filters.movement_type} onValueChange={(v) => setFilters({ ...filters, movement_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="الكل">الكل</SelectItem>
                  <SelectItem value="فواتير">فواتير</SelectItem>
                  <SelectItem value="سندات">سندات</SelectItem>
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
              {key:"date",label:"التاريخ"},{key:"type",label:"نوع العملية"},{key:"number",label:"الرقم"},
              {key:"notes",label:"البيان"},{key:"debit",label:"مدين"},{key:"credit",label:"دائن"},{key:"balance",label:"الرصيد"}
            ]}
            data={results} title="دفتر الأستاذ" filename="ledger" printId="ledger-table"
          />
        </div>
        <div id="ledger-table" className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right text-xs">التاريخ</TableHead>
                <TableHead className="text-right text-xs">نوع العملية</TableHead>
                <TableHead className="text-right text-xs">الرقم</TableHead>
                <TableHead className="text-right text-xs">البيان</TableHead>
                <TableHead className="text-right text-xs">مدين</TableHead>
                <TableHead className="text-right text-xs">دائن</TableHead>
                <TableHead className="text-right text-xs">الرصيد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{r.date}</TableCell>
                  <TableCell className="text-sm">{r.type}</TableCell>
                  <TableCell className="text-sm">{r.number}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.notes}</TableCell>
                  <TableCell className="text-sm text-green-600 font-medium">{r.debit > 0 ? r.debit.toLocaleString() : ""}</TableCell>
                  <TableCell className="text-sm text-red-500 font-medium">{r.credit > 0 ? r.credit.toLocaleString() : ""}</TableCell>
                  <TableCell className={`text-sm font-bold ${r.balance >= 0 ? "text-green-600" : "text-red-500"}`}>{r.balance.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
          حدد الحساب واضغط عرض لإظهار دفتر الأستاذ
        </div>
      )}
    </div>
  );
}