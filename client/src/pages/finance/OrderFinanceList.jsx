import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import OrderFinanceModal from './OrderFinanceModal';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const STATUS_COLORS = { PENDING: 'badge-pending', PARTIAL: 'badge-partial', PAID: 'badge-paid' };

export default function OrderFinanceList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    api.get('/order-finance', { params }).then((r) => setOrders(r.data)).catch(() => toast.error('Failed to load orders')).finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.orderNo.toLowerCase().includes(q) || o.buyer?.name?.toLowerCase().includes(q) || o.costing?.style?.styleNo?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Orders & Payments</h1>
          <p className="text-sm text-slate-500">{orders.length} total orders</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary gap-1.5">
          <Plus size={15} /> New Order
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order no, buyer, style…" className="input pl-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-36 text-sm">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No orders found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Order No</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Buyer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Style</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Agreed FOB</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Qty</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Total Value</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/finance/orders/${o.id}`} className="font-semibold text-indigo-600 hover:text-indigo-700">{o.orderNo}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{o.buyer?.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{o.costing?.style?.styleNo}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{fmt(o.agreedFobPerPc)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{o.totalQty?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(o.totalGoodsValue)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(o.balanceAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[o.paymentStatus] || 'badge-pending'}`}>{o.paymentStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <OrderFinanceModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
