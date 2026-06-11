import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PLAN_PRESETS } from "@/hooks/useSubscription.jsx";
import { Clock, CheckCircle2, XCircle, Eye, RefreshCw, Smartphone, Building, CreditCard } from "lucide-react";

const STATUS_BADGE = {
  "معلق": "bg-orange-100 text-orange-700 border-orange-200",
  "مقبول": "bg-green-100 text-green-700 border-green-200",
  "مرفوض": "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICON = {
  "معلق": Clock,
  "مقبول": CheckCircle2,
  "مرفوض": XCircle,
};

export default function PaymentRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState("معلق");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const list = await base44.entities.PaymentRequest.list("-created_date");
    setRequests(list);
    setLoading(false);
  }

  async function approve(req) {
    setProcessing(true);
    const preset = PLAN_PRESETS[req.plan];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // إنشاء الاشتراك
    const newSub = await base44.entities.Subscription.create({
      client_name: req.client_name,
      plan: req.plan,
      features: { ...preset.features },
      max_users: preset.max_users,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      is_active: true,
      notes: `تم التفعيل يدوياً — ${req.payment_method} — رقم: ${req.transaction_reference}`,
    });

    // تحديث حالة الطلب
    const me = await base44.auth.me();
    await base44.entities.PaymentRequest.update(req.id, {
      status: "مقبول",
      reviewed_by: me?.full_name || "المسؤول",
      reviewed_at: new Date().toISOString(),
    });

    // إشعار للمستخدم
    await base44.entities.Notification.create({
      title: "تم تفعيل اشتراكك! 🎉",
      message: `تهانينا! تم التحقق من دفعتك وتفعيل باقة ${preset?.label} لمدة سنة كاملة.`,
      type: "تأكيد",
      related_module: "الاشتراكات",
      related_id: newSub.id,
      is_read: false,
      trigger_date: new Date().toISOString().split("T")[0],
    });

    toast.success(`✅ تم قبول الطلب وتفعيل باقة ${preset?.label} لـ ${req.client_name}`);
    setSelected(null);
    setProcessing(false);
    load();
  }

  async function reject(req) {
    if (!rejectionReason.trim()) return toast.error("يرجى إدخال سبب الرفض");
    setProcessing(true);
    const me = await base44.auth.me();
    await base44.entities.PaymentRequest.update(req.id, {
      status: "مرفوض",
      rejection_reason: rejectionReason.trim(),
      reviewed_by: me?.full_name || "المسؤول",
      reviewed_at: new Date().toISOString(),
    });

    // إشعار للمستخدم
    await base44.entities.Notification.create({
      title: "تم رفض طلب الاشتراك",
      message: `تم رفض طلب اشتراكك في باقة ${PLAN_PRESETS[req.plan]?.label}. السبب: ${rejectionReason}. يرجى التواصل معنا لمزيد من المعلومات.`,
      type: "رفض",
      related_module: "الاشتراكات",
      is_read: false,
      trigger_date: new Date().toISOString().split("T")[0],
    });

    toast.success("تم رفض الطلب وإشعار المستخدم");
    setSelected(null);
    setRejectionReason("");
    setProcessing(false);
    load();
  }

  const filtered = requests.filter(r => filter === "الكل" ? true : r.status === filter);
  const pendingCount = requests.filter(r => r.status === "معلق").length;

  if (loading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "معلقة", val: requests.filter(r => r.status === "معلق").length, color: "text-orange-600", bg: "bg-orange-50", Icon: Clock },
          { label: "مقبولة", val: requests.filter(r => r.status === "مقبول").length, color: "text-green-600", bg: "bg-green-50", Icon: CheckCircle2 },
          { label: "مرفوضة", val: requests.filter(r => r.status === "مرفوض").length, color: "text-red-600", bg: "bg-red-50", Icon: XCircle },
        ].map(({ label, val, color, bg, Icon }) => (
          <Card key={label} className={bg}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-6 w-6 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{val}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Tabs & Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["معلق", "مقبول", "مرفوض", "الكل"].map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="text-xs h-7"
            >
              {f} {f === "معلق" && pendingCount > 0 && <Badge className="mr-1 h-4 px-1 bg-orange-200 text-orange-700 border-0 text-xs">{pendingCount}</Badge>}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={load} className="gap-1 h-7">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="text-sm">لا توجد طلبات في هذه الفئة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-right px-4 py-3 text-xs font-semibold">الشركة</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">الباقة</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">طريقة الدفع</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">رقم العملية</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">التاريخ</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">الحالة</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((req, i) => {
                    const preset = PLAN_PRESETS[req.plan];
                    const StatusIcon = STATUS_ICON[req.status] || Clock;
                    return (
                      <tr key={req.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        <td className="px-4 py-3 font-medium">{req.client_name}</td>
                        <td className="px-4 py-3 text-xs">{preset?.label || req.plan}</td>
                        <td className="px-4 py-3 text-xs">{req.payment_method}</td>
                        <td className="px-4 py-3 font-mono text-xs">{req.transaction_reference}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {req.created_date ? new Date(req.created_date).toLocaleDateString("ar-EG") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs border ${STATUS_BADGE[req.status]}`}>
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {req.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setSelected(req)}>
                            <Eye className="h-3.5 w-3.5" />
                            {req.status === "معلق" ? "مراجعة" : "عرض"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setRejectionReason(""); }}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>مراجعة طلب الاشتراك</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">الشركة</span><p className="font-semibold">{selected.client_name}</p></div>
                <div><span className="text-muted-foreground text-xs">المستخدم</span><p className="font-semibold">{selected.user_name || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">الباقة</span><p className="font-semibold">{PLAN_PRESETS[selected.plan]?.label}</p></div>
                <div><span className="text-muted-foreground text-xs">طريقة الدفع</span><p className="font-semibold">{selected.payment_method}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground text-xs">رقم العملية</span><p className="font-mono font-bold text-primary">{selected.transaction_reference}</p></div>
                {selected.amount && <div><span className="text-muted-foreground text-xs">المبلغ</span><p className="font-semibold">{selected.amount} جنيه</p></div>}
                {selected.notes && <div className="col-span-2"><span className="text-muted-foreground text-xs">ملاحظات</span><p>{selected.notes}</p></div>}
              </div>

              {/* Screenshot */}
              {selected.screenshot_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">صورة الإيصال:</p>
                  <a href={selected.screenshot_url} target="_blank" rel="noreferrer">
                    <img src={selected.screenshot_url} alt="إيصال" className="rounded-lg border max-h-48 object-contain w-full" />
                  </a>
                </div>
              )}

              {/* Rejection Reason (only for pending) */}
              {selected.status === "معلق" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">سبب الرفض (مطلوب عند الرفض)</Label>
                  <Input
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="أدخل سبب الرفض إن وجد"
                  />
                </div>
              )}

              {/* Reviewed Info */}
              {selected.status !== "معلق" && (
                <div className="rounded-xl bg-muted/50 border p-3 text-xs space-y-1">
                  <p><span className="text-muted-foreground">تمت المراجعة بواسطة: </span>{selected.reviewed_by}</p>
                  <p><span className="text-muted-foreground">في: </span>{selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleString("ar-EG") : "—"}</p>
                  {selected.rejection_reason && <p><span className="text-muted-foreground">سبب الرفض: </span>{selected.rejection_reason}</p>}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setSelected(null); setRejectionReason(""); }}>إغلاق</Button>
              {selected.status === "معلق" && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => reject(selected)}
                    disabled={processing}
                    className="gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    رفض
                  </Button>
                  <Button
                    onClick={() => approve(selected)}
                    disabled={processing}
                    className="gap-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {processing ? "جارٍ التفعيل..." : "قبول وتفعيل"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}