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
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const STAGES = ["تواصل أولي", "تأهيل", "عرض سعر", "تفاوض", "مكسوبة", "خسارة"];

const STAGE_STYLES = {
  "تواصل أولي": "border-t-slate-400 bg-slate-50 dark:bg-slate-900/20",
  "تأهيل":      "border-t-blue-400 bg-blue-50 dark:bg-blue-900/20",
  "عرض سعر":   "border-t-amber-400 bg-amber-50 dark:bg-amber-900/20",
  "تفاوض":      "border-t-purple-400 bg-purple-50 dark:bg-purple-900/20",
  "مكسوبة":     "border-t-green-500 bg-green-50 dark:bg-green-900/20",
  "خسارة":      "border-t-red-400 bg-red-50 dark:bg-red-900/20",
};

const PRIORITY_COLORS = { "منخفضة": "bg-gray-100 text-gray-600", "متوسطة": "bg-blue-100 text-blue-700", "عالية": "bg-orange-100 text-orange-700", "عاجلة": "bg-red-100 text-red-700" };

const emptyForm = () => ({
  title: "", contact_id: "", contact_name: "", company: "",
  expected_value: 0, probability: 50, stage: "تواصل أولي",
  priority: "متوسطة", expected_close_date: "", assigned_to: "",
  source: "", products: "", notes: ""
});

export default function CRMPipeline({ contacts, opportunities, reload }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  async function save() {
    if (!form.title) return toast.error("ادخل عنوان الفرصة");
    const weighted = ((form.expected_value || 0) * (form.probability || 0) / 100);
    const data = { ...form, weighted_value: weighted };
    if (editing) await base44.entities.CRMOpportunity.update(editing.id, data);
    else await base44.entities.CRMOpportunity.create(data);
    toast.success("تم الحفظ"); setDialogOpen(false); reload();
  }

  async function moveStage(opp, direction) {
    const idx = STAGES.indexOf(opp.stage);
    const newStage = STAGES[idx + direction];
    if (!newStage) return;
    await base44.entities.CRMOpportunity.update(opp.id, { stage: newStage });
    reload();
  }

  function openEdit(o) { setEditing(o); setForm({ ...o }); setDialogOpen(true); }
  function openNew() { setEditing(null); setForm(emptyForm()); setDialogOpen(true); }

  const stageStats = (stage) => {
    const opps = opportunities.filter(o => o.stage === stage);
    const total = opps.reduce((s, o) => s + (o.expected_value || 0), 0);
    return { count: opps.length, total };
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {opportunities.filter(o => o.stage !== "مكسوبة" && o.stage !== "خسارة").length} فرصة نشطة ·
          قيمة الخط: {opportunities.filter(o => o.stage !== "مكسوبة" && o.stage !== "خسارة").reduce((s, o) => s + (o.expected_value || 0), 0).toLocaleString("ar-EG")}
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 ml-1" />فرصة جديدة</Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
        {STAGES.map(stage => {
          const stageOpps = opportunities.filter(o => o.stage === stage);
          const stats = stageStats(stage);
          return (
            <div key={stage} className={`rounded-xl border-t-4 border border-border p-2 min-h-[300px] ${STAGE_STYLES[stage]}`}>
              <div className="mb-3 text-center">
                <p className="text-xs font-semibold">{stage}</p>
                <p className="text-xs text-muted-foreground">{stats.count} · {stats.total.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="space-y-2">
                {stageOpps.map(o => (
                  <Card key={o.id} className="cursor-pointer hover:shadow-md transition-shadow bg-background/80" onClick={() => openEdit(o)}>
                    <CardContent className="p-2.5">
                      <p className="text-xs font-semibold leading-tight mb-1">{o.title}</p>
                      {o.contact_name && <p className="text-[10px] text-muted-foreground">{o.contact_name}</p>}
                      {o.company && <p className="text-[10px] text-muted-foreground">{o.company}</p>}
                      <p className="text-xs font-medium text-primary mt-1">{(o.expected_value || 0).toLocaleString("ar-EG")}</p>
                      {/* probability bar */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${o.probability || 0}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{o.probability}%</span>
                      </div>
                      {o.priority && (
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 ${PRIORITY_COLORS[o.priority] || ""}`}>{o.priority}</span>
                      )}
                      {o.expected_close_date && (
                        <p className="text-[10px] text-muted-foreground mt-1">📅 {o.expected_close_date}</p>
                      )}
                      {/* Move buttons */}
                      <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                        {STAGES.indexOf(o.stage) > 0 && (
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveStage(o, -1)}>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        )}
                        {STAGES.indexOf(o.stage) < STAGES.length - 1 && (
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveStage(o, 1)}>
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل الفرصة" : "فرصة بيعية جديدة"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>عنوان الفرصة *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div>
              <Label>جهة الاتصال</Label>
              <Select value={form.contact_id || "__none"} onValueChange={v => {
                const c = contacts.find(x => x.id === v);
                setForm(f => ({ ...f, contact_id: v === "__none" ? "" : v, contact_name: c ? c.name : "", company: c?.company || f.company }));
              }}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>الشركة</Label><Input value={form.company || ""} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div><Label>القيمة المتوقعة</Label><Input type="number" value={form.expected_value} onChange={e => setForm(f => ({ ...f, expected_value: +e.target.value }))} /></div>
            <div><Label>الاحتمال %</Label><Input type="number" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: +e.target.value }))} /></div>
            <div>
              <Label>المرحلة</Label>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>الأولوية</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["منخفضة","متوسطة","عالية","عاجلة"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>تاريخ الإغلاق المتوقع</Label><Input type="date" value={form.expected_close_date || ""} onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))} /></div>
            <div><Label>المسؤول</Label><Input value={form.assigned_to || ""} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} /></div>
            <div><Label>المنتجات / الخدمات</Label><Input value={form.products || ""} onChange={e => setForm(f => ({ ...f, products: e.target.value }))} /></div>
            <div>
              <Label>المصدر</Label>
              <Select value={form.source || "__none"} onValueChange={v => setForm(f => ({ ...f, source: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {["موقع إلكتروني","إحالة","معرض","إعلان","مكالمة باردة","وسائل التواصل","أخرى"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.stage === "خسارة" && (
              <div className="col-span-2"><Label>سبب الخسارة</Label><Input value={form.lost_reason || ""} onChange={e => setForm(f => ({ ...f, lost_reason: e.target.value }))} /></div>
            )}
            <div className="col-span-2"><Label>ملاحظات</Label><Textarea rows={2} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            {editing && (
              <Button variant="destructive" onClick={async () => { await base44.entities.CRMOpportunity.delete(editing.id); setDialogOpen(false); reload(); }}>حذف</Button>
            )}
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}