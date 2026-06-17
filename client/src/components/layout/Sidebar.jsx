import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Shirt, Users, Factory,
  LogOut, Layers, Scissors, ShieldCheck, UserCircle,
  TrendingUp, ShoppingBag, FileText, Receipt, UserSquare, Wallet, X,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/styles', icon: Shirt, label: 'Styles & OCS' },
  { divider: 'Library' },
  { to: '/library/fabric', icon: Layers, label: 'Fabric Library' },
  { to: '/library/trim', icon: Scissors, label: 'Trim Library' },
  { divider: 'Masters' },
  { to: '/masters/buyers', icon: Users, label: 'Buyers / Brands' },
  { to: '/masters/factories', icon: Factory, label: 'Factories' },
  { divider: 'Finance' },
  { to: '/finance/dashboard', icon: TrendingUp, label: 'Finance Overview' },
  { to: '/finance/orders', icon: ShoppingBag, label: 'Orders & Payments' },
  { to: '/finance/invoices', icon: FileText, label: 'Invoices' },
  { to: '/finance/expenses', icon: Receipt, label: 'Expenses' },
  { divider: 'HR & Payroll' },
  { to: '/employees', icon: UserSquare, label: 'Employees' },
  { to: '/payroll', icon: Wallet, label: 'Payroll' },
];

const ADMIN_NAV = [
  { divider: 'Admin' },
  { to: '/admin/users', icon: ShieldCheck, label: 'User Management' },
];

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const allNav = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <aside
      className={`fixed inset-y-0 left-0 w-60 flex flex-col z-40 bg-[#0b1120] transition-transform duration-200 ease-out lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Shirt size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">GCS</p>
            <p className="text-slate-400 text-[11px] leading-tight">Garments Costing</p>
          </div>
        </div>
        {/* Close (mobile only) */}
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1" aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {allNav.map((item, i) => {
          if (item.divider) {
            return (
              <p key={i} className="px-2.5 pt-4 pb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                {item.divider}
              </p>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                }`
              }
            >
              <Icon size={15} className="flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-2.5 py-3 border-t border-white/[0.07]">
        <button
          onClick={() => { onClose(); navigate('/profile'); }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-slate-500 text-[10px] capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <UserCircle size={13} className="text-slate-600 flex-shrink-0" />
        </button>
        <button
          onClick={logout}
          className="mt-1 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-white/[0.04] transition-colors text-xs"
        >
          <LogOut size={12} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
