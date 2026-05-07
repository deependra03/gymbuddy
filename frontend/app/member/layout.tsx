'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { Dumbbell, LayoutDashboard, ListChecks, UtensilsCrossed, User, LogOut, Fingerprint, Calendar, MoreVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import NotificationsPanel from '@/components/shared/NotificationsPanel';

const mainNavItems = [
  { href: '/member/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/member/sessions', label: 'Sessions', icon: Calendar },
  { href: '/member/attendance', label: 'Attendance', icon: Fingerprint },
  { href: '/member/profile', label: 'Profile', icon: User },
];

const moreNavItems = [
  { href: '/member/exercises', label: 'Exercises', icon: ListChecks },
  { href: '/member/diet', label: 'Diet', icon: UtensilsCrossed },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, initFromStorage, isLoading } = useAuthStore();
  const redirectRef = useRef(false);

  useEffect(() => {
    initFromStorage();
  }, []);

  useEffect(() => {
    if (!isLoading && !redirectRef.current) {
      if (!user) {
        redirectRef.current = true;
        router.replace('/auth/login');
      } else if (user.role === 'admin') {
        redirectRef.current = true;
        router.replace('/admin/members');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  const handleLogout = () => {
    logout();
    router.replace('/auth/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/60 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-zinc-900 dark:text-white text-lg tracking-tight">GymBuddy</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationsPanel />
          <ThemeToggle />
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{user.name}</p>
            <p className="text-[10px] text-zinc-500">Member</p>
          </div>
          {user.photoUrl ? (
            <img src={user.photoUrl} className="w-8 h-8 rounded-full object-cover ring-2 ring-zinc-300 dark:ring-zinc-700" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <button onClick={handleLogout} className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content with top + bottom padding for nav bars */}
      <main className="pt-14 pb-20 min-h-screen">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 flex safe-area-inset-bottom">
        {mainNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-semibold transition-all duration-150',
                active ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              <div className={cn(
                'w-10 h-6 rounded-full flex items-center justify-center transition-all duration-150',
                active ? 'bg-brand-500/15' : ''
              )}>
                <Icon className={cn('w-5 h-5', active && 'scale-105')} />
              </div>
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setShowMoreMenu(true)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-semibold transition-all duration-150',
            moreNavItems.some(item => pathname === item.href) ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          )}
        >
          <div className={cn(
            'w-10 h-6 rounded-full flex items-center justify-center transition-all duration-150',
            moreNavItems.some(item => pathname === item.href) ? 'bg-brand-500/15' : ''
          )}>
            <MoreVertical className={cn('w-5 h-5', moreNavItems.some(item => pathname === item.href) && 'scale-105')} />
          </div>
          More
        </button>
      </nav>

      {/* Mobile more menu */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white dark:bg-zinc-900 w-full rounded-t-3xl max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 px-4 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">More Options</h3>
              <button onClick={() => setShowMoreMenu(false)} className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              {moreNavItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowMoreMenu(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
