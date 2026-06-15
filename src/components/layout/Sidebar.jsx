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
  ChevronDown, Building2, Users, Users as UsersIcon, Truck, ShoppingCart, UserCog,
  CalendarCheck, Calendar, Banknote, Landmark, Sparkles, Settings, ChevronLeft, Bell,
  ShoppingBag, TrendingUp, PieChart, MessageSquare, Mail, HelpCircle, Wrench, Activity, Archive, Tag, Wallet, DollarSign } from
"lucide-react";
import { cn } from "@/lib/utils";

function getMenuItems(lang) {
  const l = (key) => tr(key, lang);
  return [
  // ── الرئيسية ──
  { label: l('dashboard'), icon: LayoutDashboard, path: "/" },


  // ── المخزون والمنتجات ──
  {
    label: lang === 'ar' ? "المخزون والمنتجات" : "Inventory & Products", icon: Package,
    children: [
    { label: l('groups'), path: "/groups", icon: FolderTree },
    { label: l('products'), path: "/products", icon: Package },
    { label: lang === 'ar' ? "الخدمات" : "Services", path: "/services", icon: Wrench },
    { label: l('warehouses'), path: "/warehouses", icon: WarehouseIcon },
    { label: l('transfers'), path: "/transfers", icon: ArrowRightLeft },
    { label: l('inventoryCount'), path: "/inventory-count", icon: ClipboardList },
    { label: lang === 'ar' ? "تنبيهات المخزون" : "Stock Alerts", path: "/inventory/stock-alerts", icon: Bell },
    { label: lang === 'ar' ? "تتبع انتهاء الصلاحية" : "Expiry Tracking", path: "/inventory/expiry", icon: CalendarCheck },
    { label: lang === 'ar' ? "الجرد الدوري" : "Periodic Inventory", path: "/inventory/periodic-count", icon: ClipboardList }]

  },

  // ── المبيعات ──
  {
    label: lang === 'ar' ? "المبيعات" : "Sales", icon: TrendingUp,
    children: [
    { label: l('salesInvoice'), path: "/invoices/sales", icon: Receipt },
    { label: l('salesReturn'), path: "/invoices/sales-return", icon: Receipt },
    { label: lang === 'ar' ? "شاشة البيع" : "POS Screen", path: "/pos", icon: ShoppingCart },
    { label: lang === 'ar' ? "سجل مبيعات نقطة البيع" : "POS History", path: "/pos/history", icon: Receipt },
    { label: lang === 'ar' ? "قوائم الأسعار" : "Price Lists", path: "/price-lists", icon: Tag },
    { label: lang === 'ar' ? "عروض أسعار المبيعات" : "Sales Quotes", path: "/orders", icon: ShoppingBag },
    { label: lang === 'ar' ? "طلبات المتاجر الإلكترونية" : "E-com Orders", path: "/ecom-orders", icon: ShoppingCart }]

  },

  // ── المشتريات ──
  {
    label: lang === 'ar' ? "المشتريات" : "Purchases", icon: ShoppingBag,
    children: [
    { label: l('purchasesInvoice'), path: "/invoices/purchases", icon: Receipt },
    { label: l('purchasesReturn'), path: "/invoices/purchases-return", icon: Receipt },
    { label: lang === 'ar' ? "أوامر الشراء" : "Purchase Orders", path: "/orders", icon: ShoppingBag }]

  },

  // ── المحاسبة والمالية ──
  {
    label: lang === 'ar' ? "المحاسبة" : "Accounting", icon: CircleDollarSign,
    children: [
    { label: l('chartOfAccounts'), path: "/accounts", icon: FolderTree },
    { label: l('currencies'), path: "/currencies", icon: Coins },
    { label: l('invoicePatterns'), path: "/invoice-patterns", icon: FileText },
    { label: l('openingBalance'), path: "/invoices/opening-balance", icon: Receipt },
    { label: lang === 'ar' ? "التسويات البنكية" : "Bank Reconciliation", path: "/accounting/bank-reconciliation", icon: Landmark },
    { label: lang === 'ar' ? "إدارة النسب الضريبية" : "Tax Rates", path: "/tax-rates", icon: Calculator }]

  },

  // ── السندات ──
  {
    label: l('vouchers'), icon: FileText,
    children: [
    { label: l('receiptVoucher'), path: "/vouchers/receipt", icon: FileText },
    { label: l('paymentVoucher'), path: "/vouchers/payment", icon: FileText },
    { label: l('dailyVoucher'), path: "/vouchers/daily", icon: FileText },
    { label: l('journalVoucher'), path: "/vouchers/journal", icon: FileText },
    { label: l('openingJournal'), path: "/vouchers/opening", icon: FileText }]

  },

  // ── القوائم المالية ──
  {
    label: l('financialStatements'), icon: BarChart3,
    children: [
    { label: l('financialDashboard'), path: "/financial/dashboard", icon: BarChart3 },
    { label: l('incomeStatement'), path: "/financial/income-statement", icon: BarChart3 },
    { label: l('balanceSheet'), path: "/financial/balance-sheet", icon: Scale },
    { label: l('cashFlow'), path: "/financial/cash-flow", icon: Coins },
    { label: lang === 'ar' ? "تقويم التدفقات النقدية" : "Cash Calendar", path: "/financial/cash-calendar", icon: CalendarCheck },
    { label: lang === 'ar' ? "الميزانية والتخطيط" : "Budget & Planning", path: "/budget", icon: PieChart }]

  },

  // ── التكاليف والفروع ──
  {
    label: lang === 'ar' ? "التكاليف والفروع" : "Costs & Branches", icon: Calculator,
    children: [
    { label: l('costCenters'), path: "/cost-centers", icon: Building2 },
    { label: l('costManagement'), path: "/costs/management", icon: Calculator },
    { label: l('costReport'), path: "/costs/report", icon: BarChart3 },
    { label: l('manageBranches'), path: "/branches", icon: GitBranch },
    { label: l('branchReport'), path: "/reports/branches", icon: BarChart3 }]

  },

  // ── الموارد البشرية ──
  {
    label: lang === 'ar' ? "الموارد البشرية" : "Human Resources", icon: UserCog,
    children: [
    { label: lang === 'ar' ? "الموظفون" : "Employees", path: "/hr/employees", icon: Users },
    { label: lang === 'ar' ? "الحضور والغياب" : "Attendance", path: "/hr/attendance", icon: CalendarCheck },
    { label: lang === 'ar' ? "الرواتب" : "Payroll", path: "/hr/payroll", icon: Banknote },
    { label: lang === 'ar' ? "طلبات الإجازات" : "Leave Requests", path: "/hr/leaves", icon: CalendarCheck }]

  },

  // ── الأصول الثابتة ──
  { label: lang === 'ar' ? "الأصول الثابتة" : "Fixed Assets", icon: Landmark, path: "/assets" },

  // ── العهد المالية ──
  { label: lang === 'ar' ? "العهَد المالية" : "Custody Management", icon: Wallet, path: "/custody" },

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
    { label: lang === 'ar' ? "دفتر الأستاذ العام" : "General Ledger", path: "/reports/general-ledger", icon: BookOpen },
    { label: l('trialBalance'), path: "/reports/trial-balance", icon: Scale },
    { label: lang === 'ar' ? "لوحة تحكم المبيعات" : "Sales Dashboard", path: "/reports/sales-dashboard", icon: TrendingUp },
    { label: lang === 'ar' ? "تكلفة البضاعة المباعة (COGS)" : "COGS Report", path: "/reports/cogs", icon: Calculator },
    { label: lang === 'ar' ? "التقارير المتقدمة" : "Advanced Reports", path: "/reports/advanced", icon: BarChart3 },
    { label: lang === 'ar' ? "فروقات الجرد" : "Inventory Variance", path: "/reports/inventory-variance", icon: ClipboardList },
    { label: lang === 'ar' ? "التقرير الضريبي (VAT)" : "Tax Report (VAT)", path: "/reports/tax", icon: Calculator },
    { label: lang === 'ar' ? "التقارير المخصصة" : "Custom Reports", path: "/reports/custom", icon: TrendingUp },
    { label: lang === 'ar' ? "سجل النشاط" : "Activity Log", path: "/reports/activity-log", icon: ClipboardList },
    { label: lang === 'ar' ? "أداء الفروع" : "Branch Performance", path: "/reports/branch-performance", icon: GitBranch },
    { label: lang === 'ar' ? "ربحية الخدمات" : "Service Profitability", path: "/reports/service-profitability", icon: Wrench },
    { label: lang === 'ar' ? "لوحة الخدمات والأصول" : "Services & Assets Dashboard", path: "/reports/services-dashboard", icon: Activity },
    { label: lang === 'ar' ? "الميزانية مقابل الفعلي" : "Budget vs Actual", path: "/reports/budget-vs-actual", icon: PieChart },
    { label: lang === 'ar' ? "ملخص أداء العمل" : "Business Performance", path: "/reports/business-performance", icon: DollarSign },
    { label: lang === 'ar' ? "تقرير أداء الفريق" : "Team Performance", path: "/reports/branch-attendance", icon: Users },
    { label: lang === 'ar' ? "تكامل تقويم جوجل" : "Google Calendar", path: "/settings/google-calendar", icon: Calendar }]

  },

  // ── نظام النقاط والعروض ──
  { label: lang === 'ar' ? "النقاط والعروض الخاصة" : "Loyalty & Promotions", icon: Sparkles, path: "/loyalty" },

  // ── إدارة العملاء والتواصل ──
  { label: lang === 'ar' ? "إدارة علاقات العملاء" : "CRM", icon: MessageSquare, path: "/crm" },
  { label: lang === 'ar' ? "الرسائل الداخلية" : "Internal Messages", icon: Mail, path: "/messages" },
  { label: lang === 'ar' ? "الإشعارات والتنبيهات" : "Notifications", icon: Bell, path: "/notifications" },

  // ── أرشيف المستندات ──
  { label: lang === 'ar' ? "أرشيف المستندات" : "Document Archive", icon: Archive, path: "/archive" },

  // ── إدارة الفريق ──
  { label: lang === 'ar' ? "إدارة الفريق" : "Team Management", icon: UsersIcon, path: "/team" },

  // ── الإدارة والإعدادات ──
  { label: l('users'), icon: Users, path: "/users" },
  { label: l('subscriptions'), icon: Crown, path: "/subscriptions" },
  { label: lang === 'ar' ? "لوحة تحكم المدير" : "Admin Control Panel", icon: Crown, path: "/admin/control-panel" },
  { label: lang === 'ar' ? "الإعدادات" : "Settings", icon: Settings, path: "/settings" },
  { label: lang === 'ar' ? "دليل الاستخدام" : "User Guide", icon: HelpCircle, path: "/user-guide" }];

}

const ITEM_FEATURES = {
  "/accounts": "accounting", "/currencies": "accounting", "/invoice-patterns": "accounting",
  "/accounting/bank-reconciliation": "accounting", "/tax-rates": "accounting", "/assets": "accounting",
  "/custody": "accounting", "/custody/budget-report": "accounting", "/custody/calendar": "accounting",
  "/invoices/sales": "invoices", "/invoices/purchases": "invoices", "/invoices/sales-return": "invoices",
  "/invoices/purchases-return": "invoices", "/invoices/opening-balance": "invoices", "/ecom-orders": "invoices",
  "/orders": "invoices", "/store-connections": "invoices", "/ecom-product-mappings": "invoices",
  "/price-lists": "invoices", "/pos": "invoices", "/pos/history": "invoices",
  "/loyalty": "invoices",
  "/vouchers/receipt": "vouchers", "/vouchers/payment": "vouchers", "/vouchers/daily": "vouchers",
  "/vouchers/journal": "vouchers", "/vouchers/opening": "vouchers",
  "/groups": "warehouses", "/products": "warehouses", "/services": "warehouses",
  "/warehouses": "warehouses", "/transfers": "warehouses", "/inventory-count": "warehouses",
  "/inventory/stock-alerts": "warehouses", "/inventory/expiry": "warehouses",
  "/inventory/barcode": "warehouses", "/inventory/periodic-count": "warehouses",
  "/inventory/sheets-sync": "warehouses",
  "/costs/management": "costs", "/costs/report": "costs", "/cost-centers": "costs",
  "/branches": "branches", "/reports/branches": "branches",
  "/reports/product-movement": "reports", "/reports/client-movement": "reports",
  "/reports/supplier-movement": "reports", "/reports/client-statement": "reports",
  "/reports/supplier-statement": "reports", "/reports/ledger": "reports",
  "/reports/general-ledger": "reports", "/reports/trial-balance": "reports",
  "/reports/advanced": "reports", "/reports/inventory-variance": "reports",
  "/reports/sales-dashboard": "reports", "/reports/cogs": "reports",
  "/reports/tax": "reports", "/reports/custom": "reports", "/reports/activity-log": "reports",
  "/reports/branch-performance": "reports", "/reports/service-profitability": "reports",
  "/reports/services-dashboard": "reports", "/reports/budget-vs-actual": "reports",
  "/reports/business-performance": "reports",
  "/reports/branch-attendance": "reports",
  "/settings/google-calendar": "reports",
  "/financial/dashboard": "financial", "/financial/income-statement": "financial",
  "/financial/balance-sheet": "financial", "/financial/cash-flow": "financial",
  "/financial/cash-calendar": "financial", "/budget": "financial",
  "/hr/employees": "users", "/hr/attendance": "users", "/hr/payroll": "users", "/hr/leaves": "users",
  "/users": "users"
};

const ITEM_PERMISSIONS = {
  "/": "dashboard", "/groups": "warehouses", "/products": "warehouses",
  "/warehouses": "warehouses", "/cost-centers": "costs", "/accounts": "accounting",
  "/currencies": "accounting", "/invoice-patterns": "accounting",
  "/invoices/sales": "invoices", "/invoices/purchases": "invoices",
  "/invoices/sales-return": "invoices", "/invoices/purchases-return": "invoices",
  "/ecom-orders": "invoices",
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
  "/branches": "branches", "/reports/branches": "branches", "/users": "users"
};

function SidebarItem({ item, onNavigate }) {
  const { canViewPage, isAdmin } = usePermissions();
  const { hasFeature } = useSubscription() || { hasFeature: () => true };
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  if (item.children) {
    const visibleChildren = item.children.filter((c) => {
      const feat = ITEM_FEATURES[c.path];
      if (feat && !isAdmin() && !hasFeature(feat)) return false;
      return isAdmin() || canViewPage(c.path);
    });
    if (visibleChildren.length === 0) return null;
    const isActive = visibleChildren.some((c) => location.pathname === c.path);

    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors group",
            isActive ?
            "bg-blue-50 text-blue-700 font-medium" :
            "text-gray-700 hover:bg-gray-100"
          )}>
          
          <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-gray-500")} />
          <span className="flex-1 text-right text-[13px]">{item.label}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
        {isOpen &&
        <div className="mr-6 mt-0.5 mb-1 border-r-2 border-blue-100 pr-0">
            {visibleChildren.map((child) =>
          <Link
            key={child.path}
            to={child.path}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 text-[12.5px] transition-colors",
              location.pathname === child.path ?
              "text-blue-700 font-semibold bg-blue-50 border-r-2 border-blue-600 -mr-[2px]" :
              "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
            )}>
            
                <child.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span>{child.label}</span>
              </Link>
          )}
          </div>
        }
      </div>);

  }

  const feat = ITEM_FEATURES[item.path];
  if (feat && !isAdmin() && !hasFeature(feat)) return null;
  if (!isAdmin() && !canViewPage(item.path)) return null;

  const isActive = location.pathname === item.path;
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-sm text-[13px] transition-colors",
        isActive ?
        "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600" :
        "text-gray-700 hover:bg-gray-100"
      )}>
      
      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-gray-500")} />
      <span>{item.label}</span>
    </Link>);

}

export default function Sidebar({ isOpen, onToggle }) {
  const { lang } = useLang();
  const menuItems = getMenuItems(lang);
  const isRTL = lang === 'ar';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen &&
      <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onToggle} />
      }

      <aside
        className={cn(
          "fixed top-0 h-full z-50 flex flex-col transition-all duration-300",
          "lg:sticky lg:top-0 lg:z-auto lg:h-screen",
          "w-64 bg-white",
          isRTL ? "right-0 border-l border-gray-200" : "left-0 border-r border-gray-200",
          isRTL ?
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0" :
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ boxShadow: isRTL ? "-2px 0 8px rgba(0,0,0,0.06)" : "2px 0 8px rgba(0,0,0,0.06)" }}>
        
        {/* Header - Office style brand bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white shrink-0">
          <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm leading-tight">ETQAN ERP</p>
            <p className="text-blue-200 text-[10px]">نظام الإدارة المالية</p>
          </div>
          <button onClick={onToggle} className="lg:hidden text-white/80 hover:text-white p-1">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-1 space-y-0.5">
          {menuItems.map((item, i) =>
          <SidebarItem
            key={i}
            item={item}
            onNavigate={() => {if (isOpen) onToggle();}} />

          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 space-y-1">
          <div className="flex justify-center gap-3 text-[11px] text-gray-400">
            <Link to="/about" className="hover:text-primary transition-colors">عن النظام</Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-primary transition-colors">تواصل معنا</Link>
          </div>
          <p className="text-gray-400 text-[10px] text-center">v2.0 • ETQAN ERP</p>
        </div>
      </aside>
    </>);

}