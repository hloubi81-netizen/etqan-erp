import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, ClipboardList, Fingerprint, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";
import ZKTecoSettings from "@/components/hr/ZKTecoSettings";
import ZKTecoLogsPanel from "@/components/hr/ZKTecoLogsPanel";

const EMPTY = { employee_id: "", employee_name: "", date: new Date().toISOString().split("T")[0], type: "حضور", check_in: "", check_out: "", hours: 0, notes: "" };
const TYPE_COLORS = { "حضور": "default", "غياب": "destructive", "إجازة": "secondary", "إجازة مرضية": "outline", "تأخير": "outline" };

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    Promise.all([base44.entities.Attendance.list("-date"), base44.entities.Employee.filter({ status: "نشط" })]).then(([r, e]) => {
      setRecords(r); setEmployees(e); setLoading(false);
    });
  }, []);

  function openAdd() { setForm(EMPTY); setEditing(null); setOpen(true); }
  function openEdit(r) { setForm({ ...r }); setEditing(r.id); setOpen(true); }

  function selectEmployee(id) {
    const emp = employees.find((e) => e.id === id);
    setForm((p) => ({ ...p, employee_id: id, employee_name: emp?.name || "" }));
  }

  async function save() {
    if (!form.employee_id || !form.date) { toast.error("الموظف والتاريخ مطلوبان"); return; }
    if (editing) {
      await base44.entities.Attendance.update(editing, form);
      setRecords((prev) => prev.map((r) => r.id === editing ? { ...r, ...form } : r));
    } else {
      const created = await base44.entities.Attendance.create(form);
      setRecords((prev) => [created, ...prev]);
    }
    toast.success("تم الحفظ");
    setOpen(false);
  }

  async function del(id) {
    if (!confirm("حذف هذا السجل؟")) return;
    await base44.entities.Attendance.delete(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    toast.success("تم الحذف");
  }

  const filtered = records.filter((r) => !filterDate || r.date === filterDate);
  const present = filtered.filter((r) => r.type === "حضور").length;
  const absent = filtered.filter((r) => r.type === "غياب").length;
  const leaves = filtered.filter((r) => r.type === "إجازة" || r.type === "إجازة مرضية").length;

  function reloadRecords() {
    base44.entities.Attendance.list("-date").then(setRecords);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            الحضور والغياب
            <Badge variant="outline" className="text-[10px] gap-1 border-green-300 text-green-700 bg-green-50">
              <Fingerprint className="h-3 w-3" /> متصل بالبصمة
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع حضور الموظفين — تزامن تلقائي مع ZKTeco</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-9 w-40" />
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />تسجيل يدوي</Button>
        </div>
      </div>

      <Tabs defaultValue="records" dir="rtl">
        <TabsList className="h-9">
          <TabsTrigger value="records" className="gap-1.5 text-xs"><ClipboardList className="h-3.5 w-3.5" />سجلات الحضور</TabsTrigger>
          <TabsTrigger value="sync" className="gap-1.5 text-xs"><RefreshCw className="h-3.5 w-3.5" />مزامنة البصمة</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" />إعدادات الجهاز</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            {[["حضور", present, "bg-green-600"], ["غياب", absent, "bg-red-500"], ["إجازات", leaves, "bg-blue-500"]].map(([lbl, val, bg]) => (
              <Card key={lbl}><CardContent className="p-4 text-center">
                <div className={`h-10 w-10 ${bg} rounded-xl flex items-center justify-center mx-auto mb-1`}><ClipboardList className="h-5 w-5 text-white" /></div>
                <p className="text-xl font-bold">{val}</p>
                <p className="text-xs text-muted-foreground">{lbl}</p>
              </CardContent></Card>
            ))}
          </div>

          {loading ? <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{["الموظف","التاريخ","النوع","دخول","خروج","ساعات","المصدر","إجراءات"].map((h) => <th key={h} className="p-3 text-right font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8} className="text-center text-muted-foreground py-10">لا توجد سجلات</td></tr> :
                    filtered.map((r) => (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                        <td className="p-3 font-medium">{r.employee_name}</td>
                        <td className="p-3 text-muted-foreground">{r.date}</td>
                        <td className="p-3"><Badge variant={TYPE_COLORS[r.type] || "default"} className="text-xs">{r.type}</Badge></td>
                        <td className="p-3 text-muted-foreground">{r.check_in || "—"}</td>
                        <td className="p-3 text-muted-foreground">{r.check_out || "—"}</td>
                        <td className="p-3">{r.hours || "—"}</td>
                        <td className="p-3">
                          {r.source === "zkteco"
                            ? <Badge className="text-[10px] bg-blue-100 text-blue-700 gap-1"><Fingerprint className="h-2.5 w-2.5" />بصمة</Badge>
                            : <Badge variant="outline" className="text-[10px]">يدوي</Badge>}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(r)} className="text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => del(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sync" className="mt-4 max-w-lg">
          <ZKTecoLogsPanel onSynced={reloadRecords} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 max-w-lg">
          <ZKTecoSettings onSyncComplete={reloadRecords} />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل سجل" : "تسجيل حضور"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="col-span-2">
              <Label className="text-xs">الموظف</Label>
              <Select value={form.employee_id} onValueChange={selectEmployee}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">التاريخ</Label><Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">النوع</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["حضور","غياب","إجازة","إجازة مرضية","تأخير"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">وقت الدخول</Label><Input type="time" value={form.check_in || ""} onChange={(e) => setForm((p) => ({ ...p, check_in: e.target.value }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">وقت الخروج</Label><Input type="time" value={form.check_out || ""} onChange={(e) => setForm((p) => ({ ...p, check_out: e.target.value }))} className="mt-1 h-8" /></div>
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