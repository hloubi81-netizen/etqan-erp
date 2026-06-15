import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";
import { GitBranch, TrendingUp, TrendingDown, DollarSign, Receipt, Banknote } from "lucide-react";

const COLORS = ["#2563eb","#16a34a","#9333ea","#ea580c","#0891b2","#dc2626","#65a30d","#d97706"];
const PROFIT_COLORS = {
  high: "#16a34a",
  medium: "#d97706",
  low: "#dc2626",
};

function fmtlarge(n) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "م";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "ك";
  return n.toFixed(0);
}

export default function BranchMonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [branches, setBranches] = useState([]);

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
      const [inv, vch, brs] = await Promise.all([
        base44.entities.Invoice.list("-date", 1000).catch(() => []),
        base44.entities.Voucher.list("-date", 1000).catch(() => []),
        base44.entities.Branch.list().catch(() => []),
      ]);
      setInvoices(inv);
      setVouchers(vch);
      setBranches(brs);
      setLoading(false);
    };
    load();
  }, []);

  const branchData = useMemo(() => {
    const prefix = `${year}-${month}`;

    // Filter invoices to selected month
    const monthInvoices = invoices.filter(inv => inv.date && inv.date.startsWith(prefix));

    // Filter vouchers to selected month (payment and daily = expenses)
    const monthVouchers = vouchers.filter(
      v => v.date && v.date.startsWith(prefix) && (v.type === "سند دفع" || v.type === "سند يومية" || v.type === "سند قيد")
    );

    const branchMap = {};

    // Initialize all branches
    branches.forEach(b => {
      branchMap[b.id] = {
        id: b.id,
        name: b.name || "فرع غير مسمى",
        sales: 0, salesReturns: 0, purchases: 0, purchaseReturns: 0,
        expenses: 0, revenue: 0, costs: 0, profit: 0,
        salesCount: 0, purchaseCount: 0, expenseCount: 0,
      };
    });

    // Add unknown branch
    branchMap["__none__"] = {
      id: "__none__", name: "غير محدد",
      sales: 0, salesReturns: 0, purchases: 0, purchaseReturns: 0,
      expenses: 0, revenue: 0, costs: 0, profit: 0,
      salesCount: 0, purchaseCount: 0, expenseCount: 0,
    };

    // Process invoices by branch
    monthInvoices.forEach(inv => {
      const key = inv.branch_id && branchMap[inv.branch_id] ? inv.branch_id : "__none__";
      const amount = inv.total || 0;

      if (inv.pattern_type === "مبيعات") {
        branchMap[key].sales += amount;
        branchMap[key].salesCount += 1;
      } else if (inv.pattern_type === "مرتجع مبيعات") {
        branchMap[key].salesReturns += amount;
      } else if (inv.pattern_type === "مشتريات") {
        branchMap[key].purchases += amount;
        branchMap[key].purchaseCount += 1;
      } else if (inv.pattern_type === "مرتجع مشتريات") {
        branchMap[key].purchaseReturns += amount;
      }
    });

    // Process vouchers (expenses) by branch
    // Vouchers don't have branch_id directly, so we try to match via cost_center or account
    monthVouchers.forEach(v => {
      // Try to assign expenses to branches - check if voucher has branch context
      // For now, we'll check if voucher entries reference branch-related accounts
      const amount = v.amount || 0;
      const debitTotal = v.total_debit || 0;
      const expenseAmount = amount || debitTotal || 0;

      // Try to find branch from voucher context
      if (v.cost_center_id) {
        const br = branches.find(b => b.id === v.cost_center_id);
        if (br && branchMap[br.id]) {
          branchMap[br.id].expenses += expenseAmount;
          branchMap[br.id].expenseCount += 1;
          return;
        }
      }
      // If no branch match, assign to "غير محدد"
      branchMap["__none__"].expenses += expenseAmount;
      branchMap["__none__"].expenseCount += 1;
    });

    // Calculate final metrics
    Object.values(branchMap).forEach(b => {
      b.revenue = b.sales - b.salesReturns;
      b.costs = b.purchases - b.purchaseReturns + b.expenses;
      b.profit = b.revenue - b.costs;
    });

    // Sort by profit
    const result = Object.values(branchMap)
      .filter(b => b.sales > 0 || b.purchases > 0 || b.expenses > 0)
      .sort((a, b) => b.profit - a.profit);

    return result;
  }, [invoices, vouchers, branches, year, month]);

  const totals = useMemo(() => {
    return branchData.reduce((acc, b) => ({
      revenue: acc.revenue + b.revenue,
      costs: acc.costs + b.costs,
      profit: acc.profit + b.profit,
    }), { revenue: 0, costs: 0, profit: 0 });
  }, [branchData]);

  const pieData = useMemo(() => {
    return branchData.slice(0, 6).map(b => ({
      name: b.name,
      value: Math.max(0, b.profit),
    }));
  }, [branchData]);

  const getProfitColor = (profit) => {
    if (profit > 10000) return PROFIT_COLORS.high;
    if (profit > 0) return PROFIT_COLORS.medium;
    return PROFIT_COLORS.low;
  };

  const profitBg = totals.profit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200";
  const profitText = totals.profit >= 0 ? "text-green-700" : "text-red-700";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <GitBranch className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-semibold">تحليل صافي أرباح الفروع</CardTitle>
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
        ) : branchData.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <TrendingUp className="h-8 w-8 opacity-30" />
            <p className="text-sm">لا توجد بيانات مالية في هذا الشهر</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-600 font-medium">الإيرادات</p>
                  <p className="text-base font-bold text-blue-700">{totals.revenue.toLocaleString("ar-SA")} ر.س</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-600 flex items-center justify-center">
                  <Banknote className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-amber-600 font-medium">التكاليف والمصروفات</p>
                  <p className="text-base font-bold text-amber-700">{totals.costs.toLocaleString("ar-SA")} ر.س</p>
                </div>
              </div>
              <div className={`rounded-xl p-3 flex items-center gap-3 border ${profitBg}`}>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${totals.profit >= 0 ? "bg-green-600" : "bg-red-600"}`}>
                  {totals.profit >= 0
                    ? <TrendingUp className="h-4 w-4 text-white" />
                    : <TrendingDown className="h-4 w-4 text-white" />}
                </div>
                <div>
                  <p className={`text-[10px] font-medium ${profitText}`}>صافي الربح</p>
                  <p className={`text-base font-bold ${profitText}`}>{totals.profit.toLocaleString("ar-SA")} ر.س</p>
                </div>
              </div>
            </div>

            {/* Bar chart + Pie chart */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={branchData} layout="vertical" margin={{ right: 50, left: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtlarge} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip
                      formatter={(v, name) => [v.toLocaleString("ar-SA") + " ر.س", name === "profit" ? "صافي الربح" : name === "revenue" ? "الإيرادات" : "التكاليف"]}
                      contentStyle={{ fontSize: 12, direction: "rtl" }}
                    />
                    <Bar dataKey="revenue" stackId="a" fill="#93c5fd" radius={[0, 0, 0, 0]} name="الإيرادات" />
                    <Bar dataKey="costs" stackId="a" fill="#fca5a5" radius={[0, 2, 2, 0]} name="التكاليف" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-2">
                {pieData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        innerRadius={35}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [v.toLocaleString("ar-SA") + " ر.س", "صافي الربح"]}
                        contentStyle={{ fontSize: 11, direction: "rtl" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">لا توجد أرباح موجبة</p>
                  </div>
                )}
              </div>
            </div>

            {/* Branch detail table */}
            <div className="divide-y divide-border rounded-lg border overflow-hidden">
              {/* Header */}
              <div className="flex items-center bg-muted/50 px-3 py-2 text-[10px] font-semibold text-muted-foreground">
                <span className="flex-1">الفرع</span>
                <span className="w-20 text-center hidden sm:block">المبيعات</span>
                <span className="w-20 text-center hidden sm:block">مرتجعات</span>
                <span className="w-20 text-center hidden sm:block">المشتريات</span>
                <span className="w-20 text-center">المصروفات</span>
                <span className="w-20 text-center">صافي الربح</span>
              </div>

              {branchData.map((b, i) => {
                const pct = totals.revenue > 0 ? ((b.profit / Math.abs(totals.profit || 1)) * 100) : 0;
                return (
                  <div key={b.id || i} className="flex items-center px-3 py-2.5 bg-card hover:bg-muted/20 transition-colors text-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="truncate font-medium">{b.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        ({b.salesCount + b.purchaseCount} عمليات)
                      </span>
                    </div>
                    <span className="w-20 text-center hidden sm:block font-medium text-blue-600">{fmtlarge(b.sales)}</span>
                    <span className="w-20 text-center hidden sm:block font-medium text-orange-500">{b.salesReturns > 0 ? fmtlarge(b.salesReturns) : "—"}</span>
                    <span className="w-20 text-center hidden sm:block font-medium text-green-600">{b.purchases > 0 ? fmtlarge(b.purchases) : "—"}</span>
                    <span className="w-20 text-center font-medium text-amber-600">{b.expenses > 0 ? fmtlarge(b.expenses) : "—"}</span>
                    <span className="w-20 text-center">
                      <Badge
                        className="text-[10px] font-bold"
                        style={{
                          backgroundColor: b.profit >= 0 ? "#dcfce7" : "#fee2e2",
                          color: b.profit >= 0 ? "#166534" : "#991b1b",
                          border: "none"
                        }}
                      >
                        {b.profit.toLocaleString("ar-SA")}
                      </Badge>
                    </span>
                  </div>
                );
              })}

              {/* Totals row */}
              <div className="flex items-center px-3 py-2.5 bg-muted/40 font-semibold text-xs">
                <span className="flex-1">الإجمالي</span>
                <span className="w-20 text-center hidden sm:block text-blue-700">{fmtlarge(totals.revenue)}</span>
                <span className="w-20 text-center hidden sm:block">—</span>
                <span className="w-20 text-center hidden sm:block">—</span>
                <span className="w-20 text-center text-amber-700">{fmtlarge(totals.costs)}</span>
                <span className={`w-20 text-center font-bold ${totals.profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {totals.profit.toLocaleString("ar-SA")}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}