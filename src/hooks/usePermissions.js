import { useAuth } from "@/lib/AuthContext";

// ─── Sections ───────────────────────────────────────────────
export const SECTIONS = {
  DASHBOARD:           "dashboard",
  ACCOUNTING:          "accounting",
  INVOICES:            "invoices",
  VOUCHERS:            "vouchers",
  WAREHOUSES:          "warehouses",
  COSTS:               "costs",
  BRANCHES:            "branches",
  REPORTS:             "reports",
  FINANCIAL:           "financial",
  USERS:               "users",
  SETTINGS:            "settings",
};

// ─── Actions ────────────────────────────────────────────────
export const ACTIONS = {
  VIEW:   "view",
  CREATE: "create",
  EDIT:   "edit",
  DELETE: "delete",
};

// ─── Section labels (for UI) ─────────────────────────────────
export const SECTION_LABELS = {
  dashboard:  { label: "لوحة التحكم",      actions: ["view"] },
  accounting: { label: "المحاسبة",          actions: ["view","create","edit","delete"] },
  invoices:   { label: "الفواتير",           actions: ["view","create","edit","delete"] },
  vouchers:   { label: "السندات",            actions: ["view","create","edit","delete"] },
  warehouses: { label: "المخازن والمواد",    actions: ["view","create","edit","delete"] },
  costs:      { label: "نظام التكاليف",     actions: ["view","create","edit","delete"] },
  branches:   { label: "الفروع والمعارض",   actions: ["view","create","edit","delete"] },
  reports:    { label: "التقارير",           actions: ["view"] },
  financial:  { label: "القوائم المالية",   actions: ["view"] },
  users:      { label: "إدارة المستخدمين", actions: ["view","create","edit","delete"] },
  settings:   { label: "الإعدادات",         actions: ["view","edit"] },
};

export const ACTION_LABELS = {
  view:   "عرض",
  create: "إضافة",
  edit:   "تعديل",
  delete: "حذف",
};

// ─── Default permissions per built-in role ───────────────────
const ALL_PERMS = () => {
  const p = {};
  Object.keys(SECTION_LABELS).forEach(s => {
    SECTION_LABELS[s].actions.forEach(a => { p[`${s}.${a}`] = true; });
  });
  return p;
};

const ROLE_DEFAULTS = {
  admin: ALL_PERMS(),
  accountant: {
    "dashboard.view": true,
    "accounting.view": true, "accounting.create": true, "accounting.edit": true,
    "invoices.view": true, "invoices.create": true, "invoices.edit": true,
    "vouchers.view": true, "vouchers.create": true, "vouchers.edit": true,
    "reports.view": true,
    "financial.view": true,
  },
  inventory: {
    "dashboard.view": true,
    "warehouses.view": true, "warehouses.create": true, "warehouses.edit": true, "warehouses.delete": true,
    "invoices.view": true, "invoices.create": true,
    "reports.view": true,
  },
  costs_manager: {
    "dashboard.view": true,
    "costs.view": true, "costs.create": true, "costs.edit": true, "costs.delete": true,
    "reports.view": true,
  },
  branch_manager: {
    "dashboard.view": true,
    "branches.view": true, "branches.create": true, "branches.edit": true,
    "invoices.view": true, "invoices.create": true,
    "warehouses.view": true,
    "reports.view": true,
  },
  viewer: {
    "dashboard.view": true,
    "invoices.view": true,
    "vouchers.view": true,
    "reports.view": true,
    "financial.view": true,
  },
};

// ─── Hook ────────────────────────────────────────────────────
export function usePermissions() {
  const { user } = useAuth();

  /**
   * can("invoices.create") or can("invoices", "create")
   */
  function can(sectionOrKey, action) {
    if (!user) return false;
    if (user.role === "admin") return true;

    const key = action ? `${sectionOrKey}.${action}` : sectionOrKey;

    // Custom permissions stored on the user override role defaults
    if (user.permissions && typeof user.permissions === "object" && !Array.isArray(user.permissions)) {
      return !!user.permissions[key];
    }
    // Legacy array support
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions.includes(key) || user.permissions.includes(sectionOrKey);
    }
    // Fall back to role defaults
    return !!(ROLE_DEFAULTS[user.role] || {})[key];
  }

  /** Shorthand: can user view a section at all? */
  function canView(section) { return can(section, "view"); }
  function canCreate(section) { return can(section, "create"); }
  function canEdit(section) { return can(section, "edit"); }
  function canDelete(section) { return can(section, "delete"); }

  function isAdmin() { return user?.role === "admin"; }

  // Legacy shim so existing hasPermission() calls still work
  function hasPermission(module) { return can(module, "view") || can(module); }

  return { can, canView, canCreate, canEdit, canDelete, hasPermission, isAdmin, user };
}

// ─── Legacy MODULES shim ─────────────────────────────────────
export const MODULES = {
  DASHBOARD: "dashboard",
  PRODUCTS: "warehouses",
  WAREHOUSES: "warehouses",
  ACCOUNTS: "accounting",
  CURRENCIES: "accounting",
  INVOICES_VIEW: "invoices",
  INVOICES_CREATE: "invoices",
  INVOICES_DELETE: "invoices",
  VOUCHERS_VIEW: "vouchers",
  VOUCHERS_CREATE: "vouchers",
  STOCK_TRANSFERS: "warehouses",
  INVENTORY_COUNT: "warehouses",
  REPORTS: "reports",
  FINANCIAL_STATEMENTS: "financial",
  USERS_MANAGE: "users",
  SETTINGS: "settings",
};

export const ROLE_LABELS = {
  admin: "مدير",
  accountant: "محاسب",
  inventory: "مخازن",
  costs_manager: "مدير تكاليف",
  branch_manager: "مدير فرع",
  viewer: "مشاهد",
  user: "مستخدم",
};