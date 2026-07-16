import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Factory, Search, Package, Users, Layers, DollarSign, TrendingUp } from "lucide-react";

export default function ProductionCostReport() {
  const [orders, setOrders] = useState([]);
  const [stages, setStages] = useState([]);
  const [costEntries, setCostEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [o, s, ce] = await Promise.all([
      base44.entities.ProductionOrder.list("-date"),
      base44.entities.ProductionStage.list(),
      base44.entities.CostEntry.filter({ production_order_id: { $exists: true } }),
    ]);
    setOrders(o); setStages(s); setCostEntries(ce);
    setLoading(false);
  }

  const stagesByOrder = (id) => stages.filter(s => s.order_id === id);

  const filtered = orders.filter(o => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return o.order_number?.includes(search) || o.product_name?.includes(search);
  });

  const grandTotals = filtered.reduce((acc, o) => {
    acc.material += o.actual_material_cost || 0;
    acc.labor += o.actual_labor_cost || 0;
    acc.overhead += o.actual_overhead_cost || 0;
    acc.total += o.total_actual_cost || 0;
    return acc;
  }, { material: 0, labor: 0, overhead: 0, total: 0 });

  const statusColor = { "مخطط": "secondary", "جاري التنفيذ": "default", "مكتمل": "success", "متوقف": "warning", "ملغي": "destructive" };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" /> تقرير تكاليف الإنتاج</h1>
        <p className="text-sm text-muted-foreground mt-1">تحليل تكاليف المواد والعمالة والتكاليف غير المباشرة لكل أمر إنتاج ومرحلة</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={Package} color="blue" label="إجمالي المواد" value={grandTotals.material} />
        <SummaryCard icon={Users} color="indigo" label="إجمالي العمالة" value={grandTotals.labor} />
        <SummaryCard icon={Layers} color="amber" label="إجمالي غير المباشرة" value={grandTotals.overhead} />
        <SummaryCard icon={DollarSign} color="green" label="إجمالي التكاليف" value={grandTotals.total} />
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
        <div className="space-y-4">
          {filtered.map(o => {
            const os = stagesByOrder(o.id);
            const posted = costEntries.filter(c => c.production_order_id === o.id);
            return (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4 text-primary" />
                        <span className="font-bold">{o.order_number}</span>
                        <Badge variant={statusColor[o.status] || "secondary"} className="text-xs">{o.status}</Badge>
                        {posted.length > 0 && <Badge variant="success" className="text-xs">مرحّل ({posted.length} قيود)</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{o.product_name} — الكمية: {o.target_quantity} {o.unit}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">مركز التكلفة</p>
                      <p className="text-sm font-semibold">{o.cost_center_name || "—"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3 text-sm">
                    <CostBox label="مواد" value={o.actual_material_cost} color="text-blue-600" />
                    <CostBox label="عمالة" value={o.actual_labor_cost} color="text-indigo-600" />
                    <CostBox label="غير مباشرة" value={o.actual_overhead_cost} color="text-amber-600" />
                    <CostBox label="الإجمالي" value={o.total_actual_cost} color="text-green-600" />
                    <CostBox label="للوحدة" value={o.actual_unit_cost} color="text-primary" decimals={2} />
                  </div>

                  {os.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">تفصيل المراحل ({os.length})</p>
                      <div className="space-y-1.5">
                        {os.map((s, idx) => (
                          <div key={s.id} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1.5">
                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{idx + 1}</span>
                            <span className="font-semibold flex-1">{s.stage_name}</span>
                            {s.employee_name && <span className="text-muted-foreground">{s.employee_name}</span>}
                            <span className="text-blue-600">مواد: {(s.material_cost || 0).toLocaleString()}</span>
                            <span className="text-indigo-600">عمالة: {(s.labor_cost || 0).toLocaleString()}</span>
                            <span className="text-amber-600">غير مباشرة: {(s.overhead_cost || 0).toLocaleString()}</span>
                            <span className="text-green-600 font-bold">الإجمالي: {(s.total_cost || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <div className="text-center text-muted-foreground py-12 text-sm">لا توجد أوامر إنتاج</div>}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, color, label, value }) {
  const colors = { blue: "bg-blue-100 text-blue-600", indigo: "bg-indigo-100 text-indigo-600", amber: "bg-amber-100 text-amber-600", green: "bg-green-100 text-green-600" };
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors[color]}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
    </CardContent></Card>
  );
}

function CostBox({ label, value, color, decimals }) {
  return (
    <div className="bg-muted/30 rounded p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-bold ${color}`}>{(value || 0).toLocaleString(undefined, { maximumFractionDigits: decimals || 0 })}</p>
    </div>
  );
}