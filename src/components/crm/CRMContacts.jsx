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
import { Plus, Phone, Mail, Building2, Search, MapPin, Calendar, Flame, Snowflake, Edit2, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const TYPE_COLORS = { "عميل محتمل": "outline", "عميل": "default", "مورد": "secondary", "شريك": "secondary" };
const STATUS_COLORS = { "نشط": "bg-green-100 text-green-700", "غير نشط": "bg-gray-100 text-gray-600", "محتمل": "bg-yellow-100 text-yellow-700" };
const RATING_ICONS = { "ساخن 🔥": "🔥", "دافئ": "🌤️", "بارد ❄️": "❄️" };

const emptyForm = () => ({
  name: "", type: "عميل محتمل", company: "", position: "", phone: "", mobile: "",
  email: "", address: "", city: "", country: "", source: "", assigned_to: "",
  status: "نشط", rating: "دافئ", notes: "", next_followup_date: ""
});

export default function CRMContacts({ contacts, opportunities, activities, reload }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const filtered = contacts.filter(c => {
    const matchSearch = !search || c.name?.includes(search) || c.company?.includes(search) || c.phone?.includes(search);
    const matchType = typeFilter === "الكل" || c.type === typeFilter;
    const matchStatus = statusFilter === "الكل" || c.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  async function save() {
    if (!form.name) return toast.error("ادخل الاسم");
    if (editing) await base44.entities.CRMContact.update(editing.id, form);
    else await base44.entities.CRMContact.create(form);
    toast.success("تم الحفظ"); setDialogOpen(false); reload();
  }

  function openNew() { setEditing(null); setForm(emptyForm()); setDialogOpen(true); }
  function openEdit(c) { setEditing(c); setForm({ ...c }); setDialogOpen(true); }

  function openDetail(c) {
    setSelected(c);
    setDetailOpen(true);
  }

  const contactOpps = selected ? opportunities.filter(o => o.contact_id === selected.id || o.contact_name === selected.name) : [];
  const contactActivities = selected ? activities.filter(a => a.contact_id === selected.id || a.contact_name === selected.name) : [];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pr-8" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["الكل","عميل محتمل","عميل","مورد","شريك"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["الكل","نشط","غير نشط","محتمل"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openNew}><Plus className="h-4 w-4 ml-1" />جهة اتصال جديدة</Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} جهة اتصال</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(c)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold truncate">{c.name}</p>
                    {c.rating && <span className="text-sm">{RATING_ICONS[c.rating]}</span>}
                  </div>
                  {c.company && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />{c.company}
                      {c.position && ` · ${c.position}`}
                    </p>
                  )}
                </div>
                <Badge variant={TYPE_COLORS[c.type] || "outline"} className="text-xs shrink-0">{c.type}</Badge>
              </div>

              <div className="space-y-1 mb-3">
                {c.phone && (
                  <p className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" />{c.phone}
                  </p>
                )}
                {c.email && (
                  <p className="text-xs flex items-center gap-1 text-muted-foreground truncate">
                    <Mail className="h-3 w-3" />{c.email}
                  </p>
                )}
                {(c.city || c.country) && (
                  <p className="text-xs flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />{[c.city, c.country].filter(Boolean).join("، ")}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || ""}`}>{c.status}</span>
                  {c.next_followup_date && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-0.5 ${c.next_followup_date < new Date().toISOString().split("T")[0] ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                      <Calendar className="h-2.5 w-2.5" />{c.next_followup_date}
                    </span>
                  )}
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  {c.phone && (
                    <a href={`https://wa.me/${c.phone?.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"><MessageCircle className="h-3.5 w-3.5" /></Button>
                    </a>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => { await base44.entities.CRMContact.delete(c.id); reload(); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="col-span-3 text-center py-12 text-muted-foreground">لا توجد جهات اتصال</p>}
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل جهة الاتصال" : "جهة اتصال جديدة"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الاسم *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["عميل محتمل","عميل","مورد","شريك"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الشركة</Label><Input value={form.company || ""} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div><Label>المنصب الوظيفي</Label><Input value={form.position || ""} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} /></div>
            <div><Label>الهاتف</Label><Input value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>الجوال</Label><Input value={form.mobile || ""} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} /></div>
            <div className="col-span-2"><Label>البريد الإلكتروني</Label><Input value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>المدينة</Label><Input value={form.city || ""} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><Label>الدولة</Label><Input value={form.country || ""} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            <div>
              <Label>مصدر العميل</Label>
              <Select value={form.source || "__none"} onValueChange={v => setForm(f => ({ ...f, source: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {["موقع إلكتروني","إحالة","معرض","إعلان","مكالمة باردة","وسائل التواصل","أخرى"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تصنيف العميل</Label>
              <Select value={form.rating || "دافئ"} onValueChange={v => setForm(f => ({ ...f, rating: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["ساخن 🔥","دافئ","بارد ❄️"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["نشط","غير نشط","محتمل"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>موعد المتابعة القادمة</Label>
              <Input type="date" value={form.next_followup_date || ""} onChange={e => setForm(f => ({ ...f, next_followup_date: e.target.value }))} />
            </div>
            <div><Label>المسؤول</Label><Input value={form.assigned_to || ""} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} /></div>
            <div className="col-span-2"><Label>ملاحظات</Label><Textarea rows={2} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selected.name}
                {selected.rating && <span>{RATING_ICONS[selected.rating]}</span>}
                <Badge variant={TYPE_COLORS[selected.type] || "outline"} className="text-xs">{selected.type}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {selected.company && <div><p className="text-xs text-muted-foreground">الشركة</p><p className="font-medium">{selected.company}</p></div>}
              {selected.position && <div><p className="text-xs text-muted-foreground">المنصب</p><p className="font-medium">{selected.position}</p></div>}
              {selected.phone && <div><p className="text-xs text-muted-foreground">الهاتف</p><p className="font-medium">{selected.phone}</p></div>}
              {selected.email && <div><p className="text-xs text-muted-foreground">البريد</p><p className="font-medium">{selected.email}</p></div>}
              {(selected.city || selected.country) && <div><p className="text-xs text-muted-foreground">الموقع</p><p className="font-medium">{[selected.city, selected.country].filter(Boolean).join("، ")}</p></div>}
              {selected.source && <div><p className="text-xs text-muted-foreground">المصدر</p><p className="font-medium">{selected.source}</p></div>}
              {selected.next_followup_date && <div><p className="text-xs text-muted-foreground">المتابعة القادمة</p><p className="font-medium">{selected.next_followup_date}</p></div>}
              {selected.assigned_to && <div><p className="text-xs text-muted-foreground">المسؤول</p><p className="font-medium">{selected.assigned_to}</p></div>}
            </div>
            {selected.notes && <div className="mt-2 p-3 rounded bg-muted/30 text-sm">{selected.notes}</div>}

            {contactOpps.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold mb-2">الفرص البيعية ({contactOpps.length})</p>
                <div className="space-y-1.5">
                  {contactOpps.map(o => (
                    <div key={o.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                      <p>{o.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-primary font-medium">{(o.expected_value || 0).toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs">{o.stage}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contactActivities.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold mb-2">الأنشطة الأخيرة ({contactActivities.length})</p>
                <div className="space-y-1.5">
                  {contactActivities.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-start gap-2 p-2 rounded bg-muted/30 text-sm">
                      <span>{a.type === "مكالمة" ? "📞" : a.type === "اجتماع" ? "🤝" : "📝"}</span>
                      <div>
                        <p className="font-medium">{a.subject}</p>
                        <p className="text-xs text-muted-foreground">{a.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>إغلاق</Button>
              <Button onClick={() => { setDetailOpen(false); openEdit(selected); }}>تعديل</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}