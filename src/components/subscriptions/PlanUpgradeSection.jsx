import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowUpCircle, Crown, Zap, Building2 } from "lucide-react";
import { PLAN_PRESETS, FEATURE_LABELS } from "@/hooks/useSubscription.jsx";
import PaymentRequestDialog from "./PaymentRequestDialog";

const PLAN_PRICES = { basic: 299, advanced: 599, enterprise: 999 };
const PLAN_ICONS = { basic: Zap, advanced: Crown, enterprise: Building2 };
const PLAN_ORDER = ["basic", "advanced", "enterprise"];

// السعر = سعر الباقة + (عدد المستخدمين الإضافيين × سعر المستخدم الشهري × 12 شهر)
function calcPrice(planKey, extraUsers = 0) {
  const base = PLAN_PRICES[planKey] || 0;
  const perMonth = PLAN_PRESETS[planKey]?.extra_user_price_monthly || 0;
  return base + extraUsers * perMonth * 12;
}

function PlanCard({ planKey, preset, currentPlan, user, extraUsers, onExtraUsersChange }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const Icon = PLAN_ICONS[planKey];
  const isCurrentPlan = currentPlan === planKey;
  const currentOrder = PLAN_ORDER.indexOf(currentPlan);
  const thisOrder = PLAN_ORDER.indexOf(planKey);
  const isUpgrade = thisOrder > currentOrder;
  const isDowngrade = thisOrder < currentOrder;
  const price = calcPrice(planKey, extraUsers);
  const maxUsers = preset.max_users >= 999 ? "غير محدود" : preset.max_users + extraUsers;

  const cardClass = isCurrentPlan
    ? "border-2 border-primary bg-primary/5"
    : isUpgrade
    ? "border-2 border-green-400 bg-green-50 hover:shadow-md"
    : "border-2 border-border bg-muted/20 opacity-70";

  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-4 transition-all ${cardClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isCurrentPlan ? "bg-primary/10" : isUpgrade ? "bg-green-100" : "bg-muted"}`}>
            <Icon className={`h-5 w-5 ${isCurrentPlan ? "text-primary" : isUpgrade ? "text-green-600" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-bold text-sm">{preset.label}</p>
            {isCurrentPlan && <Badge className="text-xs bg-primary/10 text-primary border-0 mt-0.5">خطتك الحالية</Badge>}
            {isUpgrade && <Badge className="text-xs bg-green-100 text-green-700 border-0 mt-0.5">ترقية</Badge>}
          </div>
        </div>
        <div className="text-left">
          <p className="text-xl font-bold text-foreground">{price} <span className="text-xs font-normal text-muted-foreground">جنيه</span></p>
          <p className="text-xs text-muted-foreground">/ سنة</p>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-1.5">
        {Object.entries(FEATURE_LABELS).map(([fk, fl]) => (
          <div key={fk} className="flex items-center gap-2 text-xs">
            {preset.features[fk]
              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
            <span className={preset.features[fk] ? "text-foreground" : "text-muted-foreground/50"}>{fl}</span>
          </div>
        ))}
      </div>

      {/* Max Users */}
      <div className="text-xs text-muted-foreground border-t pt-3">
        <span className="font-medium">المستخدمون: </span>
        <span>{preset.max_users >= 999 ? "غير محدود" : `${preset.max_users} مستخدم أساسي`}</span>
      </div>

      {/* Extra Users input (only for upgrade or current) */}
      {(isCurrentPlan || isUpgrade) && preset.max_users < 999 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-semibold text-blue-700">مستخدمون إضافيون ({preset.extra_user_price_monthly} جنيه / مستخدم / شهر)</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onExtraUsersChange(Math.max(0, extraUsers - 1))}
              className="w-7 h-7 rounded-lg border border-blue-300 bg-white text-blue-700 font-bold hover:bg-blue-50 flex items-center justify-center"
            >−</button>
            <span className="w-10 text-center text-sm font-bold text-blue-800">{extraUsers}</span>
            <button
              type="button"
              onClick={() => onExtraUsersChange(extraUsers + 1)}
              className="w-7 h-7 rounded-lg border border-blue-300 bg-white text-blue-700 font-bold hover:bg-blue-50 flex items-center justify-center"
            >+</button>
            <span className="text-xs text-blue-600 mr-1">
              = {preset.max_users + extraUsers} مستخدم إجمالاً
            </span>
          </div>
          {extraUsers > 0 && (
            <p className="text-xs text-blue-500">
              {PLAN_PRICES[planKey]} + ({extraUsers} × {preset.extra_user_price_monthly} × 12) = <strong>{price} جنيه</strong>
            </p>
          )}
        </div>
      )}

      {/* CTA */}
      {isUpgrade && (
        <Button
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
          onClick={() => setDialogOpen(true)}
        >
          <ArrowUpCircle className="h-4 w-4" />
          الترقية إلى {preset.label}
        </Button>
      )}
      {isCurrentPlan && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setDialogOpen(true)}
        >
          تجديد الاشتراك
        </Button>
      )}

      {dialogOpen && (
        <PaymentRequestDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          planKey={planKey}
          extraUsers={extraUsers}
          user={user}
        />
      )}
    </div>
  );
}

export default function PlanUpgradeSection({ currentPlan, user }) {
  const [extraUsersByPlan, setExtraUsersByPlan] = useState({ basic: 0, advanced: 0, enterprise: 0 });

  const validPlan = PLAN_ORDER.includes(currentPlan) ? currentPlan : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ArrowUpCircle className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold">
          {validPlan ? "اختر الباقة المناسبة أو قم بالترقية" : "اختر باقتك"}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        يمكنك إضافة مستخدمين إضافيين بتكلفة تُحتسب بضرب سعر المستخدم الشهري × 12 شهراً تُضاف إلى سعر الباقة السنوي.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLAN_ORDER.map(key => (
          <PlanCard
            key={key}
            planKey={key}
            preset={PLAN_PRESETS[key]}
            currentPlan={validPlan || ""}
            user={user}
            extraUsers={extraUsersByPlan[key]}
            onExtraUsersChange={(val) => setExtraUsersByPlan(prev => ({ ...prev, [key]: val }))}
          />
        ))}
      </div>
    </div>
  );
}