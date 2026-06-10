import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Building2, Users, Layers, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SubscriptionSummary() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.subscription_id) { setLoading(false); return; }
    const sid = user.subscription_id;

    Promise.all([
      base44.entities.Employee.filter({ subscription_id: sid }).catch(() => []),
      base44.entities.FixedAsset.filter({ subscription_id: sid }).catch(() => []),
    ]).then(([employees, assets]) => {
      const activeEmployees = employees.filter(e => e.status === "نشط");
      const totalAssetCost = assets.reduce((s, a) => s + (a.purchase_cost || 0), 0);
      const netBookValue = assets.reduce((s, a) => s + (a.net_book_value || 0), 0);

      setData({
        totalEmployees: employees.length,
        activeEmployees: activeEmployees.length,
        totalAssets: assets.length,
        totalAssetCost,
        netBookValue,
      });
      setLoading(false);
    });
  }, [user]);

  if (!user?.subscription_id) return null;

  const fmt = (n) => new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(n || 0);

  const cards = [
    {
      icon: Users,
      label: "إجمالي الموظفين",
      value: loading ? "..." : fmt(data?.totalEmployees),
      sub: loading ? "" : `${fmt(data?.activeEmployees)} موظف نشط`,
      color: "bg-blue-600",
      bg: "bg-blue-50",
      text: "text-blue-700",
    },
    {
      icon: Building2,
      label: "الأصول الثابتة",
      value: loading ? "..." : fmt(data?.totalAssets),
      sub: loading ? "" : `تكلفة: ${fmt(data?.totalAssetCost)}`,
      color: "bg-amber-500",
      bg: "bg-amber-50",
      text: "text-amber-700",
    },
    {
      icon: TrendingUp,
      label: "القيمة الدفترية الصافية",
      value: loading ? "..." : fmt(data?.netBookValue),
      sub: "للأصول الثابتة",
      color: "bg-emerald-600",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
    },
    {
      icon: Layers,
      label: "معرف الاشتراك",
      value: user?.subscription_id?.slice(0, 8) + "...",
      sub: "اشتراك نشط",
      color: "bg-violet-600",
      bg: "bg-violet-50",
      text: "text-violet-700",
    },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          ملخص شركتك
        </CardTitle>
        <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
          بيانات خاصة باشتراكك
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map((c, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${c.bg} border border-transparent`}>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${c.color} shrink-0`}>
                <c.icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                <p className={`text-lg font-bold ${c.text}`}>{c.value}</p>
                {c.sub && <p className="text-[10px] text-muted-foreground truncate">{c.sub}</p>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}