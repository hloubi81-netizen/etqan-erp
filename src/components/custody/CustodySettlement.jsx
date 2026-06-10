import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Clock, Printer } from "lucide-react";
import { toast } from "sonner";

export default function CustodySettlement({ custodies, expenses, onRefresh }) {
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const [returnedAmount, setReturnedAmount] = useState(0);
  const [settlementNotes, setSettlementNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // العهد القابلة للتسوية (مفتوحة أو قيد التسوية)
  const settleable = custodies.filter(c => c.status === "مفتوحة" || c.status === "قيد التسوية");

  const selected = custodies.find(c => c.id === selectedId);
  const selectedExpenses = useMemo(() => expenses.filter(e => e.custody_id === selectedId), [expenses, selectedId]);

  const expTotal = selectedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const amount = selected?.amount || 0;
  const diff = amount - expTotal - returnedAmount;
  const verifiedCount = selectedExpenses.filter(e => e.is_verified).length;
  const unverifiedTotal = selectedExpenses.filter(e => !e.is_verified).reduce((s, e) => s + (e.amount || 0), 0);

  async function markPending() {
    if (!selectedId) return;
    await base44.entities.Custody.update(selectedId, { status: "قيد التسوية" });
    toast.success("تم تحديث حالة العهدة");
    onRefresh();
  }

  async function settle() {
    if (!selectedId) return;
    if (Math.abs(diff) > 0.01 && returnedAmount === 0 && diff > 0) {
      if (!confirm(`يوجد رصيد متبقٍّ (${diff.toLocaleString("ar-SA")}). هل تريد إتمام التسوية مع تسجيل هذا الفرق؟`)) return;
    }
    setSaving(true);
    await base44.entities.Custody.update(selectedId, {
      status: "مسواة",
      settlement_date: new Date().toISOString().split("T")[0],
      settlement_notes: settlementNotes,
      returned_amount: returnedAmount,
      expenses_total: expTotal,
      difference: Math.round(diff * 100) / 100,
    });
    toast.success("تمت تسوية العهدة بنجاح");
    setSaving(false);
    setOpen(false);
    setSelectedId("");
    onRefresh();
  }

  function printSettlementReport() {
    if (!selected) return;
    const win = window.open("", "_blank");
    const rows = selectedExpenses.map(e => `
      <tr>
        <td style="padding:6px 10px">${e.expense_date}</td>
        <td style="padding:6px 10px">${e.description}</td>
        <td style="padding:6px 10px">${e.category || "—"}</td>
        <td style="padding:6px 10px">${e.vendor || "—"}</td>
        <td style="padding:6px 10px">${e.invoice_number || "—"}</td>
        <td style="padding:6px 10px;text-align:right">${(e.amount||0).toLocaleString()}</td>
        <td style="padding:6px 10px;text-align:center">${e.is_verified ? "✅" : "⬜"}</td>
      </tr>`).join("");

    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>تقرير تسوية عهدة</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
  h1 { color: #1d3a8a; text-align: center; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f1f5f9; padding: 12px; border-radius: 8px; margin: 16px 0; font-size: 13px; }
  .summary { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
  .scard { border: 1px solid #ddd; border-radius: 8px; padding: 10px 20px; text-align: center; flex: 1; min-width: 120px; }
  .scard .val { font-size: 18px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
  th { background: #1d3a8a; color: white; padding: 8px 10px; text-align: right; }
  tr:nth-child(even) { background: #f9fafb; }
  td { border-bottom: 1px solid #e5e7eb; }
  .result { margin-top: 20px; padding: 14px; border-radius: 8px; font-size: 14px; font-weight: bold; text-align: center; }
  @media print { button { display: none; } }
</style>
</head>
<body>
  <h1>تقرير تسوية عهدة مالية</h1>
  <div class="meta">
    <div>رقم العهدة: <strong>${selected.custody_number}</strong></div>
    <div>الموظف: <strong>${selected.employee_name}</strong></div>
    <div>القسم: <strong>${selected.department || "—"}</strong></div>
    <div>الغرض: <strong>${selected.purpose || "—"}</strong></div>
    <div>تاريخ الصرف: <strong>${selected.issue_date}</strong></div>
    <div>طريقة الصرف: <strong>${selected.payment_method}</strong></div>
  </div>
  <div class="summary">
    <div class="scard"><div class="val" style="color:#1d3a8a">${amount.toLocaleString()}</div><div>المبلغ المصروف</div></div>
    <div class="scard"><div class="val" style="color:#16a34a">${expTotal.toLocaleString()}</div><div>المصاريف المثبتة</div></div>
    <div class="scard"><div class="val" style="color:#9333ea">${returnedAmount.toLocaleString()}</div><div>المُعاد</div></div>
    <div class="scard"><div class="val" style="color:${Math.abs(diff)<0.01?"#16a34a":diff>0?"#ea580c":"#dc2626"}">${diff>0?"+":""}${diff.toLocaleString()}</div><div>${Math.abs(diff)<0.01?"مطابق":diff>0?"رصيد متبقٍّ":"زيادة صرف"}</div></div>
  </div>
  <table>
    <thead><tr><th>التاريخ</th><th>الوصف</th><th>التصنيف</th><th>المورد</th><th>رقم الإيصال</th><th>المبلغ</th><th>موثق</th></tr></thead>
    <tbody>${rows}</tbody>
    <tr style="background:#e8f0fe;font-weight:bold">
      <td colspan="5" style="padding:8px 10px">الإجمالي</td>
      <td style="padding:8px 10px;text-align:right">${expTotal.toLocaleString()}</td>
      <td style="padding:8px 10px;text-align:center">${verifiedCount}/${selectedExpenses.length}</td>
    </tr>
  </table>
  ${settlementNotes ? `<div style="margin-top:16px;padding:12px;background:#eff6ff;border-radius:8px"><strong>ملاحظات التسوية:</strong> ${settlementNotes}</div>` : ""}
  <div class="result" style="background:${Math.abs(diff)<0.01?"#f0fdf4":diff>0?"#fff7ed":"#fef2f2"};border:1px solid ${Math.abs(diff)<0.01?"#86efac":diff>0?"#fed7aa":"#fecaca"}">
    ${Math.abs(diff)<0.01?"✅ العهدة مطابقة تماماً":diff>0?`⚠️ رصيد متبقٍّ: ${diff.toLocaleString()} — يجب استرداده`:`🔴 زيادة صرف: ${Math.abs(diff).toLocaleString()} — يجب صرف الفارق`}
  </div>
  <script>window.print();</script>
</body></html>`);
    win.document.close();
  }

  return (
    <div className="space-y-5">
      {/* Select Custody */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">اختيار العهدة للتسوية</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-56">
              <Label>العهدة</Label>
              <Select value={selectedId} onValueChange={v => { setSelectedId(v); setReturnedAmount(0); setSettlementNotes(""); }}>
                <SelectTrigger><SelectValue placeholder="اختر عهدة..." /></SelectTrigger>
                <SelectContent>
                  {settleable.length === 0
                    ? <SelectItem value="none" disabled>لا توجد عهد مفتوحة</SelectItem>
                    : settleable.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.custody_number} — {c.employee_name} ({c.status})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {selected && selected.status === "مفتوحة" && (
              <Button variant="outline" onClick={markPending} className="gap-1.5">
                <Clock className="h-4 w-4" /> تحديد كـ "قيد التسوية"
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-700">{amount.toLocaleString("ar-SA")}</p>
              <p className="text-xs text-muted-foreground">المبلغ المصروف</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-700">{expTotal.toLocaleString("ar-SA")}</p>
              <p className="text-xs text-muted-foreground">إجمالي المصاريف ({selectedExpenses.length})</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-purple-600">{verifiedCount}/{selectedExpenses.length}</p>
              <p className="text-xs text-muted-foreground">مصاريف موثقة بمستند</p>
            </div>
            <div className={`rounded-xl p-4 ${Math.abs(diff) < 0.01 ? "bg-green-50" : diff > 0 ? "bg-orange-50" : "bg-red-50"}`}>
              <p className={`text-2xl font-bold ${Math.abs(diff) < 0.01 ? "text-green-700" : diff > 0 ? "text-orange-700" : "text-red-700"}`}>
                {diff > 0 ? `+${diff.toLocaleString("ar-SA")}` : diff.toLocaleString("ar-SA")}
              </p>
              <p className="text-xs text-muted-foreground">{Math.abs(diff) < 0.01 ? "✅ مطابق" : diff > 0 ? "رصيد متبقٍّ" : "زيادة صرف"}</p>
            </div>
          </div>

          {/* Alerts */}
          {unverifiedTotal > 0 && (
            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>يوجد مصاريف غير موثقة بقيمة <strong>{unverifiedTotal.toLocaleString("ar-SA")}</strong> — يُنصح بإرفاق مستندات إثبات قبل التسوية.</span>
            </div>
          )}

          {/* Expenses table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">مصاريف العهدة</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-right font-medium">التاريخ</th>
                    <th className="px-4 py-2.5 text-right font-medium">الوصف</th>
                    <th className="px-4 py-2.5 text-right font-medium">التصنيف</th>
                    <th className="px-4 py-2.5 text-right font-medium">المبلغ</th>
                    <th className="px-4 py-2.5 text-center font-medium">موثق</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExpenses.length === 0
                    ? <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">لا توجد مصاريف مثبتة لهذه العهدة</td></tr>
                    : selectedExpenses.map(e => (
                      <tr key={e.id} className={`border-t ${!e.is_verified ? "bg-yellow-50/40" : ""}`}>
                        <td className="px-4 py-2.5">{e.expense_date}</td>
                        <td className="px-4 py-2.5">{e.description}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.category}</td>
                        <td className="px-4 py-2.5 font-semibold">{(e.amount || 0).toLocaleString("ar-SA")}</td>
                        <td className="px-4 py-2.5 text-center">{e.is_verified ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <AlertCircle className="h-4 w-4 text-orange-400 mx-auto" />}</td>
                      </tr>
                    ))}
                  <tr className="border-t bg-muted/30 font-bold">
                    <td colSpan={3} className="px-4 py-2.5">الإجمالي</td>
                    <td className="px-4 py-2.5 text-primary">{expTotal.toLocaleString("ar-SA")}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Settlement Actions */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">إجراء التسوية النهائية</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>المبلغ المُعاد للصندوق</Label>
                  <Input type="number" value={returnedAmount} onChange={e => setReturnedAmount(+e.target.value || 0)} min={0} max={amount} />
                </div>
                <div>
                  <Label>الفرق بعد الإعادة</Label>
                  <div className={`h-9 flex items-center px-3 rounded-md border font-semibold ${Math.abs(diff) < 0.01 ? "text-green-600 border-green-200 bg-green-50" : diff > 0 ? "text-orange-600 border-orange-200 bg-orange-50" : "text-red-600 border-red-200 bg-red-50"}`}>
                    {diff > 0 ? `+${diff.toLocaleString("ar-SA")}` : diff.toLocaleString("ar-SA")}
                    <span className="text-xs mr-2 font-normal opacity-70">{Math.abs(diff) < 0.01 ? "مطابق" : diff > 0 ? "رصيد متبقٍّ" : "زيادة صرف"}</span>
                  </div>
                </div>
              </div>
              <div>
                <Label>ملاحظات التسوية</Label>
                <Input value={settlementNotes} onChange={e => setSettlementNotes(e.target.value)} placeholder="أي ملاحظات على عملية التسوية..." />
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={printSettlementReport} className="gap-1.5">
                  <Printer className="h-4 w-4" /> طباعة تقرير التسوية
                </Button>
                <Button onClick={() => setOpen(true)} className="gap-1.5 bg-green-600 hover:bg-green-700" disabled={selected.status === "مسواة"}>
                  <CheckCircle2 className="h-4 w-4" /> إتمام التسوية النهائية
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Confirm Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تأكيد التسوية النهائية</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p>سيتم إغلاق العهدة <strong className="text-primary">{selected?.custody_number}</strong> نهائياً.</p>
            <div className="bg-muted/30 rounded-xl p-3 space-y-1">
              <div className="flex justify-between"><span>المبلغ المصروف:</span><strong>{amount.toLocaleString("ar-SA")}</strong></div>
              <div className="flex justify-between"><span>إجمالي المصاريف:</span><strong className="text-green-600">{expTotal.toLocaleString("ar-SA")}</strong></div>
              <div className="flex justify-between"><span>المُعاد:</span><strong className="text-purple-600">{returnedAmount.toLocaleString("ar-SA")}</strong></div>
              <div className={`flex justify-between font-bold ${Math.abs(diff) < 0.01 ? "text-green-600" : diff > 0 ? "text-orange-600" : "text-red-600"}`}>
                <span>الفرق:</span><strong>{diff > 0 ? "+" : ""}{diff.toLocaleString("ar-SA")}</strong>
              </div>
            </div>
            {Math.abs(diff) >= 0.01 && (
              <p className="text-orange-700 bg-orange-50 p-2 rounded-lg text-xs">
                {diff > 0 ? `⚠️ يوجد رصيد غير مصروف (${diff.toLocaleString("ar-SA")}) — سيُسجل كمبلغ متبقٍّ.` : `🔴 يوجد زيادة في الصرف (${Math.abs(diff).toLocaleString("ar-SA")}) — سيُسجل كفرق.`}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={settle} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? "جارٍ الحفظ..." : "تأكيد التسوية"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}