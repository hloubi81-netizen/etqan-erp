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
import TrialBalance from './pages/reports/TrialBalance';
import Users from './pages/Users';
import FinancialDashboard from './pages/financial/FinancialDashboard';
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
        <Route path="/reports/trial-balance" element={<TrialBalance />} />
        <Route path="/users" element={<Users />} />
        <Route path="/financial/dashboard" element={<FinancialDashboard />} />
        <Route path="/financial/income-statement" element={<IncomeStatement />} />
        <Route path="/financial/balance-sheet" element={<BalanceSheet />} />
        <Route path="/financial/cash-flow" element={<CashFlow />} />
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