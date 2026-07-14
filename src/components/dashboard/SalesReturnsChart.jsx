import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Undo2 } from "lucide-react";

const DAYS = 7;

export default function SalesReturnsChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const invoices = await base44.entities.Invoice.list("-date", 200).catch(() => []);
        // بناء آخر N أيام
        const today = new Date();
        const days = [];
        for (let i = DAYS - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split("T")[0];
          days.push({
            key,
            label: d.toLocaleDateString("ar-EG", { day: "numeric", month: "numeric" }),
            sales: 0,
            returns: 0,
          });
        }
        const map = Object.fromEntries(days.map(d => [d.key, d]));
        for (const inv of invoices) {
          const d = (inv.date || "").slice(0, 10);
          if (!map[d]) continue;
          if (inv.pattern_type === "مبيعات") map[d].sales += inv.total || 0;
          else if (inv.pattern_type === "مرتجع مبيعات") map[d].returns += inv.total || 0;
        }
        setData(days);
      } catch (e) {
        // تجاهل
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalSales = data.reduce((s, d) => s + d.sales, 0);
  const totalReturns = data.reduce((s, d) => s + d.returns, 0);
  const net = totalSales - totalReturns;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          المبيعات اليومية مقابل المرتجعات
          <span className="text-xs font-normal text-muted-foreground">(آخر {DAYS} أيام)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[260px] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ملخص */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-lg bg-blue-50 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-blue-700 mb-0.5">
                  <TrendingUp className="h-3 w-3" /> مبيعات
                </div>
                <p className="text-sm font-bold text-blue-700">{totalSales.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-orange-700 mb-0.5">
                  <Undo2 className="h-3 w-3" /> مرتجعات
                </div>
                <p className="text-sm font-bold text-orange-700">{totalReturns.toLocaleString()}</p>
              </div>
              <div className={`rounded-lg p-2.5 text-center ${net >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <div className={`text-xs mb-0.5 ${net >= 0 ? "text-green-700" : "text-red-700"}`}>صافي</div>
                <p className={`text-sm font-bold ${net >= 0 ? "text-green-700" : "text-red-700"}`}>{net.toLocaleString()}</p>
              </div>
            </div>

            {/* الرسم البياني */}
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: 12,
                    }}
                    formatter={(v) => v.toLocaleString()}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sales" name="مبيعات" fill="hsl(217 91% 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="returns" name="مرتجعات" fill="hsl(24 90% 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}