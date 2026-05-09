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
  CalendarCheck, Banknote, Landmark, Sparkles, Zap, Settings, ChevronLeft, Bell,
  ShoppingBag, TrendingUp, PieChart, MessageSquare, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";

function getMenuItems(lang) {
  const l = (key) => tr(key, lang);
  return [
    // ── الرئيسية ──
    { label: l('dashboard'), icon: LayoutDashboard, path: "/" },

    // ── المخزون والمنتجات ──
    {
      label: "المخزون والمنتجات", icon: Package,
      children: [
        { label: l('groups'), path: "/groups", icon: FolderTree },
        { label: l('products'), path: "/products", icon: Package },
        { label: l('warehouses'), path: "/warehouses", icon: WarehouseIcon },
        { label: l('transfers'), path: "/transfers", icon: ArrowRightLeft },
        { label: l('inventoryCount'), path: "/inventory-count", icon: ClipboardList },
        { label: "تنبيهات المخزون", path: "/inventory/stock-alerts", icon: Bell },
      ]
    },

    // ── المبيعات ──
    {
      label: "المبيعات", icon: TrendingUp,
      children: [
        { label: l('salesInvoice'), path: "/invoices/sales", icon: Receipt },
        { label: l('salesReturn'), path: "/invoices/sales-return", icon: Receipt },
        { label: "شاشة البيع", path: "/pos", icon: ShoppingCart },
        { label: "سجل مبيعات نقطة البيع", path: "/pos/history", icon: Receipt },
        { label: "عروض أسعار المبيعات", path: "/orders", icon: ShoppingBag },
      ]
    },

    // ── المشتريات ──
    {
      label: "المشتريات", icon: ShoppingBag,
      children: [
        { label: l('purchasesInvoice'), path: "/invoices/purchases", icon: Receipt },
        { label: l('purchasesReturn'), path: "/invoices/purchases-return", icon: Receipt },
        { label: "أوامر الشراء", path: "/orders", icon: ShoppingBag },
      ]
    },

    // ── المحاسبة والمالية ──
    {
      label: "المحاسبة", icon: CircleDollarSign,
      children: [
        { label: l('chartOfAccounts'), path: "/accounts", icon: FolderTree },
        { label: l('currencies'), path: "/currencies", icon: Coins },
        { label: l('invoicePatterns'), path: "/invoice-patterns", icon: FileText },
        { label: l('openingBalance'), path: "/invoices/opening-balance", icon: Receipt },
        { label: "قواعد اليومية التلقائية", path: "/accounting/journal-rules", icon: Zap },
        { label: "التسويات البنكية", path: "/accounting/bank-reconciliation", icon: Landmark },
      ]
    },

    // ── السندات ──
    {
      label: l('vouchers'), icon: FileText,
      children: [
        { label: l('receiptVoucher'), path: "/vouchers/receipt", icon: FileText },
        { label: l('paymentVoucher'), path: "/vouchers/payment", icon: FileText },
        { label: l('dailyVoucher'), path: "/vouchers/daily", icon: FileText },
        { label: l('journalVoucher'), path: "/vouchers/journal", icon: FileText },
        { label: l('openingJournal'), path: "/vouchers/opening", icon: FileText },
      ]
    },

    // ── القوائم المالية ──
    {
      label: l('financialStatements'), icon: BarChart3,
      children: [
        { label: l('financialDashboard'), path: "/financial/dashboard", icon: BarChart3 },
        { label: l('incomeStatement'), path: "/financial/income-statement", icon: BarChart3 },
        { label: l('balanceSheet'), path: "/financial/balance-sheet", icon: Scale },
        { label: l('cashFlow'), path: "/financial/cash-flow", icon: Coins },
        { label: "الميزانية والتخطيط", path: "/budget", icon: PieChart },
      ]
    },

    // ── التكاليف والفروع ──
    {
      label: "التكاليف والفروع", icon: Calculator,
      children: [
        { label: l('costCenters'), path: "/cost-centers", icon: Building2 },
        { label: l('costManagement'), path: "/costs/management", icon: Calculator },
        { label: l('costReport'), path: "/costs/report", icon: BarChart3 },
        { label: l('manageBranches'), path: "/branches", icon: GitBranch },
        { label: l('branchReport'), path: "/reports/branches", icon: BarChart3 },
      ]
    },

    // ── الموارد البشرية ──
    {
      label: "الموارد البشرية", icon: UserCog,
      children: [
        { label: "الموظفون", path: "/hr/employees", icon: Users },
        { label: "الحضور والغياب", path: "/hr/attendance", icon: CalendarCheck },
        { label: "الرواتب", path: "/hr/payroll", icon: Banknote },
        { label: "طلبات الإجازات", path: "/hr/leaves", icon: CalendarCheck },
      ]
    },

    // ── الأصول الثابتة ──
    { label: "الأصول الثابتة", icon: Landmark, path: "/assets" },

    // ── التقارير ──
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
        { label: "التقارير المتقدمة", path: "/reports/advanced", icon: BarChart3 },
        { label: "التقارير المخصصة", path: "/reports/custom", icon: TrendingUp },
        { label: "سجل النشاط", path: "/reports/activity-log", icon: ClipboardList },
      ]
    },

    // ── إدارة العملاء والتواصل ──
    { label: "إدارة علاقات العملاء", icon: MessageSquare, path: "/crm" },
    { label: "الرسائل الداخلية", icon: Mail, path: "/messages" },
    { label: "الإشعارات والتنبيهات", icon: Bell, path: "/notifications" },

    // ── الإدارة والإعدادات ──
    { label: l('users'), icon: Users, path: "/users" },
    { label: l('subscriptions'), icon: Crown, path: "/subscriptions" },
    { label: "الإعدادات", icon: Settings, path: "/settings" },
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

function SidebarItem({ item, onNavigate }) {
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
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors group",
            isActive
              ? "bg-blue-50 text-blue-700 font-medium"
              : "text-gray-700 hover:bg-gray-100"
          )}
        >
          <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-gray-500")} />
          <span className="flex-1 text-right text-[13px]">{item.label}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <div className="mr-6 mt-0.5 mb-1 border-r-2 border-blue-100 pr-0">
            {visibleChildren.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 text-[12.5px] transition-colors",
                  location.pathname === child.path
                    ? "text-blue-700 font-semibold bg-blue-50 border-r-2 border-blue-600 -mr-[2px]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                )}
              >
                <child.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
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
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-sm text-[13px] transition-colors",
        isActive
          ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600"
          : "text-gray-700 hover:bg-gray-100"
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-gray-500")} />
      <span>{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ isOpen, onToggle }) {
  const { lang } = useLang();
  const menuItems = getMenuItems(lang);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onToggle} />
      )}

      <aside
        className={cn(
          "fixed top-0 right-0 h-full z-50 flex flex-col transition-all duration-300",
          "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
          "w-64 bg-white border-l border-gray-200",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
        style={{ boxShadow: "-2px 0 8px rgba(0,0,0,0.06)" }}
      >
        {/* Header - Office style brand bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white shrink-0">
          <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm leading-tight">اتقان ERP</p>
            <p className="text-blue-200 text-[10px]">نظام الإدارة المالية</p>
          </div>
          <button onClick={onToggle} className="lg:hidden text-white/80 hover:text-white p-1">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-1 space-y-0.5">
          {menuItems.map((item, i) => (
            <SidebarItem
              key={i}
              item={item}
              onNavigate={() => { if (isOpen) onToggle(); }}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 space-y-1">
          <div className="flex justify-center gap-3 text-[11px] text-gray-400">
            <Link to="/about" className="hover:text-primary transition-colors">عن النظام</Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-primary transition-colors">تواصل معنا</Link>
          </div>
          <p className="text-gray-400 text-[10px] text-center">v2.0 • اتقان ERP</p>
        </div>
      </aside>
    </>
  );
}