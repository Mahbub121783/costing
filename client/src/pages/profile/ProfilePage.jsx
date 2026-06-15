import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Building2, Phone, Briefcase, Shield, Save, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const ROLE_COLORS = {
  ADMIN: 'bg-violet-100 text-violet-700',
  MERCHANDISER: 'bg-indigo-100 text-indigo-700',
  VIEWER: 'bg-slate-100 text-slate-600',
};

function PasswordStrength({ password = '' }) {
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const color = score === 0 ? 'bg-slate-200' : score === 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : 'bg-emerald-500';
  if (!password) return null;
  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? color : 'bg-slate-200'}`} />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map((c) => (
          <span key={c.label} className={`text-[10px] ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateProfile, changePassword, logout, loading } = useAuthStore();
  const navigate = useNavigate();

  // Profile form
  const [profile, setProfile] = useState({
    name: user?.name || '',
    company: user?.company || '',
    phone: user?.phone || '',
    designation: user?.designation || '',
  });

  // Password form
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name || profile.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    try {
      await updateProfile(profile);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (pwd.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setPwdLoading(true);
    try {
      await changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast.success('Password changed. Please log in again.');
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account settings and password</p>
      </div>

      {/* User card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-white text-xl font-bold">{initials || '?'}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user?.role]}`}>
                <Shield size={10} /> {user?.role}
              </span>
              {user?.designation && (
                <span className="text-slate-400 text-xs">{user.designation}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <User size={15} className="text-indigo-500" /> Personal Information
        </h3>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="field-label">Full Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="input pl-9"
                placeholder="Your full name"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={user?.email || ''}
                className="input pl-9 bg-slate-50 text-slate-500 cursor-not-allowed"
                disabled
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed. Contact admin if needed.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Company</label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={profile.company}
                  onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))}
                  className="input pl-9"
                  placeholder="Company name"
                />
              </div>
            </div>
            <div>
              <label className="field-label">Designation</label>
              <div className="relative">
                <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={profile.designation}
                  onChange={(e) => setProfile((p) => ({ ...p, designation: e.target.value }))}
                  className="input pl-9"
                  placeholder="e.g. Senior Merchandiser"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="field-label">Phone</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                className="input pl-9"
                placeholder="+880 1xxx xxxxxx"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              <Save size={14} />
              {loading ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <Lock size={15} className="text-amber-500" /> Change Password
        </h3>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="field-label">Current Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="password"
                value={pwd.currentPassword}
                onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))}
                className="input pl-9"
                placeholder="Your current password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <div>
            <label className="field-label">New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="password"
                value={pwd.newPassword}
                onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
                className="input pl-9"
                placeholder="Min 8 characters"
                autoComplete="new-password"
              />
            </div>
            <PasswordStrength password={pwd.newPassword} />
          </div>

          <div>
            <label className="field-label">Confirm New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="password"
                value={pwd.confirmPassword}
                onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="input pl-9"
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
            {pwd.confirmPassword && pwd.newPassword !== pwd.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            Changing your password will log you out from all devices including this one.
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={pwdLoading} className="btn-primary bg-amber-500 hover:bg-amber-600 border-amber-500">
              <Lock size={14} />
              {pwdLoading ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
          <LogOut size={15} /> Sign Out
        </h3>
        <p className="text-slate-500 text-sm mb-4">Sign out from this device. Your data will remain intact.</p>
        <button
          onClick={async () => { await logout(); navigate('/login'); }}
          className="btn-secondary border-red-200 text-red-600 hover:bg-red-50"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}
