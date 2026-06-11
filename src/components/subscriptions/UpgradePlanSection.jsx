import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Crown, Zap, Building2, Gift, ArrowUp, Sparkles } from "lucide-react";
import { PLAN_PRESETS, FEATURE_LABELS, useSubscription } from "@/hooks/useSubscription.jsx";
import PaymentRequestDialog from "@/components/subscriptions/PaymentRequestDialog";

const PLAN_ICONS = { free_trial: Gift, basic: Zap, advanced: Crown, enterprise: Building2 };
const PLAN_PRICES = { basic: 500, advanced: 900, enterprise: 1500 };

const PLAN_ORDER = ["free_trial", "basic", "advanced", "enterprise"];

const PLAN_COLORS = {
  free_trial: { card: "border-amber-200 bg-amber-50", btn: "bg-amber-500 hover:bg-amber-600", badge: "bg-amber-100 text-amber-700" },
  basic:      { card: "border-blue-200 bg-blue-50",   btn: "bg-blue-600 hover:bg-blue-700",   badge: "bg-blue-100 text-blue-700" },
  advanced:   { card: "border-purple-200 bg-purple-50", btn: "bg-purple-600 hover:bg-purple-700", badge: "bg-purple-100 text-purple-700" },
  enterprise: { card: "border-emerald-200 bg-emerald-50", btn: "bg-emerald-600 hover:bg-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
};

export default function UpgradePlanSection({ user }) {
  const { subscription } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  const currentPlanKey = subscription?.plan || null;
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlanKey);

  function handleChoosePlan(planKey) {
    setSelectedPlan(planKey);
    setShowPayment(true);
  }

  return (
    <div className="space-y-4" dir="rtl">
      {currentPlanKey && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>باقتك الحالية:</span>
          <Badge className={PLAN_COLORS[currentPlanKey]?.badge}>
            {PLAN_PRESETS[currentPlanKey]?.label}
          </Badge>
          {currentPlanKey !== "enterprise" && (
            <span className="text-xs text-muted-foreground">— يمكنك الترقية لباقة أعلى في أي وقت</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_ORDER.filter(k => k !== "free_trial").map((key) => {
          const preset = PLAN_PRESETS[key];
          const Icon = PLAN_ICONS[key];
          const colors = PLAN_COLORS[key];
          const planIndex = PLAN_ORDER.indexOf(key);
          const isCurrent = key === currentPlanKey;
          const isUpgrade = currentPlanIndex !== -1 && planIndex > currentPlanIndex;
          const isDowngrade = currentPlanIndex !== -1 && planIndex < currentPlanIndex;

          return (
            <div
              key={key}
              className={`rounded-2xl border-2 p-4 transition-all ${colors.card} ${isCurrent ? "ring-2 ring-offset-2 ring-primary/40" : ""}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/70">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-sm">{preset.label}</span>
                </div>
                {isCurrent && (
                  <Badge variant="outline" className="text-xs border-primary text-primary">الحالية</Badge>
                )}
                {isUpgrade && (
                  <Badge className="text-xs bg-green-100 text-green-700 border-0 gap-1">
                    <ArrowUp className="h-3 w-3" />ترقية
                  </Badge>
                )}
              </div>

              {/* Price */}
              <div className="mb-3">
                <span className="text-xl font-bold">{PLAN_PRICES[key]}</span>
                <span className="text-xs text-muted-foreground"> جنيه / شهر / مستخدم</span>
              </div>

              {/* Features */}
              <div className="space-y-1 mb-4">
                {Object.entries(FEATURE_LABELS).map(([fk, fl]) => (
                  <div key={fk} className="flex items-center gap-1.5 text-xs">
                    {preset.features[fk]
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
                    <span className={preset.features[fk] ? "" : "text-muted-foreground/40"}>{fl}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                حتى {preset.max_users === 999 ? "غير محدود" : preset.max_users} مستخدم
              </p>

              {/* Button */}
              {isCurrent ? (
                <Button disabled className="w-full text-xs h-8" variant="outline">
                  باقتك الحالية
                </Button>
              ) : (
                <Button
                  className={`w-full text-xs h-8 text-white gap-1 ${colors.btn}`}
                  onClick={() => handleChoosePlan(key)}
                >
                  {isUpgrade && <ArrowUp className="h-3.5 w-3.5" />}
                  {isUpgrade ? `الترقية إلى ${preset.label}` : `الانتقال إلى ${preset.label}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment Dialog */}
      {selectedPlan && (
        <PaymentRequestDialog
          open={showPayment}
          onOpenChange={setShowPayment}
          planKey={selectedPlan}
          user={user}
        />
      )}
    </div>
  );
}