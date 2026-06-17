import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Printer, FileText, Plus, Trash2, Star, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PrintTemplateDesigner from "@/components/print/PrintTemplateDesigner";

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

const DOC_ICONS = {
  "فاتورة مبيعات": "📄",
  "فاتورة مشتريات": "📥",
  "مرتجع مبيعات": "↩️",
  "مرتجع مشتريات": "↪️",
  "سند قبض": "💰",
  "سند دفع": "💳",
  "سند يومية": "📒",
  "إيصال نقطة بيع": "🧾",
  "تقرير": "📊",
  "أخرى": "📋",
};

export default function PrintBindingSettings() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDesigner, setShowDesigner] = useState(false);
  const [designerTemplate, setDesignerTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    setLoading(true);
    const data = await base44.entities.PrintTemplate.list();
    setTemplates(data);
    setLoading(false);
  }

  function getTemplateForDoc(docType) {
    return templates.find(t => t.document_type === docType && t.is_default);
  }

  async function setDefaultTemplate(docType, templateId) {
    setSaving(true);
    // Unset any existing default for this document type
    const existing = templates.filter(t => t.document_type === docType && t.is_default);
    for (const t of existing) {
      await base44.entities.PrintTemplate.update(t.id, { is_default: false });
    }
    // Set the new default
    if (templateId) {
      await base44.entities.PrintTemplate.update(templateId, { is_default: true });
    }
    toast.success(`تم ربط القالب بـ "${docType}"`);
    setSaving(false);
    fetchTemplates();
  }

  async function deleteTemplate(template) {
    await base44.entities.PrintTemplate.delete(template.id);
    toast.success("تم حذف القالب");
    fetchTemplates();
  }

  function openDesigner(template) {
    setDesignerTemplate(template || null);
    setShowDesigner(true);
  }

  function handleDesignerClose() {
    setShowDesigner(false);
    setDesignerTemplate(null);
    fetchTemplates();
  }

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {showDesigner && (
        <PrintTemplateDesigner
          open={showDesigner}
          onClose={handleDesignerClose}
          existingTemplate={designerTemplate}
          onSaved={fetchTemplates}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Printer className="h-4 w-4 text-primary" />
            ربط قوالب الطباعة بالمستندات
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            اختر القالب الافتراضي لكل نوع مستند — سيُستخدم تلقائياً عند الطباعة
          </p>
        </div>
        <Button onClick={() => openDesigner(null)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          قالب جديد
        </Button>
      </div>

      {/* Bindings Grid */}
      <div className="space-y-2">
        {DOC_TYPES.map(docType => {
          const bound = getTemplateForDoc(docType);
          const templatesForDoc = templates.filter(t => t.document_type === docType);

          return (
            <div key={docType} className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all",
              bound ? "border-primary/30 bg-primary/5" : "border-border bg-card"
            )}>
              <span className="text-xl shrink-0">{DOC_ICONS[docType]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{docType}</p>
                {bound ? (
                  <p className="text-xs text-primary font-medium">
                    {bound.name}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    لا يوجد قالب مرتبط — سيُستخدم التصميم العام
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={bound?.id || "none"}
                  onValueChange={(val) => setDefaultTemplate(docType, val === "none" ? null : val)}
                >
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder="اختر قالباً..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— بدون ربط —</SelectItem>
                    {templatesForDoc.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_default ? "✓" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bound && (
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => openDesigner(bound)}>
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* All Templates List */}
      {templates.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h4 className="font-semibold text-sm mb-3">جميع القوالب المحفوظة</h4>
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                t.is_default ? "bg-primary/5 border-primary/30" : "bg-card border-border"
              )}>
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {t.document_type}
                    </Badge>
                    {t.is_default && (
                      <Badge className="text-[10px] px-1.5 py-0 gap-1 bg-amber-100 text-amber-700 border-amber-200">
                        <Star className="h-2.5 w-2.5" />
                        افتراضي
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => openDesigner(t)}>
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => deleteTemplate(t)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}