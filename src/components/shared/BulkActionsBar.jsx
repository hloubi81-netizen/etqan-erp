import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Trash2, CheckCircle, FileSpreadsheet, Archive, X, ArchiveRestore } from "lucide-react";

/**
 * BulkActionsBar — شريط الإجراءات الجماعية
 * Props:
 *  - selectedCount: عدد العناصر المحددة
 *  - onClear: إلغاء التحديد
 *  - actions: مصفوفة من { label, icon, onClick, destructive?, separator? }
 */
export default function BulkActionsBar({ selectedCount, onClear, actions = [] }) {
  if (selectedCount === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
          {selectedCount}
        </div>
        <span className="text-sm font-medium">تم تحديد {selectedCount} عنصر</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={onClear}>
          <X className="h-3 w-3 ml-1" />
          إلغاء التحديد
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1.5 h-8">
            الإجراءات الجماعية
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuLabel>الإجراءات على {selectedCount} عنصر</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action, idx) =>
            action.separator ? (
              <DropdownMenuSeparator key={idx} />
            ) : (
              <DropdownMenuItem
                key={idx}
                onClick={action.onClick}
                className={action.destructive ? "text-destructive focus:text-destructive" : ""}
              >
                {action.icon && <action.icon className="ml-2 h-4 w-4" />}
                {action.label}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export { Archive as ArchiveIcon, ArchiveRestore, Trash2, CheckCircle, FileSpreadsheet };