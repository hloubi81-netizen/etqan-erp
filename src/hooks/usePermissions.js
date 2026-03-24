import { useAuth } from "@/lib/AuthContext";

// Module keys
export const MODULES = {
  DASHBOARD: "dashboard",
  PRODUCTS: "products",
  WAREHOUSES: "warehouses",
  ACCOUNTS: "accounts",
  CURRENCIES: "currencies",
  INVOICES_VIEW: "invoices_view",
  INVOICES_CREATE: "invoices_create",
  INVOICES_DELETE: "invoices_delete",
  VOUCHERS_VIEW: "vouchers_view",
  VOUCHERS_CREATE: "vouchers_create",
  STOCK_TRANSFERS: "stock_transfers",
  INVENTORY_COUNT: "inventory_count",
  REPORTS: "reports",
  FINANCIAL_STATEMENTS: "financial_statements",
  USERS_MANAGE: "users_manage",
  SETTINGS: "settings",
};

// Default permissions per role
const ROLE_PERMISSIONS = {
  admin: Object.values(MODULES), // all
  accountant: [
    MODULES.DASHBOARD, MODULES.ACCOUNTS, MODULES.CURRENCIES,
    MODULES.INVOICES_VIEW, MODULES.INVOICES_CREATE,
    MODULES.VOUCHERS_VIEW, MODULES.VOUCHERS_CREATE,
    MODULES.REPORTS, MODULES.FINANCIAL_STATEMENTS,
  ],
  inventory: [
    MODULES.DASHBOARD, MODULES.PRODUCTS, MODULES.WAREHOUSES,
    MODULES.INVOICES_VIEW, MODULES.INVOICES_CREATE,
    MODULES.STOCK_TRANSFERS, MODULES.INVENTORY_COUNT, MODULES.REPORTS,
  ],
  viewer: [
    MODULES.DASHBOARD, MODULES.REPORTS, MODULES.FINANCIAL_STATEMENTS,
    MODULES.INVOICES_VIEW, MODULES.VOUCHERS_VIEW,
  ],
};

export function usePermissions() {
  const { user } = useAuth();

  function hasPermission(module) {
    if (!user) return false;
    if (user.role === "admin") return true;
    // Check custom permissions array first
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions.includes(module);
    }
    // Fall back to role defaults
    const rolePerms = ROLE_PERMISSIONS[user.role] || [];
    return rolePerms.includes(module);
  }

  function isAdmin() {
    return user?.role === "admin";
  }

  return { hasPermission, isAdmin, user };
}