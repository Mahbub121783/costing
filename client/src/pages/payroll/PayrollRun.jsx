import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCheck, Lock } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_COLORS = { DRAFT: 'badge-pending', FINALIZED: 'badge-partial', PAID: 'badge-paid' };
const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

function EditItemModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    bonusAmount: String(item.bonusAmount),
    bonusType: item.bonusType || '',
    overtimeAmount: String(item.overtimeAmount),
    advanceDeduction: String(item.advanceDeduction),
    taxDeduction: String(item.taxDeduction),
    otherDeductions: String(item.otherDeductions),
    notes: item.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/payroll/${item.payrollId}/items/${item.id}`, form);
      toast.success('Updated');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Edit — {item.employee?.name}</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {['bonusAmount', 'overtimeAmount', 'advanceDeduction', 'taxDeduction', 'otherDeductions'].map((k) => (
              <div key={k}>
                <label className="field-label capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</label>
                <input value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className="input text-sm" />
              </div>
            ))}
            <div>
              <label className="field-label">Bonus Type</label>
              <select value={form.bonusType} onChange={(e) => setForm((f) => ({ ...f, bonusType: e.target.value }))} className="input text-sm">
                <option value="">— None —</option>
                <option value="EID">Eid</option>
                <option value="PERFORMANCE">Performance</option>
                <option value="INCENTIVE">Incentive</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input" rows={2} />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayrollRun() {
  const { id } = useParams();
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [working, setWorking] = useState(false);

  const load = () => {
    api.get(`/payroll/${id}`).then((r) => setPayroll(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const togglePaid = async (itemId) => {
    await api.put(`/payroll/${id}/items/${itemId}/paid`);
    load();
  };

  const markAllPaid = async () => {
    setWorking(true);
    try {
      await api.put(`/payroll/${id}/pay-all`);
      toast.success('All items marked paid');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setWorking(false);
    }
  };

  const finalize = async () => {
    setWorking(true);
    try {
      await api.put(`/payroll/${id}/finalize`);
      toast.success('Payroll finalized');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!payroll) return <div className="p-8 text-slate-400">Not found</div>;

  const isDraft = payroll.status === 'DRAFT';
  const isFinalized = payroll.status === 'FINALIZED';

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/payroll" className="btn-icon"><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{MONTHS[payroll.month - 1]} {payroll.year} Payroll</h1>
          <p className="text-sm text-slate-500">Generated by {payroll.creator?.name}</p>
        </div>
        <span className={`badge ${STATUS_COLORS[payroll.status]}`}>{payroll.status}</span>

        {isDraft && (
          <button onClick={finalize} disabled={working} className="btn-primary gap-1.5 text-xs">
            <Lock size={13} /> Finalize
          </button>
        )}
        {isFinalized && (
          <button onClick={markAllPaid} disabled={working} className="btn-primary gap-1.5 text-xs">
            <CheckCheck size={13} /> Mark All Paid
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div><p className="text-xs text-slate-500">Employees</p><p className="font-bold text-lg">{payroll.items?.length || 0}</p></div>
        <div><p className="text-xs text-slate-500">Total Gross</p><p className="font-semibold">${fmt(payroll.totalGross)}</p></div>
        <div><p className="text-xs text-slate-500">Total Advance</p><p className="font-semibold text-amber-600">${fmt(payroll.totalAdvance)}</p></div>
        <div><p className="text-xs text-slate-500">Total Net Pay</p><p className="font-bold text-emerald-700 text-base">${fmt(payroll.totalNet)}</p></div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-3 font-medium text-slate-500">Code</th>
              <th className="text-left px-3 py-3 font-medium text-slate-500">Name</th>
              <th className="text-right px-3 py-3 font-medium text-slate-500">Gross</th>
              <th className="text-right px-3 py-3 font-medium text-slate-500">Bonus</th>
              <th className="text-right px-3 py-3 font-medium text-slate-500">OT</th>
              <th className="text-right px-3 py-3 font-medium text-slate-500">Advance</th>
              <th className="text-right px-3 py-3 font-medium text-slate-500">Tax</th>
              <th className="text-right px-3 py-3 font-medium text-slate-500">Net Pay</th>
              <th className="text-left px-3 py-3 font-medium text-slate-500">Paid</th>
              <th className="px-3 py-3 font-medium text-slate-500">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payroll.items?.map((item) => (
              <tr key={item.id} className={`hover:bg-slate-50 ${item.isPaid ? 'opacity-60' : ''}`}>
                <td className="px-3 py-2 font-mono text-xs text-indigo-600">{item.employee?.employeeCode}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{item.employee?.name}</td>
                <td className="px-3 py-2 text-right">{fmt(item.grossSalary)}</td>
                <td className="px-3 py-2 text-right text-emerald-700">{Number(item.bonusAmount) > 0 ? `+${fmt(item.bonusAmount)}` : '—'}</td>
                <td className="px-3 py-2 text-right">{Number(item.overtimeAmount) > 0 ? `+${fmt(item.overtimeAmount)}` : '—'}</td>
                <td className="px-3 py-2 text-right text-amber-600">{Number(item.advanceDeduction) > 0 ? `-${fmt(item.advanceDeduction)}` : '—'}</td>
                <td className="px-3 py-2 text-right text-red-500">{Number(item.taxDeduction) > 0 ? `-${fmt(item.taxDeduction)}` : '—'}</td>
                <td className="px-3 py-2 text-right font-bold text-slate-900">{fmt(item.netPay)}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => togglePaid(item.id)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${item.isPaid ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-400'}`}
                  >
                    {item.isPaid && <Check size={12} />}
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  {isDraft && (
                    <button onClick={() => setEditItem(item)} className="text-xs text-indigo-500 hover:text-indigo-700 underline">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editItem && <EditItemModal item={editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); load(); }} />}
    </div>
  );
}
