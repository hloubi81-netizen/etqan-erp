import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Briefcase, Check } from "lucide-react";
import { SECTION_LABELS } from "@/hooks/usePermissions";

export const ROLE_TEMPLATES = [
  {
    id: "accountant_full",
    label: "محاسب - صلاحيات كاملة",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "💼",
    description: "الفواتير، السندات، المحاسبة، التقارير، القوائم المالية",
    permissions: {
      "dashboard.view": true,
      "accounting.view": true, "accounting.create": true, "accounting.edit": true,
      "invoices.view": true, "invoices.create": true, "invoices.edit": true,
      "vouchers.view": true, "vouchers.create": true, "vouchers.edit": true,
      "reports.view": true,
      "financial.view": true,
    },
  },
  {
    id: "accountant_view",
    label: "محاسب - عرض فقط",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    icon: "👁️",
    description: "عرض الفواتير والسندات والتقارير فقط بدون تعديل",
    permissions: {
      "dashboard.view": true,
      "accounting.view": true,
      "invoices.view": true,
      "vouchers.view": true,
      "reports.view": true,
      "financial.view": true,
    },
  },
  {
    id: "inventory_manager",
    label: "مدير المخزون",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: "📦",
    description: "المخازن كاملة + عرض الفواتير + التقارير",
    permissions: {
      "dashboard.view": true,
      "warehouses.view": true, "warehouses.create": true, "warehouses.edit": true, "warehouses.delete": true,
      "invoices.view": true, "invoices.create": true,
      "reports.view": true,
    },
  },
  {
    id: "inventory_clerk",
    label: "أمين مخزن",
    color: "bg-green-50 text-green-600 border-green-100",
    icon: "🗄️",
    description: "إدخال وعرض المخزون فقط، بدون حذف",
    permissions: {
      "dashboard.view": true,
      "warehouses.view": true, "warehouses.create": true, "warehouses.edit": true,
      "reports.view": true,
    },
  },
  {
    id: "sales_manager",
    label: "مدير المبيعات",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: "📈",
    description: "فواتير المبيعات كاملة + العملاء + التقارير",
    permissions: {
      "dashboard.view": true,
      "invoices.view": true, "invoices.create": true, "invoices.edit": true, "invoices.delete": true,
      "accounting.view": true,
      "reports.view": true,
      "financial.view": true,
    },
  },
  {
    id: "sales_rep",
    label: "مندوب مبيعات",
    color: "bg-orange-50 text-orange-600 border-orange-100",
    icon: "🧾",
    description: "إنشاء وعرض فواتير المبيعات فقط",
    permissions: {
      "dashboard.view": true,
      "invoices.view": true, "invoices.create": true,
    },
  },
  {
    id: "branch_manager",
    label: "مدير الفرع",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: "🏢",
    description: "إدارة الفرع: الفواتير + المخازن + الفروع + التقارير",
    permissions: {
      "dashboard.view": true,
      "branches.view": true, "branches.create": true, "branches.edit": true,
      "invoices.view": true, "invoices.create": true, "invoices.edit": true,
      "warehouses.view": true, "warehouses.create": true, "warehouses.edit": true,
      "reports.view": true,
      "financial.view": true,
    },
  },
  {
    id: "costs_manager",
    label: "مدير التكاليف",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: "💰",
    description: "نظام التكاليف كامل + التقارير المالية",
    permissions: {
      "dashboard.view": true,
      "costs.view": true, "costs.create": true, "costs.edit": true, "costs.delete": true,
      "reports.view": true,
      "financial.view": true,
    },
  },
  {
    id: "hr_manager",
    label: "مدير الموارد البشرية",
    color: "bg-pink-100 text-pink-700 border-pink-200",
    icon: "👥",
    description: "الموظفون + الرواتب + التقارير",
    permissions: {
      "dashboard.view": true,
      "branches.view": true,
      "reports.view": true,
    },
  },
  {
    id: "viewer_only",
    label: "مشاهد عام",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: "🔍",
    description: "عرض كل شيء بدون أي تعديل",
    permissions: {
      "dashboard.view": true,
      "accounting.view": true,
      "invoices.view": true,
      "vouchers.view": true,
      "warehouses.view": true,
      "costs.view": true,
      "branches.view": true,
      "reports.view": true,
      "financial.view": true,
    },
  },
];

function permSummary(permissions) {
  const sections = {};
  Object.keys(permissions).forEach((key) => {
    const [sec, action] = key.split(".");
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(action);
  });
  return Object.entries(sections).map(([sec, actions]) => ({
    label: SECTION_LABELS[sec]?.label || sec,
    actions,
  }));
}

export default function RoleTemplatesDialog({ open, onClose, onApply }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            قوالب الأدوار الوظيفية الجاهزة
          </DialogTitle>
          <p className="text-sm text-muted-foreground">اختر قالباً لتطبيق مجموعة صلاحيات مناسبة للدور الوظيفي</p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {ROLE_TEMPLATES.map((tpl) => {
            const summary = permSummary(tpl.permissions);
            return (
              <div key={tpl.id} className={`border rounded-xl p-4 space-y-2 ${tpl.color.includes("bg-") ? "" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tpl.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{tpl.label}</p>
                      <p className="text-xs text-muted-foreground">{tpl.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {summary.map((s) => (
                    <Badge key={s.label} variant="secondary" className="text-[10px] gap-1">
                      {s.label}
                      <span className="text-muted-foreground">({s.actions.join("/")})</span>
                    </Badge>
                  ))}
                </div>

                <Button
                  size="sm"
                  className="w-full gap-1.5 mt-1"
                  onClick={() => { onApply(tpl); onClose(); }}
                >
                  <Check className="h-3.5 w-3.5" />
                  تطبيق هذا القالب
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}