import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CATEGORY_LABELS = {
  TRANSPORT: 'Transport', UTILITY: 'Utility', OFFICE_RENT: 'Office Rent',
  SALARIES: 'Salaries', MOBILE: 'Mobile', FOOD_ENTERTAINMENT: 'Food & Entertainment',
  MARKETING: 'Marketing', MISCELLANEOUS: 'Miscellaneous',
};

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color || 'text-slate-900'}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color ? 'bg-current/10' : 'bg-slate-100'}`}>
          <Icon size={20} className={color || 'text-slate-500'} />
        </div>
      </div>
    </div>
  );
}

export default function FinanceDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/finance/stats')
      .then((r) => setStats(r.data))
      .catch(() => toast.error('Failed to load finance stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!stats) return null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Finance Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Current month summary</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Receivables" value={fmt(stats.totalReceivables)} icon={AlertCircle} color="text-amber-600" sub="Outstanding balance" />
        <StatCard label="Monthly Revenue" value={fmt(stats.monthlyRevenue)} icon={TrendingUp} color="text-emerald-600" sub="Payments received" />
        <StatCard label="Monthly Expenses" value={fmt(stats.monthlyExpenses)} icon={TrendingDown} color="text-red-500" sub="Approved + Paid" />
        <StatCard label="Monthly Payroll" value={fmt(stats.monthlyPayroll)} icon={Users} color="text-violet-600" sub="Net paid" />
        <StatCard label="Net Profit" value={fmt(stats.netProfit)} icon={DollarSign} color={stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'} sub="Revenue − Expenses − Payroll" />
        <StatCard label="Active Employees" value={stats.activeEmployees} icon={Users} sub="On payroll" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Buyers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <ShoppingBag size={15} className="text-indigo-500" /> Top Buyers (All Time)
          </h2>
          {stats.topBuyers.length === 0 ? (
            <p className="text-sm text-slate-400">No order data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topBuyers.map((b, i) => (
                <div key={b.buyerId} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-medium text-slate-400">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{b.buyerName}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{fmt(b.totalValue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingDown size={15} className="text-red-400" /> Expense Breakdown (This Month)
          </h2>
          {stats.expenseByCategory.length === 0 ? (
            <p className="text-sm text-slate-400">No expenses this month</p>
          ) : (
            <div className="space-y-2">
              {stats.expenseByCategory.map((e) => (
                <div key={e.category} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{CATEGORY_LABELS[e.category] || e.category}</span>
                  <span className="text-sm font-semibold text-slate-800">{fmt(e.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Recent Orders</h2>
          {stats.recentOrders.length === 0 ? <p className="text-sm text-slate-400">No orders yet</p> : (
            <div className="space-y-2">
              {stats.recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{o.orderNo}</p>
                    <p className="text-xs text-slate-400">{o.buyer?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-700">{fmt(o.totalGoodsValue)}</p>
                    <span className={`badge badge-${o.paymentStatus.toLowerCase()}`}>{o.paymentStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Recent Expenses</h2>
          {stats.recentExpenses.length === 0 ? <p className="text-sm text-slate-400">No expenses yet</p> : (
            <div className="space-y-2">
              {stats.recentExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-800 truncate max-w-[200px]">{e.description}</p>
                    <p className="text-xs text-slate-400">{CATEGORY_LABELS[e.category]}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-700">{fmt(e.amount)}</p>
                    <span className={`badge badge-${e.status.toLowerCase()}`}>{e.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
