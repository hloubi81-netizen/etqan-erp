import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";

/**
 * ProductAdvancedSearch
 * Props:
 *   value    { text, groupId, branch, priceMin, priceMax }
 *   onChange (newValue) => void
 *   groups   array of { id, name }
 *   branches array of { id, name }
 *   isService bool — عرض "المزود" بدل "الفرع" (للخدمات)
 */
export default function ProductAdvancedSearch({ value, onChange, groups = [], branches = [], isService = false }) {
  const [expanded, setExpanded] = useState(false);

  function update(field, val) {
    onChange({ ...value, [field]: val });
  }

  function clearAll() {
    onChange({ text: "", groupId: "", branch: "", priceMin: "", priceMax: "" });
    setExpanded(false);
  }

  const activeCount = [value.groupId, value.branch, value.priceMin, value.priceMax].filter(Boolean).length;

  return (
    <div className="mb-5 space-y-2" dir="rtl">
      {/* Row 1: text + toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pr-9"
            placeholder={isService ? "ابحث بالاسم أو الرمز أو المزود..." : "ابحث بالاسم أو الرمز أو الباركود..."}
            value={value.text || ""}
            onChange={(e) => update("text", e.target.value)}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 shrink-0 ${activeCount > 0 ? "border-primary text-primary bg-primary/5" : ""}`}
          onClick={() => setExpanded((p) => !p)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          فلترة متقدمة
          {activeCount > 0 && (
            <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary text-white">
              {activeCount}
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>

        {(value.text || activeCount > 0) && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground hover:text-destructive shrink-0">
            <X className="h-4 w-4" />
            مسح
          </Button>
        )}
      </div>

      {/* Row 2: expanded filters */}
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-xl border border-border">

          {/* التصنيف / المجموعة */}
          {groups.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">التصنيف</label>
              <Select value={value.groupId || "all"} onValueChange={(v) => update("groupId", v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="كل التصنيفات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التصنيفات</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* الفرع */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {isService ? "المزود / المنفذ" : "اسم الفرع"}
            </label>
            {!isService && branches.length > 0 ? (
              <Select value={value.branch || "all"} onValueChange={(v) => update("branch", v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="كل الفروع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفروع</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="h-8 text-sm"
                placeholder={isService ? "اسم المزود..." : "اسم الفرع..."}
                value={value.branch || ""}
                onChange={(e) => update("branch", e.target.value)}
              />
            )}
          </div>

          {/* السعر من */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">السعر من</label>
            <Input
              type="number"
              min="0"
              className="h-8 text-sm"
              placeholder="0"
              value={value.priceMin || ""}
              onChange={(e) => update("priceMin", e.target.value)}
            />
          </div>

          {/* السعر إلى */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">السعر إلى</label>
            <Input
              type="number"
              min="0"
              className="h-8 text-sm"
              placeholder="∞"
              value={value.priceMax || ""}
              onChange={(e) => update("priceMax", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Active chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.groupId && (
            <Chip
              label={`التصنيف: ${groups.find((g) => g.id === value.groupId)?.name || value.groupId}`}
              onRemove={() => update("groupId", "")}
            />
          )}
          {value.branch && (
            <Chip label={`الفرع: ${value.branch}`} onRemove={() => update("branch", "")} />
          )}
          {value.priceMin && (
            <Chip label={`السعر ≥ ${Number(value.priceMin).toLocaleString()}`} onRemove={() => update("priceMin", "")} />
          )}
          {value.priceMax && (
            <Chip label={`السعر ≤ ${Number(value.priceMax).toLocaleString()}`} onRemove={() => update("priceMax", "")} />
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