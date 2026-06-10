import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search, BookOpen, User, Truck, ChevronDown, ChevronRight,
  Printer, Download, X, TrendingUp, TrendingDown, Minus,
  FileText, Eye, RefreshCw, Filter
} from "lucide-react";
import ExportButtons from "@/components/shared/ExportButtons";

const SETTINGS_KEY = "itqan_app_settings";
function getCompany() {
  try { const s = localStorage.getItem(SETTINGS_KEY); return s ? JSON.parse(s)?.company || {} : {}; } catch { return {}; }
}

// ─── Statement Print ───────────────────────────────────────────────────────────
function printStatement(account, rows, company, dateFrom, dateTo, currency) {
  const win = window.open("", "_blank", "width=900,height=700");
  const totDebit = rows.reduce((s, r) => s + (r.debit || 0), 0);
  const totCredit = rows.reduce((s, r) => s + (r.credit || 0), 0);
  const finalBal = rows.length ? rows[rows.length - 1].balance : 0;

  const tableRows = rows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"};border-bottom:1px solid #e2e8f0;">
      <td style="padding:7px 10px;font-size:11px;">${r.date || ""}</td>
      <td style="padding:7px 10px;font-size:11px;">${r.type || ""}</td>
      <td style="padding:7px 10px;font-size:11px;">${r.number || ""}</td>
      <td style="padding:7px 10px;font-size:11px;color:#64748b;">${r.notes || ""}</td>
      <td style="padding:7px 10px;font-size:11px;color:#16a34a;font-weight:600;text-align:left;">${r.debit > 0 ? r.debit.toLocaleString() : ""}</td>
      <td style="padding:7px 10px;font-size:11px;color:#dc2626;font-weight:600;text-align:left;">${r.credit > 0 ? r.credit.toLocaleString() : ""}</td>
      <td style="padding:7px 10px;font-size:11px;font-weight:700;text-align:left;color:${r.balance >= 0 ? "#16a34a" : "#dc2626"};">${r.balance.toLocaleString()}</td>
    </tr>
  `).join("");

  win.document.write(`
    <html dir="rtl"><head><meta charset="utf-8"/>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Tajawal',Arial,sans-serif;color:#1e293b;background:#fff;direction:rtl;}
      .page{width:210mm;margin:0 auto;padding:12mm;}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    </style></head>
    <body><div class="page">
      <div style="background:#1d4ed8;color:white;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:18px;font-weight:900;">${company.name || "اسم الشركة"}</div>
          ${company.taxNumber ? `<div style="font-size:10px;opacity:.8;">الرقم الضريبي: ${company.taxNumber}</div>` : ""}
        </div>
        <div style="text-align:left;">
          <div style="font-size:14px;font-weight:900;">كشف حساب</div>
          <div style="font-size:11px;opacity:.8;">${account?.name || ""}</div>
          ${dateFrom || dateTo ? `<div style="font-size:10px;opacity:.8;">${dateFrom || "البداية"} — ${dateTo || "اليوم"}</div>` : ""}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:10px;color:#15803d;">إجمالي المدين</div>
          <div style="font-size:16px;font-weight:900;color:#16a34a;">${totDebit.toLocaleString()} ${currency || ""}</div>
        </div>
        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:10px;color:#dc2626;">إجمالي الدائن</div>
          <div style="font-size:16px;font-weight:900;color:#dc2626;">${totCredit.toLocaleString()} ${currency || ""}</div>
        </div>
        <div style="background:${finalBal >= 0 ? "#eff6ff" : "#fff7ed"};border:1px solid ${finalBal >= 0 ? "#93c5fd" : "#fdba74"};border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:10px;color:#374151;">الرصيد الختامي</div>
          <div style="font-size:16px;font-weight:900;color:${finalBal >= 0 ? "#1d4ed8" : "#ea580c"};">${finalBal.toLocaleString()} ${currency || ""}</div>
          <div style="font-size:9px;color:#64748b;">${finalBal >= 0 ? "مدين" : "دائن"}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#1d4ed8;">
            <th style="padding:8px 10px;color:white;font-size:11px;text-align:right;">التاريخ</th>
            <th style="padding:8px 10px;color:white;font-size:11px;text-align:right;">نوع العملية</th>
            <th style="padding:8px 10px;color:white;font-size:11px;text-align:right;">الرقم</th>
            <th style="padding:8px 10px;color:white;font-size:11px;text-align:right;">البيان</th>
            <th style="padding:8px 10px;color:white;font-size:11px;text-align:left;">مدين</th>
            <th style="padding:8px 10px;color:white;font-size:11px;text-align:left;">دائن</th>
            <th style="padding:8px 10px;color:white;font-size:11px;text-align:left;">الرصيد</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
        <tfoot>
          <tr style="background:#1e293b;color:white;font-weight:700;">
            <td colspan="4" style="padding:8px 10px;font-size:12px;">الإجمالي</td>
            <td style="padding:8px 10px;font-size:12px;text-align:left;">${totDebit.toLocaleString()}</td>
            <td style="padding:8px 10px;font-size:12px;text-align:left;">${totCredit.toLocaleString()}</td>
            <td style="padding:8px 10px;font-size:12px;text-align:left;">${finalBal.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top:20px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;">
        طُبع بتاريخ: ${new Date().toLocaleDateString("ar-EG")} • ${company.name || ""}
      </div>
    </div></body></html>
  `);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 600);
}

// ─── Account Statement Modal ───────────────────────────────────────────────────
function AccountStatementModal({ account, rows, open, onClose, currency }) {
  const company = getCompany();
  const totDebit = rows.reduce((s, r) => s + (r.debit || 0), 0);
  const totCredit = rows.reduce((s, r) => s + (r.credit || 0), 0);
  const finalBal = rows.length ? rows[rows.length - 1].balance : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
        {/* toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <h2 className="font-bold text-sm">كشف حساب: {account?.name}</h2>
              <p className="text-xs text-muted-foreground">{account?.account_number} • {rows.length} حركة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5"
              onClick={() => printStatement(account, rows, company, "", "", currency)}>
              <Printer className="h-4 w-4" /> طباعة
            </Button>
            <ExportButtons
              columns={[
                { key: "date", label: "التاريخ" },
                { key: "type", label: "نوع العملية" },
                { key: "number", label: "الرقم" },
                { key: "notes", label: "البيان" },
                { key: "debit", label: "مدين" },
                { key: "credit", label: "دائن" },
                { key: "balance", label: "الرصيد" },
              ]}
              data={rows} title={`كشف حساب - ${account?.name}`} filename={`statement-${account?.account_number}`}
            />
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 px-5 py-3 bg-muted/20 border-b shrink-0">
          <div className="flex flex-col items-center p-2 rounded-lg bg-green-50 border border-green-200">
            <p className="text-[10px] text-green-700">إجمالي المدين</p>
            <p className="text-base font-black text-green-700">{totDebit.toLocaleString()}</p>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-red-50 border border-red-200">
            <p className="text-[10px] text-red-600">إجمالي الدائن</p>
            <p className="text-base font-black text-red-600">{totCredit.toLocaleString()}</p>
          </div>
          <div className={`flex flex-col items-center p-2 rounded-lg border ${finalBal >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
            <p className={`text-[10px] ${finalBal >= 0 ? "text-blue-700" : "text-orange-600"}`}>الرصيد الختامي</p>
            <p className={`text-base font-black ${finalBal >= 0 ? "text-blue-700" : "text-orange-600"}`}>{finalBal.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{finalBal >= 0 ? "مدين" : "دائن"}</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 sticky top-0">
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
              {rows.map((r, i) => (
                <TableRow key={i} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                  <TableCell className="text-xs">{r.date}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px] font-normal">{r.type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium">{r.number}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{r.notes}</TableCell>
                  <TableCell className="text-xs text-green-600 font-semibold">{r.debit > 0 ? r.debit.toLocaleString() : ""}</TableCell>
                  <TableCell className="text-xs text-red-500 font-semibold">{r.credit > 0 ? r.credit.toLocaleString() : ""}</TableCell>
                  <TableCell className={`text-xs font-bold ${r.balance >= 0 ? "text-blue-700" : "text-orange-600"}`}>
                    {r.balance.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function GeneralLedger() {
  const { getDisplayRate } = useCurrency();

  const [accounts, setAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    dateFrom: "", dateTo: "",
    accountType: "الكل", // الكل | عميل | مورد | حساب
    search: "",
  });

  const [ledgerData, setLedgerData] = useState([]); // [{account, rows, totDebit, totCredit, balance}]
  const [generated, setGenerated] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [statementModal, setStatementModal] = useState(null); // {account, rows}

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [a, c, v, inv] = await Promise.all([
      base44.entities.Account.list(),
      base44.entities.Currency.list(),
      base44.entities.Voucher.list(),
      base44.entities.Invoice.list(),
    ]);
    setAccounts(a); setCurrencies(c); setVouchers(v); setInvoices(inv);
    setLoading(false);
  }

  function buildAccountRows(accountId) {
    const localCur = currencies.find(c => c.is_local);
    const rows = [];

    // Vouchers
    vouchers.forEach(v => {
      if (filters.dateFrom && v.date < filters.dateFrom) return;
      if (filters.dateTo && v.date > filters.dateTo) return;

      if (v.account_id === accountId) {
        rows.push({ date: v.date, type: v.type, number: v.voucher_number, debit: v.amount || 0, credit: 0, notes: v.notes || "" });
      }
      if (v.counter_account_id === accountId) {
        rows.push({ date: v.date, type: v.type, number: v.voucher_number, debit: 0, credit: v.amount || 0, notes: v.counter_notes || v.notes || "" });
      }
      (v.entries || []).forEach(e => {
        if (e.account_id === accountId) {
          rows.push({ date: v.date, type: v.type, number: v.voucher_number, debit: e.debit || 0, credit: e.credit || 0, notes: e.notes || v.notes || "" });
        }
      });
    });

    // Invoices
    invoices.forEach(inv => {
      if (inv.client_account_id !== accountId) return;
      if (filters.dateFrom && inv.date < filters.dateFrom) return;
      if (filters.dateTo && inv.date > filters.dateTo) return;

      const isSale = inv.pattern_type === "مبيعات" || inv.pattern_type === "مرتجع مشتريات";
      const total = inv.total || 0;
      rows.push({
        date: inv.date, type: inv.pattern_type, number: inv.invoice_number,
        debit: isSale ? total : 0, credit: isSale ? 0 : total, notes: inv.notes || "",
      });
    });

    rows.sort((a, b) => (a.date > b.date ? 1 : -1));
    let balance = 0;
    return rows.map(r => { balance += r.debit - r.credit; return { ...r, balance }; });
  }

  function generateLedger() {
    let filtered = accounts;

    if (filters.accountType === "عميل") {
      filtered = accounts.filter(a => a.name.includes("عميل") || a.account_number?.startsWith("1") || invoices.some(i => i.client_account_id === a.id && (i.pattern_type === "مبيعات" || i.pattern_type === "مرتجع مبيعات")));
    } else if (filters.accountType === "مورد") {
      filtered = accounts.filter(a => a.name.includes("مورد") || invoices.some(i => i.client_account_id === a.id && (i.pattern_type === "مشتريات" || i.pattern_type === "مرتجع مشتريات")));
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(a => a.name?.toLowerCase().includes(q) || a.account_number?.includes(q));
    }

    const data = filtered.map(account => {
      const rows = buildAccountRows(account.id);
      const totDebit = rows.reduce((s, r) => s + r.debit, 0);
      const totCredit = rows.reduce((s, r) => s + r.credit, 0);
      const balance = totDebit - totCredit;
      return { account, rows, totDebit, totCredit, balance };
    }).filter(d => d.rows.length > 0);

    data.sort((a, b) => (a.account.account_number || "").localeCompare(b.account.account_number || ""));
    setLedgerData(data);
    setGenerated(true);
    setExpanded({});
  }

  const summary = useMemo(() => {
    const totDebit = ledgerData.reduce((s, d) => s + d.totDebit, 0);
    const totCredit = ledgerData.reduce((s, d) => s + d.totCredit, 0);
    return { totDebit, totCredit, accounts: ledgerData.length };
  }, [ledgerData]);

  const localCur = currencies.find(c => c.is_local);
  const curSymbol = localCur?.symbol || localCur?.name || "";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            دفتر الأستاذ العام
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">حركة الحسابات المالية بالتفصيل • كشف حساب لكل عميل أو مورد</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={loadData}>
          <RefreshCw className="h-3.5 w-3.5" /> تحديث البيانات
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs mb-1 block">نوع الحساب</Label>
              <Select value={filters.accountType} onValueChange={v => setFilters(p => ({ ...p, accountType: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="الكل">كل الحسابات</SelectItem>
                  <SelectItem value="عميل">العملاء</SelectItem>
                  <SelectItem value="مورد">الموردون</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">بحث بالاسم أو الرقم</Label>
              <div className="relative">
                <Search className="absolute right-2 top-2 h-4 w-4 text-muted-foreground" />
                <Input className="h-9 pr-8" placeholder="ابحث..." value={filters.search}
                  onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">من تاريخ</Label>
              <Input className="h-9" type="date" value={filters.dateFrom}
                onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">إلى تاريخ</Label>
              <Input className="h-9" type="date" value={filters.dateTo}
                onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <Button className="w-full gap-1.5" onClick={generateLedger}>
                <Search className="h-4 w-4" /> عرض دفتر الأستاذ
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary bar */}
      {generated && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-xs text-green-700">إجمالي المدين</p>
                <p className="text-lg font-black text-green-700">{summary.totDebit.toLocaleString()} {curSymbol}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-3 flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-xs text-red-600">إجمالي الدائن</p>
                <p className="text-lg font-black text-red-600">{summary.totCredit.toLocaleString()} {curSymbol}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-xs text-blue-700">عدد الحسابات النشطة</p>
                <p className="text-lg font-black text-blue-700">{summary.accounts} حساب</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ledger Accounts */}
      {generated && ledgerData.length > 0 ? (
        <div className="space-y-2">
          {ledgerData.map(({ account, rows, totDebit, totCredit, balance }) => {
            const isOpen = expanded[account.id];
            const hasInvoices = invoices.some(i => i.client_account_id === account.id);
            const isClient = hasInvoices && invoices.some(i => i.client_account_id === account.id && (i.pattern_type === "مبيعات" || i.pattern_type === "مرتجع مبيعات"));
            const isSupplier = hasInvoices && invoices.some(i => i.client_account_id === account.id && (i.pattern_type === "مشتريات" || i.pattern_type === "مرتجع مشتريات"));

            return (
              <Card key={account.id} className={`overflow-hidden transition-all ${isOpen ? "shadow-md" : ""}`}>
                {/* Account header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpanded(p => ({ ...p, [account.id]: !p[account.id] }))}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isClient ? "bg-blue-100" : isSupplier ? "bg-purple-100" : "bg-gray-100"}`}>
                      {isClient ? <User className="h-3.5 w-3.5 text-blue-600" /> : isSupplier ? <Truck className="h-3.5 w-3.5 text-purple-600" /> : <BookOpen className="h-3.5 w-3.5 text-gray-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.account_number}</p>
                    </div>
                    {isClient && <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] shrink-0">عميل</Badge>}
                    {isSupplier && <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px] shrink-0">مورد</Badge>}
                    <Badge variant="outline" className="text-[10px] shrink-0">{rows.length} حركة</Badge>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center hidden md:block">
                      <p className="text-[10px] text-muted-foreground">مدين</p>
                      <p className="text-sm font-semibold text-green-600">{totDebit > 0 ? totDebit.toLocaleString() : "—"}</p>
                    </div>
                    <div className="text-center hidden md:block">
                      <p className="text-[10px] text-muted-foreground">دائن</p>
                      <p className="text-sm font-semibold text-red-500">{totCredit > 0 ? totCredit.toLocaleString() : "—"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">الرصيد</p>
                      <p className={`text-sm font-black ${balance >= 0 ? "text-blue-700" : "text-orange-600"}`}>
                        {balance.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-muted-foreground">{balance >= 0 ? "مدين" : "دائن"}</p>
                    </div>
                    {/* Statement button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs h-7 px-2 shrink-0"
                      onClick={e => { e.stopPropagation(); setStatementModal({ account, rows }); }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      كشف حساب
                    </Button>
                  </div>
                </div>

                {/* Detail rows */}
                {isOpen && (
                  <div className="border-t">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-right text-xs py-2">التاريخ</TableHead>
                          <TableHead className="text-right text-xs py-2">نوع العملية</TableHead>
                          <TableHead className="text-right text-xs py-2">الرقم</TableHead>
                          <TableHead className="text-right text-xs py-2">البيان</TableHead>
                          <TableHead className="text-right text-xs py-2">مدين</TableHead>
                          <TableHead className="text-right text-xs py-2">دائن</TableHead>
                          <TableHead className="text-right text-xs py-2">الرصيد</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => (
                          <TableRow key={i} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                            <TableCell className="text-xs py-1.5">{r.date}</TableCell>
                            <TableCell className="text-xs py-1.5">
                              <span className="text-muted-foreground">{r.type}</span>
                            </TableCell>
                            <TableCell className="text-xs py-1.5 font-medium">{r.number}</TableCell>
                            <TableCell className="text-xs py-1.5 text-muted-foreground max-w-[200px] truncate">{r.notes}</TableCell>
                            <TableCell className="text-xs py-1.5 text-green-600 font-semibold">{r.debit > 0 ? r.debit.toLocaleString() : ""}</TableCell>
                            <TableCell className="text-xs py-1.5 text-red-500 font-semibold">{r.credit > 0 ? r.credit.toLocaleString() : ""}</TableCell>
                            <TableCell className={`text-xs py-1.5 font-bold ${r.balance >= 0 ? "text-blue-700" : "text-orange-600"}`}>
                              {r.balance.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {/* Footer totals */}
                    <div className="flex justify-end gap-6 px-4 py-2 bg-muted/20 border-t text-xs font-semibold">
                      <span className="text-muted-foreground">الإجمالي:</span>
                      <span className="text-green-600">مدين: {totDebit.toLocaleString()}</span>
                      <span className="text-red-500">دائن: {totCredit.toLocaleString()}</span>
                      <span className={balance >= 0 ? "text-blue-700" : "text-orange-600"}>
                        الرصيد: {balance.toLocaleString()} ({balance >= 0 ? "مدين" : "دائن"})
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : generated ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد حسابات تطابق المعايير المحددة</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <BookOpen className="h-14 w-14 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-1">دفتر الأستاذ العام</p>
            <p className="text-sm">حدد الفلاتر واضغط "عرض دفتر الأستاذ" لعرض حركات الحسابات</p>
          </CardContent>
        </Card>
      )}

      {/* Account Statement Modal */}
      {statementModal && (
        <AccountStatementModal
          account={statementModal.account}
          rows={statementModal.rows}
          open={!!statementModal}
          onClose={() => setStatementModal(null)}
          currency={curSymbol}
        />
      )}
    </div>
  );
}