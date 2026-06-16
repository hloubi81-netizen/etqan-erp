import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, DollarSign, Calendar, FileText, Clock, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, ArrowRightLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const OP_STATUS_CONFIG = {
  "تحت التنفيذ": { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  "مكتملة": { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  "ملغاة": { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

export default function LcOperationsDialog({ open, onClose, lc, onUpdated }) {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState(getEmptyForm());

  useEffect(() => {
    if (open && lc) {
      loadOperations();
      loadRefs();
    }
  }, [open, lc]);

  function getEmptyForm() {
    return {
      operation_number: `OP-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      description: "",
      invoice_id: "",
      invoice_number: "",
      status: "تحت التنفيذ",
      branch_id: lc?.branch_id || "",
      branch_name: lc?.branch_name || "",
      notes: "",
    };
  }

  async function loadOperations() {
    setLoading(true);
    const ops = await base44.entities.LcOperation.filter({ lc_id: lc.id }, "-created_date", 200);
    setOperations(ops);
    setLoading(false);
  }

  async function loadRefs() {
    const [brs, invs] = await Promise.all([
      base44.entities.Branch.list().catch(() => []),
      base44.entities.Invoice.list("-created_date", 200).catch(() => []),
    ]);
    setBranches(brs);
    setInvoices(invs || []);
  }

  async function handleAdd() {
    if (!form.amount || form.amount <= 0) {
      toast.error("يرجى إدخال المبلغ");
      return;
    }
    if (form.amount > remaining) {
      toast.error("المبلغ يتجاوز الرصيد المتبقي");
      return;
    }
    await base44.entities.LcOperation.create({
      lc_id: lc.id,
      lc_number: lc.lc_number,
      operation_number: form.operation_number,
      date: form.date,
      amount: form.amount,
      description: form.description,
      invoice_id: form.invoice_id || "",
      invoice_number: form.invoice_number || "",
      status: form.status,
      branch_id: form.branch_id,
      branch_name: form.branch_name,
      notes: form.notes,
    });
    toast.success("تم إضافة العملية بنجاح");
    setAddOpen(false);
    setForm(getEmptyForm());
    loadOperations();
    if (onUpdated) onUpdated();
  }

  async function handleDelete(op) {
    await base44.entities.LcOperation.delete(op.id);
    toast.success("تم حذف العملية");
    loadOperations();
    if (onUpdated) onUpdated();
  }

  const remaining = (lc?.amount || 0) - (lc?.used_amount || 0);
  const totalOps = operations.reduce((s, o) => s + (o.amount || 0), 0);
  const usagePercent = lc?.amount > 0 ? ((lc?.used_amount || 0) / lc.amount) * 100 : 0;

  function update(field, value) { setForm(prev => ({ ...prev, [field]: value })); }

  if (!lc) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              سجل عمليات الاعتماد: {lc.lc_number}
            </DialogTitle>
          </DialogHeader>

          {/* LC Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600 mb-0.5">المبلغ الكلي</p>
              <p className="text-lg font-bold text-blue-800 font-mono">{lc.amount?.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-amber-600 mb-0.5">المستخدم</p>
              <p className="text-lg font-bold text-amber-800 font-mono">{lc.used_amount?.toLocaleString() || "0"}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600 mb-0.5">المتبقي</p>
              <p className="text-lg font-bold text-green-800 font-mono">{remaining.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-600 mb-0.5">نسبة الاستخدام</p>
              <p className="text-lg font-bold text-purple-800">{Math.round(usagePercent)}%</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className={cn("h-full rounded-full transition-all", usagePercent >= 100 ? "bg-green-500" : usagePercent > 70 ? "bg-amber-500" : "bg-blue-500")}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>

          {/* Header + Add button */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              عمليات السحب ({operations.length})
            </h3>
            <Button size="sm" onClick={() => { setForm(getEmptyForm()); setAddOpen(true); }} className="gap-1 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" />
              عملية جديدة
            </Button>
          </div>

          {/* Operations Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : operations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ArrowRightLeft className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="font-medium">لا توجد عمليات سحب حتى الآن</p>
              <p className="text-xs mt-1">اضغط على "عملية جديدة" لإضافة أول عملية</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-right p-2 font-semibold">رقم العملية</th>
                    <th className="text-right p-2 font-semibold">التاريخ</th>
                    <th className="text-right p-2 font-semibold">المبلغ</th>
                    <th className="text-right p-2 font-semibold">البيان</th>
                    <th className="text-right p-2 font-semibold">الفاتورة</th>
                    <th className="text-right p-2 font-semibold">الحالة</th>
                    <th className="text-center p-2 font-semibold w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op, i) => {
                    const StatusIcon = OP_STATUS_CONFIG[op.status]?.icon || Clock;
                    return (
                      <tr key={op.id} className={cn("border-b hover:bg-muted/20", i % 2 === 0 && "bg-muted/10")}>
                        <td className="p-2 font-mono font-medium">{op.operation_number || "-"}</td>
                        <td className="p-2 text-muted-foreground">{op.date ? new Date(op.date).toLocaleDateString("ar-EG") : "-"}</td>
                        <td className="p-2 font-mono font-semibold text-amber-600">{op.amount?.toLocaleString()}</td>
                        <td className="p-2">{op.description || "-"}</td>
                        <td className="p-2">
                          {op.invoice_number ? (
                            <Badge variant="outline" className="text-xs font-mono">{op.invoice_number}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="p-2">
                          <Badge className={cn("text-xs gap-1", OP_STATUS_CONFIG[op.status]?.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {op.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(op)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={onClose}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Operation Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              عملية سحب جديدة - {lc.lc_number}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>رقم العملية</Label>
              <Input value={form.operation_number} onChange={e => update("operation_number", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={form.date} onChange={e => update("date", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label>المبلغ المخصوم *</Label>
              <Input type="number" value={form.amount || ""} onChange={e => update("amount", parseFloat(e.target.value) || 0)} className="h-9" />
              <p className="text-xs text-muted-foreground mt-0.5">المتبقي: {remaining.toLocaleString()}</p>
            </div>
            <div>
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={v => update("status", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(OP_STATUS_CONFIG).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>البيان</Label>
              <Input value={form.description} onChange={e => update("description", e.target.value)} className="h-9" placeholder="وصف العملية..." />
            </div>
            <div className="col-span-2">
              <Label>الفاتورة المرتبطة</Label>
              <Select value={form.invoice_id || ""} onValueChange={v => {
                const inv = invoices.find(i => i.id === v);
                update("invoice_id", v);
                update("invoice_number", inv?.invoice_number || "");
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="اختر فاتورة (اختياري)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>بدون فاتورة</SelectItem>
                  {invoices.slice(0, 100).map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number} - {inv.client_name || ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>الفرع</Label>
              <Select value={form.branch_id || ""} onValueChange={v => {
                const br = branches.find(b => b.id === v);
                update("branch_id", v);
                update("branch_name", br?.name || "");
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={e => update("notes", e.target.value)} className="h-9" />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button onClick={handleAdd}>إضافة العملية</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}