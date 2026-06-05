import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { GitBranch, TrendingUp } from "lucide-react";

const COLORS = ["#2563eb","#16a34a","#9333ea","#ea580c","#0891b2","#dc2626","#65a30d","#d97706"];

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "م";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "ك";
  return n.toFixed(0);
}

export default function BranchMonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));
  const months = [
    { v: "01", l: "يناير" }, { v: "02", l: "فبراير" }, { v: "03", l: "مارس" },
    { v: "04", l: "أبريل" }, { v: "05", l: "مايو" },  { v: "06", l: "يونيو" },
    { v: "07", l: "يوليو" }, { v: "08", l: "أغسطس" }, { v: "09", l: "سبتمبر" },
    { v: "10", l: "أكتوبر" },{ v: "11", l: "نوفمبر" },{ v: "12", l: "ديسمبر" },
  ];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [invoices, branches] = await Promise.all([
        base44.entities.Invoice.list("-date", 500).catch(() => []),
        base44.entities.Branch.list().catch(() => []),
      ]);

      // Filter to selected month/year and sales invoices
      const prefix = `${year}-${month}`;
      const filtered = invoices.filter(
        (inv) => inv.pattern_type === "مبيعات" && inv.date && inv.date.startsWith(prefix)
      );

      // Group by branch
      const branchMap = {};
      branches.forEach((b) => {
        branchMap[b.id] = { name: b.name, total: 0, count: 0 };
      });
      // Also handle invoices with no branch or unknown branch
      branchMap["__none__"] = { name: "غير محدد", total: 0, count: 0 };

      filtered.forEach((inv) => {
        const key = inv.branch_id && branchMap[inv.branch_id] ? inv.branch_id : "__none__";
        branchMap[key].total += inv.total || 0;
        branchMap[key].count += 1;
      });

      const result = Object.values(branchMap)
        .filter((b) => b.total > 0)
        .sort((a, b) => b.total - a.total);

      setData(result);
      setLoading(false);
    };
    load();
  }, [year, month]);

  const totalSales = data.reduce((s, b) => s + b.total, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <GitBranch className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-semibold">مقارنة أداء الفروع شهرياً</CardTitle>
          </div>
          <div className="flex gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.v} value={m.v} className="text-xs">{m.l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <TrendingUp className="h-8 w-8 opacity-30" />
            <p className="text-sm">لا توجد فواتير مبيعات في هذا الشهر</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data} layout="vertical" margin={{ right: 40, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmt} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip
                  formatter={(v) => [v.toLocaleString("ar-SA") + " ر.س", "المبيعات"]}
                  contentStyle={{ fontSize: 12, direction: "rtl" }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Summary table */}
            <div className="divide-y divide-border rounded-lg border overflow-hidden">
              {data.map((b, i) => {
                const pct = totalSales > 0 ? (b.total / totalSales) * 100 : 0;
                return (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium">{b.name}</span>
                      <span className="text-xs text-muted-foreground">({b.count} فاتورة)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block w-20 bg-muted rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                      <span className="text-sm font-bold text-primary">{b.total.toLocaleString("ar-SA")} ر.س</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-3 py-2 bg-muted/40 font-semibold">
                <span className="text-sm">الإجمالي</span>
                <span className="text-sm text-primary">{totalSales.toLocaleString("ar-SA")} ر.س</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}