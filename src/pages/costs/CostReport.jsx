import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { exportToPDF } from "@/utils/exportUtils";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];
const COST_TYPES = ["مواد مباشرة", "عمالة مباشرة", "تكاليف صناعية غير مباشرة", "مصروفات إدارية", "مصروفات بيع", "مصروفات مالية", "أخرى"];

export default function CostReport() {
  const [entries, setEntries] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ branch: "all", cc: "all", type: "all", from: "", to: "", period: "" });
  const [report, setReport] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.CostEntry.list(),
      base44.entities.CostCenter.list(),
      base44.entities.Branch.list(),
    ]).then(([e, cc, br]) => { setEntries(e); setCostCenters(cc); setBranches(br); setLoading(false); });
  }, []);

  function generate() {
    let data = entries.filter(e => e.status === "مرحّل");
    if (filters.branch !== "all") data = data.filter(e => e.branch_id === filters.branch);
    if (filters.cc !== "all") data = data.filter(e => e.cost_center_id === filters.cc);
    if (filters.type !== "all") data = data.filter(e => e.cost_type === filters.type);
    if (filters.from) data = data.filter(e => e.date >= filters.from);
    if (filters.to) data = data.filter(e => e.date <= filters.to);
    if (filters.period) data = data.filter(e => e.period === filters.period);

    const total = data.reduce((s, e) => s + (e.total_cost || 0), 0);

    // By type
    const byType = COST_TYPES.map(t => ({
      name: t,
      value: data.filter(e => e.cost_type === t).reduce((s, e) => s + (e.total_cost || 0), 0),
    })).filter(t => t.value > 0);

    // By cost center
    const byCCMap = {};
    data.forEach(e => {
      if (!byCCMap[e.cost_center_name]) byCCMap[e.cost_center_name] = 0;
      byCCMap[e.cost_center_name] += (e.total_cost || 0);
    });
    const byCC = Object.entries(byCCMap).map(([name, value]) => ({ name, value }));

    // By branch
    const byBranchMap = {};
    data.forEach(e => {
      const k = e.branch_name || "غير محدد";
      if (!byBranchMap[k]) byBranchMap[k] = 0;
      byBranchMap[k] += (e.total_cost || 0);
    });
    const byBranch = Object.entries(byBranchMap).map(([name, value]) => ({ name, value }));

    setReport({ data, total, byType, byCC, byBranch });
  }

  const fmt = v => (v || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 });

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"/></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">قوائم التكاليف</h1>
        <p className="text-muted-foreground text-sm mt-1">تحليل وتقارير التكاليف بحسب المراكز والأنواع</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">معايير التقرير</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">الفرع</Label>
              <Select value={filters.branch} onValueChange={v => setFilters(f => ({...f, branch: v}))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">مركز التكلفة</Label>
              <Select value={filters.cc} onValueChange={v => setFilters(f => ({...f, cc: v}))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">إجمالي التكاليف</p>
              <p className="text-2xl font-bold text-primary mt-1">{fmt(report.total)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">عدد القيود</p>
              <p className="text-2xl font-bold mt-1">{report.data.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">مراكز التكلفة</p>
              <p className="text-2xl font-bold mt-1">{report.byCC.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">متوسط التكلفة</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{fmt(report.data.length ? report.total / report.data.length : 0)}</p>
            </CardContent></Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع التكاليف حسب النوع</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={report.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {report.byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v => v.toLocaleString()}/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">التكاليف حسب مركز الكلفة</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={report.byCC} margin={{ right: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }}/>
                    <YAxis tick={{ fontSize: 10 }}/>
                    <Tooltip formatter={v => v.toLocaleString()}/>
                    <Bar dataKey="value" name="التكلفة" fill="#2563eb" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cost Statement Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">قائمة التكاليف التفصيلية</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToPDF("قائمة التكاليف", [
                { key: "date", label: "التاريخ" },
                { key: "cost_center_name", label: "مركز التكلفة" },
                { key: "cost_type", label: "النوع" },
                { key: "description", label: "البيان" },
                { key: "total_cost", label: "المبلغ", render: v => fmt(v) },
              ], report.data, "cost-report")}>تصدير PDF</Button>
            </CardHeader>
            <CardContent className="p-0">
              {/* Summary by type */}
              <div className="border-b px-4 py-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground mb-2">ملخص حسب نوع التكلفة</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {report.byType.map((t, i) => (
                    <div key={t.name} className="flex items-center justify-between p-2 rounded-lg" style={{ background: COLORS[i % COLORS.length] + "15" }}>
                      <span className="text-xs">{t.name}</span>
                      <span className="text-xs font-bold" style={{ color: COLORS[i % COLORS.length] }}>{fmt(t.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-right px-4 py-3 text-xs font-semibold">التاريخ</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">مركز التكلفة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">نوع التكلفة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">البيان</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الكمية</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">تكلفة الوحدة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        <td className="px-4 py-2.5">{e.date}</td>
                        <td className="px-4 py-2.5">{e.cost_center_name}</td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{e.cost_type}</Badge></td>
                        <td className="px-4 py-2.5 text-muted-foreground">{e.description}</td>
                        <td className="px-4 py-2.5">{e.quantity} {e.unit}</td>
                        <td className="px-4 py-2.5">{fmt(e.unit_cost)}</td>
                        <td className="px-4 py-2.5 font-semibold text-primary">{fmt(e.total_cost)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-bold border-t-2">
                      <td colSpan={6} className="px-4 py-3">الإجمالي</td>
                      <td className="px-4 py-3 text-primary">{fmt(report.total)}</td>
                    </tr>
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