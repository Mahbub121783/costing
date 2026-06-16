import { useEffect, useState } from 'react';
import { Plus, Check, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api, { asArray } from '../../lib/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const STATUS_COLORS = { PENDING: 'badge-pending', APPROVED: 'badge-partial', PAID: 'badge-paid' };
const CATEGORIES = ['TRANSPORT', 'UTILITY', 'OFFICE_RENT', 'SALARIES', 'MOBILE', 'FOOD_ENTERTAINMENT', 'MARKETING', 'MISCELLANEOUS'];
const CATEGORY_LABELS = { TRANSPORT: 'Transport', UTILITY: 'Utility', OFFICE_RENT: 'Office Rent', SALARIES: 'Salaries', MOBILE: 'Mobile', FOOD_ENTERTAINMENT: 'Food & Ent', MARKETING: 'Marketing', MISCELLANEOUS: 'Misc' };

function NewExpenseModal({ onClose, onSaved }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { expenseDate: new Date().toISOString().slice(0, 10), category: 'TRANSPORT', paymentMethod: 'Cash' },
  });

  const onSubmit = async (data) => {
    try {
      await api.post('/expenses', data);
      toast.success('Expense added');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">New Expense</h3>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Date</label>
              <input {...register('expenseDate')} type="date" className="input" />
            </div>
            <div>
              <label className="field-label">Category</label>
              <select {...register('category')} className="input">
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea {...register('description', { required: 'Required' })} className="input" rows={2} />
            {errors.description && <p className="field-error">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Amount (USD)</label>
              <input {...register('amount', { required: 'Required' })} className="input" placeholder="0.00" />
              {errors.amount && <p className="field-error">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="field-label">Payment Method</label>
              <select {...register('paymentMethod')} className="input">
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Mobile Banking">Mobile Banking</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving…' : 'Add Expense'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpenseList() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ category: '', status: '', month: '', year: '' });

  const load = () => {
    const params = {};
    if (filters.category) params.category = filters.category;
    if (filters.status) params.status = filters.status;
    if (filters.month) params.month = filters.month;
    if (filters.year) params.year = filters.year;
    api.get('/expenses', { params }).then((r) => setExpenses(asArray(r.data))).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  };

  useEffect(load, [filters]);

  const approve = async (id) => {
    await api.put(`/expenses/${id}/approve`);
    toast.success('Approved');
    load();
  };

  const markPaid = async (id) => {
    await api.put(`/expenses/${id}/pay`);
    toast.success('Marked paid');
    load();
  };

  const del = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    toast.success('Deleted');
    load();
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Business Expenses</h1>
          <p className="text-sm text-slate-500">{expenses.length} entries · Total: {fmt(total)}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary gap-1.5"><Plus size={15} /> Add Expense</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className="input w-40 text-sm">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="input w-32 text-sm">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
        </select>
        <select value={filters.month} onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))} className="input w-32 text-sm">
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>)}
        </select>
        <input value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))} placeholder="Year" className="input w-24 text-sm" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div> : expenses.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No expenses found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Category</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Description</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Added By</th>
                <th className="px-4 py-3 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{new Date(e.expenseDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><span className="badge badge-active">{CATEGORY_LABELS[e.category]}</span></td>
                  <td className="px-4 py-3 text-slate-700 max-w-[220px] truncate">{e.description}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(e.amount)}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[e.status]}`}>{e.status}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{e.creator?.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-center">
                      {isAdmin && e.status === 'PENDING' && (
                        <button onClick={() => approve(e.id)} title="Approve" className="btn-icon text-emerald-600 hover:text-emerald-700"><Check size={14} /></button>
                      )}
                      {e.status === 'APPROVED' && (
                        <button onClick={() => markPaid(e.id)} title="Mark Paid" className="btn-icon text-indigo-600 hover:text-indigo-700"><DollarSign size={14} /></button>
                      )}
                      {e.status === 'PENDING' && (
                        <button onClick={() => del(e.id)} title="Delete" className="btn-icon text-red-400 hover:text-red-600">✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <NewExpenseModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
