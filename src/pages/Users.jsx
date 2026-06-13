import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import PageHeader from "../components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, User, Mail, CheckCircle, XCircle, Copy, GitBranch, Briefcase, Crown, Users as UsersIcon, Calendar } from "lucide-react";
import PermissionGuard from "../components/shared/PermissionGuard";
import PageAccessEditor from "../components/users/PageAccessEditor";
import RoleTemplatesDialog from "../components/users/RoleTemplates";
import { MODULES, SECTIONS, ACTIONS, SECTION_LABELS, ACTION_LABELS, ROLE_LABELS } from "@/hooks/usePermissions";
import { useSubscription, PLAN_PRESETS } from "@/hooks/useSubscription";

const ROLE_COLORS = {
  admin: "destructive", accountant: "default", inventory: "secondary",
  costs_manager: "outline", branch_manager: "outline", viewer: "outline", user: "outline",
};

// Pre-built packages to quickly apply
const PACKAGES = [
  { label: "المحاسبة فقط", sections: ["dashboard","accounting","invoices","vouchers","reports","financial"], actions: ["view","create","edit"] },
  { label: "المخازن فقط",  sections: ["dashboard","warehouses","reports"], actions: ["view","create","edit","delete"] },
  { label: "التكاليف فقط", sections: ["dashboard","costs","reports"], actions: ["view","create","edit","delete"] },
  { label: "الفروع فقط",   sections: ["dashboard","branches","reports"], actions: ["view","create","edit"] },
  { label: "محاسبة + مخازن", sections: ["dashboard","accounting","invoices","vouchers","warehouses","reports","financial"], actions: ["view","create","edit"] },
  { label: "نسخة كاملة (بدون مستخدمين)", sections: Object.keys(SECTION_LABELS).filter(s => s !== "users"), actions: ["view","create","edit","delete"] },
  { label: "نسخة كاملة (مع مستخدمين)", sections: Object.keys(SECTION_LABELS), actions: ["view","create","edit","delete"] },
];

function buildPermissionsFromPackage(pkg) {
  const p = {};
  pkg.sections.forEach(s => pkg.actions.forEach(a => { p[`${s}.${a}`] = true; }));
  return p;
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [showInvite, setShowInvite] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const { isAdmin } = useBranchFilter();
  const { subscription } = useSubscription();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const currentUser = await base44.auth.me();
      const isOwner = currentUser?.email === 'hloubi81@gmail.com';

      if (isOwner) {
        const usersRes = await base44.functions.invoke('getAllUsers', {});
        setUsers(usersRes.data?.users || []);
      } else {
        const selfUser = await base44.entities.User.filter({ id: currentUser.id });
        setUsers(selfUser || []);
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }

    // تحميل الفروع بشكل مستقل - قد لا يملك بعض المستخدمين صلاحية قراءتها
    try {
      const brs = await base44.entities.Branch.list();
      setBranches(brs || []);
    } catch {
      setBranches([]);
    }
  }

  function loadUsers() { loadData(); }

  async function handleInvite() {
    if (!inviteEmail) return;
    
    try {
      const currentUser = await base44.auth.me();
      
      // Save invite details if the user has a subscription
      if (currentUser?.subscription_id) {
        await base44.entities.PendingInvite.create({
          email: inviteEmail.toLowerCase(),
          subscription_id: currentUser.subscription_id,
          role: inviteRole,
        });
      }

      await base44.users.inviteUser(inviteEmail, inviteRole === "admin" ? "admin" : "user");

      await base44.entities.Notification.create({
        title: `تم إرسال دعوة إلى ${inviteEmail}`,
        message: `تم إرسال بريد إلكتروني بالدعوة إلى ${inviteEmail}. سيظهر المستخدم في القائمة بعد قبوله للدعوة وإكمال تسجيله.`,
        type: "معلومة",
        related_module: "المستخدمون",
        is_read: false,
        trigger_date: new Date().toISOString().split("T")[0],
      });

      toast.success("تم إرسال الدعوة بنجاح");
      setShowInvite(false);
      setInviteEmail("");
    } catch (err) {
      toast.error(err.message || "حدث خطأ أثناء إرسال الدعوة");
    }
  }

  async function handleSavePermissions() {
    const originalUser = users.find(u => u.id === editUser.id);
    
    await base44.functions.invoke('updateSubscriptionUser', {
      userId: editUser.id,
      updates: {
        role: editUser.role,
        permissions: editUser.permissions || {},
        is_active: editUser.is_active,
        department: editUser.department,
        branch_id: editUser.branch_id || "",
        branch_name: editUser.branch_name || "",
      }
    });

    // تنبيه عند تغيير القسم
    if (editUser.department && editUser.department !== originalUser?.department) {
      await base44.entities.Notification.create({
        title: `تم تعيينك في قسم جديد`,
        message: `تم تعيينك في قسم "${editUser.department}". إذا كان لديك أي استفسار تواصل مع المسؤول.`,
        type: "تنبيه",
        related_module: "المستخدمون",
        related_id: editUser.id,
        is_read: false,
        trigger_date: new Date().toISOString().split("T")[0],
        target_user_id: editUser.id,
      });
    }

    // تنبيه عند تفعيل الحساب
    if (editUser.is_active === true && originalUser?.is_active === false) {
      await base44.entities.Notification.create({
        title: `تم تفعيل حسابك`,
        message: `تم تفعيل حسابك في النظام. يمكنك الآن تسجيل الدخول والبدء باستخدام التطبيق.`,
        type: "ترحيب",
        related_module: "المستخدمون",
        related_id: editUser.id,
        is_read: false,
        trigger_date: new Date().toISOString().split("T")[0],
        target_user_id: editUser.id,
      });
    }

    toast.success("تم حفظ الصلاحيات");
    setShowDialog(false);
    loadUsers();
  }

  function togglePerm(key) {
    const perms = editUser.permissions || {};
    const updated = { ...perms, [key]: !perms[key] };
    if (!updated[key]) delete updated[key];
    setEditUser({ ...editUser, permissions: updated });
  }

  function applyPackage(pkg) {
    setEditUser({ ...editUser, permissions: buildPermissionsFromPackage(pkg) });
    toast.success(`تم تطبيق حزمة: ${pkg.label}`);
  }

  function countPerms(u) {
    if (!u.permissions || typeof u.permissions !== "object") return 0;
    return Object.values(u.permissions).filter(Boolean).length;
  }

  const isAdminRole = editUser?.role === "admin";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <PermissionGuard module={MODULES.USERS_MANAGE}>
      <div>
        <PageHeader
          title="إدارة المستخدمين والصلاحيات"
          subtitle="تحكم كامل في الأدوار والصلاحيات (عرض / إضافة / تعديل / حذف) لكل قسم"
          onAdd={() => setShowInvite(true)}
          addLabel="دعوة مستخدم جديد"
        />

        {/* بطاقة معلومات الاشتراك */}
        {subscription && (() => {
          const plan = PLAN_PRESETS[subscription.plan] || {};
          const maxUsers = subscription.max_users || plan.max_users || 0;
          const currentCount = users.length;
          const expiryDate = subscription.expiry_date ? new Date(subscription.expiry_date).toLocaleDateString('ar-EG') : null;
          const usagePercent = maxUsers > 0 && maxUsers < 999 ? Math.min(100, Math.round((currentCount / maxUsers) * 100)) : null;

          return (
            <div className="mb-5 p-4 rounded-xl border bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/10 dark:to-blue-950/20 flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[11px] text-muted-foreground">الباقة الحالية</p>
                  <p className="font-bold text-sm text-primary">{plan.label || subscription.plan}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-[11px] text-muted-foreground">المستخدمون</p>
                  <p className="font-bold text-sm">
                    {currentCount} / {maxUsers >= 999 ? "غير محدود" : maxUsers}
                  </p>
                  {usagePercent !== null && (
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                      <div
                        className={`h-1.5 rounded-full ${usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {expiryDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">تاريخ الانتهاء</p>
                    <p className="font-bold text-sm">{expiryDate}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-[11px] text-muted-foreground">الحالة</p>
                  <p className="font-bold text-sm text-green-600">{subscription.is_active ? "نشط" : "غير نشط"}</p>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <Card key={u.id} className={u.is_active === false ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{u.full_name || "مستخدم"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</p>
                    </div>
                  </div>
                  <Badge variant={ROLE_COLORS[u.role] || "outline"} className="text-xs">
                    {ROLE_LABELS[u.role] || u.role}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    {u.is_active !== false
                      ? <><CheckCircle className="h-3.5 w-3.5 text-green-500" />نشط</>
                      : <><XCircle className="h-3.5 w-3.5 text-red-500" />غير نشط</>}
                  </span>
                  <span className="flex gap-2">
                    {u.branch_name && <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300">{u.branch_name}</Badge>}
                    {u.department && <span>{u.department}</span>}
                  </span>
                </div>

                {u.role === "admin" ? (
                  <p className="text-xs text-amber-600 mb-3 flex items-center gap-1"><Shield className="h-3 w-3"/>كل الصلاحيات</p>
                ) : countPerms(u) > 0 ? (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">{countPerms(u)} صلاحية مخصصة:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(SECTION_LABELS)
                        .filter(([sec]) => Object.keys(u.permissions || {}).some(k => k.startsWith(sec + ".")))
                        .map(([sec, cfg]) => (
                          <span key={sec} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {cfg.label}
                          </span>
                        ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">صلاحيات افتراضية حسب الدور</p>
                )}

                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"
                  onClick={() => { setEditUser({ ...u, permissions: u.permissions || {} }); setShowDialog(true); }}>
                  <Shield className="h-3.5 w-3.5" /> تعديل الصلاحيات
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Invite Dialog */}
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>دعوة مستخدم جديد</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">البريد الإلكتروني</Label>
                <Input placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div><Label className="text-xs">الدور الافتراضي</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS)
                      .filter(([k]) => isAdmin || k !== "admin")
                      .map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={handleInvite}>إرسال الدعوة</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Role Templates Dialog */}
        <RoleTemplatesDialog
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onApply={(tpl) => {
            setEditUser({ ...editUser, permissions: tpl.permissions });
            toast.success(`تم تطبيق قالب: ${tpl.label}`);
          }}
        />

        {/* Edit Permissions Dialog */}
        {editUser && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary"/>
                  صلاحيات: {editUser.full_name || editUser.email}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                {/* Role + Department */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">الدور</Label>
                    <Select value={editUser.role || "user"} onValueChange={(v) => setEditUser({ ...editUser, role: v, permissions: v === "admin" ? {} : editUser.permissions })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS)
                          .filter(([k]) => isAdmin || k !== "admin")
                          .map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">القسم / الوظيفة</Label>
                    <Input className="h-9" value={editUser.department || ""} onChange={(e) => setEditUser({ ...editUser, department: e.target.value })} placeholder="مثال: المحاسبة" />
                  </div>
                </div>

                {/* Branch Assignment */}
                {branches.length > 0 && (
                  <div>
                    <Label className="text-xs flex items-center gap-1"><GitBranch className="h-3 w-3"/>الفرع (يحدد البيانات التي يراها المستخدم)</Label>
                    <Select
                      value={editUser.branch_id || "all"}
                      onValueChange={(v) => {
                        const b = branches.find((br) => br.id === v);
                        setEditUser({ ...editUser, branch_id: v === "all" ? "" : v, branch_name: b ? b.name : "" });
                      }}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="كل الفروع (بدون قيد)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الفروع (بدون قيد)</SelectItem>
                        {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">المدير يرى كل الفروع بغض النظر عن هذا الإعداد</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox id="is_active" checked={editUser.is_active !== false}
                    onCheckedChange={(v) => setEditUser({ ...editUser, is_active: v })} />
                  <Label htmlFor="is_active" className="text-sm cursor-pointer">الحساب نشط</Label>
                </div>

                {/* Quick packages */}
                {!isAdminRole && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">⚡ حزم جاهزة (تطبيق سريع):</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1 border-primary text-primary hover:bg-primary/10"
                        onClick={() => setShowTemplates(true)}>
                        <Briefcase className="h-3 w-3"/>قوالب الأدوار الوظيفية
                      </Button>
                      {PACKAGES.map(pkg => (
                        <Button key={pkg.label} variant="outline" size="sm" className="text-xs h-7 gap-1"
                          onClick={() => applyPackage(pkg)}>
                          <Copy className="h-3 w-3"/>{pkg.label}
                        </Button>
                      ))}
                      <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive"
                        onClick={() => setEditUser({ ...editUser, permissions: {} })}>
                        مسح الكل
                      </Button>
                    </div>
                  </div>
                )}

                {/* RBAC Table */}
                {!isAdminRole ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">الصلاحيات التفصيلية:</p>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/60">
                            <th className="text-right px-3 py-2 font-semibold">القسم</th>
                            {Object.values(ACTIONS).map(a => (
                              <th key={a} className="px-3 py-2 text-center font-semibold">{ACTION_LABELS[a]}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(SECTION_LABELS).map(([sec, cfg], idx) => (
                            <tr key={sec} className={idx % 2 === 0 ? "" : "bg-muted/20"}>
                              <td className="px-3 py-2 font-medium">{cfg.label}</td>
                              {Object.values(ACTIONS).map(a => {
                                const key = `${sec}.${a}`;
                                const supported = cfg.actions.includes(a);
                                return (
                                  <td key={a} className="px-3 py-2 text-center">
                                    {supported ? (
                                      <Checkbox
                                        checked={!!(editUser.permissions || {})[key]}
                                        onCheckedChange={() => togglePerm(key)}
                                      />
                                    ) : (
                                      <span className="text-muted-foreground/30">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <Shield className="h-8 w-8 text-amber-500 mx-auto mb-1"/>
                    <p className="text-sm font-semibold text-amber-700">المدير يملك جميع الصلاحيات تلقائياً</p>
                  </div>
                )}

                {/* Page-level access customization */}
                {!isAdminRole && (
                  <PageAccessEditor
                    editUser={editUser}
                    onChange={(updates, fullPerms) => {
                      if (fullPerms) {
                        setEditUser({ ...editUser, permissions: fullPerms });
                      } else {
                        setEditUser({ ...editUser, permissions: { ...(editUser.permissions || {}), ...updates } });
                      }
                    }}
                  />
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
                <Button onClick={handleSavePermissions}>حفظ الصلاحيات</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PermissionGuard>
  );
}