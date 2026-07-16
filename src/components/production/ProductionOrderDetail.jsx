import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Plus, Pencil, Trash2, PlayCircle, CheckCircle2, Layers, DollarSign, Lock } from "lucide-react";
import { toast } from "sonner";

const EMPTY_STAGE = {
  stage_name: "", sequence: 1, description: "", cost_center_id: "", cost_center_name: "",
  employee_id: "", employee_name: "", planned_hours: 0, actual_hours: 0,
  labor_cost: 0, material_cost: 0, overhead_cost: 0, total_cost: 0,
  output_quantity: 0, rejected_quantity: 0, start_time: "", end_time: "",
  status: "بانتظار", notes: "", materials_consumed: [],
};

export default function ProductionOrderDetail({ orderId, onBack }) {
  const [order, setOrder] = useState(null);
  const [stages, setStages] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_STAGE);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, [orderId]);

  async function load() {
    setLoading(true);
    const [o, s, emp, cc, prod, wh] = await Promise.all([
      base44.entities.ProductionOrder.get(orderId),
      base44.entities.ProductionStage.filter({ order_id: orderId }),
      base44.entities.Employee.list(),
      base44.entities.CostCenter.list(),
      base44.entities.Product.list(),
      base44.entities.Warehouse.list(),
    ]);
    setOrder(o);
    setStages(s.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)));
    setEmployees(emp); setCostCenters(cc); setProducts(prod); setWarehouses(wh);
    setLoading(false);
  }

  function openAdd() {
    setForm({ ...EMPTY_STAGE, sequence: stages.length + 1 });
    setEditing(null); setOpen(true);
  }
  function openEdit(s) { setForm({ ...s }); setEditing(s.id); setOpen(true); }

  async function saveStage() {
    if (!form.stage_name) { toast.error("اسم المرحلة مطلوب"); return; }
    const total = (form.labor_cost || 0) + (form.material_cost || 0) + (form.overhead_cost || 0);
    const payload = { ...form, total_cost: total, order_id: orderId, order_number: order.order_number };
    try {
      if (editing) {
        await base44.entities.ProductionStage.update(editing, payload);
        toast.success("تم تحديث المرحلة");
      } else {
        await base44.entities.ProductionStage.create(payload);
        toast.success("تمت إضافة المرحلة");
      }
      setOpen(false); load(); recomputeOrder();
    } catch (e) { toast.error("تعذّر الحفظ"); }
  }

  async function delStage(id) {
    if (!confirm("حذف هذه المرحلة؟")) return;
    await base44.entities.ProductionStage.delete(id);
    toast.success("تم الحذف");
    load(); recomputeOrder();
  }

  async function changeStageStatus(s, status) {
    await base44.entities.ProductionStage.update(s.id, { status });
    toast.success("تم تحديث حالة المرحلة");
    load(); recomputeOrder();
  }

  const [startingStage, setStartingStage] = useState(null);

  async function startStage(s) {
    setStartingStage(s.id);
    try {
      const res = await base44.functions.invoke("consumeStageMaterials", { stage_id: s.id });
      const msg = res.data?.items?.length
        ? `بدأت المرحلة وخصم ${res.data.items.length} مادة (${(res.data.total_material_cost || 0).toLocaleString()})`
        : "بدأت المرحلة";
      toast.success(msg);
      load(); recomputeOrder();
    } catch (e) {
      const d = e?.response?.data;
      if (d?.insufficient) {
        toast.error("رصيد غير كافٍ: " + d.insufficient.map(i => `${i.name} (${i.reason})`).join("، "));
      } else if (d?.already_deducted) {
        toast.error("تم خصم المواد من قبل لهذه المرحلة");
      } else {
        toast.error(e?.message || "تعذّر بدء المرحلة");
      }
    } finally { setStartingStage(null); }
  }

  async function recomputeOrder() {
    const all = await base44.entities.ProductionStage.filter({ order_id: orderId });
    const material = all.reduce((a, s) => a + (s.material_cost || 0), 0);
    const labor = all.reduce((a, s) => a + (s.labor_cost || 0), 0);
    const overhead = all.reduce((a, s) => a + (s.overhead_cost || 0), 0);
    const total = material + labor + overhead;
    const output = all.reduce((a, s) => a + (s.output_quantity || 0), 0);
    const completed = all.filter(s => s.status === "مكتمل").length;
    await base44.entities.ProductionOrder.update(orderId, {
      actual_material_cost: material, actual_labor_cost: labor, actual_overhead_cost: overhead,
      total_actual_cost: total, actual_unit_cost: output > 0 ? total / output : 0,
      completed_quantity: output, completed_stages: completed, stages_count: all.length,
    });
    setOrder(o => ({ ...o, actual_material_cost: material, actual_labor_cost: labor, actual_overhead_cost: overhead, total_actual_cost: total }));
  }

  const [posting, setPosting] = useState(false);

  async function closeAndPost() {
    if (!order.cost_center_id) { toast.error("الأمر غير مرتبط بمركز تكلفة — لا يمكن الترحيل"); return; }
    if (!confirm("ترحيل التكاليف وإغلاق الأمر؟ سيتم إنشاء قيود تكلفة وقيد محاسبي نهائي لا يمكن التراجع عنه.")) return;
    setPosting(true);
    try {
      const res = await base44.functions.invoke("closeProductionOrder", { order_id: orderId });
      toast.success(`تم ترحيل التكاليف — الإجمالي: ${(res.data.total_cost || 0).toLocaleString()}`);
      load();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "تعذّر الترحيل";
      toast.error(msg);
    } finally { setPosting(false); }
  }

  const stageColor = { "بانتظار": "secondary", "جاري": "default", "مكتمل": "success", "متوقف": "warning" };

  if (loading) return <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div>;
  if (!order) return <p className="text-center text-muted-foreground py-12">الأمر غير موجود</p>;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowRight className="h-4 w-4" /> العودة لقائمة الأوامر
      </button>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold">{order.order_number}</h2>
              <p className="text-sm text-muted-foreground mt-1">{order.product_name} — {order.product_code}</p>
            </div>
            <Badge variant="secondary" className="text-sm">{order.status}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
            <div><p className="text-xs text-muted-foreground">الكمية المستهدفة</p><p className="font-bold">{order.target_quantity} {order.unit}</p></div>
            <div><p className="text-xs text-muted-foreground">الكمية المنجزة</p><p className="font-bold text-green-600">{order.completed_quantity || 0}</p></div>
            <div><p className="text-xs text-muted-foreground">المراحل المكتملة</p><p className="font-bold">{order.completed_stages || 0} / {order.stages_count || 0}</p></div>
            <div><p className="text-xs text-muted-foreground">المسؤول</p><p className="font-semibold">{order.responsible_name || "—"}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CostCard label="مواد فعلية" value={order.actual_material_cost || 0} color="blue" />
        <CostCard label="عمالة فعلية" value={order.actual_labor_cost || 0} color="indigo" />
        <CostCard label="تكاليف غير مباشرة" value={order.actual_overhead_cost || 0} color="amber" />
        <CostCard label="إجمالي / وحدة" value={order.total_actual_cost || 0} subValue={order.actual_unit_cost || 0} color="green" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> مراحل الإنتاج</h3>
          <div className="flex gap-2">
            {order.status !== "مكتمل" && order.status !== "ملغي" && (
              <Button onClick={closeAndPost} disabled={posting} variant="default" size="sm" className="gap-1">
                <Lock className="h-4 w-4" /> {posting ? "جاري الترحيل..." : "إغلاق وترحيل التكاليف"}
              </Button>
            )}
            <Button onClick={openAdd} size="sm" className="gap-1"><Plus className="h-4 w-4" /> مرحلة</Button>
          </div>
        </div>

        <div className="space-y-3">
          {stages.map((s, idx) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">{idx + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{s.stage_name}</p>
                        <Badge variant={stageColor[s.status] || "secondary"} className="text-xs">{s.status}</Badge>
                      </div>
                      {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                      {s.materials_consumed?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.materials_consumed.map((m, mi) => (
                            <span key={mi} className={`text-xs px-2 py-0.5 rounded ${s.materials_deducted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                              {m.product_name}: {m.quantity} {m.unit || ""}
                              {s.materials_deducted ? " ✓" : " (بانتظار الخصم)"}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                        {s.employee_name && <span className="text-muted-foreground">المنفذ: {s.employee_name}</span>}
                        <span className="text-muted-foreground">ساعات: {s.actual_hours || 0} / {s.planned_hours || 0}</span>
                        <span className="text-muted-foreground">إنتاج: {s.output_quantity || 0}</span>
                        <span className="text-primary font-semibold">التكلفة: {(s.total_cost || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {s.status === "بانتظار" && <Button size="icon" variant="ghost" disabled={startingStage === s.id} onClick={() => startStage(s)} title="بدء المرحلة وخصم المواد">{startingStage === s.id ? <div className="h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <PlayCircle className="h-4 w-4" />}</Button>}
                    {s.status === "جاري" && <Button size="icon" variant="ghost" onClick={() => changeStageStatus(s, "مكتمل")}><CheckCircle2 className="h-4 w-4" /></Button>}
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => delStage(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {stages.length === 0 && <div className="text-center text-muted-foreground py-8 text-sm border rounded-lg">لا توجد مراحل — اضغط "مرحلة" لإضافة أول مرحلة إنتاج</div>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل مرحلة" : "مرحلة إنتاج جديدة"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <Label className="text-xs">اسم المرحلة*</Label>
              <Input value={form.stage_name || ""} onChange={(e) => setForm(p => ({ ...p, stage_name: e.target.value }))} className="mt-1 h-8" placeholder="تجهيز / تجميع / تغليف" />
            </div>
            <div>
              <Label className="text-xs">الترتيب</Label>
              <Input type="number" value={form.sequence || 1} onChange={(e) => setForm(p => ({ ...p, sequence: parseFloat(e.target.value) || 1 }))} className="mt-1 h-8" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">الوصف</Label>
              <Input value={form.description || ""} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">الموظف المنفذ</Label>
              <Select value={form.employee_id || ""} onValueChange={(v) => {
                const emp = employees.find(x => x.id === v);
                setForm(p => ({ ...p, employee_id: v, employee_name: emp?.name || "" }));
              }}>
                <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">مركز التكلفة</Label>
              <Select value={form.cost_center_id || ""} onValueChange={(v) => {
                const cc = costCenters.find(x => x.id === v);
                setForm(p => ({ ...p, cost_center_id: v, cost_center_name: cc?.name || "" }));
              }}>
                <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">ساعات مخططة</Label><Input type="number" value={form.planned_hours || 0} onChange={(e) => setForm(p => ({ ...p, planned_hours: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">ساعات فعلية</Label><Input type="number" value={form.actual_hours || 0} onChange={(e) => setForm(p => ({ ...p, actual_hours: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">كمية المنتجة</Label><Input type="number" value={form.output_quantity || 0} onChange={(e) => setForm(p => ({ ...p, output_quantity: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">كمية مرفوضة</Label><Input type="number" value={form.rejected_quantity || 0} onChange={(e) => setForm(p => ({ ...p, rejected_quantity: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
          </div>

          <div className="border-t pt-3 mt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">المواد الخام المستهلكة</p>
              <Button type="button" size="sm" variant="outline" className="gap-1 h-7" onClick={() => setForm(p => ({ ...p, materials_consumed: [...(p.materials_consumed || []), { product_id: "", product_name: "", quantity: 1, unit: "", warehouse_id: order.warehouse_id || "", warehouse_name: order.warehouse_name || "" }] }))}>
                <Plus className="h-3 w-3" /> مادة
              </Button>
            </div>
            {(form.materials_consumed || []).map((m, mi) => (
              <div key={mi} className="grid grid-cols-12 gap-1.5 items-center mb-1.5">
                <div className="col-span-5">
                  <Select value={m.product_id || ""} onValueChange={(v) => {
                    const prod = products.find(x => x.id === v);
                    setForm(p => {
                      const arr = [...(p.materials_consumed || [])];
                      arr[mi] = { ...arr[mi], product_id: v, product_name: prod?.name || "", unit: (prod?.units?.[0]?.name) || arr[mi].unit || "", unit_cost: prod?.avg_purchase_price || prod?.cost_price || 0 };
                      return { ...p, materials_consumed: arr };
                    });
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                    <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Input type="number" value={m.quantity || 0} onChange={(e) => setForm(p => { const arr = [...(p.materials_consumed || [])]; arr[mi] = { ...arr[mi], quantity: parseFloat(e.target.value) || 0 }; return { ...p, materials_consumed: arr }; })} className="h-8 text-xs" placeholder="الكمية" /></div>
                <div className="col-span-1"><span className="text-xs text-muted-foreground">{m.unit || ""}</span></div>
                <div className="col-span-3">
                  <Select value={m.warehouse_id || ""} onValueChange={(v) => { const wh = warehouses.find(x => x.id === v); setForm(p => { const arr = [...(p.materials_consumed || [])]; arr[mi] = { ...arr[mi], warehouse_id: v, warehouse_name: wh?.name || "" }; return { ...p, materials_consumed: arr }; }); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="المستودع" /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <button type="button" className="col-span-1 text-destructive" onClick={() => setForm(p => { const arr = [...(p.materials_consumed || [])]; arr.splice(mi, 1); return { ...p, materials_consumed: arr }; })}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {(!form.materials_consumed || form.materials_consumed.length === 0) && <p className="text-xs text-muted-foreground mb-2">لا توجد مواد — تُخصم تلقائيًا من المخزون عند بدء المرحلة</p>}
          </div>

          <div className="border-t pt-3 mt-2">
            <p className="text-sm font-semibold mb-2">تكاليف المرحلة</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">مواد {(form.materials_consumed || []).length > 0 && <span className="text-[10px] text-muted-foreground">(تلقائي)</span>}</Label><Input type="number" disabled={(form.materials_consumed || []).length > 0} value={form.material_cost || 0} onChange={(e) => setForm(p => ({ ...p, material_cost: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
              <div><Label className="text-xs">عمالة</Label><Input type="number" value={form.labor_cost || 0} onChange={(e) => setForm(p => ({ ...p, labor_cost: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
              <div><Label className="text-xs">غير مباشرة</Label><Input type="number" value={form.overhead_cost || 0} onChange={(e) => setForm(p => ({ ...p, overhead_cost: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
            </div>
            <p className="text-xs mt-2 text-muted-foreground">إجمالي: <b className="text-primary">{((form.labor_cost || 0) + (form.material_cost || 0) + (form.overhead_cost || 0)).toLocaleString()}</b></p>
          </div>

          <div>
            <Label className="text-xs">الحالة</Label>
            <Select value={form.status || "بانتظار"} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["بانتظار", "جاري", "مكتمل", "متوقف"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">ملاحظات</Label><Input value={form.notes || ""} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1 h-8" /></div>

          <div className="flex gap-2 mt-4">
            <Button onClick={saveStage} className="flex-1">حفظ</Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CostCard({ label, value, subValue, color }) {
  const colors = { blue: "text-blue-600", indigo: "text-indigo-600", amber: "text-amber-600", green: "text-green-600" };
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 mb-1"><DollarSign className={`h-4 w-4 ${colors[color]}`} /><p className="text-xs text-muted-foreground">{label}</p></div>
      <p className={`text-xl font-bold ${colors[color]}`}>{value.toLocaleString()}</p>
      {subValue > 0 && <p className="text-xs text-muted-foreground mt-1">للوحدة: {subValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>}
    </CardContent></Card>
  );
}