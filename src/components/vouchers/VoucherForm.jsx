import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Zap } from "lucide-react";
import { applyJournalRules } from "@/utils/journalEngine";
import { toast } from "sonner";

export default function VoucherForm({ open, onClose, onSave, voucher, voucherType }) {
  const [accounts, setAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const isJournal = voucherType === "سند قيد" || voucherType === "سند قيد افتتاحي" || voucherType === "سند يومية";

  const [form, setForm] = useState({
    voucher_number: voucher?.voucher_number || "",
    type: voucherType,
    date: voucher?.date || new Date().toISOString().split("T")[0],
    account_id: voucher?.account_id || "",
    account_name: voucher?.account_name || "",
    counter_account_id: voucher?.counter_account_id || "",
    counter_account_name: voucher?.counter_account_name || "",
    amount: voucher?.amount || 0,
    currency: voucher?.currency || "",
    notes: voucher?.notes || "",
    counter_notes: voucher?.counter_notes || "",
    entries: voucher?.entries || [],
    total_debit: voucher?.total_debit || 0,
    total_credit: voucher?.total_credit || 0,
    status: voucher?.status || "مسودة",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [accs, currs, existingVouchers] = await Promise.all([
      base44.entities.Account.list(),
      base44.entities.Currency.list(),
      base44.entities.Voucher.filter({ type: voucherType }),
    ]);
    setAccounts(accs);
    setCurrencies(currs);
    if (!voucher) {
      const cashAccount = accs.find((a) => a.name?.includes("صندوق"));
      setForm((prev) => ({
        ...prev,
        voucher_number: String(existingVouchers.length + 1).padStart(4, "0"),
        ...(cashAccount && !isJournal ? { account_id: cashAccount.id, account_name: cashAccount.name } : {}),
      }));
    }
  }

  function addEntry() {
    setForm((prev) => ({
      ...prev,
      entries: [...prev.entries, { account_id: "", account_name: "", debit: 0, credit: 0, notes: "" }],
    }));
  }

  function removeEntry(idx) {
    const newEntries = form.entries.filter((_, i) => i !== idx);
    recalcEntries(newEntries);
  }

  function updateEntry(idx, key, value) {
    const newEntries = form.entries.map((e, i) => {
      if (i !== idx) return e;
      const updated = { ...e, [key]: value };
      if (key === "account_id") {
        const acc = accounts.find((a) => a.id === value);
        if (acc) updated.account_name = acc.name;
      }
      return updated;
    });
    recalcEntries(newEntries);
  }

  function recalcEntries(entries) {
    const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
    const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
    setForm((prev) => ({ ...prev, entries, total_debit: totalDebit, total_credit: totalCredit }));
  }

  const canSave = isJournal
    ? form.voucher_number && form.entries.length > 0 && form.total_debit === form.total_credit && form.total_debit > 0
    : form.voucher_number && form.amount > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{voucher ? "تعديل" : "إنشاء"} {voucherType}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>رقم السند</Label>
              <Input value={form.voucher_number} onChange={(e) => setForm({ ...form, voucher_number: e.target.value })} />
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>العملة</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue placeholder="اختر العملة" /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isJournal ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{voucherType === "سند قبض" ? "الحساب (الصندوق)" : "الحساب"}</Label>
                  <Select
                    value={form.account_id}
                    onValueChange={(v) => {
                      const acc = accounts.find((a) => a.id === v);
                      setForm({ ...form, account_id: v, account_name: acc?.name || "" });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الحساب المقابل</Label>
                  <Select
                    value={form.counter_account_id}
                    onValueChange={(v) => {
                      const acc = accounts.find((a) => a.id === v);
                      setForm({ ...form, counter_account_id: v, counter_account_name: acc?.name || "" });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>المبلغ</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>البيان</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">القيود المحاسبية</Label>
                <Button variant="outline" size="sm" onClick={addEntry}>
                  <Plus className="h-3.5 w-3.5 ml-1" /> إضافة سطر
                </Button>
              </div>
              <div className="space-y-2">
                {form.entries.map((entry, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-end p-3 bg-muted/30 rounded-lg">
                    <div className="col-span-2">
                      <Label className="text-xs">الحساب</Label>
                      <Select value={entry.account_id} onValueChange={(v) => updateEntry(idx, "account_id", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="اختر" /></SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">مدين</Label>
                      <Input className="h-9" type="number" value={entry.debit} onChange={(e) => updateEntry(idx, "debit", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">دائن</Label>
                      <Input className="h-9" type="number" value={entry.credit} onChange={(e) => updateEntry(idx, "credit", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="flex items-end">
                      <Button variant="ghost" size="icon" className="h-9 text-destructive" onClick={() => removeEntry(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {form.entries.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4 flex justify-between text-sm">
                  <div>
                    <span className="text-muted-foreground">إجمالي المدين: </span>
                    <span className="font-bold">{form.total_debit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">إجمالي الدائن: </span>
                    <span className="font-bold">{form.total_credit.toLocaleString()}</span>
                  </div>
                  {form.total_debit !== form.total_credit && (
                    <span className="text-destructive text-xs">القيد غير متوازن!</span>
                  )}
                </div>
              )}
              <div>
                <Label>البيان</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => onSave({ ...form, status: "مسودة" })} disabled={!canSave} variant="outline">حفظ مسودة</Button>
          <Button
            onClick={async () => {
              const saved = { ...form, status: "مرحّل" };
              await onSave(saved);
              const triggerMap = { "سند قبض": "سند قبض", "سند دفع": "سند صرف", "سند يومية": "سند يومية" };
              const trigger = triggerMap[voucherType] || voucherType;
              const result = await applyJournalRules(trigger, saved, "سند", saved.voucher_number);
              if (result.posted > 0) toast.success(`تم ترحيل ${result.posted} قيد يومية تلقائياً`);
              if (result.errors.length > 0) toast.error(result.errors[0]);
            }}
            disabled={!canSave}
            className="gap-1.5"
          >
            <Zap className="h-3.5 w-3.5" />حفظ وترحيل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}