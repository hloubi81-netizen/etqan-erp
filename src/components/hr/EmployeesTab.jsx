import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";

const EMPTY = (department) => ({
  name: "", employee_number: "", department: department || "", position: "", hire_date: "",
  salary: 0, phone: "", national_id: "", status: "نشط", notes: "",
  working_days_per_month: 26, overtime_rate: 1.5, social_insurance_rate: 9,
  allowances_config: [], deductions_config: [],
});
const statusColor = { "نشط": "success", "موقوف": "secondary", "منتهي الخدمة": "destructive" };

export default function EmployeesTab({ department }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY(department));
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const emp = await base44.entities.Employee.list();
    const filtered = department ? emp.filter(e => (e.department || "").includes(department) || (e.department || "") === department) : emp;
    setEmployees(filtered);
    setLoading(false);
  }

  function openAdd() { setForm(EMPTY(department)); setEditing(null); setOpen(true); }
  function openEdit(emp) { setForm({ ...emp }); setEditing(emp.id); setOpen(true); }

  async function save() {
    if (!form.name || !form.employee_number) { toast.error("اسم الموظف ورقمه مطلوبان"); return; }
    try {
      if (editing) {
        await base44.entities.Employee.update(editing, form);
        toast.success("تم تحديث بيانات الموظف");
      } else {
        await base44.entities.Employee.create(form);
        toast.success("تمت إضافة الموظف");
      }
      setOpen(false); load();
    } catch (e) { toast.error("تعذّر الحفظ"); }
  }

  async function del(id) {
    if (!confirm("حذف هذا الموظف؟")) return;
    await base44.entities.Employee.delete(id);
    toast.success("تم الحذف");
    load();
  }

  const filtered = employees.filter(e => e.name?.includes(search) || e.employee_number?.includes(search) || e.position?.includes(search));
  const active = employees.filter(e => e.status === "نشط").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
            <Users className="h-7 w-7 text-blue-600" />
            <div><p className="text-xl font-bold text-blue-600">{employees.length}</p><p className="text-xs text-muted-foreground">إجمالي الموظفين</p></div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
            <UserCheck className="h-7 w-7 text-green-600" />
            <div><p className="text-xl font-bold text-green-600">{active}</p><p className="text-xs text-muted-foreground">نشطون</p></div>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> إضافة موظف</Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="بحث بالاسم أو الرقم أو المنصب..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
      </div>

      {loading ? <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(emp => (
            <div key={emp.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(emp)} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(emp.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">#{emp.employee_number}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {emp.department && <p>القسم: {emp.department}</p>}
                {emp.position && <p>المنصب: {emp.position}</p>}
                {emp.phone && <p>الهاتف: {emp.phone}</p>}
                {emp.salary > 0 && <p className="text-primary font-semibold">الراتب: {emp.salary.toLocaleString()}</p>}
              </div>
              <Badge variant={statusColor[emp.status] || "secondary"} className="mt-2 text-xs">{emp.status || "نشط"}</Badge>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12 text-sm">لا يوجد موظفون — اضغط "إضافة موظف"</div>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل موظف" : "إضافة موظف"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              ["name", "اسم الموظف*"], ["employee_number", "رقم الموظف*"],
              ["department", "القسم"], ["position", "المنصب"],
              ["phone", "الهاتف"], ["national_id", "رقم الهوية"],
            ].map(([k, lbl]) => (
              <div key={k}>
                <Label className="text-xs">{lbl}</Label>
                <Input value={form[k] || ""} onChange={(e) => setForm(p => ({ ...p, [k]: e.target.value }))} className="mt-1 h-8" />
              </div>
            ))}
            <div><Label className="text-xs">تاريخ التعيين</Label><Input type="date" value={form.hire_date || ""} onChange={(e) => setForm(p => ({ ...p, hire_date: e.target.value }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">الراتب الأساسي</Label><Input type="number" value={form.salary || 0} onChange={(e) => setForm(p => ({ ...p, salary: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">أيام العمل الشهرية</Label><Input type="number" value={form.working_days_per_month || 26} onChange={(e) => setForm(p => ({ ...p, working_days_per_month: parseFloat(e.target.value) || 26 }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">معدل الإضافي (×)</Label><Input type="number" step="0.1" value={form.overtime_rate || 1.5} onChange={(e) => setForm(p => ({ ...p, overtime_rate: parseFloat(e.target.value) || 1.5 }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">الحالة</Label>
              <Select value={form.status || "نشط"} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["نشط", "موقوف", "منتهي الخدمة"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label className="text-xs">ملاحظات</Label><Input value={form.notes || ""} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1 h-8" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={save} className="flex-1">حفظ</Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}