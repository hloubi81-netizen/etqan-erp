import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Crown, Zap, CheckCircle2, Gift, ArrowRight, Sparkles } from "lucide-react";
import { PLAN_PRESETS, FEATURE_LABELS } from "@/hooks/useSubscription.jsx";

const PLANS = [
  {
    key: "basic",
    label: "الأساسية",
    icon: Zap,
    color: "from-blue-500 to-blue-600",
    border: "border-blue-200",
    bg: "bg-blue-50",
    price: "مجاناً",
    desc: "للشركات الناشئة والصغيرة",
  },
  {
    key: "advanced",
    label: "المتقدمة",
    icon: Crown,
    color: "from-purple-500 to-purple-600",
    border: "border-purple-200",
    bg: "bg-purple-50",
    price: "شهرياً",
    desc: "للشركات المتوسطة والمتنامية",
    recommended: true,
  },
  {
    key: "enterprise",
    label: "المؤسسية",
    icon: Building2,
    color: "from-emerald-500 to-emerald-600",
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    price: "تواصل معنا",
    desc: "للمؤسسات الكبيرة والمتعددة الفروع",
  },
];

export default function CompanyRegistration() {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState("advanced");
  const [form, setForm] = useState({
    client_name: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!form.client_name) return toast.error("يرجى إدخال اسم الشركة");
    setSaving(true);
    const preset = PLAN_PRESETS[selectedPlan];
    await base44.entities.Subscription.create({
      client_name: form.client_name,
      plan: selectedPlan,
      features: { ...preset.features },
      max_users: preset.max_users,
      start_date: form.start_date,
      end_date: form.end_date,
      is_active: true,
      notes: form.notes || "تجربة مجانية لمدة شهر",
    });
    setSaving(false);
    setDone(true);
    toast.success("تم إنشاء ملف الشركة بنجاح!");
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">تم التسجيل بنجاح! 🎉</h2>
          <p className="text-muted-foreground mb-2">تمت إضافة <strong>{form.client_name}</strong> بخطة <strong>{PLAN_PRESETS[selectedPlan]?.label}</strong></p>
          <p className="text-sm text-muted-foreground mb-6">التجربة المجانية تنتهي في {form.end_date}</p>
          <Button onClick={() => { setDone(false); setStep(1); setForm({ client_name: "", start_date: new Date().toISOString().split("T")[0], end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], notes: "" }); }}>
            تسجيل شركة أخرى
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4" />
          تجربة مجانية لمدة 30 يوماً
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">إضافة ملف شركة جديد</h1>
        <p className="text-muted-foreground">اختر الباقة المناسبة واستمتع بتجربة مجانية كاملة</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${step >= s ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"}`}>
              {s}
            </div>
            {s < 2 && <div className={`w-16 h-1 rounded-full ${step > s ? "bg-indigo-600" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-4xl">
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-center mb-6">اختر الباقة</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const preset = PLAN_PRESETS[plan.key];
                const isSelected = selectedPlan === plan.key;
                return (
                  <button
                    key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`relative text-right p-5 rounded-2xl border-2 transition-all duration-200 ${plan.bg}
                      ${isSelected ? `${plan.border} ring-2 ring-offset-2 ring-indigo-500 shadow-lg` : "border-transparent hover:border-gray-200"}`}
                  >
                    {plan.recommended && (
                      <Badge className="absolute top-3 left-3 text-[10px]">الأكثر طلباً</Badge>
                    )}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">{plan.label}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{plan.desc}</p>
                    <div className="space-y-1.5">
                      {Object.entries(FEATURE_LABELS).map(([fk, fl]) => (
                        <div key={fk} className="flex items-center gap-1.5 text-xs">
                          {preset.features[fk]
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            : <div className="h-3.5 w-3.5 rounded-full border border-gray-300 shrink-0" />}
                          <span className={preset.features[fk] ? "font-medium" : "text-muted-foreground/60"}>{fl}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">حتى {preset.max_users} مستخدم</p>
                  </button>
                );
              })}
            </div>

            {/* Free trial notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 mb-6">
              <Gift className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">تجربة مجانية لمدة شهر كامل!</p>
                <p className="text-xs text-amber-700">ستحصل على وصول كامل لجميع ميزات الباقة المختارة لمدة 30 يوماً بدون أي تكلفة.</p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button size="lg" onClick={() => setStep(2)} className="gap-2 px-8">
                التالي <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-100 shadow-xl p-8">
            <h2 className="text-xl font-semibold mb-6">بيانات الشركة</h2>
            <div className="space-y-4">
              <div>
                <Label>اسم الشركة *</Label>
                <Input
                  className="mt-1"
                  value={form.client_name}
                  onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                  placeholder="مثال: شركة النور للتجارة"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>تاريخ البداية</Label>
                  <Input className="mt-1" type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <Label>تاريخ انتهاء التجربة</Label>
                  <Input className="mt-1" type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Input className="mt-1" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="أي ملاحظات إضافية..." />
              </div>

              {/* Summary */}
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <p className="text-xs text-muted-foreground mb-1">ملخص الاشتراك</p>
                <p className="font-bold">{PLAN_PRESETS[selectedPlan]?.label} — تجربة مجانية</p>
                <p className="text-xs text-muted-foreground">{form.start_date} ← {form.end_date}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">رجوع</Button>
              <Button onClick={handleSubmit} disabled={saving} className="flex-1 gap-2">
                {saving ? "جاري الإنشاء..." : <><CheckCircle2 className="h-4 w-4" /> إنشاء الملف</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}