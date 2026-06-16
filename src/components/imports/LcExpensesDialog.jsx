import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Receipt, DollarSign, Ship, ShieldCheck, Banknote, Truck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EXPENSE_TYPE_ICONS = {
  "شحن": Ship,
  "ضرائب جمركية": FileText,
  "تأمين": ShieldCheck,
  "رسوم بنكية": Banknote,
  "عمولة": DollarSign,
  "تخليص جمركي": Receipt,
  "نقل داخلي": Truck,
  "أخرى": Receipt,
};

const EXPENSE_TYPE_COLORS = {
  "شحن": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "ضرائب جمركية": "bg-orange-100 text-orange-700 border-orange-200",
  "تأمين": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "رسوم بنكية": "bg-violet-100 text-violet-700 border-violet-200",
  "عمولة": "bg-rose-100 text-rose-700 border-rose-200",
  "تخليص جمركي": "bg-teal-100 text-teal-700 border-teal-200",
  "نقل داخلي": "bg-amber-100 text-amber-700 border-amber-200",
  "أخرى": "bg-gray-100 text-gray-600 border-gray-200",
};

export default function LcExpensesDialog({ open, onClose, lc, onUpdated }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(getEmptyForm());

  useEffect(() => {
    if (open && lc) { loadExpenses(); loadBranches(); }
  }, [open, lc]);

  function getEmptyForm() {
    return {
      expense_type: "شحن",
      amount: 0,
      currency: "ج.م",
      date: new Date().toISOString().slice(0, 10),
      description: "",
      vendor_name: "",
      invoice_number: "",
      branch_id: lc?.branch_id || "",
      branch_name: lc?.branch_name || "",
      notes: "",
    };
  }

  async function loadExpenses() {
    setLoading(true);
    const exps = await base44.entities.LcExpense.filter({ lc_id: lc.id }, "-created_date", 200);
    setExpenses(exps);
    setLoading(false);
  }

  async function loadBranches() {
    const brs = await base44.entities.Branch.list().catch(() => []);
    setBranches(brs);
  }

  async function handleAdd() {
    if (!form.amount || form.amount <= 0) {
      toast.error("يرجى إدخال المبلغ");
      return;
    }
    await base44.entities.LcExpense.create({
      lc_id: lc.id,
      lc_number: lc.lc_number,
      expense_type: form.expense_type,
      amount: form.amount,
      currency: form.currency,
      date: form.date,
      description: form.description,
      vendor_name: form.vendor_name,
      invoice_number: form.invoice_number,
      branch_id: form.branch_id,
      branch_name: form.branch_name,
      notes: form.notes,
    });
    toast.success("تم إضافة المصروف");
    setAddOpen(false);
    setForm(getEmptyForm());
    loadExpenses();
    if (onUpdated) onUpdated();
  }

  async function handleDelete(exp) {
    await base44.entities.LcExpense.delete(exp.id);
    toast.success("تم حذف المصروف");
    loadExpenses();
    if (onUpdated) onUpdated();
  }

  function update(field, value) { setForm(prev => ({ ...prev, [field]: value })); }

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const expenseTypes = [...new Set(expenses.map(e => e.expense_type))];

  if (!lc) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              المصاريف الإضافية - {lc.lc_number}
            </DialogTitle>
          </DialogHeader>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600 mb-0.5">عدد المصاريف</p>
              <p className="text-xl font-bold text-blue-800">{expenses.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600 mb-0.5">إجمالي المصاريف</p>
              <p className="text-xl font-bold text-green-800 font-mono">{totalExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-600 mb-0.5">التكلفة مع المصاريف</p>
              <p className="text-xl font-bold text-purple-800 font-mono">{((lc.amount || 0) + totalExpenses).toLocaleString()}</p>
            </div>
          </div>

          {/* Types summary pills */}
          {expenseTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {expenseTypes.map(type => {
                const Icon = EXPENSE_TYPE_ICONS[type] || Receipt;
                const typeTotal = expenses.filter(e => e.expense_type === type).reduce((s, e) => s + e.amount, 0);
                return (
                  <Badge key={type} className={cn("text-xs gap-1 px-2 py-1", EXPENSE_TYPE_COLORS[type])}>
                    <Icon className="h-3 w-3" />
                    {type}: {typeTotal.toLocaleString()}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-1.5">
              <Receipt className="h-4 w-4" />
              سجل المصاريف ({expenses.length})
            </h3>
            <Button size="sm" onClick={() => { setForm(getEmptyForm()); setAddOpen(true); }} className="gap-1 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" />
              مصروف جديد
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="font-medium">لا توجد مصاريف إضافية</p>
              <p className="text-xs mt-1">اضغط على "مصروف جديد" لإضافة مصروف</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-right p-2 font-semibold">النوع</th>
                    <th className="text-right p-2 font-semibold">التاريخ</th>
                    <th className="text-right p-2 font-semibold">المبلغ</th>
                    <th className="text-right p-2 font-semibold">البيان</th>
                    <th className="text-right p-2 font-semibold">الجهة</th>
                    <th className="text-right p-2 font-semibold">مستند</th>
                    <th className="text-center p-2 font-semibold w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp, i) => {
                    const Icon = EXPENSE_TYPE_ICONS[exp.expense_type] || Receipt;
                    return (
                      <tr key={exp.id} className={cn("border-b hover:bg-muted/20", i % 2 === 0 && "bg-muted/10")}>
                        <td className="p-2">
                          <Badge className={cn("text-xs gap-1", EXPENSE_TYPE_COLORS[exp.expense_type])}>
                            <Icon className="h-3 w-3" />
                            {exp.expense_type}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">{exp.date ? new Date(exp.date).toLocaleDateString("ar-EG") : "-"}</td>
                        <td className="p-2 font-mono font-semibold">{exp.amount?.toLocaleString()} {exp.currency}</td>
                        <td className="p-2">{exp.description || "-"}</td>
                        <td className="p-2">{exp.vendor_name || "-"}</td>
                        <td className="p-2">
                          {exp.invoice_number ? (
                            <span className="font-mono text-xs">{exp.invoice_number}</span>
                          ) : "-"}
                        </td>
                        <td className="p-2 text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(exp)}>
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

      {/* Add Expense Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              مصروف جديد - {lc.lc_number}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>نوع المصروف *</Label>
              <Select value={form.expense_type} onValueChange={v => update("expense_type", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(EXPENSE_TYPE_ICONS).map(type => {
                    const Icon = EXPENSE_TYPE_ICONS[type];
                    return (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{type}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المبلغ *</Label>
              <Input type="number" value={form.amount || ""} onChange={e => update("amount", parseFloat(e.target.value) || 0)} className="h-9" />
            </div>
            <div>
              <Label>العملة</Label>
              <Input value={form.currency} onChange={e => update("currency", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={form.date} onChange={e => update("date", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label>رقم المستند</Label>
              <Input value={form.invoice_number} onChange={e => update("invoice_number", e.target.value)} className="h-9" placeholder="رقم الفاتورة" />
            </div>
            <div className="col-span-2">
              <Label>البيان</Label>
              <Input value={form.description} onChange={e => update("description", e.target.value)} className="h-9" placeholder="وصف المصروف..." />
            </div>
            <div className="col-span-2">
              <Label>الجهة / المورد</Label>
              <Input value={form.vendor_name} onChange={e => update("vendor_name", e.target.value)} className="h-9" placeholder="اسم الجهة أو المورد" />
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
            <Button onClick={handleAdd}>إضافة المصروف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}