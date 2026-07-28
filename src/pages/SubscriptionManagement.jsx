import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Crown, Zap, Building2, CheckCircle2, XCircle, Pencil, Plus, LayoutDashboard, List, Gift, Sparkles, Trash2, CreditCard, ArrowUpCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PLAN_PRESETS, FEATURE_LABELS } from "@/hooks/useSubscription.jsx";
import PermissionGuard from "@/components/shared/PermissionGuard";
import { MODULES } from "@/hooks/usePermissions";
import SubscriptionDashboard from "@/components/subscriptions/SubscriptionDashboard";
import PaymentRequestsPanel from "@/components/subscriptions/PaymentRequestsPanel";
import PaymentRequestDialog from "@/components/subscriptions/PaymentRequestDialog";

const PLAN_ICONS = { free_trial: Gift, basic: Zap, advanced: Crown, enterprise: Building2 };
const PLAN_COLORS = { free_trial: "bg-amber-50 border-amber-300", basic: "bg-blue-50 border-blue-200", advanced: "bg-purple-50 border-purple-200", enterprise: "bg-emerald-50 border-emerald-200" };

const emptyForm = {
  client_name: "",
  plan: "basic",
  features: { ...PLAN_PRESETS.basic.features },
  max_users: 2,
  start_date: new Date().toISOString().split("T")[0],
  end_date: "",
  is_active: true,
  notes: "",
};

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [upgradeTarget, setUpgradeTarget] = useState(null); // { planKey }
  const [currentUser, setCurrentUser] = useState(null);
  const [showUpgradePayment, setShowUpgradePayment] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const list = await base44.entities.Subscription.list("-created_date");
    setSubscriptions(list);
    setLoading(false);
  }

  function openNew() {
    setForm({ ...emptyForm, features: { ...PLAN_PRESETS.basic.features } });
    setEditId(null);
    setOpen(true);
  }

  function openEdit(s) {
    setForm({ ...s, features: { ...PLAN_PRESETS[s.plan].features, ...s.features } });
    setEditId(s.id);
    setOpen(true);
  }

  function applyPreset(plan) {
    const preset = PLAN_PRESETS[plan];
    const updates = { plan, features: { ...preset.features }, max_users: preset.max_users };
    if (plan === "free_trial" && preset.duration_months) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + preset.duration_months);
      updates.end_date = endDate.toISOString().split("T")[0];
      updates.start_date = new Date().toISOString().split("T")[0];
    }
    setForm(f => ({ ...f, ...updates }));
  }

  function toggleFeature(key) {
    setForm(f => ({ ...f, features: { ...f.features, [key]: !f.features[key] } }));
  }

  async function save() {
    if (!form.client_name) return toast.error("يرجى إدخال اسم العميل");
    if (editId) {
      const existing = subscriptions.find(s => s.id === editId);
      if (existing?.is_trial && existing.end_date && form.end_date && form.end_date > existing.end_date) {
        return toast.error("لا يمكن تجديد الاشتراك التجريبي أو تمديد فترته");
      }
      await base44.entities.Subscription.update(editId, form);
      toast.success("تم تحديث الاشتراك");
    } else {
      await base44.entities.Subscription.create(form);
      toast.success("تم إنشاء الاشتراك");
    }
    setOpen(false);
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await base44.entities.Subscription.delete(deleteTarget.id);
    toast.success("تم حذف الاشتراك");
    setDeleteTarget(null);
    load();
  }

  async function toggleActive(sub) {
    if (!sub.is_active && sub.is_trial && sub.end_date) {
      const today = new Date().toISOString().split("T")[0];
      if (sub.end_date < today) return toast.error("انتهت فترة التجربة المجانية ولا يمكن إعادة تفعيلها");
    }
    await base44.entities.Subscription.update(sub.id, { is_active: !sub.is_active });
    toast.success(!sub.is_active ? "تم تفعيل الاشتراك" : "تم إيقاف الاشتراك");
    load();
  }

  function handleSubscribePlan(planKey) {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    setUpgradeTarget({ planKey });
    setShowUpgradePayment(true);
  }

  const activeCount = subscriptions.filter(s => s.is_active).length;

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <PermissionGuard module={MODULES.USERS_MANAGE}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة الاشتراكات</h1>
            <p className="text-muted-foreground text-sm mt-1">متابعة حالة الاشتراكات والتنبيهات التلقائية قبل انتهاء الصلاحية</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />اشتراك جديد</Button>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" />لوحة المتابعة</TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />طلبات الدفع</TabsTrigger>
            <TabsTrigger value="manage" className="gap-1.5"><List className="h-3.5 w-3.5" />الإدارة والخطط</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SubscriptionDashboard subscriptions={subscriptions} onRefresh={load} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentRequestsPanel />
          </TabsContent>

          <TabsContent value="manage">
            <div className="space-y-6">

        {/* Plan comparison cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(PLAN_PRESETS).filter(([key]) => key !== "free_trial").map(([key, preset]) => {
            const Icon = PLAN_ICONS[key];
            const count = subscriptions.filter(s => s.plan === key && s.is_active).length;
            return (
              <div key={key} className={`rounded-xl border-2 p-4 ${PLAN_COLORS[key]}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-bold">{preset.label}</span>
                  </div>
                  <Badge variant="secondary">{count} عميل</Badge>
                </div>
                <div className="space-y-1">
                  {Object.entries(FEATURE_LABELS).map(([fk, fl]) => (
                    <div key={fk} className="flex items-center gap-1.5 text-xs">
                      {preset.features[fk]
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        : <XCircle className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
                      <span className={preset.features[fk] ? "" : "text-muted-foreground/50"}>{fl}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3 text-muted-foreground">حتى {preset.max_users} مستخدم</p>
                <Button
                  size="sm"
                  className={`w-full mt-3 text-xs gap-1.5 text-white ${
                    key === "free_trial" ? "bg-amber-500 hover:bg-amber-600" :
                    key === "basic" ? "bg-blue-600 hover:bg-blue-700" :
                    key === "advanced" ? "bg-purple-600 hover:bg-purple-700" :
                    "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                  onClick={() => handleSubscribePlan(key)}
                >
                  {key === "free_trial" ? <><Gift className="h-3.5 w-3.5" />ابدأ مجاناً</> : <><ArrowUpCircle className="h-3.5 w-3.5" />اشترك الآن</>}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Subscriptions list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              قائمة الاشتراكات
              <Badge variant="outline">{subscriptions.length} إجمالي</Badge>
              <Badge variant="default">{activeCount} نشط</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {subscriptions.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">لا توجد اشتراكات. أنشئ اشتراكاً جديداً.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-right px-4 py-3 text-xs font-semibold">العميل</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الخطة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الميزات المفعّلة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">المستخدمون</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الانتهاء</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">الحالة</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s, i) => {
                      const preset = PLAN_PRESETS[s.plan];
                      const Icon = PLAN_ICONS[s.plan] || Zap;
                      const enabledCount = Object.values(s.features || {}).filter(Boolean).length;
                      return (
                        <tr key={s.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                          <td className="px-4 py-3 font-medium">{s.client_name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${preset?.color}`}>
                              <Icon className="h-3 w-3" />{preset?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(s.features || {}).filter(([,v]) => v).map(([k]) => (
                                <span key={k} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{FEATURE_LABELS[k]}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">{s.max_users || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.end_date || "—"}</td>
                          <td className="px-4 py-3">
                            <Switch checked={!!s.is_active} onCheckedChange={() => toggleActive(s)} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الاشتراك</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف اشتراك "{deleteTarget?.client_name}"؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                حذف نهائياً
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Upgrade/Subscribe Payment Dialog */}
        {upgradeTarget && (
          <PaymentRequestDialog
            open={showUpgradePayment}
            onOpenChange={(v) => { setShowUpgradePayment(v); if (!v) setUpgradeTarget(null); }}
            planKey={upgradeTarget.planKey}
            user={currentUser}
          />
        )}

        {/* Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "تعديل الاشتراك" : "اشتراك جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">اسم العميل *</Label>
                  <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="اسم الشركة أو العميل" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">تاريخ البداية</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">تاريخ الانتهاء</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">الحد الأقصى للمستخدمين</Label>
                  <Input type="number" value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: +e.target.value }))} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={!!form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <Label className="text-sm">اشتراك نشط</Label>
                </div>
              </div>

              {/* Plan quick select */}
              <div>
                <Label className="text-xs mb-2 block">نوع الخطة (اختيار سريع)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PLAN_PRESETS).map(([key, preset]) => {
                    const Icon = PLAN_ICONS[key];
                    return (
                      <button key={key} type="button"
                        onClick={() => applyPreset(key)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all
                          ${form.plan === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                        <Icon className="h-5 w-5" />
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom features */}
              <div>
                <Label className="text-xs mb-2 block">الميزات المفعّلة (يمكن التخصيص)</Label>
                <div className="grid grid-cols-2 gap-2 border rounded-lg p-3">
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox id={`f-${key}`} checked={!!form.features[key]} onCheckedChange={() => toggleFeature(key)} />
                      <Label htmlFor={`f-${key}`} className="text-xs cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">ملاحظات</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات إضافية" />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button onClick={save}>{editId ? "تحديث" : "إنشاء"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}