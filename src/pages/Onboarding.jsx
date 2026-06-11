import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Building2, Rocket, Gift, Users, BarChart3, Package, FileText, ArrowLeft } from "lucide-react";

const FEATURES = [
  { icon: FileText, label: "فواتير المبيعات والمشتريات" },
  { icon: BarChart3, label: "القوائم المالية والتقارير" },
  { icon: Package, label: "إدارة المخزون والمستودعات" },
  { icon: Users, label: "الموارد البشرية والرواتب" },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState({
    company_name: "",
    company_phone: "",
    company_email: "",
    company_address: "",
    tax_number: "",
  });

  const handleActivate = async () => {
    if (!company.company_name.trim()) {
      toast.error("يرجى إدخال اسم الشركة");
      return;
    }
    setSaving(true);
    try {
      const user = await base44.auth.me();

      // Create subscription with free trial plan
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      const sub = await base44.entities.Subscription.create({
        client_name: company.company_name,
        plan: "free_trial",
        is_active: true,
        start_date: new Date().toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        max_users: 999,
        features: {
          accounting: true, invoices: true, vouchers: true,
          warehouses: true, costs: true, branches: true,
          reports: true, financial: true, users: true,
        },
        notes: "تجربة مجانية 3 أشهر",
      });

      // Link subscription to user
      await base44.functions.invoke('updateSubscriptionUser', {
        userId: user.id,
        updates: { subscription_id: sub.id, role: user.role || "admin" }
      });

      await base44.auth.updateMe({ subscription_id: sub.id });

      toast.success("تم تفعيل الباقة المجانية بنجاح! 🎉");
      setStep(3);
    } catch (e) {
      toast.error("حدث خطأ أثناء التفعيل، يرجى المحاولة مرة أخرى");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 text-white px-8 py-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Rocket className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">مرحباً بك في ETQAN ERP</h1>
          <p className="text-blue-100 text-sm mt-1">ابدأ رحلتك المالية الآن</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 px-8 py-4 border-b bg-gray-50">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step > s ? "bg-green-500 text-white" :
                step === s ? "bg-blue-600 text-white" :
                "bg-gray-200 text-gray-500"
              }`}>
                {step > s ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 w-8 transition-colors ${step > s ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="p-8">
          {/* Step 1: Welcome & Plan */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-3">
                  <Gift className="h-4 w-4" />
                  باقة تجريبية مجانية لمدة 3 أشهر
                </div>
                <p className="text-gray-600 text-sm">احصل على وصول كامل لجميع الميزات مجاناً</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 bg-blue-50 rounded-xl p-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full gap-2" onClick={() => setStep(2)}>
                <Rocket className="h-4 w-4" />
                ابدأ الآن — أدخل بيانات شركتك
              </Button>
            </div>
          )}

          {/* Step 2: Company Info */}
          {step === 2 && (
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
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">رقم الهاتف</Label>
                  <Input
                    placeholder="+966 5x xxx xxxx"
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

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>رجوع</Button>
                <Button className="flex-1 gap-2" onClick={handleActivate} disabled={saving}>
                  {saving ? (
                    <><div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />جاري التفعيل...</>
                  ) : (
                    <><CheckCircle className="h-4 w-4" />تفعيل الباقة المجانية</>
                  )}
                </Button>
              </div>
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
                <p className="text-gray-500 text-sm mt-1">باقتك المجانية نشطة لمدة 3 أشهر كاملة</p>
              </div>
              <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={() => onComplete?.()}>
                <ArrowLeft className="h-4 w-4" />
                الانتقال إلى النظام
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}