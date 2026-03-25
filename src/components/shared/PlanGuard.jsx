import { useAuth } from "@/lib/AuthContext";
import { canAccess, PLANS } from "@/lib/planConfig";
import { Lock } from "lucide-react";

export default function PlanGuard({ plan = "basic", children }) {
  const { user } = useAuth();
  const userRole = user?.role || "basic";

  if (canAccess(userRole, plan)) return children;

  const required = PLANS[plan];
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold">غير مصرح بالوصول</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        هذه الميزة متاحة في خطة <span className="font-semibold">{required?.label}</span> فأعلى.
        <br />يرجى التواصل مع المدير لترقية خطتك.
      </p>
    </div>
  );
}