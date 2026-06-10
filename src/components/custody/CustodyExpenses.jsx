import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, XCircle, Paperclip } from "lucide-react";
import { toast } from "sonner";

const CATS = ["مواصلات", "ضيافة", "مستلزمات مكتبية", "صيانة", "اتصالات", "أخرى"];

const EMPTY_EXP = {
  expense_date: new Date().toISOString().split("T")[0],
  description: "", category: "أخرى", amount: 0,
  invoice_number: "", vendor_name: "", notes: "", is_approved: false
};

export default function CustodyExpenses({ custody, expenses, accounts, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_EXP);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function openAdd() { setForm({ ...EMPTY_EXP, custody_id: custody.id, custody_number: custody.custody_number }); setOpen(true); }

  async function save() {
    if (!form.description || !form.amount) { toast.error("البيان والمبلغ مطلوبان"); return; }
    setSaving(true);
    await base44.entities.CustodyExpense.create({ ...form, custody_id: custody.id, custody_number: custody.custody_number });
    // تحديث المبلغ المنفق على العهدة
    const newSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0) + (form.amount || 0);
    await base44.entities.Custody.update(custody.id, { spent_amount: newSpent });
    toast.success("تم تسجيل المصروف");
    setSaving(false);
    setOpen(false);
    onRefresh();
  }

  async function del(exp) {
    if (!confirm("حذف هذا المصروف؟")) return;
    await base44.entities.CustodyExpense.delete(exp.id);
    const newSpent = expenses.filter(e => e.id !== exp.id).reduce((s, e) => s + (e.amount || 0), 0);
    await base44.entities.Custody.update(custody.id, { spent_amount: newSpent });
    toast.success("تم الحذف");
    onRefresh();
  }

  async function toggleApprove(exp) {
    await base44.entities.CustodyExpense.update(exp.id, { is_approved: !exp.is_approved });
    toast.success(exp.is_approved ? "تم إلغاء الاعتماد" : "تم اعتماد المصروف");
    onRefresh();
  }

  async function uploadAttachment(expId, file) {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const exp = expenses.find(e => e.id === expId);
    const attachments = [...(exp.attachments || []), { name: file.name, url: file_url, uploaded_at: new Date().toISOString() }];
    await base44.entities.CustodyExpense.update(expId, { attachments });
    toast.success("تم رفع المستند");
    setUploading(false);
    onRefresh();
  }

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const approvedTotal = expenses.filter(e => e.is_approved).reduce((s, e) => s + (e.amount || 0), 0);
  const remaining = (custody.issued_amount || 0) - totalExpenses;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-blue-700">{(custody.issued_amount || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">المبلغ المصروف</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-orange-600">{totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">إجمالي المصاريف</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${remaining >= 0 ? "bg-green-50" : "bg-red-50"}`}>
          <p className={`text-lg font-bold ${remaining >= 0 ? "text-green-600" : "text-red-600"}`}>{remaining.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">الرصيد المتبقي</p>
        </div>
      </div>

      {/* Actions */}
      {custody.status !== "مغلقة" && custody.status !== "مسواة" && (
        <Button onClick={openAdd} className="gap-1.5" size="sm">
          <Plus className="h-4 w-4" /> إضافة مصروف
        </Button>
      )}

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">لم يتم تسجيل أي مصاريف بعد</div>
      ) : (
        <div className="space-y-2">
          {expenses.map(exp => (
            <Card key={exp.id} className={`${exp.is_approved ? "border-green-200 bg-green-50/30" : ""}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{exp.description}</span>
                      <Badge variant="outline" className="text-xs">{exp.category}</Badge>
                      {exp.is_approved
                        ? <Badge className="text-xs bg-green-100 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />معتمد</Badge>
                        : <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">بانتظار الاعتماد</Badge>
                      }
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>{exp.expense_date}</span>
                      {exp.vendor_name && <span>• {exp.vendor_name}</span>}
                      {exp.invoice_number && <span>• فاتورة: {exp.invoice_number}</span>}
                      {exp.attachments?.length > 0 && (
                        <span className="text-blue-600 flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />{exp.attachments.length} مستند
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{(exp.amount || 0).toLocaleString()}</span>
                    <div className="flex gap-1">
                      <button onClick={() => toggleApprove(exp)} title={exp.is_approved ? "إلغاء الاعتماد" : "اعتماد"}>
                        {exp.is_approved
                          ? <XCircle className="h-4 w-4 text-muted-foreground hover:text-orange-500" />
                          : <CheckCircle className="h-4 w-4 text-muted-foreground hover:text-green-600" />}
                      </button>
                      <label className="cursor-pointer" title="رفع مستند">
                        <Paperclip className="h-4 w-4 text-muted-foreground hover:text-blue-600" />
                        <input type="file" className="hidden" disabled={uploading}
                          onChange={e => e.target.files[0] && uploadAttachment(exp.id, e.target.files[0])} />
                      </label>
                      {custody.status !== "مغلقة" && (
                        <button onClick={() => del(exp)}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-between text-sm font-semibold bg-muted/30 rounded-lg px-3 py-2">
            <span>المعتمد: <span className="text-green-600">{approvedTotal.toLocaleString()}</span></span>
            <span>الإجمالي: <span className="text-primary">{totalExpenses.toLocaleString()}</span></span>
          </div>
        </div>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>تسجيل مصروف جديد</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>البيان / وصف المصروف</Label>
              <Input value={form.description} onChange={e => setF("description", e.target.value)} placeholder="مثال: تذاكر سفر، مستلزمات..." />
            </div>
            <div>
              <Label>المبلغ</Label>
              <Input type="number" value={form.amount} onChange={e => setF("amount", +e.target.value)} />
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={form.expense_date} onChange={e => setF("expense_date", e.target.value)} />
            </div>
            <div>
              <Label>الفئة</Label>
              <Select value={form.category} onValueChange={v => setF("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>رقم الفاتورة / الإيصال</Label>
              <Input value={form.invoice_number} onChange={e => setF("invoice_number", e.target.value)} />
            </div>
            <div>
              <Label>اسم المورد / الجهة</Label>
              <Input value={form.vendor_name} onChange={e => setF("vendor_name", e.target.value)} />
            </div>
            <div>
              <Label>حساب المصروف</Label>
              <Select value={form.account_id} onValueChange={v => { const a = accounts.find(x => x.id === v); setF("account_id", v); setF("account_name", a?.name || ""); }}>
                <SelectTrigger><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_number} - {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={e => setF("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>حفظ المصروف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}