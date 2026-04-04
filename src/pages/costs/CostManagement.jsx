import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, ArrowLeft, Layers, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const COST_TYPES = ["مواد مباشرة", "عمالة مباشرة", "تكاليف صناعية غير مباشرة", "تكاليف محولة من مرحلة سابقة"];

const emptyEntry = {
  date: "", period: "", stage_id: "", stage_name: "", cost_type: "", account_id: "", account_name: "",
  description: "", quantity: 1, unit: "", unit_cost: 0, total_cost: 0,
  completed_units: 0, wip_units: 0, wip_completion_pct: 100, equivalent_units: 0,
  cost_per_equiv_unit: 0, from_stage_id: "", from_stage_name: "", branch_id: "", branch_name: "",
  notes: "", status: "مسودة"
};

const emptyStage = { name: "", code: "", order: 1, description: "", account_id: "", account_name: "", is_active: true };

export default function CostManagement() {
  const [entries, setEntries] = useState([]);
  const [stages, setStages] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [entryOpen, setEntryOpen] = useState(false);
  const [entryForm, setEntryForm] = useState(emptyEntry);
  const [editEntryId, setEditEntryId] = useState(null);

  const [stageOpen, setStageOpen] = useState(false);
  const [stageForm, setStageForm] = useState(emptyStage);
  const [editStageId, setEditStageId] = useState(null);

  const [filterStage, setFilterStage] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.CostEntry.list("-date"),
      base44.entities.ProductionStage.list("order"),
      base44.entities.Account.list(),
      base44.entities.Branch.list(),
    ]).then(([e, s, a, b]) => {
      setEntries(e); setStages(s); setAccounts(a); setBranches(b);
      setLoading(false);
    });
  }, []);

  function reloadEntries() { base44.entities.CostEntry.list("-date").then(setEntries); }
  function reloadStages() { base44.entities.ProductionStage.list("order").then(setStages); }

  // ---- Entries ----
  function openNewEntry() {
    setEntryForm({ ...emptyEntry, date: new Date().toISOString().split("T")[0] });
    setEditEntryId(null); setEntryOpen(true);
  }
  function openEditEntry(e) { setEntryForm({ ...e }); setEditEntryId(e.id); setEntryOpen(true); }

  function calcEquivUnits(completed, wip, pct) {
    return (parseFloat(completed) || 0) + (parseFloat(wip) || 0) * ((parseFloat(pct) || 0) / 100);
  }

  function updateEntryField(key, value) {
    setEntryForm(f => {
      const updated = { ...f, [key]: value };
      const equiv = calcEquivUnits(
        key === "completed_units" ? value : f.completed_units,
        key === "wip_units" ? value : f.wip_units,
        key === "wip_completion_pct" ? value : f.wip_completion_pct
      );
      const totalCost = key === "total_cost" ? parseFloat(value) || 0 :
        key === "quantity" || key === "unit_cost"
          ? (parseFloat(key === "quantity" ? value : f.quantity) || 0) * (parseFloat(key === "unit_cost" ? value : f.unit_cost) || 0)
          : f.total_cost;
      const costPerEquiv = equiv > 0 ? totalCost / equiv : 0;
      return { ...updated, equivalent_units: equiv, total_cost: totalCost, cost_per_equiv_unit: costPerEquiv };
    });
  }

  async function saveEntry() {
    if (!entryForm.date || !entryForm.stage_id || !entryForm.cost_type) return toast.error("يرجى تعبئة الحقول المطلوبة");
    if (!entryForm.total_cost) return toast.error("إجمالي التكلفة يجب أن يكون أكبر من صفر");
    if (editEntryId) {
      await base44.entities.CostEntry.update(editEntryId, entryForm);
      toast.success("تم تحديث القيد");
    } else {
      await base44.entities.CostEntry.create(entryForm);
      toast.success("تم إضافة قيد التكلفة");
    }
    setEntryOpen(false); reloadEntries();
  }

  async function removeEntry(id) {
    if (!confirm("حذف هذا القيد؟")) return;
    await base44.entities.CostEntry.delete(id);
    toast.success("تم الحذف"); reloadEntries();
  }

  // ---- Stages ----
  function openNewStage() { setStageForm({ ...emptyStage, order: stages.length + 1 }); setEditStageId(null); setStageOpen(true); }
  function openEditStage(s) { setStageForm({ ...s }); setEditStageId(s.id); setStageOpen(true); }

  async function saveStage() {
    if (!stageForm.name) return toast.error("اسم المرحلة مطلوب");
    if (editStageId) {
      await base44.entities.ProductionStage.update(editStageId, stageForm);
      toast.success("تم تحديث المرحلة");
    } else {
      await base44.entities.ProductionStage.create(stageForm);
      toast.success("تمت إضافة المرحلة");
    }
    setStageOpen(false); reloadStages();
  }

  async function removeStage(id) {
    if (!confirm("حذف هذه المرحلة؟")) return;
    await base44.entities.ProductionStage.delete(id);
    toast.success("تم الحذف"); reloadStages();
  }

  // ---- Filters & Calculations ----
  const filtered = entries.filter(e =>
    (filterStage === "all" || e.stage_id === filterStage) &&
    (!filterPeriod || e.period === filterPeriod)
  );

  // Stage summary cards
  const stageSummaries = stages.map(s => {
    const stageEntries = entries.filter(e => e.stage_id === s.id);
    const totalCost = stageEntries.reduce((sum, e) => sum + (e.total_cost || 0), 0);
    const completedUnits = stageEntries[0]?.completed_units || 0;
    const equivUnits = stageEntries.reduce((sum, e) => sum + (e.equivalent_units || 0), 0) / Math.max(stageEntries.length, 1);
    const costPerUnit = equivUnits > 0 ? totalCost / equivUnits : 0;
    return { ...s, totalCost, completedUnits, equivUnits, costPerUnit, entryCount: stageEntries.length };
  });

  const fmt = v => (v || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 });

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"/></div>;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">نظام تكاليف المراحل</h1>
        <p className="text-muted-foreground text-sm mt-1">تتبع التكاليف عبر المراحل الإنتاجية وحساب تكلفة الوحدة المعادلة</p>
      </div>

      <Tabs defaultValue="stages">
        <TabsList className="mb-4">
          <TabsTrigger value="stages">مراحل الإنتاج</TabsTrigger>
          <TabsTrigger value="entries">قيود التكاليف</TabsTrigger>
        </TabsList>

        {/* ===== STAGES TAB ===== */}
        <TabsContent value="stages" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewStage} className="gap-2"><Plus className="h-4 w-4"/>مرحلة جديدة</Button>
          </div>

          {/* Pipeline view */}
          {stages.length > 0 && (
            <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
              {stageSummaries.sort((a, b) => a.order - b.order).map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <Card className="min-w-[200px] flex-shrink-0 border-2 border-primary/20">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{s.order}</div>
                          <CardTitle className="text-sm">{s.name}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditStage(s)}><Pencil className="h-3 w-3"/></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeStage(s.id)}><Trash2 className="h-3 w-3"/></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">إجمالي التكاليف</span>
                        <span className="font-bold text-primary">{fmt(s.totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">وحدات معادلة</span>
                        <span className="font-semibold">{s.equivUnits.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">تكلفة/وحدة معادلة</span>
                        <span className="font-semibold text-amber-600">{fmt(s.costPerUnit)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">عدد القيود</span>
                        <Badge variant="outline" className="text-xs h-5">{s.entryCount}</Badge>
                      </div>
                      {s.code && <p className="text-xs text-muted-foreground">الرمز: {s.code}</p>}
                    </CardContent>
                  </Card>
                  {i < stageSummaries.length - 1 && (
                    <ChevronRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}

          {stages.length === 0 && (
            <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-30"/>
              <p>لم تُضَف مراحل إنتاجية بعد</p>
              <p className="text-xs mt-1">أضف مراحل الإنتاج لتتبع تكاليف كل مرحلة</p>
            </div>
          )}
        </TabsContent>

        {/* ===== ENTRIES TAB ===== */}
        <TabsContent value="entries" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-3 flex-1">
              <div className="w-48">
                <Select value={filterStage} onValueChange={setFilterStage}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="كل المراحل"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المراحل</SelectItem>
                    {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input
                className="h-8 text-xs w-36"
                placeholder="الفترة (مثال: 2026-03)"
                value={filterPeriod}
                onChange={e => setFilterPeriod(e.target.value)}
              />
            </div>
            <Button onClick={openNewEntry} className="gap-2"><Plus className="h-4 w-4"/>قيد تكلفة</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-right px-4 py-3 text-xs font-semibold">التاريخ</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">المرحلة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">نوع التكلفة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">البيان</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">وحدات مكتملة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">وحدات معادلة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">إجمالي التكلفة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">ت/وحدة معادلة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الحالة</th>
                      <th className="px-4 py-3"/>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">لا توجد قيود تكاليف</td></tr>
                    ) : filtered.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        <td className="px-4 py-2.5">{e.date}</td>
                        <td className="px-4 py-2.5 font-medium">{e.stage_name}</td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{e.cost_type}</Badge></td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.description}</td>
                        <td className="px-4 py-2.5 text-center">{e.completed_units || 0}</td>
                        <td className="px-4 py-2.5 text-center font-medium">{(e.equivalent_units || 0).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-semibold text-primary">{fmt(e.total_cost)}</td>
                        <td className="px-4 py-2.5 text-amber-600">{fmt(e.cost_per_equiv_unit)}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={e.status === "مرحّل" ? "default" : "secondary"} className="text-xs">{e.status}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditEntry(e)}><Pencil className="h-3 w-3"/></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeEntry(e.id)}><Trash2 className="h-3 w-3"/></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stage Dialog */}
      <Dialog open={stageOpen} onOpenChange={setStageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editStageId ? "تعديل المرحلة" : "مرحلة إنتاجية جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">اسم المرحلة *</Label>
              <Input value={stageForm.name} onChange={e => setStageForm(f => ({...f, name: e.target.value}))} placeholder="مثال: مرحلة التشكيل"/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الرمز</Label>
              <Input value={stageForm.code} onChange={e => setStageForm(f => ({...f, code: e.target.value}))} placeholder="P1"/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الترتيب</Label>
              <Input type="number" value={stageForm.order} onChange={e => setStageForm(f => ({...f, order: parseInt(e.target.value)}))}/>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">حساب إنتاج تحت التشغيل</Label>
              <Select value={stageForm.account_id} onValueChange={v => {
                const ac = accounts.find(a => a.id === v);
                setStageForm(f => ({...f, account_id: v, account_name: ac?.name || ""}));
              }}>
                <SelectTrigger><SelectValue placeholder="اختر الحساب"/></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_number} - {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">الوصف</Label>
              <Input value={stageForm.description} onChange={e => setStageForm(f => ({...f, description: e.target.value}))} placeholder="وصف المرحلة"/>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setStageOpen(false)}>إلغاء</Button>
            <Button onClick={saveStage}>{editStageId ? "تحديث" : "حفظ"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Entry Dialog */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEntryId ? "تعديل قيد التكلفة" : "قيد تكلفة مرحلة جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">التاريخ *</Label>
              <Input type="date" value={entryForm.date} onChange={e => updateEntryField("date", e.target.value)}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الفترة (YYYY-MM)</Label>
              <Input placeholder="2026-04" value={entryForm.period} onChange={e => updateEntryField("period", e.target.value)}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">المرحلة الإنتاجية *</Label>
              <Select value={entryForm.stage_id} onValueChange={v => {
                const s = stages.find(x => x.id === v);
                setEntryForm(f => ({...f, stage_id: v, stage_name: s?.name || ""}));
              }}>
                <SelectTrigger><SelectValue placeholder="اختر المرحلة"/></SelectTrigger>
                <SelectContent>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.order}. {s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع التكلفة *</Label>
              <Select value={entryForm.cost_type} onValueChange={v => updateEntryField("cost_type", v)}>
                <SelectTrigger><SelectValue placeholder="اختر النوع"/></SelectTrigger>
                <SelectContent>{COST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {entryForm.cost_type === "تكاليف محولة من مرحلة سابقة" && (
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">محولة من مرحلة</Label>
                <Select value={entryForm.from_stage_id} onValueChange={v => {
                  const s = stages.find(x => x.id === v);
                  setEntryForm(f => ({...f, from_stage_id: v, from_stage_name: s?.name || ""}));
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر المرحلة السابقة"/></SelectTrigger>
                  <SelectContent>{stages.filter(s => s.id !== entryForm.stage_id).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">الحساب</Label>
              <Select value={entryForm.account_id} onValueChange={v => {
                const ac = accounts.find(a => a.id === v);
                setEntryForm(f => ({...f, account_id: v, account_name: ac?.name || ""}));
              }}>
                <SelectTrigger><SelectValue placeholder="اختر الحساب"/></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_number} - {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الفرع</Label>
              <Select value={entryForm.branch_id} onValueChange={v => {
                const b = branches.find(x => x.id === v);
                setEntryForm(f => ({...f, branch_id: v, branch_name: b?.name || ""}));
              }}>
                <SelectTrigger><SelectValue placeholder="اختر الفرع"/></SelectTrigger>
                <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">البيان</Label>
              <Input value={entryForm.description} onChange={e => updateEntryField("description", e.target.value)} placeholder="وصف قيد التكلفة"/>
            </div>

            {/* Cost inputs */}
            <div className="space-y-1.5">
              <Label className="text-xs">الكمية</Label>
              <Input type="number" value={entryForm.quantity} onChange={e => updateEntryField("quantity", e.target.value)}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الوحدة</Label>
              <Input value={entryForm.unit} onChange={e => updateEntryField("unit", e.target.value)} placeholder="وحدة قياس"/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تكلفة الوحدة</Label>
              <Input type="number" value={entryForm.unit_cost} onChange={e => updateEntryField("unit_cost", e.target.value)}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">إجمالي التكلفة</Label>
              <Input type="number" value={entryForm.total_cost} onChange={e => updateEntryField("total_cost", e.target.value)} className="bg-primary/5 font-bold"/>
            </div>

            {/* Equivalent units */}
            <div className="col-span-2 bg-muted/30 rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">حساب الوحدات المعادلة</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">وحدات مكتملة</Label>
                  <Input type="number" value={entryForm.completed_units} onChange={e => updateEntryField("completed_units", e.target.value)}/>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">وحدات تحت التشغيل</Label>
                  <Input type="number" value={entryForm.wip_units} onChange={e => updateEntryField("wip_units", e.target.value)}/>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">نسبة اكتمال ت.ت %</Label>
                  <Input type="number" min={0} max={100} value={entryForm.wip_completion_pct} onChange={e => updateEntryField("wip_completion_pct", e.target.value)}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded p-2 text-center border">
                  <p className="text-xs text-muted-foreground">وحدات معادلة</p>
                  <p className="font-bold text-lg text-primary">{(entryForm.equivalent_units || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white rounded p-2 text-center border">
                  <p className="text-xs text-muted-foreground">تكلفة الوحدة المعادلة</p>
                  <p className="font-bold text-lg text-amber-600">{(entryForm.cost_per_equiv_unit || 0).toFixed(4)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">الحالة</Label>
              <Select value={entryForm.status} onValueChange={v => updateEntryField("status", v)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="مسودة">مسودة</SelectItem>
                  <SelectItem value="مرحّل">مرحّل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ملاحظات</Label>
              <Input value={entryForm.notes} onChange={e => updateEntryField("notes", e.target.value)} placeholder="ملاحظات"/>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setEntryOpen(false)}>إلغاء</Button>
            <Button onClick={saveEntry}>{editEntryId ? "تحديث" : "حفظ"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}