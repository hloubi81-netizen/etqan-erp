import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Eye, Upload, FileText, LayoutTemplate, Type, Printer } from "lucide-react";
import InvoicePrintPreview from "@/components/invoices/InvoicePrintPreview";

const DEFAULT_CONFIG = {
  company_name: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  company_tax_number: "",
  logo_url: "",
  format: "simplified",
  show_logo: true,
  show_tax_number: true,
  show_signature: false,
  footer_notes: "",
  shipping_notes: "",
  terms: "",
  custom_field_1_label: "",
  custom_field_1_value: "",
  custom_field_2_label: "",
  custom_field_2_value: "",
  primary_color: "#4338ca",
};

export default function InvoicePrintSettings() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configId, setConfigId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    base44.entities.InvoicePrintConfig.list().then((list) => {
      if (list.length > 0) {
        setConfig({ ...DEFAULT_CONFIG, ...list[0] });
        setConfigId(list[0].id);
      }
    });
  }, []);

  function update(key, value) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("logo_url", file_url);
    setUploading(false);
    toast.success("تم رفع الشعار بنجاح");
  }

  async function save() {
    setSaving(true);
    if (configId) {
      await base44.entities.InvoicePrintConfig.update(configId, config);
    } else {
      const created = await base44.entities.InvoicePrintConfig.create(config);
      setConfigId(created.id);
    }
    setSaving(false);
    toast.success("تم حفظ إعدادات الفاتورة");
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    const previewEl = document.getElementById("invoice-preview-content");
    if (!previewEl || !printWindow) return;
    printWindow.document.write(`
      <html><head>
        <title>معاينة الفاتورة</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>body { margin: 0; direction: rtl; font-family: Cairo, sans-serif; } @media print { body { margin: 0; } }</style>
      </head><body>${previewEl.innerHTML}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إعدادات الفاتورة المطبوعة</h1>
          <p className="text-muted-foreground text-sm mt-1">تخصيص شكل ومحتوى الفاتورة عند الطباعة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(!previewOpen)} className="gap-2">
            <Eye className="h-4 w-4" /> {previewOpen ? "إخفاء المعاينة" : "معاينة حية"}
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </div>
      </div>

      <div className={`grid gap-6 ${previewOpen ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-2xl"}`}>
        {/* Settings Panel */}
        <div>
          <Tabs defaultValue="company">
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="company" className="text-xs gap-1"><FileText className="h-3 w-3" />الشركة</TabsTrigger>
              <TabsTrigger value="format" className="text-xs gap-1"><LayoutTemplate className="h-3 w-3" />التنسيق</TabsTrigger>
              <TabsTrigger value="footer" className="text-xs gap-1"><Type className="h-3 w-3" />التذييل</TabsTrigger>
              <TabsTrigger value="fields" className="text-xs gap-1"><FileText className="h-3 w-3" />حقول مخصصة</TabsTrigger>
            </TabsList>

            {/* Company Info */}
            <TabsContent value="company">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">بيانات الشركة</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {/* Logo Upload */}
                  <div>
                    <Label className="text-xs mb-2 block">شعار الشركة</Label>
                    <div className="flex items-center gap-4">
                      {config.logo_url ? (
                        <img src={config.logo_url} alt="شعار" className="h-16 w-16 object-contain border rounded-lg p-1" />
                      ) : (
                        <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400">
                          الشعار
                        </div>
                      )}
                      <div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                          <Upload className="h-3.5 w-3.5" />
                          {uploading ? "جاري الرفع..." : "رفع الشعار"}
                        </Button>
                        {config.logo_url && (
                          <Button variant="ghost" size="sm" className="text-destructive text-xs mr-2" onClick={() => update("logo_url", "")}>حذف</Button>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">PNG أو JPG (يُفضل شفاف)</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">اسم الشركة</Label>
                      <Input className="mt-1 h-8" value={config.company_name} onChange={(e) => update("company_name", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">الرقم الضريبي</Label>
                      <Input className="mt-1 h-8" value={config.company_tax_number} onChange={(e) => update("company_tax_number", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">الهاتف</Label>
                      <Input className="mt-1 h-8" value={config.company_phone} onChange={(e) => update("company_phone", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">البريد الإلكتروني</Label>
                      <Input className="mt-1 h-8" value={config.company_email} onChange={(e) => update("company_email", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">العنوان</Label>
                      <Input className="mt-1 h-8" value={config.company_address} onChange={(e) => update("company_address", e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Format */}
            <TabsContent value="format">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">تنسيق الفاتورة</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  {/* Format selector */}
                  <div>
                    <Label className="text-xs mb-2 block">نموذج الفاتورة</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "simplified", label: "مبسط", desc: "بيانات أساسية بدون تفاصيل إضافية" },
                        { key: "detailed", label: "تفصيلي", desc: "يشمل الوحدات والضرائب والعنوان الكامل" },
                      ].map((f) => (
                        <button
                          key={f.key}
                          onClick={() => update("format", f.key)}
                          className={`text-right p-3 rounded-xl border-2 transition-all ${config.format === f.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                        >
                          <p className="font-semibold text-sm">{f.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div className="flex items-center gap-3">
                    <Label className="text-xs">اللون الأساسي</Label>
                    <input
                      type="color"
                      value={config.primary_color}
                      onChange={(e) => update("primary_color", e.target.value)}
                      className="h-9 w-16 rounded border cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground">{config.primary_color}</span>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-3">
                    {[
                      { key: "show_logo", label: "عرض شعار الشركة" },
                      { key: "show_tax_number", label: "عرض الرقم الضريبي" },
                      { key: "show_signature", label: "عرض خط التوقيع" },
                    ].map((t) => (
                      <div key={t.key} className="flex items-center justify-between">
                        <Label className="text-sm">{t.label}</Label>
                        <Switch checked={!!config[t.key]} onCheckedChange={(v) => update(t.key, v)} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Footer */}
            <TabsContent value="footer">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">نصوص التذييل</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">ملاحظات الشحن</Label>
                    <Textarea
                      className="mt-1 text-xs"
                      rows={3}
                      placeholder="مثال: يُرجى مراجعة البضاعة عند الاستلام..."
                      value={config.shipping_notes}
                      onChange={(e) => update("shipping_notes", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">الشروط التجارية</Label>
                    <Textarea
                      className="mt-1 text-xs"
                      rows={3}
                      placeholder="مثال: البضاعة المباعة لا تُرد بعد 7 أيام..."
                      value={config.terms}
                      onChange={(e) => update("terms", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">ملاحظات عامة</Label>
                    <Textarea
                      className="mt-1 text-xs"
                      rows={3}
                      placeholder="ملاحظات تظهر أسفل الفاتورة..."
                      value={config.footer_notes}
                      onChange={(e) => update("footer_notes", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Custom Fields */}
            <TabsContent value="fields">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">حقول مخصصة (تظهر في رأس الفاتورة)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2].map((n) => (
                    <div key={n} className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">حقل مخصص {n}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">التسمية</Label>
                          <Input
                            className="mt-1 h-8 text-xs"
                            placeholder={n === 1 ? "مثال: رقم الطلب" : "مثال: اسم المندوب"}
                            value={config[`custom_field_${n}_label`]}
                            onChange={(e) => update(`custom_field_${n}_label`, e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">القيمة الافتراضية</Label>
                          <Input
                            className="mt-1 h-8 text-xs"
                            placeholder="القيمة"
                            value={config[`custom_field_${n}_value`]}
                            onChange={(e) => update(`custom_field_${n}_value`, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview Panel */}
        {previewOpen && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-muted-foreground">معاينة حية</p>
              <Button size="sm" variant="outline" onClick={handlePrint} className="gap-2 text-xs">
                <Printer className="h-3.5 w-3.5" /> طباعة
              </Button>
            </div>
            <div className="border rounded-xl overflow-hidden bg-gray-100 p-4 overflow-y-auto max-h-[calc(100vh-160px)]">
              <div id="invoice-preview-content">
                <InvoicePrintPreview config={config} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}