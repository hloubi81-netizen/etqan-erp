import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import Products from './pages/Products';
import Warehouses from './pages/Warehouses';
import CostCenters from './pages/CostCenters';
import Accounts from './pages/Accounts';
import Currencies from './pages/Currencies';
import InvoicePatterns from './pages/InvoicePatterns';
import Invoices from './pages/Invoices';
import Vouchers from './pages/Vouchers';
import StockTransfers from './pages/StockTransfers';
import InventoryCount from './pages/InventoryCount';
import ProductMovement from './pages/reports/ProductMovement';
import AccountStatement from './pages/reports/AccountStatement';
import Ledger from './pages/reports/Ledger';
import GeneralLedger from './pages/reports/GeneralLedger';
import TrialBalance from './pages/reports/TrialBalance';
import Users from './pages/Users';
import FinancialDashboard from './pages/financial/FinancialDashboard';
import Branches from './pages/Branches';
import BranchReport from './pages/reports/BranchReport';
import CostManagement from './pages/costs/CostManagement';
import CostReport from './pages/costs/CostReport';
import SubscriptionManagement from './pages/SubscriptionManagement';
import { SubscriptionProvider } from './hooks/useSubscription.jsx';
import { AppSettingsProvider } from './hooks/useAppSettings.jsx';
import { LangProvider } from './hooks/useLang.jsx';
import { ThemeProvider } from './hooks/useTheme.jsx';
import { CurrencyProvider } from './hooks/useCurrency.jsx';
import IncomeStatement from './pages/financial/IncomeStatement';
import POS from './pages/pos/POS';
import POSHistory from './pages/pos/POSHistory';
import Employees from './pages/hr/Employees';
import Attendance from './pages/hr/Attendance';
import Payroll from './pages/hr/Payroll';
import BalanceSheet from './pages/financial/BalanceSheet';
import AdvancedReports from './pages/reports/AdvancedReports';
import FixedAssets from './pages/assets/FixedAssets';
import CashFlow from './pages/financial/CashFlow';
import CashCalendar from './pages/financial/CashCalendar';
import Settings from './pages/Settings';
import ApprovalWorkflows from './pages/settings/ApprovalWorkflows';
import LeaveRequests from './pages/hr/LeaveRequests';
import BankReconciliation from './pages/accounting/BankReconciliation';
import StockAlerts from './pages/inventory/StockAlerts';
import PeriodicInventory from './pages/inventory/PeriodicInventory';
import ExpiryTracking from './pages/inventory/ExpiryTracking';
import BarcodeManagement from './pages/inventory/BarcodeManagement';
import ActivityLogPage from './pages/reports/ActivityLog';
import PurchaseOrders from './pages/orders/PurchaseOrders';
import PurchaseRequests from './pages/orders/PurchaseRequests';
import EcomOrders from './pages/orders/EcomOrders';
import StoreConnections from './pages/orders/StoreConnections';
import EcomProductMappings from './pages/orders/EcomProductMappings';
import BudgetManagement from './pages/budget/BudgetManagement';
import CRM from './pages/crm/CRM';
import NotificationsCenter from './pages/notifications/NotificationsCenter';
import CustomReports from './pages/reports/CustomReports';
import SalesDashboard from './pages/reports/SalesDashboard';
import DemandForecasting from './pages/reports/DemandForecasting';
import CogsReport from './pages/reports/CogsReport';
import PriceLists from './pages/PriceLists';
import TaxRates from './pages/tax/TaxRates';
import LoyaltyProgram from './pages/loyalty/LoyaltyProgram';
import CustomerPortal from './pages/loyalty/CustomerPortal';
import TaxReport from './pages/reports/TaxReport';
import InventoryVarianceReport from './pages/reports/InventoryVarianceReport';
import BranchPerformance from './pages/reports/BranchPerformance';
import ServiceProfitability from './pages/reports/ServiceProfitability';
import ServicesDashboard from './pages/reports/ServicesDashboard';
import About from './pages/About';
import UserGuide from './pages/UserGuide';
import Contact from './pages/Contact';
import Messages from './pages/Messages';
import SelectPlan from './pages/SelectPlan';
import Services from './pages/Services';
import Archive from './pages/Archive';
import CustodyManagement from './pages/custody/CustodyManagement';
import CustodyBudgetReport from './pages/custody/CustodyBudgetReport';
import CustodyCalendar from './pages/custody/CustodyCalendar';
import BudgetVsActualDashboard from './pages/reports/BudgetVsActualDashboard';
import AIChatbot from './components/assistant/AIChatbot';
import InventorySheetsSync from './pages/inventory/InventorySheetsSync';
import GoodsReceipt from './pages/inventory/GoodsReceipt';
import InventoryDashboard from './pages/inventory/InventoryDashboard';
import AdminControlPanel from './pages/AdminControlPanel';
import GoogleCalendarIntegration from './pages/settings/GoogleCalendarIntegration';
import TeamManagement from './pages/TeamManagement';
import BusinessPerformance from './pages/reports/BusinessPerformance';
import BranchAttendance from './pages/reports/BranchAttendance';
import InventoryMovementAnalysis from './pages/reports/InventoryMovementAnalysis';
import BranchExpensesAverage from './pages/reports/BranchExpensesAverage';
import PurchaseRequestTimeline from './pages/reports/PurchaseRequestTimeline';
import LettersOfCredit from './pages/imports/LettersOfCredit';
import LcDashboard from './pages/imports/LcDashboard';
import AICopilot from './pages/AICopilot';
import PayrollRuns from './pages/PayrollRuns';
import SalesAgent from './pages/SalesAgent';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ai-copilot" element={<AICopilot />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/products" element={<Products />} />
        <Route path="/services" element={<Services />} />
        <Route path="/warehouses" element={<Warehouses />} />
        <Route path="/cost-centers" element={<CostCenters />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/currencies" element={<Currencies />} />
        <Route path="/invoice-patterns" element={<InvoicePatterns />} />
        <Route path="/invoices/:type" element={<Invoices />} />
        <Route path="/vouchers/:type" element={<Vouchers />} />
        <Route path="/transfers" element={<StockTransfers />} />
        <Route path="/inventory-count" element={<InventoryCount />} />
        <Route path="/reports/product-movement" element={<ProductMovement />} />
        <Route path="/reports/client-movement" element={<ProductMovement />} />
        <Route path="/reports/supplier-movement" element={<ProductMovement />} />
        <Route path="/reports/client-statement" element={<AccountStatement />} />
        <Route path="/reports/supplier-statement" element={<AccountStatement />} />
        <Route path="/reports/ledger" element={<Ledger />} />
        <Route path="/reports/general-ledger" element={<GeneralLedger />} />
        <Route path="/reports/trial-balance" element={<TrialBalance />} />
        <Route path="/users" element={<Users />} />
        <Route path="/financial/dashboard" element={<FinancialDashboard />} />
        <Route path="/financial/income-statement" element={<IncomeStatement />} />
        <Route path="/financial/balance-sheet" element={<BalanceSheet />} />
        <Route path="/financial/cash-flow" element={<CashFlow />} />
        <Route path="/financial/cash-calendar" element={<CashCalendar />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/reports/branches" element={<BranchReport />} />
        <Route path="/costs/management" element={<CostManagement />} />
        <Route path="/costs/report" element={<CostReport />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/pos/history" element={<POSHistory />} />
        <Route path="/hr/employees" element={<Employees />} />
        <Route path="/hr/attendance" element={<Attendance />} />
        <Route path="/hr/payroll" element={<Payroll />} />
        <Route path="/hr/payroll-runs" element={<PayrollRuns />} />
        <Route path="/reports/advanced" element={<AdvancedReports />} />
        <Route path="/assets" element={<FixedAssets />} />
        <Route path="/subscriptions" element={<SubscriptionManagement />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/approval-workflows" element={<ApprovalWorkflows />} />
        <Route path="/hr/leaves" element={<LeaveRequests />} />
        <Route path="/accounting/bank-reconciliation" element={<BankReconciliation />} />
        <Route path="/inventory/stock-alerts" element={<StockAlerts />} />
        <Route path="/inventory/periodic-count" element={<PeriodicInventory />} />
        <Route path="/inventory/expiry" element={<ExpiryTracking />} />
        <Route path="/inventory/barcode" element={<BarcodeManagement />} />
        <Route path="/reports/activity-log" element={<ActivityLogPage />} />
        <Route path="/orders" element={<PurchaseOrders />} />
        <Route path="/purchase-requests" element={<PurchaseRequests />} />
        <Route path="/ecom-orders" element={<EcomOrders />} />
        <Route path="/store-connections" element={<StoreConnections />} />
        <Route path="/ecom-product-mappings" element={<EcomProductMappings />} />
        <Route path="/budget" element={<BudgetManagement />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/notifications" element={<NotificationsCenter />} />
        <Route path="/reports/custom" element={<CustomReports />} />
        <Route path="/reports/demand-forecasting" element={<DemandForecasting />} />
        <Route path="/reports/sales-dashboard" element={<SalesDashboard />} />
        <Route path="/reports/cogs" element={<CogsReport />} />
        <Route path="/price-lists" element={<PriceLists />} />
        <Route path="/tax-rates" element={<TaxRates />} />
        <Route path="/loyalty" element={<LoyaltyProgram />} />
        <Route path="/customer-portal" element={<CustomerPortal />} />
        <Route path="/reports/tax" element={<TaxReport />} />
        <Route path="/reports/inventory-variance" element={<InventoryVarianceReport />} />
        <Route path="/reports/branch-performance" element={<BranchPerformance />} />
        <Route path="/reports/service-profitability" element={<ServiceProfitability />} />
        <Route path="/reports/services-dashboard" element={<ServicesDashboard />} />
        <Route path="/user-guide" element={<UserGuide />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/select-plan" element={<SelectPlan />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/custody" element={<CustodyManagement />} />
        <Route path="/custody/budget-report" element={<CustodyBudgetReport />} />
        <Route path="/custody/calendar" element={<CustodyCalendar />} />
        <Route path="/reports/budget-vs-actual" element={<BudgetVsActualDashboard />} />
        <Route path="/reports/business-performance" element={<BusinessPerformance />} />
        <Route path="/reports/branch-attendance" element={<BranchAttendance />} />
        <Route path="/reports/branch-expenses-average" element={<BranchExpensesAverage />} />
        <Route path="/reports/purchase-request-timeline" element={<PurchaseRequestTimeline />} />
        <Route path="/reports/inventory-movement-analysis" element={<InventoryMovementAnalysis />} />
        <Route path="/inventory/sheets-sync" element={<InventorySheetsSync />} />
        <Route path="/inventory/goods-receipt" element={<GoodsReceipt />} />
        <Route path="/imports/letters-of-credit" element={<LettersOfCredit />} />
        <Route path="/imports/lc-dashboard" element={<LcDashboard />} />
        <Route path="/inventory/dashboard" element={<InventoryDashboard />} />
        <Route path="/admin/control-panel" element={<AdminControlPanel />} />
        <Route path="/settings/google-calendar" element={<GoogleCalendarIntegration />} />
        <Route path="/team" element={<TeamManagement />} />
        <Route path="/sales-agent" element={<SalesAgent />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <LangProvider>
      <CurrencyProvider>
      <SubscriptionProvider>
      <AppSettingsProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
          <AIChatbot />
        </Router>
        <Toaster />
      </QueryClientProvider>
      </AppSettingsProvider>
      </SubscriptionProvider>
      </CurrencyProvider>
      </LangProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App