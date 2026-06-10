import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function InvoiceApprovalBadge({ invoice }) {
  if (!invoice?.approved_by) return null;

  const date = invoice.approved_at
    ? new Date(invoice.approved_at).toLocaleString("ar-EG", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-default text-xs px-2 py-0.5">
            <ShieldCheck className="h-3 w-3" />
            معتمدة
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs space-y-0.5 max-w-[200px]">
          <p className="font-semibold">✅ اعتمد من: {invoice.approved_by}</p>
          {date && <p className="text-muted-foreground">{date}</p>}
          {invoice.approval_note && <p className="text-muted-foreground">{invoice.approval_note}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}