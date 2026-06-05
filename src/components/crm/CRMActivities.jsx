import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter, Trash2, Edit2, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

const ACTIVITY_ICONS = {
  "مكالمة": "📞", "اجتماع": "🤝", "بريد إلكتروني": "✉️",
  "رسالة واتساب": "💬", "زيارة": "🚗", "مهمة": "✅", "ملاحظة": "📝"
};

const OUTCOME_COLORS = {
  "ناجح": "bg-green-100 text-green-700",
  "يحتاج متابعة": "bg-yellow-100 text-yellow-700",
  "لا يوجد رد": "bg-gray-100 text-gray-600",
  "مرفوض": "bg-red-100 text-red-700"
};

const STATUS_COLORS = {
  "مكتمل": "bg-green-100 text-green-700",
  "قيد التنفيذ": "bg-blue-100 text-blue-700",
  "مجدول": "bg-purple-100 text-purple-700",
  "ملغي": "bg-gray-100 text-gray-500"
};

const emptyForm = () => ({
  type: "مكالمة", contact_id: "", contact_name: "",
  opportunity_id: "", opportunity_title: "",
  date: new Date().toISOString().split("T")[0], time: "", duration_minutes: "",
  subject: "", description: "", outcome: "ناجح",
  next_action: "", next_action_date: "", assigned_to: "", status: "مكتمل"
});

export default function CRMActivities({ contacts, opportunities, activities, reload }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const filtered = activities.filter(a => {
    const matchSearch = !search || a.subject?.includes(search) || a.contact_name?.includes(search);
    const matchType = typeFilter === "الكل" || a.type === typeFilter;
    return matchSearch && matchType;
  });

  async function save() {
    if (!form.subject) return toast.error("ادخل موضوع النشاط");
    if (!form.date) return toast.error("ادخل التاريخ");
    if (editing) await base44.entities.CRMActivity.update(editing.id, form);
    else await base44.entities.CRMActivity.create(form);
    toast.success("تم الحفظ"); setDialogOpen(false); reload();
  }

  function openNew() { setEditing(null); setForm(emptyForm()); setDialogOpen(true); }
  function openEdit(a) { setEditing(a); setForm({ ...a }); setDialogOpen(true); }

  const today = new Date().toISOString().split("T")[0];
  const todayCount = activities.filter(a => a.date === today).length;
  const pendingCount = activities.filter(a => a.status === "مجدول" && a.date >= today).length;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap flex-1">
          <div className="relative min-w-[200px]">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pr-8" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="الكل">كل الأنواع</SelectItem>
              {Object.keys(ACTIVITY_ICONS).map(t => <SelectItem key={t} value={t}>{ACTIVITY_ICONS[t]} {t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 ml-1" />نشاط جديد</Button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap text-sm">
        <span className="px-3 py-1.5 rounded-full bg-muted">{activities.length} نشاط</span>
        <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700">{todayCount} اليوم</span>
        <span className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700">{pendingCount} مجدول</span>
      </div>

      <div className="space-y-2">
        {filtered.map(a => (
          <Card key={a.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl mt-0.5 shrink-0">{ACTIVITY_ICONS[a.type] || "📝"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{a.subject}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {a.contact_name && <p className="text-xs text-muted-foreground">👤 {a.contact_name}</p>}
                        {a.opportunity_title && <p className="text-xs text-muted-foreground">🎯 {a.opportunity_title}</p>}
                        <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />{a.date}
                          {a.time && <span className="mr-1 flex items-center gap-0.5"><Clock className="h-3 w-3" />{a.time}</span>}
                          {a.duration_minutes && <span> · {a.duration_minutes} د</span>}
                        </p>
                      </div>
                      {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{a.description}</p>}
                      {a.next_action && (
                        <p className="text-xs text-blue-600 mt-1">→ {a.next_action} {a.next_action_date && `(${a.next_action_date})`}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {a.outcome && <span className={`text-xs px-2 py-0.5 rounded-full ${OUTCOME_COLORS[a.outcome] || ""}`}>{a.outcome}</span>}
                      {a.status && <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] || ""}`}>{a.status}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => { await base44.entities.CRMActivity.delete(a.id); reload(); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">لا توجد أنشطة مسجلة</p>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل النشاط" : "تسجيل نشاط جديد"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>نوع النشاط</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ACTIVITY_ICONS).map(([t, icon]) => <SelectItem key={t} value={t}>{icon} {t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["مكتمل","قيد التنفيذ","مجدول","ملغي"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>الموضوع *</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
            <div>
              <Label>جهة الاتصال</Label>
              <Select value={form.contact_id || "__none"} onValueChange={v => {
                const c = contacts.find(x => x.id === v);
                setForm(f => ({ ...f, contact_id: v === "__none" ? "" : v, contact_name: c ? c.name : "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الفرصة المرتبطة</Label>
              <Select value={form.opportunity_id || "__none"} onValueChange={v => {
                const o = opportunities.find(x => x.id === v);
                setForm(f => ({ ...f, opportunity_id: v === "__none" ? "" : v, opportunity_title: o ? o.title : "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {opportunities.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>التاريخ *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>الوقت</Label><Input type="time" value={form.time || ""} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
            <div><Label>المدة (دقائق)</Label><Input type="number" value={form.duration_minutes || ""} onChange={e => setForm(f => ({ ...f, duration_minutes: +e.target.value }))} /></div>
            <div>
              <Label>النتيجة</Label>
              <Select value={form.outcome || "ناجح"} onValueChange={v => setForm(f => ({ ...f, outcome: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["ناجح","يحتاج متابعة","لا يوجد رد","مرفوض"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>المسؤول</Label><Input value={form.assigned_to || ""} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} /></div>
            <div className="col-span-2"><Label>التفاصيل</Label><Textarea rows={2} value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>الإجراء التالي</Label><Input value={form.next_action || ""} onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))} /></div>
            <div><Label>تاريخ الإجراء التالي</Label><Input type="date" value={form.next_action_date || ""} onChange={e => setForm(f => ({ ...f, next_action_date: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            {editing && <Button variant="destructive" onClick={async () => { await base44.entities.CRMActivity.delete(editing.id); setDialogOpen(false); reload(); }}>حذف</Button>}
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}