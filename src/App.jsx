import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import PlanGuard from './components/shared/PlanGuard';
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
import TrialBalance from './pages/reports/TrialBalance';
import Users from './pages/Users';
import FinancialDashboard from './pages/financial/FinancialDashboard';
import Branches from './pages/Branches';
import BranchReport from './pages/reports/BranchReport';
import CostManagement from './pages/costs/CostManagement';
import CostReport from './pages/costs/CostReport';
import IncomeStatement from './pages/financial/IncomeStatement';
import BalanceSheet from './pages/financial/BalanceSheet';
import CashFlow from './pages/financial/CashFlow';

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
        <Route path="/groups" element={<Groups />} />
        <Route path="/products" element={<Products />} />
        <Route path="/warehouses" element={<Warehouses />} />
        <Route path="/cost-centers" element={<PlanGuard plan="advanced"><CostCenters /></PlanGuard>} />
        <Route path="/accounts" element={<PlanGuard plan="advanced"><Accounts /></PlanGuard>} />
        <Route path="/currencies" element={<PlanGuard plan="advanced"><Currencies /></PlanGuard>} />
        <Route path="/invoice-patterns" element={<PlanGuard plan="advanced"><InvoicePatterns /></PlanGuard>} />
        <Route path="/invoices/:type" element={<PlanGuard plan="advanced"><Invoices /></PlanGuard>} />
        <Route path="/vouchers/:type" element={<PlanGuard plan="advanced"><Vouchers /></PlanGuard>} />
        <Route path="/transfers" element={<StockTransfers />} />
        <Route path="/inventory-count" element={<InventoryCount />} />
        <Route path="/reports/product-movement" element={<PlanGuard plan="advanced"><ProductMovement /></PlanGuard>} />
        <Route path="/reports/client-movement" element={<PlanGuard plan="advanced"><ProductMovement /></PlanGuard>} />
        <Route path="/reports/supplier-movement" element={<PlanGuard plan="advanced"><ProductMovement /></PlanGuard>} />
        <Route path="/reports/client-statement" element={<PlanGuard plan="advanced"><AccountStatement /></PlanGuard>} />
        <Route path="/reports/supplier-statement" element={<PlanGuard plan="advanced"><AccountStatement /></PlanGuard>} />
        <Route path="/reports/ledger" element={<PlanGuard plan="advanced"><Ledger /></PlanGuard>} />
        <Route path="/reports/trial-balance" element={<PlanGuard plan="advanced"><TrialBalance /></PlanGuard>} />
        <Route path="/users" element={<PlanGuard plan="admin"><Users /></PlanGuard>} />
        <Route path="/financial/dashboard" element={<PlanGuard plan="premium"><FinancialDashboard /></PlanGuard>} />
        <Route path="/financial/income-statement" element={<PlanGuard plan="premium"><IncomeStatement /></PlanGuard>} />
        <Route path="/financial/balance-sheet" element={<PlanGuard plan="premium"><BalanceSheet /></PlanGuard>} />
        <Route path="/financial/cash-flow" element={<PlanGuard plan="premium"><CashFlow /></PlanGuard>} />
        <Route path="/branches" element={<PlanGuard plan="premium"><Branches /></PlanGuard>} />
        <Route path="/reports/branches" element={<PlanGuard plan="premium"><BranchReport /></PlanGuard>} />
        <Route path="/costs/management" element={<PlanGuard plan="advanced"><CostManagement /></PlanGuard>} />
        <Route path="/costs/report" element={<PlanGuard plan="advanced"><CostReport /></PlanGuard>} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App