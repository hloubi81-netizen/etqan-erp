import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Receipt, Upload } from "lucide-react";
import { toast } from "sonner";
import { base44 as b44 } from "@/api/base44Client";

const CATEGORIES = ["مواصلات", "ضيافة وترفيه", "مستلزمات مكتبية", "صيانة", "رسوم وخدمات", "أخرى"];

const CAT_COLORS = {
  "مواصلات": "bg-sky-100 text-sky-700",
  "ضيافة وترفيه": "bg-pink-100 text-pink-700",
  "مستلزمات مكتبية": "bg-purple-100 text-purple-700",
  "صيانة": "bg-orange-100 text-orange-700",
  "رسوم وخدمات": "bg-indigo-100 text-indigo-700",
  "أخرى": "bg-gray-100 text-gray-600",
};

const EMPTY = {
  custody_id: "", custody_number: "", expense_date: new Date().toISOString().split("T")[0],
  description: "", category: "أخرى", amount: 0, vendor: "",
  invoice_number: "", account_id: "", account_name: "", is_verified: false, notes: "",
};

export default function CustodyExpenses({ custodies, expenses, accounts, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [filterCustody, setFilterCustody] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [uploading, setUploading] = useState(false);

  const activeCustodies = custodies.filter(c => c.status !== "ملغاة" && c.status !== "مسواة");

  function openNew(custodyId = "") {
    const c = custodies.find(c => c.id === custodyId);
    setForm({ ...EMPTY, custody_id: custodyId, custody_number: c?.custody_number || "" });
    setEditing(null);
    setOpen(true);
  }
  function openEdit(r) { setForm({ ...r }); setEditing(r.id); setOpen(true); }

  function setCustody(id) {
    const c = custodies.find(c => c.id === id);
    setForm(f => ({ ...f, custody_id: id, custody_number: c?.custody_number || "" }));
  }

  async function uploadFile(file) {
    setUploading(true);
    const { file_url } = await b44.integrations.Core.UploadFile({ file });
    setUploading(false);
    return file_url;
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    setForm(f => ({
      ...f,
      attachments: [...(f.attachments || []), { name: file.name, url, uploaded_at: new Date().toISOString() }],
      is_verified: true,
    }));
  }

  async function save() {
    if (!form.custody_id || !form.description || !form.amount) { toast.error("العهدة والوصف والمبلغ مطلوبة"); return; }
    // التحقق أن المصروف لا يتجاوز الرصيد المتاح
    const custody = custodies.find(c => c.id === form.custody_id);
    if (custody) {
      const currentExpenses = expenses.filter(e => e.custody_id === form.custody_id && e.id !== editing);
      const used = currentExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      if (used + +form.amount > (custody.amount || 0)) {
        toast.error(`المبلغ يتجاوز رصيد العهدة المتاح (${((custody.amount || 0) - used).toLocaleString("ar-SA")})`);
        return;
      }
    }
    if (editing) await base44.entities.CustodyExpense.update(editing, form);
    else await base44.entities.CustodyExpense.create(form);
    // تحديث إجمالي مصاريف العهدة
    if (custody) {
      const allExpenses = expenses.filter(e => e.custody_id === form.custody_id && e.id !== editing);
      const newTotal = allExpenses.reduce((s, e) => s + (e.amount || 0), 0) + +form.amount;
      await base44.entities.Custody.update(form.custody_id, { expenses_total: Math.round(newTotal * 100) / 100 });
    }
    toast.success("تم حفظ المصروف");
    setOpen(false);
    onRefresh();
  }

  async function del(exp) {
    if (!confirm("حذف هذا المصروف؟")) return;
    await base44.entities.CustodyExpense.delete(exp.id);
    // تحديث إجمالي العهدة
    const remaining = expenses.filter(e => e.custody_id === exp.custody_id && e.id !== exp.id);
    const newTotal = remaining.reduce((s, e) => s + (e.amount || 0), 0);
    await base44.entities.Custody.update(exp.custody_id, { expenses_total: Math.round(newTotal * 100) / 100 });
    toast.success("تم الحذف");
    onRefresh();
  }

  const filtered = useMemo(() => expenses.filter(e =>
    (filterCustody === "all" || e.custody_id === filterCustody) &&
    (filterCat === "all" || e.category === filterCat)
  ), [expenses, filterCustody, filterCat]);

  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const verifiedTotal = filtered.filter(e => e.is_verified).reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterCustody} onValueChange={setFilterCustody}>
            <SelectTrigger className="h-9 w-48"><SelectValue placeholder="تصفية بالعهدة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع العهد</SelectItem>
              {custodies.map(c => <SelectItem key={c.id} value={c.id}>{c.custody_number} — {c.employee_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="التصنيف" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            الإجمالي: <strong>{totalFiltered.toLocaleString("ar-SA")}</strong> | موثق: <strong className="text-green-600">{verifiedTotal.toLocaleString("ar-SA")}</strong>
          </span>
          <Button onClick={() => openNew()} className="gap-1.5"><Plus className="h-4 w-4" /> إضافة مصروف</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right font-medium">العهدة</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">الوصف</th>
                <th className="px-4 py-3 text-right font-medium">التصنيف</th>
                <th className="px-4 py-3 text-right font-medium">المورد</th>
                <th className="px-4 py-3 text-right font-medium">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                <th className="px-4 py-3 text-center font-medium">موثق</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>لا توجد مصاريف</p>
                </td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className={`border-t hover:bg-muted/20 ${!e.is_verified ? "bg-yellow-50/30" : ""}`}>
                  <td className="px-4 py-3 font-mono text-primary text-xs">{e.custody_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.expense_date}</td>
                  <td className="px-4 py-3 font-medium max-w-40 truncate">{e.description}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLORS[e.category] || "bg-gray-100"}`}>{e.category || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{e.vendor || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{e.invoice_number || "—"}</td>
                  <td className="px-4 py-3 font-semibold">{(e.amount || 0).toLocaleString("ar-SA")}</td>
                  <td className="px-4 py-3 text-center">{e.is_verified ? <span className="text-green-600">✅</span> : <span className="text-orange-400">⬜</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(e)} className="text-muted-foreground hover:text-primary p-1"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => del(e)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل مصروف" : "إضافة مصروف"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2">
              <Label>العهدة المرتبطة</Label>
              <Select value={form.custody_id} onValueChange={setCustody}>
                <SelectTrigger><SelectValue placeholder="اختر العهدة" /></SelectTrigger>
                <SelectContent>
                  {activeCustodies.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.custody_number} — {c.employee_name} (متاح: {((c.amount||0) - expenses.filter(e=>e.custody_id===c.id&&e.id!==editing).reduce((s,e)=>s+(e.amount||0),0)).toLocaleString("ar-SA")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ المصروف</Label>
              <Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
            </div>
            <div>
              <Label>التصنيف</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>وصف المصروف</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="مثل: تاكسي من المطار، فاتورة مطعم..." />
            </div>
            <div>
              <Label>المبلغ</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} />
            </div>
            <div>
              <Label>المورد / الجهة</Label>
              <Input value={form.vendor || ""} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="اختياري" />
            </div>
            <div>
              <Label>رقم الفاتورة / الإيصال</Label>
              <Input value={form.invoice_number || ""} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="اختياري" />
            </div>
            <div>
              <Label>حساب المصروف</Label>
              <Select value={form.account_id || ""} onValueChange={v => { const ac = accounts.find(a => a.id === v); setForm(f => ({ ...f, account_id: v, account_name: ac?.name || "" })); }}>
                <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                <SelectContent>{accounts.slice(0, 80).map(a => <SelectItem key={a.id} value={a.id}>{a.account_number} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {/* Upload Receipt */}
            <div className="col-span-2">
              <Label className="flex items-center gap-2 mb-1">
                <Upload className="h-4 w-4" /> رفع صورة الإيصال / الفاتورة
              </Label>
              <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="text-sm" disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground mt-1">جاري الرفع...</p>}
              {form.attachments?.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {form.attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">{att.name}</a>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox id="verified" checked={form.is_verified} onCheckedChange={v => setForm(f => ({ ...f, is_verified: !!v }))} />
              <Label htmlFor="verified" className="cursor-pointer">تم إرفاق مستند إثبات (إيصال / فاتورة)</Label>
            </div>
            <div className="col-span-2">
              <Label>ملاحظات</Label>
              <Input value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={uploading}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}