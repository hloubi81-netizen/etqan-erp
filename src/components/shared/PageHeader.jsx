import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PageHeader({ title, subtitle, onAdd, addLabel }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {onAdd && (
        <Button onClick={onAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          {addLabel || "إضافة جديد"}
        </Button>
      )}
    </div>
  );
}