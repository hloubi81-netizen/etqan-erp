import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSubscription, PLAN_PRESETS, FEATURE_LABELS } from "@/hooks/useSubscription";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, UserPlus, Mail, CheckCircle, XCircle, Crown,
  Shield, Calendar, AlertTriangle, User, Briefcase
} from "lucide-react";
import { ROLE_LABELS } from "@/hooks/usePermissions";

const ROLE_COLORS = {
  admin: "destructive", accountant: "default", inventory: "secondary",
  costs_manager: "outline", branch_manager: "outline", viewer: "outline", user: "outline",
};

export default function TeamManagement() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [teamUsers, setTeamUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviteJob, setInviteJob] = useState("");
  const [inviting, setInviting] = useState(false);

  const plan = subscription ? PLAN_PRESETS[subscription.plan] || {} : {};
  const maxUsers = subscription?.max_users || plan.max_users || 0;
  const usedSeats = teamUsers.length;
  const remainingSeats = maxUsers >= 999 ? "غير محدود" : Math.max(0, maxUsers - usedSeats);
  const canInvite = maxUsers >= 999 || usedSeats < maxUsers;
  const usagePct = maxUsers > 0 && maxUsers < 999 ? Math.min(100, Math.round((usedSeats / maxUsers) * 100)) : null;

  useEffect(() => { loadTeam(); }, [user?.subscription_id]);

  async function loadTeam() {
    if (!user?.subscription_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getAllUsers', {});
      const all = res.data?.users || [];
      const myTeam = all.filter(u => u.subscription_id === user.subscription_id && u.id !== user.id);
      setTeamUsers(myTeam);
    } catch {
      toast.error("حدث خطأ أثناء تحميل الفريق");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail) return toast.error("يرجى إدخال البريد الإلكتروني");
    if (!canInvite) return toast.error("لقد وصلت إلى الحد الأقصى للمستخدمين في باقتك");

    setInviting(true);
    try {
      // Save pending invite with our subscription_id so claimInvite can link the user
      await base44.entities.PendingInvite.create({
        email: inviteEmail.toLowerCase(),
        subscription_id: user.subscription_id,
        role: inviteRole,
        description: inviteJob,
      });

      // Send the actual platform invite
      await base44.users.inviteUser(inviteEmail, "user");

      toast.success(`تم إرسال الدعوة إلى ${inviteEmail}`);
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("user");
      setInviteJob("");
      loadTeam();
    } catch (e) {
      toast.error(e.message || "حدث خطأ أثناء إرسال الدعوة");
    } finally {
      setInviting(false);
    }
  }

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4 text-center" dir="rtl">
        <Crown className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-muted-foreground">لا يوجد اشتراك نشط</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          يجب أن يكون لديك اشتراك نشط لإدارة فريق عملك.
          تواصل مع المدير الأساسي لتفعيل اشتراكك.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            إدارة الفريق
          </h1>
          <p className="text-sm text-muted-foreground mt-1">دعوة وإدارة أعضاء فريق عملك</p>
        </div>
        <Button
          onClick={() => setShowInvite(true)}
          disabled={!canInvite}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          دعوة عضو جديد
        </Button>
      </div>

      {/* Subscription Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Plan Info */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الباقة الحالية</p>
              <p className="font-bold text-primary">{plan.label || subscription.plan}</p>
            </div>
          </CardContent>
        </Card>

        {/* Seats Usage */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">المقاعد</p>
            </div>
            <p className="font-bold text-lg">{usedSeats} / {maxUsers >= 999 ? "∞" : maxUsers}</p>
            {usagePct !== null && (
              <div className="mt-2">
                <div className="w-full h-2 bg-gray-100 rounded-full">
                  <div
                    className={`h-2 rounded-full transition-all ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-green-500"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{remainingSeats} مقعد متبقي</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiry */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${subscription.is_active ? "bg-green-100" : "bg-red-100"}`}>
              {subscription.is_active
                ? <CheckCircle className="h-5 w-5 text-green-600" />
                : <XCircle className="h-5 w-5 text-red-600" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">حالة الاشتراك</p>
              <p className={`font-bold ${subscription.is_active ? "text-green-600" : "text-red-600"}`}>
                {subscription.is_active ? "نشط" : "غير نشط"}
              </p>
              {subscription.end_date && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" />
                  ينتهي: {new Date(subscription.end_date).toLocaleDateString('ar-EG')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Features */}
      <div>
        <p className="text-sm font-semibold mb-2">الوحدات المتاحة في باقتك:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(FEATURE_LABELS).map(([key, label]) => {
            const enabled = subscription.features?.[key] || plan.features?.[key];
            return (
              <span
                key={key}
                className={`text-xs px-3 py-1 rounded-full border font-medium ${enabled ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-400 border-gray-200 line-through"}`}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Seat Warning */}
      {!canInvite && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm">لقد استهلكت كامل مقاعد المستخدمين في باقتك ({maxUsers} مقاعد). تواصل مع المدير الأساسي لترقية باقتك.</p>
        </div>
      )}

      {/* Team Members */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          أعضاء الفريق ({teamUsers.length})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : teamUsers.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا يوجد أعضاء في الفريق بعد</p>
            <p className="text-sm mt-1">ابدأ بدعوة أول عضو في فريقك</p>
            {canInvite && (
              <Button onClick={() => setShowInvite(true)} className="mt-4 gap-2">
                <UserPlus className="h-4 w-4" /> دعوة الآن
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamUsers.map(member => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{member.full_name || "مستخدم"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />{member.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant={ROLE_COLORS[member.role] || "outline"} className="text-xs shrink-0">
                      {ROLE_LABELS[member.role] || member.role}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {member.is_active !== false
                        ? <><CheckCircle className="h-3.5 w-3.5 text-green-500" />نشط</>
                        : <><XCircle className="h-3.5 w-3.5 text-red-500" />غير نشط</>}
                    </span>
                    {member.department && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />{member.department}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> دعوة عضو جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200">
              المقاعد المتبقية: <span className="font-bold">{remainingSeats}</span> من أصل {maxUsers >= 999 ? "غير محدود" : maxUsers}
            </div>
            <div>
              <Label className="text-xs">البريد الإلكتروني *</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">الدور الوظيفي</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS)
                    .filter(([k]) => k !== "admin")
                    .map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">القسم / الوظيفة (اختياري)</Label>
              <Input
                placeholder="مثال: قسم المحاسبة"
                value={inviteJob}
                onChange={e => setInviteJob(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>إلغاء</Button>
            <Button onClick={handleInvite} disabled={inviting} className="gap-2">
              {inviting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mail className="h-4 w-4" />}
              إرسال الدعوة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}