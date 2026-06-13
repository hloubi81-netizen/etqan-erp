import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PLAN_PRESETS, FEATURE_LABELS } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Crown, Users, CheckCircle, XCircle, AlertTriangle,
  Settings, Plus, Edit2, Power, TrendingUp, Calendar, Package
} from "lucide-react";
import PermissionGuard from "@/components/shared/PermissionGuard";

const PLAN_COLORS = {
  free_trial: "bg-amber-100 text-amber-700 border-amber-200",
  basic: "bg-blue-100 text-blue-700 border-blue-200",
  advanced: "bg-purple-100 text-purple-700 border-purple-200",
  enterprise: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function AdminControlPanel() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [createForm, setCreateForm] = useState({ client_name: "", plan: "basic", is_active: true });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [subs, usersRes] = await Promise.all([
        base44.entities.Subscription.list("-created_date", 100),
        base44.functions.invoke('getAllUsers', {})
      ]);
      setSubscriptions(subs || []);
      setAllUsers(usersRes.data?.users || []);
    } catch (e) {
      toast.error("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  function getUsersForSub(subId) {
    return allUsers.filter(u => u.subscription_id === subId);
  }

  function getSubStatus(sub) {
    if (!sub.is_active) return { label: "موقوف", color: "text-red-600", icon: XCircle };
    if (sub.end_date) {
      const diff = Math.ceil((new Date(sub.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (diff < 0) return { label: "منتهي", color: "text-red-600", icon: XCircle };
      if (diff <= 7) return { label: `ينتهي خلال ${diff} يوم`, color: "text-amber-600", icon: AlertTriangle };
    }
    return { label: "نشط", color: "text-green-600", icon: CheckCircle };
  }

  function openEdit(sub) {
    setSelectedSub(sub);
    setEditForm({
      plan: sub.plan,
      is_active: sub.is_active,
      max_users: sub.max_users,
      end_date: sub.end_date || "",
      notes: sub.notes || "",
      features: sub.features || PLAN_PRESETS[sub.plan]?.features || {},
    });
    setShowEditDialog(true);
  }

  async function handleSaveEdit() {
    try {
      await base44.entities.Subscription.update(selectedSub.id, {
        plan: editForm.plan,
        is_active: editForm.is_active,
        max_users: editForm.max_users,
        end_date: editForm.end_date || null,
        notes: editForm.notes,
        features: editForm.features,
      });
      toast.success("تم تحديث الاشتراك بنجاح");
      setShowEditDialog(false);
      loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء التحديث");
    }
  }

  async function handleToggleActive(sub) {
    try {
      await base44.entities.Subscription.update(sub.id, { is_active: !sub.is_active });
      toast.success(sub.is_active ? "تم إيقاف الاشتراك" : "تم تفعيل الاشتراك");
      loadData();
    } catch (e) {
      toast.error("حدث خطأ");
    }
  }

  async function handleCreateSub() {
    if (!createForm.client_name) return toast.error("يرجى إدخال اسم العميل");
    try {
      const preset = PLAN_PRESETS[createForm.plan] || {};
      const today = new Date().toISOString().split("T")[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (preset.duration_days || 365));

      await base44.entities.Subscription.create({
        client_name: createForm.client_name,
        plan: createForm.plan,
        is_active: true,
        start_date: today,
        end_date: endDate.toISOString().split("T")[0],
        max_users: preset.max_users || 5,
        features: preset.features || {},
      });
      toast.success("تم إنشاء الاشتراك بنجاح");
      setShowCreateDialog(false);
      setCreateForm({ client_name: "", plan: "basic", is_active: true });
      loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء الإنشاء");
    }
  }

  function applyPlanPreset(plan) {
    const preset = PLAN_PRESETS[plan];
    if (preset) {
      setEditForm(f => ({
        ...f,
        plan,
        max_users: preset.max_users,
        features: { ...preset.features },
      }));
    }
  }

  const filteredSubs = subscriptions.filter(s =>
    s.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalActive = subscriptions.filter(s => s.is_active).length;
  const totalUsers = allUsers.length;
  const expiringSoon = subscriptions.filter(s => {
    if (!s.end_date || !s.is_active) return false;
    const diff = Math.ceil((new Date(s.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <PermissionGuard module="admin">
      <div className="p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="h-6 w-6 text-primary" />
              لوحة تحكم المدير الأساسي
            </h1>
            <p className="text-sm text-muted-foreground mt-1">مراقبة وإدارة جميع اشتراكات العملاء</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> إنشاء اشتراك جديد
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الاشتراكات</p>
                <p className="text-2xl font-bold">{subscriptions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">اشتراكات نشطة</p>
                <p className="text-2xl font-bold text-green-600">{totalActive}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold text-purple-600">{totalUsers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">تنتهي قريباً</p>
                <p className="text-2xl font-bold text-amber-600">{expiringSoon}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Input
          placeholder="بحث باسم العميل..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />

        {/* Subscriptions Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">قائمة الاشتراكات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-right px-4 py-3 font-semibold">العميل</th>
                    <th className="text-right px-4 py-3 font-semibold">الباقة</th>
                    <th className="text-right px-4 py-3 font-semibold">المستخدمون</th>
                    <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                    <th className="text-right px-4 py-3 font-semibold">تاريخ الانتهاء</th>
                    <th className="text-right px-4 py-3 font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.map(sub => {
                    const status = getSubStatus(sub);
                    const StatusIcon = status.icon;
                    const subUsers = getUsersForSub(sub.id);
                    const plan = PLAN_PRESETS[sub.plan] || {};
                    const maxUsers = sub.max_users || plan.max_users || 0;
                    const usagePct = maxUsers > 0 && maxUsers < 999 ? Math.min(100, Math.round((subUsers.length / maxUsers) * 100)) : null;

                    return (
                      <tr key={sub.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{sub.client_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${PLAN_COLORS[sub.plan] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                            {plan.label || sub.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{subUsers.length} / {maxUsers >= 999 ? "∞" : maxUsers}</span>
                            {usagePct !== null && (
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                                <div
                                  className={`h-1.5 rounded-full ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-green-500"}`}
                                  style={{ width: `${usagePct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs font-medium ${status.color}`}>
                            <StatusIcon className="h-3.5 w-3.5" />{status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {sub.end_date ? new Date(sub.end_date).toLocaleDateString('ar-EG') : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => openEdit(sub)}>
                              <Edit2 className="h-3 w-3" /> تعديل
                            </Button>
                            <Button
                              size="sm"
                              variant={sub.is_active ? "destructive" : "outline"}
                              className="h-7 gap-1 text-xs"
                              onClick={() => handleToggleActive(sub)}
                            >
                              <Power className="h-3 w-3" />
                              {sub.is_active ? "إيقاف" : "تفعيل"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSubs.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">لا توجد اشتراكات</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create Subscription Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> إنشاء اشتراك جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">اسم العميل / الشركة</Label>
                <Input placeholder="مثال: شركة النور" value={createForm.client_name}
                  onChange={e => setCreateForm(f => ({ ...f, client_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">الباقة</Label>
                <Select value={createForm.plan} onValueChange={v => setCreateForm(f => ({ ...f, plan: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAN_PRESETS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {createForm.plan && (
                <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
                  <p className="font-semibold text-muted-foreground">تفاصيل الباقة:</p>
                  <p>الحد الأقصى للمستخدمين: <span className="font-bold">{PLAN_PRESETS[createForm.plan]?.max_users >= 999 ? "غير محدود" : PLAN_PRESETS[createForm.plan]?.max_users}</span></p>
                  <p>الميزات: {Object.entries(PLAN_PRESETS[createForm.plan]?.features || {}).filter(([,v]) => v).map(([k]) => FEATURE_LABELS[k]).join("، ")}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
              <Button onClick={handleCreateSub}>إنشاء الاشتراك</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Subscription Dialog */}
        {selectedSub && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  تعديل اشتراك: {selectedSub.client_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Plan Selection */}
                <div>
                  <Label className="text-xs">الباقة</Label>
                  <Select value={editForm.plan} onValueChange={v => applyPlanPreset(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLAN_PRESETS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Max Users */}
                <div>
                  <Label className="text-xs">الحد الأقصى للمستخدمين</Label>
                  <Input type="number" min={1} value={editForm.max_users || ""}
                    onChange={e => setEditForm(f => ({ ...f, max_users: parseInt(e.target.value) || 1 }))} />
                </div>

                {/* End Date */}
                <div>
                  <Label className="text-xs">تاريخ الانتهاء</Label>
                  <Input type="date" value={editForm.end_date || ""}
                    onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label className="text-sm font-medium">الاشتراك نشط</Label>
                  <Switch checked={editForm.is_active}
                    onCheckedChange={v => setEditForm(f => ({ ...f, is_active: v }))} />
                </div>

                {/* Features */}
                <div>
                  <Label className="text-xs font-semibold mb-2 block">الميزات المفعلة</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-2 border rounded-lg">
                        <span className="text-xs">{label}</span>
                        <Switch
                          checked={!!(editForm.features?.[key])}
                          onCheckedChange={v => setEditForm(f => ({ ...f, features: { ...f.features, [key]: v } }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-xs">ملاحظات</Label>
                  <Input value={editForm.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات اختيارية..." />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>إلغاء</Button>
                <Button onClick={handleSaveEdit}>حفظ التغييرات</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PermissionGuard>
  );
}