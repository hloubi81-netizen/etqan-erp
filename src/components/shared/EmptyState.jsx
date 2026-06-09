import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang.jsx";
import { tr } from "@/lib/translations";

export default function EmptyState({ icon: Icon = Inbox, title, desc, action, actionLabel }) {
  const { lang } = useLang() || { lang: "ar" };
  title = title || tr("noData", lang);
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