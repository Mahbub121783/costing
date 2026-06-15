import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function AdminRoute() {
  const { user } = useAuthStore();
  return user?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
