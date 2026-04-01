import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useLang } from "@/hooks/useLang.jsx";
import { tr } from "@/lib/translations";
import { useSubscription } from "@/hooks/useSubscription.jsx";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  GitBranch,
  Calculator,
  Crown,
  Warehouse as WarehouseIcon,
  CircleDollarSign,
  FileText,
  Receipt,
  ArrowRightLeft,
  ClipboardList,
  BookOpen,
  BarChart3,
  Scale,
  Coins,
  ChevronDown,
  ChevronLeft,
  Menu,
  X,
  Building2,
  Users,
  Truck,
  ShoppingCart,
  UserCog,
  CalendarCheck,
  Banknote } from
"lucide-react";
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
  { label: l('users'), icon: Users, path: "/users" },
  { label: l('subscriptions'), icon: Crown, path: "/subscriptions" },
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
  }
];
}


// Map menu items to subscription feature keys
const ITEM_FEATURES = {
  "/accounts": "accounting",
  "/currencies": "accounting",
  "/invoice-patterns": "accounting",
  "/invoices/sales": "invoices",
  "/invoices/purchases": "invoices",
  "/invoices/sales-return": "invoices",
  "/invoices/purchases-return": "invoices",
  "/invoices/opening-balance": "invoices",
  "/vouchers/receipt": "vouchers",
  "/vouchers/payment": "vouchers",
  "/vouchers/daily": "vouchers",
  "/vouchers/journal": "vouchers",
  "/vouchers/opening": "vouchers",
  "/groups": "warehouses",
  "/products": "warehouses",
  "/warehouses": "warehouses",
  "/transfers": "warehouses",
  "/inventory-count": "warehouses",
  "/costs/management": "costs",
  "/costs/report": "costs",
  "/cost-centers": "costs",
  "/branches": "branches",
  "/reports/branches": "branches",
  "/reports/product-movement": "reports",
  "/reports/client-movement": "reports",
  "/reports/supplier-movement": "reports",
  "/reports/client-statement": "reports",
  "/reports/supplier-statement": "reports",
  "/reports/ledger": "reports",
  "/reports/trial-balance": "reports",
  "/financial/dashboard": "financial",
  "/financial/income-statement": "financial",
  "/financial/balance-sheet": "financial",
  "/financial/cash-flow": "financial",
  "/users": "users",
  "/subscriptions": "users",
};

// Map menu sections to permission keys
const ITEM_PERMISSIONS = {
  "/": "dashboard",
  "/groups": "warehouses",
  "/products": "warehouses",
  "/warehouses": "warehouses",
  "/cost-centers": "costs",
  "/accounts": "accounting",
  "/currencies": "accounting",
  "/invoice-patterns": "accounting",
  "/invoices/sales": "invoices",
  "/invoices/purchases": "invoices",
  "/invoices/sales-return": "invoices",
  "/invoices/purchases-return": "invoices",
  "/invoices/opening-balance": "invoices",
  "/vouchers/receipt": "vouchers",
  "/vouchers/payment": "vouchers",
  "/vouchers/daily": "vouchers",
  "/vouchers/journal": "vouchers",
  "/vouchers/opening": "vouchers",
  "/transfers": "warehouses",
  "/inventory-count": "warehouses",
  "/reports/product-movement": "reports",
  "/reports/client-movement": "reports",
  "/reports/supplier-movement": "reports",
  "/reports/client-statement": "reports",
  "/reports/supplier-statement": "reports",
  "/reports/ledger": "reports",
  "/reports/trial-balance": "reports",
  "/financial/dashboard": "financial",
  "/financial/income-statement": "financial",
  "/financial/balance-sheet": "financial",
  "/financial/cash-flow": "financial",
  "/costs/management": "costs",
  "/costs/report": "costs",
  "/branches": "branches",
  "/reports/branches": "branches",
  "/users": "users",
};

function SidebarItem({ item, isCollapsed }) {
  const { canView, isAdmin } = usePermissions();
  const { hasFeature } = useSubscription() || { hasFeature: () => true };
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  if (item.children) {
    const visibleChildren = item.children.filter(c => {
      const sec = ITEM_PERMISSIONS[c.path];
      const feat = ITEM_FEATURES[c.path];
      if (feat && !hasFeature(feat)) return false;
      return !sec || isAdmin() || canView(sec);
    });
    if (visibleChildren.length === 0) return null;
    const isActive = visibleChildren.some((c) => location.pathname === c.path);
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
            isActive ?
            "bg-sidebar-accent text-sidebar-primary" :
            "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}>
          
          <item.icon className="h-4.5 w-4.5 shrink-0" />
          {!isCollapsed &&
          <>
              <span className="flex-1 text-right">{item.label}</span>
              <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            
            </>
          }
        </button>
        {isOpen && !isCollapsed &&
        <div className="mr-4 mt-1 space-y-0.5 border-r-2 border-sidebar-border pr-3">
            {visibleChildren.map((child) =>
          <Link
            key={child.path}
            to={child.path}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-200",
              location.pathname === child.path ?
              "bg-sidebar-primary text-sidebar-primary-foreground" :
              "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}>
            
                <child.icon className="h-3.5 w-3.5 shrink-0" />
                <span>{child.label}</span>
              </Link>
          )}
          </div>
        }
      </div>);

  }

  return (
    <Link
      to={item.path}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
        location.pathname === item.path ?
        "bg-sidebar-primary text-sidebar-primary-foreground" :
        "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}>
      
      <item.icon className="h-4.5 w-4.5 shrink-0" />
      {!isCollapsed && <span>{item.label}</span>}
    </Link>);

}

export default function Sidebar({ isOpen, onToggle }) {
  const { lang } = useLang();
  const menuItems = getMenuItems(lang);
  return (
    <>
      {/* Mobile overlay */}
      {isOpen &&
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onToggle} />

      }

      <aside
        className={cn(
          "fixed top-0 right-0 h-full bg-sidebar z-50 transition-all duration-300 flex flex-col",
          "lg:sticky lg:top-0 lg:z-auto",
          isOpen ? "w-64 translate-x-0" : "w-0 translate-x-full lg:w-16 lg:translate-x-0"
        )}>
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          {isOpen &&
          <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <CircleDollarSign className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <span className="text-sidebar-foreground font-bold text-base">{tr('appName', lang)}</span>
            </div>
          }
          <button
            onClick={onToggle}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground p-1 rounded-lg hover:bg-sidebar-accent/50 transition-colors lg:hidden">
            
            
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item, i) =>
          <SidebarItem key={i} item={item} isCollapsed={!isOpen} />
          )}
        </nav>
      </aside>
    </>);

}