import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api, { asArray, asData } from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { ACTIVE: 'badge-active', INACTIVE: 'badge-pending', TERMINATED: 'badge-terminated' };
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

function SalaryForm({ employeeId, onSaved }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { effectiveFrom: new Date().toISOString().slice(0, 10) },
  });
  const onSubmit = async (data) => {
    await api.post(`/employees/${employeeId}/salary`, data);
    toast.success('Salary structure updated');
    onSaved();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Add / Update Salary Structure</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="field-label">Effective From</label>
          <input {...register('effectiveFrom')} type="date" className="input text-sm" />
        </div>
        <div>
          <label className="field-label">Basic Salary</label>
          <input {...register('basicSalary')} className="input text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="field-label">House Rent</label>
          <input {...register('houseRent')} className="input text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="field-label">Medical</label>
          <input {...register('medicalAllowance')} className="input text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="field-label">Transport</label>
          <input {...register('transportAllowance')} className="input text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="field-label">Mobile Bill</label>
          <input {...register('mobileBill')} className="input text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="field-label">Tax Deduction</label>
          <input {...register('taxDeduction')} className="input text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="field-label">Other Deductions</label>
          <input {...register('otherDeductions')} className="input text-sm" placeholder="0.00" />
        </div>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary text-xs py-1.5 px-4">{isSubmitting ? 'Saving…' : 'Save Salary'}</button>
    </form>
  );
}

function ExpenseForm({ employeeId, onSaved }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      expenseDate: new Date().toISOString().slice(0, 10),
      expenseType: 'MOBILE_BILL',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    },
  });
  const onSubmit = async (data) => {
    await api.post(`/employees/${employeeId}/expenses`, data);
    toast.success('Expense added');
    reset();
    onSaved();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Add Expense / Bonus</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="field-label">Date</label>
          <input {...register('expenseDate')} type="date" className="input text-sm" />
        </div>
        <div>
          <label className="field-label">Type</label>
          <select {...register('expenseType')} className="input text-sm">
            <option value="MOBILE_BILL">Mobile Bill</option>
            <option value="TRANSPORT">Transport</option>
            <option value="BONUS">Bonus</option>
            <option value="OVERTIME">Overtime</option>
            <option value="ADVANCE">Advance</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="field-label">Bonus Type</label>
          <select {...register('bonusType')} className="input text-sm">
            <option value="">— N/A —</option>
            <option value="EID">Eid</option>
            <option value="PERFORMANCE">Performance</option>
            <option value="INCENTIVE">Incentive</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="field-label">Amount</label>
          <input {...register('amount')} className="input text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="field-label">Month</label>
          <input {...register('month')} type="number" className="input text-sm" />
        </div>
        <div>
          <label className="field-label">Year</label>
          <input {...register('year')} type="number" className="input text-sm" />
        </div>
        <div className="col-span-2">
          <label className="field-label">Description</label>
          <input {...register('description')} className="input text-sm" placeholder="Optional" />
        </div>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary text-xs py-1.5 px-4">{isSubmitting ? 'Saving…' : 'Add'}</button>
    </form>
  );
}

const TABS = ['Profile', 'Salary', 'Expenses', 'History'];

export default function EmployeeDetail() {
  const { id } = useParams();
  const [emp, setEmp] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Profile');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = () => {
    Promise.all([
      api.get(`/employees/${id}`),
      api.get(`/employees/${id}/expenses`),
    ]).then(([e, ex]) => { setEmp(asData(e.data)); setExpenses(asArray(ex.data)); })
      .catch(() => toast.error('Failed to load employee'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const changeStatus = async (status) => {
    setUpdatingStatus(true);
    await api.put(`/employees/${id}/status`, { status });
    toast.success(`Status updated to ${status}`);
    load();
    setUpdatingStatus(false);
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!emp) return <div className="p-8 text-slate-400">Not found</div>;

  const activeSalary = emp.salaryStructure?.find((s) => s.isActive);

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/employees" className="btn-icon"><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{emp.name}</h1>
            <span className={`badge ${STATUS_COLORS[emp.status]}`}>{emp.status}</span>
          </div>
          <p className="text-sm text-slate-500">{emp.employeeCode} · {emp.designation || ''} {emp.department ? `· ${emp.department}` : ''}</p>
        </div>
        <div className="flex gap-2">
          {emp.status !== 'ACTIVE' && <button disabled={updatingStatus} onClick={() => changeStatus('ACTIVE')} className="btn-secondary text-xs py-1.5">Activate</button>}
          {emp.status === 'ACTIVE' && <button disabled={updatingStatus} onClick={() => changeStatus('INACTIVE')} className="btn-secondary text-xs py-1.5">Deactivate</button>}
          {emp.status !== 'TERMINATED' && <button disabled={updatingStatus} onClick={() => { if (confirm('Terminate employee?')) changeStatus('TERMINATED'); }} className="btn-secondary text-red-600 text-xs py-1.5">Terminate</button>}
        </div>
      </div>

      {activeSalary && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <div><p className="text-xs text-slate-500">Basic</p><p className="font-semibold">{fmt(activeSalary.basicSalary)}</p></div>
          <div><p className="text-xs text-slate-500">House Rent</p><p className="font-semibold">{fmt(activeSalary.houseRent)}</p></div>
          <div><p className="text-xs text-slate-500">Medical</p><p className="font-semibold">{fmt(activeSalary.medicalAllowance)}</p></div>
          <div><p className="text-xs text-slate-500">Transport</p><p className="font-semibold">{fmt(activeSalary.transportAllowance)}</p></div>
          <div><p className="text-xs text-slate-500">Gross Salary</p><p className="text-base font-bold text-indigo-700">{fmt(activeSalary.grossSalary)}</p></div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-nav">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`tab-pill ${tab === t ? 'active' : ''}`}>{t}</button>
        ))}
      </div>

      {tab === 'Profile' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-slate-500">Phone</p><p className="font-medium">{emp.phone || '—'}</p></div>
          <div><p className="text-xs text-slate-500">Email</p><p className="font-medium">{emp.email || '—'}</p></div>
          <div><p className="text-xs text-slate-500">NID</p><p className="font-medium">{emp.nid || '—'}</p></div>
          <div><p className="text-xs text-slate-500">Joining Date</p><p className="font-medium">{new Date(emp.joiningDate).toLocaleDateString()}</p></div>
          <div className="col-span-2"><p className="text-xs text-slate-500">Address</p><p className="font-medium">{emp.address || '—'}</p></div>
          {emp.emergencyContact?.name && (
            <>
              <div><p className="text-xs text-slate-500">Emergency Contact</p><p className="font-medium">{emp.emergencyContact.name}</p></div>
              <div><p className="text-xs text-slate-500">Emergency Phone</p><p className="font-medium">{emp.emergencyContact.phone}</p></div>
            </>
          )}
          {emp.bankDetails?.bankName && (
            <>
              <div><p className="text-xs text-slate-500">Bank</p><p className="font-medium">{emp.bankDetails.bankName}</p></div>
              <div><p className="text-xs text-slate-500">Account No</p><p className="font-medium">{emp.bankDetails.accountNo}</p></div>
            </>
          )}
        </div>
      )}

      {tab === 'Salary' && (
        <div className="space-y-4">
          <SalaryForm employeeId={id} onSaved={load} />
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">Salary History</div>
            {emp.salaryStructure?.length === 0 ? <p className="p-5 text-sm text-slate-400">No salary structure yet</p> : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Effective From</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500">Basic</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500">Gross</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {emp.salaryStructure.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">{new Date(s.effectiveFrom).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-right">{fmt(s.basicSalary)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmt(s.grossSalary)}</td>
                      <td className="px-4 py-2"><span className={s.isActive ? 'badge badge-active' : 'badge badge-pending'}>{ s.isActive ? 'Active' : 'Superseded'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'Expenses' && (
        <div className="space-y-4">
          <ExpenseForm employeeId={id} onSaved={load} />
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {expenses.length === 0 ? <p className="p-5 text-sm text-slate-400">No expenses recorded</p> : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Type</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Month/Year</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500">Amount</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Description</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-600">{new Date(e.expenseDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2"><span className="badge badge-active">{e.expenseType}</span></td>
                      <td className="px-4 py-2 text-slate-500">{e.month}/{e.year}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmt(e.amount)}</td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{e.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'History' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {!emp.historyLogs?.length ? <p className="p-5 text-sm text-slate-400">No history yet</p> : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-4 py-2 font-medium text-slate-500">Date</th>
                <th className="text-left px-4 py-2 font-medium text-slate-500">Change</th>
                <th className="text-left px-4 py-2 font-medium text-slate-500">From</th>
                <th className="text-left px-4 py-2 font-medium text-slate-500">To</th>
                <th className="text-left px-4 py-2 font-medium text-slate-500">By</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {emp.historyLogs.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 text-xs">{new Date(h.changedAt).toLocaleString()}</td>
                    <td className="px-4 py-2"><span className="badge badge-pending">{h.changeType}</span></td>
                    <td className="px-4 py-2 text-slate-600 text-xs">{h.oldValue || '—'}</td>
                    <td className="px-4 py-2 text-slate-700 text-xs font-medium">{h.newValue || '—'}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{h.changedByUser?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
