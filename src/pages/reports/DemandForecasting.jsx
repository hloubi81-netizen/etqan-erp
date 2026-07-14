import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, TrendingUp, TrendingDown, Minus, RefreshCw, Package, Sparkles } from "lucide-react";

const trendIcon = (t) => {
  if (!t) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  if (/صاعد|up/i.test(t)) return <TrendingUp className="h-3.5 w-3.5 text-green-600" />;
  if (/هابط|down/i.test(t)) return <TrendingDown className="h-3.5 w-3.5 text-red-600" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

export default function DemandForecasting() {
  const [rows, setRows] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const load = async () => {
    setLoading(true);
    const invoices = await base44.entities.Invoice.list("-date", 200).catch(() => []);
    const sales = invoices.filter(i => i.pattern_type === "مبيعات");
    const cutoff = Date.now() - 90 * 86400000;
    const byProduct = {};
    for (const inv of sales) {
      const d = inv.date ? new Date(inv.date).getTime() : 0;
      if (d < cutoff) continue;
      for (const it of inv.items || []) {
        const key = it.product_id || it.product_name || "غير محدد";
        if (!byProduct[key]) byProduct[key] = { product_name: it.product_name || "غير محدد", total_qty: 0, total_value: 0, days: new Set() };
        byProduct[key].total_qty += it.quantity || 0;
        byProduct[key].total_value += it.total || 0;
        if (inv.date) byProduct[key].days.add(inv.date.slice(0, 10));
      }
    }
    const arr = Object.values(byProduct).map(p => ({
      product_name: p.product_name,
      total_qty: p.total_qty,
      total_value: p.total_value,
      dayCount: p.days.size || 1,
      avg_daily_qty: p.total_qty / (p.days.size || 1),
    })).sort((a, b) => b.total_value - a.total_value).slice(0, 15);
    setRows(arr);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAnalyzing(true);
    setForecast(null);
    try {
      const payload = rows.map(r => ({ product: r.product_name, sold_90d: Math.round(r.total_qty), avg_daily: Number(r.avg_daily_qty.toFixed(1)) }));
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `أنت محلل مبيعات متخصص. بناءً على بيانات مبيعات آخر 90 يومًا التالية (الكمية المباعة ومتوسط البيع اليومي)، قدم لكل منتج: توقع الكمية المتوقع بيعها خلال 30 يومًا القادمة، الاتجاه (صاعد/هابط/مستقر)، وتوصية إعادة التموين (كمية مقترحة لطلب إعادة المخزون).\n\nالبيانات:\n${JSON.stringify(payload)}`,
        response_json_schema: {
          type: "object",
          properties: {
            forecasts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product: { type: "string" },
                  forecast_30d: { type: "number" },
                  trend: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            }
          }
        }
      });
      setForecast(res);
    } catch (e) {
      setForecast({ error: e.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const fmt = (n) => (n || 0).toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            التنبؤ بالطلب (AI)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">تحليل مبيعات آخر 90 يومًا وتوقع الطلب لـ30 يومًا قادمة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button size="sm" onClick={runAI} disabled={analyzing || loading || rows.length === 0} className="gap-1.5">
            <Sparkles className={`h-3.5 w-3.5 ${analyzing ? "animate-spin" : ""}`} />
            {analyzing ? "جارٍ التحليل..." : "تشغيل التنبؤ الذكي"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">أفضل المنتجات مبيعًا (آخر 90 يومًا)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات مبيعات كافية للتحليل</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="text-right py-2 px-2 font-medium">المنتج</th>
                    <th className="text-right py-2 px-2 font-medium">مباع (90 يوم)</th>
                    <th className="text-right py-2 px-2 font-medium">متوسط يومي</th>
                    <th className="text-right py-2 px-2 font-medium">قيمة المبيعات</th>
                    <th className="text-right py-2 px-2 font-medium">توقع 30 يوم (AI)</th>
                    <th className="text-right py-2 px-2 font-medium">الاتجاه</th>
                    <th className="text-right py-2 px-2 font-medium">توصية إعادة التموين</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const fc = forecast?.forecasts?.find(f => f.product === r.product_name || (f.product && r.product_name.includes(f.product)));
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 px-2"><span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-muted-foreground" />{r.product_name}</span></td>
                        <td className="py-2.5 px-2 font-medium">{fmt(r.total_qty)}</td>
                        <td className="py-2.5 px-2 text-muted-foreground">{r.avg_daily_qty.toFixed(1)}</td>
                        <td className="py-2.5 px-2">{fmt(r.total_value)}</td>
                        <td className="py-2.5 px-2">{fc ? <span className="font-semibold text-primary">{fmt(fc.forecast_30d)}</span> : "—"}</td>
                        <td className="py-2.5 px-2">{fc ? trendIcon(fc.trend) : "—"}</td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground max-w-[220px]">{fc?.recommendation || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {forecast?.error && (
        <Card><CardContent className="p-4 text-sm text-destructive">تعذر تشغيل التنبؤ: {forecast.error}</CardContent></Card>
      )}
      {forecast && !forecast.error && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Badge variant="secondary" className="gap-1"><BrainCircuit className="h-3 w-3" /> تنبؤ ذكي</Badge>
          النتائج أعلاه مولّدة بواسطة الذكاء الاصطناعي بناءً على أنماط البيع الفعلية — يُنصح بمراجعتها قبل اتخاذ قرارات الشراء.
        </div>
      )}
    </div>
  );
}