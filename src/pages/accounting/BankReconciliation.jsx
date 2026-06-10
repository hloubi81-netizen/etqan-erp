import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Upload, CheckCircle2, AlertCircle, Download, RefreshCw,
  ArrowUpCircle, ArrowDownCircle, FileText, X, Link, Link2Off,
  ChevronsUpDown, Scale, Eye, Trash2
} from "lucide-react";
import { toast } from "sonner";
import AccountSearchInput from "@/components/shared/AccountSearchInput";

const EMPTY = {
  reconciliation_number: "", account_id: "", account_name: "", period: "",
  bank_balance: 0, book_balance: 0, difference: 0,
  transactions: [], status: "مفتوحة", notes: ""
};

function calcDiff(bankBal, bookBal) {
  return parseFloat(((parseFloat(bankBal) || 0) - (parseFloat(bookBal) || 0)).toFixed(2));
}

export default function BankReconciliation() {
  const [recs, setRecs]         = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading]   = useState(true);

  // New / edit dialog
  const [open, setOpen]         = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [editing, setEditing]   = useState(null);

  // Detail (matching) dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [matchForm, setMatchForm]   = useState(null);

  const fileRef = useRef();

  useEffect(() => {
    Promise.all([
      base44.entities.BankReconciliation.list("-created_date"),
      base44.entities.Account.filter({ is_parent: false }),
      base44.entities.Voucher.list("-date", 300),
    ]).then(([r, a, v]) => { setRecs(r); setAccounts(a); setVouchers(v); setLoading(false); });
  }, []);

  // ── Helpers ──────────────────────────────────────────
  function openAdd() {
    const num = `BR-${String(recs.length + 1).padStart(4, "0")}`;
    setForm({ ...EMPTY, reconciliation_number: num });
    setEditing(null); setOpen(true);
  }

  function updateForm(key, val) {
    setForm(p => {
      const next = { ...p, [key]: val };
      next.difference = calcDiff(next.bank_balance, next.book_balance);
      return next;
    });
  }

  async function handleCSV(e) {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").slice(1).filter(Boolean);
    const transactions = lines.map(line => {
      const cols = line.split(",");
      const amt  = parseFloat(cols[2]) || 0;
      return { date: cols[0]?.trim() || "", description: cols[1]?.trim() || "", amount: Math.abs(amt), type: amt >= 0 ? "إيداع" : "سحب", matched: false, voucher_id: "" };
    }).filter(t => t.date && t.amount > 0);
    setForm(p => ({ ...p, transactions }));
    toast.success(`تم استيراد ${transactions.length} معاملة من الكشف البنكي`);
  }

  function addManualTx() {
    setForm(p => ({
      ...p,
      transactions: [...p.transactions, { date: new Date().toISOString().split("T")[0], description: "", amount: 0, type: "إيداع", matched: false, voucher_id: "" }]
    }));
  }

  function updateTx(idx, key, val) {
    setForm(p => ({ ...p, transactions: p.transactions.map((t, i) => i === idx ? { ...t, [key]: key === "amount" ? (parseFloat(val) || 0) : val } : t) }));
  }

  function removeTx(idx) {
    setForm(p => ({ ...p, transactions: p.transactions.filter((_, i) => i !== idx) }));
  }

  async function save() {
    if (!form.account_id || !form.period) { toast.error("الحساب البنكي والفترة مطلوبان"); return; }
    const data = { ...form };
    if (editing) {
      await base44.entities.BankReconciliation.update(editing, data);
      setRecs(p => p.map(r => r.id === editing ? { ...r, ...data } : r));
      toast.success("تم تحديث التسوية");
    } else {
      const created = await base44.entities.BankReconciliation.create(data);
      setRecs(p => [created, ...p]);
      toast.success("تم إنشاء تسوية جديدة ✅");
    }
    setOpen(false);
  }

  async function closeRec(id) {
    await base44.entities.BankReconciliation.update(id, { status: "مغلقة" });
    setRecs(p => p.map(r => r.id === id ? { ...r, status: "مغلقة" } : r));
    toast.success("تم إغلاق التسوية");
  }

  async function del(id) {
    if (!confirm("هل أنت متأكد من حذف هذه التسوية؟")) return;
    await base44.entities.BankReconciliation.delete(id);
    setRecs(p => p.filter(r => r.id !== id));
    toast.success("تم الحذف");
  }

  // ── Matching dialog ───────────────────────────────────
  function openDetail(rec) {
    setSelected(rec);
    setMatchForm({ ...rec, transactions: (rec.transactions || []).map(t => ({ ...t })) });
    setDetailOpen(true);
  }

  function toggleMatch(idx, voucherId) {
    setMatchForm(p => ({
      ...p,
      transactions: p.transactions.map((t, i) => i === idx ? { ...t, matched: !t.matched, voucher_id: t.matched ? "" : (voucherId || "") } : t)
    }));
  }

  async function saveMatching() {
    const updated = {
      ...matchForm,
      transactions: matchForm.transactions,
      book_balance: matchForm.book_balance,
      bank_balance: matchForm.bank_balance,
      difference: calcDiff(matchForm.bank_balance, matchForm.book_balance)
    };
    await base44.entities.BankReconciliation.update(selected.id, updated);
    setRecs(p => p.map(r => r.id === selected.id ? { ...r, ...updated } : r));
    toast.success("تم حفظ المطابقة");
    setDetailOpen(false);
  }

  // ── computed stats for matching dialog ────────────────
  const matchedTx   = matchForm?.transactions?.filter(t => t.matched) || [];
  const unmatchedTx = matchForm?.transactions?.filter(t => !t.matched) || [];
  const matchedSum  = matchedTx.reduce((s, t) => s + (t.type === "إيداع" ? t.amount : -t.amount), 0);
  const adjBookBal  = matchForm ? (parseFloat(matchForm.book_balance) || 0) + matchedSum : 0;
  const finalDiff   = matchForm ? calcDiff(matchForm.bank_balance, adjBookBal) : 0;

  // ── form stats ─────────────────────────────────────────
  const formMatchedCount   = form.transactions.filter(t => t.matched).length;
  const formDepositTotal   = form.transactions.filter(t => t.type === "إيداع").reduce((s, t) => s + t.amount, 0);
  const formWithdrawTotal  = form.transactions.filter(t => t.type === "سحب").reduce((s, t) => s + t.amount, 0);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">التسويات البنكية</h1>
          <p className="text-sm text-muted-foreground mt-0.5">مطابقة كشوف البنك مع الدفاتر المحاسبية وتحديد الفروقات</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />تسوية جديدة</Button>
      </div>

      {/* Summary KPIs */}
      {recs.length > 0 && (() => {
        const open_   = recs.filter(r => r.status === "مفتوحة").length;
        const closed_ = recs.filter(r => r.status === "مغلقة").length;
        const matched_ = recs.filter(r => Math.abs(r.difference || 0) < 0.01).length;
        return (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "تسويات مفتوحة",  value: open_,    color: "text-amber-600",  bg: "bg-amber-50 border-amber-100" },
              { label: "تسويات مغلقة",   value: closed_,  color: "text-green-700",  bg: "bg-green-50 border-green-100" },
              { label: "حسابات متطابقة", value: matched_,  color: "text-blue-700",   bg: "bg-blue-50 border-blue-100" },
            ].map(({ label, value, color, bg }) => (
              <Card key={label} className={`border ${bg}`}>
                <CardContent className="p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })()}

      {/* Reconciliation List */}
      {recs.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Scale className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">لا توجد تسويات بنكية بعد</p>
            <Button onClick={openAdd} variant="outline" size="sm" className="mt-3 gap-2">
              <Plus className="h-3.5 w-3.5" />أنشئ أول تسوية
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recs.map(rec => {
            const isMatched = Math.abs(rec.difference || 0) < 0.01;
            const txCount   = (rec.transactions || []).length;
            const txMatched = (rec.transactions || []).filter(t => t.matched).length;
            return (
              <Card key={rec.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Left: identity */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold font-mono text-sm">{rec.reconciliation_number}</span>
                        <Badge variant={rec.status === "مغلقة" ? "default" : "secondary"} className="text-xs">{rec.status}</Badge>
                        {isMatched && <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />متطابق</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.account_name} • <span className="font-medium text-foreground">{rec.period}</span></p>
                      {txCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {txMatched}/{txCount} معاملة مطابقة
                        </p>
                      )}
                    </div>

                    {/* Center: balances */}
                    <div className="flex gap-5 text-center text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-0.5">رصيد البنك</p>
                        <p className="font-bold text-blue-600">{(rec.bank_balance || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-muted-foreground self-center text-lg">↔</div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-0.5">الرصيد الدفتري</p>
                        <p className="font-bold text-slate-700">{(rec.book_balance || 0).toLocaleString()}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-lg ${isMatched ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
                        <p className="text-[10px] text-muted-foreground mb-0.5">الفرق</p>
                        <p className={`font-bold text-sm ${isMatched ? "text-green-600" : "text-red-600"}`}>
                          {isMatched ? "✓ صفر" : (rec.difference || 0) > 0 ? `+${(rec.difference).toLocaleString()}` : (rec.difference || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => openDetail(rec)}>
                        <Eye className="h-3.5 w-3.5" />مطابقة تفصيلية
                      </Button>
                      {rec.status === "مفتوحة" && (
                        <>
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setForm({ ...rec }); setEditing(rec.id); setOpen(true); }}>تعديل</Button>
                          <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700" onClick={() => closeRec(rec.id)}>إغلاق</Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => del(rec.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>

                  {/* Progress bar for matching */}
                  {txCount > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>نسبة المطابقة</span>
                        <span>{Math.round((txMatched / txCount) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${txMatched === txCount ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${(txMatched / txCount) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ════ NEW / EDIT DIALOG ════ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل التسوية البنكية" : "إنشاء تسوية بنكية جديدة"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="info">بيانات التسوية</TabsTrigger>
              <TabsTrigger value="tx">معاملات الكشف البنكي {form.transactions.length > 0 && `(${form.transactions.length})`}</TabsTrigger>
            </TabsList>

            {/* Tab 1: Info */}
            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">رقم التسوية</Label>
                  <Input value={form.reconciliation_number} onChange={e => setForm(p => ({ ...p, reconciliation_number: e.target.value }))} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">الفترة *</Label>
                  <Input placeholder="مثال: 2025-06 أو يونيو 2025" value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} className="mt-1 h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs">الحساب البنكي *</Label>
                <AccountSearchInput accounts={accounts} value={form.account_id} onChange={(id, name) => setForm(p => ({ ...p, account_id: id, account_name: name }))} placeholder="ابحث عن الحساب البنكي..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">رصيد البنك (كشف الحساب)</Label>
                  <Input type="number" value={form.bank_balance} onChange={e => updateForm("bank_balance", parseFloat(e.target.value) || 0)} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">الرصيد الدفتري (سجلاتنا)</Label>
                  <Input type="number" value={form.book_balance} onChange={e => updateForm("book_balance", parseFloat(e.target.value) || 0)} className="mt-1 h-9" />
                </div>
              </div>

              {/* Difference card */}
              <div className={`rounded-xl p-4 border ${Math.abs(form.difference) < 0.01 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-center gap-3">
                  {Math.abs(form.difference) < 0.01
                    ? <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                    : <AlertCircle className="h-6 w-6 text-red-500 shrink-0" />}
                  <div className="flex-1">
                    <p className={`font-bold text-lg ${Math.abs(form.difference) < 0.01 ? "text-green-700" : "text-red-600"}`}>
                      {Math.abs(form.difference) < 0.01 ? "الحسابات متطابقة تماماً ✓" : `الفرق: ${form.difference > 0 ? "+" : ""}${form.difference.toLocaleString()}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.abs(form.difference) < 0.01
                        ? "رصيد البنك يساوي الرصيد الدفتري"
                        : form.difference > 0
                          ? "رصيد البنك أعلى من الرصيد الدفتري — قد توجد إيداعات غير مسجلة"
                          : "الرصيد الدفتري أعلى من رصيد البنك — قد توجد سحوبات غير مسجلة"}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">رصيد البنك</p>
                    <p className="font-bold text-blue-600">{(form.bank_balance || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">الرصيد الدفتري</p>
                    <p className="font-bold text-slate-700">{(form.book_balance || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">ملاحظات</Label>
                <Input value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1 h-9" placeholder="أي ملاحظات إضافية..." />
              </div>
            </TabsContent>

            {/* Tab 2: Transactions */}
            <TabsContent value="tx" className="space-y-3">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />استيراد CSV
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={addManualTx}>
                  <Plus className="h-3.5 w-3.5" />إضافة يدوي
                </Button>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
                <span className="text-xs text-muted-foreground mr-auto">تنسيق CSV: التاريخ، الوصف، المبلغ (+إيداع/-سحب)</span>
              </div>

              {form.transactions.length > 0 ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-green-50 border border-green-100 rounded-lg p-2">
                      <p className="text-muted-foreground">إجمالي الإيداعات</p>
                      <p className="font-bold text-green-700">+{formDepositTotal.toLocaleString()}</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                      <p className="text-muted-foreground">إجمالي السحوبات</p>
                      <p className="font-bold text-red-600">-{formWithdrawTotal.toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                      <p className="text-muted-foreground">صافي الحركة</p>
                      <p className={`font-bold ${formDepositTotal - formWithdrawTotal >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {(formDepositTotal - formWithdrawTotal).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 grid grid-cols-5 text-xs text-muted-foreground font-medium">
                      <span>التاريخ</span><span className="col-span-2">الوصف</span><span>النوع/المبلغ</span><span className="text-center">حذف</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y">
                      {form.transactions.map((t, i) => (
                        <div key={i} className="grid grid-cols-5 items-center px-3 py-2 text-xs hover:bg-muted/10">
                          <input type="date" value={t.date} onChange={e => updateTx(i, "date", e.target.value)} className="h-7 border rounded px-1 text-xs w-full" />
                          <input value={t.description} onChange={e => updateTx(i, "description", e.target.value)} placeholder="الوصف..." className="col-span-1 h-7 border rounded px-2 text-xs mx-1" />
                          <div className="flex items-center gap-1 col-span-1">
                            <select value={t.type} onChange={e => updateTx(i, "type", e.target.value)} className="h-7 border rounded text-xs px-1">
                              <option value="إيداع">إيداع</option>
                              <option value="سحب">سحب</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <input type="number" value={t.amount} onChange={e => updateTx(i, "amount", e.target.value)} className={`h-7 border rounded px-1 text-xs w-20 font-semibold ${t.type === "إيداع" ? "text-green-700" : "text-red-600"}`} />
                          </div>
                          <button onClick={() => removeTx(i)} className="flex justify-center text-muted-foreground hover:text-destructive">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد معاملات</p>
                  <p className="text-xs mt-1">استورد ملف CSV أو أضف معاملات يدوياً</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} className="min-w-[100px]">حفظ التسوية</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ DETAIL / MATCHING DIALOG ════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              مطابقة تفصيلية — {selected?.reconciliation_number}
            </DialogTitle>
          </DialogHeader>

          {matchForm && (
            <div className="space-y-4 mt-2">
              {/* Balances summary banner */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "رصيد البنك", value: matchForm.bank_balance, color: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
                  { label: "الرصيد الدفتري", value: matchForm.book_balance, color: "text-slate-700", bg: "bg-slate-50 border-slate-100" },
                  { label: "صافي المطابقة", value: matchedSum, color: matchedSum >= 0 ? "text-green-700" : "text-red-600", bg: "bg-muted/40 border-muted" },
                  { label: "الفرق المتبقي", value: finalDiff, color: Math.abs(finalDiff) < 0.01 ? "text-green-700" : "text-red-600", bg: Math.abs(finalDiff) < 0.01 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{value > 0 ? "+" : ""}{(value || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Difference alert */}
              <div className={`rounded-xl p-3 border flex items-center gap-3 ${Math.abs(finalDiff) < 0.01 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                {Math.abs(finalDiff) < 0.01
                  ? <><CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /><p className="text-sm font-bold text-green-700">التسوية مكتملة — لا يوجد فرق بعد المطابقة ✓</p></>
                  : <><AlertCircle className="h-5 w-5 text-amber-600 shrink-0" /><div><p className="text-sm font-bold text-amber-700">يوجد فرق غير مُوضَّح: {finalDiff > 0 ? "+" : ""}{finalDiff.toLocaleString()}</p><p className="text-xs text-muted-foreground">قم بمطابقة المزيد من المعاملات لتصفير الفرق</p></div></>
                }
              </div>

              {/* Edit balances inline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">رصيد البنك (قابل للتعديل)</Label>
                  <Input type="number" value={matchForm.bank_balance} onChange={e => setMatchForm(p => ({ ...p, bank_balance: parseFloat(e.target.value) || 0 }))} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">الرصيد الدفتري (قابل للتعديل)</Label>
                  <Input type="number" value={matchForm.book_balance} onChange={e => setMatchForm(p => ({ ...p, book_balance: parseFloat(e.target.value) || 0 }))} className="mt-1 h-9" />
                </div>
              </div>

              {/* Transactions matching table */}
              {matchForm.transactions.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-6">لا توجد معاملات في هذه التسوية</p>
              ) : (
                <Tabs defaultValue="all">
                  <div className="flex items-center justify-between mb-2">
                    <TabsList>
                      <TabsTrigger value="all">الكل ({matchForm.transactions.length})</TabsTrigger>
                      <TabsTrigger value="unmatched" className="text-amber-600">غير مطابق ({unmatchedTx.length})</TabsTrigger>
                      <TabsTrigger value="matched" className="text-green-600">مطابق ({matchedTx.length})</TabsTrigger>
                    </TabsList>
                    <div className="text-xs text-muted-foreground">
                      انقر على ✓ لتأكيد المطابقة
                    </div>
                  </div>

                  {["all", "unmatched", "matched"].map(tab => (
                    <TabsContent key={tab} value={tab}>
                      <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr className="text-xs text-muted-foreground">
                              <th className="p-3 text-right">التاريخ</th>
                              <th className="p-3 text-right">الوصف</th>
                              <th className="p-3 text-right">النوع</th>
                              <th className="p-3 text-right">المبلغ</th>
                              <th className="p-3 text-right">ربط بسند</th>
                              <th className="p-3 text-center">مطابق</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {(tab === "all" ? matchForm.transactions : tab === "unmatched" ? unmatchedTx : matchedTx).map((t, realIdx) => {
                              const idx = matchForm.transactions.indexOf(t);
                              const relatedVoucher = vouchers.find(v => v.id === t.voucher_id);
                              return (
                                <tr key={idx} className={`hover:bg-muted/10 ${t.matched ? "bg-green-50/40" : ""}`}>
                                  <td className="p-3 text-muted-foreground whitespace-nowrap">{t.date}</td>
                                  <td className="p-3 max-w-[180px]">
                                    <p className="truncate">{t.description}</p>
                                    {relatedVoucher && <p className="text-xs text-blue-600">↗ {relatedVoucher.voucher_number}</p>}
                                  </td>
                                  <td className="p-3">
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${t.type === "إيداع" ? "text-green-700" : "text-red-600"}`}>
                                      {t.type === "إيداع" ? <ArrowUpCircle className="h-3.5 w-3.5" /> : <ArrowDownCircle className="h-3.5 w-3.5" />}
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className={`p-3 font-bold ${t.type === "إيداع" ? "text-green-700" : "text-red-600"}`}>
                                    {t.type === "إيداع" ? "+" : "-"}{(t.amount || 0).toLocaleString()}
                                  </td>
                                  <td className="p-3">
                                    <select value={t.voucher_id || ""} onChange={e => { const copy = [...matchForm.transactions]; copy[idx] = { ...copy[idx], voucher_id: e.target.value }; setMatchForm(p => ({ ...p, transactions: copy })); }}
                                      className="border rounded text-xs h-7 px-1 w-36 bg-background">
                                      <option value="">-- بدون ربط --</option>
                                      {vouchers.filter(v => Math.abs((v.total || 0) - (t.amount || 0)) < 1).map(v => (
                                        <option key={v.id} value={v.id}>{v.voucher_number} ({(v.total || 0).toLocaleString()})</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-3 text-center">
                                    <button onClick={() => toggleMatch(idx, t.voucher_id)}
                                      className={`h-7 w-7 rounded-full border-2 flex items-center justify-center mx-auto transition-colors ${t.matched ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/40 hover:border-green-400"}`}>
                                      {t.matched && <CheckCircle2 className="h-4 w-4" />}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}

              {/* Unreconciled items explanation */}
              {unmatchedTx.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-2">
                  <p className="font-semibold text-amber-700 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> بنود غير مُسوَّاة ({unmatchedTx.length})
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-1">إيداعات غير مطابقة</p>
                      {unmatchedTx.filter(t => t.type === "إيداع").map((t, i) => (
                        <div key={i} className="flex justify-between text-green-700"><span className="truncate max-w-[140px]">{t.description || t.date}</span><span>+{t.amount.toLocaleString()}</span></div>
                      ))}
                      {unmatchedTx.filter(t => t.type === "إيداع").length === 0 && <p className="text-muted-foreground italic">لا يوجد</p>}
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">سحوبات غير مطابقة</p>
                      {unmatchedTx.filter(t => t.type === "سحب").map((t, i) => (
                        <div key={i} className="flex justify-between text-red-600"><span className="truncate max-w-[140px]">{t.description || t.date}</span><span>-{t.amount.toLocaleString()}</span></div>
                      ))}
                      {unmatchedTx.filter(t => t.type === "سحب").length === 0 && <p className="text-muted-foreground italic">لا يوجد</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>إغلاق</Button>
            <Button onClick={saveMatching} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />حفظ المطابقة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}