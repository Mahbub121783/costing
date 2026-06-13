import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Shirt, BookOpen, Users, Factory,
  LogOut, Layers, ChevronRight, Scissors
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
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 w-60 flex flex-col z-30 bg-[#0b1120]">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Shirt size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">GCS</p>
            <p className="text-slate-400 text-[11px] leading-tight">Garments Costing</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV.map((item, i) => {
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
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-slate-500 text-[10px] capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <button
            onClick={logout}
            className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
