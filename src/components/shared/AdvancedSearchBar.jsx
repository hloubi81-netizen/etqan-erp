import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

/**
 * AdvancedSearchBar
 *
 * Props:
 *   value        { text, dateFrom, dateTo, client, invoiceNumber }
 *   onChange     (newValue) => void
 *   placeholder  string
 *   showClient   bool  (default true)
 *   showInvoice  bool  (default true)
 *   clientLabel  string (default "العميل / المورد")
 */
export default function AdvancedSearchBar({
  value,
  onChange,
  placeholder = "بحث سريع...",
  showClient = true,
  showInvoice = true,
  clientLabel = "العميل / المورد",
}) {
  const [expanded, setExpanded] = useState(false);

  function update(field, val) {
    onChange({ ...value, [field]: val });
  }

  function clearAll() {
    onChange({ text: "", dateFrom: "", dateTo: "", client: "", invoiceNumber: "" });
    setExpanded(false);
  }

  const activeFiltersCount = [
    value.dateFrom, value.dateTo, value.client, value.invoiceNumber,
  ].filter(Boolean).length;

  return (
    <div className="mb-5 space-y-2" dir="rtl">
      {/* Main search row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pr-9"
            placeholder={placeholder}
            value={value.text || ""}
            onChange={(e) => update("text", e.target.value)}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 shrink-0 ${activeFiltersCount > 0 ? "border-primary text-primary bg-primary/5" : ""}`}
          onClick={() => setExpanded((p) => !p)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          فلاتر متقدمة
          {activeFiltersCount > 0 && (
            <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary text-white">
              {activeFiltersCount}
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>

        {(value.text || activeFiltersCount > 0) && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground hover:text-destructive shrink-0">
            <X className="h-4 w-4" />
            مسح
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-xl border border-border">
          {/* Date From */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
            <Input
              type="date"
              value={value.dateFrom || ""}
              onChange={(e) => update("dateFrom", e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
            <Input
              type="date"
              value={value.dateTo || ""}
              onChange={(e) => update("dateTo", e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Client */}
          {showClient && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{clientLabel}</label>
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  className="pr-8 h-8 text-sm"
                  placeholder="اسم العميل..."
                  value={value.client || ""}
                  onChange={(e) => update("client", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Invoice / Voucher Number */}
          {showInvoice && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">رقم المستند</label>
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  className="pr-8 h-8 text-sm"
                  placeholder="رقم الفاتورة / السند..."
                  value={value.invoiceNumber || ""}
                  onChange={(e) => update("invoiceNumber", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.dateFrom && (
            <Chip label={`من: ${value.dateFrom}`} onRemove={() => update("dateFrom", "")} />
          )}
          {value.dateTo && (
            <Chip label={`إلى: ${value.dateTo}`} onRemove={() => update("dateTo", "")} />
          )}
          {value.client && (
            <Chip label={`العميل: ${value.client}`} onRemove={() => update("client", "")} />
          )}
          {value.invoiceNumber && (
            <Chip label={`رقم: ${value.invoiceNumber}`} onRemove={() => update("invoiceNumber", "")} />
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
      {label}
      <button onClick={onRemove} className="hover:text-destructive transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}