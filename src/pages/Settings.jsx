import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/hooks/useLang.jsx";
import { useTheme } from "@/hooks/useTheme.jsx";
import {
  Settings as SettingsIcon, Palette, Globe, Building2, Bell, Shield, Database
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "general", label: "عام", icon: SettingsIcon },
  { id: "appearance", label: "المظهر", icon: Palette },
  { id: "language", label: "اللغة", icon: Globe },
  { id: "company", label: "بيانات الشركة", icon: Building2 },
  { id: "notifications", label: "الإشعارات", icon: Bell },
  { id: "security", label: "الأمان", icon: Shield },
  { id: "backup", label: "النسخ الاحتياطي", icon: Database },
];

const THEMES = [
  { key: "blue", label: "أزرق", color: "#1d4ed8" },
  { key: "indigo", label: "نيلي", color: "#4338ca" },
  { key: "violet", label: "بنفسجي", color: "#7c3aed" },
  { key: "green", label: "أخضر", color: "#16a34a" },
  { key: "teal", label: "زيتي", color: "#0d9488" },
  { key: "rose", label: "وردي", color: "#e11d48" },
  { key: "orange", label: "برتقالي", color: "#ea580c" },
  { key: "slate", label: "رمادي", color: "#475569" },
];

export default function Settings() {
  const { lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("general");
  const [companyInfo, setCompanyInfo] = useState({
    name: "شركة اتقان للتجارة",
    phone: "",
    email: "",
    address: "",
    taxNumber: "",
    commercialRegister: "",
  });

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold mb-1">إعدادات عامة</h3>
              <p className="text-sm text-muted-foreground">إدارة الإعدادات الأساسية للنظام</p>
            </div>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">الإصدار الحالي</p>
                  <p className="text-xs text-muted-foreground">نظام اتقان للإدارة المالية</p>
                </div>
                <Badge variant="secondary">v2.0</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">حالة النظام</p>
                  <p className="text-xs text-muted-foreground">جميع الخدمات تعمل بشكل طبيعي</p>
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200">نشط</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">تاريخ النظام</p>
                  <p className="text-xs text-muted-foreground">اليوم</p>
                </div>
                <span className="text-sm font-medium">{new Date().toLocaleDateString('ar-SA')}</span>
              </div>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold mb-1">المظهر والألوان</h3>
              <p className="text-sm text-muted-foreground">تخصيص مظهر النظام</p>
            </div>
            <div>
              <Label className="mb-3 block">لون السمة</Label>
              <div className="grid grid-cols-4 gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTheme && setTheme(t.key)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                      theme === t.key ? "border-primary shadow-md" : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: t.color }} />
                    <span className="text-xs text-muted-foreground">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "language":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold mb-1">اللغة والمنطقة</h3>
              <p className="text-sm text-muted-foreground">ضبط لغة الواجهة</p>
            </div>
            <div className="grid gap-3">
              {[
                { code: "ar", label: "العربية", flag: "🇸🇦", dir: "RTL" },
                { code: "en", label: "English", flag: "🇬🇧", dir: "LTR" },
              ].map((lng) => (
                <button
                  key={lng.code}
                  onClick={() => setLang(lng.code)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-right",
                    lang === lng.code ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{lng.flag}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{lng.label}</p>
                    <p className="text-xs text-muted-foreground">اتجاه: {lng.dir}</p>
                  </div>
                  {lang === lng.code && (
                    <Badge className="bg-primary text-primary-foreground">محدد</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case "company":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold mb-1">بيانات الشركة</h3>
              <p className="text-sm text-muted-foreground">معلومات الشركة التجارية</p>
            </div>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="mb-1.5 block">اسم الشركة</Label>
                  <Input value={companyInfo.name} onChange={e => setCompanyInfo({ ...companyInfo, name: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">رقم الهاتف</Label>
                  <Input value={companyInfo.phone} onChange={e => setCompanyInfo({ ...companyInfo, phone: e.target.value })} placeholder="05xxxxxxxx" />
                </div>
                <div>
                  <Label className="mb-1.5 block">البريد الإلكتروني</Label>
                  <Input value={companyInfo.email} onChange={e => setCompanyInfo({ ...companyInfo, email: e.target.value })} placeholder="info@company.com" />
                </div>
                <div>
                  <Label className="mb-1.5 block">الرقم الضريبي</Label>
                  <Input value={companyInfo.taxNumber} onChange={e => setCompanyInfo({ ...companyInfo, taxNumber: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">السجل التجاري</Label>
                  <Input value={companyInfo.commercialRegister} onChange={e => setCompanyInfo({ ...companyInfo, commercialRegister: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label className="mb-1.5 block">العنوان</Label>
                  <Input value={companyInfo.address} onChange={e => setCompanyInfo({ ...companyInfo, address: e.target.value })} />
                </div>
              </div>
              <Button className="w-fit">حفظ البيانات</Button>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold mb-1">الإشعارات والتنبيهات</h3>
              <p className="text-sm text-muted-foreground">ضبط إعدادات الإشعارات</p>
            </div>
            <div className="space-y-3">
              {[
                { label: "تنبيهات الفواتير المتأخرة", desc: "إشعار عند تجاوز فاتورة لتاريخ الاستحقاق" },
                { label: "تنبيهات المخزون المنخفض", desc: "إشعار عند انخفاض كمية صنف عن الحد الأدنى" },
                { label: "ملخص يومي", desc: "تقرير يومي بأبرز العمليات" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Badge variant="outline">قريباً</Badge>
                </div>
              ))}
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold mb-1">الأمان والخصوصية</h3>
              <p className="text-sm text-muted-foreground">إعدادات الحماية والوصول</p>
            </div>
            <div className="space-y-3">
              {[
                { label: "المصادقة الثنائية", desc: "طبقة حماية إضافية عند تسجيل الدخول" },
                { label: "سجل النشاط", desc: "تتبع جميع العمليات المُنفَّذة في النظام" },
                { label: "انتهاء صلاحية الجلسة", desc: "تسجيل الخروج التلقائي بعد فترة خمول" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Badge variant="outline">قريباً</Badge>
                </div>
              ))}
            </div>
          </div>
        );

      case "backup":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold mb-1">النسخ الاحتياطي والاستعادة</h3>
              <p className="text-sm text-muted-foreground">إدارة البيانات والنسخ الاحتياطية</p>
            </div>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border bg-muted/30 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">آخر نسخة احتياطية</p>
                  <p className="text-xs text-muted-foreground">البيانات محمية على خوادم Base44</p>
                </div>
                <Badge className="bg-green-100 text-green-700">آمن</Badge>
              </div>
              <Button variant="outline" className="w-full" disabled>
                <Database className="h-4 w-4 ml-2" />
                تصدير نسخة احتياطية (قريباً)
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          الإعدادات
        </h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة إعدادات النظام والتفضيلات</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-52 shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-right",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <Card className="flex-1">
          <CardContent className="p-6">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}