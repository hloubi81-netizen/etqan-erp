import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { exportToPDF } from "@/utils/exportUtils";
import { ChevronRight } from "lucide-react";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const COST_TYPES = ["مواد مباشرة", "عمالة مباشرة", "تكاليف صناعية غير مباشرة", "تكاليف محولة من مرحلة سابقة"];

export default function CostReport() {
  const [entries, setEntries] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ stage: "all", type: "all", from: "", to: "", period: "" });
  const [report, setReport] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.CostEntry.list(),
      base44.entities.ProductionStage.list("order"),
    ]).then(([e, s]) => { setEntries(e); setStages(s); setLoading(false); });
  }, []);

  function generate() {
    let data = entries.filter(e => e.status === "مرحّل");
    if (filters.stage !== "all") data = data.filter(e => e.stage_id === filters.stage);
    if (filters.type !== "all") data = data.filter(e => e.cost_type === filters.type);
    if (filters.from) data = data.filter(e => e.date >= filters.from);
    if (filters.to) data = data.filter(e => e.date <= filters.to);
    if (filters.period) data = data.filter(e => e.period === filters.period);

    const total = data.reduce((s, e) => s + (e.total_cost || 0), 0);

    // By stage (process costing core)
    const byStageMap = {};
    stages.forEach(s => { byStageMap[s.id] = { stage: s, entries: [], totalCost: 0, totalEquivUnits: 0, completedUnits: 0, wipUnits: 0 }; });
    data.forEach(e => {
      if (!byStageMap[e.stage_id]) byStageMap[e.stage_id] = { stage: { name: e.stage_name, order: 99 }, entries: [], totalCost: 0, totalEquivUnits: 0, completedUnits: 0, wipUnits: 0 };
      byStageMap[e.stage_id].entries.push(e);
      byStageMap[e.stage_id].totalCost += (e.total_cost || 0);
      byStageMap[e.stage_id].completedUnits = Math.max(byStageMap[e.stage_id].completedUnits, e.completed_units || 0);
      byStageMap[e.stage_id].wipUnits = Math.max(byStageMap[e.stage_id].wipUnits, e.wip_units || 0);
    });

    // Recalculate equiv units per stage
    Object.values(byStageMap).forEach(sd => {
      const avgEquiv = sd.entries.length > 0
        ? sd.entries.reduce((s, e) => s + (e.equivalent_units || 0), 0) / sd.entries.length
        : 0;
      sd.totalEquivUnits = avgEquiv;
      sd.costPerEquivUnit = avgEquiv > 0 ? sd.totalCost / avgEquiv : 0;
    });

    const byStage = Object.values(byStageMap)
      .filter(s => s.entries.length > 0)
      .sort((a, b) => (a.stage.order || 0) - (b.stage.order || 0));

    // By cost type
    const byType = COST_TYPES.map(t => ({
      name: t,
      value: data.filter(e => e.cost_type === t).reduce((s, e) => s + (e.total_cost || 0), 0),
    })).filter(t => t.value > 0);

    // Chart data per stage
    const stageChart = byStage.map((s, i) => ({
      name: s.stage.name,
      تكلفة: s.totalCost,
      fill: COLORS[i % COLORS.length],
    }));

    setReport({ data, total, byStage, byType, stageChart });
  }

  const fmt = v => (v || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 });

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"/></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">قوائم تكاليف المراحل</h1>
        <p className="text-muted-foreground text-sm mt-1">تقرير تكلفة الإنتاج حسب المراحل والوحدات المعادلة</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">معايير التقرير</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">المرحلة</Label>
              <Select value={filters.stage} onValueChange={v => setFilters(f => ({...f, stage: v}))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع التكلفة</Label>
              <Select value={filters.type} onValueChange={v => setFilters(f => ({...f, type: v}))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {COST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الفترة</Label>
              <Input className="h-8 text-xs" placeholder="YYYY-MM" value={filters.period} onChange={e => setFilters(f => ({...f, period: e.target.value}))}/>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">من تاريخ</Label>
              <Input className="h-8 text-xs" type="date" value={filters.from} onChange={e => setFilters(f => ({...f, from: e.target.value}))}/>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input className="h-8 text-xs" type="date" value={filters.to} onChange={e => setFilters(f => ({...f, to: e.target.value}))}/>
            </div>
            <Button onClick={generate} className="h-8 text-xs">عرض التقرير</Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">إجمالي تكاليف الإنتاج</p>
              <p className="text-xl font-bold text-primary mt-1">{fmt(report.total)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">عدد المراحل</p>
              <p className="text-xl font-bold mt-1">{report.byStage.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">إجمالي القيود</p>
              <p className="text-xl font-bold mt-1">{report.data.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">متوسط تكلفة/وحدة معادلة</p>
              <p className="text-xl font-bold text-amber-600 mt-1">
                {fmt(report.byStage.length ? report.byStage.reduce((s, x) => s + x.costPerEquivUnit, 0) / report.byStage.length : 0)}
              </p>
            </CardContent></Card>
          </div>

          {/* Stage pipeline cost summary */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">ورقة تكاليف الإنتاج حسب المراحل</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-stretch gap-3 overflow-x-auto pb-2 mb-4">
                {report.byStage.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="min-w-[160px] border-2 rounded-xl p-3 text-center" style={{ borderColor: COLORS[i % COLORS.length] + "60" }}>
                      <div className="text-xs font-bold mb-2" style={{ color: COLORS[i % COLORS.length] }}>{s.stage.name}</div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">التكاليف الكلية</div>
                        <div className="font-bold text-sm" style={{ color: COLORS[i % COLORS.length] }}>{fmt(s.totalCost)}</div>
                        <div className="text-xs text-muted-foreground mt-1">وحدات معادلة</div>
                        <div className="font-semibold text-xs">{s.totalEquivUnits.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground mt-1">ت/وحدة معادلة</div>
                        <div className="font-bold text-amber-600 text-sm">{fmt(s.costPerEquivUnit)}</div>
                      </div>
                    </div>
                    {i < report.byStage.length - 1 && <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0"/>}
                  </div>
                ))}
              </div>

              {/* Stage detail table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-right px-3 py-2.5 text-xs font-semibold border">المرحلة</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold border">مواد مباشرة</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold border">عمالة مباشرة</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold border">تكاليف غير مباشرة</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold border">محولة</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold border">وحدات مكتملة</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold border">ت. تحت التشغيل</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold border">وحدات معادلة</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold border bg-primary/5">إجمالي التكاليف</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold border bg-amber-50">ت/وحدة معادلة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byStage.map((sd, i) => {
                      const direct = sd.entries.filter(e => e.cost_type === "مواد مباشرة").reduce((s, e) => s + (e.total_cost || 0), 0);
                      const labor = sd.entries.filter(e => e.cost_type === "عمالة مباشرة").reduce((s, e) => s + (e.total_cost || 0), 0);
                      const overhead = sd.entries.filter(e => e.cost_type === "تكاليف صناعية غير مباشرة").reduce((s, e) => s + (e.total_cost || 0), 0);
                      const transferred = sd.entries.filter(e => e.cost_type === "تكاليف محولة من مرحلة سابقة").reduce((s, e) => s + (e.total_cost || 0), 0);
                      return (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-muted/10"}>
                          <td className="px-3 py-2 border font-semibold" style={{ color: COLORS[i % COLORS.length] }}>{sd.stage.name}</td>
                          <td className="px-3 py-2 border text-center text-xs">{fmt(direct)}</td>
                          <td className="px-3 py-2 border text-center text-xs">{fmt(labor)}</td>
                          <td className="px-3 py-2 border text-center text-xs">{fmt(overhead)}</td>
                          <td className="px-3 py-2 border text-center text-xs">{fmt(transferred)}</td>
                          <td className="px-3 py-2 border text-center text-xs">{sd.completedUnits}</td>
                          <td className="px-3 py-2 border text-center text-xs">{sd.wipUnits}</td>
                          <td className="px-3 py-2 border text-center text-xs font-medium">{sd.totalEquivUnits.toFixed(2)}</td>
                          <td className="px-3 py-2 border text-center font-bold text-primary">{fmt(sd.totalCost)}</td>
                          <td className="px-3 py-2 border text-center font-bold text-amber-600">{fmt(sd.costPerEquivUnit)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-muted/50 font-bold border-t-2">
                      <td className="px-3 py-2.5 border">الإجمالي</td>
                      <td colSpan={7} className="px-3 py-2.5 border"/>
                      <td className="px-3 py-2.5 border text-center text-primary">{fmt(report.total)}</td>
                      <td className="px-3 py-2.5 border"/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Bar chart */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">مقارنة التكاليف بين المراحل</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={report.stageChart} margin={{ right: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }}/>
                  <YAxis tick={{ fontSize: 10 }}/>
                  <Tooltip formatter={v => v.toLocaleString("ar-SA")}/>
                  <Bar dataKey="تكلفة" radius={[4,4,0,0]}>
                    {report.stageChart.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed entries */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">القيود التفصيلية</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToPDF("تقرير تكاليف المراحل", [
                { key: "date", label: "التاريخ" },
                { key: "stage_name", label: "المرحلة" },
                { key: "cost_type", label: "نوع التكلفة" },
                { key: "description", label: "البيان" },
                { key: "completed_units", label: "وحدات مكتملة" },
                { key: "equivalent_units", label: "وحدات معادلة" },
                { key: "total_cost", label: "الإجمالي", render: v => (v||0).toLocaleString() },
                { key: "cost_per_equiv_unit", label: "ت/وحدة معادلة", render: v => (v||0).toLocaleString() },
              ], report.data, "cost-stages-report")}>تصدير PDF</Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-right px-4 py-2.5 text-xs font-semibold">التاريخ</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold">المرحلة</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold">نوع التكلفة</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold">البيان</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold">وحدات مكتملة</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold">وحدات معادلة</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold">إجمالي التكلفة</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold">ت/وحدة معادلة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        <td className="px-4 py-2">{e.date}</td>
                        <td className="px-4 py-2 font-medium">{e.stage_name}</td>
                        <td className="px-4 py-2"><Badge variant="outline" className="text-xs">{e.cost_type}</Badge></td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">{e.description}</td>
                        <td className="px-4 py-2 text-center">{e.completed_units || 0}</td>
                        <td className="px-4 py-2 text-center">{(e.equivalent_units || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-center font-semibold text-primary">{fmt(e.total_cost)}</td>
                        <td className="px-4 py-2 text-center text-amber-600">{fmt(e.cost_per_equiv_unit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!report && (
        <div className="bg-card border rounded-xl p-16 text-center text-muted-foreground">
          اختر معايير التقرير ثم اضغط عرض التقرير
        </div>
      )}
    </div>
  );
}