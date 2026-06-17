// إعادة تصدير للحفاظ على التوافق مع الكود القديم
export { getChartData } from "./charts/index";
// التصدير الافتراضي للـ IFRS
import ifrsChart from "./charts/ifrs.json";
export const defaultChartOfAccounts = ifrsChart;