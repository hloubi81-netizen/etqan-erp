import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";

export default function CustodySettlement({ custody, expenses, onRefresh, onClose }) {
  const [returnedAmount, setReturnedAmount] = useState(custody.returned_amount || 0);
  const [settlementNotes, setSettlementNotes] = useState(custody.settlement_notes || "");
  const [saving, setSaving] = useState(false);

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const approvedExpenses = expenses.filter(e => e.is_approved).reduce((s, e) => s + (e.amount || 0), 0);
  const unapprovedCount = expenses.filter(e => !e.is_approved).length;
  const difference = (custody.issued_amount || 0) - totalExpenses - returnedAmount;
  const isBalanced = Math.abs(difference) < 0.01;

  async function settle() {
    if (unapprovedCount > 0 && !confirm(`هناك ${unapprovedCount} مصروف غير معتمد. هل تريد المتابعة؟`)) return;
    setSaving(true);
    await base44.entities.Custody.update(custody.id, {
      status: "مسواة",
      returned_amount: returnedAmount,
      spent_amount: totalExpenses,
      settlement_date: new Date().toISOString().split("T")[0],
      settlement_notes: settlementNotes,
    });
    toast.success("تمت تسوية العهدة بنجاح");
    setSaving(false);
    onRefresh();
    onClose();
  }

  async function close() {
    if (!confirm("إغلاق العهدة نهائياً؟")) return;
    await base44.entities.Custody.update(custody.id, { status: "مغلقة" });
    toast.success("تم إغلاق العهدة");
    onRefresh();
    onClose();
  }

  function printSettlement() {
    const win = window.open("", "_blank");
    const rows = expenses.map(e => `
      <tr>
        <td>${e.expense_date}</td>
        <td>${e.description}</td>
        <td>${e.category}</td>
        <td>${e.vendor_name || "—"}</td>
        <td>${e.invoice_number || "—"}</td>
        <td style="text-align:left;font-weight:bold">${(e.amount || 0).toLocaleString()}</td>
        <td style="text-align:center;color:${e.is_approved ? "green" : "orange"}">${e.is_approved ? "✓ معتمد" : "⏳ انتظار"}</td>
      </tr>`).join("");

    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>تسوية عهدة ${custody.custody_number}</title>
<style>
  body { font-family: Arial, sans-serif; padding:20px; font-size:13px; }
  h2 { color:#1d3a8a; text-align:center; }
  .info { display:grid; grid-template-columns:1fr 1fr; gap:8px; background:#f5f7ff; padding:12px; border-radius:8px; margin:12px 0; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { background:#1d3a8a; color:white; padding:8px; text-align:right; }
  td { padding:7px 8px; border-bottom:1px solid #eee; }
  .summary { margin-top:16px; background:#f5f7ff; padding:12px; border-radius:8px; }
  .balance { font-size:18px; font-weight:bold; text-align:center; padding:10px; margin-top:12px; border-radius:8px; }
  .balanced { background:#d1fae5; color:#065f46; } .unbalanced { background:#fee2e2; color:#991b1b; }
  @media print { button{display:none} }
</style></head>
<body>
<h2>تسوية العهدة المالية</h2>
<div class="info">
  <div><strong>رقم العهدة:</strong> ${custody.custody_number}</div>
  <div><strong>الموظف:</strong> ${custody.employee_name}</div>
  <div><strong>القسم:</strong> ${custody.department || "—"}</div>
  <div><strong>الغرض:</strong> ${custody.purpose}</div>
  <div><strong>تاريخ الصرف:</strong> ${custody.issue_date}</div>
  <div><strong>تاريخ التسوية:</strong> ${new Date().toLocaleDateString("ar-SA")}</div>
</div>
<table>
  <thead><tr><th>التاريخ</th><th>البيان</th><th>الفئة</th><th>الجهة</th><th>رقم الفاتورة</th><th>المبلغ</th><th>الحالة</th></tr></thead>
  <tbody>${rows || "<tr><td colspan='7' style='text-align:center'>لا توجد مصاريف</td></tr>"}</tbody>
</table>
<div class="summary">
  <div style="display:flex;justify-content:space-between"><span>المبلغ المصروف:</span><strong>${(custody.issued_amount||0).toLocaleString()}</strong></div>
  <div style="display:flex;justify-content:space-between"><span>إجمالي المصاريف:</span><strong>${totalExpenses.toLocaleString()}</strong></div>
  <div style="display:flex;justify-content:space-between"><span>المبلغ المسترد:</span><strong>${returnedAmount.toLocaleString()}</strong></div>
  ${settlementNotes ? `<div style="margin-top:8px"><strong>ملاحظات:</strong> ${settlementNotes}</div>` : ""}
</div>
<div class="balance ${isBalanced ? "balanced" : "unbalanced"}">
  ${isBalanced ? "✅ الحسابات متطابقة — الرصيد صفر" : `⚠️ فارق: ${difference.toLocaleString()}`}
</div>
<div style="display:flex;justify-content:space-between;margin-top:40px">
  <div style="text-align:center"><div style="border-top:1px solid #333;width:150px;margin:0 auto;padding-top:4px">توقيع الموظف</div></div>
  <div style="text-align:center"><div style="border-top:1px solid #333;width:150px;margin:0 auto;padding-top:4px">توقيع المحاسب</div></div>
  <div style="text-align:center"><div style="border-top:1px solid #333;width:150px;margin:0 auto;padding-top:4px">اعتماد المدير</div></div>
</div>
<script>window.print();</script>
</body></html>`);
    win.document.close();
  }

  return (
    <div className="space-y-5" dir="rtl">
      <h3 className="font-bold text-base">تسوية العهدة — {custody.custody_number}</h3>

      {/* Settlement Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{(custody.issued_amount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">المبلغ المصروف</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{totalExpenses.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">إجمالي المصاريف ({expenses.length} بند)</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown */}
      <Card>
        <CardContent className="p-4 space-y-3 text-sm">
          <div className="flex justify-between py-1.5 border-b">
            <span className="text-muted-foreground">المبلغ المصروف</span>
            <span className="font-semibold">{(custody.issued_amount || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b text-orange-600">
            <span>ناقص: إجمالي المصاريف المسجلة</span>
            <span className="font-semibold">— {totalExpenses.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b items-center">
            <span className="text-muted-foreground">المبلغ المسترد من الموظف</span>
            <Input
              type="number"
              value={returnedAmount}
              onChange={e => setReturnedAmount(+e.target.value)}
              className="w-32 h-8 text-left"
              disabled={custody.status === "مسواة" || custody.status === "مغلقة"}
            />
          </div>
          <div className={`flex justify-between py-2 rounded-lg px-3 font-bold text-base ${isBalanced ? "bg-green-100 text-green-700" : Math.abs(difference) > 0 ? "bg-red-100 text-red-700" : "bg-gray-100"}`}>
            <span className="flex items-center gap-2">
              {isBalanced ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              {isBalanced ? "الرصيد متطابق" : difference > 0 ? "فارق مدين (مستحق الإرجاع)" : "فارق دائن (مستحق الصرف)"}
            </span>
            <span>{difference.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {unapprovedCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{unapprovedCount} مصروف لم يتم اعتماده بعد. يُنصح باعتمادها قبل التسوية.</span>
        </div>
      )}

      {/* Notes */}
      <div>
        <Label>ملاحظات التسوية</Label>
        <Input
          value={settlementNotes}
          onChange={e => setSettlementNotes(e.target.value)}
          placeholder="أي ملاحظات إضافية على التسوية..."
          disabled={custody.status === "مسواة" || custody.status === "مغلقة"}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" className="gap-1.5" onClick={printSettlement}>
          <Printer className="h-4 w-4" /> طباعة التسوية
        </Button>
        {custody.status !== "مسواة" && custody.status !== "مغلقة" && (
          <Button onClick={settle} disabled={saving} className="gap-1.5 bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-4 w-4" />
            {saving ? "جاري التسوية..." : "إجراء التسوية النهائية"}
          </Button>
        )}
        {custody.status === "مسواة" && (
          <Button variant="outline" onClick={close} className="gap-1.5 text-gray-600">
            <ArrowLeft className="h-4 w-4" /> إغلاق العهدة نهائياً
          </Button>
        )}
      </div>
    </div>
  );
}