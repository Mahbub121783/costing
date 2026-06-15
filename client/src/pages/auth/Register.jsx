import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, User, Mail, Lock, ArrowRight, Building2, Phone, Briefcase, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const schema = z.object({
  name: z.string().min(2, 'Name min 2 characters'),
  email: z.string().email('Valid email required'),
  company: z.string().optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
  password: z.string()
    .min(8, 'Password min 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

function PasswordStrength({ password = '' }) {
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const color = score === 0 ? 'bg-slate-200' : score === 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : 'bg-emerald-500';
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

export default function Register() {
  const { register: registerUser, loading } = useAuthStore();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const password = watch('password', '');

  const onSubmit = async ({ name, email, password, company, phone, designation }) => {
    try {
      await registerUser({ name, email, password, company, phone, designation });
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-[#0b1120] p-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Layers size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-tight">GCS</p>
            <p className="text-slate-400 text-xs">Garments Costing</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-snug">
              Start building<br />
              <span className="text-indigo-400">better costings.</span>
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Create your account and start managing garments costings with professional accuracy and real-time FOB calculations.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Full style & costing management',
              'Per-size fabric & trim breakdown',
              'Live FOB with approval workflow',
              'OCS-format Excel export',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-slate-300 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>

          <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.07]">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-indigo-400" />
              <span className="text-slate-300 text-xs font-semibold">First user = Admin</span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              The first registered account automatically becomes the system administrator and can manage all other users.
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} GCS — Garments Costing System</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6 overflow-y-auto">
        <div className="w-full max-w-md my-6">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Layers size={20} className="text-white" />
            </div>
            <p className="text-slate-800 font-bold text-lg">GCS</p>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
            <p className="text-slate-500 text-sm mt-1">Set up your GCS workspace</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div>
                <label className="field-label">Full Name <span className="text-red-400">*</span></label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input {...register('name')} className="input pl-9" placeholder="Your full name" autoComplete="name" />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="field-label">Email Address <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input {...register('email')} type="email" className="input pl-9" placeholder="you@company.com" autoComplete="email" />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              {/* Company & Designation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Company</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input {...register('company')} className="input pl-9" placeholder="Company name" />
                  </div>
                </div>
                <div>
                  <label className="field-label">Designation</label>
                  <div className="relative">
                    <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input {...register('designation')} className="input pl-9" placeholder="e.g. Sr. Merch" />
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="field-label">Phone</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input {...register('phone')} className="input pl-9" placeholder="+880 1xxx xxxxxx" autoComplete="tel" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="field-label">Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input {...register('password')} type="password" className="input pl-9" placeholder="Min 8 characters" autoComplete="new-password" />
                </div>
                <PasswordStrength password={password} />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="field-label">Confirm Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input {...register('confirmPassword')} type="password" className="input pl-9" placeholder="Repeat password" autoComplete="new-password" />
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 mt-2 justify-between"
              >
                <span>{loading ? 'Creating account…' : 'Create Account'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
