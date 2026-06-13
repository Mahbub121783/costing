import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shirt, FileText, CheckCircle, Clock, Plus, Send,
  TrendingUp, Layers, BookOpen, Users, Factory, ArrowRight
} from 'lucide-react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';

const STATUS_CONFIG = {
  DRAFT:     { badge: 'badge-draft',     dot: 'bg-slate-400' },
  SUBMITTED: { badge: 'badge-submitted', dot: 'bg-amber-400' },
  APPROVED:  { badge: 'badge-approved',  dot: 'bg-emerald-500' },
  REJECTED:  { badge: 'badge-rejected',  dot: 'bg-red-500' },
};

function StatCard({ label, value, icon: Icon, color, bg, to, loading }) {
  return (
    <Link to={to} className="stat-card group">
      <div className={`stat-icon ${bg}`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">
          {loading ? (
            <span className="inline-block w-8 h-5 bg-slate-100 rounded animate-pulse" />
          ) : (value ?? '—')}
        </p>
        <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">{label}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(({ data: res }) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {};
  const recentStyles = data?.recentStyles || [];
  const recentCostings = data?.recentCostings || [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {firstName}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Garments Costing System — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link to="/styles/new" className="btn-primary">
          <Plus size={15} /> New Style
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Styles"    value={stats.totalStyles}   icon={Shirt}       color="text-indigo-600"  bg="bg-indigo-50"  to="/styles"   loading={loading} />
        <StatCard label="Total Costings"  value={stats.totalCostings} icon={FileText}    color="text-violet-600"  bg="bg-violet-50"  to="/styles"   loading={loading} />
        <StatCard label="Approved"        value={stats.approved}      icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-50" to="/styles"   loading={loading} />
        <StatCard label="Submitted"       value={stats.submitted}     icon={Send}        color="text-amber-600"   bg="bg-amber-50"   to="/styles"   loading={loading} />
        <StatCard label="Drafts"          value={stats.draft}         icon={Clock}       color="text-slate-500"   bg="bg-slate-100"  to="/styles"   loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Styles */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h2 className="section-title">
              <Shirt size={15} className="text-indigo-500" /> Recent Styles
            </h2>
            <Link to="/styles" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              All styles <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Style No</th>
                  <th>Description</th>
                  <th>Buyer</th>
                  <th>Sizes</th>
                  <th className="text-center">OCS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-300 text-sm">Loading…</td></tr>
                )}
                {!loading && recentStyles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Shirt size={32} className="text-slate-100 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No styles yet.</p>
                      <Link to="/styles/new" className="btn-primary btn-sm mt-3 inline-flex">
                        <Plus size={12} /> Create First Style
                      </Link>
                    </td>
                  </tr>
                )}
                {recentStyles.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono font-bold text-indigo-700">{s.styleNo}</td>
                    <td className="max-w-[180px]"><p className="truncate text-slate-700">{s.description}</p></td>
                    <td className="text-slate-500">{s.buyer?.name || '—'}</td>
                    <td>
                      <div className="flex gap-0.5 flex-wrap">
                        {s.sizes?.slice(0, 3).map((sz) => (
                          <span key={sz} className="bg-indigo-50 text-indigo-600 text-[10px] font-medium px-1.5 py-0.5 rounded">{sz}</span>
                        ))}
                        {s.sizes?.length > 3 && <span className="text-slate-400 text-[10px]">+{s.sizes.length - 3}</span>}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {s._count?.costings || 0}
                      </span>
                    </td>
                    <td>
                      <Link to={`/styles/${s.id}`} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 whitespace-nowrap">
                        Open <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Costings */}
        <div className="card">
          <div className="card-header">
            <h2 className="section-title">
              <TrendingUp size={15} className="text-violet-500" /> Recent Costings
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {loading && <p className="p-5 text-center text-slate-300 text-sm">Loading…</p>}
            {!loading && recentCostings.length === 0 && (
              <p className="p-8 text-center text-slate-300 text-sm">No costings yet</p>
            )}
            {recentCostings.map((c) => {
              const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.DRAFT;
              return (
                <Link
                  key={c.id}
                  to={`/costing/${c.id}`}
                  className="flex items-center gap-3 p-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={15} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 font-mono truncate">{c.style?.styleNo}</p>
                    <p className="text-xs text-slate-400 truncate">{c.style?.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={sc.badge}>
                        <span className={`status-dot ${sc.dot}`} />
                        {c.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">v{c.version}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/library/fabric', label: 'Fabric Library', desc: 'Yarn prices, fabrication specs', icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { to: '/library/trim', label: 'Trim Library', desc: 'Buttons, zippers, labels, tags', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
          { to: '/masters/buyers', label: 'Buyers', desc: 'Manage buyer / brand list', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { to: '/masters/factories', label: 'Factories', desc: 'Production factory list', icon: Factory, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="card p-4 hover:shadow-md transition-all hover:-translate-y-0.5 group">
            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
              <item.icon size={18} className={item.color} />
            </div>
            <p className={`text-sm font-bold ${item.color} mb-0.5`}>{item.label}</p>
            <p className="text-xs text-slate-400 leading-tight">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
