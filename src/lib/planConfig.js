// تعريف الخطط والصلاحيات
export const PLANS = {
  basic: {
    label: "الأساسية",
    color: "bg-slate-100 text-slate-700",
    description: "المخازن وإدارة المنتجات",
  },
  advanced: {
    label: "المتقدمة",
    color: "bg-blue-100 text-blue-700",
    description: "المحاسبة + المخازن + التكاليف",
  },
  premium: {
    label: "المميزة",
    color: "bg-amber-100 text-amber-800",
    description: "جميع الميزات + الفروع + القوائم المالية",
  },
  admin: {
    label: "المدير",
    color: "bg-purple-100 text-purple-700",
    description: "صلاحيات كاملة",
  },
};

// كل مجموعة قائمة تحمل tag يحدد الحد الأدنى من الخطة المطلوبة
// basic < advanced < premium < admin (كل خطة تشمل ما قبلها)
export const PLAN_LEVEL = { basic: 1, advanced: 2, premium: 3, admin: 99 };

export function canAccess(userRole, requiredPlan) {
  const userLevel = PLAN_LEVEL[userRole] ?? 1;
  const required = PLAN_LEVEL[requiredPlan] ?? 1;
  return userLevel >= required;
}