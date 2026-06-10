import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * ArchiveButton — زر أرشفة/استعادة للفواتير والسندات
 * Props:
 *   entity   "Invoice" | "Voucher"
 *   record   { id, is_archived, invoice_number|voucher_number, ... }
 *   onDone   () => void  — يُستدعى بعد العملية
 *   size     "sm" | "default"
 */
export default function ArchiveButton({ entity, record, onDone, size = "sm" }) {
  async function toggle() {
    const isArchived = !record.is_archived;
    const now = new Date().toISOString();
    const user = await base44.auth.me();

    await base44.entities[entity].update(record.id, {
      is_archived: isArchived,
      archived_at: isArchived ? now : null,
      archived_by: isArchived ? (user?.full_name || user?.email || "") : null,
    });

    toast.success(isArchived ? "تم نقل المستند إلى الأرشيف" : "تمت استعادة المستند");
    onDone?.();
  }

  const isArchived = record?.is_archived;

  return (
    <Button
      variant="ghost"
      size={size}
      className={`gap-1 ${isArchived ? "text-amber-600 hover:bg-amber-50" : "text-slate-500 hover:bg-slate-100"}`}
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      title={isArchived ? "استعادة من الأرشيف" : "أرشفة المستند"}
    >
      {isArchived
        ? <><ArchiveRestore className="h-3.5 w-3.5" />{size !== "icon" && "استعادة"}</>
        : <><Archive className="h-3.5 w-3.5" />{size !== "icon" && "أرشفة"}</>
      }
    </Button>
  );
}