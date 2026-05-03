import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Upload, CheckCircle, AlertCircle, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import AccountSearchInput from "@/components/shared/AccountSearchInput";

const EMPTY = { reconciliation_number: "", account_id: "", account_name: "", period: "", bank_balance: 0, book_balance: 0, difference: 0, transactions: [], status: "مفتوحة", notes: "" };

export default function BankReconciliation() {
  const [recs, setRecs] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    Promise.all([
      base44.entities.BankReconciliation.list("-created_date"),
      base44.entities.Account.filter({ is_parent: false }),
      base44.entities.Voucher.list("-date", 200),
    ]).then(([r, a, v]) => { setRecs(r); setAccounts(a); setVouchers(v); setLoading(false); });
  }, []);

  function openAdd() {
    const num = `BR-${Date.now()}`.slice(-8);
    setForm({ ...EMPTY, reconciliation_number: num });
    setEditing(null); setOpen(true);
  }

  function updateForm(key, val) {
    setForm((p) => {
      const next = { ...p, [key]: val };
      next.difference = (parseFloat(next.bank_balance) || 0) - (parseFloat(next.book_balance) || 0);
      return next;
    });
  }

  async function handleCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").slice(1).filter(Boolean);
    const transactions = lines.map((line) => {
      const cols = line.split(",");
      return {
        date: cols[0]?.trim() || "",
        description: cols[1]?.trim() || "",
        amount: Math.abs(parseFloat(cols[2]) || 0),
        type: parseFloat(cols[2]) >= 0 ? "إيداع" : "سحب",
        matched: false,
        voucher_id: "",
      };
    }).filter((t) => t.date && t.amount > 0);
    setForm((p) => ({ ...p, transactions }));
    toast.success(`تم استيراد ${transactions.length} معاملة`);
  }

  function toggleMatch(idx, voucherId) {
    setForm((p) => ({
      ...p,
      transactions: p.transactions.map((t, i) => i === idx ? { ...t, matched: !t.matched, voucher_id: voucherId || "" } : t),
    }));
  }

  async function save() {
    if (!form.account_id || !form.period) { toast.error("الحساب والفترة مطلوبان"); return; }
    if (editing) {
      await base44.entities.BankReconciliation.update(editing, form);
      setRecs((p) => p.map((r) => r.id === editing ? { ...r, ...form } : r));
    } else {
      const created = await base44.entities.BankReconciliation.create(form);
      setRecs((p) => [created, ...p]);
    }
    toast.success("تم الحفظ");
    setOpen(false);
  }

  async function close(id) {
    await base44.entities.BankReconciliation.update(id, { status: "مغلقة" });
    setRecs((p) => p.map((r) => r.id === id ? { ...r, status: "مغلقة" } : r));
    toast.success("تم إغلاق التسوية");
  }

  async function del(id) {
    if (!confirm("حذف هذه التسوية؟")) return;
    await base44.entities.BankReconciliation.delete(id);
    setRecs((p) => p.filter((r) => r.id !== id));
  }

  const matchedCount = form.transactions.filter((t) => t.matched).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">التسويات البنكية</h1>
          <p className="text-sm text-muted-foreground mt-1">مطابقة كشوف الحساب البنكي مع الدفاتر المحاسبية</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />تسوية جديدة</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : recs.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">لا توجد تسويات بنكية</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {recs.map((rec) => (
            <Card key={rec.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold">{rec.reconciliation_number}</p>
                      <Badge variant={rec.status === "مغلقة" ? "default" : "secondary"}>{rec.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.account_name} • {rec.period}</p>
                  </div>
                  <div className="flex gap-6 text-center text-sm">
                    <div><p className="text-xs text-muted-foreground">رصيد البنك</p><p className="font-bold text-blue-600">{(rec.bank_balance || 0).toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">الرصيد الدفتري</p><p className="font-bold text-green-600">{(rec.book_balance || 0).toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">الفرق</p>
                      <p className={`font-bold ${Math.abs(rec.difference || 0) < 0.01 ? "text-green-600" : "text-red-500"}`}>
                        {Math.abs(rec.difference || 0) < 0.01 ? "✓ متطابق" : (rec.difference || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {rec.status === "مفتوحة" && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => { setForm({ ...rec }); setEditing(rec.id); setOpen(true); }}>تعديل</Button>
                        <Button size="sm" className="gap-1 h-8 text-xs bg-green-600 hover:bg-green-700" onClick={() => close(rec.id)}>إغلاق</Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => del(rec.id)}>حذف</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل تسوية" : "تسوية بنكية جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">رقم التسوية</Label><Input value={form.reconciliation_number} onChange={(e) => setForm((p) => ({ ...p, reconciliation_number: e.target.value }))} className="mt-1 h-8" /></div>
              <div><Label className="text-xs">الفترة</Label><Input placeholder="مثال: 2025-01" value={form.period} onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))} className="mt-1 h-8" /></div>
            </div>
            <div>
              <Label className="text-xs">الحساب البنكي*</Label>
              <AccountSearchInput accounts={accounts} value={form.account_id} onChange={(id, name) => setForm((p) => ({ ...p, account_id: id, account_name: name }))} placeholder="ابحث عن الحساب البنكي..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">رصيد البنك (من الكشف)</Label><Input type="number" value={form.bank_balance} onChange={(e) => updateForm("bank_balance", parseFloat(e.target.value) || 0)} className="mt-1 h-8" /></div>
              <div><Label className="text-xs">الرصيد الدفتري</Label><Input type="number" value={form.book_balance} onChange={(e) => updateForm("book_balance", parseFloat(e.target.value) || 0)} className="mt-1 h-8" /></div>
            </div>

            {/* Difference Indicator */}
            <div className={`rounded-xl p-3 flex items-center gap-3 ${Math.abs(form.difference) < 0.01 ? "bg-green-50" : "bg-red-50"}`}>
              {Math.abs(form.difference) < 0.01 ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
              <div>
                <p className="text-sm font-semibold">{Math.abs(form.difference) < 0.01 ? "الحسابات متطابقة ✓" : `الفرق: ${form.difference.toLocaleString()}`}</p>
                <p className="text-xs text-muted-foreground">{Math.abs(form.difference) < 0.01 ? "رصيد البنك يساوي الرصيد الدفتري" : "يوجد فرق بين رصيد البنك والرصيد الدفتري"}</p>
              </div>
            </div>

            {/* CSV Import */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">معاملات الكشف البنكي</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3 w-3" />استيراد CSV
                </Button>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
              </div>
              {form.transactions.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 flex justify-between text-xs text-muted-foreground">
                    <span>{form.transactions.length} معاملة</span>
                    <span>{matchedCount} مطابقة</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {form.transactions.map((t, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 border-t text-xs ${t.matched ? "bg-green-50" : ""}`}>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={t.matched} onChange={() => toggleMatch(i, "")} className="rounded" />
                          <span className="text-muted-foreground">{t.date}</span>
                          <span className="truncate max-w-[140px]">{t.description}</span>
                        </div>
                        <span className={`font-semibold ${t.type === "إيداع" ? "text-green-600" : "text-red-500"}`}>
                          {t.type === "إيداع" ? "+" : "-"}{t.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {form.transactions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-xl">
                  استورد ملف CSV بالتنسيق: التاريخ، الوصف، المبلغ (سالب للسحب)
                </p>
              )}
            </div>

            <div><Label className="text-xs">ملاحظات</Label><Input value={form.notes || ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="mt-1 h-8" /></div>
            <div className="flex gap-2">
              <Button onClick={save} className="flex-1">حفظ</Button>
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}