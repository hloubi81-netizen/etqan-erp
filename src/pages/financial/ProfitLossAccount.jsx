import FinalAccountReport from "@/components/financial/FinalAccountReport";

export default function ProfitLossAccount() {
  return (
    <FinalAccountReport
      finalAccountType="الأرباح والخسائر"
      title="حساب الأرباح والخسائر"
      subtitle="تحديد صافي الربح أو الخسارة بعد الإيرادات والمصروفات غير التشغيلية"
      resultLabelProfit="صافي الربح (مرحّل للميزانية)"
      resultLabelLoss="صافي الخسارة (مرحّل للميزانية)"
    />
  );
}