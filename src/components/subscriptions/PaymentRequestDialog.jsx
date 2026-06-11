import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PLAN_PRESETS } from "@/hooks/useSubscription.jsx";
import { Smartphone, CreditCard, Upload, CheckCircle2, AlertCircle } from "lucide-react";

const PLAN_PRICES = { basic: 299, advanced: 599, enterprise: 999 };
function calcTotal(planKey, extraUsers = 0) {
  const base = PLAN_PRICES[planKey] || 0;
  const perMonth = PLAN_PRESETS[planKey]?.extra_user_price_monthly || 0;
  return base + extraUsers * perMonth * 12;
}
const PAYMENT_ICONS = {
  "فودافون كاش": Smartphone,
  "أخرى": CreditCard,
};

const PAYMENT_ACCOUNTS = {
  "فودافون كاش": { label: "رقم فودافون كاش", value: "01127311382", hint: "أرسل المبلغ على هذا الرقم ثم أدخل رقم العملية" },
  "أخرى": { label: "مرجع الدفع", value: "تواصل معنا للحصول على بيانات الدفع", hint: "تواصل مع الدعم لمعرفة طرق الدفع الأخرى" },
};

export default function PaymentRequestDialog({ open, onOpenChange, planKey, extraUsers = 0, user }) {
  const totalAmount = calcTotal(planKey, extraUsers);
  const [form, setForm] = useState({
    client_name: "",
    payment_method: "",
    transaction_reference: "",
    screenshot_url: "",
    amount: totalAmount,
    notes: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const preset = PLAN_PRESETS[planKey];
  const account = form.payment_method ? PAYMENT_ACCOUNTS[form.payment_method] : null;

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, screenshot_url: file_url }));
    setUploading(false);
    toast.success("تم رفع الإيصال بنجاح");
  }

  async function handleSubmit() {
    if (!form.client_name.trim()) return toast.error("يرجى إدخال اسم الشركة");
    if (!form.payment_method) return toast.error("يرجى اختيار طريقة الدفع");
    if (!form.transaction_reference.trim()) return toast.error("يرجى إدخال رقم العملية");
    setSaving(true);
    await base44.entities.PaymentRequest.create({
      user_id: user?.id || "",
      user_name: user?.full_name || "",
      user_email: user?.email || "",
      client_name: form.client_name.trim(),
      plan: planKey,
      payment_method: form.payment_method,
      transaction_reference: form.transaction_reference.trim(),
      screenshot_url: form.screenshot_url,
      amount: form.amount,
      status: "معلق",
      notes: form.notes,
    });
    // إشعار للمسؤول
    await base44.entities.Notification.create({
      title: `طلب اشتراك جديد — ${preset?.label}`,
      message: `${form.client_name} طلب الاشتراك في باقة ${preset?.label} عبر ${form.payment_method}. رقم العملية: ${form.transaction_reference}`,
      type: "طلب",
      related_module: "الاشتراكات",
      is_read: false,
      trigger_date: new Date().toISOString().split("T")[0],
    });
    setSaving(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" dir="rtl">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">تم إرسال طلبك بنجاح!</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              سيقوم فريقنا بمراجعة طلبك والتحقق من عملية الدفع خلال 24 ساعة. سيتم تفعيل اشتراكك فور التأكيد.
            </p>
            <Badge className="bg-orange-100 text-orange-700 border-0">قيد المراجعة</Badge>
            <Button className="mt-2" onClick={() => { onOpenChange(false); setSubmitted(false); }}>حسناً</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            طلب الاشتراك — باقة {preset?.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Plan Summary */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">باقة {preset?.label}</span>
              <span className="text-sm text-muted-foreground">{PLAN_PRICES[planKey]} جنيه</span>
            </div>
            {extraUsers > 0 && (
              <div className="flex items-center justify-between text-xs text-blue-600">
                <span>مستخدمون إضافيون ({extraUsers} × {PLAN_PRESETS[planKey]?.extra_user_price_monthly} جنيه × 12 شهر)</span>
                <span>+ {extraUsers * (PLAN_PRESETS[planKey]?.extra_user_price_monthly || 0) * 12} جنيه</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-1 mt-1">
              <span className="text-sm font-semibold">الإجمالي السنوي</span>
              <span className="text-lg font-bold text-primary">{totalAmount} جنيه</span>
            </div>
          </div>

          {/* Company Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">اسم الشركة / المؤسسة *</Label>
            <Input
              value={form.client_name}
              onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              placeholder="أدخل اسم شركتك أو مؤسستك"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-xs">طريقة الدفع *</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(PAYMENT_ACCOUNTS).map(method => {
                const Icon = PAYMENT_ICONS[method];
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, payment_method: method }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all
                      ${form.payment_method === method ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {method}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Account Info */}
          {account && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-700">{account.label}:</p>
              <p className="text-base font-bold text-blue-900 font-mono tracking-wider">{account.value}</p>
              <div className="flex items-start gap-1.5 mt-1">
                <AlertCircle className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-600">{account.hint}</p>
              </div>
            </div>
          )}

          {/* Transaction Reference */}
          <div className="space-y-1.5">
            <Label className="text-xs">رقم العملية / المرجع *</Label>
            <Input
              value={form.transaction_reference}
              onChange={e => setForm(f => ({ ...f, transaction_reference: e.target.value }))}
              placeholder="أدخل رقم العملية الذي وصلك في رسالة التأكيد"
            />
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">صورة إيصال الدفع <span className="text-orange-500">*</span></Label>
            <div className={`border-2 border-dashed rounded-xl transition-all ${form.screenshot_url ? "border-green-400 bg-green-50" : "border-border hover:border-primary/50 bg-muted/30"}`}>
              {form.screenshot_url ? (
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">تم رفع الإيصال بنجاح</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, screenshot_url: "" }))}
                      className="text-xs text-red-500 hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                  <img
                    src={form.screenshot_url}
                    alt="إيصال الدفع"
                    className="w-full max-h-48 object-contain rounded-lg border border-green-200"
                  />
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-3 p-6">
                  {uploading ? (
                    <>
                      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">جارٍ رفع الصورة...</span>
                    </>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">اضغط لرفع صورة الإيصال</p>
                        <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, JPEG — حجم أقصى 10MB</p>
                      </div>
                    </>
                  )}
                  <input type="file" className="hidden" accept="image/png,image/jpg,image/jpeg,image/webp" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">ملاحظات (اختياري)</Label>
            <Input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="أي ملاحظات إضافية"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving ? "جارٍ الإرسال..." : "إرسال طلب الاشتراك"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}