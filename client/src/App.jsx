import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ui/ProtectedRoute';
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

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          {/* Print view — full screen, no sidebar */}
          <Route path="/costing/:id/print" element={<CostingPrint />} />

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
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
