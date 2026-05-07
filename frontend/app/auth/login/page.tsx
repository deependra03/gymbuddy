'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Dumbbell, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ThemeToggle } from '@/components/theme-toggle';

const schema = z.object({
  phone: z.string().min(10, 'Enter valid phone number'),
  password: z.string().min(6, 'Password min 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      const { token, user } = res.data;
      setAuth(user, token);
      toast.success(`Welcome back, ${user.name}! 💪`);
      if (user.role === 'admin') {
        router.replace('/admin/members');
      } else {
        router.replace('/member/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center mb-4 shadow-lg shadow-brand-500/20">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">GymBuddy</h1>
          <p className="text-zinc-600 dark:text-zinc-500 mt-1 text-sm">Your fitness companion</p>
        </div>

        {/* Form */}
        <div className="card space-y-5">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Sign in</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Phone number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="9876543210"
                  className="input-field pl-10"
                />
              </div>
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••"
                  className="input-field pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 p-4 rounded-xl bg-zinc-100/80 border border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-wider">Demo credentials</p>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            <p>🔑 Admin: <span className="text-zinc-900 dark:text-zinc-200 font-mono">9999999999</span> / <span className="text-zinc-900 dark:text-zinc-200 font-mono">admin123</span></p>
            <p>� Gym Admin: <span className="text-zinc-900 dark:text-zinc-200 font-mono">9888776655</span> / <span className="text-zinc-900 dark:text-zinc-200 font-mono">gymadmin123</span></p>
            <p>💪 Trainer 1: <span className="text-zinc-900 dark:text-zinc-200 font-mono">9123456780</span> / <span className="text-zinc-900 dark:text-zinc-200 font-mono">trainer123</span></p>
            <p>💪 Trainer 2: <span className="text-zinc-900 dark:text-zinc-200 font-mono">9234567890</span> / <span className="text-zinc-900 dark:text-zinc-200 font-mono">trainer456</span></p>
            <p>�🏃 Member: <span className="text-zinc-900 dark:text-zinc-200 font-mono">9876543210</span> / <span className="text-zinc-900 dark:text-zinc-200 font-mono">member123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
