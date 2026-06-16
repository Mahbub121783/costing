import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, UserSquare } from 'lucide-react';
import api, { asArray } from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { ACTIVE: 'badge-active', INACTIVE: 'badge-pending', TERMINATED: 'badge-terminated' };

export default function EmployeeList() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  useEffect(() => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    api.get('/employees', { params })
      .then((r) => setEmployees(asArray(r.data)))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = employees.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q) || e.designation?.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500">{filtered.length} employees</p>
        </div>
        <Link to="/employees/new" className="btn-primary gap-1.5"><Plus size={15} /> New Employee</Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, code, designation…" className="input pl-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-36 text-sm">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div> : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <UserSquare size={32} className="mx-auto mb-3 opacity-30" />
            <p>No employees found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Code</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Designation</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Department</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Gross Salary</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Joining Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp) => {
                const sal = emp.salaryStructure?.[0];
                return (
                  <tr key={emp.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/employees/${emp.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600">{emp.employeeCode}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{emp.name}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.designation || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{emp.department || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{sal ? `$${Number(sal.grossSalary).toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(emp.joiningDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[emp.status]}`}>{emp.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
