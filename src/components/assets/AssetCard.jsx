import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, TrendingDown, MapPin, User, Calendar, Tag } from "lucide-react";

const STATUS_CONFIG = {
  "نشط":              { color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  "تحت الصيانة":      { color: "bg-amber-100 text-amber-700 border-amber-200",      dot: "bg-amber-500" },
  "مستهلك بالكامل":   { color: "bg-slate-100 text-slate-600 border-slate-200",      dot: "bg-slate-400" },
  "مباع":             { color: "bg-blue-100 text-blue-700 border-blue-200",          dot: "bg-blue-500" },
  "مسقط":             { color: "bg-red-100 text-red-700 border-red-200",             dot: "bg-red-500" },
};

const CATEGORY_ICONS = {
  "مباني": "🏢", "آلات ومعدات": "⚙️", "سيارات": "🚗",
  "أثاث ومفروشات": "🪑", "أجهزة حاسوب": "💻", "أصول أخرى": "📦"
};

export default function AssetCard({ asset, onEdit, onDelete, onDepreciate }) {
  const statusCfg = STATUS_CONFIG[asset.status] || STATUS_CONFIG["نشط"];
  const depPct = asset.purchase_cost > 0
    ? Math.min(100, Math.round(((asset.accumulated_depreciation || 0) / asset.purchase_cost) * 100))
    : 0;

  return (
    <div className="bg-card border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{CATEGORY_ICONS[asset.category] || "📦"}</span>
          <div>
            <p className="font-semibold text-sm leading-tight">{asset.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{asset.asset_number}</p>
          </div>
        </div>
        <span className={`text-xs border rounded-full px-2 py-0.5 flex items-center gap-1 shrink-0 ${statusCfg.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
          {asset.status || "نشط"}
        </span>
      </div>

      {/* Key values */}
      <div className="grid grid-cols-3 gap-2 bg-muted/30 rounded-lg p-2.5 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground">تكلفة الشراء</p>
          <p className="text-sm font-bold">{(asset.purchase_cost || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">القيمة الدفترية</p>
          <p className="text-sm font-bold text-green-700">{(asset.net_book_value || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">الإهلاك السنوي</p>
          <p className="text-sm font-bold text-orange-600">{(asset.annual_depreciation || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Depreciation bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>نسبة الاستهلاك</span>
          <span>{depPct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${depPct >= 90 ? "bg-red-500" : depPct >= 60 ? "bg-orange-500" : "bg-emerald-500"}`}
            style={{ width: `${depPct}%` }} />
        </div>
      </div>

      {/* Info rows */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {asset.purchase_date && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>تاريخ الشراء: <span className="text-foreground">{asset.purchase_date}</span></span>
          </div>
        )}
        {(asset.branch_name || asset.location) && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate text-foreground">{[asset.branch_name, asset.location].filter(Boolean).join(" — ")}</span>
          </div>
        )}
        {asset.responsible_party && (
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 shrink-0" />
            <span className="text-foreground">{asset.responsible_party}</span>
          </div>
        )}
        {asset.supplier_name && (
          <div className="flex items-center gap-1.5">
            <Tag className="h-3 w-3 shrink-0" />
            <span className="truncate text-foreground">{asset.supplier_name}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 pt-1 border-t">
        {asset.status === "نشط" && (
          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
            onClick={() => onDepreciate(asset)}>
            <TrendingDown className="h-3 w-3" /> إهلاك
          </Button>
        )}
        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => onEdit(asset)}>
          <Pencil className="h-3 w-3 ml-1" /> تعديل
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onDelete(asset.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}