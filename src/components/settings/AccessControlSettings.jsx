import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Shield, User, Search, Copy, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Eye, Plus, Pencil, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SECTION_LABELS, ACTION_LABELS, ACTIONS, ROLE_LABELS
} from "@/hooks/usePermissions";

const ROLE_COLORS = {
  admin: "bg-red-100 text-red-700",
  accountant: "bg-blue-100 text-blue-700",
  inventory: "bg-green-100 text-green-700",
  costs_manager: "bg-purple-100 text-purple-700",
  branch_manager: "bg-orange-100 text-orange-700",
  viewer: "bg-gray-100 text-gray-600",
  user: "bg-slate-100 text-slate-600",
};

const ACTION_ICONS = {
  view: <Eye className="h-3 w-3" />,
  create: <Plus className="h-3 w-3" />,
  edit: <Pencil className="h-3 w-3" />,
  delete: <Trash2 className="h-3 w-3" />,
};

const QUICK_PACKAGES = [
  { label: "قراءة فقط", icon: "👁", actions: ["view"], sections: Object.keys(SECTION_LABELS) },
  { label: "محاسبة كاملة", icon: "📊", actions: ["view","create","edit"], sections: ["dashboard","accounting","invoices","vouchers","reports","financial"] },
  { label: "مخازن كاملة", icon: "📦", actions: ["view","create","edit","delete"], sections: ["dashboard","warehouses","reports"] },
  { label: "تكاليف", icon: "💰", actions: ["view","create","edit"], sections: ["dashboard","costs","reports"] },
  { label: "مدير فرع", icon: "🏬", actions: ["view","create","edit"], sections: ["dashboard","branches","invoices","warehouses","reports"] },
  { label: "وصول كامل (بدون مستخدمين)", icon: "⚡", actions: ["view","create","edit","delete"], sections: Object.keys(SECTION_LABELS).filter(s => s !== "users") },
];

function buildPermissionsFromPackage({ sections, actions }) {
  const p = {};
  sections.forEach(s => actions.forEach(a => { p[`${s}.${a}`] = true; }));
  return p;
}

function countPerms(u) {
  if (!u?.permissions || typeof u.permissions !== "object") return 0;
  return Object.values(u.permissions).filter(Boolean).length;
}

export default function AccessControlSettings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const list = await base44.entities.User.list();
    setUsers(list);
    setLoading(false);
  }

  function selectUser(u) {
    setSelectedUser({ ...u, permissions: u.permissions || {} });
  }

  function togglePerm(key) {
    const perms = selectedUser.permissions || {};
    const updated = { ...perms, [key]: !perms[key] };
    if (!updated[key]) delete updated[key];
    setSelectedUser(s => ({ ...s, permissions: updated }));
  }

  function toggleSection(sec, action) {
    const cfg = SECTION_LABELS[sec];
    const actionsToToggle = action ? [action] : cfg.actions;
    const perms = { ...selectedUser.permissions };
    const allChecked = actionsToToggle.every(a => perms[`${sec}.${a}`]);
    actionsToToggle.forEach(a => {
      const key = `${sec}.${a}`;
      if (allChecked) delete perms[key];
      else perms[key] = true;
    });
    setSelectedUser(s => ({ ...s, permissions: perms }));
  }

  function applyPackage(pkg) {
    setSelectedUser(s => ({ ...s, permissions: buildPermissionsFromPackage(pkg) }));
    toast.success(`تم تطبيق حزمة: ${pkg.label}`);
  }

  async function handleSave() {
    setSaving(true);
    await base44.entities.User.update(selectedUser.id, {
      role: selectedUser.role,
      permissions: selectedUser.permissions || {},
      department: selectedUser.department,
      is_active: selectedUser.is_active,
    });
    toast.success(`تم حفظ صلاحيات ${selectedUser.full_name || selectedUser.email}`);
    setSaving(false);
    loadUsers();
  }

  const filtered = users.filter(u =>
    !search ||
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = selectedUser?.role === "admin";

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-4 border-b mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          إدارة صلاحيات الوصول
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">تحكم في ما يستطيع كل موظف رؤيته أو تعديله داخل النظام</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-320px)] min-h-[480px]">
        {/* Users List */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pr-9 h-8 text-sm" placeholder="ابحث عن موظف..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 border rounded-xl p-1.5">
            {filtered.map(u => (
              <button
                key={u.id}
                onClick={() => selectUser(u)}
                className={cn(
                  "w-full text-right p-2.5 rounded-lg transition-all flex items-center gap-2.5",
                  selectedUser?.id === u.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  selectedUser?.id === u.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                )}>
                  {(u.full_name || u.email || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-semibold truncate", selectedUser?.id === u.id ? "text-white" : "")}>{u.full_name || "مستخدم"}</p>
                  <p className={cn("text-xs truncate", selectedUser?.id === u.id ? "text-white/70" : "text-muted-foreground")}>{ROLE_LABELS[u.role] || u.role}</p>
                </div>
                <span className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  u.is_active !== false ? "bg-green-400" : "bg-red-400"
                )} />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">لا يوجد مستخدمون</p>
            )}
          </div>
        </div>

        {/* Permissions Panel */}
        <div className="flex-1 overflow-y-auto">
          {!selectedUser ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">اختر موظفاً من القائمة</p>
              <p className="text-xs text-muted-foreground mt-1">لتعديل صلاحياته في النظام</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User Info Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {(selectedUser.full_name || selectedUser.email || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedUser.full_name || "مستخدم"}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                    selectedUser.is_active !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {selectedUser.is_active !== false
                      ? <><CheckCircle className="h-3 w-3" />نشط</>
                      : <><XCircle className="h-3 w-3" />معطّل</>}
                  </span>
                  <Badge className={cn("text-xs border-0", ROLE_COLORS[selectedUser.role] || "bg-gray-100")}>
                    {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                  </Badge>
                </div>
              </div>

              {/* Role + Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">الدور الوظيفي</Label>
                  <Select
                    value={selectedUser.role || "user"}
                    onValueChange={v => setSelectedUser(s => ({ ...s, role: v, permissions: v === "admin" ? {} : s.permissions }))}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">القسم / الوظيفة</Label>
                  <Input className="h-9" value={selectedUser.department || ""} onChange={e => setSelectedUser(s => ({ ...s, department: e.target.value }))} placeholder="مثال: المحاسبة" />
                </div>
              </div>

              {/* Toggle Active */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/20">
                <Checkbox
                  id="active_check"
                  checked={selectedUser.is_active !== false}
                  onCheckedChange={v => setSelectedUser(s => ({ ...s, is_active: v }))}
                />
                <Label htmlFor="active_check" className="text-sm cursor-pointer">الحساب مفعّل (يستطيع تسجيل الدخول)</Label>
              </div>

              {isAdmin ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                  <Shield className="h-10 w-10 text-amber-400 mx-auto mb-2" />
                  <p className="font-semibold text-amber-700">المدير يملك جميع الصلاحيات تلقائياً</p>
                  <p className="text-xs text-amber-600 mt-1">لتقييد صلاحياته، غيّر الدور الوظيفي أعلاه</p>
                </div>
              ) : (
                <>
                  {/* Quick Packages */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">⚡ حزم جاهزة (تطبيق سريع):</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PACKAGES.map(pkg => (
                        <button
                          key={pkg.label}
                          onClick={() => applyPackage(pkg)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-background hover:bg-muted hover:border-primary/40 transition-all"
                        >
                          <span>{pkg.icon}</span> {pkg.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setSelectedUser(s => ({ ...s, permissions: {} }))}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                      >
                        مسح الكل
                      </button>
                    </div>
                  </div>

                  {/* Permissions Matrix */}
                  <div className="border rounded-xl overflow-hidden">
                    <div className="bg-muted/60 px-4 py-2.5 flex items-center justify-between border-b">
                      <p className="text-xs font-bold">الصلاحيات التفصيلية لكل قسم</p>
                      <p className="text-xs text-muted-foreground">{countPerms(selectedUser)} صلاحية مفعّلة</p>
                    </div>

                    {/* Action Headers */}
                    <div className="grid grid-cols-6 gap-0 bg-muted/30 px-4 py-2 border-b text-xs font-semibold text-center text-muted-foreground">
                      <div className="col-span-2 text-right">القسم</div>
                      {Object.values(ACTIONS).map(a => (
                        <div key={a} className="flex flex-col items-center gap-0.5">
                          {ACTION_ICONS[a]}
                          <span>{ACTION_LABELS[a]}</span>
                        </div>
                      ))}
                    </div>

                    <div className="divide-y">
                      {Object.entries(SECTION_LABELS).map(([sec, cfg], idx) => {
                        const rowAllChecked = cfg.actions.every(a => (selectedUser.permissions || {})[`${sec}.${a}`]);
                        return (
                          <div key={sec} className={cn(
                            "grid grid-cols-6 gap-0 px-4 py-2.5 items-center hover:bg-muted/20 transition-colors",
                            idx % 2 === 1 ? "bg-muted/10" : ""
                          )}>
                            <div className="col-span-2 flex items-center gap-2">
                              <Checkbox
                                checked={rowAllChecked}
                                onCheckedChange={() => toggleSection(sec)}
                                title="تفعيل/إلغاء الصف كله"
                              />
                              <span className="text-sm font-medium">{cfg.label}</span>
                            </div>
                            {Object.values(ACTIONS).map(a => {
                              const key = `${sec}.${a}`;
                              const supported = cfg.actions.includes(a);
                              const checked = !!(selectedUser.permissions || {})[key];
                              return (
                                <div key={a} className="flex justify-center">
                                  {supported ? (
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => togglePerm(key)}
                                      className={cn(
                                        checked
                                          ? a === "delete" ? "data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                                            : a === "view" ? "data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                            : "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                          : ""
                                      )}
                                    />
                                  ) : (
                                    <span className="text-muted-foreground/25 text-sm">—</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-500 inline-block" />عرض</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-600 inline-block" />إضافة / تعديل</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-500 inline-block" />حذف</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-muted-foreground/30 inline-block" />غير مفعّل</span>
                  </div>
                </>
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-2 border-t">
                <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-32">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield className="h-4 w-4" />}
                  {saving ? "جاري الحفظ..." : "حفظ الصلاحيات"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}