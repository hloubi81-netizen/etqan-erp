import FinalAccountReport from "@/components/financial/FinalAccountReport";

export default function OperatingAccount() {
  return (
    <FinalAccountReport
      finalAccountType="التشغيل"
      title="حساب التشغيل"
      subtitle="تحديد الربح التشغيلي بعد خصم المصروفات الإدارية والتشغيلية"
      resultLabelProfit="الربح التشغيلي (مرحّل لحساب الأرباح والخسائر)"
      resultLabelLoss="الخسارة التشغيلية (مرحّل لحساب الأرباح والخسائر)"
    />
  );
}