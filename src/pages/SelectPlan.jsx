import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Crown, Zap, Building2, Gift, Sparkles, ArrowLeft } from "lucide-react";
import { PLAN_PRESETS, FEATURE_LABELS } from "@/hooks/useSubscription.jsx";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PLAN_ICONS = { free_trial: Gift, basic: Zap, advanced: Crown, enterprise: Building2 };
const PLAN_COLORS = {
  free_trial: "border-amber-300 bg-amber-50 hover:border-amber-500",
  basic: "border-blue-200 bg-blue-50 hover:border-blue-500",
  advanced: "border-purple-200 bg-purple-50 hover:border-purple-500",
  enterprise: "border-emerald-200 bg-emerald-50 hover:border-emerald-500",
};
const PLAN_BUTTON_COLORS = {
  free_trial: "bg-amber-500 hover:bg-amber-600",
  basic: "bg-blue-600 hover:bg-blue-700",
  advanced: "bg-purple-600 hover:bg-purple-700",
  enterprise: "bg-emerald-600 hover:bg-emerald-700",
};

export default function SelectPlan() {
  const [selected, setSelected] = useState(null);
  const [clientName, setClientName] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  function choosePlan(planKey) {
    setSelected(planKey);
    setShowDialog(true);
  }

  async function confirmSubscription() {
    if (!clientName.trim()) return toast.error("يرجى إدخال اسم الشركة أو المؤسسة");
    setSaving(true);
    const preset = PLAN_PRESETS[selected];
    const startDate = new Date();
    const endDate = new Date();

    if (selected === "free_trial") {
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    await base44.entities.Subscription.create({
      client_name: clientName.trim(),
      plan: selected,
      features: { ...preset.features },
      max_users: preset.max_users,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      is_active: true,
      notes: selected === "free_trial" ? "تجربة مجانية 3 أشهر" : `اشتراك ${preset.label}`,
    });

    toast.success(`🎉 تم تفعيل اشتراك ${preset.label} بنجاح!`);
    setSaving(false);
    setShowDialog(false);
    navigate("/");
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex flex-col items-center justify-center" dir="rtl">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            اختر الباقة المناسبة لعملك
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">ابدأ رحلتك معنا</h1>
          <p className="text-muted-foreground">اختر الباقة التي تناسب احتياجات عملك. يمكنك الترقية في أي وقت.</p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(PLAN_PRESETS).map(([key, preset]) => {
            const Icon = PLAN_ICONS[key];
            const isFreeTrial = key === "free_trial";
            return (
              <Card
                key={key}
                className={`cursor-pointer border-2 transition-all duration-200 ${PLAN_COLORS[key]} ${isFreeTrial ? "ring-2 ring-amber-300 ring-offset-2" : ""}`}
                onClick={() => choosePlan(key)}
              >
                {isFreeTrial && (
                  <div className="bg-amber-500 text-white text-xs font-bold text-center py-1 rounded-t-lg">
                    ⭐ مجاني 3 أشهر كاملة
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-2 rounded-lg ${isFreeTrial ? "bg-amber-100" : "bg-white/70"}`}>
                      <Icon className={`h-5 w-5 ${isFreeTrial ? "text-amber-600" : "text-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{preset.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {isFreeTrial ? "3 أشهر مجاناً" : `حتى ${preset.max_users === 999 ? "غير محدود" : preset.max_users} مستخدم`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {Object.entries(FEATURE_LABELS).map(([fk, fl]) => (
                      <div key={fk} className="flex items-center gap-1.5 text-xs">
                        {preset.features[fk]
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          : <XCircle className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
                        <span className={preset.features[fk] ? "text-foreground" : "text-muted-foreground/50"}>{fl}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`w-full text-xs h-8 text-white ${PLAN_BUTTON_COLORS[key]}`}
                    onClick={(e) => { e.stopPropagation(); choosePlan(key); }}
                  >
                    {isFreeTrial ? "ابدأ مجاناً" : "اختر هذه الباقة"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          بالمتابعة توافق على شروط الاستخدام. يمكنك التواصل مع الإدارة لأي استفسار.
        </p>
      </div>

      {/* Confirmation Dialog */}
      {selected && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => { const Icon = PLAN_ICONS[selected]; return <Icon className="h-5 w-5" />; })()}
                تفعيل باقة {PLAN_PRESETS[selected]?.label}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-muted/50 border p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground mb-2">الميزات المضمّنة:</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(FEATURE_LABELS).map(([fk, fl]) => (
                    <div key={fk} className="flex items-center gap-1 text-xs">
                      {PLAN_PRESETS[selected].features[fk]
                        ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                        : <XCircle className="h-3 w-3 text-gray-300" />}
                      <span className={PLAN_PRESETS[selected].features[fk] ? "" : "text-muted-foreground/50"}>{fl}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">اسم الشركة / المؤسسة *</Label>
                <Input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="أدخل اسم شركتك أو مؤسستك"
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && confirmSubscription()}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
              <Button
                onClick={confirmSubscription}
                disabled={saving}
                className={`gap-2 text-white ${PLAN_BUTTON_COLORS[selected]}`}
              >
                {saving ? "جارٍ التفعيل..." : "تفعيل الاشتراك"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}