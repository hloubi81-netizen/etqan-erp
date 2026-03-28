import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Users, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { name: "", employee_number: "", department: "", position: "", hire_date: "", salary: 0, allowances: 0, phone: "", national_id: "", status: "نشط", notes: "" };

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    Promise.all([base44.entities.Employee.list(), base44.entities.Branch.list()]).then(([e, b]) => {
      setEmployees(e); setBranches(b); setLoading(false);
    });
  }, []);

  function openAdd() { setForm(EMPTY); setEditing(null); setOpen(true); }
  function openEdit(emp) { setForm({ ...emp }); setEditing(emp.id); setOpen(true); }

  async function save() {
    if (!form.name || !form.employee_number) { toast.error("اسم الموظف ورقمه مطلوبان"); return; }
    if (editing) {
      await base44.entities.Employee.update(editing, form);
      setEmployees((prev) => prev.map((e) => e.id === editing ? { ...e, ...form } : e));
    } else {
      const created = await base44.entities.Employee.create(form);
      setEmployees((prev) => [...prev, created]);
    }
    toast.success("تم الحفظ");
    setOpen(false);
  }

  async function del(id) {
    if (!confirm("حذف هذا الموظف؟")) return;
    await base44.entities.Employee.delete(id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    toast.success("تم الحذف");
  }

  const filtered = employees.filter((e) => e.name?.includes(search) || e.employee_number?.includes(search) || e.department?.includes(search));
  const active = employees.filter((e) => e.status === "نشط").length;

  const statusColor = { "نشط": "default", "موقوف": "secondary", "منتهي الخدمة": "destructive" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الموظفون</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة بيانات الموظفين</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />إضافة موظف</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center"><Users className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-muted-foreground">إجمالي الموظفين</p><p className="text-xl font-bold">{employees.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 bg-green-600 rounded-xl flex items-center justify-center"><UserCheck className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-muted-foreground">نشطون</p><p className="text-xl font-bold">{active}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 bg-red-500 rounded-xl flex items-center justify-center"><UserX className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-muted-foreground">غير نشطين</p><p className="text-xl font-bold">{employees.length - active}</p></div>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="بحث بالاسم أو الرقم أو القسم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
      </div>

      {loading ? <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <Card key={emp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(emp)} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(emp.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">#{emp.employee_number}</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {emp.department && <p>القسم: {emp.department}</p>}
                  {emp.position && <p>المنصب: {emp.position}</p>}
                  {emp.phone && <p>الهاتف: {emp.phone}</p>}
                  {emp.salary > 0 && <p className="text-primary font-semibold text-sm">الراتب: {emp.salary.toLocaleString()}</p>}
                </div>
                <Badge variant={statusColor[emp.status] || "default"} className="mt-2 text-xs">{emp.status || "نشط"}</Badge>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <div className="col-span-3 text-center text-muted-foreground py-12">لا يوجد موظفون</div>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل موظف" : "إضافة موظف"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[["name","اسم الموظف*"],["employee_number","رقم الموظف*"],["department","القسم"],["position","المنصب"],["phone","الهاتف"],["national_id","رقم الهوية"]].map(([k,lbl]) => (
              <div key={k}>
                <Label className="text-xs">{lbl}</Label>
                <Input value={form[k] || ""} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} className="mt-1 h-8" />
              </div>
            ))}
            <div><Label className="text-xs">تاريخ التعيين</Label><Input type="date" value={form.hire_date || ""} onChange={(e) => setForm((p) => ({ ...p, hire_date: e.target.value }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">الراتب الأساسي</Label><Input type="number" value={form.salary || 0} onChange={(e) => setForm((p) => ({ ...p, salary: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">البدلات</Label><Input type="number" value={form.allowances || 0} onChange={(e) => setForm((p) => ({ ...p, allowances: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">الحالة</Label>
              <Select value={form.status || "نشط"} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["نشط","موقوف","منتهي الخدمة"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label className="text-xs">ملاحظات</Label><Input value={form.notes || ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="mt-1 h-8" /></div>
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