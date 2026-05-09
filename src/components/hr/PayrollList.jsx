import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  "مسودة": "bg-gray-100 text-gray-700",
  "معتمد": "bg-blue-100 text-blue-700",
  "مدفوع": "bg-green-100 text-green-700",
};

function calcNet(f) {
  const absDeduct = f.absence_deduction || 0;
  return (f.basic_salary || 0) + (f.allowances || 0) + (f.overtime || 0) - (f.deductions || 0) - absDeduct;
}

export default function PayrollList({ records, employees, costCenters, onRefresh }) {
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterCC, setFilterCC] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({});

  const EMPTY = {
    employee_id: "", employee_name: "", employee_number: "", department: "",
    cost_center_id: "", cost_center_name: "", period: "",
    basic_salary: 0, allowances: 0, allowances_detail: [], overtime: 0,
    deductions: 0, deductions_detail: [], absence_deduction: 0,
    net_salary: 0, payment_date: "", payment_method: "تحويل بنكي", status: "مسودة", notes: "",
  };

  function openNew() { setForm(EMPTY); setEditing(null); setOpen(true); }
  function openEdit(r) { setForm({ ...r }); setEditing(r.id); setOpen(true); }

  function selectEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    const allowances = emp.allowances_config?.reduce((s, a) => s + (a.amount || 0), 0) || (emp.allowances || 0);
    const deductions = emp.deductions_config?.reduce((s, d) => s + (d.amount || 0), 0) || 0;
    const socialInsurance = ((emp.salary || 0) * (emp.social_insurance_rate || 9)) / 100;
    const allDeductions = deductions + socialInsurance;
    setForm(f => {
      const next = {
        ...f,
        employee_id: id,
        employee_name: emp.name,
        employee_number: emp.employee_number || "",
        department: emp.department || "",
        cost_center_id: emp.cost_center_id || "",
        cost_center_name: emp.cost_center_name || "",
        basic_salary: emp.salary || 0,
        allowances,
        allowances_detail: emp.allowances_config || [],
        deductions: allDeductions,
        deductions_detail: [
          ...(emp.deductions_config || []),
          { name: `تأمين اجتماعي (${emp.social_insurance_rate || 9}%)`, amount: socialInsurance },
        ],
        absence_deduction: 0,
      };
      next.net_salary = calcNet(next);
      return next;
    });
  }

  function updateField(key, val) {
    setForm(f => { const next = { ...f, [key]: parseFloat(val) || 0 }; next.net_salary = calcNet(next); return next; });
  }

  async function save() {
    if (!form.employee_id || !form.period) { toast.error("الموظف والفترة مطلوبان"); return; }
    if (editing) await base44.entities.SalaryRecord.update(editing, form);
    else await base44.entities.SalaryRecord.create(form);
    toast.success("تم الحفظ");
    setOpen(false);
    onRefresh();
  }

  async function markStatus(id, status) {
    const data = { status };
    if (status === "مدفوع") data.payment_date = new Date().toISOString().split("T")[0];
    await base44.entities.SalaryRecord.update(id, data);
    toast.success(status === "مدفوع" ? "تم تسجيل الصرف" : "تم الاعتماد");
    onRefresh();
  }

  async function del(id) {
    if (!confirm("حذف هذا السجل؟")) return;
    await base44.entities.SalaryRecord.delete(id);
    toast.success("تم الحذف");
    onRefresh();
  }

  const filtered = records.filter(r =>
    (!filterPeriod || r.period?.includes(filterPeriod)) &&
    (filterCC === "all" || r.cost_center_id === filterCC)
  );
  const totalNet = filtered.reduce((s, r) => s + (r.net_salary || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="فلترة بالفترة (2026-05)" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="h-9 w-44" />
          <Select value={filterCC} onValueChange={setFilterCC}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="مركز التكلفة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المراكز</SelectItem>
              {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">الإجمالي: <strong>{totalNet.toLocaleString()}</strong></span>
          <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> إضافة راتب</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right font-medium w-8"></th>
                <th className="px-4 py-3 text-right font-medium">الموظف</th>
                <th className="px-4 py-3 text-right font-medium">الفترة</th>
                <th className="px-4 py-3 text-right font-medium">مركز التكلفة</th>
                <th className="px-4 py-3 text-right font-medium">أساسي</th>
                <th className="px-4 py-3 text-right font-medium">بدلات</th>
                <th className="px-4 py-3 text-right font-medium">استقطاعات</th>
                <th className="px-4 py-3 text-right font-medium">صافي</th>
                <th className="px-4 py-3 text-center font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">لا توجد سجلات</td></tr>
              ) : filtered.map(r => (
                <>
                  <tr key={r.id} className="border-t hover:bg-muted/20">
                    <td className="px-2 py-3 text-center">
                      <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="text-muted-foreground hover:text-primary">
                        {expanded === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{r.department}</p>
                    </td>
                    <td className="px-4 py-3 font-mono">{r.period}</td>
                    <td className="px-4 py-3 text-xs text-purple-700">{r.cost_center_name || "—"}</td>
                    <td className="px-4 py-3">{(r.basic_salary || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-600">+{(r.allowances || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-500">-{((r.deductions || 0) + (r.absence_deduction || 0)).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-primary">{(r.net_salary || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {r.status === "مسودة" && <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 text-xs" onClick={() => markStatus(r.id, "معتمد")}>اعتماد</Button>}
                        {r.status === "معتمد" && <Button size="sm" variant="outline" className="text-green-600 border-green-200 text-xs gap-1" onClick={() => markStatus(r.id, "مدفوع")}><CheckCircle className="h-3.5 w-3.5" />صرف</Button>}
                        <button onClick={() => openEdit(r)} className="text-muted-foreground hover:text-primary p-1"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => del(r.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`exp-${r.id}`} className="bg-muted/10">
                      <td colSpan={10} className="px-6 py-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="font-semibold text-green-700 mb-1">البدلات:</p>
                            {r.allowances_detail?.length > 0
                              ? r.allowances_detail.map((a, i) => <div key={i} className="flex justify-between py-0.5"><span>{a.name}</span><span className="font-medium">+{(a.amount || 0).toLocaleString()}</span></div>)
                              : <p className="text-muted-foreground">إجمالي: {(r.allowances || 0).toLocaleString()}</p>}
                          </div>
                          <div>
                            <p className="font-semibold text-red-700 mb-1">الاستقطاعات:</p>
                            {r.deductions_detail?.length > 0
                              ? r.deductions_detail.map((d, i) => <div key={i} className="flex justify-between py-0.5"><span>{d.name}</span><span className="font-medium text-red-600">-{(d.amount || 0).toLocaleString()}</span></div>)
                              : <p className="text-muted-foreground">إجمالي: {(r.deductions || 0).toLocaleString()}</p>}
                            {(r.absence_deduction || 0) > 0 && <div className="flex justify-between py-0.5 text-orange-600"><span>استقطاع غياب ({r.absence_days} يوم)</span><span>-{(r.absence_deduction || 0).toLocaleString()}</span></div>}
                          </div>
                        </div>
                        {r.payment_date && <p className="text-xs text-muted-foreground mt-2">تاريخ الصرف: {r.payment_date} — {r.payment_method}</p>}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل سجل راتب" : "إضافة راتب يدوي"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>الموظف</Label>
                <Select value={form.employee_id} onValueChange={selectEmployee}>
                  <SelectTrigger><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.status === "نشط").map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.department || "بلا قسم"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>الفترة</Label>
                <Input placeholder="2026-05" value={form.period || ""} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
              </div>
              <div>
                <Label>مركز التكلفة</Label>
                <Select value={form.cost_center_id || ""} onValueChange={v => { const cc = costCenters.find(c => c.id === v); setForm(f => ({ ...f, cost_center_id: v, cost_center_name: cc?.name || "" })); }}>
                  <SelectTrigger><SelectValue placeholder="اختر المركز" /></SelectTrigger>
                  <SelectContent>{costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Salary Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "basic_salary", label: "الراتب الأساسي", color: "" },
                { key: "allowances", label: "إجمالي البدلات", color: "text-green-700" },
                { key: "overtime", label: "الوقت الإضافي", color: "text-blue-700" },
                { key: "deductions", label: "الاستقطاعات الثابتة", color: "text-red-700" },
                { key: "absence_deduction", label: "استقطاع الغياب", color: "text-orange-700" },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <Label className={color}>{label}</Label>
                  <Input type="number" value={form[key] || 0} onChange={e => updateField(key, e.target.value)} />
                </div>
              ))}
              <div className="flex flex-col justify-end">
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">صافي الراتب</p>
                  <p className="text-2xl font-bold text-primary">{(form.net_salary || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>طريقة الصرف</Label>
                <Select value={form.payment_method || "تحويل بنكي"} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                    <SelectItem value="نقداً">نقداً</SelectItem>
                    <SelectItem value="شيك">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>تاريخ الصرف</Label>
                <Input type="date" value={form.payment_date || ""} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
            </div>
            <div><Label>ملاحظات</Label><Input value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}