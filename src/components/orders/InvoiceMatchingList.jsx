import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, XCircle, Link } from "lucide-react";
import { toast } from "sonner";

function computeMatchStatus(receipt, invoice) {
  if (!receipt || !invoice) return "غير محدد";
  let qtyDiff = false, priceDiff = false;
  receipt.items?.forEach(ri => {
    const ii = invoice.items?.find(x => x.product_id === ri.product_id);
    if (!ii) { qtyDiff = true; return; }
    if (Math.abs((ri.received_quantity || 0) - (ii.quantity || 0)) > 0.001) qtyDiff = true;
    if (Math.abs((ri.price || 0) - (ii.price || 0)) > 0.001) priceDiff = true;
  });
  if (qtyDiff && priceDiff) return "فرق مزدوج";
  if (qtyDiff) return "فرق في الكمية";
  if (priceDiff) return "فرق في السعر";
  return "مطابق";
}

const MATCH_CONFIG = {
  "مطابق": { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 border-green-200" },
  "فرق في الكمية": { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  "فرق في السعر": { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  "فرق مزدوج": { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  "غير محدد": { icon: Link, color: "text-gray-400", bg: "bg-gray-50 border-gray-200" },
};

export default function InvoiceMatchingList({ receipts, invoices, orders, onRefresh }) {
  const [linkDialog, setLinkDialog] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // فواتير مشتريات غير مرتبطة بعد
  const unlinkedInvoices = invoices.filter(inv => !receipts.some(r => r.linked_invoice_id === inv.id));

  function openLink(receipt) {
    setSelectedReceipt(receipt);
    setSelectedInvoiceId("");
    setLinkDialog(true);
  }

  async function handleLink() {
    if (!selectedInvoiceId) { toast.error("اختر فاتورة أولاً"); return; }
    const invoice = invoices.find(i => i.id === selectedInvoiceId);
    const matchStatus = computeMatchStatus(selectedReceipt, invoice);
    const receiptStatus = matchStatus === "مطابق" ? "مطابق" : "به فروقات";

    await base44.entities.GoodsReceipt.update(selectedReceipt.id, {
      linked_invoice_id: selectedInvoiceId,
      linked_invoice_number: invoice?.invoice_number || "",
      match_status: matchStatus,
      status: receiptStatus,
    });

    // تحديث أمر الشراء
    const order = orders.find(o => o.id === selectedReceipt.purchase_order_id);
    if (order) {
      await base44.entities.PurchaseOrder.update(order.id, {
        linked_invoice_id: selectedInvoiceId,
        linked_invoice_number: invoice?.invoice_number || "",
        status: "مستلم كلياً",
      });
    }

    toast.success(`تمت الربط — حالة المطابقة: ${matchStatus}`);
    setLinkDialog(false);
    onRefresh();
  }

  function openDetail(receipt) {
    const invoice = invoices.find(i => i.id === receipt.linked_invoice_id);
    const order = orders.find(o => o.id === receipt.purchase_order_id);
    setDetailData({ receipt, invoice, order });
    setDetailDialog(true);
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(MATCH_CONFIG).map(([status, cfg]) => {
          const Icon = cfg.icon;
          const count = receipts.filter(r => (r.match_status || "غير محدد") === status).length;
          return (
            <div key={status} className={`rounded-xl border p-3 ${cfg.bg}`}>
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${cfg.color}`} />
                <div><p className={`text-lg font-bold ${cfg.color}`}>{count}</p><p className="text-xs text-muted-foreground">{status}</p></div>
              </div>
            </div>
          );
        })}
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right font-medium">طلب الاستلام</th>
                <th className="px-4 py-3 text-right font-medium">أمر الشراء</th>
                <th className="px-4 py-3 text-right font-medium">المورد</th>
                <th className="px-4 py-3 text-right font-medium">فاتورة المورد</th>
                <th className="px-4 py-3 text-center font-medium">حالة المطابقة</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">لا توجد طلبات استلام</td></tr>
              ) : receipts.map(r => {
                const match = r.match_status || "غير محدد";
                const cfg = MATCH_CONFIG[match] || MATCH_CONFIG["غير محدد"];
                const Icon = cfg.icon;
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-semibold">{r.receipt_number}</td>
                    <td className="px-4 py-3 text-blue-700">{r.purchase_order_number || "—"}</td>
                    <td className="px-4 py-3">{r.supplier_name || "—"}</td>
                    <td className="px-4 py-3">
                      {r.linked_invoice_number
                        ? <span className="text-purple-700 font-medium">{r.linked_invoice_number}</span>
                        : <span className="text-muted-foreground text-xs italic">لم تُربط بعد</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${cfg.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        <span className={cfg.color}>{match}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!r.linked_invoice_id ? (
                          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => openLink(r)}>
                            <Link className="h-3.5 w-3.5" /> ربط بفاتورة
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => openDetail(r)}>عرض التفاصيل</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      {/* Link Dialog */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>ربط بفاتورة مورد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/40 rounded-lg p-3 text-sm">
              <p>طلب الاستلام: <strong>{selectedReceipt?.receipt_number}</strong></p>
              <p>المورد: <strong>{selectedReceipt?.supplier_name}</strong></p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">اختر فاتورة المورد</label>
              <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                <SelectTrigger><SelectValue placeholder="اختر فاتورة مشتريات" /></SelectTrigger>
                <SelectContent>
                  {unlinkedInvoices.length === 0
                    ? <SelectItem value="_none" disabled>لا توجد فواتير مشتريات غير مرتبطة</SelectItem>
                    : unlinkedInvoices.map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} — {inv.client_name} — {(inv.total || 0).toLocaleString()}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">سيتم تحليل الفروقات تلقائياً بين الكميات والأسعار.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLinkDialog(false)}>إلغاء</Button>
            <Button onClick={handleLink}>ربط وتحليل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>تقرير مطابقة المستندات</DialogTitle></DialogHeader>
          {detailData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "أمر الشراء", value: detailData.order?.order_number, color: "text-blue-700" },
                  { label: "طلب الاستلام", value: detailData.receipt.receipt_number, color: "text-green-700" },
                  { label: "فاتورة المورد", value: detailData.receipt.linked_invoice_number, color: "text-purple-700" },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/40 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`font-bold ${item.color}`}>{item.value || "—"}</p>
                  </div>
                ))}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-right">الصنف</th>
                      <th className="p-2 text-center">كمية الأمر</th>
                      <th className="p-2 text-center">كمية مستلمة</th>
                      <th className="p-2 text-center">كمية الفاتورة</th>
                      <th className="p-2 text-center">سعر الأمر</th>
                      <th className="p-2 text-center">سعر الفاتورة</th>
                      <th className="p-2 text-center">التطابق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.receipt.items?.map((ri, i) => {
                      const ii = detailData.invoice?.items?.find(x => x.product_id === ri.product_id);
                      const qtyMatch = Math.abs((ri.received_quantity || 0) - (ii?.quantity || 0)) < 0.001;
                      const priceMatch = Math.abs((ri.price || 0) - (ii?.price || 0)) < 0.001;
                      return (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-medium">{ri.product_name}</td>
                          <td className="p-2 text-center text-muted-foreground">{ri.ordered_quantity}</td>
                          <td className={`p-2 text-center font-medium ${!qtyMatch ? "text-red-600" : "text-green-600"}`}>{ri.received_quantity}</td>
                          <td className="p-2 text-center">{ii?.quantity ?? "—"}</td>
                          <td className="p-2 text-center text-muted-foreground">{ri.price}</td>
                          <td className={`p-2 text-center ${!priceMatch ? "text-orange-600" : "text-green-600"}`}>{ii?.price ?? "—"}</td>
                          <td className="p-2 text-center">
                            {qtyMatch && priceMatch
                              ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                              : <AlertTriangle className="h-4 w-4 text-yellow-600 mx-auto" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {detailData.receipt.match_status !== "مطابق" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  ⚠️ يوجد فروقات في هذه الدورة المستندية. يُرجى مراجعة الأرقام مع المورد.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}