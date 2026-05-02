'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Dumbbell } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, initFromStorage } = useAuthStore();

  useEffect(() => {
    initFromStorage();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/auth/login');
      } else if (user.role === 'admin') {
        router.replace('/admin/members');
      } else {
        router.replace('/member/dashboard');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center animate-pulse">
        <Dumbbell className="w-8 h-8 text-brand-500" />
      </div>
      <p className="text-zinc-500 text-sm">Loading GymBuddy...</p>
    </div>
  );
}
