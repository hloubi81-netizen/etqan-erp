import FinalAccountReport from "@/components/financial/FinalAccountReport";

export default function TradingAccount() {
  return (
    <FinalAccountReport
      finalAccountType="المتاجرة"
      title="حساب المتاجرة"
      subtitle="تحديد مجمل الربح من نشاط الشراء والبيع وفق المعايير المحاسبية المصرية"
      resultLabelProfit="مجمل الربح (مرحّل لحساب التشغيل)"
      resultLabelLoss="مجمل الخسارة (مرحّل لحساب الأرباح والخسائر)"
    />
  );
}