import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});


export default function Login() {
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      await login(data);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
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
              Accurate costing,<br />
              <span className="text-indigo-400">every time.</span>
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Professional garments cost breakdown — fabric, trims, CM, packaging, and FOB — all in one place with live calculations.
            </p>
          </div>

          <div className="space-y-3">
            {['Real-time FOB calculation', 'Approval workflow', 'Excel export (OCS format)', 'Per-size cost breakdown'].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-slate-300 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} GCS — Garments Costing System</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Layers size={20} className="text-white" />
            </div>
            <p className="text-slate-800 font-bold text-lg">GCS</p>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to your GCS account</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="field-label">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    {...register('email')}
                    type="email"
                    className="input pl-9"
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="field-label">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    {...register('password')}
                    type="password"
                    className="input pl-9"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 mt-2 justify-between"
              >
                <span>{loading ? 'Signing in…' : 'Sign In'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
