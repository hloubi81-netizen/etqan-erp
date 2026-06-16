import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

const CHART_COLORS = {
  cost: "#3b82f6",
  retail: "#22c55e",
};

export default function InventoryBranchChart() {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [prods, brs] = await Promise.all([
        base44.entities.Product.list("-updated_date", 2000),
        base44.entities.Branch.list(),
      ]);
      if (!cancelled) {
        setProducts(prods);
        setBranches(brs);
        setLoading(false);
      }
    }

    init();

    // Real-time subscription
    const unsubscribe = base44.entities.Product.subscribe(() => {
      base44.entities.Product.list("-updated_date", 2000).then(prods => {
        if (!cancelled) setProducts(prods);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const chartData = useMemo(() => {
    const branchMap = {};

    products.forEach(p => {
      if (p.is_service) return; // skip services
      const branchId = p.branch_id || "no_branch";
      const branchName = p.branch_name || "عام";

      if (!branchMap[branchId]) {
        branchMap[branchId] = {
          name: branchName,
          costValue: 0,
          retailValue: 0,
          itemCount: 0,
        };
      }

      const qty = p.available_qty || 0;
      branchMap[branchId].costValue += qty * (p.cost_price || 0);
      branchMap[branchId].retailValue += qty * (p.retail_price || 0);
      branchMap[branchId].itemCount += 1;
    });

    return Object.values(branchMap)
      .sort((a, b) => b.costValue - a.costValue);
  }, [products]);

  const totals = useMemo(() => {
    const totalCost = chartData.reduce((s, d) => s + d.costValue, 0);
    const totalRetail = chartData.reduce((s, d) => s + d.retailValue, 0);
    return { totalCost, totalRetail };
  }, [chartData]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">القيمة المالية للمخزون حسب الفرع</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">القيمة المالية للمخزون حسب الفرع</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">لا توجد بيانات مخزون للعرض</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatEGP = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ج.م`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K ج.م`;
    return `${value.toLocaleString()} ج.م`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 text-sm" dir="rtl">
        <p className="font-bold text-gray-800 dark:text-gray-200 mb-2">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600 dark:text-gray-400">{entry.name}</span>
            </div>
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {entry.value.toLocaleString()} ج.م
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">القيمة المالية للمخزون حسب الفرع</CardTitle>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-muted-foreground">قيمة التكلفة:</span>
              <span className="font-bold text-blue-600">{totals.totalCost.toLocaleString()} ج.م</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-green-500" />
              <span className="text-muted-foreground">قيمة البيع:</span>
              <span className="font-bold text-green-600">{totals.totalRetail.toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={formatEGP}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 12, fill: "#334155", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
            <Legend
              formatter={(value) => (
                <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
              )}
            />
            <Bar
              dataKey="costValue"
              name="قيمة التكلفة"
              fill={CHART_COLORS.cost}
              radius={[0, 4, 4, 0]}
              barSize={28}
            >
              {chartData.map((entry, idx) => (
                <Cell key={`cost-${idx}`} fill={CHART_COLORS.cost} fillOpacity={0.85} />
              ))}
            </Bar>
            <Bar
              dataKey="retailValue"
              name="قيمة البيع"
              fill={CHART_COLORS.retail}
              radius={[0, 4, 4, 0]}
              barSize={28}
            >
              {chartData.map((entry, idx) => (
                <Cell key={`retail-${idx}`} fill={CHART_COLORS.retail} fillOpacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}