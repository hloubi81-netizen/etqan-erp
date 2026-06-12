// سجل مركزي لجميع صفحات النظام مجمعة حسب الأقسام
// section: القسم المرتبط في نظام الصلاحيات (للسلوك الافتراضي عند عدم وجود تخصيص)
export const PAGE_GROUPS = [
  {
    label: "الرئيسية",
    pages: [{ path: "/", label: "لوحة التحكم", section: "dashboard" }],
  },
  {
    label: "المخزون والمنتجات",
    pages: [
      { path: "/groups", label: "المجموعات", section: "warehouses" },
      { path: "/products", label: "المنتجات", section: "warehouses" },
      { path: "/services", label: "الخدمات", section: "warehouses" },
      { path: "/warehouses", label: "المستودعات", section: "warehouses" },
      { path: "/transfers", label: "المناقلات المخزنية", section: "warehouses" },
      { path: "/inventory-count", label: "الجرد", section: "warehouses" },
      { path: "/inventory/stock-alerts", label: "تنبيهات المخزون", section: "warehouses" },
      { path: "/inventory/expiry", label: "تتبع انتهاء الصلاحية", section: "warehouses" },
      { path: "/inventory/barcode", label: "إدارة الباركود", section: "warehouses" },
      { path: "/inventory/periodic-count", label: "الجرد الدوري", section: "warehouses" },
      { path: "/inventory/sheets-sync", label: "مزامنة Google Sheets", section: "warehouses" },
    ],
  },
  {
    label: "المبيعات",
    pages: [
      { path: "/invoices/sales", label: "فاتورة مبيعات", section: "invoices" },
      { path: "/invoices/sales-return", label: "مرتجع مبيعات", section: "invoices" },
      { path: "/pos", label: "شاشة البيع (POS)", section: "invoices" },
      { path: "/pos/history", label: "سجل نقطة البيع", section: "invoices" },
      { path: "/orders", label: "أوامر الشراء وعروض الأسعار", section: "invoices" },
      { path: "/ecom-orders", label: "طلبات المتاجر الإلكترونية", section: "invoices" },
      { path: "/store-connections", label: "ربط المتاجر الإلكترونية", section: "invoices" },
      { path: "/ecom-product-mappings", label: "ربط منتجات المتاجر", section: "invoices" },
      { path: "/price-lists", label: "قوائم الأسعار", section: "invoices" },
    ],
  },
  {
    label: "المشتريات",
    pages: [
      { path: "/invoices/purchases", label: "فاتورة مشتريات", section: "invoices" },
      { path: "/invoices/purchases-return", label: "مرتجع مشتريات", section: "invoices" },
    ],
  },
  {
    label: "المحاسبة",
    pages: [
      { path: "/accounts", label: "دليل الحسابات", section: "accounting" },
      { path: "/currencies", label: "العملات", section: "accounting" },
      { path: "/invoice-patterns", label: "أنماط الفواتير", section: "accounting" },
      { path: "/invoices/opening-balance", label: "بضاعة أول المدة", section: "invoices" },
      { path: "/accounting/bank-reconciliation", label: "التسويات البنكية", section: "accounting" },
      { path: "/tax-rates", label: "النسب الضريبية", section: "accounting" },
      { path: "/assets", label: "الأصول الثابتة", section: "accounting" },
    ],
  },
  {
    label: "السندات",
    pages: [
      { path: "/vouchers/receipt", label: "سند قبض", section: "vouchers" },
      { path: "/vouchers/payment", label: "سند دفع", section: "vouchers" },
      { path: "/vouchers/daily", label: "سند يومية", section: "vouchers" },
      { path: "/vouchers/journal", label: "سند قيد", section: "vouchers" },
      { path: "/vouchers/opening", label: "قيد افتتاحي", section: "vouchers" },
    ],
  },
  {
    label: "القوائم المالية",
    pages: [
      { path: "/financial/dashboard", label: "اللوحة المالية", section: "financial" },
      { path: "/financial/income-statement", label: "قائمة الدخل", section: "financial" },
      { path: "/financial/balance-sheet", label: "الميزانية العمومية", section: "financial" },
      { path: "/financial/cash-flow", label: "التدفقات النقدية", section: "financial" },
      { path: "/financial/cash-calendar", label: "تقويم التدفقات النقدية", section: "financial" },
      { path: "/budget", label: "الميزانية والتخطيط", section: "financial" },
    ],
  },
  {
    label: "التكاليف والفروع",
    pages: [
      { path: "/cost-centers", label: "مراكز التكلفة", section: "costs" },
      { path: "/costs/management", label: "إدارة التكاليف", section: "costs" },
      { path: "/costs/report", label: "تقرير التكاليف", section: "costs" },
      { path: "/branches", label: "إدارة الفروع", section: "branches" },
      { path: "/reports/branches", label: "تقرير الفروع", section: "branches" },
    ],
  },
  {
    label: "الموارد البشرية",
    pages: [
      { path: "/hr/employees", label: "الموظفون", section: "users" },
      { path: "/hr/attendance", label: "الحضور والغياب", section: "users" },
      { path: "/hr/payroll", label: "الرواتب", section: "users" },
      { path: "/hr/leaves", label: "طلبات الإجازات", section: "users" },
    ],
  },
  {
    label: "الأصول الثابتة",
    pages: [{ path: "/assets", label: "الأصول الثابتة", section: "accounting" }],
  },
  {
    label: "التقارير",
    pages: [
      { path: "/reports/product-movement", label: "حركة المنتجات", section: "reports" },
      { path: "/reports/client-movement", label: "حركة العملاء", section: "reports" },
      { path: "/reports/supplier-movement", label: "حركة الموردين", section: "reports" },
      { path: "/reports/client-statement", label: "كشف حساب عميل", section: "reports" },
      { path: "/reports/supplier-statement", label: "كشف حساب مورد", section: "reports" },
      { path: "/reports/ledger", label: "دفتر الأستاذ", section: "reports" },
      { path: "/reports/general-ledger", label: "دفتر الأستاذ العام", section: "reports" },
      { path: "/reports/trial-balance", label: "ميزان المراجعة", section: "reports" },
      { path: "/reports/sales-dashboard", label: "لوحة تحكم المبيعات", section: "reports" },
      { path: "/reports/cogs", label: "تكلفة البضاعة المباعة (COGS)", section: "reports" },
      { path: "/reports/advanced", label: "التقارير المتقدمة", section: "reports" },
      { path: "/reports/inventory-variance", label: "فروقات الجرد", section: "reports" },
      { path: "/reports/tax", label: "التقرير الضريبي (VAT)", section: "reports" },
      { path: "/reports/custom", label: "التقارير المخصصة", section: "reports" },
      { path: "/reports/activity-log", label: "سجل النشاط", section: "reports" },
      { path: "/reports/branch-performance", label: "أداء الفروع", section: "reports" },
      { path: "/reports/service-profitability", label: "ربحية الخدمات", section: "reports" },
      { path: "/reports/services-dashboard", label: "لوحة الخدمات والأصول", section: "reports" },
      { path: "/reports/budget-vs-actual", label: "الميزانية مقابل الفعلي", section: "reports" },
    ],
  },
  {
    label: "أدوات أخرى",
    pages: [
      { path: "/loyalty", label: "النقاط والعروض الخاصة", section: "invoices" },
      { path: "/crm", label: "إدارة علاقات العملاء", section: "invoices" },
      { path: "/messages", label: "الرسائل الداخلية" },
      { path: "/notifications", label: "الإشعارات والتنبيهات" },
      { path: "/archive", label: "أرشيف المستندات" },
      { path: "/custody", label: "العهَد المالية", section: "accounting" },
      { path: "/custody/budget-report", label: "تقرير ميزانية العهد", section: "accounting" },
      { path: "/custody/calendar", label: "تقويم العهد", section: "accounting" },
    ],
  },
  {
    label: "الإدارة والإعدادات",
    pages: [
      { path: "/users", label: "إدارة المستخدمين", section: "users" },
      { path: "/subscriptions", label: "الاشتراكات", section: "users" },
      { path: "/settings", label: "الإعدادات", section: "settings" },
      { path: "/user-guide", label: "دليل الاستخدام" },
      { path: "/about", label: "عن النظام" },
      { path: "/contact", label: "تواصل معنا" },
    ],
  },
];

export const ALL_PAGES = PAGE_GROUPS.flatMap((g) => g.pages);

export function findPage(path) {
  return ALL_PAGES.find((p) => p.path === path);
}