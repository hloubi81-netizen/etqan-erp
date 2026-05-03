import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { employee_id: "", employee_name: "", leave_type: "سنوية", start_date: "", end_date: "", days: 0, reason: "", status: "معلقة", notes: "" };
const STATUS_COLORS = { "معلقة": "secondary", "موافق عليها": "default", "مرفوضة": "destructive" };
const STATUS_ICONS = { "معلقة": Clock, "موافق عليها": CheckCircle, "مرفوضة": XCircle };
const LEAVE_COLORS = { "سنوية": "bg-blue-100 text-blue-700", "مرضية": "bg-red-100 text-red-700", "طارئة": "bg-orange-100 text-orange-700", "أمومة/أبوة": "bg-pink-100 text-pink-700", "بدون راتب": "bg-gray-100 text-gray-700" };

export default function LeaveRequests() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("الكل");

  useEffect(() => {
    Promise.all([
      base44.entities.LeaveRequest.list("-created_date"),
      base44.entities.Employee.filter({ status: "نشط" })
    ]).then(([r, e]) => { setRequests(r); setEmployees(e); setLoading(false); });
  }, []);

  function calcDays(start, end) {
    if (!start || !end) return 0;
    const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.ceil(diff) + 1);
  }

  function updateDate(key, val) {
    setForm((p) => {
      const updated = { ...p, [key]: val };
      updated.days = calcDays(key === "start_date" ? val : p.start_date, key === "end_date" ? val : p.end_date);
      return updated;
    });
  }

  function openAdd() { setForm(EMPTY); setEditing(null); setOpen(true); }
  function openEdit(r) { setForm({ ...r }); setEditing(r.id); setOpen(true); }

  async function save() {
    if (!form.employee_id || !form.start_date || !form.end_date) { toast.error("الموظف والتواريخ مطلوبة"); return; }
    if (editing) {
      await base44.entities.LeaveRequest.update(editing, form);
      setRequests((p) => p.map((r) => r.id === editing ? { ...r, ...form } : r));
    } else {
      const created = await base44.entities.LeaveRequest.create(form);
      setRequests((p) => [created, ...p]);
    }
    toast.success("تم الحفظ");
    setOpen(false);
  }

  async function approve(id) {
    await base44.entities.LeaveRequest.update(id, { status: "موافق عليها" });
    setRequests((p) => p.map((r) => r.id === id ? { ...r, status: "موافق عليها" } : r));
    toast.success("تمت الموافقة");
  }

  async function reject(id) {
    await base44.entities.LeaveRequest.update(id, { status: "مرفوضة" });
    setRequests((p) => p.map((r) => r.id === id ? { ...r, status: "مرفوضة" } : r));
    toast.info("تم الرفض");
  }

  async function del(id) {
    if (!confirm("حذف هذا الطلب؟")) return;
    await base44.entities.LeaveRequest.delete(id);
    setRequests((p) => p.filter((r) => r.id !== id));
  }

  const filtered = filter === "الكل" ? requests : requests.filter((r) => r.status === filter);
  const pending = requests.filter((r) => r.status === "معلقة").length;
  const approved = requests.filter((r) => r.status === "موافق عليها").length;
  const totalDays = requests.filter((r) => r.status === "موافق عليها").reduce((s, r) => s + (r.days || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">طلبات الإجازات</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة ومتابعة طلبات إجازات الموظفين</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />طلب إجازة</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          ["طلبات معلقة", pending, "bg-yellow-500", Clock],
          ["موافق عليها", approved, "bg-green-600", CheckCircle],
          ["أيام الإجازات المعتمدة", totalDays, "bg-blue-600", Calendar],
        ].map(([lbl, val, bg, Icon]) => (
          <Card key={lbl}><CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 ${bg} rounded-xl flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
            <div><p className="text-xs text-muted-foreground">{lbl}</p><p className="text-xl font-bold">{val}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["الكل", "معلقة", "موافق عليها", "مرفوضة"].map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>{s}</Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">لا توجد طلبات</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const StatusIcon = STATUS_ICONS[req.status] || Clock;
            return (
              <Card key={req.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="font-bold">{req.employee_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAVE_COLORS[req.leave_type] || "bg-gray-100 text-gray-700"}`}>{req.leave_type}</span>
                        <Badge variant={STATUS_COLORS[req.status]}>{req.status}</Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div><Calendar className="h-3 w-3 inline ml-1" />{req.start_date}</div>
                        <div>حتى: {req.end_date}</div>
                        <div className="font-semibold text-primary">{req.days} يوم</div>
                        {req.reason && <div className="col-span-2 sm:col-span-1 truncate">{req.reason}</div>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end shrink-0">
                      {req.status === "معلقة" && (
                        <>
                          <Button size="sm" variant="default" className="gap-1 h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => approve(req.id)}>
                            <CheckCircle className="h-3 w-3" />موافقة
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1 h-7 text-xs" onClick={() => reject(req.id)}>
                            <XCircle className="h-3 w-3" />رفض
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => del(req.id)}>حذف</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل طلب إجازة" : "طلب إجازة جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">الموظف*</Label>
              <Select value={form.employee_id} onValueChange={(v) => { const emp = employees.find((e) => e.id === v); setForm((p) => ({ ...p, employee_id: v, employee_name: emp?.name || "" })); }}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">نوع الإجازة</Label>
              <Select value={form.leave_type} onValueChange={(v) => setForm((p) => ({ ...p, leave_type: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["سنوية","مرضية","طارئة","أمومة/أبوة","بدون راتب"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">من*</Label><Input type="date" value={form.start_date} onChange={(e) => updateDate("start_date", e.target.value)} className="mt-1 h-8" /></div>
              <div><Label className="text-xs">إلى*</Label><Input type="date" value={form.end_date} onChange={(e) => updateDate("end_date", e.target.value)} className="mt-1 h-8" /></div>
            </div>
            {form.days > 0 && <p className="text-sm text-center font-semibold text-primary bg-primary/5 rounded-lg py-2">عدد الأيام: {form.days} يوم</p>}
            <div><Label className="text-xs">السبب</Label><Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} className="mt-1 h-8" /></div>
            <div className="flex gap-2 pt-1">
              <Button onClick={save} className="flex-1">حفظ</Button>
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}