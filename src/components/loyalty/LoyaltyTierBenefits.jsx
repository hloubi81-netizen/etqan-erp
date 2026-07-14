import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Award, Medal, Gem, Users } from "lucide-react";

const TIERS = [
  { name: "برونزي", icon: Award, color: "bg-amber-100 text-amber-800", border: "border-amber-200", threshold: 0, key: null },
  { name: "فضي", icon: Medal, color: "bg-gray-100 text-gray-700", border: "border-gray-300", threshold: "silver_threshold", key: "silver_discount" },
  { name: "ذهبي", icon: Crown, color: "bg-yellow-100 text-yellow-800", border: "border-yellow-200", threshold: "gold_threshold", key: "gold_discount" },
  { name: "بلاتيني", icon: Gem, color: "bg-purple-100 text-purple-800", border: "border-purple-200", threshold: "platinum_threshold", key: "platinum_discount" },
];

export default function LoyaltyTierBenefits() {
  const [clients, setClients] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([
        base44.entities.LoyaltyPoints.list("-created_date", 500).catch(() => []),
        base44.entities.PointsSettings.list().then(r => r[0] || null),
      ]);
      setClients(c);
      setSettings(s);
      setLoading(false);
    })();
  }, []);

  const countForTier = (name) => {
    const s = settings || {};
    const tierOf = (p) => {
      if (p >= (s.platinum_threshold || 5000)) return "بلاتيني";
      if (p >= (s.gold_threshold || 1500)) return "ذهبي";
      if (p >= (s.silver_threshold || 500)) return "فضي";
      return "برونزي";
    };
    return clients.filter(c => tierOf(c.available_points || 0) === name).length;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> توزيع العملاء على المستويات</h3>
        <p className="text-xs text-muted-foreground mt-0.5">عدد العملاء في كل مستوى وفوائد الخصم التلقائي</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TIERS.map(t => {
            const count = countForTier(t.name);
            const discount = t.key ? (settings?.[t.key] || 0) : 0;
            const threshold = t.threshold ? (settings?.[t.threshold] || 0) : 0;
            return (
              <Card key={t.name} className={`border ${t.border}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={t.color}>{t.name}</Badge>
                    <t.icon className={`h-5 w-5 ${t.color.split(" ")[1]}`} />
                  </div>
                  <p className="text-2xl font-bold">{count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">عميل</p>
                  <div className="mt-2 pt-2 border-t space-y-1">
                    <p className="text-xs flex justify-between"><span className="text-muted-foreground">الحد:</span><span className="font-medium">{threshold.toLocaleString()} نقطة</span></p>
                    <p className="text-xs flex justify-between"><span className="text-muted-foreground">الخصم:</span><span className="font-medium text-green-700">{discount}%</span></p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">آلية عمل الخصومات التلقائية</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• عند وصول العميل للحد المحدد للمستوى يُصنّف تلقائيًا ضمنه بناءً على النقاط المتاحة.</p>
          <p>• يُطبَّق خصم المستوى تلقائيًا على المشتريات المستقبلية (يُمكن تفعيله ضمن قوائم الأسعار ونقطة البيع).</p>
          <p>• اضبط نسب الخصم لكل مستوى من تبويب «الإعدادات».</p>
        </CardContent>
      </Card>
    </div>
  );
}