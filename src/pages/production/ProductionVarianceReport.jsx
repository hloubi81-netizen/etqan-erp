import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Factory, Search, TrendingDown, TrendingUp, Scale, Package, Users, Layers } from "lucide-react";

export default function ProductionVarianceReport() {
  const [orders, setOrders] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [varianceFilter, setVarianceFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [o, s] = await Promise.all([
      base44.entities.ProductionOrder.list("-date"),
      base44.entities.ProductionStage.list(),
    ]);
    setOrders(o); setStages(s);
    setLoading(false);
  }

  const stagesByOrder = (id) => stages.filter(s => s.order_id === id).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  const filtered = orders.filter(o => {
    if (varianceFilter === "favorable" && (o.total_variance || 0) < 0) return false;
    if (varianceFilter === "unfavorable" && (o.total_variance || 0) >= 0) return false;
    return o.order_number?.includes(search) || o.product_name?.includes(search);
  });

  // Aggregate variances across filtered orders
  const totals = filtered.reduce((acc, o) => {
    acc.planned += (o.total_planned_cost || 0);
    acc.actual += (o.total_actual_cost || 0);
    acc.material += (o.material_variance || 0);
    acc.labor += (o.labor_variance || 0);
    acc.overhead += (o.overhead_variance || 0);
    acc.total += (o.total_variance || 0);
    return acc;
  }, { planned: 0, actual: 0, material: 0, labor: 0, overhead: 0, total: 0 });

  // Compute material usage variance per stage (planned_materials vs materials_consumed)
  function stageMaterialUsageVariance(s) {
    const planned = s.planned_materials || [];
    const consumed = s.materials_consumed || [];
    if (!planned.length) return null;
    return planned.map(p => {
      const actual = consumed.find(c => c.product_id === p.product_id);
      const actualQty = actual ? actual.quantity : 0;
      const actualUnitCost = actual ? (actual.unit_cost || 0) : 0;
      const qtyVariance = (p.quantity || 0) - actualQty; // + favorable
      const priceVariance = (p.unit_cost || 0) - actualUnitCost; // + favorable
      const usageValueVariance = qtyVariance * (p.unit_cost || 0);
      const priceValueVariance = priceVariance * actualQty;
      return {
        name: p.product_name,
        unit: p.unit || "",
        planned_qty: p.quantity || 0,
        actual_qty: actualQty,
        planned_unit_cost: p.unit_cost || 0,
        actual_unit_cost: actualUnitCost,
        qty_variance: qtyVariance,
        price_variance: priceVariance,
        usage_value_variance: usageValueVariance,
        price_value_variance: priceValueVariance,
        total_value_variance: usageValueVariance + priceValueVariance,
      };
    });
  }

  function laborEfficiencyVariance(s) {
    if (!(s.planned_hours > 0) || !(s.standard_rate > 0)) return null;
    const effVar = (s.planned_hours - (s.actual_hours || 0)) * s.standard_rate;
    const rateVar = (s.standard_rate - ((s.labor_cost || 0) / Math.max(s.actual_hours, 0.001))) * (s.actual_hours || 0);
    return { eff: effVar, rate: rateVar, planned: s.planned_hours, actual: s.actual_hours || 0, std_rate: s.standard_rate };
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6 text-primary" /> تحليل انحرافات التكاليف والمواد</h1>
        <p className="text-sm text-muted-foreground mt-1">مقارنة التكاليف المعيارية (المخططة) بالفعلية — الانحراف الموجب = مواتٍ (توفير)، السالب = غير مواتٍ (تجاوز)</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <VarCard icon={Package} color="blue" label="انحراف المواد" value={totals.material} />
        <VarCard icon={Users} color="indigo" label="انحراف العمالة" value={totals.labor} />
        <VarCard icon={Layers} color="amber" label="انحراف غير المباشرة" value={totals.overhead} />
        <VarCard icon={Scale} color="green" label="إجمالي الانحراف" value={totals.total} sub={`مخطط: ${totals.planned.toLocaleString()} | فعلي: ${totals.actual.toLocaleString()}`} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث برقم الأمر أو المنتج..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={varianceFilter} onValueChange={setVarianceFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأوامر</SelectItem>
            <SelectItem value="favorable">موات (توفير)</SelectItem>
            <SelectItem value="unfavorable">غير موات (تجاوز)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
        <div className="space-y-4">
          {filtered.map(o => {
            const os = stagesByOrder(o.id);
            const isOpen = expanded === o.id;
            const v = o.total_variance || 0;
            const pct = o.variance_pct || 0;
            const favorable = v >= 0;
            return (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <button onClick={() => setExpanded(isOpen ? null : o.id)} className="flex items-start justify-between flex-wrap gap-2 w-full text-right mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4 text-primary" />
                        <span className="font-bold">{o.order_number}</span>
                        <Badge variant={favorable ? "success" : "destructive"} className="text-xs gap-1">
                          {favorable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {favorable ? "موات" : "غير موات"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{o.product_name} — الكمية: {o.target_quantity} {o.unit}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">إجمالي الانحراف</p>
                      <p className={`text-lg font-bold ${favorable ? "text-green-600" : "text-red-600"}`}>
                        {v >= 0 ? "+" : ""}{v.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({pct.toFixed(1)}%)
                      </p>
                    </div>
                  </button>

                  {/* Variance breakdown table */}
                  <div className="grid grid-cols-4 gap-2 text-sm mb-3">
                    <VarBox label="المواد" planned={o.planned_material_cost} actual={o.actual_material_cost} variance={o.material_variance} color="blue" />
                    <VarBox label="العمالة" planned={o.planned_labor_cost} actual={o.actual_labor_cost} variance={o.labor_variance} color="indigo" />
                    <VarBox label="غير مباشرة" planned={o.planned_overhead_cost} actual={o.actual_overhead_cost} variance={o.overhead_variance} color="amber" />
                    <VarBox label="الإجمالي" planned={o.total_planned_cost} actual={o.total_actual_cost} variance={o.total_variance} color="green" bold />
                  </div>

                  {isOpen && os.length > 0 && (
                    <div className="border-t pt-3 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground">تحليل انحراف المراحل ({os.length})</p>
                      {os.map((s, idx) => {
                        const matVar = stageMaterialUsageVariance(s);
                        const labVar = laborEfficiencyVariance(s);
                        return (
                          <div key={s.id} className="bg-muted/30 rounded p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">{idx + 1}</span>
                              <span className="font-semibold text-sm">{s.stage_name}</span>
                              <Badge variant="secondary" className="text-xs">{s.status}</Badge>
                            </div>

                            {/* Labor efficiency variance */}
                            {labVar && (
                              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                <div className="bg-background rounded p-2">
                                  <p className="text-muted-foreground mb-1">انحراف كفاءة العمالة (ساعات)</p>
                                  <p className={`font-bold ${labVar.eff >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {labVar.eff >= 0 ? "+" : ""}{labVar.eff.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">مخطط {labVar.planned}س / فعلي {labVar.actual}س × {labVar.std_rate}/س</p>
                                </div>
                                <div className="bg-background rounded p-2">
                                  <p className="text-muted-foreground mb-1">انحراف معدل العمالة</p>
                                  <p className={`font-bold ${labVar.rate >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {labVar.rate >= 0 ? "+" : ""}{labVar.rate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">معياري {labVar.std_rate} / فعلي {(labVar.actual > 0 ? ((s.labor_cost || 0) / labVar.actual) : 0).toFixed(1)}</p>
                                </div>
                              </div>
                            )}

                            {/* Material usage variance */}
                            {matVar && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground border-b">
                                      <th className="text-right py-1">المادة</th>
                                      <th className="text-center">كمية معيارية</th>
                                      <th className="text-center">كمية فعلية</th>
                                      <th className="text-center">انحراف الكمية</th>
                                      <th className="text-center">سعر معياري</th>
                                      <th className="text-center">سعر فعلي</th>
                                      <th className="text-center">انحراف السعر</th>
                                      <th className="text-center font-bold">إجمالي الانحراف</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {matVar.map((m, mi) => (
                                      <tr key={mi} className="border-b border-border/40">
                                        <td className="py-1.5 font-medium">{m.name} <span className="text-muted-foreground">({m.unit})</span></td>
                                        <td className="text-center">{m.planned_qty}</td>
                                        <td className="text-center">{m.actual_qty}</td>
                                        <td className={`text-center ${m.qty_variance >= 0 ? "text-green-600" : "text-red-600"}`}>{m.qty_variance >= 0 ? "+" : ""}{m.qty_variance}</td>
                                        <td className="text-center">{m.planned_unit_cost.toLocaleString()}</td>
                                        <td className="text-center">{m.actual_unit_cost.toLocaleString()}</td>
                                        <td className={`text-center ${m.price_variance >= 0 ? "text-green-600" : "text-red-600"}`}>{m.price_variance >= 0 ? "+" : ""}{m.price_variance.toLocaleString()}</td>
                                        <td className={`text-center font-bold ${m.total_value_variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                          {m.total_value_variance >= 0 ? "+" : ""}{m.total_value_variance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {!matVar && !labVar && <p className="text-xs text-muted-foreground">لا توجد بيانات معيارية (BOM/معدل معياري) لتحليل انحراف هذه المرحلة</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <div className="text-center text-muted-foreground py-12 text-sm">لا توجد أوامر إنتاج مطابقة</div>}
        </div>
      )}
    </div>
  );
}

function VarCard({ icon: Icon, color, label, value, sub }) {
  const colors = { blue: "bg-blue-100 text-blue-600", indigo: "bg-indigo-100 text-indigo-600", amber: "bg-amber-100 text-amber-600", green: "bg-green-100 text-green-600" };
  const favorable = value >= 0;
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors[color]}`}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${favorable ? "text-green-600" : "text-red-600"}`}>{value >= 0 ? "+" : ""}{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </CardContent></Card>
  );
}

function VarBox({ label, planned, actual, variance, color, bold }) {
  const v = variance || 0;
  const favorable = v >= 0;
  return (
    <div className="bg-muted/30 rounded p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
        <span>مخطط: {(planned || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        <span>فعلي: {(actual || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      </div>
      <p className={`text-sm font-bold mt-1 ${favorable ? "text-green-600" : "text-red-600"} ${bold ? "text-base" : ""}`}>
        {favorable ? "↑" : "↓"} {Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}