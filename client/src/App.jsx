import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ui/ProtectedRoute';
import AdminRoute from './components/ui/AdminRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import StyleList from './pages/styles/StyleList';
import StyleNew from './pages/styles/StyleNew';
import StyleDetail from './pages/styles/StyleDetail';
import CostingForm from './pages/costing/CostingForm';
import CostingPrint from './pages/costing/print/CostingPrint';
import FabricLibraryPage from './pages/library/FabricLibraryPage';
import TrimLibraryPage from './pages/library/TrimLibraryPage';
import BuyersPage from './pages/masters/BuyersPage';
import FactoriesPage from './pages/masters/FactoriesPage';
import UsersPage from './pages/admin/UsersPage';
import ProfilePage from './pages/profile/ProfilePage';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import OrderFinanceList from './pages/finance/OrderFinanceList';
import OrderFinanceDetail from './pages/finance/OrderFinanceDetail';
import InvoiceList from './pages/finance/InvoiceList';
import InvoiceDetail from './pages/finance/InvoiceDetail';
import InvoicePrint from './pages/finance/InvoicePrint';
import ExpenseList from './pages/finance/ExpenseList';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeNew from './pages/employees/EmployeeNew';
import EmployeeDetail from './pages/employees/EmployeeDetail';
import PayrollList from './pages/payroll/PayrollList';
import PayrollRun from './pages/payroll/PayrollRun';

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          {/* Full-screen print views — no sidebar */}
          <Route path="/costing/:id/print" element={<CostingPrint />} />
          <Route path="/finance/invoices/:id/print" element={<InvoicePrint />} />

          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/styles" element={<StyleList />} />
            <Route path="/styles/new" element={<StyleNew />} />
            <Route path="/styles/:id" element={<StyleDetail />} />
            <Route path="/costing/:id" element={<CostingForm />} />
            <Route path="/library/fabric" element={<FabricLibraryPage />} />
            <Route path="/library/trim" element={<TrimLibraryPage />} />
            <Route path="/masters/buyers" element={<BuyersPage />} />
            <Route path="/masters/factories" element={<FactoriesPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Finance */}
            <Route path="/finance/dashboard" element={<FinanceDashboard />} />
            <Route path="/finance/orders" element={<OrderFinanceList />} />
            <Route path="/finance/orders/:id" element={<OrderFinanceDetail />} />
            <Route path="/finance/invoices" element={<InvoiceList />} />
            <Route path="/finance/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/finance/expenses" element={<ExpenseList />} />

            {/* HR & Payroll */}
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/employees/new" element={<EmployeeNew />} />
            <Route path="/employees/:id" element={<EmployeeDetail />} />
            <Route path="/payroll" element={<PayrollList />} />
            <Route path="/payroll/:id" element={<PayrollRun />} />

            {/* Admin-only routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
