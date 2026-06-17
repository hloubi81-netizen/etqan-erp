import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import {
  Settings2, Palette, Type, Image, FileText, Eye, Save, Check,
  Upload, X, Layout, Star, Printer, RotateCcw, ChevronDown, ChevronUp
} from "lucide-react";

const SETTINGS_KEY = "itqan_app_settings";

const DOC_TYPES = [
  "فاتورة مبيعات",
  "فاتورة مشتريات",
  "مرتجع مبيعات",
  "مرتجع مشتريات",
  "سند قبض",
  "سند دفع",
  "سند يومية",
  "إيصال نقطة بيع",
  "تقرير",
  "أخرى",
];

const TEMPLATE_STYLES = [
  {
    id: "modern",
    label: "حديث",
    desc: "تصميم نظيف بشريط لوني علوي وبطاقة رقم الفاتورة",
    preview: "🎨",
  },
  {
    id: "classic",
    label: "كلاسيكي",
    desc: "تصميم رسمي بإطار محيطي وترويسة مركزية",
    preview: "📋",
  },
  {
    id: "minimal",
    label: "بسيط",
    desc: "تصميم خفيف بدون زخارف، مناسب للطباعة الاقتصادية",
    preview: "📄",
  },
  {
    id: "branded",
    label: "مميز",
    desc: "خلفية ملوّنة للرأس مع بيانات موسّعة للشركة",
    preview: "⭐",
  },
];

const COLOR_PRESETS = [
  { label: "أزرق", value: "#1d4ed8" },
  { label: "نيلي", value: "#4338ca" },
  { label: "بنفسجي", value: "#7c3aed" },
  { label: "أخضر", value: "#16a34a" },
  { label: "زيتي", value: "#0d9488" },
  { label: "وردي", value: "#e11d48" },
  { label: "برتقالي", value: "#ea580c" },
  { label: "رمادي", value: "#475569" },
];

const FONT_OPTIONS = [
  { label: "تجوال", value: "Tajawal" },
  { label: "القاهرة", value: "Cairo" },
  { label: "ريم كوفي", value: "Reem Kufi" },
  { label: "نوتو نسخ", value: "Noto Naskh Arabic" },
  { label: "عمر", value: "Amiri" },
];

const DEFAULT_PRINT_SETTINGS = {
  template: "modern",
  primaryColor: "#1d4ed8",
  secondaryColor: "#f1f5f9",
  font: "Tajawal",
  fontSize: "normal",
  showLogo: true,
  logoPosition: "right",
  logoUrl: "",
  showTaxNumber: true,
  showCommercialRegister: true,
  showQRCode: false,
  showWatermark: false,
  watermarkText: "",
  headerText: "",
  footerText: "شكراً لتعاملكم معنا",
  showBankInfo: false,
  bankName: "",
  bankAccount: "",
  bankIBAN: "",
  showSignatureLines: true,
  showTerms: false,
  termsText: "",
  paperSize: "A4",
  showItemCode: false,
  showDiscount: true,
  showTax: true,
  tableStyle: "striped",
  showTotalInWords: false,
  currencySymbol: "",
  extraCompanyLine1: "",
  extraCompanyLine2: "",
};

function getSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}
function saveSettings(newSettings) {
  try {
    const current = getSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...newSettings }));
  } catch {}
}

export function getPrintSettings() {
  const s = getSettings();
  return { ...DEFAULT_PRINT_SETTINGS, ...(s.printTemplate || {}) };
}

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2 font-semibold text-sm">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
          value ? "bg-primary" : "bg-gray-200")}
      >
        <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
          value ? "translate-x-1" : "translate-x-4")} />
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ─── Live Mini Preview ─────────────────────────────────────────────────────────
function MiniPreview({ ps, company }) {
  const color = ps.primaryColor;
  const isModern = ps.template === "modern";
  const isClassic = ps.template === "classic";
  const isMinimal = ps.template === "minimal";
  const isBranded = ps.template === "branded";

  return (
    <div
      className="border rounded-xl overflow-hidden shadow-md bg-white text-right shrink-0"
      style={{ width: 280, fontFamily: ps.font + ", Arial, sans-serif", fontSize: 9, minHeight: 360, direction: "rtl" }}
    >
      {/* Top bar for modern/branded */}
      {(isModern || isBranded) && (
        <div style={{ background: color, height: isBranded ? 56 : 6, display: "flex", alignItems: "center", padding: isBranded ? "8px 12px" : 0 }}>
          {isBranded && (
            <div style={{ color: "white" }}>
              <div style={{ fontWeight: 900, fontSize: 13 }}>{company?.name || "اسم الشركة"}</div>
              <div style={{ opacity: 0.8, fontSize: 9 }}>{company?.phone}</div>
            </div>
          )}
        </div>
      )}

      {/* Classic border top */}
      {isClassic && <div style={{ border: `3px solid ${color}`, margin: 8, borderRadius: 4, padding: 8 }}>
        <div style={{ textAlign: "center", borderBottom: `2px solid ${color}`, paddingBottom: 6, marginBottom: 6 }}>
          {ps.showLogo && company?.logo ? (
            <img src={company.logo} alt="logo" style={{ height: 24, margin: "0 auto 2px" }} />
          ) : (
            <div style={{ width: 28, height: 28, background: color, borderRadius: "50%", margin: "0 auto 2px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 900 }}>
              {(company?.name || "ش")[0]}
            </div>
          )}
          <div style={{ fontWeight: 900, color, fontSize: 11 }}>{company?.name || "اسم الشركة"}</div>
          <div style={{ fontSize: 8, color: "#666" }}>{company?.address}</div>
        </div>
        <ClassicBody ps={ps} color={color} company={company} />
      </div>}

      {/* Modern / Minimal / Branded body */}
      {!isClassic && (
        <div style={{ padding: "10px 12px" }}>
          {!isBranded && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                {ps.showLogo && company?.logo ? (
                  <img src={company.logo} alt="logo" style={{ height: 24, marginBottom: 2 }} />
                ) : (
                  <div style={{ width: 26, height: 26, background: isMinimal ? "#e2e8f0" : color, borderRadius: 6, marginBottom: 2, display: "flex", alignItems: "center", justifyContent: "center", color: isMinimal ? "#475569" : "white", fontSize: 11, fontWeight: 900 }}>
                    {(company?.name || "ش")[0]}
                  </div>
                )}
                <div style={{ fontWeight: 900, color: isMinimal ? "#1e293b" : color, fontSize: 10 }}>{company?.name || "اسم الشركة"}</div>
                <div style={{ fontSize: 7, color: "#666" }}>{company?.phone}</div>
              </div>
              <div style={{ background: isMinimal ? "#f1f5f9" : color, color: isMinimal ? "#1e293b" : "white", borderRadius: 6, padding: "5px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 7, opacity: 0.8 }}>فاتورة مبيعات</div>
                <div style={{ fontWeight: 900, fontSize: 12 }}>INV-001</div>
                <div style={{ fontSize: 7, opacity: 0.8 }}>2024/01/01</div>
              </div>
            </div>
          )}
          {isBranded && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ background: `${color}15`, border: `1px solid ${color}33`, borderRadius: 6, padding: "5px 8px", display: "inline-block", color: "#1e293b" }}>
                <div style={{ fontSize: 7, color }}>فاتورة مبيعات</div>
                <div style={{ fontWeight: 900, fontSize: 13 }}>INV-001</div>
                <div style={{ fontSize: 7, color: "#666" }}>2024/01/01</div>
              </div>
            </div>
          )}
          {/* Client */}
          <div style={{ background: `${color}12`, border: `1px solid ${color}33`, borderRadius: 6, padding: "5px 8px", marginBottom: 8, fontSize: 8 }}>
            <div style={{ color, fontWeight: 700, fontSize: 7 }}>بيانات العميل</div>
            <div style={{ fontWeight: 600 }}>اسم العميل الكريم</div>
          </div>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", background: color, borderRadius: "4px 4px 0 0", padding: "4px 6px", color: "white", fontSize: 7, fontWeight: 700 }}>
            <span>الصنف</span><span style={{ textAlign: "center" }}>الكمية</span><span style={{ textAlign: "left" }}>الإجمالي</span>
          </div>
          {[["صنف تجريبي أول", "5", "500"], ["صنف تجريبي ثانٍ", "3", "300"]].map(([n, q, t], i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "3px 6px", fontSize: 7, background: ps.tableStyle === "striped" && i % 2 === 0 ? "#f8fafc" : "white", borderBottom: "1px solid #e2e8f0" }}>
              <span>{n}</span><span style={{ textAlign: "center" }}>{q}</span><span style={{ textAlign: "left", fontWeight: 600 }}>{t}</span>
            </div>
          ))}
          {/* Total */}
          <div style={{ display: "flex", justifyContent: "space-between", background: color, color: "white", padding: "4px 6px", fontSize: 8, fontWeight: 700, borderRadius: "0 0 4px 4px", marginBottom: 8 }}>
            <span>الإجمالي</span><span>800</span>
          </div>
          {/* Footer note */}
          {ps.footerText && (
            <div style={{ textAlign: "center", fontSize: 7, color: "#999", borderTop: "1px solid #e2e8f0", paddingTop: 5 }}>
              {ps.footerText}
            </div>
          )}
        </div>
      )}
      {/* Bottom bar */}
      <div style={{ background: `${color}cc`, color: "white", textAlign: "center", fontSize: 7, padding: "4px 8px", marginTop: "auto" }}>
        {company?.name || "اسم الشركة"} • {company?.phone || "0500000000"}
      </div>
    </div>
  );
}
function ClassicBody({ ps, color }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", background: color, padding: "3px 5px", color: "white", fontSize: 7, fontWeight: 700 }}>
        <span>الصنف</span><span style={{ textAlign: "center" }}>الكمية</span><span style={{ textAlign: "left" }}>الإجمالي</span>
      </div>
      {[["صنف تجريبي أول", "5", "500"]].map(([n, q, t], i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "3px 5px", fontSize: 7, borderBottom: "1px solid #e2e8f0" }}>
          <span>{n}</span><span style={{ textAlign: "center" }}>{q}</span><span style={{ textAlign: "left", fontWeight: 600, color }}>{t}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", background: color, color: "white", padding: "3px 5px", fontSize: 8, fontWeight: 700, marginTop: 4 }}>
        <span>الإجمالي</span><span>800</span>
      </div>
    </>
  );
}

// ─── Main Designer Component ───────────────────────────────────────────────────
export default function PrintTemplateDesigner({ open, onClose, existingTemplate, onSaved }) {
  const stored = getSettings();
  const [ps, setPs] = useState(() => {
    if (existingTemplate?.settings) {
      return { ...DEFAULT_PRINT_SETTINGS, ...existingTemplate.settings };
    }
    return { ...DEFAULT_PRINT_SETTINGS, ...(stored.printTemplate || {}) };
  });
  const [templateName, setTemplateName] = useState(existingTemplate?.name || "");
  const [documentType, setDocumentType] = useState(existingTemplate?.document_type || "فاتورة مبيعات");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  const fileRef = useRef();
  const company = stored.company || {};

  const update = (key, val) => setPs(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    const name = templateName.trim() || `قالب ${documentType}`;
    setSavingToDb(true);

    if (existingTemplate?.id) {
      // Update existing template
      await base44.entities.PrintTemplate.update(existingTemplate.id, {
        name,
        document_type: documentType,
        settings: ps,
      });
      toast.success("تم تحديث قالب الطباعة");
    } else {
      // Create new template
      await base44.entities.PrintTemplate.create({
        name,
        document_type: documentType,
        settings: ps,
        is_default: false,
      });
      toast.success("تم حفظ قالب الطباعة الجديد");
    }

    // Also save to localStorage for backward compatibility
    saveSettings({ printTemplate: ps });

    setSaved(true);
    setSavingToDb(false);
    setTimeout(() => setSaved(false), 2000);
    if (onSaved) onSaved();
  };

  const handleReset = () => {
    setPs(DEFAULT_PRINT_SETTINGS);
    toast.info("تم إعادة ضبط الإعدادات");
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("حجم الشعار يجب أن يكون أقل من 2 ميغابايت"); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update("logoUrl", file_url);
      // Also save into company settings
      const current = getSettings();
      const newSettings = { ...current, company: { ...(current.company || {}), logo: file_url } };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      toast.success("تم رفع الشعار بنجاح");
    } catch {
      toast.error("فشل رفع الشعار");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[93vh] overflow-hidden p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-bold text-base">مصمّم قالب الطباعة</h2>
              <p className="text-xs text-muted-foreground">تخصيص شكل الفواتير والسندات عند الطباعة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" /> إعادة ضبط
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={savingToDb}>
              {savingToDb ? "جاري الحفظ..." : saved ? <><Check className="h-4 w-4" /> تم الحفظ</> : <><Save className="h-4 w-4" /> حفظ التصميم</>}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Body: two columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Controls */}
          <div className="w-[52%] overflow-y-auto p-4 space-y-3 border-l">

            {/* Template Binding */}
            <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <FileText className="h-4 w-4 text-primary" />
                ربط القالب وحفظه
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">اسم القالب</Label>
                  <Input
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder={`قالب ${documentType}`}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">نوع المستند</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map(dt => (
                        <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {existingTemplate && (
                <Badge variant="secondary" className="text-[10px]">تعديل قالب موجود: {existingTemplate.name}</Badge>
              )}
            </div>

            {/* Template Style */}
            <Section title="قالب التصميم" icon={Layout} defaultOpen={true}>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_STYLES.map(t => (
                  <button key={t.id} onClick={() => update("template", t.id)}
                    className={cn("flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-right transition-all",
                      ps.template === t.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                    )}>
                    <span className="text-xl">{t.preview}</span>
                    <span className="font-semibold text-sm">{t.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{t.desc}</span>
                    {ps.template === t.id && <Badge className="mt-1 text-[10px] h-4 px-1.5">محدد</Badge>}
                  </button>
                ))}
              </div>
            </Section>

            {/* Colors & Font */}
            <Section title="الألوان والخطوط" icon={Palette} defaultOpen={true}>
              <Field label="اللون الرئيسي">
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button key={c.value} title={c.label} onClick={() => update("primaryColor", c.value)}
                      className={cn("w-7 h-7 rounded-full border-2 transition-all",
                        ps.primaryColor === c.value ? "border-gray-900 scale-110" : "border-transparent hover:scale-105")}
                      style={{ background: c.value }} />
                  ))}
                  <input type="color" value={ps.primaryColor} onChange={e => update("primaryColor", e.target.value)}
                    className="w-7 h-7 rounded-full border cursor-pointer" title="لون مخصص" />
                </div>
              </Field>
              <Field label="نوع الخط">
                <div className="grid grid-cols-3 gap-2">
                  {FONT_OPTIONS.map(f => (
                    <button key={f.value} onClick={() => update("font", f.value)}
                      className={cn("p-2 rounded-lg border text-center text-xs transition-all",
                        ps.font === f.value ? "border-primary bg-primary/5 font-bold" : "border-border hover:border-primary/40")}
                      style={{ fontFamily: f.value }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="حجم الخط">
                <div className="flex gap-2">
                  {[["small","صغير"],["normal","متوسط"],["large","كبير"]].map(([val,lbl]) => (
                    <button key={val} onClick={() => update("fontSize", val)}
                      className={cn("flex-1 py-1.5 rounded-lg border text-xs transition-all",
                        ps.fontSize === val ? "border-primary bg-primary/5 font-semibold" : "border-border hover:border-primary/40")}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="نمط الجدول">
                <div className="flex gap-2">
                  {[["striped","متناوب"],["solid","موحّد"],["minimal","خطوط فقط"]].map(([val,lbl]) => (
                    <button key={val} onClick={() => update("tableStyle", val)}
                      className={cn("flex-1 py-1.5 rounded-lg border text-xs transition-all",
                        ps.tableStyle === val ? "border-primary bg-primary/5 font-semibold" : "border-border hover:border-primary/40")}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>

            {/* Logo & Company */}
            <Section title="الشعار وبيانات الشركة" icon={Image} defaultOpen={false}>
              <Toggle label="إظهار الشعار" value={ps.showLogo} onChange={v => update("showLogo", v)} />
              {ps.showLogo && (
                <>
                  <Field label="موضع الشعار">
                    <div className="flex gap-2">
                      {[["right","يمين"],["center","وسط"],["left","يسار"]].map(([val,lbl]) => (
                        <button key={val} onClick={() => update("logoPosition", val)}
                          className={cn("flex-1 py-1.5 rounded-lg border text-xs transition-all",
                            ps.logoPosition === val ? "border-primary bg-primary/5 font-semibold" : "border-border hover:border-primary/40")}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">رفع شعار الشركة</Label>
                    <div className="flex gap-2 items-center">
                      {(ps.logoUrl || company.logo) && (
                        <img src={ps.logoUrl || company.logo} alt="logo" className="h-10 w-auto object-contain border rounded" />
                      )}
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        <Upload className="h-3.5 w-3.5" />
                        {uploading ? "جارٍ الرفع..." : "رفع شعار"}
                      </Button>
                      {(ps.logoUrl || company.logo) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { update("logoUrl", ""); }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG، JPG، SVG — بحد أقصى 2 MB</p>
                  </div>
                  <Field label="سطر إضافي 1 (مثل: شعار المنطقة)">
                    <Input value={ps.extraCompanyLine1} onChange={e => update("extraCompanyLine1", e.target.value)} placeholder="مثل: فرع المنطقة الشرقية" />
                  </Field>
                  <Field label="سطر إضافي 2">
                    <Input value={ps.extraCompanyLine2} onChange={e => update("extraCompanyLine2", e.target.value)} placeholder="مثل: رقم الترخيص التجاري" />
                  </Field>
                </>
              )}
            </Section>

            {/* Tax & Legal */}
            <Section title="البيانات الضريبية والقانونية" icon={FileText} defaultOpen={false}>
              <Toggle label="إظهار الرقم الضريبي" value={ps.showTaxNumber} onChange={v => update("showTaxNumber", v)} />
              <Toggle label="إظهار السجل التجاري" value={ps.showCommercialRegister} onChange={v => update("showCommercialRegister", v)} />
              <Toggle label="إظهار الضريبة في الجدول" value={ps.showTax} onChange={v => update("showTax", v)} />
              <Toggle label="إظهار الخصم في الجدول" value={ps.showDiscount} onChange={v => update("showDiscount", v)} />
              <Toggle label="كود الصنف في الجدول" value={ps.showItemCode} onChange={v => update("showItemCode", v)} />
              <Toggle label="المبلغ الإجمالي بالكلمات" desc="كتابة المبلغ بالحروف" value={ps.showTotalInWords} onChange={v => update("showTotalInWords", v)} />
              <Field label="رمز العملة (اختياري — يظهر أمام الأرقام)">
                <Input value={ps.currencySymbol} onChange={e => update("currencySymbol", e.target.value)} placeholder="مثل: ر.س أو EGP" />
              </Field>
            </Section>

            {/* Bank Info */}
            <Section title="بيانات الحساب البنكي" icon={Star} defaultOpen={false}>
              <Toggle label="إظهار بيانات التحويل البنكي" desc="يُظهر بيانات الحساب أسفل الفاتورة" value={ps.showBankInfo} onChange={v => update("showBankInfo", v)} />
              {ps.showBankInfo && (
                <div className="space-y-2 pt-1">
                  <Field label="اسم البنك"><Input value={ps.bankName} onChange={e => update("bankName", e.target.value)} placeholder="البنك الأهلي السعودي" /></Field>
                  <Field label="رقم الحساب"><Input value={ps.bankAccount} onChange={e => update("bankAccount", e.target.value)} placeholder="SA00 0000 0000 0000 0000" /></Field>
                  <Field label="رقم الآيبان (IBAN)"><Input value={ps.bankIBAN} onChange={e => update("bankIBAN", e.target.value)} placeholder="SA12 3456 7890 1234 5678 9012" /></Field>
                </div>
              )}
            </Section>

            {/* Header/Footer Text */}
            <Section title="نصوص الرأس والتذييل" icon={Type} defaultOpen={false}>
              <Field label="نص الرأس (يظهر تحت بيانات الشركة مباشرة)">
                <Input value={ps.headerText} onChange={e => update("headerText", e.target.value)} placeholder="مثل: هذه الفاتورة ضريبية معتمدة" />
              </Field>
              <Field label="نص التذييل (يظهر أسفل الفاتورة)">
                <Input value={ps.footerText} onChange={e => update("footerText", e.target.value)} placeholder="شكراً لتعاملكم معنا" />
              </Field>
              <Toggle label="إظهار خطوط التوقيع" value={ps.showSignatureLines} onChange={v => update("showSignatureLines", v)} />
              <Toggle label="إظهار الشروط والأحكام" value={ps.showTerms} onChange={v => update("showTerms", v)} />
              {ps.showTerms && (
                <Field label="نص الشروط والأحكام">
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-sm resize-none"
                    value={ps.termsText}
                    onChange={e => update("termsText", e.target.value)}
                    placeholder="أدخل الشروط والأحكام هنا..."
                  />
                </Field>
              )}
              <Toggle label="علامة مائية" desc="نص خلفي شفاف على الفاتورة" value={ps.showWatermark} onChange={v => update("showWatermark", v)} />
              {ps.showWatermark && (
                <Field label="نص العلامة المائية">
                  <Input value={ps.watermarkText} onChange={e => update("watermarkText", e.target.value)} placeholder="مثل: نسخة أصلية" />
                </Field>
              )}
            </Section>

            {/* Paper */}
            <Section title="إعدادات الورق" icon={Settings2} defaultOpen={false}>
              <Field label="حجم الورق">
                <div className="flex gap-2">
                  {["A4", "A5", "Letter"].map(p => (
                    <button key={p} onClick={() => update("paperSize", p)}
                      className={cn("flex-1 py-1.5 rounded-lg border text-xs transition-all",
                        ps.paperSize === p ? "border-primary bg-primary/5 font-semibold" : "border-border hover:border-primary/40")}>
                      {p}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>

          </div>

          {/* Right: Live preview */}
          <div className="flex-1 bg-slate-100 overflow-y-auto flex flex-col items-center justify-start gap-3 p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Eye className="h-4 w-4" /> معاينة مباشرة
            </div>
            <MiniPreview ps={ps} company={{ ...company, logo: ps.logoUrl || company.logo }} />
            <p className="text-[10px] text-muted-foreground text-center">هذه معاينة تقريبية — الشكل الكامل يظهر عند الطباعة الفعلية</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}