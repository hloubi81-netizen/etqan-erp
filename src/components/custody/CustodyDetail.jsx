import { Badge } from "@/components/ui/badge";

const STATUS_STYLES = {
  "مفتوحة": "bg-blue-100 text-blue-700",
  "قيد التسوية": "bg-orange-100 text-orange-700",
  "مسواة": "bg-green-100 text-green-700",
  "ملغاة": "bg-gray-100 text-gray-500",
};

const CAT_COLORS = {
  "مواصلات": "bg-sky-100 text-sky-700",
  "ضيافة وترفيه": "bg-pink-100 text-pink-700",
  "مستلزمات مكتبية": "bg-purple-100 text-purple-700",
  "صيانة": "bg-orange-100 text-orange-700",
  "رسوم وخدمات": "bg-indigo-100 text-indigo-700",
  "أخرى": "bg-gray-100 text-gray-600",
};

export default function CustodyDetail({ custody, expenses }) {
  const expTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const returned = custody.returned_amount || 0;
  const diff = (custody.amount || 0) - expTotal - returned;
  const verifiedCount = expenses.filter(e => e.is_verified).length;

  return (
    <div className="space-y-4 text-sm">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 bg-muted/30 rounded-xl p-4">
        <div><span className="text-muted-foreground">رقم العهدة: </span><strong className="text-primary">{custody.custody_number}</strong></div>
        <div><span className="text-muted-foreground">الحالة: </span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[custody.status]}`}>{custody.status}</span></div>
        <div><span className="text-muted-foreground">الموظف: </span><strong>{custody.employee_name}</strong></div>
        <div><span className="text-muted-foreground">القسم: </span><span>{custody.department || "—"}</span></div>
        <div className="col-span-2"><span className="text-muted-foreground">الغرض: </span><span>{custody.purpose || "—"}</span></div>
        <div><span className="text-muted-foreground">تاريخ الصرف: </span><span>{custody.issue_date}</span></div>
        <div><span className="text-muted-foreground">تاريخ التسوية: </span><span>{custody.due_date || "—"}</span></div>
        <div><span className="text-muted-foreground">طريقة الصرف: </span><span>{custody.payment_method}</span></div>
        {custody.account_name && <div><span className="text-muted-foreground">الحساب: </span><span>{custody.account_name}</span></div>}
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-lg font-bold text-blue-700">{(custody.amount || 0).toLocaleString("ar-SA")}</p>
          <p className="text-xs text-muted-foreground">المبلغ المصروف</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-lg font-bold text-green-700">{expTotal.toLocaleString("ar-SA")}</p>
          <p className="text-xs text-muted-foreground">المصاريف المثبتة</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3">
          <p className="text-lg font-bold text-purple-700">{returned.toLocaleString("ar-SA")}</p>
          <p className="text-xs text-muted-foreground">المُعاد</p>
        </div>
        <div className={`${diff > 0.01 ? "bg-orange-50" : diff < -0.01 ? "bg-red-50" : "bg-green-50"} rounded-xl p-3`}>
          <p className={`text-lg font-bold ${diff > 0.01 ? "text-orange-700" : diff < -0.01 ? "text-red-700" : "text-green-700"}`}>
            {diff > 0 ? `+${diff.toLocaleString("ar-SA")}` : diff.toLocaleString("ar-SA")}
          </p>
          <p className="text-xs text-muted-foreground">{diff > 0.01 ? "رصيد متبقٍّ" : diff < -0.01 ? "زيادة في الصرف" : "مطابق"}</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">المصاريف ({expenses.length}) — موثقة: {verifiedCount}/{expenses.length}</h4>
        </div>
        {expenses.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 bg-muted/20 rounded-xl">لا توجد مصاريف مثبتة</p>
        ) : (
          <table className="w-full text-xs border rounded-xl overflow-hidden">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-right">التاريخ</th>
                <th className="px-3 py-2 text-right">الوصف</th>
                <th className="px-3 py-2 text-right">التصنيف</th>
                <th className="px-3 py-2 text-right">المورد</th>
                <th className="px-3 py-2 text-right">المبلغ</th>
                <th className="px-3 py-2 text-center">موثق</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{e.expense_date}</td>
                  <td className="px-3 py-2">{e.description}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${CAT_COLORS[e.category] || "bg-gray-100"}`}>{e.category || "—"}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{e.vendor || "—"}</td>
                  <td className="px-3 py-2 font-semibold">{(e.amount || 0).toLocaleString("ar-SA")}</td>
                  <td className="px-3 py-2 text-center">{e.is_verified ? "✅" : "⬜"}</td>
                </tr>
              ))}
              <tr className="border-t bg-muted/30 font-semibold">
                <td colSpan={4} className="px-3 py-2">الإجمالي</td>
                <td className="px-3 py-2 text-primary">{expTotal.toLocaleString("ar-SA")}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {custody.settlement_notes && (
        <div className="bg-blue-50 rounded-xl p-3 text-sm">
          <p className="font-semibold text-blue-700 mb-1">ملاحظات التسوية:</p>
          <p className="text-muted-foreground">{custody.settlement_notes}</p>
        </div>
      )}
    </div>
  );
}