import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Calendar, ListFilter } from "lucide-react";

export default function LcExportDialog({ open, onClose }) {
  const [lcs, setLcs] = useState([]);
  const [ops, setOps] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [branchFilter, setBranchFilter] = useState("الكل");

  useEffect(() => {
    if (open) {
      setDateFrom("");
      setDateTo("");
      setStatusFilter("الكل");
      setBranchFilter("الكل");
      loadData();
    }
  }, [open]);

  async function loadData() {
    setLoading(true);
    const [allLcs, allOps, allExpenses, brs] = await Promise.all([
      base44.entities.LetterOfCredit.list("-created_date", 500),
      base44.entities.LcOperation.list("-created_date", 2000),
      base44.entities.LcExpense.list("-created_date", 2000).catch(() => []),
      base44.entities.Branch.list().catch(() => []),
    ]);
    setLcs(allLcs);
    setOps(allOps);
    setExpenses(allExpenses);
    setBranches(brs);
    setLoading(false);
  }

  function filterByDate(items, dateField) {
    return items.filter(item => {
      const itemDate = item[dateField];
      if (!itemDate) return false;
      if (dateFrom && itemDate < dateFrom) return false;
      if (dateTo && itemDate > dateTo) return false;
      return true;
    });
  }

  async function handleExport() {
    setExporting(true);

    let filteredLcs = filterByDate(lcs, "date");
    let filteredOps = filterByDate(ops, "date");
    let filteredExpenses = filterByDate(expenses, "date");

    if (statusFilter !== "الكل") filteredLcs = filteredLcs.filter(lc => lc.status === statusFilter);
    if (branchFilter !== "الكل") {
      filteredLcs = filteredLcs.filter(lc => lc.branch_name === branchFilter);
    }

    // Match ops and expenses to filtered LCs
    const lcIds = new Set(filteredLcs.map(l => l.id));
    filteredOps = filteredOps.filter(op => lcIds.has(op.lc_id));
    filteredExpenses = filteredExpenses.filter(ex => lcIds.has(ex.lc_id));

    const statuses = ["مفتوح", "مستخدم جزئياً", "مستخدم كلياً", "منتهي", "ملغي"];

    const wb = XLSX.utils.book_new();

    // Sheet 1: LCs summary
    const lcHeaders = ["رقم الاعتماد", "التاريخ", "تاريخ الانتهاء", "البنك", "الفرع", "النوع", "المستفيد", "المبلغ", "العملة", "المبلغ المستخدم", "المتبقي", "الحالة", "أمر الشراء", "الغرض", "ملاحظات"];
    const lcRows = filteredLcs.map(lc => [
      lc.lc_number, lc.date || "", lc.expiry_date || "", lc.bank_name || "", `${lc.bank_branch || ""} ${lc.branch_name || ""}`.trim(),
      lc.lc_type, lc.beneficiary_name || "", lc.amount, lc.currency || "ج.م",
      lc.used_amount || 0, lc.remaining_amount || 0, lc.status,
      lc.purchase_order_number || "", lc.purpose || "", lc.notes || ""
    ]);

    const ws_lcs = XLSX.utils.aoa_to_sheet([lcHeaders, ...lcRows]);
    ws_lcs["!cols"] = lcHeaders.map(() => ({ wch: 18 }));
    ws_lcs["!rtl"] = true;
    XLSX.utils.book_append_sheet(wb, ws_lcs, "الاعتمادات");

    // Sheet 2: Operations
    const opHeaders = ["رقم الاعتماد", "رقم العملية", "التاريخ", "المبلغ", "العملة", "البيان", "رقم الفاتورة", "الحالة", "ملاحظات"];
    const opRows = filteredOps.map(op => {
      const lc = filteredLcs.find(l => l.id === op.lc_id);
      return [
        lc?.lc_number || op.lc_number || "", op.operation_number || "", op.date || "",
        op.amount, op.currency || "ج.م", op.description || "", op.invoice_number || "", op.status, op.notes || ""
      ];
    });

    const ws_ops = XLSX.utils.aoa_to_sheet([opHeaders, ...opRows]);
    ws_ops["!cols"] = opHeaders.map(() => ({ wch: 18 }));
    ws_ops["!rtl"] = true;
    XLSX.utils.book_append_sheet(wb, ws_ops, "عمليات السحب");

    // Sheet 3: Expenses
    const expHeaders = ["رقم الاعتماد", "نوع المصروف", "التاريخ", "المبلغ", "العملة", "البيان", "الجهة", "رقم المستند", "ملاحظات"];
    const expRows = filteredExpenses.map(ex => {
      const lc = filteredLcs.find(l => l.id === ex.lc_id);
      return [
        lc?.lc_number || ex.lc_number || "", ex.expense_type, ex.date || "",
        ex.amount, ex.currency || "ج.م", ex.description || "", ex.vendor_name || "",
        ex.invoice_number || "", ex.notes || ""
      ];
    });

    if (expRows.length > 0) {
      const ws_exps = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
      ws_exps["!cols"] = expHeaders.map(() => ({ wch: 18 }));
      ws_exps["!rtl"] = true;
      XLSX.utils.book_append_sheet(wb, ws_exps, "المصاريف الإضافية");
    }

    // Sheet 4: Summary per LC with operations breakdown
    const summaryHeaders = ["", "البيان", "المبلغ", "النسبة من الاعتماد"];
    const summaryRows = [];

    filteredLcs.forEach(lc => {
      summaryRows.push(["", `الاعتماد: ${lc.lc_number}`, lc.amount, "100%"]);
      summaryRows.push(["", `البنك: ${lc.bank_name || ""}`, "", ""]);
      summaryRows.push(["", `المستفيد: ${lc.beneficiary_name || ""}`, "", ""]);
      summaryRows.push(["", `الحالة: ${lc.status}`, "", ""]);

      const lcOps = filteredOps.filter(op => op.lc_id === lc.id);
      const lcExps = filteredExpenses.filter(ex => ex.lc_id === lc.id);

      if (lcOps.length > 0) {
        summaryRows.push(["", "--- عمليات السحب ---", "", ""]);
        lcOps.forEach(op => {
          summaryRows.push(["", `  ${op.operation_number || "عملية"} - ${op.date || ""}: ${op.description || ""}`, op.amount, lc.amount ? `${((op.amount / lc.amount) * 100).toFixed(1)}%` : ""]);
        });
      }

      if (lcExps.length > 0) {
        summaryRows.push(["", "--- المصاريف الإضافية ---", "", ""]);
        lcExps.forEach(ex => {
          summaryRows.push(["", `  ${ex.expense_type} - ${ex.date || ""}: ${ex.description || ""}`, ex.amount, ""]);
        });
      }

      const totalOps = lcOps.reduce((s, o) => s + (o.amount || 0), 0);
      const totalExps = lcExps.reduce((s, e) => s + (e.amount || 0), 0);
      summaryRows.push(["", "--- الإجماليات ---", "", ""]);
      summaryRows.push(["", "  إجمالي المسحوب من الاعتماد", totalOps, lc.amount ? `${((totalOps / lc.amount) * 100).toFixed(1)}%` : ""]);
      summaryRows.push(["", "  المتبقي من الاعتماد", (lc.amount || 0) - totalOps, lc.amount ? `${(((lc.amount - totalOps) / lc.amount) * 100).toFixed(1)}%` : ""]);
      summaryRows.push(["", "  إجمالي المصاريف الإضافية", totalExps, ""]);
      summaryRows.push(["", "  التكلفة الكلية (اعتماد + مصاريف)", (lc.amount || 0) + totalExps, ""]);
      summaryRows.push(["", "", "", ""]);
    });

    const ws_summary = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
    ws_summary["!cols"] = [{ wch: 3 }, { wch: 50 }, { wch: 16 }, { wch: 18 }];
    ws_summary["!rtl"] = true;
    XLSX.utils.book_append_sheet(wb, ws_summary, "ملخص تحليلي");

    const dateLabel = dateFrom && dateTo
      ? `${dateFrom}_${dateTo}`
      : dateFrom ? `من_${dateFrom}` : dateTo ? `حتى_${dateTo}` : "كامل";
    XLSX.writeFile(wb, `كشف_اعتمادات_${dateLabel}.xlsx`);

    toast.success("تم تصدير الكشف بنجاح");
    setExporting(false);
    onClose();
  }

  const summaryStats = (() => {
    let filteredLcs = filterByDate(lcs, "date");
    if (statusFilter !== "الكل") filteredLcs = filteredLcs.filter(lc => lc.status === statusFilter);
    if (branchFilter !== "الكل") filteredLcs = filteredLcs.filter(lc => lc.branch_name === branchFilter);

    const lcIds = new Set(filteredLcs.map(l => l.id));
    const filteredOps = filterByDate(ops, "date").filter(op => lcIds.has(op.lc_id));
    const filteredExpenses = filterByDate(expenses, "date").filter(ex => lcIds.has(ex.lc_id));

    return {
      lcCount: filteredLcs.length,
      totalAmount: filteredLcs.reduce((s, l) => s + (l.amount || 0), 0),
      totalUsed: filteredLcs.reduce((s, l) => s + (l.used_amount || 0), 0),
      totalOps: filteredOps.length,
      totalOpsAmount: filteredOps.reduce((s, o) => s + (o.amount || 0), 0),
      totalExpenses: filteredExpenses.length,
      totalExpensesAmount: filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0),
    };
  })();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            تصدير كشف الاعتمادات المستندية
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded p-2">
                <p className="text-[10px] text-blue-600">اعتمادات</p>
                <p className="font-bold text-blue-800">{summaryStats.lcCount}</p>
              </div>
              <div className="bg-green-50 rounded p-2">
                <p className="text-[10px] text-green-600">عمليات</p>
                <p className="font-bold text-green-800">{summaryStats.totalOps}</p>
              </div>
              <div className="bg-purple-50 rounded p-2">
                <p className="text-[10px] text-purple-600">مصاريف</p>
                <p className="font-bold text-purple-800">{summaryStats.totalExpenses}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">من تاريخ</label>
                  <div className="relative">
                    <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">إلى تاريخ</label>
                  <div className="relative">
                    <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">الحالة</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="الكل">الكل</SelectItem>
                      <SelectItem value="مفتوح">مفتوح</SelectItem>
                      <SelectItem value="مستخدم جزئياً">مستخدم جزئياً</SelectItem>
                      <SelectItem value="مستخدم كلياً">مستخدم كلياً</SelectItem>
                      <SelectItem value="منتهي">منتهي</SelectItem>
                      <SelectItem value="ملغي">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">الفرع</label>
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="الكل">الكل</SelectItem>
                      {branches.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted/40 rounded p-3 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1"><ListFilter className="h-3 w-3" /> محتوى التقرير:</p>
                <p className="text-muted-foreground">• قائمة الاعتمادات المستندية</p>
                <p className="text-muted-foreground">• عمليات السحب المسجلة</p>
                <p className="text-muted-foreground">• المصاريف الإضافية</p>
                <p className="text-muted-foreground">• ملخص تحليلي لكل اعتماد مع الإجماليات</p>
              </div>
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleExport} disabled={loading || exporting} className="gap-1.5">
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                جارٍ التصدير...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                تصدير Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}