import { useState, useEffect } from 'react';
import { Users, Shield, Eye, Edit3, KeyRound, ToggleLeft, ToggleRight, X, Check, Building2, Phone, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';

const ROLES = ['ADMIN', 'MERCHANDISER', 'VIEWER'];

const ROLE_COLORS = {
  ADMIN: 'bg-violet-100 text-violet-700 border-violet-200',
  MERCHANDISER: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  VIEWER: 'bg-slate-100 text-slate-600 border-slate-200',
};

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="btn-icon text-slate-400 hover:text-slate-600 w-7 h-7">
            <X size={15} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({ name: '', role: '', company: '', phone: '', designation: '' });

  const load = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      name: u.name,
      role: u.role,
      company: u.company || '',
      phone: u.phone || '',
      designation: u.designation || '',
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${editUser.id}`, editForm);
      toast.success('User updated');
      setEditUser(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    const action = u.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${u.name}?`)) return;
    try {
      await api.put(`/users/${u.id}`, { isActive: !u.isActive });
      toast.success(`User ${action}d`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const doResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/users/${resetUser.id}/reset-password`, { newPassword });
      toast.success(`Password reset for ${resetUser.name}`);
      setResetUser(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const totalActive = users.filter((u) => u.isActive).length;
  const totalAdmins = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield size={20} className="text-violet-600" /> User Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage system users, roles, and access</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'text-slate-700' },
          { label: 'Active', value: totalActive, color: 'text-emerald-600' },
          { label: 'Admins', value: totalAdmins, color: 'text-violet-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-slate-500 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading users…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company / Role</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const initials = u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{initials}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {u.name} {isMe && <span className="text-xs text-indigo-500 font-normal">(you)</span>}
                          </p>
                          <p className="text-slate-400 text-xs">{u.email}</p>
                          {u.phone && <p className="text-slate-400 text-xs">{u.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {u.company && (
                          <p className="text-slate-600 text-xs flex items-center gap-1">
                            <Building2 size={10} /> {u.company}
                          </p>
                        )}
                        {u.designation && (
                          <p className="text-slate-400 text-xs flex items-center gap-1">
                            <Briefcase size={10} /> {u.designation}
                          </p>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[u.role]}`}>
                          {u.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="space-y-0.5">
                        <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{u._count.styles}</span> styles</p>
                        <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{u._count.costings}</span> costings</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {u.isActive ? <Check size={10} /> : <X size={10} />}
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(u)}
                          className="btn-icon text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 w-7 h-7"
                          title="Edit user"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => { setResetUser(u); setNewPassword(''); }}
                          className="btn-icon text-slate-400 hover:text-amber-600 hover:bg-amber-50 w-7 h-7"
                          title="Reset password"
                        >
                          <KeyRound size={13} />
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => toggleActive(u)}
                            className={`btn-icon w-7 h-7 ${u.isActive ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title={u.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {u.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <Modal title={`Edit — ${editUser.name}`} onClose={() => setEditUser(null)}>
          <div className="space-y-4">
            <div>
              <label className="field-label">Full Name</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="field-label">Role</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                className="input"
                disabled={editUser.id === me?.id}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {editUser.id === me?.id && (
                <p className="text-xs text-slate-400 mt-1">You cannot change your own role.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Company</label>
                <input
                  value={editForm.company}
                  onChange={(e) => setEditForm((p) => ({ ...p, company: e.target.value }))}
                  className="input"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="field-label">Designation</label>
                <input
                  value={editForm.designation}
                  onChange={(e) => setEditForm((p) => ({ ...p, designation: e.target.value }))}
                  className="input"
                  placeholder="e.g. Merchandiser"
                />
              </div>
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                className="input"
                placeholder="+880 1xxx xxxxxx"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditUser(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <Modal title={`Reset Password — ${resetUser.name}`} onClose={() => setResetUser(null)}>
          <div className="space-y-4">
            <p className="text-slate-500 text-sm">
              Set a new password for <strong>{resetUser.name}</strong>. They will be logged out from all devices.
            </p>
            <div>
              <label className="field-label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="Min 8 characters"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setResetUser(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={doResetPassword} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
