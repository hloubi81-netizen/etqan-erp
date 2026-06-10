import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2, BookOpen, Package, FileText, BarChart2,
  CheckCircle2, ChevronRight, ChevronLeft, X, Sparkles,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "etqan_onboarding_done";

const STEPS = [
  {
    icon: Sparkles,
    color: "bg-blue-500",
    lightColor: "bg-blue-50",
    textColor: "text-blue-600",
    title: "مرحباً بك في ETQAN",
    description: "ETQAN هو نظام محاسبي متكامل يشمل المبيعات والمشتريات والمحاسبة وإدارة المخازن والموارد البشرية. سنساعدك على البدء خطوة بخطوة.",
    link: null,
    linkLabel: null,
  },
  {
    icon: Building2,
    color: "bg-violet-500",
    lightColor: "bg-violet-50",
    textColor: "text-violet-600",
    title: "إعداد الشركة والفروع",
    description: "أضف بيانات شركتك والفروع وحدد العملة الأساسية. هذه الخطوة ضرورية لعزل البيانات بين الفروع وضبط الإعدادات المحاسبية.",
    link: "/branches",
    linkLabel: "إدارة الفروع",
  },
  {
    icon: BookOpen,
    color: "bg-emerald-500",
    lightColor: "bg-emerald-50",
    textColor: "text-emerald-600",
    title: "شجرة الحسابات",
    description: "أنشئ دليل الحسابات المحاسبية الخاص بك. يمكنك إضافة حسابات رئيسية وفرعية وتحديد طبيعة كل حساب ومستواه في التقارير المالية.",
    link: "/accounts",
    linkLabel: "إدارة الحسابات",
  },
  {
    icon: Package,
    color: "bg-orange-500",
    lightColor: "bg-orange-50",
    textColor: "text-orange-600",
    title: "المخازن والمنتجات",
    description: "أضف مخازنك وأدخل قائمة منتجاتك مع الأسعار ووحدات القياس والكميات الافتراضية. يمكنك أيضاً تنظيمها في مجموعات.",
    link: "/products",
    linkLabel: "إدارة المنتجات",
  },
  {
    icon: FileText,
    color: "bg-cyan-500",
    lightColor: "bg-cyan-50",
    textColor: "text-cyan-600",
    title: "أنشئ أول فاتورة",
    description: "ابدأ بإنشاء فاتورة مبيعاتك الأولى. اختر العميل، أضف المنتجات والكميات والأسعار، ثم أرحّل الفاتورة لتسجيل القيود المحاسبية تلقائياً.",
    link: "/invoices/مبيعات",
    linkLabel: "إنشاء فاتورة مبيعات",
  },
  {
    icon: BarChart2,
    color: "bg-rose-500",
    lightColor: "bg-rose-50",
    textColor: "text-rose-600",
    title: "استخرج تقاريرك المالية",
    description: "بعد إدخال بياناتك، يمكنك استخراج ميزان المراجعة، قائمة الدخل، الميزانية العمومية، وتحليل أداء الفروع والمنتجات في أي وقت.",
    link: "/reports/trial-balance",
    linkLabel: "عرض التقارير المالية",
  },
];

export default function OnboardingGuide() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Slight delay so page loads first
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs mb-0.5">دليل البدء السريع</p>
            <h2 className="text-white font-bold text-lg">إعداد ETQAN</h2>
          </div>
          <button
            onClick={finish}
            className="text-white/60 hover:text-white transition-colors rounded-full p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5 px-6 py-3 bg-gray-50 border-b border-gray-100">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "flex-1 bg-blue-600" : i < step ? "w-6 bg-blue-300" : "w-6 bg-gray-200"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0", current.lightColor)}>
              <Icon className={cn("h-7 w-7", current.textColor)} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-400">
                  الخطوة {step + 1} من {STEPS.length}
                </span>
              </div>
              <h3 className="text-gray-900 font-bold text-lg leading-tight">{current.title}</h3>
            </div>
          </div>

          <p className="text-gray-600 text-sm leading-relaxed mb-6">{current.description}</p>

          {/* Action link */}
          {current.link && (
            <Link
              to={current.link}
              onClick={finish}
              className={cn(
                "flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all mb-4",
                "border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-blue-600"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              {current.linkLabel}
            </Link>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(s => s - 1)}
            disabled={isFirst}
            className="gap-1 text-gray-600"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </Button>

          <button
            onClick={finish}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            تخطي الدليل
          </button>

          {isLast ? (
            <Button
              size="sm"
              onClick={finish}
              className="bg-blue-600 hover:bg-blue-700 gap-1"
            >
              <CheckCircle2 className="h-4 w-4" />
              ابدأ الآن
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setStep(s => s + 1)}
              className="bg-blue-600 hover:bg-blue-700 gap-1"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}