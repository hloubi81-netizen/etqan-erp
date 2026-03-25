import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
import { Shield, User, Mail, CheckCircle, XCircle } from "lucide-react";
import PermissionGuard from "../components/shared/PermissionGuard";
import { MODULES } from "@/hooks/usePermissions";

const ROLE_LABELS = { admin: "مدير", basic: "أساسية", advanced: "متقدمة", premium: "مميزة", accountant: "محاسب", inventory: "مخازن", viewer: "مشاهد", user: "مستخدم" };
const ROLE_COLORS = { admin: "destructive", basic: "outline", advanced: "default", premium: "secondary", accountant: "default", inventory: "secondary", viewer: "outline", user: "outline" };

const ALL_PERMISSIONS = [
  { key: MODULES.DASHBOARD, label: "لوحة التحكم" },
  { key: MODULES.PRODUCTS, label: "المواد والمجموعات" },
  { key: MODULES.WAREHOUSES, label: "المستودعات" },
  { key: MODULES.ACCOUNTS, label: "شجرة الحسابات" },
  { key: MODULES.CURRENCIES, label: "العملات" },
  { key: MODULES.INVOICES_VIEW, label: "عرض الفواتير" },
  { key: MODULES.INVOICES_CREATE, label: "إنشاء الفواتير" },
  { key: MODULES.INVOICES_DELETE, label: "حذف الفواتير" },
  { key: MODULES.VOUCHERS_VIEW, label: "عرض السندات" },
  { key: MODULES.VOUCHERS_CREATE, label: "إنشاء السندات" },
  { key: MODULES.STOCK_TRANSFERS, label: "مناقلات المخزون" },
  { key: MODULES.INVENTORY_COUNT, label: "جرد المخزون" },
  { key: MODULES.REPORTS, label: "التقارير" },
  { key: MODULES.FINANCIAL_STATEMENTS, label: "القوائم المالية" },
  { key: MODULES.USERS_MANAGE, label: "إدارة المستخدمين" },
  { key: MODULES.SETTINGS, label: "الإعدادات" },
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [originalUser, setOriginalUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const list = await base44.entities.User.list();
    setUsers(list);
    setLoading(false);
  }

  async function handleInvite() {
    if (!inviteEmail) return;
    await base44.users.inviteUser(inviteEmail, inviteRole === "admin" ? "admin" : "user");
    toast.success("تم إرسال الدعوة بنجاح");
    setShowInvite(false);
    setInviteEmail("");
  }

  async function handleSavePermissions() {
    await base44.auth.updateMe ? null : null;
    await base44.entities.User.update(editUser.id, {
      role: editUser.role,
      permissions: editUser.permissions || [],
      is_active: editUser.is_active,
      department: editUser.department,
    });
    toast.success("تم حفظ الصلاحيات");
    setShowDialog(false);
    loadUsers();
  }

  function togglePermission(key) {
    const perms = editUser.permissions || [];
    const updated = perms.includes(key) ? perms.filter((p) => p !== key) : [...perms, key];
    setEditUser({ ...editUser, permissions: updated });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <PermissionGuard module={MODULES.USERS_MANAGE}>
      <div>
        <PageHeader
          title="إدارة المستخدمين والصلاحيات"
          subtitle="تحكم في أدوار المستخدمين وصلاحياتهم على جميع وحدات البرنامج"
          onAdd={() => setShowInvite(true)}
          addLabel="دعوة مستخدم جديد"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <Card key={u.id} className={`${u.is_active === false ? "opacity-60" : ""}`}>
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

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    {u.is_active !== false
                      ? <><CheckCircle className="h-3.5 w-3.5 text-green-500" />نشط</>
                      : <><XCircle className="h-3.5 w-3.5 text-red-500" />غير نشط</>
                    }
                  </span>
                  {u.department && <span>{u.department}</span>}
                </div>

                {u.permissions && u.permissions.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-3">صلاحيات مخصصة: {u.permissions.length}</p>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => { const copy = { ...u, permissions: u.permissions || [] }; setEditUser(copy); setOriginalUser(copy); setShowDialog(true); }}
                >
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
              <div><Label className="text-xs">البريد الإلكتروني</Label><Input placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div>
              <div>
                <Label className="text-xs">الدور</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="accountant">محاسب</SelectItem>
                    <SelectItem value="inventory">مخازن</SelectItem>
                    <SelectItem value="viewer">مشاهد</SelectItem>
                    <SelectItem value="user">مستخدم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInvite}>إرسال الدعوة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Permissions Dialog */}
        {editUser && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>صلاحيات: {editUser.full_name || editUser.email}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">الدور</Label>
                    <Select value={editUser.role || "user"} onValueChange={(v) => setEditUser({ ...editUser, role: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">مدير (كل الصلاحيات)</SelectItem>
                        <SelectItem value="premium">نسخة مميزة (فروع + قوائم مالية)</SelectItem>
                        <SelectItem value="advanced">نسخة متقدمة (محاسبة + مخازن + تكاليف)</SelectItem>
                        <SelectItem value="basic">نسخة أساسية (مخازن فقط)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">القسم</Label>
                    <Input className="h-9" value={editUser.department || ""} onChange={(e) => setEditUser({ ...editUser, department: e.target.value })} placeholder="مثال: المحاسبة" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_active"
                    checked={editUser.is_active !== false}
                    onCheckedChange={(v) => setEditUser({ ...editUser, is_active: v })}
                  />
                  <Label htmlFor="is_active" className="text-sm cursor-pointer">الحساب نشط</Label>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">صلاحيات مخصصة (تتجاوز الدور الافتراضي):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_PERMISSIONS.map((p) => (
                      <div key={p.key} className="flex items-center gap-2">
                        <Checkbox
                          id={p.key}
                          checked={(editUser.permissions || []).includes(p.key)}
                          onCheckedChange={() => togglePermission(p.key)}
                          disabled={editUser.role === "admin"}
                        />
                        <Label htmlFor={p.key} className="text-xs cursor-pointer">{p.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
                <Button variant="ghost" onClick={() => setEditUser({ ...originalUser })} className="text-amber-600 hover:text-amber-700">التراجع عن التعديل</Button>
                <Button onClick={handleSavePermissions}>حفظ الصلاحيات</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PermissionGuard>
  );
}