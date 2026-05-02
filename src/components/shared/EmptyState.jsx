import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyState({ icon: Icon = Inbox, title = "لا توجد بيانات", desc, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
      </div>
      {action && actionLabel && (
        <Button onClick={action} size="sm" className="mt-1">{actionLabel}</Button>
      )}
    </div>
  );
}