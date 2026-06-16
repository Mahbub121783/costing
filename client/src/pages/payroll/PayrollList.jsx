import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api, { asArray } from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { DRAFT: 'badge-pending', FINALIZED: 'badge-partial', PAID: 'badge-paid' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

function GenerateModal({ onClose, onSaved }) {
  const now = new Date();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { month: now.getMonth() + 1, year: now.getFullYear() },
  });
  const onSubmit = async (data) => {
    try {
      await api.post('/payroll/generate', data);
      toast.success('Payroll generated');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate payroll');
    }
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Generate Monthly Payroll</h3>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Month</label>
              <select {...register('month')} className="input">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Year</label>
              <input {...register('year')} type="number" className="input" />
            </div>
          </div>
          <div>
            <label className="field-label">Notes (optional)</label>
            <textarea {...register('notes')} className="input" rows={2} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Generating…' : 'Generate'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PayrollList() {
  const navigate = useNavigate();
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    api.get('/payroll').then((r) => setPayrolls(asArray(r.data))).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payroll</h1>
          <p className="text-sm text-slate-500">{payrolls.length} payroll runs</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary gap-1.5"><Plus size={15} /> Generate Payroll</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div> : payrolls.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No payroll runs yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Period</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Employees</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Total Gross</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Total Net</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrolls.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/payroll/${p.id}`)}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{MONTHS[p.month - 1]} {p.year}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[p.status]}`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-right text-slate-600">{p._count?.items || 0}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{fmt(p.totalGross)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(p.totalNet)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.creator?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <GenerateModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
