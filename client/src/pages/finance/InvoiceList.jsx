import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api, { asArray } from '../../lib/api';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const TYPE_COLORS = { COMMERCIAL: 'badge-active', PROFORMA: 'badge-pending', INTERNAL: 'badge-terminated' };
const STATUS_COLORS = { DRAFT: 'badge-pending', SENT: 'badge-partial', PARTIAL: 'badge-partial', PAID: 'badge-paid', CANCELLED: 'badge-terminated' };

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ invoiceType: '', status: '' });

  const load = () => {
    const params = {};
    if (filters.invoiceType) params.invoiceType = filters.invoiceType;
    if (filters.status) params.status = filters.status;
    api.get('/invoices', { params }).then((r) => setInvoices(asArray(r.data))).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(load, [filters]);

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">{invoices.length} total</p>
        </div>
        <Link to="/finance/invoices/new" className="btn-primary gap-1.5"><Plus size={15} /> New Invoice</Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filters.invoiceType} onChange={(e) => setFilters((f) => ({ ...f, invoiceType: e.target.value }))} className="input w-36 text-sm">
          <option value="">All Types</option>
          <option value="COMMERCIAL">Commercial</option>
          <option value="PROFORMA">Proforma</option>
          <option value="INTERNAL">Internal</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="input w-32 text-sm">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div> : invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No invoices found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Invoice No</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Buyer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Total</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/finance/invoices/${inv.id}`} className="font-semibold text-indigo-600 hover:text-indigo-700">{inv.invoiceNo}</Link>
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${TYPE_COLORS[inv.invoiceType]}`}>{inv.invoiceType}</span></td>
                  <td className="px-4 py-3 text-slate-700">{inv.buyer?.name || inv.buyerName || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(inv.grandTotal)}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[inv.status]}`}>{inv.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <a href={`/finance/invoices/${inv.id}/print`} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-indigo-600 underline">Print</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
