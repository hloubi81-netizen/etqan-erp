import { usePermissions } from "@/hooks/usePermissions";
import { ShieldX } from "lucide-react";

export default function PermissionGuard({ module, children }) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(module)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <ShieldX className="h-12 w-12 text-destructive/50" />
        <p className="text-lg font-medium">غير مصرح بالوصول</p>
        <p className="text-sm">ليس لديك صلاحية للوصول إلى هذا القسم</p>
      </div>
    );
  }

  return children;
}