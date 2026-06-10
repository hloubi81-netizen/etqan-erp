import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Building2, Users, Layers, TrendingUp, ShieldCheck, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ROLE_LABELS } from "@/hooks/usePermissions";

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
      base44.functions.invoke('getAllUsers', {}).catch(() => ({ data: { users: [] } })),
    ]).then(([employees, assets, usersRes]) => {
      const activeEmployees = employees.filter(e => e.status === "نشط");
      const totalAssetCost = assets.reduce((s, a) => s + (a.purchase_cost || 0), 0);
      const netBookValue = assets.reduce((s, a) => s + (a.net_book_value || 0), 0);
      const subUsers = (usersRes?.data?.users || []).filter(u => u.subscription_id === sid);
      // count by role
      const roleCounts = {};
      subUsers.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

      setData({
        totalEmployees: employees.length,
        activeEmployees: activeEmployees.length,
        totalAssets: assets.length,
        totalAssetCost,
        netBookValue,
        subUsers,
        roleCounts,
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
      <CardContent className="space-y-4">
        {/* KPI cards */}
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

        {/* Team management panel */}
        {user?.role === "admin" && (
          <div className="border border-violet-200 bg-violet-50/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-800">فريق العمل والصلاحيات</span>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1 border-violet-300 text-violet-700 hover:bg-violet-100">
                <Link to="/users">
                  إدارة الصلاحيات <ChevronLeft className="h-3 w-3" />
                </Link>
              </Button>
            </div>

            {loading ? (
              <div className="flex gap-2">
                {[1,2,3].map(i => <div key={i} className="h-6 w-20 rounded bg-violet-200/60 animate-pulse" />)}
              </div>
            ) : data?.subUsers?.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(data.roleCounts).map(([role, count]) => (
                    <Badge key={role} variant="outline" className="text-[11px] border-violet-300 text-violet-700 bg-white gap-1">
                      {ROLE_LABELS[role] || role}
                      <span className="bg-violet-200 text-violet-800 rounded-full px-1.5 font-bold">{count}</span>
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.subUsers.slice(0, 6).map(u => (
                    <span key={u.id} className="text-[10px] bg-white border border-violet-200 text-violet-700 rounded-full px-2 py-0.5">
                      {u.full_name || u.email?.split("@")[0]}
                      {u.is_active === false && <span className="text-red-400 mr-1">• موقوف</span>}
                    </span>
                  ))}
                  {data.subUsers.length > 6 && (
                    <span className="text-[10px] text-violet-500">+{data.subUsers.length - 6} آخرين</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-violet-600">لا يوجد مستخدمون مرتبطون بهذا الاشتراك بعد.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}