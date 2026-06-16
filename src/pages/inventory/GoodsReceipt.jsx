import QuickGoodsReceipt from "@/components/orders/QuickGoodsReceipt";

export default function GoodsReceiptPage() {
  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">استلام بضائع واردة</h1>
        <p className="text-sm text-gray-500 mt-1">نموذج سريع لمسؤولي المخازن لإدخال البضائع الواردة وتحديث الكميات فوراً</p>
      </div>
      <QuickGoodsReceipt />
    </div>
  );
}