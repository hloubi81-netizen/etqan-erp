import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useLang } from "@/hooks/useLang.jsx";
import { tr } from "@/lib/translations";
import { useSubscription } from "@/hooks/useSubscription.jsx";
import {
  LayoutDashboard, Package, FolderTree, GitBranch, Calculator, Crown,
  Warehouse as WarehouseIcon, CircleDollarSign, FileText, Receipt,
  ArrowRightLeft, ClipboardList, BookOpen, BarChart3, Scale, Coins,
  ChevronDown, Building2, Users, Truck, ShoppingCart, UserCog,
  CalendarCheck, Banknote, Landmark, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

function getMenuItems(lang) {
  const l = (key) => tr(key, lang);
  return [
    { label: l('dashboard'), icon: LayoutDashboard, path: "/" },
    {
      label: l('cards'), icon: FolderTree,
      children: [
        { label: l('groups'), path: "/groups", icon: FolderTree },
        { label: l('products'), path: "/products", icon: Package },
        { label: l('warehouses'), path: "/warehouses", icon: WarehouseIcon },
        { label: l('costCenters'), path: "/cost-centers", icon: Building2 }
      ]
    },
    {
      label: l('accounting'), icon: CircleDollarSign,
      children: [
        { label: l('chartOfAccounts'), path: "/accounts", icon: FolderTree },
        { label: l('currencies'), path: "/currencies", icon: Coins },
        { label: l('invoicePatterns'), path: "/invoice-patterns", icon: FileText }
      ]
    },
    {
      label: l('invoices'), icon: Receipt,
      children: [
        { label: l('salesInvoice'), path: "/invoices/sales", icon: Receipt },
        { label: l('purchasesInvoice'), path: "/invoices/purchases", icon: Receipt },
        { label: l('salesReturn'), path: "/invoices/sales-return", icon: Receipt },
        { label: l('purchasesReturn'), path: "/invoices/purchases-return", icon: Receipt },
        { label: l('openingBalance'), path: "/invoices/opening-balance", icon: Receipt }
      ]
    },
    {
      label: l('vouchers'), icon: FileText,
      children: [
        { label: l('receiptVoucher'), path: "/vouchers/receipt", icon: FileText },
        { label: l('paymentVoucher'), path: "/vouchers/payment", icon: FileText },
        { label: l('dailyVoucher'), path: "/vouchers/daily", icon: FileText },
        { label: l('journalVoucher'), path: "/vouchers/journal", icon: FileText },
        { label: l('openingJournal'), path: "/vouchers/opening", icon: FileText }
      ]
    },
    {
      label: l('stockSection'), icon: WarehouseIcon,
      children: [
        { label: l('transfers'), path: "/transfers", icon: ArrowRightLeft },
        { label: l('inventoryCount'), path: "/inventory-count", icon: ClipboardList }
      ]
    },
    {
      label: l('reports'), icon: BarChart3,
      children: [
        { label: l('productMovement'), path: "/reports/product-movement", icon: Package },
        { label: l('clientMovement'), path: "/reports/client-movement", icon: Users },
        { label: l('supplierMovement'), path: "/reports/supplier-movement", icon: Truck },
        { label: l('clientStatement'), path: "/reports/client-statement", icon: FileText },
        { label: l('supplierStatement'), path: "/reports/supplier-statement", icon: FileText },
        { label: l('ledger'), path: "/reports/ledger", icon: BookOpen },
        { label: l('trialBalance'), path: "/reports/trial-balance", icon: Scale },
        { label: "التقارير المتقدمة", path: "/reports/advanced", icon: BarChart3 }
      ]
    },
    {
      label: l('financialStatements'), icon: BarChart3,
      children: [
        { label: l('financialDashboard'), path: "/financial/dashboard", icon: BarChart3 },
        { label: l('incomeStatement'), path: "/financial/income-statement", icon: BarChart3 },
        { label: l('balanceSheet'), path: "/financial/balance-sheet", icon: Scale },
        { label: l('cashFlow'), path: "/financial/cash-flow", icon: Coins }
      ]
    },
    {
      label: l('costSystem'), icon: Calculator,
      children: [
        { label: l('costManagement'), path: "/costs/management", icon: Calculator },
        { label: l('costReport'), path: "/costs/report", icon: BarChart3 }
      ]
    },
    {
      label: l('branches'), icon: GitBranch,
      children: [
        { label: l('manageBranches'), path: "/branches", icon: GitBranch },
        { label: l('branchReport'), path: "/reports/branches", icon: BarChart3 }
      ]
    },
    {
      label: "نقطة البيع", icon: ShoppingCart,
      children: [
        { label: "شاشة البيع", path: "/pos", icon: ShoppingCart },
        { label: "سجل المبيعات", path: "/pos/history", icon: Receipt }
      ]
    },
    {
      label: "الموارد البشرية", icon: UserCog,
      children: [
        { label: "الموظفون", path: "/hr/employees", icon: Users },
        { label: "الحضور والغياب", path: "/hr/attendance", icon: CalendarCheck },
        { label: "الرواتب", path: "/hr/payroll", icon: Banknote }
      ]
    },
    { label: "الأصول الثابتة", icon: Landmark, path: "/assets" },
    { label: l('users'), icon: Users, path: "/users" },
    { label: l('subscriptions'), icon: Crown, path: "/subscriptions" },
  ];
}

const ITEM_FEATURES = {
  "/accounts": "accounting", "/currencies": "accounting", "/invoice-patterns": "accounting",
  "/invoices/sales": "invoices", "/invoices/purchases": "invoices", "/invoices/sales-return": "invoices",
  "/invoices/purchases-return": "invoices", "/invoices/opening-balance": "invoices",
  "/vouchers/receipt": "vouchers", "/vouchers/payment": "vouchers", "/vouchers/daily": "vouchers",
  "/vouchers/journal": "vouchers", "/vouchers/opening": "vouchers",
  "/groups": "warehouses", "/products": "warehouses", "/warehouses": "warehouses",
  "/transfers": "warehouses", "/inventory-count": "warehouses",
  "/costs/management": "costs", "/costs/report": "costs", "/cost-centers": "costs",
  "/branches": "branches", "/reports/branches": "branches",
  "/reports/product-movement": "reports", "/reports/client-movement": "reports",
  "/reports/supplier-movement": "reports", "/reports/client-statement": "reports",
  "/reports/supplier-statement": "reports", "/reports/ledger": "reports",
  "/reports/trial-balance": "reports", "/reports/advanced": "reports",
  "/financial/dashboard": "financial", "/financial/income-statement": "financial",
  "/financial/balance-sheet": "financial", "/financial/cash-flow": "financial",
  "/users": "users", "/subscriptions": "users",
};

const ITEM_PERMISSIONS = {
  "/": "dashboard", "/groups": "warehouses", "/products": "warehouses",
  "/warehouses": "warehouses", "/cost-centers": "costs", "/accounts": "accounting",
  "/currencies": "accounting", "/invoice-patterns": "accounting",
  "/invoices/sales": "invoices", "/invoices/purchases": "invoices",
  "/invoices/sales-return": "invoices", "/invoices/purchases-return": "invoices",
  "/invoices/opening-balance": "invoices", "/vouchers/receipt": "vouchers",
  "/vouchers/payment": "vouchers", "/vouchers/daily": "vouchers",
  "/vouchers/journal": "vouchers", "/vouchers/opening": "vouchers",
  "/transfers": "warehouses", "/inventory-count": "warehouses",
  "/reports/product-movement": "reports", "/reports/client-movement": "reports",
  "/reports/supplier-movement": "reports", "/reports/client-statement": "reports",
  "/reports/supplier-statement": "reports", "/reports/ledger": "reports",
  "/reports/trial-balance": "reports", "/reports/advanced": "reports",
  "/financial/dashboard": "financial", "/financial/income-statement": "financial",
  "/financial/balance-sheet": "financial", "/financial/cash-flow": "financial",
  "/costs/management": "costs", "/costs/report": "costs",
  "/branches": "branches", "/reports/branches": "branches", "/users": "users",
};

function SidebarItem({ item, expanded }) {
  const { canView, isAdmin } = usePermissions();
  const { hasFeature } = useSubscription() || { hasFeature: () => true };
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  if (item.children) {
    const visibleChildren = item.children.filter((c) => {
      const feat = ITEM_FEATURES[c.path];
      if (feat && !hasFeature(feat)) return false;
      const sec = ITEM_PERMISSIONS[c.path];
      return !sec || isAdmin() || canView(sec);
    });
    if (visibleChildren.length === 0) return null;
    const isActive = visibleChildren.some((c) => location.pathname === c.path);

    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
            isActive
              ? "bg-white/15 text-white"
              : "text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            isActive ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10"
          )}>
            <item.icon className="h-3.5 w-3.5" />
          </div>
          {expanded && (
            <>
              <span className="flex-1 text-right text-xs font-medium">{item.label}</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200 opacity-50", isOpen && "rotate-180")} />
            </>
          )}
        </button>
        {isOpen && expanded && (
          <div className="mr-5 mt-0.5 mb-1 space-y-0.5 border-r border-white/10 pr-2">
            {visibleChildren.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-150",
                  location.pathname === child.path
                    ? "bg-white text-indigo-700 font-semibold shadow-sm"
                    : "text-white/55 hover:bg-white/10 hover:text-white"
                )}
              >
                <child.icon className="h-3 w-3 shrink-0" />
                <span>{child.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = location.pathname === item.path;
  return (
    <Link
      to={item.path}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
        isActive ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
      )}
    >
      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
        isActive ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10"
      )}>
        <item.icon className="h-3.5 w-3.5" />
      </div>
      {expanded && <span className="text-xs font-medium">{item.label}</span>}
    </Link>
  );
}

export default function Sidebar({ isOpen, onToggle }) {
  const { lang } = useLang();
  const [hovered, setHovered] = useState(false);
  const menuItems = getMenuItems(lang);

  // On desktop: auto-expand on hover OR if pinned open
  const expanded = isOpen || hovered;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onToggle} />
      )}

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "fixed top-0 right-0 h-full z-50 flex flex-col transition-all duration-300 ease-in-out",
          "lg:sticky lg:top-0 lg:z-auto",
          // width: collapsed = 64px, expanded = 240px
          expanded ? "w-60" : "w-0 lg:w-16",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          // Gradient background
          "bg-gradient-to-b from-indigo-950 via-indigo-900 to-violet-950"
        )}
        style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.25)" }}
      >
        {/* Decorative glow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

        {/* Header */}
        <div className={cn("p-3 flex items-center border-b border-white/10", expanded ? "gap-3" : "justify-center")}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg shrink-0">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          {expanded && (
            <div>
              <p className="text-white font-bold text-base leading-tight">اتقان</p>
              <p className="text-indigo-300 text-[10px]">نظام الإدارة المالية</p>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
          {menuItems.map((item, i) => (
            <SidebarItem key={i} item={item} expanded={expanded} />
          ))}
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="p-3 border-t border-white/10">
            <p className="text-white/30 text-[10px] text-center">v2.0 • اتقان ERP</p>
          </div>
        )}
      </aside>
    </>
  );
}