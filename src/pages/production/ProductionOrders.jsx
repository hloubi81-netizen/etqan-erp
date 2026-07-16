import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Factory, PlayCircle, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ProductionOrderDetail from "@/components/production/ProductionOrderDetail";

const EMPTY = {
  order_number: "", date: new Date().toISOString().slice(0, 10),
  product_id: "", product_name: "", product_code: "", target_quantity: 1,
  completed_quantity: 0, rejected_quantity: 0, unit: "",
  cost_center_id: "", cost_center_name: "", branch_id: "", branch_name: "",
  warehouse_id: "", warehouse_name: "",
  planned_material_cost: 0, planned_labor_cost: 0, planned_overhead_cost: 0, total_planned_cost: 0,
  actual_material_cost: 0, actual_labor_cost: 0, actual_overhead_cost: 0, total_actual_cost: 0, actual_unit_cost: 0,
  start_date: "", end_date: "", responsible_name: "", status: "مخطط", notes: "",
};

const statusColor = {
  "مخطط": "secondary", "جاري التنفيذ": "default", "مكتمل": "success",
  "متوقف": "warning", "ملغي": "destructive",
};

export default function ProductionOrders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [o, p, cc, b, w] = await Promise.all([
      base44.entities.ProductionOrder.list("-date"),
      base44.entities.Product.list(),
      base44.entities.CostCenter.list(),
      base44.entities.Branch.list(),
      base44.entities.Warehouse.list(),
    ]);
    setOrders(o); setProducts(p); setCostCenters(cc); setBranches(b); setWarehouses(w);
    setLoading(false);
  }

  function genNumber() {
    const n = `PRD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, "0")}`;
    return n;
  }

  function openAdd() {
    setForm({ ...EMPTY, order_number: genNumber(), date: new Date().toISOString().slice(0, 10) });
    setEditing(null); setOpen(true);
  }

  function openEdit(o) {
    setForm({ ...o }); setEditing(o.id); setOpen(true);
  }

  function pickProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    setForm(f => ({
      ...f, product_id: p.id, product_name: p.name, product_code: p.item_code || "",
      unit: (p.units?.[0]?.name) || "",
    }));
  }

  function calcPlanned(f) {
    return (f.planned_material_cost || 0) + (f.planned_labor_cost || 0) + (f.planned_overhead_cost || 0);
  }

  async function save() {
    if (!form.order_number || !form.product_id || !form.target_quantity) {
      toast.error("الرقم والمنتج والكمية مطلوبة"); return;
    }
    const payload = { ...form, total_planned_cost: calcPlanned(form) };
    try {
      if (editing) {
        await base44.entities.ProductionOrder.update(editing, payload);
        toast.success("تم تحديث أمر الإنتاج");
      } else {
        await base44.entities.ProductionOrder.create(payload);
        toast.success("تم إنشاء أمر الإنتاج");
      }
      setOpen(false); load();
    } catch (e) { toast.error("تعذّر الحفظ"); }
  }

  async function del(id) {
    if (!confirm("حذف هذا الأمر وكل مراحله؟")) return;
    const stages = await base44.entities.ProductionStage.filter({ order_id: id });
    for (const s of stages) await base44.entities.ProductionStage.delete(s.id);
    await base44.entities.ProductionOrder.delete(id);
    toast.success("تم الحذف");
    load();
  }

  async function changeStatus(o, status) {
    await base44.entities.ProductionOrder.update(o.id, { status, end_date: status === "مكتمل" ? new Date().toISOString().slice(0, 10) : o.end_date });
    toast.success("تم تحديث الحالة");
    load();
  }

  const filtered = orders.filter(o => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return o.order_number?.includes(search) || o.product_name?.includes(search) || o.responsible_name?.includes(search);
  });

  const stats = {
    total: orders.length,
    running: orders.filter(o => o.status === "جاري التنفيذ").length,
    completed: orders.filter(o => o.status === "مكتمل").length,
    planned: orders.filter(o => o.status === "مخطط").length,
  };

  return (
    <div className="space-y-5">
      {detailId ? (
        <ProductionOrderDetail orderId={detailId} onBack={() => { setDetailId(null); load(); }} />
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Factory className="h-6 w-6 text-primary" /> أوامر الإنتاج</h1>
              <p className="text-sm text-muted-foreground mt-1">إدارة أوامر التصنيع ومراحل الإنتاج وتكاليفها</p>
            </div>
            <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> أمر إنتاج جديد</Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Factory} color="blue" label="إجمالي الأوامر" value={stats.total} />
            <StatCard icon={Clock} color="amber" label="مخطط" value={stats.planned} />
            <StatCard icon={PlayCircle} color="indigo" label="جاري التنفيذ" value={stats.running} />
            <StatCard icon={CheckCircle2} color="green" label="مكتمل" value={stats.completed} />
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث برقم الأمر أو المنتج..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {["مخطط", "جاري التنفيذ", "مكتمل", "متوقف", "ملغي"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map(o => (
                <Card key={o.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetailId(o.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEdit(o)} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => del(o.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{o.order_number}</p>
                        <Badge variant={statusColor[o.status] || "secondary"} className="text-xs mt-1">{o.status}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="font-semibold text-sm">{o.product_name}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>الكمية: <b className="text-foreground">{o.target_quantity}</b> {o.unit || ""}</span>
                        <span>منجز: <b className="text-foreground">{o.completed_quantity || 0}</b></span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>تكلفة مخططة: <b className="text-foreground">{(o.total_planned_cost || 0).toLocaleString()}</b></span>
                        <span>تكلفة فعلية: <b className="text-foreground">{(o.total_actual_cost || 0).toLocaleString()}</b></span>
                      </div>
                      {o.responsible_name && <p className="text-xs text-muted-foreground">المسؤول: {o.responsible_name}</p>}
                    </div>
                    {o.status !== "مكتمل" && o.status !== "ملغي" && (
                      <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                        {o.status === "مخطط" && <Button size="sm" variant="outline" onClick={() => changeStatus(o, "جاري التنفيذ")}>بدء التنفيذ</Button>}
                        {o.status === "جاري التنفيذ" && <Button size="sm" variant="outline" onClick={() => changeStatus(o, "مكتمل")}>إكمال الأمر</Button>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12 text-sm">لا توجد أوامر إنتاج</div>}
            </div>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل أمر إنتاج" : "أمر إنتاج جديد"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <Label className="text-xs">رقم الأمر*</Label>
              <Input value={form.order_number || ""} onChange={(e) => setForm(p => ({ ...p, order_number: e.target.value }))} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">التاريخ*</Label>
              <Input type="date" value={form.date || ""} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} className="mt-1 h-8" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">المنتج المستهدف*</Label>
              <Select value={form.product_id || ""} onValueChange={pickProduct}>
                <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="اختر المنتج" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.item_code || ""})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">الكمية المستهدفة*</Label>
              <Input type="number" value={form.target_quantity || 0} onChange={(e) => setForm(p => ({ ...p, target_quantity: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">الوحدة</Label>
              <Input value={form.unit || ""} onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))} className="mt-1 h-8" />
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
            <div>
              <Label className="text-xs">الفرع</Label>
              <Select value={form.branch_id || ""} onValueChange={(v) => {
                const b = branches.find(x => x.id === v);
                setForm(p => ({ ...p, branch_id: v, branch_name: b?.name || "" }));
              }}>
                <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">مستودع الإخراج</Label>
              <Select value={form.warehouse_id || ""} onValueChange={(v) => {
                const w = warehouses.find(x => x.id === v);
                setForm(p => ({ ...p, warehouse_id: v, warehouse_name: w?.name || "" }));
              }}>
                <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">المسؤول</Label>
              <Input value={form.responsible_name || ""} onChange={(e) => setForm(p => ({ ...p, responsible_name: e.target.value }))} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">تاريخ البدء</Label>
              <Input type="date" value={form.start_date || ""} onChange={(e) => setForm(p => ({ ...p, start_date: e.target.value }))} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">تاريخ الانتهاء</Label>
              <Input type="date" value={form.end_date || ""} onChange={(e) => setForm(p => ({ ...p, end_date: e.target.value }))} className="mt-1 h-8" />
            </div>
          </div>

          <div className="border-t pt-3 mt-3">
            <p className="text-sm font-semibold mb-2">التكلفة المخططة</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">مواد</Label><Input type="number" value={form.planned_material_cost || 0} onChange={(e) => setForm(p => ({ ...p, planned_material_cost: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
              <div><Label className="text-xs">عمالة</Label><Input type="number" value={form.planned_labor_cost || 0} onChange={(e) => setForm(p => ({ ...p, planned_labor_cost: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
              <div><Label className="text-xs">غير مباشرة</Label><Input type="number" value={form.planned_overhead_cost || 0} onChange={(e) => setForm(p => ({ ...p, planned_overhead_cost: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" /></div>
            </div>
            <p className="text-xs mt-2 text-muted-foreground">إجمالي مخطط: <b className="text-primary">{calcPlanned(form).toLocaleString()}</b></p>
          </div>

          <div>
            <Label className="text-xs">الحالة</Label>
            <Select value={form.status || "مخطط"} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["مخطط", "جاري التنفيذ", "مكتمل", "متوقف", "ملغي"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">ملاحظات</Label><Input value={form.notes || ""} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1 h-8" /></div>

          <div className="flex gap-2 mt-4">
            <Button onClick={save} className="flex-1">حفظ</Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }) {
  const colors = { blue: "bg-blue-100 text-blue-600", amber: "bg-amber-100 text-amber-600", indigo: "bg-indigo-100 text-indigo-600", green: "bg-green-100 text-green-600" };
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors[color]}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
    </CardContent></Card>
  );
}