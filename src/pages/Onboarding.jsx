import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Building2, Rocket, Gift, Sparkles, Crown, Zap, ArrowLeft, XCircle } from "lucide-react";
import { PLAN_PRESETS, FEATURE_LABELS } from "@/hooks/useSubscription.jsx";
import PaymentRequestDialog from "@/components/subscriptions/PaymentRequestDialog";

const PLAN_ICONS = { free_trial: Gift, basic: Zap, advanced: Crown, enterprise: Building2 };
const PLAN_COLORS = {
  free_trial: "border-amber-300 bg-amber-50 hover:border-amber-400",
  basic: "border-blue-200 bg-blue-50 hover:border-blue-400",
  advanced: "border-purple-200 bg-purple-50 hover:border-purple-400",
  enterprise: "border-emerald-200 bg-emerald-50 hover:border-emerald-400",
};
const PLAN_BUTTON_COLORS = {
  free_trial: "bg-amber-500 hover:bg-amber-600",
  basic: "bg-blue-600 hover:bg-blue-700",
  advanced: "bg-purple-600 hover:bg-purple-700",
  enterprise: "bg-emerald-600 hover:bg-emerald-700",
};

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [company, setCompany] = useState({
    company_name: "",
    company_phone: "",
    company_email: "",
    company_address: "",
    tax_number: "",
  });

  async function handleCompanyNext() {
    if (!company.company_name.trim()) {
      toast.error("يرجى إدخال اسم الشركة");
      return;
    }
    const user = await base44.auth.me().catch(() => null);
    setCurrentUser(user);
    setStep(2);
  }

  async function activateFreeTrial() {
    setSaving(true);
    try {
      const user = currentUser || await base44.auth.me();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 15);

      const sub = await base44.entities.Subscription.create({
        client_name: company.company_name,
        plan: "free_trial",
        is_active: true,
        start_date: new Date().toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        max_users: 999,
        features: PLAN_PRESETS.free_trial.features,
        notes: "تجربة مجانية 15 يوم",
      });

      await base44.functions.invoke('updateSubscriptionUser', {
        userId: user.id,
        updates: { subscription_id: sub.id, role: user.role || "admin" }
      });
      await base44.auth.updateMe({ subscription_id: sub.id });

      toast.success("تم تفعيل التجربة المجانية! 🎉");
      setStep(3);
    } catch (e) {
      toast.error("حدث خطأ، يرجى المحاولة مرة أخرى");
    }
    setSaving(false);
  }

  function choosePlan(planKey) {
    setSelectedPlan(planKey);
    if (planKey === "free_trial") {
      activateFreeTrial();
    } else {
      setShowPaymentDialog(true);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
      <div className={`bg-white rounded-2xl shadow-xl w-full overflow-hidden ${step === 2 ? "max-w-4xl" : "max-w-lg"}`}>

        {/* Header */}
        <div className="bg-blue-600 text-white px-8 py-5 text-center">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-lg font-bold">مرحباً بك في ETQAN ERP</h1>
          <p className="text-blue-100 text-xs mt-0.5">ابدأ رحلتك المالية الآن</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 px-8 py-3 border-b bg-gray-50">
          {[
            { n: 1, label: "بيانات الشركة" },
            { n: 2, label: "اختيار الباقة" },
            { n: 3, label: "تم التفعيل" },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step > n ? "bg-green-500 text-white" :
                  step === n ? "bg-blue-600 text-white" :
                  "bg-gray-200 text-gray-500"
                }`}>
                  {step > n ? <CheckCircle className="h-4 w-4" /> : n}
                </div>
                <span className={`text-xs hidden sm:block ${step === n ? "text-blue-600 font-semibold" : "text-gray-400"}`}>{label}</span>
              </div>
              {n < 3 && <div className={`h-0.5 w-6 transition-colors ${step > n ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="p-6">
          {/* Step 1: Company Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h2 className="font-bold text-gray-800">بيانات الشركة</h2>
                <p className="text-xs text-gray-500">ستظهر هذه البيانات على الفواتير والتقارير</p>
              </div>

              <div>
                <Label className="text-xs font-semibold">اسم الشركة / المنشأة *</Label>
                <Input
                  placeholder="مثال: شركة الإتقان للتجارة"
                  value={company.company_name}
                  onChange={e => setCompany(c => ({ ...c, company_name: e.target.value }))}
                  className="mt-1"
                  onKeyDown={e => e.key === "Enter" && handleCompanyNext()}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">رقم الهاتف</Label>
                  <Input
                    placeholder="+20 1x xxxx xxxx"
                    value={company.company_phone}
                    onChange={e => setCompany(c => ({ ...c, company_phone: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">البريد الإلكتروني</Label>
                  <Input
                    placeholder="info@company.com"
                    value={company.company_email}
                    onChange={e => setCompany(c => ({ ...c, company_email: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">العنوان</Label>
                <Input
                  placeholder="المدينة، الحي، الشارع"
                  value={company.company_address}
                  onChange={e => setCompany(c => ({ ...c, company_address: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">الرقم الضريبي (اختياري)</Label>
                <Input
                  placeholder="3xxxxxxxxxxxxxxxxx"
                  value={company.tax_number}
                  onChange={e => setCompany(c => ({ ...c, tax_number: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <Button className="w-full gap-2 mt-2" onClick={handleCompanyNext}>
                التالي — اختيار الباقة
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Plan Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-2">
                  <Sparkles className="h-4 w-4" />
                  اختر الباقة المناسبة لعملك
                </div>
                <p className="text-xs text-gray-500">يمكنك الترقية في أي وقت</p>
              </div>

              {/* Free Trial Banner */}
              <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-3 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Gift className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-800 text-sm">جرّب النظام مجاناً لمدة 15 يوماً</p>
                    <p className="text-xs text-amber-700">وصول كامل لجميع الميزات — بدون بطاقة ائتمان</p>
                  </div>
                </div>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 text-xs h-8"
                  onClick={() => choosePlan("free_trial")}
                  disabled={saving}
                >
                  {saving ? "جارٍ التفعيل..." : "ابدأ التجربة المجانية"}
                </Button>
              </div>

              {/* Paid Plans */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(PLAN_PRESETS).filter(([k]) => k !== "free_trial").map(([key, preset]) => {
                  const Icon = PLAN_ICONS[key];
                  return (
                    <div
                      key={key}
                      className={`cursor-pointer rounded-xl border-2 transition-all duration-200 p-4 ${PLAN_COLORS[key]}`}
                      onClick={() => choosePlan(key)}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-white/70">
                          <Icon className="h-4 w-4 text-foreground" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{preset.label}</h3>
                          <p className="text-xs text-muted-foreground">
                            حتى {preset.max_users === 999 ? "غير محدود" : preset.max_users} مستخدم
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        {Object.entries(FEATURE_LABELS).map(([fk, fl]) => (
                          <div key={fk} className="flex items-center gap-1.5 text-xs">
                            {preset.features[fk]
                              ? <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                              : <XCircle className="h-3 w-3 text-gray-300 shrink-0" />}
                            <span className={preset.features[fk] ? "text-foreground" : "text-muted-foreground/50"}>{fl}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        className={`w-full text-xs h-8 text-white ${PLAN_BUTTON_COLORS[key]}`}
                        onClick={e => { e.stopPropagation(); choosePlan(key); }}
                      >
                        اشترك الآن
                      </Button>
                    </div>
                  );
                })}
              </div>

              <button
                className="text-xs text-muted-foreground text-center w-full hover:underline mt-1"
                onClick={() => setStep(1)}
              >
                ← رجوع لبيانات الشركة
              </button>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-4 space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-9 w-9 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">تم التفعيل بنجاح! 🎉</h2>
                <p className="text-gray-500 text-sm mt-1">التجربة المجانية نشطة لمدة 15 يوماً</p>
              </div>
              <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={() => onComplete?.()}>
                <ArrowLeft className="h-4 w-4" />
                الانتقال إلى النظام
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Dialog for paid plans */}
      {selectedPlan && selectedPlan !== "free_trial" && (
        <PaymentRequestDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          planKey={selectedPlan}
          user={currentUser}
        />
      )}
    </div>
  );
}