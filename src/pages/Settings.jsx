import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/hooks/useLang.jsx";
import { useTheme } from "@/hooks/useTheme.jsx";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Settings as SettingsIcon, Palette, Globe, Building2, Bell, Shield,
  Database, Receipt, WarehouseIcon, CircleDollarSign, ShoppingCart,
  UserCog, Landmark, Save, Check, FileCode2, Link2, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import BackupPanel from "@/components/settings/BackupPanel";
import PrintersManager from "@/components/pos/PrintersManager";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "general",       label: "عام",              icon: SettingsIcon },
  { id: "appearance",    label: "المظهر",            icon: Palette },
  { id: "language",      label: "اللغة",             icon: Globe },
  { id: "company",       label: "بيانات الشركة",     icon: Building2 },
  { id: "invoices",      label: "الفواتير",          icon: Receipt },
  { id: "accounting",    label: "المحاسبة",          icon: CircleDollarSign },
  { id: "warehouse",     label: "المخزون",           icon: WarehouseIcon },
  { id: "pos",           label: "نقطة البيع",        icon: ShoppingCart },
  { id: "hr",            label: "الموارد البشرية",   icon: UserCog },
  { id: "assets",        label: "الأصول الثابتة",    icon: Landmark },
  { id: "notifications", label: "الإشعارات",         icon: Bell },
  { id: "security",      label: "الأمان",            icon: Shield },
  { id: "einvoice",      label: "الفاتورة الإلكترونية", icon: FileCode2 },
  { id: "backup",        label: "النسخ الاحتياطي",   icon: Database },
];

const THEMES = [
  { key: "blue",   label: "أزرق",     color: "#1d4ed8" },
  { key: "indigo", label: "نيلي",     color: "#4338ca" },
  { key: "violet", label: "بنفسجي",  color: "#7c3aed" },
  { key: "green",  label: "أخضر",    color: "#16a34a" },
  { key: "teal",   label: "زيتي",    color: "#0d9488" },
  { key: "rose",   label: "وردي",    color: "#e11d48" },
  { key: "orange", label: "برتقالي", color: "#ea580c" },
  { key: "slate",  label: "رمادي",   color: "#475569" },
];

const SETTINGS_KEY = "itqan_app_settings";

const DEFAULT_SETTINGS = {
  company: { name: "شركة اتقان للتجارة", phone: "", email: "", address: "", taxNumber: "", commercialRegister: "", logo: "" },
  einvoice: {
    enabled: false,
    system: "zatca",
    // ZATCA
    zatca_vat_number: "", zatca_cr_number: "", zatca_otp: "", zatca_environment: "sandbox", zatca_cert: "", zatca_private_key: "",
    // ETA Egypt
    eta_client_id: "", eta_client_secret: "", eta_tax_id: "", eta_branch_code: "", eta_environment: "preproduction",
  },
  invoices: { defaultPayment: "نقداً", taxRate: 15, showTax: true, autoNumber: true, numberPrefix: "INV-", showLogo: true, printCopies: 1, footerNote: "" },
  accounting: { fiscalYearStart: "01-01", defaultCurrency: "SAR", decimalPlaces: 2, autoPostJournals: true, requireCostCenter: false },
  warehouse: { defaultWarehouse: "", enableSerialNumbers: false, lowStockAlert: true, lowStockThreshold: 10, allowNegativeStock: false },
  pos: { cashierName: "", enableDiscount: true, maxDiscountPercent: 20, enableTax: true, taxRate: 15, printReceipt: true, receiptNote: "" },
  hr: { workDaysPerWeek: 5, workHoursPerDay: 8, overtimeRate: 1.5, currency: "SAR", payrollDay: 25 },
  assets: { defaultDepreciationMethod: "القسط الثابت", defaultUsefulLife: 5, fiscalYearEnd: "12-31" },
};

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
      <div>
        <p className="font-medium text-sm">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
          value ? "bg-blue-600" : "bg-gray-200"
        )}
      >
        <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
          value ? "translate-x-1" : "translate-x-4"
        )} />
      </button>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
    </div>
  );
}

export default function Settings() {
  const { lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) setSettings(JSON.parse(stored));
    } catch {}
  }, []);

  const update = (section, key, value) => {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };

  const saveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    toast.success("تم حفظ الإعدادات بنجاح");
    setTimeout(() => setSaved(false), 2000);
  };

  const s = settings;

  const renderContent = () => {
    switch (activeTab) {

      case "general":
        return (
          <div className="space-y-4">
            <SectionHeader title="إعدادات عامة" desc="معلومات عن النظام وحالته" />
            <div className="grid gap-3">
              <InfoRow label="الإصدار" value={<Badge variant="secondary">v2.0</Badge>} />
              <InfoRow label="حالة النظام" value={<Badge className="bg-green-100 text-green-700">نشط</Badge>} />
              <InfoRow label="تاريخ اليوم" value={<span className="text-sm font-medium">{new Date().toLocaleDateString('ar-SA')}</span>} />
              <InfoRow label="قاعدة البيانات" value={<Badge className="bg-blue-100 text-blue-700">Base44 Cloud</Badge>} />
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-4">
            <SectionHeader title="المظهر والألوان" desc="تخصيص ألوان وشكل النظام" />
            <div>
              <Label className="mb-3 block">لون السمة</Label>
              <div className="grid grid-cols-4 gap-3">
                {THEMES.map((t) => (
                  <button key={t.key} onClick={() => setTheme && setTheme(t.key)}
                    className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                      theme === t.key ? "border-primary shadow-md" : "border-border hover:border-primary/50"
                    )}>
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
          <div className="space-y-4">
            <SectionHeader title="اللغة والمنطقة" desc="ضبط لغة واجهة المستخدم" />
            <div className="grid gap-3">
              {[{ code: "ar", label: "العربية", flag: "🇸🇦", dir: "RTL" }, { code: "en", label: "English", flag: "🇬🇧", dir: "LTR" }].map((lng) => (
                <button key={lng.code} onClick={() => setLang(lng.code)}
                  className={cn("flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-right",
                    lang === lng.code ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}>
                  <span className="text-2xl">{lng.flag}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{lng.label}</p>
                    <p className="text-xs text-muted-foreground">اتجاه: {lng.dir}</p>
                  </div>
                  {lang === lng.code && <Badge className="bg-primary text-primary-foreground">محدد</Badge>}
                </button>
              ))}
            </div>
          </div>
        );

      case "company":
        return (
          <div className="space-y-4">
            <SectionHeader title="بيانات الشركة" desc="المعلومات التجارية والضريبية" />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><FieldRow label="اسم الشركة"><Input value={s.company.name} onChange={e => update("company","name",e.target.value)} /></FieldRow></div>
              <FieldRow label="رقم الهاتف"><Input value={s.company.phone} onChange={e => update("company","phone",e.target.value)} placeholder="05xxxxxxxx" /></FieldRow>
              <FieldRow label="البريد الإلكتروني"><Input value={s.company.email} onChange={e => update("company","email",e.target.value)} placeholder="info@company.com" /></FieldRow>
              <FieldRow label="الرقم الضريبي"><Input value={s.company.taxNumber} onChange={e => update("company","taxNumber",e.target.value)} /></FieldRow>
              <FieldRow label="السجل التجاري"><Input value={s.company.commercialRegister} onChange={e => update("company","commercialRegister",e.target.value)} /></FieldRow>
              <div className="col-span-2"><FieldRow label="العنوان"><Input value={s.company.address} onChange={e => update("company","address",e.target.value)} /></FieldRow></div>
              <div className="col-span-2"><FieldRow label="ملاحظة ذيل الفاتورة"><Input value={s.company.logo} onChange={e => update("company","logo",e.target.value)} placeholder="شكراً لتعاملكم معنا" /></FieldRow></div>
            </div>
          </div>
        );

      case "invoices":
        return (
          <div className="space-y-4">
            <SectionHeader title="إعدادات الفواتير" desc="ضبط سلوك الفواتير والطباعة" />
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="بادئة ترقيم الفاتورة"><Input value={s.invoices.numberPrefix} onChange={e => update("invoices","numberPrefix",e.target.value)} /></FieldRow>
              <FieldRow label="نسبة الضريبة الافتراضية (%)"><Input type="number" value={s.invoices.taxRate} onChange={e => update("invoices","taxRate",+e.target.value)} /></FieldRow>
              <FieldRow label="طريقة الدفع الافتراضية">
                <select className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm" value={s.invoices.defaultPayment} onChange={e => update("invoices","defaultPayment",e.target.value)}>
                  <option>نقداً</option><option>آجل</option><option>بنك</option>
                </select>
              </FieldRow>
              <FieldRow label="عدد نسخ الطباعة"><Input type="number" min="1" max="5" value={s.invoices.printCopies} onChange={e => update("invoices","printCopies",+e.target.value)} /></FieldRow>
              <div className="col-span-2"><FieldRow label="ملاحظة ذيل الفاتورة"><Input value={s.invoices.footerNote} onChange={e => update("invoices","footerNote",e.target.value)} placeholder="شكراً لتعاملكم معنا" /></FieldRow></div>
            </div>
            <div className="space-y-2">
              <ToggleRow label="ترقيم تلقائي" desc="ترقيم الفواتير تلقائياً" value={s.invoices.autoNumber} onChange={v => update("invoices","autoNumber",v)} />
              <ToggleRow label="إظهار الضريبة" desc="عرض بند الضريبة في الفاتورة" value={s.invoices.showTax} onChange={v => update("invoices","showTax",v)} />
              <ToggleRow label="طباعة الشعار" desc="إظهار شعار الشركة عند الطباعة" value={s.invoices.showLogo} onChange={v => update("invoices","showLogo",v)} />
            </div>
          </div>
        );

      case "accounting":
        return (
          <div className="space-y-4">
            <SectionHeader title="إعدادات المحاسبة" desc="ضبط السنة المالية والعملة والقيود" />
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="بداية السنة المالية"><Input value={s.accounting.fiscalYearStart} onChange={e => update("accounting","fiscalYearStart",e.target.value)} placeholder="01-01" /></FieldRow>
              <FieldRow label="العملة الافتراضية"><Input value={s.accounting.defaultCurrency} onChange={e => update("accounting","defaultCurrency",e.target.value)} placeholder="SAR" /></FieldRow>
              <FieldRow label="عدد الخانات العشرية">
                <select className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm" value={s.accounting.decimalPlaces} onChange={e => update("accounting","decimalPlaces",+e.target.value)}>
                  <option value={0}>0</option><option value={2}>2</option><option value={3}>3</option>
                </select>
              </FieldRow>
            </div>
            <div className="space-y-2">
              <ToggleRow label="ترحيل القيود تلقائياً" desc="ترحيل القيد فور حفظ الفاتورة" value={s.accounting.autoPostJournals} onChange={v => update("accounting","autoPostJournals",v)} />
              <ToggleRow label="إلزام مركز التكلفة" desc="عدم حفظ القيد بدون مركز تكلفة" value={s.accounting.requireCostCenter} onChange={v => update("accounting","requireCostCenter",v)} />
            </div>
          </div>
        );

      case "warehouse":
        return (
          <div className="space-y-4">
            <SectionHeader title="إعدادات المخزون" desc="سلوك المستودعات وتنبيهات المخزون" />
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="المستودع الافتراضي"><Input value={s.warehouse.defaultWarehouse} onChange={e => update("warehouse","defaultWarehouse",e.target.value)} placeholder="المستودع الرئيسي" /></FieldRow>
              <FieldRow label="حد تنبيه المخزون المنخفض"><Input type="number" value={s.warehouse.lowStockThreshold} onChange={e => update("warehouse","lowStockThreshold",+e.target.value)} /></FieldRow>
            </div>
            <div className="space-y-2">
              <ToggleRow label="تنبيه المخزون المنخفض" desc="إشعار عند انخفاض كمية صنف" value={s.warehouse.lowStockAlert} onChange={v => update("warehouse","lowStockAlert",v)} />
              <ToggleRow label="السماح بالمخزون السالب" desc="إتاحة البيع حتى لو نفد المخزون" value={s.warehouse.allowNegativeStock} onChange={v => update("warehouse","allowNegativeStock",v)} />
              <ToggleRow label="تفعيل الأرقام التسلسلية" desc="تتبع المنتجات برقم سيريال" value={s.warehouse.enableSerialNumbers} onChange={v => update("warehouse","enableSerialNumbers",v)} />
            </div>
          </div>
        );

      case "pos":
        return (
          <div className="space-y-4">
            <SectionHeader title="إعدادات نقطة البيع" desc="خيارات شاشة البيع والإيصالات" />
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="اسم الكاشير الافتراضي"><Input value={s.pos.cashierName} onChange={e => update("pos","cashierName",e.target.value)} /></FieldRow>
              <FieldRow label="أقصى نسبة خصم (%)"><Input type="number" min="0" max="100" value={s.pos.maxDiscountPercent} onChange={e => update("pos","maxDiscountPercent",+e.target.value)} /></FieldRow>
              <FieldRow label="نسبة الضريبة (%)"><Input type="number" value={s.pos.taxRate} onChange={e => update("pos","taxRate",+e.target.value)} /></FieldRow>
              <div className="col-span-2"><FieldRow label="ملاحظة الإيصال"><Input value={s.pos.receiptNote} onChange={e => update("pos","receiptNote",e.target.value)} placeholder="شكراً لزيارتكم" /></FieldRow></div>
            </div>
            <div className="space-y-2">
              <ToggleRow label="تفعيل الخصم" desc="السماح بإدخال خصم في نقطة البيع" value={s.pos.enableDiscount} onChange={v => update("pos","enableDiscount",v)} />
              <ToggleRow label="تفعيل الضريبة" desc="احتساب ضريبة القيمة المضافة" value={s.pos.enableTax} onChange={v => update("pos","enableTax",v)} />
              <ToggleRow label="طباعة الإيصال تلقائياً" desc="طباعة الإيصال فور إتمام البيع" value={s.pos.printReceipt} onChange={v => update("pos","printReceipt",v)} />
            </div>
            <div className="border-t border-border pt-4 mt-4">
              <PrintersManager />
            </div>
          </div>
        );

      case "hr":
        return (
          <div className="space-y-4">
            <SectionHeader title="إعدادات الموارد البشرية" desc="ضبط ساعات العمل وقواعد الرواتب" />
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="أيام العمل في الأسبوع"><Input type="number" min="1" max="7" value={s.hr.workDaysPerWeek} onChange={e => update("hr","workDaysPerWeek",+e.target.value)} /></FieldRow>
              <FieldRow label="ساعات العمل اليومية"><Input type="number" min="1" max="24" value={s.hr.workHoursPerDay} onChange={e => update("hr","workHoursPerDay",+e.target.value)} /></FieldRow>
              <FieldRow label="معامل الساعة الإضافية (×)"><Input type="number" step="0.1" value={s.hr.overtimeRate} onChange={e => update("hr","overtimeRate",+e.target.value)} /></FieldRow>
              <FieldRow label="يوم صرف الرواتب"><Input type="number" min="1" max="31" value={s.hr.payrollDay} onChange={e => update("hr","payrollDay",+e.target.value)} /></FieldRow>
              <FieldRow label="عملة الرواتب"><Input value={s.hr.currency} onChange={e => update("hr","currency",e.target.value)} placeholder="SAR" /></FieldRow>
            </div>
          </div>
        );

      case "assets":
        return (
          <div className="space-y-4">
            <SectionHeader title="إعدادات الأصول الثابتة" desc="طرق الإهلاك والسنة المالية" />
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="طريقة الإهلاك الافتراضية">
                <select className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm" value={s.assets.defaultDepreciationMethod} onChange={e => update("assets","defaultDepreciationMethod",e.target.value)}>
                  <option>القسط الثابت</option>
                  <option>القسط المتناقص</option>
                </select>
              </FieldRow>
              <FieldRow label="العمر الإنتاجي الافتراضي (سنوات)"><Input type="number" min="1" value={s.assets.defaultUsefulLife} onChange={e => update("assets","defaultUsefulLife",+e.target.value)} /></FieldRow>
              <FieldRow label="نهاية السنة المالية"><Input value={s.assets.fiscalYearEnd} onChange={e => update("assets","fiscalYearEnd",e.target.value)} placeholder="12-31" /></FieldRow>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4">
            <SectionHeader title="الإشعارات والتنبيهات" desc="ضبط إعدادات الإشعارات" />
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
          <div className="space-y-4">
            <SectionHeader title="الأمان والخصوصية" desc="إعدادات الحماية والوصول" />
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

      case "einvoice":
        return (
          <div className="space-y-4">
            <SectionHeader title="الفاتورة الإلكترونية" desc="ربط النظام بهيئة الزكاة والضريبة (ZATCA) أو الهيئة المصرية للضرائب (ETA)" />

            {/* تفعيل */}
            <ToggleRow
              label="تفعيل الفاتورة الإلكترونية"
              desc="إرسال الفواتير إلكترونياً لهيئة الضرائب"
              value={s.einvoice.enabled}
              onChange={v => update("einvoice","enabled",v)}
            />

            {s.einvoice.enabled && (
              <>
                {/* اختيار النظام */}
                <div>
                  <Label className="mb-2 block">النظام الضريبي</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "zatca", flag: "🇸🇦", title: "ZATCA", sub: "هيئة الزكاة والضريبة - السعودية" },
                      { key: "eta",   flag: "🇪🇬", title: "ETA",   sub: "الهيئة المصرية للضرائب - مصر" },
                    ].map(sys => (
                      <button key={sys.key} onClick={() => update("einvoice","system",sys.key)}
                        className={cn("flex items-center gap-3 p-4 rounded-xl border-2 text-right transition-all",
                          s.einvoice.system === sys.key ? "border-primary bg-primary/5 shadow" : "border-border hover:border-primary/40"
                        )}>
                        <span className="text-3xl">{sys.flag}</span>
                        <div>
                          <p className="font-bold text-sm">{sys.title}</p>
                          <p className="text-xs text-muted-foreground">{sys.sub}</p>
                        </div>
                        {s.einvoice.system === sys.key && <CheckCircle2 className="h-5 w-5 text-primary mr-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* إعدادات ZATCA */}
                {s.einvoice.system === "zatca" && (
                  <div className="space-y-4 p-4 rounded-xl border bg-muted/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🇸🇦</span>
                      <h4 className="font-semibold text-sm">إعدادات ZATCA - المملكة العربية السعودية</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldRow label="الرقم الضريبي (VAT Number)">
                        <Input value={s.einvoice.zatca_vat_number} onChange={e => update("einvoice","zatca_vat_number",e.target.value)} placeholder="300000000000003" />
                      </FieldRow>
                      <FieldRow label="رقم السجل التجاري (CR)">
                        <Input value={s.einvoice.zatca_cr_number} onChange={e => update("einvoice","zatca_cr_number",e.target.value)} placeholder="1010000000" />
                      </FieldRow>
                      <FieldRow label="كود OTP (من بوابة فاتورة)">
                        <Input value={s.einvoice.zatca_otp} onChange={e => update("einvoice","zatca_otp",e.target.value)} placeholder="أدخل كود OTP" />
                      </FieldRow>
                      <FieldRow label="البيئة">
                        <select className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm" value={s.einvoice.zatca_environment} onChange={e => update("einvoice","zatca_environment",e.target.value)}>
                          <option value="sandbox">Sandbox - تجريبي</option>
                          <option value="simulation">Simulation - محاكاة</option>
                          <option value="production">Production - إنتاج</option>
                        </select>
                      </FieldRow>
                      <div className="col-span-2">
                        <FieldRow label="الشهادة الرقمية (Certificate)">
                          <textarea rows={3} className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-xs font-mono" value={s.einvoice.zatca_cert} onChange={e => update("einvoice","zatca_cert",e.target.value)} placeholder="-----BEGIN CERTIFICATE-----" />
                        </FieldRow>
                      </div>
                      <div className="col-span-2">
                        <FieldRow label="المفتاح الخاص (Private Key)">
                          <textarea rows={3} className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-xs font-mono" value={s.einvoice.zatca_private_key} onChange={e => update("einvoice","zatca_private_key",e.target.value)} placeholder="-----BEGIN EC PRIVATE KEY-----" />
                        </FieldRow>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      يجب أولاً تسجيل الجهاز في بوابة <strong className="mx-1">فاتورة ZATCA</strong> والحصول على كود OTP لاستكمال الربط.
                    </div>
                  </div>
                )}

                {/* إعدادات ETA */}
                {s.einvoice.system === "eta" && (
                  <div className="space-y-4 p-4 rounded-xl border bg-muted/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🇪🇬</span>
                      <h4 className="font-semibold text-sm">إعدادات ETA - جمهورية مصر العربية</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldRow label="Client ID">
                        <Input value={s.einvoice.eta_client_id} onChange={e => update("einvoice","eta_client_id",e.target.value)} placeholder="أدخل Client ID" />
                      </FieldRow>
                      <FieldRow label="Client Secret">
                        <Input type="password" value={s.einvoice.eta_client_secret} onChange={e => update("einvoice","eta_client_secret",e.target.value)} placeholder="أدخل Client Secret" />
                      </FieldRow>
                      <FieldRow label="الرقم الضريبي (Tax ID)">
                        <Input value={s.einvoice.eta_tax_id} onChange={e => update("einvoice","eta_tax_id",e.target.value)} placeholder="123456789" />
                      </FieldRow>
                      <FieldRow label="كود الفرع (Branch Code)">
                        <Input value={s.einvoice.eta_branch_code} onChange={e => update("einvoice","eta_branch_code",e.target.value)} placeholder="0" />
                      </FieldRow>
                      <div className="col-span-2">
                        <FieldRow label="البيئة">
                          <select className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm" value={s.einvoice.eta_environment} onChange={e => update("einvoice","eta_environment",e.target.value)}>
                            <option value="preproduction">Pre-production - تجريبي</option>
                            <option value="production">Production - إنتاج</option>
                          </select>
                        </FieldRow>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      يلزم إنشاء تطبيق في <strong className="mx-1">بوابة مصلحة الضرائب ETA</strong> والحصول على بيانات الاعتماد لاستكمال الربط.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case "backup":
        return (
          <div className="space-y-4">
            <SectionHeader title="النسخ الاحتياطي" desc="تصدير واستيراد جميع بيانات النظام" />
            <BackupPanel />
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            الإعدادات
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">إدارة إعدادات النظام والوحدات</p>
        </div>
        {!["general","appearance","language","notifications","security","backup"].includes(activeTab) && (
          <Button onClick={saveSettings} className="gap-2">
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "تم الحفظ" : "حفظ الإعدادات"}
          </Button>
        )}
      </div>

      <div className="flex gap-5">
        {/* Sidebar tabs */}
        <div className="w-52 shrink-0">
          <nav className="space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-right",
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
          <CardContent className="p-5">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SectionHeader({ title, desc }) {
  return (
    <div className="pb-3 border-b border-border mb-4">
      <h3 className="text-base font-semibold">{title}</h3>
      {desc && <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
      <p className="font-medium text-sm">{label}</p>
      {value}
    </div>
  );
}