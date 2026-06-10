import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Wallet, Eye } from "lucide-react";
import { toast } from "sonner";
import CustodyDetail from "./CustodyDetail";

const STATUS_STYLES = {
  "مفتوحة": "bg-blue-100 text-blue-700",
  "قيد التسوية": "bg-orange-100 text-orange-700",
  "مسواة": "bg-green-100 text-green-700",
  "ملغاة": "bg-gray-100 text-gray-500",
};

const EMPTY = {
  custody_number: "", employee_id: "", employee_name: "", employee_number: "",
  department: "", purpose: "", amount: 0, currency: "SAR",
  issue_date: new Date().toISOString().split("T")[0], due_date: "",
  cost_center_id: "", cost_center_name: "", account_id: "", account_name: "",
  payment_method: "نقداً", status: "مفتوحة", notes: "",
};

export default function CustodyList({ custodies, expenses, employees, accounts, costCenters, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const nextNumber = `EHD-${String(custodies.length + 1).padStart(4, "0")}`;

  function openNew() {
    setForm({ ...EMPTY, custody_number: nextNumber });
    setEditing(null);
    setOpen(true);
  }
  function openEdit(r) { setForm({ ...r }); setEditing(r.id); setOpen(true); }

  function setEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    setForm(f => ({ ...f, employee_id: id, employee_name: emp.name, employee_number: emp.employee_number || "", department: emp.department || "", cost_center_id: emp.cost_center_id || "", cost_center_name: emp.cost_center_name || "" }));
  }

  async function save() {
    if (!form.employee_id || !form.amount || !form.issue_date) { toast.error("الموظف والمبلغ والتاريخ مطلوبة"); return; }
    if (editing) await base44.entities.Custody.update(editing, form);
    else await base44.entities.Custody.create(form);
    toast.success("تم الحفظ");
    setOpen(false);
    onRefresh();
  }

  async function del(id) {
    const hasExpenses = expenses.some(e => e.custody_id === id);
    if (hasExpenses) { toast.error("لا يمكن حذف عهدة بها مصاريف مثبتة"); return; }
    if (!confirm("حذف هذه العهدة؟")) return;
    await base44.entities.Custody.delete(id);
    toast.success("تم الحذف");
    onRefresh();
  }

  const filtered = custodies.filter(c =>
    (filterStatus === "all" || c.status === filterStatus) &&
    (!search || c.employee_name?.includes(search) || c.custody_number?.includes(search) || c.purpose?.includes(search))
  );

  const detailCustody = custodies.find(c => c.id === detailId);
  const detailExpenses = expenses.filter(e => e.custody_id === detailId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-48" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              {["مفتوحة", "قيد التسوية", "مسواة", "ملغاة"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> صرف عهدة جديدة</Button>
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right font-medium">رقم العهدة</th>
                <th className="px-4 py-3 text-right font-medium">الموظف</th>
                <th className="px-4 py-3 text-right font-medium">الغرض</th>
                <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium">المصاريف</th>
                <th className="px-4 py-3 text-right font-medium">الفرق</th>
                <th className="px-4 py-3 text-right font-medium">تاريخ الصرف</th>
                <th className="px-4 py-3 text-center font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Wallet className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>لا توجد عهد مالية</p>
                </td></tr>
              ) : filtered.map(c => {
                const empExpenses = expenses.filter(e => e.custody_id === c.id);
                const expTotal = empExpenses.reduce((s, e) => s + (e.amount || 0), 0);
                const diff = (c.amount || 0) - expTotal - (c.returned_amount || 0);
                return (
                  <tr key={c.id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{c.custody_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{c.department || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-32 truncate">{c.purpose || "—"}</td>
                    <td className="px-4 py-3 font-semibold">{(c.amount || 0).toLocaleString("ar-SA")}</td>
                    <td className="px-4 py-3 text-green-600">{expTotal.toLocaleString("ar-SA")}</td>
                    <td className={`px-4 py-3 font-semibold ${diff > 0 ? "text-orange-600" : diff < 0 ? "text-red-600" : "text-green-600"}`}>
                      {diff > 0 ? `+${diff.toLocaleString("ar-SA")}` : diff.toLocaleString("ar-SA")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.issue_date}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setDetailId(c.id)} className="text-muted-foreground hover:text-primary p-1"><Eye className="h-3.5 w-3.5" /></button>
                        {c.status !== "مسواة" && <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-primary p-1"><Pencil className="h-3.5 w-3.5" /></button>}
                        {c.status === "ملغاة" && <button onClick={() => del(c.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل عهدة" : "صرف عهدة مالية جديدة"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label>رقم العهدة</Label>
              <Input value={form.custody_number} onChange={e => setForm(f => ({ ...f, custody_number: e.target.value }))} />
            </div>
            <div>
              <Label>الموظف</Label>
              <Select value={form.employee_id} onValueChange={setEmployee}>
                <SelectTrigger><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.department || ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>الغرض من العهدة</Label>
              <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="مثل: مصاريف سفر، ضيافة اجتماع..." />
            </div>
            <div>
              <Label>المبلغ المصروف</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} />
            </div>
            <div>
              <Label>طريقة الصرف</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["نقداً", "تحويل بنكي", "شيك"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الصرف</Label>
              <Input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
            </div>
            <div>
              <Label>تاريخ التسوية المتوقع</Label>
              <Input type="date" value={form.due_date || ""} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label>مركز التكلفة</Label>
              <Select value={form.cost_center_id || ""} onValueChange={v => { const cc = costCenters.find(c => c.id === v); setForm(f => ({ ...f, cost_center_id: v, cost_center_name: cc?.name || "" })); }}>
                <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                <SelectContent>{costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>حساب الصرف</Label>
              <Select value={form.account_id || ""} onValueChange={v => { const ac = accounts.find(a => a.id === v); setForm(f => ({ ...f, account_id: v, account_name: ac?.name || "" })); }}>
                <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                <SelectContent>{accounts.slice(0, 80).map(a => <SelectItem key={a.id} value={a.id}>{a.account_number} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>ملاحظات</Label>
              <Input value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>تفاصيل العهدة</DialogTitle></DialogHeader>
          {detailCustody && <CustodyDetail custody={detailCustody} expenses={detailExpenses} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}