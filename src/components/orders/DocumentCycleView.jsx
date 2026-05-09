import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, XCircle, Circle, ChevronDown, ChevronUp } from "lucide-react";

const STAGE_STATUSES = {
  "أمر شراء": { complete: ["معتمد", "مستلم جزئياً", "مستلم كلياً"], colors: "bg-blue-100 text-blue-700 border-blue-200" },
  "استلام": { complete: ["مستلم", "مطابق", "به فروقات"], colors: "bg-green-100 text-green-700 border-green-200" },
  "مطابقة": { complete: ["مطابق"], colors: "bg-purple-100 text-purple-700 border-purple-200" },
};

function StageIcon({ done, hasIssue }) {
  if (hasIssue) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  if (done) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  return <Circle className="h-5 w-5 text-gray-300" />;
}

function CycleRow({ order, receipts, invoices }) {
  const [expanded, setExpanded] = useState(false);
  const orderReceipts = receipts.filter(r => r.purchase_order_id === order.id);
  const latestReceipt = orderReceipts[0];
  const invoice = latestReceipt ? invoices.find(i => i.id === latestReceipt.linked_invoice_id) : null;

  const orderDone = ["معتمد", "مستلم جزئياً", "مستلم كلياً"].includes(order.status);
  const receiptDone = latestReceipt && ["مستلم", "مطابق", "به فروقات"].includes(latestReceipt.status);
  const invoiceDone = !!invoice;
  const matchOk = latestReceipt?.match_status === "مطابق";
  const matchIssue = latestReceipt?.linked_invoice_id && latestReceipt?.match_status !== "مطابق";

  const cycleComplete = orderDone && receiptDone && invoiceDone;

  return (
    <div className="border rounded-xl overflow-hidden mb-3">
      <div
        className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 ${cycleComplete && matchOk ? "bg-green-50/50" : matchIssue ? "bg-yellow-50/50" : "bg-white"}`}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Order */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StageIcon done={orderDone} />
          <div className="min-w-0">
            <p className="font-mono font-semibold text-sm text-blue-700">{order.order_number}</p>
            <p className="text-xs text-muted-foreground truncate">{order.client_name || "—"}</p>
          </div>
        </div>

        <div className="text-muted-foreground text-lg">→</div>

        {/* Receipt */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StageIcon done={receiptDone} />
          <div className="min-w-0">
            {latestReceipt
              ? <><p className="font-mono font-semibold text-sm text-green-700">{latestReceipt.receipt_number}</p><p className="text-xs text-muted-foreground">{latestReceipt.status}</p></>
              : <p className="text-xs text-muted-foreground italic">لم يُنشأ</p>}
          </div>
        </div>

        <div className="text-muted-foreground text-lg">→</div>

        {/* Invoice */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StageIcon done={invoiceDone} hasIssue={matchIssue} />
          <div className="min-w-0">
            {invoice
              ? <><p className="font-mono font-semibold text-sm text-purple-700">{invoice.invoice_number}</p><p className="text-xs text-muted-foreground">{latestReceipt?.match_status}</p></>
              : <p className="text-xs text-muted-foreground italic">لم تُربط</p>}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {cycleComplete && matchOk && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">دورة مكتملة ✓</span>}
          {matchIssue && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">به فروقات ⚠</span>}
          {!cycleComplete && !matchIssue && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">جارية</span>}
          <div className="text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/20 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Order Details */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-700 border-b border-blue-100 pb-1">📋 أمر الشراء</h4>
            <div className="space-y-1 text-xs">
              <p><span className="text-muted-foreground">الرقم:</span> <strong>{order.order_number}</strong></p>
              <p><span className="text-muted-foreground">التاريخ:</span> {order.date}</p>
              <p><span className="text-muted-foreground">المورد:</span> {order.client_name || "—"}</p>
              <p><span className="text-muted-foreground">الإجمالي:</span> <strong>{(order.total || 0).toLocaleString()}</strong></p>
              <p><span className="text-muted-foreground">الحالة:</span> {order.status}</p>
            </div>
            {order.items?.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between bg-white rounded px-2 py-1 border text-xs">
                <span>{item.product_name}</span>
                <span className="text-muted-foreground">{item.quantity} × {item.price}</span>
              </div>
            ))}
            {(order.items?.length || 0) > 3 && <p className="text-xs text-muted-foreground">... و{order.items.length - 3} أصناف أخرى</p>}
          </div>

          {/* Receipt Details */}
          <div className="space-y-2">
            <h4 className="font-semibold text-green-700 border-b border-green-100 pb-1">📦 طلب الاستلام</h4>
            {latestReceipt ? (
              <div className="space-y-1 text-xs">
                <p><span className="text-muted-foreground">الرقم:</span> <strong>{latestReceipt.receipt_number}</strong></p>
                <p><span className="text-muted-foreground">التاريخ:</span> {latestReceipt.date}</p>
                <p><span className="text-muted-foreground">المستودع:</span> {latestReceipt.warehouse_name || "—"}</p>
                <p><span className="text-muted-foreground">الإجمالي:</span> <strong>{(latestReceipt.total || 0).toLocaleString()}</strong></p>
                {latestReceipt.items?.slice(0, 3).map((item, i) => {
                  const orderItem = order.items?.find(oi => oi.product_id === item.product_id);
                  const diff = (item.received_quantity || 0) - (orderItem?.quantity || 0);
                  return (
                    <div key={i} className="flex justify-between bg-white rounded px-2 py-1 border text-xs">
                      <span>{item.product_name}</span>
                      <span className={diff !== 0 ? "text-red-500" : "text-green-600"}>
                        {item.received_quantity} {diff !== 0 ? `(${diff > 0 ? "+" : ""}${diff})` : "✓"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-xs text-muted-foreground italic">لم يُنشأ طلب استلام بعد</p>}
          </div>

          {/* Invoice Details */}
          <div className="space-y-2">
            <h4 className="font-semibold text-purple-700 border-b border-purple-100 pb-1">🧾 فاتورة المورد</h4>
            {invoice ? (
              <div className="space-y-1 text-xs">
                <p><span className="text-muted-foreground">الرقم:</span> <strong>{invoice.invoice_number}</strong></p>
                <p><span className="text-muted-foreground">التاريخ:</span> {invoice.date}</p>
                <p><span className="text-muted-foreground">الإجمالي:</span> <strong>{(invoice.total || 0).toLocaleString()}</strong></p>
                <div className={`mt-2 p-2 rounded border text-xs font-medium ${matchOk ? "bg-green-50 border-green-200 text-green-700" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
                  {matchOk ? "✅ جميع البيانات متطابقة" : `⚠️ ${latestReceipt?.match_status}`}
                </div>
                {invoice.items?.slice(0, 3).map((item, i) => {
                  const ri = latestReceipt?.items?.find(x => x.product_id === item.product_id);
                  const match = ri && Math.abs((ri.received_quantity || 0) - (item.quantity || 0)) < 0.001 && Math.abs((ri.price || 0) - (item.price || 0)) < 0.001;
                  return (
                    <div key={i} className={`flex justify-between rounded px-2 py-1 border text-xs ${match ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                      <span>{item.product_name}</span>
                      <span>{item.quantity} × {item.price}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-xs text-muted-foreground italic">لم تُربط فاتورة مورد بعد</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentCycleView({ orders, receipts, invoices }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const purchaseOrders = orders.filter(o => o.type === "أمر شراء");

  const filtered = purchaseOrders.filter(o => {
    const matchSearch = !search || o.order_number?.includes(search) || o.client_name?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filterStatus === "all") return true;
    const rec = receipts.find(r => r.purchase_order_id === o.id);
    if (filterStatus === "complete") return rec?.match_status === "مطابق";
    if (filterStatus === "issues") return rec?.linked_invoice_id && rec?.match_status !== "مطابق";
    if (filterStatus === "pending") return !rec?.linked_invoice_id;
    return true;
  });

  const complete = purchaseOrders.filter(o => {
    const rec = receipts.find(r => r.purchase_order_id === o.id);
    return rec?.match_status === "مطابق";
  }).length;

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4">
        <div className="flex gap-3 flex-wrap">
          <Input placeholder="بحث برقم الأمر أو المورد..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الدورات</SelectItem>
              <SelectItem value="complete">✅ مكتملة ومطابقة</SelectItem>
              <SelectItem value="issues">⚠️ بها فروقات</SelectItem>
              <SelectItem value="pending">⏳ لم تكتمل</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{complete} من {purchaseOrders.length} دورة مكتملة</span>
          </div>
        </div>
      </CardContent></Card>

      {/* Header Labels */}
      <div className="grid grid-cols-3 text-center text-xs font-semibold text-muted-foreground px-4">
        <span className="text-blue-600">📋 أمر الشراء</span>
        <span className="text-green-600">📦 طلب الاستلام</span>
        <span className="text-purple-600">🧾 فاتورة المورد</span>
      </div>

      {filtered.length === 0
        ? <div className="text-center py-16 text-muted-foreground">لا توجد نتائج</div>
        : filtered.map(order => (
          <CycleRow key={order.id} order={order} receipts={receipts} invoices={invoices} />
        ))}
    </div>
  );
}