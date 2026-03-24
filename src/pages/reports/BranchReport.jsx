import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart } from "lucide-react";

export default function BranchReport() {
  const [branches, setBranches] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [report, setReport] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Branch.list(),
      base44.entities.Invoice.list(),
      base44.entities.Warehouse.list(),
    ]).then(([b, inv, wh]) => {
      setBranches(b);
      setInvoices(inv);
      setWarehouses(wh);
      setLoading(false);
    });
  }, []);

  function generate() {
    // Map warehouses to branches
    const whBranchMap = {};
    warehouses.forEach(w => { if (w.branch_id) whBranchMap[w.id] = w.branch_id; });

    // Filter invoices by date
    let filtered = invoices.filter(inv => inv.status === "مرحّلة");
    if (dateFrom) filtered = filtered.filter(inv => inv.date >= dateFrom);
    if (dateTo) filtered = filtered.filter(inv => inv.date <= dateTo);

    // Group by branch
    const branchData = {};
    branches.forEach(b => {
      branchData[b.id] = { id: b.id, name: b.name, code: b.code, sales: 0, purchases: 0, salesReturn: 0, purchasesReturn: 0, invoiceCount: 0 };
    });
    branchData["unknown"] = { id: "unknown", name: "غير محدد", code: "—", sales: 0, purchases: 0, salesReturn: 0, purchasesReturn: 0, invoiceCount: 0 };

    filtered.forEach(inv => {
      const branchId = (inv.warehouse_id && whBranchMap[inv.warehouse_id]) || "unknown";
      if (!branchData[branchId]) return;
      branchData[branchId].invoiceCount++;
      const total = inv.total || 0;
      if (inv.pattern_type === "مبيعات") branchData[branchId].sales += total;
      else if (inv.pattern_type === "مشتريات") branchData[branchId].purchases += total;
      else if (inv.pattern_type === "مرتجع مبيعات") branchData[branchId].salesReturn += total;
      else if (inv.pattern_type === "مرتجع مشتريات") branchData[branchId].purchasesReturn += total;
    });

    let rows = Object.values(branchData).filter(b => b.invoiceCount > 0 || b.id !== "unknown");
    if (selectedBranch !== "all") rows = rows.filter(b => b.id === selectedBranch);

    rows = rows.map(b => ({
      ...b,
      netSales: b.sales - b.salesReturn,
      profit: (b.sales - b.salesReturn) - (b.purchases - b.purchasesReturn),
    }));

    const totals = rows.reduce((acc, b) => ({
      sales: acc.sales + b.sales,
      purchases: acc.purchases + b.purchases,
      netSales: acc.netSales + b.netSales,
      profit: acc.profit + b.profit,
    }), { sales: 0, purchases: 0, netSales: 0, profit: 0 });

    setReport({ rows, totals });
  }

  const fmt = v => (v || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"/></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تقرير الفروع والمعارض</h1>
        <p className="text-muted-foreground text-sm mt-1">تقارير مالية مجمعة ومفصلة لكل فرع</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">الفرع</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-9"><SelectValue placeholder="كل الفروع"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفروع</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">من تاريخ</Label>
              <Input className="h-9" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input className="h-9" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}/>
            </div>
            <Button onClick={generate}>عرض التقرير</Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "إجمالي المبيعات", value: fmt(report.totals.sales), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
              { label: "إجمالي المشتريات", value: fmt(report.totals.purchases), icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "صافي المبيعات", value: fmt(report.totals.netSales), icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "إجمالي الأرباح", value: fmt(report.totals.profit), icon: report.totals.profit >= 0 ? TrendingUp : TrendingDown, color: report.totals.profit >= 0 ? "text-green-600" : "text-red-500", bg: report.totals.profit >= 0 ? "bg-green-50" : "bg-red-50" },
            ].map((kpi, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                      <kpi.icon className={`h-5 w-5 ${kpi.color}`}/>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart */}
          {report.rows.length > 1 && (
            <Card>
              <CardHeader><CardTitle className="text-base">مقارنة الفروع</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={report.rows} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
                    <YAxis tick={{ fontSize: 11 }}/>
                    <Tooltip formatter={v => v.toLocaleString()}/>
                    <Legend/>
                    <Bar dataKey="sales" name="المبيعات" fill="#2563eb" radius={[4,4,0,0]}/>
                    <Bar dataKey="purchases" name="المشتريات" fill="#f59e0b" radius={[4,4,0,0]}/>
                    <Bar dataKey="profit" name="الربح" fill="#10b981" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Detailed Table */}
          <Card>
            <CardHeader><CardTitle className="text-base">تفاصيل كل فرع</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-right px-4 py-3 text-xs font-semibold">الفرع</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">المبيعات</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">مرتجع مبيعات</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">صافي المبيعات</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">المشتريات</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">مرتجع مشتريات</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الربح/الخسارة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((b, i) => (
                      <tr key={b.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        <td className="px-4 py-3 font-medium">
                          <div>{b.name}</div>
                          <div className="text-xs text-muted-foreground">{b.code}</div>
                        </td>
                        <td className="px-4 py-3 text-green-600">{fmt(b.sales)}</td>
                        <td className="px-4 py-3 text-orange-500">{fmt(b.salesReturn)}</td>
                        <td className="px-4 py-3 font-semibold text-blue-600">{fmt(b.netSales)}</td>
                        <td className="px-4 py-3 text-amber-600">{fmt(b.purchases)}</td>
                        <td className="px-4 py-3 text-orange-400">{fmt(b.purchasesReturn)}</td>
                        <td className={`px-4 py-3 font-bold ${b.profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {fmt(b.profit)}
                          <Badge variant={b.profit >= 0 ? "default" : "destructive"} className="mr-2 text-xs">
                            {b.profit >= 0 ? "ربح" : "خسارة"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-bold border-t-2">
                      <td className="px-4 py-3">الإجمالي</td>
                      <td className="px-4 py-3 text-green-600">{fmt(report.totals.sales)}</td>
                      <td className="px-4 py-3"/>
                      <td className="px-4 py-3 text-blue-600">{fmt(report.totals.netSales)}</td>
                      <td className="px-4 py-3 text-amber-600">{fmt(report.totals.purchases)}</td>
                      <td className="px-4 py-3"/>
                      <td className={`px-4 py-3 ${report.totals.profit >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(report.totals.profit)}</td>
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
          اختر الفرع والفترة الزمنية ثم اضغط عرض التقرير
        </div>
      )}
    </div>
  );
}