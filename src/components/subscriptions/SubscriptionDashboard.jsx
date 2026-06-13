import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Building2, AlertTriangle, CheckCircle2, XCircle, Clock, Users, Bell, TrendingUp, RefreshCw, Gift, ArrowUpCircle } from "lucide-react";
import { PLAN_PRESETS } from "@/hooks/useSubscription.jsx";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import PaymentRequestDialog from "@/components/subscriptions/PaymentRequestDialog";

const PLAN_ICONS = { free_trial: Gift, basic: Zap, advanced: Crown, enterprise: Building2 };

function getDaysLeft(endDate) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function ExpiryBadge({ daysLeft }) {
  if (daysLeft === null) return <span className="text-xs text-muted-foreground">غير محدد</span>;
  if (daysLeft < 0) return <Badge className="bg-red-100 text-red-700 border-0 text-xs">منتهي</Badge>;
  if (daysLeft === 0) return <Badge className="bg-red-100 text-red-700 border-0 text-xs">ينتهي اليوم</Badge>;
  if (daysLeft <= 7) return <Badge className="bg-red-50 text-red-600 border-red-200 text-xs">{daysLeft} أيام</Badge>;
  if (daysLeft <= 30) return <Badge className="bg-orange-50 text-orange-600 border-orange-200 text-xs">{daysLeft} يوم</Badge>;
  return <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">{daysLeft} يوم</Badge>;
}

const PLAN_ORDER = { free_trial: 0, basic: 1, advanced: 2, enterprise: 3 };
const UPGRADE_OPTIONS = {
  free_trial: ["basic", "advanced", "enterprise"],
  basic: ["advanced", "enterprise"],
  advanced: ["enterprise"],
  enterprise: [],
};

export default function SubscriptionDashboard({ subscriptions, onRefresh }) {
  const today = new Date();
  const [upgradeDialog, setUpgradeDialog] = useState({ open: false, planKey: null, sub: null });

  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.is_active);
    const expired = subscriptions.filter(s => s.end_date && getDaysLeft(s.end_date) < 0);
    const expiringSoon = subscriptions.filter(s => {
      const d = getDaysLeft(s.end_date);
      return d !== null && d >= 0 && d <= 30 && s.is_active;
    });
    const critical = subscriptions.filter(s => {
      const d = getDaysLeft(s.end_date);
      return d !== null && d >= 0 && d <= 7 && s.is_active;
    });

    const byPlan = Object.keys(PLAN_PRESETS).reduce((acc, k) => {
      acc[k] = active.filter(s => s.plan === k).length;
      return acc;
    }, {});

    return { total: subscriptions.length, active: active.length, expired: expired.length, expiringSoon, critical, byPlan };
  }, [subscriptions]);

  // ترتيب الاشتراكات القريبة من الانتهاء
  const alertList = useMemo(() => {
    return subscriptions
      .filter(s => s.is_active && s.end_date)
      .map(s => ({ ...s, daysLeft: getDaysLeft(s.end_date) }))
      .filter(s => s.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [subscriptions]);

  async function sendRenewalReminder(sub) {
    toast.promise(
      base44.entities.Notification.create({
        title: `تذكير تجديد اشتراك: ${sub.client_name}`,
        message: `اشتراك ${sub.client_name} سينتهي خلال ${getDaysLeft(sub.end_date)} يوم (${sub.end_date}). يرجى التواصل مع العميل لتجديد الاشتراك.`,
        type: "تذكير",
        related_module: "الاشتراكات",
        related_id: sub.id,
        is_read: false,
        trigger_date: new Date().toISOString().split("T")[0],
      }),
      { loading: "جارٍ إرسال التذكير...", success: "تم إنشاء تنبيه التجديد", error: "فشل الإرسال" }
    );
  }

  async function sendAllReminders() {
    const critical = alertList.filter(s => s.daysLeft <= 7);
    if (critical.length === 0) return toast.info("لا توجد اشتراكات حرجة اليوم");
    for (const sub of critical) await sendRenewalReminder(sub);
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي العملاء</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">اشتراكات نشطة</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">تنتهي خلال 30 يوم</p>
                <p className="text-2xl font-bold text-orange-600">{stats.expiringSoon.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">حرجة (7 أيام)</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(PLAN_PRESETS).map(([key, preset]) => {
          const Icon = PLAN_ICONS[key];
          const count = stats.byPlan[key] || 0;
          const pct = stats.active > 0 ? Math.round((count / stats.active) * 100) : 0;
          const colors = { free_trial: "bg-amber-500", basic: "bg-blue-500", advanced: "bg-purple-500", enterprise: "bg-emerald-500" };
          const lightColors = { free_trial: "bg-amber-50", basic: "bg-blue-50", advanced: "bg-purple-50", enterprise: "bg-emerald-50" };
          const textColors = { free_trial: "text-amber-600", basic: "text-blue-600", advanced: "text-purple-600", enterprise: "text-emerald-600" };
          return (
            <Card key={key} className={lightColors[key]}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${textColors[key]}`} />
                    <span className="font-semibold text-sm">{preset.label}</span>
                  </div>
                  <span className={`text-2xl font-bold ${textColors[key]}`}>{count}</span>
                </div>
                <div className="w-full bg-white/60 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${colors[key]}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct}% من النشطة</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alerts Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              تنبيهات الاشتراكات القريبة من الانتهاء
              {alertList.length > 0 && <Badge className="bg-orange-100 text-orange-700 border-0">{alertList.length}</Badge>}
            </CardTitle>
            {alertList.length > 0 && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={sendAllReminders}>
                <Bell className="h-3.5 w-3.5" />
                إرسال تذكيرات الحرجة
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {alertList.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="text-sm">جميع الاشتراكات بعيدة عن انتهاء الصلاحية</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertList.map(sub => {
                const Icon = PLAN_ICONS[sub.plan] || Zap;
                const preset = PLAN_PRESETS[sub.plan];
                const isExpired = sub.daysLeft < 0;
                const isCritical = sub.daysLeft >= 0 && sub.daysLeft <= 7;
                const rowBg = isExpired ? "bg-red-50 border-red-200" : isCritical ? "bg-orange-50 border-orange-200" : "bg-yellow-50 border-yellow-200";
                return (
                  <div key={sub.id} className={`flex items-center justify-between p-3 rounded-lg border ${rowBg}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isExpired ? "bg-red-100" : isCritical ? "bg-orange-100" : "bg-yellow-100"}`}>
                        {isExpired ? <XCircle className="h-4 w-4 text-red-600" /> : isCritical ? <AlertTriangle className="h-4 w-4 text-orange-600" /> : <Clock className="h-4 w-4 text-yellow-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{sub.client_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{preset?.label}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">ينتهي: {sub.end_date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ExpiryBadge daysLeft={sub.daysLeft} />
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2" onClick={() => sendRenewalReminder(sub)}>
                        <Bell className="h-3 w-3" />
                        تذكير
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Subscriptions Status Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              حالة جميع الاشتراكات
            </CardTitle>
            <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-right px-4 py-3 text-xs font-semibold">العميل</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">الخطة الحالية</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">البداية</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">الانتهاء</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">المتبقي</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">الحالة</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">الترقية / الاشتراك</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s, i) => {
                  const Icon = PLAN_ICONS[s.plan] || Zap;
                  const preset = PLAN_PRESETS[s.plan];
                  const daysLeft = getDaysLeft(s.end_date);
                  const upgradeOptions = UPGRADE_OPTIONS[s.plan] || [];
                  const isExpiredOrSoon = daysLeft !== null && daysLeft <= 30;
                  return (
                    <tr key={s.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                      <td className="px-4 py-3 font-medium">{s.client_name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Icon className="h-3 w-3" />{preset?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.start_date || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.end_date || "—"}</td>
                      <td className="px-4 py-3"><ExpiryBadge daysLeft={daysLeft} /></td>
                      <td className="px-4 py-3">
                        {s.is_active
                          ? <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">نشط</Badge>
                          : <Badge variant="secondary" className="text-xs">متوقف</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {/* زر تجديد نفس الباقة إذا كانت قريبة الانتهاء أو منتهية */}
                          {isExpiredOrSoon && s.plan !== "free_trial" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() => setUpgradeDialog({ open: true, planKey: s.plan, sub: s })}
                            >
                              <RefreshCw className="h-3 w-3" />
                              تجديد
                            </Button>
                          )}
                          {/* أزرار الترقية للباقات الأعلى */}
                          {upgradeOptions.map(planKey => (
                            <Button
                              key={planKey}
                              size="sm"
                              className={`h-7 text-xs gap-1 text-white ${
                                planKey === "basic" ? "bg-blue-600 hover:bg-blue-700" :
                                planKey === "advanced" ? "bg-purple-600 hover:bg-purple-700" :
                                "bg-emerald-600 hover:bg-emerald-700"
                              }`}
                              onClick={() => setUpgradeDialog({ open: true, planKey, sub: s })}
                            >
                              <ArrowUpCircle className="h-3 w-3" />
                              {PLAN_PRESETS[planKey]?.label}
                            </Button>
                          ))}
                          {upgradeOptions.length === 0 && !isExpiredOrSoon && (
                            <span className="text-xs text-muted-foreground">أعلى باقة</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment/Upgrade Dialog */}
      {upgradeDialog.open && upgradeDialog.planKey && (
        <PaymentRequestDialog
          open={upgradeDialog.open}
          onOpenChange={(v) => setUpgradeDialog(d => ({ ...d, open: v }))}
          planKey={upgradeDialog.planKey}
          user={{ full_name: upgradeDialog.sub?.client_name, email: "", id: "" }}
        />
      )}
    </div>
  );
}