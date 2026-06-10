import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CustodyForm({ open, onClose, onSaved, editing, employees, costCenters, accounts }) {
  const EMPTY = {
    custody_number: "", employee_id: "", employee_name: "", department: "",
    purpose: "", issued_amount: 0, issue_date: new Date().toISOString().split("T")[0],
    expected_return_date: "", account_id: "", account_name: "",
    cost_center_id: "", cost_center_name: "", branch_id: "", branch_name: "",
    status: "مفتوحة", notes: "", spent_amount: 0, returned_amount: 0
  };

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) setForm({ ...editing });
    else {
      const num = "EHD-" + Date.now().toString().slice(-6);
      setForm({ ...EMPTY, custody_number: num });
    }
  }, [editing, open]);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function selectEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (emp) setForm(f => ({ ...f, employee_id: id, employee_name: emp.name, department: emp.department || "" }));
  }

  function selectCostCenter(id) {
    const cc = costCenters.find(c => c.id === id);
    setForm(f => ({ ...f, cost_center_id: id, cost_center_name: cc?.name || "" }));
  }

  function selectAccount(id) {
    const acc = accounts.find(a => a.id === id);
    setForm(f => ({ ...f, account_id: id, account_name: acc?.name || "" }));
  }

  async function save() {
    if (!form.employee_id || !form.issued_amount || !form.purpose) {
      toast.error("الموظف والمبلغ والغرض مطلوبة");
      return;
    }
    setSaving(true);
    if (editing) await base44.entities.Custody.update(editing.id, form);
    else await base44.entities.Custody.create(form);
    toast.success("تم حفظ العهدة");
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{editing ? "تعديل عهدة" : "صرف عهدة مالية جديدة"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <Label>رقم العهدة</Label>
            <Input value={form.custody_number} onChange={e => setF("custody_number", e.target.value)} />
          </div>
          <div>
            <Label>تاريخ الصرف</Label>
            <Input type="date" value={form.issue_date} onChange={e => setF("issue_date", e.target.value)} />
          </div>

          <div className="col-span-2">
            <Label>الموظف</Label>
            <Select value={form.employee_id} onValueChange={selectEmployee}>
              <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
              <SelectContent>
                {employees.filter(e => e.status === "نشط").map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name} — {e.department || "بلا قسم"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>الغرض من العهدة</Label>
            <Input value={form.purpose} onChange={e => setF("purpose", e.target.value)} placeholder="مثال: مشتريات مكتبية، سفر عمل..." />
          </div>

          <div>
            <Label>المبلغ المصروف</Label>
            <Input type="number" value={form.issued_amount} onChange={e => setF("issued_amount", +e.target.value)} />
          </div>
          <div>
            <Label>تاريخ الإرجاع المتوقع</Label>
            <Input type="date" value={form.expected_return_date} onChange={e => setF("expected_return_date", e.target.value)} />
          </div>

          <div>
            <Label>حساب العهدة</Label>
            <Select value={form.account_id} onValueChange={selectAccount}>
              <SelectTrigger><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_number} - {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>مركز التكلفة</Label>
            <Select value={form.cost_center_id} onValueChange={selectCostCenter}>
              <SelectTrigger><SelectValue placeholder="اختر المركز" /></SelectTrigger>
              <SelectContent>
                {costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>ملاحظات</Label>
            <Input value={form.notes} onChange={e => setF("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ العهدة"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}