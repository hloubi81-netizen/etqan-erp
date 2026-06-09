import { useLocation } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { ShieldX } from "lucide-react";

// يمنع الوصول المباشر عبر الرابط للصفحات غير المصرح بها للمستخدم
export default function PageAccessGuard({ children }) {
  const { pathname } = useLocation();
  const { canViewPage } = usePermissions();

  if (!canViewPage(pathname)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <ShieldX className="h-12 w-12 text-destructive/50" />
        <p className="text-lg font-medium">غير مصرح بالوصول</p>
        <p className="text-sm">ليس لديك صلاحية لعرض هذه الصفحة</p>
      </div>
    );
  }

  return children;
}